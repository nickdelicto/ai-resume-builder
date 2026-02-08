/**
 * Celebrations - Toast Notifications + Full Completion Celebration
 *
 * Two modes:
 * 1. Toast (default): Subtle section-complete acknowledgment for busy nurses
 * 2. Full celebration (isFullCelebration=true): Confetti burst (voice triggered from parent)
 */
import React, { useEffect, useState, useRef } from 'react';
import styles from './Celebrations.module.css';

const Celebrations = ({ message, isFullCelebration = false }) => {
  const [visible, setVisible] = useState(true);
  const confettiLaunched = useRef(false);

  // Full celebration: confetti burst + voice
  useEffect(() => {
    if (!isFullCelebration || confettiLaunched.current) return;
    confettiLaunched.current = true;

    // Fire confetti
    const launchConfetti = async () => {
      try {
        const confetti = (await import('canvas-confetti')).default;

        // Big initial burst
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#34a853', '#1a73e8', '#fbbf24', '#ef4444', '#8b5cf6', '#ec4899'],
          zIndex: 9999,
        });

        // Second burst from left after 300ms
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#34a853', '#1a73e8', '#fbbf24'],
            zIndex: 9999,
          });
        }, 300);

        // Third burst from right after 600ms
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#ef4444', '#8b5cf6', '#ec4899'],
            zIndex: 9999,
          });
        }, 600);

        // Fourth burst after 1.5s
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#34a853', '#1a73e8', '#fbbf24', '#ef4444', '#8b5cf6'],
            zIndex: 9999,
          });
        }, 1500);

        // Fifth burst from left after 2.5s
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 60,
            origin: { x: 0.1, y: 0.7 },
            colors: ['#fbbf24', '#ec4899', '#34a853'],
            zIndex: 9999,
          });
        }, 2500);

        // Sixth burst from right after 3.2s
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 60,
            origin: { x: 0.9, y: 0.7 },
            colors: ['#1a73e8', '#8b5cf6', '#ef4444'],
            zIndex: 9999,
          });
        }, 3200);

        // Final big burst after 4s
        setTimeout(() => {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.55 },
            colors: ['#34a853', '#1a73e8', '#fbbf24', '#ef4444', '#8b5cf6', '#ec4899'],
            zIndex: 9999,
          });
        }, 4000);
      } catch (e) {
        // canvas-confetti not available, skip gracefully
      }
    };

    launchConfetti();

    // Note: Speech ("Well, that was easy!") is triggered from ModernResumeBuilder
    // directly in the user gesture context (onChange chain) to satisfy Chrome's
    // autoplay policy. Calling it from useEffect/setTimeout breaks the gesture chain.
  }, [isFullCelebration]);

  // Auto-hide: 2s for toasts, 6s for full celebration (5s confetti + fade)
  useEffect(() => {
    const duration = isFullCelebration ? 6000 : 2000;
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [isFullCelebration]);

  if (!visible) return null;

  // Full celebration banner
  if (isFullCelebration) {
    return (
      <div className={styles.celebrationContainer}>
        <div className={styles.celebrationBanner}>
          <span className={styles.celebrationEmoji}>🎉</span>
          <div className={styles.celebrationContent}>
            <span className={styles.celebrationTitle}>Resume Complete!</span>
            <span className={styles.celebrationSubtitle}>{message}</span>
          </div>
          <span className={styles.celebrationEmoji}>🎉</span>
        </div>
      </div>
    );
  }

  // Regular toast
  return (
    <div className={styles.toastContainer}>
      <div className={styles.toast}>
        <span className={styles.toastIcon}>✓</span>
        <span className={styles.toastMessage}>{message}</span>
      </div>
    </div>
  );
};

export default Celebrations;
