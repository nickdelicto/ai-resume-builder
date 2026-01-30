import React, { useState, useEffect } from 'react';

/**
 * Sticky bottom Apply button for job detail pages
 * Appears after user scrolls past the job header
 * Cannot be dismissed - always visible when scrolled
 * Mobile: Full-width button only (no job title to minimize noise)
 * Desktop: Shows job title + button
 */
export default function StickyApplyButton({ jobTitle, employer, onApplyClick }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show button after user scrolls 400px (past job title/header)
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Check initial scroll position
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-2xl border-t border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          {/* Mobile: Centered full-width button only */}
          <div className="sm:hidden">
            <button
              onClick={onApplyClick}
              className="group relative w-full bg-white text-blue-700 hover:bg-blue-50 font-bold px-6 py-3 rounded-lg transition-all shadow-lg text-base flex items-center justify-center gap-2 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-blue-100/50 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></span>
              <span className="relative z-10 flex items-center gap-2">
                Apply to This Job
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
            </button>
          </div>

          {/* Desktop: Job info + button */}
          <div className="hidden sm:flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 bg-blue-500/30 rounded-lg flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-100" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {jobTitle || 'RN Position'}
                  {employer && <span className="text-blue-200 hidden md:inline"> at {employer}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center flex-shrink-0">
              <button
                onClick={onApplyClick}
                className="group relative bg-white text-blue-700 hover:bg-blue-50 font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg text-sm whitespace-nowrap flex items-center gap-2 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-blue-100/50 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></span>
                <span className="relative z-10 flex items-center gap-2">
                  Apply Now
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
