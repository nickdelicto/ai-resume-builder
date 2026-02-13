import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../../components/common/Meta';
import JobAlertSignup from '../../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../../components/StickyJobAlertCTA';
import { fetchEmployerExperienceLevelJobs } from '../../../../../../lib/services/jobPageData';
import { generateEmployerExperienceLevelPageMetaTags } from '../../../../../../lib/seo/jobSEO';
import { isExperienceLevel, getExperienceLevelDescription } from '../../../../../../lib/constants/experienceLevels';
import { specialtyToSlug, normalizeSpecialty } from '../../../../../../lib/constants/specialties';
import { formatSalaryForCard } from '../../../../../../lib/utils/jobCardUtils';
import SoftZeroContent from '../../../../../../components/jobs/SoftZeroContent';
const { getEmployerLogoPath } = require('../../../../../../lib/utils/employerLogos');
const { getStateFullName } = require('../../../../../../lib/jobScraperUtils');

export async function getServerSideProps({ params, query }) {
  const { employerSlug, level: levelSlug } = params;
  const page = parseInt(query.page) || 1;

  // Validate experience level
  if (!isExperienceLevel(levelSlug)) {
    return { notFound: true };
  }

  try {
    const result = await fetchEmployerExperienceLevelJobs(employerSlug, levelSlug, page);

    if (!result || !result.employer) {
      return { notFound: true };
    }

    const seoMeta = generateEmployerExperienceLevelPageMetaTags(
      result.employer.name,
      result.employer.slug,
      result.experienceLevel,
      result.experienceLevelSlug,
      result.totalJobs,
      result.maxHourlyRate
    );

    return {
      props: {
        employer: JSON.parse(JSON.stringify(result.employer)),
        experienceLevel: result.experienceLevel,
        levelSlug: result.experienceLevelSlug,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching employer experience level jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerExperienceLevelPage({
  employer,
  experienceLevel,
  levelSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  stats,
  seoMeta
}) {

  const levelDescription = getExperienceLevelDescription(levelSlug);

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
            <span className="text-gray-900 font-medium">{experienceLevel} Jobs</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              {employer.name} {experienceLevel} RN Jobs
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> {experienceLevel} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} at {employer.name}
                  {stats?.states && stats.states.length > 0 && (
                    <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}
                      {stats.states.length > 0 && (
                        <> including {stats.states.slice(0, 3).map(s => getStateFullName(s.state) || s.state).join(', ')}
                          {stats.states.length > 3 && <> and {stats.states.length - 3} more</>}
                        </>
                      )}
                    </>
                  )}
                  . {stats?.specialties && stats.specialties.length > 0 && (
                    <>Browse specialties like {stats.specialties.slice(0, 3).map(s => s.specialty).join(', ')}{stats.specialties.length > 3 ? ' and more' : ''}. </>
                  )}
                  Apply today!
                </>
              ) : (
                <>Browse {experienceLevel.toLowerCase()} nursing opportunities at {employer.name}.</>
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

          {/* Stats Cards */}
          {stats && (stats.states?.length > 0 || stats.specialties?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Top States Card */}
              {stats.states && stats.states.length > 0 && (
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
                          href={`/jobs/nursing/${s.state.toLowerCase()}/experience/${levelSlug}`}
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

              {/* Top Specialties Card */}
              {stats.specialties && stats.specialties.length > 0 && (
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
                          href={`/jobs/nursing/specialty/${specSlug}/experience/${levelSlug}`}
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
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-teal-200 overflow-hidden"
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
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-teal-600 transition-colors mb-1.5 line-clamp-2">
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
                          {/* Tags: Specialty, Job Type, Shift */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.specialty && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                {job.specialty}
                              </span>
                            )}
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

                    {/* Job Alert Signup after every 5 listings */}
                    {(index + 1) % 5 === 0 && index < jobs.length - 1 && (
                      <div className="my-6">
                        <JobAlertSignup compact={true} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <SoftZeroContent
              title={`No ${experienceLevel} RN Jobs at ${employer.name} Right Now`}
              description={`${experienceLevel} positions at ${employer.name} are updated daily.`}
              alternatives={[
                { label: `View All Jobs at ${employer.name}`, href: `/jobs/nursing/employer/${employer.slug}` },
                { label: `View All ${experienceLevel} RN Jobs`, href: `/jobs/nursing/experience/${levelSlug}` },
                { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
              ]}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/employer/${employer.slug}/experience/${levelSlug}?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/employer/${employer.slug}/experience/${levelSlug}?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Other Experience Levels */}
          {stats?.otherExperienceLevels && stats.otherExperienceLevels.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other Experience Levels at {employer.name}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.otherExperienceLevels.map((exp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employer.slug}/experience/${exp.slug}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-teal-50 rounded-lg group transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-teal-600 font-medium">{exp.displayName}</span>
                      <span className="text-teal-600 font-semibold bg-teal-100 px-2 py-0.5 rounded-full text-xs">{exp.count.toLocaleString()}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Browse by Specialty */}
          {stats?.specialties && stats.specialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {experienceLevel} Jobs by Specialty at {employer.name}
                </h2>
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
            <JobAlertSignup />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA
            specialty={experienceLevel}
            location={`at ${employer.name}`}
          />
        </div>
      </div>
    </>
  );
}
