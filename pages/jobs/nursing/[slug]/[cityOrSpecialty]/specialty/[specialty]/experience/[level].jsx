import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../../../../components/common/Meta';
import JobAlertSignup from '../../../../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../../../../components/StickyJobAlertCTA';
import { fetchCitySpecialtyExperienceLevelJobs } from '../../../../../../../../lib/services/jobPageData';
import { generateCitySpecialtyExperienceLevelPageMetaTags } from '../../../../../../../../lib/seo/jobSEO';
import { isValidSpecialtySlug } from '../../../../../../../../lib/constants/specialties';
import { isExperienceLevel, experienceLevelToSlug, getExperienceLevelDescription } from '../../../../../../../../lib/constants/experienceLevels';
const { getEmployerLogoPath } = require('../../../../../../../../lib/utils/employerLogos');
const { getCityDisplayName } = require('../../../../../../../../lib/utils/cityDisplayUtils');

/**
 * City + Specialty + Experience Level Page
 * Example: /jobs/nursing/oh/cleveland/specialty/icu/experience/new-grad
 */
export async function getServerSideProps({ params, query }) {
  const { slug: stateCode, cityOrSpecialty: citySlug, specialty: specialtySlug, level: levelSlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    if (!isValidSpecialtySlug(specialtySlug)) {
      return { notFound: true };
    }

    if (!isExperienceLevel(levelSlug)) {
      return { notFound: true };
    }

    // Handle experience level redirect if needed
    const normalizedLevel = experienceLevelToSlug(levelSlug);
    if (normalizedLevel && normalizedLevel !== levelSlug) {
      return {
        redirect: {
          destination: `/jobs/nursing/${stateCode}/${citySlug}/specialty/${specialtySlug}/experience/${normalizedLevel}`,
          permanent: true
        }
      };
    }

    const result = await fetchCitySpecialtyExperienceLevelJobs(stateCode, citySlug, specialtySlug, levelSlug, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateCitySpecialtyExperienceLevelPageMetaTags(
      result.stateCode,
      result.stateFullName,
      result.city,
      result.specialty,
      result.specialtySlug,
      result.experienceLevel,
      result.experienceLevelSlug,
      result.totalJobs,
      result.maxHourlyRate
    );

    return {
      props: {
        stateCode: result.stateCode,
        stateFullName: result.stateFullName,
        city: result.city,
        citySlug: result.citySlug,
        specialty: result.specialty,
        specialtySlug: result.specialtySlug,
        experienceLevel: result.experienceLevel,
        levelSlug: result.experienceLevelSlug,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        maxHourlyRate: result.maxHourlyRate,
        stats: result.stats,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching city specialty experience level jobs:', error);
    return { notFound: true };
  }
}

export default function CitySpecialtyExperienceLevelPage({
  stateCode,
  stateFullName,
  city,
  citySlug,
  specialty,
  specialtySlug,
  experienceLevel,
  levelSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  maxHourlyRate,
  stats,
  seoMeta
}) {
  const formatSalary = (minHourly, maxHourly, minAnnual, maxAnnual) => {
    if (minHourly && maxHourly) {
      return `$${minHourly.toFixed(2)} - $${maxHourly.toFixed(2)}/hr`;
    } else if (minAnnual && maxAnnual) {
      return `$${(minAnnual / 1000).toFixed(0)}k - $${(maxAnnual / 1000).toFixed(0)}k/yr`;
    }
    return null;
  };

  const levelDescription = getExperienceLevelDescription(levelSlug);

  // SEO-optimized city name for H1 (drops state, handles NYC)
  const cityDisplay = getCityDisplayName(city, stateCode);

  return (
    <>
      <Meta {...seoMeta} />

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${stateCode.toLowerCase()}`} className="hover:text-blue-600 transition-colors">{stateFullName}</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}`} className="hover:text-blue-600 transition-colors">{city}</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}`} className="hover:text-blue-600 transition-colors">{specialty}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{experienceLevel}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              {experienceLevel} {specialty} RN Jobs in {cityDisplay}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> {experienceLevel.toLowerCase()} {specialty} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} in {city}, {stateFullName}
                  {stats?.employers && stats.employers.length > 0 && (
                    <> at <strong>{stats.employers.length}</strong> healthcare {stats.employers.length === 1 ? 'employer' : 'employers'}
                      {stats.employers.length > 0 && (
                        <> including {stats.employers.slice(0, 3).map(e => e.name).join(', ')}
                          {stats.employers.length > 3 && <> and {stats.employers.length - 3} more</>}
                        </>
                      )}
                    </>
                  )}
                  . Apply today!
                </>
              ) : (
                <>Browse {experienceLevel.toLowerCase()} {specialty.toLowerCase()} nursing opportunities in {city}, {stateFullName}.</>
              )}
            </p>
            {levelDescription && (
              <p className="text-base text-gray-500 mb-4">{levelDescription}</p>
            )}
            {totalJobs > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{totalJobs.toLocaleString()} {totalJobs === 1 ? 'job' : 'jobs'} available</span>
              </div>
            )}
          </div>

          {/* Stats Card - Top Employers */}
          {stats?.employers && stats.employers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Employers</h3>
                </div>
                <div className="space-y-3">
                  {stats.employers.slice(0, 5).map((emp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${emp.slug}/${specialtySlug}`}
                      className="flex justify-between items-center group hover:text-orange-600 transition-colors py-1"
                    >
                      <span className="text-gray-900 group-hover:text-orange-600 font-medium">{emp.name}</span>
                      <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Job Listings */}
          {jobs.length > 0 ? (
            <div className="space-y-4 mb-8">
              {jobs.map((job, index) => {
                const salary = formatSalary(
                  job.salaryMinHourly,
                  job.salaryMaxHourly,
                  job.salaryMinAnnual,
                  job.salaryMaxAnnual
                );

                return (
                  <React.Fragment key={job.id}>
                    <Link
                      href={`/jobs/nursing/${job.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-teal-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 flex gap-4">
                        {job.employer && getEmployerLogoPath(job.employer.slug) && (
                          <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                            <img
                              src={getEmployerLogoPath(job.employer.slug)}
                              alt={`${job.employer.name} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-teal-600 transition-colors mb-1.5 line-clamp-2">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 flex-wrap">
                            {job.employer && (
                              <span className="font-medium text-gray-900">{job.employer.name}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {job.city}, {job.state}
                            </span>
                            {salary && (
                              <span className="text-green-700 font-medium">• {salary}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                                {job.jobType}
                              </span>
                            )}
                            {job.shiftType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                                {job.shiftType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {(index + 1) % 5 === 0 && index < jobs.length - 1 && (
                      <div className="my-6">
                        <JobAlertSignup compact={true} specialty={specialty} state={stateCode} />
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
                No {experienceLevel} {specialty} RN Jobs in {city}
              </h2>
              <p className="text-gray-600 mb-6">
                New positions are added regularly. Check back soon or explore other options.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
                >
                  View All {specialty} Jobs in {city}
                </Link>
                <Link
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/experience/${levelSlug}`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  View All {experienceLevel} Jobs in {city}
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}/experience/${levelSlug}?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}/experience/${levelSlug}?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Top Employers */}
          {stats?.employers && stats.employers.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Top Employers Hiring {experienceLevel} {specialty} RNs in {city}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
                  {stats.employers.map((emp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${emp.slug}/${specialtySlug}`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-green-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-green-600 font-medium text-sm">{emp.name}</span>
                      <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{emp.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Job Types */}
          {stats?.jobTypes && stats.jobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {experienceLevel} {specialty} RN Jobs by Type in {city}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.jobTypes.map((jt, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}/${jt.slug}`}
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

          {/* Footer: Other Experience Levels */}
          {stats?.otherExperienceLevels && stats.otherExperienceLevels.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other {specialty} RN Experience Levels in {city}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.otherExperienceLevels.map((exp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}/experience/${exp.slug}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-teal-50 rounded-lg group transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-teal-600 font-medium">{exp.displayName}</span>
                      <span className="text-teal-600 font-semibold bg-teal-100 px-2 py-0.5 rounded-full text-xs">{exp.count}</span>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other {experienceLevel} RN Specialties in {city}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherSpecialties.map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${spec.slug}/experience/${levelSlug}`}
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

          <StickyJobAlertCTA specialty={`${experienceLevel} ${specialty}`} location={`${city}, ${stateCode}`} />
        </div>
      </div>
    </>
  );
}
