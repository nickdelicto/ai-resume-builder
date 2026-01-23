import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * BrowseByCategory - Quick browse links for SEO pages
 *
 * Displays clickable cards and pills for:
 * - Featured (Sign-On Bonus, New Grad)
 * - Specialties (ICU, ER, Med-Surg, etc.)
 * - Job Types (Full Time, PRN, Travel, etc.)
 * - Experience Levels (New Grad, Experienced, Leadership)
 * - Shift Types (Day, Night, Rotating)
 *
 * Each link goes to dedicated SEO-optimized pages
 */
const BrowseByCategory = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMoreSpecialties, setShowMoreSpecialties] = useState(false);

  // Fetch browse stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/jobs/browse-stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching browse stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  // Experience level icons (counts come from API)
  const experienceIcons = {
    'new-grad': '🎓',
    'experienced': '⭐',
    'leadership': '👑'
  };

  // Map shift slugs to icons (API already returns name and slug)
  const shiftIcons = {
    'day-shift': '☀️',
    'night-shift': '🌙',
    'rotating-shift': '🔄',
    'evening-shift': '🌆',
    'variable-shift': '📅'
  };

  // Loading skeleton
  if (loading) {
    return (
      <section className="browse-section">
        <div className="browse-content">
          <div className="loading-container">
            <div className="loading-title"></div>
            <div className="loading-cards">
              <div className="loading-card"></div>
              <div className="loading-card"></div>
            </div>
          </div>
        </div>
        <style jsx>{`
          .browse-section {
            background: linear-gradient(180deg, #fefce8 0%, #fef9c3 100%);
            padding: 50px 16px 60px;
          }
          .browse-content {
            max-width: 900px;
            margin: 0 auto;
          }
          .loading-container {
            text-align: center;
          }
          .loading-title {
            width: 200px;
            height: 36px;
            margin: 0 auto 24px;
            background: linear-gradient(90deg, #fef08a 25%, #fde047 50%, #fef08a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
          }
          .loading-cards {
            display: flex;
            gap: 16px;
            justify-content: center;
          }
          .loading-card {
            width: 200px;
            height: 60px;
            background: linear-gradient(90deg, #fef08a 25%, #fde047 50%, #fef08a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 12px;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </section>
    );
  }

  if (!stats) return null;

  // Get top specialties (show 10 initially)
  const topSpecialties = stats.specialties?.slice(0, showMoreSpecialties ? 20 : 10) || [];
  const remainingSpecialties = (stats.specialties?.length || 0) - 10;

  // Get job types
  const jobTypes = stats.jobTypes?.slice(0, 5) || [];

  // Process shifts - API already returns formatted name/slug, just add icons
  const processedShifts = (stats.shiftTypes || []).map(shift => ({
    ...shift,
    icon: shiftIcons[shift.slug] || '⏰'
  }));

  // Process experience levels - API returns counts, we add icons
  const processedExperienceLevels = (stats.experienceLevels || []).map(level => ({
    ...level,
    icon: experienceIcons[level.slug] || '⭐'
  }));

  return (
    <section className="browse-section">
      <div className="browse-content">
        {/* Header */}
        <div className="section-header">
          <h2 className="section-title">
            <svg className="title-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            Find Nursing Jobs Quickly
          </h2>
          <p className="section-subtitle">Jump straight to the jobs you want</p>
        </div>

        {/* Featured Pills */}
        <div className="featured-pills">
          <Link href="/jobs/nursing/sign-on-bonus" className="pill green-pill">
            <span className="pill-emoji">💰</span>
            <span className="pill-text">Sign-On Bonus RN Jobs</span>
          </Link>
          <Link href="/jobs/nursing/experience/new-grad" className="pill blue-pill">
            <span className="pill-emoji">🎓</span>
            <span className="pill-text">New Grad RN Jobs</span>
          </Link>
        </div>

        {/* By Specialty */}
        <div className="category-section">
          <h3 className="category-label">
            <span className="label-dot purple"></span>
            By Specialty
          </h3>
          <div className="pills-container">
            {topSpecialties.map((spec) => (
              <Link key={spec.slug} href={`/jobs/nursing/specialty/${spec.slug}`} className="pill purple">
                <span className="pill-text">{spec.name}</span>
                <span className="pill-count purple">{formatNumber(spec.count)}</span>
              </Link>
            ))}
            {remainingSpecialties > 0 && (
              <button
                className="more-btn"
                onClick={() => setShowMoreSpecialties(!showMoreSpecialties)}
              >
                {showMoreSpecialties ? 'Show Less' : `+${remainingSpecialties} More`}
              </button>
            )}
          </div>
        </div>

        {/* By Job Type */}
        <div className="category-section">
          <h3 className="category-label">
            <span className="label-dot orange"></span>
            By Job Type
          </h3>
          <div className="pills-container">
            {jobTypes.map((type) => (
              <Link key={type.slug} href={`/jobs/nursing/job-type/${type.slug}`} className="pill orange">
                <span className="pill-text">{type.name}</span>
                <span className="pill-count orange">{formatNumber(type.count)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* By Experience */}
        {processedExperienceLevels.length > 0 && (
          <div className="category-section">
            <h3 className="category-label">
              <span className="label-dot blue"></span>
              By Experience
            </h3>
            <div className="pills-container">
              {processedExperienceLevels.map((level) => (
                <Link key={level.slug} href={`/jobs/nursing/experience/${level.slug}`} className="pill blue">
                  <span className="pill-emoji">{level.icon}</span>
                  <span className="pill-text">{level.name}</span>
                  <span className="pill-count blue">{formatNumber(level.count)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* By Shift */}
        {processedShifts.length > 0 && (
          <div className="category-section">
            <h3 className="category-label">
              <span className="label-dot indigo"></span>
              By Shift
            </h3>
            <div className="pills-container">
              {processedShifts.map((shift) => (
                <Link key={shift.slug} href={`/jobs/nursing/shift/${shift.slug}`} className="pill indigo">
                  <span className="pill-emoji">{shift.icon}</span>
                  <span className="pill-text">{shift.name}</span>
                  <span className="pill-count indigo">{formatNumber(shift.count)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .browse-section {
          background: linear-gradient(180deg, #fefce8 0%, #fef9c3 100%);
          padding: 50px 16px 60px;
          position: relative;
        }

        .browse-content {
          max-width: 900px;
          margin: 0 auto;
        }

        /* Header */
        .section-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .section-title {
          font-family: var(--font-figtree), 'Inter', -apple-system, sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .title-icon {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .section-subtitle {
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 1.15rem;
          color: #374151;
          margin: 0;
          line-height: 1.7;
        }

        /* Featured Pills */
        .featured-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 24px;
          justify-content: center;
        }

        /* Category Sections */
        .category-section {
          margin-bottom: 24px;
        }

        .category-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
        }

        .label-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .label-dot.purple { background: #a855f7; }
        .label-dot.orange { background: #f97316; }
        .label-dot.blue { background: #3b82f6; }
        .label-dot.indigo { background: #6366f1; }

        /* Pills Container */
        .pills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        /* More Button */
        .more-btn {
          display: inline-flex;
          align-items: center;
          padding: 10px 16px;
          background: transparent;
          border: 2px dashed #cbd5e1;
          border-radius: 50px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .more-btn:hover {
          border-color: #94a3b8;
          background: rgba(148, 163, 184, 0.1);
          color: #475569;
        }

        /* Responsive */
        @media (min-width: 481px) {
          .browse-section {
            padding: 55px 24px 65px;
          }

          .section-title {
            font-size: 2.6rem;
            gap: 14px;
          }

          .title-icon {
            width: 32px;
            height: 32px;
          }
        }

        @media (min-width: 641px) {
          .browse-section {
            padding: 60px 24px 70px;
          }

          .section-title {
            font-size: 2.8rem;
          }

          .section-subtitle {
            font-size: 1.2rem;
          }
        }

        @media (min-width: 901px) {
          .section-title {
            font-size: 3rem;
          }

          .pills-container {
            gap: 12px;
          }
        }
      `}</style>

      {/* Global styles for Link components (styled-jsx doesn't scope to Link children) */}
      <style jsx global>{`
        /* Pills - used on Link components */
        .browse-section .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 50px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .browse-section .pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        }

        .browse-section .pill.purple:hover {
          border-color: #a855f7;
          background: #faf5ff;
        }

        .browse-section .pill.orange:hover {
          border-color: #f97316;
          background: #fff7ed;
        }

        .browse-section .pill.blue:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .browse-section .pill.indigo:hover {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .browse-section .pill-emoji {
          font-size: 16px;
        }

        .browse-section .pill-text {
          font-weight: 600;
          color: #334155;
        }

        .browse-section .pill-count {
          font-size: 12px;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 20px;
          color: white;
        }

        .browse-section .pill-count.purple { background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); }
        .browse-section .pill-count.orange { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
        .browse-section .pill-count.blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .browse-section .pill-count.indigo { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }

        /* Colored featured pills */
        .browse-section .pill.green-pill {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: transparent;
          color: white;
        }

        .browse-section .pill.green-pill .pill-text {
          color: white;
        }

        .browse-section .pill.green-pill:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        .browse-section .pill.blue-pill {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: transparent;
          color: white;
        }

        .browse-section .pill.blue-pill .pill-text {
          color: white;
        }

        .browse-section .pill.blue-pill:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        }

        /* Responsive for Link styles */
        @media (min-width: 901px) {
          .browse-section .pill {
            padding: 12px 18px;
          }
        }
      `}</style>
    </section>
  );
};

export default BrowseByCategory;
