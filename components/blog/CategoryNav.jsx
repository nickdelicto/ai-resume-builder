import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/blog/CategoryNav.module.css';

/**
 * CategoryNav Component
 * 
 * Navigation component for blog categories
 */
const CategoryNav = ({ categories = [] }) => {
  const router = useRouter();
  const { category } = router.query;
  
  // Default categories if none provided
  const defaultCategories = [
    { slug: 'resume-examples', name: 'Resume Examples' },
    { slug: 'job-descriptions', name: 'Job Descriptions' },
    { slug: 'career-advice', name: 'Career Advice' }
  ];
  
  // Use provided categories or fall back to defaults
  const navCategories = categories.length > 0 ? categories : defaultCategories;
  
  return (
    <div className={styles.categoryNav}>
      <div className={styles.categoryNavInner}>
        <Link href="/blog" className={`${styles.categoryLink} ${!category ? styles.active : ''}`}>
          All Posts
        </Link>
        
        {navCategories.map((cat) => (
          <Link 
            key={cat.slug} 
            href={`/blog/${cat.slug}`} 
            className={`${styles.categoryLink} ${category === cat.slug ? styles.active : ''}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoryNav; 