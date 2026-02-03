#!/usr/bin/env node
/**
 * Centene RN Job Scraper
 *
 * Uses the Workday CXS API to fetch nursing jobs from Centene (insurance company).
 * Most jobs are remote - great for the remote nursing jobs feature.
 *
 * API: POST https://centene.wd5.myworkdayjobs.com/wday/cxs/centene/Centene_External/jobs
 *
 * Job Families:
 *   - Care Management: e9b7c763cfa310019c762a4504a90000 (~100 jobs)
 *   - Clinical & Nursing: e8e87c5e1ec6108fd6495e6ab9b51120 (~14 jobs)
 *
 * Usage:
 *   node centene-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --max-pages=N  Limit to N pages (20 jobs per page)
 */

const https = require('https');
const JobBoardService = require('../lib/services/JobBoardService');
const { generateJobSlug } = require('../lib/jobScraperUtils');
const { detectWorkArrangement } = require('../lib/utils/workArrangementUtils');

// Configuration
const CONFIG = {
  employerName: 'Centene',
  employerSlug: 'centene',
  careerPageUrl: 'https://centene.wd5.myworkdayjobs.com/Centene_External',
  atsPlatform: 'Workday',

  // API settings
  tenant: 'centene',
  site: 'Centene_External',
  subdomain: 'wd5',
  pageSize: 20,

  // Job family IDs for nursing/care management
  jobFamilies: [
    'e9b7c763cfa310019c762a4504a90000', // Care Management (~100 jobs)
    'e8e87c5e1ec6108fd6495e6ab9b51120'  // Clinical & Nursing (~14 jobs)
  ]
};

// Build API URLs
const API_BASE = `https://${CONFIG.tenant}.${CONFIG.subdomain}.myworkdayjobs.com`;
const JOBS_API = `${API_BASE}/wday/cxs/${CONFIG.tenant}/${CONFIG.site}/jobs`;

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : null;

/**
 * Make POST request to fetch job listings
 */
function fetchJobsPage(offset = 0) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      appliedFacets: {
        jobFamilyGroup: CONFIG.jobFamilies
      },
      limit: CONFIG.pageSize,
      offset: offset,
      searchText: ''
    });

    const url = new URL(JOBS_API);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Fetch full job details
 */
function fetchJobDetails(externalPath) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/wday/cxs/${CONFIG.tenant}/${CONFIG.site}${externalPath}`;
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse job details: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Parse location from Centene's format
 * Formats: "Remote-CA", "Remote-TX", "2 Locations", "City-Address"
 */
function parseLocation(locationsText, jobTitle = '') {
  if (!locationsText) {
    return { city: null, state: null, isRemote: false };
  }

  // Handle "Remote-XX" format (most common for Centene)
  const remoteMatch = locationsText.match(/^Remote-([A-Z]{2})/i);
  if (remoteMatch) {
    const stateCode = remoteMatch[1].toUpperCase();
    // Handle special cases like "WA State"
    const normalizedState = stateCode === 'WA STATE' ? 'WA' : stateCode;
    return {
      city: 'Remote',
      state: normalizedState,
      isRemote: true
    };
  }

  // Handle "2 Locations" or similar multi-location
  if (/\d+\s*Locations?/i.test(locationsText)) {
    // Try to extract state from job title or use null
    return { city: null, state: null, isRemote: true };
  }

  // Handle city-based locations like "Newark-750 Prides Crossing"
  // Format: "City - Address (code)"
  const cityMatch = locationsText.match(/^([A-Za-z\s]+?)[\s-]+/);
  if (cityMatch) {
    const city = cityMatch[1].trim();
    // Try to determine state from known Centene locations
    const stateFromCity = guessStateFromCity(city);
    return {
      city: city,
      state: stateFromCity,
      isRemote: false
    };
  }

  return { city: null, state: null, isRemote: false };
}

/**
 * Guess state from city name (for Centene office locations)
 */
function guessStateFromCity(city) {
  const cityToState = {
    'Newark': 'NJ',
    'Charlotte': 'NC',
    'West Palm Beach': 'FL',
    'Chicago': 'IL',
    'Carbondale': 'IL',
    'Springfield': 'IL',
    'Austin': 'TX',
    'Dallas': 'TX',
    'Houston': 'TX',
    'Las Vegas': 'NV',
    'Detroit': 'MI',
    'Miami': 'FL',
    'Miami Gardens': 'FL',
    'Latham': 'NY',
    'Des Moines': 'IA',
    'Honolulu': 'HI',
    'Hilo': 'HI',
    'Baton Rouge': 'LA',
    'Lumberton': 'NC',
    'Topeka': 'KS',
    'Fort Riley': 'KS'
  };

  return cityToState[city] || null;
}

/**
 * Check if job title indicates a potential RN position
 *
 * This is a LOOSE filter - we cast a wide net and let the LLM classifier
 * do the fine-grained filtering based on actual job requirements.
 * This avoids false negatives (missing real RN jobs).
 */
function isRNJob(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();

  // Must have nursing indicators
  const hasNursingIndicator = (
    /\brn\b/.test(text) ||
    /\bregistered\s*nurse\b/.test(text) ||
    /\bnurse\b/.test(text) ||
    /\bnursing\b/.test(text) ||
    /\bclinician\b/.test(text) ||
    /\bcare\s*manager\b/.test(text) ||
    /\bcase\s*manager\b/.test(text) ||
    /\butilization\s*review\b/.test(text)
  );

  // Exclude non-RN roles
  const excludePatterns = [
    /\blpn\b/,           // LPN
    /\blvn\b/,           // LVN
    /\bcna\b/,           // CNA
    /\bphysician\b/,     // Physicians
    /\bmd\b/,            // MD
    /\bdoctor\b/,        // Doctor
    /\bpharmacist\b/,    // Pharmacist
    /\bpharmacy\s*tech\b/,
    /\bmedical\s*assistant\b/,
    /\bma\b(?!\s*rn)/,   // MA (but not MA RN)
    /\bsocial\s*worker\b/,
    /\blcsw\b/,          // Licensed Clinical Social Worker
    /\bmsw\b/,           // Master of Social Work
    /\bbehavioral\s*health\s*technician\b/,
    /\bpeer\s*support\b/
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }

  return hasNursingIndicator;
}

/**
 * Extract specialty from job title and description
 */
function extractSpecialty(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();

  // Check for specific specialties
  if (/utilization\s*review|ur\s*nurse|ur\s*clinician/i.test(text)) return 'Utilization Review';
  if (/case\s*manag/i.test(text)) return 'Case Management';
  if (/care\s*manag/i.test(text)) return 'Case Management';
  if (/telehealth|tele-?health|virtual\s*care/i.test(text)) return 'Telehealth';
  if (/quality\s*(assurance|improvement)|qa\s*nurse/i.test(text)) return 'Quality Assurance';
  if (/clinical\s*documentation/i.test(text)) return 'Clinical Documentation';
  if (/nurse\s*educator|education\s*specialist/i.test(text)) return 'Nurse Educator';
  if (/behavioral\s*health|mental\s*health|psych/i.test(text)) return 'Behavioral Health';
  if (/home\s*health/i.test(text)) return 'Home Health';
  if (/transition\s*specialist|discharge\s*planning/i.test(text)) return 'Case Management';

  // Default for insurance company nursing roles
  return 'Case Management';
}

/**
 * Transform Workday job to our format
 */
async function transformJob(job) {
  try {
    // Fetch full job details
    const details = await fetchJobDetails(job.externalPath);
    const jobPostingInfo = details.jobPostingInfo || {};

    const title = job.title || jobPostingInfo.title;
    const description = jobPostingInfo.jobDescription || '';

    // Parse location - try multiple sources
    let location = parseLocation(job.locationsText, title);

    // If location is multi-location or unknown, try to extract from externalPath URL
    // Format: /job/Remote-KY/Job-Title_123
    if (!location.state && job.externalPath) {
      const pathMatch = job.externalPath.match(/\/job\/Remote-([A-Z]{2})\//i);
      if (pathMatch) {
        location = {
          city: 'Remote',
          state: pathMatch[1].toUpperCase(),
          isRemote: true
        };
      }
    }

    // If still no state, check additionalLocations from job details
    if (!location.state && jobPostingInfo.additionalLocations?.length > 0) {
      const firstAdditional = jobPostingInfo.additionalLocations[0];
      const additionalMatch = firstAdditional.match(/Remote-([A-Z]{2})/i);
      if (additionalMatch) {
        location = {
          city: 'Remote',
          state: additionalMatch[1].toUpperCase(),
          isRemote: true
        };
      }
    }

    // Determine work arrangement
    let workArrangement = null;
    if (location.isRemote) {
      workArrangement = 'remote';
    } else {
      // Use detection utility for non-obvious cases
      workArrangement = detectWorkArrangement({
        title: title,
        description: description,
        location: job.locationsText || '',
        employmentType: ''
      });
    }

    // Extract job ID from external path
    const jobIdMatch = job.externalPath.match(/_(\d+)(?:-\d+)?$/);
    const sourceJobId = jobIdMatch ? jobIdMatch[1] : job.bulletFields?.[0] || '';

    // Build job URL
    const jobUrl = `${API_BASE}/en-US/${CONFIG.site}${job.externalPath}`;

    // Parse posted date
    let postedDate = new Date();
    if (job.postedOn) {
      const daysMatch = job.postedOn.match(/(\d+)\s*Days?\s*Ago/i);
      if (daysMatch) {
        const daysAgo = parseInt(daysMatch[1], 10);
        postedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      } else if (/today/i.test(job.postedOn)) {
        postedDate = new Date();
      }
    }

    // Parse salary - first try API field, then extract from description
    let salaryData = {};
    let salaryText = jobPostingInfo.salary;

    // If no API salary field, extract from description (most common for Centene)
    // Pattern: "Pay Range: $56,200.00 - $101,000.00 per year"
    if (!salaryText && description) {
      const descPayMatch = description.match(/Pay\s*Range:\s*\$?([\d,]+(?:\.\d{2})?)\s*-\s*\$?([\d,]+(?:\.\d{2})?)\s*per\s*(year|hour)/i);
      if (descPayMatch) {
        salaryText = `$${descPayMatch[1]} - $${descPayMatch[2]} per ${descPayMatch[3]}`;
      }
    }

    if (salaryText) {
      const salaryMatch = salaryText.match(/\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)/);
      const isHourly = /per\s*hour|hourly/i.test(salaryText);
      const isAnnual = /per\s*year|annual/i.test(salaryText);

      if (salaryMatch) {
        const min = parseFloat(salaryMatch[1].replace(/,/g, ''));
        const max = parseFloat(salaryMatch[2].replace(/,/g, ''));

        // Determine type from keywords or value magnitude
        let salaryType = isHourly ? 'hourly' : (isAnnual ? 'annual' : (min > 500 ? 'annual' : 'hourly'));

        if (salaryType === 'hourly') {
          salaryData = {
            salaryMin: Math.round(min),
            salaryMax: Math.round(max),
            salaryType: 'hourly',
            salaryMinHourly: Math.round(min),
            salaryMaxHourly: Math.round(max),
            salaryMinAnnual: Math.round(min * 2080),
            salaryMaxAnnual: Math.round(max * 2080)
          };
        } else {
          salaryData = {
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

    return {
      title: title,
      sourceJobId: sourceJobId,
      requisitionId: sourceJobId,
      sourceUrl: jobUrl,
      slug: generateJobSlug(title, location.city || 'Remote', location.state || 'US', sourceJobId),
      location: job.locationsText || 'Remote',
      city: location.city || 'Remote',
      state: location.state,
      zipCode: null,
      address: null,
      jobType: 'Full Time', // Centene jobs are typically full-time
      shiftType: 'days', // Remote/insurance jobs are typically day shift
      schedule: null,
      description: description,
      specialty: extractSpecialty(title, description),
      department: null,
      postedDate: postedDate,
      workArrangement: workArrangement,
      ...salaryData
    };
  } catch (error) {
    console.error(`  Error transforming job ${job.title}:`, error.message);
    return null;
  }
}

/**
 * Add delay between requests
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main scraper function
 */
async function scrapeCenteneJobs() {
  console.log('=== CENTENE RN JOB SCRAPER ===\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no database writes)' : 'LIVE'}`);
  if (MAX_PAGES) console.log(`Max pages: ${MAX_PAGES}`);
  console.log(`API: ${JOBS_API}\n`);

  const jobService = new JobBoardService();
  const allJobs = [];
  let offset = 0;
  let page = 1;
  let totalJobs = 0;

  try {
    // Fetch first page to get total count
    console.log('Fetching job listings...');
    const firstPage = await fetchJobsPage(0);
    totalJobs = firstPage.total || 0;

    console.log(`Found ${totalJobs} total jobs in Care Management & Nursing families\n`);

    if (totalJobs === 0) {
      console.log('No jobs found. Exiting.');
      return { success: true, jobsScraped: 0, jobsSaved: 0 };
    }

    // Process all pages
    while (offset < totalJobs) {
      if (MAX_PAGES && page > MAX_PAGES) {
        console.log(`\nReached max pages limit (${MAX_PAGES}). Stopping.`);
        break;
      }

      console.log(`\n--- Page ${page} (offset ${offset}) ---`);

      const pageData = page === 1 ? firstPage : await fetchJobsPage(offset);
      const jobs = pageData.jobPostings || [];

      if (jobs.length === 0) {
        console.log('No more jobs on this page.');
        break;
      }

      console.log(`Processing ${jobs.length} jobs...`);

      for (const job of jobs) {
        // No RN filter here - the API already filters to Care Management & Nursing families
        // Let the LLM classifier determine if jobs are RN-relevant
        console.log(`  Processing: ${job.title}`);

        // Transform job with details fetch
        const transformedJob = await transformJob(job);

        if (transformedJob) {
          allJobs.push(transformedJob);
          console.log(`    Location: ${transformedJob.city}, ${transformedJob.state}`);
          console.log(`    Work Arrangement: ${transformedJob.workArrangement || 'unknown'}`);
          console.log(`    Specialty: ${transformedJob.specialty}`);
        }

        // Small delay to avoid rate limiting
        await delay(200);
      }

      offset += CONFIG.pageSize;
      page++;

      // Delay between pages
      if (offset < totalJobs) {
        await delay(1000);
      }
    }

    console.log(`\n=== SCRAPING COMPLETE ===`);
    console.log(`Total RN jobs found: ${allJobs.length}`);

    // Summary by work arrangement
    const remote = allJobs.filter(j => j.workArrangement === 'remote').length;
    const hybrid = allJobs.filter(j => j.workArrangement === 'hybrid').length;
    const onsite = allJobs.filter(j => j.workArrangement === 'onsite').length;
    const unknown = allJobs.filter(j => !j.workArrangement).length;

    console.log(`\nWork Arrangement Breakdown:`);
    console.log(`  Remote: ${remote}`);
    console.log(`  Hybrid: ${hybrid}`);
    console.log(`  Onsite: ${onsite}`);
    console.log(`  Unknown: ${unknown}`);

    // Summary by specialty
    const bySpecialty = {};
    for (const job of allJobs) {
      bySpecialty[job.specialty] = (bySpecialty[job.specialty] || 0) + 1;
    }
    console.log(`\nSpecialty Breakdown:`);
    for (const [spec, count] of Object.entries(bySpecialty).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${spec}: ${count}`);
    }

    // Deduplicate jobs by sourceJobId (API may return same job in multiple job families)
    const uniqueJobs = [];
    const seenJobIds = new Set();
    for (const job of allJobs) {
      if (!seenJobIds.has(job.sourceJobId)) {
        seenJobIds.add(job.sourceJobId);
        uniqueJobs.push(job);
      } else {
        console.log(`  ⚠️ Skipping duplicate: ${job.title} (${job.sourceJobId})`);
      }
    }

    if (uniqueJobs.length < allJobs.length) {
      console.log(`\n📋 Removed ${allJobs.length - uniqueJobs.length} duplicate jobs`);
    }

    // Save to database
    if (!DRY_RUN && uniqueJobs.length > 0) {
      console.log(`\nSaving ${uniqueJobs.length} jobs to database...`);

      const result = await jobService.saveJobs(uniqueJobs, {
        employerName: CONFIG.employerName,
        employerSlug: CONFIG.employerSlug,
        careerPageUrl: CONFIG.careerPageUrl,
        atsPlatform: CONFIG.atsPlatform
      });

      console.log(`\nDatabase Results:`);
      console.log(`  Created: ${result.created}`);
      console.log(`  Updated: ${result.updated}`);
      console.log(`  Errors: ${result.errors}`);

      return {
        success: true,
        jobsScraped: allJobs.length,
        jobsSaved: result.created + result.updated,
        created: result.created,
        updated: result.updated
      };
    } else {
      console.log('\nDry run - no jobs saved to database.');
      return {
        success: true,
        jobsScraped: allJobs.length,
        jobsSaved: 0
      };
    }

  } catch (error) {
    console.error('\nScraping error:', error.message);
    return {
      success: false,
      error: error.message,
      jobsScraped: allJobs.length
    };
  }
}

// Run if called directly
if (require.main === module) {
  scrapeCenteneJobs()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Scraping completed successfully');
      } else {
        console.error('\n❌ Scraping failed:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCenteneJobs, CONFIG };
