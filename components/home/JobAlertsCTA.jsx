import React, { useState } from 'react';
import { useRouter } from 'next/router';

/**
 * JobAlertsCTA - Final section encouraging job alert signup
 * 
 * REDESIGN v2.0:
 * - Teal gradient background with floating decorative elements
 * - "JOB ALERTS" badge in card corner
 * - White card containing the form
 * - Sample notification preview
 * - Enhanced trust points with pill styling
 * - Floating envelope/notification animations
 */
const JobAlertsCTA = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');

  // Handle form submission - redirect to full signup form
  const handleSubmit = (e) => {
    e.preventDefault();
    router.push(`/jobs/nursing${email ? `?email=${encodeURIComponent(email)}` : ''}#job-alert-form`);
  };

  return (
    <section 
      className="alerts-section"
      style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
        padding: '80px 40px 90px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Floating Decorative Elements */}
      <div className="decorative-elements">
        {/* Floating envelopes */}
        <div className="floating-icon envelope-1">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div className="floating-icon envelope-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div className="floating-icon bell-1">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div className="floating-icon bell-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        
        {/* Notification dots */}
        <div className="notification-dot dot-1"></div>
        <div className="notification-dot dot-2"></div>
        <div className="notification-dot dot-3"></div>
        
        {/* Gradient orbs */}
        <div className="deco-orb orb-1"></div>
        <div className="deco-orb orb-2"></div>
      </div>

      <div 
        className="alerts-content"
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
          padding: '0 24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Main Card */}
        <div 
          className="alerts-card"
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '48px 40px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* JOB ALERTS Badge */}
          <div 
            className="card-badge"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: 'white',
              fontFamily: "'Figtree', 'Inter', sans-serif",
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Job Alerts
          </div>
          
          {/* Card shine effect */}
          <div className="card-shine"></div>
          
          {/* Icon Container */}
          <div 
            className="icon-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '90px',
              height: '90px',
              background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
              borderRadius: '24px',
              margin: '0 auto 24px',
              color: '#0f766e',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(13, 148, 136, 0.2)'
            }}
          >
            <div className="pulse-ring"></div>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {/* Animated notification badge */}
            <div className="icon-notification-badge">
              <span>3</span>
            </div>
          </div>
          
          {/* Content */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 
              style={{
                fontFamily: "'Figtree', 'Inter', -apple-system, sans-serif",
                fontSize: '2rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 12px 0',
                lineHeight: '1.2'
              }}
            >
              Never Miss a Job Opening
            </h2>
            <p 
              style={{
                fontFamily: "'Figtree', 'Inter', sans-serif",
                fontSize: '1.05rem',
                color: '#64748b',
                margin: '0',
                lineHeight: '1.6',
                maxWidth: '450px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
            >
            Get weekly alerts for RN positions matching your preferences. 
            Be the first to apply to fresh opportunities.
          </p>
          </div>
          
          {/* Sample Notification Preview */}
          <div 
            className="notification-preview"
            style={{
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
              border: '1px solid #99f6e4',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '28px',
              maxWidth: '420px',
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div 
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div 
                style={{
                  fontFamily: "'Figtree', sans-serif",
                  fontSize: '12px',
                  color: '#0f766e',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                🔔 New Job Alert
              </div>
              <div 
                style={{
                  fontFamily: "'Figtree', sans-serif",
                  fontSize: '14px',
                  color: '#1e293b',
                  fontWeight: '600'
                }}
              >
                5 new ICU positions in Ohio
              </div>
              <div 
                style={{
                  fontFamily: "'Figtree', sans-serif",
                  fontSize: '12px',
                  color: '#64748b'
                }}
              >
                Cleveland Clinic, UH, MetroHealth...
              </div>
            </div>
            <div 
              style={{
                background: '#f59e0b',
                color: 'white',
                fontFamily: "'Figtree', sans-serif",
                fontSize: '10px',
                fontWeight: '700',
                padding: '4px 8px',
                borderRadius: '12px',
                flexShrink: 0
              }}
            >
              NEW
            </div>
          </div>
          
          {/* Email Form */}
          <form className="alert-form" onSubmit={handleSubmit}>
            <div 
              className="form-row"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '440px',
                margin: '0 auto 24px'
              }}
            >
              <div 
                className="input-wrapper"
                style={{
                  position: 'relative',
                  flex: 1
                }}
              >
                <svg 
                  style={{
                    position: 'absolute',
                    left: '18px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="email-input"
                  style={{
                    width: '100%',
                    padding: '18px 18px 18px 52px',
                    fontSize: '16px',
                    fontFamily: "'Figtree', 'Inter', sans-serif",
                    border: '2px solid #e2e8f0',
                    borderRadius: '14px',
                    background: 'white',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
              />
            </div>
              <button 
                type="submit" 
                className="submit-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '18px 32px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: '600',
                  fontFamily: "'Figtree', 'Inter', sans-serif",
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
              <span>Create Job Alert</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            </div>
          </form>
          
          {/* Trust Points */}
          <div 
            className="trust-points"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            {[
              { icon: '✓', text: 'Free forever' },
              { icon: '✓', text: 'No spam' },
              { icon: '✓', text: 'Unsubscribe anytime' }
            ].map((item, index) => (
              <span 
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "'Figtree', 'Inter', sans-serif",
                  fontSize: '13px',
                  color: '#64748b',
                  background: '#f8fafc',
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
                {item.text}
            </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ============================================
           FLOATING DECORATIVE ELEMENTS
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
        
        .floating-icon {
          position: absolute;
          color: rgba(255, 255, 255, 0.15);
          animation: floatIcon 6s ease-in-out infinite;
        }
        
        .envelope-1 {
          top: 15%;
          left: 8%;
          animation-delay: 0s;
        }
        
        .envelope-2 {
          bottom: 20%;
          right: 10%;
          animation-delay: 2s;
        }
        
        .bell-1 {
          top: 25%;
          right: 12%;
          animation-delay: 1s;
        }
        
        .bell-2 {
          bottom: 30%;
          left: 12%;
          animation-delay: 3s;
        }
        
        @keyframes floatIcon {
          0%, 100% {
            transform: translateY(0) rotate(-5deg);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
            opacity: 0.25;
          }
        }
        
        /* Notification dots */
        .notification-dot {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #f59e0b;
          border-radius: 50%;
          animation: pulseDot 2s ease-in-out infinite;
        }
        
        .dot-1 {
          top: 20%;
          left: 20%;
          animation-delay: 0s;
        }
        
        .dot-2 {
          top: 35%;
          right: 18%;
          animation-delay: 0.7s;
          width: 8px;
          height: 8px;
        }
        
        .dot-3 {
          bottom: 25%;
          left: 15%;
          animation-delay: 1.4s;
          width: 10px;
          height: 10px;
        }
        
        @keyframes pulseDot {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.3;
          }
        }
        
        /* Gradient orbs */
        .deco-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
        }
        
        .orb-1 {
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          top: -100px;
          right: -50px;
        }
        
        .orb-2 {
          width: 250px;
          height: 250px;
          background: rgba(20, 184, 166, 0.3);
          bottom: -80px;
          left: -50px;
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
            rgba(255, 255, 255, 0.3),
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
          border: 3px solid rgba(13, 148, 136, 0.3);
          border-radius: 24px;
          animation: pulseRing 2s ease-out infinite;
        }
        
        @keyframes pulseRing {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
        
        /* Notification badge on icon */
        .icon-notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Figtree', 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
          animation: bounce 2s ease-in-out infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        /* Badge mobile positioning */
        .card-badge {
          position: static !important;
          margin: 0 auto 20px !important;
          width: fit-content;
        }
        
        /* Form row responsiveness */
        .form-row {
          flex-direction: column !important;
        }
        
        /* Input focus */
        .email-input:focus {
          outline: none;
          border-color: #0d9488 !important;
          box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1) !important;
        }
        
        /* Button hover */
        .submit-button:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.5) !important;
        }
        
        /* ============================================
           RESPONSIVE: TABLETS (641px+)
           ============================================ */
        @media (min-width: 641px) {
          .form-row {
            flex-direction: row !important;
          }
          
          .card-badge {
            position: absolute !important;
            top: 20px !important;
            right: 20px !important;
            margin: 0 !important;
          }
          
          .notification-preview {
            padding: 20px 24px !important;
          }
        }
        
        /* ============================================
           RESPONSIVE: DESKTOP (901px+)
           ============================================ */
        @media (min-width: 901px) {
          .floating-icon {
            display: block;
          }
          
          .notification-dot {
            display: block;
          }
        }
      `}</style>

      {/* Global styles for hover effects */}
      <style jsx global>{`
        .alerts-section .submit-button:hover .arrow-icon {
          animation: wiggle 0.5s ease-in-out;
        }
        
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        
        .alerts-section .email-input::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </section>
  );
};

export default JobAlertsCTA;
