import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../lib/utils/jobCardUtils';

// Import SEO utilities (CommonJS module)
const seoUtils = require('../../../lib/seo/jobSEO');

export default function NursingJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  // Initialize filters from URL query params
  const [filters, setFilters] = useState({
    state: router.query.state || '',
    city: router.query.city || '',
    specialty: router.query.specialty || '',
    jobType: router.query.jobType || '',
    search: router.query.search || ''
  });

  // Update filters when router query changes
  useEffect(() => {
    setFilters({
      state: router.query.state || '',
      city: router.query.city || '',
      specialty: router.query.specialty || '',
      jobType: router.query.jobType || '',
      search: router.query.search || ''
    });
  }, [router.query.state, router.query.city, router.query.specialty, router.query.jobType, router.query.search]);

  // Fetch jobs when filters or page changes
  useEffect(() => {
    fetchJobs();
  }, [router.query.page, router.query.state, router.query.city, router.query.specialty, router.query.jobType, router.query.search]);

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
        title: 'RN Nursing Jobs | IntelliResume',
        description: 'Find Registered Nurse (RN) jobs at top healthcare employers.',
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
        <link rel="canonical" href={seoMeta.canonicalUrl} />
        
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
                "itemListElement": jobs.slice(0, 10).map((job, index) => ({
                  "@type": "ListItem",
                  "position": index + 1,
                  "item": {
                    "@type": "JobPosting",
                    "name": job.title,
                    "url": `https://intelliresume.net/jobs/nursing/${job.slug}`
                  }
                }))
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
              Registered Nurse (RN) Jobs
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Find nursing opportunities at top healthcare employers. Search by location, specialty, and more.
            </p>
            {pagination && pagination.total > 0 && (
              <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {pagination.total} {pagination.total === 1 ? 'job' : 'jobs'} available
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Filter Jobs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    State
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., OH, CA"
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value.toUpperCase())}
                  maxLength="2"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Specialty
                  </span>
                </label>
                <select
                  value={filters.specialty}
                  onChange={(e) => handleFilterChange('specialty', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="">All Specialties</option>
                  <option value="ICU">ICU</option>
                  <option value="ER">ER</option>
                  <option value="Travel">Travel</option>
                  <option value="Home Health">Home Health</option>
                  <option value="Hospice">Hospice</option>
                  <option value="Med-Surg">Med-Surg</option>
                  <option value="Ambulatory">Ambulatory</option>
                  <option value="OR">Operating Room</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Job Type
                  </span>
                </label>
                <select
                  value={filters.jobType}
                  onChange={(e) => handleFilterChange('jobType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="">All Types</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="prn">PRN</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(filters.state || filters.city || filters.specialty || filters.jobType || filters.search) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Active filters:</span>
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
                  <button
                    onClick={() => {
                      setFilters({ state: '', city: '', specialty: '', jobType: '', search: '' });
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
                  setFilters({ state: '', city: '', specialty: '', jobType: '', search: '' });
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
                {jobs.map((job) => (
                  <Link
                    key={job.id}
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
                                {job.specialty}
                              </span>
                            )}
                            {job.jobType && (
                              <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {job.jobType === 'prn' ? 'PRN' : job.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
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
        </div>
      </div>
    </>
  );
}
