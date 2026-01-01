#!/usr/bin/env node

/**
 * IndexNow: Programmatic Pages Submission
 * 
 * Submits programmatic pages (state, city, specialty, salary pages) to IndexNow API.
 * Only submits URLs that have changed since last submission (based on job count fingerprint).
 * 
 * Features:
 * - Batches of 50 URLs (IndexNow recommendation)
 * - 3-minute delays between batches to avoid rate limiting
 * - Tracks submitted URLs with fingerprints to detect changes
 * - Only submits NEW or CHANGED pages
 * 
 * Run weekly via cron (Wednesday 1 AM EST)
 * 
 * Usage:
 *   node scripts/index-programmatic-pages.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { specialtyToSlug } = require('../lib/constants/specialties');

const prisma = new PrismaClient();

// Configuration
const SITE_URL = 'https://intelliresume.net';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '804d73076199e9238a06248816256b51';
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const TRACKING_FILE = path.join(__dirname, 'indexnow-programmatic-urls.json');
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 3 * 60 * 1000; // 3 minutes

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('🚀 IndexNow: Programmatic Pages Submission\n');
console.log(`Mode: ${isDryRun ? '🧪 DRY RUN (no actual submissions)' : '✅ LIVE'}\n`);

/**
 * Generate fingerprint hash for a page (used to detect changes)
 */
function generateFingerprint(pageType, metadata) {
  const data = JSON.stringify({ pageType, ...metadata });
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Load previously submitted URLs with fingerprints
 */
function loadSubmittedUrls() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = fs.readFileSync(TRACKING_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed.urls || {}));
    }
  } catch (error) {
    console.log(`⚠️  Could not load tracking file: ${error.message}`);
  }
  return new Map();
}

/**
 * Save submitted URLs with fingerprints
 */
function saveSubmittedUrls(urlsMap) {
  try {
    const data = {
      lastUpdated: new Date().toISOString(),
      count: urlsMap.size,
      urls: Object.fromEntries(urlsMap)
    };
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Saved ${urlsMap.size} URLs to tracking file\n`);
  } catch (error) {
    console.error(`❌ Failed to save tracking file: ${error.message}`);
  }
}

/**
 * Generate all programmatic page URLs with fingerprints
 */
async function generateProgrammaticUrls() {
  const urls = [];
  
  console.log('📊 Fetching data from database...\n');
  
  // Fetch all necessary data
  const [states, cities, specialties, stateSpecialties, citySpecialties, employers, employerSpecialties, employerJobTypes] = await Promise.all([
    // All states with job counts
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: { isActive: true },
      _count: { id: true }
    }),
    // All cities with job counts
    prisma.nursingJob.groupBy({
      by: ['state', 'city'],
      where: { isActive: true },
      _count: { id: true }
    }),
    // All specialties with job counts
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { isActive: true, specialty: { not: null } },
      _count: { id: true }
    }),
    // All state+specialty combinations
    prisma.nursingJob.groupBy({
      by: ['state', 'specialty'],
      where: { isActive: true, specialty: { not: null } },
      _count: { id: true }
    }),
    // All city+specialty combinations
    prisma.nursingJob.groupBy({
      by: ['state', 'city', 'specialty'],
      where: { isActive: true, specialty: { not: null } },
      _count: { id: true }
    }),
    // All employers
    prisma.healthcareEmployer.findMany({
      where: {
        jobs: { some: { isActive: true } }
      },
      select: { slug: true }
    }),
    // All employer+specialty combinations
    prisma.nursingJob.groupBy({
      by: ['employerId', 'specialty'],
      where: { isActive: true, specialty: { not: null } },
      _count: { id: true }
    }),
    // All employer+job type combinations
    prisma.nursingJob.groupBy({
      by: ['employerId', 'jobType'],
      where: { isActive: true, jobType: { not: null } },
      _count: { id: true }
    })
  ]);
  
  console.log(`   States: ${states.length}`);
  console.log(`   Cities: ${cities.length}`);
  console.log(`   Specialties: ${specialties.length}`);
  console.log(`   State+Specialty: ${stateSpecialties.length}`);
  console.log(`   City+Specialty: ${citySpecialties.length}`);
  console.log(`   Employers: ${employers.length}`);
  console.log(`   Employer+Specialty: ${employerSpecialties.length}`);
  console.log(`   Employer+JobType: ${employerJobTypes.length}\n`);
  
  // 1. State pages + salary pages
  states.forEach(s => {
    const stateCode = s.state.toLowerCase();
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}`,
      fingerprint: generateFingerprint('state', { state: s.state, jobCount: s._count.id })
    });
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}/salary`,
      fingerprint: generateFingerprint('state-salary', { state: s.state, jobCount: s._count.id })
    });
  });
  
  // 2. City pages + salary pages
  cities.forEach(c => {
    const stateCode = c.state.toLowerCase();
    const citySlug = c.city.toLowerCase().replace(/\s+/g, '-');
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}/${citySlug}`,
      fingerprint: generateFingerprint('city', { state: c.state, city: c.city, jobCount: c._count.id })
    });
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}/${citySlug}/salary`,
      fingerprint: generateFingerprint('city-salary', { state: c.state, city: c.city, jobCount: c._count.id })
    });
  });
  
  // 3. State+Specialty pages + salary pages
  stateSpecialties.forEach(s => {
    const stateCode = s.state.toLowerCase();
    const specialtySlug = specialtyToSlug(s.specialty);
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}/${specialtySlug}`,
      fingerprint: generateFingerprint('state-specialty', { state: s.state, specialty: s.specialty, jobCount: s._count.id })
    });
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}/${specialtySlug}/salary`,
      fingerprint: generateFingerprint('state-specialty-salary', { state: s.state, specialty: s.specialty, jobCount: s._count.id })
    });
  });
  
  // 4. City+Specialty pages + salary pages
  citySpecialties.forEach(c => {
    const stateCode = c.state.toLowerCase();
    const citySlug = c.city.toLowerCase().replace(/\s+/g, '-');
    const specialtySlug = specialtyToSlug(c.specialty);
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}/${citySlug}/${specialtySlug}`,
      fingerprint: generateFingerprint('city-specialty', { state: c.state, city: c.city, specialty: c.specialty, jobCount: c._count.id })
    });
    urls.push({
      url: `${SITE_URL}/jobs/nursing/${stateCode}/${citySlug}/${specialtySlug}/salary`,
      fingerprint: generateFingerprint('city-specialty-salary', { state: c.state, city: c.city, specialty: c.specialty, jobCount: c._count.id })
    });
  });
  
  // 5. National specialty pages
  specialties.forEach(s => {
    const specialtySlug = specialtyToSlug(s.specialty);
    urls.push({
      url: `${SITE_URL}/jobs/nursing/specialty/${specialtySlug}`,
      fingerprint: generateFingerprint('specialty', { specialty: s.specialty, jobCount: s._count.id })
    });
  });
  
  // 6. Employer pages
  employers.forEach(e => {
    urls.push({
      url: `${SITE_URL}/jobs/nursing/employer/${e.slug}`,
      fingerprint: generateFingerprint('employer', { slug: e.slug })
    });
  });
  
  // 7. Employer+Specialty pages
  // First, get employer slugs for all employerIds
  const employerIds = [...new Set(employerSpecialties.map(e => e.employerId).filter(Boolean))];
  const employersById = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, slug: true }
  });
  
  const employerIdToSlug = {};
  employersById.forEach(emp => {
    employerIdToSlug[emp.id] = emp.slug;
  });

  employerSpecialties.forEach(e => {
    const employerSlug = employerIdToSlug[e.employerId];
    if (!employerSlug) return;
    
    const specialtySlug = specialtyToSlug(e.specialty);
    urls.push({
      url: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/${specialtySlug}`,
      fingerprint: generateFingerprint('employer-specialty', { employerId: e.employerId, specialty: e.specialty, jobCount: e._count.id })
    });
  });
  
  // 8. Employer+JobType pages
  const { jobTypeToSlug } = require('../lib/constants/jobTypes');
  
  // Reuse employerIdToSlug from above
  employerJobTypes.forEach(e => {
    const employerSlug = employerIdToSlug[e.employerId];
    if (!employerSlug) return;
    
    // Normalize job type slug
    const jobTypeSlug = jobTypeToSlug(e.jobType);
    if (!jobTypeSlug) return;
    
    urls.push({
      url: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/${jobTypeSlug}`,
      fingerprint: generateFingerprint('employer-jobtype', { employerId: e.employerId, jobType: e.jobType, jobCount: e._count.id })
    });
  });
  
  return urls;
}

/**
 * Submit URLs to IndexNow API
 */
async function submitBatchToIndexNow(urls) {
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
      const text = await response.text();
      return { success: false, status: response.status, error: text };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Load previous submissions
    const previousSubmissions = loadSubmittedUrls();
    console.log(`📂 Loaded ${previousSubmissions.size} previously submitted URLs\n`);
    
    // Generate all current programmatic URLs
    const allUrls = await generateProgrammaticUrls();
    console.log(`📋 Generated ${allUrls.length} total programmatic URLs\n`);
    
    // Filter to only changed URLs
    const changedUrls = allUrls.filter(({ url, fingerprint }) => {
      const previousFingerprint = previousSubmissions.get(url);
      return previousFingerprint !== fingerprint; // New or changed
    });
    
    console.log(`🔄 URLs to submit: ${changedUrls.length} (${allUrls.length - changedUrls.length} unchanged)\n`);
    
    if (changedUrls.length === 0) {
      console.log('✅ No changes detected. All programmatic pages are up to date!\n');
      return;
    }
    
    if (isDryRun) {
      console.log('🧪 DRY RUN - URLs that would be submitted:\n');
      changedUrls.slice(0, 10).forEach(({ url }) => console.log(`   - ${url}`));
      if (changedUrls.length > 10) {
        console.log(`   ... and ${changedUrls.length - 10} more\n`);
      }
      return;
    }
    
    // Submit in batches
    const batches = [];
    for (let i = 0; i < changedUrls.length; i += BATCH_SIZE) {
      batches.push(changedUrls.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Submitting ${batches.length} batch${batches.length === 1 ? '' : 'es'} of up to ${BATCH_SIZE} URLs each\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchUrls = batch.map(item => item.url);
      
      console.log(`📤 Batch ${i + 1}/${batches.length}: Submitting ${batchUrls.length} URLs...`);
      
      const result = await submitBatchToIndexNow(batchUrls);
      
      if (result.success) {
        console.log(`   ✅ Success (HTTP ${result.status})`);
        successCount += batchUrls.length;
        
        // Update tracking for successful submissions
        batch.forEach(({ url, fingerprint }) => {
          previousSubmissions.set(url, fingerprint);
        });
      } else {
        console.log(`   ❌ Failed (HTTP ${result.status || 'error'}): ${result.error}`);
        failCount += batchUrls.length;
      }
      
      // Wait between batches (except after last batch)
      if (i < batches.length - 1) {
        const waitMinutes = DELAY_BETWEEN_BATCHES_MS / 60000;
        console.log(`   ⏳ Waiting ${waitMinutes} minutes before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }
    
    // Save updated tracking
    saveSubmittedUrls(previousSubmissions);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`   ✅ Successfully submitted: ${successCount} URLs`);
    console.log(`   ❌ Failed: ${failCount} URLs`);
    console.log(`   📂 Total tracked: ${previousSubmissions.size} URLs`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

