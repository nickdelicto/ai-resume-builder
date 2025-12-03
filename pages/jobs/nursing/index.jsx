import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../lib/utils/jobCardUtils';
import JobAlertSignup from '../../../components/JobAlertSignup';
import StickyJobAlertCTA from '../../../components/StickyJobAlertCTA';

// Import SEO utilities (CommonJS module)
const seoUtils = require('../../../lib/seo/jobSEO');

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
    experienceLevels: []
  });
  const [browseStatsLoading, setBrowseStatsLoading] = useState(true);
  // Initialize filters from URL query params
  const [filters, setFilters] = useState({
    state: router.query.state || '',
    city: router.query.city || '',
    specialty: router.query.specialty || '',
    jobType: router.query.jobType || '',
    experienceLevel: router.query.experienceLevel || '',
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
      search: router.query.search || ''
    });
  }, [router.query.state, router.query.city, router.query.specialty, router.query.jobType, router.query.experienceLevel, router.query.search]);

  // Fetch jobs when filters or page changes
  useEffect(() => {
    fetchJobs();
  }, [router.query.page, router.query.state, router.query.city, router.query.specialty, router.query.jobType, router.query.experienceLevel, router.query.search]);

  // Fetch browse statistics on mount
  useEffect(() => {
    fetchBrowseStats();
  }, []);

  const fetchBrowseStats = async () => {
    try {
      const response = await fetch('/api/jobs/browse-stats');
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
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset to page 1 when filters change
    router.push({
      pathname: '/jobs/nursing',
      query: { ...filters, [key]: value, page: 1 }
    }, undefined, { shallow: true });
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

  // Generate SEO meta tags based on active filters (with error handling)
  const seoMeta = seoUtils.generateListingPageMetaTags 
    ? seoUtils.generateListingPageMetaTags(filters || {}, pagination || null)
    : {
        title: '10,000+ RN Jobs Nationwide - Hiring Now!',
        description: 'Browse 10,000+ Registered Nurse (RN) jobs with salary info. Apply directly to top hospitals and healthcare facilities nationwide. Start your search today!',
        keywords: 'registered nurse, rn jobs, nursing jobs',
        canonicalUrl: 'https://intelliresume.net/jobs/nursing',
        ogImage: 'https://intelliresume.net/og-image-jobs.png'
      };

  return (
    <>
      <Head>
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
        <meta property="og:site_name" content="IntelliResume" />
        
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

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Registered Nurse (RN) Jobs in USA
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Find nursing opportunities at top healthcare employers across the United States. Search by location, specialty, and more.{' '}
              
              <Link href="/jobs/nursing/rn-salary-calculator" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                Also, Calculate your RN salary here →
              </Link>
            </p>
            {pagination && pagination.total > 0 && (
              <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {pagination.total} {pagination.total === 1 ? 'job' : 'jobs'} available
              </div>
            )}
          </div>

          {/* Browse Sections - Quick Navigation to Programmatic Pages */}
          {!browseStatsLoading && (browseStats.states.length > 0 || browseStats.employers.length > 0 || browseStats.specialties.length > 0) && (
            <div className="mb-8 space-y-6">
              {/* Browse by State */}
              {browseStats.states.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-900">Browse by State</h2>
                    <span className="text-sm text-gray-600">({browseStats.states.length} states)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {browseStats.states.map((state) => {
                      // Generate state slug - try state code first, fallback to full name lowercase
                      const stateSlug = state.code.toLowerCase();
                      return (
                        <Link
                          key={state.code}
                          href={`/jobs/nursing/${stateSlug}`}
                          className="group flex items-center justify-between px-3 py-2 rounded-lg border-2 border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all"
                        >
                          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                            {state.fullName}
                          </span>
                          <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {state.count}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Browse by Employer */}
              {browseStats.employers.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-900">Browse by Employer</h2>
                    <span className="text-sm text-gray-600">(Top {browseStats.employers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {browseStats.employers.map((employer) => (
                      <Link
                        key={employer.slug}
                        href={`/jobs/nursing/employer/${employer.slug}`}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg border-2 border-green-300 bg-white hover:border-green-500 hover:bg-green-50 hover:shadow-md transition-all"
                      >
                        <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 flex-1 truncate">
                          {employer.name}
                        </span>
                        <span className="text-xs font-semibold text-green-600 group-hover:text-green-700 bg-green-100 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                          {employer.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Browse by Specialty */}
              {browseStats.specialties.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-900">Browse by Specialty</h2>
                    <span className="text-sm text-gray-600">({browseStats.specialties.length} specialties)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {browseStats.specialties.map((specialty) => (
                      <Link
                        key={specialty.slug}
                        href={`/jobs/nursing/specialty/${specialty.slug}`}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg border-2 border-purple-300 bg-white hover:border-purple-500 hover:bg-purple-50 hover:shadow-md transition-all"
                      >
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                          {specialty.name}
                        </span>
                        <span className="text-xs font-semibold text-purple-600 group-hover:text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {specialty.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter Section - Clear visual separation */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-gray-300 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
                <h2 className="text-base font-bold text-gray-800">Filter & Search Jobs</h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>
            <p className="text-center text-sm text-gray-600 mb-4">
              Use the filters below to narrow down your search results
            </p>
          </div>

          {/* Filters - Tool-style card with distinct dark appearance */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-6 mb-8 border-2 border-gray-600 relative overflow-hidden">
            {/* More visible diagonal stripe pattern overlay */}
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)`
            }}></div>
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg border border-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-100">Refine Your Search</span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <span className="flex items-center gap-1 text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    Search
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Job title, keywords..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <span className="flex items-center gap-1 text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    City
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Cleveland, Independence"
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <span className="flex items-center gap-1 text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    State
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="NY, CA, FL, MA, TX, OH..."
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value.toUpperCase())}
                  maxLength="2"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <span className="flex items-center gap-1 text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Specialty
                  </span>
                </label>
                <select
                  value={filters.specialty}
                  onChange={(e) => handleFilterChange('specialty', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all bg-white text-gray-900"
                >
                  <option value="">All Specialties</option>
                  {browseStats.specialties.map((specialty) => (
                    <option key={specialty.name} value={specialty.name}>
                      {specialty.name} ({specialty.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <span className="flex items-center gap-1 text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Employment Type
                  </span>
                </label>
                <select
                  value={filters.jobType}
                  onChange={(e) => handleFilterChange('jobType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all bg-white text-gray-900"
                >
                  <option value="">All Types</option>
                  {browseStats.jobTypes.map((jobType) => (
                    <option key={jobType.name} value={jobType.name}>
                      {jobType.name} ({jobType.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <span className="flex items-center gap-1 text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Experience Level
                  </span>
                </label>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all bg-white text-gray-900"
                >
                  <option value="">All Levels</option>
                  {browseStats.experienceLevels.map((level) => (
                    <option key={level.name} value={level.name}>
                      {level.name} ({level.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(filters.state || filters.city || filters.specialty || filters.jobType || filters.experienceLevel || filters.search) && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-300 font-medium">Active filters:</span>
                  {filters.search && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      "{filters.search}"
                      <button onClick={() => handleFilterChange('search', '')} className="hover:text-blue-900">×</button>
                    </span>
                  )}
                  {filters.city && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      City: {filters.city}
                      <button onClick={() => handleFilterChange('city', '')} className="hover:text-green-900">×</button>
                    </span>
                  )}
                  {filters.state && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      State: {filters.state}
                      <button onClick={() => handleFilterChange('state', '')} className="hover:text-green-900">×</button>
                    </span>
                  )}
                  {filters.specialty && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      {filters.specialty}
                      <button onClick={() => handleFilterChange('specialty', '')} className="hover:text-purple-900">×</button>
                    </span>
                  )}
                  {filters.jobType && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                      {filters.jobType}
                      <button onClick={() => handleFilterChange('jobType', '')} className="hover:text-orange-900">×</button>
                    </span>
                  )}
                  {filters.experienceLevel && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      {filters.experienceLevel}
                      <button onClick={() => handleFilterChange('experienceLevel', '')} className="hover:text-purple-900">×</button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setFilters({ state: '', city: '', specialty: '', jobType: '', experienceLevel: '', search: '' });
                      router.push('/jobs/nursing', undefined, { shallow: true });
                    }}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>

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
                  setFilters({ state: '', city: '', specialty: '', jobType: '', experienceLevel: '', search: '' });
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
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                                {job.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                                <span className="flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="font-medium">{job.city}, {job.state}</span>
                                </span>
                                {job.employer && (
                                  <span className="flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 11.09a8.97 8.97 0 00.7 2.515 8.97 8.97 0 002.5-.7l-1.005-1.005a1 1 0 00-1.414-1.414l-1.005-1.005zM3.04 12.5a11.053 11.053 0 011.05.174 1 1 0 01.89.89c.03.343.07.683.116 1.02L3.04 12.5zM15.34 13.828l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414a8.97 8.97 0 002.5-.7zM16.69 9.397l-2.25.961a11.115 11.115 0 01.25 3.762 1 1 0 01-.89.89c-.342.03-.683.07-1.02.116l2.25-.96a1 1 0 000-1.838l-7-3z" />
                                    </svg>
                                    <span>{job.employer.name}</span>
                                  </span>
                                )}
                                {formatPayForCard(job.salaryMin, job.salaryMax, job.salaryType) && (
                                  <span className="text-green-700 font-medium flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                    </svg>
                                    {formatPayForCard(job.salaryMin, job.salaryMax, job.salaryType)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {formatDate(job.scrapedAt)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {job.specialty && (
                              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {(() => {
                                  // Map legacy "All Specialties" to "General Nursing"
                                  if (job.specialty.toLowerCase() === 'all specialties') {
                                    return 'General Nursing';
                                  }
                                  // Keep nursing acronyms in ALL CAPS
                                  const nursingAcronyms = ['ICU', 'NICU', 'ER', 'OR', 'PACU', 'PCU', 'CCU', 'CVICU', 'MICU', 'SICU', 'PICU'];
                                  return job.specialty.split(' ').map(word => {
                                    const upperWord = word.toUpperCase();
                                    return nursingAcronyms.includes(upperWord) ? upperWord : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                                  }).join(' ');
                                })()}
                              </span>
                            )}
                            {job.jobType && (
                              <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {job.jobType.toLowerCase() === 'prn' || job.jobType.toLowerCase() === 'per diem' ? 'PRN' : job.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                              </span>
                            )}
                            {job.shiftType && (
                              <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                                {job.shiftType}
                              </span>
                            )}
                            {job.experienceLevel && (
                              <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
                                {job.experienceLevel.replace('-', ' ')}
                              </span>
                            )}
                          </div>
                          
                          {/* Description Preview */}
                          {job.metaDescription && (
                            <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed">
                              {job.metaDescription.replace(/Find RN nursing jobs at Cleveland Clinic\./g, '')}
                            </p>
                          )}
                        </div>
                        
                        {/* Arrow Indicator */}
                        <div className="flex-shrink-0 self-center">
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

          {/* Job Alert Signup - Before Footer */}
          <div className="mt-16" data-job-alert-form>
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
