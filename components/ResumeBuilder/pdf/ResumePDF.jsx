import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet,
  Font 
} from '@react-pdf/renderer';

// Register standard fonts with direct CDN URLs (no arrays for local fallbacks)
Font.register({
  family: 'Roboto',
  src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf',
  fontWeight: 'normal'
});

Font.register({
  family: 'Roboto',
  src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf',
  fontWeight: 'bold'
});

// Register additional fonts for different templates
Font.register({
  family: 'Montserrat',
  src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf',
  fontWeight: 'normal'
});

Font.register({
  family: 'Montserrat',
  src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf',
  fontWeight: 'bold'
});

Font.register({
  family: 'Playfair',
  src: 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qC0s.ttf',
});

Font.register({
  family: 'Poppins',
  src: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJA.ttf',
  fontWeight: 'normal'
});

Font.register({
  family: 'Poppins',
  src: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7V1s.ttf',
  fontWeight: 'bold'
});

// Register standard PDF fonts that are built into the PDF spec
// Note: These font families are actually built into the PDF specification
// Each needs to be registered separately with its own family name
Font.register({
  family: 'Helvetica',
  src: 'Helvetica'
});

Font.register({
  family: 'Helvetica-Bold',
  src: 'Helvetica-Bold'
});

Font.register({
  family: 'Times-Roman',
  src: 'Times-Roman'
});

Font.register({
  family: 'Times-Bold',
  src: 'Times-Bold'
});

// Create styles for the PDF document based on the template
const createStylesForTemplate = (template) => {
  // Base styles
  const baseStyles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 12,
      lineHeight: 1.5,
      fontFamily: 'Roboto',
    },
    section: {
      marginBottom: 10,
    },
    header: {
      marginBottom: 20,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    contactInfo: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 15,
    },
    contactItem: {
      marginRight: 15,
      fontSize: 10,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 5,
      borderBottom: '1 solid #000',
      paddingBottom: 2,
    },
    itemTitle: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    itemSubtitle: {
      fontSize: 11,
      marginBottom: 5,
    },
    itemDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 10,
      marginBottom: 5,
    },
    bulletPoint: {
      fontSize: 10,
    },
    bulletPointContainer: {
      flexDirection: 'row',
      marginBottom: 3,
      paddingLeft: 5,
    },
    bullet: {
      marginRight: 5,
    },
    skillsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    skill: {
      marginRight: 10,
      marginBottom: 5,
      fontSize: 10,
    },
    plainText: {
      fontSize: 10,
      marginBottom: 3,
    }
  });

  // Template-specific style overrides
  switch (template) {
    case 'modern':
      return StyleSheet.create({
        ...baseStyles,
        page: {
          ...baseStyles.page,
          fontFamily: 'Montserrat',
        },
        name: {
          ...baseStyles.name,
          color: '#4263eb',
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          color: '#4263eb',
          borderBottom: '1 solid #4263eb',
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        bullet: {
          ...baseStyles.bullet,
          color: '#4263eb',
        },
        header: {
          ...baseStyles.header,
          backgroundColor: '#f8f9fa',
          padding: 10,
          marginTop: -30,
          marginLeft: -30,
          marginRight: -30,
          marginBottom: 20,
        }
      });
    case 'professional':
      return StyleSheet.create({
        ...baseStyles,
        page: {
          ...baseStyles.page,
          fontFamily: 'Roboto',
        },
        name: {
          ...baseStyles.name,
          color: '#1c7ed6',
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          color: '#495057',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        bullet: {
          ...baseStyles.bullet,
          color: '#1c7ed6',
        },
        skill: {
          ...baseStyles.skill,
          backgroundColor: '#e7f5ff',
          color: '#1c7ed6',
          padding: 3,
          borderRadius: 2,
        }
      });
    case 'minimalist':
      return StyleSheet.create({
        ...baseStyles,
        page: {
          ...baseStyles.page,
          fontFamily: 'Playfair',
        },
        name: {
          ...baseStyles.name,
          textAlign: 'center',
          fontWeight: 'normal',
          fontSize: 28,
          letterSpacing: 1,
        },
        contactInfo: {
          ...baseStyles.contactInfo,
          justifyContent: 'center',
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          letterSpacing: 2,
          borderBottom: '1 solid #eee',
          color: '#555',
          fontWeight: 'normal',
          textTransform: 'uppercase',
          fontSize: 13,
        },
        bullet: {
          ...baseStyles.bullet,
          color: '#aaa',
        }
      });
    case 'creative':
      return StyleSheet.create({
        ...baseStyles,
        page: {
          ...baseStyles.page,
          fontFamily: 'Poppins',
        },
        name: {
          ...baseStyles.name,
          color: '#f59f00',
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          paddingLeft: 10,
          borderLeft: '3 solid #f59f00',
          borderBottom: 'none',
          position: 'relative',
        },
        bullet: {
          ...baseStyles.bullet,
          color: '#f59f00',
        },
        skill: {
          ...baseStyles.skill,
          backgroundColor: '#fff9db',
          color: '#e67700',
          padding: 4,
          borderRadius: 10,
        }
      });
    case 'executive':
      return StyleSheet.create({
        ...baseStyles,
        page: {
          ...baseStyles.page,
          fontFamily: 'Times-Roman',
        },
        header: {
          ...baseStyles.header,
          borderBottom: '2 solid #343a40',
          paddingBottom: 10,
        },
        name: {
          ...baseStyles.name,
          color: '#343a40',
          fontSize: 26,
          letterSpacing: 0.5,
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          textTransform: 'uppercase',
          color: '#343a40',
        },
        itemTitle: {
          ...baseStyles.itemTitle,
          color: '#343a40',
        },
        skill: {
          ...baseStyles.skill,
          backgroundColor: '#f8f9fa',
          color: '#343a40',
          padding: 3,
          margin: 2,
        }
      });
    case 'ats':
    default:
      return StyleSheet.create({
        ...baseStyles,
        page: {
          ...baseStyles.page,
          fontFamily: 'Helvetica',
          color: '#000',
          lineHeight: 1.5,
          padding: 30,
        },
        header: {
          ...baseStyles.header,
          marginBottom: 25,
        },
        name: {
          ...baseStyles.name,
          fontSize: 24,
          fontFamily: 'Helvetica-Bold',
          color: '#000',
          marginBottom: 8,
        },
        contactInfo: {
          ...baseStyles.contactInfo,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: 11,
          fontFamily: 'Helvetica',
        },
        contactItem: {
          ...baseStyles.contactItem,
          marginRight: 0,
          color: '#000',
          fontFamily: 'Helvetica',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        },
        contactSeparator: {
          marginHorizontal: 6,
          color: '#000',
        },
        section: {
          ...baseStyles.section,
          marginBottom: 15,
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          fontSize: 14,
          fontFamily: 'Helvetica-Bold',
          color: '#000',
          textTransform: 'uppercase',
          borderBottom: '1 solid #000',
          paddingBottom: 5,
          marginBottom: 15,
        },
        item: {
          ...baseStyles.item,
          marginBottom: 15,
        },
        itemHeader: {
          ...baseStyles.itemHeader,
          marginBottom: 8,
        },
        itemTitle: {
          ...baseStyles.itemTitle,
          fontSize: 12,
          fontFamily: 'Helvetica-Bold',
          color: '#000',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 4,
        },
        itemSubtitle: {
          ...baseStyles.itemSubtitle,
          fontSize: 11,
          color: '#000',
          marginBottom: 2,
          flexDirection: 'column',
          gap: 2,
          fontFamily: 'Helvetica',
        },
        company: {
          fontFamily: 'Helvetica-Bold',
          color: '#000',
          fontSize: 11,
        },
        location: {
          color: '#000',
          fontSize: 11,
          fontFamily: 'Helvetica',
        },
        dates: {
          fontSize: 10,
          fontStyle: 'italic',
          color: '#000',
          textAlign: 'right',
          marginLeft: 'auto',
          fontFamily: 'Helvetica',
        },
        bulletPoint: {
          ...baseStyles.bulletPoint,
          fontSize: 11,
          color: '#000',
          paddingLeft: 15,
          marginVertical: 4,
          lineHeight: 1.5,
          fontFamily: 'Helvetica',
        },
        bullet: {
          ...baseStyles.bullet,
          color: '#000',
          marginRight: 8,
          fontFamily: 'Helvetica',
        },
        skill: {
          ...baseStyles.skill,
          display: 'inline',
          backgroundColor: 'transparent',
          padding: 0,
          marginRight: 15,
          fontWeight: 'normal',
          color: '#000',
          fontSize: 11,
          fontFamily: 'Helvetica',
        },
        skillsContainer: {
          ...baseStyles.skillsContainer,
          display: 'block',
          marginTop: 8,
        },
        summary: {
          fontSize: 11,
          color: '#000',
          lineHeight: 1.5,
          marginBottom: 15,
          fontFamily: 'Helvetica',
        },
        plainText: {
          ...baseStyles.plainText,
          fontSize: 11,
          color: '#000',
          lineHeight: 1.5,
          fontFamily: 'Helvetica',
        }
      });
  }
};

// Function to safely handle potentially empty content
const safeParse = (content) => {
  if (!content) return '';
  
  // Convert nullish values to empty strings
  if (content === null || content === undefined) return '';
  
  // Make sure content is a string
  return String(content);
};

// Simplified function to parse and render bullet points
const renderBulletedText = (text, styles) => {
  if (!text) return null;
  
  // Make sure text is a string
  const textContent = safeParse(text);
  
  // Check if text has bullet points or line breaks
  const hasBullets = textContent.includes('•') || textContent.includes('*') || textContent.includes('-');
  const hasLineBreaks = textContent.includes('\n');
  
  if (hasBullets || hasLineBreaks) {
    // Split by line breaks first, then check for bullets
    const lines = textContent.split('\n').filter(line => line.trim());
    
    return (
      <View>
        {lines.map((line, index) => {
          // Check if line starts with a bullet
          const trimmedLine = line.trim();
          const startsWithBullet = trimmedLine.startsWith('•') || 
                                  trimmedLine.startsWith('*') || 
                                  trimmedLine.startsWith('-');
          
          if (startsWithBullet) {
            // Remove the bullet character and render with our own bullet
            const content = trimmedLine.substring(1).trim();
            return (
              <View key={index} style={styles.bulletPointContainer}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletPoint}>{content}</Text>
              </View>
            );
          } else {
            // If it doesn't have a bullet, add one
            return (
              <View key={index} style={styles.bulletPointContainer}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletPoint}>{trimmedLine}</Text>
              </View>
            );
          }
        })}
      </View>
    );
  }
  
  // If it's a simple text without bullets or line breaks
  return <Text style={styles.plainText}>{textContent}</Text>;
};

// The main PDF component
const ResumePDF = ({ resumeData, template, sectionOrder }) => {
  if (!resumeData) {
    return (
      <Document>
        <Page size="A4" style={{padding: 30, fontFamily: 'Helvetica'}}>
          <Text>No resume data available</Text>
        </Page>
      </Document>
    );
  }
  
  const styles = createStylesForTemplate(template);
  
  const orderedSections = sectionOrder || [
    'personalInfo',
    'summary',
    'experience',
    'education',
    'skills',
    'additionalInfo'
  ];
  
  // Helper to safely access nested data
  const getNestedData = (obj, path, defaultValue = '') => {
    if (!obj) return defaultValue;
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    
    return result || defaultValue;
  };

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'personalInfo':
        return null; // Header is rendered separately
      case 'summary':
        return resumeData.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.plainText}>{safeParse(resumeData.summary)}</Text>
          </View>
        ) : null;
      case 'experience':
        return resumeData.experience && resumeData.experience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {resumeData.experience.map((exp, index) => (
              <View key={index} style={{ marginBottom: 10 }}>
                <Text style={styles.itemTitle}>{safeParse(exp.title)}</Text>
                <Text style={styles.itemSubtitle}>{safeParse(exp.company)}</Text>
                <View style={styles.itemDetails}>
                  <Text>{safeParse(exp.location)}</Text>
                  <Text>{safeParse(exp.startDate)} - {safeParse(exp.endDate || 'Present')}</Text>
                </View>
                {exp.description ? renderBulletedText(exp.description, styles) : null}
              </View>
            ))}
          </View>
        ) : null;
      case 'education':
        return resumeData.education && resumeData.education.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resumeData.education.map((edu, index) => (
              <View key={index} style={{ marginBottom: 10 }}>
                <Text style={styles.itemTitle}>{safeParse(edu.degree)}</Text>
                <Text style={styles.itemSubtitle}>{safeParse(edu.school)}</Text>
                <View style={styles.itemDetails}>
                  <Text>{safeParse(edu.location)}</Text>
                  <Text>{safeParse(edu.startDate)} - {safeParse(edu.endDate || 'Present')}</Text>
                </View>
                {edu.description ? renderBulletedText(edu.description, styles) : null}
              </View>
            ))}
          </View>
        ) : null;
      case 'skills':
        return resumeData.skills && resumeData.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {resumeData.skills.map((skill, index) => (
                <Text key={index} style={styles.skill}>{safeParse(skill.name)}</Text>
              ))}
            </View>
          </View>
        ) : null;
      case 'additionalInfo':
        if (!resumeData.additionalInfo) return null;
        
        return (
          <View style={styles.section}>
            {/* Languages Section */}
            {resumeData.additionalInfo.languages && resumeData.additionalInfo.languages.length > 0 ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.sectionTitle}>Languages</Text>
                <View style={styles.skillsContainer}>
                  {resumeData.additionalInfo.languages.map((lang, index) => (
                    <Text key={index} style={styles.skill}>
                      {safeParse(lang.name)} {lang.proficiency ? `(${safeParse(lang.proficiency)})` : ''}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
            
            {/* Certifications Section */}
            {resumeData.additionalInfo.certifications && resumeData.additionalInfo.certifications.length > 0 ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.sectionTitle}>Certifications</Text>
                {resumeData.additionalInfo.certifications.map((cert, index) => (
                  <View key={index} style={{ marginBottom: 5 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 10 }}>{safeParse(cert.name)}</Text>
                    <Text style={{ fontSize: 9 }}>
                      {cert.issuer ? safeParse(cert.issuer) : ''} 
                      {cert.issuer && cert.date ? ' - ' : ''}
                      {safeParse(cert.date)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            
            {/* Projects Section */}
            {resumeData.additionalInfo.projects && resumeData.additionalInfo.projects.length > 0 ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.sectionTitle}>Projects</Text>
                {resumeData.additionalInfo.projects.map((project, index) => (
                  <View key={index} style={{ marginBottom: 5 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 10 }}>{safeParse(project.name)}</Text>
                    {project.description ? (
                      <Text style={{ fontSize: 9 }}>{safeParse(project.description)}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
            
            {/* Custom Sections */}
            {resumeData.additionalInfo.customSections && resumeData.additionalInfo.customSections.length > 0 ? (
              resumeData.additionalInfo.customSections.map((section, index) => (
                <View key={index} style={{ marginBottom: 10 }}>
                  <Text style={styles.sectionTitle}>{safeParse(section.title)}</Text>
                  {section.items && section.items.length > 0 ? section.items.map((item, i) => (
                    <View key={i} style={styles.item}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>{safeParse(item.title)}</Text>
                        {item.subtitle && <Text style={styles.itemSubtitle}>{safeParse(item.subtitle)}</Text>}
                        {item.date && <Text style={styles.dates}>{safeParse(item.date)}</Text>}
                      </View>
                      {item.content && renderBulletedText(item.content, styles)}
                    </View>
                  )) : null}
                </View>
              ))
            ) : null}
          </View>
        );
      default:
        return null;
    }
  };

  // Get personal info with safe defaults
  const firstName = getNestedData(resumeData, 'personalInfo.firstName');
  const lastName = getNestedData(resumeData, 'personalInfo.lastName');
  const email = getNestedData(resumeData, 'personalInfo.email');
  const phone = getNestedData(resumeData, 'personalInfo.phone');
  const location = getNestedData(resumeData, 'personalInfo.location');
  const website = getNestedData(resumeData, 'personalInfo.website');
  const linkedin = getNestedData(resumeData, 'personalInfo.linkedin');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with personal info */}
        <View style={styles.header}>
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
          <View style={styles.contactInfo}>
            {email ? (
              <View style={styles.contactItem}>
                <Text>{email}</Text>
                <Text style={styles.contactSeparator}>•</Text>
              </View>
            ) : null}
            {phone ? (
              <View style={styles.contactItem}>
                <Text>{phone}</Text>
                <Text style={styles.contactSeparator}>•</Text>
              </View>
            ) : null}
            {location ? (
              <View style={styles.contactItem}>
                <Text>{location}</Text>
              </View>
            ) : null}
          </View>
        </View>
        
        {/* Render all sections based on the order */}
        {orderedSections.map((sectionId) => (
          <React.Fragment key={sectionId}>
            {renderSectionContent(sectionId)}
          </React.Fragment>
        ))}
      </Page>
    </Document>
  );
};

export default ResumePDF; 