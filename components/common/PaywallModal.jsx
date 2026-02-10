import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// ── Context ─────────────────────────────────────────────

const PaywallContext = createContext(null);

export const PaywallProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [trigger, setTrigger] = useState(null); // 'download' | 'resume_creation'

  const showPaywall = (triggerType) => {
    setTrigger(triggerType);
    setIsOpen(true);
  };

  const closePaywall = () => {
    setIsOpen(false);
    setTrigger(null);
  };

  return (
    <PaywallContext.Provider value={{ showPaywall }}>
      {children}
      <PaywallModal isOpen={isOpen} onClose={closePaywall} trigger={trigger} />
    </PaywallContext.Provider>
  );
};

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error('usePaywall must be used within a PaywallProvider');
  }
  return context;
};

// ── Trigger content config ──────────────────────────────

const TRIGGER_CONTENT = {
  download: {
    heading: "You've used your free download",
    subtext: 'Upgrade to Pro for unlimited PDF downloads. Create tailored resumes for every job application.'
  },
  resume_creation: {
    heading: "You've reached your resume limit",
    subtext: 'Free accounts include 5 resumes. Go Pro for unlimited resumes and downloads.'
  }
};

// ── Modal component ─────────────────────────────────────

function PaywallModal({ isOpen, onClose, trigger }) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = TRIGGER_CONTENT[trigger] || TRIGGER_CONTENT.download;

  const handleViewPlans = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <>
      <style jsx global>{`
        .paywall-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          z-index: 1000;
          padding: 0;
          transition: background-color 0.3s ease, backdrop-filter 0.3s ease;
          font-family: var(--font-figtree), 'Figtree', system-ui, -apple-system, sans-serif;
        }
        .paywall-overlay.paywall-visible {
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
        }
        .paywall-overlay:not(.paywall-visible) {
          background-color: rgba(15, 23, 42, 0);
          backdrop-filter: blur(0px);
        }

        .paywall-card {
          background-color: #fff;
          border-radius: 20px 20px 0 0;
          padding: 28px 24px 32px;
          width: 100%;
          max-width: 440px;
          max-height: 92vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.12);
          transform: translateY(100%);
          opacity: 0;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
          font-family: var(--font-figtree), 'Figtree', system-ui, -apple-system, sans-serif;
        }
        .paywall-card.paywall-visible {
          transform: translateY(0);
          opacity: 1;
        }

        /* Desktop: center the card, round all corners */
        @media (min-width: 640px) {
          .paywall-overlay {
            align-items: center;
            padding: 20px;
          }
          .paywall-card {
            border-radius: 20px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
          }
          .paywall-card:not(.paywall-visible) {
            transform: translateY(20px);
          }
        }
      `}</style>

      <div
        className={`paywall-overlay ${isVisible ? 'paywall-visible' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={`paywall-card ${isVisible ? 'paywall-visible' : ''}`}>
          {/* Drag handle (mobile affordance) */}
          <div style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: '#d1d5db',
            margin: '0 auto 20px'
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: '#94a3b8',
              lineHeight: 1
            }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Heading */}
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#0f172a',
            margin: '0 0 6px',
            lineHeight: '1.3'
          }}>
            {content.heading}
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: '0 0 24px',
            lineHeight: '1.5'
          }}>
            {content.subtext}
          </p>

          {/* Plan options — stacked vertically, tap-friendly */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {/* Monthly plan — best value */}
            <div style={{
              border: '2px solid #0d9488',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f0fdfa',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-9px',
                left: '14px',
                backgroundColor: '#0d9488',
                color: '#fff',
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 8px',
                borderRadius: '4px',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>
                Best value
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>
                  Monthly Pro
                </div>
                <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: '600', marginTop: '1px' }}>
                  Save 37%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>$19.99</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>/mo</span>
              </div>
            </div>

            {/* Weekly plan */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fff'
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>
                  Weekly Pro
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                  Cancel anytime
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>$7.99</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>/wk</span>
              </div>
            </div>
          </div>

          {/* What you get — compact single row */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            {['Unlimited downloads', 'Multiple resumes', 'All templates'].map((item) => (
              <span key={item} style={{
                fontSize: '12px',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </span>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleViewPlans}
            className="paywall-cta"
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#0d9488',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0f766e'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#0d9488'; }}
          >
            View Plans
          </button>

          {/* Dismiss */}
          <button
            onClick={onClose}
            style={{
              display: 'block',
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '12px 0 0'
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}

export default PaywallProvider;
