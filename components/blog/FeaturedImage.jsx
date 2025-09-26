import React from 'react';
import Image from 'next/image';
import styles from '../../styles/blog/FeaturedImage.module.css';

/**
 * FeaturedImage Component
 * 
 * Displays a featured image for blog posts, supporting both SVG and traditional images
 * Falls back to a themed SVG placeholder based on content type if no image is provided
 */
const FeaturedImage = ({ 
  image, 
  title, 
  contentType = 'Article',
  svgContent = null
}) => {
  // Determine background color based on content type
  const getBackgroundColor = () => {
    switch (contentType.toLowerCase()) {
      case 'resume example':
        return '#ebf8ff'; // Light blue
      case 'job description':
        return '#f0fff4'; // Light green
      case 'career advice':
        return '#fffaf0'; // Light orange
      default:
        return '#f7fafc'; // Light gray
    }
  };
  
  // If we have an image, render it
  if (image) {
    return (
      <div className={styles.featuredImage}>
        <Image
          src={image.src}
          alt={image.alt || title}
          width={1200}
          height={675}
          className={styles.image}
        />
      </div>
    );
  }
  
  // If we have custom SVG content, render it
  if (svgContent) {
    return (
      <div 
        className={styles.featuredSvg}
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <div className={styles.svgContainer} dangerouslySetInnerHTML={{ __html: svgContent }} />
      </div>
    );
  }
  
  // Otherwise, render a themed placeholder based on content type
  return (
    <div 
      className={styles.featuredPlaceholder}
      style={{ backgroundColor: getBackgroundColor() }}
    >
      {contentType === 'Resume Example' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.placeholderIcon}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          <path d="M9 12h6"></path>
          <path d="M9 16h6"></path>
          <path d="M9 8h1"></path>
        </svg>
      ) : contentType === 'Job Description' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.placeholderIcon}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.placeholderIcon}>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      )}
      <h2 className={styles.placeholderTitle}>{title}</h2>
      <div className={styles.placeholderType}>{contentType}</div>
    </div>
  );
};

export default FeaturedImage; 