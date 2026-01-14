#!/usr/bin/env node

// Load environment variables (required for cron jobs)
require('dotenv').config();

/**
 * Daily Google Indexing API Cron Script
 *
 * Automatically submits NEW jobs to Google Indexing API daily.
 * Uses database tracking (googleIndexedAt field) instead of JSON file.
 *
 * Features:
 * - Respects daily quota (195/day to stay under 200 limit)
 * - Tracks submissions in database via googleIndexedAt field
 * - Handles quota exceeded (429) gracefully - queues for next day
 * - Sends email notification on failures
 * - Submits URL_DELETED for inactive jobs that were previously indexed
 *
 * Usage:
 *   node scripts/daily-google-indexing.js [options]
 *
 * Options:
 *   --dry-run    Show what would be submitted without hitting the API
 *
 * Cron example (run daily at 3am):
 *   0 3 * * * cd /path/to/app && node scripts/daily-google-indexing.js >> logs/indexing.log 2>&1
 */

const { PrismaClient } = require('@prisma/client');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const { execSync } = require('child_process');
const path = require('path');
const googleIndexingService = require('../lib/services/googleIndexingService');

const prisma = new PrismaClient();

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';
const DAILY_QUOTA = 195; // Stay under 200 limit with safety buffer
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 20 * 1000; // 20 seconds

// Track results for notification
const stats = {
  newJobsFound: 0,
  deletedJobsFound: 0,
  updatedSuccess: 0,
  updatedFailed: 0,
  deletedSuccess: 0,
  deletedFailed: 0,
  quotaExceeded: false,
  errors: []
};

/**
 * Send email notification
 */
function sendNotification(subject, body) {
  try {
    const sendEmailScript = path.join(__dirname, 'send-email.js');
    execSync(`node "${sendEmailScript}" "${subject}" "${body}"`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch NEW active jobs that haven't been indexed yet
 */
async function fetchNewJobsToIndex(limit) {
  const jobs = await prisma.nursingJob.findMany({
    where: {
      isActive: true,
      googleIndexedAt: null
    },
    select: {
      id: true,
      slug: true
    },
    orderBy: { scrapedAt: 'desc' },
    take: limit
  });

  return jobs.map(job => ({
    id: job.id,
    url: `${SITE_URL}/jobs/nursing/${job.slug}`
  }));
}

/**
 * Fetch DELETED/inactive jobs that WERE indexed (need URL_DELETED)
 */
async function fetchDeletedJobsToNotify(limit) {
  const jobs = await prisma.nursingJob.findMany({
    where: {
      isActive: false,
      googleIndexedAt: { not: null }
    },
    select: {
      id: true,
      slug: true
    },
    orderBy: { updatedAt: 'desc' },
    take: limit
  });

  return jobs.map(job => ({
    id: job.id,
    url: `${SITE_URL}/jobs/nursing/${job.slug}`
  }));
}

/**
 * Submit a single URL to the indexing API
 * Returns: { success: boolean, quotaExceeded?: boolean, error?: string }
 */
async function submitUrl(url, type) {
  try {
    const result = await googleIndexingService.submitUrl(url, type);

    if (result.success) {
      return { success: true };
    }

    // Check for quota exceeded (429 error)
    if (result.error && (
      result.error.includes('429') ||
      result.error.toLowerCase().includes('quota') ||
      result.error.toLowerCase().includes('rate limit')
    )) {
      return { success: false, quotaExceeded: true, error: result.error };
    }

    return { success: false, error: result.error };
  } catch (error) {
    if (error.message && (
      error.message.includes('429') ||
      error.message.toLowerCase().includes('quota')
    )) {
      return { success: false, quotaExceeded: true, error: error.message };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Update googleIndexedAt timestamp for successfully indexed jobs
 */
async function markJobsAsIndexed(jobIds) {
  if (jobIds.length === 0) return;

  await prisma.nursingJob.updateMany({
    where: { id: { in: jobIds } },
    data: { googleIndexedAt: new Date() }
  });
}

/**
 * Clear googleIndexedAt for deleted jobs (so we don't resubmit URL_DELETED)
 */
async function clearIndexedForDeletedJobs(jobIds) {
  if (jobIds.length === 0) return;

  await prisma.nursingJob.updateMany({
    where: { id: { in: jobIds } },
    data: { googleIndexedAt: null }
  });
}

/**
 * Check configuration before running
 */
async function checkConfig() {
  console.log('🔧 Checking Google Indexing API configuration...');
  const config = await googleIndexingService.checkConfiguration();

  if (!config.configured) {
    console.error(`❌ Configuration Error: ${config.error}`);
    return false;
  }

  console.log('✅ Configuration OK\n');
  return true;
}

/**
 * Main execution
 */
async function main() {
  const startTime = new Date();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Daily Google Indexing Cron - ${startTime.toISOString()}`);
  console.log(`   Mode: ${isDryRun ? '🧪 DRY RUN (no API calls)' : '✅ LIVE'}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Check configuration (skip in dry-run)
    if (!isDryRun) {
      const configOk = await checkConfig();
      if (!configOk) {
        stats.errors.push('Configuration check failed');
        throw new Error('Configuration check failed');
      }
    } else {
      console.log('🧪 Skipping config check in dry-run mode\n');
    }

    let quotaRemaining = DAILY_QUOTA;

    // ============================================
    // Phase 1: Submit NEW jobs (URL_UPDATED)
    // ============================================
    console.log('📤 Phase 1: Submitting NEW jobs...\n');

    const newJobs = await fetchNewJobsToIndex(quotaRemaining);
    stats.newJobsFound = newJobs.length;
    console.log(`   Found ${newJobs.length} new jobs to index\n`);

    const successfulNewJobIds = [];

    for (let i = 0; i < newJobs.length; i++) {
      if (quotaRemaining <= 0) {
        console.log('   ⚠️  Daily quota reached, stopping...');
        break;
      }

      const job = newJobs[i];

      if (isDryRun) {
        // Dry run - just log
        stats.updatedSuccess++;
        successfulNewJobIds.push(job.id);
        quotaRemaining--;
        console.log(`   🧪 [${i + 1}/${newJobs.length}] Would submit: ${job.url}`);
      } else {
        const result = await submitUrl(job.url, 'URL_UPDATED');

        if (result.success) {
          stats.updatedSuccess++;
          successfulNewJobIds.push(job.id);
          quotaRemaining--;
          console.log(`   ✅ [${i + 1}/${newJobs.length}] ${job.url}`);
        } else if (result.quotaExceeded) {
          stats.quotaExceeded = true;
          console.log(`   ⚠️  Quota exceeded at job ${i + 1}, stopping...`);
          break;
        } else {
          stats.updatedFailed++;
          stats.errors.push(`UPDATE ${job.url}: ${result.error}`);
          console.log(`   ❌ [${i + 1}/${newJobs.length}] ${job.url}: ${result.error}`);
        }

        // Small delay between requests
        if (i < newJobs.length - 1 && quotaRemaining > 0) {
          await sleep(500);
        }

        // Longer delay every batch
        if ((i + 1) % BATCH_SIZE === 0 && quotaRemaining > 0) {
          console.log(`   ⏳ Batch complete, waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s...`);
          await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
      }
    }

    // Update database for successful submissions (skip in dry-run)
    if (!isDryRun) {
      await markJobsAsIndexed(successfulNewJobIds);
    }
    console.log(`\n   📊 Phase 1 complete: ${stats.updatedSuccess} indexed, ${stats.updatedFailed} failed\n`);

    // ============================================
    // Phase 2: Submit DELETED jobs (URL_DELETED)
    // ============================================
    if (quotaRemaining > 0 && !stats.quotaExceeded) {
      console.log('🗑️  Phase 2: Notifying about DELETED jobs...\n');

      const deletedJobs = await fetchDeletedJobsToNotify(quotaRemaining);
      stats.deletedJobsFound = deletedJobs.length;
      console.log(`   Found ${deletedJobs.length} deleted jobs to notify\n`);

      const successfulDeletedJobIds = [];

      for (let i = 0; i < deletedJobs.length; i++) {
        if (quotaRemaining <= 0) {
          console.log('   ⚠️  Daily quota reached, stopping...');
          break;
        }

        const job = deletedJobs[i];

        if (isDryRun) {
          // Dry run - just log
          stats.deletedSuccess++;
          successfulDeletedJobIds.push(job.id);
          quotaRemaining--;
          console.log(`   🧪 [${i + 1}/${deletedJobs.length}] Would notify deleted: ${job.url}`);
        } else {
          const result = await submitUrl(job.url, 'URL_DELETED');

          if (result.success) {
            stats.deletedSuccess++;
            successfulDeletedJobIds.push(job.id);
            quotaRemaining--;
            console.log(`   ✅ [${i + 1}/${deletedJobs.length}] ${job.url}`);
          } else if (result.quotaExceeded) {
            stats.quotaExceeded = true;
            console.log(`   ⚠️  Quota exceeded at job ${i + 1}, stopping...`);
            break;
          } else {
            stats.deletedFailed++;
            stats.errors.push(`DELETE ${job.url}: ${result.error}`);
            console.log(`   ❌ [${i + 1}/${deletedJobs.length}] ${job.url}: ${result.error}`);
          }

          // Small delay between requests
          if (i < deletedJobs.length - 1 && quotaRemaining > 0) {
            await sleep(500);
          }
        }
      }

      // Clear googleIndexedAt for successful deletions (skip in dry-run)
      if (!isDryRun) {
        await clearIndexedForDeletedJobs(successfulDeletedJobIds);
      }
      console.log(`\n   📊 Phase 2 complete: ${stats.deletedSuccess} notified, ${stats.deletedFailed} failed\n`);
    }

    // ============================================
    // Summary
    // ============================================
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`${'='.repeat(60)}`);
    console.log('📊 DAILY INDEXING SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Quota used: ${DAILY_QUOTA - quotaRemaining}/${DAILY_QUOTA}`);
    console.log(`   New jobs indexed: ${stats.updatedSuccess}/${stats.newJobsFound}`);
    console.log(`   Deleted jobs notified: ${stats.deletedSuccess}/${stats.deletedJobsFound}`);
    console.log(`   Total failures: ${stats.updatedFailed + stats.deletedFailed}`);
    if (stats.quotaExceeded) {
      console.log(`   ⚠️  Quota exceeded - remaining jobs will be processed tomorrow`);
    }
    console.log(`${'='.repeat(60)}\n`);

    // Send notification if there were failures (skip in dry-run)
    if (!isDryRun && (stats.updatedFailed + stats.deletedFailed > 0 || stats.quotaExceeded)) {
      const subject = `[IntelliResume] Google Indexing: ${stats.updatedFailed + stats.deletedFailed} failures`;
      const body = `Daily Google Indexing Cron Report
================================
Date: ${startTime.toISOString()}
Duration: ${duration}s

Results:
- New jobs indexed: ${stats.updatedSuccess}/${stats.newJobsFound}
- Deleted jobs notified: ${stats.deletedSuccess}/${stats.deletedJobsFound}
- Failures: ${stats.updatedFailed + stats.deletedFailed}
- Quota exceeded: ${stats.quotaExceeded ? 'Yes' : 'No'}

${stats.errors.length > 0 ? `Errors (first 10):\n${stats.errors.slice(0, 10).join('\n')}` : ''}
`;
      sendNotification(subject, body);
    }

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);

    // Send failure notification (skip in dry-run)
    if (isDryRun) {
      console.log('🧪 Dry run - skipping failure notification');
      throw error;
    }
    const subject = '[IntelliResume] Google Indexing FAILED';
    const body = `Daily Google Indexing Cron FAILED
=================================
Date: ${new Date().toISOString()}
Error: ${error.message}

Stats at time of failure:
- New jobs found: ${stats.newJobsFound}
- Updated success: ${stats.updatedSuccess}
- Updated failed: ${stats.updatedFailed}

Please check the logs for more details.
`;
    sendNotification(subject, body);

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
main().catch(error => {
  console.error(error);
  process.exit(1);
});
