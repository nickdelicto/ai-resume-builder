/**
 * Experience Level Constants and Utilities
 *
 * Centralized list of valid nursing experience levels and utility functions
 * for slug generation, display names, and validation.
 *
 * Taxonomy (as of Jan 2026):
 * - New Grad: 0-12 months experience, nurse residency programs
 * - Experienced: 1+ years (default for standard RN positions)
 * - Leadership: Management roles (charge nurse, manager, director, coordinator)
 */

// Valid experience level slugs (lowercase, for URLs)
const EXPERIENCE_LEVELS = [
  'new-grad',
  'experienced',
  'leadership'
];

// Slug to display name mapping
const EXPERIENCE_LEVEL_DISPLAY_NAMES = {
  'new-grad': 'New Grad',
  'experienced': 'Experienced',
  'leadership': 'Leadership'
};

// Display name/DB value to canonical slug mapping (for normalization)
const EXPERIENCE_LEVEL_CANONICAL_SLUGS = {
  'new grad': 'new-grad',
  'new-grad': 'new-grad',
  'newgrad': 'new-grad',
  'experienced': 'experienced',
  'leadership': 'leadership',
  'lead': 'leadership',
  'manager': 'leadership',
  'charge': 'leadership'
};

/**
 * Check if a slug is a valid experience level
 * @param {string} slug - URL slug to validate
 * @returns {boolean}
 */
function isExperienceLevel(slug) {
  if (!slug) return false;
  return EXPERIENCE_LEVELS.includes(slug.toLowerCase());
}

/**
 * Convert experience level slug to display name
 * Examples: 'new-grad' -> 'New Grad', 'experienced' -> 'Experienced'
 * @param {string} slug - URL slug
 * @returns {string|null}
 */
function experienceLevelToDisplay(slug) {
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  return EXPERIENCE_LEVEL_DISPLAY_NAMES[normalized] || null;
}

/**
 * Convert experience level to canonical slug (for URLs)
 * Examples: 'New Grad' -> 'new-grad', 'Leadership' -> 'leadership'
 * @param {string} level - Display name or DB value
 * @returns {string|null}
 */
function experienceLevelToSlug(level) {
  if (!level) return null;
  const normalized = level.toLowerCase().replace(/-/g, ' ').trim();
  return EXPERIENCE_LEVEL_CANONICAL_SLUGS[normalized] || level.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Convert experience level slug to DB value (Title Case)
 * Examples: 'new-grad' -> 'New Grad' (matches DB experienceLevel field)
 * @param {string} slug - URL slug
 * @returns {string|null}
 */
function slugToExperienceLevel(slug) {
  if (!slug) return null;
  return EXPERIENCE_LEVEL_DISPLAY_NAMES[slug.toLowerCase()] || null;
}

/**
 * Get all valid experience levels as array of objects
 * @returns {Array<{slug: string, displayName: string}>}
 */
function getAllExperienceLevels() {
  return EXPERIENCE_LEVELS.map(slug => ({
    slug,
    displayName: EXPERIENCE_LEVEL_DISPLAY_NAMES[slug]
  }));
}

/**
 * Get description text for experience level (for SEO/UI)
 * @param {string} slug - URL slug
 * @returns {string}
 */
function getExperienceLevelDescription(slug) {
  const descriptions = {
    'new-grad': 'Perfect for new graduate nurses and RN residency programs. Entry-level positions with training and mentorship.',
    'experienced': 'Positions for registered nurses with 1+ years of clinical experience.',
    'leadership': 'Management and supervisory roles including charge nurse, nurse manager, and director positions.'
  };
  return descriptions[slug?.toLowerCase()] || '';
}

module.exports = {
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_DISPLAY_NAMES,
  isExperienceLevel,
  experienceLevelToDisplay,
  experienceLevelToSlug,
  slugToExperienceLevel,
  getAllExperienceLevels,
  getExperienceLevelDescription
};
