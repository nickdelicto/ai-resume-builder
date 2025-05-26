import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamically import ModernResumeBuilder with SSR disabled
const ModernResumeBuilder = dynamic(
  () => import('../../../components/ModernResumeBuilder/ModernResumeBuilder'),
  { ssr: false } // Disable SSR for this component
);

/**
 * This page loads a resume from the database and displays it in the editor
 */
export default function EditResumePage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [template, setTemplate] = useState('ats');
  
  // Use a ref to track if we're navigating away internally
  const isNavigatingAwayRef = useRef(false);
  // Use state to pass to ModernResumeBuilder to ensure React detects changes
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  // Listen for route changes to disable autosave on navigation away
  useEffect(() => {
    const handleRouteChangeStart = () => {
      isNavigatingAwayRef.current = true;
      setIsNavigatingAway(true);
    };
    
    router.events.on('routeChangeStart', handleRouteChangeStart);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [router]);

  useEffect(() => {
    // Check authentication
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(`/resume/edit/${id}`));
      return;
    }

    // Only proceed if we have the ID and are authenticated
    if (id && status === 'authenticated') {
      const loadResumeData = async () => {
        try {
          setIsLoading(true);

          // Call API to get resume data
          const response = await fetch(`/api/resume/get/${id}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Resume not found');
            }
            throw new Error('Failed to load resume');
          }
          
          const resumeResponse = await response.json();
          
          // Set state with loaded data
          setResumeData(resumeResponse.data);
          setTemplate(resumeResponse.template || 'ats');
          
          // IMPORTANT: Reset the navigating away flag to enable auto-save
          isNavigatingAwayRef.current = false;
          setIsNavigatingAway(false);
          console.log('Edit page loaded, enabling autosave');
          
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading resume:', error);
          setError(error.message);
          toast.error(error.message);
          setIsLoading(false);
        }
      };

      loadResumeData();
    }
    
    // Cleanup function to handle proper unmounting
    return () => {
      // This will run when component unmounts
      isNavigatingAwayRef.current = true;
      setIsNavigatingAway(true);
      console.log('Edit page unmounting, disable autosave');
    };
  }, [id, status, router]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Loading Resume...</h2>
        <p>Please wait while we prepare your resume for editing</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Error Loading Resume</h2>
        <p>{error}</p>
        <button 
          onClick={() => router.push('/profile')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: 'var(--primary-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Profile
        </button>
      </div>
    );
  }

  // If data loaded successfully, render the ModernResumeBuilder
  return resumeData ? (
    <ModernResumeBuilder 
      initialData={resumeData} 
      isAuthenticated={!!session} 
      resumeId={id}
      isNavigatingAway={isNavigatingAway}
    />
  ) : null;
} 