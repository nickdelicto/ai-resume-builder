#!/usr/bin/env node
/**
 * NewYork-Presbyterian RN Job Scraper (API-based)
 *
 * Uses the Workday REST API to fetch nursing jobs.
 * Faster and more reliable than DOM scraping.
 *
 * API: https://nyp.wd1.myworkdayjobs.com/wday/cxs/nyp/nypcareers/jobs
 * Platform: Workday
 *
 * Usage:
 *   node newyork-presbyterian-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --max-pages=N  Limit to N pages (20 jobs per page)
 */

require('dotenv').config();
const https = require('https');
const JobBoardService = require('../lib/services/JobBoardService');
const { generateJobSlug } = require('../lib/jobScraperUtils');

// Configuration
const CONFIG = {
  employerName: 'NewYork-Presbyterian',
  employerSlug: 'newyork-presbyterian',
  careerPageUrl: 'https://nyp.wd1.myworkdayjobs.com/en-US/nypcareers',
  atsPlatform: 'Workday',

  // API settings
  apiBase: 'https://nyp.wd1.myworkdayjobs.com/wday/cxs/nyp/nypcareers',
  pageSize: 20, // Workday returns 20 per page by default

  // Nursing job family IDs (discovered via API exploration)
  nursingJobFamilies: [
    '010f8e072c451001f0d9d8795f830000', // Nursing
    '010f8e072c451001f0d9e3e91acd0000'  // Nursing Operations
  ],

  // Facility to location mapping
  facilityLocations: {
    'NYP/Brooklyn Methodist Hospital': { city: 'Brooklyn', state: 'NY' },
    'NYP/Columbia University Irving Medical Center': { city: 'New York', state: 'NY' },
    'NYP/Weill Cornell Medical Center': { city: 'New York', state: 'NY' },
    'NYP/Allen Hospital': { city: 'New York', state: 'NY' },
    'NYP/Lower Manhattan Hospital': { city: 'New York', state: 'NY' },
    'NYP/Hudson Valley Hospital': { city: 'Cortlandt Manor', state: 'NY' },
    'NYP/Hudson Valley': { city: 'Cortlandt Manor', state: 'NY' },
    'NYP/Westchester': { city: 'Bronxville', state: 'NY' },
    'NYP/Westchester Medical Group': { city: 'Bronxville', state: 'NY' },
    'NYP/Queens': { city: 'Flushing', state: 'NY' },
    'NYP/Queens Medical Group': { city: 'Flushing', state: 'NY' },
    'NYP/Hudson Valley Medical Group': { city: 'Cortlandt Manor', state: 'NY' },
    '_default': { city: 'New York', state: 'NY' }
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : null;

/**
 * Make HTTPS POST request with JSON body
 */
function postApi(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://nyp.wd1.myworkdayjobs.com',
        'Referer': 'https://nyp.wd1.myworkdayjobs.com/en-US/nypcareers'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}\nResponse: ${data.substring(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Make HTTPS GET request
 */
function getApi(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://nyp.wd1.myworkdayjobs.com',
        'Referer': 'https://nyp.wd1.myworkdayjobs.com/en-US/nypcareers'
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
 * Fetch job listings page
 */
async function fetchJobListings(offset = 0) {
  const body = {
    appliedFacets: {
      jobFamilies: CONFIG.nursingJobFamilies
    },
    limit: CONFIG.pageSize,
    offset: offset,
    searchText: ''
  };

  return postApi(`${CONFIG.apiBase}/jobs`, body);
}

/**
 * Fetch single job details
 */
async function fetchJobDetails(externalPath) {
  const url = `${CONFIG.apiBase}${externalPath}`;
  return getApi(url);
}

/**
 * Check if job title indicates an RN position
 */
function isRnJob(title) {
  const titleLower = title.toLowerCase();

  // Exclude non-RN positions
  const excludePatterns = [
    /\blpn\b/i,
    /\blvn\b/i,
    /licensed practical nurse/i,
    /licensed vocational nurse/i,
    /\bpca\b/i,
    /\bcna\b/i,
    /patient care (tech|assistant|aide)/i,
    /nursing assistant/i,
    /nurse aide/i,
    /nurse extern/i,
    /student nurse/i,
    /unit secretary/i,
    /unit clerk/i,
    /medical assistant/i
  ];

  if (excludePatterns.some(pattern => pattern.test(title))) {
    // Check if it also contains RN - might be dual role
    if (!titleLower.includes('rn') && !titleLower.includes('registered nurse')) {
      return false;
    }
  }

  // Check for RN indicators
  const rnIndicators = [
    'rn', 'registered nurse', 'nurse manager', 'nurse navigator',
    'nurse educator', 'nurse practitioner', 'np ', 'aprn',
    'clinical nurse', 'staff nurse', 'charge nurse', 'nurse specialist',
    'nursing supervisor', 'nurse coordinator', 'nurse leader',
    'nursing administrator', 'nurse director', 'nurse case manager'
  ];

  return rnIndicators.some(ind => titleLower.includes(ind));
}

/**
 * Parse salary from job description HTML
 * Pattern: "$118,134-$155,787/Annual" or "$45.50-$65.00/Hour"
 */
function parseSalaryFromDescription(html) {
  if (!html) return {};

  // Pattern 1: Workday's standard salary format "$XX,XXX-$YY,YYY/Annual" or "$XX.XX-$YY.YY/Hour"
  const salaryPatterns = [
    // Annual: $118,134-$155,787/Annual
    /\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)\s*\/\s*Annual/i,
    // Hourly: $45.50-$65.00/Hour
    /\$?([\d,.]+)\s*[-–—]\s*\$?([\d,.]+)\s*\/\s*Hour(?:ly)?/i,
    // Salary Range with text
    /Salary\s*Range[:\s]+\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)/i,
    // Pay Range
    /Pay\s*Range[:\s]+\$?([\d,.]+)\s*[-–—]\s*\$?([\d,.]+)/i,
    // Compensation Range
    /Compensation\s*Range[:\s]+\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)/i
  ];

  for (const pattern of salaryPatterns) {
    const match = html.match(pattern);
    if (match) {
      const min = parseFloat(match[1].replace(/,/g, ''));
      const max = parseFloat(match[2].replace(/,/g, ''));

      // Determine if hourly or annual
      const matchText = match[0].toLowerCase();
      let salaryType;

      if (matchText.includes('hour')) {
        salaryType = 'hourly';
      } else if (matchText.includes('annual') || matchText.includes('year')) {
        salaryType = 'annual';
      } else {
        // Infer from value - hourly rates are typically under $500
        salaryType = min < 500 ? 'hourly' : 'annual';
      }

      if (salaryType === 'hourly') {
        return {
          salaryMin: Math.round(min),
          salaryMax: Math.round(max),
          salaryType: 'hourly',
          salaryMinHourly: Math.round(min),
          salaryMaxHourly: Math.round(max),
          salaryMinAnnual: Math.round(min * 2080),
          salaryMaxAnnual: Math.round(max * 2080)
        };
      } else {
        return {
          salaryMin: Math.round(min),
          salaryMax: Math.round(max),
          salaryType: 'annual',
          salaryMinHourly: Math.round(min / 2080),
          salaryMaxHourly: Math.round(max / 2080),
          salaryMinAnnual: Math.round(min),
          salaryMaxAnnual: Math.round(max)
        };
      }
    }
  }

  return {};
}

/**
 * Map facility name to city/state
 */
function mapFacilityToLocation(facilityName) {
  if (!facilityName) return CONFIG.facilityLocations['_default'];

  // Try exact match first
  if (CONFIG.facilityLocations[facilityName]) {
    return CONFIG.facilityLocations[facilityName];
  }

  // Try partial match
  for (const [key, value] of Object.entries(CONFIG.facilityLocations)) {
    if (key !== '_default' && facilityName.includes(key)) {
      return value;
    }
  }

  return CONFIG.facilityLocations['_default'];
}

/**
 * Extract employment type from job data
 */
function extractEmploymentType(timeType, title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('per diem') || titleLower.includes('perdiem')) {
    return 'Per Diem';
  }

  if (timeType === 'Part time' || titleLower.includes('part time') || titleLower.includes('part-time')) {
    return 'Part-Time';
  }

  if (timeType === 'Full time' || titleLower.includes('full time') || titleLower.includes('full-time')) {
    return 'Full-Time';
  }

  if (titleLower.includes('contract') || titleLower.includes('temp')) {
    return 'Contract';
  }

  return 'Full-Time'; // Default
}

/**
 * Extract shift from title
 */
function extractShift(title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('night')) return 'Night';
  if (titleLower.includes('evening')) return 'Evening';
  if (titleLower.includes(' day') || titleLower.includes('-day')) return 'Day';
  if (titleLower.includes('rotating')) return 'Rotating';

  return null;
}

/**
 * Extract specialty from title
 */
function extractSpecialty(title) {
  const titleLower = (title || '').toLowerCase();

  const specialtyPatterns = [
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
    [/oncology|cancer/, 'Oncology'],
    [/cardiology|cardiac(?!.*surg)/, 'Cardiology'],
    [/pediatric|peds\b/, 'Pediatrics'],
    [/psych|mental health|behavioral/, 'Psychiatric'],
    [/neuro(?!surg)/, 'Neurology'],
    [/neurosurg/, 'Neurosurgery'],
    [/surgery|surgical/, 'Surgery'],
    [/telemetry/, 'Telemetry'],
    [/dialysis|nephrology/, 'Dialysis'],
    [/rehab/, 'Rehabilitation'],
    [/infusion/, 'Infusion'],
    [/wound/, 'Wound Care'],
    [/endoscopy/, 'Endoscopy'],
    [/cath lab/, 'Cath Lab'],
    [/pacu|post.*anesthesia/, 'PACU'],
    [/ambulatory/, 'Ambulatory'],
    [/outpatient/, 'Outpatient'],
  ];

  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(titleLower)) return specialty;
  }

  return null;
}

/**
 * Clean HTML description
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
 * Transform job listing + details into our format
 */
function transformJob(listing, details) {
  const jobInfo = details?.jobPostingInfo || {};
  const title = jobInfo.title || listing.title;
  const facility = listing.locationsText || jobInfo.location || '';
  const location = mapFacilityToLocation(facility);
  const jobId = listing.bulletFields?.[0] || jobInfo.jobReqId || '';

  // Parse salary from description
  const salaryData = parseSalaryFromDescription(jobInfo.jobDescription);

  // Build source URL
  const sourceUrl = `https://nyp.wd1.myworkdayjobs.com/en-US/nypcareers${listing.externalPath}`;

  return {
    title: title,
    sourceJobId: jobId,
    requisitionId: jobId,
    sourceUrl: sourceUrl,
    slug: generateJobSlug(title, location.city, location.state, jobId),
    location: `${location.city}, ${location.state}`,
    city: location.city,
    state: location.state,
    zipCode: null,
    address: null,
    jobType: extractEmploymentType(jobInfo.timeType, title),
    shiftType: extractShift(title),
    schedule: null,
    description: cleanDescription(jobInfo.jobDescription),
    specialty: extractSpecialty(title),
    department: null,
    postedDate: jobInfo.postedOn ? parsePostedDate(jobInfo.postedOn) : new Date(),
    ...salaryData
  };
}

/**
 * Parse "Posted X days ago" to Date
 */
function parsePostedDate(postedText) {
  if (!postedText) return new Date();

  const lowerText = postedText.toLowerCase();

  if (lowerText.includes('today')) {
    return new Date();
  }

  const daysMatch = lowerText.match(/(\d+)\s*day/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  return new Date();
}

/**
 * Main scraper function
 */
async function scrapeNewYorkPresbyterianJobs() {
  console.log('🚀 NewYork-Presbyterian RN Job Scraper (API-based)\n');

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
  console.log('PHASE 1: Fetching job listings from API');
  console.log('=' .repeat(60));

  try {
    // Collect all job listings first
    const jobListings = [];

    while (hasMore) {
      pageNum++;

      if (MAX_PAGES && pageNum > MAX_PAGES) {
        console.log(`\n📌 Reached page limit (${MAX_PAGES}), stopping.`);
        break;
      }

      const offset = (pageNum - 1) * CONFIG.pageSize;
      console.log(`\n📄 Fetching page ${pageNum} (offset ${offset})...`);

      const data = await fetchJobListings(offset);

      if (pageNum === 1) {
        totalCount = data.total || 0;
        console.log(`   Total nursing jobs available: ${totalCount}`);
      }

      const jobs = data.jobPostings || [];
      console.log(`   Retrieved ${jobs.length} jobs`);

      if (jobs.length === 0) {
        hasMore = false;
        break;
      }

      // Filter for RN jobs
      let rnCount = 0;
      let skippedCount = 0;

      for (const job of jobs) {
        if (isRnJob(job.title)) {
          jobListings.push(job);
          rnCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(`   ✅ Added ${rnCount} RN jobs, skipped ${skippedCount} non-RN`);

      // Check for more pages
      hasMore = jobs.length === CONFIG.pageSize && jobListings.length < totalCount;

      // Rate limiting
      if (hasMore) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`\n✅ Found ${jobListings.length} RN job listings`);

    // PHASE 2: Fetch job details for each listing
    console.log('\n' + '=' .repeat(60));
    console.log('PHASE 2: Fetching job details');
    console.log('=' .repeat(60));

    let detailsFetched = 0;
    let detailsErrors = 0;

    for (const listing of jobListings) {
      try {
        detailsFetched++;
        process.stdout.write(`\r   Fetching details: ${detailsFetched}/${jobListings.length}`);

        const details = await fetchJobDetails(listing.externalPath);
        const transformed = transformJob(listing, details);
        allJobs.push(transformed);

        // Rate limiting - be nice to Workday
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        detailsErrors++;
        console.log(`\n   ⚠️  Error fetching ${listing.title}: ${error.message}`);
      }
    }

    console.log(`\n   ✅ Fetched ${detailsFetched - detailsErrors} job details (${detailsErrors} errors)`);

    // PHASE 3: Validation
    console.log('\n' + '=' .repeat(60));
    console.log('PHASE 3: Validating jobs');
    console.log('=' .repeat(60));

    const validJobs = allJobs.filter(job => {
      const errors = [];

      if (!job.title) errors.push('Missing title');
      if (!job.externalId) errors.push('Missing externalId');
      if (!job.sourceUrl) errors.push('Missing sourceUrl');

      if (errors.length > 0) {
        console.log(`   ⚠️  Invalid job "${job.title}": ${errors.join(', ')}`);
        return false;
      }
      return true;
    });

    console.log(`\n✅ ${validJobs.length} valid jobs (${allJobs.length - validJobs.length} invalid)`);

    // Count jobs with salary
    const jobsWithSalary = validJobs.filter(j => j.salaryMin);
    console.log(`💰 ${jobsWithSalary.length} jobs with salary data (${Math.round(jobsWithSalary.length/validJobs.length*100)}%)`);

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
      } else {
        console.log(`   Salary: N/A`);
      }
      console.log(`   URL: ${job.sourceUrl}`);
    }

    // PHASE 4: Save to database
    if (!DRY_RUN) {
      console.log('\n' + '=' .repeat(60));
      console.log('PHASE 4: Saving to database');
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
    console.log(`   Total RN jobs: ${validJobs.length}`);
    console.log(`   Jobs with salary: ${jobsWithSalary.length}`);

    return { success: true, jobCount: validJobs.length };

  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeNewYorkPresbyterianJobs()
    .then(result => {
      console.log(`\n🎉 Done! Processed ${result.jobCount} jobs.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeNewYorkPresbyterianJobs, CONFIG };
