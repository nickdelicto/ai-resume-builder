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
  'Oncology',
  'OR',
  'PACU',
  'Pediatrics',
  'Radiology',
  'Rehabilitation',
  'School',
  'Stepdown',
  'Telemetry',
  'Transplant',
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

    // Neurology variations
    'neuro': 'Neurology',
    'neuroscience': 'Neurology',
    'neuro science': 'Neurology',

    // Cardiac variations
    'cardiac care': 'Cardiac',
    'cardiovascular': 'Cardiac',
    'cv': 'Cardiac',

    // ICU variations
    'critical care': 'ICU',
    'intensive care': 'ICU',
    'ccu': 'ICU',

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

    // Geriatrics variations
    'geriatric': 'Geriatrics',
    'elderly care': 'Geriatrics',

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
    'ostomy': 'Wound Care'
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

module.exports = {
  SPECIALTIES,
  SPECIALTY_SET,
  specialtyToSlug,
  slugToSpecialty,
  isValidSpecialtySlug,
  getAllSpecialtySlugs,
  getAllSpecialtiesWithSlugs,
  normalizeSpecialty
};

