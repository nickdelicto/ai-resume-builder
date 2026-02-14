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
 * Inspect URL indexing status
 * Quota: 2000 requests/day — use sparingly
 * @param {string[]} urls - Full URLs to inspect
 * @returns {Promise<Array<{url: string, verdict: string, indexingState: string, lastCrawlTime: string, pageFetchState: string}>>}
 */
async function getIndexingStatus(urls) {
  const auth = await getAuthClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const results = [];
  for (const url of urls) {
    try {
      const response = await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: SITE_URL,
        },
      });

      const result = response.data.inspectionResult?.indexStatusResult || {};
      results.push({
        url,
        verdict: result.verdict || 'UNKNOWN',
        indexingState: result.indexingState || 'UNKNOWN',
        lastCrawlTime: result.lastCrawlTime || null,
        pageFetchState: result.pageFetchState || 'UNKNOWN',
        robotsTxtState: result.robotsTxtState || 'UNKNOWN',
      });

      // 200ms delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      results.push({ url, verdict: 'ERROR', error: error.message });
    }
  }

  return results;
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
  testConnection,
};
