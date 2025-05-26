import React from 'react';
import styles from './ProgressBar.module.css';
import Image from 'next/image';

const ProgressBar = ({ progress, completedSections, totalSections }) => {
  // Determine the appropriate message based on progress
  const getMessage = () => {
    if (progress === 100) {
      return "Congratulations! Your resume is complete!";
    } else if (progress >= 75) {
      return "Almost there! Just a few more sections to go.";
    } else if (progress >= 50) {
      return "Great progress! Keep going!";
    } else if (progress >= 25) {
      return "Good start! Continue building your resume.";
    } else {
      return "Start building your professional resume.";
    }
  };
  
  // Determine which mascot image to use based on progress
  const getMascotImage = () => {
    if (progress === 100) {
      return "/images/mascot/happy-mascot.svg";
    } else if (progress >= 50) {
      return "/images/mascot/progress-mascot.svg";
    } else {
      return "/images/mascot/starting-mascot.svg";
    }
  };

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressHeader}>
        <div className={styles.progressInfo}>
          <div className={styles.progressStats}>
            <span>{completedSections}/{totalSections} sections completed</span>
            <span>{progress}% Complete</span>
          </div>
          
          <div className={styles.progressBarOuter}>
            <div 
              className={styles.progressBarInner} 
              style={{ width: `${progress}%` }}
            >
              {progress > 0 && progress < 100 && (
                <div className={styles.progressPulse}></div>
              )}
            </div>
          </div>
          
          {/* Message below progress bar */}
          <div className={styles.progressMessage}>
            {getMessage()}
          </div>
        </div>
        
        {/* Mascot now positioned to the right of text */}
        <div className={styles.mascotContainer}>
          <Image 
            src={getMascotImage()}
            alt="Resume mascot"
            width={90}
            height={90}
            priority  /* Ensure fast loading of mascot */
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar; 