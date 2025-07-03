import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Meta from '../components/common/Meta';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import StickyHeader from '../components/common/StickyHeader';

export default function AboutPage() {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState({
    founder: false,
    jobSearch: false,
    solution: false
  });
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  // Effect to handle screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 768);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
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
  
  // Navigation handler
  const handleBuildNewClick = async () => {
    // Show loading toast if available
    let toastId;
    if (typeof toast !== 'undefined') {
      toastId = toast.loading('Creating new resume...');
    }
    
    try {
      // For unauthenticated users or if API call fails, use the original behavior
      router.push('/builder/new');
      
      if (toastId) {
        toast.success('Starting new resume!', { id: toastId });
      }
    } catch (error) {
      console.error('Error creating new resume:', error);
      
      // Fallback to original behavior
      router.push('/builder/new');
      
      if (toastId) {
        toast.error('Something went wrong. Starting with a blank resume.', { id: toastId });
      }
    }
  };

  // Function to handle image loading errors
  const handleImageError = (imageType) => {
    setImagesLoaded(prev => ({
      ...prev,
      [imageType]: false
    }));
  };

  // Function to handle successful image loads
  const handleImageLoad = (imageType) => {
    setImagesLoaded(prev => ({
      ...prev,
      [imageType]: true
    }));
  };

  // Placeholder component for images
  const ImagePlaceholder = ({ type, height = 300 }) => {
    let title, icon, color;
    
    switch(type) {
      case 'founder':
        title = 'Nick Githinji';
        icon = '👤';
        color = '#e6f0ff';
        break;
      case 'jobSearch':
        title = 'Job Search Frustration';
        icon = '📄';
        color = '#f8e6ff';
        break;
      case 'solution':
        title = 'IntelliResume Solution';
        icon = '✅';
        color = '#e6fff0';
        break;
      default:
        title = 'Image';
        icon = '🖼️';
        color = '#f0f0f0';
    }
    
    return (
      <div 
        style={{
          backgroundColor: color,
          height: `${height}px`,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px',
          fontSize: type === 'founder' ? '3rem' : '2rem'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{icon}</div>
        <div style={{ fontSize: '1rem', color: '#666' }}>{title}</div>
      </div>
    );
  };

  // SVG founder avatar component
  const FounderAvatar = () => (
    <svg 
      width="200" 
      height="200" 
      viewBox="0 0 200 200" 
      style={{
        borderRadius: '50%',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
      }}
    >
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a6cf7" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#2451e6" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <circle cx="100" cy="100" r="100" fill="url(#avatarGradient)" />
      
      {/* Head */}
      <circle cx="100" cy="85" r="40" fill="#5D4037" />
      
      {/* Body */}
      <path 
        d="M50,140 C50,115 150,115 150,140 L150,200 L50,200 Z" 
        fill="#4a6cf7" 
      />
      
      {/* Suit collar */}
      <path 
        d="M85,140 L100,160 L115,140" 
        stroke="#f5f5f5" 
        strokeWidth="5" 
        fill="none" 
      />
      
      {/* Facial features - simplified */}
      <circle cx="85" cy="80" r="5" fill="#3E2723" /> {/* Left eye */}
      <circle cx="115" cy="80" r="5" fill="#3E2723" /> {/* Right eye */}
      <path 
        d="M85,100 Q100,110 115,100" 
        stroke="#3E2723" 
        strokeWidth="3" 
        fill="none" 
      /> {/* Smile */}
      
      {/* Simple hair */}
      <path 
        d="M60,70 Q100,40 140,70 L140,85 Q100,60 60,85 Z" 
        fill="#3E2723" 
      />
    </svg>
  );
  
  // SVG for job search frustration
  const JobSearchSVG = () => (
    <svg 
      width="100%" 
      height="300" 
      viewBox="0 0 400 300" 
      style={{
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
      }}
    >
      <defs>
        <linearGradient id="frustrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8e6ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#e6d0ff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="400" height="300" fill="url(#frustrationGradient)" />
      
      {/* Desk */}
      <rect x="50" y="180" width="300" height="20" fill="#8a6d3b" />
      <rect x="60" y="200" width="10" height="80" fill="#8a6d3b" />
      <rect x="330" y="200" width="10" height="80" fill="#8a6d3b" />
      
      {/* Papers scattered on desk */}
      <rect x="80" y="150" width="70" height="90" fill="white" transform="rotate(-15, 80, 150)" />
      <rect x="180" y="160" width="70" height="90" fill="white" transform="rotate(5, 180, 160)" />
      <rect x="250" y="155" width="70" height="90" fill="white" transform="rotate(-8, 250, 155)" />
      
      {/* Person (simplified) */}
      <circle cx="200" cy="100" r="30" fill="#f5f5f5" /> {/* Head */}
      <path d="M185,130 L215,130 L215,200 L185,200 Z" fill="#4a6cf7" /> {/* Body */}
      <path d="M160,150 L185,130 L185,170 Z" fill="#4a6cf7" /> {/* Left arm */}
      <path d="M240,150 L215,130 L215,170 Z" fill="#4a6cf7" /> {/* Right arm */}
      
      {/* Frustrated expression */}
      <circle cx="190" cy="95" r="4" fill="#333" /> {/* Left eye */}
      <circle cx="210" cy="95" r="4" fill="#333" /> {/* Right eye */}
      <path d="M185,115 Q200,105 215,115" stroke="#333" strokeWidth="2" fill="none" transform="rotate(180, 200, 110)" /> {/* Frown */}
      
      {/* Lines on paper to represent text */}
      <line x1="90" y1="155" x2="130" y2="155" stroke="#ccc" strokeWidth="2" transform="rotate(-15, 80, 150)" />
      <line x1="90" y1="165" x2="140" y2="165" stroke="#ccc" strokeWidth="2" transform="rotate(-15, 80, 150)" />
      <line x1="90" y1="175" x2="135" y2="175" stroke="#ccc" strokeWidth="2" transform="rotate(-15, 80, 150)" />
      
      <line x1="190" y1="175" x2="240" y2="175" stroke="#ccc" strokeWidth="2" transform="rotate(5, 180, 160)" />
      <line x1="190" y1="185" x2="230" y2="185" stroke="#ccc" strokeWidth="2" transform="rotate(5, 180, 160)" />
      <line x1="190" y1="195" x2="235" y2="195" stroke="#ccc" strokeWidth="2" transform="rotate(5, 180, 160)" />
      
      <line x1="260" y1="165" x2="310" y2="165" stroke="#ccc" strokeWidth="2" transform="rotate(-8, 250, 155)" />
      <line x1="260" y1="175" x2="300" y2="175" stroke="#ccc" strokeWidth="2" transform="rotate(-8, 250, 155)" />
      <line x1="260" y1="185" x2="305" y2="185" stroke="#ccc" strokeWidth="2" transform="rotate(-8, 250, 155)" />
    </svg>
  );
  
  // SVG for resume solution
  const ResumeSolutionSVG = () => (
    <svg 
      width="100%" 
      height="300" 
      viewBox="0 0 400 300" 
      style={{
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
      }}
    >
      <defs>
        <linearGradient id="solutionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e6fff0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#d0ffe6" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="400" height="300" fill="url(#solutionGradient)" />
      
      {/* Computer/screen */}
      <rect x="100" y="80" width="200" height="140" rx="5" fill="#f5f5f5" stroke="#ddd" strokeWidth="2" />
      <rect x="110" y="90" width="180" height="110" rx="2" fill="#fff" />
      <rect x="150" y="220" width="100" height="10" fill="#ddd" />
      <rect x="130" y="230" width="140" height="5" fill="#ccc" />
      
      {/* Resume on screen */}
      <rect x="120" y="100" width="160" height="90" fill="#fff" stroke="#eee" />
      
      {/* Resume sections */}
      <rect x="130" y="110" width="140" height="10" fill="#4a6cf7" opacity="0.7" />
      
      <line x1="130" y1="130" x2="230" y2="130" stroke="#ddd" strokeWidth="2" />
      <line x1="130" y1="140" x2="210" y2="140" stroke="#ddd" strokeWidth="2" />
      <line x1="130" y1="150" x2="220" y2="150" stroke="#ddd" strokeWidth="2" />
      
      <rect x="130" y="160" width="50" height="8" fill="#4a6cf7" opacity="0.5" />
      <line x1="130" y1="175" x2="230" y2="175" stroke="#ddd" strokeWidth="2" />
      
      {/* Checkmark overlay to show success */}
      <circle cx="300" cy="70" r="30" fill="#34a853" opacity="0.9" />
      <path d="M285,70 L295,80 L315,60" stroke="white" strokeWidth="6" fill="none" />
    </svg>
  );

  return (
    <>
      <Meta
        title="About IntelliResume | Our Story"
        description="Learn how IntelliResume was created to solve the frustrations of job applications and help job seekers create effective, ATS-friendly resumes."
        keywords="about IntelliResume, resume builder story, ATS resume, job application tool"
      />

      <style jsx>{`
        .about-page {
          font-family: 'Figtree', 'Inter', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          position: relative;
          overflow: hidden;
          color: #333;
          line-height: 1.6;
        }
        
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #2d3748;
        }
        
        .about-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Helvetica Neue, sans-serif;
        }
        
        .about-page {
          color: #333;
          line-height: 1.6;
        }
        
        .hero {
          background: linear-gradient(135deg, #f8faff 0%, #e6f0ff 100%);
          padding: 80px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        
        .hero h1 {
          font-size: 2.8rem;
          font-weight: 700;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #4a6cf7 0%, #2451e6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }
        
        .hero p {
          font-size: 1.2rem;
          color: #555;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .story-section {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        
        .story-section h2 {
          font-size: 2rem;
          margin-bottom: 30px;
          color: #2d3748;
          position: relative;
          display: inline-block;
        }
        
        .story-section h2:after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 0;
          width: 60px;
          height: 3px;
          background: linear-gradient(135deg, #4a6cf7 0%, #2451e6 100%);
        }
        
        .story-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .story-grid {
            grid-template-columns: 1fr;
          }
          
          .hero h1 {
            font-size: 2.2rem;
          }
          
          .story-section h2 {
            font-size: 1.8rem;
          }
        }
        
        .story-image {
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .story-image img {
          width: 100%;
          height: auto;
          display: block;
        }
        
        .story-text p {
          margin-bottom: 20px;
          font-size: 1.1rem;
        }
        
        .highlight-box {
          background: linear-gradient(135deg, rgba(74, 108, 247, 0.08) 0%, rgba(36, 81, 230, 0.08) 100%);
          border-left: 4px solid #4a6cf7;
          padding: 25px;
          border-radius: 8px;
          margin: 30px 0;
        }
        
        .highlight-box p {
          font-size: 1.1rem;
          font-weight: 500;
          color: #2d3748;
          margin: 0;
        }
        
        .quote-section {
          background: linear-gradient(135deg, #f8faff 0%, #e6f0ff 100%);
          padding: 60px 20px;
          text-align: center;
        }
        
        .quote-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .quote {
          font-size: 1.4rem;
          font-style: italic;
          color: #2d3748;
          position: relative;
          padding: 0 40px;
        }
        
        .quote:before, .quote:after {
          content: '"';
          font-size: 4rem;
          color: rgba(74, 108, 247, 0.2);
          position: absolute;
          line-height: 0;
        }
        
        .quote:before {
          left: 0;
          top: 30px;
        }
        
        .quote:after {
          right: 0;
          bottom: 0;
        }
        
        .author {
          margin-top: 20px;
          font-weight: 600;
          color: #4a6cf7;
        }
        
        .mission-section {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin-top: 40px;
        }
        
        .feature-card {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .feature-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, rgba(74, 108, 247, 0.1) 0%, rgba(36, 81, 230, 0.1) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        
        .feature-icon svg {
          color: #4a6cf7;
        }
        
        .feature-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 15px;
          color: #2d3748;
        }
        
        .feature-text {
          color: #4a5568;
          font-size: 0.95rem;
        }
        
        .cta-section {
          background: linear-gradient(135deg, #4a6cf7 0%, #2451e6 100%);
          padding: 80px 20px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(36, 81, 230, 0.2);
        }
        
        .cta-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        
        .cta-title {
          font-size: 2.5rem;
          margin-bottom: 20px;
          font-weight: 700;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }
        
        .cta-text {
          font-size: 1.25rem;
          margin-bottom: 40px;
          opacity: 0.95;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }
        
        .cta-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #FF5722;
          color: white;
          padding: 18px 40px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.2rem;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 8px 0 #D84315, 0 15px 20px rgba(0, 0, 0, 0.3);
          position: relative;
          text-transform: uppercase;
          letter-spacing: 1px;
          transform: translateY(-4px);
          border: none;
        }
        
        .cta-button:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 0 #D84315, 0 15px 25px rgba(0, 0, 0, 0.35);
        }
        
        .cta-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 0 #D84315, 0 5px 10px rgba(0, 0, 0, 0.2);
        }
        
        /* Add decorative elements */
        .cta-section:before {
          content: '';
          position: absolute;
          top: -50px;
          left: -50px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .cta-section:after {
          content: '';
          position: absolute;
          bottom: -70px;
          right: 10%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
        }
        
        @media (max-width: 768px) {
          .cta-title {
            font-size: 2rem;
          }
          
          .cta-text {
            font-size: 1.1rem;
            margin-bottom: 30px;
          }
          
          .cta-button {
            padding: 16px 32px;
            font-size: 1.1rem;
          }
        }
        
        .about-founder {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
          display: flex;
          gap: 40px;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .about-founder {
            flex-direction: column;
            text-align: center;
          }
        }
        
        .founder-image {
          flex: 0 0 200px;
        }
        
        .founder-image img {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .founder-bio h3 {
          font-size: 1.5rem;
          margin-bottom: 15px;
          color: #2d3748;
        }
        
        .founder-bio p {
          color: #4a5568;
          margin-bottom: 15px;
        }
        
        .decoration-circle {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(74, 108, 247, 0.1) 0%, rgba(36, 81, 230, 0.1) 100%);
          z-index: 1;
        }
        
        .circle-1 {
          width: 300px;
          height: 300px;
          top: -100px;
          left: -100px;
        }
        
        .circle-2 {
          width: 200px;
          height: 200px;
          bottom: -50px;
          right: 10%;
        }
      `}</style>

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

      {/* Sticky Header that appears on scroll */}
      {showStickyHeader && <StickyHeader />}

      <div className="about-page">
        {/* Hero Section */}
        <section className="hero">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="hero-content">
            <h1>My Story</h1>
            <p>How frustration with the job application process led to creating a tool that makes resume creation simple, effective, and tailored for success.</p>
          </div>
        </section>

        {/* The Problem Story Section */}
        <section className="story-section">
          <h2>It All Started With 100 Job Applications</h2>
          <div className="story-grid">
            <div className="story-text">
              <p>I remember sitting at my desk, surrounded by different versions of my resume, each tailored for different job applications. I was applying to at least 100 positions in a single month, and the process was <em>exhausting</em>.</p>
              <p>For each application, I needed to customize my resume to highlight relevant experience, include specific keywords, and format everything perfectly. I'd spend hours making tiny adjustments, only to realize I'd forgotten to update a date or accidentally left in details from a previous application.</p>
              <p>The worst part? I knew that most of these carefully crafted resumes would be screened by Applicant Tracking Systems (ATS) before a human ever saw them. One wrong move, and all that work would be wasted.</p>
            </div>
            <div className="story-image">
              {imagesLoaded.jobSearch ? (
                <img 
                  src="/images/about/job-search-frustration.jpg" 
                  alt="Person frustrated with job applications" 
                  onError={() => handleImageError('jobSearch')}
                  onLoad={() => handleImageLoad('jobSearch')}
                />
              ) : (
                <JobSearchSVG />
              )}
            </div>
          </div>

          <div className="highlight-box">
            <p>I thought to myself: "There has to be a better way to create and manage multiple tailored resumes without starting from scratch each time."</p>
          </div>
        </section>

        {/* The Insight Section */}
        <section className="quote-section">
          <div className="quote-content">
            <p className="quote">Employers don't care about beautiful, complicated designs. They care about clear, ATS-friendly resumes that highlight the right skills and experience.</p>
            <p className="author">— The realization that changed everything</p>
          </div>
        </section>

        {/* The Solution Section */}
        <section className="story-section">
          <h2>The Solution: IntelliResume</h2>
          <div className="story-grid">
            <div className="story-image">
              {imagesLoaded.solution ? (
                <img 
                  src="/images/about/resume-solution.jpg" 
                  alt="IntelliResume solution" 
                  onError={() => handleImageError('solution')}
                  onLoad={() => handleImageLoad('solution')}
                />
              ) : (
                <ResumeSolutionSVG />
              )}
            </div>
            <div className="story-text">
              <p>I created IntelliResume to solve my own problem, and to help others facing the same frustrations. I wanted a tool that would:</p>
              <ul>
                <li>Make it easy to create professional, ATS-optimized resumes in minutes</li>
                <li>Allow users to tailor resumes for specific jobs with just one click</li>
                <li>Keep all versions organized in one place</li>
                <li>Focus on what actually gets results, not flashy designs</li>
              </ul>
              <p>IntelliResume isn't about creating the most visually stunning resume with complicated designs or images. If that's what you're looking for, <Link href="/">IntelliResume</Link> might not be for you.</p>
              <p>We're about creating the resumes that <em>actually get you interviews</em> - clean, well-organized documents that highlight your skills and experience in a way that both ATS systems and hiring managers appreciate.</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mission-section">
          <h2>What Makes Us Different</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3 className="feature-title">Under 5-Minute Resume Creation</h3>
              <p className="feature-text">Build a professional resume in under 5 minutes. Import an existing one or start fresh - either way, we make it quick.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
              <h3 className="feature-title">One-Click Tailoring</h3>
              <p className="feature-text">Customize your resume for specific job listings with a single click. Our intelligent AI helps match your skills to the job requirements.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="feature-title">ATS-Optimized Templates</h3>
              <p className="feature-text">Our templates are designed to pass through Applicant Tracking Systems with flying colors. No fancy formatting that confuses ATS.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Simplify Your Job Search?</h2>
            <p className="cta-text">Create a resume that gets you noticed - for all the right reasons.</p>
            <Link href="/" className="cta-button">
              Create Your Resume
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
        </section>

        {/* About the Founder */}
        <section className="about-founder">
          <div className="founder-image">
            <FounderAvatar />
          </div>
          <div className="founder-bio">
            <h3>Nick Githinji</h3>
            <p>I'm a full-time Contracts Manager who builds useful tools in my downtime. I created IntelliResume after experiencing firsthand the frustrations of the modern job application process.</p>
            <p>My goal is simple: to help you build your career, one resume at a time!</p>
          </div>
        </section>
      </div>
    </>
  );
} 