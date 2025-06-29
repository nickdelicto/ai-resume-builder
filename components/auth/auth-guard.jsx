import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { migrateToDatabase } from '../../lib/resumeUtils';
import toast from 'react-hot-toast';

/**
 * AuthGuard component to handle authentication-dependent actions
 * like migrating localStorage resume data to the database
 */
export default function AuthGuard({ children }) {
  const { data: session, status } = useSession();
  const [hasMigrated, setHasMigrated] = useState(false);
  const migrationToastIdRef = useRef('auth-migration-toast');

  // Detect authentication state changes
  useEffect(() => {
    // Only proceed if we're newly authenticated and haven't migrated yet
    if (status === 'authenticated' && session?.user && !hasMigrated) {
      const handleAuthentication = async () => {
        // Check for any resume data in localStorage that needs migration
        try {
          // Show initial loading toast
          toast.loading('Checking for resume data to sync...', { id: migrationToastIdRef.current });
          
          // Use the centralized migration function
          const migrationResult = await migrateToDatabase({
            source: 'auth_guard',
            onSuccess: ({ resumeId }) => {
              console.log('📊 [auth_guard] Migration succeeded with resumeId:', resumeId);
            },
            onError: (error) => {
              console.error('📊 [auth_guard] Migration error:', error);
            }
          });
          
          if (migrationResult.success) {
            if (migrationResult.code === 'MIGRATION_SUCCESS') {
              toast.success('Your resume data has been synced to your account!', { id: migrationToastIdRef.current });
            } else if (migrationResult.code === 'NO_DATA_TO_MIGRATE') {
              toast.dismiss(migrationToastIdRef.current);
            } else {
              toast.dismiss(migrationToastIdRef.current);
            }
            setHasMigrated(true);
          } else if (migrationResult.code === 'ALREADY_DB_ONLY') {
            // Already migrated, just dismiss the toast
            toast.dismiss(migrationToastIdRef.current);
            setHasMigrated(true);
          } else if (migrationResult.code === 'MIGRATION_IN_PROGRESS') {
            // Migration is already in progress elsewhere
            toast.loading('Resume data sync in progress...', { id: migrationToastIdRef.current });
          } else {
            // Some other error occurred
            toast.error('Failed to sync resume data. Will try again later.', { id: migrationToastIdRef.current });
          }
        } catch (error) {
          console.error('Failed to migrate resume data:', error);
          toast.error('Error syncing resume data', { id: migrationToastIdRef.current });
        }
      };

      handleAuthentication();
    }
  }, [status, session, hasMigrated]);

  // Simply render children - the effects happen in the background
  return <>{children}</>;
} 