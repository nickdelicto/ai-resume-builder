/**
 * Utility functions for resume data management
 * Handles migration between localStorage and database
 */

import ResumeServiceFactory from './services/ResumeServiceFactory';

/**
 * CENTRALIZED MIGRATION FUNCTION
 * Migrates resume data from localStorage to the database when a user authenticates
 * This is the ONLY function that should be used for migration across the entire application
 *
 * @param {Object} options - Migration options
 * @param {boolean} options.force - Force migration even if it's been attempted before
 * @param {string} options.source - Source of the migration request (for logging)
 * @param {Object} options.context - Additional context information about the migration
 * @param {Function} options.onSuccess - Callback function to run on successful migration
 * @param {Function} options.onError - Callback function to run on migration error
 * @returns {Promise<Object>} Migration result with success status and details
 */
export async function migrateToDatabase(options = {}) {
  // ── Global mutex (window-level) ─────────────────────────
  // We use window.__migrationInFlight instead of a module-level variable
  // because dynamic import() can create separate module instances, each
  // with its own module-scoped variables. window is truly singleton.
  if (typeof window !== 'undefined' && window.__migrationInFlight) {
    console.log(`📊 [${options.source || 'unknown'}] Migration already in flight — waiting for existing result`);
    return window.__migrationInFlight;
  }

  const promise = _doMigrate(options).finally(() => {
    if (typeof window !== 'undefined') {
      window.__migrationInFlight = null;
    }
  });

  if (typeof window !== 'undefined') {
    window.__migrationInFlight = promise;
  }
  return promise;
}

async function _doMigrate(options = {}) {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return { 
      success: false, 
      error: 'Not in browser environment',
      code: 'NOT_BROWSER'
    };
  }
  
  // Create a log array to store detailed migration logs
  const migrationLogs = [];
  const addLog = (message, data = null) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data: data ? JSON.stringify(data) : null
    };
    migrationLogs.push(logEntry);
    console.log(`📊 [${options.source || 'unknown'}] ${message}`, data || '');
    
    // Store logs in localStorage for later viewing
    try {
      localStorage.setItem('migration_logs', JSON.stringify(migrationLogs));
    } catch (e) {
      // Ignore localStorage errors
    }
  };
  
  const {
    force = false,
    source = 'unknown',
    context = {},
    onSuccess = () => {},
    onError = () => {}
  } = options;
  
  // Generate a unique migration ID for this attempt
  const migrationId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  addLog(`Starting migration attempt ${migrationId}`);
  
  // Log context information if provided
  if (Object.keys(context).length > 0) {
    addLog(`Migration context:`, context);
  }
  
  // Store migration start timestamp and source
  localStorage.setItem('migration_last_attempt', Date.now().toString());
  localStorage.setItem('migration_last_source', source);
  
  // Check if we're in DB-only mode already
  if (localStorage.getItem('db_only_mode') === 'true' && !force) {
    // Check if there's a URL parameter requesting migration
    const isUrlMigration = typeof window !== 'undefined' && 
                          window.location.search.includes('migrate=true');
    
    // If there's a URL migration request, we should reset DB-only mode
    // and allow the migration to proceed despite the flag being set
    if (isUrlMigration) {
      addLog(`Resetting DB-only mode for URL-requested migration`);
      localStorage.removeItem('db_only_mode');
      // Continue with migration
    } else {
      addLog(`Migration skipped - Already in DB-only mode`);
      
      // Store result in localStorage
      localStorage.setItem('migration_last_result', JSON.stringify({
        success: false,
        error: 'Already in DB-only mode',
        code: 'ALREADY_DB_ONLY',
        timestamp: Date.now()
      }));
      
      return { 
        success: false, 
        error: 'Already in DB-only mode',
        code: 'ALREADY_DB_ONLY'
      };
    }
  }
  
  // Check if migration is already in progress
  if (localStorage.getItem('migration_in_progress') === 'true') {
    const migrationStartTime = parseInt(localStorage.getItem('migration_start_time') || '0', 10);
    const currentTime = Date.now();
    
    // If migration has been "in progress" for more than 2 minutes, assume it failed
    if (migrationStartTime && (currentTime - migrationStartTime > 120000)) { // 2 minutes
      addLog(`Migration lock timed out after 2 minutes - resetting lock`);
      localStorage.removeItem('migration_in_progress');
      localStorage.removeItem('migration_start_time');
    } else {
      addLog(`Migration skipped - Another migration is already in progress`);
      
      // Store result in localStorage
      localStorage.setItem('migration_last_result', JSON.stringify({
        success: false,
        error: 'Migration already in progress',
        code: 'MIGRATION_IN_PROGRESS',
        timestamp: Date.now()
      }));
      
      return { 
        success: false, 
        error: 'Migration already in progress',
        code: 'MIGRATION_IN_PROGRESS'
      };
    }
  }
  
  // Check if we have resume data to migrate
  const localResumeData = localStorage.getItem('modern_resume_data');
  if (!localResumeData) {
    addLog(`Migration skipped - No resume data in localStorage`);
    
    // Even though there's no data to migrate, we'll mark as DB-only mode
    // to ensure consistent behavior going forward
    localStorage.setItem('db_only_mode', 'true');
    localStorage.setItem('needs_db_migration', 'false');
    
    // Store result in localStorage
    localStorage.setItem('migration_last_result', JSON.stringify({
      success: true,
      message: 'No data to migrate, switched to DB-only mode',
      code: 'NO_DATA_TO_MIGRATE',
      timestamp: Date.now()
    }));
    
    return { 
      success: true, 
      message: 'No data to migrate, switched to DB-only mode',
      code: 'NO_DATA_TO_MIGRATE'
    };
  }
  
  try {
    // Set migration lock with timestamp and ID
    localStorage.setItem('migration_in_progress', 'true');
    localStorage.setItem('migration_start_time', Date.now().toString());
    localStorage.setItem('migration_session_id', migrationId);
    
    addLog(`Migration lock acquired with ID: ${migrationId}`);

    // Parse the resume data
    const resumeData = JSON.parse(localResumeData);

    // Check if the data has meaningful content worth migrating.
    // The builder auto-saves the default empty template to localStorage,
    // so we need to skip migration if nobody actually filled anything in.
    const hasName = !!resumeData.personalInfo?.name?.trim();
    const hasEmail = !!resumeData.personalInfo?.email?.trim();
    const hasExperience = Array.isArray(resumeData.experience) && resumeData.experience.length > 0;
    const hasEducation = Array.isArray(resumeData.education) && resumeData.education.length > 0;
    const hasSummary = !!resumeData.summary?.trim();
    const hasLicenses = Array.isArray(resumeData.licenses) && resumeData.licenses.length > 0;
    const hasCerts = Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0;
    const hasSkills = Array.isArray(resumeData.skills) && resumeData.skills.length > 0;

    const hasMeaningfulContent = hasName || hasEmail || hasExperience || hasEducation ||
                                  hasSummary || hasLicenses || hasCerts || hasSkills;

    if (!hasMeaningfulContent) {
      addLog('Migration skipped - localStorage data is empty/default template');

      // Clean up the empty data and switch to DB-only mode
      localStorage.removeItem('modern_resume_data');
      localStorage.setItem('db_only_mode', 'true');
      localStorage.setItem('needs_db_migration', 'false');
      localStorage.removeItem('migration_in_progress');
      localStorage.removeItem('migration_start_time');
      localStorage.removeItem('migration_session_id');

      localStorage.setItem('migration_last_result', JSON.stringify({
        success: true,
        message: 'No meaningful data to migrate',
        code: 'NO_DATA_TO_MIGRATE',
        timestamp: Date.now()
      }));

      return {
        success: true,
        message: 'No meaningful data to migrate',
        code: 'NO_DATA_TO_MIGRATE'
      };
    }

    addLog('Resume has meaningful content, proceeding with migration', {
      hasName, hasEmail, hasExperience, hasEducation, hasSummary, hasLicenses, hasCerts, hasSkills
    });

    // Get section order if available
    let sectionOrder = null;
    try {
      const sectionOrderData = localStorage.getItem('resume_section_order');
      if (sectionOrderData) {
        sectionOrder = JSON.parse(sectionOrderData);
      }
    } catch (error) {
      addLog(`Error parsing section order:`, error);
    }
    
    // Generate a meaningful title based on resume content
    let title = 'Untitled Resume';
    if (resumeData.personalInfo?.name) {
      title = `${resumeData.personalInfo.name}'s Resume`;
    } else {
      title = `Resume - ${new Date().toLocaleDateString()}`;
    }
    
    // Ensure name is unique by validating it
    const validationResult = await validateResumeName(title);
    const finalTitle = validationResult.isValid ? title : validationResult.suggestedName;
    
    addLog(`Migrating resume data to database with title: ${finalTitle}`);
    
    // Get the template from localStorage
    const template = localStorage.getItem('selected_resume_template') || 'ats';
    
    // Check if we already have a resumeId that might have been set by another component
    const existingResumeId = localStorage.getItem('current_resume_id');
    // For migration from localStorage, we ALWAYS want to create a new resume
    // This prevents overwriting existing resumes in the database
    const shouldCreateNew = true;
    
    addLog(`Migration details:`, {
      shouldCreateNew,
      existingResumeId: existingResumeId || 'none',
      isLocalId: existingResumeId?.startsWith('local_') || false,
      template,
      title: finalTitle,
      dataSize: JSON.stringify(resumeData).length
    });
    
    addLog(`Creating a new resume during migration to prevent overwriting existing resumes`);
    
    // Save to database using the ResumeServiceFactory
    // This ensures we're using the same service logic as the rest of the app
    addLog(`Getting service from ResumeServiceFactory`);
    
    // Add retry mechanism for getting service
    let factory = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        factory = await ResumeServiceFactory.getService({ isAuthenticated: true });
    
        // Log detailed information about the factory result
        addLog(`Service factory returned:`, {
          hasService: !!factory.service,
          serviceType: factory.serviceType || (factory.service ? (factory.service.constructor ? factory.service.constructor.name : typeof factory.service) : 'undefined'),
          needsMigration: factory.needsMigration,
          isDbService: factory.isDbService,
          isLocalStorageService: factory.isLocalStorageService
        });
        
        // If we got a valid service, break out of retry loop
        if (factory.service) {
          break;
        } else {
          addLog(`No service returned, retrying (${retryCount + 1}/${maxRetries})`);
          retryCount++;
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        addLog(`Error getting service (attempt ${retryCount + 1}/${maxRetries}):`, error);
        retryCount++;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If this was our last retry, rethrow the error
        if (retryCount >= maxRetries) {
          throw error;
        }
      }
    }
    
    if (!factory.service) {
      const errorMsg = 'CRITICAL ERROR: No service returned from factory';
      addLog(errorMsg);
      throw new Error('DB service not available for migration - No service returned from factory');
    }
    
    // Enhanced service type checking
    const serviceType = factory.serviceType || 
                      (factory.service.constructor ? factory.service.constructor.name : 
                      (typeof factory.service === 'object' ? 'Unknown Object' : typeof factory.service));
    
    addLog(`Service type check: ${serviceType}`);
    
    if (serviceType !== 'DbResumeService' && !factory.isDbService) {
      const errorMsg = `CRITICAL ERROR: Wrong service type returned: ${serviceType}`;
      addLog(errorMsg);
      throw new Error(`DB service not available for migration - Got ${serviceType} instead`);
    }
    
    // Check if service is available
    addLog(`Checking if service is available`);
    if (typeof factory.service.isAvailable === 'function') {
      const isAvailable = factory.service.isAvailable();
      addLog(`Service availability check:`, isAvailable);
      
      if (!isAvailable) {
        throw new Error('DB service is not available - isAvailable() returned false');
    }
    } else {
      addLog(`Service does not have isAvailable method`);
    }
    
    addLog(`About to call saveResume on service`);
    const saveResult = await factory.service.saveResume(resumeData, {
      resumeId: null, // Always pass null to create a new resume during migration
      template,
      title: finalTitle,
      forceUpdate: true
    });
    
    addLog(`Save result:`, {
      success: saveResult.success,
      error: saveResult.error || 'none',
      hasData: !!saveResult.data,
      resumeId: saveResult.data?.resumeId || 'none'
    });
    
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save resume to database');
    }
    
    const resumeId = saveResult.data?.resumeId;
    
    if (!resumeId) {
      throw new Error('No resumeId returned from save operation');
    }
    
    addLog(`Migration successful, new resume created with ID: ${resumeId}`);
    
    // Store the resumeId in localStorage for consistency
    localStorage.setItem('current_resume_id', resumeId);
    
    // CRITICAL: Clear ALL localStorage resume data after successful migration
    // This ensures we don't have stale data that could conflict with DB data
    const keysToRemove = [
      'modern_resume_data',
      'resume_section_order',
      'modern_resume_progress',
      'imported_resume_data',
      'imported_resume_override',
      'resume_last_edited',
      'resume_autosave_timestamp',
      'pending_resume_download',
      'needs_db_migration'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Set flag to indicate we're now in DB-only mode
    localStorage.setItem('db_only_mode', 'true');
    
    // Release migration locks
    localStorage.removeItem('migration_in_progress');
    localStorage.removeItem('migration_start_time');
    localStorage.removeItem('migration_session_id');
    
    // Store successful result in localStorage
    const result = {
      success: true,
      message: 'Resume data successfully migrated to database as a new resume',
      data: {
        resumeId,
        title: finalTitle
      },
      code: 'MIGRATION_SUCCESS',
      timestamp: Date.now(),
      logs: migrationLogs
    };
    
    localStorage.setItem('migration_last_result', JSON.stringify(result));
    
    // Call success callback if provided
    if (typeof onSuccess === 'function') {
      onSuccess({ resumeId, title: finalTitle });
    }
    
    return result;
  } catch (error) {
    addLog(`Migration error:`, error);
    
    // Release migration locks on error
    localStorage.removeItem('migration_in_progress');
    localStorage.removeItem('migration_start_time');
    
    // Set flag to try again later
    localStorage.setItem('needs_db_migration', 'true');
    
    // Store error result in localStorage
    const errorResult = {
      success: false,
      error: error.message || 'Unknown migration error',
      code: 'MIGRATION_ERROR',
      timestamp: Date.now(),
      logs: migrationLogs
    };
    
    localStorage.setItem('migration_last_result', JSON.stringify(errorResult));
    
    // Call error callback if provided
    if (typeof onError === 'function') {
      onError(error);
    }
    
    return errorResult;
  }
}

/**
 * @deprecated Use migrateToDatabase instead
 * Legacy function kept for backward compatibility
 */
export async function migrateLocalStorageResumesToDatabase() {
  console.warn('⚠️ Using deprecated migrateLocalStorageResumesToDatabase function. Please use migrateToDatabase instead.');
  const result = await migrateToDatabase({ source: 'legacy_function' });
  return result.success;
}

/**
 * Validate a resume name against existing names
 * 
 * @param {string} name - The name to validate
 * @param {string} resumeId - Optional resume ID to exclude from validation
 * @returns {Promise<Object>} Validation result with isValid, suggestedName if needed
 */
export async function validateResumeName(name, resumeId = null) {
  try {
    const response = await fetch('/api/resume/validate-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, resumeId }),
    });
    
    if (!response.ok) {
      // If the API is unavailable, just return the name as valid
      console.warn('Resume name validation failed, continuing with original name');
      return { isValid: true, message: 'Name validation failed but proceeding', originalName: name };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error validating resume name:', error);
    // If there's an error, assume the name is valid to allow operation to continue
    return { isValid: true, message: 'Name validation error', originalName: name };
  }
}

/**
 * Generate an appropriate name for a resume based on content
 * 
 * @param {Object} resumeData - The resume data object
 * @param {string} source - Source of the resume ('new', 'import', etc)
 * @returns {string} A descriptive name for the resume
 */
export function generateResumeName(resumeData, source = 'new') {
  // If resume has personal info with name, use that
  if (resumeData?.personalInfo?.name) {
    const name = resumeData.personalInfo.name.trim();
    if (name) {
      // Generate base name based on source
      let baseName;
      if (source === 'import') {
        baseName = `${name}'s Resume`;
      } else {
        baseName = `${name}'s Resume`;
      }
      
      // Note: We don't add suffixes like "(Imported)" here anymore
      // Instead, we'll rely on the name validation system to add numeric
      // suffixes like "(2)", "(3)" when needed
      
      return baseName;
    }
  }
  
  // Fallback to source-based naming with date
  const date = new Date().toLocaleDateString();
  if (source === 'import') {
    return `Resume - ${date}`; // Simplified name
  }
  return `Untitled Resume - ${date}`;
}

/**
 * Get the latest resume from the database
 * 
 * @returns {Promise<Object|null>} The resume data or null if not found
 */
export async function getLatestResumeFromDatabase() {
  try {
    const response = await fetch('/api/resume/get-latest');
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No resumes found
      }
      throw new Error('Failed to fetch resume');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting latest resume:', error);
    return null;
  }
}

/**
 * Load resume data from the appropriate source
 * @param {string} resumeId - Resume ID to load (if available)
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Promise<Object>} - Resume data and metadata
 */
export async function loadResumeData(resumeId, isAuthenticated) {
  try {
    // Check if the resumeId is a localStorage-generated ID
    if (resumeId && resumeId.startsWith('local_') && isAuthenticated) {
      console.log('📊 Attempted to load localStorage-generated ID from database:', resumeId);
      return { 
        success: false, 
        error: 'Cannot load localStorage-generated ID from database',
        isNotFound: true,
        isLocalId: true
      };
    }
    
    // Get the appropriate service
    const { service } = await ResumeServiceFactory.getService({ isAuthenticated });
    
    if (!service) {
      console.error('No resume service available');
      return { success: false, error: 'Resume service not available' };
    }
    
    // Load the resume data
    const result = await service.loadResume(resumeId);
    
    if (!result.success) {
      console.error('Failed to load resume:', result.error);
      return { 
        success: false, 
        error: result.error || 'Failed to load resume',
        isNotFound: result.error?.includes('not found') 
      };
    }
    
    return {
      success: true,
      data: result.data.resumeData,
      meta: result.data.meta
    };
  } catch (error) {
    console.error('Error loading resume data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save resume data to the appropriate storage
 * @param {Object} resumeData - Resume content to save
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @param {string} template - Resume template name
 * @param {string} resumeId - Existing resume ID (for updates)
 * @param {string} title - Resume title
 * @param {boolean} forceUpdate - Force update even if no changes
 * @returns {Promise<Object>} - Result with resumeId
 */
export async function saveResumeData(
  resumeData, 
  isAuthenticated, 
  template = 'ats', 
  resumeId = null,
  title = 'My Resume',
  forceUpdate = false
) {
  try {
    // Check for import flags
    const importPending = typeof window !== 'undefined' && localStorage.getItem('import_pending') === 'true';
    const importTargetResumeId = localStorage.getItem('import_target_resumeId');
    const importCreateNew = typeof window !== 'undefined' && localStorage.getItem('import_create_new') === 'true';
    
    // If this is an import operation with create_new flag, force resumeId to null to create a new resume
    if (importPending && importCreateNew) {
      console.log('📊 Import with create_new flag detected - forcing creation of a new resume');
      resumeId = null;
      // CRITICAL: Clear these flags IMMEDIATELY so subsequent autosave calls
      // don't create additional new resumes. Without this, every autosave cycle
      // reads the same flags and creates another duplicate.
      localStorage.removeItem('import_pending');
      localStorage.removeItem('import_create_new');
      // Generate a title that indicates this is an imported resume
      if (!title || title === 'My Resume') {
        title = generateResumeName(resumeData, 'import');
      }
    }
    // If this is an import operation and we have a target ID, use that (legacy behavior)
    else if (importPending && importTargetResumeId && !resumeId) {
      console.log('📊 Using import target resumeId for save operation:', importTargetResumeId);
      resumeId = importTargetResumeId;
      forceUpdate = true; // Always force update for imports
    }
    
    // Check if the resumeId is a localStorage-generated ID
    // If so, treat it as a new resume when saving to the database
    if (resumeId && resumeId.startsWith('local_') && isAuthenticated) {
      console.log('📊 Detected localStorage-generated ID:', resumeId);
      console.log('📊 Creating new database entry instead of using local ID');
      resumeId = null;
    }
    
    // For new resumes or imports, validate the name to avoid duplicates
    // Only do this for authenticated users since name validation requires the API
    if (isAuthenticated && (!resumeId || importCreateNew)) {
      try {
        console.log('📊 Validating resume name to avoid duplicates:', title);
        const validationResult = await validateResumeName(title, resumeId);
        
        if (!validationResult.isValid && validationResult.suggestedName) {
          console.log('📊 Duplicate resume name detected, using suggested name:', validationResult.suggestedName);
          title = validationResult.suggestedName;
        }
      } catch (validationError) {
        console.error('📊 Error validating resume name:', validationError);
        // Continue with the original title if validation fails
      }
    }
    
    // Get the appropriate service - priority on DB service for authenticated imports
    const { service, isImportOperation } = await ResumeServiceFactory.getService({ 
      isAuthenticated,
      isImportOperation: importPending
    });
    
    if (!service) {
      console.error('No resume service available');
      return { success: false, error: 'Resume service not available' };
    }
    
    // Prepare save options
    const options = {
      resumeId,
      title,
      template,
      forceUpdate: forceUpdate || importPending, // Always force update for imports
      isImport: importPending // Pass the import flag to the service
    };
    
    // For authenticated imports, always use saveResume with force update
    let result;
    if (importPending && isAuthenticated) {
      console.log('📊 Import operation for authenticated user - using special save logic');
      
      // For imports, add extra safety to ensure data is properly saved
      if (importPending) {
        console.log('📊 Import operation detected - adding extra verification steps');
        // Store original data in localStorage for verification
        if (typeof window !== 'undefined') {
          try {
            // Store a hash or simple identifier of the import data for verification
            const importDataIdentifier = resumeData?.personalInfo?.name || 'import-data';
            localStorage.setItem('import_data_identifier', importDataIdentifier);
            console.log('📊 Stored import data identifier for verification:', importDataIdentifier);
          } catch (error) {
            console.error('📊 Error storing import data identifier:', error);
          }
        }
      }
      
      result = await service.saveResume(resumeData, options);
    }
    // If we have a resumeId, update existing resume, otherwise create new
    else if (resumeId) {
      console.log('📊 Updating existing resume:', resumeId);
      if (importPending) {
        // For imports with an existing resumeId, use saveResume with special import handling
        console.log('📊 Using special import handling for existing resume:', resumeId);
        
        // Store original data in localStorage for verification
        if (typeof window !== 'undefined') {
          try {
            // Store a hash or simple identifier of the import data for verification
            const importDataIdentifier = resumeData?.personalInfo?.name || 'import-data';
            localStorage.setItem('import_data_identifier', importDataIdentifier);
            console.log('📊 Stored import data identifier for verification:', importDataIdentifier);
          } catch (error) {
            console.error('📊 Error storing import data identifier:', error);
          }
        }
        
        result = await service.saveResume(resumeData, options);
      } else {
        result = await service.updateResume(resumeId, resumeData, options);
      }
    } else {
      console.log('📊 Creating new resume');
      result = await service.saveResume(resumeData, options);
    }
    
    if (!result.success) {
      console.error('Failed to save resume:', result.error);
      return { success: false, error: result.error || 'Failed to save resume' };
    }
    
    // Always ensure current_resume_id is updated in localStorage
    if (typeof window !== 'undefined' && result.data?.resumeId) {
      localStorage.setItem('current_resume_id', result.data.resumeId);
      console.log('📊 Updated localStorage with resumeId:', result.data.resumeId);
      
      // Clear any pending changes flag since we've successfully saved
      localStorage.removeItem('pending_resume_changes');
      localStorage.removeItem('pending_resume_timestamp');
      
      // Always clear ALL import flags after a successful save to prevent
      // stale flags from triggering duplicate resume creation on next autosave.
      localStorage.removeItem('import_pending');
      localStorage.removeItem('import_target_resumeId');
      localStorage.removeItem('import_create_new');
      localStorage.removeItem('imported_resume_data');
      localStorage.removeItem('imported_resume_override');

      if (importPending && result.success) {
        // Store verification markers (these don't trigger creation)
        localStorage.setItem('import_save_successful', 'true');
        localStorage.setItem('import_saved_resume_id', result.data.resumeId);
      }
    }
    
    return {
      success: true,
      resumeId: result.data?.resumeId,
      title: result.data?.title
    };
  } catch (error) {
    console.error('Error saving resume data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a resume
 * @param {string} resumeId - Resume ID to delete
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Promise<Object>} - Result of deletion
 */
export async function deleteResume(resumeId, isAuthenticated) {
  try {
    // Get the appropriate service
    const { service } = await ResumeServiceFactory.getService({ isAuthenticated });
    
    if (!service) {
      console.error('No resume service available');
      return { success: false, error: 'Resume service not available' };
    }
    
    // Delete the resume
    const result = await service.deleteResume(resumeId);
    
    if (!result.success) {
      console.error('Failed to delete resume:', result.error);
      return { success: false, error: result.error || 'Failed to delete resume' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting resume:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List all available resumes
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Promise<Object>} - List of resumes
 */
export async function listResumes(isAuthenticated) {
  try {
    // Get the appropriate service
    const { service } = await ResumeServiceFactory.getService({ isAuthenticated });
    
    if (!service) {
      console.error('No resume service available');
      return { success: false, error: 'Resume service not available', resumes: [] };
    }
    
    // List all resumes
    const result = await service.listResumes();
    
    if (!result.success) {
      console.error('Failed to list resumes:', result.error);
      return { success: false, error: result.error || 'Failed to list resumes', resumes: [] };
    }
    
    return {
      success: true,
      resumes: result.data.resumes
    };
  } catch (error) {
    console.error('Error listing resumes:', error);
    return { success: false, error: error.message, resumes: [] };
  }
}

/**
 * Start a new resume by clearing any existing data
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @param {Object} currentResumeData - Current resume data (if any)
 * @param {string} currentTemplate - Current template (if any)
 * @param {string} currentResumeId - Current resume ID (if any)
 * @param {string} currentTitle - Current resume title (if any)
 * @returns {Promise<boolean>} - Whether the operation succeeded
 */
export async function startNewResume(
  isAuthenticated, 
  currentResumeData,
  currentTemplate,
  currentResumeId,
  currentTitle
) {
  try {
    // Mark that we're starting a new resume
    if (typeof window !== 'undefined') {
      localStorage.setItem('starting_new_resume', 'true');
      
      // Clear current resume ID and other related flags
      localStorage.removeItem('current_resume_id');
      localStorage.removeItem('editing_existing_resume');
      localStorage.removeItem('editing_resume_id');
    }
    
    // If authenticated, we might want to save the current data first
    if (isAuthenticated && currentResumeData && currentResumeId) {
      try {
        // Save current resume before clearing
        await saveResumeData(
          currentResumeData,
          isAuthenticated,
          currentTemplate,
          currentResumeId,
          currentTitle
        );
      } catch (error) {
        console.error('Error saving current resume before starting new:', error);
        // Continue anyway - not critical
      }
    }
    
    // For authenticated users, prepare a unique default title for the new resume
    if (isAuthenticated && typeof window !== 'undefined') {
      try {
        // Generate a default title for the new resume
        const defaultTitle = "Untitled Resume";
        
        // Validate the name to avoid duplicates
        const validationResult = await validateResumeName(defaultTitle);
        
        // If the name is not valid (already exists), use the suggested name
        if (!validationResult.isValid && validationResult.suggestedName) {
          console.log('📊 Using unique name for new resume:', validationResult.suggestedName);
          localStorage.setItem('new_resume_title', validationResult.suggestedName);
        } else {
          // Otherwise use the default title
          localStorage.setItem('new_resume_title', defaultTitle);
        }
      } catch (error) {
        console.error('Error generating unique resume name:', error);
        // If validation fails, just use a timestamp-based name
        const timestamp = new Date().toLocaleString().replace(/[/,:\s]/g, '-');
        localStorage.setItem('new_resume_title', `Untitled Resume - ${timestamp}`);
      }
    }
    
    // Clear localStorage data
    if (typeof window !== 'undefined') {
    localStorage.removeItem('modern_resume_data');
    localStorage.removeItem('resume_section_order');
    localStorage.removeItem('modern_resume_progress');
      localStorage.removeItem('imported_resume_data');
      localStorage.removeItem('imported_resume_override');
    }
    
    return true;
  } catch (error) {
    console.error('Error starting new resume:', error);
    return false;
  }
}

/**
 * Check if the user is in DB-only mode
 * This means they are authenticated and should only use the database for resume data
 * 
 * @returns {boolean} - Whether the user is in DB-only mode
 */
export function isDbOnlyMode() {
  // Only run in browser environment
  if (typeof window === 'undefined') return false;
  
  // Check if the DB-only mode flag is set
  const isDbOnly = localStorage.getItem('db_only_mode') === 'true';
  
  // Check if user is authenticated (using session storage or other indicators)
  const isAuthenticated = 
    localStorage.getItem('next-auth.session-token') || 
    document.cookie.includes('next-auth.session-token') ||
    localStorage.getItem('is_authenticated') === 'true';
  
  return isDbOnly && isAuthenticated;
}

/**
 * Set DB-only mode for the current user
 * This should be called after successful migration to database
 * 
 * @param {boolean} value - Whether to enable or disable DB-only mode
 * @returns {void}
 */
export function setDbOnlyMode(value = true) {
  if (typeof window === 'undefined') return;
  
  if (value) {
    localStorage.setItem('db_only_mode', 'true');
    localStorage.setItem('is_authenticated', 'true');
    console.log('📊 User is now in DB-only mode');
  } else {
    localStorage.removeItem('db_only_mode');
    console.log('📊 User is now in localStorage mode');
  }
}

/**
 * Clear DB-only mode when user signs out
 * This should be called when the user signs out to ensure they revert to localStorage
 * 
 * @returns {void}
 */
export function clearDbOnlyMode() {
  if (typeof window === 'undefined') return;
  
  // Clear DB-only mode flag
  localStorage.removeItem('db_only_mode');
  localStorage.removeItem('is_authenticated');
  
  // Also clear any resume ID to prevent conflicts
  localStorage.removeItem('current_resume_id');
  
  console.log('📊 Cleared DB-only mode on sign out');
}