import React from 'react';
import styles from './TemplateSelector.module.css';

const templates = [
  {
    id: 'ats',
    name: 'Hospital-Ready',
    description: 'Passes screening software used by most hospitals',
    bestFor: 'Hospital jobs, large health systems',
    isRecommended: true
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean design with subtle blue accents',
    bestFor: 'Clinics, outpatient, ambulatory care'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bold header with colorful styling',
    bestFor: 'Telehealth, startups, younger facilities'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Elegant serif font, refined look',
    bestFor: 'Leadership roles, NP, experienced nurses'
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
                <span className={styles.recommendedBadge}>
                  Recommended
                </span>
              )}
            </h3>
            <p className={styles.templateDescription}>{template.description}</p>
            {template.bestFor && (
              <p className={styles.templateBestFor}>Best for: {template.bestFor}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateSelector; 