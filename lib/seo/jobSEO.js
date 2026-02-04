/**
 * SEO Utilities for Job Board Pages
 * Provides functions for generating meta tags, structured data, and SEO-optimized content
 */

const SITE_URL = 'https://intelliresume.net';
const { getEmployerLogoUrl } = require('../utils/employerLogos');
const { getSalaryText } = require('../utils/seoTextUtils');
const { getCityDisplayName } = require('../utils/cityDisplayUtils');

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
    "description": job.description?.substring(0, 5000) || job.metaDescription || `${job.title} position ${job.workArrangement === 'remote' ? `(Remote${job.state ? ` - ${job.state}` : ''})` : `in ${job.city}, ${job.state}`}`,
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
        // For remote jobs, don't include streetAddress (avoids "Remote-IL" showing up)
        ...(job.workArrangement !== 'remote' && job.location && { "streetAddress": job.location }),
        // For remote jobs, don't include city as addressLocality
        ...(job.workArrangement !== 'remote' && job.city && { "addressLocality": job.city }),
        "addressRegion": job.state,
        ...(job.workArrangement !== 'remote' && job.zipCode && { "postalCode": job.zipCode }),
        "addressCountry": "US"
      }
    },
    // Google recommends jobLocationType for remote jobs
    ...(job.workArrangement === 'remote' && { "jobLocationType": "TELECOMMUTE" }),
    // applicantLocationRequirements is REQUIRED when jobLocationType is TELECOMMUTE
    ...(job.workArrangement === 'remote' && {
      "applicantLocationRequirements": job.state ? {
        "@type": "State",
        "name": job.state
      } : {
        "@type": "Country",
        "name": "USA"
      }
    }),
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
      // Map DB enum to Google's valid credentialCategory values
      "credentialCategory": job.educationLevel ? {
        'associate_degree': 'associate degree',
        'bachelor_degree': 'bachelor degree',
        'professional_certificate': 'professional certificate',
        'postgraduate_degree': 'postgraduate degree'
      }[job.educationLevel] || 'associate degree' : 'associate degree',
      "educationalLevel": job.educationLevel ? {
        'associate_degree': "Associate's Degree in Nursing (ADN)",
        'bachelor_degree': "Bachelor of Science in Nursing (BSN)",
        'professional_certificate': "Professional Nursing Certificate",
        'postgraduate_degree': "Master of Science in Nursing (MSN) or higher"
      }[job.educationLevel] || "Associate's or Bachelor's degree in Nursing" : "Associate's or Bachelor's degree in Nursing"
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
  // For remote jobs: "Remote" or "Remote (KY)" instead of "Remote, KY"
  const locationText = job.workArrangement === 'remote'
    ? `Remote${job.state ? ` (${job.state})` : ''}`
    : `${job.city}, ${job.state}`;

  const titleParts = [displayTitle];
  if (salaryStr) titleParts.push(salaryStr);
  if (jobTypeStr) titleParts.push(jobTypeStr);
  if (shiftStr) titleParts.push(shiftStr);
  titleParts.push(job.employer?.name || 'RN Job');
  titleParts.push(locationText);

  const title = titleParts.join(' - ');

  // Build rich description with all available info
  const descParts = [];
  const locationDesc = job.workArrangement === 'remote'
    ? `Remote position${job.state ? ` based in ${job.state}` : ''}`
    : `in ${job.city}, ${job.state}`;
  descParts.push(`${displayTitle} position at ${job.employer?.name || 'top healthcare employer'} ${locationDesc}.`);
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
    // Don't include "Remote" as a city keyword
    job.workArrangement !== 'remote' && job.city?.toLowerCase(),
    job.state?.toLowerCase(),
    job.specialty?.toLowerCase(),
    'healthcare jobs'
  ];
  if (isNewGrad) keywordParts.push('new grad rn jobs', 'new graduate nurse');
  if (shiftStr) keywordParts.push(`${shiftStr.toLowerCase()} shift rn`);
  if (jobTypeStr) keywordParts.push(`${jobTypeStr.toLowerCase()} nursing jobs`);
  // Add remote keywords for remote jobs
  if (job.workArrangement === 'remote') keywordParts.push('remote rn jobs', 'work from home nursing', 'telehealth nurse');
  if (job.workArrangement === 'hybrid') keywordParts.push('hybrid rn jobs', 'flexible nursing jobs');

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
 * Generate meta tags for remote jobs page
 * Remote is treated as a pseudo-location for SEO
 */
function generateRemotePageMetaTags(stats, maxHourlyRate = null) {
  const jobCount = stats?.total || 0;
  const salaryText = maxHourlyRate ? ` - Up to $${maxHourlyRate}/hr` : ' - Work From Home';

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}Remote RN Jobs${salaryText}`;
  const description = `Find ${jobCount || 0} Remote Registered Nurse jobs. Work from home positions at top healthcare employers including telehealth, case management, and utilization review roles. Apply today!`;

  const keywords = [
    'remote rn jobs',
    'work from home nursing jobs',
    'remote nursing jobs',
    'telehealth nurse jobs',
    'remote registered nurse',
    'wfh nursing positions',
    'virtual nurse jobs',
    'remote case management nurse',
    ...(stats?.specialties?.slice(0, 3).map(s => `remote ${s.specialty?.toLowerCase()} nurse`).filter(Boolean) || [])
  ].filter(Boolean).join(', ');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/remote`,
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
  const cityDisplay = getCityDisplayName(city, state);

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}RN Jobs in ${cityDisplay}${salaryText}`;
  const description = `Find ${jobCount || 0} Registered Nurse jobs in ${cityDisplay}. Browse positions at top healthcare employers and apply today!`;

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
 * Example: ICU RN Jobs in Cleveland
 */
function generateCitySpecialtyPageMetaTags(stateCode, stateFullName, cityName, specialty, stats) {
  const stateName = stateFullName || stateCode;
  const jobCount = stats?.total || 0;
  const cityDisplay = getCityDisplayName(cityName, stateCode);

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}${specialty} RN Jobs in ${cityDisplay} - Apply Now!`;
  const description = `${jobCount > 0 ? jobCount + ' ' : ''}${specialty} Registered Nurse (RN) jobs in ${cityDisplay}. View salaries, benefits, and apply directly. Top hospitals hiring ${specialty.toLowerCase()} nurses in ${cityDisplay} now!`;
  
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
 * Example: 50 Travel RN Jobs in Cleveland
 */
function generateCityJobTypePageMetaTags(stateCode, _stateFullName, city, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${jobType}-${city}-${stateCode}`);
  const cityDisplay = getCityDisplayName(city, stateCode);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${jobType} RN Jobs in ${cityDisplay}${salaryText}`
    : `${jobType} RN Jobs in ${cityDisplay}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${jobType.toLowerCase()} Registered Nurse jobs in ${cityDisplay}. Browse ${jobType.toLowerCase()} nursing positions at top hospitals in ${cityDisplay}. Apply today!`
    : `Browse ${jobType.toLowerCase()} Registered Nurse jobs in ${cityDisplay}. Find ${jobType.toLowerCase()} nursing opportunities at top healthcare employers.`;

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
 * Generate meta tags for state + specialty + job type pages
 * Example: 25 Part Time ICU RN Jobs in Ohio
 */
function generateStateSpecialtyJobTypePageMetaTags(stateCode, stateFullName, specialty, specialtySlug, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${jobType}-${specialty}-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${jobType} ${specialty} RN Jobs in ${stateName}${salaryText}`
    : `${jobType} ${specialty} RN Jobs in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${jobType.toLowerCase()} ${specialty} Registered Nurse jobs in ${stateName}. Browse ${jobType.toLowerCase()} ${specialty.toLowerCase()} nursing positions with competitive pay. Apply today!`
    : `Browse ${jobType.toLowerCase()} ${specialty} Registered Nurse jobs in ${stateName}. Find ${jobType.toLowerCase()} ${specialty.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${jobType.toLowerCase()} ${specialty.toLowerCase()} rn jobs ${stateName.toLowerCase()}, ${jobType.toLowerCase()} ${specialty.toLowerCase()} nurse ${stateCode.toLowerCase()}, ${specialty.toLowerCase()} ${jobType.toLowerCase()} nursing jobs ${stateName.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specialtySlug}/${jobTypeSlug}`,
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

/**
 * Generate meta tags for experience level pages (nationwide)
 * Example: 111 New Grad RN Jobs in USA
 */
function generateExperienceLevelPageMetaTags(level, levelSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${level}-usa`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${level} RN Jobs in USA${salaryText}`
    : `${level} RN Jobs in USA${salaryText}`;

  // New Grad gets special description emphasizing entry level and residency programs
  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} entry level & new grad RN jobs nationwide. Entry-level nursing positions perfect for new graduate nurses and RN residency programs. Apply today!`
      : `Browse entry level & new grad Registered Nurse jobs across the USA. Entry-level nursing positions with training and mentorship for new graduate RNs.`)
    : (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} ${level.toLowerCase()} Registered Nurse jobs nationwide. Browse ${level.toLowerCase()} nursing positions at top hospitals with competitive pay. Apply today!`
      : `Browse ${level.toLowerCase()} Registered Nurse jobs across the United States. Find nursing opportunities at top healthcare employers.`);

  const keywords = isNewGrad
    ? `entry level rn jobs, entry level nursing jobs, new grad rn jobs, new graduate nurse jobs, rn residency programs, entry level registered nurse, new grad nursing positions`
    : `${level.toLowerCase()} rn jobs, ${level.toLowerCase()} nursing jobs, ${level.toLowerCase()} registered nurse, ${level.toLowerCase()} nurse positions, nursing careers`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + experience level pages
 * Example: 42 New Grad RN Jobs in Ohio
 */
function generateStateExperienceLevelPageMetaTags(stateCode, stateFullName, level, levelSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${level}-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${level} RN Jobs in ${stateName}${salaryText}`
    : `${level} RN Jobs in ${stateName}${salaryText}`;

  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} entry level & new grad RN jobs in ${stateName}. Entry-level nursing positions and RN residency programs. Apply today!`
      : `Browse entry level & new grad Registered Nurse jobs in ${stateName}. Entry-level nursing positions with training and mentorship.`)
    : (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} ${level.toLowerCase()} Registered Nurse jobs in ${stateName}. Apply today!`
      : `Browse ${level.toLowerCase()} Registered Nurse jobs in ${stateName}. Find opportunities at top healthcare employers.`);

  const keywords = isNewGrad
    ? `entry level rn jobs ${stateName.toLowerCase()}, entry level nursing jobs ${stateCode.toLowerCase()}, new grad rn jobs ${stateName.toLowerCase()}, new graduate nurse ${stateCode.toLowerCase()}, rn residency programs ${stateName.toLowerCase()}`
    : `${level.toLowerCase()} rn jobs ${stateName.toLowerCase()}, ${level.toLowerCase()} nursing jobs ${stateCode.toLowerCase()}, ${level.toLowerCase()} registered nurse ${stateName.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + experience level pages
 * Example: 12 New Grad RN Jobs in Cleveland
 */
function generateCityExperienceLevelPageMetaTags(stateCode, _stateFullName, city, level, levelSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${level}-${city}-${stateCode}`);
  const cityDisplay = getCityDisplayName(city, stateCode);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${level} RN Jobs in ${cityDisplay}${salaryText}`
    : `${level} RN Jobs in ${cityDisplay}${salaryText}`;

  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} entry level & new grad RN jobs in ${cityDisplay}. Entry-level nursing positions and residency programs. Apply today!`
      : `Browse entry level & new grad Registered Nurse jobs in ${cityDisplay}. Entry-level nursing positions for new graduate RNs.`)
    : (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} ${level.toLowerCase()} Registered Nurse jobs in ${cityDisplay}. Apply today!`
      : `Browse ${level.toLowerCase()} Registered Nurse jobs in ${cityDisplay}. Find opportunities at top healthcare employers.`);

  const keywords = isNewGrad
    ? `entry level rn jobs ${city.toLowerCase()}, entry level nursing jobs ${city.toLowerCase()} ${stateCode.toLowerCase()}, new grad rn jobs ${city.toLowerCase()}, new graduate nurse ${city.toLowerCase()}`
    : `${level.toLowerCase()} rn jobs ${city.toLowerCase()} ${stateCode.toLowerCase()}, ${level.toLowerCase()} nursing jobs ${city.toLowerCase()}`;

  const citySlug = city.toLowerCase().replace(/\s+/g, '-');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for specialty + experience level pages
 * Example: 35 New Grad ICU RN Jobs
 */
function generateSpecialtyExperienceLevelPageMetaTags(specialty, specialtySlug, level, levelSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${level}-${specialty}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${level} ${specialty} RN Jobs${salaryText}`
    : `${level} ${specialty} RN Jobs${salaryText}`;

  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} entry level & new grad ${specialty} RN jobs. Entry-level ${specialty} nursing positions for new graduate nurses. Apply today!`
      : `Browse entry level & new grad ${specialty} Registered Nurse jobs. Entry-level ${specialty} nursing positions with training.`)
    : (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} ${level.toLowerCase()} ${specialty} Registered Nurse jobs nationwide. Apply today!`
      : `Browse ${level.toLowerCase()} ${specialty} Registered Nurse jobs. Find opportunities at top healthcare employers.`);

  const keywords = isNewGrad
    ? `entry level ${specialty.toLowerCase()} rn jobs, entry level ${specialty.toLowerCase()} nursing, new grad ${specialty.toLowerCase()} rn jobs, new graduate ${specialty.toLowerCase()} nurse, ${specialty.toLowerCase()} rn residency`
    : `${level.toLowerCase()} ${specialty.toLowerCase()} rn jobs, ${level.toLowerCase()} ${specialty.toLowerCase()} nurse, ${specialty.toLowerCase()} nursing jobs`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/specialty/${specialtySlug}/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + specialty + experience level pages
 * Example: 15 New Grad ICU RN Jobs in Ohio
 */
function generateStateSpecialtyExperienceLevelPageMetaTags(stateCode, stateFullName, specialty, specialtySlug, level, levelSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${level}-${specialty}-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${level} ${specialty} RN Jobs in ${stateName}${salaryText}`
    : `${level} ${specialty} RN Jobs in ${stateName}${salaryText}`;

  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} entry level & new grad ${specialty} RN jobs in ${stateName}. Entry-level ${specialty} nursing positions for new graduate nurses. Apply today!`
      : `Browse entry level & new grad ${specialty} Registered Nurse jobs in ${stateName}. Entry-level ${specialty} nursing positions with training.`)
    : (jobCount > 0
      ? `Find ${jobCount.toLocaleString()} ${level.toLowerCase()} ${specialty} Registered Nurse jobs in ${stateName}. Apply today!`
      : `Browse ${level.toLowerCase()} ${specialty} Registered Nurse jobs in ${stateName}. Find opportunities at top healthcare employers.`);

  const keywords = isNewGrad
    ? `entry level ${specialty.toLowerCase()} rn jobs ${stateName.toLowerCase()}, new grad ${specialty.toLowerCase()} rn jobs ${stateCode.toLowerCase()}, ${specialty.toLowerCase()} rn residency ${stateName.toLowerCase()}`
    : `${level.toLowerCase()} ${specialty.toLowerCase()} rn jobs ${stateName.toLowerCase()}, ${level.toLowerCase()} ${specialty.toLowerCase()} nurse ${stateCode.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specialtySlug}/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + experience level pages
 * Example: 8 Cleveland Clinic New Grad RN Jobs
 */
function generateEmployerExperienceLevelPageMetaTags(employerName, employerSlug, level, levelSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-${level}`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${level} RN ${jobCount === 1 ? 'Job' : 'Jobs'}${salaryText}`
    : `${employerName} ${level} RN Jobs${salaryText}`;

  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount} ${employerName} entry level & new grad RN ${jobCount === 1 ? 'position' : 'positions'}. Entry-level RN residency programs at ${employerName}. Apply today!`
      : `${employerName} entry level & new grad RN jobs. Explore entry-level nursing programs and RN residencies at ${employerName}.`)
    : (jobCount > 0
      ? `Find ${jobCount} ${employerName} ${level.toLowerCase()} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'}. Apply today!`
      : `Looking for ${employerName} ${level.toLowerCase()} Registered Nurse jobs? Find opportunities with competitive pay and great benefits.`);

  const keywords = isNewGrad
    ? `${employerName.toLowerCase()} entry level rn jobs, ${employerName.toLowerCase()} entry level nursing, ${employerName.toLowerCase()} new grad rn jobs, ${employerName.toLowerCase()} rn residency, new grad nurse ${employerName.toLowerCase()}`
    : `${employerName.toLowerCase()} ${level.toLowerCase()} rn jobs, ${level.toLowerCase()} nurse ${employerName.toLowerCase()}, ${employerName.toLowerCase()} ${level.toLowerCase()} nursing jobs`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + specialty + experience level pages
 * Example: 5 Cleveland Clinic ICU New Grad RN Jobs
 */
function generateEmployerSpecialtyExperienceLevelPageMetaTags(employerName, employerSlug, specialty, specialtySlug, level, levelSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-${specialty}-${level}`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${level} ${specialty} RN ${jobCount === 1 ? 'Job' : 'Jobs'}${salaryText}`
    : `${employerName} ${level} ${specialty} RN Jobs${salaryText}`;

  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount} ${employerName} entry level & new grad ${specialty} RN ${jobCount === 1 ? 'position' : 'positions'}. ${specialty} nursing residency programs at ${employerName}. Apply today!`
      : `${employerName} entry level & new grad ${specialty} RN jobs. Explore ${specialty.toLowerCase()} nursing residencies at ${employerName}.`)
    : (jobCount > 0
      ? `Find ${jobCount} ${employerName} ${level.toLowerCase()} ${specialty} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'}. Apply today!`
      : `Looking for ${employerName} ${level.toLowerCase()} ${specialty} Registered Nurse jobs? Find opportunities with competitive pay.`);

  const keywords = `${employerName.toLowerCase()} ${level.toLowerCase()} ${specialty.toLowerCase()} rn jobs, ${specialty.toLowerCase()} ${level.toLowerCase()} nurse ${employerName.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/${specialtySlug}/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + specialty + job type pages
 * Example: 12 Full Time ICU RN Jobs in Cleveland
 */
function generateCitySpecialtyJobTypePageMetaTags(stateCode, _stateFullName, city, specialty, specialtySlug, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${city}-${specialty}-${jobType}`);
  const cityDisplay = getCityDisplayName(city, stateCode);
  const title = jobCount > 0
    ? `${jobCount} ${jobType} ${specialty} RN ${jobCount === 1 ? 'Job' : 'Jobs'} in ${cityDisplay}${salaryText}`
    : `${jobType} ${specialty} RN Jobs in ${cityDisplay}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${jobType.toLowerCase()} ${specialty} Registered Nurse ${jobCount === 1 ? 'job' : 'jobs'} in ${cityDisplay}. Browse positions at top healthcare employers and apply today!`
    : `Looking for ${jobType.toLowerCase()} ${specialty} Registered Nurse jobs in ${cityDisplay}? Browse nursing opportunities in the area.`;

  const keywords = `${jobType.toLowerCase()} ${specialty.toLowerCase()} rn jobs ${city.toLowerCase()}, ${specialty.toLowerCase()} nurse ${city.toLowerCase()} ${stateCode.toLowerCase()}, ${jobType.toLowerCase()} nursing jobs ${city.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/specialty/${specialtySlug}/${jobTypeSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + specialty + experience level pages
 * Example: 8 New Grad ICU RN Jobs in Cleveland
 */
function generateCitySpecialtyExperienceLevelPageMetaTags(stateCode, _stateFullName, city, specialty, specialtySlug, level, levelSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${city}-${specialty}-${level}`);
  const cityDisplay = getCityDisplayName(city, stateCode);
  const title = jobCount > 0
    ? `${jobCount} ${level} ${specialty} RN ${jobCount === 1 ? 'Job' : 'Jobs'} in ${cityDisplay}${salaryText}`
    : `${level} ${specialty} RN Jobs in ${cityDisplay}${salaryText}`;

  const isNewGrad = levelSlug === 'new-grad';
  const description = isNewGrad
    ? (jobCount > 0
      ? `Find ${jobCount} entry level & new grad ${specialty} RN ${jobCount === 1 ? 'position' : 'positions'} in ${cityDisplay}. ${specialty} nursing residency programs available. Apply today!`
      : `Entry level & new grad ${specialty} RN jobs in ${cityDisplay}. Explore ${specialty.toLowerCase()} nursing residencies in the area.`)
    : (jobCount > 0
      ? `Find ${jobCount} ${level.toLowerCase()} ${specialty} Registered Nurse ${jobCount === 1 ? 'job' : 'jobs'} in ${cityDisplay}. Apply today!`
      : `Looking for ${level.toLowerCase()} ${specialty} Registered Nurse jobs in ${cityDisplay}? Browse nursing opportunities in the area.`);

  const keywords = isNewGrad
    ? `new grad ${specialty.toLowerCase()} rn jobs ${city.toLowerCase()}, entry level ${specialty.toLowerCase()} nurse ${city.toLowerCase()}, ${specialty.toLowerCase()} rn residency ${city.toLowerCase()} ${stateCode.toLowerCase()}`
    : `${level.toLowerCase()} ${specialty.toLowerCase()} rn jobs ${city.toLowerCase()}, ${specialty.toLowerCase()} ${level.toLowerCase()} nurse ${city.toLowerCase()} ${stateCode.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/specialty/${specialtySlug}/experience/${levelSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for shift type pages (nationwide)
 * Example: 270 Day Shift RN Jobs in USA
 */
function generateShiftPageMetaTags(shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${shiftType}-usa`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${shiftType} RN Jobs in USA${salaryText}`
    : `${shiftType} RN Jobs in USA${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${shiftType.toLowerCase()} Registered Nurse jobs nationwide. Browse ${shiftType.toLowerCase()} nursing positions at top hospitals with competitive pay. Apply today!`
    : `Browse ${shiftType.toLowerCase()} Registered Nurse jobs across the United States. Find ${shiftType.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${shiftType.toLowerCase()} rn jobs, ${shiftType.toLowerCase()} nursing jobs, ${shiftType.toLowerCase()} registered nurse, ${shiftType.toLowerCase()} nurse positions, ${shiftType.toLowerCase()} healthcare jobs, nursing careers`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + shift type pages
 * Example: 45 Day Shift RN Jobs in Ohio
 */
function generateStateShiftPageMetaTags(stateCode, stateFullName, shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${shiftType}-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${shiftType} RN Jobs in ${stateName}${salaryText}`
    : `${shiftType} RN Jobs in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${shiftType.toLowerCase()} Registered Nurse jobs in ${stateName}. Browse ${shiftType.toLowerCase()} nursing positions at top hospitals with competitive pay. Apply today!`
    : `Browse ${shiftType.toLowerCase()} Registered Nurse jobs in ${stateName}. Find ${shiftType.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${shiftType.toLowerCase()} rn jobs ${stateName.toLowerCase()}, ${shiftType.toLowerCase()} nursing jobs ${stateCode.toLowerCase()}, ${shiftType.toLowerCase()} registered nurse ${stateName.toLowerCase()}, ${shiftType.toLowerCase()} nurse positions ${stateCode.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + shift type pages
 * Example: 12 Day Shift RN Jobs in Cleveland
 */
function generateCityShiftPageMetaTags(stateCode, _stateFullName, city, citySlug, shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${city}-${shiftType}`);
  const cityDisplay = getCityDisplayName(city, stateCode);
  const title = jobCount > 0
    ? `${jobCount} ${shiftType} RN ${jobCount === 1 ? 'Job' : 'Jobs'} in ${cityDisplay}${salaryText}`
    : `${shiftType} RN Jobs in ${cityDisplay}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${shiftType.toLowerCase()} Registered Nurse ${jobCount === 1 ? 'job' : 'jobs'} in ${cityDisplay}. Browse ${shiftType.toLowerCase()} nursing positions at top hospitals. Apply today!`
    : `Browse ${shiftType.toLowerCase()} Registered Nurse jobs in ${cityDisplay}. Find ${shiftType.toLowerCase()} nursing opportunities in the area.`;

  const keywords = `${shiftType.toLowerCase()} rn jobs ${city.toLowerCase()}, ${shiftType.toLowerCase()} nursing jobs ${city.toLowerCase()} ${stateCode.toLowerCase()}, ${shiftType.toLowerCase()} registered nurse ${city.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for specialty + shift type pages (nationwide)
 * Example: 35 ICU Day Shift RN Jobs
 */
function generateSpecialtyShiftPageMetaTags(specialty, specialtySlug, shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${specialty}-${shiftType}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${specialty} ${shiftType} RN Jobs${salaryText}`
    : `${specialty} ${shiftType} RN Jobs${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${specialty} ${shiftType.toLowerCase()} Registered Nurse jobs nationwide. Browse ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing positions with competitive pay. Apply today!`
    : `Browse ${specialty} ${shiftType.toLowerCase()} Registered Nurse jobs across the USA. Find ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${specialty.toLowerCase()} ${shiftType.toLowerCase()} rn jobs, ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing jobs, ${shiftType.toLowerCase()} ${specialty.toLowerCase()} nurse, ${specialty.toLowerCase()} ${shiftType.toLowerCase()} registered nurse`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/specialty/${specialtySlug}/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + specialty + shift type pages
 * Example: 12 ICU Day Shift RN Jobs in Ohio
 */
function generateStateSpecialtyShiftPageMetaTags(stateCode, stateFullName, specialty, specialtySlug, shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${specialty}-${shiftType}-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${specialty} ${shiftType} RN Jobs in ${stateName}${salaryText}`
    : `${specialty} ${shiftType} RN Jobs in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${specialty} ${shiftType.toLowerCase()} Registered Nurse jobs in ${stateName}. Browse ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing positions with competitive pay. Apply today!`
    : `Browse ${specialty} ${shiftType.toLowerCase()} Registered Nurse jobs in ${stateName}. Find ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing opportunities at top healthcare employers.`;

  const keywords = `${specialty.toLowerCase()} ${shiftType.toLowerCase()} rn jobs ${stateName.toLowerCase()}, ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing jobs ${stateCode.toLowerCase()}, ${shiftType.toLowerCase()} ${specialty.toLowerCase()} nurse ${stateName.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specialtySlug}/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + specialty + shift type pages
 * Example: 5 ICU Day Shift RN Jobs in Cleveland
 */
function generateCitySpecialtyShiftPageMetaTags(stateCode, _stateFullName, city, citySlug, specialty, specialtySlug, shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${city}-${specialty}-${shiftType}`);
  const cityDisplay = getCityDisplayName(city, stateCode);
  const title = jobCount > 0
    ? `${jobCount} ${specialty} ${shiftType} RN ${jobCount === 1 ? 'Job' : 'Jobs'} in ${cityDisplay}${salaryText}`
    : `${specialty} ${shiftType} RN Jobs in ${cityDisplay}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${specialty} ${shiftType.toLowerCase()} Registered Nurse ${jobCount === 1 ? 'job' : 'jobs'} in ${cityDisplay}. Browse ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing positions. Apply today!`
    : `Browse ${specialty} ${shiftType.toLowerCase()} Registered Nurse jobs in ${cityDisplay}. Find ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing opportunities in the area.`;

  const keywords = `${specialty.toLowerCase()} ${shiftType.toLowerCase()} rn jobs ${city.toLowerCase()}, ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing jobs ${city.toLowerCase()} ${stateCode.toLowerCase()}, ${shiftType.toLowerCase()} ${specialty.toLowerCase()} nurse ${city.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + shift type pages
 * Example: 25 Cleveland Clinic Day Shift RN Jobs
 */
function generateEmployerShiftPageMetaTags(employerName, employerSlug, shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-${shiftType}`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${shiftType} RN ${jobCount === 1 ? 'Job' : 'Jobs'}${salaryText}`
    : `${employerName} ${shiftType} RN Jobs${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} ${shiftType.toLowerCase()} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'} with salary details and great benefits. Apply today!`
    : `Looking for ${employerName} ${shiftType.toLowerCase()} Registered Nurse jobs? Explore ${shiftType.toLowerCase()} nursing opportunities at ${employerName} with competitive pay.`;

  const keywords = `${shiftType.toLowerCase()} rn jobs ${employerName.toLowerCase()}, ${shiftType.toLowerCase()} nurse ${employerName.toLowerCase()}, ${employerName.toLowerCase()} ${shiftType.toLowerCase()} nursing jobs, ${shiftType.toLowerCase()} registered nurse ${employerName.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + specialty + shift type pages
 * Example: 8 Cleveland Clinic ICU Day Shift RN Jobs
 */
function generateEmployerSpecialtyShiftPageMetaTags(employerName, employerSlug, specialty, specialtySlug, shiftType, shiftSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-${specialty}-${shiftType}`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${specialty} ${shiftType} RN ${jobCount === 1 ? 'Job' : 'Jobs'}${salaryText}`
    : `${employerName} ${specialty} ${shiftType} RN Jobs${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} ${specialty} ${shiftType.toLowerCase()} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'}. Browse ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing opportunities at ${employerName}. Apply today!`
    : `Looking for ${employerName} ${specialty} ${shiftType.toLowerCase()} Registered Nurse jobs? Explore ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nursing opportunities at ${employerName}.`;

  const keywords = `${employerName.toLowerCase()} ${specialty.toLowerCase()} ${shiftType.toLowerCase()} rn jobs, ${specialty.toLowerCase()} ${shiftType.toLowerCase()} nurse ${employerName.toLowerCase()}, ${employerName.toLowerCase()} ${shiftType.toLowerCase()} ${specialty.toLowerCase()} nursing`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/${specialtySlug}/shift/${shiftSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

// ============================================================================
// Sign-On Bonus Page SEO Functions
// ============================================================================

/**
 * Generate meta tags for nationwide sign-on bonus jobs page
 * Example: 150 RN Jobs with Sign-On Bonus in USA
 */
function generateSignOnBonusPageMetaTags(jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, 'sign-on-bonus-usa');
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} RN Jobs with Sign-On Bonus${salaryText}`
    : `RN Jobs with Sign-On Bonus${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} Registered Nurse jobs with sign-on bonus nationwide. Browse nursing positions offering signing bonuses at top hospitals. Apply today!`
    : `Browse Registered Nurse jobs with sign-on bonus across the United States. Find nursing positions offering signing bonuses at top healthcare employers.`;

  const keywords = 'rn jobs with sign on bonus, nursing sign on bonus, rn sign on bonus jobs, nurse signing bonus, nursing jobs with bonus, hospital sign on bonus rn';

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state sign-on bonus jobs page
 * Example: 45 RN Jobs with Sign-On Bonus in Ohio
 */
function generateStateSignOnBonusPageMetaTags(stateCode, stateFullName, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `sign-on-bonus-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`
    : `RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} Registered Nurse jobs with sign-on bonus in ${stateName}. Browse nursing positions offering signing bonuses at top hospitals. Apply today!`
    : `Browse Registered Nurse jobs with sign-on bonus in ${stateName}. Find nursing positions offering signing bonuses at top healthcare employers.`;

  const keywords = `rn jobs with sign on bonus ${stateName.toLowerCase()}, ${stateName.toLowerCase()} rn sign on bonus, nursing sign on bonus ${stateName.toLowerCase()}, ${stateName.toLowerCase()} nurse signing bonus`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city sign-on bonus jobs page
 * Example: 12 RN Jobs with Sign-On Bonus in Cleveland
 */
function generateCitySignOnBonusPageMetaTags(stateCode, stateFullName, city, citySlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const cityDisplay = getCityDisplayName(city, stateCode);
  const salaryText = getSalaryText(maxHourlyRate, `sign-on-bonus-${city}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} RN Jobs with Sign-On Bonus in ${cityDisplay}${salaryText}`
    : `RN Jobs with Sign-On Bonus in ${cityDisplay}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} Registered Nurse jobs with sign-on bonus in ${city}, ${stateName}. Browse nursing positions offering signing bonuses at top hospitals. Apply today!`
    : `Browse Registered Nurse jobs with sign-on bonus in ${city}, ${stateName}. Find nursing positions offering signing bonuses at top healthcare employers.`;

  const keywords = `rn jobs with sign on bonus ${city.toLowerCase()}, ${city.toLowerCase()} rn sign on bonus, nursing sign on bonus ${city.toLowerCase()}, ${city.toLowerCase()} nurse signing bonus`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for specialty sign-on bonus jobs page
 * Example: 35 ICU RN Jobs with Sign-On Bonus
 */
function generateSpecialtySignOnBonusPageMetaTags(specialty, specialtySlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${specialty}-sign-on-bonus`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${specialty} RN Jobs with Sign-On Bonus${salaryText}`
    : `${specialty} RN Jobs with Sign-On Bonus${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${specialty} Registered Nurse jobs with sign-on bonus. Browse ${specialty.toLowerCase()} nursing positions offering signing bonuses at top hospitals. Apply today!`
    : `Browse ${specialty} Registered Nurse jobs with sign-on bonus. Find ${specialty.toLowerCase()} nursing positions offering signing bonuses at top healthcare employers.`;

  const keywords = `${specialty.toLowerCase()} rn jobs with sign on bonus, ${specialty.toLowerCase()} nurse sign on bonus, ${specialty.toLowerCase()} nursing signing bonus, ${specialty.toLowerCase()} rn sign on bonus`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/specialty/${specialtySlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer sign-on bonus jobs page
 * Example: 20 Cleveland Clinic RN Jobs with Sign-On Bonus
 */
function generateEmployerSignOnBonusPageMetaTags(employerName, employerSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-sign-on-bonus`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} RN ${jobCount === 1 ? 'Job' : 'Jobs'} with Sign-On Bonus${salaryText}`
    : `${employerName} RN Jobs with Sign-On Bonus${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'} with sign-on bonus. Browse nursing jobs offering signing bonuses at ${employerName}. Apply today!`
    : `Looking for ${employerName} Registered Nurse jobs with sign-on bonus? Explore nursing opportunities with signing bonuses at ${employerName}.`;

  const keywords = `${employerName.toLowerCase()} rn sign on bonus, ${employerName.toLowerCase()} nurse signing bonus, ${employerName.toLowerCase()} nursing sign on bonus jobs`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + specialty sign-on bonus jobs page
 * Example: 15 ICU RN Jobs with Sign-On Bonus in Ohio
 */
function generateStateSpecialtySignOnBonusPageMetaTags(stateCode, stateFullName, specialty, specialtySlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${specialty}-sign-on-bonus-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${specialty} RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`
    : `${specialty} RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${specialty} Registered Nurse jobs with sign-on bonus in ${stateName}. Browse ${specialty.toLowerCase()} nursing positions offering signing bonuses. Apply today!`
    : `Browse ${specialty} Registered Nurse jobs with sign-on bonus in ${stateName}. Find ${specialty.toLowerCase()} nursing positions offering signing bonuses.`;

  const keywords = `${specialty.toLowerCase()} rn sign on bonus ${stateName.toLowerCase()}, ${stateName.toLowerCase()} ${specialty.toLowerCase()} nurse signing bonus, ${specialty.toLowerCase()} nursing sign on bonus ${stateName.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specialtySlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + specialty sign-on bonus jobs page
 * Example: 8 ICU RN Jobs with Sign-On Bonus in Cleveland
 */
function generateCitySpecialtySignOnBonusPageMetaTags(stateCode, stateFullName, city, citySlug, specialty, specialtySlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const cityDisplay = getCityDisplayName(city, stateCode);
  const salaryText = getSalaryText(maxHourlyRate, `${specialty}-sign-on-bonus-${city}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${specialty} RN Jobs with Sign-On Bonus in ${cityDisplay}${salaryText}`
    : `${specialty} RN Jobs with Sign-On Bonus in ${cityDisplay}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${specialty} Registered Nurse jobs with sign-on bonus in ${city}, ${stateName}. Browse ${specialty.toLowerCase()} nursing positions offering signing bonuses. Apply today!`
    : `Browse ${specialty} Registered Nurse jobs with sign-on bonus in ${city}, ${stateName}. Find ${specialty.toLowerCase()} nursing positions offering signing bonuses.`;

  const keywords = `${specialty.toLowerCase()} rn sign on bonus ${city.toLowerCase()}, ${city.toLowerCase()} ${specialty.toLowerCase()} nurse signing bonus, ${specialty.toLowerCase()} nursing sign on bonus ${city.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + specialty sign-on bonus jobs page
 * Example: 5 Cleveland Clinic ICU RN Jobs with Sign-On Bonus
 */
function generateEmployerSpecialtySignOnBonusPageMetaTags(employerName, employerSlug, specialty, specialtySlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${employerName}-${specialty}-sign-on-bonus`);
  const title = jobCount > 0
    ? `${jobCount} ${employerName} ${specialty} RN ${jobCount === 1 ? 'Job' : 'Jobs'} with Sign-On Bonus${salaryText}`
    : `${employerName} ${specialty} RN Jobs with Sign-On Bonus${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount} ${employerName} ${specialty} Registered Nurse ${jobCount === 1 ? 'position' : 'positions'} with sign-on bonus. Browse ${specialty.toLowerCase()} nursing jobs offering signing bonuses at ${employerName}. Apply today!`
    : `Looking for ${employerName} ${specialty} Registered Nurse jobs with sign-on bonus? Explore ${specialty.toLowerCase()} nursing opportunities with signing bonuses at ${employerName}.`;

  const keywords = `${employerName.toLowerCase()} ${specialty.toLowerCase()} rn sign on bonus, ${employerName.toLowerCase()} ${specialty.toLowerCase()} nurse signing bonus, ${employerName.toLowerCase()} ${specialty.toLowerCase()} nursing sign on bonus`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/${specialtySlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for experience level sign-on bonus jobs page
 * Example: 25 New Grad RN Jobs with Sign-On Bonus
 */
function generateExperienceLevelSignOnBonusPageMetaTags(experienceLevel, levelSlug, jobCount, maxHourlyRate = null) {
  const salaryText = getSalaryText(maxHourlyRate, `${experienceLevel}-sign-on-bonus`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${experienceLevel} RN Jobs with Sign-On Bonus${salaryText}`
    : `${experienceLevel} RN Jobs with Sign-On Bonus${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${experienceLevel.toLowerCase()} Registered Nurse jobs with sign-on bonus. Browse ${experienceLevel.toLowerCase()} nursing positions offering signing bonuses at top hospitals. Apply today!`
    : `Browse ${experienceLevel.toLowerCase()} Registered Nurse jobs with sign-on bonus. Find ${experienceLevel.toLowerCase()} nursing positions offering signing bonuses at top healthcare employers.`;

  const keywords = `${experienceLevel.toLowerCase()} rn jobs with sign on bonus, ${experienceLevel.toLowerCase()} nurse sign on bonus, ${experienceLevel.toLowerCase()} nursing signing bonus, ${experienceLevel.toLowerCase()} rn sign on bonus`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/experience/${levelSlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + experience level sign-on bonus jobs page
 * Example: 10 New Grad RN Jobs with Sign-On Bonus in Ohio
 */
function generateStateExperienceLevelSignOnBonusPageMetaTags(stateCode, stateFullName, experienceLevel, levelSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${experienceLevel}-sign-on-bonus-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${experienceLevel} RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`
    : `${experienceLevel} RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${experienceLevel.toLowerCase()} Registered Nurse jobs with sign-on bonus in ${stateName}. Browse ${experienceLevel.toLowerCase()} nursing positions offering signing bonuses. Apply today!`
    : `Browse ${experienceLevel.toLowerCase()} Registered Nurse jobs with sign-on bonus in ${stateName}. Find ${experienceLevel.toLowerCase()} nursing positions offering signing bonuses.`;

  const keywords = `${experienceLevel.toLowerCase()} rn sign on bonus ${stateName.toLowerCase()}, ${stateName.toLowerCase()} ${experienceLevel.toLowerCase()} nurse signing bonus, ${experienceLevel.toLowerCase()} nursing sign on bonus ${stateName.toLowerCase()}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/experience/${levelSlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + specialty + experience level sign-on bonus jobs page
 * Example: 5 New Grad ICU RN Jobs with Sign-On Bonus in Ohio
 */
function generateStateSpecialtyExperienceLevelSignOnBonusPageMetaTags(stateCode, stateFullName, specialty, specialtySlug, experienceLevel, levelSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = getSalaryText(maxHourlyRate, `${experienceLevel}-${specialty}-sign-on-bonus-${stateName}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${experienceLevel} ${specialty} RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`
    : `${experienceLevel} ${specialty} RN Jobs with Sign-On Bonus in ${stateName}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${experienceLevel.toLowerCase()} ${specialty} Registered Nurse jobs with sign-on bonus in ${stateName}. Browse ${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} nursing positions offering signing bonuses. Apply today!`
    : `Browse ${experienceLevel.toLowerCase()} ${specialty} Registered Nurse jobs with sign-on bonus in ${stateName}. Find ${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} nursing positions offering signing bonuses.`;

  const keywords = `${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} rn sign on bonus ${stateName.toLowerCase()}, ${stateName.toLowerCase()} ${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} nurse signing bonus`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/specialty/${specialtySlug}/experience/${levelSlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for city + specialty + experience level sign-on bonus jobs page
 * Example: 3 New Grad ICU RN Jobs with Sign-On Bonus in Cleveland
 */
function generateCitySpecialtyExperienceLevelSignOnBonusPageMetaTags(stateCode, stateFullName, city, citySlug, specialty, specialtySlug, experienceLevel, levelSlug, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const cityDisplay = getCityDisplayName(city, stateCode);
  const salaryText = getSalaryText(maxHourlyRate, `${experienceLevel}-${specialty}-sign-on-bonus-${city}`);
  const title = jobCount > 0
    ? `${jobCount.toLocaleString()} ${experienceLevel} ${specialty} RN Jobs with Sign-On Bonus in ${cityDisplay}${salaryText}`
    : `${experienceLevel} ${specialty} RN Jobs with Sign-On Bonus in ${cityDisplay}${salaryText}`;

  const description = jobCount > 0
    ? `Find ${jobCount.toLocaleString()} ${experienceLevel.toLowerCase()} ${specialty} Registered Nurse jobs with sign-on bonus in ${city}, ${stateName}. Browse ${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} nursing positions offering signing bonuses. Apply today!`
    : `Browse ${experienceLevel.toLowerCase()} ${specialty} Registered Nurse jobs with sign-on bonus in ${city}, ${stateName}. Find ${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} nursing positions offering signing bonuses.`;

  const keywords = `${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} rn sign on bonus ${city.toLowerCase()}, ${city.toLowerCase()} ${experienceLevel.toLowerCase()} ${specialty.toLowerCase()} nurse signing bonus`;

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/${citySlug}/specialty/${specialtySlug}/experience/${levelSlug}/sign-on-bonus`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

// ============================================================
// REMOTE + FILTER PAGES
// ============================================================

/**
 * Generate meta tags for remote + specialty pages
 * URL: /jobs/nursing/remote/case-management
 */
function generateRemoteSpecialtyPageMetaTags(specialty, specialtySlug, jobCount, maxHourlyRate = null) {
  const salaryText = maxHourlyRate ? ` - Up to $${maxHourlyRate}/hr` : ' - Work From Home';

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}Remote ${specialty} RN Jobs${salaryText}`;
  const description = `Find ${jobCount || 0} remote ${specialty} Registered Nurse jobs. Work from home ${specialty.toLowerCase()} nursing positions at top healthcare employers. Apply today!`;

  const keywords = [
    `remote ${specialty.toLowerCase()} rn jobs`,
    `work from home ${specialty.toLowerCase()} nurse`,
    `remote ${specialty.toLowerCase()} nursing jobs`,
    `telehealth ${specialty.toLowerCase()} nurse`,
    `virtual ${specialty.toLowerCase()} nurse`
  ].join(', ');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/remote/${specialtySlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for remote + specialty + job type pages
 * URL: /jobs/nursing/remote/case-management/full-time
 */
function generateRemoteSpecialtyJobTypePageMetaTags(specialty, specialtySlug, jobType, jobTypeSlug, jobCount, maxHourlyRate = null) {
  const salaryText = maxHourlyRate ? ` - Up to $${maxHourlyRate}/hr` : ' - Work From Home';

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}${jobType} Remote ${specialty} RN Jobs${salaryText}`;
  const description = `Find ${jobCount || 0} ${jobType.toLowerCase()} remote ${specialty} Registered Nurse jobs. Browse work from home ${specialty.toLowerCase()} nursing positions and apply today!`;

  const keywords = [
    `${jobType.toLowerCase()} remote ${specialty.toLowerCase()} rn jobs`,
    `${jobType.toLowerCase()} work from home ${specialty.toLowerCase()} nurse`,
    `${jobType.toLowerCase()} telehealth ${specialty.toLowerCase()} nursing`
  ].join(', ');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/remote/${specialtySlug}/${jobTypeSlug}`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for state + remote pages
 * URL: /jobs/nursing/pa/remote
 */
function generateStateRemotePageMetaTags(stateCode, stateFullName, jobCount, maxHourlyRate = null) {
  const stateName = stateFullName || stateCode;
  const salaryText = maxHourlyRate ? ` - Up to $${maxHourlyRate}/hr` : ' - Work From Home';

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}Remote RN Jobs in ${stateName}${salaryText}`;
  const description = `Find ${jobCount || 0} remote Registered Nurse jobs in ${stateName}. Work from home nursing positions for ${stateCode.toUpperCase()}-licensed nurses. Apply today!`;

  const keywords = [
    `remote rn jobs ${stateName.toLowerCase()}`,
    `work from home nursing jobs ${stateName.toLowerCase()}`,
    `${stateCode.toUpperCase()} remote nurse jobs`,
    `telehealth nurse jobs ${stateName.toLowerCase()}`
  ].join(', ');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/${stateCode.toLowerCase()}/remote`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

/**
 * Generate meta tags for employer + remote pages
 * URL: /jobs/nursing/employer/centene/remote
 */
function generateEmployerRemotePageMetaTags(employerName, employerSlug, jobCount, maxHourlyRate = null) {
  const salaryText = maxHourlyRate ? ` - Up to $${maxHourlyRate}/hr` : ' - Work From Home';

  const title = `${jobCount > 0 ? jobCount + ' ' : ''}Remote RN Jobs at ${employerName}${salaryText}`;
  const description = `Find ${jobCount || 0} remote Registered Nurse jobs at ${employerName}. Work from home nursing positions. Apply today!`;

  const keywords = [
    `${employerName.toLowerCase()} remote rn jobs`,
    `${employerName.toLowerCase()} work from home nurse`,
    `${employerName.toLowerCase()} telehealth jobs`,
    `remote nursing jobs ${employerName.toLowerCase()}`
  ].join(', ');

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${SITE_URL}/jobs/nursing/employer/${employerSlug}/remote`,
    ogImage: `${SITE_URL}/og-image-jobs.png`,
    ogType: 'website'
  };
}

module.exports = {
  generateJobPostingSchema,
  generateJobMetaTags,
  generateListingPageMetaTags,
  generateStatePageMetaTags,
  generateRemotePageMetaTags,
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
  generateStateSpecialtyJobTypePageMetaTags,
  generateCitySpecialtyJobTypePageMetaTags,
  // Experience level page meta tags
  generateExperienceLevelPageMetaTags,
  generateStateExperienceLevelPageMetaTags,
  generateCityExperienceLevelPageMetaTags,
  generateSpecialtyExperienceLevelPageMetaTags,
  generateStateSpecialtyExperienceLevelPageMetaTags,
  generateEmployerExperienceLevelPageMetaTags,
  generateEmployerSpecialtyExperienceLevelPageMetaTags,
  generateCitySpecialtyExperienceLevelPageMetaTags,
  // Shift page meta tags
  generateShiftPageMetaTags,
  generateStateShiftPageMetaTags,
  generateCityShiftPageMetaTags,
  // Specialty + Shift page meta tags
  generateSpecialtyShiftPageMetaTags,
  generateStateSpecialtyShiftPageMetaTags,
  generateCitySpecialtyShiftPageMetaTags,
  // Employer + Shift page meta tags
  generateEmployerShiftPageMetaTags,
  // Employer + Specialty + Shift page meta tags
  generateEmployerSpecialtyShiftPageMetaTags,
  // Sign-on Bonus page meta tags
  generateSignOnBonusPageMetaTags,
  generateStateSignOnBonusPageMetaTags,
  generateCitySignOnBonusPageMetaTags,
  generateSpecialtySignOnBonusPageMetaTags,
  generateEmployerSignOnBonusPageMetaTags,
  generateStateSpecialtySignOnBonusPageMetaTags,
  generateCitySpecialtySignOnBonusPageMetaTags,
  generateEmployerSpecialtySignOnBonusPageMetaTags,
  generateExperienceLevelSignOnBonusPageMetaTags,
  generateStateExperienceLevelSignOnBonusPageMetaTags,
  generateStateSpecialtyExperienceLevelSignOnBonusPageMetaTags,
  generateCitySpecialtyExperienceLevelSignOnBonusPageMetaTags,
  // Remote + filter page meta tags
  generateRemoteSpecialtyPageMetaTags,
  generateRemoteSpecialtyJobTypePageMetaTags,
  generateStateRemotePageMetaTags,
  generateEmployerRemotePageMetaTags,
  formatForAI
};

