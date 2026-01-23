import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../lib/utils/jobCardUtils';
import JobAlertSignup from '../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../components/StickyJobAlertCTA';

// Import SEO utilities (CommonJS module)
const seoUtils = require('../../../lib/seo/jobSEO');
const { getEmployerLogoPath } = require('../../../lib/utils/employerLogos');

export default function NursingJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [browseStats, setBrowseStats] = useState({
    states: [],
    employers: [],
    specialties: [],
    jobTypes: [],
    experienceLevels: [],
    shiftTypes: []
  });
  const [browseStatsLoading, setBrowseStatsLoading] = useState(true);

  // Unfiltered stats for Browse RN Jobs section (SEO links at bottom)
  const [unfilteredBrowseStats, setUnfilteredBrowseStats] = useState({
    states: [],
    employers: [],
    specialties: [],
    jobTypes: [],
    experienceLevels: [],
    shiftTypes: []
  });
  const [unfilteredStatsLoading, setUnfilteredStatsLoading] = useState(true);

  // Sidebar state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    state: true,
    specialty: true,
    jobType: true,
    experienceLevel: true,
    shiftType: true,
    employer: true
  });
  const [showMoreStates, setShowMoreStates] = useState(false);
  const [showMoreSpecialties, setShowMoreSpecialties] = useState(false);
  const [showMoreEmployers, setShowMoreEmployers] = useState(false);
  const [showMoreCities, setShowMoreCities] = useState(false);

  // Cities for cascading filter (loaded when state is selected)
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Browse section expansion (for SEO links at bottom)
  const [browseExpanded, setBrowseExpanded] = useState({
    states: false,
    specialties: false,
    employers: false
  });

  // Initialize filters from URL query params
  const [filters, setFilters] = useState({
    state: router.query.state || '',
    city: router.query.city || '',
    specialty: router.query.specialty || '',
    jobType: router.query.jobType || '',
    experienceLevel: router.query.experienceLevel || '',
    shiftType: router.query.shiftType || '',
    signOnBonus: router.query.signOnBonus || '',
    employer: router.query.employer || '',
    search: router.query.search || ''
  });

  // Update filters when router query changes
  useEffect(() => {
    setFilters({
      state: router.query.state || '',
      city: router.query.city || '',
      specialty: router.query.specialty || '',
      jobType: router.query.jobType || '',
      experienceLevel: router.query.experienceLevel || '',
      shiftType: router.query.shiftType || '',
      signOnBonus: router.query.signOnBonus || '',
      employer: router.query.employer || '',
      search: router.query.search || ''
    });
  }, [router.query.state, router.query.city, router.query.specialty, router.query.jobType, router.query.experienceLevel, router.query.shiftType, router.query.signOnBonus, router.query.employer, router.query.search]);

  // Fetch jobs when filters or page changes
  useEffect(() => {
    fetchJobs();
  }, [router.query.page, router.query.state, router.query.city, router.query.specialty, router.query.jobType, router.query.experienceLevel, router.query.shiftType, router.query.signOnBonus, router.query.employer, router.query.search]);

  // Fetch browse statistics on mount and when filters change
  useEffect(() => {
    fetchBrowseStats();
  }, [filters.state, filters.specialty, filters.jobType, filters.experienceLevel, filters.shiftType, filters.signOnBonus, filters.employer]);

  // Handle scroll to hash on page load (for links like /jobs/nursing#filters)
  useEffect(() => {
    if (!router.asPath.includes('#')) return;

    const hash = router.asPath.split('#')[1];
    const needsData = ['browse-states', 'browse-employers'].includes(hash);

    // For sections that depend on async data, wait until loading is complete
    if (needsData && browseStatsLoading) return;

    // Small delay to ensure DOM is ready after render
    setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, [router.asPath, browseStatsLoading]);

  const fetchBrowseStats = async () => {
    try {
      // Build query params from current filters
      const params = new URLSearchParams();
      if (filters.state) params.set('state', filters.state);
      if (filters.specialty) params.set('specialty', filters.specialty);
      if (filters.jobType) params.set('jobType', filters.jobType);
      if (filters.experienceLevel) params.set('experienceLevel', filters.experienceLevel);
      if (filters.shiftType) params.set('shiftType', filters.shiftType);
      if (filters.signOnBonus) params.set('signOnBonus', filters.signOnBonus);
      if (filters.employer) params.set('employerSlug', filters.employer);

      const url = `/api/jobs/browse-stats${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setBrowseStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching browse stats:', err);
    } finally {
      setBrowseStatsLoading(false);
    }
  };

  // Fetch cities for a selected state
  const fetchCities = async (stateCode) => {
    if (!stateCode) {
      setCities([]);
      return;
    }
    setCitiesLoading(true);
    try {
      const response = await fetch(`/api/job-alerts/cities?state=${stateCode}`);
      const data = await response.json();
      if (data.success && data.cities) {
        setCities(data.cities);
      } else {
        setCities([]);
      }
    } catch (err) {
      console.error('Error fetching cities:', err);
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  };

  // Fetch cities when state filter changes
  useEffect(() => {
    if (filters.state) {
      fetchCities(filters.state);
    } else {
      setCities([]);
    }
  }, [filters.state]);

  // Fetch unfiltered stats once on mount for the Browse RN Jobs section
  const fetchUnfilteredStats = async () => {
    try {
      const response = await fetch('/api/jobs/browse-stats');
      const data = await response.json();
      if (data.success) {
        setUnfilteredBrowseStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching unfiltered browse stats:', err);
    } finally {
      setUnfilteredStatsLoading(false);
    }
  };

  // Fetch unfiltered stats on mount
  useEffect(() => {
    fetchUnfilteredStats();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        page: router.query.page || '1',
        state: router.query.state || '',
        city: router.query.city || '',
        specialty: router.query.specialty || '',
        jobType: router.query.jobType || '',
        experienceLevel: router.query.experienceLevel || '',
        shiftType: router.query.shiftType || '',
        signOnBonus: router.query.signOnBonus || '',
        employerSlug: router.query.employer || '',
        search: router.query.search || ''
      };

      // Remove empty params
      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) delete queryParams[key];
      });

      const params = new URLSearchParams(queryParams);

      const response = await fetch(`/api/jobs/list?${params}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.data.jobs);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || 'Failed to load jobs');
      }
    } catch (err) {
      setError('Failed to load jobs. Please try again.');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    // If state changes, clear city filter and reset cities list
    if (key === 'state') {
      setFilters(prev => ({ ...prev, state: value, city: '' }));
      setShowMoreCities(false);
      router.push({
        pathname: '/jobs/nursing',
        query: { ...filters, state: value, city: '', page: 1 }
      }, undefined, { shallow: true });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
      router.push({
        pathname: '/jobs/nursing',
        query: { ...filters, [key]: value, page: 1 }
      }, undefined, { shallow: true });
    }
  };

  const handlePageChange = (newPage) => {
    router.push({
      pathname: '/jobs/nursing',
      query: { ...router.query, page: newPage }
    }, undefined, { shallow: true });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently posted';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Toggle sidebar section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Close mobile drawer only when navigating to a different page (not filter changes)
  // Track pathname separately - only close on actual page navigation
  const [prevPathname, setPrevPathname] = useState(router.pathname);
  useEffect(() => {
    if (router.pathname !== prevPathname) {
      setMobileFiltersOpen(false);
      setPrevPathname(router.pathname);
    }
  }, [router.pathname, prevPathname]);

  // Collapsible Section Component
  const SidebarSection = ({ title, icon, color, expanded, onToggle, children }) => (
    <div className={`border-b border-gray-200 ${expanded ? 'pb-3' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color}`}></span>
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {expanded && <div className="mt-2">{children}</div>}
    </div>
  );

  // Generate SEO meta tags based on active filters (with error handling)
  const seoMeta = seoUtils.generateListingPageMetaTags 
    ? seoUtils.generateListingPageMetaTags(filters || {}, pagination || null)
    : {
        title: '10,000+ RN Jobs Nationwide - Hiring Now!',
        description: 'Browse 10,000+ Registered Nurse jobs with salary info. Apply directly to top hospitals and healthcare facilities nationwide. Start your search today!',
        keywords: 'registered nurse, rn jobs, nursing jobs',
        canonicalUrl: 'https://intelliresume.net/jobs/nursing',
        ogImage: 'https://intelliresume.net/og-image-jobs.png'
      };

  return (
    <>
      <Head>
        {/* Custom Scrollbar Styles */}
        <style>{`
          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 3px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .scrollbar-thin {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
        `}</style>
        {/* Primary Meta Tags */}
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={seoMeta.canonicalUrl} key="canonical" />
        
        {/* Robots */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:image" content={seoMeta.ogImage} />
        <meta property="og:site_name" content="IntelliResume Health" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={seoMeta.canonicalUrl} />
        <meta name="twitter:title" content={seoMeta.title} />
        <meta name="twitter:description" content={seoMeta.description} />
        <meta name="twitter:image" content={seoMeta.ogImage} />
        
        {/* CollectionPage Schema - for job listing pages */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": seoMeta.title,
              "description": seoMeta.description,
              "url": seoMeta.canonicalUrl,
              "numberOfItems": pagination?.total || 0,
              "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": pagination?.total || 0,
                "itemListElement": jobs.slice(0, 10).map((job, index) => {
                  // Generate complete JobPosting schema for each job
                  // This includes all required fields: title, description, hiringOrganization, 
                  // jobLocation, datePosted, employmentType, validThrough, etc.
                  const jobPostingSchema = seoUtils.generateJobPostingSchema(job);
                  
                  // Only include if schema was generated successfully
                  if (!jobPostingSchema) return null;
                  
                  return {
                  "@type": "ListItem",
                  "position": index + 1,
                    "item": jobPostingSchema  // Complete schema with all required fields
                  };
                }).filter(Boolean)  // Remove any null entries
              }
            })
          }}
        />
      </Head>

      {/* Mobile Filters Drawer Overlay */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filters & Browse</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {/* Mobile Sidebar Content - Same as desktop */}
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* By State */}
              <SidebarSection title="By State" color="bg-blue-500" expanded={expandedSections.state} onToggle={() => toggleSection('state')}>
                <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {(showMoreStates ? browseStats.states : browseStats.states.slice(0, 15)).map((state) => (
                    <button key={state.code} onClick={() => handleFilterChange('state', filters.state === state.code ? '' : state.code)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.state === state.code ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50 text-gray-700'}`}>
                      <span>{state.fullName}</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{state.count}</span>
                    </button>
                  ))}
                  {browseStats.states.length > 15 && (
                    <button onClick={() => setShowMoreStates(!showMoreStates)} className="text-sm text-blue-600 hover:underline mt-2">
                      {showMoreStates ? 'Show less' : `Show all ${browseStats.states.length}`}
                    </button>
                  )}
                </div>
              </SidebarSection>

              {/* By City (shown when state is selected) */}
              {filters.state && cities.length > 0 && (
                <SidebarSection title="By City" color="bg-cyan-500" expanded={true} onToggle={() => {}}>
                  <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                    {citiesLoading ? (
                      <div className="text-sm text-gray-500 py-2">Loading cities...</div>
                    ) : (
                      <>
                        {(showMoreCities ? cities : cities.slice(0, 15)).map((city) => (
                          <button key={city.name} onClick={() => handleFilterChange('city', filters.city === city.name ? '' : city.name)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.city === city.name ? 'bg-cyan-100 text-cyan-800' : 'hover:bg-cyan-50 text-gray-700'}`}>
                            <span>{city.name}</span>
                            <span className="text-xs text-cyan-600 bg-cyan-100 px-2 py-0.5 rounded-full">{city.jobCount}</span>
                          </button>
                        ))}
                        {cities.length > 15 && (
                          <button onClick={() => setShowMoreCities(!showMoreCities)} className="text-sm text-cyan-600 hover:underline mt-2">
                            {showMoreCities ? 'Show less' : `Show all ${cities.length}`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </SidebarSection>
              )}

              {/* By Specialty */}
              <SidebarSection title="By Specialty" color="bg-purple-500" expanded={expandedSections.specialty} onToggle={() => toggleSection('specialty')}>
                <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {(showMoreSpecialties ? browseStats.specialties : browseStats.specialties.slice(0, 15)).map((specialty) => (
                    <button key={specialty.slug} onClick={() => handleFilterChange('specialty', filters.specialty === specialty.name ? '' : specialty.name)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.specialty === specialty.name ? 'bg-purple-100 text-purple-800' : 'hover:bg-purple-50 text-gray-700'}`}>
                      <span>{specialty.name}</span>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{specialty.count}</span>
                    </button>
                  ))}
                  {browseStats.specialties.length > 15 && (
                    <button onClick={() => setShowMoreSpecialties(!showMoreSpecialties)} className="text-sm text-purple-600 hover:underline mt-2">
                      {showMoreSpecialties ? 'Show less' : `Show all ${browseStats.specialties.length}`}
                    </button>
                  )}
                </div>
              </SidebarSection>

              {/* By Job Type */}
              <SidebarSection title="By Job Type" color="bg-orange-500" expanded={expandedSections.jobType} onToggle={() => toggleSection('jobType')}>
                <div className="space-y-1">
                  {browseStats.jobTypes.map((jobType) => (
                    <button key={jobType.slug} onClick={() => handleFilterChange('jobType', filters.jobType === jobType.name ? '' : jobType.name)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.jobType === jobType.name ? 'bg-orange-100 text-orange-800' : 'hover:bg-orange-50 text-gray-700'}`}>
                      <span>{jobType.name}</span>
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{jobType.count}</span>
                    </button>
                  ))}
                </div>
              </SidebarSection>

              {/* By Experience Level */}
              <SidebarSection title="By Experience" color="bg-teal-500" expanded={expandedSections.experienceLevel} onToggle={() => toggleSection('experienceLevel')}>
                <div className="space-y-1">
                  {browseStats.experienceLevels.map((level) => (
                    <button key={level.slug} onClick={() => handleFilterChange('experienceLevel', filters.experienceLevel === level.name ? '' : level.name)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.experienceLevel === level.name ? 'bg-teal-100 text-teal-800' : 'hover:bg-teal-50 text-gray-700'}`}>
                      <span>{level.name}</span>
                      <span className="text-xs text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">{level.count}</span>
                    </button>
                  ))}
                </div>
              </SidebarSection>

              {/* By Shift Type */}
              <SidebarSection title="By Shift" color="bg-indigo-500" expanded={expandedSections.shiftType} onToggle={() => toggleSection('shiftType')}>
                <div className="space-y-1">
                  {browseStats.shiftTypes.map((shift) => (
                    <button key={shift.slug} onClick={() => handleFilterChange('shiftType', filters.shiftType === shift.slug ? '' : shift.slug)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.shiftType === shift.slug ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-indigo-50 text-gray-700'}`}>
                      <span>{shift.name}</span>
                      <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{shift.count}</span>
                    </button>
                  ))}
                </div>
              </SidebarSection>

              {/* Sign-On Bonus Filter */}
              <div className="border-b border-gray-200 py-3">
                <button
                  onClick={() => handleFilterChange('signOnBonus', filters.signOnBonus === 'true' ? '' : 'true')}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm text-left transition-colors ${filters.signOnBonus === 'true' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-emerald-50 text-gray-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold">With Sign-On Bonus</span>
                  </div>
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${filters.signOnBonus === 'true' ? 'bg-emerald-600' : 'border-2 border-gray-300'}`}>
                    {filters.signOnBonus === 'true' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>

              {/* Top Employers - Link to employer pages for SEO value */}
              <SidebarSection title="Top Employers" color="bg-green-500" expanded={expandedSections.employer} onToggle={() => toggleSection('employer')}>
                <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {(showMoreEmployers ? browseStats.employers : browseStats.employers.slice(0, 15)).map((employer) => (
                    <Link key={employer.slug} href={`/jobs/nursing/employer/${employer.slug}`}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-green-50 text-sm">
                      <span className="text-gray-700 truncate flex-1">{employer.name}</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full ml-2">{employer.count}</span>
                    </Link>
                  ))}
                  {browseStats.employers.length > 15 && (
                    <button onClick={() => setShowMoreEmployers(!showMoreEmployers)} className="text-sm text-green-600 hover:underline mt-2">
                      {showMoreEmployers ? 'Show less' : `Show all ${browseStats.employers.length}`}
                    </button>
                  )}
                </div>
              </SidebarSection>

              {/* Clear Filters */}
              {(filters.state || filters.city || filters.specialty || filters.jobType || filters.experienceLevel || filters.shiftType || filters.signOnBonus || filters.search) && (
                <button
                  onClick={() => {
                    setFilters({ state: '', city: '', specialty: '', jobType: '', experienceLevel: '', shiftType: '', signOnBonus: '', employer: '', search: '' });
                    setCities([]);
                    setShowMoreCities(false);
                    router.push('/jobs/nursing', undefined, { shallow: true });
                  }}
                  className="w-full mt-4 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "var(--font-figtree), 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              RN Jobs in USA
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              Find nursing opportunities at top healthcare employers.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {pagination && pagination.total > 0 && (
                <span className="inline-block px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {pagination.total.toLocaleString()} jobs available
                </span>
              )}
              <Link
                href="/jobs/nursing/rn-salary-calculator"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 rounded-full text-sm font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                RN Salary Calculator
              </Link>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-blue-50 border-2 border-blue-300 rounded-xl shadow-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <span className="text-base">Filter Jobs</span>
              {(() => {
                const activeCount = [filters.state, filters.city, filters.specialty, filters.jobType, filters.experienceLevel, filters.shiftType, filters.signOnBonus, filters.search].filter(Boolean).length;
                return activeCount > 0 ? (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeCount} active</span>
                ) : null;
              })()}
            </button>
          </div>

          {/* Main Layout: Sidebar + Content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin">
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {!browseStatsLoading && (
                  <>
                    {/* By State */}
                    {browseStats.states.length > 0 && (
                      <SidebarSection title="By State" color="bg-blue-500" expanded={expandedSections.state} onToggle={() => toggleSection('state')}>
                        <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                          {(showMoreStates ? browseStats.states : browseStats.states.slice(0, 15)).map((state) => (
                            <button key={state.code} onClick={() => handleFilterChange('state', filters.state === state.code ? '' : state.code)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.state === state.code ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50 text-gray-700'}`}>
                              <span>{state.fullName}</span>
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{state.count}</span>
                            </button>
                          ))}
                          {browseStats.states.length > 15 && (
                            <button onClick={() => setShowMoreStates(!showMoreStates)} className="text-sm text-blue-600 hover:underline mt-2">
                              {showMoreStates ? 'Show less' : `Show all ${browseStats.states.length}`}
                            </button>
                          )}
                        </div>
                      </SidebarSection>
                    )}

                    {/* By City (shown when state is selected) */}
                    {filters.state && cities.length > 0 && (
                      <SidebarSection title="By City" color="bg-cyan-500" expanded={true} onToggle={() => {}}>
                        <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                          {citiesLoading ? (
                            <div className="text-sm text-gray-500 py-2">Loading cities...</div>
                          ) : (
                            <>
                              {(showMoreCities ? cities : cities.slice(0, 15)).map((city) => (
                                <button key={city.name} onClick={() => handleFilterChange('city', filters.city === city.name ? '' : city.name)}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.city === city.name ? 'bg-cyan-100 text-cyan-800' : 'hover:bg-cyan-50 text-gray-700'}`}>
                                  <span>{city.name}</span>
                                  <span className="text-xs text-cyan-600 bg-cyan-100 px-2 py-0.5 rounded-full">{city.jobCount}</span>
                                </button>
                              ))}
                              {cities.length > 15 && (
                                <button onClick={() => setShowMoreCities(!showMoreCities)} className="text-sm text-cyan-600 hover:underline mt-2">
                                  {showMoreCities ? 'Show less' : `Show all ${cities.length}`}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </SidebarSection>
                    )}

                    {/* By Specialty */}
                    {browseStats.specialties.length > 0 && (
                      <SidebarSection title="By Specialty" color="bg-purple-500" expanded={expandedSections.specialty} onToggle={() => toggleSection('specialty')}>
                        <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                          {(showMoreSpecialties ? browseStats.specialties : browseStats.specialties.slice(0, 15)).map((specialty) => (
                            <button key={specialty.slug} onClick={() => handleFilterChange('specialty', filters.specialty === specialty.name ? '' : specialty.name)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.specialty === specialty.name ? 'bg-purple-100 text-purple-800' : 'hover:bg-purple-50 text-gray-700'}`}>
                              <span>{specialty.name}</span>
                              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{specialty.count}</span>
                            </button>
                          ))}
                          {browseStats.specialties.length > 15 && (
                            <button onClick={() => setShowMoreSpecialties(!showMoreSpecialties)} className="text-sm text-purple-600 hover:underline mt-2">
                              {showMoreSpecialties ? 'Show less' : `Show all ${browseStats.specialties.length}`}
                            </button>
                          )}
                        </div>
                      </SidebarSection>
                    )}

                    {/* By Job Type */}
                    {browseStats.jobTypes.length > 0 && (
                      <SidebarSection title="By Job Type" color="bg-orange-500" expanded={expandedSections.jobType} onToggle={() => toggleSection('jobType')}>
                        <div className="space-y-1">
                          {browseStats.jobTypes.map((jobType) => (
                            <button key={jobType.slug} onClick={() => handleFilterChange('jobType', filters.jobType === jobType.name ? '' : jobType.name)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.jobType === jobType.name ? 'bg-orange-100 text-orange-800' : 'hover:bg-orange-50 text-gray-700'}`}>
                              <span>{jobType.name}</span>
                              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{jobType.count}</span>
                            </button>
                          ))}
                        </div>
                      </SidebarSection>
                    )}

                    {/* By Experience Level */}
                    {browseStats.experienceLevels.length > 0 && (
                      <SidebarSection title="By Experience" color="bg-teal-500" expanded={expandedSections.experienceLevel} onToggle={() => toggleSection('experienceLevel')}>
                        <div className="space-y-1">
                          {browseStats.experienceLevels.map((level) => (
                            <button key={level.slug} onClick={() => handleFilterChange('experienceLevel', filters.experienceLevel === level.name ? '' : level.name)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.experienceLevel === level.name ? 'bg-teal-100 text-teal-800' : 'hover:bg-teal-50 text-gray-700'}`}>
                              <span>{level.name}</span>
                              <span className="text-xs text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">{level.count}</span>
                            </button>
                          ))}
                        </div>
                      </SidebarSection>
                    )}

                    {/* By Shift Type */}
                    {browseStats.shiftTypes.length > 0 && (
                      <SidebarSection title="By Shift" color="bg-indigo-500" expanded={expandedSections.shiftType} onToggle={() => toggleSection('shiftType')}>
                        <div className="space-y-1">
                          {browseStats.shiftTypes.map((shift) => (
                            <button key={shift.slug} onClick={() => handleFilterChange('shiftType', filters.shiftType === shift.slug ? '' : shift.slug)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.shiftType === shift.slug ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-indigo-50 text-gray-700'}`}>
                              <span>{shift.name}</span>
                              <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{shift.count}</span>
                            </button>
                          ))}
                        </div>
                      </SidebarSection>
                    )}

                    {/* Sign-On Bonus Filter */}
                    <div className="border-b border-gray-200 py-3">
                      <button
                        onClick={() => handleFilterChange('signOnBonus', filters.signOnBonus === 'true' ? '' : 'true')}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm text-left transition-colors ${filters.signOnBonus === 'true' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-emerald-50 text-gray-700'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-semibold">With Sign-On Bonus</span>
                        </div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${filters.signOnBonus === 'true' ? 'bg-emerald-600' : 'border-2 border-gray-300'}`}>
                          {filters.signOnBonus === 'true' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* By Employer */}
                    {browseStats.employers.length > 0 && (
                      <SidebarSection title="By Employer" color="bg-green-500" expanded={expandedSections.employer} onToggle={() => toggleSection('employer')}>
                        <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                          {(showMoreEmployers ? browseStats.employers : browseStats.employers.slice(0, 15)).map((employer) => (
                            <button key={employer.slug} onClick={() => handleFilterChange('employer', filters.employer === employer.slug ? '' : employer.slug)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left ${filters.employer === employer.slug ? 'bg-green-100 text-green-800' : 'hover:bg-green-50 text-gray-700'}`}>
                              <span className="truncate flex-1">{employer.name}</span>
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full ml-2">{employer.count}</span>
                            </button>
                          ))}
                          {browseStats.employers.length > 15 && (
                            <button onClick={() => setShowMoreEmployers(!showMoreEmployers)} className="text-sm text-green-600 hover:underline mt-2">
                              {showMoreEmployers ? 'Show less' : `Show all ${browseStats.employers.length}`}
                            </button>
                          )}
                        </div>
                      </SidebarSection>
                    )}
                  </>
                )}

                {/* Clear Filters */}
                {(filters.state || filters.city || filters.specialty || filters.jobType || filters.experienceLevel || filters.shiftType || filters.signOnBonus || filters.employer || filters.search) && (
                  <button
                    onClick={() => {
                      setFilters({ state: '', city: '', specialty: '', jobType: '', experienceLevel: '', shiftType: '', signOnBonus: '', employer: '', search: '' });
                      setCities([]);
                      setShowMoreCities(false);
                      router.push('/jobs/nursing', undefined, { shallow: true });
                    }}
                    className="w-full mt-4 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </aside>

            {/* Main Content - Job Listings */}
            <main className="flex-1 min-w-0">

          {/* Active Filters Bar */}
          {(filters.state || filters.city || filters.specialty || filters.jobType || filters.experienceLevel || filters.shiftType || filters.signOnBonus || filters.employer || filters.search) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500 font-medium">Active filters:</span>

                {filters.state && (
                  <button
                    onClick={() => handleFilterChange('state', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    <span>{browseStats.states.find(s => s.code === filters.state)?.fullName || filters.state}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.city && (
                  <button
                    onClick={() => handleFilterChange('city', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium hover:bg-cyan-200 transition-colors"
                  >
                    <span>{filters.city}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.specialty && (
                  <button
                    onClick={() => handleFilterChange('specialty', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
                  >
                    <span>{filters.specialty}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.jobType && (
                  <button
                    onClick={() => handleFilterChange('jobType', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    <span>{filters.jobType}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.experienceLevel && (
                  <button
                    onClick={() => handleFilterChange('experienceLevel', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-sm font-medium hover:bg-teal-200 transition-colors"
                  >
                    <span>{filters.experienceLevel}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.shiftType && (
                  <button
                    onClick={() => handleFilterChange('shiftType', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors"
                  >
                    <span>{browseStats.shiftTypes.find(s => s.slug === filters.shiftType)?.name || filters.shiftType}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.signOnBonus && (
                  <button
                    onClick={() => handleFilterChange('signOnBonus', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium hover:bg-emerald-200 transition-colors"
                  >
                    <span>Sign-On Bonus</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.employer && (
                  <button
                    onClick={() => handleFilterChange('employer', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
                  >
                    <span>{browseStats.employers.find(e => e.slug === filters.employer)?.name || filters.employer}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {filters.search && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <span>"{filters.search}"</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {/* Clear all - shown when multiple filters active */}
                {[filters.state, filters.specialty, filters.jobType, filters.experienceLevel, filters.shiftType, filters.signOnBonus, filters.employer, filters.search].filter(Boolean).length > 1 && (
                  <button
                    onClick={() => {
                      setFilters({ state: '', city: '', specialty: '', jobType: '', experienceLevel: '', shiftType: '', signOnBonus: '', employer: '', search: '' });
                      router.push('/jobs/nursing', undefined, { shallow: true });
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium ml-2"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Jobs List */}
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading jobs...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-red-800 font-semibold">Error loading jobs</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-16 text-center border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your filters or search terms.</p>
              <button
                onClick={() => {
                  setFilters({ state: '', city: '', specialty: '', jobType: '', experienceLevel: '', shiftType: '', signOnBonus: '', employer: '', search: '' });
                  setCities([]);
                  setShowMoreCities(false);
                  router.push('/jobs/nursing', undefined, { shallow: true });
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 mb-8">
                {jobs.map((job, index) => (
                  <React.Fragment key={job.id}>
                    <Link
                      href={`/jobs/nursing/${job.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 overflow-hidden"
                    >
                    <div className="p-4 sm:p-6">
                      <div className="flex gap-4">
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
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {job.title}
                            </h3>
                            <div className="flex-shrink-0 hidden sm:flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium whitespace-nowrap">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              {formatDate(job.scrapedAt)}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {job.city}, {job.state}
                            </span>
                            {job.employer && (
                              <span className="text-gray-500">• {job.employer.name}</span>
                            )}
                            {formatPayForCard(job.salaryMin, job.salaryMax, job.salaryType, job.jobType) && (
                              <span className="text-green-700 font-medium">
                                • {formatPayForCard(job.salaryMin, job.salaryMax, job.salaryType, job.jobType)}
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.specialty && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {(() => {
                                  if (job.specialty.toLowerCase() === 'all specialties') {
                                    return 'General Nursing';
                                  }
                                  const nursingAcronyms = ['ICU', 'NICU', 'ER', 'OR', 'PACU', 'PCU', 'CCU', 'CVICU', 'MICU', 'SICU', 'PICU'];
                                  return job.specialty.split(' ').map(word => {
                                    const upperWord = word.toUpperCase();
                                    return nursingAcronyms.includes(upperWord) ? upperWord : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                                  }).join(' ');
                                })()}
                              </span>
                            )}
                            {job.jobType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {job.jobType.toLowerCase() === 'prn' || job.jobType.toLowerCase() === 'per diem' ? 'PRN' : job.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                              </span>
                            )}
                            {job.shiftType && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                                {job.shiftType}
                              </span>
                            )}
                            {job.experienceLevel && (
                              <span className="inline-flex items-center px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
                                {job.experienceLevel.replace('-', ' ')}
                              </span>
                            )}
                            {job.hasSignOnBonus && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                                <span>💰</span>
                                Sign-On Bonus
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow Indicator */}
                        <div className="flex-shrink-0 self-center hidden sm:block">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Job Alert Signup after every 5 listings */}
                  {(index + 1) % 5 === 0 && index < jobs.length - 1 && (
                    <div className="my-6">
                      <JobAlertSignup 
                        compact={true}
                      />
                    </div>
                  )}
                </React.Fragment>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                      <span className="font-semibold text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                      <span className="font-semibold text-gray-900">{pagination.total}</span> jobs
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium text-gray-700 disabled:hover:bg-white"
                      >
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Previous
                        </span>
                      </button>
                      
                      <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-blue-700 font-semibold">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium text-gray-700 disabled:hover:bg-white"
                      >
                        <span className="flex items-center gap-1">
                          Next
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
            </main>
          </div>

          {/* Browse RN Jobs Section - SEO Links to Dedicated Pages (always shows unfiltered data) */}
          {!unfilteredStatsLoading && (
            <div className="mt-16 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Browse RN Jobs</h2>

              {/* Featured Links */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Featured
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/jobs/nursing/sign-on-bonus"
                    className="group inline-flex items-center gap-3 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    RN Jobs with Sign-On Bonus
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 md:gap-8">
                {/* By State */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    By State
                  </h3>
                  <ul className="space-y-1.5">
                    {(browseExpanded.states ? unfilteredBrowseStats.states : unfilteredBrowseStats.states.slice(0, 8)).map((state) => (
                      <li key={state.code}>
                        <Link
                          href={`/jobs/nursing/${state.slug}`}
                          className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          <span>{state.fullName}</span>
                          <span className="text-xs text-gray-400">({state.count})</span>
                        </Link>
                      </li>
                    ))}
                    {unfilteredBrowseStats.states.length > 8 && (
                      <li>
                        <button
                          onClick={() => setBrowseExpanded(prev => ({ ...prev, states: !prev.states }))}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline px-2 py-1 font-medium"
                        >
                          {browseExpanded.states ? 'Show less' : `View all ${unfilteredBrowseStats.states.length} states`}
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${browseExpanded.states ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    )}
                  </ul>
                </div>

                {/* By Specialty */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    By Specialty
                  </h3>
                  <ul className="space-y-1.5">
                    {(browseExpanded.specialties ? unfilteredBrowseStats.specialties : unfilteredBrowseStats.specialties.slice(0, 8)).map((specialty) => (
                      <li key={specialty.slug}>
                        <Link
                          href={`/jobs/nursing/specialty/${specialty.slug}`}
                          className="flex items-center justify-between text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                        >
                          <span>{specialty.name}</span>
                          <span className="text-xs text-gray-400">({specialty.count})</span>
                        </Link>
                      </li>
                    ))}
                    {unfilteredBrowseStats.specialties.length > 8 && (
                      <li>
                        <button
                          onClick={() => setBrowseExpanded(prev => ({ ...prev, specialties: !prev.specialties }))}
                          className="flex items-center gap-1 text-sm text-purple-600 hover:underline px-2 py-1 font-medium"
                        >
                          {browseExpanded.specialties ? 'Show less' : `View all ${unfilteredBrowseStats.specialties.length} specialties`}
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${browseExpanded.specialties ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    )}
                  </ul>
                </div>

                {/* By Job Type */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    By Job Type
                  </h3>
                  <ul className="space-y-1.5">
                    {unfilteredBrowseStats.jobTypes.map((jobType) => (
                      <li key={jobType.slug}>
                        <Link
                          href={`/jobs/nursing/job-type/${jobType.slug}`}
                          className="flex items-center justify-between text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 px-2 py-1 rounded transition-colors"
                        >
                          <span>{jobType.name}</span>
                          <span className="text-xs text-gray-400">({jobType.count})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* By Experience */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    By Experience
                  </h3>
                  <ul className="space-y-1.5">
                    {unfilteredBrowseStats.experienceLevels.map((level) => (
                      <li key={level.slug}>
                        <Link
                          href={`/jobs/nursing/experience/${level.slug}`}
                          className="flex items-center justify-between text-sm text-gray-600 hover:text-teal-600 hover:bg-teal-50 px-2 py-1 rounded transition-colors"
                        >
                          <span>{level.name}</span>
                          <span className="text-xs text-gray-400">({level.count})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* By Shift */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    By Shift
                  </h3>
                  <ul className="space-y-1.5">
                    {unfilteredBrowseStats.shiftTypes.map((shift) => (
                      <li key={shift.slug}>
                        <Link
                          href={`/jobs/nursing/shift/${shift.slug}`}
                          className="flex items-center justify-between text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                        >
                          <span>{shift.name}</span>
                          <span className="text-xs text-gray-400">({shift.count})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* By Employer */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    By Employer
                  </h3>
                  <ul className="space-y-1.5">
                    {(browseExpanded.employers ? unfilteredBrowseStats.employers : unfilteredBrowseStats.employers.slice(0, 8)).map((employer) => (
                      <li key={employer.slug}>
                        <Link
                          href={`/jobs/nursing/employer/${employer.slug}`}
                          className="flex items-center justify-between text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors"
                        >
                          <span className="truncate">{employer.name}</span>
                          <span className="text-xs text-gray-400 ml-1">({employer.count})</span>
                        </Link>
                      </li>
                    ))}
                    {unfilteredBrowseStats.employers.length > 8 && (
                      <li>
                        <button
                          onClick={() => setBrowseExpanded(prev => ({ ...prev, employers: !prev.employers }))}
                          className="flex items-center gap-1 text-sm text-green-600 hover:underline px-2 py-1 font-medium"
                        >
                          {browseExpanded.employers ? 'Show less' : `View all ${unfilteredBrowseStats.employers.length} employers`}
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${browseExpanded.employers ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" id="job-alert-form" data-job-alert-form>
            <JobAlertSignup />
          </div>

          {/* Sticky Bottom CTA Banner */}
          <StickyJobAlertCTA
            specialty=""
            location=""
          />
        </div>
      </div>
    </>
  );
}
