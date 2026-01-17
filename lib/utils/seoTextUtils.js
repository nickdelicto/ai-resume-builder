/**
 * SEO Text Utilities
 *
 * Utility functions for generating consistent SEO text variations.
 */

const NO_SALARY_FALLBACKS = [
  ' - Urgently Hiring!',
  ' - Hiring Now!',
  ' - Apply Now!'
];

/**
 * Get a consistent no-salary fallback text based on a seed string.
 * The same seed will always return the same fallback text,
 * but different seeds will return different texts.
 *
 * @param {string} seed - A string to use as seed (e.g., specialty name, page URL)
 * @returns {string} One of the fallback texts
 */
function getNoSalaryFallback(seed = '') {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % NO_SALARY_FALLBACKS.length;
  return NO_SALARY_FALLBACKS[index];
}

/**
 * Get salary text for meta title.
 * Returns salary if available, otherwise a varied fallback.
 *
 * @param {number|null} maxHourlyRate - The max hourly rate, or null if not available
 * @param {string} seed - Seed for consistent fallback selection
 * @returns {string} The salary text portion of the title
 */
function getSalaryText(maxHourlyRate, seed = '') {
  if (maxHourlyRate) {
    return ` - Up to $${Math.round(maxHourlyRate)}/hr`;
  }
  return getNoSalaryFallback(seed);
}

module.exports = {
  NO_SALARY_FALLBACKS,
  getNoSalaryFallback,
  getSalaryText
};
