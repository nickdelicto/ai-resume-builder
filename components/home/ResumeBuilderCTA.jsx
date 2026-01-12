import React from 'react';
import Link from 'next/link';

/**
 * ResumeBuilderCTA - Promotes the AI resume builder as a value-add
 * Shows 3 independent workflow cards: Build New, Improve Existing, Tailor to Job
 * Each card represents a separate entry point - not sequential steps
 */
const ResumeBuilderCTA = () => {
  // Card data - each represents an independent workflow
  const cards = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      ),
      title: 'Build New Resume',
      description: 'Start fresh with our AI-powered builder that guides you step by step',
      href: '/builder/new',
      color: '#2563eb',
      iconBg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      cardBg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      borderColor: '#93c5fd',
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      ),
      title: 'Improve Existing',
      description: 'Upload your resume and let AI enhance it with smart suggestions',
      href: '/builder/import',
      color: '#7c3aed',
      iconBg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
      cardBg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      borderColor: '#c4b5fd',
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
      title: 'Customize to Job',
      description: 'Match your resume perfectly to any job description for better results',
      href: '/builder/target',
      color: '#0d9488',
      iconBg: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
      cardBg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
      borderColor: '#5eead4',
    },
  ];

  return (
    <section 
      className="resume-section"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
        padding: '80px 40px 90px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Decorative Background Elements */}
      <div className="decorative-bg">
        {/* Floating document icons */}
        <div className="floating-icon icon-doc-1">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div className="floating-icon icon-doc-2">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        
        {/* Sparkle decorations */}
        <div className="sparkle sparkle-1">✦</div>
        <div className="sparkle sparkle-2">✧</div>
        <div className="sparkle sparkle-3">✦</div>
        
        {/* Gradient orbs */}
        <div className="deco-orb orb-1"></div>
        <div className="deco-orb orb-2"></div>
      </div>

      <div 
        className="resume-content"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 24px',
          position: 'relative',
          zIndex: 2,
          boxSizing: 'border-box'
        }}
      >
        {/* Section Header */}
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span 
            className="section-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              color: '#92400e',
              padding: '10px 20px',
              borderRadius: '50px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '20px',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.25)'
            }}
          >
            🚀 Intelligent Resume Builder
          </span>
          <h2 
            className="section-title"
            style={{
              fontFamily: "var(--font-figtree), 'Inter', -apple-system, sans-serif",
              fontSize: '2.2rem',
              fontWeight: '700',
              color: '#1e293b',
              margin: '0 0 16px 0'
            }}
          >
            Seen a Job You Like? Get Your Resume Ready
          </h2>
          <p 
            className="section-subtitle"
            style={{
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              fontSize: '1.1rem',
              color: '#64748b',
              margin: '0 auto',
              maxWidth: '550px',
              lineHeight: '1.7'
            }}
          >
            Our intelligent resume builder helps you create professional, ATS-optimized resumes in minutes
          </p>
        </div>

        {/* Cards Grid */}
        <div 
          className="cards-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}
        >
          {cards.map((card, index) => (
            <Link 
              key={card.href}
              href={card.href}
              className="resume-card"
              style={{ 
                animationDelay: `${index * 0.15}s`,
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '36px 28px',
                background: card.cardBg,
                border: `2px solid ${card.borderColor}`,
                borderRadius: '20px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Card shine effect */}
              <div className="card-shine"></div>
              
              {/* Icon Container */}
              <div 
                className="icon-container"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '72px',
                  height: '72px',
                  background: card.iconBg,
                  borderRadius: '18px',
                  marginBottom: '20px',
                  color: card.color,
                  boxShadow: `0 6px 16px ${card.borderColor}80`,
                  transition: 'all 0.3s ease'
                }}
              >
                {card.icon}
              </div>
              
              <h3 
                className="card-title"
                style={{
                  fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#1e293b',
                  margin: '0 0 10px 0'
                }}
              >
                {card.title}
              </h3>
              <p 
                className="card-description"
                style={{
                  fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                  fontSize: '14px',
                  color: '#64748b',
                  margin: '0 0 20px 0',
                  lineHeight: '1.6',
                  flex: 1
                }}
              >
                {card.description}
              </p>
              <span 
                className="card-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: '600',
                  color: card.color,
                  padding: '10px 20px',
                  background: 'white',
                  borderRadius: '50px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease'
                }}
              >
                Get Started
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </Link>
          ))}
        </div>

        {/* Trust Message */}
        <div 
          className="trust-message"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontFamily: "var(--font-figtree), 'Inter', sans-serif",
            fontSize: '15px',
            color: '#475569',
            textAlign: 'center',
            margin: '0',
            padding: '20px 24px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        >
          <span 
            className="stat-highlight"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              borderRadius: '12px',
              flexShrink: 0
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
          </svg>
          </span>
          <span>
            Customizing your resume to a job increases interview callbacks by <strong style={{ color: '#16a34a' }}>40%</strong>
          </span>
        </div>
      </div>

      <style jsx>{`
        /* Decorative Background */
        .decorative-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }
        
        .floating-icon {
          position: absolute;
          color: rgba(148, 163, 184, 0.15);
          opacity: 0;
          animation: float-doc 20s infinite ease-in-out;
        }
        
        .icon-doc-1 {
          top: 15%;
          left: 8%;
          animation-delay: 0s;
          transform: rotate(-10deg);
        }
        
        .icon-doc-2 {
          bottom: 20%;
          right: 10%;
          animation-delay: 5s;
          transform: rotate(15deg);
        }
        
        @keyframes float-doc {
          0% { transform: translateY(0) rotate(-10deg) scale(0.9); opacity: 0; }
          15% { opacity: 0.8; }
          50% { transform: translateY(-30px) rotate(5deg) scale(1.1); }
          85% { opacity: 0.8; }
          100% { transform: translateY(0) rotate(-10deg) scale(0.9); opacity: 0; }
        }
        
        .sparkle {
          position: absolute;
          font-size: 1.5rem;
          color: rgba(251, 191, 36, 0.4);
          animation: sparkle-float 8s infinite ease-in-out;
        }
        
        .sparkle-1 { top: 20%; right: 15%; animation-delay: 0s; }
        .sparkle-2 { top: 60%; left: 5%; animation-delay: 2s; font-size: 1.2rem; }
        .sparkle-3 { bottom: 25%; right: 8%; animation-delay: 4s; font-size: 1rem; }
        
        @keyframes sparkle-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
        }
        
        .deco-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.4;
        }
        
        .orb-1 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #dbeafe 0%, #c4b5fd 100%);
          top: -100px;
          right: -100px;
        }
        
        .orb-2 {
          width: 250px;
          height: 250px;
          background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
          bottom: -80px;
          left: -80px;
        }
        
        /* Card Hover Effects */
        .resume-card:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12) !important;
        }
        
        .resume-card:hover .icon-container {
          transform: scale(1.08);
        }
        
        .resume-card:hover .card-cta {
          gap: 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
        }
        
        .resume-card:hover .card-cta svg {
          transform: translateX(3px);
        }
        
        /* Card shine effect */
        .card-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: all 0.6s;
        }
        
        .resume-card:hover .card-shine {
          left: 100%;
        }
        
        /* Animation */
        .resume-card {
          animation: fadeInUp 0.6s ease-out both;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Responsive: Larger Phones */
        @media (min-width: 481px) {
          .resume-section {
            padding: 90px 32px 100px !important;
          }
          
          .resume-content {
            padding: 0 32px !important;
          }
          
          .section-title {
            font-size: 2.4rem !important;
          }
        }
        
        /* Responsive: Tablets */
        @media (min-width: 641px) {
          .resume-section {
            padding: 100px 40px 110px !important;
          }
          
          .resume-content {
            padding: 0 40px !important;
          }
          
          .cards-grid {
            gap: 28px !important;
          }
          
          .section-title {
            font-size: 2.6rem !important;
          }
        }
        
        /* Responsive: Desktop */
        @media (min-width: 901px) {
          .resume-section {
            padding: 110px 48px 120px !important;
          }
          
          .resume-content {
            padding: 0 48px !important;
          }
          
          .cards-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 32px !important;
          }
          
          .section-title {
            font-size: 2.8rem !important;
          }
          
          .section-header {
            margin-bottom: 56px !important;
          }
        }
      `}</style>
      
      <style jsx global>{`
        .resume-section .resume-card {
          text-decoration: none !important;
        }
      `}</style>
    </section>
  );
};

export default ResumeBuilderCTA;
