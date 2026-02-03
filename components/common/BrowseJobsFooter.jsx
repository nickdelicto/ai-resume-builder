import React, { useState } from 'react';
import Link from 'next/link';
import { useBrowseStats } from '../../lib/hooks/useBrowseStats';

/**
 * BrowseJobsFooter - Global site-wide browse section
 *
 * Displays above the main footer on all pages EXCEPT:
 * - Homepage (/)
 * - Builder pages (/builder/*, /new-resume-builder, /resume/edit/*)
 * - Auth pages (/auth/*)
 * - PDF capture page (/resume-template-capture)
 *
 * Uses SWR for efficient caching - data is fetched once per session
 */
const BrowseJobsFooter = () => {
  const { stats, isLoading } = useBrowseStats();
  const [expanded, setExpanded] = useState({
    states: false,
    specialties: false,
    employers: false,
  });

  if (isLoading || !stats) {
    return null; // Don't show loading state - just hide until ready
  }

  const toggleExpand = (section) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="browse-jobs-footer">
      <div className="browse-container">
        <h2 className="browse-title">
          Browse RN Jobs
          <span className="hiring-badge">(Hiring!)</span>
        </h2>

        {/* Featured Links */}
        <div className="featured-section">
          <Link
            href="/jobs/nursing/sign-on-bonus"
            className="featured-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              borderRadius: '12px',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.25s ease',
            }}
          >
            <span style={{ fontSize: '20px' }}>💰</span>
            <span>Sign-On Bonus RN Jobs</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '18px', height: '18px', flexShrink: 0 }}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
          <Link
            href="/jobs/nursing/remote"
            className="featured-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              color: 'white',
              borderRadius: '12px',
              fontFamily: "var(--font-figtree), 'Inter', sans-serif",
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
              transition: 'all 0.25s ease',
            }}
          >
            <span style={{ fontSize: '20px' }}>🏠</span>
            <span>Remote RN Jobs</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '18px', height: '18px', flexShrink: 0 }}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>

        {/* Browse Grid */}
        <div className="browse-grid">
          {/* By State */}
          <div className="browse-column">
            <h3 className="column-title">
              <span className="dot blue"></span>
              By State
            </h3>
            <ul className="link-list">
              {(expanded.states ? stats.states : stats.states?.slice(0, 6))?.map(
                (state) => (
                  <li key={state.code}>
                    <Link
                      href={`/jobs/nursing/${state.slug}`}
                      className="browse-link blue"
                    >
                      {state.fullName}
                    </Link>
                  </li>
                )
              )}
              {stats.states?.length > 6 && (
                <li>
                  <button
                    onClick={() => toggleExpand('states')}
                    className="expand-btn blue"
                  >
                    {expanded.states
                      ? 'Show less'
                      : `View all ${stats.states.length} states`}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`chevron ${expanded.states ? 'up' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* By Specialty */}
          <div className="browse-column">
            <h3 className="column-title">
              <span className="dot purple"></span>
              By Specialty
            </h3>
            <ul className="link-list">
              {(expanded.specialties
                ? stats.specialties
                : stats.specialties?.slice(0, 6)
              )?.map((specialty) => (
                <li key={specialty.slug}>
                  <Link
                    href={`/jobs/nursing/specialty/${specialty.slug}`}
                    className="browse-link purple"
                  >
                    {specialty.name}
                  </Link>
                </li>
              ))}
              {stats.specialties?.length > 6 && (
                <li>
                  <button
                    onClick={() => toggleExpand('specialties')}
                    className="expand-btn purple"
                  >
                    {expanded.specialties
                      ? 'Show less'
                      : `View all ${stats.specialties.length} specialties`}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`chevron ${expanded.specialties ? 'up' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* By Job Type */}
          <div className="browse-column">
            <h3 className="column-title">
              <span className="dot orange"></span>
              By Job Type
            </h3>
            <ul className="link-list">
              {stats.jobTypes?.map((jobType) => (
                <li key={jobType.slug}>
                  <Link
                    href={`/jobs/nursing/job-type/${jobType.slug}`}
                    className="browse-link orange"
                  >
                    {jobType.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* By Experience */}
          <div className="browse-column">
            <h3 className="column-title">
              <span className="dot teal"></span>
              By Experience
            </h3>
            <ul className="link-list">
              {stats.experienceLevels?.map((level) => (
                <li key={level.slug}>
                  <Link
                    href={`/jobs/nursing/experience/${level.slug}`}
                    className="browse-link teal"
                  >
                    {level.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* By Shift */}
          <div className="browse-column">
            <h3 className="column-title">
              <span className="dot indigo"></span>
              By Shift
            </h3>
            <ul className="link-list">
              {stats.shiftTypes?.map((shift) => (
                <li key={shift.slug}>
                  <Link
                    href={`/jobs/nursing/shift/${shift.slug}`}
                    className="browse-link indigo"
                  >
                    {shift.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* By Employer */}
          <div className="browse-column">
            <h3 className="column-title">
              <span className="dot green"></span>
              By Employer
            </h3>
            <ul className="link-list">
              {(expanded.employers
                ? stats.employers
                : stats.employers?.slice(0, 6)
              )?.map((employer) => (
                <li key={employer.slug}>
                  <Link
                    href={`/jobs/nursing/employer/${employer.slug}`}
                    className="browse-link green"
                  >
                    <span className="employer-name">{employer.name}</span>
                  </Link>
                </li>
              ))}
              {stats.employers?.length > 6 && (
                <li>
                  <button
                    onClick={() => toggleExpand('employers')}
                    className="expand-btn green"
                  >
                    {expanded.employers
                      ? 'Show less'
                      : `View all ${stats.employers.length} employers`}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`chevron ${expanded.employers ? 'up' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .browse-jobs-footer {
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border-top: 1px solid #e2e8f0;
          padding: 48px 24px;
        }

        .browse-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .browse-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 28px 0;
          text-align: center;
        }

        .hiring-badge {
          font-size: 1rem;
          font-weight: 600;
          color: #059669;
          font-style: italic;
        }

        /* Featured Section */
        .featured-section {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        /* Browse Grid */
        .browse-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px 32px;
        }

        @media (min-width: 640px) {
          .browse-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .browse-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        .browse-column {
          min-width: 0;
        }

        .column-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 14px 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dot.blue {
          background: #3b82f6;
        }
        .dot.purple {
          background: #a855f7;
        }
        .dot.orange {
          background: #f97316;
        }
        .dot.teal {
          background: #14b8a6;
        }
        .dot.indigo {
          background: #6366f1;
        }
        .dot.green {
          background: #22c55e;
        }

        /* Link List */
        .link-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .browse-link {
          display: block;
          padding: 6px 8px;
          border-radius: 6px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 13px;
          color: #4b5563;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .browse-link:hover {
          color: #1e293b;
        }

        .browse-link.blue:hover {
          background: #eff6ff;
          color: #2563eb;
        }
        .browse-link.purple:hover {
          background: #faf5ff;
          color: #9333ea;
        }
        .browse-link.orange:hover {
          background: #fff7ed;
          color: #ea580c;
        }
        .browse-link.teal:hover {
          background: #f0fdfa;
          color: #0d9488;
        }
        .browse-link.indigo:hover {
          background: #eef2ff;
          color: #4f46e5;
        }
        .browse-link.green:hover {
          background: #f0fdf4;
          color: #16a34a;
        }

        .employer-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: block;
        }

        /* Expand Button */
        .expand-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 8px;
          background: none;
          border: none;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .expand-btn.blue {
          color: #3b82f6;
        }
        .expand-btn.blue:hover {
          color: #2563eb;
        }
        .expand-btn.purple {
          color: #a855f7;
        }
        .expand-btn.purple:hover {
          color: #9333ea;
        }
        .expand-btn.green {
          color: #22c55e;
        }
        .expand-btn.green:hover {
          color: #16a34a;
        }

        .chevron {
          width: 14px;
          height: 14px;
          transition: transform 0.2s ease;
        }

        .chevron.up {
          transform: rotate(180deg);
        }

        /* Responsive */
        @media (max-width: 639px) {
          .browse-jobs-footer {
            padding: 32px 16px;
          }

          .browse-title {
            font-size: 1.25rem;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default BrowseJobsFooter;
