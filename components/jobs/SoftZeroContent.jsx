import React from 'react';
import Link from 'next/link';

/**
 * SoftZeroContent - Rich empty state for job pages with 0 active jobs
 *
 * Instead of a bare "no jobs found" message, shows:
 * 1. Friendly hero message with search icon
 * 2. Context-aware "peel back" navigation links (remove one filter at a time)
 * 3. Pairs with JobAlertSignup (rendered separately by parent)
 *
 * Usage:
 *   <SoftZeroContent
 *     title="No Full-Time ICU RN Jobs in Cleveland Right Now"
 *     description="Full-Time ICU positions in Cleveland are updated daily."
 *     alternatives={[
 *       { label: 'View All ICU Jobs in Cleveland', href: '/jobs/nursing/oh/cleveland/icu' },
 *       { label: 'View All Jobs in Cleveland', href: '/jobs/nursing/oh/cleveland' },
 *       { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
 *     ]}
 *   />
 */
const SoftZeroContent = ({ title, description, alternatives }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 sm:p-10 text-center mb-8">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        {title}
      </h2>
      <p className="text-gray-600 text-lg max-w-xl mx-auto mb-6">
        {description || 'Positions are updated daily. New openings appear as hospitals post them.'}{' '}
        <a href="#job-alert-form" className="text-blue-600 hover:text-blue-800 underline font-medium">
          Sign up for alerts
        </a>{' '}
        to be first to know.
      </p>
      {alternatives && alternatives.length > 0 && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
          {alternatives.map((alt, idx) => (
            <Link
              key={idx}
              href={alt.href}
              className={`inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                idx === 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {alt.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoftZeroContent;
