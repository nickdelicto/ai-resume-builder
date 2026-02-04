#!/usr/bin/env node

/**
 * IndexNow Queue Worker
 *
 * Processes the IndexNow URL queue at a throttled rate to avoid rate limiting.
 * Implements "streaming" mode as recommended by Bing.
 *
 * Rate: 1 URL every 6 seconds = 10 URLs/minute = 600/hour = 14,400/day
 *
 * Usage:
 *   node scripts/indexnow-worker.js
 *
 * PM2:
 *   pm2 start scripts/indexnow-worker.js --name indexnow-worker
 */

require('dotenv').config();

const { Worker } = require('bullmq');

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '804d73076199e9238a06248816256b51';
const INDEXNOW_API_URL = 'https://api.indexnow.org/IndexNow';

// Throttle: 1 URL every 6 seconds (10/minute)
const THROTTLE_MS = 6000;

// Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Track last submission time for throttling
let lastSubmitTime = 0;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Submit a single URL to IndexNow API
 */
async function submitToIndexNow(url) {
  const payload = {
    host: new URL(SITE_URL).hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    url: url,
  };

  const response = await fetch(INDEXNOW_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return {
    success: response.ok || response.status === 202,
    status: response.status,
  };
}

/**
 * Process a single URL from the queue
 */
async function processUrl(job) {
  const { url, action } = job.data;

  // Throttle: ensure minimum time between submissions
  const now = Date.now();
  const timeSinceLastSubmit = now - lastSubmitTime;

  if (timeSinceLastSubmit < THROTTLE_MS) {
    const waitTime = THROTTLE_MS - timeSinceLastSubmit;
    await sleep(waitTime);
  }

  // Submit to IndexNow
  const result = await submitToIndexNow(url);
  lastSubmitTime = Date.now();

  if (result.success) {
    console.log(`✅ [${new Date().toISOString()}] ${action}: ${url} (${result.status})`);
  } else {
    console.error(`❌ [${new Date().toISOString()}] Failed: ${url} (${result.status})`);
    throw new Error(`IndexNow submission failed with status ${result.status}`);
  }

  return result;
}

// Create worker
const worker = new Worker('indexnow-urls', processUrl, {
  connection,
  // Process one job at a time (throttling handled in processUrl)
  concurrency: 1,
  // Limit rate further using BullMQ's limiter
  limiter: {
    max: 10,
    duration: 60000, // 10 per minute max
  },
});

// Event handlers
worker.on('completed', (job) => {
  // Logged in processUrl
});

worker.on('failed', (job, err) => {
  console.error(`❌ [${new Date().toISOString()}] Job ${job.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error(`Worker error: ${err.message}`);
});

// Startup message
console.log('='.repeat(60));
console.log('IndexNow Queue Worker Started');
console.log('='.repeat(60));
console.log(`Site: ${SITE_URL}`);
console.log(`Rate: 1 URL every ${THROTTLE_MS / 1000} seconds (max 10/minute)`);
console.log(`Redis: ${connection.host}:${connection.port}`);
console.log('='.repeat(60));
console.log('Waiting for URLs to process...\n');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, closing worker...');
  await worker.close();
  process.exit(0);
});
