/**
 * Utility functions for formatting job card display
 */

/**
 * Format salary/pay information for display on job cards
 * Uses salaryType from database if available, otherwise detects from value ranges
 * @param {number|null} salaryMin - Minimum salary (raw value)
 * @param {number|null} salaryMax - Maximum salary (raw value)
 * @param {string|null} salaryType - "hourly" or "annual" from database
 * @returns {string|null} - Formatted pay string or null if no pay data
 */
export function formatPayForCard(salaryMin, salaryMax, salaryType = null) {
  if (!salaryMin && !salaryMax) {
    return null;
  }

  // Determine if hourly or annual from database (salaryType)
  // All jobs must have salaryType set by the scraper
  if (!salaryType || (salaryType !== 'hourly' && salaryType !== 'annual')) {
    return null; // No salaryType - can't display
  }

  const isHourly = salaryType === 'hourly';
  const unit = isHourly ? 'hour' : 'year';

  if (salaryMin && salaryMax) {
    // Check if it's a single value (min equals max) - show as single value, not range
    if (salaryMin === salaryMax) {
      return `$${salaryMin.toLocaleString()}/${unit}`;
    }
    // Both values available and different - show range
    return `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}/${unit}`;
  } else if (salaryMin) {
    // Only minimum available
    return `From $${salaryMin.toLocaleString()}/${unit}`;
  } else {
    // Only maximum available
    return `Up to $${salaryMax.toLocaleString()}/${unit}`;
  }
}

