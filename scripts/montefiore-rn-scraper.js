#!/usr/bin/env node
/**
 * Montefiore Einstein RN Job Scraper
 *
 * Uses Vizi Recruiter's static JSON API to fetch nursing jobs.
 * Backend ATS is Workday (montefiore.wd12.myworkdayjobs.com)
 *
 * API Endpoints:
 *   - Job list: https://vizi.vizirecruiter.com/Montefiore-4461/vizis.json
 *   - Job detail: https://vizi.vizirecruiter.com/Montefiore-4461/{jobId}/config.json
 *
 * Usage:
 *   node montefiore-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --max-jobs=N   Limit to N jobs (for testing)
 */

const https = require('https');
const JobBoardService = require('../lib/services/JobBoardService');
const { generateJobSlug } = require('../lib/jobScraperUtils');
const { detectWorkArrangement } = require('../lib/utils/workArrangementUtils');

// Configuration
const CONFIG = {
  employerName: 'Montefiore Einstein',
  employerSlug: 'montefiore-einstein',
  careerPageUrl: 'https://vizi.vizirecruiter.com/Montefiore-4461/',
  atsPlatform: 'Vizi Recruiter (Workday backend)',

  // API settings
  apiBase: 'https://vizi.vizirecruiter.com/Montefiore-4461',
  businessUnitId: 4461,
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save') || args.includes('--dry-run');
const maxJobsArg = args.find(a => a.startsWith('--max-jobs='));
const MAX_JOBS = maxJobsArg ? parseInt(maxJobsArg.split('=')[1]) : null;

/**
 * Fetch JSON from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Check if a job is an RN position
 */
function isRNJob(job) {
  const title = (job.title || '').toLowerCase();
  const jobFamily = (job.jobFamily || '').toLowerCase();

  // Include patterns
  const includePatterns = [
    /\brn\b/,
    /\bnurse\b/,
    /\bnursing\b/,
    /registered\s*nurse/,
    /staff\s*nurse/,
    /nurse\s*practitioner/,
    /\bnp\b/,
    /\bcrna\b/,
    /nurse\s*anesthetist/,
    /clinical\s*nurse/,
  ];

  // Exclude patterns (non-RN nursing roles)
  const excludePatterns = [
    /\blpn\b/,
    /\blvn\b/,
    /licensed\s*practical/,
    /\bcna\b/,
    /certified\s*nursing\s*assistant/,
    /nurse\s*aide/,
    /nursing\s*assistant/,
    /extern/,
    /student/,
    /tech\b/,
    /technician/,
    /secretary/,
    /clerk/,
    /coordinator(?!.*nurse)/,
    /manager(?!.*nurse)/,
    /director(?!.*nurse)/,
  ];

  // Check title
  const titleMatch = includePatterns.some(p => p.test(title));
  const titleExclude = excludePatterns.some(p => p.test(title));

  // Also check job family for nursing departments
  const isNursingDept = jobFamily.startsWith('nur -') ||
                        jobFamily.includes('nursing') ||
                        jobFamily.includes('anesthesiology');

  return (titleMatch || isNursingDept) && !titleExclude;
}

/**
 * Extract specialty from job family and title
 */
function extractSpecialty(job) {
  const title = (job.title || '').toLowerCase();
  const jobFamily = (job.jobFamily || '').toLowerCase();

  // Map job families to specialties
  const familyMappings = {
    'micu': 'ICU',
    'icu': 'ICU',
    'ccu': 'CCU',
    'pccu': 'PICU',
    'pediatric': 'Pediatrics',
    'peds': 'Pediatrics',
    'oncology': 'Oncology',
    'surgery': 'Surgery',
    'or ': 'OR',
    'operating': 'OR',
    'perioperative': 'OR',
    'ortho': 'Orthopedics',
    'neuro': 'Neuro',
    'stroke': 'Neuro',
    'cardiac': 'Cardiac',
    'heart': 'Cardiac',
    'medicine': 'Med-Surg',
    'general med': 'Med-Surg',
    'behavioral': 'Psych',
    'psych': 'Psych',
    'mental health': 'Psych',
    'emergency': 'ER',
    'ed ': 'ER',
    'labor': 'L&D',
    'delivery': 'L&D',
    'obgyn': 'L&D',
    'nicu': 'NICU',
    'neonatal': 'NICU',
    'rehab': 'Rehab',
    'dialysis': 'Dialysis',
    'infusion': 'Infusion',
    'ambulatory': 'Ambulatory',
    'outpatient': 'Ambulatory',
    'clinic': 'Ambulatory',
    'home health': 'Home Health',
    'hospice': 'Hospice',
    'palliative': 'Hospice',
    'anesthesiology': 'CRNA',
    'anesthetist': 'CRNA',
  };

  // Check job family first
  for (const [pattern, specialty] of Object.entries(familyMappings)) {
    if (jobFamily.includes(pattern)) {
      return specialty;
    }
  }

  // Check title
  for (const [pattern, specialty] of Object.entries(familyMappings)) {
    if (title.includes(pattern)) {
      return specialty;
    }
  }

  // Check for NP
  if (title.includes('nurse practitioner') || /\bnp\b/.test(title)) {
    return 'NP';
  }

  // Check for CRNA
  if (title.includes('anesthetist') || /\bcrna\b/.test(title)) {
    return 'CRNA';
  }

  return 'Other';
}

/**
 * Parse shift from level field
 */
function parseShift(level) {
  if (!level) return null;
  const levelLower = level.toLowerCase();

  if (levelLower.includes('night') || levelLower.includes('noc')) return 'Night';
  if (levelLower.includes('evening') || levelLower.includes('eve')) return 'Evening';
  if (levelLower.includes('day')) return 'Day';
  if (levelLower.includes('variable') || levelLower.includes('rotating')) return 'Variable';

  return null;
}

/**
 * Parse compensation to extract salary
 */
function parseCompensation(compensation) {
  if (!compensation) return { salaryMin: null, salaryMax: null, salaryType: null };

  // Extract dollar amounts
  const amounts = compensation.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (!amounts) return { salaryMin: null, salaryMax: null, salaryType: null };

  const values = amounts.map(a => parseFloat(a.replace(/[$,]/g, '')));

  // Determine if hourly or annual
  // Values under 200 are likely hourly
  const isHourly = values.every(v => v < 200);

  if (values.length === 1) {
    return {
      salaryMin: values[0],
      salaryMax: values[0],
      salaryType: isHourly ? 'hourly' : 'annual'
    };
  } else {
    return {
      salaryMin: Math.min(...values),
      salaryMax: Math.max(...values),
      salaryType: isHourly ? 'hourly' : 'annual'
    };
  }
}

/**
 * Parse location to extract city and state
 */
function parseLocation(location) {
  if (!location) return { city: null, state: null };

  // Format: "Bronx, New York" or "Yonkers, New York"
  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const stateMap = {
      'new york': 'NY',
      'new jersey': 'NJ',
      'connecticut': 'CT',
      'pennsylvania': 'PA',
    };

    const stateLower = parts[1].toLowerCase();
    const stateCode = stateMap[stateLower] || parts[1];

    return {
      city: parts[0],
      state: stateCode.length === 2 ? stateCode.toUpperCase() : stateCode
    };
  }

  return { city: location, state: null };
}

/**
 * Extract job ID from link
 */
function extractJobId(link) {
  // Format: https://vizi.vizirecruiter.com/Montefiore-4461/385355/index.html
  const match = link.match(/Montefiore-\d+\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * Build description from sections
 */
function buildDescription(sections) {
  if (!sections || !Array.isArray(sections)) return '';

  return sections.map(section => {
    let text = `## ${section.name}\n\n`;
    if (section.description) {
      // Strip HTML tags for cleaner text
      text += section.description
        .replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&rsquo;/g, "'")
        .trim();
    }
    return text;
  }).join('\n\n');
}

/**
 * Fetch job details from config.json
 */
async function fetchJobDetails(jobId) {
  try {
    const url = `${CONFIG.apiBase}/${jobId}/config.json`;
    const config = await fetchJSON(url);
    return {
      compensation: config.compensation,
      sections: config.sections,
      requisitionNumber: config.requisitionNumber,
      addressLabel: config.addressLabel,
      applyUrl: config.applicantRequestConfiguration?.link || config.jobPostingUrl,
    };
  } catch (e) {
    console.log(`      Warning: Could not fetch details for job ${jobId}: ${e.message}`);
    return null;
  }
}

/**
 * Transform API job to our job format
 */
async function transformJob(apiJob, fetchDetails = true) {
  const jobId = extractJobId(apiJob.link);
  const { city, state } = parseLocation(apiJob.location);
  const specialty = extractSpecialty(apiJob);
  const shift = parseShift(apiJob.level);

  // Extract requisition number from title if present
  const reqMatch = apiJob.title.match(/\(([A-Z0-9]+)\)$/);
  const requisitionNumber = reqMatch ? reqMatch[1] : jobId;

  // Clean title (remove requisition number)
  const cleanTitle = apiJob.title.replace(/\s*\([A-Z0-9]+\)$/, '').trim();

  let compensation = null;
  let description = apiJob.introduction || '';
  let applyUrl = apiJob.link;

  // Fetch additional details if needed
  if (fetchDetails && jobId) {
    const details = await fetchJobDetails(jobId);
    if (details) {
      compensation = details.compensation;
      if (details.sections) {
        description = buildDescription(details.sections);
      }
      if (details.applyUrl) {
        applyUrl = details.applyUrl;
      }
    }
  }

  const salary = parseCompensation(compensation);

  // Generate slug (title, city, state, jobId for uniqueness)
  const slug = generateJobSlug(cleanTitle, city, state, requisitionNumber);

  // Detect work arrangement (remote/hybrid/onsite)
  const workArrangement = detectWorkArrangement({
    title: cleanTitle,
    description: description,
    location: city && state ? `${city}, ${state}` : (city || state || ''),
    employmentType: apiJob.level || ''
  });

  return {
    title: cleanTitle,
    slug,
    description,
    specialty,
    location: city && state ? `${city}, ${state}` : (city || state || ''),
    city,
    state,
    zipCode: null,
    jobType: apiJob.level?.toLowerCase().includes('per diem') ? 'Per Diem' : 'Staff',
    shift,
    experienceLevel: null,
    workArrangement: workArrangement,
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryType: salary.salaryType,
    // Compute normalized hourly/annual for statistics
    salaryMinHourly: salary.salaryMin ? (salary.salaryType === 'hourly' ? salary.salaryMin : Math.round(salary.salaryMin / 2080)) : null,
    salaryMaxHourly: salary.salaryMax ? (salary.salaryType === 'hourly' ? salary.salaryMax : Math.round(salary.salaryMax / 2080)) : null,
    salaryMinAnnual: salary.salaryMin ? (salary.salaryType === 'annual' ? salary.salaryMin : Math.round(salary.salaryMin * 2080)) : null,
    salaryMaxAnnual: salary.salaryMax ? (salary.salaryType === 'annual' ? salary.salaryMax : Math.round(salary.salaryMax * 2080)) : null,
    signOnBonus: null,
    sourceUrl: applyUrl,
    sourceJobId: requisitionNumber,
    postedAt: apiJob.issueDate ? new Date(apiJob.issueDate) : new Date(),
  };
}

/**
 * Main scraper function
 */
async function scrapeJobs() {
  console.log('');
  console.log('======================================================================');
  console.log(`🏥 ${CONFIG.employerName} RN Job Scraper`);
  console.log('======================================================================');
  console.log('');
  console.log(`Platform: ${CONFIG.atsPlatform}`);
  console.log(`Career Page: ${CONFIG.careerPageUrl}`);
  console.log(`Dry Run: ${DRY_RUN}`);
  if (MAX_JOBS) console.log(`Max Jobs: ${MAX_JOBS}`);
  console.log('');

  const startTime = Date.now();
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Fetch all jobs
    console.log('📥 Fetching job list...');
    const url = `${CONFIG.apiBase}/vizis.json`;
    const allJobs = await fetchJSON(url);
    console.log(`   Found ${allJobs.length} total jobs`);

    // Filter to RN jobs
    const rnJobs = allJobs.filter(isRNJob);
    console.log(`   Filtered to ${rnJobs.length} RN jobs`);

    // Apply max jobs limit if set
    const jobsToProcess = MAX_JOBS ? rnJobs.slice(0, MAX_JOBS) : rnJobs;
    console.log(`   Processing ${jobsToProcess.length} jobs`);
    console.log('');

    // Process each job and collect transformed jobs
    const validJobs = [];

    for (let i = 0; i < jobsToProcess.length; i++) {
      const apiJob = jobsToProcess[i];

      console.log(`[${i + 1}/${jobsToProcess.length}] ${apiJob.title}`);
      console.log(`   Job Family: ${apiJob.jobFamily}`);
      console.log(`   Location: ${apiJob.location}`);

      try {
        // Transform job (fetch details for salary/description)
        const job = await transformJob(apiJob, true);

        console.log(`   Specialty: ${job.specialty}`);
        console.log(`   Shift: ${job.shift || 'Not specified'}`);
        if (job.salaryMin) {
          console.log(`   Salary: $${job.salaryMin}${job.salaryMax !== job.salaryMin ? `-$${job.salaryMax}` : ''}/${job.salaryType}`);
        }
        console.log(`   ✅ Valid: ${job.slug}`);
        validJobs.push(job);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));

      } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        errorCount++;
      }
    }

    // Save to database
    if (!DRY_RUN && validJobs.length > 0) {
      console.log('');
      const jobService = new JobBoardService();

      const employerData = {
        employerName: CONFIG.employerName,
        employerSlug: CONFIG.employerSlug,
        careerPageUrl: CONFIG.careerPageUrl,
        atsPlatform: CONFIG.atsPlatform
      };

      const result = await jobService.saveJobs(validJobs, employerData, {
        verifyActiveJobs: true
      });

      savedCount = result.created + result.updated;
      skippedCount = result.skipped || 0;
    } else if (DRY_RUN) {
      savedCount = validJobs.length;
      console.log(`\n[DRY RUN] Would save ${validJobs.length} jobs`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('======================================================================');
    console.log('📊 SUMMARY');
    console.log('======================================================================');
    console.log(`   Total RN jobs found: ${rnJobs.length}`);
    console.log(`   Jobs processed: ${jobsToProcess.length}`);
    console.log(`   Valid jobs: ${validJobs.length}`);
    console.log(`   Saved/Updated: ${savedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Duration: ${duration}s`);
    console.log('');

  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  }
}

// Run the scraper
scrapeJobs();
