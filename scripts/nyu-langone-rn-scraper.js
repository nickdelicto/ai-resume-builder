#!/usr/bin/env node
/**
 * NYU Langone Health RN Job Scraper
 *
 * Uses the Symphony Talent / m-cloud internal API to fetch nursing jobs.
 *
 * API: https://jobsapi-internal.m-cloud.io/api/job
 * Organization ID: 1637
 *
 * Usage:
 *   node nyu-langone-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --max-pages=N  Limit to N pages (default 100 jobs per page)
 */

const https = require('https');
const JobBoardService = require('../lib/services/JobBoardService');
const { generateJobSlug } = require('../lib/jobScraperUtils');

// Configuration
const CONFIG = {
  employerName: 'NYU Langone Health',
  employerSlug: 'nyu-langone-health',
  careerPageUrl: 'https://jobs.nyulangone.org/job-search-results/?parent_category[]=Nursing',
  atsPlatform: 'Symphony Talent (m-cloud)',

  // API settings
  apiBase: 'https://jobsapi-internal.m-cloud.io/api/job',
  organizationId: '1637',
  pageSize: 100,
  category: 'Nursing',

  // Job URL pattern
  jobUrlBase: 'https://jobs.nyulangone.org/job'
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : null;

/**
 * Build API URL with parameters
 */
function buildApiUrl(offset = 0) {
  const params = new URLSearchParams();
  params.set('callback', 'parseResponse');
  params.set('facet[]', `parent_category:${CONFIG.category}`);
  params.set('sortfield', 'open_date');
  params.set('sortorder', 'descending');
  params.set('Limit', CONFIG.pageSize);
  params.set('Organization', CONFIG.organizationId);
  params.set('offset', offset);

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
        'Accept': '*/*',
        'Origin': 'https://jobs.nyulangone.org',
        'Referer': 'https://jobs.nyulangone.org/'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Strip JSONP wrapper
        const jsonStr = data.replace(/^[^(]+\(/, '').replace(/\);?$/, '');
        try {
          resolve(JSON.parse(jsonStr));
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
  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();

  // Exclude non-RN positions
  const excludePatterns = [
    /\blpn\b/, /licensed practical nurse/,
    /\blvn\b/, /licensed vocational nurse/,
    /\bcna\b/, /certified nursing assistant/,
    /nursing assistant/, /nursing attendant/,
    /patient care technician/, /\bpct\b/,
    /medical assistant/, /\bma\b(?!\w)/,
    /student\s*nurse\s*extern/, /\bsne\b/,  // These are students, not RNs yet
    /nurse\s*extern/  // Also catch other extern variations
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(title)) {
      // But include if it also mentions RN (word boundary check to avoid matching "extern")
      const hasRN = /\brn\b/.test(title) || title.includes('registered nurse');
      if (!hasRN) {
        return false;
      }
    }
  }

  // Check for RN indicators in title
  const titleIndicators = [
    'rn', 'registered nurse', 'nurse manager', 'nurse navigator',
    'nurse educator', 'nurse practitioner', 'np ', 'aprn',
    'clinical nurse', 'staff nurse', 'charge nurse', 'nurse specialist',
    'nursing supervisor', 'nurse coordinator', 'nurse leader',
    'nurse instructor', 'rn-'
  ];

  if (titleIndicators.some(ind => title.includes(ind))) {
    return true;
  }

  // Check description for RN requirement
  const rnPatterns = [
    'registered nurse',
    'rn license',
    'rn required',
    'license to practice as a registered',
    'new york state rn',
    'ny rn license'
  ];

  return rnPatterns.some(pattern => description.includes(pattern));
}

/**
 * Generate URL slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

/**
 * Parse salary string from API
 * Examples: "$20.00-$20.00/hour", "$78000-$130000/year"
 */
function parseSalary(salaryStr) {
  if (!salaryStr) return null;

  // Match pattern: $XX.XX-$YY.YY/hour or $XXXXX-$YYYYY/year
  const match = salaryStr.match(/\$?([\d,.]+)-\$?([\d,.]+)\/(hour|year)/i);
  if (!match) return null;

  const min = parseFloat(match[1].replace(/,/g, ''));
  const max = parseFloat(match[2].replace(/,/g, ''));
  const type = match[3].toLowerCase();

  if (isNaN(min) || isNaN(max)) return null;

  const isHourly = type === 'hour';

  return {
    salaryMin: Math.round(min * 100) / 100,
    salaryMax: Math.round(max * 100) / 100,
    salaryType: isHourly ? 'hourly' : 'annual',
    // Normalized values for comparison
    salaryMinHourly: isHourly ? Math.round(min) : Math.round(min / 2080),
    salaryMaxHourly: isHourly ? Math.round(max) : Math.round(max / 2080),
    salaryMinAnnual: isHourly ? Math.round(min * 2080) : Math.round(min),
    salaryMaxAnnual: isHourly ? Math.round(max * 2080) : Math.round(max)
  };
}

/**
 * Transform API job to our format
 */
function transformJob(apiJob) {
  const job = apiJob;

  const city = job.primary_city || '';
  const state = job.primary_state || '';
  const slug = generateSlug(job.title);
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state.toLowerCase();

  // Build job URL: /job/{id}/{slug}-{city}-{state}/
  // Prefer NYU Langone URL over silkroad application URL
  const jobUrl = `${CONFIG.jobUrlBase}/${job.id}/${slug}-${citySlug}-${stateSlug}/`;

  // Parse salary info
  const salary = parseSalary(job.salary);

  return {
    title: job.title,
    sourceJobId: String(job.id),
    requisitionId: job.ref || null,
    sourceUrl: jobUrl,
    slug: generateJobSlug(job.title, city, state, job.id),
    location: `${city}, ${state}`,
    city: city,
    state: state,
    zipCode: job.primary_zip || null,
    address: null,
    jobType: mapEmploymentType(job),
    shiftType: extractShift(job),
    schedule: job.schedule || null,
    description: cleanDescription(job.description),
    specialty: extractSpecialty(job),
    department: job.department || null,
    postedDate: parsePostedDate(job),
    // Salary fields
    ...(salary && {
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      salaryType: salary.salaryType,
      salaryMinHourly: salary.salaryMinHourly,
      salaryMaxHourly: salary.salaryMaxHourly,
      salaryMinAnnual: salary.salaryMinAnnual,
      salaryMaxAnnual: salary.salaryMaxAnnual
    })
  };
}

/**
 * Map employment type
 */
function mapEmploymentType(job) {
  const empType = (job.employment_type || '').toLowerCase();
  const schedule = (job.schedule || '').toLowerCase();

  if (empType.includes('per diem') || schedule.includes('per diem')) {
    return 'Per Diem';
  }
  if (empType.includes('part time') || empType.includes('part-time') || schedule.includes('part time')) {
    return 'Part-Time';
  }
  if (empType.includes('full time') || empType.includes('full-time') || empType.includes('regular')) {
    return 'Full-Time';
  }
  if (empType.includes('contract') || empType.includes('temp')) {
    return 'Contract';
  }

  return 'Full-Time'; // Default
}

/**
 * Extract shift from job data
 */
function extractShift(job) {
  const shift = (job.shift || '').toLowerCase();
  const title = (job.title || '').toLowerCase();

  if (shift.includes('night') || title.includes('night')) return 'Night';
  if (shift.includes('evening') || title.includes('evening')) return 'Evening';
  if (shift.includes('day') || title.includes('days') || title.includes('day shift')) return 'Day';
  if (shift.includes('rotating') || title.includes('rotating')) return 'Rotating';

  return null;
}

/**
 * Extract specialty from job data
 */
function extractSpecialty(job) {
  const title = (job.title || '').toLowerCase();
  // addtnl_categories can be an array or string
  const categories = Array.isArray(job.addtnl_categories)
    ? job.addtnl_categories.join(' ').toLowerCase()
    : (job.addtnl_categories || '').toLowerCase();

  // Order matters: check more specific terms first
  const specialtyPatterns = [
    // Specific units first
    [/\bnicu\b/, 'NICU'],
    [/\bpicu\b/, 'PICU'],
    [/\bl&d\b|labor.{0,5}delivery/, 'Labor & Delivery'],
    [/\bmed[\s/-]?surg\b/, 'Med/Surg'],
    [/\bicu\b|intensive care/, 'ICU'],
    [/\bsicu\b/, 'SICU'],
    [/\bmicu\b/, 'MICU'],
    [/critical care/, 'Critical Care'],
    [/\bor\b|operating room|perioperative/, 'Operating Room'],
    [/\ber\b(?!\w)|emergency\s*dep|emergency\s*room/, 'Emergency'],
    [/\bed\b(?!\w)/, 'Emergency'],
    // Specialties
    [/oncology|cancer/, 'Oncology'],
    [/cardiology|cardiac(?!.*surg)/, 'Cardiology'],
    [/cardiac surg/, 'Cardiac Surgery'],
    [/pediatric|peds\b/, 'Pediatrics'],
    [/psych|mental health|behavioral health/, 'Psychiatric'],
    [/neuro(?!surg)/, 'Neurology'],
    [/neurosurg/, 'Neurosurgery'],
    [/surgery|surgical/, 'Surgery'],
    [/telemetry/, 'Telemetry'],
    [/dialysis/, 'Dialysis'],
    [/rehab/, 'Rehabilitation'],
    [/infusion/, 'Infusion'],
    [/home care|home health/, 'Home Care'],
    [/women.*service|ob[\s-]?gyn/, 'Women\'s Services'],
    // General settings - check last
    [/ambulatory/, 'Ambulatory'],
    [/outpatient/, 'Outpatient'],
    [/inpatient/, 'Inpatient'],
  ];

  // Check title first
  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(title)) return specialty;
  }

  // Then check categories
  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(categories)) return specialty;
  }

  return null;
}

/**
 * Clean description HTML
 */
function cleanDescription(html) {
  if (!html) return null;

  // Keep basic HTML structure but clean up
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse posted date
 */
function parsePostedDate(job) {
  if (job.open_date) {
    return new Date(job.open_date);
  }
  return new Date();
}

/**
 * Main scraper function
 */
async function scrapeNYULangoneJobs() {
  console.log('🚀 NYU Langone Health RN Job Scraper\n');

  if (DRY_RUN) {
    console.log('⚠️  Running in DRY RUN mode (--no-save): Jobs will NOT be saved to database\n');
  }

  if (MAX_PAGES) {
    console.log(`📌 Page limit set: ${MAX_PAGES} pages (${MAX_PAGES * CONFIG.pageSize} jobs max)\n`);
  }

  const allJobs = [];
  let offset = 0;
  let pageNum = 0;
  let totalHits = 0;
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

      console.log(`\n📄 Fetching page ${pageNum} (offset: ${offset})...`);

      const url = buildApiUrl(offset);
      const data = await fetchApi(url);

      if (pageNum === 1) {
        totalHits = data.totalHits || 0;
        console.log(`   Total nursing jobs available: ${totalHits}`);
      }

      const results = data.queryResult || data.searchResults || [];
      console.log(`   Retrieved ${results.length} jobs`);

      if (results.length === 0) {
        hasMore = false;
        break;
      }

      // Filter for RN jobs and transform
      let rnCount = 0;
      let skippedCount = 0;

      for (const result of results) {
        if (isRnJob(result)) {
          const transformed = transformJob(result);
          allJobs.push(transformed);
          rnCount++;
        } else {
          skippedCount++;
          // Uncomment to debug skipped jobs:
          // console.log(`   ⏭️  Skipped: ${result.title} (not RN)`);
        }
      }

      console.log(`   ✅ Added ${rnCount} RN jobs, skipped ${skippedCount} non-RN`);

      // Check for more pages
      offset += CONFIG.pageSize;
      hasMore = offset < totalHits;

      // Rate limiting
      if (hasMore) {
        await new Promise(r => setTimeout(r, 500));
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
      if (!job.externalId) errors.push('Missing externalId');
      if (!job.sourceUrl) errors.push('Missing sourceUrl');
      if (!job.location) errors.push('Missing location');
      if (!job.city) errors.push('Missing city');
      if (!job.state) errors.push('Missing state');

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
  scrapeNYULangoneJobs()
    .then(result => {
      console.log(`\n🎉 Done! Processed ${result.jobCount} jobs.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeNYULangoneJobs, CONFIG };
