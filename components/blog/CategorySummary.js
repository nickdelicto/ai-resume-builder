import React from 'react';
import { InfoIcon } from './icons/CategoryIcons';
import styles from '../../styles/blog/CategoryPage.module.css';

/**
 * CategorySummary Component
 * 
 * Displays a summary section with information about the category
 * 
 * @param {Object} props
 * @param {string} props.title - The summary title
 * @param {string} props.text - The summary text content
 */
const CategorySummary = ({ title, text }) => {
  return (
    <div className={styles.categorySummary}>
      <div className={styles.summaryIcon}>
        <InfoIcon />
      </div>
      <div className={styles.summaryContent}>
        <h2 className={styles.summaryTitle}>{title}</h2>
        <p className={styles.summaryText}>{text}</p>
      </div>
    </div>
  );
};

export default CategorySummary; 