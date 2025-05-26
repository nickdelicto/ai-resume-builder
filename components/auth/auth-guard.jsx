import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { migrateLocalStorageResumesToDatabase } from '../../lib/resumeUtils';
import toast from 'react-hot-toast';

/**
 * AuthGuard component to handle authentication-dependent actions
 * like migrating localStorage resume data to the database
 */
export default function AuthGuard({ children }) {
  const { data: session, status } = useSession();
  const [hasMigrated, setHasMigrated] = useState(false);

  // Detect authentication state changes
  useEffect(() => {
    // Only proceed if we're newly authenticated and haven't migrated yet
    if (status === 'authenticated' && session?.user && !hasMigrated) {
      const handleAuthentication = async () => {
        // Check for any resume data in localStorage
        try {
          const migrationResult = await migrateLocalStorageResumesToDatabase();
          
          if (migrationResult) {
            toast.success('Your resume data has been saved to your account!');
            setHasMigrated(true);
          }
        } catch (error) {
          console.error('Failed to migrate resume data:', error);
        }
      };

      handleAuthentication();
    }
  }, [status, session, hasMigrated]);

  // Simply render children - the effects happen in the background
  return <>{children}</>;
} 