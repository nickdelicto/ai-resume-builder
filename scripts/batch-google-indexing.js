#!/usr/bin/env node

// Load environment variables (required for cron jobs)
require('dotenv').config();

/**
 * Batched Google Indexing API Submission Script
 *
 * Submits job URLs to Google Indexing API in batches to avoid rate limiting.
 * Specifically designed for JobPosting pages to appear in Google for Jobs faster.
 *
 * Features:
 * - Batches of 50 URLs (under 200/min rate limit)
 * - 20-second delays between batches
 * - Tracks submitted URLs to avoid duplicates
 * - Only submits NEW or UPDATED jobs
 * - Supports both URL_UPDATED and URL_DELETED actions
 *
 * Prerequisites:
 * 1. GOOGLE_SERVICE_ACCOUNT_JSON env var must be set (base64-encoded JSON key)
 * 2. Service account must be added as owner in Google Search Console
 *
 * Usage:
 *   node scripts/batch-google-indexing.js [options]
 *
 * Options:
 *   --dry-run           Don't actually submit, just show what would be submitted
 *   --employer=slug     Only submit jobs from specific employer
 *   --action=update     'update' (default) or 'delete'
 *   --force             Resubmit even if already submitted
 *   --check-status      Check indexing status instead of submitting
 *   --limit=N           Only process first N URLs
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const googleIndexingService = require('../lib/services/googleIndexingService');

const prisma = new PrismaClient();

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';
const TRACKING_FILE = path.join(__dirname, 'google-indexing-submitted-urls.json');
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 20 * 1000; // 20 seconds (to stay under 200/min)

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const forceResubmit = args.includes('--force');
const checkStatus = args.includes('--check-status');
const employerArg = args.find(arg => arg.startsWith('--employer='));
const employerSlug = employerArg ? employerArg.split('=')[1] : null;
const actionArg = args.find(arg => arg.startsWith('--action='));
const action = actionArg ? actionArg.split('=')[1] : 'update';
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

console.log('🚀 Google Indexing API Batch Submission Starting...\n');
console.log(`Mode: ${isDryRun ? '🧪 DRY RUN (no actual submissions)' : '✅ LIVE'}`);
console.log(`Action: ${action === 'delete' ? '🗑️  URL_DELETED' : '📤 URL_UPDATED'}`);
console.log(`Employer: ${employerSlug || 'ALL employers'}`);
console.log(`Force resubmit: ${forceResubmit ? 'Yes' : 'No'}`);
if (limit) console.log(`Limit: ${limit} URLs`);
console.log('');

/**
 * Load previously submitted URLs from tracking file
 */
function loadSubmittedUrls() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = fs.readFileSync(TRACKING_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return {
        updated: new Set(parsed.updated || []),
        deleted: new Set(parsed.deleted || [])
      };
    }
  } catch (error) {
    console.log(`⚠️  Could not load tracking file: ${error.message}`);
  }
  return { updated: new Set(), deleted: new Set() };
}

/**
 * Save submitted URLs to tracking file
 */
function saveSubmittedUrls(tracking) {
  try {
    const data = {
      lastUpdated: new Date().toISOString(),
      updatedCount: tracking.updated.size,
      deletedCount: tracking.deleted.size,
      updated: Array.from(tracking.updated),
      deleted: Array.from(tracking.deleted)
    };
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Saved tracking file (${tracking.updated.size} updated, ${tracking.deleted.size} deleted)\n`);
  } catch (error) {
    console.error(`❌ Failed to save tracking file: ${error.message}`);
  }
}

/**
 * Fetch all active job URLs from database
 */
async function fetchActiveJobUrls() {
  const where = { isActive: true };

  // Filter by employer if specified
  if (employerSlug) {
    const employer = await prisma.healthcareEmployer.findUnique({
      where: { slug: employerSlug }
    });
    if (!employer) {
      throw new Error(`Employer not found: ${employerSlug}`);
    }
    where.employerId = employer.id;
  }

  const jobs = await prisma.nursingJob.findMany({
    where,
    select: { slug: true, updatedAt: true },
    orderBy: { scrapedAt: 'desc' }
  });

  return jobs.map(job => ({
    url: `${SITE_URL}/jobs/nursing/${job.slug}`,
    updatedAt: job.updatedAt
  }));
}

/**
 * Fetch deleted/inactive job URLs from database
 */
async function fetchDeletedJobUrls() {
  const where = { isActive: false };

  if (employerSlug) {
    const employer = await prisma.healthcareEmployer.findUnique({
      where: { slug: employerSlug }
    });
    if (!employer) {
      throw new Error(`Employer not found: ${employerSlug}`);
    }
    where.employerId = employer.id;
  }

  const jobs = await prisma.nursingJob.findMany({
    where,
    select: { slug: true },
    orderBy: { updatedAt: 'desc' }
  });

  // Also get from DeletedJob table
  const deletedJobs = await prisma.deletedJob.findMany({
    select: { slug: true }
  });

  const allSlugs = new Set([
    ...jobs.map(j => j.slug),
    ...deletedJobs.map(j => j.slug)
  ]);

  return Array.from(allSlugs).map(slug => ({
    url: `${SITE_URL}/jobs/nursing/${slug}`
  }));
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check configuration before running
 */
async function checkConfig() {
  console.log('🔧 Checking Google Indexing API configuration...');
  const config = await googleIndexingService.checkConfiguration();

  if (!config.configured) {
    console.error(`\n❌ Configuration Error: ${config.error}`);
    console.log('\nSetup instructions:');
    console.log('1. Create a Google Cloud project');
    console.log('2. Enable the "Web Search Indexing API"');
    console.log('3. Create a service account with JSON key');
    console.log('4. Add service account email as owner in Google Search Console');
    console.log('5. Set GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
    console.log('   (base64-encode the JSON key: base64 -w0 service-account.json)\n');
    return false;
  }

  if (!config.working) {
    console.error(`\n⚠️  API Warning: ${config.error}`);
    console.log('The service account may not have permission in Search Console.');
    console.log('Continuing anyway - some requests may fail.\n');
  } else {
    console.log('✅ Configuration looks good!\n');
  }

  return true;
}

/**
 * Check indexing status of URLs (--check-status mode)
 */
async function runStatusCheck() {
  console.log('📊 Checking indexing status of job URLs...\n');

  const jobs = await fetchActiveJobUrls();
  const urlsToCheck = limit ? jobs.slice(0, limit) : jobs.slice(0, 10); // Default to first 10

  console.log(`Checking ${urlsToCheck.length} URLs:\n`);

  for (const { url } of urlsToCheck) {
    const result = await googleIndexingService.getUrlStatus(url);
    if (result.success) {
      const latestUpdate = result.status?.latestUpdate?.notifyTime;
      const latestRemove = result.status?.latestRemove?.notifyTime;
      console.log(`✅ ${url}`);
      if (latestUpdate) console.log(`   Last updated: ${latestUpdate}`);
      if (latestRemove) console.log(`   Last removed: ${latestRemove}`);
    } else {
      console.log(`❌ ${url}: ${result.error}`);
    }
    await sleep(200); // Small delay between requests
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Check configuration first
    const configOk = await checkConfig();
    if (!configOk) {
      process.exit(1);
    }

    // Handle status check mode
    if (checkStatus) {
      await runStatusCheck();
      return;
    }

    // Fetch URLs based on action
    console.log('📊 Fetching job URLs from database...');
    let jobData;

    if (action === 'delete') {
      jobData = await fetchDeletedJobUrls();
      console.log(`   Found ${jobData.length} deleted/inactive jobs\n`);
    } else {
      jobData = await fetchActiveJobUrls();
      console.log(`   Found ${jobData.length} active jobs\n`);
    }

    if (jobData.length === 0) {
      console.log('✅ No jobs to submit');
      return;
    }

    // Load tracking data
    console.log('📂 Loading previously submitted URLs...');
    const tracking = loadSubmittedUrls();
    const trackingSet = action === 'delete' ? tracking.deleted : tracking.updated;
    console.log(`   Found ${trackingSet.size} previously submitted URLs\n`);

    // Filter URLs
    let urlsToSubmit = jobData.map(j => j.url);

    if (!forceResubmit) {
      urlsToSubmit = urlsToSubmit.filter(url => !trackingSet.has(url));
      console.log(`🆕 Found ${urlsToSubmit.length} NEW URLs to submit\n`);
    } else {
      console.log(`🔄 Force mode: Will resubmit all ${urlsToSubmit.length} URLs\n`);
    }

    // Apply limit if specified
    if (limit && urlsToSubmit.length > limit) {
      urlsToSubmit = urlsToSubmit.slice(0, limit);
      console.log(`📏 Limited to ${limit} URLs\n`);
    }

    if (urlsToSubmit.length === 0) {
      console.log('✅ All URLs already submitted - nothing to do!');
      return;
    }

    // Calculate batches
    const batchCount = Math.ceil(urlsToSubmit.length / BATCH_SIZE);
    console.log(`📦 Will submit ${batchCount} batch(es) of up to ${BATCH_SIZE} URLs each\n`);

    if (isDryRun) {
      console.log('🧪 DRY RUN - Would submit these URLs:');
      urlsToSubmit.slice(0, 20).forEach(url => console.log(`   ${url}`));
      if (urlsToSubmit.length > 20) {
        console.log(`   ... and ${urlsToSubmit.length - 20} more`);
      }
      console.log('\n✅ Dry run complete - no actual submissions made');
      return;
    }

    // Submit using the service
    const type = action === 'delete' ? 'URL_DELETED' : 'URL_UPDATED';
    const results = await googleIndexingService.submitUrlsBatch(urlsToSubmit, type, {
      batchSize: BATCH_SIZE,
      delayBetweenBatches: DELAY_BETWEEN_BATCHES_MS,
      dryRun: false,
      onProgress: (completed, total) => {
        const pct = Math.round((completed / total) * 100);
        console.log(`   Progress: ${completed}/${total} (${pct}%)`);
      }
    });

    // Update tracking
    results.submitted.forEach(url => trackingSet.add(url));
    saveSubmittedUrls(tracking);

    // Final summary
    console.log(`\n✅ Google Indexing submission complete!`);
    console.log(`   ✅ Success: ${results.success} URLs`);
    console.log(`   ❌ Failed: ${results.failed} URLs`);
    console.log(`   📊 Total tracked: ${trackingSet.size} URLs`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Failed URLs:');
      results.errors.slice(0, 10).forEach(e => {
        console.log(`   ${e.url}: ${e.error}`);
      });
      if (results.errors.length > 10) {
        console.log(`   ... and ${results.errors.length - 10} more`);
      }
    }

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
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
