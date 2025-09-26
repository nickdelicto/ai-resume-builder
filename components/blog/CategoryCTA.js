import React from 'react';
import styles from '../../styles/blog/CategoryPage.module.css';
import AnimatedButton from './AnimatedButton';

/**
 * CategoryCTA Component
 * 
 * Displays a call-to-action section for the resume builder
 */
const CategoryCTA = () => {
  return (
    <div className={styles.categoryCta}>
      <div className={styles.ctaContent}>
        <h2 className={styles.ctaTitle}>Ready to create your professional resume?</h2>
        <p className={styles.ctaText}>
          Use our AI-powered resume builder to create a standout resume in minutes.
          Tailored to your industry, ATS-optimized, and designed to get you hired.
        </p>
        <AnimatedButton 
          href="/resume-builder" 
          text="Build Your Resume Now"
        />
      </div>
    </div>
  );
};

export default CategoryCTA; 