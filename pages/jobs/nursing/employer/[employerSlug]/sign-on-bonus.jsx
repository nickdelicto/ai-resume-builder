import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../components/common/Meta';
import JobAlertSignup from '../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../components/StickyJobAlertCTA';
import { fetchEmployerSignOnBonusJobs, fetchSoftZeroData } from '../../../../../lib/services/jobPageData';
import { generateEmployerSignOnBonusPageMetaTags } from '../../../../../lib/seo/jobSEO';
import { normalizeExperienceLevel } from '../../../../../lib/utils/experienceLevelUtils';
import { formatSalaryForCard } from '../../../../../lib/utils/jobCardUtils';
import SoftZeroContent from '../../../../../components/jobs/SoftZeroContent';
import RelatedJobsGrid from '../../../../../components/jobs/RelatedJobsGrid';
const { getEmployerLogoPath } = require('../../../../../lib/utils/employerLogos');

export async function getServerSideProps({ params, query }) {
  const { employerSlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    const result = await fetchEmployerSignOnBonusJobs(employerSlug, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateEmployerSignOnBonusPageMetaTags(
      result.employer.name,
      result.employer.slug,
      result.totalJobs,
      result.maxHourlyRate
    );

    let softZeroData = null;
    if (result.totalJobs === 0) {
      softZeroData = await fetchSoftZeroData({
        employerId: result.employer.id,
        signOnBonus: true,
      });
    }

    return {
      props: {
        employer: result.employer,
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
    console.error('Error fetching employer sign-on bonus jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerSignOnBonusPage({
  employer,
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

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href="/jobs/nursing/sign-on-bonus" className="hover:text-blue-600 transition-colors">Sign-On Bonus</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/employer/${employer.slug}`} className="hover:text-blue-600 transition-colors">{employer.name}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Sign-On Bonus</span>
          </nav>

          {/* Header with Logo */}
          <div className="mb-8">
            <div className="flex items-start gap-6 mb-4">
              {getEmployerLogoPath(employer.slug) && (
                <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <img
                    src={getEmployerLogoPath(employer.slug)}
                    alt={`${employer.name} logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {employer.name} RN Jobs with Sign-On Bonus
                </h1>
                <p className="text-lg text-gray-600">
                  {totalJobs > 0 ? (
                    <>
                      Find <strong>{totalJobs}</strong> Registered Nurse {totalJobs === 1 ? 'position' : 'positions'} with sign-on bonus at {employer.name}
                      {stats?.states && stats.states.length > 0 && (
                        <> in <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}</>
                      )}
                      . Apply today!
                    </>
                  ) : (
                    <>Browse nursing jobs with sign-on bonus at {employer.name}.</>
                  )}
                </p>
              </div>
            </div>
            {totalJobs > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{totalJobs} {totalJobs === 1 ? 'job' : 'jobs'} with sign-on bonus</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (stats.states?.length > 0 || stats.specialties?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* By State Card */}
              {stats.states && stats.states.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">By State</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.states.slice(0, 5).map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1">
                        <span className="text-gray-900 font-medium">{s.stateFullName || s.state}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Specialty Card */}
              {stats.specialties && stats.specialties.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">By Specialty</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.specialties.slice(0, 5).map((spec, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/employer/${employer.slug}/${spec.slug}/sign-on-bonus`}
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
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-green-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-1.5 line-clamp-2">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 flex-wrap">
                            <span className="font-medium text-gray-900">{employer.name}</span>
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
            <>
              <SoftZeroContent
                title={`No Sign-On Bonus RN Jobs at ${employer.name} Right Now`}
                description={`Sign-on bonus positions at ${employer.name} are updated daily.`}
                alternatives={[
                  { label: `View All Jobs at ${employer.name}`, href: `/jobs/nursing/employer/${employer.slug}` },
                  { label: 'View All Sign-On Bonus RN Jobs', href: '/jobs/nursing/sign-on-bonus' },
                  { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
                ]}
              />
              {softZeroData?.specialtiesWithBonus && (
                <RelatedJobsGrid
                  title={`Specialties with Sign-On Bonus at ${employer.name}`}
                  colorScheme="purple"
                  items={softZeroData.specialtiesWithBonus
                    .map(s => ({ label: s.label, href: `/jobs/nursing/employer/${employer.slug}/${s.slug}/sign-on-bonus`, count: s.count }))}
                />
              )}
              {softZeroData?.otherEmployers && (
                <RelatedJobsGrid
                  title="Other Employers with Sign-On Bonus"
                  colorScheme="orange"
                  items={softZeroData.otherEmployers
                    .filter(e => e.slug !== employer.slug)
                    .map(e => ({ label: e.label, href: `/jobs/nursing/employer/${e.slug}/sign-on-bonus`, count: e.count }))}
                />
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/employer/${employer.slug}/sign-on-bonus?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/employer/${employer.slug}/sign-on-bonus?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Browse by Specialty */}
          {stats?.specialties && stats.specialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {employer.name} Sign-On Bonus Jobs by Specialty
                </h2>
                <p className="text-gray-600">
                  Explore {stats.specialties.length} nursing {stats.specialties.length === 1 ? 'specialty' : 'specialties'} with sign-on bonus at {employer.name}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.specialties.map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employer.slug}/${spec.slug}/sign-on-bonus`}
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

          {/* Footer: Browse by Location */}
          {stats?.states && stats.states.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {employer.name} Sign-On Bonus Jobs by State
                </h2>
                <p className="text-gray-600">
                  Find {employer.name} sign-on bonus positions in {stats.states.length} {stats.states.length === 1 ? 'state' : 'states'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.states.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 mb-3 break-inside-avoid"
                    >
                      <span className="text-gray-900 font-medium text-sm">{s.stateFullName || s.state}</span>
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs flex-shrink-0">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" id="job-alert-form" data-job-alert-form>
            <JobAlertSignup />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA />
        </div>
      </div>
    </>
  );
}
