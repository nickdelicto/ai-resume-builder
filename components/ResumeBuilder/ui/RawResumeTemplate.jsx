import React from 'react';
import modernStyles from './templates/ModernTemplate.module.css';
import minimalistStyles from './templates/MinimalistTemplate.module.css';
import creativeStyles from './templates/CreativeTemplate.module.css';
import atsStyles from './templates/ATSTemplate.module.css';

/**
 * A stripped down version of ResumePreview that only renders the raw template
 * without any preview-specific containers or styles. Used for PDF generation.
 */
const RawResumeTemplate = ({ resumeData, template = 'ats', sectionOrder = null }) => {
  // Get template-specific styles
  const getTemplateStyles = () => {
    switch (template) {
      case 'modern':
        return modernStyles;
      case 'minimalist':
        return minimalistStyles;
      case 'creative':
        return creativeStyles;
      case 'ats':
      default:
        return atsStyles;
    }
  };

  const styles = getTemplateStyles();

  // Helper to render bulleted text
  const renderBulletedText = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n').filter(line => line.trim());
    return (
      <>
        {lines.map((line, i) => (
          <div key={i} className={styles.bulletPoint}>
            <span className={styles.bullet}>•</span>
            {line.trim()}
          </div>
        ))}
      </>
    );
  };

  // Default section order if none provided
  const defaultSectionOrder = [
    'personalInfo',
    'summary',
    'experience',
    'education',
    'skills',
    'additional'
  ];

  // Use provided section order or default
  const orderedSections = sectionOrder || defaultSectionOrder;

  // Filter out personalInfo since it's always rendered in the header
  const sectionsToRender = orderedSections.filter(id => id !== 'personalInfo');

  // Updated renderSection function
  const renderSection = (sectionId) => {
    if (template === 'creative') {
      switch (sectionId) {
        case 'summary':
          return resumeData.summary ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Professional Summary</h2>
              <div className={styles.summary}>{resumeData.summary}</div>
            </div>
          ) : null;

        case 'experience':
          return resumeData.experience?.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Experience</h2>
              {resumeData.experience.map((job, index) => (
                <div key={index} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>
                      {job.title}
                      {(job.startDate || job.endDate) && (
                        <span className={styles.dates}>
                          {job.startDate && <span>{job.startDate}</span>}
                          {job.startDate && job.endDate && <span> - </span>}
                          {job.endDate ? <span>{job.endDate}</span> : <span>Present</span>}
                        </span>
                      )}
                    </h3>
                    <div className={styles.itemSubtitle} style={{ marginBottom: 8 }}>
                      <span className={styles.company}>{job.company}</span>
                      {job.location && <span className={styles.location}>{job.location}</span>}
                    </div>
                  </div>
                  {job.description && (
                    <div className={styles.bulletedDescription}>
                      {job.description.split('\n').filter(line => line.trim()).map((line, i) => (
                        <div key={i} className={styles.bulletPoint}>
                          <span className={styles.bullet}>•</span>
                          {line.trim()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null;

        case 'education':
          return resumeData.education?.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Education</h2>
              {resumeData.education.map((edu, index) => (
                <div key={index} className={styles.item}>
                  <div className={styles.itemTitle}>{edu.degree}</div>
                  <div className={styles.schoolLocationRow}>
                    <span className={styles.school}>{edu.school}</span>
                    {edu.location && <span style={{ width: 12, display: 'inline-block' }}></span>}
                    {edu.location && <span className={styles.location}>{edu.location}</span>}
                    {edu.graduationDate && (
                      <>
                        <span style={{ width: 12, display: 'inline-block' }}></span>
                        <span className={styles.dates}>{edu.graduationDate}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null;

        case 'skills':
          return resumeData.skills?.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Skills</h2>
              <div className={styles.skillsList}>
                {resumeData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className={styles.skill}
                    style={{ color: '#4263eb', WebkitTextFillColor: '#4263eb', textFillColor: '#4263eb' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null;

        case 'additional':
          const additional = resumeData.additional;
          if (!additional) return null;

          return (
            <>
              {/* Languages */}
              {additional.languages?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Languages</h2>
                  {/* Use flex row for languages, each as a span for inline display */}
                  <div className={styles.languagesList}>
                    {additional.languages.map((lang, index) => (
                      <span key={index} className={styles.language}>
                        <span className={styles.languageName}>{lang.language}</span>
                        {lang.proficiency && (
                          <span className={styles.languageProficiency}>
                            {' '}({lang.proficiency})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {additional.certifications?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Certifications</h2>
                  {additional.certifications.map((cert, index) => (
                    <div key={index} className={styles.item}>
                      {/* Certificate name - bold and larger */}
                      <div className={styles.itemTitle}>{cert.name}</div>
                      {/* Issuer and date on the same line, date in parentheses and italic/gray */}
                      <div className={styles.certDetails}>
                        {cert.issuer && <span className={styles.certIssuer}>{cert.issuer}</span>}
                        {cert.date && (
                          <span className={styles.certDate}>
                            {cert.issuer && ' '}
                            (<span>{cert.date}</span>)
                          </span>
                        )}
                      </div>
                      {/* Description below, smaller font */}
                      {cert.description && <div className={styles.description}>{cert.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {additional.projects?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Projects</h2>
                  {additional.projects.map((project, index) => (
                    <div key={index} className={styles.item}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemTitle}>{project.name}</div>
                        {project.date && <div className={styles.dates}>{project.date}</div>}
                      </div>
                      {/* Project description, bulleted if multiline */}
                      {project.description && (
                        <div className={styles.bulletedDescription}>
                          {project.description.split('\n').filter(line => line.trim()).map((line, i) => (
                            <div key={i} className={styles.bulletPoint}>
                              <span className={styles.bullet}>•</span>
                              {line.trim()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Awards */}
              {additional.awards?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Awards</h2>
                  {additional.awards.map((award, index) => (
                    <div key={index} className={styles.item}>
                      <div className={styles.itemTitle}>{award.title || award.name}</div>
                      {award.date && <div className={styles.dates}>{award.date}</div>}
                      {award.description && <div className={styles.description}>{award.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Volunteer */}
              {additional.volunteer?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Volunteer</h2>
                  {additional.volunteer.map((vol, index) => (
                    <div key={index} className={styles.item}>
                      <div className={styles.itemTitle}>{vol.title || vol.role}</div>
                      {vol.organization && <div className={styles.itemSubtitle}>{vol.organization}</div>}
                      {vol.date && <div className={styles.dates}>{vol.date}</div>}
                      {vol.description && <div className={styles.description}>{vol.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Sections */}
              {additional.customSections?.length > 0 && additional.customSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className={styles.section}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  {section.items && section.items.length > 0 && section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className={styles.item}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemTitle}>{item.title}</div>
                        {item.subtitle && <div className={styles.itemSubtitle}>{item.subtitle}</div>}
                        {item.date && <div className={styles.dates}>{item.date}</div>}
                      </div>
                      {/* Use item.content instead of item.description */}
                      {item.content && renderBulletedText(item.content)}
                    </div>
                  ))}
                </div>
              ))}
            </>
          );

        default:
          return null;
      }
    } else {
      switch (sectionId) {
        case 'summary':
          if (template === 'ats') {
            return resumeData.summary ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle} style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '16px', letterSpacing: 0.5, marginBottom: 4 }}>
                  Professional Summary
                </div>
                <div className={styles.summary}>{resumeData.summary}</div>
              </div>
            ) : null;
          }
          // Fallback for other templates (existing code)
          return resumeData.summary ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Professional Summary</h2>
              <div className={styles.summary}>{resumeData.summary}</div>
            </div>
          ) : null;

        case 'experience':
          // --- Modern Template: Pixel-perfect match to preview ---
          if (template === 'modern') {
            return resumeData.experience?.length > 0 ? (
              <div className={styles.section}>
                {/* Section title: all caps, blue, underlined */}
                <div className={styles.sectionTitle}>EXPERIENCE</div>
                {resumeData.experience.map((exp, idx) => (
                  <div key={idx} className={styles.item}>
                    {/* Job title and dates on the same row, justified apart */}
                    <div className={styles.itemHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span className={styles.itemTitle}>{exp.title}</span>
                      <span className={styles.dates}>{exp.startDate}{exp.endDate ? ` - ${exp.endDate}` : ''}</span>
                    </div>
                    {/* Company and location stacked vertically */}
                    <div className={styles.itemSubtitle} style={{ marginBottom: 8 }}>
                      {exp.company && <span className={styles.company}>{exp.company}</span>}
                      {exp.location && <span className={styles.location}>{exp.location}</span>}
                    </div>
                    {/* Bulleted description */}
                    {exp.description && (
                      <div>
                        {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                          <div key={i} className={styles.bulletPoint}>
                            <span className={styles.bullet}>•</span>
                            {line.trim()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null;
          }
          if (template === 'ats') {
            return resumeData.experience?.length > 0 ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Experience</div>
                {resumeData.experience.map((exp, idx) => (
                  <div key={idx} className={styles.item}>
                    {/* Job title and dates on the same line */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <span className={styles.itemTitle}>{exp.title}</span>
                      {exp.startDate && (
                        <span className={styles.dates} style={{ fontStyle: 'italic', fontWeight: 400 }}>
                          {exp.startDate}{exp.endDate ? ` - ${exp.endDate}` : ''}
                        </span>
                      )}
                    </div>
                    {/* Company on its own line */}
                    {exp.company && (
                      <div className={styles.company} style={{ fontWeight: 700 }}>{exp.company}</div>
                    )}
                    {/* Location on its own line */}
                    {exp.location && (
                      <div className={styles.location}>{exp.location}</div>
                    )}
                    {/* Bullets */}
                    {exp.description && (
                      <div>
                        {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                          <div key={i} className={styles.bulletPoint}>
                            <span className={styles.bullet}>•</span>
                            {line.trim()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null;
          }
          return (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Work Experience</div>
              {resumeData.experience.map((exp, idx) => (
                <div key={idx} className={styles.item}>
                  {/* First row: Job title (left), Dates (right) */}
                  <div className={styles.expHeaderRow}>
                    <span className={styles.itemTitle}>{exp.title}</span>
                    {/* Enforce date color inline for PDF consistency */}
                    <span 
                      className={styles.dates}
                      style={{ color: '#888', fontStyle: 'italic' }}
                    >
                      {exp.startDate} - {exp.endDate || 'Present'}
                    </span>
                  </div>
                  {/* Second row: Company and Location */}
                  <div className={styles.companyLocationRow}>
                    <span className={styles.company}>{exp.company}</span>
                    {exp.location && <span className={styles.companyLocationSpacer}></span>}
                    {exp.location && <span className={styles.location}>{exp.location}</span>}
                  </div>
                  {/* Description bullets */}
                  {exp.description && renderBulletedText(exp.description)}
                </div>
              ))}
            </div>
          );

        case 'education':
          // --- ATS, Modern, Minimalist: Show graduation date (graduationDate or endDate) on same line as degree ---
          if (['ats', 'modern', 'minimalist'].includes(template)) {
            return resumeData.education?.length > 0 ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Education</div>
                {resumeData.education.map((edu, index) => {
                  const gradDate = edu.graduationDate || edu.endDate;
                  return (
                    <div key={index} className={styles.item}>
                      {/* Degree and date on the same row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div className={styles.itemTitle}>{edu.degree}</div>
                        {gradDate && <div className={styles.dates}>{gradDate}</div>}
                      </div>
                      {/* School and location stacked below */}
                      {edu.school && <div className={styles.company}><strong>{edu.school}</strong></div>}
                      {edu.location && <div className={styles.location}>{edu.location}</div>}
                    </div>
                  );
                })}
              </div>
            ) : null;
          }
          if (template === 'ats') {
            return resumeData.education?.length > 0 ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Education</div>
                {resumeData.education.map((edu, index) => (
                  <div key={index} className={styles.item}>
                    <div className={styles.itemTitle}>{edu.degree}</div>
                    {edu.school && (
                      <div className={styles.company}><strong>{edu.school}</strong></div>
                    )}
                    {edu.location && (
                      <div className={styles.location}>{edu.location}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : null;
          }
          // Minimalist: degree, then school + location on next line
          if (template === 'minimalist') {
            return resumeData.education?.length > 0 ? (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Education</h2>
                {resumeData.education.map((edu, index) => (
                  <div key={index} className={styles.item}>
                    {/* Degree on its own line, bold and larger */}
                    <div className={styles.itemTitle}>{edu.degree}</div>
                    {/* School and location on next line, left-aligned. Enforce .school and .location for PDF/preview consistency */}
                    <div className={styles.schoolLocationRow}>
                      <span className={styles.school}>{edu.school}</span>
                      {edu.location && <span style={{ width: 12, display: 'inline-block' }}></span>}
                      {edu.location && <span className={styles.location}>{edu.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : null;
          }
          // Other templates: keep badge/pill style
          return resumeData.education?.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Education</h2>
              {resumeData.education.map((edu, index) => (
                <div key={index} className={styles.item}>
                  <div className={styles.itemTitle}>{edu.degree}</div>
                  <div className={styles.schoolLocationRow}>
                    <span className={styles.school}>{edu.school}</span>
                    {edu.location && <span style={{ width: 12, display: 'inline-block' }}></span>}
                    {edu.location && <span className={styles.location}>{edu.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : null;

        case 'skills':
          if (template === 'modern') {
            return resumeData.skills?.length > 0 ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>SKILLS</div>
                <div className={styles.skillsList}>
                  {resumeData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className={styles.skill}
                      style={{ color: '#4263eb', WebkitTextFillColor: '#4263eb', textFillColor: '#4263eb' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null;
          }
          if (template === 'ats') {
            return resumeData.skills?.length > 0 ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Skills</div>
                <div className={styles.skillsList}>
                  {resumeData.skills.join(', ')}
                </div>
              </div>
            ) : null;
          }
          // Minimalist: ATS-friendly, plain text with vertical bars
          if (template === 'minimalist') {
            return resumeData.skills?.length > 0 ? (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Skills</h2>
                {/* ATS-friendly: plain text, vertical bar separated */}
                <div style={{ fontWeight: 400, fontSize: 15, color: '#222', fontFamily: 'Playfair Display' }}>
                  {resumeData.skills.filter(Boolean).join(' | ')}
                </div>
              </div>
            ) : null;
          }
          // Other templates: keep badge/pill style
          return resumeData.skills?.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Skills</h2>
              <div className={styles.skillsList}>
                {resumeData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className={styles.skill}
                    style={{ color: '#4263eb', WebkitTextFillColor: '#4263eb', textFillColor: '#4263eb' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null;

        case 'additional':
          const additional = resumeData.additional;
          if (!additional) return null;

          return (
            <>
              {/* Languages */}
              {additional.languages?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Languages</h2>
                  {/* Use flex row for languages, each as a span for inline display */}
                  <div className={styles.languagesList}>
                    {additional.languages.map((lang, index) => (
                      <span key={index} className={styles.language}>
                        <span className={styles.languageName}>{lang.language}</span>
                        {lang.proficiency && (
                          <span className={styles.languageProficiency}>
                            {' '}({lang.proficiency})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {additional.certifications?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Certifications</h2>
                  {additional.certifications.map((cert, index) => (
                    <div key={index} className={styles.item}>
                      {/* Certificate name - bold and larger */}
                      <div className={styles.itemTitle}>{cert.name}</div>
                      {/* Issuer and date on the same line, date in parentheses and italic/gray */}
                      <div className={styles.certDetails}>
                        {cert.issuer && <span className={styles.certIssuer}>{cert.issuer}</span>}
                        {cert.date && (
                          <span className={styles.certDate}>
                            {cert.issuer && ' '}
                            (<span>{cert.date}</span>)
                          </span>
                        )}
                      </div>
                      {/* Description below, smaller font */}
                      {cert.description && <div className={styles.description}>{cert.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {additional.projects?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Projects</h2>
                  {additional.projects.map((project, index) => (
                    <div key={index} className={styles.item}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemTitle}>{project.name}</div>
                        {project.date && <div className={styles.dates}>{project.date}</div>}
                      </div>
                      {/* Project description, bulleted if multiline */}
                      {project.description && (
                        <div className={styles.bulletedDescription}>
                          {project.description.split('\n').filter(line => line.trim()).map((line, i) => (
                            <div key={i} className={styles.bulletPoint}>
                              <span className={styles.bullet}>•</span>
                              {line.trim()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Awards */}
              {additional.awards?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Awards</h2>
                  {additional.awards.map((award, index) => (
                    <div key={index} className={styles.item}>
                      <div className={styles.itemTitle}>{award.title || award.name}</div>
                      {award.date && <div className={styles.dates}>{award.date}</div>}
                      {award.description && <div className={styles.description}>{award.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Volunteer */}
              {additional.volunteer?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Volunteer</h2>
                  {additional.volunteer.map((vol, index) => (
                    <div key={index} className={styles.item}>
                      <div className={styles.itemTitle}>{vol.title || vol.role}</div>
                      {vol.organization && <div className={styles.itemSubtitle}>{vol.organization}</div>}
                      {vol.date && <div className={styles.dates}>{vol.date}</div>}
                      {vol.description && <div className={styles.description}>{vol.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Sections */}
              {additional.customSections?.length > 0 && additional.customSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className={styles.section}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  {section.items && section.items.length > 0 && section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className={styles.item}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemTitle}>{item.title}</div>
                        {item.subtitle && <div className={styles.itemSubtitle}>{item.subtitle}</div>}
                        {item.date && <div className={styles.dates}>{item.date}</div>}
                      </div>
                      {/* Use item.content instead of item.description */}
                      {item.content && renderBulletedText(item.content)}
                    </div>
                  ))}
                </div>
              ))}
            </>
          );

        default:
          return null;
      }
    }
  };

  const renderHeader = () => {
    if (template === 'ats') {
      return (
        <div className={styles.header}>
          <h1 className={styles.name}>{resumeData.personalInfo?.name || 'Your Name'}</h1>
          <div className={styles.contactInfo}>
            {(() => {
              const contactItems = [];
              if (resumeData.personalInfo?.email) contactItems.push(resumeData.personalInfo.email);
              if (resumeData.personalInfo?.phone) contactItems.push(resumeData.personalInfo.phone);
              if (resumeData.personalInfo?.location) contactItems.push(resumeData.personalInfo.location);
              if (resumeData.personalInfo?.linkedin) contactItems.push(
                <a href={resumeData.personalInfo.linkedin} target="_blank" rel="noopener noreferrer" key="linkedin">LinkedIn</a>
              );
              if (resumeData.personalInfo?.website) contactItems.push(
                <a href={resumeData.personalInfo.website} target="_blank" rel="noopener noreferrer" key="portfolio">Portfolio</a>
              );

              return contactItems.map((item, idx) => (
                <span key={idx}>
                  {item}
                  {idx < contactItems.length - 1 && (
                    <span className={styles.separator}>•</span>
                  )}
                </span>
              ));
            })()}
          </div>
        </div>
      );
    } else if (template === 'creative') {
      return (
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <h1 className={styles.name}>{resumeData.personalInfo?.name || 'Your Name'}</h1>
          </div>
          <div className={styles.contactGrid}>
            {/* Email: icon + label + value, not clickable */}
            {resumeData.personalInfo?.email && (
              <div className={styles.contactBox}>
                <span className={styles.contactIcon}>✉</span>
                <div>
                  <div className={styles.contactLabel}>Email</div>
                  <div className={styles.contactValue}>{resumeData.personalInfo.email}</div>
                </div>
              </div>
            )}
            {/* Phone: icon + label + value */}
            {resumeData.personalInfo?.phone && (
              <div className={styles.contactBox}>
                <span className={styles.contactIcon}>📱</span>
                <div>
                  <div className={styles.contactLabel}>Phone</div>
                  <div className={styles.contactValue}>{resumeData.personalInfo.phone}</div>
                </div>
              </div>
            )}
            {/* Location: icon + label + value */}
            {resumeData.personalInfo?.location && (
              <div className={styles.contactBox}>
                <span className={styles.contactIcon}>📍</span>
                <div>
                  <div className={styles.contactLabel}>Location</div>
                  <div className={styles.contactValue}>{resumeData.personalInfo.location}</div>
                </div>
              </div>
            )}
            {/* LinkedIn: icon + label, clickable, no underline */}
            {resumeData.personalInfo?.linkedin && (
              <div className={styles.contactBox}>
                <a href={resumeData.personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                  <span className={styles.contactIcon}>💼</span>
                  <span className={styles.contactLabel}>LinkedIn</span>
                </a>
              </div>
            )}
            {/* Portfolio: icon + label, clickable, no underline */}
            {resumeData.personalInfo?.website && (
              <div className={styles.contactBox}>
                <a href={resumeData.personalInfo.website} target="_blank" rel="noopener noreferrer">
                  <span className={styles.contactIcon}>🌐</span>
                  <span className={styles.contactLabel}>Portfolio</span>
                </a>
              </div>
            )}
          </div>
        </div>
      );
    } else if (template === 'minimalist') {
      // Minimalist: Centered name and contact info, no icons, just text
      return (
        <div className={styles.header}>
          <h1 className={styles.name}>{resumeData.personalInfo?.name || 'Your Name'}</h1>
          <div className={styles.contactInfo}>
            {/* Render contact info in order, centered, separated by dots */}
            {(() => {
              const contactItems = [];
              if (resumeData.personalInfo?.email) contactItems.push(resumeData.personalInfo.email);
              if (resumeData.personalInfo?.phone) contactItems.push(resumeData.personalInfo.phone);
              if (resumeData.personalInfo?.location) contactItems.push(resumeData.personalInfo.location);
              if (resumeData.personalInfo?.linkedin) contactItems.push(
                <a href={resumeData.personalInfo.linkedin} target="_blank" rel="noopener noreferrer" key="linkedin">LinkedIn</a>
              );
              if (resumeData.personalInfo?.website) contactItems.push(
                <a href={resumeData.personalInfo.website} target="_blank" rel="noopener noreferrer" key="portfolio">Portfolio</a>
              );
              return contactItems.map((item, idx) => (
                <span key={idx}>
                  {item}
                  {idx < contactItems.length - 1 && (
                    <span className={styles.separator}>•</span>
                  )}
                </span>
              ));
            })()}
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.header}>
          <div className={styles.headerSidebar}>
            <h1 className={styles.name}>{resumeData.personalInfo?.name || 'Your Name'}</h1>
          </div>
          <div className={styles.contactContainer}>
            {resumeData.personalInfo?.email && (
              <span className={styles.contactItem}>{resumeData.personalInfo.email}</span>
            )}
            {resumeData.personalInfo?.phone && (
              <span className={styles.contactItem}>{resumeData.personalInfo.phone}</span>
            )}
            {resumeData.personalInfo?.location && (
              <span className={styles.contactItem}>{resumeData.personalInfo.location}</span>
            )}
            {resumeData.personalInfo?.linkedin && (
              <span className={styles.contactItem}>
                <a href={resumeData.personalInfo.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </span>
            )}
            {resumeData.personalInfo?.website && (
              <span className={styles.contactItem}>
                <a href={resumeData.personalInfo.website} target="_blank" rel="noopener noreferrer">Portfolio</a>
              </span>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className={styles.resumePreview}>
      {/* Header with personal info is always first */}
      {renderHeader()}
      
      {/* Render other sections in the specified order */}
      {sectionsToRender.map(sectionId => renderSection(sectionId))}
    </div>
  );
};

export default RawResumeTemplate; 