import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { startNewResume } from '../../lib/resumeUtils';
import toast from 'react-hot-toast';
import { useResumeSelection } from './ResumeSelectionProvider';

const Navigation = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignInHovered, setIsSignInHovered] = useState(false);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const [hoveredDesktopItem, setHoveredDesktopItem] = useState(null);
  const [hoveredResumeButton, setHoveredResumeButton] = useState(false);
  const [isProcessingNewResume, setIsProcessingNewResume] = useState(false);
  const { navigateToPricing } = useResumeSelection();
  
  // Dropdown states for desktop
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Expandable section states for mobile
  const [expandedMobileSection, setExpandedMobileSection] = useState(null);
  
  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
    setExpandedMobileSection(null);
  }, [router.asPath]);
  
  // Handle sign out with confirmation
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // Handle creating a new resume
  const handleNewResume = async (e) => {
    e.preventDefault();
    
    if (isProcessingNewResume) return;
    
    setIsProcessingNewResume(true);
    setIsMenuOpen(false);
    
    try {
      let currentResumeData = null;
      let currentTemplate = null;
      let currentResumeId = null;
      let currentResumeName = null;
      
      try {
        const localData = localStorage.getItem('modern_resume_data');
        if (localData) {
          currentResumeData = JSON.parse(localData);
          currentTemplate = localStorage.getItem('selected_resume_template') || 'ats';
          currentResumeId = localStorage.getItem('current_resume_id');
          if (currentResumeData.personalInfo?.name) {
            currentResumeName = `${currentResumeData.personalInfo.name}'s Resume`;
          }
        }
      } catch (error) {
        console.error('Error getting current resume data:', error);
      }
      
      const toastId = toast.loading('Preparing new resume...');
      
      const success = await startNewResume(
        status === 'authenticated',
        currentResumeData,
        currentTemplate,
        currentResumeId,
        currentResumeName
      );
      
      if (success) {
        toast.success('Ready to create a new resume', { id: toastId });
        router.push('/resume-builder');
      } else {
        toast.error('Failed to prepare for new resume', { id: toastId });
      }
    } catch (error) {
      console.error('Error handling new resume:', error);
      toast.error('An error occurred while preparing new resume');
    } finally {
      setIsProcessingNewResume(false);
    }
  };

  // Handle pricing navigation with resume selection
  const handlePricingNavigation = (e) => {
    e.preventDefault();
    navigateToPricing('/subscription', true);
    setIsMenuOpen(false);
  };

  // Toggle mobile section
  const toggleMobileSection = (section) => {
    setExpandedMobileSection(expandedMobileSection === section ? null : section);
  };

  // Style objects for sign in button - teal green to match hero
  const signInButtonStyle = {
    background: isSignInHovered 
      ? "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)" 
      : "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    color: "#ffffff",
    padding: "8px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    border: "none",
    transition: "all 0.2s ease",
    fontFamily: "var(--font-figtree), 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: isSignInHovered ? "0 2px 8px rgba(13, 148, 136, 0.4)" : "0 1px 3px rgba(13, 148, 136, 0.2)",
    whiteSpace: "nowrap",
    letterSpacing: "-0.01em",
  };
  
  // Style for new resume button - Stripe-inspired clean look
  const newResumeButtonStyle = {
    fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: hoveredResumeButton ? "#1a73e8" : "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontWeight: "500",
    fontSize: "14px",
    transition: "all 0.2s ease",
    textDecoration: "none",
    letterSpacing: "-0.01em",
    boxShadow: hoveredResumeButton ? "0 2px 8px rgba(26, 115, 232, 0.3)" : "none"
  };
  
  // Style objects for desktop user dropdown menu items - Stripe theme
  const dropdownItemStyles = {
    item: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 14px",
      color: hoveredDesktopItem === id ? "#1a73e8" : "#374151",
      fontSize: "14px",
      fontWeight: "500",
      textDecoration: "none",
      transition: "all 0.15s ease",
      background: hoveredDesktopItem === id ? "#f0f7ff" : "none",
      border: "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
      borderRadius: "8px",
      letterSpacing: "-0.01em",
    }),
    signOutItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 14px",
      color: "#e53e3e",
      fontSize: "14px",
      fontWeight: "500",
      textDecoration: "none",
      transition: "all 0.15s ease",
      background: hoveredDesktopItem === id ? "rgba(229, 62, 62, 0.08)" : "none",
      border: "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
      borderRadius: "8px",
      letterSpacing: "-0.01em",
    }),
    sectionTitle: {
      fontSize: "11px",
      fontWeight: "600",
      color: "#9ca3af",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      padding: "8px 14px 4px",
      margin: "0",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
    },
    icon: (id) => ({
      color: hoveredDesktopItem === id ? "#1a73e8" : "#6b7280",
      transition: "all 0.15s ease",
      flexShrink: 0,
    }),
    signOutIcon: {
      color: "#e53e3e",
      flexShrink: 0,
    }
  };
  
  // Style objects for mobile menu items - matching desktop design
  const mobileMenuItemStyles = {
    container: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      padding: "4px 8px",
    },
    sectionHeader: (isExpanded) => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      color: isExpanded ? "#1a73e8" : "#374151",
      fontWeight: "500",
      fontSize: "14px",
      borderRadius: "8px",
      background: isExpanded ? "#f0f7ff" : "transparent",
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: "none",
      width: "100%",
      textAlign: "left",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
      letterSpacing: "-0.01em",
    }),
    sectionContent: {
      paddingLeft: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
    subItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 14px",
      color: hoveredMenuItem === id ? "#1a73e8" : "#374151",
      fontWeight: "500",
      textDecoration: "none",
      borderRadius: "8px",
      background: hoveredMenuItem === id ? "#f0f7ff" : "none",
      fontSize: "14px",
      transition: "all 0.2s ease",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
      letterSpacing: "-0.01em",
    }),
    menuItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 14px",
      color: hoveredMenuItem === id ? "#1a73e8" : "#374151",
      fontWeight: "500",
      textDecoration: "none",
      borderRadius: "8px",
      background: hoveredMenuItem === id ? "#f0f7ff" : "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.15s ease",
      border: "none",
      fontSize: "14px",
      letterSpacing: "-0.01em",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
    }),
    highlightItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 14px",
      color: "#1a73e8",
      fontWeight: "500",
      textDecoration: "none",
      borderRadius: "8px",
      background: hoveredMenuItem === id ? "rgba(26, 115, 232, 0.12)" : "rgba(26, 115, 232, 0.06)",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.15s ease",
      border: "1px solid rgba(26, 115, 232, 0.15)",
      fontSize: "14px",
      letterSpacing: "-0.01em",
      marginBottom: "6px",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
    }),
    signOutItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 14px",
      color: "#e53e3e",
      fontWeight: "500",
      textDecoration: "none",
      borderRadius: "8px",
      background: hoveredMenuItem === id ? "rgba(229, 62, 62, 0.08)" : "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.15s ease",
      border: "none",
      fontSize: "14px",
      letterSpacing: "-0.01em",
      marginTop: "4px",
      fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
    }),
    icon: (highlight) => ({
      color: highlight ? "#1a73e8" : "#718096",
      transition: "all 0.2s ease",
      flexShrink: 0,
    }),
    signOutIcon: {
      color: "#e53e3e",
      transition: "all 0.2s ease",
      flexShrink: 0,
    },
    divider: {
      height: "1px",
      backgroundColor: "#e2e8f0",
      margin: "12px 0",
      width: "100%",
    },
    userProfile: {
      display: "flex",
      alignItems: "center",
      backgroundColor: "#4caf50",
      color: "white",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      fontFamily: "var(--font-figtree), 'Inter', sans-serif",
    },
    userInfo: {
      display: "flex",
      flexDirection: "column",
      marginLeft: "12px",
    },
    userLabel: {
      fontSize: "0.85rem",
      opacity: 0.9,
      marginBottom: "2px",
    },
    userName: {
      fontWeight: 600,
      fontSize: "1.1rem",
    },
    statusDot: {
      width: "8px",
      height: "8px",
      backgroundColor: "white",
      borderRadius: "50%",
      marginRight: "2px",
    }
  };

  // Desktop nav dropdown button style - matching Sign In button font
  const navDropdownStyle = (isActive) => ({
    fontFamily: "var(--font-figtree), 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
    color: isActive ? '#1a73e8' : '#374151',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    textDecoration: 'none',
    letterSpacing: '-0.01em',
  });

  return (
    <header className="nav-container">
      <div className="nav-content">
        {/* Logo and Tagline */}
        <Link href="/" className={`nav-logo ${status === 'authenticated' ? 'authenticated-logo' : ''}`}>
          <div className="logo-with-tagline">
            <img
              src="/images/intelliResume-logo2.webp"
              alt="IntelliResume"
              className="nav-logo-image"
            />
            {status !== 'authenticated' && (
              <div className="tagline-container">
                <span className="nav-tagline">Your RN Career Thrives Here</span>
              </div>
            )}
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        {/* Desktop Navigation Links - Stripe-inspired dropdowns */}
        <nav className="nav-links desktop-nav">
          {/* Jobs Dropdown */}
          <div 
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown('jobs')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
          <Link 
            href="/jobs/nursing"
              style={navDropdownStyle(activeDropdown === 'jobs' || router.pathname.startsWith('/jobs'))}
              className="nav-dropdown-trigger"
            >
              <span>🔥 Find RN Jobs</span>
              <svg className="dropdown-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </Link>
            <div className={`nav-dropdown-menu ${activeDropdown === 'jobs' ? 'show' : ''}`}>
              <Link 
                href="/jobs/nursing" 
            style={{
              display: 'flex',
              alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  color: '#374151',
                  textDecoration: 'none',
              borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                  transition: 'all 0.15s ease',
                }}
                className="nav-dropdown-item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Browse by State
              </Link>
              <Link 
                href="/jobs/nursing" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  color: '#374151',
              textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                  transition: 'all 0.15s ease',
                }}
                className="nav-dropdown-item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                Browse by Specialty
              </Link>
              <Link 
                href="/jobs/nursing/employer" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  color: '#374151',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                  transition: 'all 0.15s ease',
                }}
                className="nav-dropdown-item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Browse by Employer
              </Link>
              <Link 
                href="/jobs/nursing/rn-salary-calculator" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  color: '#374151',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                  transition: 'all 0.15s ease',
                }}
                className="nav-dropdown-item"
          >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
                RN Salary Calculator
          </Link>
            </div>
          </div>

          {/* Create Job Alerts - Direct Link */}
          <Link 
            href="/jobs/nursing#job-alert-form"
            style={navDropdownStyle(router.asPath.includes('job-alert'))}
            className="nav-single-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Create Job Alerts</span>
          </Link>

          {/* Resume Builder Dropdown - Only show for non-authenticated users */}
          {status !== 'authenticated' && (
            <div 
              className="nav-dropdown"
              onMouseEnter={() => setActiveDropdown('resume')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link 
                href="/resume-builder"
                style={navDropdownStyle(activeDropdown === 'resume' || router.pathname === '/resume-builder')}
                className="nav-dropdown-trigger"
              >
                <span>🚀 Resume Builder</span>
                <svg className="dropdown-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </Link>
              <div className={`nav-dropdown-menu ${activeDropdown === 'resume' ? 'show' : ''}`}>
                <Link 
                  href="/builder/new" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                  className="nav-dropdown-item"
          >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
                  Build New Resume
          </Link>
                <Link 
                  href="/builder/import" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                  className="nav-dropdown-item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Improve Existing Resume
                </Link>
                <Link 
                  href="/builder/target" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                  className="nav-dropdown-item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                  </svg>
                  Customize to Job
                </Link>
              </div>
            </div>
          )}
        </nav>
        
        {/* Right-side controls: Sign In/User Menu + Mobile Menu */}
        <div className="nav-controls">
          {/* Authentication Controls - Desktop Only */}
          {status === 'authenticated' ? (
            <div className="auth-controls desktop-only">
              {/* Create New Resume Button - Desktop Only */}
              <button 
                className="new-resume-btn desktop-only"
                onClick={handleNewResume}
                style={{
                  ...newResumeButtonStyle,
                  cursor: isProcessingNewResume ? 'wait' : 'pointer',
                  opacity: isProcessingNewResume ? 0.7 : 1
                }}
                onMouseEnter={() => setHoveredResumeButton(true)}
                onMouseLeave={() => setHoveredResumeButton(false)}
                disabled={isProcessingNewResume}
              >
                {isProcessingNewResume ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" strokeDasharray="32" strokeDashoffset="8" />
                    </svg>
                    <span>Processing...</span>
                  </span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>New Resume</span>
                  </>
                )}
              </button>
              
              {/* User Profile & Dropdown */}
              <div className="user-dropdown">
                <div className="user-profile">
                  <div className="user-status-dot"></div>
                  <span className="user-label">Signed in as</span>
                  <span className="user-name">
                    {session?.user?.name || 'User'}
                  </span>
                  <svg className="dropdown-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                
                {/* Dropdown Menu */}
                <div className="dropdown-menu">
                  <div className="dropdown-section">
                    <h4 style={dropdownItemStyles.sectionTitle}>Account</h4>
                    <Link 
                      href="/profile" 
                      style={dropdownItemStyles.item('profile-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('profile-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg style={dropdownItemStyles.icon('profile-desktop')} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      My Profile
                    </Link>
                    <Link 
                      href="/profile#resumes" 
                      style={dropdownItemStyles.item('resumes-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('resumes-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg style={dropdownItemStyles.icon('resumes-desktop')} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      My Resumes
                    </Link>
                    <a 
                      href="/subscription" 
                      onClick={handlePricingNavigation}
                      style={dropdownItemStyles.item('subscription-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('subscription-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg style={dropdownItemStyles.icon('subscription-desktop')} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                      Pricing
                    </a>
                  </div>
                  
                  {/* Quick Links - Jobs & Resources */}
                  <div className="dropdown-section">
                    <h4 style={dropdownItemStyles.sectionTitle}>Quick Links</h4>
                    <Link 
                      href="/jobs/nursing" 
                      style={dropdownItemStyles.item('jobs-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('jobs-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>🔥</span>
                      Find RN Jobs
                    </Link>
                    <Link 
                      href="/jobs/nursing/rn-salary-calculator" 
                      style={dropdownItemStyles.item('salary-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('salary-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg style={dropdownItemStyles.icon('salary-desktop')} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      RN Salary Calculator
                    </Link>
                    <Link 
                      href="/jobs/nursing#job-alert-form" 
                      style={dropdownItemStyles.item('alerts-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('alerts-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg style={dropdownItemStyles.icon('alerts-desktop')} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      Create Job Alerts
                    </Link>
                  </div>
                  
                  <div className="dropdown-section sign-out-section">
                    <button 
                      onClick={handleSignOut} 
                      style={dropdownItemStyles.signOutItem('signout-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('signout-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg style={dropdownItemStyles.signOutIcon} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link 
              href="/auth/signin"
              className="sign-in-button desktop-only"
              style={signInButtonStyle}
              onMouseEnter={() => setIsSignInHovered(true)}
              onMouseLeave={() => setIsSignInHovered(false)}
            >
              Sign In
            </Link>
          )}
          
          {/* Mobile Menu Button - Show for ALL users on mobile */}
            <button 
              className="mobile-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </>
                )}
              </svg>
            </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMenuOpen ? 'open' : 'closed'}`}>
          <div className="mobile-menu-content">
          {/* User info - only for authenticated */}
          {status === 'authenticated' && (
            <div style={mobileMenuItemStyles.userProfile}>
              <div style={mobileMenuItemStyles.statusDot}></div>
              <div style={mobileMenuItemStyles.userInfo}>
                <span style={mobileMenuItemStyles.userLabel}>Signed in as</span>
                <span style={mobileMenuItemStyles.userName}>
                  {session?.user?.name || 'User'}
                </span>
              </div>
            </div>
          )}
            
            <div style={mobileMenuItemStyles.container}>
            {/* Collapsible sections - Only for NON-authenticated users */}
            {status !== 'authenticated' && (
              <>
                {/* Jobs Section */}
                <div className="mobile-section">
                  <button 
                    style={mobileMenuItemStyles.sectionHeader(expandedMobileSection === 'jobs')}
                    onClick={() => toggleMobileSection('jobs')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔥 Find RN Jobs
                    </span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ transform: expandedMobileSection === 'jobs' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {expandedMobileSection === 'jobs' && (
                    <div style={mobileMenuItemStyles.sectionContent}>
              <Link 
                href="/jobs/nursing"
                        style={mobileMenuItemStyles.subItem('mob-jobs-state')}
                        onMouseEnter={() => setHoveredMenuItem('mob-jobs-state')}
                onMouseLeave={() => setHoveredMenuItem(null)}
                        onClick={() => setIsMenuOpen(false)}
              >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        Browse by State
                      </Link>
                      <Link 
                        href="/jobs/nursing"
                        style={mobileMenuItemStyles.subItem('mob-jobs-specialty')}
                        onMouseEnter={() => setHoveredMenuItem('mob-jobs-specialty')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        </svg>
                        Browse by Specialty
                      </Link>
                      <Link 
                        href="/jobs/nursing/employer"
                        style={mobileMenuItemStyles.subItem('mob-jobs-employer')}
                        onMouseEnter={() => setHoveredMenuItem('mob-jobs-employer')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        Browse by Employer
                      </Link>
                      <Link 
                        href="/jobs/nursing/rn-salary-calculator"
                        style={mobileMenuItemStyles.subItem('mob-jobs-salary')}
                        onMouseEnter={() => setHoveredMenuItem('mob-jobs-salary')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="1" x2="12" y2="23"></line>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        RN Salary Calculator
                      </Link>
                    </div>
                  )}
                </div>

                {/* Create Job Alerts - Direct Link */}
                <Link 
                  href="/jobs/nursing#job-alert-form"
                  style={mobileMenuItemStyles.menuItem('mob-alerts')}
                  onMouseEnter={() => setHoveredMenuItem('mob-alerts')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  Create Job Alerts
                </Link>

                {/* Resume Builder Section */}
                <div className="mobile-section">
                  <button 
                    style={mobileMenuItemStyles.sectionHeader(expandedMobileSection === 'resume')}
                    onClick={() => toggleMobileSection('resume')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🚀 Resume Builder
                    </span>
                    <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                      strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                      style={{ transform: expandedMobileSection === 'resume' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                >
                      <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                  </button>
                  {expandedMobileSection === 'resume' && (
                    <div style={mobileMenuItemStyles.sectionContent}>
                      <Link 
                        href="/builder/new"
                        style={mobileMenuItemStyles.subItem('mob-resume-new')}
                        onMouseEnter={() => setHoveredMenuItem('mob-resume-new')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Build New Resume
              </Link>
                      <Link 
                        href="/builder/import"
                        style={mobileMenuItemStyles.subItem('mob-resume-improve')}
                        onMouseEnter={() => setHoveredMenuItem('mob-resume-improve')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Improve Existing Resume
                      </Link>
                      <Link 
                        href="/builder/target"
                        style={mobileMenuItemStyles.subItem('mob-resume-customize')}
                        onMouseEnter={() => setHoveredMenuItem('mob-resume-customize')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <circle cx="12" cy="12" r="6"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                        </svg>
                        Customize to Job
                      </Link>
                    </div>
                  )}
                </div>

                <div style={mobileMenuItemStyles.divider}></div>

                {/* Sign In for non-authenticated */}
                <Link 
                  href="/auth/signin"
                  style={{
                    ...mobileMenuItemStyles.highlightItem('signin'),
                    background: 'rgba(26, 115, 232, 0.1)',
                    color: '#1a73e8',
                    textAlign: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              </>
            )}

            {/* For authenticated users - flat menu matching desktop dropdown */}
            {status === 'authenticated' && (
              <>
                {/* Build New Resume - highlighted */}
              <button 
                onClick={handleNewResume}
                style={{
                  ...mobileMenuItemStyles.highlightItem('newResume'),
                  cursor: isProcessingNewResume ? 'wait' : 'pointer',
                  opacity: isProcessingNewResume ? 0.7 : 1
                }}
                onMouseEnter={() => setHoveredMenuItem('newResume')}
                onMouseLeave={() => setHoveredMenuItem(null)}
                disabled={isProcessingNewResume}
              >
                  <svg style={mobileMenuItemStyles.icon(true)} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                  {isProcessingNewResume ? 'Processing...' : 'Build New Resume'}
              </button>
            
                <div style={mobileMenuItemStyles.divider}></div>
                
                {/* Account Section */}
              <Link 
                href="/profile"
                style={mobileMenuItemStyles.menuItem('profile')}
                onMouseEnter={() => setHoveredMenuItem('profile')}
                onMouseLeave={() => setHoveredMenuItem(null)}
                  onClick={() => setIsMenuOpen(false)}
              >
                  <svg style={mobileMenuItemStyles.icon(hoveredMenuItem === 'profile')} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                My Profile
              </Link>
                
                <Link 
                  href="/profile#resumes"
                  style={mobileMenuItemStyles.menuItem('resumes')}
                  onMouseEnter={() => setHoveredMenuItem('resumes')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg style={mobileMenuItemStyles.icon(hoveredMenuItem === 'resumes')} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  My Resumes
              </Link>
              
              <a 
                href="/subscription"
                onClick={handlePricingNavigation}
                style={mobileMenuItemStyles.menuItem('subscription')}
                onMouseEnter={() => setHoveredMenuItem('subscription')}
                onMouseLeave={() => setHoveredMenuItem(null)}
              >
                  <svg style={mobileMenuItemStyles.icon(hoveredMenuItem === 'subscription')} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Pricing
              </a>
              
                <div style={mobileMenuItemStyles.divider}></div>
                
                {/* Quick Links Section */}
              <Link 
                  href="/jobs/nursing"
                  style={mobileMenuItemStyles.menuItem('jobs-mobile')}
                  onMouseEnter={() => setHoveredMenuItem('jobs-mobile')}
                onMouseLeave={() => setHoveredMenuItem(null)}
                  onClick={() => setIsMenuOpen(false)}
              >
                  <span style={{ fontSize: '16px' }}>🔥</span>
                  Find RN Jobs
                </Link>
                
                <Link 
                  href="/jobs/nursing/rn-salary-calculator"
                  style={mobileMenuItemStyles.menuItem('salary-mobile')}
                  onMouseEnter={() => setHoveredMenuItem('salary-mobile')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg style={mobileMenuItemStyles.icon(hoveredMenuItem === 'salary-mobile')} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                  RN Salary Calculator
                </Link>
                
                <Link 
                  href="/jobs/nursing#job-alert-form"
                  style={mobileMenuItemStyles.menuItem('alerts-mobile')}
                  onMouseEnter={() => setHoveredMenuItem('alerts-mobile')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg style={mobileMenuItemStyles.icon(hoveredMenuItem === 'alerts-mobile')} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  Create Job Alerts
              </Link>
              
              <div style={mobileMenuItemStyles.divider}></div>
              
                {/* Sign Out */}
              <button
                onClick={handleSignOut}
                style={mobileMenuItemStyles.signOutItem('signOut')}
                onMouseEnter={() => setHoveredMenuItem('signOut')}
                onMouseLeave={() => setHoveredMenuItem(null)}
              >
                  <svg style={mobileMenuItemStyles.signOutIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
              </button>
              </>
            )}
            </div>
          </div>
      </div>

      <style jsx>{`
        /* Logo styling */
        .nav-logo {
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-weight: 800;
          font-size: 3.2rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          letter-spacing: -0.02em;
          transition: transform 0.3s ease, filter 0.3s ease;
          flex-shrink: 0;
          margin-right: auto;
          position: relative;
          padding: 0.3rem 0;
        }
        
        .nav-logo-image {
          height: 80px;
          width: auto;
          object-fit: contain;
          margin-left: -3rem;
        }

        .logo-with-tagline {
          display: flex;
          align-items: center;
        }

        .tagline-container {
          display: flex;
          align-items: center;
          margin-left: -2rem;
          padding-left: 16px;
          border-left: 1px solid rgba(100, 116, 139, 0.3);
        }

        .nav-tagline {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 400;
          letter-spacing: 0.02em;
          white-space: nowrap;
          font-style: italic;
          opacity: 0.8;
        }

        .nav-logo:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        
        /* Navigation layout - Fixed position for reliable sticky behavior */
        .nav-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: white;
          padding: 0.75rem 1rem;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        
        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 0.5rem;
          height: 60px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .nav-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        /* Desktop navigation - hidden on mobile */
        .desktop-nav {
          display: none;
        }
        
        .desktop-only {
          display: none;
        }
        
        /* Nav dropdown styling */
        .nav-dropdown {
          position: relative;
        }
        
        .nav-dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .dropdown-chevron {
          transition: transform 0.2s ease;
        }
        
        .nav-dropdown:hover .dropdown-chevron {
          transform: rotate(180deg);
        }
        
        /* Stripe-inspired dropdown menu */
        .nav-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          min-width: 280px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100;
          overflow: hidden;
          padding: 8px;
        }
        
        .nav-dropdown-menu.show {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
        
        /* Dropdown item hover effects */
        .nav-dropdown-item:hover {
          background: #f0f7ff !important;
          color: #1a73e8 !important;
        }
        
        .nav-dropdown-item:hover svg {
          transform: scale(1.1);
        }
        
        /* Desktop navigation controls - hidden on mobile via desktop-only class */
        .auth-controls {
          align-items: center;
          gap: 1rem;
        }
        
        /* User dropdown styling - Green theme */
        .user-dropdown {
          position: relative;
          margin-left: 0.5rem;
          font-family: var(--font-figtree), 'Inter', -apple-system, sans-serif;
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #4caf50;
          color: white;
          border: none;
          border-radius: 50px;
          padding: 8px 14px 8px 10px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          letter-spacing: -0.01em;
        }
        
        .user-profile:hover {
          background-color: #43a047;
        }
        
        .user-status-dot {
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          margin-right: 2px;
        }
        
        .user-label {
          font-weight: 400;
          opacity: 0.9;
          margin-right: 2px;
          font-size: 13px;
        }
        
        .user-name {
          font-weight: 600;
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .dropdown-icon {
          margin-left: 4px;
          opacity: 0.8;
          transition: transform 0.2s ease;
        }
        
        .user-dropdown:hover .dropdown-icon {
          transform: rotate(180deg);
        }
        
        /* User Dropdown menu - Stripe theme */
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          width: 240px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
          margin-top: 6px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100;
          overflow: hidden;
          padding: 8px;
        }
        
        .user-dropdown:hover .dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        /* Hide user dropdown hover menu on mobile/tablet - use mobile menu instead */
        @media (max-width: 1024px) {
          .user-dropdown .dropdown-menu {
            display: none !important;
          }
          
          .user-dropdown:hover .dropdown-menu {
            display: none !important;
          }
        }
        
        .dropdown-section {
          padding: 4px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .dropdown-section:last-child {
          border-bottom: none;
        }
        
        .sign-out-section {
          margin-top: 4px;
        }
        
        /* Mobile menu button - visible by default (mobile-first) */
        .mobile-menu-button {
          display: block;
          background: none;
          border: none;
          color: #333;
          cursor: pointer;
          padding: 0.5rem;
        }
        
        /* Mobile menu styling */
        .mobile-menu {
          display: block;
          position: absolute;
          top: 72px;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #f8f9fc, #edf2ff);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 16px;
          overflow-y: auto;
          overflow-x: hidden;
          transition: all 0.3s ease;
          z-index: 1000;
          -webkit-overflow-scrolling: touch;
        }
        
        .mobile-menu.closed {
          max-height: 0;
          padding-top: 0;
          padding-bottom: 0;
          opacity: 0;
          visibility: hidden;
        }
        
          .mobile-menu.open {
            max-height: calc(100vh - 80px);
            opacity: 1;
            visibility: visible;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          .mobile-menu-content {
            font-family: var(--font-figtree), 'Inter', sans-serif;
            max-height: 100%;
          }
                
        .mobile-section {
          margin-bottom: 4px;
        }
        
        /* Desktop styles - min-width 1025px */
        @media (min-width: 1025px) {
          .nav-container {
            padding: 1rem 1.5rem;
          }
          
          .nav-content {
            padding: 0 1.5rem;
          }
          
          .logo-text {
            font-size: 1.8rem;
          }
          
          .desktop-nav {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: 24px;
          }
          
          .desktop-only {
            display: flex;
          }
          
          .mobile-menu-button {
            display: none;
          }
          
          .mobile-menu {
            display: none;
          }
          
          .nav-controls {
            gap: 1.5rem;
          }
          }
          
        /* Medium desktop screens */
        @media (max-width: 1280px) and (min-width: 1025px) {
          .nav-tagline {
            font-size: 0.7rem;
          }
          
          .tagline-container {
            margin-left: 12px;
          }
          
          .tagline-container::before {
            height: 14px;
          }
          
          .logo-text {
            font-size: 1.5rem;
          }
        }
        
        /* Small mobile screens */
        @media (max-width: 360px) {
          .nav-content {
            padding: 0 0.3rem;
            height: 50px;
          }
        }
        
        /* Hide tagline on mobile/tablet */
        @media (max-width: 1024px) {
          .tagline-container {
            display: none;
          }

          .nav-logo-image {
            height: 150px;
            margin-left: -1.5rem;
          }

          /* Compact authenticated header on mobile - match sticky header */
          .authenticated-logo .logo-text {
            font-size: 18px;
            white-space: nowrap;
          }

          .authenticated-logo .logo-container {
            flex-shrink: 0;
        }

          /* Compact auth controls on mobile */
          .auth-controls.mobile-auth {
            display: flex;
            align-items: center;
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .nav-logo-image {
            height: 150px;
          }
        }
        
        /* Authenticated desktop compact */
        .authenticated-logo {
          flex-shrink: 0;
          }
          
        .authenticated-logo .logo-with-text {
          flex-direction: row;
          align-items: center;
        }
      `}</style>
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1.5s linear infinite;
        }
      `}</style>
    </header>
  );
};

export default Navigation; 
