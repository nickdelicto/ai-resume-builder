/**
 * Utility functions for formatting job card display
 */

/**
 * Format salary using normalized hourly/annual fields
 * Respects salaryType to show original format (hourly vs annual)
 *
 * @param {number|null} minHourly - Minimum hourly rate
 * @param {number|null} maxHourly - Maximum hourly rate
 * @param {number|null} minAnnual - Minimum annual salary
 * @param {number|null} maxAnnual - Maximum annual salary
 * @param {string|null} salaryType - "hourly" or "annual" - determines display format
 * @returns {string|null} - Formatted pay string or null if no pay data
 */
export function formatSalaryForCard(minHourly, maxHourly, minAnnual, maxAnnual, salaryType) {
  // Use salaryType to determine which format to display (consistency with detail page)
  if (salaryType === 'hourly' && minHourly && maxHourly) {
    if (minHourly === maxHourly) {
      return `$${minHourly.toFixed(2)}/hr`;
    }
    return `$${minHourly.toFixed(2)} - $${maxHourly.toFixed(2)}/hr`;
  } else if (salaryType === 'annual' && minAnnual && maxAnnual) {
    if (minAnnual === maxAnnual) {
      return `$${(minAnnual / 1000).toFixed(0)}k/yr`;
    }
    return `$${(minAnnual / 1000).toFixed(0)}k - $${(maxAnnual / 1000).toFixed(0)}k/yr`;
  } else if (minHourly && maxHourly) {
    // Fallback to hourly if salaryType not set but hourly data exists
    if (minHourly === maxHourly) {
      return `$${minHourly.toFixed(2)}/hr`;
    }
    return `$${minHourly.toFixed(2)} - $${maxHourly.toFixed(2)}/hr`;
  } else if (minAnnual && maxAnnual) {
    // Fallback to annual if only annual data exists
    if (minAnnual === maxAnnual) {
      return `$${(minAnnual / 1000).toFixed(0)}k/yr`;
    }
    return `$${(minAnnual / 1000).toFixed(0)}k - $${(maxAnnual / 1000).toFixed(0)}k/yr`;
  }
  return null;
}

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

