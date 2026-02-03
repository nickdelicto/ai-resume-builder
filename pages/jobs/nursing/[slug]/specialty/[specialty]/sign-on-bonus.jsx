import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../../components/common/Meta';
import JobAlertSignup from '../../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../../components/StickyJobAlertCTA';
import { fetchStateSpecialtySignOnBonusJobs } from '../../../../../../lib/services/jobPageData';
import { generateStateSpecialtySignOnBonusPageMetaTags } from '../../../../../../lib/seo/jobSEO';
import { normalizeExperienceLevel } from '../../../../../../lib/utils/experienceLevelUtils';
import { formatSalaryForCard } from '../../../../../../lib/utils/jobCardUtils';
const { getEmployerLogoPath } = require('../../../../../../lib/utils/employerLogos');

export async function getServerSideProps({ params, query }) {
  const { slug: stateCode, specialty: specialtySlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    const result = await fetchStateSpecialtySignOnBonusJobs(stateCode, specialtySlug, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateStateSpecialtySignOnBonusPageMetaTags(
      result.stateCode,
      result.stateFullName,
      result.specialty,
      result.specialtySlug,
      result.totalJobs,
      result.maxHourlyRate
    );

    return {
      props: {
        specialty: result.specialty,
        specialtySlug: result.specialtySlug,
        stateCode: result.stateCode,
        stateFullName: result.stateFullName,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching state specialty sign-on bonus jobs:', error);
    return { notFound: true };
  }
}

export default function StateSpecialtySignOnBonusPage({
  specialty,
  specialtySlug,
  stateCode,
  stateFullName,
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
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href="/jobs/nursing/sign-on-bonus" className="hover:text-blue-600 transition-colors">Sign-On Bonus</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/${stateCode.toLowerCase()}/sign-on-bonus`} className="hover:text-blue-600 transition-colors">{stateFullName}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{specialty}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {specialty} RN Jobs with Sign-On Bonus in {stateFullName}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> {specialty} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} with sign-on bonus in {stateFullName}
                  {stats?.cities && stats.cities.length > 0 && (
                    <> across <strong>{stats.cities.length}</strong> {stats.cities.length === 1 ? 'city' : 'cities'}</>
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
                  . Apply today!
                </>
              ) : (
                <>Browse {specialty} nursing jobs with sign-on bonus in {stateFullName}.</>
              )}
            </p>
            {totalJobs > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{totalJobs.toLocaleString()} {totalJobs === 1 ? 'job' : 'jobs'} with sign-on bonus</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (stats.cities?.length > 0 || stats.employers?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Top Cities Card */}
              {stats.cities && stats.cities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Cities</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.cities.slice(0, 5).map((c, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${stateCode.toLowerCase()}/${c.slug}/specialty/${specialtySlug}/sign-on-bonus`}
                        className="flex justify-between items-center group hover:text-blue-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-blue-600 font-medium">{c.city}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{c.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Employers Card */}
              {stats.employers && stats.employers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Employers</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.employers.slice(0, 5).map((emp, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/employer/${emp.slug}/${specialtySlug}/sign-on-bonus`}
                        className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-green-600 font-medium">{emp.name}</span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
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
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-green-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 flex gap-4">
                        {/* Employer logo on left */}
                        {job.employer && getEmployerLogoPath(job.employer.slug) && (
                          <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                            <img
                              src={getEmployerLogoPath(job.employer.slug)}
                              alt={`${job.employer.name} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}

                        {/* Job content */}
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
                              <span className="text-green-700 font-medium">
                                • {salary}
                              </span>
                            )}
                          </div>
                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Sign-On Bonus
                            </span>
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
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No {specialty} Sign-On Bonus Jobs in {stateFullName}
              </h2>
              <p className="text-gray-600 mb-6">
                New {specialty} positions with sign-on bonuses are added regularly. Check back soon or browse all {specialty} jobs in {stateFullName}.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/sign-on-bonus`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  All Sign-On Bonus Jobs in {stateFullName}
                </Link>
                <Link
                  href={`/jobs/nursing/specialty/${specialtySlug}/sign-on-bonus`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  All {specialty} Sign-On Bonus Jobs
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specialtySlug}/sign-on-bonus?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specialtySlug}/sign-on-bonus?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Browse by City */}
          {stats?.cities && stats.cities.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {specialty} Sign-On Bonus RN Jobs by City in {stateFullName}
                </h2>
                <p className="text-gray-600">
                  Find {specialty} nursing jobs with sign-on bonus in {stats.cities.length} {stats.cities.length === 1 ? 'city' : 'cities'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.cities.map((c, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/${c.slug}/specialty/${specialtySlug}/sign-on-bonus`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-blue-600 font-medium text-sm">{c.city}</span>
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{c.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Top Employers */}
          {stats?.employers && stats.employers.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Top Employers Offering {specialty} Sign-On Bonuses in {stateFullName}
                </h2>
                <p className="text-gray-600">
                  Leading healthcare organizations offering {specialty} sign-on bonuses in {stateFullName}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
                  {stats.employers.map((emp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${emp.slug}/${specialtySlug}/sign-on-bonus`}
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

          {/* Footer: Other Specialties */}
          {stats?.specialties && stats.specialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other Specialties with Sign-On Bonus in {stateFullName}
                </h2>
                <p className="text-gray-600">
                  Browse sign-on bonus jobs in other nursing specialties
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.specialties.filter(s => s.slug !== specialtySlug).map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/specialty/${spec.slug}/sign-on-bonus`}
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

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" data-job-alert-form>
            <JobAlertSignup />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA />
        </div>
      </div>
    </>
  );
}
