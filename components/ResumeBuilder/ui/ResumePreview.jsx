import React, { useState, useRef, useEffect } from 'react';
import styles from './ResumePreview.module.css';
import professionalStyles from './templates/ProfessionalTemplate.module.css';
import modernStyles from './templates/ModernTemplate.module.css';
import minimalistStyles from './templates/MinimalistTemplate.module.css';
import creativeStyles from './templates/CreativeTemplate.module.css';
import executiveStyles from './templates/ExecutiveTemplate.module.css';
import atsStyles from './templates/ATSTemplate.module.css';

const ResumePreview = ({ resumeData, template = 'professional', sectionOrder = null, isPdfCapture = false }) => {
  // Refs for scroll detection
  const previewContainerRef = useRef(null);
  const resumePreviewRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  // Default section order if not provided (healthcare-focused order)
  // Summary → Experience → Credentials — experience is what employers look at first
  // Note: 'skills' removed - soft skills are implied for nurses, clinical skills in healthcareSkills
  const defaultSectionOrder = ['personalInfo', 'summary', 'experience', 'licenses', 'certifications', 'healthcareSkills', 'education', 'additional'];
  
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
  
  // Detect if content is scrollable (skip for PDF capture)
  useEffect(() => {
    if (!resumeData || isPdfCapture) return;

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
  }, [resumeData, template, isPdfCapture]);
  
  // Copy protection (skip for PDF capture)
  useEffect(() => {
    if (!resumeData || isPdfCapture) return;

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
  }, [resumeData, isPdfCapture]);

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
      return <p className={`${styles.description} ${templateStyles.description || ''}`}>{text}</p>;
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
        return <p className={`${styles.description} ${templateStyles.description || ''}`}>{text}</p>;
      }
    }

    if (lines.length === 0) return null;

    // If we only have one line, just return a paragraph
    if (lines.length === 1) {
      return <p className={`${styles.description} ${templateStyles.description || ''}`}>{text}</p>;
    }

    return (
      <div className={styles.bulletedDescription}>
        {lines.map((line, i) => {
          // Clean up the line - remove leading bullet points if they exist
          const cleanLine = line.trim().replace(/^[•\-*]\s*|^\d+\.\s*/, '');

          return (
            <div key={i} className={`${styles.bulletPoint} ${templateStyles.bulletPoint || ''}`}>
              <span className={`${styles.bullet} ${templateStyles.bullet || ''}`}>•</span>
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
  const { personalInfo, summary, experience, education, skills, additional, licenses, certifications, healthcareSkills } = resumeData;

  // Template-aware colors for inline styles in healthcare sections
  // ATS template: pure black everywhere. Others: muted grays for visual hierarchy.
  const isAts = template === 'ats';
  const colors = {
    muted: isAts ? '#000' : '#6b7280',
    separator: isAts ? '#000' : '#d1d5db',
    accent: isAts ? '#000' : '#059669',
    reference: isAts ? '#000' : '#6b7280',
  };
  
  // Render header with personal info
  const renderHeader = () => {
    if (!personalInfo) return null;
    
    switch(template) {
      case 'modern':
        // Build contact items array for separator logic
        const modernContactItems = [];
        if (personalInfo.email) modernContactItems.push(personalInfo.email);
        if (personalInfo.phone) modernContactItems.push(personalInfo.phone);
        if (personalInfo.location) modernContactItems.push(personalInfo.location);
        if (personalInfo.linkedin) modernContactItems.push(
          <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" key="linkedin">LinkedIn</a>
        );
        if (personalInfo.website) modernContactItems.push(
          <a href={personalInfo.website} target="_blank" rel="noopener noreferrer" key="portfolio">Portfolio</a>
        );

        return (
          <div className={`${styles.header} ${templateStyles.header}`}>
            <h1 className={`${styles.name} ${templateStyles.name}`}>{personalInfo.name || 'Your Name'}</h1>
            <div className={`${styles.contactInfo} ${templateStyles.contactInfo}`}>
              {modernContactItems.map((item, idx) => (
                <span key={idx}>
                  {item}
                  {idx < modernContactItems.length - 1 && (
                    <span className={`${styles.separator} ${templateStyles.separator}`}>•</span>
                  )}
                </span>
              ))}
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
        // Build contact items array for separator logic
        const professionalContactItems = [];
        if (personalInfo.email) professionalContactItems.push(personalInfo.email);
        if (personalInfo.phone) professionalContactItems.push(personalInfo.phone);
        if (personalInfo.location) professionalContactItems.push(personalInfo.location);
        if (personalInfo.linkedin) professionalContactItems.push(
          <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" key="linkedin">LinkedIn</a>
        );
        if (personalInfo.website) professionalContactItems.push(
          <a href={personalInfo.website} target="_blank" rel="noopener noreferrer" key="portfolio">Portfolio</a>
        );

        return (
          <div className={`${styles.header} ${templateStyles.header || ''}`}>
            <h1 className={`${styles.name} ${templateStyles.name || ''}`}>{personalInfo.name || 'Your Name'}</h1>
            <div className={`${styles.contactInfo} ${templateStyles.contactInfo || ''}`}>
              {professionalContactItems.map((item, idx) => (
                <span key={idx}>
                  {item}
                  {idx < professionalContactItems.length - 1 && (
                    <span className={`${styles.separator} ${templateStyles.separator || ''}`}>•</span>
                  )}
                </span>
              ))}
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
                  <span style={{ marginLeft: '16px', whiteSpace: 'nowrap' }} className={`${styles.dates} ${templateStyles.dates || ''}`}>{edu.graduationDate}</span>
                )}
              </div>
              {/* School and location on next line */}
              <div className={`${styles.itemSubtitle} ${templateStyles.itemSubtitle || ''}`}>
                <span className={`${styles.school} ${templateStyles.school || ''}`}>{edu.school}</span>
                {edu.location && <span className={`${styles.location} ${templateStyles.location || ''}`}>{edu.location}</span>}
              </div>
            </div>
            {/* Description below, if present */}
            {edu.description && <p className={`${styles.description} ${templateStyles.description || ''}`}>{edu.description}</p>}
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
          <div style={{ fontWeight: 400, fontSize: 15, color: '#222', fontFamily: 'Georgia' }}>
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
          <div className={templateStyles.skillsList}>
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
  
  // Render licenses section (nursing licenses)
  const renderLicenses = () => {
    if (!licenses || licenses.length === 0) return null;

    return (
      <div className={`${styles.section} ${templateStyles.section || ''}`}>
        <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Licenses</h2>
        <div className={styles.licensesList || ''}>
          {licenses.map((license, index) => (
            <div key={index} className={styles.licenseItem || ''} style={{ marginBottom: '4px', fontSize: '10.5pt' }}>
              <span style={{ fontWeight: 600 }}>{license.type?.toUpperCase()}</span>
              {license.state && <span> - {license.state}</span>}
              {license.licenseNumber && <span> #{license.licenseNumber}</span>}
              {license.isCompact && <span style={{ color: colors.accent, marginLeft: '8px' }}>(Compact)</span>}
              {license.expirationDate && (
                <span style={{ color: colors.muted, marginLeft: '8px' }}>
                  Exp: {new Date(license.expirationDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render certifications section (healthcare certifications)
  const renderCertifications = () => {
    if (!certifications || certifications.length === 0) return null;

    // Format certifications as a clean list
    return (
      <div className={`${styles.section} ${templateStyles.section || ''}`}>
        <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Certifications</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '10.5pt' }}>
          {certifications.map((cert, index) => (
            <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 600 }}>{cert.name}</span>
              {cert.fullName && cert.fullName !== cert.name && (
                <span style={{ color: colors.muted }}>({cert.fullName})</span>
              )}
              {cert.expirationDate && (
                <span style={{ color: colors.muted, fontSize: '0.9em' }}>
                  - Exp: {new Date(cert.expirationDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
              {index < certifications.length - 1 && <span style={{ color: colors.separator }}>|</span>}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Render healthcare skills section
  const renderHealthcareSkills = () => {
    if (!healthcareSkills) return null;

    const { ehrSystems, clinicalSkills, customSkills } = healthcareSkills;
    const hasEhr = ehrSystems && ehrSystems.length > 0;
    const hasClinical = clinicalSkills && clinicalSkills.length > 0;
    const hasCustom = customSkills && customSkills.length > 0;

    if (!hasEhr && !hasClinical && !hasCustom) return null;

    // Map EHR IDs to names
    const ehrNames = {
      'epic': 'Epic',
      'cerner': 'Cerner',
      'meditech': 'Meditech',
      'allscripts': 'Allscripts',
      'eclinicalworks': 'eClinicalWorks',
      'nextgen': 'NextGen',
      'athenahealth': 'athenahealth',
      'cpsi': 'CPSI',
      'veradigm': 'Veradigm',
      'drchrono': 'DrChrono',
      'pointclickcare': 'PointClickCare',
      'netsmart': 'Netsmart',
      'homecare-homebase': 'HomeCare HomeBase',
      'matrixcare': 'MatrixCare',
      'kareo': 'Kareo'
    };

    return (
      <div className={`${styles.section} ${templateStyles.section || ''}`}>
        <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Clinical Skills</h2>

        {hasEhr && (
          <div style={{ marginBottom: '6px', fontSize: '10.5pt' }}>
            <span style={{ fontWeight: 600 }}>EHR/EMR: </span>
            <span>{ehrSystems.map(id => ehrNames[id] || id).join(', ')}</span>
          </div>
        )}

        {(hasClinical || hasCustom) && (
          <div style={{ marginBottom: '6px', fontSize: '10.5pt' }}>
            <span style={{ fontWeight: 600 }}>Clinical: </span>
            <span>{[...(clinicalSkills || []), ...(customSkills || [])].join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  // Render additional info section (supports both old and new data structures)
  const renderAdditional = () => {
    if (!additional) return null;

    // Check for content (both old and new structures)
    const hasContent = additional.languages?.length > 0 ||
                       additional.memberships?.length > 0 ||
                       additional.awards?.length > 0 ||
                       additional.volunteer?.length > 0 ||
                       additional.references === 'available' ||
                       additional.projects?.length > 0 ||
                       additional.customSections?.length > 0;

    if (!hasContent) return null;

    // Format proficiency for display
    const formatProficiency = (prof) => {
      const labels = {
        native: 'Native',
        fluent: 'Fluent',
        proficient: 'Proficient',
        conversational: 'Conversational',
        // Old format support
        Native: 'Native',
        Fluent: 'Fluent',
        Proficient: 'Proficient',
        Intermediate: 'Intermediate',
        Conversational: 'Conversational',
        Basic: 'Basic'
      };
      return labels[prof] || prof;
    };

    return (
      <>
        {/* Languages */}
        {additional.languages?.length > 0 && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Languages</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '10.5pt' }}>
              {additional.languages.map((lang, index) => (
                <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{lang.language}</span>
                  {lang.proficiency && (
                    <span style={{ color: colors.muted }}>({formatProficiency(lang.proficiency)})</span>
                  )}
                  {index < additional.languages.length - 1 && <span style={{ color: colors.separator, marginLeft: '8px' }}>|</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Professional Memberships (new structure) */}
        {additional.memberships?.length > 0 && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Professional Memberships</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: '10.5pt' }}>
              {additional.memberships.map((mem, index) => (
                <span key={index}>
                  {mem.name}
                  {index < additional.memberships.length - 1 && <span style={{ color: colors.separator, marginLeft: '8px' }}>|</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Awards (new structure) */}
        {additional.awards?.length > 0 && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Awards & Recognition</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: '10.5pt' }}>
              {additional.awards.map((award, index) => (
                <span key={index}>
                  {award.name}
                  {index < additional.awards.length - 1 && <span style={{ color: colors.separator, marginLeft: '8px' }}>|</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Volunteer Experience (new structure) */}
        {additional.volunteer?.length > 0 && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>Volunteer Experience</h2>
            {additional.volunteer.map((vol, index) => (
              <div key={index} style={{ marginBottom: '4px', fontSize: '10.5pt' }}>
                <span style={{ fontWeight: 600 }}>{vol.organization}</span>
                {vol.role && <span style={{ color: colors.muted }}> - {vol.role}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Projects (legacy support) */}
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

        {/* Custom Sections (legacy support) */}
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

        {/* References */}
        {additional.references === 'available' && (
          <div className={`${styles.section} ${templateStyles.section || ''}`}>
            <h2 className={`${styles.sectionTitle} ${templateStyles.sectionTitle || ''}`}>References</h2>
            <p style={{ fontStyle: 'italic', color: colors.reference }}>Available upon request</p>
          </div>
        )}
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
      case 'licenses':
        return renderLicenses();
      case 'certifications':
        return renderCertifications();
      case 'healthcareSkills':
        return renderHealthcareSkills();
      default:
        return null;
    }
  };
  
  // PDF capture mode: no previewContainer wrapper, no noCopy, no scroll indicator
  if (isPdfCapture) {
    return (
      <div
        className={`${styles.resumePreview} ${templateStyles.resumePreview || ''}`}
        ref={resumePreviewRef}
        style={{ maxHeight: 'none', overflow: 'visible', height: 'auto' }}
      >
        {renderHeader()}
        {usedSectionOrder
          .filter(sectionId => sectionId !== 'personalInfo')
          .map(sectionId => (
            <React.Fragment key={sectionId}>
              {renderSectionContent(sectionId)}
            </React.Fragment>
          ))
        }
      </div>
    );
  }

  // Live preview mode: full interactive wrapper
  return (
    <div className={styles.previewContainer} ref={previewContainerRef}>
      <div
        className={`${styles.resumePreview} ${templateStyles.resumePreview || ''} ${styles.noCopy}`}
        ref={resumePreviewRef}
      >
        {renderHeader()}
        {usedSectionOrder
          .filter(sectionId => sectionId !== 'personalInfo')
          .map(sectionId => (
            <React.Fragment key={sectionId}>
              {renderSectionContent(sectionId)}
            </React.Fragment>
          ))
        }
      </div>

      {showScrollIndicator && (
        <div className={`${styles.scrollIndicator} ${styles.showScrollIndicator}`}>
          Scroll to see more
        </div>
      )}
    </div>
  );
};

export default ResumePreview;