/**
 * Category Utilities
 * 
 * Helper functions for blog category pages
 */

/**
 * Determines if a category is a content silo
 * @param {string} slug - The category slug
 * @returns {boolean} True if the category is a content silo
 */
export const isContentSilo = (slug) => {
  return ['resume-examples', 'job-descriptions', 'career-advice'].includes(slug);
};

/**
 * Get page title based on category type
 * @param {Object} category - The category object
 * @returns {string} The page title
 */
export const getPageTitle = (category) => {
  if (!category) return 'Category Not Found';
  
  if (isContentSilo(category.slug)) {
    switch (category.slug) {
      case 'resume-examples':
        return 'Professional Resume Examples by Industry';
      case 'job-descriptions':
        return 'Job Descriptions & Requirements';
      case 'career-advice':
        return 'Career Advice & Job Search Tips';
      default:
        return category.name;
    }
  }
  return `${category.name} Career Resources`;
};

/**
 * Get page description based on category type
 * @param {Object} category - The category object
 * @returns {string} The page description
 */
export const getPageDescription = (category) => {
  if (!category) return '';
  
  if (isContentSilo(category.slug)) {
    switch (category.slug) {
      case 'resume-examples':
        return 'Browse industry-specific resume examples crafted by experts. Find the perfect resume format for your profession.';
      case 'job-descriptions':
        return 'Explore detailed job descriptions to understand role requirements, responsibilities, and qualifications for various positions.';
      case 'career-advice':
        return 'Expert career advice, interview tips, and job search strategies to help you advance your professional journey.';
      default:
        return category.description;
    }
  }
  return category.description || `Professional resources and guides for ${category.name} careers. Find resume examples, job descriptions, and career advice.`;
};

/**
 * Get content type label based on category
 * @param {Object} category - The category object
 * @returns {string} The content type label
 */
export const getContentTypeLabel = (category) => {
  if (!category) return 'Resources';
  
  if (isContentSilo(category.slug)) {
    switch (category.slug) {
      case 'resume-examples':
        return 'Resume Examples';
      case 'job-descriptions':
        return 'Job Descriptions';
      case 'career-advice':
        return 'Career Advice';
      default:
        return 'Resources';
    }
  }
  return 'Resources';
};

/**
 * Get header color based on category type
 * @param {Object} category - The category object
 * @returns {string} The header color
 */
export const getHeaderColor = (category) => {
  if (!category) return '#4299e1';
  
  if (isContentSilo(category.slug)) {
    switch (category.slug) {
      case 'resume-examples':
        return '#4299e1'; // Blue
      case 'job-descriptions':
        return '#48bb78'; // Green
      case 'career-advice':
        return '#ed8936'; // Orange
      default:
        return category.color || '#4299e1';
    }
  }
  return category.color || '#4299e1';
};

/**
 * Get category summary text
 * @param {Object} category - The category object
 * @returns {string} The category summary text
 */
export const getCategorySummary = (category) => {
  if (!category) return '';
  
  if (isContentSilo(category.slug)) {
    switch (category.slug) {
      case 'resume-examples':
        return 'Our resume examples are designed to showcase the most relevant skills and experiences that employers are looking for. Use these examples as inspiration for your own resume.';
      case 'job-descriptions':
        return 'Our job descriptions provide detailed information about roles, responsibilities, and requirements for various positions. Use these to understand what employers are looking for.';
      case 'career-advice':
        return 'Our career advice articles offer expert guidance on job searching, interviews, career advancement, and more. Use these resources to help you succeed in your professional journey.';
      default:
        return '';
    }
  }
  return `Our ${category.name} resources are designed to help professionals in this industry advance their careers. Browse resume examples, job descriptions, and career advice tailored to ${category.name} roles.`;
}; 