import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import SalaryCalculatorBanner from '../../../../../components/SalaryCalculatorBanner';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../../lib/seo/jobSEO');
const { getStateFullName } = require('../../../../../lib/jobScraperUtils');
const { detectStateFromSlug, fetchCitySalaryStats, fetchStateSpecialtySalaryStats } = require('../../../../../lib/services/jobPageData');
const { formatSalary, formatSalaryRange } = require('../../../../../lib/utils/salaryStatsUtils');
const { isValidSpecialtySlug, slugToSpecialty, specialtyToSlug } = require('../../../../../lib/constants/specialties');

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
 * Server-Side Rendering: Fetch salary data before rendering
 * This handles BOTH city salary pages AND state+specialty salary pages
 */
export async function getServerSideProps({ params }) {
  const { slug, cityOrSpecialty } = params;

  // Check for legacy specialty slugs that need 301 redirect
  const redirectTo = SPECIALTY_REDIRECTS[cityOrSpecialty.toLowerCase()];
  if (redirectTo) {
    return {
      redirect: {
        destination: `/jobs/nursing/${slug}/${redirectTo}/salary`,
        permanent: true, // 301 redirect
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

    // Check if this is a specialty or a city
    const isSpecialty = isValidSpecialtySlug(cityOrSpecialty);

    if (isSpecialty) {
      // STATE + SPECIALTY SALARY PAGE (e.g., /ohio/icu/salary)
      const result = await fetchStateSpecialtySalaryStats(stateInfo.stateCode, cityOrSpecialty);
      
      if (!result) {
        return {
          notFound: true
        };
      }

      return {
        props: {
          stateCode: stateInfo.stateCode,
          stateFullName: stateInfo.stateFullName,
          specialtyName: result.specialty,
          salaryStats: result.salaryStats,
          cities: result.cities,
          allStates: result.allStates,
          isSpecialtyPage: true
        }
      };
    } else {
      // CITY SALARY PAGE (e.g., /ohio/cleveland/salary)
      const result = await fetchCitySalaryStats(stateInfo.stateCode, cityOrSpecialty);
    
    if (!result) {
      return {
        notFound: true
      };
    }

    return {
      props: {
        stateCode: stateInfo.stateCode,
        stateFullName: stateInfo.stateFullName,
        cityName: result.city,
        salaryStats: result.salaryStats,
        cities: result.cities,
          allStates: result.allStates,
          isSpecialtyPage: false
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

export default function CityOrSpecialtySalaryPage({ 
  stateCode = null,
  stateFullName = null,
  cityName = null,
  specialtyName = null,
  salaryStats = null,
  cities = [],
  allStates = [],
  isSpecialtyPage = false
}) {
  const router = useRouter();
  
  // Determine location based on page type
  const location = isSpecialtyPage 
    ? stateFullName || stateCode  // Just the state name for specialty pages
    : `${cityName}, ${stateFullName || stateCode}`;
  
  const jobCount = salaryStats?.jobCount || 0;

  // Generate SEO meta tags - pass specialty separately for better formatting
  const seoMeta = isSpecialtyPage
    ? seoUtils.generateSalaryPageMetaTags(location, 'state-specialty', salaryStats, specialtyName)
    : seoUtils.generateSalaryPageMetaTags(location, 'city', salaryStats);

  // Generate slug helpers
  const generateCitySlug = (cityName) => {
    if (!cityName) return '';
    return cityName.toLowerCase().replace(/\s+/g, '-');
  };
  

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={seoMeta.canonicalUrl} key="canonical" />
        
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
                "itemListElement": isSpecialtyPage ? [
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
                    "name": `${stateFullName || stateCode} RN Jobs`,
                    "item": `https://intelliresume.net/jobs/nursing/${stateCode.toLowerCase()}`
                  },
                  {
                    "@type": "ListItem",
                    "position": 4,
                    "name": `${specialtyName} RN Jobs in ${stateFullName || stateCode}`,
                    "item": `https://intelliresume.net/jobs/nursing/${stateCode.toLowerCase()}/${specialtyToSlug(specialtyName)}`
                  },
                  {
                    "@type": "ListItem",
                    "position": 5,
                    "name": `Average ${specialtyName} RN Salary in ${stateFullName || stateCode}`,
                    "item": seoMeta.canonicalUrl
                  }
                ] : [
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
                    "name": `${stateFullName || stateCode} RN Jobs`,
                    "item": `https://intelliresume.net/jobs/nursing/${stateCode.toLowerCase()}`
                  },
                  {
                    "@type": "ListItem",
                    "position": 4,
                    "name": `${cityName} RN Jobs`,
                    "item": `https://intelliresume.net/jobs/nursing/${stateCode.toLowerCase()}/${generateCitySlug(cityName)}`
                  },
                  {
                    "@type": "ListItem",
                    "position": 5,
                    "name": `Average RN Salary in ${location}`,
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
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              {isSpecialtyPage 
                ? `Average ${specialtyName} RN Salary in ${location}`
                : `Average RN Salary in ${location}`
              }
            </h1>
            {jobCount > 0 ? (
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                Based on {jobCount} {isSpecialtyPage ? `${specialtyName} ` : ''}job{jobCount === 1 ? '' : 's'} with salary data
                {jobCount === 1 && <span className="text-sm text-gray-500 block mt-1">*Based on limited data</span>}
              </p>
            ) : (
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                Salary data not yet available for {isSpecialtyPage ? `${specialtyName} RN positions in ` : 'this location'}
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
                        {isSpecialtyPage 
                          ? `Average Hourly ${specialtyName} RN Salary in ${location}`
                          : `Average Hourly RN Salary in ${location}`
                        }
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
                        {isSpecialtyPage 
                          ? `Average Annual ${specialtyName} RN Salary in ${location}`
                          : `Average Annual RN Salary in ${location}`
                        }
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
                        {isSpecialtyPage 
                          ? `${specialtyName} RN Salary Range in ${location}`
                          : `RN Salary Range in ${location}`
                        }
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
              <SalaryCalculatorBanner location={location} />

              {/* Breakdown Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* By Specialty - Only show on state/city pages, NOT on specialty pages */}
                {salaryStats?.bySpecialty && salaryStats.bySpecialty.length > 0 && !isSpecialtyPage && (
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Salary by Specialty in {location}</h3>
                    </div>
                    <div className="space-y-3">
                      {salaryStats.bySpecialty.map((spec, idx) => (
                        <div key={idx} className="border-b border-gray-100 pb-3 last:border-0">
                          <div className="flex justify-between items-start mb-1">
                            <Link
                              href={`/jobs/nursing/specialty/${spec.specialty.toLowerCase().replace(/\s+/g, '-')}`}
                              className="text-gray-900 font-medium hover:text-purple-600 transition-colors"
                            >
                              {spec.specialty}
                            </Link>
                            <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">
                              {spec.jobCount} jobs
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            {spec.hourly && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs text-gray-500">Hourly:</span>
                                <span className="text-lg font-bold text-purple-700">
                                  {formatSalary(spec.hourly.average, 'hourly')}
                                </span>
                              </div>
                            )}
                            {spec.hourly && spec.annual && (
                              <span className="text-gray-300">|</span>
                            )}
                            {spec.annual && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs text-gray-500">Annual:</span>
                                <span className="text-lg font-bold text-purple-700">
                                  {formatSalary(spec.annual.average, 'annual')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* By Employer */}
                {salaryStats?.byEmployer && salaryStats.byEmployer.length > 0 && (
                  <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 border border-gray-200 ${isSpecialtyPage ? 'md:col-span-2' : ''}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                        </svg>
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {isSpecialtyPage 
                          ? `${specialtyName} RN Salary by Employer in ${location}`
                          : `Salary by Employer in ${location}`
                        }
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
              </div>

              {/* Link to Jobs */}
              <div className="mb-8 text-center">
                <Link
                  href={isSpecialtyPage 
                    ? `/jobs/nursing/${stateCode.toLowerCase()}/${specialtyToSlug(specialtyName)}`
                    : `/jobs/nursing/${stateCode.toLowerCase()}/${generateCitySlug(cityName)}`
                  }
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  View {jobCount}+ {isSpecialtyPage ? `${specialtyName} ` : ''}RN Jobs in {isSpecialtyPage ? stateFullName : location}
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
                  Salary data for {location} will appear automatically once jobs with salary information are posted. 
                  We continuously update our database with the latest job postings and salary information.
                </p>
                <Link
                  href={isSpecialtyPage 
                    ? `/jobs/nursing/${stateCode.toLowerCase()}/${specialtyToSlug(specialtyName)}`
                    : `/jobs/nursing/${stateCode.toLowerCase()}/${generateCitySlug(cityName)}`
                  }
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Browse RN Jobs {isSpecialtyPage ? `for ${specialtyName} in ${stateFullName}` : `in ${location}`}
                </Link>
              </div>
            </div>
          )}

          {/* Browse Navigation */}
          <div className="space-y-6">
            {/* Browse Other Cities/Specialties */}
            {cities.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isSpecialtyPage 
                      ? `Browse ${specialtyName} RN Salary by City in ${stateFullName || stateCode}` 
                      : `Browse Salary by City in ${stateFullName || stateCode}`
                    }
                  </h2>
                  <span className="text-sm text-gray-600">({cities.length} cities)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {cities.map((cityData) => {
                    const citySlug = generateCitySlug(cityData.city);
                    const linkHref = isSpecialtyPage
                      ? `/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/${specialtyToSlug(specialtyName)}/salary`
                      : `/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/salary`;
                    return (
                      <Link
                        key={cityData.city}
                        href={linkHref}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg border-2 border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all"
                      >
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                          {cityData.city}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          {cityData.count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Browse Other States */}
            {allStates.length > 0 && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-6 border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isSpecialtyPage 
                      ? `Browse ${specialtyName} RN Salary by State`
                      : 'Browse Salary by State'
                    }
                  </h2>
                  <span className="text-sm text-gray-600">({allStates.length} states)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {allStates.map((stateData) => {
                    const stateFullNameDisplay = getStateFullName(stateData.state);
                    const stateDisplay = stateFullNameDisplay || stateData.state;
                    const stateSlug = stateData.state.toLowerCase();
                    const linkHref = isSpecialtyPage
                      ? `/jobs/nursing/${stateSlug}/${specialtyToSlug(specialtyName)}/salary`
                      : `/jobs/nursing/${stateSlug}/salary`;
                    return (
                      <Link
                        key={stateData.state}
                        href={linkHref}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg border-2 border-gray-300 bg-white hover:border-gray-500 hover:bg-gray-50 hover:shadow-md transition-all"
                      >
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          {stateDisplay}
                        </span>
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                          {stateData.count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

