/**
 * ScoreFactorList Component
 * Displays detailed breakdown of all scoring factors
 */

import { FaCheck, FaTimes } from 'react-icons/fa';
import { getCategoryInfo } from '../../../lib/services/atsScoreService';
import styles from './ATSScore.module.css';

export default function ScoreFactorList({ factors }) {
  // Group factors by category
  const groupedFactors = Object.entries(factors).reduce((acc, [key, factor]) => {
    const category = factor.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ key, ...factor });
    return acc;
  }, {});

  const categoryOrder = ['content', 'format', 'completeness'];

  return (
    <div className={styles.factorList}>
      {categoryOrder.map(category => {
        const categoryFactors = groupedFactors[category] || [];
        const categoryInfo = getCategoryInfo(category);

        if (categoryFactors.length === 0) return null;

        return (
          <div key={category} className={styles.factorCategory}>
            <h5 className={styles.factorCategoryTitle}>
              <span className={styles.factorCategoryIcon}>{categoryInfo.icon}</span>
              {categoryInfo.label}
            </h5>

            <ul className={styles.factorItems}>
              {categoryFactors.map(factor => (
                <li
                  key={factor.key}
                  className={`${styles.factorItem} ${factor.passed ? styles.factorPassed : styles.factorFailed}`}
                >
                  <span className={styles.factorStatus}>
                    {factor.passed ? (
                      <FaCheck className={styles.factorCheckIcon} />
                    ) : (
                      <FaTimes className={styles.factorTimesIcon} />
                    )}
                  </span>
                  <span className={styles.factorLabel}>{factor.label}</span>
                  <span className={styles.factorPoints}>
                    {factor.points}/{factor.maxPoints}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
