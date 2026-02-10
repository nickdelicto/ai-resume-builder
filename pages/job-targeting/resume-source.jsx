import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../../components/common/Meta';

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
      <>
        <Meta
          title="Choose Resume Source | IntelliResume"
          description="Choose to create a new resume or import an existing one to tailor for your target job position."
          canonicalUrl="https://intelliresume.net/job-targeting/resume-source"
          keywords="resume source, create resume, import resume, job targeting, resume tailoring"
        />
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
      </>
    );
  }
  
  return (
    <>
      <Meta
        title="Choose Resume Source | IntelliResume"
        description="Choose to create a new nursing resume or import an existing one to tailor for your target job position."
        canonicalUrl="https://intelliresume.net/job-targeting/resume-source"
        keywords="resume source, create nursing resume, import resume, job targeting, resume tailoring"
      />

      <div className="rs-page">
        {/* Header */}
        <div className="rs-header">
          <h1 className="rs-title">How do you want to start?</h1>
          {jobContext?.title && (
            <div className="rs-job-badge">
              Tailoring for: <strong>{jobContext.title}</strong>
            </div>
          )}
        </div>

        {/* Steps indicator — step 2 active */}
        <div className="rs-steps">
          <div className="rs-step rs-step-done">
            <span className="rs-step-num">&#10003;</span>
            <span className="rs-step-label">Paste posting</span>
          </div>
          <div className="rs-step-divider" />
          <div className="rs-step rs-step-active">
            <span className="rs-step-num">2</span>
            <span className="rs-step-label">Choose resume</span>
          </div>
          <div className="rs-step-divider" />
          <div className="rs-step">
            <span className="rs-step-num">3</span>
            <span className="rs-step-label">Get tailored results</span>
          </div>
        </div>

        {/* Source cards */}
        <div className="rs-cards">
          {/* Build from Scratch */}
          <div
            className="rs-card"
            onClick={() => handleSourceSelection('new')}
          >
            <div className="rs-card-icon rs-card-icon-new">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 12L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="rs-card-text">
              <h3 className="rs-card-title">Start Fresh</h3>
              <p className="rs-card-desc">
                Build a new resume from scratch, guided step by step with your nursing experience
              </p>
            </div>
            <svg className="rs-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Import existing */}
          <div
            className="rs-card"
            onClick={() => handleSourceSelection('import')}
          >
            <div className="rs-card-icon rs-card-icon-import">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 8L12 4L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 4L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="rs-card-text">
              <h3 className="rs-card-title">Upload Existing Resume</h3>
              <p className="rs-card-desc">
                Upload a PDF or DOCX and we&apos;ll extract your experience, then tailor it for this job
              </p>
            </div>
            <svg className="rs-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rs-page {
          max-width: 680px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          font-family: var(--font-figtree), Figtree, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
        }

        .rs-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .rs-title {
          font-size: 26px;
          font-weight: 700;
          color: #1c7ed6;
          margin: 0 0 12px;
          line-height: 1.2;
        }

        .rs-job-badge {
          display: inline-block;
          padding: 6px 14px;
          background: #f0f7ff;
          border: 1px solid #dbeafe;
          border-radius: 20px;
          font-size: 14px;
          color: #374151;
        }

        .rs-job-badge strong {
          color: #1c7ed6;
        }

        /* Steps indicator */
        .rs-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 28px;
          padding: 14px 16px;
          background: #f0f7ff;
          border-radius: 12px;
          border: 1px solid #dbeafe;
        }

        .rs-step {
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0.4;
        }

        .rs-step-active {
          opacity: 1;
        }

        .rs-step-done {
          opacity: 0.7;
        }

        .rs-step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1c7ed6;
          color: white;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .rs-step-done .rs-step-num {
          background: #16a34a;
        }

        .rs-step-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
        }

        .rs-step-divider {
          width: 20px;
          height: 1px;
          background: #93c5fd;
          margin: 0 8px;
          flex-shrink: 0;
        }

        /* Source cards — horizontal layout with icon + text + arrow */
        .rs-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rs-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 14px;
          border: 1.5px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: all 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          min-height: 80px;
        }

        .rs-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
          transform: translateY(-2px);
        }

        .rs-card:active {
          transform: scale(0.98);
          border-color: #3b82f6;
          background: #f8fbff;
        }

        .rs-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .rs-card-icon-new {
          background: #eff6ff;
          color: #3b82f6;
        }

        .rs-card-icon-import {
          background: #f0fdf4;
          color: #16a34a;
        }

        .rs-card-text {
          flex: 1;
          min-width: 0;
        }

        .rs-card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px;
        }

        .rs-card-desc {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }

        .rs-card-arrow {
          color: #9ca3af;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }

        .rs-card:hover .rs-card-arrow {
          color: #3b82f6;
          transform: translateX(2px);
        }

        /* Tablet+ */
        @media (min-width: 640px) {
          .rs-page {
            padding: 40px 20px;
          }
          .rs-title {
            font-size: 32px;
          }
          .rs-card {
            padding: 24px;
          }
        }
      `}</style>
    </>
  );
};

export default ResumeSourcePage; 