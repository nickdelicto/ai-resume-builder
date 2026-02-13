import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../../lib/utils/jobCardUtils';
import JobAlertSignup from '../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../components/StickyJobAlertCTA';
import SoftZeroContent from '../../../../components/jobs/SoftZeroContent';
import RelatedJobsGrid from '../../../../components/jobs/RelatedJobsGrid';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../lib/seo/jobSEO');
const { getStateFullName } = require('../../../../lib/jobScraperUtils');
const { fetchRemoteSpecialtyJobs, fetchSoftZeroData } = require('../../../../lib/services/jobPageData');
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
 * Server-Side Rendering: Fetch remote jobs for a specific specialty
 * URL: /jobs/nursing/remote/{specialty}
 */
export async function getServerSideProps({ params, query }) {
  const { specialty } = params;
  const page = query.page || '1';

  // Check for old specialty slugs that need 301 redirect
  const redirectTo = SPECIALTY_REDIRECTS[specialty.toLowerCase()];
  if (redirectTo) {
    const destination = page !== '1'
      ? `/jobs/nursing/remote/${redirectTo}?page=${page}`
      : `/jobs/nursing/remote/${redirectTo}`;
    return {
      redirect: {
        destination,
        permanent: true, // 301 redirect for SEO
      },
    };
  }

  try {
    const result = await fetchRemoteSpecialtyJobs(specialty, page);

    if (!result) {
      return {
        notFound: true
      };
    }

    let softZeroData = null;
    if (result.pagination?.total === 0 || result.jobs.length === 0) {
      softZeroData = await fetchSoftZeroData({
        specialty: result.specialty,
        remote: true,
      });
    }

    return {
      props: {
        specialtyName: result.specialty,
        specialtySlug: result.specialtySlug,
        jobs: result.jobs,
        pagination: result.pagination,
        maxHourlyRate: result.maxHourlyRate,
        stats: result.statistics,
        softZeroData
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      notFound: true
    };
  }
}

export default function RemoteSpecialtyJobPage({
  specialtyName,
  specialtySlug,
  jobs = [],
  pagination = null,
  maxHourlyRate,
  stats = null,
  softZeroData = null
}) {
  const router = useRouter();
  const { specialty } = router.query || {};

  // Handle page change
  const handlePageChange = (newPage) => {
    router.push(`/jobs/nursing/remote/${specialty}?page=${newPage}`);
  };

  const specialtyDisplayName = specialtyName || specialty?.replace(/-/g, ' ') || '';

  // Generate SEO meta tags for remote specialty page
  const salaryText = maxHourlyRate ? ` - Up to $${maxHourlyRate}/hr` : ' - Work From Home';
  const jobCountText = pagination?.total ? `${pagination.total} ` : '';
  const seoMeta = {
    title: `${jobCountText}Remote ${specialtyDisplayName} RN Jobs${salaryText}`,
    description: `Find ${pagination?.total || 0} remote ${specialtyDisplayName} Registered Nurse jobs. Work from home ${specialtyDisplayName.toLowerCase()} nursing positions at top healthcare employers. Apply today!`,
    keywords: `remote ${specialtyDisplayName.toLowerCase()} rn jobs, work from home ${specialtyDisplayName.toLowerCase()} nurse, telehealth ${specialtyDisplayName.toLowerCase()} nursing`,
    canonicalUrl: `https://intelliresume.net/jobs/nursing/remote/${specialty?.toLowerCase() || ''}`,
    ogImage: 'https://intelliresume.net/og-image-jobs.png'
  };

  // Error state (no jobs found)
  if (jobs.length === 0 && !pagination) {
    return (
      <>
        <Head>
          <title>Remote {specialtyDisplayName} RN Jobs | IntelliResume Health</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
              <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
              <span>/</span>
              <Link href="/jobs/nursing/remote" className="hover:text-green-600 transition-colors">Remote</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{specialtyDisplayName}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Remote {specialtyDisplayName} RN Jobs
            </h1>
            <SoftZeroContent
              title={`No Remote ${specialtyDisplayName} RN Jobs Right Now`}
              description={`Remote ${specialtyDisplayName} nursing positions are updated daily.`}
              alternatives={[
                { label: 'View All Remote RN Jobs', href: '/jobs/nursing/remote' },
                { label: `View All ${specialtyDisplayName} RN Jobs`, href: `/jobs/nursing/specialty/${specialtySlug || specialty}` },
                { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
              ]}
            />
            {softZeroData?.otherSpecialties && (
              <RelatedJobsGrid
                title="Other Remote Specialties"
                colorScheme="purple"
                items={softZeroData.otherSpecialties
                  .map(s => ({ label: s.label, href: `/jobs/nursing/remote/${s.slug}`, count: s.count }))}
              />
            )}
            {softZeroData?.topStates && (
              <RelatedJobsGrid
                title="Remote RN Jobs by State"
                colorScheme="green"
                items={softZeroData.topStates
                  .map(s => ({ label: s.label, href: `/jobs/nursing/${s.slug}/remote`, count: s.count }))}
              />
            )}
            <div className="mt-16" id="job-alert-form" data-job-alert-form>
              <JobAlertSignup specialty={specialtyDisplayName} location="Remote" />
            </div>
            <StickyJobAlertCTA specialty={specialtyDisplayName} location="Remote" />
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
                  "name": "Remote",
                  "item": "https://intelliresume.net/jobs/nursing/remote"
                },
                {
                  "@type": "ListItem",
                  "position": 4,
                  "name": specialtyDisplayName,
                  "item": seoMeta.canonicalUrl
                }
              ]
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href="/jobs/nursing/remote" className="hover:text-green-600 transition-colors">Remote</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{specialtyDisplayName}</span>
          </nav>

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              {/* Remote badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Work From Home
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Remote {specialtyDisplayName} RN Jobs
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {pagination?.total > 0 ? (
                <>
                  Find <strong>{pagination.total}</strong> remote {specialtyDisplayName} Registered Nurse job{pagination.total === 1 ? '' : 's'} available
                  {stats?.states && stats.states.length > 0 ? (
                    <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}</>
                  ) : null}
                  . Work from home {specialtyDisplayName.toLowerCase()} nursing positions at top healthcare employers
                  {stats?.employers && stats.employers.length > 0 ? (
                    <> including {stats.employers.slice(0, 3).map(e => e.employer?.name || 'Employer').join(', ')}{stats.employers.length > 3 ? ` and ${stats.employers.length - 3} more` : ''}</>
                  ) : null}
                  . Apply today!
                </>
              ) : (
                <>Find remote {specialtyDisplayName} Registered Nurse positions. Browse work from home {specialtyDisplayName.toLowerCase()} nursing jobs at top healthcare employers. Apply today!</>
              )}
            </p>
            {pagination && pagination.total > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span>{pagination.total} remote {pagination.total === 1 ? 'job' : 'jobs'} available</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Top States - links to state remote page */}
              {stats.states && stats.states.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">License States</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.states.slice(0, 5).map((stateData, idx) => {
                      const stateFullName = getStateFullName(stateData.state);
                      const stateDisplay = stateFullName || stateData.state;
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stateData.state.toLowerCase()}/remote`}
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
              {/* Top Employers - links to employer remote page */}
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
                          href={`/jobs/nursing/employer/${employerSlug}/remote`}
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
              {/* Job Types - links to remote specialty + jobtype */}
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
                          href={`/jobs/nursing/remote/${specialty}/${jtSlug}`}
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
            <>
              <SoftZeroContent
                title={`No Remote ${specialtyDisplayName} RN Jobs Right Now`}
                description={`Remote ${specialtyDisplayName} nursing positions are updated daily.`}
                alternatives={[
                  { label: 'View All Remote RN Jobs', href: '/jobs/nursing/remote' },
                  { label: `View All ${specialtyDisplayName} RN Jobs`, href: `/jobs/nursing/specialty/${specialtySlug || specialty}` },
                  { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
                ]}
              />
              {softZeroData?.otherSpecialties && (
                <RelatedJobsGrid
                  title="Other Remote Specialties"
                  colorScheme="purple"
                  items={softZeroData.otherSpecialties
                    .map(s => ({ label: s.label, href: `/jobs/nursing/remote/${s.slug}`, count: s.count }))}
                />
              )}
              {softZeroData?.topStates && (
                <RelatedJobsGrid
                  title="Remote RN Jobs by State"
                  colorScheme="green"
                  items={softZeroData.topStates
                    .map(s => ({ label: s.label, href: `/jobs/nursing/${s.slug}/remote`, count: s.count }))}
                />
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8">
                {jobs.map((jobItem, index) => (
                  <React.Fragment key={jobItem.id}>
                    <Link
                      href={`/jobs/nursing/${jobItem.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-green-200 overflow-hidden"
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
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-1.5 line-clamp-2">
                            {jobItem.title}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              {jobItem.workArrangement === 'remote' ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                  </svg>
                                  Remote{jobItem.state && <span className="text-gray-400"> ({jobItem.state})</span>}
                                </>
                              ) : jobItem.workArrangement === 'hybrid' ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                  </svg>
                                  Hybrid - {jobItem.city}, {jobItem.state}
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  {jobItem.city}, {jobItem.state}
                                </>
                              )}
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
                            {/* Remote badge */}
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {jobItem.workArrangement === 'hybrid' ? 'Hybrid' : 'Remote'}
                            </span>
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
                          location="Remote"
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

          {/* Browse Remote RN Jobs by Specialty Section */}
          {stats?.allSpecialties && stats.allSpecialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse Remote RN Jobs by Specialty</h2>
                <p className="text-gray-600">Find work from home Registered Nurse positions across {stats.allSpecialties.length} {stats.allSpecialties.length === 1 ? 'specialty' : 'specialties'}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.allSpecialties.map((specData, idx) => {
                    const specSlug = specData.specialty.toLowerCase().replace(/\s+/g, '-');

                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/remote/${specSlug}`}
                        className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-green-600 transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-green-600 font-medium text-sm">{specData.specialty}</span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{specData.count}</span>
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
                  Browse Remote {specialtyDisplayName} RN Jobs by Job Type
                </h2>
                <p className="text-gray-600">
                  Find remote {specialtyDisplayName.toLowerCase()} RN positions by employment type
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.jobTypes.map((jt, idx) => {
                    const jobTypeValue = jt.jobType;
                    let displayName = jobTypeValue;
                    let jobTypeUrlSlug = jobTypeValue.toLowerCase().replace(/\s+/g, '-');

                    if (jobTypeValue.toLowerCase() === 'prn' || jobTypeValue.toLowerCase() === 'per diem') {
                      displayName = 'PRN';
                      jobTypeUrlSlug = 'per-diem';
                    } else {
                      displayName = jobTypeValue.replace(/-/g, ' ').split(' ').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ');
                    }

                    const specSlug = specialtyToSlug(specialtyDisplayName);

                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/remote/${specSlug}/${jobTypeUrlSlug}`}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-green-50 rounded-lg group transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-green-600 font-medium">{displayName}</span>
                        <span className="text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded-full text-xs">{jt.count.toLocaleString()}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" id="job-alert-form" data-job-alert-form>
            <JobAlertSignup
              specialty={specialtyDisplayName}
              location="Remote"
            />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA
            specialty={specialtyDisplayName}
            location="Remote"
          />
        </div>
      </div>
    </>
  );
}
