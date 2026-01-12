#!/usr/bin/env node

/**
 * Yale New Haven Health System (YNHHS) RN Job Scraper
 *
 * YNHHS is a major health system in Connecticut with hospitals in:
 * - New Haven, CT (Yale-New Haven Hospital)
 * - Bridgeport, CT (Bridgeport Hospital)
 * - Greenwich, CT (Greenwich Hospital)
 * - New London, CT (Lawrence + Memorial Hospital)
 * - Westerly, RI (Westerly Hospital)
 *
 * Uses Jibe Platform REST API (iCIMS ATS)
 *
 * Usage:
 *   node scripts/ynhhs-rn-scraper.js --no-save          # Dry run, don't save to DB
 *   node scripts/ynhhs-rn-scraper.js --max-jobs=10      # Limit jobs for testing
 *   node scripts/ynhhs-rn-scraper.js                    # Full scrape and save
 */

const { PrismaClient } = require('@prisma/client');
const { generateJobSlug, normalizeJobType } = require('../lib/jobScraperUtils');

const prisma = new PrismaClient();

// YNHHS Jibe API configuration
const CONFIG = {
  employerName: 'Yale New Haven Health',
  employerSlug: 'yale-new-haven-health',
  apiBaseUrl: 'https://jobs.ynhhs.org/api/jobs',
  careerPageUrl: 'https://jobs.ynhhs.org',
  jobPageBaseUrl: 'https://jobs.ynhhs.org/jobs'
};

// All nursing categories to fetch
const NURSING_CATEGORIES = [
  'MGMT/LEADERSHIP - NURSING MGMT',
  'NURSING-STAFF',
  'NURSING-STAFF - ADULT CRITICAL CARE',
  'NURSING-STAFF - AMB/CLINICS/COMMUN',
  'NURSING-STAFF - CARDIAC',
  'NURSING-STAFF - CASE MGMT/UTIL REV',
  'NURSING-STAFF - EMERGENCY DEPARTMENT',
  'NURSING-STAFF - HOSPICE',
  'NURSING-STAFF - MED/SURG INPATIENT',
  'NURSING-STAFF - NEW GRAD',
  'NURSING-STAFF - OB/MATERNITY',
  'NURSING-STAFF - ONCOLOGY',
  'NURSING-STAFF - OR/PERIOPERATIVE',
  'NURSING-STAFF - OTHER',
  'NURSING-STAFF - PEDI CRITICAL CARE',
  'NURSING-STAFF - PEDIATRICS',
  'NURSING-STAFF - PSYCHIATRY'
];

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save');
const maxJobsArg = args.find(a => a.startsWith('--max-jobs='));
const MAX_JOBS = maxJobsArg ? parseInt(maxJobsArg.split('=')[1], 10) : null;

/**
 * Fetch jobs from YNHHS API
 */
async function fetchJobs(page = 1, limit = 50) {
  const categoriesParam = NURSING_CATEGORIES.join('|');
  const url = `${CONFIG.apiBaseUrl}?page=${page}&limit=${limit}&categories=${encodeURIComponent(categoriesParam)}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
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
    /\bnurse\b/,
    /clinical nurse/i,
    /staff nurse/i,
    /charge nurse/i,
    /nurse manager/i,
    /nurse educator/i,
    /nurse practitioner/i,
    /new grad.*rn/i,
    /rn.*new grad/i,
    /nursing/i
  ];

  // Exclude non-RN positions
  const excludePatterns = [
    /\blpn\b/i,
    /licensed practical/i,
    /\bcna\b/i,
    /nursing assistant/i,
    /\baide\b/i,
    /\btech\b/i,
    /\btechnician\b/i,
    /secretary/i,
    /clerk/i,
    /unit coordinator/i,
    /medical assistant/i,
    /\bma\b/i,
    /patient care tech/i,
    /pct\b/i
  ];

  const isRN = rnPatterns.some(pattern => pattern.test(titleLower));
  const isExcluded = excludePatterns.some(pattern => pattern.test(titleLower));

  return isRN && !isExcluded;
}

/**
 * Map YNHHS category to specialty
 */
function mapCategoryToSpecialty(categoryName) {
  if (!categoryName) return null;

  const mappings = {
    'NURSING-STAFF - MED/SURG INPATIENT': 'Med-Surg',
    'NURSING-STAFF - ADULT CRITICAL CARE': 'ICU',
    'NURSING-STAFF - EMERGENCY DEPARTMENT': 'Emergency',
    'NURSING-STAFF - OR/PERIOPERATIVE': 'OR/Perioperative',
    'NURSING-STAFF - CARDIAC': 'Cardiac',
    'NURSING-STAFF - ONCOLOGY': 'Oncology',
    'NURSING-STAFF - OB/MATERNITY': 'Labor & Delivery',
    'NURSING-STAFF - PEDIATRICS': 'Pediatrics',
    'NURSING-STAFF - PEDI CRITICAL CARE': 'PICU',
    'NURSING-STAFF - PSYCHIATRY': 'Psychiatric',
    'NURSING-STAFF - HOSPICE': 'Hospice',
    'NURSING-STAFF - CASE MGMT/UTIL REV': 'Case Management',
    'NURSING-STAFF - AMB/CLINICS/COMMUN': 'Ambulatory',
    'NURSING-STAFF - NEW GRAD': null, // Will be determined by title
    'NURSING-STAFF - OTHER': null,
    'NURSING-STAFF': null,
    'MGMT/LEADERSHIP - NURSING MGMT': 'Leadership'
  };

  return mappings[categoryName] || null;
}

/**
 * Extract specialty from job title (fallback)
 */
function extractSpecialtyFromTitle(title) {
  const titleLower = (title || '').toLowerCase();

  const patterns = [
    [/\bicu\b|intensive care|critical care/i, 'ICU'],
    [/\bnicu\b|neonatal intensive/i, 'NICU'],
    [/\bpicu\b|pediatric intensive/i, 'PICU'],
    [/emergency|\ber\b|emergency department/i, 'Emergency'],
    [/\bor\b|operating room|perioperative|surgical services/i, 'OR/Perioperative'],
    [/\bpacu\b|post.?anesthesia|recovery/i, 'PACU'],
    [/labor.*delivery|\bl&d\b|l\s*&\s*d|birthing|maternity/i, 'Labor & Delivery'],
    [/med[\s\-\/]?surg|medicine.*telemetry/i, 'Med-Surg'],
    [/oncology|cancer|heme/i, 'Oncology'],
    [/cardiac|cardiology|cath lab|ccu|heart/i, 'Cardiac'],
    [/pediatric|peds\b|children/i, 'Pediatrics'],
    [/psych|mental health|behavioral/i, 'Psychiatric'],
    [/neuro/i, 'Neurology'],
    [/surgery|surgical/i, 'Surgery'],
    [/telemetry|tele\b/i, 'Telemetry'],
    [/dialysis/i, 'Dialysis'],
    [/rehab/i, 'Rehabilitation'],
    [/home care|home health/i, 'Home Health'],
    [/hospice|palliative/i, 'Hospice'],
    [/float/i, 'Float Pool'],
    [/endoscopy|endo\b|gi\b/i, 'Endoscopy'],
    [/infusion/i, 'Infusion'],
    [/ambulatory|outpatient|clinic/i, 'Ambulatory'],
    [/case manage/i, 'Case Management'],
    [/educator|education/i, 'Education'],
    [/manager|supervisor|director/i, 'Leadership'],
    [/sedation/i, 'Sedation'],
    [/transplant/i, 'Transplant'],
    [/wound/i, 'Wound Care'],
    [/infection/i, 'Infection Control'],
    [/quality/i, 'Quality']
  ];

  for (const [pattern, specialty] of patterns) {
    if (pattern.test(titleLower)) {
      return specialty;
    }
  }

  return null;
}

/**
 * Map YNHHS shift (tags1) to standard format
 */
function mapShift(tags1) {
  const shift = (tags1?.[0] || '').toUpperCase();

  if (/NIGHT|PM-AM|12 HOUR PM/i.test(shift)) return 'Night';
  if (/DAY|AM-PM|12 HOUR AM/i.test(shift)) return 'Day';
  if (/EVENING/i.test(shift)) return 'Evening';
  if (/ROTATING|ALL THREE/i.test(shift)) return 'Rotating';
  if (/AS NEEDED/i.test(shift)) return null; // Per diem, no fixed shift

  return null;
}

/**
 * Map YNHHS job type (tags4) to standard format
 */
function mapJobType(tags4) {
  const jobType = (tags4?.[0] || '').toLowerCase();

  if (/full[\s\-]?time/i.test(jobType)) return normalizeJobType('full-time');
  if (/part[\s\-]?time/i.test(jobType)) return normalizeJobType('part-time');
  if (/per[\s\-]?diem/i.test(jobType)) return normalizeJobType('prn');

  return normalizeJobType('full-time'); // Default
}

/**
 * Normalize state name to 2-letter code
 */
function normalizeState(state) {
  if (!state) return null;

  const stateMap = {
    'connecticut': 'CT',
    'rhode island': 'RI',
    'new york': 'NY',
    'ct': 'CT',
    'ri': 'RI',
    'ny': 'NY'
  };

  const normalized = stateMap[state.toLowerCase()];
  if (normalized) return normalized;

  // Already a 2-letter code
  if (state.length === 2) return state.toUpperCase();

  return null;
}

/**
 * Normalize city name (handle inconsistent casing)
 */
function normalizeCity(city) {
  if (!city) return null;

  // Title case the city
  return city
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Clean HTML from description
 */
function cleanDescription(html) {
  if (!html) return '';

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
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
    .replace(/[ \t]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Format YNHHS job description for better readability
 * - Bold section headers
 * - Convert sub-items to bullet points
 * - Remove EEO and requisition ID sections
 * - Break long paragraphs
 */
function formatDescription(text) {
  if (!text) return '';

  let formatted = text;

  // Remove YNHHS Requisition ID section at the end
  formatted = formatted.replace(/\n\nYNHHS Requisition ID\n+\d+\s*$/i, '');

  // Remove EEO/AA line
  formatted = formatted.replace(/\n*EEO\/AA\/Disability\/Veteran\n*/gi, '\n\n');

  // Convert inline asterisk bullets to line breaks with bullets
  // Pattern: "text: * Item1 * Item2" -> "text:\n• Item1\n• Item2"
  formatted = formatted.replace(/:\s*\*\s+/g, ':\n• ');
  formatted = formatted.replace(/\s+\*\s+(?=[A-Z])/g, '\n• ');

  // Bold main section headers
  formatted = formatted.replace(/^(Overview)\n/gm, '**$1**\n');
  formatted = formatted.replace(/^(Responsibilities)\n/gm, '**$1**\n');
  formatted = formatted.replace(/^(Qualifications)\n/gm, '**$1**\n');

  // Bold and title-case sub-section headers under Qualifications
  const subHeaders = {
    'EDUCATION': 'Education',
    'EXPERIENCE': 'Experience',
    'LICENSURE': 'Licensure',
    'SPECIAL SKILLS': 'Special Skills',
    'PHYSICAL DEMAND': 'Physical Demand'
  };
  for (const [upper, title] of Object.entries(subHeaders)) {
    formatted = formatted.replace(new RegExp(`^${upper}\\n`, 'gm'), `**${title}**\n`);
  }

  // Convert numbered standards headers to bold title case
  formatted = formatted.replace(/^(\d+)\.\s*STANDARDS OF PRACTICE\s*/gm, '**Standards of Practice**\n');
  formatted = formatted.replace(/^(\d+)\.\s*STANDARDS OF PROFESSIONAL PERFORMANCE\s*/gm, '**Standards of Professional Performance**\n');

  // Convert inline "Term: Description" patterns to bullet points
  // These appear inline like: "...evaluation. Assessment: The RN..." or "...situation Diagnosis: The RN..."
  // Sort by length (longest first) to match "Professional Practice Evaluation" before "Evaluation"
  const termPatterns = [
    'Health Teaching and Health Promotion',
    'Evidence-Based Practice and Research',
    'Professional Practice Evaluation',
    'Culturally congruent practice',
    'Outcomes Identification',
    'Coordination of Care',
    'Resource Utilization',
    'Environmental Health',
    'Quality of Practice',
    'Implementation',
    'Collaboration',
    'Communication',
    'Assessment',
    'Leadership',
    'Evaluation',
    'Education',
    'Diagnosis',
    'Planning',
    'Ethics'
  ];

  for (const term of termPatterns) {
    // Match term preceded by period+space, newline, or start of text
    // Escape any special regex chars in term (for terms with parentheses etc)
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\.\\s+|\\n|^)(${escapedTerm}):\\s*`, 'gm');
    formatted = formatted.replace(regex, '$1\n• **$2:** ');
  }

  // Clean up multiple newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Ensure bullet points are on their own lines (no double newlines before them)
  formatted = formatted.replace(/\n\n(• )/g, '\n$1');

  return formatted.trim();
}

/**
 * Transform YNHHS job to our format
 */
function transformJob(job) {
  const data = job.data;

  const city = normalizeCity(data.city);
  const state = normalizeState(data.state);
  const categoryName = data.categories?.[0]?.name || '';

  // Try category first, then title for specialty
  let specialty = mapCategoryToSpecialty(categoryName);
  if (!specialty) {
    specialty = extractSpecialtyFromTitle(data.title);
  }

  // Build full description from parts
  let description = '';
  if (data.description) {
    description = formatDescription(cleanDescription(data.description));
  }

  // Source URL - use the canonical URL or build from slug
  const sourceUrl = data.meta_data?.canonical_url || `${CONFIG.jobPageBaseUrl}/${data.slug}?lang=en-us`;

  return {
    title: data.title,
    externalId: data.slug || data.req_id,
    sourceUrl,
    applyUrl: data.apply_url,
    city,
    state,
    zipCode: data.postal_code || null,
    jobType: mapJobType(data.tags4),
    shiftType: mapShift(data.tags1),
    specialty,
    description,
    postedDate: data.posted_date ? new Date(data.posted_date) : new Date(),
    department: data.tags2?.[0] || null,
    hours: data.tags3?.[0] || null,
    remoteStatus: data.tags6?.[0] || null,
    address: data.tags7?.[0] || null
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
  console.log('🏥 Yale New Haven Health System RN Job Scraper');
  console.log('==============================================\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No data will be saved\n');
  }

  if (MAX_JOBS) {
    console.log(`📏 Limited to ${MAX_JOBS} jobs\n`);
  }

  try {
    // Get employer
    const employer = DRY_RUN ? { id: 'dry-run' } : await getOrCreateEmployer();

    // Fetch first page to get total count
    console.log('📡 Fetching job listings from YNHHS API...\n');
    const firstPage = await fetchJobs(1, 50);

    const totalJobs = firstPage.totalCount || firstPage.count || 0;
    console.log(`📊 Total nursing jobs found: ${totalJobs}`);

    // Fetch all jobs
    let allJobs = firstPage.jobs || [];
    const totalPages = Math.ceil(totalJobs / 50);

    for (let page = 2; page <= totalPages; page++) {
      console.log(`   Fetching page ${page}/${totalPages}...`);
      const pageData = await fetchJobs(page, 50);
      if (pageData.jobs) {
        allJobs = allJobs.concat(pageData.jobs);
      }
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n📥 Fetched ${allJobs.length} total jobs`);

    // Filter for RN positions (most should already be RN from categories, but double-check)
    const rnJobs = allJobs.filter(job => isRNPosition(job.data?.title));
    console.log(`🩺 Found ${rnJobs.length} RN positions\n`);

    // Apply max jobs limit
    const jobsToProcess = MAX_JOBS ? rnJobs.slice(0, MAX_JOBS) : rnJobs;

    if (jobsToProcess.length === 0) {
      console.log('No RN jobs found. Exiting.');
      return;
    }

    // Show sample jobs in dry run
    if (DRY_RUN) {
      console.log('📋 Sample RN Jobs Found:\n');
      jobsToProcess.slice(0, 15).forEach((job, i) => {
        const transformed = transformJob(job);
        console.log(`${i + 1}. ${transformed.title}`);
        console.log(`   📍 ${transformed.city}, ${transformed.state} ${transformed.zipCode || ''}`);
        console.log(`   💼 ${transformed.jobType} | ⏰ ${transformed.shiftType || 'N/A'}`);
        console.log(`   🏷️  Specialty: ${transformed.specialty || 'General'}`);
        console.log(`   🔗 ${transformed.sourceUrl.substring(0, 60)}...`);
        console.log('');
      });

      // Show location breakdown
      const locationCounts = {};
      const stateCounts = {};
      const specialtyCounts = {};

      jobsToProcess.forEach(job => {
        const transformed = transformJob(job);
        const locKey = `${transformed.city}, ${transformed.state}`;
        locationCounts[locKey] = (locationCounts[locKey] || 0) + 1;
        stateCounts[transformed.state] = (stateCounts[transformed.state] || 0) + 1;
        const spec = transformed.specialty || 'General';
        specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
      });

      console.log('📍 Jobs by Location (top 10):');
      Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([loc, count]) => {
          console.log(`   ${loc}: ${count} jobs`);
        });

      console.log('\n🗺️  Jobs by State:');
      Object.entries(stateCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([state, count]) => {
          console.log(`   ${state}: ${count} jobs`);
        });

      console.log('\n🏷️  Jobs by Specialty (top 10):');
      Object.entries(specialtyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([spec, count]) => {
          console.log(`   ${spec}: ${count} jobs`);
        });

      console.log('\n✅ Dry run complete. Use without --no-save to save to database.');
      return;
    }

    // Save jobs to database
    console.log('💾 Saving jobs to database...\n');

    let savedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const job of jobsToProcess) {
      try {
        const transformed = transformJob(job);

        // Skip jobs without valid location
        if (!transformed.city || !transformed.state) {
          console.log(`   ⏭️  Skipping (no location): ${transformed.title}`);
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
          location: `${transformed.city}, ${transformed.state}`,
          city: transformed.city,
          state: transformed.state,
          zipCode: transformed.zipCode,
          jobType: transformed.jobType,
          shiftType: transformed.shiftType,
          specialty: transformed.specialty,
          description: transformed.description || 'See job posting for details.',
          postedDate: transformed.postedDate,
          scrapedAt: new Date(),
          isActive: false,  // Classifier will activate after validation
          employerId: employer.id
        };

        // Check for existing job
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
          console.log(`   ✅ New: ${transformed.title} (${transformed.city}, ${transformed.state})`);
        }
      } catch (error) {
        console.error(`   ❌ Error saving job: ${error.message}`);
        skippedCount++;
      }
    }

    console.log('\n📊 Results:');
    console.log(`   ✅ New jobs saved: ${savedCount}`);
    console.log(`   🔄 Jobs updated: ${updatedCount}`);
    console.log(`   ⏭️  Jobs skipped: ${skippedCount}`);
    console.log(`\n💡 Run the classifier to activate new jobs:`);
    console.log(`   node scripts/classify-jobs-with-llm.js --employer=${CONFIG.employerSlug}`);

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
