/**
 * Bing IndexNow Service
 * Notifies Bing and other IndexNow-compatible search engines when URLs are added, updated, or deleted
 * 
 * IndexNow is an open protocol that allows you to notify search engines about URL changes
 * Supported by: Bing, Yandex, and other search engines
 * 
 * Documentation: https://www.indexnow.org/
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';
const INDEXNOW_API_URL = 'https://api.indexnow.org/indexnow';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || null; // Optional but recommended

/**
 * Generate IndexNow key file content (for verification)
 * This should be placed at: https://yourdomain.com/{key}.txt
 * The key should be a random string (e.g., 32 characters)
 */
function generateIndexNowKey() {
  if (INDEXNOW_KEY) {
    return INDEXNOW_KEY;
  }
  // Generate a random key if not set (32 characters)
  return require('crypto').randomBytes(16).toString('hex');
}

/**
 * Submit URLs to IndexNow API
 * @param {Array<string>} urls - Array of full URLs to notify about
 * @param {string} action - 'update' (default) or 'delete'
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function submitToIndexNow(urls, action = 'update') {
  // IndexNow doesn't distinguish between update and delete, but we track it for logging
  if (!urls || urls.length === 0) {
    return false;
  }

  // IndexNow supports up to 10,000 URLs per request
  // But we'll batch in smaller chunks to be safe
  const batchSize = 1000;
  const batches = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }

  const results = [];
  
  for (const batch of batches) {
    try {
      const key = INDEXNOW_KEY || generateIndexNowKey();
      
      // Build the request payload
      const payload = {
        host: new URL(SITE_URL).hostname,
        urlList: batch.map(url => {
          // Ensure URLs are absolute
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
          }
          return `${SITE_URL}${url.startsWith('/') ? url : `/${url}`}`;
        })
      };

      // Add key if provided (recommended for verification)
      if (INDEXNOW_KEY) {
        payload.key = INDEXNOW_KEY;
        payload.keyLocation = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
      }

      // Submit to IndexNow API
      const response = await fetch(INDEXNOW_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // IndexNow returns 200 for success, 202 for accepted (both are good)
      if (response.status === 200 || response.status === 202) {
        console.log(`✅ IndexNow: Notified about ${batch.length} URLs (${action})`);
        results.push(true);
      } else {
        const errorText = await response.text();
        console.error(`⚠️ IndexNow: Failed to submit batch (status ${response.status}): ${errorText}`);
        results.push(false);
      }
    } catch (error) {
      console.error(`❌ IndexNow: Error submitting batch: ${error.message}`);
      results.push(false);
    }
  }

  // Return true if at least one batch succeeded
  return results.some(r => r === true);
}

/**
 * Notify IndexNow about a new or updated job
 * @param {object} job - Job object with slug
 * @returns {Promise<boolean>}
 */
async function notifyJobCreatedOrUpdated(job) {
  if (!job || !job.slug) {
    return false;
  }

  const urls = [
    `${SITE_URL}/jobs/nursing/${job.slug}` // Individual job page
  ];

  // Also notify about related landing pages if we have that info
  // (This is optional - you can add state/city pages if needed)

  return await submitToIndexNow(urls, 'update');
}

/**
 * Notify IndexNow about a deleted/deactivated job
 * @param {object} job - Job object with slug
 * @returns {Promise<boolean>}
 */
async function notifyJobDeleted(job) {
  if (!job || !job.slug) {
    return false;
  }

  const urls = [
    `${SITE_URL}/jobs/nursing/${job.slug}` // Individual job page
  ];

  // Note: IndexNow doesn't distinguish between update and delete
  // But we notify anyway so search engines know to re-crawl
  return await submitToIndexNow(urls, 'delete');
}

/**
 * Notify IndexNow about multiple jobs (for batch operations)
 * @param {Array<object>} jobs - Array of job objects with slugs
 * @param {string} action - 'update' or 'delete'
 * @returns {Promise<boolean>}
 */
async function notifyJobsBatch(jobs, action = 'update') {
  if (!jobs || jobs.length === 0) {
    return false;
  }

  const urls = jobs
    .filter(job => job && job.slug)
    .map(job => `${SITE_URL}/jobs/nursing/${job.slug}`);

  if (urls.length === 0) {
    return false;
  }

  return await submitToIndexNow(urls, action);
}

/**
 * Create IndexNow key file content
 * This should be saved to: public/{INDEXNOW_KEY}.txt
 * The file should contain just the key (no other content)
 */
function getIndexNowKeyFileContent() {
  const key = INDEXNOW_KEY || generateIndexNowKey();
  return key;
}

module.exports = {
  submitToIndexNow,
  notifyJobCreatedOrUpdated,
  notifyJobDeleted,
  notifyJobsBatch,
  getIndexNowKeyFileContent
};

