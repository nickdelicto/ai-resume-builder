/**
 * SEO Utilities for Job Board Pages
 * Provides functions for generating meta tags, structured data, and SEO-optimized content
 */

const SITE_URL = 'https://intelliresume.net';
const { getEmployerLogoUrl } = require('../utils/employerLogos');
const { getSalaryText } = require('../utils/seoTextUtils');

/**
 * Generate JobPosting schema markup (JSON-LD)
 * This is CRITICAL for Google Jobs eligibility and rich snippets
 */
function generateJobPostingSchema(job) {
  if (!job) return null;

  // Map experience level to months of experience for schema
  const getExperienceMonths = (level) => {
    if (!level) return undefined;
    const normalized = level.toLowerCase();
    if (normalized === 'new-grad' || normalized === 'new grad') return 0;
    if (normalized === 'entry level' || normalized === 'entry-level') return 6;
    if (normalized === 'experienced') return 24;
    if (normalized === 'senior') return 60;
    if (normalized === 'leadership') return 84;
    return undefined;
  };

  const experienceMonths = getExperienceMonths(job.experienceLevel);

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
    // calculatedExpiresDate is set to scrapedAt + 30 days when source doesn't provide expiry
    "validThrough": job.expiresDate || job.calculatedExpiresDate,
    "employmentType": job.jobType === 'full-time' ? 'FULL_TIME' :
                      job.jobType === 'part-time' ? 'PART_TIME' :
                      job.jobType === 'prn' ? 'OTHER' :
                      job.jobType === 'contract' ? 'CONTRACTOR' : 'OTHER',
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.employer?.name || "Healthcare Employer",
      "sameAs": job.employer?.careerPageUrl || SITE_URL,
      ...(getEmployerLogoUrl(job.employer?.slug) && {
        "logo": getEmployerLogoUrl(job.employer?.slug)
      })
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        ...(job.location && { "streetAddress": job.location }),
        "addressLocality": job.city,
        "addressRegion": job.state,
        ...(job.zipCode && { "postalCode": job.zipCode }),
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
    "url": `${SITE_URL}/jobs/nursing/${job.slug}`,
    // Additional recommended properties for better Google for Jobs visibility
    "directApply": false,  // Users visit our site, then click through to employer to apply
    "industry": "Healthcare",
    "occupationalCategory": "29-1141.00",  // BLS/O*NET code for Registered Nurses
    "experienceRequirements": experienceMonths !== undefined ? {
      "@type": "OccupationalExperienceRequirements",
      "monthsOfExperience": experienceMonths
    } : undefined,
    "educationRequirements": {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "degree",
      "educationalLevel": "Associate's or Bachelor's degree in Nursing"
    },
    "qualifications": "Active RN license required"
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
 * Following SEO best practices (per Nick Leroy): include salary, job type, shift, experience level
 * This helps capture keyword variations like "new grad RN jobs", "night shift nurse salary", etc.
 */
function generateJobMetaTags(job) {
  if (!job) return {};

  // Build salary string if available (e.g., "$42-55/hr")
  let salaryStr = '';
  if (job.salaryMin || job.salaryMax) {
    if (job.salaryMin && job.salaryMax) {
      salaryStr = `$${job.salaryMin}-${job.salaryMax}/hr`;
    } else if (job.salaryMin) {
      salaryStr = `$${job.salaryMin}+/hr`;
    } else if (job.salaryMax) {
      salaryStr = `Up to $${job.salaryMax}/hr`;
    }
  }

  // Format job type for display (full-time -> Full-Time, prn -> PRN)
  let jobTypeStr = '';
  if (job.jobType) {
    const typeMap = {
      'full-time': 'Full-Time',
      'part-time': 'Part-Time',
      'prn': 'PRN',
      'contract': 'Contract',
      'travel': 'Travel'
    };
    jobTypeStr = typeMap[job.jobType.toLowerCase()] || job.jobType;
  }

  // Format shift type for display (days -> Days, nights -> Nights)
  let shiftStr = '';
  if (job.shiftType) {
    const shiftMap = {
      'days': 'Days',
      'nights': 'Nights',
      'evenings': 'Evenings',
      'variable': 'Variable',
      'rotating': 'Rotating'
    };
    shiftStr = shiftMap[job.shiftType.toLowerCase()] || job.shiftType;
  }

  // Check if new grad position (high search volume keyword!)
  const isNewGrad = job.experienceLevel?.toLowerCase() === 'new-grad' ||
                    job.experienceLevel?.toLowerCase() === 'new grad' ||
                    job.title?.toLowerCase().includes('new grad');

  // Build the job title - prepend "New Grad" if applicable and not already in title
  let displayTitle = job.title;
  if (isNewGrad && !job.title?.toLowerCase().includes('new grad')) {
    displayTitle = `New Grad ${job.title}`;
  }

  // Build title with all available info
  // Format: [New Grad] Title - Salary - JobType - Shift - Employer - Location
  // Example: "New Grad ICU Nurse - $38-42/hr - Full-Time - Days - Cleveland Clinic - Cleveland, OH"
  const titleParts = [displayTitle];
  if (salaryStr) titleParts.push(salaryStr);
  if (jobTypeStr) titleParts.push(jobTypeStr);
  if (shiftStr) titleParts.push(shiftStr);
  titleParts.push(job.employer?.name || 'RN Job');
  titleParts.push(`${job.city}, ${job.state}`);

  const title = titleParts.join(' - ');

  // Build rich description with all available info
  const descParts = [];
  descParts.push(`${displayTitle} position at ${job.employer?.name || 'top healthcare employer'} in ${job.city}, ${job.state}.`);
  if (salaryStr) descParts.push(`Pay: ${salaryStr}.`);
  if (job.specialty) descParts.push(`Specialty: ${job.specialty}.`);
  if (jobTypeStr) descParts.push(`${jobTypeStr}.`);
  if (shiftStr) descParts.push(`${shiftStr} shift.`);
  if (isNewGrad) descParts.push('New grad friendly.');
  descParts.push('Apply now!');

  const description = job.metaDescription || descParts.join(' ');

  // Build keywords including experience level and shift for better SEO
  const keywordParts = [
    job.title?.toLowerCase(),
    'registered nurse',
    'rn jobs',
    'nursing jobs',
    job.city?.toLowerCase(),
    job.state?.toLowerCase(),
    job.specialty?.toLowerCase(),
    'healthcare jobs'
  ];
  if (isNewGrad) keywordParts.push('new grad rn jobs', 'new graduate nurse');
  if (shiftStr) keywordParts.push(`${shiftStr.toLowerCase()} shift rn`);
  if (jobTypeStr) keywordParts.push(`${jobTypeStr.toLowerCase()} nursing jobs`);

  const keywords = job.keywords?.join(', ') || keywordParts.filter(Boolean).join(', ');

  const canonicalUrl = `${SITE_URL}/jobs/nursing/${job.slug}`;
  const ogImage = `${SITE_URL}/og-image-jobs.png`;

  return {
    // Note: Google typically displays 50-60 chars, but longer titles can still help with keyword matching
    // Per Nick Leroy's advice: it's OK to exceed typical limits to capture more keyword variations
    title: title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl,
    ogImage,
    ogType: 'article'
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
function generateStatePageMetaTags(state, stateFullName, stats, maxHourlyRate = null) {
  const stateName = stateFullName || state;
  const jobCount = stats?.total || 0;
  const salaryText = getSalaryText(maxHourlyRate, stateName);

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}RN Jobs in ${stateName}${salaryText}`;
  const description = `Find ${jobCount || 0} Registered Nurse jobs in ${stateName}. Browse positions at top healthcare employers and apply today!`;

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
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${state.toLowerCase()}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`
  };
}

/**
 * Generate meta tags for city-level programmatic SEO pages
 */
function generateCityPageMetaTags(state, stateFullName, city, stats, maxHourlyRate = null) {
  const stateName = stateFullName || state;
  const jobCount = stats?.total || 0;
  const salaryText = getSalaryText(maxHourlyRate, `${city}-${state}`);

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}RN Jobs in ${city}, ${state}${salaryText}`;
  const description = `Find ${jobCount || 0} Registered Nurse jobs in ${city}, ${stateName}. Browse positions at top healthcare employers and apply today!`;

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
    title,
    description,
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
function generateEmployerPageMetaTags(employerName, employerSlug, stats, maxHourlyRate = null) {
  const jobCount = stats?.total || 0;
  const salaryText = getSalaryText(maxHourlyRate, employerName);

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}RN Jobs at ${employerName}${salaryText}`;
  const description = `Find ${jobCount || 0} Registered Nurse jobs at ${employerName}. Browse positions and apply today!`;

  const keywords = [
    `${employerName.toLowerCase()} rn jobs`,
    `${employerName.toLowerCase()} nurse jobs`,
    `${employerName.toLowerCase()} nursing positions`,
    'registered nurse',
    'nursing careers',
    'healthcare jobs',
    ...(stats?.specialties?.slice(0, 3).map(s => `${s.specialty?.toLowerCase()} nurse ${employerName.toLowerCase()}`).filter(Boolean) || [])
  ].filter(Boolean).join(', ');

  return {
    title,
    description,
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
function generateEmployerSpecialtyPageMetaTags(employerName, employerSlug, specialty, specialtySlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-${specialty}`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${specialty} RN ${jobCount === 1 ? 'Job' : 'Jobs'}${salaryText}`
    : `${employerName} ${specialty} RN Jobs${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} ${specialty} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'} with salary details and great benefits. Apply Today!`
    : `Looking for ${employerName} ${specialty} Registered Nurse jobs? Explore ${specialty} nursing positions at ${employerName} with competitive pay and great benefits.`;

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

/**
 * Generate meta tags for general job type pages (nationwide)
 * Example: 1500 Travel RN Jobs in USA
 */
function generateJobTypePageMetaTags(jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${jobType}-usa`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${jobType} RN Jobs in USA${salaryText}`
    : `${jobType} RN Jobs in USA${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${jobType.toLowerCase()} Registered Nurse jobs nationwide. Browse ${jobType.toLowerCase()} nursing positions at top hospitals with competitive pay. Apply today!`
    : `Browse ${jobType.toLowerCase()} Registered Nurse jobs across the United States. Find ${jobType.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${jobType.toLowerCase()} rn jobs, ${jobType.toLowerCase()} nursing jobs, ${jobType.toLowerCase()} registered nurse, ${jobType.toLowerCase()} nurse positions, ${jobType.toLowerCase()} healthcare jobs, nursing careers`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/job-type/${jobTypeSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + job type pages
 * Example: 250 Travel RN Jobs in Ohio
 */
function generateStateJobTypePageMetaTags(stateCode, stateFullName, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${jobType}-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${jobType} RN Jobs in ${stateName}${salaryText}`
    : `${jobType} RN Jobs in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${jobType.toLowerCase()} Registered Nurse jobs in ${stateName}. Browse ${jobType.toLowerCase()} nursing positions at top hospitals with competitive pay. Apply today!`
    : `Browse ${jobType.toLowerCase()} Registered Nurse jobs in ${stateName}. Find ${jobType.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${jobType.toLowerCase()} rn jobs ${stateName.toLowerCase()}, ${jobType.toLowerCase()} nursing jobs ${stateCode.toLowerCase()}, ${jobType.toLowerCase()} registered nurse ${stateName.toLowerCase()}, ${jobType.toLowerCase()} nurse positions ${stateCode.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/job-type/${jobTypeSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + job type pages
 * Example: 50 Travel RN Jobs in Cleveland, OH
 */
function generateCityJobTypePageMetaTags(stateCode, stateFullName, city, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${jobType}-${city}-${stateCode}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${jobType} RN Jobs in ${city}, ${stateCode}${salaryText}`
    : `${jobType} RN Jobs in ${city}, ${stateCode}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${jobType.toLowerCase()} Registered Nurse jobs in ${city}, ${stateCode}. Browse ${jobType.toLowerCase()} nursing positions at top hospitals in ${city}. Apply today!`
    : `Browse ${jobType.toLowerCase()} Registered Nurse jobs in ${city}, ${stateCode}. Find ${jobType.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${jobType.toLowerCase()} rn jobs ${city.toLowerCase()} ${stateCode.toLowerCase()}, ${jobType.toLowerCase()} nursing jobs ${city.toLowerCase()}, ${jobType.toLowerCase()} registered nurse ${city.toLowerCase()}, ${jobType.toLowerCase()} nurse positions ${city.toLowerCase()}`;

  const citySlug = city.toLowerCase().replace(/\s+/g, '-');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/job-type/${jobTypeSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for specialty + job type pages
 * Example: 500 Travel ICU RN Jobs
 */
function generateSpecialtyJobTypePageMetaTags(specialty, specialtySlug, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${jobType}-${specialty}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${jobType} ${specialty} RN Jobs${salaryText}`
    : `${jobType} ${specialty} RN Jobs${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${jobType.toLowerCase()} ${specialty} Registered Nurse jobs nationwide. Browse ${jobType.toLowerCase()} ${specialty.toLowerCase()} nursing positions with competitive pay. Apply today!`
    : `Browse ${jobType.toLowerCase()} ${specialty} Registered Nurse jobs across the USA. Find ${jobType.toLowerCase()} ${specialty.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${jobType.toLowerCase()} ${specialty.toLowerCase()} rn jobs, ${jobType.toLowerCase()} ${specialty.toLowerCase()} nurse, ${jobType.toLowerCase()} ${specialty.toLowerCase()} nursing jobs, ${specialty.toLowerCase()} ${jobType.toLowerCase()} registered nurse`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/specialty/${specialtySlug}/${jobTypeSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + job type pages
 * Example: 45 Cleveland Clinic Travel RN Jobs
 */
function generateEmployerJobTypePageMetaTags(employerName, employerSlug, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-${jobType}`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${jobType} RN ${jobCount === 1 ? 'Job' : 'Jobs'}${salaryText}`
    : `${employerName} ${jobType} RN Jobs${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} ${jobType.toLowerCase()} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'} with salary details and great benefits. Apply Today!`
    : `Looking for ${employerName} ${jobType.toLowerCase()} Registered Nurse jobs? Explore ${jobType.toLowerCase()} nursing opportunities at ${employerName} with competitive pay and great benefits.`;

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
  generateJobTypePageMetaTags,
  generateStateJobTypePageMetaTags,
  generateCityJobTypePageMetaTags,
  generateSpecialtyJobTypePageMetaTags,
  formatForAI
};

