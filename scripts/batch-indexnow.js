#!/usr/bin/env node

// Load environment variables (required for cron jobs)
require('dotenv').config();

/**
 * Batched IndexNow Submission Script
 *
 * Submits job URLs to IndexNow API in batches to avoid rate limiting.
 * Based on successful implementation from mpgcalculator.net
 *
 * Features:
 * - Batches of 50 URLs (IndexNow recommendation)
 * - 3-minute delays between batches
 * - Tracks submitted URLs to avoid duplicates
 * - Phase 1: Submits NEW active jobs
 * - Phase 2: Submits DELETED jobs (so Bing removes them from index)
 *
 * Usage:
 *   node scripts/batch-indexnow.js [--dry-run] [--employer=slug]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Configuration
const SITE_URL = 'https://intelliresume.net';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '804d73076199e9238a06248816256b51';
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const TRACKING_FILE = path.join(__dirname, 'indexnow-submitted-urls.json');
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 3 * 60 * 1000; // 3 minutes

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const employerArg = args.find(arg => arg.startsWith('--employer='));
const employerSlug = employerArg ? employerArg.split('=')[1] : null;

console.log('🚀 IndexNow Batch Submission Starting...\n');
console.log(`Mode: ${isDryRun ? '🧪 DRY RUN (no actual submissions)' : '✅ LIVE'}`);
console.log(`Employer: ${employerSlug || 'ALL employers'}\n`);

/**
 * Load previously submitted URLs from tracking file
 */
function loadSubmittedUrls() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = fs.readFileSync(TRACKING_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return new Set(parsed.urls || []);
    }
  } catch (error) {
    console.log(`⚠️  Could not load tracking file: ${error.message}`);
  }
  return new Set();
}

/**
 * Save submitted URLs to tracking file
 */
function saveSubmittedUrls(urlsSet) {
  try {
    const data = {
      lastUpdated: new Date().toISOString(),
      count: urlsSet.size,
      urls: Array.from(urlsSet)
    };
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Saved ${urlsSet.size} URLs to tracking file\n`);
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
    select: { slug: true },
    orderBy: { scrapedAt: 'desc' }
  });

  return jobs.map(job => `${SITE_URL}/jobs/nursing/${job.slug}`);
}

/**
 * Fetch inactive job URLs from database (for deletion notification)
 */
async function fetchInactiveJobUrls() {
  const where = { isActive: false };

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
    select: { slug: true },
    orderBy: { updatedAt: 'desc' }
  });

  return jobs.map(job => `${SITE_URL}/jobs/nursing/${job.slug}`);
}

/**
 * Submit batch of URLs to IndexNow API
 */
async function submitBatch(urls) {
  const payload = {
    host: 'intelliresume.net',
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  };
  
  try {
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok || response.status === 202) {
      return { success: true, status: response.status };
    } else {
      const errorText = await response.text();
      return { success: false, status: response.status, error: errorText };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Submit URLs in batches with delays
 * Returns { submitted: number, failed: number }
 */
async function submitUrlsInBatches(urls, submittedUrls, phase) {
  const batches = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Will submit ${batches.length} batch(es) of up to ${BATCH_SIZE} URLs each\n`);

  if (isDryRun) {
    console.log(`🧪 DRY RUN - Would submit ${urls.length} URLs in ${batches.length} batches`);
    return { submitted: urls.length, failed: 0 };
  }

  let totalSubmitted = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;

    console.log(`📤 [${phase}] Submitting batch ${batchNum}/${batches.length} (${batch.length} URLs)...`);

    const result = await submitBatch(batch);

    if (result.success) {
      console.log(`   ✅ Batch ${batchNum} submitted successfully (status ${result.status})`);
      totalSubmitted += batch.length;

      // For new URLs, add to tracking; for deleted, remove from tracking
      if (phase === 'Phase 1') {
        batch.forEach(url => submittedUrls.add(url));
      } else {
        batch.forEach(url => submittedUrls.delete(url));
      }
    } else {
      console.error(`   ❌ Batch ${batchNum} failed:`, result.error || `Status ${result.status}`);
      totalFailed += batch.length;
    }

    // Wait before next batch (except for last batch)
    if (i < batches.length - 1) {
      const delayMinutes = DELAY_BETWEEN_BATCHES_MS / 60000;
      console.log(`   ⏳ Waiting ${delayMinutes} minutes before next batch...\n`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  return { submitted: totalSubmitted, failed: totalFailed };
}

/**
 * Main execution
 */
async function main() {
  try {
    // Load previously submitted URLs
    console.log('📂 Loading previously submitted URLs...');
    const submittedUrls = loadSubmittedUrls();
    console.log(`   Found ${submittedUrls.size} previously submitted URLs\n`);

    let phase1Submitted = 0;
    let phase2Submitted = 0;

    // ============================================
    // Phase 1: Submit NEW active jobs
    // ============================================
    console.log('=' .repeat(50));
    console.log('📤 Phase 1: Submitting NEW active jobs...');
    console.log('='.repeat(50) + '\n');

    const activeUrls = await fetchActiveJobUrls();
    console.log(`   Found ${activeUrls.length} active jobs in database`);

    const newUrls = activeUrls.filter(url => !submittedUrls.has(url));
    console.log(`   ${newUrls.length} are NEW (not yet submitted)\n`);

    if (newUrls.length > 0) {
      const result = await submitUrlsInBatches(newUrls, submittedUrls, 'Phase 1');
      phase1Submitted = result.submitted;
      console.log(`\n   📊 Phase 1 complete: ${result.submitted} submitted, ${result.failed} failed\n`);
    } else {
      console.log('   ✅ No new URLs to submit\n');
    }

    // ============================================
    // Phase 2: Submit DELETED jobs (dead links)
    // ============================================
    console.log('='.repeat(50));
    console.log('🗑️  Phase 2: Notifying about DELETED jobs...');
    console.log('='.repeat(50) + '\n');

    // Find URLs we previously submitted that are now inactive
    const inactiveUrls = await fetchInactiveJobUrls();
    const inactiveUrlSet = new Set(inactiveUrls);

    // Dead URLs = previously submitted URLs that are now inactive
    const deadUrls = Array.from(submittedUrls).filter(url => inactiveUrlSet.has(url));
    console.log(`   Found ${deadUrls.length} dead links to notify about\n`);

    if (deadUrls.length > 0) {
      const result = await submitUrlsInBatches(deadUrls, submittedUrls, 'Phase 2');
      phase2Submitted = result.submitted;
      console.log(`\n   📊 Phase 2 complete: ${result.submitted} notified, ${result.failed} failed\n`);
    } else {
      console.log('   ✅ No dead links to notify about\n');
    }

    // ============================================
    // Save and summarize
    // ============================================
    if (!isDryRun) {
      console.log('💾 Saving tracking file...');
      saveSubmittedUrls(submittedUrls);
    }

    console.log('='.repeat(50));
    console.log('✅ IndexNow submission complete!');
    console.log('='.repeat(50));
    console.log(`   New jobs submitted (Phase 1): ${phase1Submitted}`);
    console.log(`   Dead links notified (Phase 2): ${phase2Submitted}`);
    console.log(`   Total tracked URLs: ${submittedUrls.size}`);

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

