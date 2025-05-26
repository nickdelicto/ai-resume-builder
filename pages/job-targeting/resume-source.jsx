import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const ResumeSourcePage = () => {
  const [jobContext, setJobContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Load job context when component mounts
  useEffect(() => {
    try {
      const savedContext = localStorage.getItem('job_targeting_context');
      if (!savedContext) {
        // No job context found, redirect back to job targeting page
        router.replace('/job-targeting');
        return;
      }
      
      setJobContext(JSON.parse(savedContext));
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading job context:', error);
      router.replace('/job-targeting');
    }
  }, [router]);
  
  const handleSourceSelection = (source) => {
    if (source === 'new') {
      try {
        // Start a new resume with job context
        localStorage.setItem('job_targeting_active', 'true');
        
        // For consistency with import path, also pass job context in URL
        const encodedJobContext = encodeURIComponent(JSON.stringify(jobContext));
        
        // Include multiple parameters to ensure robust context preservation
        // Added mode=builder to skip the options screen and go directly to builder
        router.push(`/new-resume-builder?source=job-targeting&job_targeting=true&preserve_job_context=true&mode=builder&job=${encodedJobContext}`);
        
        console.log('📊 ResumeSourcePage - Redirecting to new builder with job targeting context:', {
          title: jobContext?.title,
          hasDescription: !!jobContext?.description
        });
      } catch (error) {
        console.error('📊 ResumeSourcePage - Error navigating to new builder:', error);
        // Fallback to basic navigation if encoding fails
        router.push('/new-resume-builder?source=job-targeting&job_targeting=true&preserve_job_context=true&mode=builder');
      }
    } else if (source === 'import') {
      try {
        // Import an existing resume with job context
        localStorage.setItem('job_targeting_active', 'true');
        
        // To ensure job context is preserved even if localStorage is accessed between pages,
        // we'll also pass the job context as a URL parameter
        const encodedJobContext = encodeURIComponent(JSON.stringify(jobContext));
        
        // Include multiple parameters to ensure robust context preservation
        router.push(`/resume-import?source=job-targeting&job_targeting=true&preserve_job_context=true&job=${encodedJobContext}`);
        
        console.log('📊 ResumeSourcePage - Redirecting to import with job targeting context:', {
          title: jobContext?.title,
          hasDescription: !!jobContext?.description
        });
      } catch (error) {
        console.error('📊 ResumeSourcePage - Error navigating to import page:', error);
        // Fallback to basic navigation if encoding fails
        router.push('/resume-import?source=job-targeting&job_targeting=true&preserve_job_context=true');
      }
    }
  };
  
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '20px' }}>Loading...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Choose Resume Source | Modern Resume Builder</title>
        <meta 
          name="description" 
          content="Choose to create a new resume or import an existing one to tailor for your target job." 
        />
      </Head>
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
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
            Choose Your Starting Point
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#495057',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            We'll optimize your resume for: <strong>{jobContext?.title || 'Target Position'}</strong>
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
            onClick={() => handleSourceSelection('new')}
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
              Create New Resume
            </h3>
            <p style={{
              color: '#6c757d',
              fontSize: '15px',
              lineHeight: '1.5'
            }}>
              Start fresh with a new resume tailored for this specific job.
            </p>
          </div>

          {/* Import Resume Option */}
          <div 
            onClick={() => handleSourceSelection('import')}
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
              Upload your existing resume and we'll optimize it for this job.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResumeSourcePage; 