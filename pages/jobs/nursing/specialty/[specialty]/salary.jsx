import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import SalaryCalculatorBanner from '../../../../../components/SalaryCalculatorBanner';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../../lib/seo/jobSEO');
const { getStateFullName } = require('../../../../../lib/jobScraperUtils');
const { fetchSpecialtySalaryStats } = require('../../../../../lib/services/jobPageData');
const { formatSalary, formatSalaryRange } = require('../../../../../lib/utils/salaryStatsUtils');
const { isValidSpecialtySlug, getAllSpecialtiesWithSlugs, specialtyToSlug } = require('../../../../../lib/constants/specialties');

// Map old specialty slugs to new canonical slugs for 301 redirects
const SPECIALTY_REDIRECTS = {
  'step-down': 'stepdown',
  'l-d': 'labor-delivery',
  'psychiatric': 'mental-health',
  'rehab': 'rehabilitation',
  'cardiac-care': 'cardiac',
  'progressive-care': 'stepdown',
  'home-care': 'home-health', // Home Care is non-RN; consolidated to Home Health
};

/**
 * Server-Side Rendering: Fetch salary data for specialty (nationwide)
 */
export async function getServerSideProps({ params }) {
  const { specialty } = params;

  // Check for legacy specialty slugs that need 301 redirect
  const redirectTo = SPECIALTY_REDIRECTS[specialty.toLowerCase()];
  if (redirectTo) {
    return {
      redirect: {
        destination: `/jobs/nursing/specialty/${redirectTo}/salary`,
        permanent: true, // 301 redirect
      },
    };
  }

  // Validate specialty slug
  if (!isValidSpecialtySlug(specialty)) {
    return {
      notFound: true
    };
  }

  try {
    const result = await fetchSpecialtySalaryStats(specialty);

    if (!result) {
      return {
        notFound: true
      };
    }

    return {
      props: {
        specialtyName: result.specialty,
        salaryStats: result.salaryStats,
        allStates: result.allStates
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      notFound: true
    };
  }
}

export default function SpecialtySalaryPage({
  specialtyName = null,
  salaryStats = null,
  allStates = []
}) {
  const router = useRouter();
  const { specialty } = router.query || {};

  const jobCount = salaryStats?.jobCount || 0;

  // Generate SEO meta tags - use 'specialty' locationType
  const seoMeta = seoUtils.generateSalaryPageMetaTags('Nationwide', 'specialty', salaryStats, specialtyName);


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

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={seoMeta.canonicalUrl} />
        <meta property="twitter:title" content={seoMeta.title} />
        <meta property="twitter:description" content={seoMeta.description} />
        <meta property="twitter:image" content={seoMeta.ogImage} />

        {/* WebPage Schema for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "name": seoMeta.title,
              "description": seoMeta.description,
              "url": seoMeta.canonicalUrl,
              "breadcrumb": {
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
                    "name": `${specialtyName} RN Jobs`,
                    "item": `https://intelliresume.net/jobs/nursing/specialty/${specialtyToSlug(specialtyName)}`
                  },
                  {
                    "@type": "ListItem",
                    "position": 4,
                    "name": `Average ${specialtyName} RN Salary`,
                    "item": seoMeta.canonicalUrl
                  }
                ]
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/specialty/${specialtyToSlug(specialtyName)}`} className="hover:text-blue-600 transition-colors">{specialtyName}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Salary</span>
          </nav>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Average {specialtyName} RN Salary
            </h1>
            {jobCount > 0 ? (
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                Nationwide salary data based on {jobCount} {specialtyName} job{jobCount === 1 ? '' : 's'} with salary data
                {jobCount === 1 && <span className="text-sm text-gray-500 block mt-1">*Based on limited data</span>}
              </p>
            ) : (
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                Salary data not yet available for {specialtyName} RN positions
              </p>
            )}
          </div>

          {/* Main Salary Stats Cards */}
          {jobCount > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Average Hourly */}
                {salaryStats?.hourly?.average && (
                  <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-2 border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Average Hourly {specialtyName} RN Salary
                      </h2>
                    </div>
                    <div className="text-3xl font-bold text-green-700 mb-2">
                      {formatSalary(salaryStats.hourly.average, 'hourly')}
                    </div>
                    {jobCount === 1 && (
                      <p className="text-xs text-gray-500">*Based on limited data</p>
                    )}
                  </div>
                )}

                {/* Average Annual */}
                {salaryStats?.annual?.average && (
                  <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Average Annual {specialtyName} RN Salary
                      </h2>
                    </div>
                    <div className="text-3xl font-bold text-blue-700 mb-2">
                      {formatSalary(salaryStats.annual.average, 'annual')}
                    </div>
                    {jobCount === 1 && (
                      <p className="text-xs text-gray-500">*Based on limited data</p>
                    )}
                  </div>
                )}

                {/* Salary Range */}
                {(salaryStats?.hourly || salaryStats?.annual) && (
                  <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {specialtyName} RN Salary Range
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {salaryStats?.hourly && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Hourly</div>
                          <div className="text-lg font-semibold text-purple-700">
                            {formatSalaryRange(salaryStats.hourly.min, salaryStats.hourly.max, 'hourly')}
                          </div>
                        </div>
                      )}
                      {salaryStats?.annual && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Annual</div>
                          <div className="text-lg font-semibold text-purple-700">
                            {formatSalaryRange(salaryStats.annual.min, salaryStats.annual.max, 'annual')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Calculator CTA Banner */}
              <SalaryCalculatorBanner specialty={specialtyName} />

              {/* Salary by Employer */}
              {salaryStats?.byEmployer && salaryStats.byEmployer.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      Nationwide {specialtyName} RN Salary by Employer
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {salaryStats.byEmployer.map((emp, idx) => (
                      <div key={idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                          {emp.employerSlug ? (
                            <Link
                              href={`/jobs/nursing/employer/${emp.employerSlug}`}
                              className="text-gray-900 font-medium hover:text-green-600 transition-colors text-sm sm:text-base"
                            >
                              {emp.employerName}
                            </Link>
                          ) : (
                            <span className="text-gray-900 font-medium text-sm sm:text-base">{emp.employerName}</span>
                          )}
                          <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs whitespace-nowrap">
                            {emp.jobCount} jobs
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          {emp.hourly && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-gray-500">Hourly:</span>
                              <span className="text-base sm:text-lg font-bold text-green-700">
                                {formatSalary(emp.hourly.average, 'hourly')}
                              </span>
                            </div>
                          )}
                          {emp.hourly && emp.annual && (
                            <span className="text-gray-300 hidden sm:inline">|</span>
                          )}
                          {emp.annual && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-gray-500">Annual:</span>
                              <span className="text-base sm:text-lg font-bold text-green-700">
                                {formatSalary(emp.annual.average, 'annual')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to Jobs */}
              <div className="mb-8 text-center">
                <Link
                  href={`/jobs/nursing/specialty/${specialtyToSlug(specialtyName)}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  View {jobCount}+ {specialtyName} RN Jobs Nationwide
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            /* No Data Placeholder */
            <div className="bg-white rounded-xl shadow-md p-8 mb-8 text-center border border-gray-200">
              <div className="max-w-2xl mx-auto">
                <div className="mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Salary Data Not Yet Available</h2>
                <p className="text-gray-600 mb-6">
                  Salary data for {specialtyName} RN positions will appear automatically once jobs with salary information are posted.
                  We continuously update our database with the latest job postings and salary information.
                </p>
                <Link
                  href={`/jobs/nursing/specialty/${specialtyToSlug(specialtyName)}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Browse {specialtyName} RN Jobs
                </Link>
              </div>
            </div>
          )}

          {/* Browse Salary by State */}
          {allStates.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border-2 border-blue-200 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">
                  Browse {specialtyName} RN Salary by State
                </h2>
                <span className="text-sm text-gray-600">({allStates.length} states)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {allStates.map((stateData) => {
                  const stateSlug = stateData.state.toLowerCase();
                  const linkHref = `/jobs/nursing/${stateSlug}/${specialtyToSlug(specialtyName)}/salary`;
                  return (
                    <Link
                      key={stateData.state}
                      href={linkHref}
                      className="group flex items-center justify-between px-3 py-2 rounded-lg border-2 border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all"
                    >
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                        {stateData.stateFullName || stateData.state}
                      </span>
                      <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {stateData.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explore Other Specialty Salaries */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border-2 border-purple-200 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">
                Explore Other Specialty Salaries
              </h2>
              <span className="text-sm text-gray-600">
                ({getAllSpecialtiesWithSlugs().filter(s => s.name.toLowerCase() !== specialtyName?.toLowerCase()).length} specialties)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {getAllSpecialtiesWithSlugs()
                .filter(s => s.name.toLowerCase() !== specialtyName?.toLowerCase())
                .map((spec) => (
                  <Link
                    key={spec.slug}
                    href={`/jobs/nursing/specialty/${spec.slug}/salary`}
                    className="group flex items-center justify-center px-3 py-2 rounded-lg border-2 border-purple-300 bg-white hover:border-purple-500 hover:bg-purple-50 hover:shadow-md transition-all text-center"
                  >
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                      {spec.name}
                    </span>
                  </Link>
                ))}
            </div>
          </div>

          {/* Main Job Calculator Link */}
          <div className="text-center py-8">
            <Link
              href="/jobs/nursing/rn-salary-calculator"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 10-2 0v.01a1 1 0 102 0V9z" clipRule="evenodd" />
              </svg>
              Use our RN Salary Calculator to estimate your earnings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
