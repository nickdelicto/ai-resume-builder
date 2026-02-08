/**
 * ATSScoreGauge Component
 * Circular gauge visualization for ATS score display
 */

import { useEffect, useState } from 'react';
import styles from './ATSScore.module.css';

export default function ATSScoreGauge({ score, color, label, badge }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score on mount and when score changes
  useEffect(() => {
    const duration = 1000; // 1 second animation
    const startTime = Date.now();
    const startScore = animatedScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startScore + (score - startScore) * easeOut);

      setAnimatedScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  // SVG circle calculations
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className={styles.gaugeWrapper}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.gaugeSvg}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color, #e5e7eb)"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={styles.gaugeProgress}
        />
      </svg>

      {/* Center content */}
      <div className={styles.gaugeCenter}>
        <span className={styles.gaugeScore} style={{ color }}>
          {animatedScore}
        </span>
        <span className={styles.gaugeMax}>/100</span>
      </div>

      {/* Label below gauge */}
      <div className={styles.gaugeLabel} style={{ color }}>
        <span className={styles.gaugeBadge}>{badge}</span>
        <span>{label}</span>
      </div>
    </div>
  );
}
