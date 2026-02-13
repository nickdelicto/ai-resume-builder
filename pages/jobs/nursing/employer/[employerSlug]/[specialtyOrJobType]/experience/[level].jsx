import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../../../components/common/Meta';
import SoftZeroContent from '../../../../../../../components/jobs/SoftZeroContent';
import RelatedJobsGrid from '../../../../../../../components/jobs/RelatedJobsGrid';
import JobAlertSignup from '../../../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../../../components/StickyJobAlertCTA';
import { fetchEmployerSpecialtyExperienceLevelJobs, fetchSoftZeroData } from '../../../../../../../lib/services/jobPageData';
import { generateEmployerSpecialtyExperienceLevelPageMetaTags } from '../../../../../../../lib/seo/jobSEO';
import { isValidSpecialtySlug } from '../../../../../../../lib/constants/specialties';
import { isExperienceLevel, experienceLevelToSlug, getExperienceLevelDescription } from '../../../../../../../lib/constants/experienceLevels';
import { getEmployerLogoPath } from '../../../../../../../lib/utils/employerLogos';
import { formatSalaryForCard } from '../../../../../../../lib/utils/jobCardUtils';

/**
 * Employer + Specialty + Experience Level Page
 * Example: /jobs/nursing/employer/cleveland-clinic/icu/experience/new-grad
 */
export async function getServerSideProps({ params, query }) {
  const { employerSlug, specialtyOrJobType: specialtySlug, level: levelSlug } = params;
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
          destination: `/jobs/nursing/employer/${employerSlug}/${specialtySlug}/experience/${normalizedLevel}`,
          permanent: true
        }
      };
    }

    const result = await fetchEmployerSpecialtyExperienceLevelJobs(employerSlug, specialtySlug, levelSlug, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateEmployerSpecialtyExperienceLevelPageMetaTags(
      result.employer.name,
      result.employer.slug,
      result.specialty,
      result.specialtySlug,
      result.experienceLevel,
      result.experienceLevelSlug,
      result.totalJobs,
      result.maxHourlyRate
    );

    let softZeroData = null;
    if (result.totalJobs === 0) {
      softZeroData = await fetchSoftZeroData({
        employerId: result.employer.id,
        specialty: result.specialty,
        experienceLevel: result.experienceLevel,
      });
    }

    return {
      props: {
        employer: JSON.parse(JSON.stringify(result.employer)),
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
        softZeroData,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching employer specialty experience level jobs:', error);
    return { notFound: true };
  }
}

export default function EmployerSpecialtyExperienceLevelPage({
  employer,
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
  softZeroData,
  seoMeta
}) {

  const employerName = employer?.name || 'Employer';
  const employerSlug = employer?.slug || '';
  const levelDescription = getExperienceLevelDescription(levelSlug);

  return (
    <>
      <Meta {...seoMeta} />

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
            <span className="text-gray-900 font-medium">{experienceLevel}</span>
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
                  {experienceLevel} {specialty} RN Jobs at {employerName}
                </h1>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  {totalJobs > 0 ? (
                    <>
                      Find <strong>{totalJobs.toLocaleString()}</strong> {experienceLevel.toLowerCase()} {specialty} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} at {employerName}
                      {stats?.states && stats.states.length > 0 && (
                        <> across <strong>{stats.states.length}</strong> {stats.states.length === 1 ? 'state' : 'states'}</>
                      )}
                      . Apply today!
                    </>
                  ) : (
                    <>Browse {experienceLevel.toLowerCase()} {specialty.toLowerCase()} nursing opportunities at {employerName}.</>
                  )}
                </p>
              </div>
            </div>
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
                        href={`/jobs/nursing/${s.state.toLowerCase()}/specialty/${specialtySlug}/experience/${levelSlug}`}
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
            <>
              <SoftZeroContent
                title={`No ${experienceLevel} ${specialty} RN Jobs at ${employerName} Right Now`}
                description={`${experienceLevel} ${specialty} positions at ${employerName} are updated daily.`}
                alternatives={[
                  { label: `View All ${specialty} Jobs at ${employerName}`, href: `/jobs/nursing/employer/${employerSlug}/${specialtySlug}` },
                  { label: `View All ${experienceLevel} Jobs at ${employerName}`, href: `/jobs/nursing/employer/${employerSlug}/experience/${levelSlug}` },
                  { label: `View All Jobs at ${employerName}`, href: `/jobs/nursing/employer/${employerSlug}` },
                ]}
              />
              {softZeroData?.otherExperienceLevels && (
                <RelatedJobsGrid
                  title={`Other ${specialty} Experience Levels at ${employerName}`}
                  colorScheme="blue"
                  items={softZeroData.otherExperienceLevels
                    .filter(el => el.slug !== levelSlug)
                    .map(el => ({ label: el.label, href: `/jobs/nursing/employer/${employerSlug}/${specialtySlug}/experience/${el.slug}`, count: el.count }))}
                />
              )}
              {softZeroData?.otherEmployers && (
                <RelatedJobsGrid
                  title={`Other Employers Hiring ${specialty} RNs`}
                  colorScheme="orange"
                  items={softZeroData.otherEmployers
                    .filter(e => e.slug !== employerSlug)
                    .map(e => ({ label: e.label, href: `/jobs/nursing/employer/${e.slug}/${specialtySlug}/experience/${levelSlug}`, count: e.count }))}
                />
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/experience/${levelSlug}?page=${currentPage - 1}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-gray-700">Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages && (
                <Link href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/experience/${levelSlug}?page=${currentPage + 1}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Job Types */}
          {stats?.jobTypes && stats.jobTypes.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{experienceLevel} {specialty} Job Types at {employerName}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.jobTypes.map((jt, idx) => (
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

          {/* Footer: Other Experience Levels */}
          {stats?.otherExperienceLevels && stats.otherExperienceLevels.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Other {specialty} Experience Levels at {employerName}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.otherExperienceLevels.map((exp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employerSlug}/${specialtySlug}/experience/${exp.slug}`}
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Other {experienceLevel} Specialties at {employerName}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.otherSpecialties.map((spec, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/employer/${employerSlug}/${spec.slug}/experience/${levelSlug}`}
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
          <div className="mt-16" id="job-alert-form" data-job-alert-form>
            <JobAlertSignup specialty={specialty} />
          </div>

          <StickyJobAlertCTA specialty={`${experienceLevel} ${specialty}`} location={`at ${employerName}`} />
        </div>
      </div>
    </>
  );
}
