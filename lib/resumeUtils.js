/**
 * Utility functions for resume data management
 * Handles migration between localStorage and database
 */

/**
 * Migrates resume data from localStorage to the user's database record
 * Should be called after successful authentication
 * 
 * @returns {Promise<boolean>} True if migration was successful or not needed
 */
export async function migrateLocalStorageResumesToDatabase() {
  // Only run in browser environment
  if (typeof window === 'undefined') return false;
  
  // Check if resume data exists in localStorage
  const localResumeData = localStorage.getItem('modern_resume_data');
  if (!localResumeData) return false;
  
  try {
    const resumeData = JSON.parse(localResumeData);
    
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
    
    console.log('Migrating resume data from localStorage to database:', { title: finalTitle });
    
    // Save to database
    const response = await fetch('/api/resume/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: resumeData,
        title: finalTitle,
        template: localStorage.getItem('selected_resume_template') || 'ats'
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save resume');
    }
    
    const result = await response.json();
    console.log('Resume migrated successfully:', result);
    
    // Only remove from localStorage after confirmed save
    localStorage.removeItem('modern_resume_data');
    localStorage.removeItem('resume_section_order');
    
    return true;
  } catch (error) {
    console.error('Error migrating resume data:', error);
    return false;
  }
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
      // If from import, note that
      if (source === 'import') {
        return `${name}'s Imported Resume`;
      }
      return `${name}'s Resume`;
    }
  }
  
  // Fallback to source-based naming with date
  const date = new Date().toLocaleDateString();
  if (source === 'import') {
    return `Imported Resume - ${date}`;
  }
  return `Untitled Resume - ${date}`;
}

// Keep track of ongoing save operations to prevent duplicates
let pendingSaveOperations = {};

/**
 * Save resume data to the appropriate source based on authentication status
 * 
 * @param {Object} resumeData - The resume data to save
 * @param {boolean} isAuthenticated - Whether the user is authenticated 
 * @param {string} template - The template name
 * @param {string|null} resumeId - Optional existing resume ID to update
 * @param {string|null} resumeTitle - Optional custom title for the resume
 * @param {boolean} forceUpdate - Whether to force an update even if no changes detected
 * @returns {Promise<Object|boolean>} Save result with resumeId or boolean success
 */
export async function saveResumeData(resumeData, isAuthenticated, template, resumeId = null, resumeTitle = null, forceUpdate = false) {
  console.log('📊 saveResumeData called with:', { isAuthenticated, resumeId, template, forceUpdate });
  
  // Check for duplicate save operation in progress
  const operationKey = resumeId || 'new';
  if (pendingSaveOperations[operationKey]) {
    console.log('📊 Another save operation already in progress for resumeId:', resumeId);
    return pendingSaveOperations[operationKey];
  }

  // Create a promise for this save operation
  let savePromiseResolve, savePromiseReject;
  const savePromise = new Promise((resolve, reject) => {
    savePromiseResolve = resolve;
    savePromiseReject = reject;
  });
  
  // Store the promise in the pending operations
  pendingSaveOperations[operationKey] = savePromise;
  
  try {
    // Always save to localStorage for safety (backup in case of API failure)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('modern_resume_data', JSON.stringify(resumeData));
        localStorage.setItem('last_save_timestamp', Date.now().toString());
        console.log('📊 Saved to localStorage successfully');
        
        // Also store resumeId for consistency
        if (resumeId) {
          localStorage.setItem('current_resume_id', resumeId);
        }
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
    
    // If not authenticated, only save to localStorage
    if (!isAuthenticated) {
      console.log('📊 User not authenticated, saved to localStorage only');
      const result = { success: true, local: true };
      savePromiseResolve(result);
      return result;
    }
    
    // For authenticated users, save to the database
    try {
      // IMPORTANT: If the resumeId doesn't exist in the database but is in localStorage,
      // we should use the save endpoint instead of update to create a new resume
      // First, try the endpoint specified by resumeId
      const endpoint = resumeId 
        ? `/api/resume/update/${resumeId}` 
        : '/api/resume/save';
      
      console.log(`📊 Using endpoint: ${endpoint}`);
      
      // Prepare the request body
      const body = {
        data: resumeData,
        template: template || 'ats'
      };
      
      // Add title if provided
      if (resumeTitle) {
        body.title = resumeTitle;
      }
      
      // Add resumeId to body when using save endpoint (for duplicate prevention)
      if (resumeId && endpoint === '/api/resume/save') {
        body.resumeId = resumeId;
      }
      
      // Add timestamp to help prevent duplicate submissions
      body.timestamp = Date.now();
      
      // Make the API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      // If update endpoint returns 404 (resume not found), fallback to save endpoint
      if (response.status === 404 && endpoint.includes('/update/')) {
        console.log('📊 Resume not found with ID', resumeId, 'falling back to save endpoint');
        
        // Try the save endpoint instead - but keep the same ID!
        const saveResponse = await fetch('/api/resume/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...body,
            // CRITICAL FIX: Keep the same ID to maintain consistency
            forcedId: resumeId
          })
        });
        
        if (!saveResponse.ok) {
          const errorData = await saveResponse.json();
          console.error('📊 Save fallback failed:', errorData);
          const result = { success: false, error: errorData.error || 'Failed to save resume' };
          savePromiseResolve(result);
          return result;
        }
        
        // Parse the successful save response
        const saveResult = await saveResponse.json();
        console.log('📊 Save fallback successful:', saveResult);
        
        // Verify if the ID matches what we requested
        if (saveResult.resumeId !== resumeId) {
          console.warn('📊 Server created resume with different ID than requested. Expected:', resumeId, 'Got:', saveResult.resumeId);
        }
        
        // CRITICAL FIX: Update localStorage with the new resumeId immediately
        if (typeof window !== 'undefined' && saveResult.resumeId) {
          localStorage.setItem('current_resume_id', saveResult.resumeId);
          console.log('📊 Updated localStorage with resumeId from fallback save:', saveResult.resumeId);
        }
        
        // Clear any pending changes flag
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pending_resume_changes');
          localStorage.removeItem('pending_resume_timestamp');
        }
        
        const result = { 
          success: true, 
          resumeId: saveResult.resumeId || resumeId,
          message: 'Created new resume with same ID'
        };
        savePromiseResolve(result);
        return result;
      }
      
      // Handle API error responses
      if (!response.ok) {
        // If the server can't find KVStore table, it might be a schema error
        if (response.status === 500) {
          console.error('📊 Server error during save. If this is first use, the database might need migration.');
          
          // Flag that there was a server error but we saved locally
          const result = { 
            success: false, 
            local: true, 
            error: 'Server error, saved to localStorage only',
            resumeId: resumeId // Return the existing ID if we have one
          };
          savePromiseResolve(result);
          return result;
        }
        
        // For other errors, try to get more details
        try {
          const errorData = await response.json();
          console.error('📊 API error:', errorData);
          const result = { success: false, error: errorData.error || 'Failed to save resume' };
          savePromiseResolve(result);
          return result;
        } catch (e) {
          const result = { success: false, error: `Failed to save resume: ${response.status} ${response.statusText}` };
          savePromiseResolve(result);
          return result;
        }
      }
      
      // Parse the successful response
      const result = await response.json();
      console.log('📊 API response:', result);
      
      // CRITICAL FIX: Always ensure current_resume_id is updated in localStorage
      // immediately when we get a resumeId back from the server
      if (typeof window !== 'undefined' && result.resumeId) {
        localStorage.setItem('current_resume_id', result.resumeId);
        console.log('📊 Updated localStorage with resumeId from API:', result.resumeId);
      }
      
      // Clear any pending changes flag since we've successfully saved
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pending_resume_changes');
        localStorage.removeItem('pending_resume_timestamp');
      }
      
      // Return the resumeId for future reference
      const finalResult = { 
        success: true, 
        resumeId: result.resumeId || resumeId,
        message: result.message || 'Resume saved successfully'
      };
      savePromiseResolve(finalResult);
      return finalResult;
    } catch (error) {
      console.error('📊 Error saving resume data:', error);
      
      // Return that we only saved locally due to error
      const result = { 
        success: false, 
        local: true, 
        error: error.message || 'Network error, saved to localStorage only',
        resumeId: resumeId // Return the existing ID if we have one
      };
      savePromiseResolve(result);
      return result;
    }
  } finally {
    // Remove this operation from pending operations after a short delay
    // This ensures that rapid sequential calls still get debounced
    setTimeout(() => {
      delete pendingSaveOperations[operationKey];
    }, 500);
  }
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
 * Load resume data from the appropriate source based on authentication status
 * 
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @param {Object|null} initialData - Optional initial data passed from server
 * @returns {Promise<Object>} The resume data
 */
export async function loadResumeData(isAuthenticated, initialData = null) {
  // Check if we're starting a new resume
  if (typeof window !== 'undefined' && localStorage.getItem('starting_new_resume') === 'true') {
    console.log('📊 Starting new resume, clearing flag and returning empty template');
    // Clear the flag
    localStorage.removeItem('starting_new_resume');
    // Return empty template
    return null;
  }

  // If initial data is provided, use it
  if (initialData) {
    console.log('📊 Using provided initialData');
    return initialData;
  }
  
  // First check for any pending changes in localStorage regardless of authentication
  // This helps recover data after refresh before auto-save completed
  try {
    const pendingChanges = localStorage.getItem('pending_resume_changes') === 'true';
    const pendingTimestamp = localStorage.getItem('pending_resume_timestamp');
    const localData = localStorage.getItem('modern_resume_data');
    
    if (pendingChanges && pendingTimestamp && localData) {
      const timestamp = parseInt(pendingTimestamp, 10);
      const timeSincePending = Date.now() - timestamp;
      
      // If recent pending changes (within last 60 seconds), use the localStorage version
      if (timeSincePending < 60000 && localData) {
        console.log('📊 Found pending changes in localStorage from', timeSincePending, 'ms ago');
        
        // Clear pending flag after recovery
        localStorage.removeItem('pending_resume_changes');
        localStorage.removeItem('pending_resume_timestamp');
        
        const parsedData = JSON.parse(localData);
        return parsedData;
      }
    }
  } catch (error) {
    console.error('Error checking for pending changes:', error);
  }
  
  // For authenticated users, try to load from database
  if (isAuthenticated) {
    try {
      // Check if we have a resumeId in localStorage that might need to be created in the database
      const storedResumeId = localStorage.getItem('current_resume_id');
      const localData = localStorage.getItem('modern_resume_data');
      
      if (storedResumeId && localData) {
        // First try to load this specific resume from the database
        try {
          const specificResume = await getResumeById(storedResumeId);
          
          if (specificResume) {
            console.log('📊 Successfully loaded stored resumeId from database:', storedResumeId);
            return specificResume.data;
          } else {
            // If the resume with this ID doesn't exist in the database, create it
            console.log('📊 Resume with ID from localStorage not found in database, creating it now:', storedResumeId);
            
            const parsedLocalData = JSON.parse(localData);
            const template = localStorage.getItem('selected_resume_template') || 'modern';
            
            // Generate an appropriate title
            let title = 'Recovered Resume';
            if (parsedLocalData.personalInfo?.name) {
              title = `${parsedLocalData.personalInfo.name}'s Resume`;
            }
            
            // Create the resume in the database WITH THE SAME ID FROM LOCALSTORAGE
            const createResponse = await fetch('/api/resume/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                data: parsedLocalData,
                template,
                title,
                // CRITICAL FIX: Pass the ID from localStorage so it's used for the new resume
                forcedId: storedResumeId
              })
            });
            
            if (!createResponse.ok) {
              console.error('📊 Failed to create resume in database, using localStorage data');
            } else {
              const createResult = await createResponse.json();
              console.log('📊 Successfully created resume in database with ID:', createResult.resumeId);
              
              // Verify if the ID matches what we requested
              if (createResult.resumeId !== storedResumeId) {
                console.warn('📊 Server created resume with different ID than requested. Expected:', storedResumeId, 'Got:', createResult.resumeId);
              }
            }
            
            // Return the local data regardless of server create success
            // This ensures we show something even if server create fails
            return parsedLocalData;
          }
        } catch (specificError) {
          console.error('Error checking for specific resumeId:', specificError);
          // Continue to get latest resume as fallback
        }
      }
      
      // If no specific resumeId or error occurred, try to get the latest resume
      const databaseResume = await getLatestResumeFromDatabase();
      if (databaseResume) {
        console.log('📊 Loaded resume from database:', databaseResume.id);
        
        // Also save to localStorage as a backup for the PDF generation process
        localStorage.setItem('modern_resume_data', JSON.stringify(databaseResume.data));
        localStorage.setItem('selected_resume_template', databaseResume.template || 'ats');
        
        // Store the resumeId for consistency
        localStorage.setItem('current_resume_id', databaseResume.id);
        
        return databaseResume.data;
      }
    } catch (error) {
      console.error('Error loading from database:', error);
      // Fall back to localStorage if database load fails
    }
  }
  
  // For unauthenticated users or as fallback, load from localStorage
  try {
    const localData = localStorage.getItem('modern_resume_data');
    if (localData) {
      console.log('📊 Loaded resume from localStorage');
      return JSON.parse(localData);
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  
  // Return empty template if no data found
  return null;
}

/**
 * Load a specific resume by ID
 * 
 * @param {string} resumeId - The ID of the resume to load
 * @returns {Promise<Object|null>} The resume data or null if not found
 */
export async function getResumeById(resumeId) {
  if (!resumeId) return null;
  
  console.log('📊 Attempting to load resume by ID:', resumeId);
  
  try {
    // First check if there are pending changes in localStorage with this resumeId
    const storedId = localStorage.getItem('current_resume_id');
    const pendingChanges = localStorage.getItem('pending_resume_changes') === 'true';
    const pendingTimestamp = localStorage.getItem('pending_resume_timestamp');
    const localData = localStorage.getItem('modern_resume_data');
    
    // If resumeId matches and there are pending changes, prioritize localStorage version
    if (storedId === resumeId && pendingChanges && pendingTimestamp && localData) {
      const timestamp = parseInt(pendingTimestamp, 10);
      const timeSincePending = Date.now() - timestamp;
      
      // If changes are recent (within last 60 seconds), use the localStorage version
      if (timeSincePending < 60000) {
        console.log('📊 Found pending changes for resumeId', resumeId, 'in localStorage from', timeSincePending, 'ms ago');
        
        // Clear pending flag after recovery
        localStorage.removeItem('pending_resume_changes');
        localStorage.removeItem('pending_resume_timestamp');
        
        const parsedData = JSON.parse(localData);
        return {
          id: resumeId,
          data: parsedData,
          template: localStorage.getItem('selected_resume_template') || 'ats',
          recoveredFromLocalStorage: true
        };
      }
    }
    
    // If no valid localStorage data, fetch from database
    const response = await fetch(`/api/resume/get?id=${resumeId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Resume not found
      }
      throw new Error('Failed to fetch resume');
    }
    
    const { resume } = await response.json();
    
    if (resume) {
      console.log('📊 Successfully loaded resume from database:', resumeId);
      
      // Save to localStorage as backup
      localStorage.setItem('modern_resume_data', JSON.stringify(resume.data));
      localStorage.setItem('selected_resume_template', resume.template || 'ats');
      localStorage.setItem('current_resume_id', resumeId);
      
      return resume;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading resume by ID:', error);
    
    // As a last resort, check if we have this resume in localStorage
    try {
      const storedId = localStorage.getItem('current_resume_id');
      const localData = localStorage.getItem('modern_resume_data');
      
      if (storedId === resumeId && localData) {
        console.log('📊 Database fetch failed, but found matching resume in localStorage:', resumeId);
        const parsedData = JSON.parse(localData);
        return {
          id: resumeId,
          data: parsedData,
          template: localStorage.getItem('selected_resume_template') || 'ats',
          recoveredFromLocalStorage: true
        };
      }
    } catch (localError) {
      console.error('Error checking localStorage for resume:', localError);
    }
    
    return null;
  }
}

/**
 * Clear localStorage data to start a new resume
 * If user is authenticated, first save any pending changes to avoid data loss
 * 
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @param {Object} currentResumeData - Current resume data to save before clearing
 * @param {string} currentTemplate - Current template
 * @param {string} currentResumeId - Current resume ID
 * @param {string} currentResumeName - Current resume name
 * @returns {Promise<boolean>} Success indicator
 */
export async function startNewResume(isAuthenticated, currentResumeData = null, currentTemplate = null, currentResumeId = null, currentResumeName = null) {
  try {
    // DEBUG: Log localStorage state before any changes
    console.log('📊 DEBUG - BEFORE CLEARING - localStorage keys:', Object.keys(localStorage));
    console.log('📊 DEBUG - BEFORE CLEARING - current_resume_id:', localStorage.getItem('current_resume_id'));
    
    // If authenticated and we have resume data, save it first
    if (isAuthenticated && currentResumeData && currentResumeId) {
      console.log('📊 Saving current resume before starting new one, ID:', currentResumeId);
      
      try {
        await saveResumeData(
          currentResumeData,
          isAuthenticated,
          currentTemplate || 'ats',
          currentResumeId,
          currentResumeName
        );
        console.log('📊 Successfully saved current resume before starting new one');
      } catch (saveError) {
        console.error('📊 Error saving current resume before starting new one:', saveError);
        // Continue with clearing localStorage even if save fails
      }
    }
    
    // Set a flag to indicate we're starting a new resume
    localStorage.setItem('starting_new_resume', 'true');
    
    // IMPORTANT: First store the current resumeId to verify it's actually cleared
    const resumeIdBeforeClearing = localStorage.getItem('current_resume_id');
    
    // Clear all resume-related data from localStorage
    // First explicitly remove the current_resume_id to ensure it's cleared
    localStorage.removeItem('current_resume_id');
    
    // Then clear all other resume-related items
    localStorage.removeItem('modern_resume_data');
    localStorage.removeItem('resume_section_order');
    localStorage.removeItem('selected_resume_template');
    localStorage.removeItem('pending_resume_changes');
    localStorage.removeItem('pending_resume_timestamp');
    localStorage.removeItem('resume_progress');
    localStorage.removeItem('job_targeting_context');
    localStorage.removeItem('modern_resume_progress');
    
    // Double-check the current_resume_id is actually gone
    const resumeIdAfterClearing = localStorage.getItem('current_resume_id');
    
    // DEBUG: Check if clearing actually worked
    console.log('📊 DEBUG - AFTER CLEARING - localStorage keys:', Object.keys(localStorage));
    console.log('📊 DEBUG - AFTER CLEARING - resumeId before:', resumeIdBeforeClearing);
    console.log('📊 DEBUG - AFTER CLEARING - resumeId after:', resumeIdAfterClearing);
    console.log('📊 DEBUG - AFTER CLEARING - starting_new_resume flag:', localStorage.getItem('starting_new_resume'));
    
    if (resumeIdAfterClearing) {
      console.error('📊 ERROR: Failed to clear resumeId from localStorage!');
      // Try one more time with a different approach
      try {
        window.localStorage.removeItem('current_resume_id');
        console.log('📊 Second attempt to clear resumeId, now:', localStorage.getItem('current_resume_id'));
      } catch (e) {
        console.error('📊 Second attempt to clear resumeId failed:', e);
      }
    }
    
    console.log('📊 Cleared all resume data from localStorage to start new resume');
    return true;
  } catch (error) {
    console.error('Error starting new resume:', error);
    return false;
  }
}