/**
 * JobMatchScore Component
 * Shows keyword match analysis when job context is available
 */

import { FaCheckCircle, FaTimesCircle, FaBriefcase } from 'react-icons/fa';
import styles from './ATSScore.module.css';

export default function JobMatchScore({ jobMatch, jobTitle }) {
  if (!jobMatch) return null;

  const { matchPercent, matched, missing, total } = jobMatch;

  // Color based on match percentage
  const getColor = (pct) => {
    if (pct >= 80) return '#20c997';
    if (pct >= 60) return '#28a745';
    if (pct >= 40) return '#ffc107';
    return '#fd7e14';
  };

  const color = getColor(matchPercent);

  return (
    <div className={styles.jobMatch}>
      <div className={styles.jobMatchHeader}>
        <FaBriefcase className={styles.jobMatchIcon} />
        <h4 className={styles.jobMatchTitle}>Job Match</h4>
        {jobTitle && (
          <span className={styles.jobMatchJobTitle}>{jobTitle}</span>
        )}
      </div>

      <div className={styles.jobMatchScore}>
        <span className={styles.jobMatchPercent} style={{ color }}>
          {matchPercent}%
        </span>
        <span className={styles.jobMatchLabel}>keyword match</span>
      </div>

      <div className={styles.jobMatchStats}>
        <span className={styles.jobMatchStat}>
          <FaCheckCircle className={styles.matchedIcon} />
          {matched.length} matched
        </span>
        <span className={styles.jobMatchStat}>
          <FaTimesCircle className={styles.missingIcon} />
          {missing.length} missing
        </span>
      </div>

      {/* Show matched keywords */}
      {matched.length > 0 && (
        <div className={styles.keywordSection}>
          <h5 className={styles.keywordSectionTitle}>Matched Keywords</h5>
          <div className={styles.keywordTags}>
            {matched.slice(0, 8).map((keyword, i) => (
              <span key={i} className={styles.keywordTagMatched}>
                {keyword}
              </span>
            ))}
            {matched.length > 8 && (
              <span className={styles.keywordMore}>+{matched.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Show missing keywords */}
      {missing.length > 0 && (
        <div className={styles.keywordSection}>
          <h5 className={styles.keywordSectionTitle}>Missing Keywords</h5>
          <div className={styles.keywordTags}>
            {missing.slice(0, 6).map((keyword, i) => (
              <span key={i} className={styles.keywordTagMissing}>
                {keyword}
              </span>
            ))}
            {missing.length > 6 && (
              <span className={styles.keywordMore}>+{missing.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
