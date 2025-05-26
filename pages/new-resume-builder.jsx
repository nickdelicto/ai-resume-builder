import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

// Dynamically import ModernResumeBuilder with SSR disabled
const ModernResumeBuilder = dynamic(
  () => import('../components/ModernResumeBuilder/ModernResumeBuilder'),
  { ssr: false } // Disable SSR for this component
);

// Update LoadingFallback to be more modern and show job targeting context if available
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
  const [showOptions, setShowOptions] = useState(true);
  const [jobContext, setJobContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const session = useSession();
  
  // Clear all resume data from localStorage
  const clearAllResumeData = () => {
    try {
      // Clear all resume-related localStorage items for a fresh start
      localStorage.removeItem('modern_resume_data');
      localStorage.removeItem('modern_resume_progress');
      localStorage.removeItem('modern_resume_section_order');
      localStorage.removeItem('job_targeting_context');
      localStorage.removeItem('imported_resume_data');
      localStorage.removeItem('selected_resume_template');
      console.log('📊 All resume builder data has been reset for a fresh start');
    } catch (error) {
      console.error('Error clearing resume data:', error);
    }
  };
  
  // Check if router is ready
  useEffect(() => {
    if (router.isReady) {
      console.log('📊 DEBUG - PAGE - new-resume-builder page initialized');
      console.log('📊 DEBUG - PAGE - localStorage keys:', Object.keys(localStorage));
      console.log('📊 DEBUG - PAGE - resumeId in localStorage:', localStorage.getItem('current_resume_id'));
      console.log('📊 DEBUG - PAGE - starting_new_resume flag:', localStorage.getItem('starting_new_resume'));
      
      // Get all relevant query parameters
      const { source, job_targeting, mode, job, preserve_job_context } = router.query;
      console.log('📊 URL params:', { source, job_targeting, mode, hasJobParam: !!job, preserveRequested: !!preserve_job_context });
      
      // If no specific parameters are provided, redirect to landing page
      // This makes /resume the primary entry point
      if (!source && !job_targeting && !mode) {
        router.replace('/');
        return;
      }
      
      // Don't show options if coming from import or if mode is builder
      if (source === 'import' || mode === 'builder') {
        setShowOptions(false);
      }
      
      // Enhanced job targeting detection with multiple sources
      const hasJobTargetingFlag = job_targeting === 'true';
      const hasJobParam = !!job;
      const isJobTargetingSource = source === 'job-targeting';
      const preserveRequested = preserve_job_context === 'true';
      
      // Check existing localStorage state
      let hasExistingJobContext = false;
      let existingJobContextData = null;
      try {
        const existingJobContext = localStorage.getItem('job_targeting_context');
        if (existingJobContext) {
          hasExistingJobContext = true;
          existingJobContextData = JSON.parse(existingJobContext);
        }
      } catch (e) {
        console.error('📊 NewResumeBuilderPage - Error checking existing job context:', e);
      }
      
      // Consider it a job targeting workflow if ANY of these conditions are true
      const isJobTargeting = hasJobTargetingFlag || hasJobParam || isJobTargetingSource || 
                            (hasExistingJobContext && preserveRequested);
                            
      console.log('📊 NewResumeBuilderPage - Job targeting detection:', {
        hasJobTargetingFlag,
        hasJobParam,
        isJobTargetingSource,
        hasExistingJobContext,
        preserveRequested,
        isJobTargeting
      });
      
      if (isJobTargeting) {
        // First try to get job context from URL parameter if available
        if (hasJobParam) {
          try {
            const jobContextFromUrl = JSON.parse(decodeURIComponent(job));
            console.log('📊 NewResumeBuilderPage - Found job context in URL param:', {
              title: jobContextFromUrl.title || jobContextFromUrl.jobTitle,
              hasDescription: !!jobContextFromUrl.description
            });
            
            // Save to localStorage and update state
            localStorage.setItem('job_targeting_context', JSON.stringify(jobContextFromUrl));
            localStorage.setItem('job_targeting_active', 'true');
            setJobContext(jobContextFromUrl);
          } catch (error) {
            console.error('📊 NewResumeBuilderPage - Error parsing job context from URL:', error);
            
            // Fallback to localStorage if URL parsing fails
            if (hasExistingJobContext) {
              setJobContext(existingJobContextData);
            }
          }
        } 
        // If no URL parameter but we have localStorage data
        else if (hasExistingJobContext) {
          console.log('📊 NewResumeBuilderPage - Using existing job context from localStorage:', {
            title: existingJobContextData.title || existingJobContextData.jobTitle,
            hasDescription: !!existingJobContextData.description
          });
          
          setJobContext(existingJobContextData);
          localStorage.setItem('job_targeting_active', 'true');
        } else {
          console.log('📊 NewResumeBuilderPage - Job targeting enabled but no context found');
          setJobContext(null);
        }
      } else {
        // For any other workflow, ensure job context is null and clear job targeting data
        setJobContext(null);
        console.log('📊 NewResumeBuilderPage - Job targeting disabled for this flow, clearing any previous job context', { source, job_targeting });
        
        // Clear job targeting context if we're starting a fresh workflow
        // This prevents job context from persisting when starting a new "Build from Scratch" workflow
        try {
          localStorage.removeItem('job_targeting_context');
          localStorage.removeItem('job_targeting_active');
          console.log('📊 NewResumeBuilderPage - Cleared job targeting data from localStorage');
        } catch (error) {
          console.error('📊 NewResumeBuilderPage - Error clearing job targeting data:', error);
        }
      }
      
      // Set loading to false once we've checked all conditions
      setIsLoading(false);
    }
  }, [router.isReady, router.query]);

  // Handle option selection
  const handleOption = (option) => {
    // First clear all localStorage data for a fresh start
    clearAllResumeData();
    
    // Reset state
    setJobContext(null);
    
    // Proceed with the selected workflow using clean URLs without extra parameters
    if (option === 'scratch') {
      // For scratch workflow, just show the builder directly
      setShowOptions(false);
      
      // Update URL to remove any query parameters that might cause workflow confusion
      router.replace('/new-resume-builder', undefined, { shallow: true });
    } else if (option === 'import') {
      // For import workflow, navigate to the import page with a clean URL
      router.push({
        pathname: '/resume-import',
        // Only pass necessary parameters, no job_targeting flags
        query: { source: 'new_builder' }
      });
    } else if (option === 'tailor') {
      // For job targeting workflow, navigate to the targeting page with appropriate flags
      router.push({
        pathname: '/job-targeting',
        query: { source: 'new_builder' }
      });
    }
  };
  
  // If still loading, show appropriate loading screen
  if (isLoading) {
    return <LoadingFallback jobTitle={jobContext?.title} />;
  }

  // Render starting options
  const renderOptions = () => (
    <div style={{
      maxWidth: '900px',
      margin: '40px auto',
      padding: '20px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1c7ed6',
          marginBottom: '15px'
        }}>
          Create Your Professional Resume
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#495057',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          Choose the best starting point for your resume creation journey
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {/* Build from Scratch Option */}
        <div 
          onClick={() => handleOption('scratch')}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px 25px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            border: '1px solid #e9ecef',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#1c7ed6';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.borderColor = '#e9ecef';
          }}
        >
          <div style={{
            width: '70px',
            height: '70px',
            backgroundColor: '#e7f5ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L12 20" stroke="#1c7ed6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 12L20 12" stroke="#1c7ed6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#343a40',
            marginBottom: '10px'
          }}>
            Build from Scratch
          </h3>
          <p style={{
            color: '#6c757d',
            fontSize: '15px',
            lineHeight: '1.5'
          }}>
            Together, we will create your outstanding resume- step by step!
          </p>
        </div>

        {/* Import Resume Option */}
        <div 
          onClick={() => handleOption('import')}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px 25px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            border: '1px solid #e9ecef',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#1c7ed6';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.borderColor = '#e9ecef';
          }}
        >
          <div style={{
            width: '70px',
            height: '70px',
            backgroundColor: '#e7f5ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16" stroke="#1c7ed6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 8L12 4L8 8" stroke="#1c7ed6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4L12 16" stroke="#1c7ed6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#343a40',
            marginBottom: '10px'
          }}>
            Import Existing Resume
          </h3>
          <p style={{
            color: '#6c757d',
            fontSize: '15px',
            lineHeight: '1.5'
          }}>
            Upload your resume and we will polish it up- make it stand out!
          </p>
        </div>

        {/* Tailor to Job Option */}
        <div 
          onClick={() => handleOption('tailor')}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px 25px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            border: '1px solid #e9ecef',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#1c7ed6';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.borderColor = '#e9ecef';
          }}
        >
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: '#fa5252',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '20px',
            textTransform: 'uppercase'
          }}>
            Coming Soon
          </div>
          <div style={{
            width: '70px',
            height: '70px',
            backgroundColor: '#e7f5ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11L12 14L22 4" stroke="#1c7ed6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="#1c7ed6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#343a40',
            marginBottom: '10px'
          }}>
            Tailor to Job Description
          </h3>
          <p style={{
            color: '#6c757d',
            fontSize: '15px',
            lineHeight: '1.5'
          }}>
            We will match your resume to the Job Posting!
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>
          {jobContext ? 
            `Tailor Resume for ${jobContext.title || jobContext.jobTitle || 'Job'} | Modern Resume Builder` : 
            'Modern Resume Builder | Create Your Professional Resume'}
        </title>
        <meta 
          name="description" 
          content={jobContext ? 
            `Optimize your resume for ${jobContext.title || jobContext.jobTitle} position with our AI-powered resume tailoring tool.` : 
            "Create a professional resume with our modern, AI-powered resume builder. Easy to use with customizable templates."}
        />
      </Head>
      
      {/* Render Options UI or the Resume Builder */}
      {!isLoading && (
        <>
          {showOptions ? (
            renderOptions()
          ) : (
            <ModernResumeBuilder 
              jobContext={jobContext}
              isJobTargeting={!!jobContext}
              isAuthenticated={!!session.data}
            />
          )}
        </>
      )}
    </>
  );
};

export default NewResumeBuilderPage; 