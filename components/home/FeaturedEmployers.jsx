import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * FeaturedEmployers - Shows top healthcare employers hiring RNs
 * 
 * REDESIGN v5.0 - Complete Reimagination:
 * - Card-based layout (NOT pills like Browse by State)
 * - Each employer gets a proper card with depth and visual interest
 * - Soft blue-gray gradient background for visual rhythm/contrast
 * - Hospital building icons as logo placeholders
 * - "Actively Hiring" badges for hot employers
 * - 3-column grid on desktop, responsive stacking
 * - Completely different visual language from other sections
 */
const FeaturedEmployers = () => {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/jobs/browse-stats');
        const data = await response.json();
        if (data.success && data.data.employers) {
          // Get top 6 employers
          setEmployers(data.data.employers.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching employers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatNumber = (num) => num.toLocaleString();
  const isHotEmployer = (count) => count >= 100;

  // Generate unique icon for each employer (based on index)
  const getEmployerIcon = (index) => {
    const icons = [
      // Hospital with cross
      <svg key="hospital" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
        <path d="M12 3v4M10 5h4"/>
      </svg>,
      // Heart with pulse
      <svg key="heart" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.5 13.572l-7.5 7.428-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 7.566z"/>
        <path d="M12 6v4l2 2"/>
      </svg>,
      // Medical building
      <svg key="building" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <path d="M9 22v-4h6v4M12 6v4M10 8h4"/>
        <circle cx="12" cy="16" r="1"/>
      </svg>,
      // Stethoscope
      <svg key="stethoscope" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
        <circle cx="20" cy="10" r="2"/>
      </svg>,
      // Medical cross shield
      <svg key="shield" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M12 8v6M9 11h6"/>
      </svg>,
      // Activity/pulse
      <svg key="activity" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ];
    return icons[index % icons.length];
  };

  if (loading) {
    return (
      <section className="employers-section">
        <div className="employers-content">
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="loading-card" style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
          </div>
        </div>
        <style jsx>{styles}</style>
      </section>
    );
  }

  return (
    <section 
      className="employers-section"
      style={{
        // Inline styles to guarantee these apply (styled-jsx override)
        padding: '80px 40px 90px',
        boxSizing: 'border-box',
        // Warm cream/off-white gradient - contrasts with cool mint of previous section
        background: 'linear-gradient(165deg, #ffffff 0%, #fdfcfb 30%, #faf8f6 60%, #f8f6f3 100%)'
      }}
    >

      <div 
        className="employers-content"
        style={{
          // Inline styles to guarantee padding and max-width
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Section Header */}
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span 
            className="section-badge"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: 'white',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '6px 16px',
              borderRadius: '20px',
              marginBottom: '16px'
            }}
          >
            Featured Employers
          </span>
          <h2 
            className="section-title"
            style={{
              fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1e293b',
              margin: '0 0 12px 0'
            }}
          >
            Top Healthcare Employers
          </h2>
          <p 
            className="section-subtitle"
            style={{
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              fontSize: '1rem',
              color: '#64748b',
              margin: '0 auto',
              lineHeight: '1.6',
              maxWidth: '500px'
            }}
          >
            Find opportunities at leading hospitals and health systems actively hiring RNs
          </p>
        </div>

        {/* Employer Cards Grid */}
        <div 
          className="employer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
            maxWidth: '100%'
          }}
        >
          {employers.map((employer, index) => {
            const isHot = isHotEmployer(employer.count);
            return (
            <Link 
              key={employer.slug} 
              href={`/jobs/nursing/employer/${employer.slug}`}
              className="employer-card"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  textDecoration: 'none',
                  display: 'block',
                  background: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Card accent strip */}
                <div 
                  className="card-accent"
                  style={{
                    background: isHot 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                  }}
                ></div>
                
                {/* Card content */}
                <div 
                  className="card-body"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
            >
                  {/* Icon container */}
                  <div 
                    className="employer-icon"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: isHot 
                        ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                        : 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
                      color: isHot ? '#d97706' : '#0d9488',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    {getEmployerIcon(index)}
                  </div>
                  
                  {/* Employer info */}
                  <div className="employer-info" style={{ flex: 1, minWidth: 0 }}>
                    <h3 
                      className="employer-name"
                      style={{
                        fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                        fontSize: '1.05rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        margin: '0 0 8px 0',
                        lineHeight: '1.3'
                      }}
                    >
                      {employer.name}
                    </h3>
                    
                    <div className="employer-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span 
                        className="job-count-badge"
                        style={{
                          fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          background: isHot 
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                        }}
                      >
                        {formatNumber(employer.count)} positions
                      </span>
                      
                      <span 
                        className="hiring-badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '4px 10px',
                          borderRadius: '20px'
                        }}
                      >
                        <span 
                          className="pulse-dot"
                          style={{
                            width: '6px',
                            height: '6px',
                            background: '#10b981',
                            borderRadius: '50%',
                            animation: 'pulse 1.5s ease-in-out infinite'
                          }}
                        ></span>
                        Actively Hiring
                </span>
              </div>
                  </div>
                  
                  {/* Arrow */}
                  <div 
                    className="card-arrow"
                    style={{
                      color: '#94a3b8',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
              </svg>
                  </div>
                </div>
            </Link>
            );
          })}
        </div>

        {/* View All CTA */}
        <div className="cta-container" style={{ textAlign: 'center' }}>
          <Link
            href="/jobs/nursing#browse-employers"
            className="view-all-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: 'white',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '50px',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(13, 148, 136, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <span>Explore All Employers</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s ease' }}>
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </div>

      <style jsx>{styles}</style>
      
      {/* Global hover effects */}
      <style jsx global>{`
        .employers-section .employer-card:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 20px 40px rgba(15, 118, 110, 0.15) !important;
        }
        
        .employers-section .employer-card:hover .card-arrow {
          transform: translateX(4px);
          color: #0d9488;
        }
        
        .employers-section .employer-card:hover .employer-icon {
          transform: scale(1.05);
        }
        
        .employers-section .view-all-btn:hover {
          background: linear-gradient(135deg, #0f766e 0%, #115e59 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 28px rgba(13, 148, 136, 0.4) !important;
        }
        
        .employers-section .view-all-btn:hover svg {
          transform: translateX(5px);
        }
      `}</style>
    </section>
  );
};

const styles = `
  /* ============================================
     SECTION - Soft blue-gray gradient background
     Different from mint section above
     ============================================ */
  .employers-section {
    /* Warm cream/off-white gradient - distinct from cool mint above */
    background: linear-gradient(165deg, #ffffff 0%, #fdfcfb 30%, #faf8f6 60%, #f8f6f3 100%);
    padding: 80px 24px 90px;
    position: relative;
    border-bottom: 1px solid rgba(13, 148, 136, 0.08);
    overflow: hidden;
  }
  
  .employers-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 16px;
    position: relative;
    z-index: 2;
  }
  
  
  /* ============================================
     SECTION HEADER
     ============================================ */
  .section-header {
    text-align: center;
    margin-bottom: 48px;
  }
  
  .section-badge {
    display: inline-block;
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
    color: white;
    font-family: var(--font-figtree), 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 6px 16px;
    border-radius: 20px;
    margin-bottom: 16px;
  }
  
  .section-title {
    font-family: var(--font-figtree), 'Inter', -apple-system, sans-serif;
    font-size: 1.8rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 12px 0;
  }
  
  .section-subtitle {
    font-family: var(--font-figtree), 'Inter', sans-serif;
    font-size: 1rem;
    color: #64748b;
    margin: 0;
    line-height: 1.6;
    max-width: 500px;
    margin: 0 auto;
  }
  
  /* ============================================
     EMPLOYER CARDS GRID
     ============================================ */
  .employer-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 40px;
  }
  
  .employer-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: fadeInUp 0.5s ease-out both;
    display: block;
    cursor: pointer;
  }
  
  .card-accent {
    height: 4px;
    width: 100%;
  }
  
  .card-body {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .employer-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.3s ease;
  }
  
  .employer-info {
    flex: 1;
    min-width: 0;
  }
  
  .employer-name {
    font-family: var(--font-figtree), 'Inter', sans-serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 8px 0;
    line-height: 1.3;
  }
  
  .employer-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .job-count-badge {
    font-family: var(--font-figtree), 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
  }
  
  .hiring-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-figtree), 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #059669;
    background: #ecfdf5;
    padding: 4px 10px;
    border-radius: 20px;
  }
  
  .pulse-dot {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .card-arrow {
    color: #94a3b8;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }
  
  /* ============================================
     CTA BUTTON
     ============================================ */
  .cta-container {
    text-align: center;
  }
  
  .view-all-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 16px 32px;
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
    color: white;
    font-family: var(--font-figtree), 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 600;
    border-radius: 50px;
    text-decoration: none;
    box-shadow: 0 8px 24px rgba(13, 148, 136, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .view-all-btn svg {
    transition: transform 0.3s ease;
  }
  
  /* ============================================
     LOADING STATE
     ============================================ */
  .loading-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 40px 0;
  }
  
  .loading-card {
    height: 100px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 16px;
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
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  
  /* ============================================
     RESPONSIVE: LARGER PHONES (481px+)
     ============================================ */
  @media (min-width: 481px) {
    .employers-section {
      padding: 90px 32px 100px;
    }
    
    .employers-content {
      padding: 0 24px;
    }
    
    .section-title {
      font-size: 2rem;
    }
    
    .employer-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .card-body {
      padding: 24px;
    }
  }
  
  /* ============================================
     RESPONSIVE: TABLETS (641px+)
     ============================================ */
  @media (min-width: 641px) {
    .employers-section {
      padding: 100px 40px 110px;
    }
    
    .employers-content {
      padding: 0 32px;
    }
    
    .section-header {
      margin-bottom: 56px;
    }
    
    .section-title {
      font-size: 2.2rem;
    }
    
    .section-subtitle {
      font-size: 1.1rem;
    }
    
    .employer-grid {
      gap: 24px;
    }
    
    .employer-name {
      font-size: 1.1rem;
    }
  }
  
  /* ============================================
     RESPONSIVE: DESKTOP (901px+)
     ============================================ */
  @media (min-width: 901px) {
    .employers-section {
      padding: 110px 48px 120px;
    }
    
    .employers-content {
      padding: 0 40px;
    }
    
    .section-title {
      font-size: 2.5rem;
    }
    
    .employer-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 50px;
    }
    
    .employer-icon {
      width: 60px;
      height: 60px;
    }
    
    .employer-name {
      font-size: 1.15rem;
    }
  }
  
  /* ============================================
     RESPONSIVE: LARGE DESKTOP (1200px+)
     ============================================ */
  @media (min-width: 1200px) {
    .employers-section {
      padding: 120px 64px 130px;
    }
    
    .employers-content {
      padding: 0 48px;
      max-width: 1400px;
    }
  }
`;

export default FeaturedEmployers;
