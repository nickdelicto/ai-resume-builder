/**
 * Bing Webmaster Tools API Service
 * Fetches search performance data (queries and pages) from Bing
 *
 * API Key auth: Settings > API Access in Bing Webmaster Tools
 * Base URL: https://ssl.bing.com/webmaster/api.svc/json/
 */

const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';
const API_KEY = process.env.BING_WEBMASTER_API_KEY || null;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';

/**
 * Parse Microsoft JSON date format: "/Date(1399100400000)/" → Date
 */
function parseMsDate(msDate) {
  if (!msDate) return null;
  const match = msDate.match(/\d+/);
  if (!match) return null;
  return new Date(parseInt(match[0]));
}

/**
 * Check if the Bing API is configured
 */
function checkConfiguration() {
  return { configured: !!API_KEY };
}

/**
 * Fetch query-level search analytics from Bing
 * Returns all available data (~6 months, weekly buckets)
 * @param {string} siteUrl - The verified site URL
 * @returns {Promise<Array<{query, clicks, impressions, ctr, position, date}>>}
 */
async function getQueryStats(siteUrl = SITE_URL) {
  if (!API_KEY) {
    throw new Error('BING_WEBMASTER_API_KEY environment variable not set');
  }

  const encodedUrl = encodeURIComponent(siteUrl);
  const url = `${BING_API_BASE}/GetQueryStats?apikey=${API_KEY}&siteUrl=${encodedUrl}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bing API GetQueryStats failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const rows = data.d || data || [];

  return rows.map(row => ({
    query: row.Query,
    clicks: row.Clicks || 0,
    impressions: row.Impressions || 0,
    ctr: row.Impressions > 0 ? row.Clicks / row.Impressions : 0,
    position: row.AvgImpressionPosition || 0,
    date: parseMsDate(row.Date),
  })).filter(r => r.date !== null);
}

/**
 * Fetch page-level search analytics from Bing
 * Returns all available data (~6 months, weekly buckets)
 * @param {string} siteUrl - The verified site URL
 * @returns {Promise<Array<{page, clicks, impressions, ctr, position, date}>>}
 */
async function getPageStats(siteUrl = SITE_URL) {
  if (!API_KEY) {
    throw new Error('BING_WEBMASTER_API_KEY environment variable not set');
  }

  const encodedUrl = encodeURIComponent(siteUrl);
  const url = `${BING_API_BASE}/GetPageStats?apikey=${API_KEY}&siteUrl=${encodedUrl}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bing API GetPageStats failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const rows = data.d || data || [];

  return rows.map(row => ({
    page: row.Query || row.PageUrl || row.Url || '',
    clicks: row.Clicks || 0,
    impressions: row.Impressions || 0,
    ctr: row.Impressions > 0 ? row.Clicks / row.Impressions : 0,
    position: row.AvgImpressionPosition || 0,
    date: parseMsDate(row.Date),
  })).filter(r => r.date !== null && r.page);
}

module.exports = {
  getQueryStats,
  getPageStats,
  checkConfiguration,
};
