import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useBrowseStats } from '../../lib/hooks/useBrowseStats';

/**
 * BrowseByState - Quick access pills for browsing RN jobs by state
 *
 * REDESIGN v3.0 - Professional Landing Page Design:
 * - Soft mint gradient background for warmth
 * - Decorative SVG elements (stethoscope, cross, heartbeat) for visual interest
 * - Improved spacing and breathing room
 * - Enhanced pills with better shadows and interactions
 * - Hot market indicators for high-volume states
 * - Smooth animations with stagger effect
 *
 * Uses SWR for data fetching with optional SSR fallback
 */
const BrowseByState = ({ initialStats }) => {
  const [showAll, setShowAll] = useState(false);

  // Use SWR hook with optional SSR fallback
  const { stats, isLoading: loading } = useBrowseStats({ fallbackData: initialStats });

  // Sort states by job count (highest first)
  const states = useMemo(() => {
    if (!stats?.states) return [];
    return [...stats.states].sort((a, b) => b.count - a.count);
  }, [stats]);

  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  // Show top 5 states initially, or all if expanded
  const displayedStates = showAll ? states : states.slice(0, 5);
  const remainingCount = states.length - 5;
  const totalJobs = states.reduce((sum, s) => sum + s.count, 0);

  // Loading state with skeleton pills
  if (loading) {
    return (
      <section className="browse-section">
        {/* Wave removed - now at bottom of hero for seamless gradient flow */}
        
        {/* Decorative Background Elements */}
        <div className="decorative-elements">
          <div className="deco-circle deco-1"></div>
          <div className="deco-circle deco-2"></div>
          <div className="deco-cross"></div>
        </div>
        
        <div className="browse-content">
          <div className="loading-pills">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="loading-pill" style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
          </div>
        </div>
        <style jsx>{styles}</style>
      </section>
    );
  }

  return (
    <section className="browse-section">
      {/* Wave removed - now at bottom of hero for seamless gradient flow */}
      
      {/* Decorative Background Elements - Creates visual interest */}
      <div className="decorative-elements">
        {/* Floating circles with subtle opacity */}
        <div className="deco-circle deco-1"></div>
        <div className="deco-circle deco-2"></div>
        
        {/* Medical cross icon - positioned top right */}
        <svg className="deco-cross" width="80" height="80" viewBox="0 0 24 24" fill="none">
          <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        
        {/* Heartbeat line - positioned bottom left */}
        <svg className="deco-heartbeat" width="200" height="60" viewBox="0 0 200 60" fill="none">
          <path d="M0 30 L40 30 L50 10 L60 50 L70 20 L80 40 L90 30 L200 30" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        
        {/* Stethoscope icon - positioned right side */}
        <svg className="deco-stethoscope" width="100" height="100" viewBox="0 0 24 24" fill="none">
          <path d="M4.8 2.3A.3.3 0 105 2h0a2 2 0 012 2v5a6 6 0 0011.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="19" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M4 12a6 6 0 006 6h0a6 6 0 006-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="browse-content">
        {/* Section Header - Centered with icon */}
        <div className="section-header">
          <h2 className="section-title">
            {/* Location Pin SVG Icon */}
            <svg className="title-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Browse RN Jobs by State
          </h2>
          
          <p className="section-subtitle">
            Click a state to explore <strong>{formatNumber(totalJobs)}+</strong> nursing opportunities
          </p>
        </div>

        {/* State Pills - Wrapped in a container for better control */}
        <div className="pills-container">
        <div className="state-pills">
            {displayedStates.map((state, index) => {
              const isHot = state.count >= 100;
              return (
            <Link 
              key={state.code} 
              href={`/jobs/nursing/${state.code.toLowerCase()}`}
                  className={`state-pill ${isHot ? 'hot' : ''}`}
                  style={{ 
                    animationDelay: `${index * 0.08}s`,
                    // Inline styles to override Tailwind reset
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 22px',
                    background: isHot 
                      ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' 
                      : 'white',
                    border: isHot ? '2px solid #fcd34d' : '2px solid #e2e8f0',
                    borderRadius: '50px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {/* Hot indicator for states with 100+ jobs */}
                  {isHot && (
                    <span className="hot-indicator" aria-label="Hot market">🔥</span>
                  )}
                  <span 
                    className="state-name"
                    style={{
                      fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1e293b'
                    }}
                  >
                    {state.fullName}
                  </span>
                  <span 
                    className="state-count"
                    style={{
                      fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'white',
                      background: isHot 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      minWidth: '50px',
                      textAlign: 'center'
                    }}
                  >
                    {formatNumber(state.count)}
                  </span>
            </Link>
              );
            })}
          
          {/* Show More / Less Button */}
            {states.length > 5 && (
            <button 
              className="more-button"
              onClick={() => setShowAll(!showAll)}
                aria-expanded={showAll}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '14px 22px',
                  background: 'transparent',
                  border: '2px dashed #94a3b8',
                  borderRadius: '50px',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
            >
              {showAll ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                    Show Less
                  </>
              ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    +{remainingCount} More States
                  </>
              )}
            </button>
          )}
          </div>
        </div>

        {/* View All CTA Button - Orange gradient */}
        <div className="cta-container">
          <Link
            href="/jobs/nursing#browse-states"
            className="view-all-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 36px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)'
            }}
          >
            <span>View All {formatNumber(totalJobs)} Jobs</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </div>

      <style jsx>{styles}</style>
      
      {/* Global hover effects */}
      <style jsx global>{`
        .browse-section .state-pill:hover {
          border-color: #0d9488 !important;
          background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%) !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 28px rgba(13, 148, 136, 0.2) !important;
        }
        
        .browse-section .state-pill.hot:hover {
          border-color: #f59e0b !important;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
          box-shadow: 0 12px 28px rgba(245, 158, 11, 0.25) !important;
        }
        
        .browse-section .more-button:hover {
          border-color: #0d9488 !important;
          color: #0d9488 !important;
          background: rgba(13, 148, 136, 0.08) !important;
        }
        
        .browse-section .view-all-button:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.45) !important;
        }
        
        .browse-section .view-all-button:hover svg {
          transform: translateX(5px);
        }
      `}</style>
    </section>
  );
};

// ============================================
// STYLES - Mobile-first responsive design
// ============================================
const styles = `
  /* ============================================
     SECTION CONTAINER
     Soft mint gradient background with decorative elements
     ============================================ */
  .browse-section {
    background: linear-gradient(180deg, #f0fdfa 0%, #e6fffa 50%, #f0fdfa 100%);
    padding: 60px 16px 70px;
    padding-top: 100px;
    margin-top: -60px;
    position: relative;
    overflow: hidden;
  }
  
  /* Wave overlay at top - creates smooth hero transition */
  .browse-content {
    max-width: 1000px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
  }
  
  /* ============================================
     DECORATIVE BACKGROUND ELEMENTS
     Creates visual interest and depth
     ============================================ */
  .decorative-elements {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
  }
  
  /* Floating circles - soft teal */
  .deco-circle {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(20, 184, 166, 0.05) 100%);
  }
  
  .deco-1 {
    width: 300px;
    height: 300px;
    top: -100px;
    left: -100px;
  }
  
  .deco-2 {
    width: 200px;
    height: 200px;
    bottom: -50px;
    right: 10%;
  }
  
  /* Medical cross icon */
  .deco-cross {
    position: absolute;
    top: 20%;
    right: 5%;
    color: rgba(13, 148, 136, 0.06);
    transform: rotate(15deg);
  }
  
  /* Heartbeat line */
  .deco-heartbeat {
    position: absolute;
    bottom: 15%;
    left: 2%;
    color: rgba(13, 148, 136, 0.08);
  }
  
  /* Stethoscope icon */
  .deco-stethoscope {
    position: absolute;
    top: 50%;
    right: 3%;
    color: rgba(13, 148, 136, 0.05);
    transform: translateY(-50%);
  }
  
  /* ============================================
     SECTION HEADER
     ============================================ */
  .section-header {
    text-align: center;
    margin-bottom: 36px;
  }
  
  .section-title {
    font-family: var(--font-figtree), 'Inter', -apple-system, sans-serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: #134e4a;
    margin: 0 0 12px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .title-icon {
    color: #0d9488;
    flex-shrink: 0;
  }
  
  .section-subtitle {
    font-family: var(--font-figtree), 'Inter', sans-serif;
    font-size: 1rem;
    color: #475569;
    margin: 0;
    line-height: 1.6;
  }
  
  .section-subtitle strong {
    color: #0d9488;
    font-weight: 700;
  }
  
  /* ============================================
     STATE PILLS CONTAINER
     ============================================ */
  .pills-container {
    margin-bottom: 36px;
  }
  
  .state-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
  
  /* Animation for pills */
  .state-pill {
    animation: fadeInUp 0.5s ease-out both;
  }
  
  .hot-indicator {
    font-size: 14px;
    margin-right: -4px;
  }
  
  /* ============================================
     CTA CONTAINER
     ============================================ */
  .cta-container {
    text-align: center;
  }
  
  .view-all-button svg {
    transition: transform 0.3s ease;
  }
  
  /* ============================================
     LOADING STATE
     ============================================ */
  .loading-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    padding: 40px 0;
  }
  
  .loading-pill {
    width: 140px;
    height: 52px;
    background: linear-gradient(90deg, #ccfbf1 25%, #f0fdfa 50%, #ccfbf1 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 50px;
  }
  
  /* ============================================
     ANIMATIONS
     ============================================ */
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* ============================================
     RESPONSIVE: LARGER PHONES (min-width: 481px)
     ============================================ */
  @media (min-width: 481px) {
    .browse-section {
      padding: 70px 24px 80px;
    }
    
    .section-title {
      font-size: 1.85rem;
    }
    
    .state-pills {
      gap: 14px;
    }
    
    .deco-cross {
      width: 100px;
      height: 100px;
    }
    
    .deco-stethoscope {
      width: 120px;
      height: 120px;
    }
  }
  
  /* ============================================
     RESPONSIVE: TABLETS (min-width: 641px)
     ============================================ */
  @media (min-width: 641px) {
    .browse-section {
      padding: 80px 24px 90px;
    }
    
    .section-header {
      margin-bottom: 44px;
    }
    
    .section-title {
      font-size: 2.1rem;
      gap: 14px;
    }
    
    .title-icon {
      width: 36px;
      height: 36px;
    }
    
    .section-subtitle {
      font-size: 1.1rem;
    }
    
    .pills-container {
      margin-bottom: 44px;
    }
    
    .state-pills {
      gap: 16px;
    }
    
    .deco-1 {
      width: 400px;
      height: 400px;
    }
    
    .deco-2 {
      width: 280px;
      height: 280px;
    }
  }
  
  /* ============================================
     RESPONSIVE: DESKTOP (min-width: 901px)
     ============================================ */
  @media (min-width: 901px) {
    .browse-section {
      padding: 90px 24px 100px;
    }
    
    .section-header {
      margin-bottom: 50px;
    }
    
    .section-title {
      font-size: 2.4rem;
    }
    
    .section-subtitle {
      font-size: 1.15rem;
    }
    
    .pills-container {
      margin-bottom: 50px;
    }
    
    .state-pills {
      gap: 18px;
    }
    
    .deco-cross {
      width: 120px;
      height: 120px;
      right: 8%;
    }
    
    .deco-stethoscope {
      width: 140px;
      height: 140px;
    }
    
    .deco-heartbeat {
      width: 250px;
    }
  }
`;

export default BrowseByState;
