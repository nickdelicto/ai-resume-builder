import ResumeService from './ResumeServiceInterface';

/**
 * Implementation of ResumeService using database API
 */
class DbResumeService extends ResumeService {
  constructor() {
    super();
    this.apiEndpoints = {
      save: '/api/resume/save',
      update: '/api/resume/update',
      get: '/api/resume/get',
      list: '/api/resume/list',
      delete: '/api/resume/delete'
    };
  }

  /**
   * Check if database service is available
   * @returns {boolean} - Whether the service is available
   */
  isAvailable() {
    return typeof window !== 'undefined' && !!this.isAuthenticated;
  }

  /**
   * Initialize the service
   * @param {Object} options - Service configuration options
   * @param {boolean} options.isAuthenticated - Whether the user is authenticated
   * @returns {Promise<ServiceResponse>}
   */
  async initialize(options = {}) {
    this.isAuthenticated = options.isAuthenticated || false;
    
    if (!this.isAuthenticated) {
      return {
        success: false,
        error: 'User is not authenticated'
      };
    }
    
    return {
      success: true,
      message: 'Database service initialized'
    };
  }

  /**
   * Load resume data by ID
   * @param {string} resumeId - Resume identifier
   * @returns {Promise<ServiceResponse>} - Response with resume data
   */
  async loadResume(resumeId) {
    if (!this.isAvailable()) {
      return { success: false, error: 'Database service not available' };
    }

    if (!resumeId) {
      return {
        success: false,
        error: 'Resume ID is required',
        data: null
      };
    }

    try {
      const response = await fetch(`${this.apiEndpoints.get}/${resumeId}`);
      
      if (!response.ok) {
        // Handle 404 specifically
        if (response.status === 404) {
          return {
            success: false,
            error: `Resume with ID ${resumeId} not found`,
            data: null
          };
        }
        
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.resume) {
        return {
          success: false,
          error: result.error || 'Failed to retrieve resume data',
          data: null
        };
      }
      
      return {
        success: true,
        data: {
          resumeData: result.resume.data,
          meta: {
            id: result.resume.id,
            title: result.resume.title,
            template: result.resume.template || 'ats',
            lastUpdated: result.resume.updatedAt || new Date().toISOString()
          }
        }
      };
    } catch (error) {
      console.error('Error loading resume from database:', error);
      return {
        success: false,
        error: `Failed to load resume: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Save resume data (create new resume)
   * @param {ResumeData} resumeData - Resume content
   * @param {Object} options - Save options
   * @param {string} [options.title] - Resume title
   * @param {string} [options.template] - Template name
   * @returns {Promise<ServiceResponse>} - Response with created resume ID
   */
  async saveResume(resumeData, options = {}) {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        error: 'Database service not available' 
      };
    }

    try {
      const { 
        resumeId, 
        template = 'ats',
        title = 'My Resume',
        forceUpdate = false 
      } = options;
      
      // Determine if we're creating a new resume or updating an existing one
      const isUpdate = Boolean(resumeId);
      
      // Special handling for imports - always use POST with special import flag
      const isImport = forceUpdate || localStorage.getItem('import_pending') === 'true';
      
      // For imports or new resumes, use POST
      // For updates to existing resumes, use PUT
      // This special handling ensures imports properly override existing resumes
      const method = isImport ? 'POST' : (isUpdate ? 'PUT' : 'POST');
      const endpoint = isImport ? this.apiEndpoints.save : 
                      (isUpdate ? this.apiEndpoints.update : this.apiEndpoints.save);
      
      console.log(`📊 DbResumeService: ${isImport ? 'IMPORT' : (isUpdate ? 'UPDATE' : 'CREATE')} operation using ${method} to ${endpoint}`);
      
      const payload = {
        resumeData,
        template,
        title
      };
      
      // If this is an update or import, include the resumeId
      if (isUpdate || isImport) {
        payload.resumeId = resumeId;
      }
      
      // If this is an import, add a special flag
      if (isImport) {
        payload.isImport = true;
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Failed to save resume: ${response.status} ${errorText}` 
        };
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`📊 DbResumeService: Successfully ${isImport ? 'imported' : (isUpdate ? 'updated' : 'created')} resume with ID:`, result.resumeId);
        
        // Store the resumeId in localStorage for consistency
        if (result.resumeId && typeof window !== 'undefined') {
          localStorage.setItem('current_resume_id', result.resumeId);
        }
        
        return {
          success: true,
          data: {
            resumeId: result.resumeId
          }
        };
      } else {
        return { 
          success: false, 
          error: result.error || 'Unknown error saving resume'
        };
      }
    } catch (error) {
      console.error('Error saving resume to database:', error);
      return { 
        success: false, 
        error: error.message || 'Error saving resume to database'
      };
    }
  }

  /**
   * Update an existing resume
   * @param {string} resumeId - Resume identifier
   * @param {ResumeData} resumeData - New resume content
   * @param {Object} options - Update options
   * @param {string} [options.title] - Updated resume title
   * @param {string} [options.template] - Updated template name
   * @returns {Promise<ServiceResponse>} - Response with updated resume
   */
  async updateResume(resumeId, resumeData, options = {}) {
    if (!this.isAvailable()) {
      return { success: false, error: 'Database service not available' };
    }

    if (!resumeId) {
      return {
        success: false,
        error: 'Resume ID is required for updates'
      };
    }

    try {
      // First check if the resume exists
      const exists = await this.checkResumeExists(resumeId);
      
      // If resume doesn't exist, create a new one instead
      if (!exists) {
        console.log(`Resume with ID ${resumeId} not found, creating new resume instead`);
        return this.saveResume(resumeData, options);
      }
      
      const payload = {
        data: resumeData
      };
      
      // Only include optional fields if they're provided
      if (options.title) payload.title = options.title;
      if (options.template) payload.template = options.template;
      
      const response = await fetch(`${this.apiEndpoints.update}/${resumeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update resume'
        };
      }
      
      return {
        success: true,
        message: 'Resume updated in database',
        data: {
          resumeId: result.resumeId || resumeId,
          title: options.title || this.generateTitle(resumeData)
        }
      };
    } catch (error) {
      console.error('Error updating resume in database:', error);
      return {
        success: false,
        error: `Failed to update resume: ${error.message}`
      };
    }
  }

  /**
   * Delete a resume
   * @param {string} resumeId - Resume identifier
   * @returns {Promise<ServiceResponse>} - Response with deletion status
   */
  async deleteResume(resumeId) {
    if (!this.isAvailable()) {
      return { success: false, error: 'Database service not available' };
    }

    if (!resumeId) {
      return {
        success: false,
        error: 'Resume ID is required for deletion'
      };
    }

    try {
      const response = await fetch(`${this.apiEndpoints.delete}/${resumeId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to delete resume'
        };
      }
      
      return {
        success: true,
        message: 'Resume deleted from database'
      };
    } catch (error) {
      console.error('Error deleting resume from database:', error);
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
      return { 
        success: false, 
        error: 'Database service not available',
        data: { resumes: [] }
      };
    }

    try {
      const response = await fetch(this.apiEndpoints.list);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to list resumes',
          data: { resumes: [] }
        };
      }
      
      return {
        success: true,
        data: {
          resumes: result.resumes || []
        }
      };
    } catch (error) {
      console.error('Error listing resumes from database:', error);
      return {
        success: false,
        error: `Failed to list resumes: ${error.message}`,
        data: { resumes: [] }
      };
    }
  }

  /**
   * Migrate data from another service (like localStorage)
   * @param {Object} sourceService - Source service to migrate from
   * @returns {Promise<Object>} Migration result
   */
  async migrateFrom(sourceService) {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Database service not available',
        data: { migratedCount: 0 }
      };
    }

    try {
      console.log('DbResumeService: Starting migration from source service');
      
      // List all resumes from the source service
      const listResult = await sourceService.listResumes();
      
      if (!listResult.success) {
        console.error('DbResumeService: Failed to list resumes from source service:', listResult.error);
        return {
          success: false,
          message: 'Failed to list resumes from source service',
          data: { migratedCount: 0, error: listResult.error }
        };
      }
      
      const { resumes } = listResult.data;
      
      if (!resumes || !resumes.length) {
        console.log('DbResumeService: No resumes to migrate from source service');
        return {
          success: true,
          message: 'No resumes to migrate',
          data: { migratedCount: 0 }
        };
      }
      
      console.log(`DbResumeService: Found ${resumes.length} resumes to migrate`);
      
      // Track successfully migrated resumes
      const migratedResumes = [];
      const failedResumes = [];
      
      // Try to migrate each resume
      for (const resume of resumes) {
        try {
          console.log(`DbResumeService: Migrating resume ${resume.id || 'unknown'}`);
          
          // Load the full resume data from source
          const loadResult = await sourceService.loadResume(resume.id);
          
          if (!loadResult.success) {
            console.error(`DbResumeService: Failed to load resume ${resume.id}:`, loadResult.error);
            failedResumes.push({ id: resume.id, error: 'Failed to load from source' });
            continue;
          }
          
          // Extract resume data and metadata
          const { resumeData, meta } = loadResult.data;
          
          if (!resumeData) {
            console.error(`DbResumeService: Invalid resume data for ${resume.id}`);
            failedResumes.push({ id: resume.id, error: 'Invalid resume data' });
            continue;
          }
          
          // Save the resume to the database
          try {
            console.log(`DbResumeService: Saving resume ${resume.id} to database`);
            
            // Use title from metadata if available, otherwise generate one
            const title = meta?.title || this._generateTitle(resumeData);
            
            // Save to database with sourceId to maintain correlation
            const saveResult = await fetch('/api/resume/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: resumeData,
                title: title,
                template: meta?.template || 'ats',
                sourceId: resume.id, // Include source ID for correlation
                isMigration: true // Flag this as a migration operation
              }),
            });
            
            if (!saveResult.ok) {
              let errorMessage = `Server error ${saveResult.status}`;
              try {
                // Try to get more detailed error message
                const errorData = await saveResult.json();
                errorMessage = errorData.error || errorMessage;
                console.error(`DbResumeService: Save API error for ${resume.id}:`, errorData);
              } catch (e) {
                console.error(`DbResumeService: Error parsing API response for ${resume.id}:`, e);
              }
              
              failedResumes.push({ id: resume.id, error: errorMessage });
              continue;
            }
            
            const saveData = await saveResult.json();
            
            if (!saveData.resumeId) {
              console.error(`DbResumeService: Save succeeded but no resumeId returned for ${resume.id}`);
              failedResumes.push({ id: resume.id, error: 'No resumeId returned' });
              continue;
            }
            
            // Add to successfully migrated list
            migratedResumes.push({
              sourceId: resume.id,
              targetId: saveData.resumeId
            });
            
            console.log(`DbResumeService: Successfully migrated resume ${resume.id} to ${saveData.resumeId}`);
          } catch (saveError) {
            console.error(`DbResumeService: Error saving resume ${resume.id} to database:`, saveError);
            failedResumes.push({ id: resume.id, error: saveError.message || 'Error saving to database' });
          }
        } catch (resumeError) {
          console.error(`DbResumeService: Error processing resume ${resume.id}:`, resumeError);
          failedResumes.push({ id: resume.id, error: resumeError.message || 'Error processing resume' });
        }
      }
      
      // Migration is successful if at least one resume was migrated
      const success = migratedResumes.length > 0;
      
      // Handle partial success/failure
      if (success) {
        if (failedResumes.length > 0) {
          console.log(`DbResumeService: Partially successful migration - ${migratedResumes.length} succeeded, ${failedResumes.length} failed`);
          return {
            success: true,
            message: `Partially successful migration (${migratedResumes.length}/${resumes.length} resumes)`,
            data: { 
              migratedCount: migratedResumes.length,
              totalCount: resumes.length,
              migratedResumes,
              failedResumes,
              resumeId: migratedResumes[0]?.targetId // Return the first migrated resumeId
            }
          };
        } else {
          console.log(`DbResumeService: Successfully migrated all ${migratedResumes.length} resumes`);
          return {
            success: true,
            message: 'Successfully migrated all resumes',
            data: { 
              migratedCount: migratedResumes.length,
              totalCount: resumes.length,
              migratedResumes,
              resumeId: migratedResumes[0]?.targetId // Return the first migrated resumeId
            }
          };
        }
      } else {
        console.error('DbResumeService: Failed to migrate any resumes');
        return {
          success: false,
          message: 'Failed to migrate any resumes',
          data: { 
            migratedCount: 0,
            totalCount: resumes.length,
            failedResumes
          }
        };
      }
    } catch (error) {
      console.error('DbResumeService: Error during migration:', error);
      return {
        success: false,
        message: `Failed to save migrated resume to database: ${error.message}`,
        data: { migratedCount: 0, error }
      };
    }
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

  /**
   * Check if a resume exists in the database
   * @param {string} resumeId - Resume identifier
   * @returns {Promise<boolean>} - Whether the resume exists
   */
  async checkResumeExists(resumeId) {
    if (!this.isAvailable()) {
      return false;
    }

    if (!resumeId) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiEndpoints.get}/${resumeId}`, {
        method: 'HEAD' // Use HEAD request to check existence without fetching full data
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Error checking resume existence:', error);
      return false;
    }
  }
}

export default DbResumeService; 