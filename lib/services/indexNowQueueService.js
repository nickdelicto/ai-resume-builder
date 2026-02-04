/**
 * IndexNow Queue Service
 *
 * Queues URLs for throttled submission to IndexNow API.
 * This implements "streaming" mode as recommended by Bing -
 * URLs are submitted individually at a controlled rate rather than in batches.
 *
 * The queue is processed by scripts/indexnow-worker.js running on the scraper VPS.
 *
 * Note: BullMQ is lazy-loaded to avoid errors on servers where Redis isn't available.
 * On production VPS (Next.js), the queue operations will silently fail if Redis isn't configured.
 * On scraper VPS, Redis is available and the queue will work normally.
 */

let Queue = null;
let bullmqAvailable = null; // null = not checked yet, true/false after first check

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';

// Redis connection (same as scraper queue)
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Lazy initialization of queue (only create when needed)
let indexNowQueue = null;

/**
 * Lazy-load BullMQ and create queue
 * Returns null if BullMQ is not available (e.g., on production VPS)
 */
function getQueue() {
  // First time: try to load BullMQ
  if (bullmqAvailable === null) {
    try {
      Queue = require('bullmq').Queue;
      bullmqAvailable = true;
    } catch (error) {
      console.log('IndexNow Queue: BullMQ not available, queue operations will be skipped');
      bullmqAvailable = false;
    }
  }

  // BullMQ not available - return null
  if (!bullmqAvailable) {
    return null;
  }

  // Create queue instance if needed
  if (!indexNowQueue) {
    indexNowQueue = new Queue('indexnow-urls', { connection });
  }
  return indexNowQueue;
}

/**
 * Queue a URL for IndexNow submission
 * @param {string} url - Full URL or path (will be prefixed with SITE_URL if relative)
 * @param {string} action - 'update' or 'delete' (for logging purposes)
 * @returns {Promise<boolean>}
 */
async function queueUrl(url, action = 'update') {
  try {
    const queue = getQueue();
    if (!queue) {
      // BullMQ not available - silently skip (production VPS doesn't have Redis)
      return false;
    }

    const fullUrl = url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? url : `/${url}`}`;

    await queue.add(
      'submit-url',
      { url: fullUrl, action, queuedAt: new Date().toISOString() },
      {
        // Deduplicate by URL - if same URL is queued again, skip it
        jobId: `indexnow-${Buffer.from(fullUrl).toString('base64').slice(0, 50)}`,
        // Remove completed jobs after 1 hour
        removeOnComplete: { age: 3600 },
        // Keep failed jobs for 24 hours for debugging
        removeOnFail: { age: 86400 },
      }
    );

    return true;
  } catch (error) {
    // If it's a duplicate job error, that's fine - URL already queued
    if (error.message?.includes('Job with id')) {
      return true;
    }
    console.error(`Failed to queue URL for IndexNow: ${error.message}`);
    return false;
  }
}

/**
 * Queue a job URL for IndexNow submission
 * @param {object} job - Job object with slug
 * @param {string} action - 'update' or 'delete'
 * @returns {Promise<boolean>}
 */
async function queueJobUrl(job, action = 'update') {
  if (!job?.slug) return false;
  return queueUrl(`/jobs/nursing/${job.slug}`, action);
}

/**
 * Queue multiple job URLs
 * @param {Array<object>} jobs - Array of job objects with slugs
 * @param {string} action - 'update' or 'delete'
 * @returns {Promise<number>} - Number of URLs queued
 */
async function queueJobUrls(jobs, action = 'update') {
  if (!jobs || jobs.length === 0) return 0;

  let queued = 0;
  for (const job of jobs) {
    if (await queueJobUrl(job, action)) {
      queued++;
    }
  }
  return queued;
}

/**
 * Get queue statistics
 * @returns {Promise<object>}
 */
async function getQueueStats() {
  const queue = getQueue();
  if (!queue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, available: false };
  }
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed, available: true };
}

/**
 * Close the queue connection (for graceful shutdown)
 */
async function closeQueue() {
  if (indexNowQueue) {
    await indexNowQueue.close();
    indexNowQueue = null;
  }
}

module.exports = {
  queueUrl,
  queueJobUrl,
  queueJobUrls,
  getQueueStats,
  closeQueue,
};
