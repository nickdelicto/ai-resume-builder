import React, { useState, useEffect } from 'react';
import styles from '../../styles/blog/TableOfContents.module.css';

/**
 * TableOfContents Component
 * 
 * Displays a table of contents for blog posts with active section highlighting
 * Only includes actual article headings (h2, h3, h4) from the main content
 */
const TableOfContents = ({ headings }) => {
  const [activeId, setActiveId] = useState('');
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileToC, setShowMobileToC] = useState(false);

  // Filter out any non-article headings
  const articleHeadings = headings.filter(heading => {
    // Only include actual article headings from the main content
    // Exclude any headings that might be from navigation, UI elements, or non-article sections
    const excludedTerms = [
      'account', 
      'content', 
      'create your resume', 
      'software engineer resume example',
      'related', 
      'more examples',
      'build your resume',
      'download'
    ];
    
    const headingText = heading.text.toLowerCase();
    
    // Skip headings that contain excluded terms
    if (excludedTerms.some(term => headingText.includes(term.toLowerCase()))) {
      return false;
    }
    
    // Only include headings that are likely part of the main article content
    return true;
  });

  useEffect(() => {
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!articleHeadings || articleHeadings.length === 0) return;

    // Function to determine which section is currently in view
    const handleScroll = () => {
      // Get all section elements that have IDs matching our headings
      const headingElements = articleHeadings
        .map(heading => document.getElementById(heading.id))
        .filter(Boolean);

      if (headingElements.length === 0) return;

      // Find the heading that's currently in view
      const scrollPosition = window.scrollY + 100; // 100px offset for better UX

      // Find the last heading that's above the current scroll position
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i];
        if (element.offsetTop <= scrollPosition) {
          setActiveId(element.id);
          return;
        }
      }

      // If no heading is found, default to the first one
      setActiveId(articleHeadings[0].id);
    };

    // Check if we should show the mobile ToC
    const handleMobileToC = () => {
      if (!isMobile) return;
      
      const contentStart = document.querySelector('.mdxContent');
      if (!contentStart) return;
      
      const contentStartPosition = contentStart.getBoundingClientRect().top;
      const scrollPosition = window.scrollY;
      
      // Show mobile ToC when we've scrolled past the content start
      setShowMobileToC(scrollPosition > contentStartPosition);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleMobileToC, { passive: true });
    
    // Call once on mount to set initial active heading
    handleScroll();
    handleMobileToC();

    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleMobileToC);
    };
  }, [articleHeadings, isMobile]);

  // Don't render if no valid headings
  if (!articleHeadings || articleHeadings.length === 0) {
    return null;
  }

  // Render simple table of contents as shown in the screenshot
  return (
    <>
      {/* Desktop ToC */}
      <div className={styles.tableOfContents}>
        <h3 className={styles.tocTitle}>Table of Contents</h3>
        
        <nav className={styles.tocNav}>
          <ul className={styles.tocList}>
            {articleHeadings.map(heading => (
              <li 
                key={heading.id} 
                className={`${styles.tocItem} ${activeId === heading.id ? styles.active : ''}`}
              >
                <a 
                  href={`#${heading.id}`}
                  className={styles.tocLink}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      // Smooth scroll with offset for fixed header
                      const yOffset = -80; 
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      
                      window.scrollTo({
                        top: y,
                        behavior: 'smooth'
                      });
                      
                      setActiveId(heading.id);
                    }
                  }}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      {/* Mobile floating ToC */}
      {isMobile && showMobileToC && (
        <div className={styles.mobileToC}>
          <button 
            className={styles.mobileToCButton}
            onClick={() => setShowMobileDropdown(!showMobileDropdown)}
            aria-label="Toggle Table of Contents"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span>Contents</span>
          </button>
          
          {showMobileDropdown && (
            <div className={styles.mobileToCDropdown}>
              <div className={styles.mobileToCHeader}>
                <h3>Table of Contents</h3>
                <button 
                  onClick={() => setShowMobileDropdown(false)}
                  aria-label="Close Table of Contents"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <nav className={styles.tocNav}>
                <ul className={styles.tocList}>
                  {articleHeadings.map(heading => (
                    <li 
                      key={heading.id} 
                      className={`${styles.tocItem} ${activeId === heading.id ? styles.active : ''}`}
                    >
                      <a 
                        href={`#${heading.id}`}
                        className={styles.tocLink}
                        onClick={(e) => {
                          e.preventDefault();
                          const element = document.getElementById(heading.id);
                          if (element) {
                            // Smooth scroll with offset for fixed header
                            const yOffset = -80; 
                            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                            
                            window.scrollTo({
                              top: y,
                              behavior: 'smooth'
                            });
                            
                            setActiveId(heading.id);
                            setShowMobileDropdown(false);
                          }
                        }}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TableOfContents; 