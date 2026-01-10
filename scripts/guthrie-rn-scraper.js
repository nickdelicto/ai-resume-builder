#!/usr/bin/env node

/**
 * Guthrie Health System RN Job Scraper
 *
 * Guthrie is a regional health system in NY/PA with hospitals in:
 * - Binghamton, NY
 * - Cortland, NY
 * - Sayre, PA
 * - And other locations
 *
 * Uses Oracle Recruiting Cloud (ORC) API
 *
 * Usage:
 *   node scripts/guthrie-rn-scraper.js --no-save          # Dry run, don't save to DB
 *   node scripts/guthrie-rn-scraper.js --max-pages=2      # Limit pages for testing
 *   node scripts/guthrie-rn-scraper.js                    # Full scrape and save
 */

const { PrismaClient } = require('@prisma/client');
const { generateJobSlug } = require('../lib/jobScraperUtils');

const prisma = new PrismaClient();

// Guthrie Oracle Recruiting Cloud configuration
const CONFIG = {
  employerName: 'Guthrie',
  employerSlug: 'guthrie',
  siteNumber: 'CX_1001',
  categoryFacet: '300000011605631', // Healthcare/Nursing category
  baseUrl: 'https://elfw.fa.us2.oraclecloud.com',
  careerPageUrl: 'https://careers.guthrie.org/'
};

// Build API URL
const JOBS_API = `${CONFIG.baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`;

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : null;

/**
 * Fetch job listings from Oracle API
 */
async function fetchJobListings(offset = 0, limit = 25) {
  const finder = `findReqs;siteNumber=${CONFIG.siteNumber},facetsList=CATEGORIES|LOCATIONS|WORKPLACE_TYPES|TITLES|POSTING_DATES|FLEX_FIELDS,limit=${limit},offset=${offset},lastSelectedFacet=CATEGORIES,selectedCategoriesFacet=${CONFIG.categoryFacet},sortBy=POSTING_DATES_DESC`;

  const url = `${JOBS_API}?onlyData=true&expand=requisitionList.secondaryLocations,requisitionList.requisitionFlexFields&finder=${encodeURIComponent(finder)}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Oracle API nests jobs in items[0].requisitionList
  if (data.items && data.items[0]) {
    return {
      requisitionList: data.items[0].requisitionList || [],
      totalResults: data.items[0].TotalJobsCount || 0
    };
  }

  return { requisitionList: [], totalResults: 0 };
}

/**
 * Fetch detailed job information from Oracle API
 * Uses recruitingCEJobRequisitionDetails endpoint for full description
 */
async function fetchJobDetail(requisitionId) {
  const detailUrl = `${CONFIG.baseUrl}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id="${requisitionId}",siteNumber=${CONFIG.siteNumber}`;

  try {
    const response = await fetch(detailUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.items && data.items[0]) {
      const job = data.items[0];
      const htmlDescription = job.ExternalDescriptionStr || '';

      // Strip HTML tags and clean up whitespace
      const plainText = htmlDescription
        .replace(/<br\s*\/?>/gi, '\n')           // Convert <br> to newlines
        .replace(/<\/p>/gi, '\n\n')              // Convert </p> to double newlines
        .replace(/<\/li>/gi, '\n')               // Convert </li> to newlines
        .replace(/<[^>]*>/g, '')                 // Remove remaining HTML tags
        .replace(/&nbsp;/g, ' ')                 // Decode common entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&bull;/g, '•')
        .replace(/\n{3,}/g, '\n\n')              // Collapse multiple newlines
        .replace(/[ \t]+/g, ' ')                 // Collapse multiple spaces
        .trim();

      return {
        requisitionDescriptions: [{
          descriptionType: 'Job Description',
          descriptionText: plainText
        }]
      };
    }

    return null;
  } catch (error) {
    console.error(`   Error fetching detail for ${requisitionId}:`, error.message);
    return null;
  }
}

/**
 * Check if job title indicates an RN position
 */
function isRNPosition(title) {
  const titleLower = (title || '').toLowerCase();

  // Include RN positions
  const rnPatterns = [
    /\brn\b/,
    /registered nurse/i,
    /\bnurse\b.*\brn\b/,
    /clinical nurse/i,
    /staff nurse/i,
    /charge nurse/i,
    /nurse manager/i,
    /nurse educator/i,
    /nurse practitioner/i,  // NPs often listed with nursing
  ];

  // Exclude non-RN positions
  const excludePatterns = [
    /\blpn\b/i,
    /licensed practical/i,
    /\bcna\b/i,
    /nursing assistant/i,
    /aide/i,
    /tech\b/i,
    /secretary/i,
    /clerk/i,
    /unit coordinator/i,
  ];

  const isRN = rnPatterns.some(pattern => pattern.test(titleLower));
  const isExcluded = excludePatterns.some(pattern => pattern.test(titleLower));

  return isRN && !isExcluded;
}

/**
 * Extract specialty from job title
 */
function extractSpecialty(title) {
  const titleLower = (title || '').toLowerCase();

  const patterns = [
    [/\bicu\b|intensive care/i, 'ICU'],
    [/\bnicu\b|neonatal intensive/i, 'NICU'],
    [/\bpicu\b|pediatric intensive/i, 'PICU'],
    [/emergency|,\s*er\b|\ber\s|^er\b/i, 'Emergency'],
    [/\bor\b|operating room|perioperative/i, 'Operating Room'],
    [/\bpacu\b|post.?anesthesia/i, 'PACU'],
    [/labor.*delivery|\bl&d\b|l\s*&\s*d/i, 'Labor & Delivery'],
    [/med[\s\-\/]?surg/i, 'Med/Surg'],
    [/oncology|cancer/i, 'Oncology'],
    [/cardiac|cardiology|cath lab|ccu/i, 'Cardiology'],
    [/pediatric|peds\b/i, 'Pediatrics'],
    [/psych|mental health|behavioral/i, 'Psychiatric'],
    [/neuro/i, 'Neurology'],
    [/surgery|surgical/i, 'Surgery'],
    [/telemetry|tele\b/i, 'Telemetry'],
    [/dialysis/i, 'Dialysis'],
    [/rehab/i, 'Rehabilitation'],
    [/home care|home health/i, 'Home Care'],
    [/hospice|palliative/i, 'Hospice'],
    [/ob\/?gyn|women.*health|maternal/i, 'OB/GYN'],
    [/float pool/i, 'Float Pool'],
    [/prep.*recovery|recovery/i, 'PACU'],
    [/endoscopy|endo\b/i, 'Endoscopy'],
    [/infusion/i, 'Infusion'],
    [/ambulatory|outpatient/i, 'Ambulatory'],
    [/case manage/i, 'Case Management'],
    [/educator/i, 'Education'],
  ];

  for (const [pattern, specialty] of patterns) {
    if (pattern.test(titleLower)) {
      return specialty;
    }
  }

  return null;
}

/**
 * Extract shift from title or schedule info
 */
function extractShift(title, scheduleInfo) {
  const text = `${title || ''} ${scheduleInfo || ''}`.toLowerCase();

  if (/night|noc\b|11p|7p.*7a|overnight/i.test(text)) return 'Night';
  if (/day\b|7a.*7p|day shift/i.test(text)) return 'Day';
  if (/evening|eve\b|3p|second shift/i.test(text)) return 'Evening';
  if (/rotating|variable/i.test(text)) return 'Rotating';

  return null;
}

/**
 * Extract job type from schedule info
 */
function extractJobType(scheduleInfo) {
  const text = (scheduleInfo || '').toLowerCase();

  if (/full[\s\-]?time/i.test(text)) return 'Full-Time';
  if (/part[\s\-]?time/i.test(text)) return 'Part-Time';
  if (/per[\s\-]?diem|prn/i.test(text)) return 'Per-Diem';
  if (/weekend/i.test(text)) return 'Part-Time';

  return 'Full-Time'; // Default
}

/**
 * Parse location from Oracle format
 */
function parseLocation(locationStr) {
  if (!locationStr) return { city: null, state: null };

  // Oracle format is typically "City, State, Country" or just "City"
  const parts = locationStr.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    const city = parts[0];
    // State might have country after it
    let state = parts[1];

    // Map full state names to codes
    const stateMap = {
      'New York': 'NY',
      'Pennsylvania': 'PA',
      'NY': 'NY',
      'PA': 'PA'
    };

    state = stateMap[state] || state;

    // Only return 2-letter state codes
    if (state && state.length === 2) {
      return { city, state };
    }

    return { city, state: null };
  }

  return { city: parts[0] || null, state: null };
}

/**
 * Extract description text from Oracle HTML
 */
function extractDescription(descriptions) {
  if (!descriptions || !Array.isArray(descriptions)) return '';

  // Find the main description (usually type 'Job Description')
  const mainDesc = descriptions.find(d =>
    d.descriptionType === 'Job Description' ||
    d.sectionName === 'Description'
  );

  return mainDesc?.descriptionText || descriptions[0]?.descriptionText || '';
}

/**
 * Parse salary from job description
 * Guthrie formats: "The pay range for this position is $40.25-62.59"
 *                  "The pay range for this position is $39.00 - $54.12 per hour"
 *                  "The pay range for this position is $39.00 to $54.12 per hour"
 */
function parseSalary(description) {
  if (!description) return null;

  // Match "pay range" pattern: $XX.XX-$XX.XX or $XX.XX - $XX.XX or $XX.XX to $XX.XX per hour
  const hourlyMatch = description.match(/pay\s+range[^$]*\$([\d,.]+)\s*(?:-|to)\s*\$?([\d,.]+)(?:\s*per\s*hour)?/i);
  if (hourlyMatch) {
    const min = parseFloat(hourlyMatch[1].replace(/,/g, ''));
    const max = parseFloat(hourlyMatch[2].replace(/,/g, ''));
    if (!isNaN(min) && !isNaN(max) && min < 200 && max < 200) {
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

  // Fallback: Match any $XX.XX - $XX.XX or $XX.XX to $XX.XX pattern (hourly if under $200)
  const genericMatch = description.match(/\$([\d,.]+)\s*(?:-|to)\s*\$?([\d,.]+)\s*(?:per\s*hour|\/\s*hour|hourly)?/i);
  if (genericMatch) {
    const min = parseFloat(genericMatch[1].replace(/,/g, ''));
    const max = parseFloat(genericMatch[2].replace(/,/g, ''));
    if (!isNaN(min) && !isNaN(max) && min < 200 && max < 200) {
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

  return null;
}

/**
 * Transform Oracle job data to our format
 */
function transformJob(job, detail = null) {
  const location = parseLocation(job.PrimaryLocation || job.primaryLocation);
  const description = detail ? extractDescription(detail.requisitionDescriptions) : '';
  const salary = parseSalary(description);

  return {
    title: job.Title || job.title,
    externalId: String(job.Id || job.id),
    requisitionId: job.RequisitionNumber || job.requisitionNumber,
    sourceUrl: `${CONFIG.careerPageUrl}#en/sites/${CONFIG.siteNumber}/job/${job.Id || job.id}`,
    location: job.PrimaryLocation || job.primaryLocation,
    city: location.city,
    state: location.state,
    jobType: extractJobType(job.WorkplaceTypeCode || job.workplaceTypeCode),
    shiftType: extractShift(job.Title || job.title, ''),
    specialty: extractSpecialty(job.Title || job.title),
    description: description,
    postedDate: job.PostedDate ? new Date(job.PostedDate) : new Date(),
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
 * Get or create employer
 */
async function getOrCreateEmployer() {
  let employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: CONFIG.employerSlug }
  });

  if (!employer) {
    employer = await prisma.healthcareEmployer.create({
      data: {
        name: CONFIG.employerName,
        slug: CONFIG.employerSlug,
        careerPageUrl: CONFIG.careerPageUrl,
        isActive: true
      }
    });
    console.log(`✅ Created employer: ${CONFIG.employerName}`);
  }

  return employer;
}

/**
 * Main scraper function
 */
async function main() {
  console.log('🏥 Guthrie Health RN Job Scraper');
  console.log('================================\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No data will be saved\n');
  }

  try {
    // Get employer
    const employer = DRY_RUN ? { id: 'dry-run' } : await getOrCreateEmployer();

    // Fetch first page to get total count
    console.log('📡 Fetching job listings from Oracle API...\n');
    const firstPage = await fetchJobListings(0, 25);

    const totalJobs = firstPage.totalResults || firstPage.count || 0;
    const requisitions = firstPage.requisitionList || firstPage.items || [];

    console.log(`📊 Total healthcare jobs found: ${totalJobs}`);

    // Filter for RN positions
    let allJobs = [...requisitions];
    const totalPages = Math.ceil(totalJobs / 25);
    const pagesToFetch = MAX_PAGES ? Math.min(MAX_PAGES, totalPages) : totalPages;

    // Fetch remaining pages
    for (let page = 1; page < pagesToFetch; page++) {
      console.log(`   Fetching page ${page + 1}/${pagesToFetch}...`);
      const pageData = await fetchJobListings(page * 25, 25);
      const pageJobs = pageData.requisitionList || pageData.items || [];
      allJobs = allJobs.concat(pageJobs);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📥 Fetched ${allJobs.length} total jobs`);

    // Filter for RN positions
    const rnJobs = allJobs.filter(job => isRNPosition(job.Title || job.title));
    console.log(`🩺 Found ${rnJobs.length} RN positions\n`);

    if (rnJobs.length === 0) {
      console.log('No RN jobs found. Exiting.');
      return;
    }

    // Show sample jobs in dry run
    if (DRY_RUN) {
      console.log('📋 Sample RN Jobs Found:\n');
      rnJobs.slice(0, 10).forEach((job, i) => {
        const location = parseLocation(job.PrimaryLocation || job.primaryLocation);
        console.log(`${i + 1}. ${job.Title || job.title}`);
        console.log(`   Location: ${location.city}, ${location.state}`);
        console.log(`   ID: ${job.Id || job.id}`);
        console.log(`   Specialty: ${extractSpecialty(job.Title || job.title) || 'General'}`);
        console.log('');
      });

      // Show location breakdown
      const locationCounts = {};
      rnJobs.forEach(job => {
        const loc = parseLocation(job.PrimaryLocation || job.primaryLocation);
        const key = `${loc.city}, ${loc.state}`;
        locationCounts[key] = (locationCounts[key] || 0) + 1;
      });

      console.log('📍 Jobs by Location:');
      Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([loc, count]) => {
          console.log(`   ${loc}: ${count} jobs`);
        });

      console.log('\n✅ Dry run complete. Use without --no-save to save to database.');
      return;
    }

    // Save jobs to database
    console.log('💾 Fetching job details and saving to database...\n');

    let savedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const job of rnJobs) {
      try {
        // Fetch full job details to get description
        const jobId = job.Id || job.id;
        const detail = await fetchJobDetail(jobId);

        // Rate limiting between detail fetches
        await new Promise(resolve => setTimeout(resolve, 300));

        const transformed = transformJob(job, detail);

        // Skip jobs without location
        if (!transformed.city || !transformed.state) {
          skippedCount++;
          continue;
        }

        const slug = generateJobSlug(
          transformed.title,
          transformed.city,
          transformed.state,
          transformed.externalId
        );

        const jobData = {
          title: transformed.title,
          slug,
          sourceJobId: transformed.externalId,
          sourceUrl: transformed.sourceUrl,
          location: transformed.location || `${transformed.city}, ${transformed.state}`,
          city: transformed.city,
          state: transformed.state,
          jobType: transformed.jobType,
          shiftType: transformed.shiftType,
          specialty: transformed.specialty,
          description: transformed.description || 'See job posting for details.',
          postedDate: transformed.postedDate,
          scrapedAt: new Date(),
          isActive: false,  // Classifier will activate after validation
          employerId: employer.id,
          // Salary fields
          ...(transformed.salaryMin && {
            salaryMin: transformed.salaryMin,
            salaryMax: transformed.salaryMax,
            salaryType: transformed.salaryType,
            salaryMinHourly: transformed.salaryMinHourly,
            salaryMaxHourly: transformed.salaryMaxHourly,
            salaryMinAnnual: transformed.salaryMinAnnual,
            salaryMaxAnnual: transformed.salaryMaxAnnual
          })
        };

        // Upsert job
        const existing = await prisma.nursingJob.findFirst({
          where: {
            employerId: employer.id,
            sourceJobId: transformed.externalId
          }
        });

        if (existing) {
          // Preserve isActive state - don't reset classified jobs
          const { isActive, ...updateData } = jobData;
          await prisma.nursingJob.update({
            where: { id: existing.id },
            data: updateData
          });
          updatedCount++;
        } else {
          await prisma.nursingJob.create({
            data: jobData
          });
          savedCount++;
        }
      } catch (error) {
        console.error(`   Error saving job: ${error.message}`);
        skippedCount++;
      }
    }

    console.log('\n📊 Results:');
    console.log(`   ✅ New jobs saved: ${savedCount}`);
    console.log(`   🔄 Jobs updated: ${updatedCount}`);
    console.log(`   ⏭️  Jobs skipped: ${skippedCount}`);

  } catch (error) {
    console.error('❌ Scraper error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the scraper
main()
  .then(() => {
    console.log('\n✅ Scraper completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scraper failed:', error);
    process.exit(1);
  });
