import React from 'react';
import Link from 'next/link';
import styles from '../../styles/blog/AnimatedButton.module.css';

/**
 * AnimatedButton Component
 * 
 * A button with animated gradient background for resume building CTAs
 * 
 * @param {Object} props
 * @param {string} props.href - The URL to navigate to
 * @param {string} props.text - The button text
 * @param {boolean} props.showIcon - Whether to show the arrow icon (default: true)
 * @param {Object} props.style - Additional inline styles
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler function
 */
const AnimatedButton = ({ 
  href, 
  text, 
  showIcon = true, 
  style = {}, 
  className = '',
  onClick
}) => {
  const buttonContent = (
    <>
      {text}
      {showIcon && (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={styles.animatedButtonIcon}
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      )}
    </>
  );

  // If href is provided, render as a Link
  if (href) {
    return (
      <Link 
        href={href} 
        className={`${styles.animatedButton} ${className}`}
        style={style}
        onClick={onClick}
      >
        {buttonContent}
      </Link>
    );
  }

  // Otherwise, render as a button
  return (
    <button 
      className={`${styles.animatedButton} ${className}`}
      style={style}
      onClick={onClick}
    >
      {buttonContent}
    </button>
  );
};

export default AnimatedButton; 