import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import JobAlertSignup from '../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../components/StickyJobAlertCTA';
import { formatPayForCard } from '../../../../../lib/utils/jobCardUtils';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../../lib/seo/jobSEO');
const { getStateFullName, normalizeCity } = require('../../../../../lib/jobScraperUtils');
const { detectStateFromSlug, fetchCitySpecialtyJobs, fetchStateSpecialtyJobTypeJobs } = require('../../../../../lib/services/jobPageData');
const { isValidSpecialtySlug, slugToSpecialty, specialtyToSlug } = require('../../../../../lib/constants/specialties');
const { isJobType, jobTypeToDisplay, jobTypeToSlug } = require('../../../../../lib/constants/jobTypes');
const { normalizeExperienceLevel } = require('../../../../../lib/utils/experienceLevelUtils');
const { getEmployerLogoPath } = require('../../../../../lib/utils/employerLogos');
const { getSalaryText } = require('../../../../../lib/utils/seoTextUtils');
const { getCityDisplayName } = require('../../../../../lib/utils/cityDisplayUtils');

// Map old specialty slugs to new canonical slugs for 301 redirects
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
 * This page handles TWO page types:
 * 1. City + Specialty: /jobs/nursing/ohio/cleveland/icu
 * 2. State + Specialty + Job Type: /jobs/nursing/ohio/icu/full-time
 */
export async function getServerSideProps({ params, query }) {
  const { slug, cityOrSpecialty, specialty } = params;
  const page = query.page || '1';

  try {
    // Validate that slug is a valid state
    const stateInfo = detectStateFromSlug(slug);

    if (!stateInfo) {
      return {
        notFound: true
      };
    }

    // DETECTION: Is this state+specialty+jobType OR city+specialty?
    // If cityOrSpecialty is a specialty AND specialty param is a job type → state+specialty+jobType
    const isStateSpecialtyJobType = isValidSpecialtySlug(cityOrSpecialty) && isJobType(specialty);

    if (isStateSpecialtyJobType) {
      // STATE + SPECIALTY + JOB TYPE page (e.g., /fl/icu/full-time)
      const specialtySlug = cityOrSpecialty;
      const jobTypeSlug = specialty;

      // Handle job type redirect (prn → per-diem)
      const normalizedJobType = jobTypeToSlug(jobTypeSlug);
      if (normalizedJobType && normalizedJobType !== jobTypeSlug) {
        return {
          redirect: {
            destination: `/jobs/nursing/${slug}/${specialtySlug}/${normalizedJobType}`,
            permanent: true
          }
        };
      }

      const result = await fetchStateSpecialtyJobTypeJobs(stateInfo.stateCode, specialtySlug, jobTypeSlug, page);

      if (!result) {
        return { notFound: true };
      }

      return {
        props: {
          pageType: 'state-specialty-jobtype',
          stateCode: result.stateCode,
          stateFullName: result.stateFullName,
          specialty: result.specialty,
          specialtySlug: result.specialtySlug,
          jobType: result.jobType,
          jobTypeSlug: result.jobTypeSlug,
          jobs: JSON.parse(JSON.stringify(result.jobs)),
          totalJobs: result.totalJobs,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          maxHourlyRate: result.maxHourlyRate,
          stats: result.stats
        }
      };
    }

    // CITY + SPECIALTY page (e.g., /fl/miami/icu) - existing behavior
    // Check for legacy specialty slugs that need 301 redirect
    const redirectTo = SPECIALTY_REDIRECTS[specialty.toLowerCase()];
    if (redirectTo) {
      return {
        redirect: {
          destination: `/jobs/nursing/${slug}/${cityOrSpecialty}/${redirectTo}`,
          permanent: true
        }
      };
    }

    // Validate that specialty is valid
    if (!isValidSpecialtySlug(specialty)) {
      return {
        notFound: true
      };
    }

    // Fetch city + specialty jobs
    const result = await fetchCitySpecialtyJobs(stateInfo.stateCode, cityOrSpecialty, specialty, page);

    if (!result) {
      return {
        notFound: true
      };
    }

    return {
      props: {
        pageType: 'city-specialty',
        stateCode: stateInfo.stateCode,
        stateFullName: stateInfo.stateFullName,
        cityName: result.city,
        citySlug: cityOrSpecialty,
        specialtyName: result.specialty,
        specialtySlug: specialty,
        jobs: result.jobs,
        pagination: result.pagination,
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

export default function CitySpecialtyOrStateSpecialtyJobTypePage({
  pageType = 'city-specialty',
  stateCode,
  stateFullName,
  // City+Specialty props
  cityName,
  citySlug,
  specialtyName,
  specialtySlug,
  pagination = null,
  // State+Specialty+JobType props
  specialty,
  jobType,
  jobTypeSlug,
  totalJobs,
  totalPages,
  currentPage,
  maxHourlyRate,
  // Common props
  jobs = [],
  stats = null
}) {
  const router = useRouter();
  const { slug, cityOrSpecialty, specialty: specialtyParam } = router.query || {};

  // Determine if this is state+specialty+jobtype page
  const isStateSpecialtyJobType = pageType === 'state-specialty-jobtype';

  // Display names
  const stateDisplayName = stateFullName || getStateFullName(stateCode) || stateCode || '';

  // For state+specialty+jobtype pages
  if (isStateSpecialtyJobType) {
    const specialtyDisplay = specialty || '';
    const jobTypeDisplay = jobType || '';
    const specSlug = specialtySlug || cityOrSpecialty;
    const jtSlug = jobTypeSlug || specialtyParam;

    // Generate SEO meta
    const salaryText = getSalaryText(maxHourlyRate, `${jobTypeDisplay}-${specialtyDisplay}-${stateDisplayName}`);
    const jobCountText = totalJobs ? `${totalJobs} ` : '';
    const seoMeta = {
      title: `${jobCountText}${jobTypeDisplay} ${specialtyDisplay} RN Jobs in ${stateDisplayName}${salaryText}`,
      description: `Find ${totalJobs || 0} ${jobTypeDisplay.toLowerCase()} ${specialtyDisplay} Registered Nurse jobs in ${stateDisplayName}. Browse positions and apply today!`,
      keywords: `${jobTypeDisplay.toLowerCase()} ${specialtyDisplay.toLowerCase()} rn jobs, ${specialtyDisplay.toLowerCase()} nursing jobs ${stateDisplayName.toLowerCase()}`,
      canonicalUrl: `https://intelliresume.net/jobs/nursing/${slug?.toLowerCase() || ''}/${specSlug}/${jtSlug}`,
      ogImage: 'https://intelliresume.net/og-image-jobs.png'
    };

    return (
      <StateSpecialtyJobTypePage
        stateCode={stateCode}
        stateFullName={stateDisplayName}
        specialty={specialtyDisplay}
        specialtySlug={specSlug}
        jobType={jobTypeDisplay}
        jobTypeSlug={jtSlug}
        jobs={jobs}
        totalJobs={totalJobs}
        totalPages={totalPages}
        currentPage={currentPage}
        stats={stats}
        seoMeta={seoMeta}
        slug={slug}
      />
    );
  }

  // CITY + SPECIALTY page (original behavior)
  const cityDisplayName = cityName || normalizeCity(cityOrSpecialty?.replace(/-/g, ' ') || '') || cityOrSpecialty || '';
  const specialtyDisplayName = specialtyName || '';
  // SEO-optimized city name for H1 (drops state, handles NYC)
  const cityDisplay = getCityDisplayName(cityDisplayName, stateCode);

  // Generate SEO meta tags
  const seoMeta = seoUtils.generateCitySpecialtyPageMetaTags
    ? seoUtils.generateCitySpecialtyPageMetaTags(
        stateCode,
        stateDisplayName,
        cityDisplayName,
        specialtyDisplayName,
        {
          total: pagination?.total || 0
        }
      )
    : {
        title: `${specialtyDisplayName} RN Jobs in ${cityDisplayName}, ${stateDisplayName} | IntelliResume Health`,
        description: `Find ${specialtyDisplayName} Registered Nurse jobs in ${cityDisplayName}, ${stateDisplayName}. ${pagination?.total || 0} positions available.`,
        keywords: `${specialtyDisplayName.toLowerCase()} rn jobs, ${specialtyDisplayName.toLowerCase()} nursing jobs, ${cityDisplayName.toLowerCase()} ${specialtyDisplayName.toLowerCase()} nurse`,
        canonicalUrl: `https://intelliresume.net/jobs/nursing/${slug?.toLowerCase() || ''}/${citySlug?.toLowerCase() || cityOrSpecialty?.toLowerCase() || ''}/${specialtySlug?.toLowerCase() || specialtyParam?.toLowerCase() || ''}`,
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
            <p className="text-gray-600 mb-6">
              No {specialtyDisplayName} nursing jobs found in {cityDisplayName}, {stateDisplayName}.
            </p>
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
                  const jobPostingSchema = seoUtils.generateJobPostingSchema(jobItem);
                  if (!jobPostingSchema) return null;
                  return {
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": jobPostingSchema
                  };
                }).filter(Boolean)
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
                  "name": stateDisplayName,
                  "item": `https://intelliresume.net/jobs/nursing/${slug?.toLowerCase() || ''}`
                },
                {
                  "@type": "ListItem",
                  "position": 4,
                  "name": cityDisplayName,
                  "item": `https://intelliresume.net/jobs/nursing/${slug?.toLowerCase() || ''}/${cityOrSpecialty?.toLowerCase() || ''}`
                },
                {
                  "@type": "ListItem",
                  "position": 5,
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
            <Link href={`/jobs/nursing/${slug}`} className="hover:text-blue-600 transition-colors">{stateDisplayName}</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${slug}/${cityOrSpecialty}`} className="hover:text-blue-600 transition-colors">{cityDisplayName}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{specialtyDisplayName}</span>
          </nav>

          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {specialtyDisplayName} RN Jobs in {cityDisplay}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {pagination?.total > 0 ? (
                <>
                  Find <strong>{pagination.total}</strong> <strong>{specialtyDisplayName}</strong> Registered Nurse job{pagination.total === 1 ? '' : 's'} in <strong>{cityDisplayName}, {stateDisplayName}</strong>. Browse positions at top healthcare employers
                  {stats?.employers && stats.employers.length > 0 ? (
                    <> including {stats.employers.slice(0, 3).map(e => e.employer?.name || 'Employer').join(', ')}{stats.employers.length > 3 ? ` and ${stats.employers.length - 3} more` : ''}</>
                  ) : null}
                  . Apply today!
                </>
              ) : (
                <>Find <strong>{specialtyDisplayName}</strong> Registered Nurse positions in <strong>{cityDisplayName}, {stateDisplayName}</strong>. Browse nursing jobs at top healthcare employers. Apply today!</>
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

          {/* Stats Cards - Top Employers */}
          {stats && stats.employers && stats.employers.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 11.09a8.97 8.97 0 00.7 2.515 8.97 8.97 0 002.5-.7l-1.005-1.005a1 1 0 00-1.414-1.414l-1.005-1.005zM3.04 12.5a11.053 11.053 0 011.05.174 1 1 0 01.89.89c.03.343.07.683.116 1.02L3.04 12.5zM15.34 13.828l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414a8.97 8.97 0 002.5-.7zM16.69 9.397l-2.25.961a11.115 11.115 0 01.25 3.762 1 1 0 01-.89.89c-.342.03-.683.07-1.02.116l2.25-.96a1 1 0 000-1.838l-7-3z" />
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
                        href={`/jobs/nursing/employer/${employerSlug}`}
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
            </div>
          )}

          {/* Job Listings */}
          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-16 text-center border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
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
                            {jobItem.specialty && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                {jobItem.specialty}
                              </span>
                            )}
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
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {normalizeExperienceLevel(jobItem.experienceLevel)}
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
                          specialty={specialtyName}
                          location={`${cityName}, ${stateCode}`}
                          state={stateCode}
                          city={cityName}
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
            </>
          )}

          {/* Salary Banner - After job listings, before footer */}
          <div className="mt-12 mb-8">
            <Link
              href={`/jobs/nursing/${stateCode.toLowerCase()}/${cityOrSpecialty}/${specialty}/salary`}
              className="group flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-md hover:shadow-lg hover:border-green-300 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                    Average {specialtyDisplayName} RN Salary in {cityDisplayName}, {stateDisplayName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">View salary ranges, averages, and employer breakdowns</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-600 group-hover:text-green-700 transition-colors">
                <span className="font-semibold">View Salaries</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Footer: Other Specialties in This City */}
          {stats?.otherSpecialties && stats.otherSpecialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Browse Other Nursing Specialties in {cityDisplayName}, {stateDisplayName}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.otherSpecialties.length} other nursing {stats.otherSpecialties.length === 1 ? 'specialty' : 'specialties'} available in {cityDisplayName}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherSpecialties.map((specData, idx) => {
                    const stateSlug = stateCode.toLowerCase();
                    const citySlug = cityDisplayName.toLowerCase().replace(/\s+/g, '-');
                    const specialtySlug = specialtyToSlug(specData.specialty);
                    
                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${stateSlug}/${citySlug}/${specialtySlug}`}
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

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" data-job-alert-form>
            <JobAlertSignup 
              specialty={specialtyName}
              location={`${cityName}, ${stateCode}`}
              state={stateCode}
              city={cityName}
            />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA
            specialty={specialtyName}
            location={`${cityName}, ${stateCode}`}
          />
        </div>
      </div>
    </>
  );
}

/**
 * State + Specialty + Job Type Page Component
 * Example: Full-Time ICU RN Jobs in Florida
 */
function StateSpecialtyJobTypePage({
  stateCode,
  stateFullName,
  specialty,
  specialtySlug,
  jobType,
  jobTypeSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  stats,
  seoMeta,
  slug
}) {
  const formatSalary = (minHourly, maxHourly, minAnnual, maxAnnual) => {
    if (minHourly && maxHourly) {
      return `$${minHourly.toFixed(2)} - $${maxHourly.toFixed(2)}/hr`;
    } else if (minAnnual && maxAnnual) {
      return `$${(minAnnual / 1000).toFixed(0)}k - $${(maxAnnual / 1000).toFixed(0)}k/yr`;
    }
    return null;
  };

  const generateCitySlug = (city) => {
    if (!city) return '';
    return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <>
      <Head>
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
        <link rel="canonical" href={seoMeta.canonicalUrl} key="canonical" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:image" content={seoMeta.ogImage} />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${slug}`} className="hover:text-blue-600 transition-colors">{stateFullName}</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${slug}/${specialtySlug}`} className="hover:text-blue-600 transition-colors">{specialty}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{jobType}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {jobType} {specialty} RN Jobs in {stateFullName}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> {jobType.toLowerCase()} {specialty} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} in {stateFullName}
                  {stats?.cities && stats.cities.length > 0 && (
                    <> across <strong>{stats.cities.length}</strong> {stats.cities.length === 1 ? 'city' : 'cities'} including {stats.cities.slice(0, 3).map(c => c.city).join(', ')}{stats.cities.length > 3 && ` and ${stats.cities.length - 3} more`}</>
                  )}
                  . Apply today!
                </>
              ) : (
                <>Browse {jobType.toLowerCase()} {specialty.toLowerCase()} nursing opportunities in {stateFullName}.</>
              )}
            </p>
            {totalJobs > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{totalJobs.toLocaleString()} {totalJobs === 1 ? 'job' : 'jobs'} available</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (stats.cities?.length > 0 || stats.employers?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Top Cities */}
              {stats.cities && stats.cities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Cities</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.cities.slice(0, 5).map((c, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${slug}/${generateCitySlug(c.city)}/${specialtySlug}/${jobTypeSlug}`}
                        className="flex justify-between items-center group hover:text-blue-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-blue-600 font-medium">{c.city}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{c.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Employers */}
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
                    {stats.employers.slice(0, 5).map((emp, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/employer/${emp.slug}/${specialtySlug}/${jobTypeSlug}`}
                        className="flex justify-between items-center group hover:text-orange-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-orange-600 font-medium">{emp.name}</span>
                        <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Job Listings */}
          {jobs.length > 0 ? (
            <div className="space-y-4 mb-8">
              {jobs.map((job, index) => {
                const salary = formatSalary(job.salaryMinHourly, job.salaryMaxHourly, job.salaryMinAnnual, job.salaryMaxAnnual);

                return (
                  <React.Fragment key={job.id}>
                    <Link
                      href={`/jobs/nursing/${job.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 flex gap-4">
                        {job.employer && getEmployerLogoPath(job.employer.slug) && (
                          <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-2">
                            <img
                              src={getEmployerLogoPath(job.employer.slug)}
                              alt={`${job.employer.name} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1.5 line-clamp-2">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {job.city}, {job.state}
                            </span>
                            {salary && <span className="text-green-700 font-medium">• {salary}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {job.jobType}
                              </span>
                            )}
                            {job.shiftType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                                {job.shiftType}
                              </span>
                            )}
                            {job.experienceLevel && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                {normalizeExperienceLevel(job.experienceLevel)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                    {index === 4 && jobs.length > 5 && (
                      <div className="my-6">
                        <JobAlertSignup specialty={specialty} state={stateCode} compact={true} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No {jobType} {specialty} RN Jobs Currently Available</h2>
              <p className="text-gray-600 mb-6">Check back soon or explore other opportunities.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={`/jobs/nursing/${slug}/${specialtySlug}`} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  View All {specialty} Jobs in {stateFullName}
                </Link>
                <Link href={`/jobs/nursing/${slug}`} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">
                  View All Jobs in {stateFullName}
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link href={`/jobs/nursing/${slug}/${specialtySlug}/${jobTypeSlug}?page=${currentPage - 1}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-gray-700">Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages && (
                <Link href={`/jobs/nursing/${slug}/${specialtySlug}/${jobTypeSlug}?page=${currentPage + 1}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Other Job Types */}
          {stats?.otherJobTypes && stats.otherJobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Other Job Types for {specialty} in {stateFullName}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.otherJobTypes.map((jt, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${slug}/${specialtySlug}/${jt.slug}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-orange-50 rounded-lg group transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-orange-600 font-medium">{jt.displayName}</span>
                      <span className="text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded-full text-xs">{jt.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Other Specialties */}
          {stats?.otherSpecialties && stats.otherSpecialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Other {jobType} Specialties in {stateFullName}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherSpecialties.map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${slug}/${spec.slug}/${jobTypeSlug}`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-purple-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-purple-600 font-medium text-sm">{spec.specialty}</span>
                      <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{spec.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Job Alert Signup */}
          <div className="mt-16" data-job-alert-form>
            <JobAlertSignup specialty={specialty} state={stateCode} />
          </div>

          <StickyJobAlertCTA specialty={specialty} location={stateFullName} />
        </div>
      </div>
    </>
  );
}

