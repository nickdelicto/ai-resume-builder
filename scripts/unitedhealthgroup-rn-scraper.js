#!/usr/bin/env node
/**
 * UnitedHealth Group RN Job Scraper
 *
 * Uses the Symphony Talent / m-cloud internal API to fetch nursing jobs.
 * UnitedHealth Group is a major health insurance company with remote nursing positions
 * including Case Management, Utilization Review, and Telehealth roles.
 *
 * API: https://jobsapi-internal.m-cloud.io/api/job
 * Organization ID: 2071
 *
 * Usage:
 *   node unitedhealthgroup-rn-scraper.js [options]
 *
 * Options:
 *   --dry-run       Don't save to database
 *   --max-pages=N   Limit to N pages (100 jobs per page)
 *   --max-jobs=N    Limit to N total jobs
 */

const https = require('https');
const JobBoardService = require('../lib/services/JobBoardService');
const { generateJobSlug } = require('../lib/jobScraperUtils');
const { detectWorkArrangement } = require('../lib/utils/workArrangementUtils');

// Configuration
const CONFIG = {
  employerName: 'UnitedHealth Group',
  employerSlug: 'unitedhealthgroup',
  careerPageUrl: 'https://careers.unitedhealthgroup.com/job-search-results/?multi_select1[]=Nursing',
  atsPlatform: 'Symphony Talent (m-cloud)',

  // API settings
  apiBase: 'https://jobsapi-internal.m-cloud.io/api/job',
  organizationId: '2071',
  pageSize: 100,
  // Combined categories: Nursing + Medical & Clinical Operations (use ~ to combine)
  category: 'Medical & Clinical Operations~Nursing',

  // Job URL pattern
  jobUrlBase: 'https://careers.unitedhealthgroup.com/job'
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('--no-save');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : null;
const maxJobsArg = args.find(a => a.startsWith('--max-jobs='));
const MAX_JOBS = maxJobsArg ? parseInt(maxJobsArg.split('=')[1], 10) : null;

/**
 * Build API URL with parameters
 */
function buildApiUrl(offset = 0) {
  const params = new URLSearchParams();
  // Note: UHG uses multi_select1 for category filtering, not parent_category
  params.set('facet[]', `multi_select1:${CONFIG.category}`);
  params.set('countryStateCity', 'US');
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
        'Accept': 'application/json',
        'Origin': 'https://careers.unitedhealthgroup.com',
        'Referer': 'https://careers.unitedhealthgroup.com/'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // API returns JSON directly (no JSONP wrapper needed)
          resolve(JSON.parse(data));
        } catch (e) {
          // Try stripping JSONP wrapper if present
          const jsonStr = data.replace(/^[^({]+\(/, '').replace(/\);?$/, '');
          try {
            resolve(JSON.parse(jsonStr));
          } catch (e2) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        }
      });
    }).on('error', reject);
  });
}

/**
 * Simple RN filter - check if "RN" or "Registered Nurse" is mentioned
 * in title OR description. Cast a wide net, let LLM classifier do fine filtering.
 */
function mentionsRN(job) {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();

  // Check for RN mentions (word boundary to avoid false matches like "learning")
  const rnPattern = /\brn\b|registered nurse/i;

  return rnPattern.test(title) || rnPattern.test(description);
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

  // Sanity check: reject impossible values
  if (isHourly) {
    if (min < 20 || max > 500) {
      console.log(`⚠️  Rejecting impossible hourly salary: $${min}-$${max}/hour`);
      return null;
    }
  } else {
    if (min < 40000 || max < 40000) {
      console.log(`⚠️  Rejecting impossible annual salary: $${min}-$${max}/year`);
      return null;
    }
  }

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

  // Parse salary info
  const salary = parseSalary(job.salary);

  // Clean description for work arrangement detection
  const description = cleanDescription(job.description);

  // Detect work arrangement (remote/hybrid/onsite)
  // UHG has many remote positions, especially in case management
  const workArrangement = detectWorkArrangement({
    title: job.title,
    description: description,
    location: `${city}, ${state}`,
    employmentType: job.employment_type || job.schedule || ''
  });

  // Use ref/clientid as the true job ID (m-cloud 'id' differs between duplicate entries)
  const requisitionId = job.ref || job.clientid || job.id;

  // Prefer careers site URL over Taleo URL
  let jobUrl = job.url || `${CONFIG.jobUrlBase}/${job.id}/${slug}-${citySlug}-${stateSlug}/`;
  if (jobUrl.includes('taleo.net') && job.id) {
    // Construct careers site URL instead
    jobUrl = `${CONFIG.jobUrlBase}/${job.id}/${slug}-${citySlug}-${stateSlug}/`;
  }

  return {
    title: job.title,
    sourceJobId: String(requisitionId),
    requisitionId: String(requisitionId),
    sourceUrl: jobUrl,
    slug: generateJobSlug(job.title, city, state, requisitionId),
    location: city && state ? `${city}, ${state}` : (city || state || 'United States'),
    city: city || null,
    state: state || null,
    zipCode: job.primary_zip || null,
    address: null,
    jobType: mapEmploymentType(job),
    shiftType: extractShift(job),
    schedule: job.schedule || null,
    description: description,
    specialty: extractSpecialty(job),
    department: job.department || job.business_unit || null,
    brand: job.brand || null,  // e.g., "Optum Care Solutions"
    postedDate: parsePostedDate(job),
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
 * Map employment type
 */
function mapEmploymentType(job) {
  const empType = (job.employment_type || '').toLowerCase();
  const jobType = (job.job_type || '').toLowerCase();
  const schedule = (job.schedule || '').toLowerCase();
  const title = (job.title || '').toLowerCase();

  // Check title for PRN (common in nursing)
  if (title.includes('prn')) {
    return 'PRN';
  }

  if (empType.includes('per diem') || schedule.includes('per diem') || title.includes('per diem')) {
    return 'Per Diem';
  }
  if (empType.includes('part time') || empType.includes('part-time') || schedule.includes('part time')) {
    return 'Part-Time';
  }
  if (empType.includes('full time') || empType.includes('full-time') || empType.includes('regular')) {
    return 'Full-Time';
  }
  if (jobType.includes('temp') || empType.includes('contract')) {
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
  const description = (job.description || '').toLowerCase().slice(0, 1000);

  if (shift.includes('night') || title.includes('night') || description.includes('night shift')) return 'Night';
  if (shift.includes('evening') || title.includes('evening')) return 'Evening';
  if (shift.includes('day') || title.includes('days') || title.includes('day shift')) return 'Day';
  if (shift.includes('rotating') || title.includes('rotating')) return 'Rotating';
  if (title.includes('afterhours') || title.includes('after hours') || title.includes('on call')) return 'On-Call';

  return null;
}

/**
 * Extract specialty from job data
 * UHG specialties include insurance-focused roles like Case Management, Utilization Review
 */
function extractSpecialty(job) {
  const title = (job.title || '').toLowerCase();
  const func = (job.function || '').toLowerCase();
  const dept = (job.department || '').toLowerCase();
  const description = (job.description || '').toLowerCase().slice(0, 2000);

  // Order matters: check more specific terms first
  const specialtyPatterns = [
    // Insurance/Remote specialty roles - check these FIRST
    [/case manag|case mgr/, 'Case Management'],
    [/utilization review|ur nurse|ur rn|utilization management/, 'Utilization Review'],
    [/quality assurance|qa nurse|quality nurse|quality management/, 'Quality Assurance'],
    [/clinical reviewer|clinical review/, 'Utilization Review'],
    [/care coordinator|care coordination/, 'Care Coordination'],
    [/telehealth|telenurs|virtual.*nurse|remote.*triage/, 'Telehealth'],
    [/clinical documentation|cdi|documentation improvement/, 'Clinical Documentation'],
    [/prior auth|preauthorization|pre-authorization/, 'Utilization Review'],
    [/appeals|grievance/, 'Case Management'],
    [/nurse auditor|clinical auditor/, 'Quality Assurance'],

    // Specific units
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
    [/home care|home health/, 'Home Health'],
    [/hospice|palliative/, 'Hospice'],
    [/women.*service|ob[\s-]?gyn/, 'Women\'s Services'],

    // General settings - check last
    [/ambulatory/, 'Ambulatory'],
    [/outpatient/, 'Outpatient'],
    [/inpatient/, 'Inpatient'],
  ];

  // Check title first (most reliable)
  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(title)) return specialty;
  }

  // Then check function field
  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(func)) return specialty;
  }

  // Then check department
  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(dept)) return specialty;
  }

  // Finally check description (less reliable, but catches some)
  for (const [pattern, specialty] of specialtyPatterns) {
    if (pattern.test(description)) return specialty;
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
async function scrapeUnitedHealthGroupJobs() {
  console.log('🚀 UnitedHealth Group RN Job Scraper\n');

  if (DRY_RUN) {
    console.log('⚠️  Running in DRY RUN mode: Jobs will NOT be saved to database\n');
  }

  if (MAX_PAGES) {
    console.log(`📌 Page limit set: ${MAX_PAGES} pages (${MAX_PAGES * CONFIG.pageSize} jobs max)\n`);
  }
  if (MAX_JOBS) {
    console.log(`📌 Job limit set: ${MAX_JOBS} jobs max\n`);
  }

  const allJobs = [];
  const seenReqIds = new Set();  // Track seen requisition IDs to deduplicate
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

      if (MAX_JOBS && allJobs.length >= MAX_JOBS) {
        console.log(`\n📌 Reached job limit (${MAX_JOBS}), stopping.`);
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

      // Filter for jobs that mention RN, then transform
      // Deduplicate by requisition ID (API returns each job twice with different URLs)
      let addedCount = 0;
      let skippedCount = 0;
      let dupCount = 0;

      for (const result of results) {
        if (MAX_JOBS && allJobs.length >= MAX_JOBS) break;

        // Check for duplicate by requisition ID
        const reqId = result.ref || result.clientid || result.id;
        if (seenReqIds.has(reqId)) {
          dupCount++;
          continue;
        }
        seenReqIds.add(reqId);

        if (mentionsRN(result)) {
          const transformed = transformJob(result);
          allJobs.push(transformed);
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(`   ✅ Added ${addedCount} jobs (skipped ${skippedCount} non-RN, ${dupCount} duplicates)`);

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
      if (!job.sourceJobId) errors.push('Missing sourceJobId');
      if (!job.sourceUrl) errors.push('Missing sourceUrl');
      if (!job.location) errors.push('Missing location');

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
      console.log(`   Location: ${job.location}`);
      console.log(`   Type: ${job.jobType}`);
      console.log(`   Specialty: ${job.specialty || 'N/A'}`);
      if (job.brand) console.log(`   Brand: ${job.brand}`);
      console.log(`   Work Arrangement: ${job.workArrangement || 'onsite'}`);
      if (job.salaryMin) {
        const salaryStr = job.salaryType === 'hourly'
          ? `$${job.salaryMin}-$${job.salaryMax}/hr`
          : `$${job.salaryMin.toLocaleString()}-$${job.salaryMax.toLocaleString()}/yr`;
        console.log(`   Salary: ${salaryStr}`);
      }
      console.log(`   URL: ${job.sourceUrl}`);
    }

    // Show specialty breakdown
    const specialtyCounts = {};
    const workArrangementCounts = {};
    validJobs.forEach(job => {
      const spec = job.specialty || 'Unclassified';
      specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
      const wa = job.workArrangement || 'onsite';
      workArrangementCounts[wa] = (workArrangementCounts[wa] || 0) + 1;
    });

    console.log('\n📊 Specialty breakdown:');
    Object.entries(specialtyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([spec, count]) => {
        console.log(`   ${spec}: ${count}`);
      });

    console.log('\n🏠 Work arrangement breakdown:');
    Object.entries(workArrangementCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([wa, count]) => {
        console.log(`   ${wa}: ${count}`);
      });

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
  scrapeUnitedHealthGroupJobs()
    .then(result => {
      console.log(`\n🎉 Done! Processed ${result.jobCount} jobs.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeUnitedHealthGroupJobs, CONFIG };
