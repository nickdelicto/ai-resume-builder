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
  'ER',
  'Float Pool',
  'General Nursing',
  'Geriatrics',
  'Home Care',
  'Home Health',
  'Hospice',
  'ICU',
  'Labor & Delivery',
  'Maternity',
  'Med-Surg',
  'Mental Health',
  'NICU',
  'Oncology',
  'OR',
  'PACU',
  'Pediatrics',
  'Progressive Care',
  'Radiology',
  'Rehabilitation',
  'Stepdown',
  'Telemetry'
];

// Create a Set for fast O(1) lookup (used in routing)
const SPECIALTY_SET = new Set(
  SPECIALTIES.map(s => s.toLowerCase().replace(/\s+/g, '-'))
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
    .replace(/\s+/g, '-');      // "Home Health" → "home-health"
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
  
  const normalized = slug.toLowerCase().replace(/\s+/g, '-');
  
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
  const normalized = param.toLowerCase().replace(/\s+/g, '-');
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

module.exports = {
  SPECIALTIES,
  SPECIALTY_SET,
  specialtyToSlug,
  slugToSpecialty,
  isValidSpecialtySlug,
  getAllSpecialtySlugs,
  getAllSpecialtiesWithSlugs
};

