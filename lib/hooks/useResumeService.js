import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ResumeServiceFactory from '../services/ResumeServiceFactory';
import { toast } from 'react-hot-toast';

/**
 * Hook to provide access to the appropriate resume service
 * and handle data migration between localStorage and database
 */
export function useResumeService() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  const [service, setService] = useState(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize the service when authentication status changes
  useEffect(() => {
    const initService = async () => {
      try {
        const { service: resumeService, needsMigration: migrationNeeded } = 
          await ResumeServiceFactory.getService({ isAuthenticated });
        
        setService(resumeService);
        setNeedsMigration(migrationNeeded);
        setIsInitialized(true);
        
        // Check if there's a URL parameter requesting migration
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('migrate') === 'true' && isAuthenticated) {
            console.log('Migration requested via URL parameter');
            setNeedsMigration(true);
          }
        }
      } catch (error) {
        console.error('Error initializing resume service:', error);
      }
    };
    
    initService();
  }, [isAuthenticated]);
  
  // Migrate data when needed
  useEffect(() => {
    const performMigration = async () => {
      if (needsMigration && isAuthenticated && !isMigrating) {
        setIsMigrating(true);
        
        try {
          toast.loading('Migrating your resume data...', { id: 'migration-toast' });
          
          const result = await ResumeServiceFactory.migrateData();
          
          if (result.success) {
            toast.success('Resume data migrated successfully!', { id: 'migration-toast' });
            setNeedsMigration(false);
            
            // Clean URL if it has the migrate parameter
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              if (url.searchParams.has('migrate')) {
                url.searchParams.delete('migrate');
                window.history.replaceState({}, '', url.toString());
              }
            }
            
            // Re-initialize service to get the updated DB service
            const { service: updatedService } = 
              await ResumeServiceFactory.getService({ isAuthenticated });
            setService(updatedService);
          } else {
            toast.error('Migration failed: ' + (result.message || 'Unknown error'), { id: 'migration-toast' });
          }
        } catch (error) {
          console.error('Error during migration:', error);
          toast.error('Migration error: ' + error.message, { id: 'migration-toast' });
        } finally {
          setIsMigrating(false);
        }
      }
    };
    
    performMigration();
  }, [needsMigration, isAuthenticated, isMigrating]);
  
  // Wrap service methods in callbacks
  const loadResume = useCallback(async (resumeId) => {
    if (!service) return { success: false, error: 'Service not initialized' };
    return service.loadResume(resumeId);
  }, [service]);
  
  const saveResume = useCallback(async (resumeData, options) => {
    if (!service) return { success: false, error: 'Service not initialized' };
    return service.saveResume(resumeData, options);
  }, [service]);
  
  const updateResume = useCallback(async (resumeId, resumeData, options) => {
    if (!service) return { success: false, error: 'Service not initialized' };
    return service.updateResume(resumeId, resumeData, options);
  }, [service]);
  
  const deleteResume = useCallback(async (resumeId) => {
    if (!service) return { success: false, error: 'Service not initialized' };
    return service.deleteResume(resumeId);
  }, [service]);
  
  const listResumes = useCallback(async () => {
    if (!service) return { success: false, error: 'Service not initialized', data: { resumes: [] } };
    return service.listResumes();
  }, [service]);
  
  return {
    service,
    isDbService: isAuthenticated && service && service.constructor.name === 'DbResumeService',
    isLocalStorageService: service && service.constructor.name === 'LocalStorageResumeService',
    needsMigration,
    isMigrating,
    isInitialized,
    isAuthenticated,
    
    // Service methods
    loadResume,
    saveResume,
    updateResume,
    deleteResume,
    listResumes
  };
}

export default useResumeService; 