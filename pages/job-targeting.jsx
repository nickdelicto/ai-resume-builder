import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/common/Meta';

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
        title="Tailor Your Resume to a Job | IntelliResume"
        description="Optimize your resume for a specific job posting. Our AI will analyze the job description and tailor your resume to match the requirements."
        canonicalUrl="https://intelliresume.net/job-targeting"
        keywords="resume tailoring, job application, ATS optimization, job targeting, resume matching"
        />
      
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
            Tailor Your Resume to a Job
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#495057',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Paste the job description below and we will optimize your resume for this specific position
          </p>
        </div>
        
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e9ecef',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="jobTitle"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#343a40'
                }}
              >
                Job Title*
              </label>
              <input
                type="text"
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label 
                htmlFor="jobDescription"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#343a40'
                }}
              >
                Job Description*
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                style={{
                  width: '100%',
                  height: '200px',
                  padding: '12px 15px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '16px',
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                required
              />
              <p style={{
                fontSize: '14px',
                color: '#6c757d',
                marginTop: '8px'
              }}>
                Include responsibilities, requirements, and any other details from the job posting
              </p>
            </div>
            
            {error && (
              <div style={{
                padding: '12px 15px',
                background: '#fff5f5',
                border: '1px solid #ffc9c9',
                borderRadius: '6px',
                color: '#e03131',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(to right, #1c7ed6, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px 25px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.7 : 1,
                  minWidth: '180px'
                }}
              >
                {isLoading ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
        
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px dashed #dee2e6'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#343a40',
            marginBottom: '10px'
          }}>
            How This Works
          </h3>
          <ol style={{
            textAlign: 'left',
            paddingLeft: '20px',
            color: '#495057',
            lineHeight: '1.6'
          }}>
            <li>Paste the job description</li>
            <li>Tell us if you want to create a new resume or import an existing one</li>
            <li>We will analyze the job description for key requirements</li>
            <li>Your resume will be optimized with targeted content for the job</li>
          </ol>
        </div>
      </div>
    </>
  );
};

export default JobTargetingPage; 