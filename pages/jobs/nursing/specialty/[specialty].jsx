import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../../lib/utils/jobCardUtils';
import JobAlertSignup from '../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../components/StickyJobAlertCTA';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../lib/seo/jobSEO');
const { getStateFullName } = require('../../../../lib/jobScraperUtils');
const { fetchSpecialtyJobs } = require('../../../../lib/services/jobPageData');
const { specialtyToSlug } = require('../../../../lib/constants/specialties');
const { jobTypeToSlug, jobTypeToDisplay } = require('../../../../lib/constants/jobTypes');
const { getEmployerLogoPath } = require('../../../../lib/utils/employerLogos');
const { getSalaryText } = require('../../../../lib/utils/seoTextUtils');

// Redirect map for old specialty slugs → new canonical slugs
const SPECIALTY_REDIRECTS = {
  'step-down': 'stepdown',
  'l-d': 'labor-delivery',
  'psychiatric': 'mental-health',
  'rehab': 'rehabilitation',
  'cardiac-care': 'cardiac',
  'progressive-care': 'stepdown',
  'home-care': 'home-health',
};

/**
 * Server-Side Rendering: Fetch data before rendering
 */
export async function getServerSideProps({ params, query }) {
  const { specialty } = params;
  const page = query.page || '1';

  // Check for old specialty slugs that need 301 redirect
  const redirectTo = SPECIALTY_REDIRECTS[specialty.toLowerCase()];
  if (redirectTo) {
    const destination = page !== '1'
      ? `/jobs/nursing/specialty/${redirectTo}?page=${page}`
      : `/jobs/nursing/specialty/${redirectTo}`;
    return {
      redirect: {
        destination,
        permanent: true, // 301 redirect for SEO
      },
    };
  }

  try {
    const result = await fetchSpecialtyJobs(specialty, page);

    if (!result) {
      return {
        notFound: true
      };
    }

    return {
      props: {
        specialtyName: result.specialty,
        jobs: result.jobs,
        pagination: result.pagination,
        maxHourlyRate: result.maxHourlyRate,
        stats: result.statistics
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      notFound: true
    };
  }
}

export default function SpecialtyJobPage({
  specialtyName,
  jobs = [],
  pagination = null,
  maxHourlyRate,
  stats = null
}) {
  const router = useRouter();
  const { specialty } = router.query || {};

  // Handle page change
  const handlePageChange = (newPage) => {
    router.push(`/jobs/nursing/specialty/${specialty}?page=${newPage}`);
  };

  const specialtyDisplayName = specialtyName || specialty?.replace(/-/g, ' ') || '';

  // Generate SEO meta tags
  const salaryText = getSalaryText(maxHourlyRate, specialtyDisplayName);
  const jobCountText = pagination?.total ? `${pagination.total} ` : '';
  const seoMeta = {
    title: `${jobCountText}${specialtyDisplayName} RN Jobs${salaryText}`,
    description: `Find ${pagination?.total || 0} ${specialtyDisplayName} Registered Nurse jobs nationwide. Browse positions at top healthcare employers and apply today!`,
    keywords: `${specialtyDisplayName.toLowerCase()} rn jobs, ${specialtyDisplayName.toLowerCase()} nursing jobs, registered nurse ${specialtyDisplayName.toLowerCase()}`,
    canonicalUrl: `https://intelliresume.net/jobs/nursing/specialty/${specialty?.toLowerCase() || ''}`,
    ogImage: 'https://intelliresume.net/og-image-jobs.png'
  };

  // Error state (no jobs found)
  if (jobs.length === 0 && !pagination) {
    return (
      <>
        <Head>
          <title>Error | IntelliResume Health</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Jobs Found</h1>
            <p className="text-gray-600 mb-6">No jobs found for this specialty.</p>
            <Link
              href="/jobs/nursing"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={seoMeta.canonicalUrl} key="canonical" />
        
        {/* Robots - INDEX THIS PAGE */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:image" content={seoMeta.ogImage} />
        <meta property="og:site_name" content="IntelliResume Health" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={seoMeta.canonicalUrl} />
        <meta name="twitter:title" content={seoMeta.title} />
        <meta name="twitter:description" content={seoMeta.description} />
        <meta name="twitter:image" content={seoMeta.ogImage} />
        
        {/* CollectionPage Schema - CRITICAL for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": seoMeta.title,
              "description": seoMeta.description,
              "url": seoMeta.canonicalUrl,
              "numberOfItems": pagination?.total || 0,
              "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": pagination?.total || 0,
                "itemListElement": jobs.slice(0, 10).map((jobItem, index) => {
                  // Generate complete JobPosting schema for each job
                  // This includes all required fields: title, description, hiringOrganization, 
                  // jobLocation, datePosted, employmentType, validThrough, etc.
                  const jobPostingSchema = seoUtils.generateJobPostingSchema(jobItem);
                  
                  // Only include if schema was generated successfully
                  if (!jobPostingSchema) return null;
                  
                  return {
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": jobPostingSchema  // Complete schema with all required fields
                  };
                }).filter(Boolean)  // Remove any null entries
              }
            })
          }}
        />
        
        {/* BreadcrumbList Schema for better navigation */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://intelliresume.net"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "RN Jobs",
                  "item": "https://intelliresume.net/jobs/nursing"
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": specialtyDisplayName,
                  "item": seoMeta.canonicalUrl
                }
              ]
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{specialtyDisplayName}</span>
          </nav>

          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {specialtyDisplayName} RN Jobs
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {pagination?.total > 0 ? (
                <>
                  Find <strong>{pagination.total}</strong> {specialtyDisplayName} Registered Nurse job{pagination.total === 1 ? '' : 's'} available
                  {stats?.states && stats.states.length > 0 ? (
                    <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}</>
                  ) : null}
                  . Browse {specialtyDisplayName.toLowerCase()} nursing positions at top healthcare employers
                  {stats?.employers && stats.employers.length > 0 ? (
                    <> including {stats.employers.slice(0, 3).map(e => e.employer?.name || 'Employer').join(', ')}{stats.employers.length > 3 ? ` and ${stats.employers.length - 3} more` : ''}</>
                  ) : null}
                  . Apply today!
                </>
              ) : (
                <>Find {specialtyDisplayName} Registered Nurse positions nationwide. Browse {specialtyDisplayName.toLowerCase()} nursing jobs at top healthcare employers. Apply today!</>
              )}
            </p>
            {pagination && pagination.total > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{pagination.total} {pagination.total === 1 ? 'job' : 'jobs'} available</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Top States - links to specialty for that state */}
              {stats.states && stats.states.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top States</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.states.slice(0, 5).map((stateData, idx) => {
                      const stateFullName = getStateFullName(stateData.state);
                      const stateDisplay = stateFullName || stateData.state;
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stateData.state.toLowerCase()}/${specialty}`}
                          className="flex justify-between items-center group hover:text-blue-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-blue-600 font-medium">{stateDisplay}</span>
                          <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{stateData.count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Top Employers - links to employer+specialty */}
              {stats.employers && stats.employers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Employers</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.employers.slice(0, 5).map((emp, idx) => {
                      const employerSlug = emp.employer?.slug;
                      return employerSlug ? (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/employer/${employerSlug}/${specialty}`}
                          className="flex justify-between items-center group hover:text-orange-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-orange-600 font-medium">{emp.employer?.name || 'Unknown'}</span>
                          <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                        </Link>
                      ) : (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-1"
                        >
                          <span className="text-gray-900 font-medium">{emp.employer?.name || 'Unknown'}</span>
                          <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Job Types - links to specialty+jobtype */}
              {stats.jobTypes && stats.jobTypes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Types</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.jobTypes.slice(0, 5).map((jt, idx) => {
                      const jtSlug = jobTypeToSlug(jt.jobType);
                      const jtDisplay = jobTypeToDisplay(jt.jobType) || jt.jobType;
                      return jtSlug ? (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/specialty/${specialty}/${jtSlug}`}
                          className="flex justify-between items-center group hover:text-purple-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-purple-600 font-medium">{jtDisplay}</span>
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{jt.count}</span>
                        </Link>
                      ) : (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-1"
                        >
                          <span className="text-gray-900 font-medium">{jt.jobType}</span>
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{jt.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Job Listings */}
          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-16 text-center border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No {specialtyDisplayName} jobs found</h3>
              <Link href="/jobs/nursing" className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Browse All Jobs
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8">
                {jobs.map((jobItem, index) => (
                  <React.Fragment key={jobItem.id}>
                    <Link
                      href={`/jobs/nursing/${jobItem.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 flex gap-4">
                        {/* Employer logo on left */}
                        {jobItem.employer && getEmployerLogoPath(jobItem.employer.slug) && (
                          <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                            <img
                              src={getEmployerLogoPath(jobItem.employer.slug)}
                              alt={`${jobItem.employer.name} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}

                        {/* Job content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1.5 line-clamp-2">
                            {jobItem.title}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {jobItem.city}, {jobItem.state}
                            </span>
                            {jobItem.employer && (
                              <span className="text-gray-500">• {jobItem.employer.name}</span>
                            )}
                            {formatPayForCard(jobItem.salaryMin, jobItem.salaryMax, jobItem.salaryType, jobItem.jobType) && (
                              <span className="text-green-700 font-medium">
                                • {formatPayForCard(jobItem.salaryMin, jobItem.salaryMax, jobItem.salaryType, jobItem.jobType)}
                              </span>
                            )}
                          </div>
                          {/* Tags: Job Type, Experience Level */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {jobItem.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {jobItem.jobType === 'prn' ? 'PRN' : jobItem.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                              </span>
                            )}
                            {jobItem.shiftType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                                {jobItem.shiftType}
                              </span>
                            )}
                            {jobItem.experienceLevel && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
                                {jobItem.experienceLevel.replace('-', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    {/* Job Alert Signup after every 5 listings */}
                    {(index + 1) % 5 === 0 && index < jobs.length - 1 && (
                      <div className="my-6">
                        <JobAlertSignup 
                          specialty={specialtyDisplayName}
                          compact={true}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-8">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Salary Banner - Link to nationwide specialty salary page (Gold/Amber theme to differentiate from teal job alerts) */}
              <div className="mt-12 mb-8">
                <Link
                  href={`/jobs/nursing/specialty/${specialtyToSlug(specialtyDisplayName)}/salary`}
                  className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-md hover:shadow-xl hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg shadow-sm group-hover:from-amber-500 group-hover:to-yellow-600 transition-all flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-amber-200 text-amber-800 rounded-full mb-1">💰 Salary Data</span>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                        Average {specialtyDisplayName} RN Salary Nationwide
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">View nationwide salary ranges and employer breakdowns</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-2 text-amber-600 group-hover:text-amber-700 transition-colors font-semibold bg-amber-100 sm:bg-transparent px-4 py-2 sm:p-0 rounded-lg">
                    <span>View Salaries</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Link>
              </div>
            </>
          )}

          {/* Browse RN Jobs by Specialty Section - Shows all specialties for navigation */}
          {stats?.allSpecialties && stats.allSpecialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse RN Jobs by Specialty</h2>
                <p className="text-gray-600">Find Registered Nurse positions across {stats.allSpecialties.length} {stats.allSpecialties.length === 1 ? 'specialty' : 'specialties'}</p>
              </div>
              {/* Multi-column layout for specialties - more compact than grid */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.allSpecialties.map((specData, idx) => {
                    const specSlug = specData.specialty.toLowerCase().replace(/\s+/g, '-');

                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/specialty/${specSlug}`}
                        className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-purple-600 transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-purple-600 font-medium text-sm">{specData.specialty}</span>
                        <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{specData.count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Browse by Job Type Section */}
          {stats?.jobTypes && stats.jobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Browse {specialtyDisplayName} RN Jobs by Job Type
                </h2>
                <p className="text-gray-600">
                  Find {specialtyDisplayName.toLowerCase()} RN positions by employment type
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.jobTypes.map((jt, idx) => {
                    // Normalize job type for display and URL
                    const jobTypeValue = jt.jobType;
                    let displayName = jobTypeValue;
                    let jobTypeUrlSlug = jobTypeValue.toLowerCase().replace(/\s+/g, '-');

                    // PRN/Per Diem normalization
                    if (jobTypeValue.toLowerCase() === 'prn' || jobTypeValue.toLowerCase() === 'per diem') {
                      displayName = 'PRN';
                      jobTypeUrlSlug = 'per-diem';
                    } else {
                      // Title case
                      displayName = jobTypeValue.replace(/-/g, ' ').split(' ').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ');
                    }

                    const specSlug = specialtyToSlug(specialtyDisplayName);

                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/specialty/${specSlug}/${jobTypeUrlSlug}`}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-orange-50 rounded-lg group transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-orange-600 font-medium">{displayName}</span>
                        <span className="text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded-full text-xs">{jt.count.toLocaleString()}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" data-job-alert-form>
            <JobAlertSignup 
              specialty={specialtyDisplayName}
            />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA 
            specialty={specialtyDisplayName}
            location=""
          />
        </div>
      </div>
    </>
  );
}

