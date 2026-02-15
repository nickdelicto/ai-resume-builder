import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Meta from '../components/common/Meta';
import ResumeStructuredData from '../components/common/ResumeStructuredData';
import { usePaywall } from '../components/common/PaywallModal';

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
    <>
      <Meta
        title="Improve Your Nursing Resume Today"
        description="Upload your existing nursing resume and let our AI enhance it. We'll analyze your RN resume and suggest improvements for clinical skills, certifications, and ATS compatibility."
        canonicalUrl="https://intelliresume.net/resume-import"
        keywords="improve nursing resume, enhance RN resume, import nurse resume, enhance healthcare resume, nursing resume analysis"
        ogImage="/og-image-resume.png"
      />
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
      backgroundColor: '#f8f9fc',
      fontFamily: 'var(--font-figtree), Figtree, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
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
          {jobTitle ? 'Importing Resume for Job Tailoring' : 'Preparing Your Import'}
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
            ? `We'll tailor your resume for the "${jobTitle}" position`
            : 'Setting things up...'}
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
    </>
  );
};

const ResumeImportPage = () => {
  const router = useRouter();
  const { status } = useSession();
  const { showPaywall } = usePaywall();
  const [isEligible, setIsEligible] = useState(true);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  
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
      
      // console.log('📊 ResumeImportPage - Job targeting detection:', {
      //   hasJobTargetingFlag,
      //   hasJobParam,
      //   isJobTargetingSource,
      //   hasExistingJobContext,
      //   preserveRequested: router.query.preserve_job_context === 'true',
      //   isJobTargeting
      // });
      
      if (!isJobTargeting) {
        // Clear job context if not in job targeting flow
        // console.log('📊 ResumeImportPage - Not in job targeting flow, clearing all data for fresh import');
        localStorage.removeItem('job_targeting_context');
        localStorage.removeItem('job_targeting_active');
      } else {
        // console.log('📊 ResumeImportPage - In job targeting flow, preserving job context data');
        // If we have job param in URL but no local storage, save it
        if (hasJobParam && !hasExistingJobContext) {
          try {
            const jobContext = JSON.parse(decodeURIComponent(router.query.job));
            localStorage.setItem('job_targeting_context', JSON.stringify(jobContext));
            localStorage.setItem('job_targeting_active', 'true');
            // console.log('📊 ResumeImportPage - Saved job context from URL parameter');
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
      
      // console.log('📊 ResumeImportPage - Reset resume-specific data for fresh import');
    } catch (error) {
      console.error('📊 ResumeImportPage - Error clearing resume data:', error);
    }
  };
  
  // Extract job context from URL parameters and set up the page when component mounts
  useEffect(() => {
    if (router.isReady) {
      // First clear existing resume data (but maintain job context if needed)
      clearResumeDataUnlessJobTargeting();

      // Handle job context passed in URL parameter
      if (router.query.job) {
        try {
          const jobContext = JSON.parse(decodeURIComponent(router.query.job));
          localStorage.setItem('job_targeting_context', JSON.stringify(jobContext));
          localStorage.setItem('job_targeting_active', 'true');
        } catch (error) {
          console.error('📊 ResumeImportPage - Error parsing job context from URL:', error);
        }
      }

      // Check creation eligibility for authenticated users
      if (status === 'authenticated') {
        fetch('/api/resume/check-creation-eligibility')
          .then(res => res.json())
          .then(data => {
            if (!data.eligible && data.error === 'resume_limit_reached') {
              setIsEligible(false);
              showPaywall('resume_creation');
            }
            setIsCheckingEligibility(false);
          })
          .catch(() => {
            // Fail open — backend enforces the real guard at save time
            setIsCheckingEligibility(false);
          });
      } else if (status === 'unauthenticated') {
        // Unauthenticated users skip the check; backend enforces at save time
        setIsCheckingEligibility(false);
      }
      // While status === 'loading', keep isCheckingEligibility true
    }
  }, [router.isReady, router.query, status]);

  const handleImportComplete = async (data) => {
    // console.log('📊 ResumeImportPage - Received import data, storing in localStorage:', data);
    
    // Check for required fields and data structure
    const dataValidation = {
      hasPersonalInfo: !!data.personalInfo,
      namePresent: !!data.personalInfo?.name,
      experienceArray: Array.isArray(data.experience),
      educationArray: Array.isArray(data.education),
      skillsArray: Array.isArray(data.skills)
    };
    // console.log('📊 ResumeImportPage - Data validation:', dataValidation);
    
    try {
      // Store the data in localStorage temporarily
      localStorage.setItem('imported_resume_data', JSON.stringify(data));
      localStorage.setItem('import_pending', 'true');
      localStorage.setItem('import_create_new', 'true'); // Always create new resume
      // console.log('📊 ResumeImportPage - Data successfully stored in localStorage');
      
      // For authenticated users, directly save the resume to the database
      let newResumeId = null;
      try {
        // Generate a base title for the imported resume
        const baseTitle = data.personalInfo?.name 
          ? `${data.personalInfo.name}'s Resume (Imported)` 
          : `Resume (Imported) - ${new Date().toLocaleDateString()}`;
        
        // Validate the name to avoid duplicates
        let finalTitle = baseTitle;
        try {
          const validateResponse = await fetch('/api/resume/validate-name', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: baseTitle,
              // No resumeId since this is a new resume
            }),
          });
          
          if (validateResponse.ok) {
            const validationResult = await validateResponse.json();
            if (!validationResult.isValid && validationResult.suggestedName) {
              // console.log('📊 ResumeImportPage - Duplicate name detected, using suggested name:', validationResult.suggestedName);
              finalTitle = validationResult.suggestedName;
            }
          }
        } catch (validationError) {
          console.error('📊 ResumeImportPage - Error validating resume name:', validationError);
          // Continue with the base title if validation fails
        }
        
        // console.log('📊 ResumeImportPage - Using final title for import:', finalTitle);
        
        // Make a direct API call to save the resume
        const response = await fetch('/api/resume/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resumeData: data,
            template: 'professional',
            title: finalTitle,
            isImport: true
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.resumeId) {
            // console.log('📊 ResumeImportPage - Successfully created new resume in database:', result.resumeId);
            newResumeId = result.resumeId;

            // Store the new resume ID in localStorage
            localStorage.setItem('import_new_resume_id', result.resumeId);
            localStorage.setItem('current_resume_id', result.resumeId);

            // CRITICAL: Clear creation flags — resume already exists in DB.
            // Without this, the builder's saveResumeData sees these flags,
            // forces resumeId=null, and creates a SECOND resume.
            localStorage.removeItem('import_create_new');
            localStorage.removeItem('import_pending');
          } else {
            console.error('📊 ResumeImportPage - API returned success: false or missing resumeId:', result);
          }
        } else {
          console.error('📊 ResumeImportPage - Error saving resume to database:', await response.text());
        }
      } catch (error) {
        console.error('📊 ResumeImportPage - Error during API call to save resume:', error);
      }
      
      // Enhanced job targeting detection
      const hasJobContext = localStorage.getItem('job_targeting_context') !== null;
      const isJobTargetingSource = router.query.source === 'job-targeting';
      const hasJobTargetingFlag = router.query.job_targeting === 'true';
      const hasJobParam = !!router.query.job;
      
      // Consider it job targeting if ANY of these conditions are true
      const isJobTargetingFlow = hasJobContext || isJobTargetingSource || hasJobTargetingFlag || hasJobParam;
      
      // Create the redirect URL, including the new resume ID if available
      let redirectUrl;
      if (newResumeId) {
        // If we have a new resume ID, include it in the redirect URL
        redirectUrl = isJobTargetingFlow
          ? `/new-resume-builder?source=import&resumeId=${newResumeId}&job_targeting=true`
          : `/new-resume-builder?source=import&resumeId=${newResumeId}`;
      } else {
        // Fallback to the old behavior if we couldn't create a new resume
        // But still include import=true to ensure the builder knows to create a new resume
        redirectUrl = isJobTargetingFlow
          ? '/new-resume-builder?source=import&import=true&job_targeting=true'
          : '/new-resume-builder?source=import&import=true';
      }
      
      // console.log('📊 ResumeImportPage - Redirecting to:', redirectUrl,
      //            'with new resumeId:', newResumeId,
      //            'job targeting:', isJobTargetingFlow);
      
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('📊 ResumeImportPage - Error storing data in localStorage:', error);
    }
  };

  // Show loading fallback while checking eligibility
  if (isCheckingEligibility) {
    return <LoadingFallback />;
  }

  // If not eligible, render nothing — PaywallModal is already visible via showPaywall
  if (!isEligible) {
    return (
      <>
        <Meta
          title="Import Your Nursing Resume | IntelliResume"
          description="Upload your existing nursing resume and let us enhance it. We'll analyze your RN resume and suggest improvements for clinical skills, certifications, and ATS compatibility."
          canonicalUrl="https://intelliresume.net/resume-import"
          keywords="import nursing resume, upload RN resume, improve nurse resume, enhance healthcare resume, nursing resume analysis"
          ogImage="/og-image-resume.png"
        />
      </>
    );
  }

  return (
    <>
      <Meta
        title="Improve Your Nursing Resume Today"
        description="Upload your existing nursing resume and let our AI enhance it. We'll analyze your RN resume and suggest improvements for clinical skills, certifications, and ATS compatibility."
        canonicalUrl="https://intelliresume.net/resume-import"
        keywords="import nursing resume, upload RN resume, improve nurse resume, enhance healthcare resume, nursing resume analysis"
        ogImage="/og-image-resume.png"
      />

      {/* Resume-specific structured data for SEO */}
      <ResumeStructuredData />

      <ImportFlow onComplete={handleImportComplete} />
    </>
  );
};

export default ResumeImportPage; 