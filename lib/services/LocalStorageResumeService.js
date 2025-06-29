import ResumeService from './ResumeServiceInterface';

/**
 * Implementation of ResumeService using localStorage
 */
class LocalStorageResumeService extends ResumeService {
  constructor() {
    super();
    this.storageKeyPrefix = 'ai_resume_';
    this.currentResumeKey = 'current_resume_id';
    this.resumeDataKey = 'modern_resume_data';
    this.resumeProgressKey = 'modern_resume_progress';
    this.resumeTemplateKey = 'selected_resume_template';
  }

  /**
   * Check if localStorage is available
   * @returns {boolean}
   */
  isAvailable() {
    if (typeof window === 'undefined') return false;
    
    try {
      const testKey = `${this.storageKeyPrefix}test`;
      localStorage.setItem(testKey, 'test');
      const result = localStorage.getItem(testKey) === 'test';
      localStorage.removeItem(testKey);
      return result;
    } catch (error) {
      console.error('LocalStorage is not available:', error);
      return false;
    }
  }

  /**
   * Check if localStorage has resume data
   * @returns {boolean} Whether resume data exists
   */
  hasResumeData() {
    if (!this.isAvailable()) {
      return false;
    }
    
    try {
      // Check if resume data exists in localStorage
      const resumeData = localStorage.getItem(this.resumeDataKey);
      
      if (!resumeData) {
        return false;
      }
      
      // Try to parse the data to ensure it's valid
      const parsedData = JSON.parse(resumeData);
      
      // Check if the data has at least some basic structure
      return parsedData && 
        typeof parsedData === 'object' && 
        !Array.isArray(parsedData) &&
        Object.keys(parsedData).length > 0;
    } catch (error) {
      console.error('Error checking localStorage resume data:', error);
      return false;
    }
  }

  /**
   * Initialize the service
   * @param {Object} options - Service configuration options
   * @returns {Promise<ServiceResponse>}
   */
  async initialize(options = {}) {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'LocalStorage is not available in this environment'
      };
    }

    return {
      success: true,
      message: 'LocalStorage service initialized'
    };
  }

  /**
   * Load resume data by ID
   * @param {string} resumeId - Resume identifier
   * @returns {Promise<ServiceResponse>} - Response with resume data
   */
  async loadResume(resumeId) {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage not available' };
    }

    try {
      // For localStorage, we primarily use the main resume data key
      // The resumeId is secondary as localStorage typically only stores one resume
      const resumeData = localStorage.getItem(this.resumeDataKey);
      
      if (!resumeData) {
        return {
          success: false,
          error: 'No resume data found in localStorage',
          data: null
        };
      }

      const parsedData = JSON.parse(resumeData);
      const template = localStorage.getItem(this.resumeTemplateKey) || 'ats';
      const progress = localStorage.getItem(this.resumeProgressKey);
      const parsedProgress = progress ? JSON.parse(progress) : {};
      
      // Get or generate a resumeId
      const currentId = resumeId || localStorage.getItem(this.currentResumeKey) || this.generateTempId();
      
      return {
        success: true,
        data: {
          resumeData: parsedData,
          meta: {
            id: currentId,
            title: parsedData.personalInfo?.name 
              ? `${parsedData.personalInfo.name.split(' ')[0]}'s Resume` 
              : 'My Resume',
            template: template,
            lastUpdated: new Date().toISOString(),
            progress: parsedProgress
          }
        }
      };
    } catch (error) {
      console.error('Error loading resume from localStorage:', error);
      return {
        success: false,
        error: `Failed to load resume: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Save resume data
   * @param {ResumeData} resumeData - Resume content
   * @param {Object} options - Save options
   * @param {string} [options.resumeId] - Existing resume ID
   * @param {string} [options.title] - Resume title
   * @param {string} [options.template] - Template name
   * @returns {Promise<ServiceResponse>} - Response with created/updated resume ID
   */
  async saveResume(resumeData, options = {}) {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage not available' };
    }

    try {
      // Save the main resume data
      localStorage.setItem(this.resumeDataKey, JSON.stringify(resumeData));
      
      // Save the template if provided
      if (options.template) {
        localStorage.setItem(this.resumeTemplateKey, options.template);
      }
      
      // Generate or use provided resumeId
      const resumeId = options.resumeId || this.generateTempId();
      localStorage.setItem(this.currentResumeKey, resumeId);
      
      return {
        success: true,
        message: 'Resume saved to localStorage',
        data: {
          resumeId,
          title: options.title || this.generateTitle(resumeData)
        }
      };
    } catch (error) {
      console.error('Error saving resume to localStorage:', error);
      return {
        success: false,
        error: `Failed to save resume: ${error.message}`
      };
    }
  }

  /**
   * Update an existing resume
   * @param {string} resumeId - Resume identifier
   * @param {ResumeData} resumeData - New resume content
   * @param {Object} options - Update options
   * @returns {Promise<ServiceResponse>} - Response with updated resume
   */
  async updateResume(resumeId, resumeData, options = {}) {
    // For localStorage, update is the same as save since we only store one resume
    return this.saveResume(resumeData, { ...options, resumeId });
  }

  /**
   * Delete a resume
   * @param {string} resumeId - Resume identifier
   * @returns {Promise<ServiceResponse>} - Response with deletion status
   */
  async deleteResume(resumeId) {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage not available' };
    }

    try {
      // For localStorage, we just clear all resume data
      localStorage.removeItem(this.resumeDataKey);
      localStorage.removeItem(this.currentResumeKey);
      localStorage.removeItem(this.resumeProgressKey);
      
      return {
        success: true,
        message: 'Resume data cleared from localStorage'
      };
    } catch (error) {
      console.error('Error deleting resume from localStorage:', error);
      return {
        success: false,
        error: `Failed to delete resume: ${error.message}`
      };
    }
  }

  /**
   * List all available resumes
   * @returns {Promise<ServiceResponse>} - Response with array of resume metadata
   */
  async listResumes() {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage not available', data: { resumes: [] } };
    }

    try {
      const resumeData = localStorage.getItem(this.resumeDataKey);
      
      if (!resumeData) {
        return {
          success: true,
          data: { resumes: [] }
        };
      }

      const parsedData = JSON.parse(resumeData);
      const template = localStorage.getItem(this.resumeTemplateKey) || 'ats';
      const currentId = localStorage.getItem(this.currentResumeKey) || this.generateTempId();
      
      // For localStorage, we only have one resume
      return {
        success: true,
        data: {
          resumes: [{
            id: currentId,
            title: this.generateTitle(parsedData),
            template: template,
            lastUpdated: new Date().toISOString()
          }]
        }
      };
    } catch (error) {
      console.error('Error listing resumes from localStorage:', error);
      return {
        success: false,
        error: `Failed to list resumes: ${error.message}`,
        data: { resumes: [] }
      };
    }
  }

  /**
   * Clear all stored data
   * @returns {Promise<ServiceResponse>}
   */
  async clearAll() {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage not available' };
    }

    try {
      // Remove all resume-related data
      localStorage.removeItem(this.resumeDataKey);
      localStorage.removeItem(this.currentResumeKey);
      localStorage.removeItem(this.resumeProgressKey);
      localStorage.removeItem(this.resumeTemplateKey);
      
      // Clear any other resume-related keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.storageKeyPrefix)) {
          localStorage.removeItem(key);
        }
      }
      
      return {
        success: true,
        message: 'All resume data cleared from localStorage'
      };
    } catch (error) {
      console.error('Error clearing all data from localStorage:', error);
      return {
        success: false,
        error: `Failed to clear data: ${error.message}`
      };
    }
  }

  /**
   * Generate a temporary ID for localStorage
   * @returns {string} - A pseudo-unique ID
   */
  generateTempId() {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a title based on resume data
   * @param {ResumeData} resumeData - Resume content
   * @returns {string} - Generated title
   */
  generateTitle(resumeData) {
    if (resumeData.personalInfo?.name) {
      return `${resumeData.personalInfo.name.split(' ')[0]}'s Resume`;
    }
    return 'My Resume';
  }
}

export default LocalStorageResumeService; 