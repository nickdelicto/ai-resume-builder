/**
 * SEO Utilities for Job Board Pages
 * Provides functions for generating meta tags, structured data, and SEO-optimized content
 */

const SITE_URL = 'https://intelliresume.net';

/**
 * Generate JobPosting schema markup (JSON-LD)
 * This is CRITICAL for Google Jobs eligibility and rich snippets
 */
function generateJobPostingSchema(job) {
  if (!job) return null;

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description?.substring(0, 5000) || job.metaDescription || `${job.title} position in ${job.city}, ${job.state}`,
    "identifier": {
      "@type": "PropertyValue",
      "name": job.employer?.name || "Healthcare Employer",
      "value": job.sourceJobId || job.id
    },
    "datePosted": job.postedDate || job.scrapedAt || job.createdAt,
    "validThrough": job.expiresDate,
    "employmentType": job.jobType === 'full-time' ? 'FULL_TIME' : 
                      job.jobType === 'part-time' ? 'PART_TIME' : 
                      job.jobType === 'prn' ? 'OTHER' : 
                      job.jobType === 'contract' ? 'CONTRACTOR' : 'OTHER',
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.employer?.name || "Healthcare Employer",
      "sameAs": job.employer?.careerPageUrl || SITE_URL
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": job.location || "",
        "addressLocality": job.city,
        "addressRegion": job.state,
        "postalCode": job.zipCode || "",
        "addressCountry": "US"
      }
    },
    "baseSalary": (job.salaryMin || job.salaryMax) ? {
      "@type": "MonetaryAmount",
      "currency": job.salaryCurrency || "USD",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": job.salaryMin,
        "maxValue": job.salaryMax,
        "unitText": "HOUR"
      }
    } : undefined,
    "workHours": job.jobType === 'full-time' ? "Full-time" : 
                 job.jobType === 'part-time' ? "Part-time" : undefined,
    "specialCommitments": job.specialty || undefined,
    "skills": job.keywords?.slice(0, 10) || [],
    "url": `${SITE_URL}/jobs/nursing/${job.slug}`
  };

  // Remove undefined fields
  Object.keys(jobPostingSchema).forEach(key => {
    if (jobPostingSchema[key] === undefined) {
      delete jobPostingSchema[key];
    }
  });

  return jobPostingSchema;
}

/**
 * Generate enhanced meta tags for job pages
 */
function generateJobMetaTags(job) {
  if (!job) return {};

  const title = `${job.title} - ${job.employer?.name || 'RN Job'} in ${job.city}, ${job.state} | IntelliResume`;
  const description = job.metaDescription || 
    `${job.title} position at ${job.employer?.name || 'top healthcare employer'} in ${job.city}, ${job.state}. ${job.specialty ? `Specialty: ${job.specialty}.` : ''} ${job.jobType ? `Job Type: ${job.jobType.replace('-', ' ')}.` : ''} Apply now!`;
  
  const keywords = job.keywords?.join(', ') || 
    `${job.title.toLowerCase()}, registered nurse, rn jobs, nursing jobs, ${job.city.toLowerCase()}, ${job.state.toLowerCase()}, ${job.specialty?.toLowerCase() || ''}, healthcare jobs`.trim();
  
  const canonicalUrl = `${SITE_URL}/jobs/nursing/${job.slug}`;
  const ogImage = `${SITE_URL}/og-image-jobs.png`; // You can create a generic jobs OG image

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl,
    ogImage,
    ogType: 'article' // Jobs are like articles
  };
}

/**
 * Generate meta tags for job listing page with filters
 */
function generateListingPageMetaTags(filters, pagination) {
  const parts = [];
  
  if (filters.city) parts.push(`${filters.city},`);
  if (filters.state) parts.push(filters.state);
  if (filters.specialty) parts.push(filters.specialty);
  if (filters.jobType) parts.push(filters.jobType.replace('-', ' '));
  
  const locationText = parts.length > 0 ? `${parts.join(' ')} ` : '';
  const jobCount = pagination?.total || 0;
  
  const title = locationText 
    ? `${locationText}RN Nursing Jobs | IntelliResume`
    : 'RN Nursing Jobs in USA - Registered Nurse Positions | IntelliResume';
  
  const description = locationText
    ? `Find ${jobCount > 0 ? jobCount : ''} Registered Nurse (RN) jobs in ${locationText.trim()}. Browse ${filters.specialty || 'nursing'} positions at top healthcare employers. Apply today!`
    : `Browse ${jobCount > 0 ? jobCount : 'thousands of'} Registered Nurse (RN) job openings across the United States at top healthcare employers. Search by location, specialty, and job type.`;
  
  const keywords = [
    'registered nurse jobs',
    'rn jobs',
    'nursing jobs',
    filters.city?.toLowerCase(),
    filters.state?.toLowerCase(),
    filters.specialty?.toLowerCase(),
    filters.jobType?.replace('-', ' '),
    'healthcare careers',
    'nursing careers'
  ].filter(Boolean).join(', ');

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing${filters.city || filters.state || filters.specialty ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))).toString() : ''}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`
  };
}

/**
 * Generate meta tags for state-level programmatic SEO pages
 */
function generateStatePageMetaTags(state, stateFullName, stats) {
  const stateName = stateFullName || state;
  const jobCount = stats?.total || 0;
  
  const title = `RN Jobs in ${stateName} - ${jobCount > 0 ? jobCount : ''} Registered Nurse Positions | IntelliResume`;
  const description = `Find ${jobCount > 0 ? jobCount : 'thousands of'} Registered Nurse (RN) jobs in ${stateName}. Browse ICU, ER, Travel, and other nursing specialties at top healthcare employers. Apply today!`;
  
  const keywords = [
    `rn jobs ${stateName.toLowerCase()}`,
    `nursing jobs ${stateName.toLowerCase()}`,
    `registered nurse ${stateName.toLowerCase()}`,
    `nurse jobs ${state}`,
    'healthcare careers',
    'nursing careers',
    ...(stats?.specialties?.slice(0, 3).map(s => `${s.specialty?.toLowerCase()} nurse ${stateName.toLowerCase()}`).filter(Boolean) || [])
  ].filter(Boolean).join(', ');

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${state.toLowerCase()}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`
  };
}

/**
 * Generate meta tags for city-level programmatic SEO pages
 */
function generateCityPageMetaTags(state, stateFullName, city, stats) {
  const stateName = stateFullName || state;
  const jobCount = stats?.total || 0;
  
  const title = `RN Jobs in ${city}, ${stateName} - ${jobCount > 0 ? jobCount : ''} Registered Nurse Positions | IntelliResume`;
  const description = `Find ${jobCount > 0 ? jobCount : 'thousands of'} Registered Nurse (RN) jobs in ${city}, ${stateName}. Browse ICU, ER, Travel, and other nursing specialties at top healthcare employers. Apply today!`;
  
  const keywords = [
    `rn jobs ${city.toLowerCase()} ${stateName.toLowerCase()}`,
    `nursing jobs ${city.toLowerCase()}`,
    `registered nurse ${city.toLowerCase()} ${state}`,
    `nurse jobs ${city.toLowerCase()} ${stateName.toLowerCase()}`,
    'healthcare careers',
    'nursing careers',
    ...(stats?.specialties?.slice(0, 3).map(s => `${s.specialty?.toLowerCase()} nurse ${city.toLowerCase()}`).filter(Boolean) || [])
  ].filter(Boolean).join(', ');

  // Create URL-friendly city slug
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state.toLowerCase();

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateSlug}/${citySlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`
  };
}

/**
 * Generate meta tags for specialty-level programmatic SEO pages
 */
function generateSpecialtyPageMetaTags(specialty, stats) {
  const jobCount = stats?.total || 0;
  
  const title = `${specialty} RN Jobs - ${jobCount > 0 ? jobCount : ''} ${specialty} Nurse Positions | IntelliResume`;
  const description = `Find ${jobCount > 0 ? jobCount : 'thousands of'} ${specialty} Registered Nurse (RN) jobs nationwide. Browse ${specialty} nursing positions at top healthcare employers. Apply today!`;
  
  const keywords = [
    `${specialty.toLowerCase()} rn jobs`,
    `${specialty.toLowerCase()} nurse jobs`,
    `${specialty.toLowerCase()} nursing positions`,
    'registered nurse',
    'nursing careers',
    'healthcare jobs'
  ].filter(Boolean).join(', ');

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/specialty/${specialty.toLowerCase().replace(/\s+/g, '-')}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`
  };
}

/**
 * Generate meta tags for employer-level programmatic SEO pages
 */
function generateEmployerPageMetaTags(employerName, stats) {
  const jobCount = stats?.total || 0;
  
  const title = `${employerName} RN Jobs - ${jobCount > 0 ? jobCount : ''} Registered Nurse Positions | IntelliResume`;
  const description = `Find ${jobCount > 0 ? jobCount : 'thousands of'} Registered Nurse (RN) jobs at ${employerName}. Browse ICU, ER, Travel, and other nursing specialties. Apply today!`;
  
  const keywords = [
    `${employerName.toLowerCase()} rn jobs`,
    `${employerName.toLowerCase()} nurse jobs`,
    `${employerName.toLowerCase()} nursing positions`,
    'registered nurse',
    'nursing careers',
    'healthcare jobs',
    ...(stats?.specialties?.slice(0, 3).map(s => `${s.specialty?.toLowerCase()} nurse ${employerName.toLowerCase()}`).filter(Boolean) || [])
  ].filter(Boolean).join(', ');

  // Create URL-friendly employer slug
  const employerSlug = employerName.toLowerCase().replace(/\s+/g, '-');

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`
  };
}

/**
 * Generate AI-friendly structured content format
 * Makes content easier for AI search engines to parse
 */
function formatForAI(content, sections = {}) {
  // Structure content with clear sections for AI parsing
  const structuredContent = {
    overview: sections.overview || content.substring(0, 200),
    requirements: sections.requirements || null,
    responsibilities: sections.responsibilities || null,
    benefits: sections.benefits || null,
    qualifications: sections.qualifications || null,
    fullText: content
  };
  
  return structuredContent;
}

// Export all functions using CommonJS (matching rest of codebase)
module.exports = {
  generateJobPostingSchema,
  generateJobMetaTags,
  generateListingPageMetaTags,
  generateStatePageMetaTags,
  generateCityPageMetaTags,
  generateSpecialtyPageMetaTags,
  generateEmployerPageMetaTags,
  formatForAI
};

