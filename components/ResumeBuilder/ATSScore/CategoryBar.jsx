/**
 * CategoryBar Component
 * Progress bar showing points earned vs possible for a category
 */

import styles from './ATSScore.module.css';

export default function CategoryBar({ label, earned, possible, icon }) {
  const percentage = possible > 0 ? (earned / possible) * 100 : 0;

  // Color based on percentage
  const getColor = (pct) => {
    if (pct >= 80) return '#20c997'; // teal - excellent
    if (pct >= 60) return '#28a745'; // green - good
    if (pct >= 40) return '#ffc107'; // yellow - okay
    return '#fd7e14'; // orange - needs work
  };

  const color = getColor(percentage);

  return (
    <div className={styles.categoryBar}>
      <div className={styles.categoryBarHeader}>
        <span className={styles.categoryBarLabel}>
          {icon && <span className={styles.categoryBarIcon}>{icon}</span>}
          {label}
        </span>
        <span className={styles.categoryBarScore}>
          {earned}/{possible}
        </span>
      </div>
      <div className={styles.categoryBarTrack}>
        <div
          className={styles.categoryBarFill}
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
}
