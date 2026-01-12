import React from 'react';
import Link from 'next/link';

/**
 * SalaryCalculatorCTA - Interactive Value Block for RN Salary Calculator
 * 
 * REDESIGN v2.1:
 * - Warm amber/orange gradient background for visual contrast
 * - Floating salary numbers as decoration (more visible now)
 * - "RN Salary Calculator" badge in top-right corner
 * - Dynamic year for trust indicator
 * - Preview salary cards with realistic national averages
 */
const SalaryCalculatorCTA = () => {
  // Dynamic year for the trust indicator
  const currentYear = new Date().getFullYear();
  
  // Sample salary data (realistic national averages for preview)
  // The actual calculator fetches real data from our database
  const previewSalaries = [
    { specialty: 'ICU Nurse', salary: 92500, color: 'green' },
    { specialty: 'ER Nurse', salary: 85300, color: 'blue' },
    { specialty: 'Travel RN', salary: 125000, color: 'yellow' }
  ];

  return (
    <section 
      className="salary-section"
      style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
        padding: '60px 12px 70px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Decorative Background Elements - Floating Salary Numbers */}
      <div className="decorative-bg">
        <div className="floating-salary salary-1">$85k</div>
        <div className="floating-salary salary-2">$92k</div>
        <div className="floating-salary salary-3">$78k</div>
        <div className="floating-salary salary-4">$105k</div>
        
        {/* Gradient orbs */}
        <div className="deco-orb orb-1"></div>
        <div className="deco-orb orb-2"></div>
        
        {/* Chart bars decoration */}
        <div className="chart-bars">
          <div className="bar bar-1"></div>
          <div className="bar bar-2"></div>
          <div className="bar bar-3"></div>
          <div className="bar bar-4"></div>
        </div>
      </div>

      <div 
        className="salary-content"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 4px',
          position: 'relative',
          zIndex: 2,
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="salary-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: 'white',
            borderRadius: '24px',
            padding: '40px 16px',
            boxShadow: '0 20px 60px rgba(217, 119, 6, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* RN Salary Calculator Badge - Top Right */}
          <div 
            className="card-badge"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: 'white',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              padding: '8px 14px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 5
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="6" x2="16" y2="6"/>
              <line x1="8" y1="10" x2="16" y2="10"/>
              <line x1="8" y1="14" x2="12" y2="14"/>
            </svg>
            RN Salary Calculator
          </div>
          
          {/* Card shine effect */}
          <div className="card-shine"></div>
          
          {/* Large Dollar Icon with Animation */}
          <div 
            className="icon-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '24px',
              marginBottom: '24px',
              marginTop: '16px',
              color: '#d97706',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(217, 119, 6, 0.2)'
            }}
          >
            <div className="pulse-ring"></div>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          
          {/* Content */}
          <div className="text-content">
            <h2 
              className="section-title"
              style={{
                fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
                fontSize: '2rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 12px 0',
                lineHeight: '1.2'
              }}
            >
              What Should You Be Earning?
            </h2>
            <p 
              className="section-description"
              style={{
                fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                fontSize: '1.05rem',
                color: '#64748b',
                margin: '0 0 32px 0',
                lineHeight: '1.7',
                maxWidth: '500px'
              }}
            >
              Check RN salaries by state, specialty, and experience level. 
              Know your worth before your next job interview.
            </p>
          </div>

          {/* Sample Salary Preview Cards */}
          <div 
            className="salary-preview"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '32px',
              width: '100%',
              maxWidth: '480px'
            }}
          >
            {previewSalaries.map((item, index) => {
              const colorSchemes = {
                green: {
                  bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '#bbf7d0',
                  label: '#059669',
                  value: '#047857'
                },
                blue: {
                  bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '#bfdbfe',
                  label: '#2563eb',
                  value: '#1d4ed8'
                },
                yellow: {
                  bg: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                  border: '#fde047',
                  label: '#ca8a04',
                  value: '#a16207'
                }
              };
              const scheme = colorSchemes[item.color];
              
              return (
                <div 
                  key={index}
                  className="preview-item"
                  style={{
                    background: scheme.bg,
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: `1px solid ${scheme.border}`,
                    textAlign: 'center',
                    flex: '1',
                    minWidth: '120px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{ 
                    fontFamily: "var(--font-figtree), sans-serif",
                    fontSize: '11px', 
                    color: scheme.label, 
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}>
                    {item.specialty}
                  </div>
                  <div style={{ 
                    fontFamily: "var(--font-figtree), sans-serif",
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    color: scheme.value 
                  }}>
                    ${item.salary.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* CTA Button */}
          <Link 
            href="/jobs/nursing/rn-salary-calculator" 
            className="cta-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 36px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontSize: '1rem',
              fontWeight: '600',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="6" x2="16" y2="6"/>
              <line x1="8" y1="10" x2="16" y2="10"/>
              <line x1="8" y1="14" x2="12" y2="14"/>
              <line x1="8" y1="18" x2="10" y2="18"/>
            </svg>
            <span>Calculate Your Salary</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>

          {/* Trust indicator with dynamic year */}
          <p 
            className="trust-text"
            style={{
              fontFamily: "var(--font-figtree), sans-serif",
              fontSize: '13px',
              color: '#94a3b8',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Based on {currentYear} market data
          </p>
        </div>
      </div>

      <style jsx>{`
        /* ============================================
           DECORATIVE BACKGROUND - FLOATING SALARIES
           More visible now with better opacity/sizing
           ============================================ */
        .decorative-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        /* Floating salary numbers - ALWAYS VISIBLE NOW */
        .floating-salary {
          position: absolute;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-weight: 800;
          color: rgba(217, 119, 6, 0.18);
          animation: floatSalary 8s ease-in-out infinite;
        }
        
        .salary-1 {
          top: 12%;
          left: 5%;
          font-size: 2.5rem;
          animation-delay: 0s;
        }
        
        .salary-2 {
          top: 20%;
          right: 8%;
          font-size: 3.5rem;
          animation-delay: 2s;
        }
        
        .salary-3 {
          bottom: 25%;
          left: 8%;
          font-size: 2.2rem;
          animation-delay: 4s;
        }
        
        .salary-4 {
          bottom: 15%;
          right: 5%;
          font-size: 2.8rem;
          animation-delay: 6s;
        }
        
        @keyframes floatSalary {
          0%, 100% {
            transform: translateY(0) rotate(-2deg);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-20px) rotate(2deg);
            opacity: 0.25;
          }
        }
        
        /* Gradient orbs */
        .deco-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
        }
        
        .orb-1 {
          width: 300px;
          height: 300px;
          background: rgba(251, 191, 36, 0.3);
          top: -100px;
          right: -50px;
        }
        
        .orb-2 {
          width: 250px;
          height: 250px;
          background: rgba(245, 158, 11, 0.25);
          bottom: -80px;
          left: -50px;
        }
        
        /* Chart bars decoration */
        .chart-bars {
          position: absolute;
          bottom: 12%;
          right: 4%;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          opacity: 0.2;
        }
        
        .bar {
          width: 24px;
          background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
          border-radius: 6px 6px 0 0;
          animation: growBar 2s ease-in-out infinite;
        }
        
        .bar-1 { height: 50px; animation-delay: 0s; }
        .bar-2 { height: 80px; animation-delay: 0.2s; }
        .bar-3 { height: 65px; animation-delay: 0.4s; }
        .bar-4 { height: 100px; animation-delay: 0.6s; }
        
        @keyframes growBar {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.15); }
        }
        
        /* Card shine effect */
        .card-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transform: skewX(-25deg);
          animation: shine 4s ease-in-out infinite;
        }
        
        @keyframes shine {
          0% { left: -100%; }
          50%, 100% { left: 150%; }
        }
        
        /* Pulse ring around icon */
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid rgba(217, 119, 6, 0.3);
          border-radius: 24px;
          animation: pulseRing 2s ease-out infinite;
        }
        
        @keyframes pulseRing {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        
        /* Preview item hover */
        .preview-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        
        /* ============================================
           RESPONSIVE: MOBILE (base)
           ============================================ */
        .section-title {
          font-size: 1.5rem !important;
        }
        
        .salary-preview {
          flex-direction: column;
        }
        
        .preview-item {
          min-width: auto !important;
        }
        
        /* Badge adjustments for mobile */
        .card-badge {
          position: static !important;
          margin-bottom: 16px !important;
        }
        
        /* Reduce floating salary size on mobile */
        .floating-salary {
          font-size: 1.5rem !important;
          opacity: 0.12;
        }
        
        .salary-2 {
          font-size: 2rem !important;
        }
        
        /* ============================================
           RESPONSIVE: LARGER PHONES (481px+)
           ============================================ */
        @media (min-width: 481px) {
          .salary-section {
            padding: 70px 20px 80px !important;
          }
          .salary-content {
            padding: 0 12px !important;
          }
          .salary-card {
            padding: 44px 28px !important;
          }

          .floating-salary {
            font-size: 2rem !important;
          }

          .salary-2 {
            font-size: 2.5rem !important;
          }

          .salary-preview {
            flex-direction: row;
          }
        }

        /* ============================================
           RESPONSIVE: TABLETS (641px+)
           ============================================ */
        @media (min-width: 641px) {
          .salary-section {
            padding: 80px 32px 90px !important;
          }
          .salary-content {
            padding: 0 24px !important;
          }
          .salary-card {
            padding: 48px 40px !important;
          }

          .section-title {
            font-size: 1.75rem !important;
          }

          .floating-salary {
            font-size: 2.5rem !important;
          }

          .salary-2 {
            font-size: 3rem !important;
          }

          .chart-bars {
            display: flex;
          }
        }

        /* ============================================
           RESPONSIVE: DESKTOP (901px+)
           ============================================ */
        @media (min-width: 901px) {
          .salary-section {
            padding: 100px 48px 110px !important;
          }
          .salary-content {
            padding: 0 40px !important;
          }

          .section-title {
            font-size: 2.25rem !important;
          }

          .floating-salary {
            font-size: 2.5rem !important;
          }

          .salary-1 {
            font-size: 2.5rem !important;
          }

          .salary-2 {
            font-size: 3.5rem !important;
          }

          .salary-3 {
            font-size: 2.2rem !important;
          }

          .salary-4 {
            font-size: 2.8rem !important;
          }
        }

        /* ============================================
           RESPONSIVE: LARGE DESKTOP (1200px+)
           ============================================ */
        @media (min-width: 1200px) {
          .salary-section {
            padding: 110px 64px 120px !important;
          }
          .salary-content {
            padding: 0 48px !important;
          }
        }
      `}</style>

      {/* Global styles for hover effects and badge positioning */}
      <style jsx global>{`
        .salary-section .cta-button:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 32px rgba(245, 158, 11, 0.5) !important;
        }
        
        .salary-section .cta-button:hover .arrow-icon {
          transform: translateX(4px);
        }
        
        .salary-section .cta-button .arrow-icon {
          transition: transform 0.2s ease;
        }
        
        /* Badge positioning fix for desktop */
        @media (min-width: 641px) {
          .salary-section .card-badge {
            position: absolute !important;
            top: 20px !important;
            right: 20px !important;
            margin-bottom: 0 !important;
          }
        }
      `}</style>
    </section>
  );
};

export default SalaryCalculatorCTA;
