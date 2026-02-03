#!/usr/bin/env node
/**
 * Hackensack Meridian Health RN Job Scraper
 *
 * Platform: TalentBrew (Radancy)
 * Employer: Hackensack Meridian Health (New Jersey)
 * Career Page: https://jobs.hackensackmeridianhealth.org/search-jobs
 *
 * Uses Puppeteer to scrape server-side rendered job listings.
 * Extracts JSON-LD structured data from individual job pages.
 *
 * Usage:
 *   node hackensack-meridian-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --dry-run      Alias for --no-save
 *   --max-pages=N  Limit to N pages of results (for testing)
 *   --max-jobs=N   Limit to N jobs (for testing)
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const {
  normalizeState,
  normalizeCity,
  normalizeJobType,
  detectSpecialty,
  detectExperienceLevel,
  generateJobSlug,
  validateJobData
} = require('../lib/jobScraperUtils');
const JobBoardService = require('../lib/services/JobBoardService');
const { detectWorkArrangement } = require('../lib/utils/workArrangementUtils');

// Configuration
const CONFIG = {
  employerName: 'Hackensack Meridian Health',
  employerSlug: 'hackensack-meridian-health',
  careerPageUrl: 'https://jobs.hackensackmeridianhealth.org/search-jobs',
  atsPlatform: 'TalentBrew (Radancy)',
  baseUrl: 'https://jobs.hackensackmeridianhealth.org',
  defaultState: 'NJ',
  pageSize: 15, // Fixed by TalentBrew platform
};

// Rate limit recovery settings
const RATE_LIMIT_CONFIG = {
  maxConsecutiveTimeouts: 5,
  baseDelay: 2000,
  maxBackoffDelay: 30000,
};

// User-agent rotation pool
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Get a random user agent from the rotation pool
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get a randomized delay with ±30% variance to avoid pattern detection
 */
function getRandomizedDelay(baseDelay) {
  const variance = 0.3;
  const min = baseDelay * (1 - variance);
  const max = baseDelay * (1 + variance);
  return Math.floor(min + Math.random() * (max - min));
}

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save') || args.includes('--dry-run');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : 150;
const maxJobsArg = args.find(a => a.startsWith('--max-jobs='));
const MAX_JOBS = maxJobsArg ? parseInt(maxJobsArg.split('=')[1]) : null;

// Nursing job title patterns
const NURSING_TITLE_PATTERNS = [
  /\brn\b/i,
  /\bregistered\s*nurse\b/i,
  /\bnursing\b/i,
  /\bnurse\s*(manager|director|supervisor|leader|educator|practitioner)\b/i,
  /\bclinical\s*nurse\b/i,
  /\bcharge\s*nurse\b/i,
  /\bstaff\s*nurse\b/i,
  /\bhead\s*nurse\b/i,
];

// Exclude patterns (not RN positions)
const EXCLUDE_PATTERNS = [
  /\blpn\b/i,
  /\blvn\b/i,
  /\bcna\b/i,
  /\bnursing\s*assistant\b/i,
  /\bmedical\s*assistant\b/i,
  /\bnurse\s*aide\b/i,
  /\bnurse\s*tech/i,
  /\bnursing\s*support\b/i,
  /\bstudent\s*nurse\b/i,
  /\bnurse\s*extern\b/i,
  /\bextern\b/i,
  /\bintern\b/i,
];

/**
 * Check if a job title indicates an RN position
 */
function isRNJob(title, category) {
  const titleLower = (title || '').toLowerCase();
  const categoryLower = (category || '').toLowerCase();

  // First check exclusions
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(title)) {
      return false;
    }
  }

  // Check if it's a nursing category (but not LPN or support)
  if (categoryLower.includes('nursing') &&
      !categoryLower.includes('lpn') &&
      !categoryLower.includes('support')) {
    // Include nursing category jobs
    return true;
  }

  // Check title patterns
  for (const pattern of NURSING_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return true;
    }
  }

  return false;
}

/**
 * Parse job type from employment type string
 */
function parseJobType(employmentType) {
  if (!employmentType) return null;
  const et = employmentType.toLowerCase();

  if (et.includes('full time') || et.includes('full-time')) return 'full-time';
  if (et.includes('part time') || et.includes('part-time')) return 'part-time';
  if (et.includes('per diem') || et.includes('prn')) return 'per-diem';
  if (et.includes('contract') || et.includes('temporary')) return 'contract';

  return null;
}

/**
 * Parse shift from work hours or title
 */
function parseShift(workHours, title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('night') || titleLower.includes('noc')) return 'Night';
  if (titleLower.includes('evening') || titleLower.includes('eve')) return 'Evening';
  if (titleLower.includes('day shift') || titleLower.includes('days')) return 'Day';
  if (titleLower.includes('rotating') || titleLower.includes('variable')) return 'Variable';

  return null;
}

/**
 * Clean HTML from description
 */
function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract job links from search results page
 */
async function extractJobLinks(page) {
  return await page.evaluate(() => {
    const links = [];
    const jobElements = document.querySelectorAll('a[href^="/job/"]');

    for (const el of jobElements) {
      const href = el.getAttribute('href');
      const jobIdMatch = href.match(/\/job\/[^/]+\/[^/]+\/\d+\/(\d+)/);
      if (jobIdMatch) {
        const jobId = jobIdMatch[1];
        // Avoid duplicates
        if (!links.some(l => l.jobId === jobId)) {
          links.push({
            url: href,
            jobId: jobId
          });
        }
      }
    }
    return links;
  });
}

/**
 * Extract JSON-LD job data from job detail page
 */
async function extractJobData(page) {
  return await page.evaluate(() => {
    // Find JSON-LD script
    const ldScript = document.querySelector('script[type="application/ld+json"]');
    if (!ldScript) return null;

    try {
      const data = JSON.parse(ldScript.textContent);
      if (data['@type'] !== 'JobPosting') return null;

      // Get category from meta tag
      const categoryMeta = document.querySelector('meta[name="gtm_tbcn_jobcategory"]');
      const category = categoryMeta ? categoryMeta.getAttribute('content') : '';

      // Extract salary from body text if not in JSON-LD
      // Patterns: "Minimum rate of $51.12 Hourly" or "Salary Range: $X - $Y"
      const bodyText = document.body.innerText || '';
      let salaryMin = null;
      let salaryMax = null;
      let salaryType = null;

      // Check JSON-LD salary first
      if (data.baseSalary?.value?.minValue) {
        salaryMin = parseFloat(data.baseSalary.value.minValue);
        salaryMax = data.baseSalary.value.maxValue ? parseFloat(data.baseSalary.value.maxValue) : null;
        salaryType = data.baseSalary.value.unitText?.toLowerCase().includes('hour') ? 'hourly' : 'annual';
      }

      // If no JSON-LD salary, extract from body text
      if (!salaryMin) {
        // Pattern: "Minimum rate of $51.12 Hourly"
        const minRateMatch = bodyText.match(/Minimum rate of \$([\d,.]+)\s*(Hourly|Hour|Annual|Year)?/i);
        if (minRateMatch) {
          salaryMin = parseFloat(minRateMatch[1].replace(/,/g, ''));
          salaryMax = salaryMin; // Single value - set max = min
          salaryType = (minRateMatch[2] && minRateMatch[2].toLowerCase().includes('annual')) ? 'annual' : 'hourly';
        }

        // Pattern: "Starting at $153,732.80 Annually"
        const startingAtMatch = bodyText.match(/Starting at \$([\d,.]+)\s*(Hourly|Hour|Annual|Annually|Year)?/i);
        if (startingAtMatch) {
          salaryMin = parseFloat(startingAtMatch[1].replace(/,/g, ''));
          salaryMax = salaryMin; // Single value - set max = min
          salaryType = (startingAtMatch[2] && startingAtMatch[2].toLowerCase().includes('hour')) ? 'hourly' : 'annual';
        }

        // Pattern: "Salary Range: $X.XX - $Y.YY"
        const rangeMatch = bodyText.match(/Salary Range:\s*\$([\d,.]+)\s*-\s*\$([\d,.]+)/i);
        if (rangeMatch) {
          salaryMin = parseFloat(rangeMatch[1].replace(/,/g, ''));
          salaryMax = parseFloat(rangeMatch[2].replace(/,/g, ''));
          salaryType = salaryMin > 500 ? 'annual' : 'hourly';
        }

        // Pattern: "Pay Range: $X - $Y per hour"
        const payRangeMatch = bodyText.match(/Pay Range:\s*\$([\d,.]+)\s*-\s*\$([\d,.]+)\s*(?:per\s*)?(hour|year|annual)?/i);
        if (payRangeMatch) {
          salaryMin = parseFloat(payRangeMatch[1].replace(/,/g, ''));
          salaryMax = parseFloat(payRangeMatch[2].replace(/,/g, ''));
          salaryType = (payRangeMatch[3] && payRangeMatch[3].toLowerCase().includes('hour')) ? 'hourly' :
                       (salaryMin > 500 ? 'annual' : 'hourly');
        }
      }

      // Extract responsibilities/duties section from body (up to 5000 chars like other scrapers)
      // Hackensack uses "A day in the life of..." format for duties list
      let responsibilities = '';

      // Best method: Find "A day in the life" section which contains the full duties list
      const dayInLifeIdx = bodyText.indexOf('A day in the life');
      if (dayInLifeIdx > -1) {
        // Find end marker - "Education," or "QUALIFICATIONS" or "Compensation"
        const educationIdx = bodyText.indexOf('Education,', dayInLifeIdx);
        const qualIdx = bodyText.indexOf('QUALIFICATIONS', dayInLifeIdx);
        const compIdx = bodyText.indexOf('Compensation', dayInLifeIdx);

        // Use the earliest valid end marker
        const endMarkers = [educationIdx, qualIdx, compIdx].filter(idx => idx > dayInLifeIdx);
        const endIdx = endMarkers.length > 0 ? Math.min(...endMarkers) : dayInLifeIdx + 5000;

        responsibilities = bodyText.substring(dayInLifeIdx, endIdx).trim();
      }

      // Fallback: original Responsibilities regex
      if (!responsibilities || responsibilities.length < 200) {
        const respMatch = bodyText.match(/RESPONSIBILITIES\s*([\s\S]*?)(?=QUALIFICATIONS|Education,|Compensation|$)/i);
        if (respMatch && respMatch[1].trim().length > 50) {
          responsibilities = respMatch[1].trim().substring(0, 5000);
        }
      }

      return {
        title: data.title || '',
        description: data.description || '',
        qualifications: data.qualifications || '',
        responsibilities: responsibilities,
        employmentType: data.employmentType || '',
        workHours: data.workHours || '',
        datePosted: data.datePosted || '',
        identifier: data.identifier || '',
        url: data.url || '',
        category: category,
        organization: data.hiringOrganization?.name || '',
        location: data.jobLocation?.[0]?.address || {},
        salary: data.baseSalary || {},
        extractedSalary: { min: salaryMin, max: salaryMax, type: salaryType }
      };
    } catch (e) {
      return null;
    }
  });
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
  console.log(`Max Pages: ${MAX_PAGES}`);
  if (MAX_JOBS) console.log(`Max Jobs: ${MAX_JOBS}`);
  console.log('');

  const startTime = Date.now();
  let savedCount = 0;
  let errorCount = 0;

  // Rate limit recovery state
  let consecutiveTimeouts = 0;
  let currentBackoffDelay = RATE_LIMIT_CONFIG.baseDelay;

  // Browser management for restart capability
  let browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  /**
   * Create a new page with random user agent
   */
  async function createNewPage() {
    const page = await browser.newPage();
    await page.setUserAgent(getRandomUserAgent());
    await page.setViewport({ width: 1920, height: 1080 });
    return page;
  }

  /**
   * Restart browser with fresh user agent (rate limit recovery)
   */
  async function restartBrowser() {
    console.log('\n🔄 Restarting browser with fresh user agent (rate limit recovery)...');
    try {
      await browser.close();
    } catch (e) {
      // Browser may already be closed
    }
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    consecutiveTimeouts = 0;
    currentBackoffDelay = RATE_LIMIT_CONFIG.baseDelay;
    console.log('   Browser restarted successfully\n');
    return createNewPage();
  }

  try {
    let page = await createNewPage();

    // Collect job links from search results
    const allJobLinks = [];
    let pageNum = 1;

    console.log('📄 Collecting job links from search results...\n');

    while (pageNum <= MAX_PAGES) {
      if (MAX_JOBS && allJobLinks.length >= MAX_JOBS) {
        console.log(`   Reached max jobs limit (${MAX_JOBS})`);
        break;
      }

      const pageUrl = pageNum === 1
        ? CONFIG.careerPageUrl
        : `${CONFIG.careerPageUrl}?p=${pageNum}`;

      console.log(`   Page ${pageNum}: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, getRandomizedDelay(2000)));

        const links = await extractJobLinks(page);

        // Reset timeout tracking on success
        consecutiveTimeouts = 0;
        currentBackoffDelay = RATE_LIMIT_CONFIG.baseDelay;

        if (links.length === 0) {
          console.log('   No more jobs found, stopping pagination');
          break;
        }

        // Add new links
        for (const link of links) {
          if (!allJobLinks.some(l => l.jobId === link.jobId)) {
            allJobLinks.push(link);
          }
        }

        console.log(`   Found ${links.length} jobs, total: ${allJobLinks.length}`);
        pageNum++;

        // Randomized delay between pages
        await new Promise(r => setTimeout(r, getRandomizedDelay(1000)));

      } catch (e) {
        console.log(`   ⚠️ Error loading page ${pageNum}: ${e.message}`);
        errorCount++;

        // Track consecutive timeouts for rate limit detection
        if (e.message.includes('timeout') || e.message.includes('Timeout')) {
          consecutiveTimeouts++;
          console.log(`   ⚠️ Consecutive timeouts: ${consecutiveTimeouts}/${RATE_LIMIT_CONFIG.maxConsecutiveTimeouts}`);

          if (consecutiveTimeouts >= RATE_LIMIT_CONFIG.maxConsecutiveTimeouts) {
            page = await restartBrowser();
            continue; // Retry this page after restart
          } else {
            // Exponential backoff
            currentBackoffDelay = Math.min(currentBackoffDelay * 2, RATE_LIMIT_CONFIG.maxBackoffDelay);
            console.log(`   ⏳ Backing off for ${currentBackoffDelay / 1000}s before retry...`);
            await new Promise(r => setTimeout(r, currentBackoffDelay));
            continue; // Retry this page
          }
        }
        break; // Non-timeout error, stop pagination
      }
    }

    console.log(`\n📊 Total job links collected: ${allJobLinks.length}`);

    // Apply max jobs limit
    const jobsToProcess = MAX_JOBS ? allJobLinks.slice(0, MAX_JOBS) : allJobLinks;
    console.log(`   Processing ${jobsToProcess.length} jobs`);
    console.log('');

    // Fetch details for each job
    const validJobs = [];
    let rnCount = 0;
    let skippedCount = 0;

    console.log('📄 Fetching job details...\n');

    for (let i = 0; i < jobsToProcess.length; i++) {
      const jobLink = jobsToProcess[i];
      const jobUrl = `${CONFIG.baseUrl}${jobLink.url}`;

      // Periodic cooldowns to avoid rate limiting
      if (i > 0 && i % 100 === 0) {
        console.log(`\n⏸️  Cooldown pause at job ${i} (10 seconds)...`);
        await new Promise(r => setTimeout(r, 10000));
      }
      if (i > 0 && i % 500 === 0) {
        console.log(`\n⏸️  Extended cooldown at job ${i} (30 seconds)...`);
        await new Promise(r => setTimeout(r, 30000));
      }

      try {
        await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        // Randomized delay to avoid pattern detection
        const delay = getRandomizedDelay(1500);
        await new Promise(r => setTimeout(r, delay));

        const jobData = await extractJobData(page);

        // Reset timeout tracking on success
        consecutiveTimeouts = 0;
        currentBackoffDelay = RATE_LIMIT_CONFIG.baseDelay;

        if (!jobData) {
          console.log(`[${i + 1}/${jobsToProcess.length}] ⚠️ No JSON-LD data: ${jobLink.url}`);
          errorCount++;
          continue;
        }

        // Check if it's an RN job
        if (!isRNJob(jobData.title, jobData.category)) {
          skippedCount++;
          if (skippedCount <= 10) {
            console.log(`[${i + 1}/${jobsToProcess.length}] Skipped (not RN): ${jobData.title}`);
          }
          continue;
        }

        rnCount++;
        console.log(`[${i + 1}/${jobsToProcess.length}] ✓ ${jobData.title}`);

        // Parse location
        const city = normalizeCity(jobData.location.addressLocality || '');
        const state = jobData.location.addressRegion || CONFIG.defaultState;
        const zipCode = jobData.location.postalCode || null;

        // Clean and combine description
        const mainDesc = cleanHtml(jobData.description);
        const qualifications = cleanHtml(jobData.qualifications);
        const responsibilities = jobData.responsibilities ? cleanHtml(jobData.responsibilities) : '';

        let description = mainDesc;
        if (responsibilities) {
          description += `\n\nResponsibilities:\n${responsibilities}`;
        }
        if (qualifications) {
          description += `\n\nQualifications:\n${qualifications}`;
        }

        // Parse salary - use extracted salary from body text if JSON-LD is empty
        let salaryMin = null;
        let salaryMax = null;
        let salaryType = null;

        // First check JSON-LD
        if (jobData.salary?.value?.minValue) {
          salaryMin = parseFloat(jobData.salary.value.minValue);
          salaryMax = jobData.salary.value.maxValue ? parseFloat(jobData.salary.value.maxValue) : null;
          salaryType = jobData.salary.value.unitText?.toLowerCase().includes('hour') ? 'hourly' : 'annual';
        }

        // Fall back to extracted salary from body text
        if (!salaryMin && jobData.extractedSalary?.min) {
          salaryMin = jobData.extractedSalary.min;
          salaryMax = jobData.extractedSalary.max;
          salaryType = jobData.extractedSalary.type;
        }

        const specialty = detectSpecialty(jobData.title, description);
        const jobType = parseJobType(jobData.employmentType);
        const shift = parseShift(jobData.workHours, jobData.title);

        console.log(`   Location: ${city}, ${state}`);
        console.log(`   Category: ${jobData.category || 'N/A'}`);
        console.log(`   Specialty: ${specialty}`);
        if (salaryMin) {
          console.log(`   Salary: $${salaryMin}${salaryMax ? ' - $' + salaryMax : ''} (${salaryType || 'unknown'})`);
        }

        // Detect work arrangement (remote/hybrid/onsite)
        const workArrangement = detectWorkArrangement({
          title: jobData.title,
          description: description,
          location: `${city}, ${state}`,
          employmentType: jobType
        });

        const job = {
          title: jobData.title,
          slug: generateJobSlug(jobData.title, city, state, jobLink.jobId),
          description: description,
          specialty: specialty,
          location: `${city}, ${state}`,
          city: city,
          state: state,
          zipCode: zipCode,
          jobType: jobType,
          shiftType: shift,
          experienceLevel: detectExperienceLevel(jobData.title, description),
          workArrangement: workArrangement,
          salaryMin: salaryMin,
          salaryMax: salaryMax,
          salaryType: salaryType,
          // Compute normalized hourly/annual for statistics
          salaryMinHourly: salaryMin ? (salaryType === 'hourly' ? salaryMin : Math.round(salaryMin / 2080)) : null,
          salaryMaxHourly: salaryMax ? (salaryType === 'hourly' ? salaryMax : Math.round(salaryMax / 2080)) : null,
          salaryMinAnnual: salaryMin ? (salaryType === 'annual' ? salaryMin : Math.round(salaryMin * 2080)) : null,
          salaryMaxAnnual: salaryMax ? (salaryType === 'annual' ? salaryMax : Math.round(salaryMax * 2080)) : null,
          signOnBonus: null,
          sourceUrl: jobUrl,
          sourceJobId: jobLink.jobId,
          postedAt: jobData.datePosted ? new Date(jobData.datePosted) : new Date(),
          // Employer info
          employerName: CONFIG.employerName,
          employerSlug: CONFIG.employerSlug,
          careerPageUrl: CONFIG.careerPageUrl,
        };

        // Validate job
        const validation = validateJobData(job);
        if (validation.valid) {
          validJobs.push(job);
        } else {
          console.log(`   ⚠️ Validation failed: ${validation.errors.join(', ')}`);
        }

        // Randomized delay between requests
        await new Promise(r => setTimeout(r, getRandomizedDelay(500)));

      } catch (e) {
        console.log(`[${i + 1}/${jobsToProcess.length}] ❌ Error: ${e.message}`);
        errorCount++;

        // Track consecutive timeouts for rate limit detection
        if (e.message.includes('timeout') || e.message.includes('Timeout')) {
          consecutiveTimeouts++;
          console.log(`   ⚠️ Consecutive timeouts: ${consecutiveTimeouts}/${RATE_LIMIT_CONFIG.maxConsecutiveTimeouts}`);

          // Check if we need to restart browser (likely rate limited)
          if (consecutiveTimeouts >= RATE_LIMIT_CONFIG.maxConsecutiveTimeouts) {
            page = await restartBrowser();
          } else {
            // Exponential backoff
            currentBackoffDelay = Math.min(currentBackoffDelay * 2, RATE_LIMIT_CONFIG.maxBackoffDelay);
            console.log(`   ⏳ Backing off for ${currentBackoffDelay / 1000}s before retry...`);
            await new Promise(r => setTimeout(r, currentBackoffDelay));
          }
        }
      }
    }

    await browser.close();

    // Save to database
    if (!DRY_RUN && validJobs.length > 0) {
      console.log('');
      console.log('💾 Saving to database...');
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
      console.log(`   Created: ${result.created}`);
      console.log(`   Updated: ${result.updated}`);
      console.log(`   Reactivated: ${result.reactivated}`);
      console.log(`   Deactivated: ${result.deactivated}`);
    } else if (DRY_RUN) {
      savedCount = validJobs.length;
      console.log(`\n[DRY RUN] Would save ${validJobs.length} jobs`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('======================================================================');
    console.log('📊 SUMMARY');
    console.log('======================================================================');
    console.log(`   Total job links: ${allJobLinks.length}`);
    console.log(`   Jobs processed: ${jobsToProcess.length}`);
    console.log(`   RN jobs found: ${rnCount}`);
    console.log(`   Skipped (not RN): ${skippedCount}`);
    console.log(`   Valid jobs: ${validJobs.length}`);
    console.log(`   Saved/Updated: ${savedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Duration: ${duration}s`);
    console.log('');

  } catch (e) {
    await browser.close();
    console.error('Fatal error:', e);
    process.exit(1);
  }
}

// Run the scraper
scrapeJobs();
