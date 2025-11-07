import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../../lib/utils/jobCardUtils';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../lib/seo/jobSEO');
const { getStateFullName, normalizeState, normalizeCity } = require('../../../../lib/jobScraperUtils');
const { detectStateFromSlug, fetchCityJobs } = require('../../../../lib/services/jobPageData');

/**
 * Server-Side Rendering: Fetch data before rendering
 */
export async function getServerSideProps({ params, query }) {
  const { slug, city } = params;
  const page = query.page || '1';

  try {
    // Validate that slug is a valid state
    const stateInfo = detectStateFromSlug(slug);
    
    if (!stateInfo) {
      return {
        notFound: true
      };
    }

    // Fetch city jobs
    const result = await fetchCityJobs(stateInfo.stateCode, city, page);
    
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

export default function CityJobPage({
  stateCode,
  stateFullName,
  cityName,
  jobs = [],
  pagination = null,
  stats = null
}) {
  const router = useRouter();
  const { slug, city } = router.query || {};

  // Handle page change
  const handlePageChange = (newPage) => {
    router.push(`/jobs/nursing/${slug}/${city}?page=${newPage}`);
  };

  // Use props values (server-side rendered)
  const stateDisplayName = stateFullName || getStateFullName(stateCode) || stateCode || '';
  const cityDisplayName = cityName || normalizeCity(city?.replace(/-/g, ' ') || '') || city || '';

  // Generate SEO meta tags
  const seoMeta = cityDisplayName && stateCode && stateFullName
    ? seoUtils.generateCityPageMetaTags(
        stateCode,
        stateFullName,
        cityDisplayName,
        {
          total: pagination?.total || 0,
          specialties: stats?.specialties || []
        }
      )
    : {
        title: `RN Jobs in ${cityDisplayName}, ${stateDisplayName} | IntelliResume`,
        description: `Find Registered Nurse (RN) jobs in ${cityDisplayName}, ${stateDisplayName}`,
        keywords: 'rn jobs, nursing jobs, registered nurse',
        canonicalUrl: `https://intelliresume.net/jobs/nursing/${slug?.toLowerCase() || ''}/${city?.toLowerCase() || ''}`,
        ogImage: 'https://intelliresume.net/og-image-jobs.png'
      };

  // Error state (no jobs found)
  if (jobs.length === 0 && !pagination) {
    return (
      <>
        <Head>
          <title>Error | IntelliResume</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
          <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Jobs Found</h1>
          <p className="text-gray-600 mb-6">No jobs found for this location.</p>
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
        <link rel="canonical" href={seoMeta.canonicalUrl} />
        
        {/* Robots - INDEX THIS PAGE */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:image" content={seoMeta.ogImage} />
        <meta property="og:site_name" content="IntelliResume" />
        
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
                  "name": stateDisplayName,
                  "item": `https://intelliresume.net/jobs/nursing/${slug?.toLowerCase() || ''}`
                },
                {
                  "@type": "ListItem",
                  "position": 4,
                  "name": cityDisplayName,
                  "item": seoMeta.canonicalUrl
                }
              ]
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
            <Link href={`/jobs/nursing/${slug?.toLowerCase() || ''}`} className="hover:text-blue-600 transition-colors">{stateDisplayName}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{cityDisplayName}</span>
          </nav>

          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              RN Jobs in {cityDisplayName}, {stateDisplayName}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {pagination?.total > 0 ? (
                <>
                  {cityDisplayName}, {stateDisplayName} has <strong>{pagination.total}</strong> Registered Nurse (RN) job{pagination.total === 1 ? '' : 's'} available
                  {stats?.specialties && stats.specialties.length > 0 ? (
                    <> across <strong>{stats.specialties.length}</strong> {stats.specialties.length === 1 ? 'specialty' : 'specialties'}</>
                  ) : null}
                  {stats?.specialties && stats.specialties.length > 0 ? (
                    <> including {stats.specialties.slice(0, 3).map(s => s.specialty).join(', ')}{stats.specialties.length > 3 ? ` and ${stats.specialties.length - 3} more` : ''}</>
                  ) : (
                    <> including ICU, ER, Travel, and other specialties</>
                  )}
                  . Browse nursing positions at top healthcare employers. Apply today!
                </>
              ) : (
                <>Find Registered Nurse (RN) positions in {cityDisplayName}, {stateDisplayName}. Browse ICU, ER, Travel, and other nursing specialties at top healthcare employers. Apply today!</>
              )}
            </p>
            {pagination && pagination.total > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{pagination.total} {pagination.total === 1 ? 'job' : 'jobs'} available in {cityDisplayName}</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {stats.specialties && stats.specialties.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Specialties</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.specialties.slice(0, 5).map((spec, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-1"
                      >
                        <span className="text-gray-900 font-medium">{spec.specialty}</span>
                        <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{spec.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stats.employers && stats.employers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
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
                          className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-green-600 font-medium">{emp.employer?.name || 'Unknown'}</span>
                          <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                        </Link>
                      ) : (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-1"
                        >
                          <span className="text-gray-900 font-medium">{emp.employer?.name || 'Unknown'}</span>
                          <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found in {cityDisplayName}</h3>
              <Link href={`/jobs/nursing/${slug?.toLowerCase() || ''}`} className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                View Jobs in {stateDisplayName}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8">
                {jobs.map((jobItem) => (
                  <Link
                    key={jobItem.id}
                    href={`/jobs/nursing/${jobItem.slug}`}
                    className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                        {jobItem.title}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-3 flex-wrap">
                        <span>{jobItem.city}, {jobItem.state}</span>
                        {jobItem.employer && <span>• {jobItem.employer.name}</span>}
                        {formatPayForCard(jobItem.salaryMin, jobItem.salaryMax, jobItem.salaryType) && (
                          <span className="text-green-700 font-medium">
                            • {formatPayForCard(jobItem.salaryMin, jobItem.salaryMax, jobItem.salaryType)}
                          </span>
                        )}
                      </div>
                      {/* Tags: Specialty, Job Type, Experience Level */}
                      <div className="flex flex-wrap items-center gap-2">
                        {jobItem.specialty && (
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {jobItem.specialty}
                          </span>
                        )}
                        {jobItem.jobType && (
                          <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            {jobItem.jobType === 'prn' ? 'PRN' : jobItem.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                          </span>
                        )}
                        {jobItem.shiftType && (
                          <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                            {jobItem.shiftType}
                          </span>
                        )}
                        {jobItem.experienceLevel && (
                          <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
                            {jobItem.experienceLevel.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
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

          {/* Salary Information Link - Internal linking for SEO */}
          <div className="mt-12 mb-8">
            <Link
              href={`/jobs/nursing/${slug?.toLowerCase() || ''}/${city?.toLowerCase() || ''}/salary`}
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
                    Average RN Salary in {cityDisplayName}, {stateDisplayName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">View salary ranges, averages by specialty, and employer breakdowns</p>
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

          {/* Browse RN Jobs by State Section - Shows all states for navigation */}
          {stats?.allStates && stats.allStates.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse RN Jobs by State</h2>
                <p className="text-gray-600">Find Registered Nurse positions in {stats.allStates.length} {stats.allStates.length === 1 ? 'state' : 'states'} across the United States</p>
              </div>
              {/* Multi-column layout for states - more compact than grid, handles 50 states gracefully */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.allStates.map((stateData, idx) => {
                    const stateFullName = getStateFullName(stateData.state);
                    const stateDisplay = stateFullName || stateData.state;
                    // Use state code (2 letters) for URL slug - matches state page detection logic
                    const stateSlug = stateData.state.toLowerCase();
                    
                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${stateSlug}`}
                        className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-blue-600 transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-blue-600 font-medium text-sm">{stateDisplay}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{stateData.count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

