import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../../components/common/Meta';
import SoftZeroContent from '../../../../../../components/jobs/SoftZeroContent';
import JobAlertSignup from '../../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../../components/StickyJobAlertCTA';
import { fetchEmployerSpecialtySignOnBonusJobs } from '../../../../../../lib/services/jobPageData';
import { generateEmployerSpecialtySignOnBonusPageMetaTags } from '../../../../../../lib/seo/jobSEO';
import { normalizeExperienceLevel } from '../../../../../../lib/utils/experienceLevelUtils';
import { formatSalaryForCard } from '../../../../../../lib/utils/jobCardUtils';
const { getEmployerLogoPath } = require('../../../../../../lib/utils/employerLogos');

export async function getServerSideProps({ params, query }) {
  const { employerSlug, specialtyOrJobType: specialtySlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    const result = await fetchEmployerSpecialtySignOnBonusJobs(employerSlug, specialtySlug, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateEmployerSpecialtySignOnBonusPageMetaTags(
      result.employerName,
      result.employerSlug,
      result.specialty,
      result.specialtySlug,
      result.totalJobs,
      result.maxHourlyRate
    );

    return {
      props: {
        specialty: result.specialty,
        specialtySlug: result.specialtySlug,
        employerName: result.employerName,
        employerSlug: result.employerSlug,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching employer specialty sign-on bonus jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerSpecialtySignOnBonusPage({
  specialty,
  specialtySlug,
  employerName,
  employerSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  stats,
  seoMeta
}) {

  const logoPath = getEmployerLogoPath(employerSlug);

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
            <Link href={`/jobs/nursing/employer/${employerSlug}/sign-on-bonus`} className="hover:text-blue-600 transition-colors">{employerName}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{specialty}</span>
          </nav>

          {/* Header with employer logo */}
          <div className="mb-8">
            <div className="flex items-start gap-6 mb-4">
              {logoPath && (
                <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <img
                    src={logoPath}
                    alt={`${employerName} logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  {employerName} {specialty} RN Jobs with Sign-On Bonus
                </h1>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  {totalJobs > 0 ? (
                    <>
                      Find <strong>{totalJobs.toLocaleString()}</strong> {specialty} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} with sign-on bonus at {employerName}
                      {stats?.states && stats.states.length > 0 && (
                        <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}</>
                      )}
                      . Apply today!
                    </>
                  ) : (
                    <>Browse {specialty} nursing jobs with sign-on bonus at {employerName}.</>
                  )}
                </p>
              </div>
            </div>
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
          {stats && (stats.states?.length > 0 || stats.cities?.length > 0) && (
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
                        href={`/jobs/nursing/${s.stateCode.toLowerCase()}/specialty/${specialtySlug}/sign-on-bonus`}
                        className="flex justify-between items-center group hover:text-blue-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-blue-600 font-medium">{s.state}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{s.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Cities Card */}
              {stats.cities && stats.cities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Cities</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.cities.slice(0, 5).map((c, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${c.stateCode.toLowerCase()}/${c.slug}/specialty/${specialtySlug}/sign-on-bonus`}
                        className="flex justify-between items-center group hover:text-purple-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-purple-600 font-medium">{c.city}, {c.stateCode}</span>
                        <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{c.count}</span>
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
                        {logoPath && (
                          <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                            <img
                              src={logoPath}
                              alt={`${employerName} logo`}
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
                            <span className="font-medium text-gray-900">{employerName}</span>
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
            <SoftZeroContent
              title={`No ${specialty} Sign-On Bonus RN Jobs at ${employerName} Right Now`}
              description={`${specialty} sign-on bonus positions at ${employerName} are updated daily.`}
              alternatives={[
                { label: `View All ${specialty} Jobs at ${employerName}`, href: `/jobs/nursing/employer/${employerSlug}/${specialtySlug}` },
                { label: `View All Sign-On Bonus Jobs at ${employerName}`, href: `/jobs/nursing/employer/${employerSlug}/sign-on-bonus` },
                { label: `View All Jobs at ${employerName}`, href: `/jobs/nursing/employer/${employerSlug}` },
              ]}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/sign-on-bonus?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/sign-on-bonus?page=${currentPage + 1}`}
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
                  {employerName} {specialty} Sign-On Bonus Jobs by State
                </h2>
                <p className="text-gray-600">
                  Find {specialty} sign-on bonus jobs at {employerName} across {stats.states.length} {stats.states.length === 1 ? 'state' : 'states'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.states.map((s, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${s.stateCode.toLowerCase()}/specialty/${specialtySlug}/sign-on-bonus`}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid group hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-900 group-hover:text-blue-600 font-medium text-sm">{s.state}</span>
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{s.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer: Other Specialties at this Employer */}
          {stats?.specialties && stats.specialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other Specialties with Sign-On Bonus at {employerName}
                </h2>
                <p className="text-gray-600">
                  Browse sign-on bonus jobs in other nursing specialties at {employerName}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.specialties.filter(s => s.slug !== specialtySlug).map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employerSlug}/${spec.slug}/sign-on-bonus`}
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
