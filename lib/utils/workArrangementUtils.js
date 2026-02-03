/**
 * Work Arrangement Detection Utilities
 *
 * Detects whether a job is remote, hybrid, or onsite based on job data.
 * Used by scrapers for initial detection; LLM classifier provides final verification.
 */

/**
 * Detect work arrangement from job description and title
 * Returns 'remote', 'hybrid', 'onsite', or null (unknown)
 *
 * @param {Object} options - Job data to analyze
 * @param {string} options.title - Job title
 * @param {string} options.description - Job description
 * @param {string} options.location - Location string (may contain "Remote")
 * @param {string} options.employmentType - Employment type from API
 * @returns {'remote'|'hybrid'|'onsite'|null}
 */
function detectWorkArrangement({ title = '', description = '', location = '', employmentType = '' }) {
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const locationLower = (location || '').toLowerCase();
  const typeLower = (employmentType || '').toLowerCase();

  // Combine all text for searching
  const allText = `${titleLower} ${descLower} ${locationLower} ${typeLower}`;

  // =====================
  // REMOTE INDICATORS
  // =====================
  const remotePatterns = [
    /\b100%\s*remote\b/,
    /\bfully\s*remote\b/,
    /\bwork\s*from\s*home\b/,
    /\bwfh\b/,
    /\btelecommute\b/,
    /\btelecommuting\b/,
    /\bvirtual\s*position\b/,
    /\bremote\s*position\b/,
    /\bremote\s*work\b/,
    /\bremote\s*opportunity\b/,
    /\bwork\s*remotely\b/,
    /\bremote\s*only\b/,
  ];

  // Check title/location specifically for "Remote"
  if (/\bremote\b/i.test(title) || /\bremote\b/i.test(location)) {
    // Title or location explicitly says Remote - strong indicator
    // But check it's not "Remote Patient Monitoring" (onsite job)
    if (!/remote\s*patient\s*monitoring/i.test(allText)) {
      return 'remote';
    }
  }

  // Check for strong remote patterns
  for (const pattern of remotePatterns) {
    if (pattern.test(allText)) {
      return 'remote';
    }
  }

  // =====================
  // HYBRID INDICATORS
  // =====================
  const hybridPatterns = [
    /\bhybrid\b/,
    /\bpartial\s*remote\b/,
    /\bflexible\s*work\s*arrangement\b/,
    /\bflexible\s*work\s*location\b/,
    /\bremote.*days?\s*(?:in|at)\s*office/,
    /\b(?:in|at)\s*office.*remote/,
    /\bcombination\s*of\s*remote/,
    /\bwork\s*from\s*home.*days?\s*(?:per|a)\s*week/,
  ];

  for (const pattern of hybridPatterns) {
    if (pattern.test(allText)) {
      return 'hybrid';
    }
  }

  // =====================
  // ONSITE INDICATORS
  // =====================
  const onsitePatterns = [
    /\bon-?site\s*(?:only|required|position)\b/,
    /\bin-?person\s*(?:only|required|position)\b/,
    /\bmust\s*(?:work|report)\s*(?:on-?site|in-?person|at\s*facility)\b/,
    /\bon\s*campus\s*(?:only|required)\b/,
    /\bno\s*remote\b/,
    /\bnot\s*remote\b/,
  ];

  for (const pattern of onsitePatterns) {
    if (pattern.test(allText)) {
      return 'onsite';
    }
  }

  // =====================
  // INFER FROM JOB TYPE
  // =====================
  // Bedside nursing positions are typically onsite
  const bedsideKeywords = [
    'bedside', 'direct patient care', 'patient-facing',
    'floor nurse', 'staff nurse', 'charge nurse',
  ];

  const bedsideUnits = [
    'icu', 'intensive care', 'emergency', 'er ', 'e.r.',
    'med-surg', 'med/surg', 'medical surgical',
    'operating room', ' or ', 'surgery', 'surgical',
    'labor and delivery', 'l&d', 'postpartum', 'nicu',
    'pacu', 'recovery room', 'cath lab', 'cardiac',
  ];

  // If job mentions bedside/direct care keywords, likely onsite
  for (const kw of bedsideKeywords) {
    if (allText.includes(kw)) {
      return 'onsite';
    }
  }

  // If job is in a bedside unit AND at a hospital/facility, likely onsite
  const isBedsideUnit = bedsideUnits.some(unit => allText.includes(unit));
  const isAtFacility = /hospital|medical center|health center|clinic|facility/i.test(allText);

  if (isBedsideUnit && isAtFacility) {
    return 'onsite';
  }

  // =====================
  // NON-BEDSIDE ROLES - Check for remote possibility
  // =====================
  // These roles CAN be remote but aren't always
  const potentiallyRemoteRoles = [
    'case management', 'case manager',
    'utilization review', 'utilization management',
    'telehealth', 'tele-health', 'telemedicine',
    'clinical documentation', 'cdi',
    'quality assurance', 'quality improvement',
    'nurse educator', 'clinical educator',
    'infection control', 'infection prevention',
    'risk management',
  ];

  // If it's a potentially remote role but no explicit remote indicators, return null
  // (let LLM classifier determine)
  for (const role of potentiallyRemoteRoles) {
    if (allText.includes(role)) {
      // Could be remote, but not certain - return null for LLM to decide
      return null;
    }
  }

  // =====================
  // DEFAULT
  // =====================
  // If no clear indicators and it's a general nursing job at a facility,
  // it's probably onsite, but we return null to let LLM verify
  return null;
}

module.exports = {
  detectWorkArrangement,
};
