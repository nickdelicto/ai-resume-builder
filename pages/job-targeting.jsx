import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/common/Meta';
import ResumeStructuredData from '../components/common/ResumeStructuredData';

const JobTargetingPage = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  // Clear all resume data when starting job targeting flow
  useEffect(() => {
    try {
      // Clear existing resume data for a fresh start
      localStorage.removeItem('modern_resume_data');
      localStorage.removeItem('modern_resume_progress');
      localStorage.removeItem('modern_resume_section_order');
      localStorage.removeItem('imported_resume_data');
      localStorage.removeItem('selected_resume_template');
      
      // Clear previous job targeting data
      localStorage.removeItem('job_targeting_context');
      localStorage.removeItem('job_targeting_active');
      
      console.log('📊 JobTargetingPage - Reset all resume data for fresh job targeting flow');
    } catch (error) {
      console.error('📊 JobTargetingPage - Error clearing resume data:', error);
    }
  }, []);

  // Pre-populate form fields from URL parameters (when coming from job listing page)
  useEffect(() => {
    if (router.isReady) {
      const fetchJobData = async () => {
        try {
          // Option 1: Fetch job data from API using slug (preferred method - no truncation!)
          if (router.query.jobSlug) {
            const slug = router.query.jobSlug;
            console.log('📊 JobTargetingPage - Fetching full job data for slug:', slug);
            
            setIsLoading(true);
            const response = await fetch(`/api/jobs/${slug}`);
            
            if (response.ok) {
              const data = await response.json();
              const job = data.data.job;
              
              // Build comprehensive job description with ALL data (no truncation!)
              let fullJobDescription = '';
              
              if (job.description) {
                fullJobDescription += job.description;
              }
              
              if (job.requirements) {
                fullJobDescription += '\n\nRequirements:\n' + job.requirements;
              }
              
              if (job.responsibilities) {
                fullJobDescription += '\n\nResponsibilities:\n' + job.responsibilities;
              }
              
              // Add pay range if available
              if (job.salaryMin || job.salaryMax) {
                const payMin = job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : '';
                const payMax = job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : '';
                const payType = job.salaryType || 'year';
                
                if (payMin && payMax) {
                  fullJobDescription += `\n\nPay Range: ${payMin} - ${payMax} per ${payType}`;
                } else if (payMin) {
                  fullJobDescription += `\n\nPay: ${payMin} per ${payType}`;
                } else if (payMax) {
                  fullJobDescription += `\n\nPay: Up to ${payMax} per ${payType}`;
                }
              }
              
              // Set form fields with COMPLETE data
              setJobTitle(job.title);
              setJobDescription(fullJobDescription);
              setIsLoading(false);
              
              console.log('📊 JobTargetingPage - Successfully pre-populated from API (FULL data, no truncation)');
              
              // Track analytics
              if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
                window.gtag('event', 'job_targeting_prepopulated', {
                  event_category: 'Job Targeting',
                  event_label: 'Pre-populated from job listing via API',
                  job_title: job.title,
                  employer: job.employer?.name,
                  location: `${job.city}, ${job.state}`
                });
              }
            } else {
              console.error('📊 JobTargetingPage - Failed to fetch job data:', response.status);
              setError('Failed to load job data. Please try again.');
              setIsLoading(false);
            }
          }
          // Option 2: Legacy support for direct URL params (backward compatibility)
          else if (router.query.title || router.query.description) {
            if (router.query.title) {
              const decodedTitle = decodeURIComponent(router.query.title);
              setJobTitle(decodedTitle);
              console.log('📊 JobTargetingPage - Pre-populated job title from URL (legacy)');
            }
            
            if (router.query.description) {
              const decodedDescription = decodeURIComponent(router.query.description);
              setJobDescription(decodedDescription);
              console.log('📊 JobTargetingPage - Pre-populated job description from URL (legacy)');
            }

            // Track analytics
            if (router.query.title && router.query.description) {
              if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
                window.gtag('event', 'job_targeting_prepopulated', {
                  event_category: 'Job Targeting',
                  event_label: 'Pre-populated from URL params (legacy)',
                  job_title: router.query.title
                });
              }
            }
          }
        } catch (error) {
          console.error('📊 JobTargetingPage - Error fetching/reading job data:', error);
          setError('There was an error loading the job information. Please try again.');
          setIsLoading(false);
        }
      };
      
      fetchJobData();
    }
  }, [router.isReady, router.query.jobSlug, router.query.title, router.query.description]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!jobTitle.trim()) {
      setError('Please enter a job title');
      return;
    }
    
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Store job information in localStorage
      const jobContext = {
        description: jobDescription,
        title: jobTitle,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('job_targeting_context', JSON.stringify(jobContext));
      localStorage.setItem('job_targeting_active', 'true');
      
      // Show resume source options after storing job context
      setIsLoading(false);
      
      // Redirect to resume source options
      router.push('/job-targeting/resume-source');
    } catch (error) {
      console.error('Error storing job context:', error);
      setError('There was an error saving the job information. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Meta
        title="Tailor Your Resume to a Job"
        description="Optimize your nursing resume for a specific job posting. Our AI analyzes the job description and tailors your clinical experience to match."
        canonicalUrl="https://intelliresume.net/job-targeting"
        keywords="nursing resume tailoring, RN job application, ATS optimization, job targeting, resume matching, nurse resume"
        />

      {/* Resume-specific structured data for SEO */}
      <ResumeStructuredData />

      <div className="jt-page">
        {/* Header */}
        <div className="jt-header">
          <h1 className="jt-title">
            Tailor Your Resume to a Job
          </h1>
          <p className="jt-subtitle">
            We&apos;ll highlight the clinical experience and skills that match what they&apos;re looking for
          </p>
        </div>

        {/* Steps indicator — compact, scannable */}
        <div className="jt-steps">
          <div className="jt-step jt-step-active">
            <span className="jt-step-num">1</span>
            <span className="jt-step-label">Paste posting</span>
          </div>
          <div className="jt-step-divider" />
          <div className="jt-step">
            <span className="jt-step-num">2</span>
            <span className="jt-step-label">Choose resume</span>
          </div>
          <div className="jt-step-divider" />
          <div className="jt-step">
            <span className="jt-step-num">3</span>
            <span className="jt-step-label">Get tailored results</span>
          </div>
        </div>

        {/* Form card */}
        <div className="jt-card">
          <form onSubmit={handleSubmit}>
            <div className="jt-field">
              <label htmlFor="jobTitle" className="jt-label">
                Job Title
              </label>
              <input
                type="text"
                id="jobTitle"
                className="jt-input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. ICU Registered Nurse"
                required
              />
            </div>

            <div className="jt-field">
              <label htmlFor="jobDescription" className="jt-label">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                className="jt-textarea"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Copy and paste the full job posting here. Requirements, qualifications, everything.."
                required
              />
              <p className="jt-hint">
                The more detail you include, the better we can match your nursing experience
              </p>
            </div>

            {error && (
              <div className="jt-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="jt-submit"
            >
              {isLoading ? 'Processing...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .jt-page {
          max-width: 680px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          font-family: var(--font-figtree), Figtree, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
        }

        .jt-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .jt-title {
          font-size: 26px;
          font-weight: 700;
          color: #1c7ed6;
          margin: 0 0 8px;
          line-height: 1.2;
        }

        .jt-subtitle {
          font-size: 15px;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        /* Steps indicator */
        .jt-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 24px;
          padding: 14px 16px;
          background: #f0f7ff;
          border-radius: 12px;
          border: 1px solid #dbeafe;
        }

        .jt-step {
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0.5;
        }

        .jt-step-active {
          opacity: 1;
        }

        .jt-step-num {
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

        .jt-step-active .jt-step-num {
          background: #1c7ed6;
        }

        .jt-step-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
        }

        .jt-step-divider {
          width: 20px;
          height: 1px;
          background: #93c5fd;
          margin: 0 8px;
          flex-shrink: 0;
        }

        /* Form card */
        .jt-card {
          background: white;
          border-radius: 14px;
          padding: 24px 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }

        .jt-field {
          margin-bottom: 20px;
        }

        .jt-label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
        }

        .jt-input {
          width: 100%;
          padding: 12px 14px;
          min-height: 48px;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          font-size: 16px;
          color: #1f2937;
          background: #fafafa;
          transition: all 0.15s ease;
          outline: none;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        .jt-input:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .jt-textarea {
          width: 100%;
          min-height: 160px;
          padding: 12px 14px;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          font-size: 16px;
          font-family: inherit;
          color: #1f2937;
          background: #fafafa;
          resize: vertical;
          transition: all 0.15s ease;
          outline: none;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        .jt-textarea:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .jt-hint {
          font-size: 13px;
          color: #9ca3af;
          margin: 6px 0 0;
        }

        .jt-error {
          padding: 12px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
        }

        .jt-submit {
          display: block;
          width: 100%;
          padding: 14px 24px;
          min-height: 52px;
          background: linear-gradient(135deg, #1c7ed6, #3b82f6);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .jt-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .jt-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #1971c2, #2563eb);
          box-shadow: 0 4px 14px rgba(28, 126, 214, 0.3);
        }

        .jt-submit:active:not(:disabled) {
          transform: scale(0.98);
          box-shadow: 0 2px 8px rgba(28, 126, 214, 0.2);
        }

        /* Tablet+ */
        @media (min-width: 640px) {
          .jt-page {
            padding: 40px 20px;
          }
          .jt-title {
            font-size: 32px;
          }
          .jt-subtitle {
            font-size: 17px;
          }
          .jt-card {
            padding: 32px 28px;
          }
          .jt-submit {
            width: auto;
            min-width: 200px;
            display: block;
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
};

export default JobTargetingPage; 