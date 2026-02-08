/**
 * ProgressBar - Healthcare-Focused Resume Progress Tracker
 * Encouraging messages for busy nurses building their resumes
 */
import React from 'react';
import styles from './ProgressBar.module.css';

const ProgressBar = ({ progress, completedSections, totalSections }) => {
  // Healthcare-focused encouraging messages
  const getMessage = () => {
    if (progress === 100) {
      return "Your resume is ready to land your next role!";
    } else if (progress >= 75) {
      return "Almost done! You've got this.";
    } else if (progress >= 50) {
      return "Halfway there - great progress!";
    } else if (progress >= 25) {
      return "Nice start! Keep it up.";
    } else {
      return "Tap sections to fill in your info";
    }
  };

  // Get emoji based on progress
  const getEmoji = () => {
    if (progress === 100) return "🎉";
    if (progress >= 75) return "💪";
    if (progress >= 50) return "⭐";
    if (progress >= 25) return "👍";
    return "👋";
  };

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressHeader}>
        <div className={styles.progressLeft}>
          <span className={styles.progressEmoji}>{getEmoji()}</span>
          <div className={styles.progressText}>
            <span className={styles.progressCount}>
              {completedSections} of {totalSections} done
            </span>
            <span className={styles.progressMessage}>{getMessage()}</span>
          </div>
        </div>
        <span className={styles.progressPercent}>{progress}%</span>
      </div>

      <div className={styles.progressBarOuter}>
        <div
          className={styles.progressBarInner}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
