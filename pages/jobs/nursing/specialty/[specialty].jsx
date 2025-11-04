import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../../lib/utils/jobCardUtils';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../../lib/seo/jobSEO');
const { getStateFullName } = require('../../../../lib/jobScraperUtils');
const { fetchSpecialtyJobs } = require('../../../../lib/services/jobPageData');

/**
 * Server-Side Rendering: Fetch data before rendering
 */
export async function getServerSideProps({ params, query }) {
  const { specialty } = params;
  const page = query.page || '1';

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
  const seoMeta = specialtyDisplayName
    ? seoUtils.generateSpecialtyPageMetaTags(
        specialtyDisplayName,
        {
          total: pagination?.total || 0,
          specialties: []
        }
      )
    : {
        title: `${specialtyDisplayName} RN Jobs | IntelliResume`,
        description: `Find Registered Nurse (RN) jobs for ${specialtyDisplayName}`,
        keywords: 'rn jobs, nursing jobs, registered nurse',
        canonicalUrl: `https://intelliresume.net/jobs/nursing/specialty/${specialty?.toLowerCase() || ''}`,
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
                  "name": specialtyDisplayName,
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
                  Find <strong>{pagination.total}</strong> {specialtyDisplayName} Registered Nurse (RN) job{pagination.total === 1 ? '' : 's'} available
                  {stats?.states && stats.states.length > 0 ? (
                    <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}</>
                  ) : null}
                  {stats?.cities && stats.cities.length > 0 ? (
                    <> in <strong>{stats.cities.length}</strong> {stats.cities.length === 1 ? 'city' : 'cities'}</>
                  ) : null}
                  . Browse {specialtyDisplayName.toLowerCase()} nursing positions at top healthcare employers
                  {stats?.employers && stats.employers.length > 0 ? (
                    <> including {stats.employers.slice(0, 3).map(e => e.employer?.name || 'Employer').join(', ')}{stats.employers.length > 3 ? ` and ${stats.employers.length - 3} more` : ''}</>
                  ) : null}
                  . Apply today!
                </>
              ) : (
                <>Find {specialtyDisplayName} Registered Nurse (RN) positions nationwide. Browse {specialtyDisplayName.toLowerCase()} nursing jobs at top healthcare employers. Apply today!</>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                          href={`/jobs/nursing/${stateData.state.toLowerCase()}`}
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
              {stats.cities && stats.cities.length > 0 && (
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
                      const stateSlug = cityData.state.toLowerCase();
                      const citySlug = cityData.city.toLowerCase().replace(/\s+/g, '-');
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${stateSlug}/${citySlug}`}
                          className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-green-600 font-medium">{cityData.city}, {cityData.state}</span>
                          <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{cityData.count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {stats.employers && stats.employers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
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
                          className="flex justify-between items-center group hover:text-purple-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-purple-600 font-medium">{emp.employer?.name || 'Unknown'}</span>
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                        </Link>
                      ) : (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-1"
                        >
                          <span className="text-gray-900 font-medium">{emp.employer?.name || 'Unknown'}</span>
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
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
                      {/* Tags: Job Type, Experience Level */}
                      <div className="flex flex-wrap items-center gap-2">
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
                    const specialtySlug = specData.specialty.toLowerCase().replace(/\s+/g, '-');
                    
                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/specialty/${specialtySlug}`}
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
        </div>
      </div>
    </>
  );
}

