import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Dynamically import ImportFlow with SSR disabled
const ImportFlow = dynamic(
  () => import('../components/ResumeBuilder/import/ImportFlow'),
  { ssr: false } // Disable SSR for this component
);

// Loading component with improved styling and job context awareness
const LoadingFallback = () => {
  // Check if we have job context in localStorage
  let jobTitle = null;
  if (typeof window !== 'undefined') {
    try {
      const jobContext = localStorage.getItem('job_targeting_context');
      if (jobContext) {
        const parsedContext = JSON.parse(jobContext);
        jobTitle = parsedContext.title;
      }
    } catch (e) {
      console.error('Error parsing job context in LoadingFallback:', e);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
      backgroundColor: '#f8f9fc',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Helvetica Neue, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '3.5rem',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #ffffff, #fcfcff)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)',
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
          fontSize: '32px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #212529, #1a73e8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px',
          letterSpacing: '-0.5px',
          position: 'relative',
          zIndex: 1
        }}>
          {jobTitle ? 'Resume Import for Job Tailoring' : 'Preparing Resume Import'}
        </h2>
        
        <p style={{
          fontSize: '18px',
          color: '#4e5968',
          marginBottom: '35px',
          lineHeight: '1.6',
          position: 'relative',
          zIndex: 1
        }}>
          {jobTitle 
            ? `We'll optimize your imported resume for the "${jobTitle}" position` 
            : 'Please wait while we initialize our AI-powered resume analyzer...'}
        </p>
        
        <div style={{
          position: 'relative',
          height: '12px',
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
        
        <div style={{
          fontSize: '15px',
          color: '#4e5968',
          marginTop: '25px',
          fontWeight: '500',
          position: 'relative',
          zIndex: 1
        }}>
          This typically takes just a few seconds...
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
};

const ResumeImportPage = () => {
  const router = useRouter();
  
  // Enhanced function to clear resume data while preserving job targeting context when appropriate
  const clearResumeDataUnlessJobTargeting = () => {
    try {
      // Comprehensive detection of job targeting workflow
      // Check URL parameters
      const hasJobTargetingFlag = router.query.job_targeting === 'true';
      const hasJobParam = !!router.query.job;
      const isJobTargetingSource = router.query.source === 'job-targeting';
      
      // Check existing localStorage state
      let hasExistingJobContext = false;
      try {
        const existingJobContext = localStorage.getItem('job_targeting_context');
        hasExistingJobContext = !!existingJobContext;
      } catch (e) {
        console.error('📊 ResumeImportPage - Error checking existing job context:', e);
      }
      
      // Consider it a job targeting workflow if ANY of these conditions are true
      const isJobTargeting = hasJobTargetingFlag || hasJobParam || isJobTargetingSource || 
                             (hasExistingJobContext && router.query.preserve_job_context === 'true');
      
      console.log('📊 ResumeImportPage - Job targeting detection:', {
        hasJobTargetingFlag,
        hasJobParam,
        isJobTargetingSource,
        hasExistingJobContext,
        preserveRequested: router.query.preserve_job_context === 'true',
        isJobTargeting
      });
      
      if (!isJobTargeting) {
        // Clear job context if not in job targeting flow
        console.log('📊 ResumeImportPage - Not in job targeting flow, clearing all data for fresh import');
        localStorage.removeItem('job_targeting_context');
        localStorage.removeItem('job_targeting_active');
      } else {
        console.log('📊 ResumeImportPage - In job targeting flow, preserving job context data');
        // If we have job param in URL but no local storage, save it
        if (hasJobParam && !hasExistingJobContext) {
          try {
            const jobContext = JSON.parse(decodeURIComponent(router.query.job));
            localStorage.setItem('job_targeting_context', JSON.stringify(jobContext));
            localStorage.setItem('job_targeting_active', 'true');
            console.log('📊 ResumeImportPage - Saved job context from URL parameter');
          } catch (error) {
            console.error('📊 ResumeImportPage - Error storing job context from URL:', error);
          }
        }
      }
      
      // Always clear these items for a fresh import, regardless of workflow
      localStorage.removeItem('modern_resume_data');
      localStorage.removeItem('modern_resume_progress');
      localStorage.removeItem('modern_resume_section_order');
      localStorage.removeItem('imported_resume_data');
      localStorage.removeItem('selected_resume_template');
      
      console.log('📊 ResumeImportPage - Reset resume-specific data for fresh import');
    } catch (error) {
      console.error('📊 ResumeImportPage - Error clearing resume data:', error);
    }
  };
  
  // Extract job context from URL parameters and set up the page when component mounts
  useEffect(() => {
    if (router.isReady) {
      console.log('📊 ResumeImportPage - Router ready, URL parameters:', router.query);
      
      // First clear existing resume data (but maintain job context if needed)
      clearResumeDataUnlessJobTargeting();
      
      // Handle job context passed in URL parameter
      if (router.query.job) {
        try {
          // Parse the job context from URL parameter
          const jobContext = JSON.parse(decodeURIComponent(router.query.job));
          console.log('📊 ResumeImportPage - Detected job context in URL:', {
            title: jobContext.title || jobContext.jobTitle,
            hasDescription: !!jobContext.description
          });
          
          // Store job context in localStorage for use after import completion
          localStorage.setItem('job_targeting_context', JSON.stringify(jobContext));
          localStorage.setItem('job_targeting_active', 'true');
        } catch (error) {
          console.error('📊 ResumeImportPage - Error parsing job context from URL:', error);
        }
      }
    }
  }, [router.isReady, router.query]);

  const handleImportComplete = (data) => {
    console.log('📊 ResumeImportPage - Received import data, storing in localStorage:', data);
    
    // Check for required fields and data structure
    const dataValidation = {
      hasPersonalInfo: !!data.personalInfo,
      namePresent: !!data.personalInfo?.name,
      experienceArray: Array.isArray(data.experience),
      educationArray: Array.isArray(data.education),
      skillsArray: Array.isArray(data.skills)
    };
    console.log('📊 ResumeImportPage - Data validation:', dataValidation);
    
    // Store the data in localStorage temporarily and redirect to the builder
    try {
      localStorage.setItem('imported_resume_data', JSON.stringify(data));
      console.log('📊 ResumeImportPage - Data successfully stored in localStorage');
      
      // Verify storage by reading it back
      const storedData = localStorage.getItem('imported_resume_data');
      console.log('📊 ResumeImportPage - Verification - Data retrieved from localStorage:', 
        storedData ? 'Successfully retrieved' : 'Failed to retrieve');
      
      // Enhanced job targeting detection
      const hasJobContext = localStorage.getItem('job_targeting_context') !== null;
      const isJobTargetingSource = router.query.source === 'job-targeting';
      const hasJobTargetingFlag = router.query.job_targeting === 'true';
      const hasJobParam = !!router.query.job;
      
      // Consider it job targeting if ANY of these conditions are true
      const isJobTargetingFlow = hasJobContext || isJobTargetingSource || hasJobTargetingFlag || hasJobParam;
      
      // Create the redirect URL with appropriate parameters
      const redirectUrl = isJobTargetingFlow
        ? '/new-resume-builder?source=import&job_targeting=true'
        : '/new-resume-builder?source=import';
      
      console.log('📊 ResumeImportPage - Redirecting to:', redirectUrl, 
                 'with job targeting:', isJobTargetingFlow,
                 'job context exists:', hasJobContext,
                 'source is job-targeting:', isJobTargetingSource);
      
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('📊 ResumeImportPage - Error storing data in localStorage:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Import Your Resume | Modern Resume Builder</title>
        <meta name="description" content="Import your existing resume and let our AI enhance it for better results. Upload PDF, DOCX, or TXT files." />
      </Head>
      
      <ImportFlow onComplete={handleImportComplete} />
    </>
  );
};

export default ResumeImportPage; 