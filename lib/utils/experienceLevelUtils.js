/**
 * Experience Level Utility Functions
 * Handles normalization and formatting of nursing experience levels
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
 *   "senior" → "Senior"
 *   "experienced" → "Experienced"
 *   "entry level" → "Entry Level"
 */
function normalizeExperienceLevel(level) {
  if (!level || typeof level !== 'string') return null;
  
  // Convert to lowercase, replace hyphens/underscores with spaces, trim
  const cleaned = level.toLowerCase().replace(/[-_]/g, ' ').trim();
  
  // Map variations to standard format
  const mappings = {
    'new grad': 'New Grad',
    'newgrad': 'New Grad',
    'new graduate': 'New Grad',
    'entry level': 'Entry Level',
    'entrylevel': 'Entry Level',
    'entry': 'Entry Level',
    'experienced': 'Experienced',
    'senior': 'Senior',
    'leadership': 'Leadership',
    'lead': 'Leadership',
    'manager': 'Leadership',
    'charge': 'Leadership'
  };
  
  // Check for exact mapping
  if (mappings[cleaned]) {
    return mappings[cleaned];
  }
  
  // If no mapping found, apply Title Case to each word
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all valid experience levels in proper format
 * @returns {string[]} Array of valid experience level strings
 */
function getValidExperienceLevels() {
  return ['Entry Level', 'New Grad', 'Experienced', 'Senior', 'Leadership'];
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

