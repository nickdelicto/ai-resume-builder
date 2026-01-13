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
import { specialtyToSlug } from '../../../../../lib/constants/specialties';
const { getEmployerLogoPath } = require('../../../../../lib/utils/employerLogos');

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
      
      seoMeta = generateEmployerJobTypePageMetaTags(
        result.employer.name,
        result.employer.slug,
        result.jobType,
        result.jobTypeSlug,
        result.totalJobs
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
        result.totalJobs
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


  return (
    <>
      <Meta {...seoMeta} />

      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
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
              <li className="text-gray-900 font-medium">{displayCategory}</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              {employer.name} {displayCategory} RN Jobs
            </h1>
            <p className="text-xl text-gray-600">
              {totalJobs} {displayCategory.toLowerCase()} registered nurse {totalJobs === 1 ? 'position' : 'positions'} available
            </p>
          </div>

          {/* Job Listings */}
          {jobs.length > 0 ? (
            <div className="space-y-4 mb-8">
              {jobs.map((job, index) => {
                const salary = formatSalary(
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {job.city}, {job.state}
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
                    const specSlug = specialtyToSlug(spec.specialty);
                    
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

          {/* Footer: Other Job Types (for job type pages) */}
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
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-blue-600 font-medium text-sm">{jt.displayName}</span>
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{jt.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Job Types (secondary footer for specialty pages, primary for job type pages with specialties) */}
          {stats?.jobTypes && stats.jobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isJobTypePage ? 'Other Job Types at' : 'Browse by Job Type at'} {employer.name}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.jobTypes.length} job {stats.jobTypes.length === 1 ? 'type' : 'types'} available at {employer.name}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.jobTypes.map((jt, idx) => (
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
                    const specSlug = specialtyToSlug(spec.specialty);
                    
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

