/**
 * Nursing Specialties Constants
 * 
 * This file contains the master list of nursing specialties used throughout the application.
 * Used for:
 * - LLM classification
 * - URL routing and detection
 * - Page generation
 * - SEO optimization
 */

// Master list of nursing specialties (matches LLM classifier)
const SPECIALTIES = [
  'Ambulatory',
  'Cardiac',
  'Case Management',
  'Cath Lab',
  'Clinical Documentation',
  'Correctional',
  'Dialysis',
  'Endoscopy',
  'ER',
  'Float Pool',
  'General Nursing',
  'Geriatrics',
  'Home Health',
  'Hospice',
  'ICU',
  'Infusion',
  'Labor & Delivery',
  'Maternity',
  'Med-Surg',
  'Mental Health',
  'Neurology',
  'NICU',
  'Nurse Educator',
  'Oncology',
  'OR',
  'PACU',
  'Pediatrics',
  'Quality Assurance',
  'Radiology',
  'Rehabilitation',
  'School',
  'Stepdown',
  'Telehealth',
  'Telemetry',
  'Transplant',
  'Utilization Review',
  'Wound Care'
];

// Create a Set for fast O(1) lookup (used in routing)
// Must use specialtyToSlug to ensure consistent slug format (handles & → -)
const SPECIALTY_SET = new Set(
  SPECIALTIES.map(s => s.toLowerCase().replace(/\s*&\s*/g, '-').replace(/\s+/g, '-'))
);

/**
 * Convert specialty display name to URL slug
 * Examples:
 *   "ICU" → "icu"
 *   "Labor & Delivery" → "labor-delivery"
 *   "Med-Surg" → "med-surg"
 */
function specialtyToSlug(specialty) {
  if (!specialty) return null;
  return specialty
    .toLowerCase()
    .replace(/\s*&\s*/g, '-')  // "Labor & Delivery" → "labor-delivery"
    .replace(/\//g, '-')       // "Med/Surg" → "med-surg" (defensive)
    .replace(/\s+/g, '-');     // "Home Health" → "home-health"
}

/**
 * Convert URL slug back to display name
 * Examples:
 *   "icu" → "ICU"
 *   "labor-delivery" → "Labor & Delivery"
 *   "med-surg" → "Med-Surg"
 */
function slugToSpecialty(slug) {
  if (!slug) return null;

  const normalized = slug.toLowerCase()
    .replace(/\//g, '-')  // Handle "med/surg" → "med-surg"
    .replace(/\s+/g, '-');

  // Find matching specialty (case-insensitive)
  const match = SPECIALTIES.find(s => {
    const specialtySlug = specialtyToSlug(s);
    return specialtySlug === normalized;
  });

  return match || null;
}

/**
 * Check if a given string is a valid specialty slug
 * Used in routing to distinguish between city names and specialties
 * 
 * @param {string} param - The URL parameter to check
 * @returns {boolean} - True if param is a specialty, false otherwise
 * 
 * Examples:
 *   isValidSpecialtySlug('icu') → true
 *   isValidSpecialtySlug('cleveland') → false
 *   isValidSpecialtySlug('labor-delivery') → true
 */
function isValidSpecialtySlug(param) {
  if (!param) return false;
  const normalized = param.toLowerCase()
    .replace(/\//g, '-')  // Handle "med/surg" → "med-surg"
    .replace(/\s+/g, '-');
  return SPECIALTY_SET.has(normalized);
}

/**
 * Get all specialty slugs for URL generation
 * Returns array of slugs: ['icu', 'er', 'med-surg', ...]
 */
function getAllSpecialtySlugs() {
  return SPECIALTIES.map(specialtyToSlug);
}

/**
 * Get all specialties with their slugs
 * Returns array of objects: [{ name: 'ICU', slug: 'icu' }, ...]
 */
function getAllSpecialtiesWithSlugs() {
  return SPECIALTIES.map(specialty => ({
    name: specialty,
    slug: specialtyToSlug(specialty)
  }));
}

/**
 * Normalize specialty to canonical format
 * Handles variations from LLM output (abbreviations, spacing, etc.)
 *
 * @param {string} specialty - Raw specialty from LLM or database
 * @returns {string|null} - Normalized specialty matching SPECIALTIES list, or original if no match
 *
 * Examples:
 *   "Step Down" → "Stepdown"
 *   "L&D" → "Labor & Delivery"
 *   "Psychiatric" → "Mental Health"
 *   "ED" → "ER"
 *   "Neuro" → "Neurology"
 */
function normalizeSpecialty(specialty) {
  if (!specialty || typeof specialty !== 'string') return null;

  // Clean input: trim and normalize spacing
  const cleaned = specialty.trim();

  // First, check if it's already a valid specialty (exact match)
  if (SPECIALTIES.includes(cleaned)) {
    return cleaned;
  }

  // Map common variations/abbreviations to canonical names
  const aliases = {
    // L&D variations
    'l&d': 'Labor & Delivery',
    'l & d': 'Labor & Delivery',
    'l and d': 'Labor & Delivery',
    'labor and delivery': 'Labor & Delivery',
    'labor delivery': 'Labor & Delivery',
    'ob/gyn': 'Labor & Delivery',
    'obgyn': 'Labor & Delivery',
    'obstetrics': 'Labor & Delivery',
    'reproductive': 'Labor & Delivery',
    "women's services": 'Labor & Delivery',

    // Mental Health / Psychiatric
    'psychiatric': 'Mental Health',
    'psych': 'Mental Health',
    'psychiatry': 'Mental Health',
    'behavioral health': 'Mental Health',

    // Rehabilitation variations
    'rehab': 'Rehabilitation',

    // ER variations
    'ed': 'ER',
    'emergency': 'ER',
    'emergency department': 'ER',
    'emergency room': 'ER',
    'triage': 'ER',

    // Neurology variations
    'neuro': 'Neurology',
    'neuroscience': 'Neurology',
    'neuro science': 'Neurology',
    'neurosurgery': 'Neurology',

    // Cardiac variations
    'cardiac care': 'Cardiac',
    'cardiovascular': 'Cardiac',
    'cardiology': 'Cardiac',
    'cardiac surgery': 'Cardiac',
    'cv': 'Cardiac',

    // ICU variations
    'critical care': 'ICU',
    'intensive care': 'ICU',
    'ccu': 'ICU',
    'micu': 'ICU',
    'sicu': 'ICU',
    'picu': 'ICU',
    'cardiac icu': 'ICU',

    // OR variations
    'operating room': 'OR',
    'surgery': 'OR',
    'surgical': 'OR',
    'perioperative': 'OR',
    'or/perioperative': 'OR',

    // Med-Surg variations
    'med surg': 'Med-Surg',
    'medsurg': 'Med-Surg',
    'med/surg': 'Med-Surg',
    'medical surgical': 'Med-Surg',
    'medical-surgical': 'Med-Surg',

    // PACU variations
    'post anesthesia': 'PACU',
    'post-anesthesia': 'PACU',
    'recovery room': 'PACU',

    // Ambulatory variations
    'outpatient': 'Ambulatory',
    'clinic': 'Ambulatory',

    // Radiology variations
    'interventional radiology': 'Radiology',
    'ir': 'Radiology',

    // Geriatrics variations
    'geriatric': 'Geriatrics',
    'elderly care': 'Geriatrics',
    'long term care': 'Geriatrics',
    'long-term care': 'Geriatrics',
    'ltc': 'Geriatrics',
    'skilled nursing': 'Geriatrics',
    'snf': 'Geriatrics',

    // Pediatrics variations
    'pediatric': 'Pediatrics',
    'peds': 'Pediatrics',

    // Oncology variations
    'cancer': 'Oncology',
    'cancer care': 'Oncology',

    // Telemetry variations
    'tele': 'Telemetry',

    // Progressive Care / Stepdown variations (consolidated to Stepdown)
    'pcu': 'Stepdown',
    'progressive': 'Stepdown',
    'progressive care': 'Stepdown',
    'step down': 'Stepdown',
    'step-down': 'Stepdown',

    // Travel is NOT a specialty - map to General Nursing
    'travel': 'General Nursing',
    'travel nurse': 'General Nursing',
    'travel nursing': 'General Nursing',

    // Cath Lab variations
    'cath': 'Cath Lab',
    'cardiac cath': 'Cath Lab',
    'catheterization': 'Cath Lab',

    // Case Management variations
    'case manager': 'Case Management',
    'care management': 'Case Management',
    'care coordination': 'Case Management',

    // Home Health variations (Home Care is non-RN, consolidate to Home Health)
    'home healthcare': 'Home Health',
    'homecare': 'Home Health',
    'home care': 'Home Health',
    'home nursing': 'Home Health',
    'visiting nurse': 'Home Health',

    // School variations
    'school nurse': 'School',
    'school nursing': 'School',

    // Correctional variations
    'corrections': 'Correctional',
    'prison': 'Correctional',
    'jail': 'Correctional',

    // Float Pool variations
    'float': 'Float Pool',
    'floating': 'Float Pool',
    'resource pool': 'Float Pool',

    // Wound Care variations
    'wound': 'Wound Care',
    'wound management': 'Wound Care',
    'ostomy': 'Wound Care',

    // Utilization Review variations (non-bedside, insurance)
    'utilization management': 'Utilization Review',
    'ur nurse': 'Utilization Review',
    'um nurse': 'Utilization Review',
    'prior authorization': 'Utilization Review',
    'prior auth': 'Utilization Review',
    'appeals nurse': 'Utilization Review',
    'medical review': 'Utilization Review',
    'concurrent review': 'Utilization Review',

    // Telehealth variations (non-bedside, remote)
    'telemedicine': 'Telehealth',
    'tele-health': 'Telehealth',
    'virtual care': 'Telehealth',
    'remote triage': 'Telehealth',
    'telephone triage': 'Telehealth',
    'nurse line': 'Telehealth',
    'advice nurse': 'Telehealth',

    // Clinical Documentation variations (non-bedside)
    'cdi': 'Clinical Documentation',
    'cdi specialist': 'Clinical Documentation',
    'clinical documentation improvement': 'Clinical Documentation',
    'documentation specialist': 'Clinical Documentation',
    'coding nurse': 'Clinical Documentation',

    // Quality Assurance variations (non-bedside)
    'qa nurse': 'Quality Assurance',
    'quality improvement': 'Quality Assurance',
    'qi nurse': 'Quality Assurance',
    'quality coordinator': 'Quality Assurance',
    'quality management': 'Quality Assurance',
    'patient safety': 'Quality Assurance',
    'risk management': 'Quality Assurance',

    // Nurse Educator variations (non-bedside)
    'education': 'Nurse Educator',
    'clinical educator': 'Nurse Educator',
    'staff development': 'Nurse Educator',
    'nurse instructor': 'Nurse Educator',
    'nursing instructor': 'Nurse Educator',
    'education coordinator': 'Nurse Educator',
    'clinical instructor': 'Nurse Educator',

    // Orthopedics → Med-Surg (no dedicated orthopedics specialty)
    'orthopedics': 'Med-Surg',
    'orthopedic': 'Med-Surg',
    'ortho': 'Med-Surg',

    // Non-specialty catch-alls → General Nursing
    'inpatient': 'General Nursing',
    'leadership': 'General Nursing',
    'other': 'General Nursing',
    'crna': 'OR'
  };

  // Check for alias match (case-insensitive)
  const lowerCleaned = cleaned.toLowerCase();
  if (aliases[lowerCleaned]) {
    return aliases[lowerCleaned];
  }

  // Try to find a case-insensitive match in SPECIALTIES
  const caseInsensitiveMatch = SPECIALTIES.find(
    s => s.toLowerCase() === lowerCleaned
  );
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  // No match found - return original (will be caught by validation if needed)
  return cleaned;
}

/**
 * Consolidate raw specialty groupBy results into canonical slugs.
 * Merges DB variants into canonical entries (e.g., "Cardiac Care" + "Cardiac" → one "cardiac" entry).
 * Filters out unrecognized specialties that don't map to canonical names.
 *
 * @param {Array} rawResults - Prisma groupBy results: [{ specialty, _count: { id } }]
 * @param {string|null} excludeSpecialty - Canonical specialty name to exclude (e.g., current page's specialty)
 * @returns {Array} - [{ specialty: canonicalName, slug, count }] sorted by count desc
 */
function consolidateSpecialties(rawResults, excludeSpecialty = null) {
  const excludeCanonical = excludeSpecialty ? normalizeSpecialty(excludeSpecialty) : null;
  const specMap = {};
  rawResults.forEach(s => {
    if (!s.specialty) return;
    const canonical = normalizeSpecialty(s.specialty);
    if (!canonical || !SPECIALTIES.includes(canonical)) return;
    if (excludeCanonical && canonical.toLowerCase() === excludeCanonical.toLowerCase()) return;
    const slug = specialtyToSlug(canonical);
    if (!slug) return;
    if (!specMap[slug]) specMap[slug] = { specialty: canonical, slug, count: 0 };
    specMap[slug].count += s._count.id;
  });
  return Object.values(specMap).sort((a, b) => b.count - a.count);
}

module.exports = {
  SPECIALTIES,
  SPECIALTY_SET,
  specialtyToSlug,
  slugToSpecialty,
  isValidSpecialtySlug,
  getAllSpecialtySlugs,
  getAllSpecialtiesWithSlugs,
  normalizeSpecialty,
  consolidateSpecialties
};

