/**
 * Workday Employer Configurations
 * 
 * This file contains configuration for each employer using Workday ATS.
 * To add a new employer, simply add a new entry to the exports.
 * 
 * Each configuration includes:
 * - employerName: Official company name
 * - baseUrl: Base Workday URL (e.g., https://company.wd12.myworkdayjobs.com/careers)
 * - searchUrl: Full URL with filters applied (e.g., with jobFamilyGroup parameter)
 * - careerPageUrl: Main career page URL
 * - filters: Object with filter parameters (optional, for reference)
 * - selectors: Custom CSS selectors if the default Workday selectors don't work
 */

const workdayConfigs = {
  /**
   * United Health Services (UHS)
   * Example URL: https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1?jobFamilyGroup=51ad2a131e9d101654b4e5de9a300000
   * The jobFamilyGroup parameter filters to "Nursing Care" category
   */
  'uhs': {
    employerName: 'UHS',
    baseUrl: 'https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1',
    searchUrl: 'https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1?jobFamilyGroup=51ad2a131e9d101654b4e5de9a300000',
    careerPageUrl: 'https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1',
    filters: {
      jobFamilyGroup: '51ad2a131e9d101654b4e5de9a300000', // Nursing Care category
      // You can add more filters here if needed:
      // keyword: 'nurse',
      // location: 'New York'
    },
    // Use default Workday selectors (no custom selectors needed)
    selectors: {}
  },

  /**
   * Adventist Healthcare
   * Example URL: https://adventisthealthcare.wd1.myworkdayjobs.com/en-US/AdventistHealthCareCareers/jobs?jobFamilyGroup=...
   */
  'adventist': {
    employerName: 'Adventist Healthcare',
    baseUrl: 'https://adventisthealthcare.wd1.myworkdayjobs.com/AdventistHealthCareCareers',
    searchUrl: 'https://adventisthealthcare.wd1.myworkdayjobs.com/en-US/AdventistHealthCareCareers/jobs?jobFamilyGroup=9416f98c4684018c48128eb5ea01c45e&jobFamilyGroup=e206486d6e03019c59818eac7386fa1b',
    careerPageUrl: 'https://adventisthealthcare.wd1.myworkdayjobs.com/AdventistHealthCareCareers',
    filters: {
      jobFamilyGroup: ['9416f98c4684018c48128eb5ea01c45e', 'e206486d6e03019c59818eac7386fa1b'] // Nursing categories
    },
    selectors: {}
  },

  /**
   * Strong Memorial Hospital (University of Rochester Medical Center)
   * Rochester, NY
   */
  'strong-memorial-hospital': {
    employerName: 'Strong Memorial Hospital',
    baseUrl: 'https://rochester.wd5.myworkdayjobs.com/UR_Nursing',
    searchUrl: 'https://rochester.wd5.myworkdayjobs.com/UR_Nursing?jobFamily=52d7fdb5944d100120113e96875d0000&jobFamily=2f87d4f1b872100120103d65700f0000',
    careerPageUrl: 'https://rochester.wd5.myworkdayjobs.com/UR_Nursing',
    filters: {
      jobFamily: ['52d7fdb5944d100120113e96875d0000', '2f87d4f1b872100120103d65700f0000'] // Nursing categories
    },
    // Facility/address to location mapping (Workday returns facility names, not cities)
    facilityLocations: {
      // Main hospitals
      'Strong Memorial Hospital': { city: 'Rochester', state: 'NY' },
      'James P. Wilmot Cancer Center': { city: 'Rochester', state: 'NY' },
      'Strong West Hospital': { city: 'Brockport', state: 'NY' },
      'Highland Hospital': { city: 'Rochester', state: 'NY' },
      'Rochester Internal Medicine Associates': { city: 'Rochester', state: 'NY' },
      // Brighton locations (Sawgrass, Canal View)
      '158 Sawgrass Drive': { city: 'Brighton', state: 'NY' },
      '180 Sawgrass Drive': { city: 'Brighton', state: 'NY' },
      '140 Canal View Boulevard': { city: 'Brighton', state: 'NY' },
      '777 Canal View Boulevard': { city: 'Brighton', state: 'NY' },
      // Henrietta
      '2613 West Henrietta Road': { city: 'Henrietta', state: 'NY' },
      // Already has city format
      'Rochester - NY': { city: 'Rochester', state: 'NY' },
      // Default for unmapped facilities
      '_default': { city: 'Rochester', state: 'NY' }
    },
    selectors: {}
  },

  // Add more employers here as you discover them
  // Example template:
  /*
  'employer-slug': {
    employerName: 'Employer Name',
    baseUrl: 'https://employer.wd12.myworkdayjobs.com/careers',
    searchUrl: 'https://employer.wd12.myworkdayjobs.com/careers?jobFamilyGroup=xxx&keyword=nurse',
    careerPageUrl: 'https://employer.wd12.myworkdayjobs.com/careers',
    filters: {
      jobFamilyGroup: 'xxx', // Optional: job family group ID
      keyword: 'nurse',      // Optional: keyword filter
      location: 'City, ST'   // Optional: location filter
    },
    selectors: {
      // Only specify if default selectors don't work
      // jobCard: '[custom-selector]',
      // jobTitle: '[custom-selector]',
      // etc.
    }
  }
  */
};

/**
 * Get configuration for a specific employer
 * @param {string} employerSlug - Employer slug (e.g., 'uhs')
 * @returns {object|null} - Configuration object or null if not found
 */
function getConfig(employerSlug) {
  return workdayConfigs[employerSlug] || null;
}

/**
 * Get all available employer configurations
 * @returns {object} - All configurations
 */
function getAllConfigs() {
  return workdayConfigs;
}

/**
 * Get list of all employer slugs
 * @returns {Array<string>} - Array of employer slugs
 */
function getEmployerSlugs() {
  return Object.keys(workdayConfigs);
}

module.exports = {
  workdayConfigs,
  getConfig,
  getAllConfigs,
  getEmployerSlugs
};

