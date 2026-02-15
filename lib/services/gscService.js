/**
 * Google Search Console API Service
 * Fetches search performance data and URL inspection results
 *
 * Uses the same service account as googleIndexingService.js
 * Property: sc-domain:intelliresume.net
 */

const { google } = require('googleapis');

const SITE_URL = 'sc-domain:intelliresume.net';
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

/**
 * Get authenticated Google Auth client for Search Console
 * Reuses credential decoding pattern from googleIndexingService.js
 */
async function getAuthClient() {
  if (!SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
  }

  let credentials;
  try {
    credentials = JSON.parse(Buffer.from(SERVICE_ACCOUNT_JSON, 'base64').toString('utf8'));
  } catch {
    credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
    ],
  });

  return auth;
}

/**
 * Fetch search analytics data from GSC
 * @param {object} options
 * @param {string} options.startDate - YYYY-MM-DD
 * @param {string} options.endDate - YYYY-MM-DD
 * @param {string[]} options.dimensions - ['page'], ['query'], or ['page','query']
 * @param {number} options.rowLimit - max rows (default 5000, max 25000)
 * @returns {Promise<Array<{keys: string[], clicks: number, impressions: number, ctr: number, position: number}>>}
 */
async function getSearchAnalytics({ startDate, endDate, dimensions, rowLimit = 5000 }) {
  const auth = await getAuthClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      type: 'web',
    },
  });

  return response.data.rows || [];
}

/**
 * Inspect URL indexing status, rich results, and mobile usability
 * Quota: 2000 requests/day
 * @param {string[]} urls - Full URLs to inspect
 * @returns {Promise<Array>} Full inspection results
 */
async function getIndexingStatus(urls) {
  const auth = await getAuthClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const results = [];
  const total = urls.length;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`  Inspecting ${i + 1}/${total}...`);
    }
    try {
      const response = await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: SITE_URL,
        },
      });

      const inspection = response.data.inspectionResult || {};
      const idx = inspection.indexStatusResult || {};
      const rich = inspection.richResultsResult || null;
      const mobile = inspection.mobileUsabilityResult || null;

      results.push({
        url,
        // Index status
        verdict: idx.verdict || 'UNKNOWN',
        coverageState: idx.coverageState || null,
        indexingState: idx.indexingState || 'UNKNOWN',
        crawledAs: idx.crawledAs || null,
        lastCrawlTime: idx.lastCrawlTime || null,
        pageFetchState: idx.pageFetchState || 'UNKNOWN',
        robotsTxtState: idx.robotsTxtState || 'UNKNOWN',
        userCanonical: idx.userCanonical || null,
        googleCanonical: idx.googleCanonical || null,
        referringUrls: idx.referringUrls || [],
        sitemap: (idx.sitemap && idx.sitemap[0]) || null,
        // Rich results
        richResultsVerdict: rich?.verdict || null,
        richResultsTypes: (rich?.detectedItems || []).map(d => d.richResultType).filter(Boolean),
        richResultsIssues: (rich?.detectedItems || []).flatMap(d =>
          (d.items || []).flatMap(item => (item.issues || []).map(issue => ({
            type: d.richResultType,
            message: issue.issueMessage,
            severity: issue.severity,
          })))
        ),
        // Mobile usability
        mobileUsabilityVerdict: mobile?.verdict || null,
        mobileUsabilityIssues: (mobile?.issues || []).map(i => ({
          issueType: i.issueType,
          message: i.message,
        })),
      });

      // 200ms delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      results.push({ url, verdict: 'ERROR', error: error.message });
    }
  }

  console.log(`  Inspection complete: ${results.length}/${total} (${results.filter(r => r.verdict === 'ERROR').length} errors)`);
  return results;
}

/**
 * Fetch sitemap status from GSC
 * @returns {Promise<Array>} Sitemap info
 */
async function getSitemapStatus() {
  const auth = await getAuthClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const response = await searchconsole.sitemaps.list({
    siteUrl: SITE_URL,
  });

  return (response.data.sitemap || []).map(s => ({
    path: s.path,
    lastDownloaded: s.lastDownloaded || null,
    lastSubmitted: s.lastSubmitted || null,
    isPending: s.isPending || false,
    errors: parseInt(s.errors) || 0,
    warnings: parseInt(s.warnings) || 0,
    contents: (s.contents || []).map(c => ({
      type: c.type,
      submitted: parseInt(c.submitted) || 0,
      indexed: parseInt(c.indexed) || 0,
    })),
  }));
}

/**
 * Test API connection
 */
async function testConnection() {
  const auth = await getAuthClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  // Simple query for yesterday to verify access
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 3);
  const dateStr = yesterday.toISOString().split('T')[0];

  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: dateStr,
      endDate: dateStr,
      dimensions: ['page'],
      rowLimit: 1,
      type: 'web',
    },
  });

  return {
    success: true,
    rowCount: (response.data.rows || []).length,
    date: dateStr,
  };
}

module.exports = {
  getSearchAnalytics,
  getIndexingStatus,
  getSitemapStatus,
  testConnection,
};
