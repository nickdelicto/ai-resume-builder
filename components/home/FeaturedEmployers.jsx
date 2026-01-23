import React, { useMemo } from 'react';
import Link from 'next/link';
import { getEmployerLogoPath, hasEmployerLogo } from '../../lib/utils/employerLogos';
import { useBrowseStats } from '../../lib/hooks/useBrowseStats';

/**
 * FeaturedEmployers - Shows top healthcare employers hiring RNs
 *
 * REDESIGN v9.0 - Premium Logo Marquee:
 * - Smooth infinite scrolling animation
 * - Large, prominent logos
 * - Professional gradient background
 * - Elegant hover interactions
 * - Premium CTA button
 *
 * Uses SWR for data fetching with optional SSR fallback
 */
const FeaturedEmployers = ({ initialStats }) => {
  // Use SWR hook with optional SSR fallback
  const { stats, isLoading: loading } = useBrowseStats({ fallbackData: initialStats });

  // Process employers - prioritize those with logos
  const employers = useMemo(() => {
    if (!stats?.employers) return [];
    const employersWithLogos = stats.employers.filter(emp => hasEmployerLogo(emp.slug));
    const topWithoutLogos = stats.employers
      .filter(emp => !hasEmployerLogo(emp.slug))
      .slice(0, 3);
    return [...employersWithLogos, ...topWithoutLogos];
  }, [stats]);

  const formatNumber = (num) => num.toLocaleString();

  const getEmployerInitials = (name) => {
    const words = name.split(' ').filter(w =>
      !['of', 'the', 'and', '&', 'at', 'for'].includes(w.toLowerCase())
    );
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <section className="employers-section">
        <div className="loading-placeholder">
          <div className="loading-bar"></div>
        </div>
        <style jsx>{`
          .employers-section {
            background: linear-gradient(180deg, #fffbf5 0%, #fef7ed 100%);
            padding: 80px 24px;
          }
          .loading-placeholder {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 0;
          }
          .loading-bar {
            height: 80px;
            background: linear-gradient(90deg, #fef3c7 25%, #fde68a 50%, #fef3c7 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 16px;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </section>
    );
  }

  // Triple the array for smoother infinite scroll
  const marqueeEmployers = [...employers, ...employers, ...employers];

  return (
    <section className="employers-section">
      {/* Background decoration */}
      <div className="bg-decoration"></div>

      <div className="content-wrapper">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-wrapper">
            <span className="section-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              Featured Employers
            </span>
          </div>
          <h2 className="section-title">
            Top Nurse Employers in the US
          </h2>
          <p className="section-subtitle">
             Find nursing opportunities at leading hospitals & health systems actively hiring
          </p>
        </div>

        {/* Marquee Container */}
        <div className="marquee-wrapper">
          <div className="marquee-fade left"></div>
          <div className="marquee-fade right"></div>

          <div className="marquee-track">
            {marqueeEmployers.map((employer, index) => (
              <Link
                key={`${employer.slug}-${index}`}
                href={`/jobs/nursing/employer/${employer.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="employer-card">
                  <div className="logo-container">
                    {hasEmployerLogo(employer.slug) ? (
                      <img
                        src={getEmployerLogoPath(employer.slug)}
                        alt={employer.name}
                        className="employer-logo"
                      />
                    ) : (
                      <div className="initials-badge">
                        {getEmployerInitials(employer.name)}
                      </div>
                    )}
                  </div>
                  <div className="employer-meta">
                    <span className="job-count">{formatNumber(employer.count)} open positions</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="cta-wrapper">
          <Link
            href="/jobs/nursing#browse-employers"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              background: '#0f172a',
              color: 'white',
              fontFamily: 'var(--font-figtree), Inter, sans-serif',
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
              transition: 'all 0.25s ease'
            }}
          >
            View All Employers
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>

      <style jsx>{`
        /* ============================================
           SECTION BASE
           ============================================ */
        .employers-section {
          position: relative;
          background: linear-gradient(180deg, #fffbf5 0%, #fef7ed 100%);
          padding: 90px 24px 100px;
          overflow: hidden;
        }

        .bg-decoration {
          position: absolute;
          top: -30%;
          right: -15%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(251, 146, 60, 0.05) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .content-wrapper {
          position: relative;
          max-width: 1400px;
          margin: 0 auto;
          z-index: 1;
        }

        /* ============================================
           SECTION HEADER
           ============================================ */
        .section-header {
          text-align: center;
          margin-bottom: 56px;
        }

        .badge-wrapper {
          margin-bottom: 20px;
        }

        .section-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          padding: 10px 20px;
          border-radius: 30px;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
        }

        .section-title {
          font-family: var(--font-figtree), 'Inter', -apple-system, sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: #064e3b;
          margin: 0 0 16px 0;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 1.15rem;
          color: #374151;
          margin: 0 auto;
          line-height: 1.7;
          max-width: 550px;
        }

        /* ============================================
           MARQUEE
           ============================================ */
        .marquee-wrapper {
          position: relative;
          width: 100%;
          overflow: hidden;
          margin-bottom: 56px;
          padding: 24px 0;
        }

        .marquee-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 120px;
          z-index: 10;
          pointer-events: none;
        }

        .marquee-fade.left {
          left: 0;
          background: linear-gradient(90deg, #fffbf5 0%, transparent 100%);
        }

        .marquee-fade.right {
          right: 0;
          background: linear-gradient(270deg, #fef7ed 0%, transparent 100%);
        }

        .marquee-track {
          display: flex;
          gap: 40px;
          animation: scroll 50s linear infinite;
          width: max-content;
        }

        .marquee-wrapper:hover .marquee-track {
          animation-play-state: paused;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        /* ============================================
           EMPLOYER CARDS
           ============================================ */
        .employer-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          padding: 28px 36px;
          background: white;
          border-radius: 20px;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(16, 185, 129, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 200px;
        }

        .employer-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(5, 150, 105, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .logo-container {
          width: 180px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .employer-logo {
          max-width: 180px;
          max-height: 80px;
          width: auto;
          height: auto;
          object-fit: contain;
          transition: all 0.3s ease;
          filter: saturate(0.9);
        }

        .employer-card:hover .employer-logo {
          filter: saturate(1.1);
          transform: scale(1.05);
        }

        .initials-badge {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border-radius: 16px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: #047857;
          letter-spacing: 1px;
        }

        .employer-meta {
          text-align: center;
        }

        .job-count {
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #059669;
          background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
          padding: 8px 16px;
          border-radius: 20px;
          display: inline-block;
        }

        /* ============================================
           CTA SECTION
           ============================================ */
        .cta-wrapper {
          text-align: center;
        }

        /* ============================================
           RESPONSIVE
           ============================================ */
        @media (min-width: 641px) {
          .employers-section {
            padding: 110px 40px 120px;
          }

          .section-title {
            font-size: 2.8rem;
          }

          .marquee-fade {
            width: 180px;
          }

          .employer-card {
            padding: 32px 44px;
            min-width: 240px;
          }

          .logo-container {
            width: 200px;
            height: 90px;
          }

          .employer-logo {
            max-width: 200px;
            max-height: 90px;
          }
        }

        @media (min-width: 901px) {
          .employers-section {
            padding: 120px 48px 130px;
          }

          .section-title {
            font-size: 3rem;
          }

          .section-subtitle {
            font-size: 1.2rem;
          }

          .marquee-wrapper {
            margin-bottom: 64px;
          }

          .employer-card {
            padding: 36px 48px;
            min-width: 260px;
          }

          .logo-container {
            width: 220px;
            height: 100px;
          }

          .employer-logo {
            max-width: 220px;
            max-height: 100px;
          }
        }

        @media (min-width: 1200px) {
          .marquee-fade {
            width: 200px;
          }

          .bg-decoration {
            width: 800px;
            height: 800px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
};

export default FeaturedEmployers;
