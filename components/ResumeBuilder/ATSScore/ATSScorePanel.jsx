/**
 * ATSScorePanel - Healthcare-Focused Mobile-First Design
 * Clean, intuitive ATS score display for busy nurses
 * Redesigned with simple checklist format
 */

import { useMemo, useEffect, useRef, useState } from 'react';
import {
  calculateATSScore,
  getScoreLabel,
  getCategoryInfo
} from '../../../lib/services/atsScoreService';
import styles from './ATSScore.module.css';

export default function ATSScorePanel({ resumeData, jobContext, onMilestone }) {
  const previousScoreRef = useRef(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Calculate ATS score
  const scoreResult = useMemo(() => {
    return calculateATSScore(resumeData, jobContext);
  }, [resumeData, jobContext]);

  const { label, color, badge, message } = getScoreLabel(scoreResult.percentage);

  // Animate score
  useEffect(() => {
    const target = scoreResult.percentage;
    const start = animatedScore;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(start + (target - start) * easeOut));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    previousScoreRef.current = target;
  }, [scoreResult.percentage]);

  // Group factors by category
  const factorsByCategory = useMemo(() => {
    const grouped = { content: [], format: [], healthcare: [] };

    Object.values(scoreResult.factors).forEach(factor => {
      if (grouped[factor.category]) {
        grouped[factor.category].push(factor);
      }
    });

    // Sort each category: incomplete first (by points desc), then completed
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => {
        if (a.passed !== b.passed) return a.passed ? 1 : -1;
        return b.points - a.points;
      });
    });

    return grouped;
  }, [scoreResult.factors]);

  // Find the quick win (highest point incomplete item)
  const quickWin = useMemo(() => {
    const incomplete = Object.values(scoreResult.factors)
      .filter(f => !f.passed)
      .sort((a, b) => b.points - a.points);
    return incomplete[0] || null;
  }, [scoreResult.factors]);

  // Category stats
  const getCategoryStats = (category) => {
    const factors = factorsByCategory[category];
    const completed = factors.filter(f => f.passed).length;
    return { completed, total: factors.length };
  };

  return (
    <div className={styles.panel}>
      {/* What is ATS - Brief explanation */}
      <div className={styles.explainer}>
        <p className={styles.explainerText}>
          <strong>What's this?</strong> Hospitals use software to screen resumes. This score shows how well yours will pass.
        </p>
      </div>

      {/* Score Circle */}
      <div className={styles.scoreSection}>
        <div className={styles.scoreCircle} style={{ borderColor: color }}>
          <span className={styles.scoreNumber} style={{ color }}>{animatedScore}</span>
          <span className={styles.scoreMax}>/100</span>
        </div>
        <div className={styles.scoreLabel} style={{ color }}>
          <span className={styles.scoreBadge}>{badge}</span>
          <span>{label}</span>
        </div>
      </div>

      {/* Quick Win - Single next action */}
      {quickWin && (
        <div className={styles.quickWin}>
          <div className={styles.quickWinHeader}>
            <span className={styles.quickWinIcon}>⚡</span>
            <span className={styles.quickWinTitle}>Quick Win</span>
            <span className={styles.quickWinPoints}>+{quickWin.points} pts</span>
          </div>
          <p className={styles.quickWinText}>{quickWin.suggestion}</p>
        </div>
      )}

      {/* Checklist by Category */}
      <div className={styles.checklist}>
        {['healthcare', 'content', 'format'].map(category => {
          const info = getCategoryInfo(category);
          const factors = factorsByCategory[category];
          const stats = getCategoryStats(category);
          const isExpanded = expandedCategory === category;
          const allComplete = stats.completed === stats.total;

          return (
            <div key={category} className={styles.categoryGroup}>
              {/* Category Header - Tappable */}
              <button
                className={`${styles.categoryHeader} ${allComplete ? styles.categoryComplete : ''}`}
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                aria-expanded={isExpanded}
              >
                <span className={styles.categoryIcon}>{info.icon}</span>
                <span className={styles.categoryLabel}>{info.label}</span>
                <span className={styles.categoryProgress}>
                  {stats.completed}/{stats.total}
                </span>
                <span className={`${styles.categoryArrow} ${isExpanded ? styles.expanded : ''}`}>
                  ›
                </span>
              </button>

              {/* Expanded Items */}
              {isExpanded && (
                <div className={styles.categoryItems}>
                  {factors.map(factor => (
                    <div
                      key={factor.key}
                      className={`${styles.checkItem} ${factor.passed ? styles.checked : ''}`}
                    >
                      <span className={styles.checkIcon}>
                        {factor.passed ? '✓' : '○'}
                      </span>
                      <span className={styles.checkLabel}>{factor.label}</span>
                      {!factor.passed && (
                        <span className={styles.checkPoints}>+{factor.points}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className={styles.progressSummary}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${scoreResult.percentage}%`, backgroundColor: color }}
          />
        </div>
        <span className={styles.progressText}>
          {Object.values(scoreResult.factors).filter(f => f.passed).length} of {Object.values(scoreResult.factors).length} items complete
        </span>
      </div>
    </div>
  );
}
