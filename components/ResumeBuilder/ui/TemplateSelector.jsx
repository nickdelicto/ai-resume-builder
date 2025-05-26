import React from 'react';
import styles from './TemplateSelector.module.css';

const templates = [
  { 
    id: 'ats', 
    name: 'ATS-Friendly', 
    description: 'Clean and standard professional layout',
    isRecommended: true 
  },
  { 
    id: 'modern', 
    name: 'Modern',
    description: 'Contemporary design with colored accents' 
  },
  // { 
  //   id: 'creative', 
  //   name: 'Creative',
  //   description: 'Unique layout with visual elements' 
  // }, // Deactivated for launch focus
  { 
    id: 'minimalist', 
    name: 'Minimalist', 
    description: 'Simple and elegant minimal design' 
  }
];

const TemplateSelector = ({ selectedTemplate, onSelectTemplate }) => {
  // Sample content for the template previews
  const renderTemplatePreview = (templateId) => {
    return (
      <div className={`${styles.templateContent} ${styles[`${templateId}Content`]}`}>
        {/* Header */}
        <div className={styles.previewHeader}></div>
        
        {/* Content lines */}
        <div className={styles.previewSection}>
          <div className={styles.previewSectionTitle}></div>
          <div className={styles.previewLine}></div>
          <div className={styles.previewLine}></div>
          <div className={styles.previewLine}></div>
        </div>
        
        <div className={styles.previewSection}>
          <div className={styles.previewSectionTitle}></div>
          <div className={styles.previewLine}></div>
          <div className={styles.previewLine}></div>
        </div>
        
        <div className={styles.previewSection}>
          <div className={styles.previewSectionTitle}></div>
          <div className={styles.previewItems}>
            <div className={styles.previewItem}></div>
            <div className={styles.previewItem}></div>
            <div className={styles.previewItem}></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.templateSelector}>
      {templates.map(template => (
        <div 
          key={template.id}
          className={`${styles.templateCard} ${selectedTemplate === template.id ? styles.selectedTemplate : ''}`}
          onClick={() => onSelectTemplate(template.id)}
        >
          <div className={`${styles.templatePreview} ${styles[template.id]}`}>
            {/* Template preview content */}
            <div className={`${styles.templateContent} ${styles[template.id + 'Content']}`}>
              {renderTemplatePreview(template.id)}
            </div>
          </div>
          <div className={styles.templateInfo}>
            <h3 className={styles.templateName}>
              {template.name}
              {template.isRecommended && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  padding: '2px 6px',
                  background: '#e7f5ff',
                  color: '#1c7ed6',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}>
                  Recommended
                </span>
              )}
            </h3>
            <p className={styles.templateDescription}>{template.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateSelector; 