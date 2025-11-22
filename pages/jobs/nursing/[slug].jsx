import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { formatPayForCard } from '../../../lib/utils/jobCardUtils';

// Import SEO utilities and state helpers (CommonJS module)
const seoUtils = require('../../../lib/seo/jobSEO');
const { getStateFullName } = require('../../../lib/jobScraperUtils');
const { detectStateFromSlug, fetchStateJobs, fetchJobBySlug } = require('../../../lib/services/jobPageData');
const { PrismaClient } = require('@prisma/client');

/**
 * Server-Side Rendering: Fetch data before rendering
 */
export async function getServerSideProps({ params, query, res }) {
  const { slug } = params;
  const page = query.page || '1';

  try {
    // Check if slug is a state (state page) or job (job detail page)
    const stateInfo = detectStateFromSlug(slug);

    if (stateInfo) {
      // This is a state page
      const { jobs, pagination, statistics } = await fetchStateJobs(stateInfo.stateCode, page);
      
      return {
        props: {
          isStatePage: true,
          stateCode: stateInfo.stateCode,
          stateFullName: stateInfo.stateFullName,
          jobs,
          pagination,
          stats: statistics
        }
      };
    } else {
      // This is a job detail page
      const result = await fetchJobBySlug(slug);
      
      if (!result || !result.job) {
        // Check if this job was deleted (return 410 Gone for better SEO)
        const prisma = new PrismaClient();
        
        try {
          const deletedJob = await prisma.deletedJob.findUnique({
            where: { slug }
          });
          
          if (deletedJob) {
            // Job was deleted - return 410 Gone (tells Google to deindex permanently)
            res.statusCode = 410;
            await prisma.$disconnect();
            return {
              props: {
                isGone: true,
                slug: slug
              }
            };
          }
          
          await prisma.$disconnect();
        } catch (dbError) {
          console.error('Error checking DeletedJob:', dbError);
          await prisma.$disconnect();
        }
        
        // Job never existed - return 404
        return {
          notFound: true
        };
      }

      return {
        props: {
          isStatePage: false,
          job: result.job,
          relatedJobs: result.relatedJobs
        }
      };
    }
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        error: 'Failed to load page data'
      }
    };
  }
}

export default function JobDetailPage({ 
  isStatePage = false,
  stateCode = null,
  stateFullName = null,
  jobs = [],
  pagination = null,
  stats = null,
  job = null,
  relatedJobs = [],
  error = null,
  isGone = false,
  slug = null
}) {
  const router = useRouter();

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently posted';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Clean description text - remove any remaining code artifacts but preserve formatting
  const cleanDescription = (text) => {
    if (!text) return '';
    
    // Remove CSS/JavaScript patterns but preserve newlines and structure
    let cleaned = text
      .replace(/\{[^}]{0,200}\}/g, '') // Remove CSS blocks
      .replace(/\[[^\]]{0,100}\]/g, '') // Remove bracket content
      .replace(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, '') // Remove function declarations
      .replace(/var\s+\w+\s*=\s*[^;]+;/g, '') // Remove var declarations
      .replace(/\.\w+\s*\{[^}]*\}/g, '') // Remove CSS class blocks
      .replace(/[a-zA-Z0-9\-_\.]+\{[^}]{10,}\}/g, '') // Remove technical patterns
      .replace(/[ \t]+/g, ' ') // Normalize spaces but keep newlines
      .trim();
    
    // SMARTER check: Only flag as suspicious if it looks like actual JavaScript code
    // Don't flag legitimate uses of words like "function" (e.g., "liver function", "bodily function")
    const hasSuspiciousJavaScript = 
      cleaned.includes('$(document)') ||
      cleaned.includes('current_job') ||
      cleaned.includes('.ready(') ||
      cleaned.includes('jQuery') ||
      (cleaned.match(/function\s*\(/g) || []).length > 2 || // Actual function declarations
      (cleaned.match(/var\s+\w+\s*=/g) || []).length > 2; // Actual var declarations
    
    // If the cleaned text is suspiciously short OR has actual JavaScript code patterns, return a message
    if (cleaned.length < 100 || hasSuspiciousJavaScript) {
      return 'Job description is being updated. Please visit the employer website for full details.';
    }
    
    return cleaned;
  };

  // Render markdown-formatted text to React elements
  // Handles: **bold**, ## headings, bullet points, section headers (text ending with :)
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const elements = [];
    let key = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - add spacing
        elements.push(<br key={key++} />);
        continue;
      }
      
      // Check for markdown heading (## Heading)
      const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const HeadingTag = `h${Math.min(level + 1, 6)}`; // ## -> h3, ### -> h4, etc.
        elements.push(
          React.createElement(
            HeadingTag,
            { 
              key: key++, 
              className: `font-bold text-gray-900 mb-3 mt-6 ${
                level === 2 ? 'text-xl' : level === 3 ? 'text-lg' : 'text-base'
              }` 
            },
            headingText
          )
        );
        continue;
      }
      
      // Check for section headers (text ending with colon, like "Pay Range:" or "Physical Requirements:")
      // These should be short (< 60 chars) and NOT be metadata lines (req#, Location, etc.)
      const isMetadataPattern = /^(req#|Location|Facilities|Professional Area|Department|Job Code|Schedule|Shift|Posted Date|Experience Level):/i;
      if (line.endsWith(':') && line.length < 60 && !isMetadataPattern.test(line)) {
        elements.push(
          <h3 key={key++} className="font-bold text-gray-900 text-lg mb-3 mt-6">
            {line}
          </h3>
        );
        continue;
      }
      
      // Check for bullet point
      if (line.startsWith('•')) {
        const bulletText = line.substring(1).trim();
        // Check if it contains bold markdown
        const parts = bulletText.split(/(\*\*[^*]+\*\*)/g);
        const bulletContent = parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        
        elements.push(
          <div key={key++} className="flex items-start gap-2 mb-2">
            <span className="text-blue-600 font-bold flex-shrink-0 leading-relaxed">•</span>
            <span className="flex-1 leading-relaxed">{bulletContent}</span>
          </div>
        );
        continue;
      }
      
      // Regular paragraph - check for bold markdown
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const paragraphContent = parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      
      elements.push(
        <p key={key++} className="leading-relaxed mb-3">{paragraphContent}</p>
      );
    }
    
    return elements;
  };

  // Handle page change for state pages
  const handlePageChange = (newPage) => {
    const currentSlug = router.query?.slug || (isStatePage && stateCode ? stateCode.toLowerCase() : '');
    router.push(`/jobs/nursing/${currentSlug}?page=${newPage}`);
  };

  // 410 Gone state (deleted job)
  if (isGone) {
    return (
      <>
        <Head>
          <title>Job No Longer Available | IntelliResume</title>
          <meta name="robots" content="noindex, follow" />
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
          <div className="max-w-2xl mx-auto px-6 py-12 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-amber-100 rounded-full mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                This Job Position Is Unavailable
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                This position is no longer available. It may have been filled, expired, or removed by the employer.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Looking for Similar Opportunities?</h2>
              <p className="text-gray-600 mb-6">
                Browse our current nursing job openings to find positions that match your skills and interests.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/jobs/nursing"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Browse All Nursing Jobs
                </Link>
                
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Head>
          <title>Error | IntelliResume</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Page</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/jobs/nursing"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      </>
    );
  }

  // If this is a state page, render state page UI
  if (isStatePage && stateCode) {
    const stateDisplayName = stateFullName || getStateFullName(stateCode) || stateCode;
    
    // Generate SEO meta tags
    const seoMeta = seoUtils.generateStatePageMetaTags(
      stateCode, 
      stateFullName, 
      { 
        total: pagination?.total || 0, 
        specialties: stats?.specialties || [] 
      }
    );

    return (
      <>
        <Head>
          {/* Primary Meta Tags */}
          <title>{seoMeta.title}</title>
          <meta name="description" content={seoMeta.description} />
          <meta name="keywords" content={seoMeta.keywords} />
          
          {/* Canonical URL */}
          <link rel="canonical" href={seoMeta.canonicalUrl} key="canonical" />
          
          {/* Robots - INDEX THIS PAGE */}
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
          
          {/* CollectionPage Schema - CRITICAL for SEO */}
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
                  "itemListElement": jobs.slice(0, 10).map((jobItem, index) => {
                    // Generate complete JobPosting schema for each job
                    // This includes all required fields: title, description, hiringOrganization, 
                    // jobLocation, datePosted, employmentType, validThrough, etc.
                    const jobPostingSchema = seoUtils.generateJobPostingSchema(jobItem);
                    
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
          
          {/* BreadcrumbList Schema for better navigation */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://intelliresume.net"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "RN Jobs",
                    "item": "https://intelliresume.net/jobs/nursing"
                  },
                  {
                    "@type": "ListItem",
                    "position": 3,
                    "name": stateDisplayName,
                    "item": seoMeta.canonicalUrl
                  }
                ]
              })
            }}
          />
        </Head>

        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
              <Link href="/jobs/nursing" className="hover:text-blue-600 transition-colors">All Jobs</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{stateDisplayName}</span>
            </nav>

            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                RN Jobs in {stateDisplayName}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-4">
                {pagination?.total > 0 ? (
                  <>
                    {stateDisplayName} has <strong>{pagination.total}</strong> Registered Nurse (RN) job{pagination.total === 1 ? '' : 's'} available
                    {stats?.cities && stats.cities.length > 0 ? (
                      <> across <strong>{stats.cities.length}</strong> {stats.cities.length === 1 ? 'city' : 'cities'}</>
                    ) : null}
                    {stats?.cities && stats.cities.length > 0 ? (
                      <> including {stats.cities.slice(0, 3).map(c => c.city).join(', ')}{stats.cities.length > 3 ? ` and ${stats.cities.length - 3} more` : ''}</>
                    ) : null}
                    . Browse {stats?.specialties && stats.specialties.length > 0 ? (
                      <>specialties like {stats.specialties.slice(0, 3).map(s => s.specialty).join(', ')}{stats.specialties.length > 3 ? ' and more' : ''}</>
                    ) : (
                      <>ICU, ER, Travel, and other nursing specialties</>
                    )} at top healthcare employers. Apply today!
                  </>
                ) : (
                  <>Find Registered Nurse (RN) positions across {stateDisplayName}. Browse ICU, ER, Travel, and other nursing specialties at top healthcare employers. Apply today!</>
                )}
              </p>
              {pagination && pagination.total > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>{pagination.total} {pagination.total === 1 ? 'job' : 'jobs'} available in {stateDisplayName}</span>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                          {stats.cities.slice(0, 5).map((city, idx) => (
                            <Link
                              key={idx}
                              href={`/jobs/nursing/${stateCode.toLowerCase()}/${encodeURIComponent(city.city.toLowerCase().replace(/\s+/g, '-'))}`}
                              className="flex justify-between items-center group hover:text-blue-600 transition-colors py-1"
                            >
                              <span className="text-gray-900 group-hover:text-blue-600 font-medium">{city.city}</span>
                              <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-xs">{city.count}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {stats.specialties && stats.specialties.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Specialties</h3>
                        </div>
                        <div className="space-y-3">
                          {stats.specialties.slice(0, 5).map((spec, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center py-1"
                            >
                              <span className="text-gray-900 font-medium">{spec.specialty}</span>
                              <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full text-xs">{spec.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {stats.employers && stats.employers.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 11.09a8.97 8.97 0 00.7 2.515 8.97 8.97 0 002.5-.7l-1.005-1.005a1 1 0 00-1.414-1.414l-1.005-1.005zM3.04 12.5a11.053 11.053 0 011.05.174 1 1 0 01.89.89c.03.343.07.683.116 1.02L3.04 12.5zM15.34 13.828l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414a8.97 8.97 0 002.5-.7zM16.69 9.397l-2.25.961a11.115 11.115 0 01.25 3.762 1 1 0 01-.89.89c-.342.03-.683.07-1.02.116l2.25-.96a1 1 0 000-1.838l-7-3z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top Employers</h3>
                        </div>
                        <div className="space-y-3">
                          {stats.employers.slice(0, 5).map((emp, idx) => {
                            const employerSlug = emp.employer?.slug;
                            return employerSlug ? (
                              <Link
                                key={idx}
                                href={`/jobs/nursing/employer/${employerSlug}`}
                                className="flex justify-between items-center group hover:text-green-600 transition-colors py-1"
                              >
                                <span className="text-gray-900 group-hover:text-green-600 font-medium">{emp.employer?.name || 'Unknown'}</span>
                                <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                              </Link>
                            ) : (
                              <div
                                key={idx}
                                className="flex justify-between items-center py-1"
                              >
                                <span className="text-gray-900 font-medium">{emp.employer?.name || 'Unknown'}</span>
                                <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full text-xs">{emp.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
              )}

            {/* Job Listings */}
            {jobs.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-16 text-center border border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found in {stateDisplayName}</h3>
                    <Link href="/jobs/nursing" className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Browse All Jobs
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 mb-8">
                  {jobs.map((jobItem) => (
                    <Link
                      key={jobItem.id}
                      href={`/jobs/nursing/${jobItem.slug}`}
                      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 overflow-hidden"
                    >
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                          {jobItem.title}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-3 flex-wrap">
                          <span>{jobItem.city}, {jobItem.state}</span>
                          {jobItem.employer && <span>• {jobItem.employer.name}</span>}
                          {formatPayForCard(jobItem.salaryMin, jobItem.salaryMax, jobItem.salaryType) && (
                            <span className="text-green-700 font-medium">
                              • {formatPayForCard(jobItem.salaryMin, jobItem.salaryMax, jobItem.salaryType)}
                            </span>
                          )}
                        </div>
                        {/* Tags: Specialty, Job Type, Experience Level */}
                        <div className="flex flex-wrap items-center gap-2">
                          {jobItem.specialty && (
                            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {(() => {
                                // Map legacy "All Specialties" to "General Nursing"
                                if (jobItem.specialty.toLowerCase() === 'all specialties') {
                                  return 'General Nursing';
                                }
                                // Keep nursing acronyms in ALL CAPS
                                const nursingAcronyms = ['ICU', 'NICU', 'ER', 'OR', 'PACU', 'PCU', 'CCU', 'CVICU', 'MICU', 'SICU', 'PICU'];
                                return jobItem.specialty.split(' ').map(word => {
                                  const upperWord = word.toUpperCase();
                                  return nursingAcronyms.includes(upperWord) ? upperWord : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                                }).join(' ');
                              })()}
                            </span>
                          )}
                          {jobItem.jobType && (
                            <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                              {jobItem.jobType.toLowerCase() === 'prn' || jobItem.jobType.toLowerCase() === 'per diem' ? 'PRN' : jobItem.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </span>
                          )}
                          {jobItem.shiftType && (
                            <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium capitalize">
                              {jobItem.shiftType}
                            </span>
                          )}
                          {jobItem.experienceLevel && (
                            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
                              {jobItem.experienceLevel.replace('-', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                      <div className="flex justify-center items-center space-x-4 mt-8">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!pagination.hasPrev}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-gray-700">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!pagination.hasNext}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}

            {/* Salary Information Link - Internal linking for SEO */}
            <div className="mt-12 mb-8">
              <Link
                href={`/jobs/nursing/${stateCode.toLowerCase()}/salary`}
                className="group flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-md hover:shadow-lg hover:border-green-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                      Average RN Salary in {stateDisplayName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">View salary ranges, averages by specialty, and employer breakdowns</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600 group-hover:text-green-700 transition-colors">
                  <span className="font-semibold">View Salaries</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            </div>

            {/* Browse by City Section - Shows all cities for navigation */}
            {stats?.allCities && stats.allCities.length > 0 && (
              <div className="mt-16 pt-8 border-t border-gray-200">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse RN Jobs by City in {stateDisplayName}</h2>
                  <p className="text-gray-600">Find Registered Nurse positions in {stats.allCities.length} {stats.allCities.length === 1 ? 'city' : 'cities'} across {stateDisplayName}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {stats.allCities.map((cityData, idx) => (
                    <Link
                      key={idx}
                      href={`/jobs/nursing/${stateCode.toLowerCase()}/${encodeURIComponent(cityData.city.toLowerCase().replace(/\s+/g, '-'))}`}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <span className="text-gray-900 group-hover:text-blue-600 font-medium text-sm">{cityData.city}</span>
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-xs ml-2">{cityData.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Error state for job pages  
  if (!job) {
    return (
      <>
        <Head>
          <title>Job Not Found | IntelliResume</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The job you are looking for does not exist.'}</p>
            <Link
              href="/jobs/nursing"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Generate SEO meta tags (with error handling)
  const seoMeta = seoUtils.generateJobMetaTags && job
    ? seoUtils.generateJobMetaTags(job)
    : {
        title: `${job?.title || 'RN Job'} | IntelliResume`,
        description: job?.metaDescription || `${job?.title || 'RN Job'} in ${job?.city || ''}, ${job?.state || ''}`,
        keywords: 'registered nurse, rn jobs, nursing jobs',
        canonicalUrl: `https://intelliresume.net/jobs/nursing/${job?.slug || ''}`,
        ogImage: 'https://intelliresume.net/og-image-jobs.png'
      };
  
  const jobPostingSchema = seoUtils.generateJobPostingSchema && job
    ? seoUtils.generateJobPostingSchema(job)
    : null;

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="keywords" content={seoMeta.keywords} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={seoMeta.canonicalUrl} key="canonical" />
        
        {/* Robots - Noindex inactive jobs to avoid indexing expired listings */}
        <meta name="robots" content={job.isActive ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" : "noindex, follow"} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
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
        
        {/* JobPosting Schema Markup - CRITICAL for Google Jobs */}
        {jobPostingSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
          />
        )}
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 py-8" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/jobs/nursing"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 font-medium transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to All Jobs
          </Link>

          {/* Inactive Job Banner */}
          {!job.isActive && (
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-amber-800 font-semibold mb-1">This Position is No Longer Available</h3>
                  <p className="text-amber-700 text-sm">
                    This job posting has expired or been filled. Please browse our active job listings below or search for similar positions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Job Header */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-gray-100">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {job.specialty && (
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {job.specialty}
                </span>
              )}
              {job.jobType && (
                <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                  {job.jobType.toLowerCase() === 'prn' || job.jobType.toLowerCase() === 'per diem' ? 'PRN' : job.jobType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                </span>
              )}
              {job.shiftType && (
                <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium capitalize">
                  {job.shiftType}
                </span>
              )}
              {job.experienceLevel && (
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium capitalize">
                  {job.experienceLevel.replace('-', ' ')}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">{job.title}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Location</div>
                  <div className="font-semibold text-gray-900">
                    {job.city || 'Location not specified'}, {job.state || ''}
                    {job.zipCode && ` ${job.zipCode}`}
                  </div>
                </div>
              </div>
              
              {job.employer && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 11.09a8.97 8.97 0 00.7 2.515 8.97 8.97 0 002.5-.7l-1.005-1.005a1 1 0 00-1.414-1.414l-1.005-1.005zM3.04 12.5a11.053 11.053 0 011.05.174 1 1 0 01.89.89c.03.343.07.683.116 1.02L3.04 12.5zM15.34 13.828l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414a8.97 8.97 0 002.5-.7zM16.69 9.397l-2.25.961a11.115 11.115 0 01.25 3.762 1 1 0 01-.89.89c-.342.03-.683.07-1.02.116l2.25-.96a1 1 0 000-1.838l-7-3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Employer</div>
                    <div className="font-semibold text-gray-900">{job.employer.name}</div>
                  </div>
                </div>
              )}
              
              {formatPayForCard(job.salaryMin, job.salaryMax, job.salaryType) && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Pay Range</div>
                    <div className="font-semibold text-green-700">{formatPayForCard(job.salaryMin, job.salaryMax, job.salaryType)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Job Description</h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <div className="text-gray-700 leading-relaxed">
                {(() => {
                  const cleanedDesc = cleanDescription(job.description);
                  
                  // Check if description starts with metadata (req#, Location, etc.)
                  // Exclude Salary Range since we show it at the top
                  const metadataPattern = /^(req#|Location|Facilities|Professional Area|Department|Job Code|Schedule|Shift):/i;
                  const lines = cleanedDesc.split('\n');
                  const metadataLines = [];
                  let contentStartIndex = 0;
                  
                  // Collect metadata lines from the start
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    // Skip Salary Range and Pay Range lines - we show pay info at the top
                    if (line && /^(Salary Range|Pay Range):/i.test(line)) {
                      contentStartIndex = i + 1;
                      continue;
                    }
                    if (line && metadataPattern.test(line)) {
                      metadataLines.push(line);
                      contentStartIndex = i + 1;
                    } else if (line && metadataLines.length > 0) {
                      // If we had metadata but this line doesn't match, stop
                      break;
                    } else if (!line && metadataLines.length > 0) {
                      // Empty line after metadata, continue
                      contentStartIndex = i + 1;
                      continue;
                    } else if (line && metadataLines.length === 0) {
                      // No metadata found, start from beginning
                      break;
                    }
                  }
                  
                  // Split remaining content by section separator
                  const remainingContent = lines.slice(contentStartIndex).join('\n');
                  const sections = remainingContent.split(/\n\n---\n\n/);
                  
                  return (
                    <>
                      {/* Render metadata section if present */}
                      {(metadataLines.length > 0 || job.experienceLevel || (job.salaryMin || job.salaryMax) || job.scrapedAt) && (
                        <div className="mb-6 pb-4 border-b border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {metadataLines.map((line, mIdx) => {
                              const colonIndex = line.indexOf(':');
                              if (colonIndex === -1) return null;
                              
                              const label = line.substring(0, colonIndex).trim();
                              const value = line.substring(colonIndex + 1).trim();
                              
                              return (
                                <div key={mIdx} className="flex items-start gap-2">
                                  <span className="font-bold text-gray-900 min-w-[120px]">{label}:</span>
                                  <span className="text-gray-700">{value}</span>
                                </div>
                              );
                            })}
                            
                            {/* Additional metadata: Experience Level, Posted Date */}
                            {job.experienceLevel && (
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-gray-900 min-w-[120px]">Experience Level:</span>
                                <span className="text-gray-700 capitalize">{job.experienceLevel.replace('-', ' ')}</span>
                              </div>
                            )}
                            {job.scrapedAt && (
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-gray-900 min-w-[120px]">Posted Date:</span>
                                <span className="text-gray-700">{formatDate(job.scrapedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Render content sections using markdown renderer */}
                      {sections.map((section, idx) => {
                        const trimmedSection = section.trim();
                        if (!trimmedSection) return null;
                        
                        return (
                          <div key={idx} className={idx > 0 || metadataLines.length > 0 ? 'mt-8 pt-6 border-t border-gray-200' : ''}>
                            <div className="space-y-2">
                              {renderMarkdown(trimmedSection)}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Action Buttons - Apply and Tailor Resume */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              {/* Apply Now Button - Primary CTA */}
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center w-full md:w-auto px-12 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 overflow-hidden"
              >
                {/* Shine effect on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
                
                <span className="relative z-10 flex items-center gap-3">
                  Apply Job Now
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </a>

              {/* Tailor Resume Button - Secondary CTA */}
              <a
                href={`/job-targeting?jobSlug=${job.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Track analytics
                  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
                    window.gtag('event', 'tailor_resume_click', {
                      event_category: 'Job Actions',
                      event_label: 'Tailor Resume to Job',
                      job_title: job.title,
                      employer: job.employer?.name,
                      location: `${job.city}, ${job.state}`
                    });
                  }
                }}
                className="group relative inline-flex items-center justify-center w-full md:w-auto px-12 py-4 bg-white text-green-600 border-2 border-green-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:bg-green-50 transition-all duration-300 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-3">
                  {/* Target/Bullseye Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Tailor Resume to Job
                </span>
              </a>
            </div>
          </div>

          {/* Additional Information - Quick Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {job.requirements && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Requirements</h3>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {cleanDescription(job.requirements)}
                </div>
              </div>
            )}

            {job.responsibilities && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Responsibilities</h3>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {cleanDescription(job.responsibilities)}
                </div>
              </div>
            )}

            {job.benefits && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-yellow-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Benefits</h3>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {cleanDescription(job.benefits)}
                </div>
              </div>
            )}

          </div>

          {/* Related Jobs */}
          {relatedJobs.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Related Jobs</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedJobs.map((relatedJob) => (
                  <Link
                    key={relatedJob.id}
                    href={`/jobs/nursing/${relatedJob.slug}`}
                    className="block p-5 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {relatedJob.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {relatedJob.city}, {relatedJob.state}
                      </span>
                      {relatedJob.employer && (
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 11.09a8.97 8.97 0 00.7 2.515 8.97 8.97 0 002.5-.7l-1.005-1.005a1 1 0 00-1.414-1.414l-1.005-1.005zM3.04 12.5a11.053 11.053 0 011.05.174 1 1 0 01.89.89c.03.343.07.683.116 1.02L3.04 12.5zM15.34 13.828l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414a8.97 8.97 0 002.5-.7zM16.69 9.397l-2.25.961a11.115 11.115 0 01.25 3.762 1 1 0 01-.89.89c-.342.03-.683.07-1.02.116l2.25-.96a1 1 0 000-1.838l-7-3z" />
                          </svg>
                          {relatedJob.employer.name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
