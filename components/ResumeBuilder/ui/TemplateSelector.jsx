import React from 'react';
import styles from './TemplateSelector.module.css';

const templates = [
  {
    id: 'ats',
    name: 'Classic',
    description: 'Pure black and white, built for screening software',
    bestFor: 'Hospital systems, government, large employers'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Blue accents with clean section dividers',
    bestFor: 'Clinics, outpatient, private practice'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Teal palette with left bar headers and split layout',
    bestFor: 'Telehealth, startups, younger facilities'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Refined serif type with understated grayscale',
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