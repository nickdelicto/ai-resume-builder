import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/blog/PostCard.module.css';

/**
 * PostCard Component
 * 
 * Displays a blog post card with image, title, and description
 */
const PostCard = ({ post }) => {
  // Format the date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  // Get content type
  const getContentType = () => {
    if (post.contentType) {
      return post.contentType;
    }
    
    if (post.occupation) {
      return 'Resume Example';
    }
    
    if (post.jobTitle) {
      return 'Job Description';
    }
    
    return 'Career Advice';
  };
  
  const contentType = getContentType();
  
  // Determine badge color based on content type
  const getBadgeColor = () => {
    switch (contentType.toLowerCase()) {
      case 'resume example':
        return '#4299e1'; // Blue
      case 'job description':
        return '#48bb78'; // Green
      case 'career advice':
        return '#ed8936'; // Orange
      default:
        return '#718096'; // Gray
    }
  };
  
  return (
    <div className={styles.postCard}>
      <Link href={`/blog/${post.category}/${post.slug}`} className={styles.postLink}>
        <div className={styles.imageContainer}>
          {post.featuredImage ? (
            <Image
              src={post.featuredImage.src}
              alt={post.featuredImage.alt || post.title}
              width={400}
              height={225}
              className={styles.image}
            />
          ) : (
            <div className={styles.placeholderImage}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
          )}
          <div className={styles.typeBadge} style={{backgroundColor: getBadgeColor()}}>
            {contentType}
          </div>
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.title}>{post.title}</h3>
          <p className={styles.description}>{post.description}</p>
          
          <div className={styles.meta}>
            <span className={styles.date}>{formatDate(post.publishedDate)}</span>
            {post.readTime && (
              <>
                <span className={styles.separator}>•</span>
                <span className={styles.readTime}>{post.readTime} min read</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default PostCard; 