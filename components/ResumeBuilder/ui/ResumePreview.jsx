import React, { useState, useRef, useEffect } from 'react';
import styles from './ResumePreview.module.css';
import professionalStyles from './templates/ProfessionalTemplate.module.css';
import modernStyles from './templates/ModernTemplate.module.css';
import minimalistStyles from './templates/MinimalistTemplate.module.css';
import creativeStyles from './templates/CreativeTemplate.module.css';
import executiveStyles from './templates/ExecutiveTemplate.module.css';
import atsStyles from './templates/ATSTemplate.module.css';

const ResumePreview = ({ resumeData, template = 'professional', sectionOrder = null }) => {
  // Refs for scroll detection
  const previewContainerRef = useRef(null);
  const resumePreviewRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  // Function to check if this preview is being rendered for PDF capture
  const isForPdfCapture = useRef(false);
  
  // Default section order if not provided
  const defaultSectionOrder = ['personalInfo', 'summary', 'experience', 'education', 'skills', 'additional'];
  
  // Use provided section order or default
  const usedSectionOrder = sectionOrder || defaultSectionOrder;
  
  // Select template styles
  const templateStyles = (() => {
    switch(template) {
      case 'modern':
        return modernStyles;
      case 'minimalist':
        return minimalistStyles;
      case 'creative':
        return creativeStyles;
      case 'executive':
        return executiveStyles;
      case 'ats':
        return atsStyles;
      case 'professional':
      default:
        return professionalStyles;
    }
  })();
  
  // Check if the component is rendered within a PDF capture container
  useEffect(() => {
    if (!resumeData) return; // Skip effect if no data
    
    if (typeof document !== 'undefined' && resumePreviewRef.current) {
      // Look for a parent with the PDF capture class
      let parent = resumePreviewRef.current.parentElement;
      while (parent) {
        if (parent.classList && 
            (parent.classList.contains('pdf-capture-container') || 
             parent.classList.contains('resume-content-for-pdf'))) {
          isForPdfCapture.current = true;
          console.log('Resume preview detected as being used for PDF capture');
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, [resumeData]);
  
  // Detect if content is scrollable
  useEffect(() => {
    if (!resumeData) return; // Skip effect if no data
    
    const checkScrollability = () => {
      if (resumePreviewRef.current) {
        const isScrollable = resumePreviewRef.current.scrollHeight > resumePreviewRef.current.clientHeight;
        setShowScrollIndicator(isScrollable);
      }
    };
    
    // Initial check
    checkScrollability();
    
    // Check again after a short delay to account for any rendering delays
    const timer = setTimeout(checkScrollability, 500);
    
    // Add resize listener
    window.addEventListener('resize', checkScrollability);
    
    // Cleanup
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [resumeData, template]);
  
  // Copy protection
  useEffect(() => {
    if (!resumeData) return; // Skip effect if no data
    
    // Skip copy protection when rendered for PDF capture
    if (isForPdfCapture.current) {
      console.log('Skipping copy protection for PDF capture');
      return;
    }
    
    // Function to prevent copy/cut events
    const preventCopy = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
  
    // Function to prevent keyboard shortcuts for copy/cut
    const preventCopyShortcuts = (e) => {
      // Check for Ctrl+C, Ctrl+X, Cmd+C, Cmd+X
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Get the resume preview element
    const previewElement = resumePreviewRef.current;
    if (previewElement) {
      // Add event listeners to prevent copying
      previewElement.addEventListener('copy', preventCopy);
      previewElement.addEventListener('cut', preventCopy);
      previewElement.addEventListener('keydown', preventCopyShortcuts);
      
      // Add context menu prevention (right-click)
      previewElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      });

      console.log('📊 Copy protection enabled for resume preview');
    }

    // Cleanup function to remove event listeners
    return () => {
      if (previewElement) {
        previewElement.removeEventListener('copy', preventCopy);
        previewElement.removeEventListener('cut', preventCopy);
        previewElement.removeEventListener('keydown', preventCopyShortcuts);
        previewElement.removeEventListener('contextmenu', preventCopy);
      }
    };
  }, [resumeData]);
  
  // Helper function for rendering bulleted text
  const renderBulletedText = (text) => {
    if (!text) return null;

    // Detect different bullet patterns
    const hasBulletPoints = 
      text.includes('• ') || 
      text.includes('- ') || 
      text.includes('* ') || 
      text.includes('\n') ||
      /^\d+\.\s/.test(text);

    // If text doesn't have any bullet indicators, render as plain paragraph
    if (!hasBulletPoints) {
      return <p className={styles.description}>{text}</p>;
    }

    // Split text by various potential delimiters
    let lines = [];
    
    // First check if it has multiple paragraphs
    if (text.includes('\n\n')) {
      lines = text.split('\n\n').filter(line => line.trim() !== '');
    } else if (text.includes('\n')) {
      lines = text.split('\n').filter(line => line.trim() !== '');
    } else {
      // If no newlines, try to split by bullet characters
      const bulletSplitRegex = /(?:^|\s)(?:[•\-*]|\d+\.)\s+/g;
      const parts = text.split(bulletSplitRegex).filter(part => part.trim());
      
      if (parts.length > 1) {
        lines = parts;
      } else {
        // If no bullet splitting worked, just use the text as is
        return <p className={styles.description}>{text}</p>;
      }
    }
    
    if (lines.length === 0) return null;
    
    // If we only have one line, just return a paragraph
    if (lines.length === 1) {
      return <p className={styles.description}>{text}</p>;
    }
    
    return (
      <div className={styles.bulletedDescription}>
        {lines.map((line, i) => {
          // Clean up the line - remove leading bullet points if they exist
          const cleanLine = line.trim().replace(/^[•\-*]\s*|^\d+\.\s*/, '');
          
          return (
            <div key={i} className={styles.bulletPoint}>
              <span className={styles.bullet}>•</span>
              {cleanLine}
            </div>
          );
        })}
      </div>
    );
  };
  
  // Early return moved to here
  if (!resumeData) return null;
  
  // Extract data for convenience in the rendering functions
  const { personalInfo, summary, experience, education, skills, additional } = resumeData;
  
  // Render header with personal info
  const renderHeader = () => {
    if (!personalInfo) return null;
    
    switch(template) {
      case 'modern':
        return (
          <div className={`${styles.header} ${templateStyles.header}`}>
            <div className={templateStyles.headerSidebar}>
              <h1 className={`${styles.name} ${templateStyles.name}`}>{personalInfo.name || 'Your Name'}</h1>
            </div>
            <div className={templateStyles.contactContainer}>
              {personalInfo.email && (
                <span className={templateStyles.contactItem}>{personalInfo.email}</span>
              )}
              {personalInfo.phone && (
                <span className={templateStyles.contactItem}>{personalInfo.phone}</span>
              )}
              {personalInfo.location && (
                <span className={templateStyles.contactItem}>{personalInfo.location}</span>
              )}
              {personalInfo.linkedin && (
                <span className={templateStyles.contactItem}>
                  <a href={personalInfo.linkedin}>LinkedIn</a>
                </span>
              )}
              {personalInfo.website && (
                <span className={templateStyles.contactItem}>
                  <a href={personalInfo.website}>Portfolio</a>
                </span>
              )}
            </div>
          </div>
        );
      
      case 'creative':
        return (
          <div className={`${styles.header} ${templateStyles.header}`}>
            <div className={templateStyles.headerMain}>
              <h1 className={`${styles.name} ${templateStyles.name}`}>{personalInfo.name || 'Your Name'}</h1>
            </div>
            <div className={templateStyles.contactGrid}>
              {/* Email: icon + label + value, not clickable */}
              {personalInfo.email && (
                <div className={templateStyles.contactBox}>
                  <span className={templateStyles.contactIcon}>✉</span>
                  <div>
                    <div className={templateStyles.contactLabel}>Email</div>
                    <div className={templateStyles.contactValue}>{personalInfo.email}</div>
                  </div>
                </div>
              )}
              {/* Phone: icon + label + value */}
              {personalInfo.phone && (
                <div className={templateStyles.contactBox}>
                  <span className={templateStyles.contactIcon}>📱</span>
                  <div>
                    <div className={templateStyles.contactLabel}>Phone</div>
                    <div className={templateStyles.contactValue}>{personalInfo.phone}</div>
                  </div>
                </div>
              )}
              {/* Location: icon + label + value */}
              {personalInfo.location && (
                <div className={templateStyles.contactBox}>
                  <span className={templateStyles.contactIcon}>📍</span>
                  <div>
                    <div className={templateStyles.contactLabel}>Location</div>
                    <div className={templateStyles.contactValue}>{personalInfo.location}</div>
                  </div>
                </div>
              )}
              {/* LinkedIn: icon + label, clickable, no underline */}
              {personalInfo.linkedin && (
                <div className={templateStyles.contactBox}>
                  <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                    <span className={templateStyles.contactIcon}>💼</span>
                    <span className={templateStyles.contactLabel}>LinkedIn</span>
                  </a>
                </div>
              )}
              {/* Portfolio: icon + label, clickable, no underline */}
              {personalInfo.website && (
                <div className={templateStyles.contactBox}>
                  <a href={personalInfo.website} target="_blank" rel="noopener noreferrer">
                    <span className={templateStyles.contactIcon}>🌐</span>
                    <span className={templateStyles.contactLabel}>Portfolio</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'minimalist':
      case 'executive':
        return (
          <div className={`${styles.header} ${templateStyles.header}`}>
            <h1 className={`${styles.name} ${templateStyles.name}`}>{personalInfo.name || 'Your Name'}</h1>
            <div className={`${styles.contactInfo} ${templateStyles.contactInfo}`}>
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>{personalInfo.phone}</span>}
              {personalInfo.location && <span>{personalInfo.location}</span>}
              {personalInfo.linkedin && <span><a href={personalInfo.linkedin}>LinkedIn</a></span>}
              {personalInfo.website && <span><a href={personalInfo.website}>Portfolio</a></span>}
            </div>
          </div>
        );
        
      case 'ats':
        // Build the contact info array in the correct order, skipping empty values
        const atsContactItems = [];
        if (personalInfo.email) atsContactItems.push(personalInfo.email);
        if (personalInfo.phone) atsContactItems.push(personalInfo.phone);
        if (personalInfo.location) atsContactItems.push(personalInfo.location);
        if (personalInfo.linkedin) atsContactItems.push(
          <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" key="linkedin">LinkedIn</a>
        );
        if (personalInfo.website) atsContactItems.push(
          <a href={personalInfo.website} target="_blank" rel="noopener noreferrer" key="portfolio">Portfolio</a>
        );
        // Render the contact info line with ' • ' separator, no trailing separator
        // This approach ensures the output matches the preview and PDF exactly
        return (
          <div className={`${styles.header} ${templateStyles.header}`}>
            <h1 className={`${styles.name} ${templateStyles.name}`}>{personalInfo.name || 'Your Name'}</h1>
            <div className={`${styles.contactInfo} ${templateStyles.contactInfo}`}>
              {atsContactItems.map((item, idx) => (
                <span key={idx}>
                  {item}
                  {idx < atsContactItems.length - 1 && (
                    <span className={`${styles.separator} ${templateStyles.separator}`}>•</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        );
        
      case 'professional':
      default:
        return (
          <div className={styles.header}>
            <h1 className={`${styles.name} ${templateStyles.name || ''}`}>{personalInfo.name || 'Your Name'}</h1>
            <div className={`${styles.contactInfo} ${templateStyles.contactInfo || ''}`}>
              {personalInfo.email && <span>{personalInfo.email}</span>}
              {personalInfo.phone && <span>{personalInfo.phone}</span>}
              {personalInfo.location && <span>{personalInfo.location}</span>}
              {personalInfo.linkedin && <span><a href={personalInfo.linkedin}>LinkedIn</a></span>}
              {personalInfo.website && <span><a href={personalInfo.website}>Portfolio</a></span>}
            </div>
          </div>
        );
    }
  };
  
  // Render summary section
  const renderSummary = () => {
    if (!summary) return null;
    return (
      <div className={`${styles.section} ${templateStyles.section || ''}`}>
        <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Professional Summary</h2>
        <p className={`${styles.summary} ${templateStyles.summary || ''}`}>{summary}</p>
      </div>
    );
  };
  
  // Render experience section
  const renderExperience = () => {
    if (!experience || experience.length === 0) return null;
    return (
      <div className={`${styles.section} ${templateStyles.section || ''}`}>
        <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Experience</h2>
        {experience.map((job, index) => (
          <div key={index} className={`${styles.item} ${templateStyles.item || ''}`}>
            <div className={`${styles.itemHeader} ${templateStyles.itemHeader || ''}`}>
              <h3 className={`${styles.itemTitle} ${templateStyles.itemTitle || ''}`}>
                {job.title}
              {(job.startDate || job.endDate) && (
                <div className={`${styles.dates} ${templateStyles.dates || ''}`}>
                  {job.startDate && <span>{job.startDate}</span>}
                  {job.startDate && job.endDate && <span> - </span>}
                  {job.endDate ? <span>{job.endDate}</span> : <span>Present</span>}
                </div>
              )}
              </h3>
              <div className={`${styles.itemSubtitle} ${templateStyles.itemSubtitle || ''}`}>
                <span className={`${styles.company} ${templateStyles.company || ''}`}>{job.company}</span>
                {job.location && <span className={`${styles.location} ${templateStyles.location || ''}`}>{job.location}</span>}
              </div>
            </div>
            {renderBulletedText(job.description)}
          </div>
        ))}
      </div>
    );
  };
  
  // Render education section
  const renderEducation = () => {
    if (!education || education.length === 0) return null;
    return (
      <div className={`${styles.section} ${templateStyles.section || ''}`}>
        <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Education</h2>
        {education.map((edu, index) => (
          <div key={index} className={`${styles.item} ${templateStyles.item || ''}`}>
            <div className={`${styles.itemHeader} ${templateStyles.itemHeader || ''}`}>
              {/* Degree and graduation date on the same line, flexbox for alignment */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className={`${styles.itemTitle} ${templateStyles.itemTitle || ''}`}>{edu.degree}</span>
                {edu.graduationDate && (
                  <span style={{ fontWeight: 'bold', marginLeft: '16px', whiteSpace: 'nowrap' }} className={`${styles.dates} ${templateStyles.dates || ''}`}>{edu.graduationDate}</span>
                )}
              </div>
              {/* School and location on next line */}
              <div className={`${styles.itemSubtitle} ${templateStyles.itemSubtitle || ''}`}>
                <span className={`${styles.school} ${templateStyles.school || ''}`}>{edu.school}</span>
                {edu.location && <span className={`${styles.location} ${templateStyles.location || ''}`}>{edu.location}</span>}
              </div>
            </div>
            {/* Description below, if present */}
            {edu.description && <p className={styles.description}>{edu.description}</p>}
          </div>
        ))}
      </div>
    );
  };
  
  // Render skills section
  const renderSkills = () => {
    if (!skills || skills.length === 0) return null;
    // Minimalist: ATS-friendly, plain text with vertical bars
    if (template === 'minimalist') {
      return (
        <div className={`${styles.section} ${templateStyles.section || ''}`}>
          <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Skills</h2>
          {/* ATS-friendly: plain text, vertical bar separated */}
          <div style={{ fontWeight: 400, fontSize: 15, color: '#222', fontFamily: 'Playfair Display' }}>
            {skills.filter(Boolean).join(' | ')}
          </div>
        </div>
      );
    }
    // ATS template: render as comma-separated line for ATS optimization
    if (template === 'ats') {
      return (
        <div className={`${styles.section} ${templateStyles.section || ''}`}>
          <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Skills</h2>
          {/* ATS best practice: comma-separated for easy ATS parsing */}
          <div className={templateStyles.skillsList} style={{ fontWeight: 'normal', fontSize: '11pt', color: '#000' }}>
            {skills.filter(Boolean).join(', ')}
          </div>
        </div>
      );
    }
    // Other templates: keep badge/pill style
    return (
      <div className={`${styles.section} ${templateStyles.section || ''}`}>
        <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Skills</h2>
        <div className={`${styles.skillsList} ${templateStyles.skillsList || ''}`}>
          {skills.map((skill, index) => (
            <span key={index} className={`${styles.skill} ${templateStyles.skill || ''}`}>{skill}</span>
          ))}
        </div>
      </div>
    );
  };
  
  // Render additional info section
  const renderAdditional = () => {
    if (!additional) return null;
    
    const hasContent = additional.certifications?.length > 0 || 
                       additional.languages?.length > 0 || 
                       additional.projects?.length > 0 ||
                       additional.customSections?.length > 0;
    
    if (!hasContent) return null;
    
    return (
      <>
        {additional.certifications?.length > 0 && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Certifications</h2>
            {additional.certifications.map((cert, index) => (
              <div key={index} className={`${styles.item} ${templateStyles.item || ''}`}>
                <h3 className={`${styles.itemTitle} ${templateStyles.itemTitle || ''}`}>{cert.name}</h3>
                <div className={styles.certDetails}>
                  {cert.issuer && <span className={styles.certIssuer}>{cert.issuer}</span>}
                  {cert.date && <span className={styles.certDate}>({cert.date})</span>}
                </div>
                {cert.description && <p className={styles.description}>{cert.description}</p>}
              </div>
            ))}
          </div>
        )}
        
        {additional.languages?.length > 0 && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Languages</h2>
            <div className={styles.languagesList}>
              {additional.languages.map((lang, index) => (
                <div key={index} className={styles.language}>
                  <span className={styles.languageName}>{lang.language}</span>
                  {lang.proficiency && (
                    <span className={styles.languageProficiency}>({lang.proficiency})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {additional.projects?.length > 0 && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Projects</h2>
            {additional.projects.map((project, index) => (
              <div key={index} className={`${styles.item} ${templateStyles.item || ''}`}>
                <div className={`${styles.itemHeader} ${templateStyles.itemHeader || ''}`}>
                  <h3 className={`${styles.itemTitle} ${templateStyles.itemTitle || ''}`}>{project.name}</h3>
                  {project.date && <div className={`${styles.dates} ${templateStyles.dates || ''}`}>{project.date}</div>}
                </div>
                {renderBulletedText(project.description)}
              </div>
            ))}
          </div>
        )}
        
        {additional.customSections?.length > 0 && additional.customSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>{section.title}</h2>
            {section.items?.map((item, itemIndex) => (
              <div key={itemIndex} className={`${styles.item} ${templateStyles.item || ''}`}>
                <div className={`${styles.itemHeader} ${templateStyles.itemHeader || ''}`}>
                  <h3 className={`${styles.itemTitle} ${templateStyles.itemTitle || ''}`}>{item.title}</h3>
                  {item.subtitle && <div className={`${styles.itemSubtitle} ${templateStyles.itemSubtitle || ''}`}>{item.subtitle}</div>}
                  {item.date && <div className={`${styles.dates} ${templateStyles.dates || ''}`}>{item.date}</div>}
                </div>
                {item.content && renderBulletedText(item.content)}
              </div>
            ))}
          </div>
        ))}
      </>
    );
  };
  
  // Helper to render section content based on ID
  const renderSectionContent = (sectionId) => {
    switch(sectionId) {
      case 'summary':
        return renderSummary();
      case 'experience':
        return renderExperience();
      case 'education':
        return renderEducation();
      case 'skills':
        return renderSkills();
      case 'additional':
        return renderAdditional();
      default:
        return null;
    }
  };
  
  return (
    <div className={styles.previewContainer} ref={previewContainerRef}>
      <div 
        className={`${styles.resumePreview} ${templateStyles.resumePreview || ''} ${styles.noCopy}`}
        ref={resumePreviewRef}
      >
        {/* Header with personal info is always first */}
        {renderHeader()}
        
        {/* Render other sections in the specified order */}
        {usedSectionOrder
          .filter(sectionId => sectionId !== 'personalInfo') // Skip personalInfo which is already rendered
          .map(sectionId => (
            <React.Fragment key={sectionId}>
              {renderSectionContent(sectionId)}
            </React.Fragment>
          ))
        }
      </div>
      
      {/* Scroll indicator */}
      {showScrollIndicator && (
        <div className={`${styles.scrollIndicator} ${styles.showScrollIndicator}`}>
          Scroll to see more
        </div>
      )}
    </div>
  );
};

export default ResumePreview;