import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/blog/RelatedPosts.module.css';

/**
 * RelatedPosts Component
 * 
 * Displays a list of related blog posts
 */
const RelatedPosts = ({ posts, title = 'Related Resources' }) => {
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <div className={styles.relatedPosts}>
      <h2 className={styles.title}>{title}</h2>
      
      <div className={styles.postsGrid}>
        {posts.map((post) => (
          <Link 
            href={`/blog/${post.category}/${post.slug}`} 
            key={post.slug}
            className={styles.postCard}
          >
            <div className={styles.imageContainer}>
              {post.featuredImage ? (
                <Image
                  src={post.featuredImage.src}
                  alt={post.featuredImage.alt || post.title}
                  width={300}
                  height={170}
                  className={styles.image}
                />
              ) : (
                <div className={styles.placeholderImage}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
              )}
            </div>
            
            <div className={styles.content}>
              <h3 className={styles.postTitle}>{post.title}</h3>
              <p className={styles.postDescription}>{post.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedPosts; 