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
    // Use calculatedExpiresDate as fallback when expiresDate is not available from source
    // calculatedExpiresDate is set to scrapedAt + 60 days when source doesn't provide expiry
    "validThrough": job.expiresDate || job.calculatedExpiresDate,
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

  const title = `${job.title} - ${job.employer?.name || 'RN Job'} in ${job.city}, ${job.state} | IntelliResume Health`;
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
    ? `${locationText}RN Nursing Jobs | IntelliResume Health`
    : 'RN Nursing Jobs in USA - Registered Nurse Positions | IntelliResume Health';
  
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
  
  const title = `${jobCount > 0 ? jobCount : ''} Best RN Jobs in ${stateName} - Hiring Now!`;
  const description = `${jobCount > 0 ? jobCount : ''}+ Registered Nurse (RN) jobs in ${stateName} with salary details. Filter by specialty, city, and job type. Apply directly to top employers!`;
  
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
  
  const title = `${jobCount > 0 ? jobCount : ''} Top RN Jobs in ${city}, ${state} - Apply Here!`;
  const description = `${jobCount > 0 ? jobCount : ''} Registered Nurse (RN) jobs in ${city}, ${state}. View salaries, benefits, and apply directly. Top hospitals hiring now!`;
  
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
  
  const title = `${jobCount > 0 ? jobCount : ''} Best ${specialty} RN Jobs - Hiring Now!`;
  const description = `${jobCount > 0 ? jobCount : ''} ${specialty} Registered Nurse (RN) jobs nationwide. Compare salaries by location and apply directly. Top ${specialty} positions available now!`;
  
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
  
  const title = `${jobCount > 0 ? jobCount : ''} Top ${employerName} RN Jobs - Apply Now!`;
  const description = `${jobCount > 0 ? jobCount : ''} Registered Nurse (RN) jobs at ${employerName}. View all openings, salaries, and benefits. Apply directly to ${employerName} careers!`;
  
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
 * Generate meta tags for salary statistics pages
 */
function generateSalaryPageMetaTags(location, locationType, salaryStats, specialty = null) {
  // locationType: 'state', 'city', 'state-specialty', or 'city-specialty'
  // location: state name or "City, State"
  // specialty: specialty name (e.g., "Mental Health") for specialty pages
  const jobCount = salaryStats?.jobCount || 0;
  const avgHourly = salaryStats?.hourly?.average;
  const avgAnnual = salaryStats?.annual?.average;
  
  // Build specialty prefix for title and descriptions
  const specialtyPrefix = (locationType === 'state-specialty' || locationType === 'city-specialty') && specialty 
    ? `${specialty} ` 
    : '';
  
  // Build title (removed "| IntelliResume" per user request)
  let title;
  if (avgHourly && avgAnnual) {
    title = `Average ${specialtyPrefix}RN Salary in ${location} - ${formatSalary(avgHourly, 'hourly')} & ${formatSalary(avgAnnual, 'annual')}`;
  } else if (avgHourly) {
    title = `Average ${specialtyPrefix}RN Salary in ${location} - ${formatSalary(avgHourly, 'hourly')}`;
  } else if (avgAnnual) {
    title = `Average ${specialtyPrefix}RN Salary in ${location} - ${formatSalary(avgAnnual, 'annual')}`;
  } else {
    title = `Average ${specialtyPrefix}RN Salary in ${location}`;
  }
  
  // Build description
  let description;
  const jobTypeLabel = specialty ? `${specialty} Registered Nurse (RN)` : 'Registered Nurse (RN)';
  if (jobCount > 0 && avgHourly && avgAnnual) {
    description = `Average ${jobTypeLabel} salary in ${location}: ${formatSalary(avgHourly, 'hourly')} (${formatSalary(avgAnnual, 'annual')}). See salary ranges by ${specialty ? 'employer' : 'specialty and employer'}. Based on ${jobCount} job posting${jobCount === 1 ? '' : 's'} with salary data.`;
  } else if (jobCount > 0) {
    description = `Average ${jobTypeLabel} salary data for ${location}. Based on ${jobCount} job posting${jobCount === 1 ? '' : 's'} with salary information.`;
  } else {
    description = `${jobTypeLabel} salary information for ${location}. Salary data will appear automatically once jobs with salary information are posted.`;
  }
  
  const keywords = [
    `average ${specialtyPrefix.toLowerCase()}rn salary ${location.toLowerCase()}`,
    `${specialtyPrefix.toLowerCase()}registered nurse salary ${location.toLowerCase()}`,
    `${specialtyPrefix.toLowerCase()}nursing salary ${location.toLowerCase()}`,
    `${specialtyPrefix.toLowerCase()}rn pay ${location.toLowerCase()}`,
    'nursing compensation',
    'registered nurse wages'
  ].filter(Boolean).join(', ');

  // Determine canonical URL based on location type
  let canonicalUrl;
  if (locationType === 'city') {
    // For city, we need to construct from "City, State" format
    const parts = location.split(', ');
    if (parts.length === 2) {
      const citySlug = parts[0].toLowerCase().replace(/\s+/g, '-');
      const stateSlug = parts[1].toLowerCase();
      canonicalUrl = `${SITE_URL}/jobs/nursing/${stateSlug}/${citySlug}/salary`;
    } else {
      canonicalUrl = `${SITE_URL}/jobs/nursing/salary`;
    }
  } else if (locationType === 'state-specialty' && specialty) {
    // For state+specialty: location is just state name, specialty is passed separately
    const specialtySlug = specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
    const stateSlug = location.toLowerCase();
    canonicalUrl = `${SITE_URL}/jobs/nursing/${stateSlug}/${specialtySlug}/salary`;
  } else if (locationType === 'city-specialty' && specialty) {
    // For city+specialty: location is "City, State", specialty is passed separately
    const parts = location.split(', ');
    if (parts.length === 2) {
      const specialtySlug = specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
      const citySlug = parts[0].toLowerCase().replace(/\s+/g, '-');
      const stateSlug = parts[1].toLowerCase();
      canonicalUrl = `${SITE_URL}/jobs/nursing/${stateSlug}/${citySlug}/${specialtySlug}/salary`;
    } else {
      canonicalUrl = `${SITE_URL}/jobs/nursing/salary`;
    }
  } else {
    // State
    const stateSlug = location.toLowerCase();
    canonicalUrl = `${SITE_URL}/jobs/nursing/${stateSlug}/salary`;
  }

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl,
    ogImage: `${SITE_URL}/og-image-jobs.png`
  };
}

// Helper function for formatting salary in meta tags
function formatSalary(amount, type = 'hourly') {
  if (amount === null || amount === undefined) return '';
  
  if (type === 'hourly') {
    return `$${amount.toFixed(2)}/hour`;
  } else if (type === 'annual') {
    return `$${Math.round(amount).toLocaleString()}/year`;
  }
  return '';
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

/**
 * Generate meta tags for state + specialty combination pages
 * Example: ICU RN Jobs in Ohio
 */
function generateStateSpecialtyPageMetaTags(stateCode, stateFullName, specialty, stats) {
  const stateName = stateFullName || stateCode;
  const jobCount = stats?.total || 0;
  
  const title = `${jobCount > 0 ? jobCount + ' ' : ''}${specialty} RN Jobs in ${stateName} - Apply Now!`;
  const description = `${jobCount > 0 ? jobCount + ' ' : ''}${specialty} Registered Nurse (RN) jobs in ${stateName}. View salaries, benefits, and apply directly. Top hospitals hiring ${specialty.toLowerCase()} nurses now!`;
  
  const keywords = [
    `${specialty.toLowerCase()} rn jobs ${stateName.toLowerCase()}`,
    `${specialty.toLowerCase()} nursing jobs ${stateCode.toLowerCase()}`,
    `${specialty.toLowerCase()} registered nurse ${stateName.toLowerCase()}`,
    `${specialty.toLowerCase()} nurse jobs ${stateCode.toLowerCase()}`,
    'healthcare careers',
    'nursing careers',
    ...(stats?.cities?.slice(0, 3).map(c => `${specialty.toLowerCase()} nurse jobs ${c.city.toLowerCase()}`).filter(Boolean) || [])
  ].filter(Boolean).join(', ');

  const stateSlug = stateCode.toLowerCase();
  const specialtySlug = specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateSlug}/${specialtySlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + specialty combination pages
 * Example: ICU RN Jobs in Cleveland, Ohio
 */
function generateCitySpecialtyPageMetaTags(stateCode, stateFullName, cityName, specialty, stats) {
  const stateName = stateFullName || stateCode;
  const jobCount = stats?.total || 0;
  
  const title = `${jobCount > 0 ? jobCount + ' ' : ''}${specialty} RN Jobs in ${cityName}, ${stateCode} - Apply Now!`;
  const description = `${jobCount > 0 ? jobCount + ' ' : ''}${specialty} Registered Nurse (RN) jobs in ${cityName}, ${stateCode}. View salaries, benefits, and apply directly. Top hospitals hiring ${specialty.toLowerCase()} nurses in ${cityName} now!`;
  
  const keywords = [
    `${specialty.toLowerCase()} rn jobs ${cityName.toLowerCase()} ${stateCode.toLowerCase()}`,
    `${specialty.toLowerCase()} nursing jobs ${cityName.toLowerCase()}`,
    `${specialty.toLowerCase()} registered nurse ${cityName.toLowerCase()} ${stateName.toLowerCase()}`,
    `${specialty.toLowerCase()} nurse jobs ${cityName.toLowerCase()}`,
    'healthcare careers',
    'nursing careers'
  ].filter(Boolean).join(', ');

  const stateSlug = stateCode.toLowerCase();
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');
  const specialtySlug = specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateSlug}/${citySlug}/${specialtySlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + specialty pages
 * Example: 45 Cleveland Clinic ICU RN Jobs
 */
function generateEmployerSpecialtyPageMetaTags(employerName, employerSlug, specialty, specialtySlug, jobCount) {
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${specialty} RN ${jobCount === 1 ? 'Job' : 'Jobs'}`
    : `${employerName} ${specialty} RN Jobs`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} ${specialty} RN ${jobCount === 1 ? 'position' : 'positions'} with salary details and great benefits. Apply Today!`
    : `Looking for ${employerName} ${specialty} RN jobs? Explore ${specialty} nursing positions at ${employerName} with competitive pay and great benefits.`;

  const keywords = `${specialty} rn jobs ${employerName.toLowerCase()}, ${specialty.toLowerCase()} nurse ${employerName.toLowerCase()}, ${employerName.toLowerCase()} ${specialty.toLowerCase()} nursing jobs, ${specialty.toLowerCase()} registered nurse ${employerName.toLowerCase()}, ${employerName.toLowerCase()} ${specialty.toLowerCase()} rn positions`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/${specialtySlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

// Export all functions using CommonJS (matching rest of codebase)
/**
 * Generate meta tags for employer + job type pages
 * Example: 45 Cleveland Clinic Travel RN Jobs
 */
function generateEmployerJobTypePageMetaTags(employerName, employerSlug, jobType, jobTypeSlug, jobCount) {
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${jobType} RN ${jobCount === 1 ? 'Job' : 'Jobs'}`
    : `${employerName} ${jobType} RN Jobs`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} ${jobType.toLowerCase()} RN ${jobCount === 1 ? 'position' : 'positions'} with salary details and great benefits. Apply Today!`
    : `Looking for ${employerName} ${jobType.toLowerCase()} RN jobs? Explore ${jobType.toLowerCase()} nursing opportunities at ${employerName} with competitive pay and great benefits.`;

  const keywords = `${jobType.toLowerCase()} rn jobs ${employerName.toLowerCase()}, ${jobType.toLowerCase()} nurse ${employerName.toLowerCase()}, ${employerName.toLowerCase()} ${jobType.toLowerCase()} nursing jobs, ${jobType.toLowerCase()} registered nurse ${employerName.toLowerCase()}, ${employerName.toLowerCase()} ${jobType.toLowerCase()} rn positions`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/${jobTypeSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

module.exports = {
  generateJobPostingSchema,
  generateJobMetaTags,
  generateListingPageMetaTags,
  generateStatePageMetaTags,
  generateCityPageMetaTags,
  generateSpecialtyPageMetaTags,
  generateEmployerPageMetaTags,
  generateSalaryPageMetaTags,
  generateStateSpecialtyPageMetaTags,
  generateCitySpecialtyPageMetaTags,
  generateEmployerSpecialtyPageMetaTags,
  generateEmployerJobTypePageMetaTags,
  formatForAI
};

