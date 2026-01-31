/**
 * Employer Logo Utilities
 * Maps employer slugs to their logo files
 */

const SITE_URL = 'https://intelliresume.net';

// Employer logo mapping (slug -> filename)
// Logos are stored in /public/images/employers/
const EMPLOYER_LOGOS = {
  'adventist-healthcare': 'adventist-healthcare.png',
  'cleveland-clinic': 'cleveland-clinic.png',
  'guthrie': 'guthrie.png',
  'hartford-healthcare': 'Hartford-HealthCare-3.webp',
  'mass-general-brigham': 'mass-general-brigham.png',
  'mount-sinai': 'mount-sinai.webp',
  'newyork-presbyterian': 'NYC-Presbyterian.webp',
  'northwell-health': 'northwell-health.png',
  'nyc-health-hospitals': 'NYC_Health_And_Hospitals.webp',
  'nyu-langone-health': 'NYU_langone_health_logo.png',
  'strong-memorial-hospital': 'strong-memorial-hospital.png',
  'uhs': 'uhs.svg',
  'upstate-medical-university': 'upstate-medical.png',
  'yale-new-haven-health': 'yale-new-haven-health-system.png',
  'montefiore-einstein': 'montefiore-einstein.webp',
};

/**
 * Get employer logo path (relative, for use in Next.js Image or img)
 * @param {string} employerSlug - The employer's URL slug
 * @returns {string|null} - Relative path to logo or null if not found
 */
function getEmployerLogoPath(employerSlug) {
  if (!employerSlug) return null;
  const logoFile = EMPLOYER_LOGOS[employerSlug];
  return logoFile ? `/images/employers/${logoFile}` : null;
}

/**
 * Get employer logo full URL (for structured data/SEO)
 * @param {string} employerSlug - The employer's URL slug
 * @returns {string|null} - Full URL to logo or null if not found
 */
function getEmployerLogoUrl(employerSlug) {
  if (!employerSlug) return null;
  const logoFile = EMPLOYER_LOGOS[employerSlug];
  return logoFile ? `${SITE_URL}/images/employers/${logoFile}` : null;
}

/**
 * Check if employer has a logo
 * @param {string} employerSlug - The employer's URL slug
 * @returns {boolean}
 */
function hasEmployerLogo(employerSlug) {
  return !!(employerSlug && EMPLOYER_LOGOS[employerSlug]);
}

/**
 * Get all employer slugs that have logos
 * @returns {string[]}
 */
function getEmployersWithLogos() {
  return Object.keys(EMPLOYER_LOGOS);
}

module.exports = {
  EMPLOYER_LOGOS,
  getEmployerLogoPath,
  getEmployerLogoUrl,
  hasEmployerLogo,
  getEmployersWithLogos
};
