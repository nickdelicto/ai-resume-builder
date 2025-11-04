import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { startNewResume } from '../../lib/resumeUtils';
import toast from 'react-hot-toast';
import Image from 'next/image';
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
  const [isMobile, setIsMobile] = useState(false);
  const { navigateToPricing } = useResumeSelection();
  
  // Detect if we're on mobile to conditionally render logo icon
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [router.asPath]);
  
  // Handle sign out with confirmation
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // Handle creating a new resume
  const handleNewResume = async (e) => {
    e.preventDefault(); // Prevent the default link behavior
    
    if (isProcessingNewResume) return; // Prevent multiple clicks
    
    setIsProcessingNewResume(true);
    console.log('📊 DEBUG - NAV - Starting new resume process');
    
    try {
      // Get current resume data from localStorage if available
      let currentResumeData = null;
      let currentTemplate = null;
      let currentResumeId = null;
      let currentResumeName = null;
      
      try {
        console.log('📊 DEBUG - NAV - Initial localStorage keys:', Object.keys(localStorage));
        console.log('📊 DEBUG - NAV - Initial resumeId in localStorage:', localStorage.getItem('current_resume_id'));
        
        const localData = localStorage.getItem('modern_resume_data');
        if (localData) {
          currentResumeData = JSON.parse(localData);
          currentTemplate = localStorage.getItem('selected_resume_template') || 'ats';
          currentResumeId = localStorage.getItem('current_resume_id');
          // Try to generate a name from the data
          if (currentResumeData.personalInfo?.name) {
            currentResumeName = `${currentResumeData.personalInfo.name}'s Resume`;
          }
        }
      } catch (error) {
        console.error('Error getting current resume data:', error);
      }
      
      // Show loading toast
      const toastId = toast.loading('Preparing new resume...');
      
      // Start new resume (save current data and clear localStorage)
      const success = await startNewResume(
        status === 'authenticated',
        currentResumeData,
        currentTemplate,
        currentResumeId,
        currentResumeName
      );
      
      console.log('📊 DEBUG - NAV - After startNewResume call');
      console.log('📊 DEBUG - NAV - Post-clear localStorage keys:', Object.keys(localStorage));
      console.log('📊 DEBUG - NAV - Post-clear resumeId in localStorage:', localStorage.getItem('current_resume_id'));
      
      if (success) {
        toast.success('Ready to create a new resume', { id: toastId });
        
        // Check localStorage one more time before navigation
        console.log('📊 DEBUG - NAV - Pre-navigation localStorage keys:', Object.keys(localStorage));
        console.log('📊 DEBUG - NAV - Pre-navigation resumeId in localStorage:', localStorage.getItem('current_resume_id'));
        console.log('📊 DEBUG - NAV - starting_new_resume flag:', localStorage.getItem('starting_new_resume'));
        
        // Navigate to home page
        console.log('📊 DEBUG - NAV - About to navigate to homepage');
        router.push('/');
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

  // Style objects for sign in button
  const signInButtonStyle = {
    background: isSignInHovered ? "#c5d9fc" : "#d8e8ff",
    color: "var(--primary-blue)",
    padding: "8px 20px",
    borderRadius: "50px",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    border: "none",
    transition: "all 0.2s ease",
    fontFamily: "'Figtree', 'Inter', sans-serif",
    boxShadow: isSignInHovered ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
    whiteSpace: "nowrap" // Prevent text wrapping
  };
  
  // Style for new resume button
  const newResumeButtonStyle = {
    fontFamily: "'Figtree', 'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: hoveredResumeButton ? "rgba(26, 115, 232, 0.12)" : "rgba(26, 115, 232, 0.08)",
    color: "#1a73e8",
    border: "1px solid rgba(26, 115, 232, 0.35)",
    borderRadius: "8px",
    padding: "0.4rem 0.8rem",
    fontWeight: "500",
    fontSize: "0.9rem",
    transition: "all 0.2s ease",
    textDecoration: "none",
    transform: hoveredResumeButton ? "translateY(-1px)" : "none",
    boxShadow: hoveredResumeButton ? "0 3px 10px rgba(26, 115, 232, 0.1)" : "none"
  };
  
  // Style objects for desktop dropdown menu items
  const dropdownItemStyles = {
    item: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 16px",
      color: hoveredDesktopItem === id ? "#1a73e8" : "#333",
      fontSize: "0.95rem",
      textDecoration: "none",
      transition: "all 0.15s ease",
      background: hoveredDesktopItem === id ? "#f5f7fa" : "none",
      border: "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "'Figtree', 'Inter', sans-serif",
    }),
    signOutItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 16px",
      color: "#e53e3e",
      fontSize: "0.95rem",
      textDecoration: "none",
      transition: "all 0.15s ease",
      background: hoveredDesktopItem === id ? "rgba(229, 62, 62, 0.08)" : "none",
      border: "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "'Figtree', 'Inter', sans-serif",
    }),
    sectionTitle: {
      fontSize: "0.75rem",
      fontWeight: "600",
      color: "#8a94a6",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      padding: "8px 16px 4px",
      margin: "0",
      fontFamily: "'Figtree', 'Inter', sans-serif",
    },
    icon: (id) => ({
      color: hoveredDesktopItem === id ? "#1a73e8" : "currentColor",
      transition: "all 0.15s ease",
    }),
    signOutIcon: {
      color: "#e53e3e",
    }
  };
  
  // Style objects for mobile menu items
  const mobileMenuItemStyles = {
    container: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "4px 8px",
    },
    menuItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "12px 16px",
      color: "#4a5568",
      fontWeight: "500",
      textDecoration: "none",
      borderRadius: "10px",
      background: hoveredMenuItem === id ? "#f8fafc" : "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: "none",
      fontSize: "15px",
      letterSpacing: "0.01em",
      transform: hoveredMenuItem === id ? "translateY(-1px)" : "none",
      boxShadow: hoveredMenuItem === id ? "0 2px 5px rgba(0,0,0,0.03)" : "none",
      fontFamily: "'Figtree', 'Inter', sans-serif",
    }),
    highlightItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "12px 16px",
      color: "#1a73e8",
      fontWeight: "500",
      textDecoration: "none",
      borderRadius: "10px",
      background: hoveredMenuItem === id ? "rgba(26, 115, 232, 0.12)" : "rgba(26, 115, 232, 0.08)",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: "1px solid rgba(26, 115, 232, 0.15)",
      fontSize: "15px",
      letterSpacing: "0.01em",
      marginBottom: "8px",
      transform: hoveredMenuItem === id ? "translateY(-1px)" : "none",
      boxShadow: hoveredMenuItem === id ? "0 2px 5px rgba(26, 115, 232, 0.08)" : "none",
      fontFamily: "'Figtree', 'Inter', sans-serif",
    }),
    signOutItem: (id) => ({
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "12px 16px",
      color: "#e53e3e",
      fontWeight: "500",
      textDecoration: "none",
      borderRadius: "10px",
      background: hoveredMenuItem === id ? "rgba(229, 62, 62, 0.08)" : "none",
      width: "100%",
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: "none",
      fontSize: "15px",
      letterSpacing: "0.01em",
      marginTop: "6px",
      transform: hoveredMenuItem === id ? "translateY(-1px)" : "none",
      boxShadow: hoveredMenuItem === id ? "0 2px 5px rgba(229, 62, 62, 0.08)" : "none",
      fontFamily: "'Figtree', 'Inter', sans-serif",
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
      backgroundColor: "#f0f0f0",
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
      marginBottom: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      fontFamily: "'Figtree', 'Inter', sans-serif",
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

  return (
    <header className="nav-container">
      <div className="nav-content">
        {/* Logo and Tagline */}
        <Link href="/" className="nav-logo">
          <div className="logo-with-text">
            <div className="logo-container">
              {/* Only render logo icon on desktop/tablet, hide completely on mobile to save space */}
              {!isMobile && (
                <Image 
                  src="/logo.svg" 
                  alt="IntelliResume Logo" 
                  width={40} 
                  height={40} 
                  className="logo-icon"
                  style={{ marginRight: '10px', position: 'relative', top: '-2px' }}
                  priority
                />
              )}
              <span className="logo-text">IntelliResume</span>
            </div>
            <div className="tagline-container">
              <span className="nav-tagline">Building careers, one resume at a time</span>
            </div>
          </div>
        </Link>

        {/* Main Navigation Links */}
        <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '40px' }}>
          <Link 
            href="/jobs/nursing"
            className="jobs-nav-button"
            style={{
              fontFamily: "'Figtree', 'Inter', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: router.pathname.startsWith('/jobs') ? 'rgba(34, 168, 83, 0.15)' : 'rgba(34, 168, 83, 0.1)',
              color: '#22a853',
              border: '1px solid rgba(34, 168, 83, 0.4)',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              fontWeight: router.pathname.startsWith('/jobs') ? '600' : '500',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              transform: router.pathname.startsWith('/jobs') ? 'none' : 'none',
              boxShadow: router.pathname.startsWith('/jobs') ? '0 3px 10px rgba(34, 168, 83, 0.15)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!router.pathname.startsWith('/jobs')) {
                e.currentTarget.style.backgroundColor = 'rgba(34, 168, 83, 0.15)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(34, 168, 83, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!router.pathname.startsWith('/jobs')) {
                e.currentTarget.style.backgroundColor = 'rgba(34, 168, 83, 0.1)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Jobs</span>
          </Link>
        </nav>
        
        {/* Right-side controls: Sign In/User Menu + Mobile Menu */}
        <div className="nav-controls mobile-nav-spacing">
          {/* Authentication Controls */}
          {status === 'authenticated' ? (
            <div className="auth-controls">
              {/* Create New Resume Button */}
              <button 
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
                  
                  {/* Dropdown icon */}
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
                      <svg 
                        style={dropdownItemStyles.icon('profile-desktop')} 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      My Profile
                    </Link>
                    
                    <a 
                      href="/subscription" 
                      onClick={handlePricingNavigation}
                      style={dropdownItemStyles.item('subscription-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('subscription-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg 
                        style={dropdownItemStyles.icon('subscription-desktop')} 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                      Pricing
                    </a>
                  </div>
                  
                  <div className="dropdown-section">
                    <h4 style={dropdownItemStyles.sectionTitle}>Content</h4>
                    <Link 
                      href="/profile#resumes" 
                      style={dropdownItemStyles.item('resumes-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('resumes-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg 
                        style={dropdownItemStyles.icon('resumes-desktop')} 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      My Resumes
                    </Link>
                  </div>
                  
                  <div className="dropdown-section sign-out-section">
                    <button 
                      onClick={handleSignOut} 
                      style={dropdownItemStyles.signOutItem('signout-desktop')}
                      onMouseEnter={() => setHoveredDesktopItem('signout-desktop')}
                      onMouseLeave={() => setHoveredDesktopItem(null)}
                    >
                      <svg 
                        style={dropdownItemStyles.signOutIcon} 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
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
              className="index-sign-in-button"
              style={signInButtonStyle}
              onMouseEnter={() => setIsSignInHovered(true)}
              onMouseLeave={() => setIsSignInHovered(false)}
            >
              Sign In
            </Link>
          )}
          
          {/* Mobile Menu Button - Only show when authenticated */}
          {status === 'authenticated' && (
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
          )}
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMenuOpen ? 'open' : 'closed'}`}>
        {status === 'authenticated' ? (
          <div className="mobile-menu-content">
            {/* User info */}
            <div style={mobileMenuItemStyles.userProfile}>
              <div style={mobileMenuItemStyles.statusDot}></div>
              <div style={mobileMenuItemStyles.userInfo}>
                <span style={mobileMenuItemStyles.userLabel}>Signed in as</span>
                <span style={mobileMenuItemStyles.userName}>
                  {session?.user?.name || 'User'}
                </span>
              </div>
            </div>
            
            <div style={mobileMenuItemStyles.container}>
              <Link 
                href="/jobs/nursing"
                style={mobileMenuItemStyles.menuItem('jobs')}
                onMouseEnter={() => setHoveredMenuItem('jobs')}
                onMouseLeave={() => setHoveredMenuItem(null)}
              >
                <svg 
                  style={mobileMenuItemStyles.icon(hoveredMenuItem === 'jobs')} 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                Jobs
              </Link>

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
                <svg 
                  style={mobileMenuItemStyles.icon(true)} 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {isProcessingNewResume ? 'Processing...' : 'New Resume'}
              </button>
            
              <Link 
                href="/profile"
                style={mobileMenuItemStyles.menuItem('profile')}
                onMouseEnter={() => setHoveredMenuItem('profile')}
                onMouseLeave={() => setHoveredMenuItem(null)}
              >
                <svg 
                  style={mobileMenuItemStyles.icon(hoveredMenuItem === 'profile')} 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                My Profile
              </Link>
              
              <a 
                href="/subscription"
                onClick={handlePricingNavigation}
                style={mobileMenuItemStyles.menuItem('subscription')}
                onMouseEnter={() => setHoveredMenuItem('subscription')}
                onMouseLeave={() => setHoveredMenuItem(null)}
              >
                <svg 
                  style={mobileMenuItemStyles.icon(hoveredMenuItem === 'subscription')} 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Pricing
              </a>
              
              <Link 
                href="/profile#resumes"
                style={mobileMenuItemStyles.menuItem('resumes')}
                onMouseEnter={() => setHoveredMenuItem('resumes')}
                onMouseLeave={() => setHoveredMenuItem(null)}
              >
                <svg 
                  style={mobileMenuItemStyles.icon(hoveredMenuItem === 'resumes')} 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                My Resumes
              </Link>
              
              <div style={mobileMenuItemStyles.divider}></div>
              
              <button
                onClick={handleSignOut}
                style={mobileMenuItemStyles.signOutItem('signOut')}
                onMouseEnter={() => setHoveredMenuItem('signOut')}
                onMouseLeave={() => setHoveredMenuItem(null)}
              >
                <svg 
                  style={mobileMenuItemStyles.signOutIcon} 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="mobile-menu-content">
            {/* Empty when signed out */}
          </div>
        )}
      </div>

      <style jsx>{`
        /* Logo styling */
        .nav-logo {
          font-family: 'Figtree', 'Inter', sans-serif;
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
        
        .logo-with-text {
          display: flex;
          align-items: center;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
        }
        
        .logo-text {
          background: linear-gradient(135deg, #1a73e8 15%, #4f46e5 70%, #6366f1 95%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 2px 4px rgba(0,0,0,0.08);
          font-weight: 900;
          font-size: 2.0rem; /* Increased font size for better visibility on desktop */
        }
        
        .tagline-container {
          display: flex;
          align-items: center;
          margin-left: 16px;
          position: relative;
        }
        
        .tagline-container::before {
          content: '';
          position: absolute;
          left: 0;
          height: 16px;
          width: 1px;
          background-color: rgba(100, 116, 139, 0.3);
          margin-right: 16px;
        }
        
        .nav-tagline {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 400;
          letter-spacing: 0.02em;
          opacity: 0.8;
          font-style: italic;
          padding-left: 16px;
        }
        
        .nav-logo:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        
        .nav-logo::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 3px;
          background: linear-gradient(90deg, #1a73e8, #4f46e5);
          transition: width 0.3s ease;
          opacity: 0;
          border-radius: 3px;
        }
        
        .nav-logo:hover::after {
          width: 100%;
          opacity: 1;
        }
        
        /* Navigation layout */
        .nav-container {
          position: static;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: linear-gradient(135deg, #f8f9fc, #edf2ff);
          padding: 1rem 1.5rem;
          transition: all 0.3s ease;
          box-shadow: none;
        }
        
        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1.5rem;
          height: 60px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .nav-controls {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        /* Desktop navigation controls */
        .auth-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        /* User dropdown styling */
        .user-dropdown {
          position: relative;
          margin-left: 0.5rem;
          font-family: 'Figtree', 'Inter', sans-serif;
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #4caf50;
          color: white;
          border-radius: 50px;
          padding: 6px 16px 6px 10px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
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
          margin-right: 3px;
        }
        
        .user-name {
          font-weight: 600;
          max-width: 150px;
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
        
        /* Dropdown menu */
        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          width: 220px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
          margin-top: 10px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.2s ease;
          z-index: 100;
          overflow: hidden;
          padding: 8px 0;
        }
        
        .user-dropdown:hover .dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .dropdown-section {
          padding: 4px 0;
          border-bottom: 1px solid #f1f3f5;
        }
        
        .dropdown-section:last-child {
          border-bottom: none;
        }
        
        .sign-out-section {
          margin-top: 4px;
        }
        
        /* Mobile menu button styling */
        .mobile-menu-button {
          display: none;
          background: none;
          border: none;
          color: #333;
          cursor: pointer;
          padding: 0.5rem;
          margin-left: 1rem;
        }
        
        /* Mobile menu styling */
        .mobile-menu {
          display: block;
          position: absolute;
          top: 60px;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #f8f9fc, #edf2ff);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
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
            font-family: 'Figtree', 'Inter', sans-serif;
            max-height: 100%;
          }
                
        /* Responsive styles */
        @media (max-width: 768px) {
          .nav-logo {
            font-size: 1.8rem;
            padding: 0.15rem 0;
          }
          
          .logo-text {
            font-size: 1.5rem;
          }
          
          .tagline-container {
            display: none; /* Hide tagline on mobile to save space */
          }
          
          .auth-controls {
            display: none;
          }
          
          .mobile-menu-button {
            display: block;
          }
          
          .mobile-menu {
            display: block;
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #f8f9fc, #edf2ff);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            padding: 16px;
            overflow: hidden;
            transition: all 0.3s ease;
          }
          
          .mobile-menu.closed {
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
            opacity: 0;
          }
          
          .mobile-menu.open {
            max-height: calc(100vh - 80px);
            opacity: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          .mobile-menu-content {
            max-height: 100%;
          }
          
          .nav-content {
            padding: 0 0.5rem;
          }
          
          /* Add spacing between nav-links and nav-controls on mobile */
          /* Balanced spacing for even distribution between Logo, Jobs, and Sign In */
          .mobile-nav-spacing {
            margin-left: 16px;
          }
          
          /* Ensure nav-links maintains proper spacing from logo on mobile */
          /* Balanced spacing - matching the gap between Jobs and Sign In for visual harmony */
          .nav-links {
            margin-left: 16px !important;
          }
          
          /* Jobs button styling for mobile */
          .jobs-nav-button {
            padding: 8px 14px !important;
            font-size: 14px !important;
          }
          
          .index-sign-in-button {
            padding: 8px 16px !important;
            font-size: 14px !important;
            min-width: 80px;
            text-align: center;
            justify-content: center;
          }
          
          .nav-container {
            padding: 0.75rem 0.75rem;
          }
          
          .logo-container {
            align-items: center;
          }
          
          /* Logo icon is conditionally rendered (not rendered on mobile), so no CSS needed */
          /* Logo text spacing adjustment for mobile */
          .logo-text {
            margin-left: 0;
          }
          
          /* Ensure consistent spacing between Jobs and Sign In buttons on mobile */
          .nav-controls {
            gap: 0.5rem;
            margin-left: 0; /* Remove any extra margin, spacing handled by mobile-nav-spacing */
          }
        }
        
        /* Small mobile screens */
        @media (max-width: 360px) {
          .nav-logo {
            font-size: 1.5rem;
          }
          
          .logo-text {
            font-size: 1.2rem;
          }
          
          .nav-content {
            padding: 0 0.3rem;
            height: 50px;
          }
          
          .index-sign-in-button {
            padding: 6px 12px !important;
            font-size: 13px !important;
          }
          
          /* Logo icon is conditionally rendered (not rendered on mobile), so no CSS needed */
          /* Logo text remains visible on small screens */
          .logo-text {
            margin-left: 0;
          }
        }
        
        /* Medium screens - adjust tagline position */
        @media (max-width: 1024px) and (min-width: 769px) {
          .nav-tagline {
            font-size: 0.7rem;
          }
          
          .tagline-container {
            margin-left: 12px;
          }
          
          .tagline-container::before {
            height: 14px;
          }
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