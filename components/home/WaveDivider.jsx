import React from 'react';

/**
 * WaveDivider - Creates smooth, curved transitions between sections
 * 
 * This component renders an SVG wave that creates visual flow
 * between sections instead of hard edges. Can be flipped for
 * top or bottom placement.
 * 
 * @param {string} topColor - Color of the section above
 * @param {string} bottomColor - Color of the section below  
 * @param {boolean} flip - If true, flips the wave vertically
 * @param {string} variant - 'wave', 'curve', or 'angle' for different styles
 */
const WaveDivider = ({ 
  topColor = '#0f766e', 
  bottomColor = '#ffffff',
  flip = false,
  variant = 'wave',
  className = ''
}) => {
  // Different wave path variants for variety
  const paths = {
    // Gentle rolling wave
    wave: 'M0,64 C288,96 576,32 720,64 C864,96 1080,32 1440,64 L1440,0 L0,0 Z',
    // Smooth single curve
    curve: 'M0,96 Q720,0 1440,96 L1440,0 L0,0 Z',
    // Subtle angle with soft corner
    angle: 'M0,64 L1440,0 L1440,0 L0,0 Z',
    // Gentle swoosh - more organic
    swoosh: 'M0,32 C360,96 1080,0 1440,64 L1440,0 L0,0 Z'
  };

  const selectedPath = paths[variant] || paths.wave;

  return (
    <div 
      className={`wave-divider ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '60px',
        marginTop: flip ? 0 : '-1px',
        marginBottom: flip ? '-1px' : 0,
        transform: flip ? 'rotate(180deg)' : 'none',
        overflow: 'hidden',
        lineHeight: 0
      }}
    >
      <svg
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          bottom: 0,
          left: 0
        }}
      >
        {/* Background fill */}
        <rect x="0" y="0" width="1440" height="96" fill={bottomColor} />
        {/* Wave path */}
        <path
          d={selectedPath}
          fill={topColor}
        />
      </svg>
    </div>
  );
};

export default WaveDivider;

