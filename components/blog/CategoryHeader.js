import React from 'react';
import { ResumeIcon, JobDescriptionIcon, CareerAdviceIcon } from './icons/CategoryIcons';
import { isContentSilo } from '../../lib/blog/categoryUtils';
import styles from '../../styles/blog/CategoryPage.module.css';

/**
 * CategoryHeader Component
 * 
 * Displays the header section for a blog category page
 * 
 * @param {Object} props
 * @param {Object} props.category - The category object
 * @param {string} props.title - The page title
 * @param {string} props.description - The page description
 * @param {string} props.headerColor - The header accent color
 */
const CategoryHeader = ({ category, title, description, headerColor }) => {
  // Get the appropriate icon based on category type
  const getHeaderIcon = () => {
    if (!category) return null;
    
    if (isContentSilo(category.slug)) {
      switch (category.slug) {
        case 'resume-examples':
          return <ResumeIcon />;
        case 'job-descriptions':
          return <JobDescriptionIcon />;
        case 'career-advice':
          return <CareerAdviceIcon />;
        default:
          return null;
      }
    }
    return null;
  };

  const headerIcon = getHeaderIcon();

  return (
    <div 
      className={styles.categoryHeader} 
      style={{ 
        '--header-color': headerColor,
        borderLeftColor: headerColor 
      }}
    >
      <div className={styles.categoryHeaderContent}>
        <div 
          className={styles.categoryIcon} 
          style={{ backgroundColor: headerColor }}
        >
          {headerIcon || <span>{category?.name?.charAt(0)}</span>}
        </div>
        <div className={styles.categoryText}>
          <h1 className={styles.categoryTitle}>{title}</h1>
          <p className={styles.categoryDescription}>{description}</p>
        </div>
      </div>
    </div>
  );
};

export default CategoryHeader; 