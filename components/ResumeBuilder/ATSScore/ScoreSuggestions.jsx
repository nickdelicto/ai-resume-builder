/**
 * ScoreSuggestions Component
 * Displays actionable improvement suggestions
 */

import { FaLightbulb, FaStar } from 'react-icons/fa';
import styles from './ATSScore.module.css';

export default function ScoreSuggestions({ suggestions, maxItems = 5 }) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className={styles.noSuggestions}>
        <FaStar className={styles.noSuggestionsIcon} />
        <p>Great job! Your resume is well-optimized.</p>
      </div>
    );
  }

  const displaySuggestions = suggestions.slice(0, maxItems);

  return (
    <ul className={styles.suggestionList}>
      {displaySuggestions.map((suggestion, index) => (
        <li key={suggestion.factor || index} className={styles.suggestionItem}>
          <div className={styles.suggestionIcon}>
            <FaLightbulb />
          </div>
          <div className={styles.suggestionContent}>
            <span className={styles.suggestionText}>{suggestion.suggestion}</span>
            <span className={styles.suggestionImpact}>
              +{suggestion.points} points
            </span>
          </div>
        </li>
      ))}

      {suggestions.length > maxItems && (
        <li className={styles.moreSuggestions}>
          +{suggestions.length - maxItems} more improvements available
        </li>
      )}
    </ul>
  );
}
