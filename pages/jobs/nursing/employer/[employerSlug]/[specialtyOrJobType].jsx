import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Meta from '../../../../../components/common/Meta';
import JobAlertSignup from '../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../components/StickyJobAlertCTA';
import { fetchEmployerSpecialtyJobs, fetchEmployerJobTypeJobs } from '../../../../../lib/services/jobPageData';
import { generateEmployerSpecialtyPageMetaTags, generateEmployerJobTypePageMetaTags } from '../../../../../lib/seo/jobSEO';
import { normalizeExperienceLevel } from '../../../../../lib/utils/experienceLevelUtils';
import { isJobType } from '../../../../../lib/constants/jobTypes';
import { specialtyToSlug, normalizeSpecialty } from '../../../../../lib/constants/specialties';
import { formatSalaryForCard } from '../../../../../lib/utils/jobCardUtils';
const { getEmployerLogoPath } = require('../../../../../lib/utils/employerLogos');
const { getStateFullName } = require('../../../../../lib/jobScraperUtils');

export async function getServerSideProps({ params, query }) {
  const { employerSlug, specialtyOrJobType: slug } = params;
  const page = parseInt(query.page) || 1;

  try {
    // Detect if this is a job type or specialty
    const isJobTypePage = isJobType(slug);
    
    let result, seoMeta, pageType;
    
    if (isJobTypePage) {
      // Fetch job type data
      result = await fetchEmployerJobTypeJobs(employerSlug, slug, page);

      if (!result || !result.employer) {
        return { notFound: true };
      }

      // Redirect to canonical URL if slug doesn't match (e.g., /prn -> /per-diem)
      if (slug !== result.jobTypeSlug) {
        const pageQuery = page > 1 ? `?page=${page}` : '';
        return {
          redirect: {
            destination: `/jobs/nursing/employer/${employerSlug}/${result.jobTypeSlug}${pageQuery}`,
            permanent: true
          }
        };
      }

      seoMeta = generateEmployerJobTypePageMetaTags(
        result.employer.name,
        result.employer.slug,
        result.jobType,
        result.jobTypeSlug,
        result.totalJobs,
        result.maxHourlyRate
      );

      pageType = 'jobType';
    } else {
      // Fetch specialty data
      result = await fetchEmployerSpecialtyJobs(employerSlug, slug, page);

      if (!result || !result.employer) {
        return { notFound: true };
      }

      seoMeta = generateEmployerSpecialtyPageMetaTags(
        result.employer.name,
        result.employer.slug,
        result.specialty,
        slug,
        result.totalJobs,
        result.maxHourlyRate
      );

      pageType = 'specialty';
    }

    return {
      props: {
        pageType,
        employer: JSON.parse(JSON.stringify(result.employer)),
        specialty: result.specialty || null,
        specialtySlug: pageType === 'specialty' ? slug : null,
        jobType: result.jobType || null,
        jobTypeSlug: result.jobTypeSlug || null,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching employer specialty/jobType jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerSpecialtyOrJobTypePage({
  pageType,
  employer,
  specialty,
  specialtySlug,
  jobType,
  jobTypeSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  stats,
  seoMeta
}) {
  // Determine display values based on page type
  const isJobTypePage = pageType === 'jobType';
  const displayCategory = isJobTypePage ? jobType : specialty;
  const categorySlug = isJobTypePage ? jobTypeSlug : specialtySlug;
  // Use shared utility for salary formatting (respects salaryType for consistency)

  const generateCitySlug = (city) => {
    if (!city) return '';
    return city.toLowerCase().replace(/\s+/g, '-');
  };


  return (
    <>
      <Meta {...seoMeta} />

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/employer/${employer.slug}`} className="hover:text-blue-600 transition-colors">{employer.name}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{displayCategory}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              {employer.name} {displayCategory} RN Jobs
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> {displayCategory} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} at {employer.name}
                  {isJobTypePage && stats?.states && stats.states.length > 0 && (
                    <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}
                      {stats.states.length > 0 && (
                        <> including {stats.states.slice(0, 3).map(s => getStateFullName(s.state) || s.state).join(', ')}
                          {stats.states.length > 3 && <> and {stats.states.length - 3} more</>}
                        </>
                      )}
                    </>
                  )}
                  {!isJobTypePage && stats?.cities && stats.cities.length > 0 && (
                    <> in <strong>{stats.cities.length}</strong> {stats.cities.length === 1 ? 'city' : 'cities'}
                      {stats.cities.length > 0 && (
                        <> including {stats.cities.slice(0, 3).map(c => c.city).join(', ')}
                          {stats.cities.length > 3 && <> and {stats.cities.length - 3} more</>}
                        </>
                      )}
                    </>
                  )}
                  . {isJobTypePage && stats?.specialties && stats.specialties.length > 0 && (
                    <>Browse specialties like {stats.specialties.slice(0, 3).map(s => s.specialty).join(', ')}{stats.specialties.length > 3 ? ' and more' : ''}. </>
                  )}
                  {!isJobTypePage && stats?.jobTypes && stats.jobTypes.length > 0 && (
                    <>Available as {stats.jobTypes.slice(0, 3).map(jt => jt.displayName).join(', ')}{stats.jobTypes.length > 3 ? ' and more' : ''}. </>
                  )}
                  Apply today!
                </>
              ) : (
                <>Browse {displayCategory.toLowerCase()} nursing opportunities at {employer.name}.</>
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
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* For Job Type pages: States/Cities Card */}
              {isJobTypePage && stats.states && stats.states.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Locations</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.states.slice(0, 5).map((s, idx) => {
                      const stateDisplay = getStateFullName(s.state) || s.state;
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/${s.state.toLowerCase()}/job-type/${jobTypeSlug}`}
                          className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-green-600 font-medium">{stateDisplay}</span>
                          <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{s.count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* For Specialty pages: Cities Card */}
              {!isJobTypePage && stats.cities && stats.cities.length > 0 && (
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
                    {stats.cities.slice(0, 5).map((c, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${c.state?.toLowerCase() || 'oh'}/${generateCitySlug(c.city)}/${specialtySlug}`}
                        className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-green-600 font-medium">{c.city}{c.state ? `, ${c.state}` : ''}</span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{c.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* For Job Type pages: Specialties Card */}
              {isJobTypePage && stats.specialties && stats.specialties.length > 0 && (
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
                    {stats.specialties.slice(0, 5).map((spec, idx) => {
                      const specSlug = specialtyToSlug(normalizeSpecialty(spec.specialty));
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/employer/${employer.slug}/${specSlug}/${jobTypeSlug}`}
                          className="flex justify-between items-center group hover:text-purple-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-purple-600 font-medium">{spec.specialty}</span>
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{spec.count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* For Specialty pages: Job Types Card */}
              {!isJobTypePage && stats.jobTypes && stats.jobTypes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Types</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.jobTypes.slice(0, 5).map((jt, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/employer/${employer.slug}/${specialtySlug}/${jt.slug}`}
                        className="flex justify-between items-center group hover:text-orange-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-orange-600 font-medium">{jt.displayName}</span>
                        <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full text-xs">{jt.count}</span>
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
                const salary = formatSalaryForCard(
                  job.salaryMinHourly,
                  job.salaryMaxHourly,
                  job.salaryMinAnnual,
                  job.salaryMaxAnnual,
                  job.salaryType
                );

                return (
                  <React.Fragment key={job.id}>
                    <Link
                      href={`/jobs/nursing/${job.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 flex gap-4">
                        {/* Employer logo on left */}
                        {employer && getEmployerLogoPath(employer.slug) && (
                          <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                            <img
                              src={getEmployerLogoPath(employer.slug)}
                              alt={`${employer.name} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}

                        {/* Job content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1.5 line-clamp-2">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              {job.workArrangement === 'remote' ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                  </svg>
                                  Remote{job.state && <span className="text-gray-400"> ({job.state})</span>}
                                </>
                              ) : job.workArrangement === 'hybrid' ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                  </svg>
                                  Hybrid - {job.city}, {job.state}
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  {job.city}, {job.state}
                                </>
                              )}
                            </span>
                            {salary && (
                              <span className="text-green-700 font-medium">
                                • {salary}
                              </span>
                            )}
                          </div>
                          {/* Tags: Job Type, Shift, Experience Level */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {job.jobType === 'prn' ? 'PRN' : job.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
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
                  
                    {/* Job Alert Signup after every 5 listings */}
                    {(index + 1) % 5 === 0 && index < jobs.length - 1 && (
                      <div className="my-6">
                        <JobAlertSignup 
                          specialty={pageType === 'specialty' ? specialty : ''}
                          compact={true}
                        />
                      </div>
                    )}
                </React.Fragment>
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
                No {displayCategory} RN Jobs Currently Available at {employer.name}
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
                  href={isJobTypePage ? `/jobs/nursing` : `/jobs/nursing/specialty/${categorySlug}`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  {isJobTypePage ? 'Browse All RN Jobs' : `View All ${displayCategory} Jobs`}
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/employer/${employer.slug}/${categorySlug}?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/employer/${employer.slug}/${categorySlug}?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Other Job Types (for job type pages - excludes current job type) */}
          {isJobTypePage && stats?.otherJobTypes && stats.otherJobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other Job Types at {employer.name}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.otherJobTypes.length} other job {stats.otherJobTypes.length === 1 ? 'type' : 'types'} available at {employer.name}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherJobTypes.map((jt, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employer.slug}/${jt.slug}`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-green-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-green-600 font-medium text-sm">{jt.displayName}</span>
                      <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{jt.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Browse by Job Type (for specialty pages - shows all job types) */}
          {!isJobTypePage && stats?.jobTypes && stats.jobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Browse {specialty} RN Jobs by Type at {employer.name}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.jobTypes.length} {specialty.toLowerCase()} job {stats.jobTypes.length === 1 ? 'type' : 'types'} available at {employer.name}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.jobTypes.map((jt, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employer.slug}/${specialtySlug}/${jt.slug}`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-green-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-green-600 font-medium text-sm">{jt.displayName}</span>
                      <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{jt.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Other Specialties (for specialty pages) */}
          {!isJobTypePage && stats?.otherSpecialties && stats.otherSpecialties.length > 0 && (
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
                    const specSlug = specialtyToSlug(normalizeSpecialty(spec.specialty));

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

          {/* Footer: Specialties (for job type pages only) */}
          {isJobTypePage && stats?.specialties && stats.specialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Browse Specialties at {employer.name}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.specialties.length} nursing {stats.specialties.length === 1 ? 'specialty' : 'specialties'} available at {employer.name}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.specialties.map((spec, idx) => {
                    const specSlug = specialtyToSlug(normalizeSpecialty(spec.specialty));

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

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" data-job-alert-form>
            <JobAlertSignup 
              specialty={pageType === 'specialty' ? specialty : ''}
            />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA 
            specialty={pageType === 'specialty' ? specialty : ''}
            location={`at ${employer.name}`}
          />
        </div>
      </div>
    </>
  );
}

