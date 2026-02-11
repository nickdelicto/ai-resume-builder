import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/ResumeLanding.module.css';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Meta from '../components/common/Meta';
import Image from 'next/image';
import StickyHeader from '../components/common/StickyHeader';
import ResumeStructuredData from '../components/common/ResumeStructuredData';
import { usePaywall } from '../components/common/PaywallModal';

/**
 * Resume Builder Landing Page
 * Dedicated landing page for the AI resume builder tool
 * Contains resume-specific SEO and structured data
 */

// Add a styled component for highlighted words
const HighlightedWord = ({ children }) => (
  <span className={styles.highlightedWord}>
    {children}
  </span>
);

const ResumeBuilderPage = () => {
  const router = useRouter();
  const [activeProcessTab, setActiveProcessTab] = useState('build');
  const [activeDemoTab, setActiveDemoTab] = useState('build');
  const { data: _session, status } = useSession();
  const { showPaywall } = usePaywall();
  
  // Add state for tracking scroll position
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  
  // Add debug logging for localStorage on component mount
  useEffect(() => {
    console.log('📊 DEBUG - RESUME-BUILDER - Page initialized');
    console.log('📊 DEBUG - RESUME-BUILDER - localStorage keys:', Object.keys(localStorage));
    console.log('📊 DEBUG - RESUME-BUILDER - resumeId in localStorage:', localStorage.getItem('current_resume_id'));
    console.log('📊 DEBUG - RESUME-BUILDER - starting_new_resume flag:', localStorage.getItem('starting_new_resume'));
    
    // Check if we have the starting_new_resume flag set
    if (localStorage.getItem('starting_new_resume') === 'true') {
      console.log('📊 DEBUG - RESUME-BUILDER - Found starting_new_resume flag, clearing it');
      
      // Critical: Also make sure resume ID is cleared again
      if (localStorage.getItem('current_resume_id')) {
        console.log('📊 DEBUG - RESUME-BUILDER - resumeId still exists, clearing it again');
        localStorage.removeItem('current_resume_id');
      }
      
      // Now clear the flag
      localStorage.removeItem('starting_new_resume');
      
      // Verify clearing worked
      console.log('📊 DEBUG - RESUME-BUILDER - After clearing flag, localStorage keys:', Object.keys(localStorage));
      console.log('📊 DEBUG - RESUME-BUILDER - After clearing flag, resumeId in localStorage:', localStorage.getItem('current_resume_id'));
      
      // If resumeId is still somehow there, try one more time with a different approach
      if (localStorage.getItem('current_resume_id')) {
        console.error('📊 DEBUG - RESUME-BUILDER - resumeId STILL exists after clearing, trying alternative method');
        try {
          window.localStorage.removeItem('current_resume_id');
          console.log('📊 DEBUG - RESUME-BUILDER - After second clearing attempt, resumeId:', localStorage.getItem('current_resume_id'));
        } catch (e) {
          console.error('📊 DEBUG - RESUME-BUILDER - Failed to clear resumeId with alternative method:', e);
        }
      }
    }
  }, []);
  
  // Add effect to handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header after scrolling down 300px
      const scrollPosition = window.scrollY;
      if (scrollPosition > 300) {
        setShowStickyHeader(true);
      } else {
        setShowStickyHeader(false);
      }
    };
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Navigation handlers
  const handleBuildNewClick = async () => {
    // Show loading toast if available
    let toastId;
    if (typeof toast !== 'undefined') {
      toastId = toast.loading('Creating new resume...');
    }
    
    try {
      // If user is authenticated, create a new blank resume in the database
      if (status === 'authenticated') {
        // Check if user has reached their resume creation limit
        try {
          const eligibilityRes = await fetch('/api/resume/check-creation-eligibility');
          const eligibilityData = await eligibilityRes.json();
          if (!eligibilityData.eligible) {
            if (toastId) toast.dismiss(toastId);
            showPaywall('resume_creation');
            return;
          }
        } catch (e) {
          console.error('Error checking creation eligibility:', e);
        }

        console.log('Creating new blank resume in database for authenticated user');

        // Set a flag to prevent multiple resume creations
        localStorage.setItem('creating_new_resume', 'true');
        localStorage.setItem('starting_new_resume', 'true');
        
        // Default blank resume template
        const blankResumeData = {
          personalInfo: {
            name: '',
            email: '',
            phone: '',
            location: '',
            linkedin: '',
            website: ''
          },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          additional: {
            certifications: [],
            projects: [],
            languages: [],
            volunteer: [],
            awards: []
          }
        };
        
        // Save the blank resume to the database
        const response = await fetch('/api/resume/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resumeData: blankResumeData,
            template: 'ats',  // Default template
            title: 'My Resume'  // Default title
          }),
        });
        
        const result = await response.json();

        if (!response.ok || result.error === 'resume_limit_reached') {
          if (toastId) toast.dismiss(toastId);
          showPaywall('resume_creation');
          return;
        }
        
        if (result.success && result.resumeId) {
          console.log('Successfully created new resume with ID:', result.resumeId);
          
          // Clear any existing resume IDs from localStorage
          localStorage.removeItem('current_resume_id');
          localStorage.removeItem('editing_resume_id');
          localStorage.removeItem('editing_existing_resume');
          
          // Set the new resume ID in localStorage
          localStorage.setItem('current_resume_id', result.resumeId);
          
          // Navigate to the builder with the new resumeId
          router.push(`/new-resume-builder?resumeId=${result.resumeId}&source=new`);
          
          if (toastId) {
            toast.success('Created new resume!', { id: toastId });
          }
          
          // Clear the creation flags after a short delay to ensure they're still available during navigation
          setTimeout(() => {
            localStorage.removeItem('creating_new_resume');
            localStorage.removeItem('starting_new_resume');
          }, 2000);
          
          return;
        }
      }
      
      // For unauthenticated users or if API call fails, use the original behavior
      router.push('/builder/new');
      
      if (toastId) {
        toast.success('Starting new resume!', { id: toastId });
      }
    } catch (error) {
      console.error('Error creating new resume:', error);
      
      // Clear the creation flags in case of error
      localStorage.removeItem('creating_new_resume');
      localStorage.removeItem('starting_new_resume');
      
      // Fallback to original behavior
      router.push('/builder/new');
      
      if (toastId) {
        toast.error('Something went wrong. Starting with a blank resume.', { id: toastId });
      }
    }
  };
  const handleImproveClick = () => router.push('/builder/import');
  const handleTailorClick = () => router.push('/builder/target');
  
  return (
    <>
      {/* Resume-specific SEO meta tags */}
      <Meta
        title="AI Resume Builder - Build, Improve & Tailor Your Resume"
        description="Build, improve, or tailor your resume with AI. Smart resume builder with ATS-friendly templates, clinical skills sections, and one-click PDF downloads. Free to start."
        keywords="AI resume builder, resume builder, ATS resume, resume templates, build resume online, tailor resume, improve resume"
        canonicalUrl="https://intelliresume.net/resume-builder"
        ogImage="/og-image.png"
      />
      
      {/* Resume-specific structured data (SoftwareApplication, Product, FAQ schemas) */}
      <ResumeStructuredData />
      
      {/* Sticky Header that appears on scroll */}
      {showStickyHeader && <StickyHeader />}
      
      {/* Loading state */}
      {status === 'loading' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.05)',
          color: 'var(--text-medium)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          Loading...
        </div>
      )}
      
      <div className={styles.landingPage}>
        {/* Hero Section */}
        {renderHeroSection()}
        
        {/* Process Flow Section */}
        {renderProcessSection()}
        
        {/* Demo Section Placeholder */}
        {renderDemoSection()}
        
        {/* Features & Benefits Section */}
        {renderFeaturesSection()}
        
        {/* Final CTA Section */}
        {renderCTASection()}
      </div>
      
      <style jsx global>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        @keyframes gradientFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .animated-button {
          animation: gradientFlow 3s ease infinite;
        }
        
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
          
          .animated-button {
            padding: 12px 20px !important;
            font-size: 15px !important;
            width: auto !important;
            max-width: none !important;
            min-width: 0 !important;
          }
        }
      `}</style>
    </>
  );
  
  // Component rendering functions
  function renderHeroSection() {
    return (
      <section style={{
        padding: '80px 20px',
        background: 'linear-gradient(135deg, #f8f9fc, #edf2ff)',
        borderRadius: '0 0 20px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(26, 115, 232, 0.05), transparent 70%)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(108, 92, 231, 0.05), transparent 70%)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Hero text content */}
        <div style={{
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          <h1 className={styles.heroHeading}>
            Create a Resume That Gets You Hired. Fast!
          </h1>
          
          {/* Improved spacing and structure for the highlighted words */}
          <div className={styles.bodyText} style={{
            fontSize: '22px',
            maxWidth: '800px',
            margin: '24px auto 0',
            lineHeight: '1.7',
            letterSpacing: '0.01em',
          }}>
            <span style={{ display: 'block', marginBottom: '8px' }}>
              Our Powerful, Intelligent AI <HighlightedWord>builds</HighlightedWord>, <HighlightedWord>improves</HighlightedWord>, and <HighlightedWord>tailors</HighlightedWord> 
            </span>
            <span>your resume to get you that interview. ASAP!</span>
          </div>
          
          <div style={{
            display: 'inline-block',
            margin: '28px auto 0',
            padding: '10px 20px',
            background: 'rgba(18, 184, 134, 0.15)',
            color: 'rgba(18, 184, 134, 1)',
            borderRadius: '20px',
            fontWeight: '600',
            fontSize: '15px',
            border: '1px solid rgba(18, 184, 134, 0.3)',
            boxShadow: '0 2px 8px rgba(18, 184, 134, 0.1)'
          }}>
            <span style={{ marginRight: '6px' }}>✓</span>
            No signup or credit card required to start!
          </div>
        </div>
        
        {/* Three entry cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          marginTop: '30px'
        }}>
          {/* Card 1: Build New Resume */}
          <div 
            className={styles.card}
            style={{
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e9ecef',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
            onClick={handleBuildNewClick}
          >
            <div style={{
                height: '120px',
              background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                  width: '70px',
                  height: '70px',
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
              }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L12 20" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 12L20 12" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            
              <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 className={styles.cardHeading}>
                  Build New Resume
              </h3>
                <p className={styles.bodyText} style={{
                  marginBottom: '20px',
                  flex: 1
                }}>
                  Start from scratch and build your professional resume with our AI- No more writer&apos;s block!
                </p>
                <button className={styles.primaryButton}>
                  Get Started
                </button>
            </div>
          </div>
          
            {/* Card 2: Improve Existing Resume */}
          <div style={{
            background: 'white',
              borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s ease',
            border: '1px solid #e9ecef',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
          }}
            onClick={handleImproveClick}
          >
            <div style={{
                height: '120px',
              background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                  width: '70px',
                  height: '70px',
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
              }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 16H3V20H7V16Z" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 16H10V20H14V16Z" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 16H17V20H21V16Z" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 10L17 13L21 9" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 4H17" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 8H9" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            
              <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#212529',
                marginBottom: '10px'
              }}>
                  Improve Existing Resume
              </h3>
              <p style={{
                color: '#6c757d',
                fontSize: '16px',
                lineHeight: '1.6',
                  marginBottom: '20px',
                  flex: 1
                }}>
                  Upload your existing resume & we&apos;ll enhance it- stand out from the crowd!
                </p>
                <button style={{
                  backgroundColor: '#f59f00',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}>
                  Upload Resume
                </button>
            </div>
          </div>
          
            {/* Card 3: Tailor for Job */}
          <div style={{
            background: 'white',
              borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s ease',
            border: '1px solid #e9ecef',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
          }}
            onClick={handleTailorClick}
          >
            <div style={{
                height: '120px',
              background: 'linear-gradient(135deg, #e6fcf5, #c3fae8)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                  width: '70px',
                  height: '70px',
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
              }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" stroke="#12b886" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="#12b886" strokeWidth="2"/>
                    <path d="M16 8L18 6" stroke="#12b886" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 16L18 18" stroke="#12b886" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 16L6 18" stroke="#12b886" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 8L6 6" stroke="#12b886" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            
              <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#212529',
                marginBottom: '10px'
              }}>
                Tailor for Job
              </h3>
              <p style={{
                color: '#6c757d',
                fontSize: '16px',
                lineHeight: '1.6',
                  marginBottom: '20px',
                  flex: 1
                }}>
                  Optimize your resume for any job description to land that interview- in one click!
                </p>
                <button style={{
                  backgroundColor: '#12b886',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}>
                  Enter Job Details
                </button>
            </div>
          </div>
        </div>
        
          {/* Subtle arrow down animation */}
        <div style={{
            textAlign: 'center',
          marginTop: '60px',
            animation: 'bounce 2s infinite'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 12L12 19L5 12" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <style jsx>{`
              @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                  transform: translateY(0);
                }
                40% {
                  transform: translateY(-10px);
                }
                60% {
                  transform: translateY(-5px);
                }
              }
            `}</style>
          </div>
        </div>
      </section>
    );
  }
  
  function renderProcessSection() {
    return (
      <section style={{
        padding: '80px 20px',
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{
          textAlign: 'center',
            marginBottom: '50px'
          }}>
            <h2 className={styles.sectionHeading}>
              How It Works
            </h2>
            <p className={styles.bodyText} style={{
              fontSize: '18px',
              maxWidth: '700px',
              margin: '0 auto',
            }}>
              Choose your path and see what to expect
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className={styles.tabNavigation}>
            <button 
              onClick={() => setActiveProcessTab('build')}
              className={`${styles.tabButton} ${activeProcessTab === 'build' ? styles.tabButtonActive + ' ' + styles.tabButtonBuild : ''}`}
            >
              Build New Resume
            </button>
            <button 
              onClick={() => setActiveProcessTab('improve')}
              className={`${styles.tabButton} ${activeProcessTab === 'improve' ? styles.tabButtonActive + ' ' + styles.tabButtonImprove : ''}`}
            >
              Improve Existing Resume
            </button>
            <button 
              onClick={() => setActiveProcessTab('tailor')}
              className={`${styles.tabButton} ${activeProcessTab === 'tailor' ? styles.tabButtonActive + ' ' + styles.tabButtonTailor : ''}`}
            >
              Tailor to Job Description
            </button>
          </div>
          
          {/* Tab Content */}
          <div style={{ padding: '20px 0' }}>
            {/* Build New Resume Process */}
            {activeProcessTab === 'build' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '30px',
                animation: 'fadeIn 0.5s ease'
              }}>
                {/* Step 1 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e7f5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
            fontWeight: '700',
                      color: '#1a73e8'
                    }}>1</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
                  }}>
                    Choose from templates
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Select a professional, ATS-friendly template for your resume
                  </p>
                </div>
                
                {/* Step 2 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e7f5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1a73e8'
                    }}>2</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
                  }}>
                    Fill in sections with AI
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Add your info with our AI&apos;s assistance for perfect wording
                  </p>
                </div>
                
                {/* Step 3 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e7f5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1a73e8'
                    }}>3</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
                  }}>
                    Review and optimize
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Preview your resume in real-time and make any improvements
                  </p>
                </div>
                
                {/* Step 4 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e7f5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1a73e8'
                    }}>4</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
                  }}>
                    Download your resume
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Get your polished resume in PDF format- ready to apply!
                  </p>
                </div>
              </div>
            )}
            
            {/* Improve Existing Resume Process */}
            {activeProcessTab === 'improve' && (
          <div style={{
            display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '30px',
                animation: 'fadeIn 0.5s ease'
              }}>
                {/* Step 1 */}
                <div style={{ textAlign: 'center' }}>
              <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#fff3e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#f59f00'
                    }}>1</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                marginBottom: '10px'
              }}>
                    Upload your resume
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Upload your existing resume in PDF, Word, or text format
                  </p>
                </div>
                
                {/* Step 2 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#fff3e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#f59f00'
                    }}>2</span>
                  </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
              }}>
                    Review auto-filled data
                  </h3>
              <p style={{
                    fontSize: '15px',
                color: '#6c757d',
                    lineHeight: '1.5'
              }}>
                    We extract your resume content automatically
                  </p>
                </div>
                
                {/* Step 3 */}
                <div style={{ textAlign: 'center' }}>
              <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#fff3e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#f59f00'
                    }}>3</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                marginBottom: '10px'
              }}>
                    Enhance sections
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Our AI improves wording and formatting of your content
                  </p>
                </div>
                
                {/* Step 4 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#fff3e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#f59f00'
                    }}>4</span>
                  </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
              }}>
                    Download improved resume
                  </h3>
              <p style={{
                    fontSize: '15px',
                color: '#6c757d',
                    lineHeight: '1.5'
              }}>
                    Get your enhanced professional resume in an ATS-friendly format
                  </p>
                </div>
              </div>
            )}
            
            {/* Tailor to Job Process */}
            {activeProcessTab === 'tailor' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '30px',
                animation: 'fadeIn 0.5s ease'
              }}>
                {/* Step 1 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e6fcf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#12b886'
                    }}>1</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                marginBottom: '10px'
              }}>
                    Enter job description
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Paste the job listing to target your resume effectively
                  </p>
                </div>
                
                {/* Step 2 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e6fcf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#12b886'
                    }}>2</span>
                  </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
                  }}>
                    Upload or create resume
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Use your existing resume or build a new one with our AI
                  </p>
                </div>
                
                {/* Step 3 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e6fcf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#12b886'
                    }}>3</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
                  }}>
                    One-click tailoring
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Our AI matches your skills and experience to the job requirements
                  </p>
                </div>
                
                {/* Step 4 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e6fcf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    position: 'relative'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#12b886'
                    }}>4</span>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    marginBottom: '10px'
                  }}>
                    Download tailored resume
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    Get your job-specific resume optimized for ATS systems
                  </p>
                </div>
              </div>
            )}
            
            <style jsx>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        </div>
      </section>
    );
  }
  
  function renderDemoSection() {
    return (
      <section style={{
        padding: '80px 20px',
        backgroundColor: '#f8f9fc',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '50px'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#212529',
              marginBottom: '15px'
            }}>
              See the Builder in Action
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#6c757d',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Get a preview of our intuitive resume builder
            </p>
          </div>
          
          {/* Demo Tab Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px',
            gap: '15px'
          }}>
            <button 
              onClick={() => setActiveDemoTab('build')}
              style={{
                padding: '10px 20px',
                background: activeDemoTab === 'build' ? '#1a73e8' : 'white',
                color: activeDemoTab === 'build' ? 'white' : '#495057',
                border: '1px solid',
                borderColor: activeDemoTab === 'build' ? '#1a73e8' : '#dee2e6',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Build New
            </button>
            
            <button 
              onClick={() => setActiveDemoTab('improve')}
              style={{
                padding: '10px 20px',
                background: activeDemoTab === 'improve' ? '#f59f00' : 'white',
                color: activeDemoTab === 'improve' ? 'white' : '#495057',
                border: '1px solid',
                borderColor: activeDemoTab === 'improve' ? '#f59f00' : '#dee2e6',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Improve Existing
            </button>
            
            <button 
              onClick={() => setActiveDemoTab('tailor')}
              style={{
                padding: '10px 20px',
                background: activeDemoTab === 'tailor' ? '#12b886' : 'white',
                color: activeDemoTab === 'tailor' ? 'white' : '#495057',
                border: '1px solid',
                borderColor: activeDemoTab === 'tailor' ? '#12b886' : '#dee2e6',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Tailor to Job
            </button>
          </div>
          
          {/* Demo Content Placeholder */}
          <div style={{
            border: '2px dashed #dee2e6',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: 'white',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              <div style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: '#e7f5ff',
                color: '#1a73e8',
                borderRadius: '30px',
                fontWeight: '600',
                fontSize: '14px',
                marginBottom: '10px'
              }}>
                Coming Soon
              </div>
              
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#343a40',
                marginBottom: '15px'
              }}>
                Interactive Product Demo
              </h3>
              
              <p style={{
                fontSize: '16px',
                color: '#6c757d',
                maxWidth: '600px',
                margin: '0 auto 25px',
                lineHeight: '1.6'
              }}>
                {activeDemoTab === 'build' && "See how easy it is to create a professional resume from scratch with AI assistance."}
                {activeDemoTab === 'improve' && "Watch how our AI analyzes and enhances your existing resume for better results."}
                {activeDemoTab === 'tailor' && "Experience how your resume gets optimized for specific job descriptions in one click."}
              </p>
              
              <ul style={{
                textAlign: 'left',
                maxWidth: '500px',
                margin: '0 auto 30px',
                padding: '0'
              }}>
                <li style={{ 
                  listStyle: 'none', 
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    color: activeDemoTab === 'build' ? '#1a73e8' : 
                           activeDemoTab === 'improve' ? '#f59f00' : '#12b886',
                    marginRight: '10px',
                    fontSize: '18px'
                  }}>✓</span>
                  {activeDemoTab === 'build' && "Build sections step-by-step with helpful guidance"}
                  {activeDemoTab === 'improve' && "Upload your resume and see the automatic extraction"}
                  {activeDemoTab === 'tailor' && "Enter job details and see keyword matching in action"}
                </li>
                <li style={{ 
                  listStyle: 'none', 
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    color: activeDemoTab === 'build' ? '#1a73e8' : 
                           activeDemoTab === 'improve' ? '#f59f00' : '#12b886',
                    marginRight: '10px',
                    fontSize: '18px'
                  }}>✓</span>
                  {activeDemoTab === 'build' && "Get intelligent suggestions as you build your resume"}
                  {activeDemoTab === 'improve' && "See how AI enhances your existing content"}
                  {activeDemoTab === 'tailor' && "Watch AI optimize your resume for ATS systems"}
                </li>
                <li style={{ 
                  listStyle: 'none', 
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    color: activeDemoTab === 'build' ? '#1a73e8' : 
                           activeDemoTab === 'improve' ? '#f59f00' : '#12b886',
                    marginRight: '10px',
                    fontSize: '18px'
                  }}>✓</span>
                  {activeDemoTab === 'build' && "Preview your resume in real-time as you build it"}
                  {activeDemoTab === 'improve' && "Compare before and after versions of your resume"}
                  {activeDemoTab === 'tailor' && "See tailored content that matches job requirements"}
                </li>
                <li style={{ 
                  listStyle: 'none', 
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ 
                    color: activeDemoTab === 'build' ? '#1a73e8' : 
                           activeDemoTab === 'improve' ? '#f59f00' : '#12b886',
                    marginRight: '10px',
                    fontSize: '18px'
                  }}>✓</span>
                  {activeDemoTab === 'build' && "Choose from recommended ATS-friendly templates"}
                  {activeDemoTab === 'improve' && "Improve your resume while previewing in real-time"}
                  {activeDemoTab === 'tailor' && "One-click tailoring for any job description"}
                </li>
              </ul>
              
              <div style={{
                width: '100%',
                maxWidth: '700px',
                height: '350px',
                background: '#f1f3f5',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginTop: '10px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="20" rx="4" stroke="#adb5bd" strokeWidth="2"/>
                    <path d="M6 12H18" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 6L12 18" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p style={{ 
                    marginTop: '15px', 
                    color: '#868e96',
                    fontSize: '15px'
                  }}>
                    Screenshot placeholder
              </p>
            </div>
          </div>
        </div>
      </div>
        </div>
      </section>
    );
  }
  
  function renderFeaturesSection() {
    return (
      <section style={{
        padding: '80px 20px',
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '60px'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#212529',
              marginBottom: '15px'
            }}>
              Resume Builder Features
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#6c757d',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Everything you need to create a professional, ATS-optimized resume
            </p>
          </div>
          
          {/* Features Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '30px',
            margin: '0 auto',
          }}>
            {/* Feature 1: AI-Powered */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.05), rgba(108, 92, 231, 0.05))',
              borderRadius: '16px',
              padding: '30px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(26, 115, 232, 0.1)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 10px rgba(26, 115, 232, 0.1)'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 22V12" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 12L20 7" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 12L4 7" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1a73e8',
                marginBottom: '15px'
              }}>
                AI-Powered Writing
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#495057',
                lineHeight: '1.6'
              }}>
                Get perfect wording for your experience, skills, and summary with our advanced AI assistant. Overcome writer&apos;s block and create compelling content.
              </p>
            </div>
            
            {/* Feature 2: ATS-Optimized */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(18, 184, 134, 0.05), rgba(32, 201, 151, 0.05))',
              borderRadius: '16px',
              padding: '30px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(18, 184, 134, 0.1)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 10px rgba(18, 184, 134, 0.1)'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4" stroke="#12b886" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="#12b886" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#12b886',
                marginBottom: '15px'
              }}>
                ATS-Optimized
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#495057',
                lineHeight: '1.6'
              }}>
                Built to pass Applicant Tracking Systems with optimized formatting, keyword matching, and industry-standard resume structure that gets past digital gatekeepers.
              </p>
            </div>
            
            {/* Feature 3: Track Progress */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.05), rgba(253, 126, 20, 0.05))',
              borderRadius: '16px',
              padding: '30px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(245, 159, 0, 0.1)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 10px rgba(245, 159, 0, 0.1)'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 20V10" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 20V4" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 20V16" stroke="#f59f00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#f59f00',
                marginBottom: '15px'
              }}>
                Track Progress
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#495057',
                lineHeight: '1.6'
              }}>
                See your resume come alive as you build. Get section-by-section guidance on what to improve and celebrate your progress with completion indicators.
              </p>
            </div>
            
            {/* Feature 4: Beautiful Templates */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.05), rgba(132, 94, 247, 0.05))',
              borderRadius: '16px',
              padding: '30px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(108, 92, 231, 0.1)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 10px rgba(108, 92, 231, 0.1)'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 9.5V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H20C20.5304 3 21.0391 3.21071 21.4142 3.58579C21.7893 3.96086 22 4.46957 22 5V9.5" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 14.5V19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H20C20.5304 21 21.0391 20.7893 21.4142 20.4142C21.7893 20.0391 22 19.5304 22 19V14.5" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12H22" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#6c5ce7',
                marginBottom: '15px'
              }}>
                Professional Templates
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#495057',
                lineHeight: '1.6'
              }}>
                Recommended designs that stand out and make a great impression. Choose from ATS-friendly templates with perfect formatting and typography.
              </p>
            </div>
            
            {/* Feature 5: Quick & Easy */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(225, 83, 97, 0.05), rgba(250, 82, 82, 0.05))',
              borderRadius: '16px',
              padding: '30px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(225, 83, 97, 0.1)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 10px rgba(225, 83, 97, 0.1)'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#fa5252" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="#fa5252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fa5252',
                marginBottom: '15px'
              }}>
                Quick & Easy
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#495057',
                lineHeight: '1.6'
              }}>
                Complete your resume in under 5 minutes with our streamlined, intuitive builder. No complex software to learn – just follow the guided process.
              </p>
            </div>
            
            {/* Feature 6: Multiple Formats */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(32, 201, 151, 0.05), rgba(18, 184, 134, 0.05))',
              borderRadius: '16px',
              padding: '30px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(32, 201, 151, 0.1)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 10px rgba(32, 201, 151, 0.1)'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 3V7C14 7.26522 14.1054 7.51957 14.2929 7.70711C14.4804 7.89464 14.7348 8 15 8H19" stroke="#20c997" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H14L19 8V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21Z" stroke="#20c997" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 9H10" stroke="#20c997" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 13H15" stroke="#20c997" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 17H15" stroke="#20c997" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#20c997',
                marginBottom: '15px'
              }}>
                ATS-Friendly Format
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#495057',
                lineHeight: '1.6'
              }}>
                Download your resume in ATS-friendly format to be prepared for any application system- maintains perfect formatting and ATS compatibility.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }
  
  function renderCTASection() {
    return (
      <section style={{
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #1a73e8, #6c5ce7)',
        position: 'relative',
        overflow: 'hidden',
        color: 'white',
      }}>
        {/* Background decorations */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent 70%)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '-50px',
          left: '10%',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08), transparent 70%)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>
        
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '800',
            marginBottom: '25px',
            color: 'white',
            lineHeight: '1.3'
          }}>
            Ready to Build Your interview-winning Resume?
          </h2>
          
          <p style={{
            fontSize: '20px',
            maxWidth: '700px',
            margin: '0 auto 40px',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.6'
          }}>
            Create a professional resume that lands interviews with our intelligent AI-powered resume builder. It&apos;s quick, easy, and effective.
          </p>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
            margin: '0 auto',
          }}>
            <button 
              onClick={handleBuildNewClick}
              style={{
                padding: '16px 30px',
                backgroundColor: 'white',
                color: '#1a73e8',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 6px 15px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
            >
              Start Building Now
            </button>
            
            <button 
              onClick={handleImproveClick}
              style={{
                padding: '16px 30px',
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 6px 15px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
            >
              Import Existing Resume
            </button>
            
            <button 
              onClick={handleTailorClick}
              style={{
                padding: '16px 30px',
                backgroundColor: 'rgba(18, 184, 134, 0.9)',
                color: 'white',
                border: '2px solid rgba(18, 184, 134, 1)',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 6px 15px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
            >
              Enter Job Description
            </button>
          </div>
          
          <p style={{
            fontSize: '16px',
            margin: '15px auto 0',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: '600',
          }}>
            No signup or credit card required to start!
          </p>
          
          <div style={{
            padding: '25px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            margin: '25px auto 0',
            textAlign: 'center',
            maxWidth: '700px'
          }}>
            <h3 style={{ 
              color: 'white', 
              marginBottom: '10px',
              fontSize: '20px',
              fontWeight: '700'
            }}>
              Our testimonials are... well, just my supportive wife
            </h3>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              <span style={{ fontStyle: 'italic', display: 'block', marginBottom: '15px' }}>
                "This resume builder is amazing! You&apos;re so smart for making it!" - My wife (who says this about everything I do)
              </span>
              
              We&apos;re just getting started and need real testimonials from people who aren&apos;t obligated to be nice to us. 
              Why not see how your resume could look? Preview it instantly with no signup, no credit card, no risk - 
              just potentially a much better resume that actually gets you interviews.
            </p>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              marginTop: '15px', 
              fontSize: '14px',
              fontStyle: 'italic' 
            }}>
              If it helps you land a job, your testimonial might replace my wife&apos;s (she won&apos;t mind, I promise!)
            </p>
          </div>
          
          <p style={{
            fontSize: '15px',
            margin: '15px auto 0',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '500px'
          }}>
            Join thousands of job seekers who will successfully land their dream jobs with our resume builder.
          </p>
        </div>
      </section>
    );
  }
};

export default ResumeBuilderPage;

