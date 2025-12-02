import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useResumeService } from '../lib/contexts/ResumeServiceContext';

// Dynamically import ModernResumeBuilder with SSR disabled
const ModernResumeBuilder = dynamic(
  () => import('../components/ModernResumeBuilder/ModernResumeBuilder'),
  { ssr: false } // Disable SSR for this component
);

// Update LoadingFallback to be more modern and show job targeting context if available
// This component is used conditionally when isInitialized is false
const LoadingFallback = ({ jobTitle }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
    backgroundColor: '#f8f9fc'
  }}>
    <div style={{
      textAlign: 'center',
      padding: '3rem',
      borderRadius: '16px',
      background: 'white',
      boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
      width: '90%',
      maxWidth: '550px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '150px',
        height: '150px',
        background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.05), rgba(108, 92, 231, 0.05))',
        borderRadius: '0 0 0 100%',
        zIndex: 0
      }}></div>
      
      <h2 style={{
        fontSize: '28px',
        fontWeight: '800',
        color: '#1a73e8',
        marginBottom: '15px',
        position: 'relative',
        zIndex: 1
      }}>
        {jobTitle ? `Preparing Resume Tailoring` : `Loading Resume Builder`}
      </h2>
      
      <p style={{
        fontSize: '16px',
        color: '#4e5968',
        marginBottom: '30px',
        lineHeight: '1.6',
        position: 'relative',
        zIndex: 1
      }}>
        {jobTitle ? 
          `Setting up your resume tailoring for "${jobTitle}" position...` : 
          `Please wait while we prepare your resume builder experience...`}
      </p>
      
      <div style={{
        position: 'relative',
        height: '10px',
        width: '80%',
        margin: '0 auto',
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        borderRadius: '20px',
        overflow: 'hidden',
        zIndex: 1
      }}>
        <div style={{
          position: 'absolute',
          height: '100%',
          width: '30%',
          background: 'linear-gradient(90deg, #1a73e8, #6c5ce7)',
          borderRadius: '20px',
          animation: 'loadingAnimation 1.5s infinite'
        }}></div>
      </div>
      
      <style jsx>{`
        @keyframes loadingAnimation {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  </div>
);

const NewResumeBuilderPage = () => {
  const { data: _session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const router = useRouter();
  
  // Get resume service from context
  const { 
    service: _service, 
    isInitialized,
    currentResumeId,
    needsMigration: _needsMigration
  } = useResumeService();
  
  // Add state to track if user is navigating away
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  
  // Add state for potential imported data
  const [importedData, setImportedData] = useState(null);
  
  // Track the resumeId from URL parameters
  const [urlResumeId, setUrlResumeId] = useState(null);
  
  // Parse any query parameters
  useEffect(() => {
    if (router.isReady) {
      console.log('📊 NewResumeBuilderPage - Router ready, URL parameters:', router.query);
      
      // Check for resumeId in URL parameters - this takes priority
      if (router.query.resumeId) {
        console.log('📊 NewResumeBuilderPage - Found resumeId in URL:', router.query.resumeId);
        setUrlResumeId(router.query.resumeId);
        
        // If this is from a new resume creation, ensure we use this ID and clear any conflicting IDs
        if (router.query.source === 'new') {
          console.log('📊 NewResumeBuilderPage - This is a new resume, ensuring we use the correct ID');
          localStorage.setItem('current_resume_id', router.query.resumeId);
          
          // Clear any editing flags to prevent conflicts
          localStorage.removeItem('editing_resume_id');
          localStorage.removeItem('editing_existing_resume');
        }
        // If this is from an import, also update the current_resume_id in localStorage
        else if (router.query.source === 'import') {
          console.log('📊 NewResumeBuilderPage - Updating localStorage with resumeId from import:', router.query.resumeId);
          localStorage.setItem('current_resume_id', router.query.resumeId);
        }
      }
      
      // Check for import flag
      if (router.query.import === 'true') {
        console.log('📊 NewResumeBuilderPage - Import flag detected, ensuring import flags are set');
        
        // Check localStorage for imported data
        try {
          const importedData = localStorage.getItem('imported_resume_data');
          if (importedData) {
            setImportedData(JSON.parse(importedData));
            
            // Ensure the import_create_new flag is set
            localStorage.setItem('import_create_new', 'true');
            localStorage.setItem('import_pending', 'true');
          }
        } catch (error) {
          console.error('Error parsing imported data:', error);
        }
      }
      
      // If there's a job parameter, parse it
      if (router.query.job) {
        try {
          const jobContext = JSON.parse(decodeURIComponent(router.query.job));
          localStorage.setItem('job_targeting_context', JSON.stringify(jobContext));
        } catch (error) {
          console.error('Error parsing job context:', error);
        }
      }
    }
  }, [router.isReady, router.query]);

  // Before unloading, mark that we're navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      setIsNavigatingAway(true);
    };
    
    const handleRouteChange = () => {
      setIsNavigatingAway(true);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);
  
  return (
    <>
      <Head>
        <title>Resume Builder | Create Professional Resumes</title>
        <meta name="description" content="Build professional resumes with our AI-powered resume builder. Tailor your resume for job applications and get more interviews." />
        <link rel="canonical" href="https://intelliresume.net/new-resume-builder" />
      </Head>
      
      {/* Show loading state while initializing */}
      {!isInitialized ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-lg">Loading resume builder...</p>
          </div>
        </div>
      ) : (
            <ModernResumeBuilder 
        isAuthenticated={isAuthenticated} 
        initialData={importedData}
        resumeId={urlResumeId || currentResumeId}
        isNavigatingAway={isNavigatingAway}
      />
      )}
    </>
  );
};

export default NewResumeBuilderPage; 