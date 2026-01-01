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
 * - Only submits NEW or UPDATED jobs
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
 * Main execution
 */
async function main() {
  try {
    // Step 1: Fetch active job URLs from database
    console.log('📊 Fetching active job URLs from database...');
    const currentUrls = await fetchActiveJobUrls();
    console.log(`   Found ${currentUrls.length} active jobs\n`);
    
    if (currentUrls.length === 0) {
      console.log('✅ No active jobs to submit');
      return;
    }
    
    // Step 2: Load previously submitted URLs
    console.log('📂 Loading previously submitted URLs...');
    const submittedUrls = loadSubmittedUrls();
    console.log(`   Found ${submittedUrls.size} previously submitted URLs\n`);
    
    // Step 3: Find NEW URLs (not yet submitted)
    const newUrls = currentUrls.filter(url => !submittedUrls.has(url));
    console.log(`🆕 Found ${newUrls.length} NEW URLs to submit\n`);
    
    if (newUrls.length === 0) {
      console.log('✅ All URLs already submitted - nothing to do!');
      return;
    }
    
    // Step 4: Submit in batches
    const batches = [];
    for (let i = 0; i < newUrls.length; i += BATCH_SIZE) {
      batches.push(newUrls.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Will submit ${batches.length} batch(es) of up to ${BATCH_SIZE} URLs each\n`);
    
    if (isDryRun) {
      console.log('🧪 DRY RUN - Would submit these batches:');
      batches.forEach((batch, idx) => {
        console.log(`   Batch ${idx + 1}: ${batch.length} URLs`);
      });
      console.log('\n✅ Dry run complete - no actual submissions made');
      return;
    }
    
    // Submit batches with delays
    let totalSubmitted = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;
      
      console.log(`📤 Submitting batch ${batchNum}/${batches.length} (${batch.length} URLs)...`);
      
      const result = await submitBatch(batch);
      
      if (result.success) {
        console.log(`   ✅ Batch ${batchNum} submitted successfully (status ${result.status})`);
        totalSubmitted += batch.length;
        
        // Add to tracking set
        batch.forEach(url => submittedUrls.add(url));
      } else {
        console.error(`   ❌ Batch ${batchNum} failed:`, result.error || `Status ${result.status}`);
        // Continue with next batch even if one fails
      }
      
      // Wait before next batch (except for last batch)
      if (i < batches.length - 1) {
        const delayMinutes = DELAY_BETWEEN_BATCHES_MS / 60000;
        console.log(`   ⏳ Waiting ${delayMinutes} minutes before next batch...\n`);
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }
    
    // Step 5: Save updated tracking file
    console.log(`\n💾 Saving tracking file...`);
    saveSubmittedUrls(submittedUrls);
    
    console.log(`\n✅ IndexNow submission complete!`);
    console.log(`   Total submitted: ${totalSubmitted} URLs`);
    console.log(`   Total tracked: ${submittedUrls.size} URLs`);
    
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

