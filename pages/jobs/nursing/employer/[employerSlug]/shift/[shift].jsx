import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../../components/common/Meta';
import JobAlertSignup from '../../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../../components/StickyJobAlertCTA';
import { fetchEmployerShiftJobs } from '../../../../../../lib/services/jobPageData';
import { generateEmployerShiftPageMetaTags } from '../../../../../../lib/seo/jobSEO';
import { normalizeExperienceLevel } from '../../../../../../lib/utils/experienceLevelUtils';
import { formatSalaryForCard } from '../../../../../../lib/utils/jobCardUtils';
import SoftZeroContent from '../../../../../../components/jobs/SoftZeroContent';
const { getEmployerLogoPath } = require('../../../../../../lib/utils/employerLogos');
const { getStateFullName } = require('../../../../../../lib/jobScraperUtils');

export async function getServerSideProps({ params, query }) {
  const { employerSlug, shift: shiftSlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    const result = await fetchEmployerShiftJobs(employerSlug, shiftSlug, page);

    if (!result || !result.employer) {
      return { notFound: true };
    }

    // Redirect to canonical URL if shift slug doesn't match
    if (shiftSlug !== result.shiftSlug) {
      const pageQuery = page > 1 ? `?page=${page}` : '';
      return {
        redirect: {
          destination: `/jobs/nursing/employer/${employerSlug}/shift/${result.shiftSlug}${pageQuery}`,
          permanent: true
        }
      };
    }

    const seoMeta = generateEmployerShiftPageMetaTags(
      result.employer.name,
      result.employer.slug,
      result.shiftType,
      result.shiftSlug,
      result.totalJobs,
      result.maxHourlyRate
    );

    return {
      props: {
        employer: JSON.parse(JSON.stringify(result.employer)),
        shiftType: result.shiftType,
        shiftSlug: result.shiftSlug,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching employer shift jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerShiftPage({
  employer,
  shiftType,
  shiftSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  stats,
  seoMeta
}) {

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
            <span className="text-gray-900 font-medium">{shiftType} Jobs</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              {employer.name} {shiftType} RN Jobs
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> {shiftType.toLowerCase()} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} at {employer.name}
                  {stats?.states && stats.states.length > 0 && (
                    <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}
                      {stats.states.length > 0 && (
                        <> including {stats.states.slice(0, 3).map(s => s.stateFullName || s.state).join(', ')}
                          {stats.states.length > 3 && <> and {stats.states.length - 3} more</>}
                        </>
                      )}
                    </>
                  )}
                  {stats?.specialties && stats.specialties.length > 0 && (
                    <>. Browse specialties like {stats.specialties.slice(0, 3).map(s => s.specialty).join(', ')}
                      {stats.specialties.length > 3 && <> and more</>}
                    </>
                  )}
                  . Apply today!
                </>
              ) : (
                <>Browse {shiftType.toLowerCase()} nursing opportunities at {employer.name}.</>
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
          {stats && (stats.states?.length > 0 || stats.specialties?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Top States Card */}
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
                    {stats.states.slice(0, 5).map((s, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${s.state.toLowerCase()}/shift/${shiftSlug}`}
                        className="flex justify-between items-center group hover:text-blue-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-blue-600 font-medium">{s.stateFullName || s.state}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{s.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Specialties Card */}
              {stats.specialties && stats.specialties.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Specialties</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.specialties.slice(0, 5).map((spec, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/employer/${employer.slug}/${spec.slug}`}
                        className="flex justify-between items-center group hover:text-purple-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-purple-600 font-medium">{spec.specialty}</span>
                        <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{spec.count}</span>
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
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1.5 line-clamp-2">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 flex-wrap">
                            {job.employer && (
                              <span className="font-medium text-gray-900">{job.employer.name}</span>
                            )}
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
                              <span className="text-green-700 font-medium">• {salary}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.specialty && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                {job.specialty}
                              </span>
                            )}
                            {job.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                                {job.jobType}
                              </span>
                            )}
                            {job.experienceLevel && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
                                {normalizeExperienceLevel(job.experienceLevel)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>

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
              title={`No ${shiftType} RN Jobs at ${employer.name} Right Now`}
              description={`${shiftType} positions at ${employer.name} are updated daily.`}
              alternatives={[
                { label: `View All Jobs at ${employer.name}`, href: `/jobs/nursing/employer/${employer.slug}` },
                { label: `View All ${shiftType} RN Jobs`, href: `/jobs/nursing/shift/${shiftSlug}` },
                { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
              ]}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/employer/${employer.slug}/shift/${shiftSlug}?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/employer/${employer.slug}/shift/${shiftSlug}?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Browse by State */}
          {stats?.states && stats.states.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {employer.name} {shiftType} RN Jobs by State
                </h2>
                <p className="text-gray-600">
                  Find {employer.name} {shiftType.toLowerCase()} nursing positions in {stats.states.length} {stats.states.length === 1 ? 'state' : 'states'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.states.map((s, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${s.state.toLowerCase()}/shift/${shiftSlug}`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-blue-600 font-medium text-sm">{s.stateFullName || s.state}</span>
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{s.count}</span>
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
                  {employer.name} {shiftType} RN Jobs by Specialty
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
                  {stats.specialties.map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employer.slug}/${spec.slug}`}
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

          {/* Footer: Other Shifts */}
          {stats?.otherShifts && stats.otherShifts.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other Shift Types at {employer.name}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.otherShifts.map((s, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employer.slug}/shift/${s.slug}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 rounded-lg group transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-indigo-600 font-medium">{s.display}</span>
                      <span className="text-indigo-600 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full text-xs">{s.count.toLocaleString()}</span>
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
                  Browse {employer.name} Jobs by Job Type
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.jobTypes.map((jt, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employer.slug}/${jt.slug}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-orange-50 rounded-lg group transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-orange-600 font-medium">{jt.displayName}</span>
                      <span className="text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded-full text-xs">{jt.count.toLocaleString()}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Job Alert Signup */}
          <div className="mt-16" data-job-alert-form>
            <JobAlertSignup />
          </div>

          <StickyJobAlertCTA />
        </div>
      </div>
    </>
  );
}
