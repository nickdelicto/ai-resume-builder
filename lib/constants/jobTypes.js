/**
 * Job Type Constants and Utilities
 * 
 * Centralized list of valid nursing job types and utility functions
 * for slug generation, display names, and validation.
 */

// Valid job types (lowercase, for comparison)
const JOB_TYPES = [
  'travel',
  'per-diem',
  'prn',
  'contract',
  'full-time',
  'part-time'
];

// Job type slug to display name mapping
const JOB_TYPE_DISPLAY_NAMES = {
  'travel': 'Travel',
  'per-diem': 'Per Diem',
  'prn': 'Per Diem', // PRN is the same as Per Diem
  'contract': 'Contract',
  'full-time': 'Full Time',
  'part-time': 'Part Time'
};

// Job type display name to canonical slug mapping (for normalization)
const JOB_TYPE_CANONICAL_SLUGS = {
  'travel': 'travel',
  'per diem': 'per-diem',
  'per-diem': 'per-diem',
  'prn': 'per-diem', // Normalize PRN to per-diem
  'contract': 'contract',
  'full time': 'full-time',
  'full-time': 'full-time',
  'part time': 'part-time',
  'part-time': 'part-time'
};

/**
 * Check if a slug is a valid job type
 */
function isJobType(slug) {
  if (!slug) return false;
  return JOB_TYPES.includes(slug.toLowerCase());
}

/**
 * Convert job type slug to display name
 * Examples: 'travel' -> 'Travel', 'per-diem' -> 'Per Diem', 'prn' -> 'Per Diem'
 */
function jobTypeToDisplay(slug) {
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  return JOB_TYPE_DISPLAY_NAMES[normalized] || null;
}

/**
 * Convert job type to canonical slug (for URLs)
 * Examples: 'PRN' -> 'per-diem', 'Full Time' -> 'full-time'
 */
function jobTypeToSlug(jobType) {
  if (!jobType) return null;
  const normalized = jobType.toLowerCase();
  return JOB_TYPE_CANONICAL_SLUGS[normalized] || null;
}

/**
 * Get all valid job types as array of objects with slug and display name
 */
function getAllJobTypes() {
  return JOB_TYPES
    .filter(slug => slug !== 'prn') // Exclude PRN as it's an alias for per-diem
    .map(slug => ({
      slug,
      displayName: JOB_TYPE_DISPLAY_NAMES[slug]
    }));
}

module.exports = {
  JOB_TYPES,
  JOB_TYPE_DISPLAY_NAMES,
  isJobType,
  jobTypeToDisplay,
  jobTypeToSlug,
  getAllJobTypes
};

