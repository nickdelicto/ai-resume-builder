import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import ResumeServiceFactory from '../services/ResumeServiceFactory';

// Create the context
const ResumeServiceContext = createContext(null);

/**
 * Provider component for resume service functionality
 * This component handles service initialization, migration, and provides
 * the service instance and related state to all child components.
 */
export function ResumeServiceProvider({ children }) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  // Service and migration state
  const [service, setService] = useState(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentResumeId, setCurrentResumeId] = useState(null);
  
  // Use ref to track migration attempts in this session
  const migrationAttemptsRef = useRef(0);
  const maxMigrationAttempts = 2;
  
  // Initialize the appropriate service based on authentication status
  useEffect(() => {
    const initService = async () => {
      try {
        console.log('📊 Initializing resume service, authenticated:', isAuthenticated);
        
        const { service: resumeService, needsMigration: migrationNeeded } = 
          await ResumeServiceFactory.getService({ isAuthenticated });
        
        setService(resumeService);
        
        // Only set needs migration if we haven't exceeded max attempts
        if (migrationNeeded && migrationAttemptsRef.current < maxMigrationAttempts) {
          setNeedsMigration(migrationNeeded);
        } else if (migrationNeeded) {
          console.log('📊 Migration needed but exceeded max attempts in this session');
          // Clear migration flags to prevent infinite loops
          if (typeof window !== 'undefined') {
            localStorage.removeItem('needs_db_migration');
            localStorage.removeItem('migration_in_progress');
          }
        }
        
        setIsInitialized(true);
        
        // Load current resume ID from localStorage
        if (typeof window !== 'undefined') {
          const storedId = localStorage.getItem('current_resume_id');
          if (storedId) {
            console.log('📊 Found resumeId in localStorage:', storedId);
            setCurrentResumeId(storedId);
          }
          
          // Check if there's a URL parameter requesting migration
          try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('migrate') === 'true' && isAuthenticated) {
              console.log('📊 Migration requested via URL parameter');
              
              // Only set if we haven't exceeded max attempts
              if (migrationAttemptsRef.current < maxMigrationAttempts) {
                setNeedsMigration(true);
              } else {
                console.log('📊 Migration requested but exceeded max attempts');
                // Clear the URL parameter
                const url = new URL(window.location.href);
                url.searchParams.delete('migrate');
                window.history.replaceState({}, '', url.toString());
              }
            }
          } catch (urlError) {
            console.error('Error parsing URL parameters:', urlError);
          }
          
          // Check if migration is stuck and reset if needed
          const migrationInProgress = localStorage.getItem('migration_in_progress') === 'true';
          const migrationStartTime = parseInt(localStorage.getItem('migration_start_time') || '0', 10);
          const currentTime = Date.now();
          
          if (migrationInProgress && (currentTime - migrationStartTime > 120000)) {
            console.log('📊 Detected stuck migration, resetting locks');
            localStorage.removeItem('migration_in_progress');
            localStorage.removeItem('migration_start_time');
          }
        }
      } catch (error) {
        console.error('Error initializing resume service:', error);
      }
    };
    
    initService();
  }, [isAuthenticated]);
  
  // Handle data migration when needed
  useEffect(() => {
    const performMigration = async () => {
      // Skip migration if already migrating
      if (isMigrating) return;
      
      // Skip migration if not authenticated or no service
      if (!isAuthenticated || !service) return;
      
      // Skip if migration not needed
      if (!needsMigration) return;
      
      // Skip if we've already tried too many times in this session
      if (migrationAttemptsRef.current >= maxMigrationAttempts) {
        console.log(`📊 Migration skipped - exceeded max attempts in this session (${maxMigrationAttempts})`);
        
        // Clear migration flags
        setNeedsMigration(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('needs_db_migration');
          localStorage.removeItem('migration_in_progress');
          
          // Show error to user
          toast.error('Unable to sync your resume data. Please try again later.', { 
            id: 'migration-toast',
            duration: 5000
          });
          
          // Clean URL parameter if present
          try {
            const url = new URL(window.location.href);
            if (url.searchParams.has('migrate')) {
              url.searchParams.delete('migrate');
              window.history.replaceState({}, '', url.toString());
            }
          } catch (e) {
            // Ignore URL errors
          }
        }
        return;
      }
      
      // Start migration
      setIsMigrating(true);
      migrationAttemptsRef.current++;
      
      try {
        toast.loading('Syncing your resume data...', { id: 'migration-toast' });
        
        console.log('📊 Starting migration of localStorage data to database');
        console.log(`📊 Migration attempt ${migrationAttemptsRef.current} of ${maxMigrationAttempts} in this session`);
        
        // Use the centralized migration function
        const result = await import('../resumeUtils').then(module => 
          module.migrateToDatabase({
            source: 'resume_service_context',
            onSuccess: ({ resumeId }) => {
              console.log('📊 Migration successful from context, resumeId:', resumeId);
              
              // Set the new resume ID
              setCurrentResumeId(resumeId);
            }
          })
        );
        
        if (result.success) {
          console.log('📊 Migration successful, resumeId:', result.data?.resumeId);
          
          // Set the new resume ID
          if (result.data?.resumeId) {
            setCurrentResumeId(result.data.resumeId);
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_resume_id', result.data.resumeId);
            }
          }
          
          toast.success('Your resume has been synced to your account! ⚠️ If you do not see it, REFRESH/RELOAD page.', { 
            id: 'migration-toast', 
            duration: 10000,
            style: {
              background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1), rgba(46, 204, 113, 0.1))',
              border: '1px solid rgba(52, 168, 83, 0.2)',
              padding: '16px',
              color: '#34a853'
            }
          });
          setNeedsMigration(false);
          
          // Re-initialize service to get the updated DB service
          const { service: updatedService } = 
            await ResumeServiceFactory.getService({ isAuthenticated });
          setService(updatedService);
          
          // Clean URL if it has the migrate parameter
          if (typeof window !== 'undefined') {
            try {
              const url = new URL(window.location.href);
              if (url.searchParams.has('migrate')) {
                url.searchParams.delete('migrate');
                window.history.replaceState({}, '', url.toString());
              }
            } catch (e) {
              // Ignore URL errors
            }
          }
        } else {
          console.error('📊 Migration failed:', result.error);
          
          // Show detailed error to user
          let errorMessage = 'Unable to sync your resume data.';
          if (result.error) {
            errorMessage += ` Error: ${result.error}`;
          }
          
          toast.error(errorMessage, { 
            id: 'migration-toast',
            duration: 5000
          });
          
          // If we've hit max attempts, clear the migration flag
          if (migrationAttemptsRef.current >= maxMigrationAttempts) {
            setNeedsMigration(false);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('needs_db_migration');
            }
          }
        }
      } catch (error) {
        console.error('📊 Error during migration:', error);
        toast.error('Sync error. Please try again later.', { id: 'migration-toast' });
      } finally {
        setIsMigrating(false);
      }
    };
    
    performMigration();
  }, [needsMigration, isAuthenticated, isMigrating, service, maxMigrationAttempts]);
  
  // Track changes to the resumeId in localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'current_resume_id' && e.newValue !== currentResumeId) {
        console.log('📊 current_resume_id changed in localStorage:', e.newValue);
        setCurrentResumeId(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentResumeId]);
  
  // Create context value
  const contextValue = {
    service,
    isDbService: isAuthenticated && service && service.constructor.name === 'DbResumeService',
    isLocalStorageService: service && service.constructor.name === 'LocalStorageResumeService',
    needsMigration,
    isMigrating,
    isInitialized,
    isAuthenticated,
    currentResumeId,
    setCurrentResumeId: (id) => {
      setCurrentResumeId(id);
      if (typeof window !== 'undefined' && id) {
        localStorage.setItem('current_resume_id', id);
      }
    },
    // Add ability to reset migration
    resetMigration: () => {
      migrationAttemptsRef.current = 0;
      ResumeServiceFactory.resetMigrationCircuitBreaker();
      setNeedsMigration(true);
    }
  };
  
  return (
    <ResumeServiceContext.Provider value={contextValue}>
      {children}
    </ResumeServiceContext.Provider>
  );
}

/**
 * Hook to use the resume service context
 * @returns {Object} Resume service context value
 */
export function useResumeService() {
  const context = useContext(ResumeServiceContext);
  if (!context) {
    throw new Error('useResumeService must be used within a ResumeServiceProvider');
  }
  return context;
}

export default ResumeServiceContext; 