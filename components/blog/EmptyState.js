import React from 'react';
import Link from 'next/link';
import { AlertIcon } from './icons/CategoryIcons';
import styles from '../../styles/blog/CategoryPage.module.css';
import AnimatedButton from './AnimatedButton';

/**
 * EmptyState Component
 * 
 * Displays when there are no posts in a category
 */
const EmptyState = () => {
  return (
    <div className={styles.noPosts}>
      <div className={styles.noPostsIcon}>
        <AlertIcon />
      </div>
      <h2>No Content Yet</h2>
      <p>We're currently working on adding content for this category. Check back soon!</p>
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link href="/blog" className={styles.backButton}>
          Browse Other Categories
        </Link>
        <AnimatedButton 
          href="/nursing-resume-builder"
          text="Build Your Resume" 
        />
      </div>
    </div>
  );
};

export default EmptyState; 