#!/usr/bin/env node
/**
 * Mass General Brigham RN Job Scraper
 *
 * Uses the Workday CXS API to fetch nursing jobs.
 * This is much faster and more reliable than DOM scraping.
 *
 * API: POST https://massgeneralbrigham.wd1.myworkdayjobs.com/wday/cxs/massgeneralbrigham/MGBExternal/jobs
 *
 * Usage:
 *   node mass-general-brigham-rn-scraper.js [options]
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
  employerName: 'Mass General Brigham',
  employerSlug: 'mass-general-brigham',
  careerPageUrl: 'https://massgeneralbrigham.wd1.myworkdayjobs.com/MGBExternal',
  atsPlatform: 'Workday',

  // API settings
  tenant: 'massgeneralbrigham',
  site: 'MGBExternal',
  subdomain: 'wd1',
  pageSize: 20,

  // Job family IDs for nursing categories
  jobFamilies: [
    '1856eb1940d51000cc9ecfa436140001',
    '1856eb1940d51000cc9ecad56e710001',
    '1856eb1940d51000cc9ef643588c0000',
    '1856eb1940d51000cc9ed33dace40000',
    '1856eb1940d51000cc9eca3589210002'
  ]
};

// Build API URLs
const API_BASE = `https://${CONFIG.tenant}.${CONFIG.subdomain}.myworkdayjobs.com`;
const JOBS_API = `${API_BASE}/wday/cxs/${CONFIG.tenant}/${CONFIG.site}/jobs`;

// Hospital name to location mapping (for "2 Locations" fallback)
const MGB_HOSPITAL_LOCATIONS = {
  'Wentworth-Douglass Hospital': { city: 'Dover', state: 'NH' },
  'Wentworth-Douglass': { city: 'Dover', state: 'NH' },
  'Martha\'s Vineyard Hospital': { city: 'Oak Bluffs', state: 'MA' },
  'The General Hospital Corporation': { city: 'Boston', state: 'MA' }, // MGH
  'Massachusetts General Hospital': { city: 'Boston', state: 'MA' },
  'Mass General Hospital': { city: 'Boston', state: 'MA' },
  'Brigham and Women\'s Hospital': { city: 'Boston', state: 'MA' },
  'Brigham and Women\'s Faulkner': { city: 'Jamaica Plain', state: 'MA' },
  'Faulkner Hospital': { city: 'Jamaica Plain', state: 'MA' },
  'Newton-Wellesley Hospital': { city: 'Newton', state: 'MA' },
  'North Shore Medical Center': { city: 'Salem', state: 'MA' },
  'Salem Hospital': { city: 'Salem', state: 'MA' },
  'McLean Hospital': { city: 'Belmont', state: 'MA' },
  'Spaulding Rehabilitation': { city: 'Boston', state: 'MA' },
  'Cooley Dickinson Hospital': { city: 'Northampton', state: 'MA' },
  'Mass Eye and Ear': { city: 'Boston', state: 'MA' },
  'MGH': { city: 'Boston', state: 'MA' }
};

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
        jobFamily: CONFIG.jobFamilies
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': API_BASE,
        'Referer': `${API_BASE}/${CONFIG.site}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Fetch job details for a specific job
 */
function fetchJobDetails(jobPath) {
  return new Promise((resolve, reject) => {
    const detailUrl = `${API_BASE}/wday/cxs/${CONFIG.tenant}/${CONFIG.site}${jobPath}`;

    https.get(detailUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse job details: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Check if job title indicates an RN position
 */
function isRnJob(title, description = '') {
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();

  // Exclude non-RN positions
  const excludePatterns = [
    /\blpn\b/, /licensed practical nurse/,
    /\blvn\b/, /licensed vocational nurse/,
    /\bcna\b/, /certified nursing assistant/,
    /\bma\b/, /medical assistant/,
    /\bnp\b/, /nurse practitioner/,
    /\bcrna\b/, /nurse anesthetist/,
    /\bcns\b/, /clinical nurse specialist/,
    /\bcnm\b/, /nurse midwife/
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(titleLower)) {
      // But include if it also mentions RN
      if (!titleLower.includes('rn') && !titleLower.includes('registered nurse')) {
        return false;
      }
    }
  }

  // Check for RN indicators
  const rnPatterns = [
    /\brn\b/, /registered nurse/,
    /nurse manager/, /nurse navigator/,
    /nurse educator/, /clinical nurse/,
    /staff nurse/, /charge nurse/,
    /nurse specialist/, /nursing supervisor/,
    /nurse coordinator/, /nurse leader/,
    /inpatient.*nurse/, /psych.*nurse/,
    /triage.*nurse/, /float.*nurse/
  ];

  if (rnPatterns.some(pattern => pattern.test(titleLower))) {
    return true;
  }

  // Check description for RN requirement
  const descPatterns = [
    /registered nurse/,
    /rn license/,
    /rn required/,
    /current.*rn/,
    /valid rn/
  ];

  return descPatterns.some(pattern => pattern.test(descLower));
}

/**
 * Parse location from Workday format (e.g., "Dover-NH")
 */
function parseLocation(locationText) {
  if (!locationText) return { city: null, state: null };

  // Handle "2 Locations" or "Multiple Locations" - skip these
  if (/\d+\s*Locations?/i.test(locationText)) {
    return { city: null, state: null };
  }

  // Parse "City-ST" format (most common)
  const dashMatch = locationText.match(/^(.+)-([A-Z]{2})$/);
  if (dashMatch) {
    return {
      city: dashMatch[1].trim(),
      state: dashMatch[2]
    };
  }

  // Parse address format with state at end: "123 Street Boston-MA" or "123 Street Boston (Building)-MA"
  const addressStateMatch = locationText.match(/(.+?)\s*(?:\([^)]+\))?\s*-\s*([A-Z]{2})$/);
  if (addressStateMatch) {
    // Extract city from the address (last word before state)
    const addressPart = addressStateMatch[1].trim();
    const cityMatch = addressPart.match(/([A-Za-z\s]+?)(?:\s+\([^)]+\))?$/);
    const city = cityMatch ? cityMatch[1].trim().split(/\s+/).pop() : addressPart;
    return {
      city: city,
      state: addressStateMatch[2]
    };
  }

  // Parse "City, ST" or "City ST" format
  const commaMatch = locationText.match(/([A-Za-z\s]+),?\s+([A-Z]{2})(?:\s|$)/);
  if (commaMatch) {
    return {
      city: commaMatch[1].trim(),
      state: commaMatch[2]
    };
  }

  // Try to find Boston, MA pattern in address (e.g., "32 Fruit Street Boston")
  // Common MA cities for Mass General Brigham
  const maCities = ['Boston', 'Cambridge', 'Somerville', 'Waltham', 'Newton', 'Brookline', 'Salem', 'Danvers'];
  for (const city of maCities) {
    if (locationText.includes(city)) {
      return { city: city, state: 'MA' };
    }
  }

  // NH cities (for Wentworth-Douglass)
  const nhCities = ['Dover', 'Portsmouth', 'Rochester', 'Somersworth'];
  for (const city of nhCities) {
    if (locationText.includes(city)) {
      return { city: city, state: 'NH' };
    }
  }

  return { city: null, state: null };
}

/**
 * Extract location from hospital name or description (fallback for "2 Locations")
 */
function extractLocationFromHospital(hospitalName, description) {
  // Try hospital name first
  if (hospitalName) {
    for (const [hospital, location] of Object.entries(MGB_HOSPITAL_LOCATIONS)) {
      if (hospitalName.includes(hospital)) {
        return location;
      }
    }
  }

  // Try to find "Site: Hospital Name" in description
  if (description) {
    const siteMatch = description.match(/Site:\s*([^<\n]+)/i);
    if (siteMatch) {
      const siteName = siteMatch[1].trim();
      for (const [hospital, location] of Object.entries(MGB_HOSPITAL_LOCATIONS)) {
        if (siteName.includes(hospital)) {
          return location;
        }
      }
    }
  }

  return null;
}

/**
 * Parse salary from job description
 * Examples: "$31.66 - $61.35/Hourly", "$85,000 - $120,000/Annually"
 */
function parseSalary(description) {
  if (!description) return null;

  // Match hourly rate pattern
  const hourlyMatch = description.match(/\$([\d,.]+)\s*-\s*\$([\d,.]+)\s*\/?\s*(?:Hourly|Hour|hr)/i);
  if (hourlyMatch) {
    const min = parseFloat(hourlyMatch[1].replace(/,/g, ''));
    const max = parseFloat(hourlyMatch[2].replace(/,/g, ''));
    if (!isNaN(min) && !isNaN(max)) {
      return {
        salaryMin: Math.round(min),
        salaryMax: Math.round(max),
        salaryType: 'hourly',
        salaryMinHourly: Math.round(min),
        salaryMaxHourly: Math.round(max),
        salaryMinAnnual: Math.round(min * 2080),
        salaryMaxAnnual: Math.round(max * 2080)
      };
    }
  }

  // Match annual salary pattern
  const annualMatch = description.match(/\$([\d,]+)\s*-\s*\$([\d,]+)\s*\/?\s*(?:Annual|Year|Yearly)/i);
  if (annualMatch) {
    const min = parseFloat(annualMatch[1].replace(/,/g, ''));
    const max = parseFloat(annualMatch[2].replace(/,/g, ''));
    if (!isNaN(min) && !isNaN(max)) {
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

  return null;
}

/**
 * Extract employment type from job title and details
 */
function extractEmploymentType(title, timeType) {
  const titleLower = (title || '').toLowerCase();
  const timeLower = (timeType || '').toLowerCase();

  if (titleLower.includes('per diem') || titleLower.includes('perdiem')) {
    return 'Per Diem';
  }
  if (titleLower.includes(' pt ') || titleLower.includes(' pt-') ||
      titleLower.includes('-pt ') || titleLower.includes('-pt-') ||
      timeLower.includes('part time')) {
    return 'Part-Time';
  }
  if (titleLower.includes(' ft ') || titleLower.includes(' ft-') ||
      titleLower.includes('-ft ') || titleLower.includes('-ft-') ||
      titleLower.includes('full time') || titleLower.includes('full-time') ||
      timeLower.includes('full time')) {
    return 'Full-Time';
  }
  if (titleLower.includes('contract') || titleLower.includes('temp')) {
    return 'Contract';
  }

  return 'Full-Time'; // Default
}

/**
 * Extract shift from job title
 */
function extractShift(title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('night') || titleLower.includes('noc')) return 'Night';
  if (titleLower.includes('evening') || titleLower.includes('eve')) return 'Evening';
  if (titleLower.includes('day')) return 'Day';
  if (titleLower.includes('day/night') || titleLower.includes('rotating')) return 'Rotating';

  return null;
}

/**
 * Extract specialty from job title (check title first, then description)
 */
function extractSpecialty(title, description = '') {
  const titleLower = (title || '').toLowerCase();

  // Check title first with specific patterns (order matters!)
  const titlePatterns = [
    // Most specific first
    [/\bfloat\s*pool\b/, 'Float Pool'],
    [/\bnicu\b/, 'NICU'],
    [/\bpicu\b/, 'PICU'],
    [/\bl&d\b|labor.*delivery/, 'Labor & Delivery'],
    [/\bpacu\b|post.*anesthesia/, 'PACU'],
    [/emergency|,\s*er\b|\ber\s|^er\b/, 'Emergency'],
    [/\bicu\b|intensive care/, 'ICU'],
    [/critical care|stepdown/, 'Critical Care'],
    [/\bor\b|operating room/, 'Operating Room'],
    [/\bmed[\s/-]?surg\b/, 'Med/Surg'],
    [/oncology|cancer/, 'Oncology'],
    [/cardiology|cardiac|cath lab/, 'Cardiology'],
    [/pediatric|peds\b/, 'Pediatrics'],
    [/psych|mental health|behavioral/, 'Psychiatric'],
    [/neuro/, 'Neurology'],
    [/surgery|surgical/, 'Surgery'],
    [/telemetry|tele\b/, 'Telemetry'],
    [/dialysis/, 'Dialysis'],
    [/rehab/, 'Rehabilitation'],
    [/infusion/, 'Infusion'],
    [/home care|home health/, 'Home Care'],
    [/triage/, 'Triage'],
    [/radiation/, 'Radiation Oncology'],
    [/ivf|rei\b|fertility/, 'Reproductive'],
    [/ob\/?gyn|women.*health/, 'OB/GYN'],
    [/endo(?!crin)/, 'Endoscopy'],
    [/interventional.*radiology|\bir\b/, 'Interventional Radiology'],
    [/ambulatory/, 'Ambulatory'],
    [/outpatient/, 'Outpatient']
  ];

  for (const [pattern, specialty] of titlePatterns) {
    if (pattern.test(titleLower)) return specialty;
  }

  // Fall back to checking description if title doesn't match
  const descLower = (description || '').toLowerCase();
  for (const [pattern, specialty] of titlePatterns) {
    if (pattern.test(descLower)) return specialty;
  }

  return null;
}

/**
 * Parse posted date from relative string
 */
function parsePostedDate(postedOn) {
  const now = new Date();

  if (!postedOn) return now;

  if (postedOn.includes('Today')) {
    return now;
  }
  if (postedOn.includes('Yesterday')) {
    return new Date(now.setDate(now.getDate() - 1));
  }

  const daysMatch = postedOn.match(/(\d+)\s*Days?\s*Ago/i);
  if (daysMatch) {
    return new Date(now.setDate(now.getDate() - parseInt(daysMatch[1])));
  }

  if (postedOn.includes('30+')) {
    return new Date(now.setDate(now.getDate() - 30));
  }

  return now;
}

/**
 * Transform job data to our format
 */
function transformJob(listing, detail) {
  const info = detail.jobPostingInfo || {};
  let location = parseLocation(listing.locationsText || info.location);
  const salary = parseSalary(info.jobDescription);

  // Strip leading org code from hospital name (e.g., "1810 Wentworth-Douglass Hospital" -> "Wentworth-Douglass Hospital")
  const hospitalName = (detail.hiringOrganization?.name || '').replace(/^\d+\s+/, '') || null;

  // Fallback: if location parsing failed (e.g., "2 Locations"), try to extract from hospital name
  if (!location.city || !location.state) {
    const hospitalLocation = extractLocationFromHospital(hospitalName, info.jobDescription);
    if (hospitalLocation) {
      location = hospitalLocation;
    }
  }

  // Build source URL
  const sourceUrl = info.externalUrl ||
    `${API_BASE}/${CONFIG.site}/job/${listing.locationsText || 'location'}/${listing.externalPath?.split('/').pop()}`;

  // Detect work arrangement (remote/hybrid/onsite)
  const workArrangement = detectWorkArrangement({
    title: info.title || listing.title,
    description: info.jobDescription || '',
    location: listing.locationsText || info.location || '',
    employmentType: info.timeType || ''
  });

  return {
    title: info.title || listing.title,
    sourceJobId: info.jobReqId || info.id,
    requisitionId: info.jobReqId,
    sourceUrl: sourceUrl,
    slug: generateJobSlug(listing.title, location.city, location.state, info.jobReqId),
    location: listing.locationsText || info.location,
    city: location.city,
    state: location.state,
    jobType: extractEmploymentType(listing.title, info.timeType),
    shiftType: extractShift(listing.title),
    schedule: null,
    description: info.jobDescription || '',
    specialty: extractSpecialty(listing.title, info.jobDescription),
    department: hospitalName,
    postedDate: parsePostedDate(listing.postedOn),
    workArrangement: workArrangement,
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
 * Main scraper function
 */
async function scrapeMGBJobs() {
  console.log('🚀 Mass General Brigham RN Job Scraper\n');

  if (DRY_RUN) {
    console.log('⚠️  Running in DRY RUN mode (--no-save): Jobs will NOT be saved to database\n');
  }

  if (MAX_PAGES) {
    console.log(`📌 Page limit set: ${MAX_PAGES} pages (${MAX_PAGES * CONFIG.pageSize} jobs max)\n`);
  }

  const allJobs = [];
  let offset = 0;
  let pageNum = 0;
  let totalJobs = 0;
  let hasMore = true;

  console.log('=' .repeat(60));
  console.log('PHASE 1: Fetching job listings from API');
  console.log('=' .repeat(60));

  try {
    // PHASE 1: Fetch all job listings
    while (hasMore) {
      pageNum++;

      if (MAX_PAGES && pageNum > MAX_PAGES) {
        console.log(`\n📌 Reached page limit (${MAX_PAGES}), stopping.`);
        break;
      }

      console.log(`\n📄 Fetching page ${pageNum} (offset: ${offset})...`);

      const data = await fetchJobsPage(offset);

      if (pageNum === 1) {
        totalJobs = data.total || 0;
        console.log(`   Total nursing jobs available: ${totalJobs}`);
      }

      const jobs = data.jobPostings || [];
      console.log(`   Retrieved ${jobs.length} jobs`);

      if (jobs.length === 0) {
        hasMore = false;
        break;
      }

      // Filter for RN jobs
      let rnCount = 0;
      for (const job of jobs) {
        if (isRnJob(job.title)) {
          allJobs.push(job);
          rnCount++;
        }
      }

      console.log(`   ✅ Added ${rnCount} RN jobs (skipped ${jobs.length - rnCount} non-RN)`);

      // Check for more pages
      offset += CONFIG.pageSize;
      hasMore = offset < totalJobs;

      // Rate limiting
      if (hasMore) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`\n✅ Collected ${allJobs.length} RN job listings`);

    // PHASE 2: Fetch job details
    console.log('\n' + '=' .repeat(60));
    console.log('PHASE 2: Fetching job details');
    console.log('=' .repeat(60));

    const detailedJobs = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allJobs.length; i++) {
      const listing = allJobs[i];

      if ((i + 1) % 20 === 0 || i === 0) {
        console.log(`\n📥 Processing jobs ${i + 1}-${Math.min(i + 20, allJobs.length)} of ${allJobs.length}...`);
      }

      try {
        const detail = await fetchJobDetails(listing.externalPath);
        const transformed = transformJob(listing, detail);

        // Validate required fields
        if (!transformed.title || !transformed.externalId) {
          console.log(`   ⚠️  Skipped: Missing required fields for "${listing.title}"`);
          errorCount++;
          continue;
        }

        detailedJobs.push(transformed);
        successCount++;

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));

      } catch (error) {
        console.log(`   ❌ Error fetching details for "${listing.title}": ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Successfully processed ${successCount} jobs (${errorCount} errors)`);

    // PHASE 3: Validation
    console.log('\n' + '=' .repeat(60));
    console.log('PHASE 3: Validating jobs');
    console.log('=' .repeat(60));

    const validJobs = detailedJobs.filter(job => {
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

    console.log(`\n✅ ${validJobs.length} valid jobs`);

    // Show sample jobs
    console.log('\n📋 Sample jobs:');
    for (const job of validJobs.slice(0, 5)) {
      console.log(`\n   Title: ${job.title}`);
      console.log(`   Location: ${job.city || 'Unknown'}, ${job.state || 'Unknown'}`);
      console.log(`   Type: ${job.employmentType}`);
      console.log(`   Specialty: ${job.specialty || 'N/A'}`);
      console.log(`   Hospital: ${job.department || 'N/A'}`);
      if (job.salaryMin) {
        const salaryStr = job.salaryType === 'hourly'
          ? `$${job.salaryMin}-$${job.salaryMax}/hr`
          : `$${job.salaryMin.toLocaleString()}-$${job.salaryMax.toLocaleString()}/yr`;
        console.log(`   Salary: ${salaryStr}`);
      }
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
    console.log(`   Total listings from API: ${allJobs.length}`);
    console.log(`   Successfully processed: ${successCount}`);
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
  scrapeMGBJobs()
    .then(result => {
      console.log(`\n🎉 Done! Processed ${result.jobCount} jobs.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeMGBJobs, CONFIG };
