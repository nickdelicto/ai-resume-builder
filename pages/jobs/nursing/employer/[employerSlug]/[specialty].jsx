import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Meta from '../../../../../components/common/Meta';
import { fetchEmployerSpecialtyJobs } from '../../../../../lib/services/jobPageData';
import { generateEmployerSpecialtyPageMetaTags } from '../../../../../lib/seo/jobSEO';
import { normalizeExperienceLevel } from '../../../../../lib/utils/experienceLevelUtils';

export async function getServerSideProps({ params, query }) {
  const { employerSlug, specialty: specialtySlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    const result = await fetchEmployerSpecialtyJobs(employerSlug, specialtySlug, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateEmployerSpecialtyPageMetaTags(
      result.employer.name,
      result.employer.slug,
      result.specialty,
      specialtySlug,
      result.totalCount
    );

    return {
      props: {
        employer: JSON.parse(JSON.stringify(result.employer)),
        specialty: result.specialty,
        specialtySlug,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching employer specialty jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerSpecialtyPage({
  employer,
  specialty,
  specialtySlug,
  jobs,
  totalCount,
  totalPages,
  currentPage,
  stats,
  seoMeta
}) {
  // Format salary for job card
  const formatSalary = (minHourly, maxHourly, minAnnual, maxAnnual, salaryType) => {
    if (minHourly && maxHourly) {
      return `$${minHourly.toFixed(2)} - $${maxHourly.toFixed(2)}/hr`;
    } else if (minAnnual && maxAnnual) {
      return `$${(minAnnual / 1000).toFixed(0)}k - $${(maxAnnual / 1000).toFixed(0)}k/yr`;
    }
    return null;
  };

  const generateCitySlug = (city) => {
    if (!city) return '';
    return city.toLowerCase().replace(/\s+/g, '-');
  };

  const generateSpecialtySlug = (specialty) => {
    if (!specialty) return '';
    return specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
  };

  return (
    <>
      <Meta {...seoMeta} />

      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center space-x-2 text-gray-600">
              <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
              <li><span className="mx-2">/</span></li>
              <li><Link href="/jobs/nursing" className="hover:text-blue-600">RN Jobs</Link></li>
              <li><span className="mx-2">/</span></li>
              <li><Link href="/jobs/nursing" className="hover:text-blue-600">Employers</Link></li>
              <li><span className="mx-2">/</span></li>
              <li><Link href={`/jobs/nursing/employer/${employer.slug}`} className="hover:text-blue-600">{employer.name}</Link></li>
              <li><span className="mx-2">/</span></li>
              <li className="text-gray-900 font-medium">{specialty}</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              {employer.name} {specialty} RN Jobs
            </h1>
            <p className="text-xl text-gray-600">
              {totalCount} {specialty} registered nurse {totalCount === 1 ? 'position' : 'positions'} available
            </p>
          </div>

          {/* Job Listings */}
          {jobs.length > 0 ? (
            <div className="space-y-4 mb-8">
              {jobs.map((job) => {
                const salary = formatSalary(
                  job.salaryMinHourly,
                  job.salaryMaxHourly,
                  job.salaryMinAnnual,
                  job.salaryMaxAnnual,
                  job.salaryType
                );

                return (
                  <Link
                    key={job.id}
                    href={`/jobs/nursing/${job.slug}`}
                    className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
                          {job.title}
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {job.city}, {job.state}
                          </span>
                          
                          {salary && (
                            <span className="flex items-center gap-1 text-green-600 font-semibold">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                              </svg>
                              {salary}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {job.jobType && (
                            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {job.jobType}
                            </span>
                          )}
                          {job.shiftType && (
                            <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                              {job.shiftType}
                            </span>
                          )}
                          {job.experienceLevel && (
                            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {normalizeExperienceLevel(job.experienceLevel)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-blue-600 font-semibold">
                        View Details
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No {specialty} RN Jobs Currently Available at {employer.name}
              </h2>
              <p className="text-gray-600 mb-6">
                New positions are added regularly. Check back soon or explore other opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={`/jobs/nursing/employer/${employer.slug}`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  View All Jobs at {employer.name}
                </Link>
                <Link
                  href={`/jobs/nursing/specialty/${specialtySlug}`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  View All {specialty} Jobs
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/employer/${employer.slug}/${specialtySlug}?page=${currentPage - 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Previous
                </Link>
              )}
              
              <span className="px-4 py-2 text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              {currentPage < totalPages && (
                <Link
                  href={`/jobs/nursing/employer/${employer.slug}/${specialtySlug}?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Other Specialties at This Employer */}
          {stats?.otherSpecialties && stats.otherSpecialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other Nursing Specialties at {employer.name}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.otherSpecialties.length} other nursing {stats.otherSpecialties.length === 1 ? 'specialty' : 'specialties'} available at {employer.name}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherSpecialties.map((spec, idx) => {
                    const specSlug = generateSpecialtySlug(spec.specialty);
                    
                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/employer/${employer.slug}/${specSlug}`}
                        className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-purple-600 transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-purple-600 font-medium text-sm">{spec.specialty}</span>
                        <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{spec.count}</span>
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

