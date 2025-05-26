import React, { useEffect, useState } from 'react';
import styles from './Celebrations.module.css';

const Celebrations = ({ message }) => {
  const [visible, setVisible] = useState(true);
  
  // Auto-hide celebration after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2800); // Just before the 3s parent timeout
    
    return () => clearTimeout(timer);
  }, []);
  
  // Create confetti particles
  const renderConfetti = () => {
    const particles = [];
    // Enhanced color palette with more vibrant colors
    const colors = [
      '#FFC700', '#FF0000', '#2E3191', '#41C0F0', '#00AF54', 
      '#FF4D80', '#8A2BE2', '#00FFFF', '#FF7F50', '#7CFC00'
    ];
    
    // Create more particles for a denser effect
    for (let i = 0; i < 80; i++) {
      const left = Math.random() * 100;
      const width = Math.random() * 10 + 4;
      const height = width * (Math.random() * 0.4 + 0.3); // More varied shapes
      const colorIndex = Math.floor(Math.random() * colors.length);
      const animationDelay = Math.random() * 0.7;
      
      // Add rotation variation
      const rotation = Math.random() * 360;
      
      particles.push(
        <div 
          key={i}
          className={styles.confettiParticle}
          style={{
            left: `${left}%`,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: colors[colorIndex],
            animationDelay: `${animationDelay}s`,
            transform: `rotate(${rotation}deg)`
          }}
        />
      );
    }
    
    // Add special star-shaped confetti
    for (let i = 0; i < 15; i++) {
      const left = Math.random() * 100;
      const size = Math.random() * 15 + 10;
      const colorIndex = Math.floor(Math.random() * colors.length);
      const animationDelay = Math.random() * 0.5;
      
      particles.push(
        <div 
          key={`star-${i}`}
          className={styles.confettiStar}
          style={{
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            color: colors[colorIndex],
            animationDelay: `${animationDelay}s`
          }}
        >
          ★
        </div>
      );
    }
    
    return particles;
  };
  
  // Get gradient background based on message content
  const getMessageGradient = () => {
    // Determine which section is being celebrated based on message keywords
    if (/contact|details|personal|email/i.test(message)) {
      return 'linear-gradient(135deg, #6ab7ff 0%, #007bff 100%)'; // Blue for contact info
    } else if (/summary|introduction|overview/i.test(message)) {
      return 'linear-gradient(135deg, #ff8a80 0%, #e53935 100%)'; // Red for summary
    } else if (/experience|career|professional|journey/i.test(message)) {
      return 'linear-gradient(135deg, #81c784 0%, #388e3c 100%)'; // Green for experience
    } else if (/education|academic|learning|school/i.test(message)) {
      return 'linear-gradient(135deg, #ffb74d 0%, #ef6c00 100%)'; // Orange for education
    } else if (/skill|abilit|capabilit/i.test(message)) {
      return 'linear-gradient(135deg, #9575cd 0%, #512da8 100%)'; // Purple for skills
    } else if (/additional|extra|depth|round/i.test(message)) {
      return 'linear-gradient(135deg, #4dd0e1 0%, #0097a7 100%)'; // Teal for additional info
    } else {
      return 'linear-gradient(135deg, #90caf9 0%, #1976d2 100%)'; // Default blue gradient
    }
  };
  
  // Get appropriate celebration emoji for the message
  const getCelebrationEmoji = () => {
    if (/contact|details|personal|email/i.test(message)) {
      return '📱'; // Phone/contact emoji for personal info
    } else if (/summary|introduction|overview/i.test(message)) {
      return '✨'; // Sparkles for summary
    } else if (/experience|career|professional|journey/i.test(message)) {
      return '💼'; // Briefcase for experience
    } else if (/education|academic|learning|school/i.test(message)) {
      return '🎓'; // Graduation cap for education
    } else if (/skill|abilit|capabilit/i.test(message)) {
      return '🚀'; // Rocket for skills
    } else if (/additional|extra|depth|round/i.test(message)) {
      return '🌟'; // Star for additional info
    } else {
      return '🎉'; // Default party emoji
    }
  };
  
  if (!visible) return null;
  
  return (
    <div className={styles.celebrationContainer}>
      <div className={styles.confetti}>
        {renderConfetti()}
      </div>
      
      <div 
        className={`${styles.messageContainer} ${styles.glowing}`}
        style={{ 
          background: getMessageGradient(),
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2), 0 0 20px rgba(255, 255, 255, 0.3)'
        }}
      >
        <div className={styles.celebrationIcon}>{getCelebrationEmoji()}</div>
        <div className={styles.celebrationMessage}>{message}</div>
      </div>
    </div>
  );
};

export default Celebrations; 