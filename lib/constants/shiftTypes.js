/**
 * Shift type constants and utilities
 *
 * Database values: "days", "nights", "rotating", "variable", "evenings", "Day", "Night"
 * URL slugs: "day-shift", "night-shift", "rotating-shift", "variable-shift", "evening-shift"
 */

const SHIFT_TYPES = [
  { slug: 'day-shift', display: 'Day Shift', dbValues: ['days', 'Day'] },
  { slug: 'night-shift', display: 'Night Shift', dbValues: ['nights', 'Night'] },
  { slug: 'rotating-shift', display: 'Rotating Shift', dbValues: ['rotating'] },
  { slug: 'evening-shift', display: 'Evening Shift', dbValues: ['evenings'] },
  { slug: 'variable-shift', display: 'Variable Shift', dbValues: ['variable'] }
];

/**
 * Check if a slug is a valid shift type
 */
function isShiftType(slug) {
  if (!slug) return false;
  const normalized = slug.toLowerCase();
  return SHIFT_TYPES.some(st => st.slug === normalized);
}

/**
 * Convert slug to display name
 * "day-shift" → "Day Shift"
 */
function shiftTypeToDisplay(slug) {
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  const shiftType = SHIFT_TYPES.find(st => st.slug === normalized);
  return shiftType ? shiftType.display : null;
}

/**
 * Convert display name to slug
 * "Day Shift" → "day-shift"
 */
function shiftTypeToSlug(displayOrDb) {
  if (!displayOrDb) return null;
  const normalized = displayOrDb.toLowerCase();

  // Check if it's already a slug
  const bySlug = SHIFT_TYPES.find(st => st.slug === normalized);
  if (bySlug) return bySlug.slug;

  // Check display name
  const byDisplay = SHIFT_TYPES.find(st => st.display.toLowerCase() === normalized);
  if (byDisplay) return byDisplay.slug;

  // Check database values
  const byDb = SHIFT_TYPES.find(st =>
    st.dbValues.some(db => db.toLowerCase() === normalized)
  );
  if (byDb) return byDb.slug;

  return null;
}

/**
 * Convert slug to database values for querying
 * "day-shift" → ["days", "Day"]
 */
function slugToDbValues(slug) {
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  const shiftType = SHIFT_TYPES.find(st => st.slug === normalized);
  return shiftType ? shiftType.dbValues : null;
}

/**
 * Get all shift types for iteration
 */
function getAllShiftTypes() {
  return SHIFT_TYPES.map(st => ({
    slug: st.slug,
    display: st.display
  }));
}

module.exports = {
  SHIFT_TYPES,
  isShiftType,
  shiftTypeToDisplay,
  shiftTypeToSlug,
  slugToDbValues,
  getAllShiftTypes
};
