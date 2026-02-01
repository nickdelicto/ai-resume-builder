#!/usr/bin/env node
/**
 * Northwell Health RN Job Scraper
 *
 * Uses the Google Cloud Talent Solution API to fetch nursing jobs.
 * This is much faster and more reliable than DOM scraping.
 *
 * API: https://jobsapi-google.m-cloud.io/api/job/search
 * Company ID: companies/12c4c7c9-29cb-4cff-a16c-4ae0d974c00a
 *
 * Usage:
 *   node northwell-health-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --max-pages=N  Limit to N pages (20 jobs per page)
 */

const https = require('https');
const JobBoardService = require('../lib/services/JobBoardService');
const { generateJobSlug } = require('../lib/jobScraperUtils');

// Configuration
const CONFIG = {
  employerName: 'Northwell Health',
  employerSlug: 'northwell-health',
  careerPageUrl: 'https://jobs.northwell.edu/job-search-results/?category[]=Nursing',
  atsPlatform: 'Google Cloud Talent Solution',

  // API settings
  apiBase: 'https://jobsapi-google.m-cloud.io/api/job/search',
  companyId: 'companies/12c4c7c9-29cb-4cff-a16c-4ae0d974c00a',
  pageSize: 20,
  category: 'Nursing',

  // Job URL pattern
  jobUrlBase: 'https://jobs.northwell.edu/job-3'
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
  params.set('pageSize', CONFIG.pageSize);
  params.set('offset', offset);
  params.set('companyName', CONFIG.companyId);
  params.set('customAttributeFilter',
    `primary_category="${CONFIG.category}" AND (brand="Northwell Health" OR brand="Northwell" OR brand="Flexstaff") AND ref!="156754"`
  );
  params.set('orderBy', 'posting_publish_time desc');

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
        'Origin': 'https://jobs.northwell.edu',
        'Referer': 'https://jobs.northwell.edu/'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Strip JSONP wrapper
        const jsonStr = data.replace(/^parseResponse\(/, '').replace(/\);?$/, '');
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

  // Exclude LPN/LVN only positions
  if (title.includes('lpn') || title.includes('licensed practical nurse') ||
      title.includes('lvn') || title.includes('licensed vocational nurse')) {
    // But include if it also mentions RN
    if (!title.includes('rn') && !title.includes('registered nurse')) {
      return false;
    }
  }

  // Check for RN indicators in title
  const titleIndicators = [
    'rn', 'registered nurse', 'nurse manager', 'nurse navigator',
    'nurse educator', 'nurse practitioner', 'np ', 'aprn',
    'clinical nurse', 'staff nurse', 'charge nurse', 'nurse specialist',
    'nursing supervisor', 'nurse coordinator', 'nurse leader'
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
 * Detect if job title indicates weekly pay (travel/FlexStaff positions)
 * Returns extracted weekly salary if found, null otherwise
 */
function detectWeeklyPayFromTitle(title) {
  if (!title) return null;

  // Patterns that indicate weekly pay in title:
  // "$2902/week", "$3k+/Week", "$4323/wk", "$2,902 /wk"
  const weeklyPattern = /\$[\d,]+(?:\.\d+)?(?:k\+?)?\s*\/\s*w(?:ee)?k/i;
  const match = title.match(weeklyPattern);

  if (match) {
    // Extract the numeric value
    const valueMatch = match[0].match(/\$?([\d,]+(?:\.\d+)?)(k)?/i);
    if (valueMatch) {
      let value = parseFloat(valueMatch[1].replace(/,/g, ''));
      if (valueMatch[2]?.toLowerCase() === 'k') {
        value *= 1000;
      }
      return Math.round(value);
    }
  }

  return null;
}

/**
 * Check if job is a weekly-pay position (Travel, FlexStaff, Temp contracts)
 */
function isWeeklyPayJob(job) {
  const title = (job.title || '').toLowerCase();
  const brand = (job.brand || '').toLowerCase();

  // FlexStaff brand is typically travel/contract with weekly pay
  const isFlexStaff = brand.includes('flexstaff') || title.includes('flexstaff');
  const isTravel = title.includes('travel');
  const isTempContract = title.includes('temp') && (title.includes('contract') || title.includes('flexstaff'));

  // Also check for explicit weekly salary in title
  const hasWeeklyInTitle = /\/\s*w(?:ee)?k/i.test(title);

  return isFlexStaff || isTravel || isTempContract || hasWeeklyInTitle;
}

/**
 * Parse salary string from API
 * Examples: "$59.689-$59.689/hour", "$78000-$130000/year", "$2902-$2902/year" (mislabeled weekly)
 */
function parseSalary(salaryStr, job) {
  if (!salaryStr) return null;

  // Match pattern: $XX.XX-$YY.YY/hour or $XXXXX-$YYYYY/year
  const match = salaryStr.match(/\$?([\d,.]+)-\$?([\d,.]+)\/(hour|year)/i);
  if (!match) return null;

  const min = parseFloat(match[1].replace(/,/g, ''));
  const max = parseFloat(match[2].replace(/,/g, ''));
  const apiType = match[3].toLowerCase();

  if (isNaN(min) || isNaN(max)) return null;

  // Check if this is actually weekly pay (API mislabels weekly as annual)
  // Weekly jobs: FlexStaff/Travel with values in $1500-5000 range
  const isWeekly = isWeeklyPayJob(job);
  const looksLikeWeeklyValue = min >= 1500 && min <= 6000;

  // Also check for weekly amount explicitly in title
  const weeklyFromTitle = detectWeeklyPayFromTitle(job.title);

  if ((isWeekly && looksLikeWeeklyValue) || weeklyFromTitle) {
    // Weekly pay - store raw values but exclude from hourly/annual stats
    return {
      salaryMin: Math.round(min),
      salaryMax: Math.round(max),
      salaryType: 'weekly',
      // Null out computed fields - weekly jobs excluded from salary statistics
      salaryMinHourly: null,
      salaryMaxHourly: null,
      salaryMinAnnual: null,
      salaryMaxAnnual: null
    };
  }

  const isHourly = apiType === 'hour';

  return {
    salaryMin: Math.round(min),
    salaryMax: Math.round(max),
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
  const job = apiJob.job || apiJob;

  // Build job URL: /job-3/{id}/{slug}/
  const jobId = job.id;
  const slug = generateSlug(job.title);
  const city = job.primary_city || job.google_locations?.[0]?.city || '';
  const state = job.primary_state || job.google_locations?.[0]?.state || '';
  const urlSlug = `${slug}-${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;

  // Parse salary info (pass full job for weekly pay detection)
  const salary = parseSalary(job.salary, job);

  return {
    title: job.title,
    sourceJobId: String(job.id),  // External job ID for deactivation tracking
    requisitionId: job.ref || null,
    sourceUrl: `${CONFIG.jobUrlBase}/${jobId}/${urlSlug}/`,
    slug: generateJobSlug(job.title, city, state, job.id),
    location: `${city}, ${state}`,
    city: city,
    state: state,
    zipCode: job.primary_zip || job.google_locations?.[0]?.zip || null,
    address: job.primary_address || null,
    jobType: mapEmploymentType(job),
    shiftType: extractShift(job),
    schedule: extractSchedule(job),
    description: cleanDescription(job.description),
    specialty: extractSpecialty(job),
    department: job.internal_category || null,
    postedDate: parsePostedDate(apiJob),
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
  // Check custom attributes first
  const schedule = job.schedule?.toLowerCase() || '';
  const employmentTypes = job.employment_types || [];

  if (schedule.includes('per diem') || schedule.includes('perdiem')) {
    return 'Per Diem';
  }
  if (schedule.includes('part time') || schedule.includes('part-time')) {
    return 'Part-Time';
  }
  if (schedule.includes('full time') || schedule.includes('full-time') ||
      employmentTypes.includes('FULL_TIME')) {
    return 'Full-Time';
  }
  if (schedule.includes('contract') || schedule.includes('temp')) {
    return 'Contract';
  }

  return 'Full-Time'; // Default
}

/**
 * Extract shift from job data
 */
function extractShift(job) {
  const shift = job.shift?.toLowerCase() || '';
  const title = job.title?.toLowerCase() || '';

  if (shift.includes('night') || title.includes('night')) return 'Night';
  if (shift.includes('evening') || title.includes('evening')) return 'Evening';
  if (shift.includes('day') || title.includes('days')) return 'Day';
  if (shift.includes('rotating')) return 'Rotating';

  return null;
}

/**
 * Extract schedule details
 */
function extractSchedule(job) {
  return job.schedule || null;
}

/**
 * Extract specialty from job data
 */
function extractSpecialty(job) {
  // Try specialty field first (from API)
  if (job.specialty) return job.specialty;

  // Try internal_category from API
  if (job.internal_category) return job.internal_category;

  // Extract from title using specific patterns (order matters - more specific first)
  const title = job.title?.toLowerCase() || '';

  // Order matters: check more specific terms first
  const specialtyPatterns = [
    // Specific units first
    [/\bnicu\b/, 'NICU'],
    [/\bpicu\b/, 'PICU'],
    [/\bl&d\b|labor.{0,5}delivery/, 'Labor & Delivery'],
    [/\bmed[\s/-]?surg\b/, 'Med/Surg'],
    [/\bicu\b|intensive care/, 'ICU'],
    [/critical care/, 'Critical Care'],
    [/\bor\b|operating room/, 'Operating Room'],
    [/\ber\b(?!\w)|emergency dept|emergency room/, 'Emergency'],
    [/\bed\b(?!\w)/, 'Emergency'],
    // Specialties
    [/oncology|cancer/, 'Oncology'],
    [/cardiology|cardiac(?!.*surg)/, 'Cardiology'],
    [/cardiac surg/, 'Cardiac Surgery'],
    [/pediatric|peds\b/, 'Pediatrics'],
    [/psych|mental health/, 'Psychiatric'],
    [/behavioral health/, 'Behavioral Health'],
    [/neuro(?!surg)/, 'Neurology'],
    [/neurosurg/, 'Neurosurgery'],
    [/surgery|surgical/, 'Surgery'],
    [/telemetry/, 'Telemetry'],
    [/dialysis/, 'Dialysis'],
    [/rehab/, 'Rehabilitation'],
    [/infusion/, 'Infusion'],
    [/home care|home health/, 'Home Care'],
    // General settings - check last
    [/ambulatory/, 'Ambulatory'],
    [/outpatient/, 'Outpatient'],
    [/inpatient/, 'Inpatient'],
  ];

  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(title)) return specialty;
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
function parsePostedDate(apiJob) {
  // Try different date fields
  if (apiJob.postingPublishTime) {
    return new Date(apiJob.postingPublishTime);
  }
  if (apiJob.job?.posting_publish_time) {
    return new Date(apiJob.job.posting_publish_time);
  }
  return new Date();
}

/**
 * Main scraper function
 */
async function scrapeNorthwellJobs() {
  console.log('🚀 Northwell Health RN Job Scraper\n');

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

      const results = data.searchResults || [];
      console.log(`   Retrieved ${results.length} jobs`);

      if (results.length === 0) {
        hasMore = false;
        break;
      }

      // Filter for RN jobs and transform
      let rnCount = 0;
      let skippedCount = 0;

      for (const result of results) {
        const job = result.job || result;

        if (isRnJob(job)) {
          const transformed = transformJob(result);
          allJobs.push(transformed);
          rnCount++;
        } else {
          skippedCount++;
          // console.log(`   ⏭️  Skipped: ${job.title} (not RN)`);
        }
      }

      console.log(`   ✅ Added ${rnCount} RN jobs, skipped ${skippedCount} non-RN`);

      // Check for more pages
      offset += CONFIG.pageSize;
      hasMore = data.nextPageToken && offset < totalHits;

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
      if (!job.sourceJobId) errors.push('Missing sourceJobId');
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
  scrapeNorthwellJobs()
    .then(result => {
      console.log(`\n🎉 Done! Processed ${result.jobCount} jobs.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeNorthwellJobs, CONFIG };
