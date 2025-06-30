import DbResumeService from './DbResumeService';
import LocalStorageResumeService from './LocalStorageResumeService';

// Singleton instances
let dbServiceInstance = null;
let localStorageServiceInstance = null;
let factoryInstance = null;
let currentService = null;

// Migration attempt tracking
const MAX_MIGRATION_ATTEMPTS = 3;
let migrationAttempts = 0;
let lastMigrationTime = 0;

/**
 * Service factory for resume services
 */
class ResumeServiceFactory {
  constructor() {
    this.localStorageService = new LocalStorageResumeService();
    this.dbService = new DbResumeService();
    this.isAuthenticated = false;
    this.migrationCompleted = false;
    this.currentResumeId = null;
  }

  /**
   * Initialize the factory with authentication state
   * @param {boolean} isAuthenticated Whether the user is authenticated
   * @param {string} resumeId Optional resume ID to use
   */
  initialize(isAuthenticated, resumeId = null) {
    console.log('📊 [ResumeServiceFactory] initialize called with:', {
      isAuthenticated,
      typeOfIsAuthenticated: typeof isAuthenticated,
      resumeId,
      previousIsAuthenticated: this.isAuthenticated
    });
    
    this.isAuthenticated = isAuthenticated;
    this.currentResumeId = resumeId;
    
    // Use dbOnlyMode flag to determine if we should use db service exclusively
    if (typeof window !== 'undefined' && localStorage.getItem('db_only_mode') === 'true' && isAuthenticated) {
      console.log('📊 [ResumeServiceFactory] initialized in DB-only mode');
      this.migrationCompleted = true;
    }
    
    console.log('📊 [ResumeServiceFactory] initialization complete, isAuthenticated set to:', this.isAuthenticated);
  }

  /**
   * Get the appropriate resume service based on authentication state and settings
   * @returns {ResumeService} The resume service to use
   */
  getService() {
    console.log('📊 [ResumeServiceFactory] getService instance method called, isAuthenticated:', this.isAuthenticated);
    
    // If authenticated, use DB service
    if (this.isAuthenticated) {
      console.log('📊 [ResumeServiceFactory] Returning DB service (user is authenticated)');
      return this.dbService;
    }
    
    // Otherwise use localStorage service
    console.log('📊 [ResumeServiceFactory] Returning localStorage service (user is not authenticated)');
    return this.localStorageService;
  }

  /**
   * Check if the current service is the database service
   * @returns {boolean} Whether the current service is the database service
   */
  isDbService() {
    return this.getService() === this.dbService;
  }

  /**
   * Check if the current service is the localStorage service
   * @returns {boolean} Whether the current service is the localStorage service
   */
  isLocalStorageService() {
    return this.getService() === this.localStorageService;
  }

  /**
   * Get the current resume ID
   * @returns {string|null} The current resume ID or null
   */
  getCurrentResumeId() {
    return this.currentResumeId;
  }

  /**
   * Set the current resume ID
   * @param {string} resumeId The resume ID to set
   */
  setCurrentResumeId(resumeId) {
    this.currentResumeId = resumeId;
  }

  /**
   * Special import handler for importing resumes
   * This ensures imports override existing resumes properly
   * 
   * @param {Object} importedData The imported resume data
   * @param {string} resumeId The target resume ID to update (or null for new)
   * @param {string} template The template to use
   * @param {string} title The resume title
   * @returns {Promise<Object>} Result of the save operation
   */
  async importResume(importedData, resumeId, template, title) {
    console.log('📊 ResumeServiceFactory: Handling import with special import handler');
    
    // When importing, always use the DB service for authenticated users
    if (this.isAuthenticated) {
      console.log('📊 ResumeServiceFactory: Using DB service for import (authenticated user)');
      
      try {
        // Force the save to update the existing resume
        const result = await this.dbService.saveResume(importedData, {
          resumeId: resumeId, // Use existing ID to override
          template: template || 'ats',
          title: title || 'Imported Resume',
          forceUpdate: true // Signal this is an import operation
        });
        
        if (result.success) {
          console.log('📊 ResumeServiceFactory: Import successful with DB service, ID:', result.data?.resumeId);
          // Update current ID
          this.setCurrentResumeId(result.data?.resumeId);
        }
        
        return result;
      } catch (error) {
        console.error('📊 ResumeServiceFactory: Import failed with DB service:', error);
        return { success: false, error: error.message || 'Import failed' };
      }
    } else {
      // For unauthenticated users, use localStorage service
      console.log('📊 ResumeServiceFactory: Using localStorage service for import (unauthenticated user)');
      return this.localStorageService.saveResume(importedData, {
        template: template || 'ats',
        title: title || 'Imported Resume'
      });
    }
  }

  /**
   * Check if data migration is needed from localStorage to DB
   * @returns {boolean} Whether migration is needed
   */
  needsMigration() {
    // Only need migration if authenticated, not already migrated, and have localStorage data
    if (!this.isAuthenticated || this.migrationCompleted) {
      return false;
    }
    
    // Check if the localStorage service has any resume data
    const hasLocalData = this.localStorageService.hasResumeData();
    
    // Extra check for the special flag
    const needsMigrationFlag = typeof window !== 'undefined' && 
      localStorage.getItem('needs_db_migration') === 'true';
    
    return hasLocalData || needsMigrationFlag;
  }

  /**
   * Migrate data from localStorage to database
   * @returns {Promise<Object>} The result of migration
   */
  async migrateToDatabase() {
    // Only proceed if migration is needed
    if (!this.needsMigration()) {
      console.log('No resumes found in source service to migrate');
      return { success: false, message: 'No data to migrate' };
    }
    
    try {
      // Get data from localStorage
      const resumeData = await this.localStorageService.loadCurrentResume();
      
      // Skip if no data found
      if (!resumeData.success || !resumeData.data) {
        console.log('No valid resume data found to migrate');
        return { success: false, message: 'No valid data to migrate' };
      }
      
      // Save to database
      const saveResult = await this.dbService.saveResume(resumeData.data.resumeData, {
        template: resumeData.data.meta?.template || 'ats',
        title: resumeData.data.meta?.title || 'My Resume'
      });
      
      if (saveResult.success) {
        console.log('Data migration successful, resumeId:', saveResult.data?.resumeId);
        
        // Update current ID and mark migration as completed
        this.setCurrentResumeId(saveResult.data?.resumeId);
        this.migrationCompleted = true;
        
        // Set db_only_mode flag
        if (typeof window !== 'undefined') {
          localStorage.setItem('db_only_mode', 'true');
          localStorage.setItem('needs_db_migration', 'false');
        }
        
        return { 
          success: true, 
          message: 'Migration successful', 
          resumeId: saveResult.data?.resumeId 
        };
      } else {
        console.error('Data migration failed:', saveResult.error);
        return { success: false, message: 'Migration failed', error: saveResult.error };
      }
    } catch (error) {
      console.error('Error during migration:', error);
      return { success: false, message: 'Migration error', error: error.message };
    }
  }

  /**
   * Get the current active service
   * @returns {Object|null} - The current service or null if not initialized
   */
  static getCurrentService() {
    return currentService;
  }
  
  /**
   * Reset migration circuit breaker
   * This can be called manually to allow migration to be attempted again
   * after the maximum attempts have been reached.
   */
  static resetMigrationCircuitBreaker() {
    migrationAttempts = 0;
    lastMigrationTime = 0;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('migration_circuit_broken');
      localStorage.removeItem('migration_in_progress');
      localStorage.removeItem('migration_start_time');
    }
    
    console.log('Migration circuit breaker has been reset');
  }

  /**
   * Static method to get a resume service instance
   * This creates or retrieves the singleton factory instance
   * 
   * @param {Object} options Configuration options
   * @param {boolean} options.isAuthenticated Whether the user is authenticated
   * @param {boolean} options.isImportOperation Whether this is an import operation
   * @returns {Promise<Object>} Object containing service instance and migration status
   */
  static async getService(options = {}) {
    console.log('📊 [ResumeServiceFactory] getService called with isAuthenticated:', options.isAuthenticated, {
      type: typeof options.isAuthenticated,
      timestamp: new Date().toISOString(),
      location: typeof window !== 'undefined' ? window.location.href : 'server-side',
      stack: new Error().stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace'
    });
    
    try {
      // Create factory instance if it doesn't exist
      if (!factoryInstance) {
        factoryInstance = new ResumeServiceFactory();
      }
      
      // Initialize with authentication state
      factoryInstance.initialize(options.isAuthenticated);
      
      // Check if we're in DB-only mode - highest priority
      const isDbOnly = typeof window !== 'undefined' && 
                      localStorage.getItem('db_only_mode') === 'true' && 
                      options.isAuthenticated;
      
      if (isDbOnly) {
        console.log('📊 [ResumeServiceFactory] Using DB service (DB-only mode)');
        
        // Ensure DB service is initialized
        await factoryInstance.dbService.initialize({ isAuthenticated: options.isAuthenticated });
        
        // Set the current service to DB service
        currentService = factoryInstance.dbService;
        
        // Mark migration as completed since we're in DB-only mode
        factoryInstance.migrationCompleted = true;
        
        // Check if DB service is available
        const isAvailable = factoryInstance.dbService.isAvailable();
        console.log('📊 [ResumeServiceFactory] DB service availability check in DB-only mode:', isAvailable);
        
        return { 
          service: currentService, 
          needsMigration: false,
          isDbService: true,
          isLocalStorageService: false
        };
      }
      
      // Check if we're in import mode
      const importPending = options.isImportOperation || 
        (typeof window !== 'undefined' && localStorage.getItem('import_pending') === 'true');
      
      // Special handling for imports when authenticated - always use DB service
      if (importPending && options.isAuthenticated) {
        console.log('📊 [ResumeServiceFactory] Using DB service for import operation');
        
        // Ensure DB service is initialized
        await factoryInstance.dbService.initialize({ isAuthenticated: options.isAuthenticated });
        
        // Set the current service to DB service
        currentService = factoryInstance.dbService;
        
        // Check if DB service is available
        const isAvailable = factoryInstance.dbService.isAvailable();
        console.log('📊 [ResumeServiceFactory] DB service availability check for import:', isAvailable);
        
        // Update the factory to be in DB-only mode for authenticated imports
        if (typeof window !== 'undefined') {
          localStorage.setItem('db_only_mode', 'true');
        }
        
        return {
          service: currentService, 
          needsMigration: false, // Skip migration during imports
          isDbService: true,
          isLocalStorageService: false,
          isImportOperation: true // Signal this is for an import
        };
      }
      
      // Get service from factory (this uses the normal priority logic)
      const service = factoryInstance.getService();
      
      // Initialize the service
      await service.initialize({ isAuthenticated: options.isAuthenticated });
      
      // Store current service reference
      currentService = service;
      
      // Check if migration is needed - skip during imports
      const needsMigration = !importPending && factoryInstance.needsMigration();
      
      // Check if service is available
      let isAvailable = true;
      if (service.constructor.name === 'DbResumeService' && typeof service.isAvailable === 'function') {
        isAvailable = service.isAvailable();
        console.log('📊 [ResumeServiceFactory] Service availability check:', isAvailable);
      }
      
      // Enhanced logging for service type
      const serviceType = service ? (service.constructor ? service.constructor.name : typeof service) : 'undefined';
      console.log('📊 [ResumeServiceFactory] Returning service of type:', serviceType);
      
      return { 
        service, 
        needsMigration,
        isDbService: service instanceof DbResumeService,
        isLocalStorageService: service instanceof LocalStorageResumeService,
        isImportOperation: importPending,
        serviceType // Add explicit serviceType field
      };
    } catch (error) {
      console.error('📊 [ResumeServiceFactory] Error getting service:', error);
      
      // Fall back to localStorage service in case of error
      if (factoryInstance && factoryInstance.localStorageService) {
        console.log('📊 [ResumeServiceFactory] Falling back to localStorage service due to error');
        return {
          service: factoryInstance.localStorageService, 
          needsMigration: false,
          isDbService: false,
          isLocalStorageService: true,
          error: error.message || 'Error getting service',
          serviceType: 'LocalStorageResumeService'
        };
      }
      
      // If localStorage service isn't available either, return null
      console.error('📊 [ResumeServiceFactory] No fallback service available');
      return { 
        service: null, 
        needsMigration: false, 
        error: 'No service available',
        isDbService: false,
        isLocalStorageService: false,
        serviceType: 'null'
      };
    }
  }

  /**
   * Static method to migrate data from localStorage to database
   * @returns {Promise<Object>} Result of migration
   */
  static async migrateData() {
    // Ensure factory instance exists
    if (!factoryInstance) {
      factoryInstance = new ResumeServiceFactory();
      factoryInstance.initialize(true); // Assume authenticated for migration
    }
    
    // Call instance method to perform migration
    return factoryInstance.migrateToDatabase();
  }
}

export default ResumeServiceFactory; 