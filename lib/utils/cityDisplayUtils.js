/**
 * City display name utilities for SEO-optimized titles
 * - Drops state initials from city names (shorter, cleaner titles)
 * - Handles special cases like "New York" → "New York City"
 */

/**
 * Get SEO-optimized display name for a city
 * Used in meta titles and H1 headings
 *
 * @param {string} city - City name from database
 * @param {string} state - State code (e.g., "NY", "OH")
 * @returns {string} - Display name for titles (no state suffix)
 */
function getCityDisplayName(city, state) {
  if (!city) return '';

  // Special case: New York, NY → New York City
  if (city.toLowerCase() === 'new york' && state?.toUpperCase() === 'NY') {
    return 'New York City';
  }

  // Default: just return city name (drop state)
  return city;
}

module.exports = {
  getCityDisplayName
};
