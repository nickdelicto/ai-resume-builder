/**
 * Resume Service Interface
 * 
 * This interface defines the contract for resume data operations.
 * It's implemented by both DbResumeService and LocalStorageResumeService.
 */

/**
 * Standard response format for all service methods
 * @typedef {Object} ServiceResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {string} [message] - Optional message providing more information
 * @property {Object} [data] - The data returned by the operation
 * @property {string} [error] - Error message if the operation failed
 */

/**
 * Resume data structure
 * @typedef {Object} ResumeData
 * @property {Object} personalInfo - Contact information
 * @property {string} summary - Professional summary
 * @property {Array} experience - Work experience
 * @property {Array} education - Education history
 * @property {Array} skills - Skills list
 * @property {Object} additional - Additional sections
 */

/**
 * Resume metadata
 * @typedef {Object} ResumeMeta
 * @property {string} id - Unique identifier
 * @property {string} title - Resume title/name
 * @property {string} template - Template name
 * @property {string} lastUpdated - ISO date string of last update
 */

/**
 * @interface ResumeService
 */
class ResumeService {
  /**
   * Initialize the service
   * @param {Object} options - Service configuration options
   * @returns {Promise<ServiceResponse>}
   */
  async initialize(options) {
    throw new Error('Method not implemented');
  }

  /**
   * Load resume data by ID
   * @param {string} resumeId - Resume identifier
   * @returns {Promise<ServiceResponse>} - Response with resume data
   */
  async loadResume(resumeId) {
    throw new Error('Method not implemented');
  }

  /**
   * Save resume data (create new or update existing)
   * @param {ResumeData} resumeData - Resume content
   * @param {Object} options - Save options
   * @param {string} [options.resumeId] - Existing resume ID (if updating)
   * @param {string} [options.title] - Resume title
   * @param {string} [options.template] - Template name
   * @returns {Promise<ServiceResponse>} - Response with created/updated resume ID
   */
  async saveResume(resumeData, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Update an existing resume
   * @param {string} resumeId - Resume identifier
   * @param {ResumeData} resumeData - New resume content
   * @param {Object} options - Update options
   * @returns {Promise<ServiceResponse>} - Response with updated resume
   */
  async updateResume(resumeId, resumeData, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete a resume
   * @param {string} resumeId - Resume identifier
   * @returns {Promise<ServiceResponse>} - Response with deletion status
   */
  async deleteResume(resumeId) {
    throw new Error('Method not implemented');
  }

  /**
   * List all available resumes
   * @returns {Promise<ServiceResponse>} - Response with array of resume metadata
   */
  async listResumes() {
    throw new Error('Method not implemented');
  }

  /**
   * Check if the service is available
   * @returns {boolean} - True if service is available
   */
  isAvailable() {
    throw new Error('Method not implemented');
  }

  /**
   * Clear all stored data (mainly for testing)
   * @returns {Promise<ServiceResponse>}
   */
  async clearAll() {
    throw new Error('Method not implemented');
  }

  /**
   * Migrate data from another source
   * @param {ResumeService} sourceService - Service to migrate from
   * @returns {Promise<ServiceResponse>} - Migration results
   */
  async migrateFrom(sourceService) {
    throw new Error('Method not implemented');
  }
}

export default ResumeService; 