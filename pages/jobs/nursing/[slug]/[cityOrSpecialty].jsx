import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../../lib/utils/jobCardUtils';
import JobAlertSignup from '../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../components/StickyJobAlertCTA';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../lib/seo/jobSEO');
const { getStateFullName, normalizeCity } = require('../../../../lib/jobScraperUtils');
const { detectStateFromSlug, fetchCityJobs, fetchStateSpecialtyJobs } = require('../../../../lib/services/jobPageData');
const { isValidSpecialtySlug, slugToSpecialty, specialtyToSlug, normalizeSpecialty } = require('../../../../lib/constants/specialties');
const { normalizeExperienceLevel } = require('../../../../lib/utils/experienceLevelUtils');
const { getEmployerLogoPath } = require('../../../../lib/utils/employerLogos');
const { getSalaryText } = require('../../../../lib/utils/seoTextUtils');
const { getCityDisplayName } = require('../../../../lib/utils/cityDisplayUtils');

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
 * This page handles BOTH:
 * 1. City pages: /jobs/nursing/ohio/cleveland
 * 2. State + Specialty pages: /jobs/nursing/ohio/icu
 */
export async function getServerSideProps({ params, query }) {
  const { slug, cityOrSpecialty } = params;
  const page = query.page || '1';

  // Check for old specialty slugs that need 301 redirect
  const redirectTo = SPECIALTY_REDIRECTS[cityOrSpecialty.toLowerCase()];
  if (redirectTo) {
    const destination = page !== '1'
      ? `/jobs/nursing/${slug}/${redirectTo}?page=${page}`
      : `/jobs/nursing/${slug}/${redirectTo}`;
    return {
      redirect: {
        destination,
        permanent: true, // 301 redirect for SEO
      },
    };
  }

  try {
    // Validate that slug is a valid state
    const stateInfo = detectStateFromSlug(slug);
    
    if (!stateInfo) {
      return {
        notFound: true
      };
    }

    // Check if cityOrSpecialty is a specialty (Option A: Clean URL detection)
    const isSpecialty = isValidSpecialtySlug(cityOrSpecialty);

    if (isSpecialty) {
      // This is a STATE + SPECIALTY page (e.g., /ohio/icu)
      const result = await fetchStateSpecialtyJobs(stateInfo.stateCode, cityOrSpecialty, page);
    
    if (!result) {
      return {
        notFound: true
      };
    }

    return {
      props: {
          pageType: 'state-specialty',
          stateCode: stateInfo.stateCode,
          stateFullName: stateInfo.stateFullName,
          specialtyName: result.specialty,
          jobs: result.jobs,
          pagination: result.pagination,
          maxHourlyRate: result.maxHourlyRate,
          stats: result.statistics
        }
      };
    } else {
      // This is a CITY page (e.g., /ohio/cleveland)
      const result = await fetchCityJobs(stateInfo.stateCode, cityOrSpecialty, page);
      
      if (!result) {
        return {
          notFound: true
        };
      }

      return {
        props: {
          pageType: 'city',
          stateCode: stateInfo.stateCode,
          stateFullName: stateInfo.stateFullName,
          cityName: result.city,
          jobs: result.jobs,
          pagination: result.pagination,
          maxHourlyRate: result.maxHourlyRate,
          stats: result.statistics
        }
      };
    }
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      notFound: true
    };
  }
}

export default function CityOrSpecialtyPage({
  pageType,
  stateCode,
  stateFullName,
  cityName = null,
  specialtyName = null,
  jobs = [],
  pagination = null,
  maxHourlyRate = null,
  stats = null
}) {
  const router = useRouter();
  const { slug, cityOrSpecialty } = router.query || {};

  // Handle page change
  const handlePageChange = (newPage) => {
    router.push(`/jobs/nursing/${slug}/${cityOrSpecialty}?page=${newPage}`);
  };

  // Determine page content based on type
  const isSpecialtyPage = pageType === 'state-specialty';
  const isCityPage = pageType === 'city';

  // Display names
  const stateDisplayName = stateFullName || getStateFullName(stateCode) || stateCode || '';
  const cityDisplayName = cityName || normalizeCity(cityOrSpecialty?.replace(/-/g, ' ') || '') || cityOrSpecialty || '';
  const specialtyDisplayName = specialtyName || '';
  // SEO-optimized city name for H1 (drops state, handles NYC)
  const cityDisplay = getCityDisplayName(cityDisplayName, stateCode);

  // Generate SEO meta tags
  let seoMeta;
  if (isSpecialtyPage) {
    // State + Specialty page SEO with job count and salary
    const salaryText = getSalaryText(maxHourlyRate, `${specialtyDisplayName}-${stateDisplayName}`);
    const jobCountText = pagination?.total ? `${pagination.total} ` : '';
    seoMeta = {
      title: `${jobCountText}${specialtyDisplayName} RN Jobs in ${stateDisplayName}${salaryText}`,
      description: pagination?.total > 0
        ? `Find ${pagination.total} ${specialtyDisplayName} Registered Nurse jobs in ${stateDisplayName}. Browse positions at top healthcare employers and apply today!`
        : `${specialtyDisplayName} Registered Nurse jobs in ${stateDisplayName}. Positions updated daily. Browse ${specialtyDisplayName.toLowerCase()} nursing opportunities at top healthcare employers.`,
      keywords: `${specialtyDisplayName.toLowerCase()} rn jobs, ${specialtyDisplayName.toLowerCase()} nursing jobs, ${stateDisplayName.toLowerCase()} ${specialtyDisplayName.toLowerCase()} nurse`,
      canonicalUrl: `https://intelliresume.net/jobs/nursing/${slug?.toLowerCase() || ''}/${cityOrSpecialty?.toLowerCase() || ''}`,
      ogImage: 'https://intelliresume.net/og-image-jobs.png'
    };
  } else {
    // City page SEO
    seoMeta = seoUtils.generateCityPageMetaTags(
      stateCode,
      stateDisplayName,
      cityDisplayName,
      {
        total: pagination?.total || 0,
        specialties: stats?.specialties || []
      },
      maxHourlyRate
    );
  }

  // Soft zero state: valid page, but no active jobs right now
  // Keep the page alive for SEO instead of showing 404
  const isSoftZero = pagination?.total === 0 || (jobs.length === 0 && !pagination);

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
                  "name": isSpecialtyPage ? specialtyDisplayName : cityDisplayName,
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
            <span className="text-gray-900 font-medium">{isSpecialtyPage ? specialtyDisplayName : cityDisplayName}</span>
          </nav>

          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {isSpecialtyPage
                ? `${specialtyDisplayName} RN Jobs in ${stateDisplayName}`
                : `RN Jobs in ${cityDisplay}`}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {pagination?.total > 0 ? (
                <>
                  Find <strong>{pagination.total}</strong> {isSpecialtyPage ? `${specialtyDisplayName} ` : ''}Registered Nurse job{pagination.total === 1 ? '' : 's'}
                  {isSpecialtyPage
                    ? <> in <strong>{stateDisplayName}</strong></>
                    : <> in <strong>{cityDisplayName}, {stateDisplayName}</strong></>}
                  {stats?.cities && stats.cities.length > 0 && isSpecialtyPage ? (
                    <> across <strong>{stats.cities.length}</strong> {stats.cities.length === 1 ? 'city' : 'cities'}</>
                  ) : null}
                  {stats?.specialties && stats.specialties.length > 0 && isCityPage ? (
                    <> in <strong>{stats.specialties.length}</strong> {stats.specialties.length === 1 ? 'specialty' : 'specialties'}</>
                  ) : null}
                  . Browse positions at top healthcare employers
                  {stats?.employers && stats.employers.length > 0 ? (
                    <> including {stats.employers.slice(0, 3).map(e => e.employer?.name || 'Employer').join(', ')}{stats.employers.length > 3 ? ` and ${stats.employers.length - 3} more` : ''}</>
                  ) : null}
                  . Apply today!
                </>
              ) : (
                <>Find {isSpecialtyPage ? `${specialtyDisplayName} ` : ''}Registered Nurse positions {isSpecialtyPage ? `in ${stateDisplayName}` : `in ${cityDisplayName}, ${stateDisplayName}`}. Browse nursing jobs at top healthcare employers. Apply today!</>
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
          {!isSoftZero && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* City Stats (for specialty pages) or Specialty Stats (for city pages) */}
              {stats.cities && stats.cities.length > 0 && isSpecialtyPage && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Cities</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.cities.slice(0, 5).map((cityData, idx) => {
                      const stateSlug = stateCode.toLowerCase();
                      const citySlug = cityData.city.toLowerCase().replace(/\s+/g, '-');
                      const specialtySlug = specialtyToSlug(specialtyDisplayName);
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stateSlug}/${citySlug}/${specialtySlug}`}
                          className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-green-600 font-medium">{cityData.city}</span>
                          <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{cityData.count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {stats.specialties && stats.specialties.length > 0 && isCityPage && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Specialties</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.specialties.slice(0, 5).map((specData, idx) => {
                      const stateSlug = stateCode.toLowerCase();
                      const citySlug = cityDisplayName.toLowerCase().replace(/\s+/g, '-');
                      const specialtySlug = specialtyToSlug(normalizeSpecialty(specData.specialty));
                      return (
                        <Link
                        key={idx}
                          href={`/jobs/nursing/${stateSlug}/${citySlug}/${specialtySlug}`}
                          className="flex justify-between items-center group hover:text-purple-600 transition-colors py-1"
                      >
                          <span className="text-gray-900 group-hover:text-purple-600 font-medium">{specData.specialty}</span>
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{specData.count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {stats.employers && stats.employers.length > 0 && (
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
                      // For specialty pages, link to employer + specialty; for city pages, just employer
                      const specialtySlug = isSpecialtyPage ? specialtyToSlug(specialtyDisplayName) : null;
                      const employerHref = specialtySlug
                        ? `/jobs/nursing/employer/${employerSlug}/${specialtySlug}`
                        : `/jobs/nursing/employer/${employerSlug}`;
                      return employerSlug ? (
                        <Link
                          key={idx}
                          href={employerHref}
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
            </div>
          )}

          {/* Job Listings */}
          {isSoftZero ? (
            <div>
              {/* Soft zero hero message */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 sm:p-10 text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {isSpecialtyPage
                    ? `No ${specialtyDisplayName} RN Jobs in ${stateDisplayName} Right Now`
                    : `No RN Jobs in ${cityDisplayName} Right Now`}
                </h2>
                <p className="text-gray-600 text-lg max-w-xl mx-auto mb-6">
                  {isSpecialtyPage
                    ? <>{specialtyDisplayName} positions in {stateDisplayName} are updated daily. New openings appear as hospitals post them. <a href="#job-alert-form" className="text-blue-600 hover:text-blue-800 underline font-medium">Sign up for alerts</a> to be first to know.</>
                    : <>Nursing positions in {cityDisplayName} are updated daily. New openings appear as hospitals post them. <a href="#job-alert-form" className="text-blue-600 hover:text-blue-800 underline font-medium">Sign up for alerts</a> to be first to know.</>}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={`/jobs/nursing/${slug}`}
                    className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    View All Jobs in {stateDisplayName}
                  </Link>
                  <Link
                    href="/jobs/nursing"
                    className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    Browse All RN Jobs
                  </Link>
                </div>
              </div>

              {/* Same specialty in other states (for state+specialty pages) */}
              {isSpecialtyPage && stats?.sameSpecialtyInOtherStates && stats.sameSpecialtyInOtherStates.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {specialtyDisplayName} RN Jobs in Other States
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {stats.sameSpecialtyInOtherStates.map((stateData, idx) => {
                      const stSlug = stateData.state.toLowerCase();
                      const specSlug = specialtyToSlug(specialtyDisplayName);
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stSlug}/${specSlug}`}
                          className="flex items-center justify-between gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg group transition-colors"
                        >
                          <span className="text-gray-900 group-hover:text-blue-700 font-medium">{stateData.stateFullName}</span>
                          <span className="text-blue-600 font-semibold bg-white px-2 py-0.5 rounded-full text-xs">{stateData.count} {stateData.count === 1 ? 'job' : 'jobs'}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other specialties in this state (for state+specialty pages) */}
              {stats?.otherSpecialties && stats.otherSpecialties.length > 0 && isSpecialtyPage && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Other Nursing Specialties Hiring in {stateDisplayName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {stats.otherSpecialties.slice(0, 12).map((specData, idx) => {
                      const stSlug = stateCode.toLowerCase();
                      const specSlug = specialtyToSlug(normalizeSpecialty(specData.specialty));
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stSlug}/${specSlug}`}
                          className="flex items-center justify-between gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg group transition-colors"
                        >
                          <span className="text-gray-900 group-hover:text-purple-700 font-medium">{specData.specialty}</span>
                          <span className="text-purple-600 font-semibold bg-white px-2 py-0.5 rounded-full text-xs">{specData.count} {specData.count === 1 ? 'job' : 'jobs'}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other cities in this state (for city pages with 0 jobs) */}
              {isCityPage && stats?.otherCitiesInState && stats.otherCitiesInState.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Other {stateDisplayName} Cities Hiring RNs
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {stats.otherCitiesInState.map((cityData, idx) => {
                      const stSlug = stateCode.toLowerCase();
                      const ctSlug = cityData.city.toLowerCase().replace(/\s+/g, '-');
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stSlug}/${ctSlug}`}
                          className="flex items-center justify-between gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg group transition-colors"
                        >
                          <span className="text-gray-900 group-hover:text-green-700 font-medium">{cityData.city}</span>
                          <span className="text-green-600 font-semibold bg-white px-2 py-0.5 rounded-full text-xs">{cityData.count} {cityData.count === 1 ? 'job' : 'jobs'}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Specialties in this state (for city pages with 0 jobs) */}
              {isCityPage && stats?.specialtiesInState && stats.specialtiesInState.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Nursing Specialties Hiring in {stateDisplayName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {stats.specialtiesInState.map((specData, idx) => {
                      const stSlug = stateCode.toLowerCase();
                      const specSlug = specialtyToSlug(normalizeSpecialty(specData.specialty));
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stSlug}/${specSlug}`}
                          className="flex items-center justify-between gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg group transition-colors"
                        >
                          <span className="text-gray-900 group-hover:text-purple-700 font-medium">{specData.specialty}</span>
                          <span className="text-purple-600 font-semibold bg-white px-2 py-0.5 rounded-full text-xs">{specData.count} {specData.count === 1 ? 'job' : 'jobs'}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Job Alert Signup */}
              <div className="mt-8" id="job-alert-form" data-job-alert-form>
                <JobAlertSignup
                  specialty={isSpecialtyPage ? specialtyName : ''}
                  location={isSpecialtyPage ? stateDisplayName : `${cityName}, ${stateCode}`}
                  state={stateCode}
                  city={isSpecialtyPage ? '' : cityName}
                />
              </div>
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
                          specialty={isSpecialtyPage ? specialtyName : ''}
                          location={isSpecialtyPage ? stateDisplayName : `${cityName}, ${stateCode}`}
                          state={stateCode}
                          city={isSpecialtyPage ? '' : cityName}
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

          {/* Salary Banner (for Specialty Pages) - Gold/Amber theme to differentiate from teal job alerts */}
          {isSpecialtyPage && !isSoftZero && (
            <div className="mt-12 mb-8">
              <Link
                href={`/jobs/nursing/${stateCode.toLowerCase()}/${cityOrSpecialty}/salary`}
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
                      Average {specialtyDisplayName} RN Salary in {stateDisplayName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">View salary ranges, averages by city, and employer breakdowns</p>
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
          )}

          {/* Salary Banner (for City Pages) - Gold/Amber theme to differentiate from teal job alerts */}
          {!isSpecialtyPage && !isSoftZero && cityDisplayName && (
          <div className="mt-12 mb-8">
            <Link
                href={`/jobs/nursing/${stateCode.toLowerCase()}/${cityOrSpecialty}/salary`}
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
                    Average RN Salary in {cityDisplayName}, {stateDisplayName}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">View salary ranges, averages by specialty, and employer breakdowns</p>
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
          )}

          {/* Footer: Cities with this Specialty (for State + Specialty pages) */}
          {!isSoftZero && stats?.cities && stats.cities.length > 0 && isSpecialtyPage && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {specialtyDisplayName} Nursing Jobs in Other {stateDisplayName} Cities
                </h2>
                <p className="text-gray-600">
                  Find {specialtyDisplayName.toLowerCase()} RN positions in {stats.cities.length} {stats.cities.length === 1 ? 'city' : 'cities'} across {stateDisplayName}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.cities.map((cityData, idx) => {
                    const stateSlug = stateCode.toLowerCase();
                    const citySlug = cityData.city.toLowerCase().replace(/\s+/g, '-');
                    const specialtySlug = specialtyToSlug(specialtyDisplayName);
                    
                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${stateSlug}/${citySlug}/${specialtySlug}`}
                        className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-green-600 transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-green-600 font-medium text-sm">{cityData.city}</span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{cityData.count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Specialties in this City (for City pages) */}
          {!isSoftZero && stats?.specialties && stats.specialties.length > 0 && isCityPage && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Browse RN Jobs by Specialty in {cityDisplayName}, {stateDisplayName}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.specialties.length} nursing {stats.specialties.length === 1 ? 'specialty' : 'specialties'} available in {cityDisplayName}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.specialties.map((specData, idx) => {
                    const stateSlug = stateCode.toLowerCase();
                    const citySlug = cityDisplayName.toLowerCase().replace(/\s+/g, '-');
                    const specialtySlug = specialtyToSlug(normalizeSpecialty(specData.specialty));

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

          {/* Footer: Browse by Job Type (for both City and State+Specialty pages) */}
          {!isSoftZero && stats?.jobTypes && stats.jobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Browse by Job Type in {isCityPage ? `${cityDisplayName}, ${stateCode}` : `${stateDisplayName}`}
                </h2>
                <p className="text-gray-600">
                  Find {isSpecialtyPage ? specialtyDisplayName.toLowerCase() : ''} RN positions by employment type
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

                    // Build the URL based on page type
                    const stateSlug = stateCode.toLowerCase();
                    let jobTypeUrl;
                    if (isCityPage) {
                      const citySlug = cityDisplayName.toLowerCase().replace(/\s+/g, '-');
                      jobTypeUrl = `/jobs/nursing/${stateSlug}/${citySlug}/job-type/${jobTypeUrlSlug}`;
                    } else {
                      // State + Specialty page - link to specialty job type page
                      const specSlug = specialtyToSlug(specialtyDisplayName);
                      jobTypeUrl = `/jobs/nursing/specialty/${specSlug}/${jobTypeUrlSlug}`;
                    }

                    return (
                      <Link
                        key={idx}
                        href={jobTypeUrl}
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

          {/* Job Alert Signup - Before Footer (hide on soft zero - already shown above) */}
          {!isSoftZero && (
            <>
              <div className="mt-16" id="job-alert-form" data-job-alert-form>
                <JobAlertSignup
                  specialty={isSpecialtyPage ? specialtyName : ''}
                  location={isSpecialtyPage ? stateDisplayName : `${cityName}, ${stateCode}`}
                  state={stateCode}
                  city={isSpecialtyPage ? '' : cityName}
                />
              </div>

              {/* Sticky Bottom CTA Banner */}
              <StickyJobAlertCTA
                specialty={isSpecialtyPage ? specialtyName : ''}
                location={isSpecialtyPage ? stateDisplayName : `${cityName}, ${stateCode}`}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
