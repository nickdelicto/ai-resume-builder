#!/usr/bin/env node
/**
 * Mount Sinai Health System RN Job Scraper
 *
 * Uses the Jibe REST API to fetch nursing jobs.
 * API discovered via mount-sinai-api-discovery.js
 *
 * API: https://careers.mountsinai.org/api/jobs
 * Platform: Jibe (Oracle Cloud HCM frontend)
 *
 * Usage:
 *   node mount-sinai-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --max-pages=N  Limit to N pages (100 jobs per page)
 */

const https = require('https');
const JobBoardService = require('../lib/services/JobBoardService');
const { generateJobSlug } = require('../lib/jobScraperUtils');
const { detectWorkArrangement } = require('../lib/utils/workArrangementUtils');

// Configuration
const CONFIG = {
  employerName: 'Mount Sinai',
  employerSlug: 'mount-sinai',
  careerPageUrl: 'https://careers.mountsinai.org/jobs?categories=Nursing',
  atsPlatform: 'Jibe (Oracle Cloud HCM)',

  // API settings (discovered via mount-sinai-api-discovery.js)
  apiBase: 'https://careers.mountsinai.org/api/jobs',
  pageSize: 100,
  category: 'Nursing',

  // Job URL pattern
  jobUrlBase: 'https://careers.mountsinai.org/jobs'
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : null;

/**
 * Build API URL with parameters
 */
function buildApiUrl(page = 1) {
  const params = new URLSearchParams();
  params.set('categories', CONFIG.category);
  params.set('page', page);
  params.set('limit', CONFIG.pageSize);
  params.set('sortBy', 'relevance');
  params.set('descending', 'false');
  params.set('internal', 'false');

  return `${CONFIG.apiBase}?${params.toString()}`;
}

/**
 * Fetch data from API
 */
function fetchApi(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://careers.mountsinai.org',
        'Referer': 'https://careers.mountsinai.org/'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Check if job title indicates an RN position
 */
function isRnJob(job) {
  const jobData = job.data || job;
  const title = (jobData.title || '').toLowerCase();
  const description = (jobData.description || '').toLowerCase();
  const qualifications = (jobData.qualifications || '').toLowerCase();

  // Exclude LPN/LVN only positions
  if (title.includes('lpn') || title.includes('licensed practical nurse') ||
      title.includes('lvn') || title.includes('licensed vocational nurse')) {
    if (!title.includes('rn') && !title.includes('registered nurse')) {
      return false;
    }
  }

  // Exclude non-nursing roles that might be in Nursing category
  const excludePatterns = [
    /\bpatient care (tech|assistant|aide)\b/i,
    /\bpca\b/i,
    /\bcna\b/i,
    /\bnursing assistant\b/i,
    /\bunit secretary\b/i,
    /\bunit clerk\b/i,
    /\bhealth aide\b/i,
    /\bmedical assistant\b/i,
    /\bnurse aide\b/i,
    /\bnurse extern\b/i,
    /\bstudent nurse\b/i
  ];

  if (excludePatterns.some(pattern => pattern.test(title))) {
    return false;
  }

  // Check for RN indicators in title
  const titleIndicators = [
    'rn', 'registered nurse', 'nurse manager', 'nurse navigator',
    'nurse educator', 'nurse practitioner', 'np ', 'aprn',
    'clinical nurse', 'staff nurse', 'charge nurse', 'nurse specialist',
    'nursing supervisor', 'nurse coordinator', 'nurse leader',
    'nursing administrator', 'nurse director', 'nurse case manager'
  ];

  if (titleIndicators.some(ind => title.includes(ind))) {
    return true;
  }

  // Check qualifications/description for RN requirement
  const rnPatterns = [
    'registered nurse',
    'rn license',
    'rn required',
    'license to practice as a registered',
    'new york state rn',
    'ny rn license',
    'bsn required',
    'nursing degree required'
  ];

  if (rnPatterns.some(pattern => qualifications.includes(pattern) || description.includes(pattern))) {
    return true;
  }

  return false;
}

/**
 * Determine if salary is hourly or annual based on value
 */
function determineSalaryType(minValue, maxValue) {
  const avgValue = (minValue + maxValue) / 2;
  // Hourly rates are typically under $500, annual salaries are typically over $20,000
  return avgValue < 500 ? 'hourly' : 'annual';
}

/**
 * Transform API job to our format
 */
function transformJob(apiJob) {
  const jobData = apiJob.data || apiJob;

  // Default to NYC for Mount Sinai when location is missing (system-wide positions)
  let city = jobData.city || '';
  let state = jobData.state || '';
  if (!city.trim() && !state.trim()) {
    city = 'New York';
    state = 'NY';
  }

  // Build job URL
  const jobUrl = `${CONFIG.jobUrlBase}/${jobData.slug}`;

  // Parse salary info
  let salaryData = {};
  if (jobData.salary_min_value && jobData.salary_max_value) {
    const salaryType = determineSalaryType(jobData.salary_min_value, jobData.salary_max_value);
    const min = Math.round(jobData.salary_min_value);
    const max = Math.round(jobData.salary_max_value);

    if (salaryType === 'hourly') {
      salaryData = {
        salaryMin: min,
        salaryMax: max,
        salaryType: 'hourly',
        salaryMinHourly: min,
        salaryMaxHourly: max,
        salaryMinAnnual: Math.round(min * 2080),
        salaryMaxAnnual: Math.round(max * 2080)
      };
    } else {
      salaryData = {
        salaryMin: min,
        salaryMax: max,
        salaryType: 'annual',
        salaryMinHourly: Math.round(min / 2080),
        salaryMaxHourly: Math.round(max / 2080),
        salaryMinAnnual: min,
        salaryMaxAnnual: max
      };
    }
  }

  // Detect work arrangement (remote/hybrid/onsite)
  const description = cleanDescription(jobData.description);
  const workArrangement = detectWorkArrangement({
    title: jobData.title,
    description: description,
    location: city && state ? `${city}, ${state}` : city || state || '',
    employmentType: jobData.employment_type || ''
  });

  return {
    title: jobData.title,
    sourceJobId: String(jobData.slug || jobData.req_id),
    requisitionId: jobData.req_id || null,
    sourceUrl: jobUrl,
    slug: generateJobSlug(jobData.title, city, state, jobData.slug || jobData.req_id),
    location: city && state ? `${city}, ${state}` : city || state || '',
    city: city,
    state: state,
    zipCode: jobData.postal_code || null,
    address: jobData.street_address || null,
    jobType: mapEmploymentType(jobData),
    shiftType: extractShift(jobData),
    schedule: null,
    description: description,
    specialty: extractSpecialty(jobData),
    department: jobData.department || null,
    postedDate: jobData.posted_date ? new Date(jobData.posted_date) : new Date(),
    workArrangement: workArrangement,
    ...salaryData
  };
}

/**
 * Map employment type
 */
function mapEmploymentType(job) {
  const empType = (job.employment_type || '').toUpperCase();
  const title = (job.title || '').toLowerCase();

  if (title.includes('per diem') || title.includes('perdiem')) {
    return 'Per Diem';
  }
  if (empType === 'PART_TIME' || title.includes('part time') || title.includes('part-time')) {
    return 'Part-Time';
  }
  if (empType === 'FULL_TIME' || title.includes('full time') || title.includes('full-time')) {
    return 'Full-Time';
  }
  if (title.includes('contract') || title.includes('temp')) {
    return 'Contract';
  }

  return 'Full-Time'; // Default
}

/**
 * Extract shift from job data
 */
function extractShift(job) {
  const title = (job.title || '').toLowerCase();

  if (title.includes('night') || title.includes('nights')) return 'Night';
  if (title.includes('evening') || title.includes('evenings')) return 'Evening';
  if (title.includes(' day') || title.includes(' days') || title.includes('-day')) return 'Day';
  if (title.includes('rotating')) return 'Rotating';

  return null;
}

/**
 * Extract specialty from job data
 */
function extractSpecialty(job) {
  const title = (job.title || '').toLowerCase();
  const department = (job.department || '').toLowerCase();
  const combined = `${title} ${department}`;

  // Order matters: check more specific terms first
  const specialtyPatterns = [
    // Specific units first
    [/\bnicu\b/, 'NICU'],
    [/\bpicu\b/, 'PICU'],
    [/\bl&d\b|labor.{0,5}delivery/, 'Labor & Delivery'],
    [/\bmed[\s/-]?surg\b|medical surgical/, 'Med/Surg'],
    [/\bccu\b|coronary care/, 'CCU'],
    [/\bcsicu\b|cardiac.*icu/, 'Cardiac ICU'],
    [/\bicu\b|intensive care/, 'ICU'],
    [/critical care/, 'Critical Care'],
    [/\bor\b|operating room|perioperative/, 'Operating Room'],
    [/\ber\b(?!\w)|emergency dept|emergency room/, 'Emergency'],
    [/\bed\b(?!\w)/, 'Emergency'],
    // Specialties
    [/oncology|cancer|tumor/, 'Oncology'],
    [/cardiology|cardiac(?!.*surg)/, 'Cardiology'],
    [/cardiac surg/, 'Cardiac Surgery'],
    [/pediatric|peds\b/, 'Pediatrics'],
    [/psych|mental health|behavioral health/, 'Psychiatric'],
    [/neuro(?!surg)/, 'Neurology'],
    [/neurosurg/, 'Neurosurgery'],
    [/surgery|surgical/, 'Surgery'],
    [/telemetry/, 'Telemetry'],
    [/dialysis|nephrology/, 'Dialysis'],
    [/rehab/, 'Rehabilitation'],
    [/infusion/, 'Infusion'],
    [/home care|home health/, 'Home Care'],
    [/transplant/, 'Transplant'],
    [/wound care/, 'Wound Care'],
    [/endoscopy/, 'Endoscopy'],
    [/cath lab/, 'Cath Lab'],
    [/pacu|post.*anesthesia/, 'PACU'],
    [/pre-?op/, 'Pre-Op'],
    // General settings - check last
    [/ambulatory/, 'Ambulatory'],
    [/outpatient/, 'Outpatient'],
    [/inpatient/, 'Inpatient'],
  ];

  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(combined)) return specialty;
  }

  return null;
}

/**
 * Clean description HTML
 */
function cleanDescription(html) {
  if (!html) return null;

  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main scraper function
 */
async function scrapeMountSinaiJobs() {
  console.log('🚀 Mount Sinai Health System RN Job Scraper\n');

  if (DRY_RUN) {
    console.log('⚠️  Running in DRY RUN mode (--no-save): Jobs will NOT be saved to database\n');
  }

  if (MAX_PAGES) {
    console.log(`📌 Page limit set: ${MAX_PAGES} pages (${MAX_PAGES * CONFIG.pageSize} jobs max)\n`);
  }

  const allJobs = [];
  let pageNum = 0;
  let totalCount = 0;
  let hasMore = true;

  console.log('=' .repeat(60));
  console.log('PHASE 1: Fetching jobs from API');
  console.log('=' .repeat(60));

  try {
    while (hasMore) {
      pageNum++;

      if (MAX_PAGES && pageNum > MAX_PAGES) {
        console.log(`\n📌 Reached page limit (${MAX_PAGES}), stopping.`);
        break;
      }

      console.log(`\n📄 Fetching page ${pageNum}...`);

      const url = buildApiUrl(pageNum);
      const data = await fetchApi(url);

      if (pageNum === 1) {
        totalCount = data.totalCount || 0;
        console.log(`   Total nursing jobs available: ${totalCount}`);
      }

      const jobs = data.jobs || [];
      console.log(`   Retrieved ${jobs.length} jobs`);

      if (jobs.length === 0) {
        hasMore = false;
        break;
      }

      // Filter for RN jobs and transform
      let rnCount = 0;
      let skippedCount = 0;

      for (const job of jobs) {
        if (isRnJob(job)) {
          const transformed = transformJob(job);
          allJobs.push(transformed);
          rnCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(`   ✅ Added ${rnCount} RN jobs, skipped ${skippedCount} non-RN`);

      // Check for more pages
      const totalFetched = pageNum * CONFIG.pageSize;
      hasMore = jobs.length === CONFIG.pageSize && totalFetched < totalCount;

      // Rate limiting
      if (hasMore) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`\n✅ Fetched ${allJobs.length} RN jobs total`);

    // PHASE 2: Validation
    console.log('\n' + '=' .repeat(60));
    console.log('PHASE 2: Validating jobs');
    console.log('=' .repeat(60));

    const validJobs = allJobs.filter(job => {
      const errors = [];

      if (!job.title) errors.push('Missing title');
      if (!job.sourceJobId) errors.push('Missing sourceJobId');
      if (!job.sourceUrl) errors.push('Missing sourceUrl');

      if (errors.length > 0) {
        console.log(`   ⚠️  Invalid job "${job.title}": ${errors.join(', ')}`);
        return false;
      }
      return true;
    });

    console.log(`\n✅ ${validJobs.length} valid jobs (${allJobs.length - validJobs.length} invalid)`);

    // Show sample jobs
    console.log('\n📋 Sample jobs:');
    for (const job of validJobs.slice(0, 5)) {
      console.log(`\n   Title: ${job.title}`);
      console.log(`   Location: ${job.city}, ${job.state}`);
      console.log(`   Type: ${job.employmentType}`);
      console.log(`   Specialty: ${job.specialty || 'N/A'}`);
      if (job.salaryMin) {
        const salaryStr = job.salaryType === 'hourly'
          ? `$${job.salaryMin}-$${job.salaryMax}/hr`
          : `$${job.salaryMin.toLocaleString()}-$${job.salaryMax.toLocaleString()}/yr`;
        console.log(`   Salary: ${salaryStr}`);
      }
      console.log(`   URL: ${job.sourceUrl}`);
    }

    // PHASE 3: Save to database
    if (!DRY_RUN) {
      console.log('\n' + '=' .repeat(60));
      console.log('PHASE 3: Saving to database');
      console.log('=' .repeat(60));

      const jobService = new JobBoardService();

      const employerData = {
        employerName: CONFIG.employerName,
        employerSlug: CONFIG.employerSlug,
        careerPageUrl: CONFIG.careerPageUrl,
        atsPlatform: CONFIG.atsPlatform
      };

      try {
        const result = await jobService.saveJobs(validJobs, employerData, {
          verifyActiveJobs: true
        });

        console.log('\n📊 Database Results:');
        console.log(`   ✅ Created: ${result.created}`);
        console.log(`   🔄 Updated: ${result.updated}`);
        console.log(`   ⏭️  Skipped: ${result.skipped}`);
        console.log(`   ❌ Errors: ${result.errors}`);
        console.log(`   🗑️  Deactivated: ${result.deactivated}`);

        await jobService.disconnect();
      } catch (error) {
        console.error('❌ Database error:', error.message);
        throw error;
      }
    } else {
      console.log('\n⚠️  DRY RUN: Skipping database save');
      console.log(`   Would have processed ${validJobs.length} jobs`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ SCRAPER COMPLETE');
    console.log('=' .repeat(60));

    // Summary
    console.log('\n📊 Final Summary:');
    console.log(`   Total pages fetched: ${pageNum}`);
    console.log(`   Total jobs from API: ${allJobs.length}`);
    console.log(`   Valid RN jobs: ${validJobs.length}`);

    return { success: true, jobCount: validJobs.length };

  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeMountSinaiJobs()
    .then(result => {
      console.log(`\n🎉 Done! Processed ${result.jobCount} jobs.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeMountSinaiJobs, CONFIG };
