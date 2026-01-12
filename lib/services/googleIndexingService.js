/**
 * Google Indexing API Service
 * Notifies Google when job listing URLs are added, updated, or removed
 *
 * This API is specifically designed for:
 * - JobPosting pages (like our nursing job listings)
 * - Livestream/BroadcastEvent pages
 *
 * Benefits:
 * - Faster indexing than waiting for Googlebot to crawl
 * - Job postings appear in Google for Jobs faster
 * - Removed jobs are de-indexed quickly
 *
 * Setup Requirements:
 * 1. Create a Google Cloud project
 * 2. Enable the "Web Search Indexing API"
 * 3. Create a service account with JSON key
 * 4. Add the service account email as an owner in Google Search Console
 * 5. Set GOOGLE_SERVICE_ACCOUNT_JSON environment variable (base64-encoded JSON key)
 *
 * Documentation: https://developers.google.com/search/apis/indexing-api/v3/quickstart
 *
 * Rate Limits:
 * - 200 requests per minute
 * - 100,000 requests per day (for verified sites)
 */

const { google } = require('googleapis');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';

// Service account credentials (base64-encoded JSON or direct JSON string)
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

/**
 * Get authenticated Google Auth client
 * Uses service account credentials for server-to-server auth
 */
async function getAuthClient() {
  if (!SERVICE_ACCOUNT_JSON) {
    console.error('❌ Google Indexing: GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
    return null;
  }

  try {
    // Decode credentials - handle both base64 and plain JSON
    let credentials;
    try {
      // Try base64 decode first
      credentials = JSON.parse(Buffer.from(SERVICE_ACCOUNT_JSON, 'base64').toString('utf8'));
    } catch {
      // Fall back to plain JSON string
      credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/indexing']
    });

    return auth;
  } catch (error) {
    console.error('❌ Google Indexing: Failed to parse service account credentials:', error.message);
    return null;
  }
}

/**
 * Submit a single URL to Google Indexing API
 * @param {string} url - Full URL to submit
 * @param {string} type - 'URL_UPDATED' or 'URL_DELETED'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function submitUrl(url, type = 'URL_UPDATED') {
  const auth = await getAuthClient();
  if (!auth) {
    return { success: false, error: 'Authentication not configured' };
  }

  try {
    const indexing = google.indexing({ version: 'v3', auth });

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: type // 'URL_UPDATED' or 'URL_DELETED'
      }
    });

    // Success responses have urlNotificationMetadata
    if (response.data && response.data.urlNotificationMetadata) {
      return {
        success: true,
        data: response.data.urlNotificationMetadata
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    // Handle specific Google API errors
    const errorMessage = error.response?.data?.error?.message || error.message;
    const errorCode = error.response?.status || error.code;

    // Rate limit error
    if (errorCode === 429) {
      return { success: false, error: 'Rate limit exceeded. Try again later.', retryable: true };
    }

    // Permission error (service account not added to Search Console)
    if (errorCode === 403) {
      return {
        success: false,
        error: 'Permission denied. Ensure service account is added as owner in Search Console.',
        retryable: false
      };
    }

    return { success: false, error: errorMessage, code: errorCode };
  }
}

/**
 * Submit URLs in batch with rate limiting
 * Google Indexing API has 200 requests/minute limit
 * @param {Array<string>} urls - Array of full URLs
 * @param {string} type - 'URL_UPDATED' or 'URL_DELETED'
 * @param {object} options - Configuration options
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function submitUrlsBatch(urls, type = 'URL_UPDATED', options = {}) {
  const {
    batchSize = 50,        // URLs per batch
    delayBetweenBatches = 20000, // 20 seconds between batches (to stay under 200/min)
    dryRun = false,        // Just log, don't submit
    onProgress = null      // Progress callback: (completed, total) => void
  } = options;

  if (!urls || urls.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [],
    submitted: []
  };

  // Split into batches
  const batches = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }

  console.log(`📤 Google Indexing: Submitting ${urls.length} URLs in ${batches.length} batches (${type})`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} URLs)`);

    for (const url of batch) {
      if (dryRun) {
        console.log(`  [DRY RUN] Would submit: ${url}`);
        results.success++;
        continue;
      }

      const result = await submitUrl(url, type);

      if (result.success) {
        results.success++;
        results.submitted.push(url);
        console.log(`  ✅ ${url}`);
      } else {
        results.failed++;
        results.errors.push({ url, error: result.error });
        console.error(`  ❌ ${url}: ${result.error}`);

        // If we hit rate limit, wait longer
        if (result.retryable) {
          console.log('  ⏳ Rate limited, waiting 60 seconds...');
          await sleep(60000);
        }
      }

      // Small delay between individual requests to avoid hammering API
      await sleep(100);
    }

    // Progress callback
    if (onProgress) {
      const completed = Math.min((batchIndex + 1) * batchSize, urls.length);
      onProgress(completed, urls.length);
    }

    // Wait between batches (except for last batch)
    if (batchIndex < batches.length - 1) {
      console.log(`\n⏳ Waiting ${delayBetweenBatches / 1000}s before next batch...`);
      await sleep(delayBetweenBatches);
    }
  }

  console.log(`\n📊 Google Indexing Summary:`);
  console.log(`   ✅ Success: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);

  return results;
}

/**
 * Check the indexing status of a URL
 * @param {string} url - Full URL to check
 * @returns {Promise<{success: boolean, status?: object, error?: string}>}
 */
async function getUrlStatus(url) {
  const auth = await getAuthClient();
  if (!auth) {
    return { success: false, error: 'Authentication not configured' };
  }

  try {
    const indexing = google.indexing({ version: 'v3', auth });

    const response = await indexing.urlNotifications.getMetadata({
      url: url
    });

    return {
      success: true,
      status: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    return { success: false, error: errorMessage };
  }
}

// ============================================================
// Job-specific helper functions (matching indexNowService API)
// ============================================================

/**
 * Notify Google about a new or updated job
 * @param {object} job - Job object with slug
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function notifyJobCreatedOrUpdated(job) {
  if (!job || !job.slug) {
    return { success: false, error: 'Invalid job object' };
  }

  const url = `${SITE_URL}/jobs/nursing/${job.slug}`;
  return await submitUrl(url, 'URL_UPDATED');
}

/**
 * Notify Google about a deleted/deactivated job
 * @param {object} job - Job object with slug
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function notifyJobDeleted(job) {
  if (!job || !job.slug) {
    return { success: false, error: 'Invalid job object' };
  }

  const url = `${SITE_URL}/jobs/nursing/${job.slug}`;
  return await submitUrl(url, 'URL_DELETED');
}

/**
 * Notify Google about multiple jobs (for batch operations)
 * @param {Array<object>} jobs - Array of job objects with slugs
 * @param {string} action - 'update' or 'delete'
 * @param {object} options - Batch options (batchSize, delayBetweenBatches, dryRun)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function notifyJobsBatch(jobs, action = 'update', options = {}) {
  if (!jobs || jobs.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const urls = jobs
    .filter(job => job && job.slug)
    .map(job => `${SITE_URL}/jobs/nursing/${job.slug}`);

  if (urls.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const type = action === 'delete' ? 'URL_DELETED' : 'URL_UPDATED';
  return await submitUrlsBatch(urls, type, options);
}

/**
 * Check if Google Indexing API is configured and working
 * @returns {Promise<{configured: boolean, working: boolean, error?: string}>}
 */
async function checkConfiguration() {
  if (!SERVICE_ACCOUNT_JSON) {
    return {
      configured: false,
      working: false,
      error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set'
    };
  }

  const auth = await getAuthClient();
  if (!auth) {
    return {
      configured: true,
      working: false,
      error: 'Failed to parse service account credentials'
    };
  }

  // Try to get status of homepage to verify permissions
  const testResult = await getUrlStatus(`${SITE_URL}/`);

  if (testResult.success) {
    return { configured: true, working: true };
  }

  // 404 means API is working but URL hasn't been submitted - that's OK
  if (testResult.error?.includes('not found') || testResult.error?.includes('404')) {
    return { configured: true, working: true };
  }

  return {
    configured: true,
    working: false,
    error: testResult.error
  };
}

// Utility function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  // Core API functions
  submitUrl,
  submitUrlsBatch,
  getUrlStatus,
  checkConfiguration,

  // Job-specific functions (matching indexNowService API)
  notifyJobCreatedOrUpdated,
  notifyJobDeleted,
  notifyJobsBatch
};
