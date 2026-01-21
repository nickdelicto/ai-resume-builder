import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import JobAlertSignup from '../../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../../components/StickyJobAlertCTA';

const { getStateFullName } = require('../../../../../../lib/jobScraperUtils');
const { fetchEmployerSpecialtyJobTypeJobs } = require('../../../../../../lib/services/jobPageData');
const { isValidSpecialtySlug, slugToSpecialty, specialtyToSlug } = require('../../../../../../lib/constants/specialties');
const { isJobType, jobTypeToDisplay, jobTypeToSlug } = require('../../../../../../lib/constants/jobTypes');
const { normalizeExperienceLevel } = require('../../../../../../lib/utils/experienceLevelUtils');
const { getEmployerLogoPath } = require('../../../../../../lib/utils/employerLogos');
const { getSalaryText } = require('../../../../../../lib/utils/seoTextUtils');

/**
 * Employer + Specialty + Job Type Page
 * Example: /jobs/nursing/employer/hca-healthcare/icu/full-time
 */
export async function getServerSideProps({ params, query }) {
  const { employerSlug, specialtyOrJobType: specialtySlug, jobType: jobTypeSlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    // Validate specialty
    if (!isValidSpecialtySlug(specialtySlug)) {
      return { notFound: true };
    }

    // Validate job type
    if (!isJobType(jobTypeSlug)) {
      return { notFound: true };
    }

    // Handle job type redirect (prn → per-diem)
    const normalizedJobType = jobTypeToSlug(jobTypeSlug);
    if (normalizedJobType && normalizedJobType !== jobTypeSlug) {
      return {
        redirect: {
          destination: `/jobs/nursing/employer/${employerSlug}/${specialtySlug}/${normalizedJobType}`,
          permanent: true
        }
      };
    }

    const result = await fetchEmployerSpecialtyJobTypeJobs(employerSlug, specialtySlug, jobTypeSlug, page);

    if (!result) {
      return { notFound: true };
    }

    return {
      props: {
        employer: JSON.parse(JSON.stringify(result.employer)),
        specialty: result.specialty,
        specialtySlug: result.specialtySlug,
        jobType: result.jobType,
        jobTypeSlug: result.jobTypeSlug,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        maxHourlyRate: result.maxHourlyRate,
        stats: result.stats
      }
    };
  } catch (error) {
    console.error('Error fetching employer specialty job type jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerSpecialtyJobTypePage({
  employer,
  specialty,
  specialtySlug,
  jobType,
  jobTypeSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  maxHourlyRate,
  stats
}) {
  const formatSalary = (minHourly, maxHourly, minAnnual, maxAnnual) => {
    if (minHourly && maxHourly) {
      return `$${minHourly.toFixed(2)} - $${maxHourly.toFixed(2)}/hr`;
    } else if (minAnnual && maxAnnual) {
      return `$${(minAnnual / 1000).toFixed(0)}k - $${(maxAnnual / 1000).toFixed(0)}k/yr`;
    }
    return null;
  };

  const employerName = employer?.name || 'Employer';
  const employerSlug = employer?.slug || '';

  const salaryText = getSalaryText(maxHourlyRate, `${jobType}-${specialty}-${employerName}`);
  const jobCountText = totalJobs ? `${totalJobs} ` : '';
  const seoMeta = {
    title: `${jobCountText}${jobType} ${specialty} RN Jobs at ${employerName}${salaryText}`,
    description: `Find ${totalJobs || 0} ${jobType.toLowerCase()} ${specialty} Registered Nurse jobs at ${employerName}. Browse positions and apply today!`,
    keywords: `${jobType.toLowerCase()} ${specialty.toLowerCase()} rn jobs ${employerName.toLowerCase()}, ${specialty.toLowerCase()} nursing jobs`,
    canonicalUrl: `https://intelliresume.net/jobs/nursing/employer/${employerSlug}/${specialtySlug}/${jobTypeSlug}`,
    ogImage: 'https://intelliresume.net/og-image-jobs.png'
  };

  return (
    <>
      <Head>
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
        <link rel="canonical" href={seoMeta.canonicalUrl} key="canonical" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:image" content={seoMeta.ogImage} />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/employer/${employerSlug}`} className="hover:text-blue-600 transition-colors">{employerName}</Link>
            <span>/</span>
            <Link href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}`} className="hover:text-blue-600 transition-colors">{specialty}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{jobType}</span>
          </nav>

          {/* Header with Employer Logo */}
          <div className="mb-8">
            <div className="flex items-start gap-6 mb-4">
              {getEmployerLogoPath(employerSlug) && (
                <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <img
                    src={getEmployerLogoPath(employerSlug)}
                    alt={`${employerName} logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                  {jobType} {specialty} RN Jobs at {employerName}
                </h1>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  {totalJobs > 0 ? (
                    <>
                      Find <strong>{totalJobs.toLocaleString()}</strong> {jobType.toLowerCase()} {specialty} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} at {employerName}
                      {stats?.states && stats.states.length > 0 && (
                        <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'} including {stats.states.slice(0, 3).map(s => s.stateFullName || s.state).join(', ')}{stats.states.length > 3 && ` and more`}</>
                      )}
                      . Apply today!
                    </>
                  ) : (
                    <>Browse {jobType.toLowerCase()} {specialty.toLowerCase()} nursing opportunities at {employerName}.</>
                  )}
                </p>
              </div>
            </div>
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
          {stats && (stats.states?.length > 0 || stats.cities?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Top States */}
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
                        href={`/jobs/nursing/${s.state.toLowerCase()}/specialty/${specialtySlug}/${jobTypeSlug}`}
                        className="flex justify-between items-center group hover:text-blue-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-blue-600 font-medium">{s.stateFullName || s.state}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{s.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Cities */}
              {stats.cities && stats.cities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Cities</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.cities.slice(0, 5).map((c, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-1"
                      >
                        <span className="text-gray-900 font-medium">{c.city}, {c.state}</span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{c.count}</span>
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
                const salary = formatSalary(job.salaryMinHourly, job.salaryMaxHourly, job.salaryMinAnnual, job.salaryMaxAnnual);

                return (
                  <React.Fragment key={job.id}>
                    <Link
                      href={`/jobs/nursing/${job.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 flex gap-4">
                        {getEmployerLogoPath(employerSlug) && (
                          <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-2">
                            <img
                              src={getEmployerLogoPath(employerSlug)}
                              alt={`${employerName} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}
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
                            {salary && <span className="text-green-700 font-medium">• {salary}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {job.jobType}
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
                    {index === 4 && jobs.length > 5 && (
                      <div className="my-6">
                        <JobAlertSignup specialty={specialty} compact={true} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No {jobType} {specialty} RN Jobs at {employerName}</h2>
              <p className="text-gray-600 mb-6">Check back soon or explore other opportunities.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}`} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  View All {specialty} Jobs at {employerName}
                </Link>
                <Link href={`/jobs/nursing/employer/${employerSlug}`} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">
                  View All Jobs at {employerName}
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/${jobTypeSlug}?page=${currentPage - 1}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-gray-700">Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages && (
                <Link href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/${jobTypeSlug}?page=${currentPage + 1}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Other Job Types */}
          {stats?.otherJobTypes && stats.otherJobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Other Job Types for {specialty} at {employerName}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.otherJobTypes.map((jt, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/${jt.slug}`}
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

          {/* Footer: Other Specialties */}
          {stats?.otherSpecialties && stats.otherSpecialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Other {jobType} Specialties at {employerName}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherSpecialties.map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employerSlug}/${spec.slug}/${jobTypeSlug}`}
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
            <JobAlertSignup specialty={specialty} />
          </div>

          <StickyJobAlertCTA specialty={specialty} location={`at ${employerName}`} />
        </div>
      </div>
    </>
  );
}
