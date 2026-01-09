/**
 * Utility functions for formatting job card display
 */

/**
 * Format salary/pay information for display on job cards
 * Uses salaryType from database if available, otherwise detects from value ranges
 * @param {number|null} salaryMin - Minimum salary (raw value)
 * @param {number|null} salaryMax - Maximum salary (raw value)
 * @param {string|null} salaryType - "hourly", "annual", or "weekly" from database
 * @param {string|null} jobType - Optional job type to detect Travel positions
 * @returns {string|null} - Formatted pay string or null if no pay data
 */
export function formatPayForCard(salaryMin, salaryMax, salaryType = null, jobType = null) {
  if (!salaryMin && !salaryMax) {
    return null;
  }

  // Travel positions display as weekly (even if salaryType says otherwise)
  const isTravel = jobType && jobType.toLowerCase() === 'travel';

  // Determine unit from salaryType or jobType
  let unit;
  if (isTravel || salaryType === 'weekly') {
    unit = 'week';
  } else if (salaryType === 'hourly') {
    unit = 'hour';
  } else if (salaryType === 'annual') {
    unit = 'year';
  } else {
    return null; // No valid salaryType - can't display
  }

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

