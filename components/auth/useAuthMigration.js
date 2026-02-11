'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { migrateToDatabase } from '../../lib/resumeUtils';
import toast from 'react-hot-toast';

/**
 * Custom hook to trigger localStorage to database migration
 * when a user becomes authenticated
 */
export function useAuthMigration() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const migrationToastIdRef = useRef('auth-migration-hook-toast');
  const hasMigratedRef = useRef(false);
  
  useEffect(() => {
    // Only run when authentication status changes to authenticated
    if (status === 'authenticated' && session?.user) {
      console.log('🔄 User authenticated, checking for migration needs');
      
      // Skip if we've already migrated in this session
      if (hasMigratedRef.current) {
        console.log('🔄 Already migrated in this session, skipping');
        return;
      }
      
      // Add a short delay to avoid race conditions with other components
      const migrationTimeout = setTimeout(async () => {
        // Check if URL contains migrate=true parameter
        const shouldMigrate = router.query.migrate === 'true';
        const downloadRequested = router.query.action === 'download';
        
        // Check for download request in localStorage
        const pendingDownload = typeof window !== 'undefined' && 
                               localStorage.getItem('pending_resume_download') === 'true';
        
        // If we have a migration parameter or pending download, force migration
        if (shouldMigrate || downloadRequested || pendingDownload) {
          console.log('🔄 Migration trigger detected:', { 
            urlMigrate: shouldMigrate, 
            downloadAction: downloadRequested,
            pendingDownload
          });
          
          try {
            // Use the centralized migration function with force flag
            const migrationResult = await migrateToDatabase({
              force: true,
              source: 'auth_migration_hook',
              onSuccess: ({ resumeId }) => {
                console.log('🔄 Migration succeeded with resumeId:', resumeId);
                hasMigratedRef.current = true;
                
                // If this was a download request, redirect to the resume builder
                // with the new resumeId to complete the download
                if (downloadRequested || pendingDownload) {
                  // Clear the pending download flag
                  localStorage.removeItem('pending_resume_download');
                  
                  // Redirect to the resume builder with the new resumeId
                  router.push(`/resume-builder?resumeId=${resumeId}&download=true`);
                }
              }
            });
            
            if (migrationResult.success) {
              if (migrationResult.code === 'MIGRATION_SUCCESS') {
                toast.success("Resume synced! If you don't see it, refresh the page.", {
                  id: migrationToastIdRef.current,
                  duration: 6000,
                  style: {
                    background: '#14532d',
                    padding: '14px 18px',
                    color: '#fff',
                    fontWeight: '500',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
                  },
                  iconTheme: { primary: '#4ade80', secondary: '#14532d' }
                });
              }
            } else if (migrationResult.code !== 'ALREADY_DB_ONLY') {
              // Show error for anything except already being in DB-only mode
              toast.error('Failed to sync your resume data. Please try again.', { id: migrationToastIdRef.current });
            }
            
            // Clean up URL parameters
            if (shouldMigrate || downloadRequested) {
              const url = new URL(window.location.href);
              url.searchParams.delete('migrate');
              url.searchParams.delete('action');
              window.history.replaceState({}, '', url.toString());
            }
          } catch (error) {
            console.error('🔄 Error during migration:', error);
            toast.error('Error syncing your resume data', { id: migrationToastIdRef.current });
          }
        } else {
          // No explicit migration needed, check if flag is set
          const needsMigration = localStorage.getItem('needs_db_migration') === 'true';
          
          if (needsMigration) {
            console.log('🔄 Migration flag found in localStorage');
            
            // Use the centralized migration function
            const migrationResult = await migrateToDatabase({
              source: 'auth_migration_hook_flag'
            });
            
            if (migrationResult.success && migrationResult.code === 'MIGRATION_SUCCESS') {
              hasMigratedRef.current = true;
              toast.success("Resume synced! If you don't see it, refresh the page.", {
                id: migrationToastIdRef.current,
                duration: 6000,
                style: {
                  background: '#fff',
                  border: '1px solid #34a853',
                  padding: '14px 18px',
                  color: '#1d2129',
                  fontWeight: '500',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                },
                iconTheme: { primary: '#34a853', secondary: '#fff' }
              });
            }
          } else {
            // No explicit migration needed
            console.log('🔄 No migration flag found, skipping migration trigger');
          }
        }
      }, 500); // Small delay to avoid race conditions
      
      return () => clearTimeout(migrationTimeout);
    }
  }, [status, session, router.query]);
  
  return null;
}

export default useAuthMigration; 