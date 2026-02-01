#!/usr/bin/env node
/**
 * Kaleida Health RN Job Scraper
 *
 * Platform: Infor CloudSuite HCM
 * Employer: Kaleida Health (Buffalo, NY)
 * Career Page: https://css-y9x4ku9mqsygapwx-prd.inforcloudsuite.com/hcm/Jobs/form/JobBoard(1000,KH-EXTERNAL).JobSearchCompositeForm
 *
 * Uses Puppeteer to intercept API responses from the Infor CloudSuite platform.
 * The platform requires browser session/cookies so direct API calls won't work.
 *
 * Usage:
 *   node kaleida-health-rn-scraper.js [options]
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

// Configuration
const CONFIG = {
  employerName: 'Kaleida Health',
  employerSlug: 'kaleida-health',
  careerPageUrl: 'https://css-y9x4ku9mqsygapwx-prd.inforcloudsuite.com/hcm/Jobs/form/JobBoard(1000,KH-EXTERNAL).JobSearchCompositeForm',
  atsPlatform: 'Infor CloudSuite HCM',
  baseUrl: 'https://css-y9x4ku9mqsygapwx-prd.inforcloudsuite.com',
  defaultState: 'NY',
  pageSize: 50, // Request more jobs per page
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save') || args.includes('--dry-run');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : 20;
const maxJobsArg = args.find(a => a.startsWith('--max-jobs='));
const MAX_JOBS = maxJobsArg ? parseInt(maxJobsArg.split('=')[1]) : null;

/**
 * Check if a job should be included (Nursing or Management category)
 * The LLM classifier will handle RN vs non-RN distinction
 */
function isNursingOrManagement(job) {
  const category = (job.category || '').toLowerCase();

  // Include jobs from NURSING or MANAGEMENT categories
  // These are the categories we want to scrape
  return category.includes('nursing') || category.includes('management');
}

/**
 * Parse job info from the API job object
 */
function parseApiJob(apiJob) {
  const fields = apiJob.fields || {};

  // Extract job ID from resourceId: "JobPosting[JobPostingSet](1000,15320,1)"
  const resourceId = apiJob.resourceId || '';
  const idMatch = resourceId.match(/\(1000,(\d+),\d+\)/);
  const jobId = idMatch ? idMatch[1] : null;

  // Get field values
  const title = fields.Description?.value || '';
  const category = fields.Category?.value || '';
  const workType = fields.WorkType?.value || '';
  const shift = fields.Shift?.value || '';
  const department = fields.DepartmentName?.value || fields.Department?.value || '';
  const facility = fields.LocationName?.value || fields.Location?.value || '';
  const postedDate = fields.PostDateBegin?.value || fields.PostingDateStart?.value || '';

  // For the card view, job info is in these fields
  const cardLine = fields.JobSearchCardViewListWithLogoForJobTypeValue?.value ||
                   fields.CardViewDetails?.value || '';

  return {
    jobId,
    title,
    category,
    workType,
    shift,
    department,
    facility,
    postedDate,
    cardLine,
    resourceId
  };
}

/**
 * Parse job type from work type field
 */
function parseJobType(workType) {
  if (!workType) return null;
  const wt = workType.toLowerCase();

  if (wt.includes('full-time') || wt.includes('full time')) return 'full-time';
  if (wt.includes('part-time') || wt.includes('part time')) return 'part-time';
  if (wt.includes('per diem') || wt.includes('prn')) return 'per-diem';
  if (wt.includes('contract') || wt.includes('temp')) return 'contract';

  return null;
}

/**
 * Parse shift from shift field
 */
function parseShift(shift) {
  if (!shift) return null;
  const s = shift.toLowerCase();

  if (s.includes('day') || s.includes('shift 1') || s === '1') return 'Day';
  if (s.includes('evening') || s.includes('shift 2') || s === '2') return 'Evening';
  if (s.includes('night') || s.includes('shift 3') || s === '3') return 'Night';
  if (s.includes('variable') || s.includes('rotating')) return 'Variable';

  return null;
}

/**
 * Parse facility name and title to city
 * Checks both facility field and job title for location hints
 */
function facilityToCity(facility, title) {
  const facilityLower = (facility || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // Check title first for facility abbreviations (most reliable)
  // Job titles often include: "Practice Manager RN OGH", "Telemetry RN BGMC"
  if (titleLower.includes('ogh') || titleLower.includes('olean')) {
    return 'Olean';
  }
  if (titleLower.includes('bgmc') || titleLower.includes('buffalo general')) {
    return 'Buffalo';
  }
  if (titleLower.includes('mfs') || titleLower.includes('millard')) {
    return 'Williamsville';
  }

  // Then check facility field
  const facilityMap = {
    'buffalo general': 'Buffalo',
    'bgmc': 'Buffalo',
    'millard fillmore suburban': 'Williamsville',
    'mfs': 'Williamsville',
    'olean general': 'Olean',
    'ogh': 'Olean',
    'degraff': 'North Tonawanda',
  };

  for (const [pattern, city] of Object.entries(facilityMap)) {
    if (facilityLower.includes(pattern)) {
      return city;
    }
  }

  return 'Buffalo'; // Default for Kaleida Health
}

/**
 * Build job URL from resource ID
 */
function buildJobUrl(resourceId) {
  const encoded = encodeURIComponent(resourceId);
  return `${CONFIG.baseUrl}/hcm/Jobs/form/${encoded}.JobPostingDisplay?csk.JobBoard=KH-EXTERNAL&csk.HROrganization=1000`;
}

/**
 * Fetch job details from the detail page
 * Returns the full job description and parsed location
 */
async function fetchJobDetails(page, resourceId) {
  try {
    const jobUrl = buildJobUrl(resourceId);
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const details = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Extract location from format "US:NY:Olean"
      const locMatch = bodyText.match(/US:([A-Z]{2}):([A-Za-z\s]+)/);
      let state = null;
      let city = null;
      if (locMatch) {
        state = locMatch[1];
        city = locMatch[2].trim();
      }

      // Extract salary range from format "$74,997.00 - $85,497.75"
      // Some jobs use "Pay Range:" and others use "Salary Range:"
      const salaryMatch = bodyText.match(/(?:Pay|Salary) Range:\s*\$([\d,]+(?:\.\d{2})?)\s*-\s*\$([\d,]+(?:\.\d{2})?)/);
      let salaryMin = null;
      let salaryMax = null;
      if (salaryMatch) {
        salaryMin = parseFloat(salaryMatch[1].replace(/,/g, ''));
        salaryMax = parseFloat(salaryMatch[2].replace(/,/g, ''));
      }

      // Extract work type
      const workTypeMatch = bodyText.match(/Work Type:\s*([\w-]+)/);
      const workType = workTypeMatch ? workTypeMatch[1] : null;

      // Extract shift
      const shiftMatch = bodyText.match(/Shift\s*(\d)/);
      const shift = shiftMatch ? shiftMatch[1] : null;

      // Extract department
      const deptMatch = bodyText.match(/Department:\s*([^\n]+)/);
      const department = deptMatch ? deptMatch[1].trim() : null;

      // Extract facility/location name
      const facilityMatch = bodyText.match(/Location:\s*([^\n]+)/);
      const facility = facilityMatch ? facilityMatch[1].trim() : null;

      // Extract main description (everything between "Job Description" and "Education")
      let description = '';
      const descStart = bodyText.indexOf('Job Description');
      const descEnd = bodyText.indexOf('Education And Credentials');
      if (descStart > -1 && descEnd > -1) {
        description = bodyText.substring(descStart + 15, descEnd).trim();
      } else {
        // Fallback - get content between Description and Job Details
        const altStart = bodyText.indexOf('Description');
        const altEnd = bodyText.indexOf('Job Details');
        if (altStart > -1 && altEnd > -1) {
          description = bodyText.substring(altStart + 11, altEnd).trim();
        }
      }

      // Extract education requirements
      const eduStart = bodyText.indexOf('Education And Credentials');
      const eduEnd = bodyText.indexOf('Experience');
      let education = '';
      if (eduStart > -1 && eduEnd > -1 && eduEnd > eduStart) {
        education = bodyText.substring(eduStart + 25, eduEnd).trim();
      }

      // Extract experience requirements
      // Try multiple end markers: "Working Conditions", "Job Details", or end of relevant section
      const expStart = bodyText.indexOf('Experience');
      let expEnd = bodyText.indexOf('Working Conditions');
      if (expEnd === -1 || expEnd < expStart) {
        expEnd = bodyText.indexOf('Job Details');
      }
      let experience = '';
      if (expStart > -1 && expEnd > -1 && expEnd > expStart) {
        experience = bodyText.substring(expStart + 10, expEnd).trim();
      }

      return {
        state,
        city,
        salaryMin,
        salaryMax,
        workType,
        shift,
        department,
        facility,
        description,
        education,
        experience
      };
    });

    return details;
  } catch (e) {
    console.log(`      ⚠️  Failed to fetch details: ${e.message}`);
    return null;
  }
}

/**
 * Main scraper function using API interception
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

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Collect jobs from API responses
    const allJobs = [];

    // Intercept API responses
    page.on('response', async response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      // Look for job list API responses
      if (url.includes('/list/JobPosting') && contentType.includes('json')) {
        try {
          const json = await response.json();
          if (json.dataViewSet && json.dataViewSet.data) {
            const jobs = json.dataViewSet.data;
            console.log(`   📥 Intercepted ${jobs.length} jobs from API`);

            for (const apiJob of jobs) {
              const parsed = parseApiJob(apiJob);
              if (parsed.jobId && parsed.title) {
                // Check if we already have this job
                const exists = allJobs.some(j => j.jobId === parsed.jobId);
                if (!exists) {
                  allJobs.push(parsed);
                }
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    });

    // Navigate to career page with larger page size
    console.log('📄 Loading career page...');
    const pageUrl = `${CONFIG.careerPageUrl}?navigation=JobBoard(1000,KH-EXTERNAL).JobSearchCompositeFormNav&csk.JobBoard=KH-EXTERNAL&csk.HROrganization=1000`;
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    console.log(`   Collected ${allJobs.length} jobs from initial load`);

    // Scroll to load more jobs
    let pageNum = 1;
    let prevCount = 0;

    while (pageNum < MAX_PAGES) {
      if (MAX_JOBS && allJobs.length >= MAX_JOBS) {
        console.log(`   Reached max jobs limit (${MAX_JOBS})`);
        break;
      }

      prevCount = allJobs.length;

      // Scroll to bottom to trigger lazy loading
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, 2000));

      // If no new jobs loaded, we've reached the end
      if (allJobs.length === prevCount) {
        // Try clicking "Show More" or next page button
        const clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, a');
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('more') || text.includes('next') || text.includes('load')) {
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (!clicked) {
          console.log('   No more jobs to load');
          break;
        }

        await new Promise(r => setTimeout(r, 3000));

        // If still no new jobs, we're done
        if (allJobs.length === prevCount) {
          break;
        }
      }

      pageNum++;
      console.log(`   Page ${pageNum}: ${allJobs.length} total jobs collected`);
    }

    console.log(`\n📊 Total jobs collected: ${allJobs.length}`);

    // Filter to Nursing/Management category jobs
    const nursingJobs = allJobs.filter(isNursingOrManagement);
    console.log(`   Filtered to ${nursingJobs.length} Nursing/Management jobs`);

    // Apply max jobs limit
    const jobsToProcess = MAX_JOBS ? nursingJobs.slice(0, MAX_JOBS) : nursingJobs;
    console.log(`   Processing ${jobsToProcess.length} jobs`);
    console.log('');

    // Transform jobs to our format
    const validJobs = [];

    console.log('📄 Fetching job details...\n');

    for (let i = 0; i < jobsToProcess.length; i++) {
      const rawJob = jobsToProcess[i];

      console.log(`[${i + 1}/${jobsToProcess.length}] ${rawJob.title}`);

      try {
        // Fetch full job details from the detail page
        const details = await fetchJobDetails(page, rawJob.resourceId);

        // Use location from details if available, otherwise parse from title
        let city = details?.city || facilityToCity(rawJob.facility, rawJob.title);
        let state = details?.state || CONFIG.defaultState;

        const normalizedCity = normalizeCity(city);
        const normalizedState = state;

        // Use work type and shift from details if available
        const jobType = parseJobType(details?.workType || rawJob.workType);
        const shift = parseShift(details?.shift || rawJob.shift);

        // Build comprehensive description
        let description = '';
        if (details?.description) {
          description = details.description;
        }
        if (details?.education) {
          description += `\n\nEducation Requirements:\n${details.education}`;
        }
        if (details?.experience) {
          description += `\n\nExperience:\n${details.experience}`;
        }
        if (!description) {
          description = `${rawJob.title} at ${CONFIG.employerName}. Apply for full details.`;
        }

        const specialty = detectSpecialty(rawJob.title, description);

        console.log(`   Location: ${normalizedCity}, ${normalizedState}`);
        console.log(`   Department: ${details?.department || rawJob.department || 'Unknown'}`);
        if (details?.salaryMin) {
          console.log(`   Salary: $${details.salaryMin.toLocaleString()} - $${details.salaryMax?.toLocaleString()}`);
        }

        const job = {
          title: rawJob.title,
          slug: generateJobSlug(rawJob.title, normalizedCity, normalizedState, rawJob.jobId),
          description: description,
          specialty: specialty,
          location: `${normalizedCity}, ${normalizedState}`,
          city: normalizedCity,
          state: normalizedState,
          zipCode: null,
          jobType: jobType,
          shift: shift,
          experienceLevel: detectExperienceLevel(rawJob.title, description),
          salaryMin: details?.salaryMin || null,
          salaryMax: details?.salaryMax || null,
          // Detect hourly vs annual: if max salary < 200, it's likely hourly
          salaryType: details?.salaryMin ? (details.salaryMax < 200 ? 'hourly' : 'annual') : null,
          // Compute normalized hourly/annual for statistics
          salaryMinHourly: details?.salaryMin ? (details.salaryMax < 200 ? details.salaryMin : Math.round(details.salaryMin / 2080)) : null,
          salaryMaxHourly: details?.salaryMax ? (details.salaryMax < 200 ? details.salaryMax : Math.round(details.salaryMax / 2080)) : null,
          salaryMinAnnual: details?.salaryMin ? (details.salaryMax < 200 ? Math.round(details.salaryMin * 2080) : details.salaryMin) : null,
          salaryMaxAnnual: details?.salaryMax ? (details.salaryMax < 200 ? Math.round(details.salaryMax * 2080) : details.salaryMax) : null,
          signOnBonus: null,
          sourceUrl: buildJobUrl(rawJob.resourceId),
          sourceJobId: rawJob.jobId,
          postedAt: rawJob.postedDate ? new Date(rawJob.postedDate) : new Date(),
          // Employer info
          employerName: CONFIG.employerName,
          employerSlug: CONFIG.employerSlug,
          careerPageUrl: CONFIG.careerPageUrl,
        };

        // Validate job
        const validation = validateJobData(job);
        if (validation.valid) {
          console.log(`   Specialty: ${job.specialty}`);
          console.log(`   ✅ Valid`);
          validJobs.push(job);
        } else {
          console.log(`   ⚠️  Validation failed: ${validation.errors.join(', ')}`);
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));

      } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        errorCount++;
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
    console.log(`   Total jobs collected: ${allJobs.length}`);
    console.log(`   Nursing/Mgmt jobs: ${nursingJobs.length}`);
    console.log(`   Jobs processed: ${jobsToProcess.length}`);
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
