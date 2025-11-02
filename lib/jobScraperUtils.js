/**
 * Job Scraper Utility Functions
 * Helper functions for normalizing and validating scraped job data
 * All scrapers should use these to ensure data consistency
 */

/**
 * Normalize state name to 2-letter abbreviation
 * @param {string} stateInput - State name or abbreviation
 * @returns {string} - 2-letter uppercase state code (e.g., "OH", "CA")
 */
function normalizeState(stateInput) {
  if (!stateInput) return null;
  
  const stateMap = {
    // Full state names
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
    // Common abbreviations
    'calif': 'CA', 'cal': 'CA', 'conn': 'CT', 'del': 'DE', 'fla': 'FL',
    'ill': 'IL', 'ind': 'IN', 'kan': 'KS', 'ken': 'KY', 'la': 'LA',
    'mass': 'MA', 'mich': 'MI', 'minn': 'MN', 'miss': 'MS', 'mo': 'MO',
    'neb': 'NE', 'nev': 'NV', 'nc': 'NC', 'nd': 'ND', 'ok': 'OK',
    'ore': 'OR', 'pa': 'PA', 'ri': 'RI', 'sc': 'SC', 'sd': 'SD',
    'tenn': 'TN', 'tex': 'TX', 'va': 'VA', 'vt': 'VT', 'wash': 'WA',
    'wva': 'WV', 'wisc': 'WI', 'wyo': 'WY'
  };
  
  const normalized = stateInput.toLowerCase().trim();
  
  // If already 2 letters, uppercase and return
  if (normalized.length === 2) {
    return normalized.toUpperCase();
  }
  
  // Check if it's in our map
  if (stateMap[normalized]) {
    return stateMap[normalized];
  }
  
  // If not found, try to extract first 2 letters (last resort)
  return normalized.substring(0, 2).toUpperCase();
}

/**
 * Normalize city name - proper capitalization
 * @param {string} cityInput - City name
 * @returns {string} - Properly capitalized city name
 */
function normalizeCity(cityInput) {
  if (!cityInput) return null;
  
  // Handle common prefixes and suffixes
  const city = cityInput.trim();
  
  // Handle compound names (St. Louis, New York, etc.)
  const words = city.split(/\s+/);
  return words
    .map(word => {
      // Handle special cases
      if (word.toLowerCase() === 'st') return 'St.';
      if (word.toLowerCase() === 'ft') return 'Ft.';
      if (word.toLowerCase() === 'mt') return 'Mt.';
      
      // Handle "Heights", "Beach", etc.
      const lower = word.toLowerCase();
      if (['heights', 'beach', 'hills', 'city', 'town', 'burg', 'port', 'haven'].includes(lower)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Generate URL-friendly slug from employer name
 * @param {string} name - Employer name
 * @returns {string} - URL-friendly slug (e.g., "cleveland-clinic")
 */
function generateEmployerSlug(name) {
  if (!name) return null;
  
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Normalize job type to standard values
 * @param {string} typeInput - Job type from scraped data
 * @returns {string|null} - Standardized job type or null
 */
function normalizeJobType(typeInput) {
  if (!typeInput) return null;
  
  const typeMap = {
    'full-time': 'full-time',
    'fulltime': 'full-time',
    'full time': 'full-time',
    'ft': 'full-time',
    'f/t': 'full-time',
    'f.t.': 'full-time',
    'part-time': 'part-time',
    'parttime': 'part-time',
    'part time': 'part-time',
    'pt': 'part-time',
    'p/t': 'part-time',
    'p.t.': 'part-time',
    'prn': 'prn',
    'per diem': 'prn',
    'per-diem': 'prn',
    'perdiem': 'prn',
    'contract': 'contract',
    'temporary': 'contract',
    'temp': 'contract',
    'temporary': 'contract',
    'seasonal': 'contract',
  };
  
  const normalized = typeInput.toLowerCase().trim();
  return typeMap[normalized] || null;
}

/**
 * Detect specialty from job title and description
 * @param {string} title - Job title
 * @param {string} description - Job description
 * @returns {string|null} - Detected specialty or null
 */
function detectSpecialty(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  // Check in order of specificity (most specific first - title takes priority)
  // IMPORTANT: Check longer/more specific phrases FIRST to avoid false matches
  // Check title first for more accurate detection
  const titleLower = (title || '').toLowerCase();
  
  // HIGHEST PRIORITY: Check for "All Specialties" or "General" - these override everything
  // If title explicitly says "all specialties", don't tag as a specific specialty
  if (titleLower.includes('all specialties') || titleLower.includes('all-specialties') || 
      titleLower.includes('all specialities') || titleLower.includes('all speciality') ||
      titleLower.includes('all specialty') || titleLower.includes('general specialty') ||
      titleLower.includes('general') || titleLower.includes('multi-specialty') ||
      titleLower.includes('multiple specialties') || titleLower.includes('various specialties')) {
    return 'All Specialties';
  }
  
  // Check description for "all specialties" as well (second priority)
  if (text.includes('all specialties') || text.includes('all-specialties') || 
      text.includes('all specialities') || text.includes('all speciality') ||
      text.includes('general specialty') || text.includes('multi-specialty') ||
      text.includes('multiple specialties') || text.includes('various specialties')) {
    return 'All Specialties';
  }
  
  // NOW check for specific specialties (only if "all specialties" wasn't found)
  // Home Care/Home Health - MUST come before "ER" check to avoid false matches
  if (titleLower.includes('home care') || titleLower.includes('homecare')) return 'Home Care';
  if (titleLower.includes('home health')) return 'Home Health';
  
  // Other specialties (check longer phrases first)
  if (titleLower.includes('operating room') || titleLower.includes('or nurse') || titleLower.match(/\bor\s+registered\s+nurse/i)) return 'OR';
  if (titleLower.includes('emergency room') || titleLower.includes('emergency department') || titleLower.includes('emergency') || titleLower.match(/\bemergency\s+department/i)) return 'ER';
  if (titleLower.includes('intensive care') || titleLower.includes('icu')) return 'ICU';
  if (titleLower.includes('med-surg') || titleLower.includes('medical surgical')) return 'Med-Surg';
  if (titleLower.includes('mental health') || titleLower.includes('psychiatric')) return 'Mental Health';
  if (titleLower.includes('hospice')) return 'Hospice';
  if (titleLower.includes('travel')) return 'Travel';
  if (titleLower.includes('ambulatory')) return 'Ambulatory';
  if (titleLower.includes('pediatric')) return 'Pediatrics';
  if (titleLower.includes('geriatric')) return 'Geriatrics';
  if (titleLower.includes('oncology')) return 'Oncology';
  if (titleLower.includes('cardiac') || titleLower.includes('cardiology')) return 'Cardiac';
  if (titleLower.includes('telemetry')) return 'Telemetry';
  if (titleLower.includes('rehab') || titleLower.includes('rehabilitation')) return 'Rehabilitation';
  
  // Then check full text (same order)
  if (text.includes('home care') || text.includes('homecare')) return 'Home Care';
  if (text.includes('home health')) return 'Home Health';
  if (text.includes('operating room') || text.includes('or nurse') || text.match(/\bor\s+registered\s+nurse/i)) return 'OR';
  if (text.includes('emergency room') || text.includes('emergency department') || text.includes('emergency') || text.match(/\bemergency\s+department/i)) return 'ER';
  if (text.includes('intensive care unit') || text.includes('intensive care') || text.includes('icu')) return 'ICU';
  if (text.includes('med-surg') || text.includes('medical surgical') || text.includes('med surg')) return 'Med-Surg';
  if (text.includes('mental health') || text.includes('psychiatric')) return 'Mental Health';
  if (text.includes('hospice')) return 'Hospice';
  if (text.includes('travel')) return 'Travel';
  if (text.includes('ambulatory')) return 'Ambulatory';
  if (text.includes('pediatric') || text.includes('pediatrics')) return 'Pediatrics';
  if (text.includes('geriatric') || text.includes('geriatrics')) return 'Geriatrics';
  if (text.includes('oncology')) return 'Oncology';
  if (text.includes('cardiac') || text.includes('cardiology')) return 'Cardiac';
  if (text.includes('telemetry')) return 'Telemetry';
  if (text.includes('rehab') || text.includes('rehabilitation')) return 'Rehabilitation';
  
  // DEFAULT: If no specific specialty found, return "All Specialties" instead of null
  // This ensures all jobs have a specialty tag for filtering/browsing
  return 'All Specialties';
}

/**
 * Detect experience level from job title and description
 * @param {string} title - Job title
 * @param {string} description - Job description
 * @returns {string|null} - Detected experience level or null
 */
function detectExperienceLevel(title, description) {
  // ULTRA-CONSERVATIVE: Only return experience level for VERY clear cases
  // Most job descriptions are ambiguous (e.g., "1 year preferred" but complex responsibilities)
  // Better to return null than incorrectly categorize
  
  const text = `${title} ${description || ''}`.toLowerCase();
  const titleLower = (title || '').toLowerCase();
  
  // ONLY check title for senior/leadership (most reliable)
  // If title has senior keywords, trust it - these are rarely ambiguous
  if (titleLower.includes('senior') || titleLower.includes('sr.') || 
      titleLower.includes('lead rn') || titleLower.includes('lead nurse') ||
      titleLower.includes('manager') || titleLower.includes('supervisor') || 
      titleLower.includes('director') || titleLower.includes('chief') ||
      titleLower.includes('head nurse') || titleLower.includes('nurse manager') ||
      titleLower.includes('clinical coordinator') || titleLower.includes('charge nurse')) {
    return 'senior';
  }
  
  // ONLY check for explicit new grad mentions (not ambiguous "preferred" language)
  // These are clear indicators that don't require years parsing
  if (titleLower.includes('new grad') || titleLower.includes('new graduate') || 
      titleLower.includes('new-grad') || titleLower.includes('entry level') ||
      titleLower.includes('entry-level') || titleLower.includes('graduate nurse') ||
      titleLower.includes('gn ') || titleLower.includes('newly licensed')) {
    return 'new-grad';
  }
  
  // Check description for new grad only if VERY explicit (not "preferred" or "optional")
  if (text.includes('new grad') || text.includes('new graduate') || 
      text.includes('new-grad') || text.includes('no experience required') ||
      text.includes('no prior experience required') || text.includes('newly licensed rn') ||
      text.includes('new rn graduate') || text.includes('graduate nurse')) {
    // But skip if it also says "years" nearby (might be contradictory)
    const newGradMatch = text.match(/(?:new\s+grad|new\s+graduate|entry\s+level|no\s+experience)/i);
    if (newGradMatch) {
      const matchIndex = text.indexOf(newGradMatch[0]);
      const context = text.substring(Math.max(0, matchIndex - 50), matchIndex + 100);
      // If context mentions years of experience, it's ambiguous - return null
      if (!/\d+\s*years?\s+(?:of\s+)?experience/i.test(context)) {
        return 'new-grad';
      }
    }
  }
  
  // ONLY check for REQUIRED (not preferred) years - these are more reliable
  // Ignore "preferred", "preferably", "ideal", "recommended" language
  const requiredPattern = /\b(?:requires?|must\s+have|needed)\s+(?:a\s+minimum\s+of\s+)?(\d+)[\s\+\-]?\s*years?\s+(?:of\s+)?(?:rn\s+)?(?:nursing\s+)?experience\b/i;
  const requiredMatch = text.match(requiredPattern);
  
  if (requiredMatch) {
    const years = parseInt(requiredMatch[1], 10);
    // Only categorize if it's REQUIRED (not preferred)
    // Skip if nearby text has "preferred" or "preferably"
    const matchIndex = text.indexOf(requiredMatch[0]);
    const context = text.substring(Math.max(0, matchIndex - 30), matchIndex + 50);
    if (!context.includes('preferred') && !context.includes('preferably')) {
      if (years === 1) {
        return 'new-grad';
      } else if (years >= 2 && years < 5) {
        return 'experienced';
      } else if (years >= 5 && years <= 20) {
        return 'senior';
      }
    }
  }
  
  // Check for "minimum X years REQUIRED" (not preferred)
  const minimumRequiredPattern = /\bminimum\s+(?:of\s+)?(\d+)[\s\+\-]?\s*years?\s+(?:of\s+)?(?:rn\s+)?(?:nursing\s+)?experience\s+(?:required|needed|necessary)\b/i;
  const minimumRequiredMatch = text.match(minimumRequiredPattern);
  
  if (minimumRequiredMatch) {
    const years = parseInt(minimumRequiredMatch[1], 10);
    if (years === 1) {
      return 'new-grad';
    } else if (years >= 2 && years < 5) {
      return 'experienced';
    } else if (years >= 5 && years <= 20) {
      return 'senior';
    }
  }
  
  // For everything else, return null - job descriptions are too ambiguous
  // Example: "1 year preferred" with complex responsibilities = can't tell
  // Example: Years mentioned without "required" = might be flexible/preferred
  return null;
}

/**
 * Normalize zip code to 5-digit format
 * @param {string} zipInput - Zip code
 * @returns {string|null} - Normalized 5-digit zip or null
 */
function normalizeZipCode(zipInput) {
  if (!zipInput) return null;
  
  // Extract digits only
  const digits = zipInput.replace(/\D/g, '');
  
  // Return first 5 digits if available
  if (digits.length >= 5) {
    return digits.substring(0, 5);
  }
  
  return null;
}

/**
 * Generate job slug from title, city, and state
 * @param {string} title - Job title
 * @param {string} city - City name
 * @param {string} state - State abbreviation
 * @param {string} jobId - Optional job ID for uniqueness
 * @returns {string} - URL-friendly slug
 */
function generateJobSlug(title, city, state, jobId = null) {
  // Clean title - remove special chars, CSS selectors, etc.
  const cleanTitle = (title || '')
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, '') // Remove bracket content
    .replace(/\{[^}]*\}/g, '') // Remove CSS blocks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  const cleanCity = (city || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const cleanState = (state || '').toLowerCase();
  const cleanJobId = jobId ? String(jobId).replace(/[^a-z0-9]/g, '') : Date.now().toString().slice(-6);
  
  const parts = [cleanTitle, cleanCity, cleanState, cleanJobId].filter(p => p && p.length > 0);
  
  return parts
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100); // Limit total length
}

/**
 * Validate required job data fields
 * @param {object} jobData - Job data object
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateJobData(jobData) {
  const errors = [];
  const required = ['title', 'location', 'city', 'state', 'description', 'sourceUrl', 'employerName', 'employerSlug', 'careerPageUrl'];
  
  required.forEach(field => {
    if (!jobData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate state is 2-letter code
  if (jobData.state && jobData.state.length !== 2) {
    errors.push(`State must be 2-letter code, got: ${jobData.state}`);
  }
  
  // Validate description length
  if (jobData.description && jobData.description.length < 50) {
    errors.push(`Description must be at least 50 characters, got: ${jobData.description.length}`);
  }
  
  // Validate sourceUrl is absolute
  if (jobData.sourceUrl && !jobData.sourceUrl.startsWith('http')) {
    errors.push(`Source URL must be absolute URL starting with http/https`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get full state name from abbreviation
 * @param {string} stateAbbr - 2-letter state code (e.g., "OH", "CA")
 * @returns {string} - Full state name (e.g., "Ohio", "California")
 */
function getStateFullName(stateAbbr) {
  if (!stateAbbr) return null;
  
  const stateAbbrUpper = stateAbbr.toUpperCase();
  
  const stateMap = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  
  return stateMap[stateAbbrUpper] || null;
}

module.exports = {
  normalizeState,
  normalizeCity,
  generateEmployerSlug,
  normalizeJobType,
  detectSpecialty,
  detectExperienceLevel,
  normalizeZipCode,
  generateJobSlug,
  validateJobData,
  getStateFullName
};
