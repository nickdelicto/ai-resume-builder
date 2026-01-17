/**
 * Experience Level Utility Functions
 * Handles normalization and formatting of nursing experience levels
 *
 * Taxonomy (as of Jan 2026):
 * - New Grad: 0-12 months experience, nurse residency programs, "new grad welcome"
 * - Experienced: 1+ years (default for standard RN positions)
 * - Leadership: Management roles (charge nurse, manager, director, coordinator)
 *
 * Note: "Entry Level" and "Senior" were removed as separate categories.
 * Entry Level → merged into Experienced (only 4 jobs had this)
 * Senior → merged into Experienced (specialty certs don't warrant separate category)
 */

/**
 * Normalize experience level to proper Title Case format
 * Handles variations from LLM (lowercase, hyphens, etc.)
 *
 * @param {string} level - Raw experience level from LLM or database
 * @returns {string|null} - Normalized Title Case string or null
 *
 * Examples:
 *   "new-grad" → "New Grad"
 *   "senior" → "Experienced" (merged)
 *   "experienced" → "Experienced"
 *   "entry level" → "Experienced" (merged)
 */
function normalizeExperienceLevel(level) {
  if (!level || typeof level !== 'string') return null;

  // Convert to lowercase, replace hyphens/underscores with spaces, trim
  const cleaned = level.toLowerCase().replace(/[-_]/g, ' ').trim();

  // Map variations to standard format (3-level taxonomy)
  const mappings = {
    // New Grad mappings
    'new grad': 'New Grad',
    'newgrad': 'New Grad',
    'new graduate': 'New Grad',
    'graduate nurse': 'New Grad',
    'gn': 'New Grad',
    'residency': 'New Grad',

    // Experienced mappings (includes former Entry Level and Senior)
    'experienced': 'Experienced',
    'entry level': 'Experienced',  // Merged: Entry Level → Experienced
    'entrylevel': 'Experienced',   // Merged: Entry Level → Experienced
    'entry': 'Experienced',        // Merged: Entry Level → Experienced
    'senior': 'Experienced',       // Merged: Senior → Experienced
    'senior rn': 'Experienced',    // Merged: Senior → Experienced

    // Leadership mappings
    'leadership': 'Leadership',
    'lead': 'Leadership',
    'manager': 'Leadership',
    'charge': 'Leadership',
    'charge nurse': 'Leadership',
    'director': 'Leadership',
    'coordinator': 'Leadership',
    'supervisor': 'Leadership'
  };

  // Check for exact mapping
  if (mappings[cleaned]) {
    return mappings[cleaned];
  }

  // If no mapping found but contains leadership keywords, return Leadership
  if (cleaned.includes('manager') || cleaned.includes('director') ||
      cleaned.includes('lead') || cleaned.includes('charge') ||
      cleaned.includes('supervisor') || cleaned.includes('coordinator')) {
    return 'Leadership';
  }

  // Default to Experienced for unknown values
  return 'Experienced';
}

/**
 * Get all valid experience levels in proper format
 * @returns {string[]} Array of valid experience level strings
 */
function getValidExperienceLevels() {
  return ['New Grad', 'Experienced', 'Leadership'];
}

/**
 * Validate if experience level is in correct format
 * @param {string} level - Experience level to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidExperienceLevel(level) {
  const valid = getValidExperienceLevels();
  return valid.includes(level);
}

module.exports = {
  normalizeExperienceLevel,
  getValidExperienceLevels,
  isValidExperienceLevel
};

