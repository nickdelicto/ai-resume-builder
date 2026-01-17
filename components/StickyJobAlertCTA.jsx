import React, { useState, useEffect } from 'react';

/**
 * Sticky bottom CTA banner for job alert signups
 * Appears after user scrolls past the job title
 * Dismissible and remembers dismissal for 7 days
 */
export default function StickyJobAlertCTA({ specialty, location, jobTitle }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed this banner
    const dismissedUntil = localStorage.getItem('jobAlertCTADismissed');
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setIsDismissed(true);
      return;
    }

    // Show banner after user scrolls 400px (past job title/header)
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Remember dismissal for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('jobAlertCTADismissed', dismissUntil.toISOString());
  };

  const handleClick = () => {
    // Smooth scroll to the job alert form at the bottom
    const formElement = document.querySelector('[data-job-alert-form]');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Don't render if dismissed
  if (isDismissed) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Message */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-200 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <div className="min-w-0">
                {/* Mobile: simple message */}
                <p className="text-white text-sm font-medium sm:hidden">
                  Get job alerts <span className="text-teal-200">· Free</span>
                </p>
                {/* Tablet+: full message with specialty */}
                <p className="text-white text-base font-medium hidden sm:block truncate">
                  Get <span className="font-semibold">{specialty || 'RN'}</span> job alerts
                  {location && <span className="hidden lg:inline text-teal-200"> in {location}</span>}
                  <span className="text-teal-200"> · Weekly · Free</span>
                </p>
              </div>
            </div>

            {/* CTA Button + Dismiss */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleClick}
                className="bg-white text-teal-700 hover:bg-teal-50 font-semibold px-4 py-2 rounded-lg transition-all shadow-md text-sm whitespace-nowrap"
              >
                Subscribe Free
              </button>
              <button
                onClick={handleDismiss}
                className="text-teal-200 hover:text-white transition-colors p-1.5"
                aria-label="Dismiss"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

