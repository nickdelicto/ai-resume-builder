import React from 'react';
import Link from 'next/link';
import Meta from '../../../../components/common/Meta';
import JobAlertSignup from '../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../components/StickyJobAlertCTA';
import { fetchStateRemoteJobs, fetchSoftZeroData, detectStateFromSlug } from '../../../../lib/services/jobPageData';
import { generateStateRemotePageMetaTags } from '../../../../lib/seo/jobSEO';
import { normalizeExperienceLevel } from '../../../../lib/utils/experienceLevelUtils';
import { formatSalaryForCard } from '../../../../lib/utils/jobCardUtils';
import { specialtyToSlug } from '../../../../lib/constants/specialties';
import SoftZeroContent from '../../../../components/jobs/SoftZeroContent';
import RelatedJobsGrid from '../../../../components/jobs/RelatedJobsGrid';
const { getEmployerLogoPath } = require('../../../../lib/utils/employerLogos');

export async function getServerSideProps({ params, query }) {
  const { slug } = params;
  const page = parseInt(query.page) || 1;

  // Check if slug is a valid state
  const stateInfo = detectStateFromSlug(slug);
  if (!stateInfo) {
    return { notFound: true };
  }

  try {
    const result = await fetchStateRemoteJobs(stateInfo.stateCode, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateStateRemotePageMetaTags(
      result.stateCode,
      result.stateFullName,
      result.totalJobs,
      result.maxHourlyRate
    );

    let softZeroData = null;
    if (result.totalJobs === 0) {
      softZeroData = await fetchSoftZeroData({
        state: result.stateCode,
        remote: true,
      });
    }

    return {
      props: {
        stateCode: result.stateCode,
        stateFullName: result.stateFullName,
        jobs: result.jobs,
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        softZeroData,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching state remote jobs:', error);
    return { notFound: true };
  }
}

export default function StateRemotePage({
  stateCode,
  stateFullName,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  stats,
  softZeroData,
  seoMeta
}) {

  return (
    <>
      <Meta {...seoMeta} />

      <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${stateCode.toLowerCase()}`} className="hover:text-blue-600 transition-colors">{stateFullName}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Remote</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              {/* Remote badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Work From Home
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Remote RN Jobs in {stateFullName}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> remote Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} for {stateFullName}-licensed nurses
                  {stats?.specialties && stats.specialties.length > 0 && (
                    <> across <strong>{stats.specialties.length}</strong> {stats.specialties.length === 1 ? 'specialty' : 'specialties'}</>
                  )}
                  {stats?.employers && stats.employers.length > 0 && (
                    <> at <strong>{stats.employers.length}</strong> healthcare {stats.employers.length === 1 ? 'employer' : 'employers'}
                      {stats.employers.length > 0 && (
                        <> including {stats.employers.slice(0, 3).map(e => e.name).join(', ')}
                          {stats.employers.length > 3 && <> and {stats.employers.length - 3} more</>}
                        </>
                      )}
                    </>
                  )}
                  . Work from home and apply today!
                </>
              ) : (
                <>Browse remote nursing jobs for {stateFullName}-licensed nurses. Work from home positions available.</>
              )}
            </p>
            {totalJobs > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span>{totalJobs.toLocaleString()} remote {totalJobs === 1 ? 'job' : 'jobs'} available</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (stats.specialties?.length > 0 || stats.employers?.length > 0 || stats.jobTypes?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Top Specialties Card */}
              {stats.specialties && stats.specialties.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Specialties</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.specialties.slice(0, 5).map((s, idx) => {
                      const specSlug = specialtyToSlug(s.specialty);
                      return (
                        <Link
                          key={idx}
                          href={`/jobs/nursing/remote/${specSlug}`}
                          className="flex justify-between items-center group hover:text-purple-600 transition-colors py-1"
                        >
                          <span className="text-gray-900 group-hover:text-purple-600 font-medium">{s.specialty}</span>
                          <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{s.count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Employers Card */}
              {stats.employers && stats.employers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Employers</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.employers.slice(0, 5).map((emp, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/employer/${emp.slug}/remote`}
                        className="flex justify-between items-center group hover:text-orange-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-orange-600 font-medium">{emp.name}</span>
                        <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Types Card */}
              {stats.jobTypes && stats.jobTypes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Types</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.jobTypes.slice(0, 5).map((jt, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-1"
                      >
                        <span className="text-gray-900 font-medium">{jt.displayName || jt.jobType}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{jt.count}</span>
                      </div>
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
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-green-200 overflow-hidden"
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
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-1.5 line-clamp-2">
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
                            {/* Remote badge */}
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {job.workArrangement === 'hybrid' ? 'Hybrid' : 'Remote'}
                            </span>
                            {job.specialty && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                {job.specialty}
                              </span>
                            )}
                            {job.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {job.jobType === 'prn' ? 'PRN' : job.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
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
                        <JobAlertSignup compact={true} location={`Remote in ${stateFullName}`} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <>
              <SoftZeroContent
                title={`No Remote RN Jobs in ${stateFullName} Right Now`}
                description={`Remote nursing positions in ${stateFullName} are updated daily.`}
                alternatives={[
                  { label: `View All Jobs in ${stateFullName}`, href: `/jobs/nursing/${stateCode.toLowerCase()}` },
                  { label: 'View All Remote RN Jobs', href: '/jobs/nursing/remote' },
                  { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
                ]}
              />
              {softZeroData?.otherStates && (
                <RelatedJobsGrid
                  title="Remote RN Jobs in Other States"
                  colorScheme="green"
                  items={softZeroData.otherStates
                    .filter(s => s.slug !== stateCode.toLowerCase())
                    .map(s => ({ label: s.label, href: `/jobs/nursing/${s.slug}/remote`, count: s.count }))}
                />
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/remote?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/remote?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Browse Remote Jobs by Specialty */}
          {stats?.specialties && stats.specialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Remote RN Jobs by Specialty
                </h2>
                <p className="text-gray-600">
                  Find remote nursing positions for {stateFullName}-licensed nurses across {stats.specialties.length} {stats.specialties.length === 1 ? 'specialty' : 'specialties'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.specialties.map((s, idx) => {
                    const specSlug = specialtyToSlug(s.specialty);
                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/remote/${specSlug}`}
                        className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-green-600 transition-colors"
                      >
                        <span className="text-gray-900 group-hover:text-green-600 font-medium text-sm">{s.specialty}</span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{s.count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Top Employers */}
          {stats?.employers && stats.employers.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Top Employers Hiring Remote RNs in {stateFullName}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
                  {stats.employers.map((emp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${emp.slug}/remote`}
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

          {/* Other States with Remote Jobs */}
          {stats?.otherStates && stats.otherStates.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Remote RN Jobs in Other States
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherStates.map((s, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${s.stateCode.toLowerCase()}/remote`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-blue-600 font-medium text-sm">{s.stateFullName}</span>
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{s.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Job Alert Signup */}
          <div className="mt-16" id="job-alert-form" data-job-alert-form>
            <JobAlertSignup location={`Remote in ${stateFullName}`} />
          </div>

          <StickyJobAlertCTA location={`Remote in ${stateFullName}`} />
        </div>
      </div>
    </>
  );
}
