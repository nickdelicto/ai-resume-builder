import React from 'react';
import Link from 'next/link';
import Meta from '../../../../../components/common/Meta';
import JobAlertSignup from '../../../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../../../components/StickyJobAlertCTA';
import { fetchStateExperienceLevelJobs, fetchSoftZeroData, detectStateFromSlug } from '../../../../../lib/services/jobPageData';
import { generateStateExperienceLevelPageMetaTags } from '../../../../../lib/seo/jobSEO';
import { specialtyToSlug, normalizeSpecialty } from '../../../../../lib/constants/specialties';
import { isExperienceLevel, getExperienceLevelDescription } from '../../../../../lib/constants/experienceLevels';
import { formatSalaryForCard } from '../../../../../lib/utils/jobCardUtils';
import SoftZeroContent from '../../../../../components/jobs/SoftZeroContent';
import RelatedJobsGrid from '../../../../../components/jobs/RelatedJobsGrid';
const { getEmployerLogoPath } = require('../../../../../lib/utils/employerLogos');

export async function getServerSideProps({ params, query }) {
  const { slug: stateSlug, level: levelSlug } = params;
  const page = parseInt(query.page) || 1;

  try {
    // Validate state
    const stateInfo = detectStateFromSlug(stateSlug);
    if (!stateInfo) {
      return { notFound: true };
    }

    // Validate experience level
    if (!isExperienceLevel(levelSlug)) {
      return { notFound: true };
    }

    const result = await fetchStateExperienceLevelJobs(stateInfo.stateCode, levelSlug, page);

    if (!result) {
      return { notFound: true };
    }

    const seoMeta = generateStateExperienceLevelPageMetaTags(
      result.stateCode,
      result.stateFullName,
      result.experienceLevel,
      result.experienceLevelSlug,
      result.totalJobs,
      result.maxHourlyRate
    );

    let softZeroData = null;
    if (result.totalJobs === 0) {
      softZeroData = await fetchSoftZeroData({
        state: result.stateCode,
        experienceLevel: result.experienceLevel,
      });
    }

    return {
      props: {
        stateCode: result.stateCode,
        stateFullName: result.stateFullName,
        experienceLevel: result.experienceLevel,
        levelSlug: result.experienceLevelSlug,
        jobs: JSON.parse(JSON.stringify(result.jobs)),
        totalJobs: result.totalJobs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        stats: result.stats,
        softZeroData,
        seoMeta
      }
    };
  } catch (error) {
    console.error('Error fetching state experience level jobs:', error);
    return { notFound: true };
  }
}

export default function StateExperienceLevelPage({
  stateCode,
  stateFullName,
  experienceLevel,
  levelSlug,
  jobs,
  totalJobs,
  totalPages,
  currentPage,
  stats,
  softZeroData,
  seoMeta
}) {

  const generateCitySlug = (city) => {
    if (!city) return '';
    return city.toLowerCase().replace(/\s+/g, '-');
  };

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
            <Link href={`/jobs/nursing/${stateCode.toLowerCase()}`} className="hover:text-blue-600 transition-colors">{stateFullName}</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{experienceLevel} Jobs</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {experienceLevel} RN Jobs in {stateFullName}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
              {totalJobs > 0 ? (
                <>
                  Find <strong>{totalJobs.toLocaleString()}</strong> {experienceLevel} Registered Nurse {totalJobs === 1 ? 'job' : 'jobs'} in {stateFullName}
                  {stats?.cities && stats.cities.length > 0 && (
                    <> across <strong>{stats.cities.length}</strong> {stats.cities.length === 1 ? 'city' : 'cities'}</>
                  )}
                  {stats?.employers && stats.employers.length > 0 && (
                    <> at top healthcare employers including {stats.employers.slice(0, 3).map(e => e.name).join(', ')}
                      {stats.employers.length > 3 && <> and {stats.employers.length - 3} more</>}
                    </>
                  )}
                  . Apply today!
                </>
              ) : (
                <>Browse {experienceLevel.toLowerCase()} nursing opportunities in {stateFullName}.</>
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

          {/* New Grad Resume Guide Banner */}
          {levelSlug === 'new-grad' && (
            <Link
              href="/new-grad-nursing-resume"
              className="group block bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 sm:p-5 mb-8 hover:border-amber-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Resume Guide</div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                    New Grad Nurse Resume: Step-by-Step Guide & Free Template
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                    Build a professional new grad nurse resume with clinical rotations, certifications, and ATS-friendly formatting
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          )}

          {/* Stats Cards */}
          {stats && (stats.cities?.length > 0 || stats.specialties?.length > 0 || stats.employers?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Top Cities Card */}
              {stats.cities && stats.cities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Cities</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.cities.slice(0, 5).map((c, idx) => (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${stateCode.toLowerCase()}/${generateCitySlug(c.city)}/experience/${levelSlug}`}
                        className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-green-600 font-medium">{c.city}</span>
                        <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{c.count}</span>
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
                          href={`/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specSlug}/experience/${levelSlug}`}
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

              {/* Top Employers Card */}
              {stats.employers && stats.employers.length > 0 && (
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
                        href={`/jobs/nursing/employer/${emp.slug}/experience/${levelSlug}`}
                        className="flex justify-between items-center group hover:text-orange-600 transition-colors py-1"
                      >
                        <span className="text-gray-900 group-hover:text-orange-600 font-medium">{emp.name}</span>
                        <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
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
                        <JobAlertSignup compact={true} state={stateCode} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <>
              <SoftZeroContent
                title={`No ${experienceLevel} RN Jobs in ${stateFullName} Right Now`}
                description={`${experienceLevel} nursing positions in ${stateFullName} are updated daily.`}
                alternatives={[
                  { label: `View All Jobs in ${stateFullName}`, href: `/jobs/nursing/${stateCode.toLowerCase()}` },
                  { label: `View All ${experienceLevel} RN Jobs`, href: `/jobs/nursing/experience/${levelSlug}` },
                  { label: 'Browse All RN Jobs', href: '/jobs/nursing' },
                ]}
              />
              {softZeroData?.otherExperienceLevels && (
                <RelatedJobsGrid
                  title={`Other Experience Levels in ${stateFullName}`}
                  colorScheme="blue"
                  items={softZeroData.otherExperienceLevels
                    .filter(e => e.slug !== levelSlug)
                    .map(e => ({ label: e.label, href: `/jobs/nursing/${stateCode.toLowerCase()}/experience/${e.slug}`, count: e.count }))}
                />
              )}
              {softZeroData?.otherStates && (
                <RelatedJobsGrid
                  title={`${experienceLevel} RN Jobs in Other States`}
                  colorScheme="green"
                  items={softZeroData.otherStates
                    .filter(s => s.slug !== stateCode.toLowerCase())
                    .map(s => ({ label: s.label, href: `/jobs/nursing/${s.slug}/experience/${levelSlug}`, count: s.count }))}
                />
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 my-8">
              {currentPage > 1 && (
                <Link
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/experience/${levelSlug}?page=${currentPage - 1}`}
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
                  href={`/jobs/nursing/${stateCode.toLowerCase()}/experience/${levelSlug}?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}

          {/* Footer: Other Experience Levels (FIRST) */}
          {stats?.otherExperienceLevels && stats.otherExperienceLevels.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Other Experience Levels in {stateFullName}
                </h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  {stats.otherExperienceLevels.map((exp, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/experience/${exp.slug}`}
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

          {/* Footer: Browse by City */}
          {stats?.cities && stats.cities.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {experienceLevel} RN Jobs by City in {stateFullName}
                </h2>
                <p className="text-gray-600">
                  Find {experienceLevel.toLowerCase()} nursing positions in {stats.cities.length} {stats.cities.length === 1 ? 'city' : 'cities'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.cities.map((c, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/${generateCitySlug(c.city)}/experience/${levelSlug}`}
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

          {/* Footer: Browse by Specialty */}
          {stats?.specialties && stats.specialties.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {experienceLevel} RN Jobs by Specialty in {stateFullName}
                </h2>
                <p className="text-gray-600">
                  Explore {stats.specialties.length} nursing {stats.specialties.length === 1 ? 'specialty' : 'specialties'} with {experienceLevel.toLowerCase()} positions
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
                  {stats.specialties.map((spec, idx) => {
                    const specSlug = specialtyToSlug(normalizeSpecialty(spec.specialty));
                    return (
                      <Link
                        key={idx}
                        href={`/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specSlug}/experience/${levelSlug}`}
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

          {/* Job Alert Signup */}
          <div className="mt-16" id="job-alert-form" data-job-alert-form>
            <JobAlertSignup state={stateCode} />
          </div>

          <StickyJobAlertCTA specialty={experienceLevel} location={stateFullName} />
        </div>
      </div>
    </>
  );
}
