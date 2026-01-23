/**
 * Server-side data fetching for job pages
 * Used by getServerSideProps for SSR
 */

const { getStateFullName, normalizeState, normalizeCity, generateCitySlug } = require('../jobScraperUtils');
const { calculateSalaryStats } = require('../utils/salaryStatsUtils');
const { slugToSpecialty } = require('../constants/specialties');

// Import the shared Prisma singleton from lib/prisma.ts
const { prisma } = require('../prisma');

/**
 * Maximum jobs to fetch for interleaving
 * We fetch up to this many jobs to ensure variety across employers
 * (some employers may have 200+ recent jobs, so 3x page size isn't enough)
 */
const MAX_INTERLEAVE_FETCH = 600;

/**
 * Interleave jobs by employer for variety on listing pages
 * Round-robin selects from each employer to prevent pages being dominated by one employer
 * (scrapers run one employer at a time, so recent jobs cluster by employer)
 * @param {Array} jobs - Jobs fetched from database (up to MAX_INTERLEAVE_FETCH)
 * @param {number} desiredCount - Number of jobs to return (page size)
 * @returns {Array} - Interleaved jobs with employer variety
 */
function interleaveJobsByEmployer(jobs, desiredCount) {
  if (!jobs || jobs.length === 0) return [];
  if (jobs.length <= 1) return jobs.slice(0, desiredCount);

  // Group jobs by employer (preserve order within each employer)
  const byEmployer = new Map();
  for (const job of jobs) {
    const employerId = job.employerId || job.employer?.id || 'unknown';
    if (!byEmployer.has(employerId)) {
      byEmployer.set(employerId, []);
    }
    byEmployer.get(employerId).push(job);
  }

  // Round-robin pick from each employer
  const result = [];
  const employerQueues = Array.from(byEmployer.values());

  // Keep picking until we have enough or run out
  while (result.length < desiredCount && employerQueues.some(q => q.length > 0)) {
    for (const queue of employerQueues) {
      if (queue.length > 0 && result.length < desiredCount) {
        result.push(queue.shift());
      }
    }
  }

  return result;
}

/**
 * Convert Date objects to ISO strings for JSON serialization
 * Next.js getServerSideProps requires JSON-serializable data
 */
function serializeDates(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }

  if (typeof obj === 'object') {
    const serialized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeDates(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

/**
 * Check if a slug is a state code or state name
 * @param {string} slug - URL slug
 * @returns {object|null} - { stateCode: 'OH', stateFullName: 'Ohio' } or null
 */
function detectStateFromSlug(slug) {
  if (!slug) return null;
  
  const slugUpper = slug.toUpperCase();
  
  // Check if it's a 2-letter state code first (most common case)
  const stateFullName = getStateFullName(slugUpper);
  if (slug.length === 2 && stateFullName) {
    return { stateCode: slugUpper, stateFullName };
  }
  
  // For longer slugs, only check if it looks like a state name (not a job slug)
  // State names are typically 1-3 words (e.g., "new-york", "north-carolina")
  // Job slugs have many more words/hyphens
  const hyphenCount = (slug.match(/-/g) || []).length;
  
  // Only check for state name if slug has 2 or fewer hyphens (state names are short)
  if (hyphenCount <= 2) {
    const slugLower = slug.toLowerCase().replace(/-/g, ' ');
    
    // Check common state name patterns
    const stateNamePatterns = [
      /^(new\s+(hampshire|jersey|mexico|york))$/i,
      /^(north|south)\s+(carolina|dakota)$/i,
      /^(west\s+virginia|rhode\s+island)$/i,
      /^(district\s+of\s+columbia)$/i,
      /^(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|ohio|oklahoma|oregon|pennsylvania|south\s+carolina|south\s+dakota|tennessee|texas|utah|vermont|virginia|washington|wisconsin|wyoming)$/i
    ];
    
    // Check if the slug matches a state name pattern
    const matchesStatePattern = stateNamePatterns.some(pattern => pattern.test(slugLower));
    
    if (matchesStatePattern) {
      const normalizedState = normalizeState(slugLower);
      if (normalizedState && normalizedState.length === 2 && getStateFullName(normalizedState)) {
        return { 
          stateCode: normalizedState, 
          stateFullName: getStateFullName(normalizedState) 
        };
      }
    }
  }
  
  return null;
}

/**
 * Fetch state jobs with statistics
 */
async function fetchStateJobs(stateCode, page = 1, limit = 20) {
  const stateUpper = stateCode.toUpperCase();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    state: stateUpper,
    isActive: true
  };

  const [rawJobs, total] = await Promise.all([
    prisma.nursingJob.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      skip,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get aggregated statistics
  const [topCities, allCities, specialties, jobTypes, employers, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['city'],
      where,
      _count: { id: true },
      orderBy: { city: 'asc' }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...where, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...where, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.aggregate({
      where,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer names
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const employersWithNames = employers.map(e => ({
    ...e,
    employer: employerMap.get(e.employerId)
  }));

  const totalPages = Math.ceil(total / limitNum);

  // Serialize dates to ISO strings for JSON serialization
  return {
    jobs: serializeDates(jobs),
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    statistics: {
      cities: topCities.map(c => ({ city: c.city, count: c._count.id })),
      allCities: allCities.map(c => ({ city: c.city, count: c._count.id })),
      specialties: specialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
      jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id })),
      employers: employersWithNames.filter(e => e.employer).map(e => ({
        employer: e.employer,
        count: e._count.id
      }))
    }
  };
}

/**
 * Fetch job by slug with related jobs
 */
async function fetchJobBySlug(slug) {
  const job = await prisma.nursingJob.findUnique({
    where: { slug },
    include: {
      employer: {
        select: {
          id: true,
          name: true,
          slug: true,
          careerPageUrl: true
        }
      }
    }
  });

  if (!job) {
    return null;
  }

  // Get related jobs
  const relatedJobs = await prisma.nursingJob.findMany({
    where: {
      id: { not: job.id },
      isActive: true,
      OR: [
        { specialty: job.specialty },
        { city: job.city, state: job.state }
      ]
    },
    include: {
      employer: {
        select: {
          name: true,
          slug: true
        }
      }
    },
    take: 5,
    orderBy: {
      scrapedAt: 'desc'
    }
  });

  // Serialize dates to ISO strings for JSON serialization
  return {
    job: serializeDates(job),
    relatedJobs: serializeDates(relatedJobs)
  };
}

/**
 * Fetch city jobs with statistics
 */
async function fetchCityJobs(stateCode, citySlug, page = 1, limit = 20) {
  const stateUpper = stateCode.toUpperCase();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Normalize city name for matching
  const cityPattern = citySlug
    .toLowerCase()
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const where = {
    state: stateUpper,
    city: {
      contains: cityPattern,
      mode: 'insensitive'
    },
    isActive: true
  };

  const [rawJobs, total] = await Promise.all([
    prisma.nursingJob.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      skip,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const actualCityName = rawJobs.length > 0 ? rawJobs[0].city : cityPattern;

  // Get aggregated statistics
  const [specialties, employers, allStates, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...where, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
      // No limit - show ALL specialties for footer internal linking
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { state: 'asc' }
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...where, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer names
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const employersWithNames = employers.map(e => ({
    ...e,
    employer: employerMap.get(e.employerId)
  }));

  const totalPages = Math.ceil(total / limitNum);

  // Serialize dates to ISO strings for JSON serialization
  return {
    jobs: serializeDates(jobs),
    city: actualCityName,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    statistics: {
      specialties: specialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
      employers: employersWithNames.filter(e => e.employer).map(e => ({
        employer: e.employer,
        count: e._count.id
      })),
      allStates: allStates.map(s => ({ state: s.state, count: s._count.id })),
      jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id }))
    }
  };
}

/**
 * Fetch specialty jobs with statistics
 */
async function fetchSpecialtyJobs(specialtySlug, page = 1, limit = 20) {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Convert slug to actual specialty name using the specialties constant mapping
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!actualSpecialtyName) {
    return null; // Invalid specialty slug
  }

  const where = {
    specialty: actualSpecialtyName,
    isActive: true
  };

  const [rawJobs, total] = await Promise.all([
    prisma.nursingJob.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      skip,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get aggregated statistics
  const [states, allStates, cities, employers, allSpecialties, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    // All states for footer browse section
    prisma.nursingJob.groupBy({
      by: ['state'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { isActive: true, specialty: { not: null } },
      _count: { id: true },
      orderBy: { specialty: 'asc' }
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...where, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer names
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const employersWithNames = employers.map(e => ({
    ...e,
    employer: employerMap.get(e.employerId)
  }));

  const totalPages = Math.ceil(total / limitNum);

  // Serialize dates to ISO strings for JSON serialization
  return {
    jobs: serializeDates(jobs),
    specialty: actualSpecialtyName,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    statistics: {
      states: states.map(s => ({ state: s.state, count: s._count.id })),
      allStates: allStates.map(s => ({ state: s.state, count: s._count.id })),
      cities: cities.map(c => ({ city: c.city, state: c.state, count: c._count.id })),
      employers: employersWithNames.filter(e => e.employer).map(e => ({
        employer: e.employer,
        count: e._count.id
      })),
      allSpecialties: allSpecialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
      jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id }))
    }
  };
}

/**
 * Fetch employer jobs with statistics
 */
async function fetchEmployerJobs(employerSlug, page = 1, limit = 20) {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Find employer by slug
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug },
    select: { id: true, name: true, slug: true }
  });

  if (!employer) {
    return null; // Employer not found
  }

  const where = {
    employerId: employer.id,
    isActive: true
  };

  const [jobs, total] = await Promise.all([
    prisma.nursingJob.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      skip,
      take: limitNum
    }),
    prisma.nursingJob.count({ where })
  ]);

  // Get aggregated statistics
  const [states, cities, specialties, jobTypes, allStates, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...where, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...where, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { state: 'asc' }
    }),
    prisma.nursingJob.aggregate({
      where,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Normalize and merge job types (Full Time/full-time, Part Time/part-time, etc.)
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');
  const mergedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;

    if (!mergedJobTypes[normalized]) {
      mergedJobTypes[normalized] = {
        slug: normalized,
        displayName: jobTypeToDisplay(normalized),
        count: 0
      };
    }
    mergedJobTypes[normalized].count += jt._count.id;
  });

  const totalPages = Math.ceil(total / limitNum);

  // Serialize dates to ISO strings for JSON serialization
  return {
    jobs: serializeDates(jobs),
    employer: serializeDates(employer),
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    statistics: {
      states: states.map(s => ({ state: s.state, count: s._count.id })),
      cities: cities.map(c => ({ city: c.city, state: c.state, count: c._count.id })),
      specialties: specialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
      jobTypes: Object.values(mergedJobTypes).sort((a, b) => b.count - a.count),
      allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
    }
  };
}

/**
 * Fetch salary statistics for a state
 */
async function fetchStateSalaryStats(stateCode) {
  const stateUpper = stateCode.toUpperCase();
  
  const where = {
    state: stateUpper,
    isActive: true,
    // Exclude leadership but allow NULL values to avoid over-filtering
    OR: [
      { experienceLevel: { not: 'Leadership' } },
      { experienceLevel: null }
    ],
    AND: [
      {
        OR: [
          { salaryMinHourly: { not: null } },
          { salaryMaxHourly: { not: null } }
        ]
      }
    ]
  };

  // Fetch jobs with salary data and related employer info
  const jobs = await prisma.nursingJob.findMany({
    where,
    select: {
      salaryMinHourly: true,
      salaryMaxHourly: true,
      salaryMinAnnual: true,
      salaryMaxAnnual: true,
      specialty: true,
      employerId: true,
      employer: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  // Calculate salary statistics
  const salaryStats = calculateSalaryStats(jobs);

  // Get all cities in state for browse navigation
  const cities = await prisma.nursingJob.groupBy({
    by: ['city'],
    where: {
      state: stateUpper,
      isActive: true
    },
    _count: { id: true },
    orderBy: { city: 'asc' }
  });

  // Get all states for browse navigation
  const allStates = await prisma.nursingJob.groupBy({
    by: ['state'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { state: 'asc' }
  });

  return {
    salaryStats,
    cities: cities.map(c => ({ city: c.city, count: c._count.id })),
    allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
  };
}

/**
 * Fetch salary statistics for a city
 */
async function fetchCitySalaryStats(stateCode, citySlug) {
  const stateUpper = stateCode.toUpperCase();
  
  // Find actual city name from jobs (city slug might be partial match)
  const sampleJob = await prisma.nursingJob.findFirst({
    where: {
      state: stateUpper,
      city: {
        contains: citySlug.replace(/-/g, ' '),
        mode: 'insensitive'
      },
      isActive: true
    },
    select: { city: true }
  });

  if (!sampleJob) {
    return null; // City not found
  }

  const actualCityName = sampleJob.city;

  const where = {
    state: stateUpper,
    city: {
      contains: actualCityName,
      mode: 'insensitive'
    },
    isActive: true,
    // Exclude leadership but allow NULL values to avoid over-filtering
    OR: [
      { experienceLevel: { not: 'Leadership' } },
      { experienceLevel: null }
    ],
    AND: [
      {
        OR: [
          { salaryMinHourly: { not: null } },
          { salaryMaxHourly: { not: null } }
        ]
      }
    ]
  };

  // Fetch jobs with salary data and related employer info
  const jobs = await prisma.nursingJob.findMany({
    where,
    select: {
      salaryMinHourly: true,
      salaryMaxHourly: true,
      salaryMinAnnual: true,
      salaryMaxAnnual: true,
      specialty: true,
      employerId: true,
      employer: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  // Calculate salary statistics
  const salaryStats = calculateSalaryStats(jobs);

  // Get all cities in state for browse navigation
  const cities = await prisma.nursingJob.groupBy({
    by: ['city'],
    where: {
      state: stateUpper,
      isActive: true
    },
    _count: { id: true },
    orderBy: { city: 'asc' }
  });

  // Get all states for browse navigation
  const allStates = await prisma.nursingJob.groupBy({
    by: ['state'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { state: 'asc' }
  });

  return {
    salaryStats,
    city: actualCityName,
    cities: cities.map(c => ({ city: c.city, count: c._count.id })),
    allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
  };
}

/**
 * Fetch jobs for a specific state + specialty combination
 * Example: Ohio + ICU → All ICU jobs in Ohio
 */
async function fetchStateSpecialtyJobs(stateCode, specialtySlug, page = 1, limit = 20) {
  const stateUpper = stateCode.toUpperCase();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Use centralized slugToSpecialty to get the canonical specialty name
  // This properly handles specialties with & like "Labor & Delivery"
  const canonicalSpecialty = slugToSpecialty(specialtySlug);

  if (!canonicalSpecialty) {
    return null; // Invalid specialty slug
  }

  // Find actual specialty name from database (matching the canonical name)
  const sampleJob = await prisma.nursingJob.findFirst({
    where: {
      state: stateUpper,
      specialty: { equals: canonicalSpecialty, mode: 'insensitive' },
      isActive: true
    },
    select: { specialty: true }
  });

  const actualSpecialtyName = sampleJob?.specialty;

  if (!actualSpecialtyName) {
    return null; // Specialty not found in this state
  }

  const where = {
    state: stateUpper,
    specialty: {
      equals: actualSpecialtyName,
      mode: 'insensitive'
    },
    isActive: true
  };

  const [rawJobs, total] = await Promise.all([
    prisma.nursingJob.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      skip,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Generate statistics for this state + specialty
  const [cities, employers, jobTypes, salaryStats] = await Promise.all([
    // All cities within this state for this specialty
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: {
        state: stateUpper,
        specialty: { equals: actualSpecialtyName, mode: 'insensitive' },
        isActive: true
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
      // No limit - show ALL cities for better internal linking and SEO
    }),
    // Top employers within this state for this specialty
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: {
        state: stateUpper,
        specialty: { equals: actualSpecialtyName, mode: 'insensitive' },
        isActive: true
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    // Job types for this state + specialty
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: {
        state: stateUpper,
        specialty: { equals: actualSpecialtyName, mode: 'insensitive' },
        isActive: true,
        jobType: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    // Max hourly rate for salary display
    prisma.nursingJob.aggregate({
      where,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });

  const employersWithDetails = employers.map(emp => ({
    count: emp._count.id,
    employer: employerDetails.find(e => e.id === emp.employerId)
  }));

  const totalPages = Math.ceil(total / limitNum);

  return {
    specialty: actualSpecialtyName,
    stateCode: stateUpper,
    jobs: JSON.parse(JSON.stringify(jobs)),
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    statistics: {
      cities: cities.map(c => ({ city: c.city, count: c._count.id })),
      employers: employersWithDetails,
      jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id }))
    }
  };
}

/**
 * Fetch jobs for a specific city + specialty combination
 * Example: Cleveland + ICU → All ICU jobs in Cleveland, Ohio
 */
async function fetchCitySpecialtyJobs(stateCode, citySlug, specialtySlug, page = 1, limit = 20) {
  const stateUpper = stateCode.toUpperCase();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Normalize city name for matching
  const cityPattern = citySlug
    .toLowerCase()
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Use centralized slugToSpecialty to get the canonical specialty name
  // This properly handles specialties with & like "Labor & Delivery"
  const canonicalSpecialty = slugToSpecialty(specialtySlug);

  if (!canonicalSpecialty) {
    return null; // Invalid specialty slug
  }

  // Find actual specialty and city name from database
  const sampleJob = await prisma.nursingJob.findFirst({
    where: {
      state: stateUpper,
      city: {
        contains: cityPattern,
        mode: 'insensitive'
      },
      specialty: { equals: canonicalSpecialty, mode: 'insensitive' },
      isActive: true
    },
    select: { specialty: true, city: true }
  });

  if (!sampleJob) {
    return null; // Specialty not found in this city
  }

  const actualSpecialtyName = sampleJob.specialty;
  const actualCityName = sampleJob.city;

  const where = {
    state: stateUpper,
    city: {
      equals: actualCityName,
      mode: 'insensitive'
    },
    specialty: {
      equals: actualSpecialtyName,
      mode: 'insensitive'
    },
    isActive: true
  };

  const [rawJobs, total] = await Promise.all([
    prisma.nursingJob.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      skip,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Generate statistics for this city + specialty
  const [employers, otherSpecialties] = await Promise.all([
    // Top employers for this specialty in this city
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: {
        state: stateUpper,
        city: { equals: actualCityName, mode: 'insensitive' },
        specialty: { equals: actualSpecialtyName, mode: 'insensitive' },
        isActive: true
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    // Other specialties available in this city (excluding current specialty)
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: {
        state: stateUpper,
        city: { equals: actualCityName, mode: 'insensitive' },
        specialty: { not: actualSpecialtyName }, // Prisma doesn't support mode inside 'not'
        isActive: true
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
      // No limit - show ALL specialties available in this city for better internal linking
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });

  const employersWithDetails = employers.map(emp => ({
    count: emp._count.id,
    employer: employerDetails.find(e => e.id === emp.employerId)
  }));

  const totalPages = Math.ceil(total / limitNum);

  return {
    specialty: actualSpecialtyName,
    stateCode: stateUpper,
    city: actualCityName,
    jobs: JSON.parse(JSON.stringify(jobs)),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    statistics: {
      employers: employersWithDetails,
      otherSpecialties: otherSpecialties.map(s => ({ specialty: s.specialty, count: s._count.id }))
    }
  };
}

/**
 * Fetch specialty salary stats nationwide (no state filter)
 */
async function fetchSpecialtySalaryStats(specialtySlug) {
  // Convert specialty slug to actual specialty name
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!actualSpecialtyName) {
    return null; // Invalid specialty
  }

  const where = {
    specialty: actualSpecialtyName,
    isActive: true,
    // Exclude leadership but allow NULL values to avoid over-filtering
    OR: [
      { experienceLevel: { not: 'Leadership' } },
      { experienceLevel: null }
    ],
    AND: [
      {
        OR: [
          { salaryMinHourly: { not: null } },
          { salaryMaxHourly: { not: null } }
        ]
      }
    ]
  };

  // Fetch jobs with salary data
  const jobs = await prisma.nursingJob.findMany({
    where,
    select: {
      salaryMinHourly: true,
      salaryMaxHourly: true,
      salaryMinAnnual: true,
      salaryMaxAnnual: true,
      specialty: true,
      state: true,
      employerId: true,
      employer: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  // Calculate salary statistics
  const salaryStats = calculateSalaryStats(jobs);

  // Get all states with this specialty for browse navigation
  const allStates = await prisma.nursingJob.groupBy({
    by: ['state'],
    where: {
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  // Get top employers for this specialty
  const topEmployers = await prisma.nursingJob.groupBy({
    by: ['employerId'],
    where: {
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  // Fetch employer details
  const employerIds = topEmployers.map(e => e.employerId).filter(Boolean);
  const employers = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });

  const employerMap = new Map(employers.map(e => [e.id, e]));

  return {
    salaryStats,
    specialty: actualSpecialtyName,
    allStates: allStates.map(s => ({
      state: s.state,
      stateFullName: getStateFullName(s.state),
      count: s._count.id
    })),
    topEmployers: topEmployers
      .filter(e => e.employerId && employerMap.has(e.employerId))
      .map(e => ({
        ...employerMap.get(e.employerId),
        count: e._count.id
      }))
  };
}

async function fetchStateSpecialtySalaryStats(stateCode, specialtySlug) {
  const stateUpper = stateCode.toUpperCase();
  
  // Convert specialty slug to actual specialty name
  const actualSpecialtyName = slugToSpecialty(specialtySlug);
  
  if (!actualSpecialtyName) {
    return null; // Invalid specialty
  }

  const where = {
    state: stateUpper,
    specialty: actualSpecialtyName,
    isActive: true,
    // Exclude leadership but allow NULL values to avoid over-filtering
    OR: [
      { experienceLevel: { not: 'Leadership' } },
      { experienceLevel: null }
    ],
    AND: [
      {
        OR: [
          { salaryMinHourly: { not: null } },
          { salaryMaxHourly: { not: null } }
        ]
      }
    ]
  };

  // Fetch jobs with salary data and related employer info
  const jobs = await prisma.nursingJob.findMany({
    where,
    select: {
      salaryMinHourly: true,
      salaryMaxHourly: true,
      salaryMinAnnual: true,
      salaryMaxAnnual: true,
      specialty: true,
      employerId: true,
      employer: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  // Calculate salary statistics
  const salaryStats = calculateSalaryStats(jobs);

  // Get all cities in state with this specialty for browse navigation
  const cities = await prisma.nursingJob.groupBy({
    by: ['city'],
    where: {
      state: stateUpper,
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  // Get all states with this specialty for browse navigation
  const allStates = await prisma.nursingJob.groupBy({
    by: ['state'],
    where: {
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: { state: 'asc' }
  });

  return {
    salaryStats,
    specialty: actualSpecialtyName,
    cities: cities.map(c => ({ city: c.city, count: c._count.id })),
    allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
  };
}

/**
 * Fetch salary statistics for a city + specialty
 */
async function fetchCitySpecialtySalaryStats(stateCode, citySlug, specialtySlug) {
  const stateUpper = stateCode.toUpperCase();
  
  // Convert specialty slug to actual specialty name
  const actualSpecialtyName = slugToSpecialty(specialtySlug);
  
  if (!actualSpecialtyName) {
    return null; // Invalid specialty
  }

  // Find actual city name from jobs (city slug might be partial match)
  const sampleJob = await prisma.nursingJob.findFirst({
    where: {
      state: stateUpper,
      city: {
        contains: citySlug.replace(/-/g, ' '),
        mode: 'insensitive'
      },
      specialty: actualSpecialtyName,
      isActive: true
    },
    select: { city: true }
  });

  if (!sampleJob) {
    return null; // City + specialty combination not found
  }

  const actualCityName = sampleJob.city;

  const where = {
    state: stateUpper,
    city: {
      contains: actualCityName,
      mode: 'insensitive'
    },
    specialty: actualSpecialtyName,
    isActive: true,
    // Exclude leadership but allow NULL values to avoid over-filtering
    OR: [
      { experienceLevel: { not: 'Leadership' } },
      { experienceLevel: null }
    ],
    AND: [
      {
        OR: [
          { salaryMinHourly: { not: null } },
          { salaryMaxHourly: { not: null } }
        ]
      }
    ]
  };

  // Fetch jobs with salary data and related employer info
  const jobs = await prisma.nursingJob.findMany({
    where,
    select: {
      salaryMinHourly: true,
      salaryMaxHourly: true,
      salaryMinAnnual: true,
      salaryMaxAnnual: true,
      specialty: true,
      employerId: true,
      employer: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  // Calculate salary statistics
  const salaryStats = calculateSalaryStats(jobs);

  // Get all cities in state with this specialty for browse navigation
  const cities = await prisma.nursingJob.groupBy({
    by: ['city'],
    where: {
      state: stateUpper,
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: { city: 'asc' }
  });

  // Get all states with this specialty for browse navigation
  const allStates = await prisma.nursingJob.groupBy({
    by: ['state'],
    where: {
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: { state: 'asc' }
  });

  return {
    salaryStats,
    city: actualCityName,
    specialty: actualSpecialtyName,
    cities: cities.map(c => ({ city: c.city, count: c._count.id })),
    allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
  };
}

/**
 * Fetch jobs for a specific employer + specialty combination
 * Example: All ICU jobs at Cleveland Clinic
 */
async function fetchEmployerSpecialtyJobs(employerSlug, specialtySlug, page = 1, limit = 20) {
  const actualSpecialtyName = slugToSpecialty(specialtySlug);
  
  if (!actualSpecialtyName) {
    return null; // Invalid specialty slug
  }

  // Find the employer
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug }
  });

  if (!employer) {
    return null; // Employer not found
  }

  const offset = (page - 1) * limit;

  // Fetch jobs for this employer + specialty
  const [jobs, totalCount] = await Promise.all([
    prisma.nursingJob.findMany({
      where: {
        employerId: employer.id,
        specialty: actualSpecialtyName,
        isActive: true
      },
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        postedDate: 'desc'
      },
      skip: offset,
      take: limit
    }),
    prisma.nursingJob.count({
      where: {
        employerId: employer.id,
        specialty: actualSpecialtyName,
        isActive: true
      }
    })
  ]);

  // Get other specialties at this employer
  const otherSpecialties = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: {
      employerId: employer.id,
      specialty: { not: actualSpecialtyName },
      isActive: true
    },
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    }
  });

  // Get states where this employer has jobs for this specialty
  const states = await prisma.nursingJob.groupBy({
    by: ['state'],
    where: {
      employerId: employer.id,
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: {
      state: 'asc'
    }
  });

  // Get cities where this employer has jobs for this specialty
  const cities = await prisma.nursingJob.groupBy({
    by: ['city', 'state'],
    where: {
      employerId: employer.id,
      specialty: actualSpecialtyName,
      isActive: true
    },
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    }
  });

  // Get job types at this employer for this specialty
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');
  const jobTypes = await prisma.nursingJob.groupBy({
    by: ['jobType'],
    where: {
      employerId: employer.id,
      specialty: actualSpecialtyName,
      jobType: { not: null },
      isActive: true
    },
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    }
  });

  // Normalize and merge job types (PRN + per-diem)
  const mergedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;

    if (!mergedJobTypes[normalized]) {
      mergedJobTypes[normalized] = {
        slug: normalized,
        displayName: jobTypeToDisplay(normalized),
        count: 0
      };
    }
    mergedJobTypes[normalized].count += jt._count.id;
  });

  // Get salary stats
  const salaryStats = await prisma.nursingJob.aggregate({
    where: {
      employerId: employer.id,
      specialty: actualSpecialtyName,
      isActive: true
    },
    _max: { salaryMaxHourly: true }
  });

  return {
    jobs,
    employer,
    specialty: actualSpecialtyName,
    totalJobs: totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      otherSpecialties: otherSpecialties.map(s => ({
        specialty: s.specialty,
        count: s._count.id
      })),
      jobTypes: Object.values(mergedJobTypes),
      states: states.map(s => ({
        state: s.state,
        count: s._count.id
      })),
      cities: cities.map(c => ({
        city: c.city,
        state: c.state,
        count: c._count.id
      }))
    }
  };
}

/**
 * Fetch jobs for a specific job type (general, nationwide)
 * Example: All Travel RN jobs, All PRN jobs
 */
async function fetchJobTypeJobs(jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');

  // Normalize job type slug (prn -> per-diem, etc.)
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);

  if (!jobTypeDisplay || !normalizedJobType) {
    return null;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Map each canonical slug to all DB variations that should match
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  const whereClause = { isActive: true };

  if (variations && variations.length > 1) {
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs for this job type
  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({
      where: whereClause
    })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics: states, specialties, employers, other job types, salary
  const [states, specialties, employers, allJobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { isActive: true, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Filter and merge other job types (exclude current type)
  const otherJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized || normalized === normalizedJobType) return;

    if (!otherJobTypes[normalized]) {
      otherJobTypes[normalized] = {
        slug: normalized,
        displayName: jobTypeToDisplay(normalized),
        count: 0
      };
    }
    otherJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: serializeDates(jobs),
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: states.map(s => ({
        state: s.state,
        stateFullName: getStateFullName(s.state),
        count: s._count.id
      })),
      specialties: specialties.map(s => ({
        specialty: s.specialty,
        count: s._count.id
      })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({
          ...employerMap.get(e.employerId),
          count: e._count.id
        })),
      otherJobTypes: Object.values(otherJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs for a specific employer + job type
 * Example: Cleveland Clinic + Travel
 */
async function fetchEmployerJobTypeJobs(employerSlug, jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');
  
  // Normalize job type slug (prn -> per-diem, etc.)
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);
  
  if (!jobTypeDisplay || !normalizedJobType) {
    return { jobs: [], totalJobs: 0, totalPages: 0, currentPage: page, employer: null, jobType: null, otherJobTypes: [] };
  }

  // Find the employer
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug }
  });

  if (!employer) {
    return { jobs: [], totalJobs: 0, totalPages: 0, currentPage: page, employer: null, jobType: jobTypeDisplay, otherJobTypes: [] };
  }

  const offset = (page - 1) * limit;

  // Build where clause - handle all job type variations (with/without hyphen)
  const whereClause = {
    employerId: employer.id,
    isActive: true
  };

  // Map each canonical slug to all DB variations that should match
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  if (variations && variations.length > 1) {
    // Multiple variations - use OR clause
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    // Single variation - simple equals
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    // Fallback for unknown job type
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs for this employer + job type
  const [jobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        postedDate: 'desc'
      },
      skip: offset,
      take: limit
    }),
    prisma.nursingJob.count({
      where: whereClause
    })
  ]);

  // Get other job types at this employer
  const otherJobTypes = await prisma.nursingJob.groupBy({
    by: ['jobType'],
    where: {
      employerId: employer.id,
      jobType: { not: null },
      isActive: true
    },
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    }
  });

  // Filter out current job type and normalize
  const filteredJobTypes = otherJobTypes
    .map(jt => {
      const normalized = jobTypeToSlug(jt.jobType);
      return { jobType: jt.jobType, normalizedSlug: normalized, count: jt._count.id };
    })
    .filter(jt => jt.normalizedSlug && jt.normalizedSlug !== normalizedJobType);

  // Merge counts for per-diem and prn
  const mergedJobTypes = {};
  filteredJobTypes.forEach(jt => {
    if (!mergedJobTypes[jt.normalizedSlug]) {
      mergedJobTypes[jt.normalizedSlug] = {
        slug: jt.normalizedSlug,
        displayName: jobTypeToDisplay(jt.normalizedSlug),
        count: 0
      };
    }
    mergedJobTypes[jt.normalizedSlug].count += jt.count;
  });

  // Get specialties at this employer for this job type
  const specialties = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: whereClause,
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    }
  });

  // Get ALL job types at this employer (for footer navigation)
  const allJobTypes = await prisma.nursingJob.groupBy({
    by: ['jobType'],
    where: {
      employerId: employer.id,
      jobType: { not: null },
      isActive: true
    },
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    }
  });

  // Normalize and merge all job types
  const mergedAllJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;

    if (!mergedAllJobTypes[normalized]) {
      mergedAllJobTypes[normalized] = {
        slug: normalized,
        displayName: jobTypeToDisplay(normalized),
        count: 0
      };
    }
    mergedAllJobTypes[normalized].count += jt._count.id;
  });

  // Get states and salary stats at this employer for this job type
  const [statesRaw, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' }
      }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);
  // Filter out null states after query (Prisma groupBy null handling)
  const states = statesRaw.filter(s => s.state);

  return {
    jobs,
    employer,
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limit),
    currentPage: page,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      otherJobTypes: Object.values(mergedJobTypes),
      jobTypes: Object.values(mergedAllJobTypes),
      specialties: specialties.filter(s => s.specialty).map(s => ({
        specialty: s.specialty,
        count: s._count.id
      })),
      states: states.map(s => ({
        state: s.state,
        count: s._count.id
      }))
    }
  };
}

/**
 * Fetch browse statistics for homepage hero
 * Used by getServerSideProps to eliminate CLS from client-side loading
 */
async function fetchBrowseStats() {
  // Get all states with job counts
  const states = await prisma.nursingJob.groupBy({
    by: ['state'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { state: 'asc' }
  });

  // Get top 20 employers with job counts
  const topEmployers = await prisma.nursingJob.groupBy({
    by: ['employerId'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20
  });

  // Get employer details
  const employerIds = topEmployers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Get all specialties with job counts
  const specialties = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: { isActive: true, specialty: { not: null } },
    _count: { id: true },
    orderBy: { specialty: 'asc' }
  });

  // Get all job types with counts
  const jobTypes = await prisma.nursingJob.groupBy({
    by: ['jobType'],
    where: { isActive: true, jobType: { not: null } },
    _count: { id: true },
    orderBy: { jobType: 'asc' }
  });

  // Format states with full names
  const statesFormatted = states.map(s => ({
    code: s.state,
    fullName: getStateFullName(s.state) || s.state,
    count: s._count.id,
    slug: s.state.toLowerCase()
  }));

  // Format employers
  const employersFormatted = topEmployers
    .map(e => {
      const employer = employerMap.get(e.employerId);
      if (!employer) return null;
      return {
        name: employer.name,
        slug: employer.slug,
        count: e._count.id
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count);

  // Format specialties with proper capitalization
  const nursingAcronyms = ['ICU', 'NICU', 'ER', 'OR', 'PACU', 'PCU', 'CCU', 'CVICU', 'MICU', 'SICU', 'PICU'];
  const specialtiesMap = new Map();

  specialties.forEach(s => {
    const specialtyValue = s.specialty;

    if (specialtyValue && specialtyValue.toLowerCase() === 'all specialties') {
      const displayName = 'General Nursing';
      if (specialtiesMap.has(displayName)) {
        specialtiesMap.get(displayName).count += s._count.id;
      } else {
        specialtiesMap.set(displayName, {
          name: displayName,
          count: s._count.id,
          slug: displayName.toLowerCase().replace(/\s+/g, '-')
        });
      }
      return;
    }

    const normalizedValue = specialtyValue.replace(/-/g, ' ');
    const displayName = normalizedValue
      .split(' ')
      .map(word => {
        const upperWord = word.toUpperCase();
        if (nursingAcronyms.includes(upperWord)) return upperWord;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    if (specialtiesMap.has(displayName)) {
      specialtiesMap.get(displayName).count += s._count.id;
    } else {
      specialtiesMap.set(displayName, {
        name: displayName,
        count: s._count.id,
        slug: displayName.toLowerCase().replace(/\s+/g, '-')
      });
    }
  });
  const specialtiesFormatted = Array.from(specialtiesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Format job types with proper capitalization
  const jobTypesMap = new Map();
  jobTypes.forEach(jt => {
    const jobTypeValue = jt.jobType;
    let displayName = jobTypeValue;
    if (jobTypeValue.toLowerCase() === 'prn' || jobTypeValue.toLowerCase() === 'per diem') {
      displayName = 'PRN';
    } else {
      const normalizedValue = jobTypeValue.replace(/-/g, ' ');
      displayName = normalizedValue.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }

    if (jobTypesMap.has(displayName)) {
      jobTypesMap.get(displayName).count += jt._count.id;
    } else {
      jobTypesMap.set(displayName, {
        name: displayName,
        count: jt._count.id,
        slug: displayName.toLowerCase().replace(/\s+/g, '-')
      });
    }
  });
  const jobTypesFormatted = Array.from(jobTypesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    states: statesFormatted,
    employers: employersFormatted,
    specialties: specialtiesFormatted,
    jobTypes: jobTypesFormatted
  };
}

/**
 * Fetch jobs for a specific state + job type combination
 * Example: Ohio + Travel → All Travel RN jobs in Ohio
 */
async function fetchStateJobTypeJobs(stateCode, jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');
  const stateUpper = stateCode.toUpperCase();

  // Normalize job type slug
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);

  if (!jobTypeDisplay || !normalizedJobType) {
    return null;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Map each canonical slug to all DB variations
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  const whereClause = { state: stateUpper, isActive: true };

  if (variations && variations.length > 1) {
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs
  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics: cities, specialties, employers, other job types, salary
  const [cities, specialties, employers, allJobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { state: stateUpper, isActive: true, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Filter and merge other job types
  const otherJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized || normalized === normalizedJobType) return;

    if (!otherJobTypes[normalized]) {
      otherJobTypes[normalized] = {
        slug: normalized,
        displayName: jobTypeToDisplay(normalized),
        count: 0
      };
    }
    otherJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: serializeDates(jobs),
    stateCode: stateUpper,
    stateFullName: getStateFullName(stateUpper),
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: cities.map(c => ({
        city: c.city,
        count: c._count.id
      })),
      specialties: specialties.map(s => ({
        specialty: s.specialty,
        count: s._count.id
      })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({
          ...employerMap.get(e.employerId),
          count: e._count.id
        })),
      otherJobTypes: Object.values(otherJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs for a specific city + job type combination
 * Example: Cleveland, OH + Travel → All Travel RN jobs in Cleveland
 */
async function fetchCityJobTypeJobs(stateCode, citySlug, jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');
  const stateUpper = stateCode.toUpperCase();

  // Normalize job type slug
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);

  if (!jobTypeDisplay || !normalizedJobType) {
    return null;
  }

  // Normalize city name
  const cityPattern = citySlug
    .toLowerCase()
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Map each canonical slug to all DB variations
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  const baseWhere = {
    state: stateUpper,
    city: { contains: cityPattern, mode: 'insensitive' },
    isActive: true
  };

  const whereClause = { ...baseWhere };
  if (variations && variations.length > 1) {
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs
  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const actualCityName = rawJobs.length > 0 ? rawJobs[0].city : cityPattern;

  // Get statistics: specialties, employers, other job types, salary
  const [specialties, employers, allJobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...baseWhere, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Filter and merge other job types
  const otherJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized || normalized === normalizedJobType) return;

    if (!otherJobTypes[normalized]) {
      otherJobTypes[normalized] = {
        slug: normalized,
        displayName: jobTypeToDisplay(normalized),
        count: 0
      };
    }
    otherJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: serializeDates(jobs),
    city: actualCityName,
    stateCode: stateUpper,
    stateFullName: getStateFullName(stateUpper),
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      specialties: specialties.map(s => ({
        specialty: s.specialty,
        count: s._count.id
      })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({
          ...employerMap.get(e.employerId),
          count: e._count.id
        })),
      otherJobTypes: Object.values(otherJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs for a specific specialty + job type combination
 * Example: ICU + Travel → All Travel ICU RN jobs nationwide
 */
async function fetchSpecialtyJobTypeJobs(specialtySlug, jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');
  const { slugToSpecialty } = require('../constants/specialties');

  // Normalize job type slug
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);

  if (!jobTypeDisplay || !normalizedJobType) {
    return null;
  }

  // Convert specialty slug to actual name
  const actualSpecialtyName = slugToSpecialty(specialtySlug);
  if (!actualSpecialtyName) {
    return null;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Map each canonical slug to all DB variations
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  const baseWhere = {
    specialty: actualSpecialtyName,
    isActive: true
  };

  const whereClause = { ...baseWhere };
  if (variations && variations.length > 1) {
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs
  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics: states, employers, other job types, salary
  const [states, employers, allJobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...baseWhere, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Filter and merge other job types
  const otherJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized || normalized === normalizedJobType) return;

    if (!otherJobTypes[normalized]) {
      otherJobTypes[normalized] = {
        slug: normalized,
        displayName: jobTypeToDisplay(normalized),
        count: 0
      };
    }
    otherJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: serializeDates(jobs),
    specialty: actualSpecialtyName,
    specialtySlug,
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: states.map(s => ({
        state: s.state,
        stateFullName: getStateFullName(s.state),
        count: s._count.id
      })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({
          ...employerMap.get(e.employerId),
          count: e._count.id
        })),
      otherJobTypes: Object.values(otherJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs for a state + specialty + job type combination
 * Example: Full-Time ICU RN Jobs in Florida
 */
async function fetchStateSpecialtyJobTypeJobs(stateCode, specialtySlug, jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');

  // Normalize inputs
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!jobTypeDisplay || !normalizedJobType || !actualSpecialtyName) {
    return null;
  }

  const stateFullName = getStateFullName(stateCode);
  if (!stateFullName) {
    return null;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Job type variations for matching
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  const baseWhere = {
    state: stateCode.toUpperCase(),
    specialty: actualSpecialtyName,
    isActive: true
  };

  const whereClause = { ...baseWhere };
  if (variations && variations.length > 1) {
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs and count
  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics: cities, employers, other job types, other specialties, salary
  const [cities, employers, allJobTypes, allSpecialties, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { state: stateCode.toUpperCase(), specialty: actualSpecialtyName, isActive: true, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { state: stateCode.toUpperCase(), isActive: true, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = employerIds.length > 0 ? await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  }) : [];
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Filter and merge other job types (exclude current)
  const otherJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized || normalized === normalizedJobType) return;
    if (!otherJobTypes[normalized]) {
      otherJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    otherJobTypes[normalized].count += jt._count.id;
  });

  // Filter other specialties (exclude current)
  const otherSpecialties = allSpecialties
    .filter(s => s.specialty && s.specialty !== actualSpecialtyName)
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  return {
    jobs: serializeDates(jobs),
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    specialty: actualSpecialtyName,
    specialtySlug,
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: cities.filter(c => c.city).map(c => ({ city: c.city, count: c._count.id })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({ ...employerMap.get(e.employerId), count: e._count.id })),
      otherJobTypes: Object.values(otherJobTypes).sort((a, b) => b.count - a.count),
      otherSpecialties: otherSpecialties.slice(0, 10)
    }
  };
}

/**
 * Fetch jobs for a city + specialty + job type combination
 * Example: Full-Time ICU RN Jobs in Miami, FL
 */
async function fetchCitySpecialtyJobTypeJobs(stateCode, citySlug, specialtySlug, jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');

  // Normalize inputs
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!jobTypeDisplay || !normalizedJobType || !actualSpecialtyName) {
    return null;
  }

  const stateFullName = getStateFullName(stateCode);
  if (!stateFullName) {
    return null;
  }

  // Convert city slug to actual city name
  const cityName = normalizeCity(citySlug.replace(/-/g, ' '));

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Job type variations
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  const baseWhere = {
    state: stateCode.toUpperCase(),
    city: { equals: cityName, mode: 'insensitive' },
    specialty: actualSpecialtyName,
    isActive: true
  };

  const whereClause = { ...baseWhere };
  if (variations && variations.length > 1) {
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs and count
  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get the actual city name from first job result if available
  const actualCityName = rawJobs.length > 0 ? rawJobs[0].city : cityName;

  // Get statistics: employers, other job types, other specialties
  const cityWhere = { state: stateCode.toUpperCase(), city: { equals: actualCityName, mode: 'insensitive' }, isActive: true };

  const [employers, allJobTypes, allSpecialties, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...cityWhere, specialty: actualSpecialtyName, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...cityWhere, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = employerIds.length > 0 ? await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  }) : [];
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Filter other job types
  const otherJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized || normalized === normalizedJobType) return;
    if (!otherJobTypes[normalized]) {
      otherJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    otherJobTypes[normalized].count += jt._count.id;
  });

  // Filter other specialties
  const otherSpecialties = allSpecialties
    .filter(s => s.specialty && s.specialty !== actualSpecialtyName)
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  return {
    jobs: serializeDates(jobs),
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    city: actualCityName,
    citySlug,
    specialty: actualSpecialtyName,
    specialtySlug,
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({ ...employerMap.get(e.employerId), count: e._count.id })),
      otherJobTypes: Object.values(otherJobTypes).sort((a, b) => b.count - a.count),
      otherSpecialties: otherSpecialties.slice(0, 10)
    }
  };
}

/**
 * Fetch jobs for an employer + specialty + job type combination
 * Example: Full-Time ICU RN Jobs at HCA Healthcare
 */
async function fetchEmployerSpecialtyJobTypeJobs(employerSlug, specialtySlug, jobTypeSlug, page = 1, limit = 20) {
  const { jobTypeToDisplay, jobTypeToSlug } = require('../constants/jobTypes');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');

  // Normalize inputs
  const normalizedJobType = jobTypeToSlug(jobTypeSlug);
  const jobTypeDisplay = jobTypeToDisplay(jobTypeSlug);
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!jobTypeDisplay || !normalizedJobType || !actualSpecialtyName) {
    return null;
  }

  // Find employer
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug }
  });

  if (!employer) {
    return null;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Job type variations
  const jobTypeVariations = {
    'per-diem': ['per-diem', 'per diem', 'prn'],
    'full-time': ['full-time', 'full time'],
    'part-time': ['part-time', 'part time'],
    'travel': ['travel'],
    'contract': ['contract']
  };

  const variations = jobTypeVariations[normalizedJobType];
  const baseWhere = {
    employerId: employer.id,
    specialty: actualSpecialtyName,
    isActive: true
  };

  const whereClause = { ...baseWhere };
  if (variations && variations.length > 1) {
    whereClause.OR = variations.map(v => ({
      jobType: { equals: v, mode: 'insensitive' }
    }));
  } else if (variations) {
    whereClause.jobType = { equals: variations[0], mode: 'insensitive' };
  } else {
    whereClause.jobType = { equals: normalizedJobType, mode: 'insensitive' };
  }

  // Fetch jobs and count
  const [jobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: limitNum
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Get statistics: states, cities, other job types, other specialties
  const employerWhere = { employerId: employer.id, isActive: true };

  const [statesRaw, cities, allJobTypes, allSpecialties, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...employerWhere, specialty: actualSpecialtyName, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...employerWhere, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Filter out null states
  const states = statesRaw.filter(s => s.state);

  // Filter other job types
  const otherJobTypes = {};
  allJobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized || normalized === normalizedJobType) return;
    if (!otherJobTypes[normalized]) {
      otherJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    otherJobTypes[normalized].count += jt._count.id;
  });

  // Filter other specialties
  const otherSpecialties = allSpecialties
    .filter(s => s.specialty && s.specialty !== actualSpecialtyName)
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  return {
    jobs: serializeDates(jobs),
    employer,
    specialty: actualSpecialtyName,
    specialtySlug,
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: states.map(s => ({ state: s.state, stateFullName: getStateFullName(s.state), count: s._count.id })),
      cities: cities.filter(c => c.city).map(c => ({ city: c.city, state: c.state, count: c._count.id })),
      otherJobTypes: Object.values(otherJobTypes).sort((a, b) => b.count - a.count),
      otherSpecialties: otherSpecialties.slice(0, 10)
    }
  };
}

/**
 * Fetch jobs for a specific experience level (nationwide)
 * @param {string} levelSlug - Experience level slug (new-grad, experienced, leadership)
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 */
async function fetchExperienceLevelJobs(levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  // Validate and normalize the experience level slug
  if (!isExperienceLevel(levelSlug)) {
    return null;
  }

  const normalizedSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedSlug);
  const dbValue = slugToExperienceLevel(normalizedSlug);

  if (!levelDisplay || !dbValue) {
    return null;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause for this experience level
  const whereClause = {
    isActive: true,
    experienceLevel: { equals: dbValue, mode: 'insensitive' }
  };

  // Fetch jobs and count
  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [states, specialties, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format job types
  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Get counts for all experience levels (for footer navigation)
  const allExperienceLevelCounts = await prisma.nursingJob.groupBy({
    by: ['experienceLevel'],
    where: { isActive: true, experienceLevel: { not: null } },
    _count: { id: true }
  });

  // Map counts to experience levels
  const experienceLevelCountMap = new Map();
  allExperienceLevelCounts.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  // Get other experience levels with counts
  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedSlug)
    .map(l => ({
      ...l,
      count: experienceLevelCountMap.get(l.slug) || 0
    }))
    .filter(l => l.count > 0);

  return {
    jobs: serializeDates(jobs),
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: states.filter(s => s.state).map(s => ({
        state: s.state,
        stateFullName: getStateFullName(s.state),
        count: s._count.id
      })),
      specialties: specialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({ ...employerMap.get(e.employerId), count: e._count.id })),
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels
    }
  };
}

/**
 * Fetch jobs for a specific state + experience level
 */
async function fetchStateExperienceLevelJobs(stateCode, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedSlug);
  const dbValue = slugToExperienceLevel(normalizedSlug);
  const stateUpper = stateCode.toUpperCase();
  const stateFullName = getStateFullName(stateUpper);

  if (!levelDisplay || !dbValue || !stateFullName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateUpper,
    experienceLevel: { equals: dbValue, mode: 'insensitive' }
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [cities, specialties, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Get counts for all experience levels in this state
  const allExperienceLevelCounts = await prisma.nursingJob.groupBy({
    by: ['experienceLevel'],
    where: { isActive: true, state: stateUpper, experienceLevel: { not: null } },
    _count: { id: true }
  });

  const experienceLevelCountMap = new Map();
  allExperienceLevelCounts.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedSlug)
    .map(l => ({ ...l, count: experienceLevelCountMap.get(l.slug) || 0 }))
    .filter(l => l.count > 0);

  return {
    jobs: serializeDates(jobs),
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedSlug,
    stateCode: stateUpper,
    stateFullName,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: cities.filter(c => c.city).map(c => ({ city: c.city, count: c._count.id })),
      specialties: specialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({ ...employerMap.get(e.employerId), count: e._count.id })),
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels
    }
  };
}

/**
 * Fetch jobs for a specific city + experience level
 */
async function fetchCityExperienceLevelJobs(stateCode, citySlug, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedSlug);
  const dbValue = slugToExperienceLevel(normalizedSlug);
  const stateUpper = stateCode.toUpperCase();
  const stateFullName = getStateFullName(stateUpper);

  if (!levelDisplay || !dbValue || !stateFullName) return null;

  // Find actual city name from slug
  const cityMatch = await prisma.nursingJob.findFirst({
    where: {
      state: stateUpper,
      isActive: true
    },
    select: { city: true }
  });

  // Try to find the city by matching the slug
  const allCitiesRaw = await prisma.nursingJob.groupBy({
    by: ['city'],
    where: { state: stateUpper, isActive: true },
    _count: { id: true }
  });

  // Filter out null cities in JavaScript (Prisma 6 has stricter null handling)
  const allCities = allCitiesRaw.filter(c => c.city != null);

  const cityData = allCities.find(c => c.city && c.city.toLowerCase().replace(/\s+/g, '-') === citySlug.toLowerCase());
  if (!cityData) return null;

  const cityName = cityData.city;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateUpper,
    city: cityName,
    experienceLevel: { equals: dbValue, mode: 'insensitive' }
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [specialties, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Get counts for all experience levels in this city
  const allExperienceLevelCounts = await prisma.nursingJob.groupBy({
    by: ['experienceLevel'],
    where: { isActive: true, state: stateUpper, city: { equals: cityName, mode: 'insensitive' }, experienceLevel: { not: null } },
    _count: { id: true }
  });

  const experienceLevelCountMap = new Map();
  allExperienceLevelCounts.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedSlug)
    .map(l => ({ ...l, count: experienceLevelCountMap.get(l.slug) || 0 }))
    .filter(l => l.count > 0);

  return {
    jobs: serializeDates(jobs),
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedSlug,
    stateCode: stateUpper,
    stateFullName,
    city: cityName,
    citySlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      specialties: specialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({ ...employerMap.get(e.employerId), count: e._count.id })),
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels
    }
  };
}

/**
 * Fetch jobs for a specific specialty + experience level (nationwide)
 */
async function fetchSpecialtyExperienceLevelJobs(specialtySlug, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');
  const { normalizeSpecialty, slugToSpecialty, SPECIALTIES } = require('../constants/specialties');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedLevelSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedLevelSlug);
  const dbLevelValue = slugToExperienceLevel(normalizedLevelSlug);

  // Find the specialty from the slug
  const specialtyName = slugToSpecialty(specialtySlug);
  if (!specialtyName || !levelDisplay || !dbLevelValue) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    specialty: { equals: specialtyName, mode: 'insensitive' },
    experienceLevel: { equals: dbLevelValue, mode: 'insensitive' }
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Interleave jobs for employer variety
  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [states, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Get counts for all experience levels in this specialty
  const allExperienceLevelCounts = await prisma.nursingJob.groupBy({
    by: ['experienceLevel'],
    where: { isActive: true, specialty: { equals: specialtyName, mode: 'insensitive' }, experienceLevel: { not: null } },
    _count: { id: true }
  });

  const experienceLevelCountMap = new Map();
  allExperienceLevelCounts.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedLevelSlug)
    .map(l => ({ ...l, count: experienceLevelCountMap.get(l.slug) || 0 }))
    .filter(l => l.count > 0);

  return {
    jobs: serializeDates(jobs),
    specialty: specialtyName,
    specialtySlug,
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedLevelSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: states.filter(s => s.state).map(s => ({
        state: s.state,
        stateFullName: getStateFullName(s.state),
        count: s._count.id
      })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({ ...employerMap.get(e.employerId), count: e._count.id })),
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels
    }
  };
}

/**
 * Fetch jobs for a state + specialty + experience level combination
 * Example: New Grad ICU RN Jobs in Ohio
 */
async function fetchStateSpecialtyExperienceLevelJobs(stateCode, specialtySlug, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedLevelSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedLevelSlug);
  const dbLevelValue = slugToExperienceLevel(normalizedLevelSlug);

  const specialtyName = slugToSpecialty(specialtySlug);
  const stateFullName = getStateFullName(stateCode);

  if (!specialtyName || !levelDisplay || !dbLevelValue || !stateFullName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateCode.toUpperCase(),
    specialty: { equals: specialtyName, mode: 'insensitive' },
    experienceLevel: { equals: dbLevelValue, mode: 'insensitive' }
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [cities, employers, jobTypes, allExperienceLevels, otherSpecialties, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['experienceLevel'],
      where: { isActive: true, state: stateCode.toUpperCase(), specialty: { equals: specialtyName, mode: 'insensitive' }, experienceLevel: { not: null } },
      _count: { id: true }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { isActive: true, state: stateCode.toUpperCase(), specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = employerIds.length > 0 ? await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  }) : [];
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const experienceLevelCountMap = new Map();
  allExperienceLevels.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedLevelSlug)
    .map(l => ({ ...l, count: experienceLevelCountMap.get(l.slug) || 0 }))
    .filter(l => l.count > 0);

  const formattedOtherSpecialties = otherSpecialties
    .filter(s => s.specialty && s.specialty !== specialtyName)
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }))
    .slice(0, 10);

  return {
    jobs: serializeDates(jobs),
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    specialty: specialtyName,
    specialtySlug,
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedLevelSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: cities.filter(c => c.city).map(c => ({ city: c.city, count: c._count.id })),
      employers: employers
        .filter(e => e.employerId && employerMap.has(e.employerId))
        .map(e => ({ ...employerMap.get(e.employerId), count: e._count.id })),
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels,
      otherSpecialties: formattedOtherSpecialties
    }
  };
}

/**
 * Fetch jobs for a specific employer + experience level
 */
async function fetchEmployerExperienceLevelJobs(employerSlug, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');
  const { specialtyToSlug } = require('../constants/specialties');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedLevelSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedLevelSlug);
  const dbLevelValue = slugToExperienceLevel(normalizedLevelSlug);

  if (!levelDisplay || !dbLevelValue) return null;

  // Find employer
  const employer = await prisma.healthcareEmployer.findFirst({
    where: { slug: employerSlug }
  });

  if (!employer) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    employerId: employer.id,
    experienceLevel: { equals: dbLevelValue, mode: 'insensitive' }
  };

  const [jobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: limitNum
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const [states, cities, specialties, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Get counts for all experience levels at this employer
  const allExperienceLevelCounts = await prisma.nursingJob.groupBy({
    by: ['experienceLevel'],
    where: { isActive: true, employerId: employer.id, experienceLevel: { not: null } },
    _count: { id: true }
  });

  const experienceLevelCountMap = new Map();
  allExperienceLevelCounts.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedLevelSlug)
    .map(l => ({ ...l, count: experienceLevelCountMap.get(l.slug) || 0 }))
    .filter(l => l.count > 0);

  return {
    jobs: serializeDates(jobs),
    employer: { id: employer.id, name: employer.name, slug: employer.slug },
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedLevelSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: states.filter(s => s.state).map(s => ({
        state: s.state,
        stateFullName: getStateFullName(s.state),
        count: s._count.id
      })),
      cities: cities.filter(c => c.city).map(c => ({ city: c.city, state: c.state, count: c._count.id })),
      specialties: specialties.map(s => ({
        specialty: s.specialty,
        slug: specialtyToSlug(s.specialty),
        count: s._count.id
      })),
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels
    }
  };
}

/**
 * Fetch employer + specialty + experience level jobs
 * Example: /jobs/nursing/employer/cleveland-clinic/icu/experience/new-grad
 */
async function fetchEmployerSpecialtyExperienceLevelJobs(employerSlug, specialtySlug, levelSlug, page = 1, limit = 20) {
  const { isValidSpecialtySlug, slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isValidSpecialtySlug(specialtySlug)) return null;
  if (!isExperienceLevel(levelSlug)) return null;

  const specialty = slugToSpecialty(specialtySlug);
  if (!specialty) return null;

  const normalizedLevelSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedLevelSlug);
  const dbLevelValue = slugToExperienceLevel(normalizedLevelSlug);
  if (!levelDisplay || !dbLevelValue) return null;

  const employer = await prisma.healthcareEmployer.findFirst({
    where: { slug: employerSlug }
  });
  if (!employer) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    employerId: employer.id,
    specialty: { equals: specialty, mode: 'insensitive' },
    experienceLevel: { equals: dbLevelValue, mode: 'insensitive' }
  };

  const [jobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: limitNum
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const [states, cities, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Other experience levels for this employer+specialty
  const allExperienceLevelCounts = await prisma.nursingJob.groupBy({
    by: ['experienceLevel'],
    where: { isActive: true, employerId: employer.id, specialty: { equals: specialty, mode: 'insensitive' }, experienceLevel: { not: null } },
    _count: { id: true }
  });

  const experienceLevelCountMap = new Map();
  allExperienceLevelCounts.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedLevelSlug)
    .map(l => ({ ...l, count: experienceLevelCountMap.get(l.slug) || 0 }))
    .filter(l => l.count > 0);

  // Other specialties for this employer+experience
  const otherSpecialtiesRaw = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: { isActive: true, employerId: employer.id, experienceLevel: { equals: dbLevelValue, mode: 'insensitive' }, specialty: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20
  });

  const otherSpecialties = otherSpecialtiesRaw
    .filter(s => s.specialty && s.specialty.toLowerCase() !== specialty.toLowerCase())
    .map(s => ({ specialty: s.specialty, slug: specialtyToSlug(s.specialty), count: s._count.id }));

  return {
    jobs: serializeDates(jobs),
    employer: { id: employer.id, name: employer.name, slug: employer.slug },
    specialty,
    specialtySlug,
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedLevelSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: states.filter(s => s.state).map(s => ({
        state: s.state,
        stateFullName: getStateFullName(s.state),
        count: s._count.id
      })),
      cities: cities.filter(c => c.city).map(c => ({ city: c.city, state: c.state, count: c._count.id })),
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels,
      otherSpecialties
    }
  };
}

/**
 * Fetch city + specialty + experience level jobs
 * Example: /jobs/nursing/oh/cleveland/specialty/icu/experience/new-grad
 */
async function fetchCitySpecialtyExperienceLevelJobs(stateCode, citySlug, specialtySlug, levelSlug, page = 1, limit = 20) {
  const { isValidSpecialtySlug, slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isValidSpecialtySlug(specialtySlug)) return null;
  if (!isExperienceLevel(levelSlug)) return null;

  const specialty = slugToSpecialty(specialtySlug);
  if (!specialty) return null;

  const normalizedLevelSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedLevelSlug);
  const dbLevelValue = slugToExperienceLevel(normalizedLevelSlug);
  if (!levelDisplay || !dbLevelValue) return null;

  const normalizedState = stateCode.toUpperCase();
  const cityName = citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const stateFullName = getStateFullName(normalizedState);

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: normalizedState,
    city: { equals: cityName, mode: 'insensitive' },
    specialty: { equals: specialty, mode: 'insensitive' },
    experienceLevel: { equals: dbLevelValue, mode: 'insensitive' }
  };

  const [jobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: limitNum
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  if (totalJobs === 0 && jobs.length === 0) {
    // Verify city exists
    const cityExists = await prisma.nursingJob.findFirst({
      where: { state: normalizedState, city: { equals: cityName, mode: 'insensitive' }, isActive: true }
    });
    if (!cityExists) return null;
  }

  const [employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: { ...whereClause, employerId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = employerIds.length > 0
    ? await prisma.healthcareEmployer.findMany({ where: { id: { in: employerIds } }, select: { id: true, name: true, slug: true } })
    : [];
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Other experience levels in this city+specialty
  const citySpecialtyWhere = { isActive: true, state: normalizedState, city: { equals: cityName, mode: 'insensitive' }, specialty: { equals: specialty, mode: 'insensitive' }, experienceLevel: { not: null } };
  const allExperienceLevelCounts = await prisma.nursingJob.groupBy({
    by: ['experienceLevel'],
    where: citySpecialtyWhere,
    _count: { id: true }
  });

  const experienceLevelCountMap = new Map();
  allExperienceLevelCounts.forEach(el => {
    const elSlug = experienceLevelToSlug(el.experienceLevel);
    if (elSlug) {
      const existing = experienceLevelCountMap.get(elSlug) || 0;
      experienceLevelCountMap.set(elSlug, existing + el._count.id);
    }
  });

  const allLevels = getAllExperienceLevels();
  const otherLevels = allLevels
    .filter(l => l.slug !== normalizedLevelSlug)
    .map(l => ({ ...l, count: experienceLevelCountMap.get(l.slug) || 0 }))
    .filter(l => l.count > 0);

  // Other specialties in this city+experience
  const otherSpecialtiesRaw = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: { isActive: true, state: normalizedState, city: { equals: cityName, mode: 'insensitive' }, experienceLevel: { equals: dbLevelValue, mode: 'insensitive' }, specialty: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20
  });

  const otherSpecialties = otherSpecialtiesRaw
    .filter(s => s.specialty && s.specialty.toLowerCase() !== specialty.toLowerCase())
    .map(s => ({ specialty: s.specialty, slug: specialtyToSlug(s.specialty), count: s._count.id }));

  return {
    jobs: serializeDates(jobs),
    stateCode: normalizedState,
    stateFullName,
    city: cityName,
    citySlug,
    specialty,
    specialtySlug,
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedLevelSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherExperienceLevels: otherLevels,
      otherSpecialties
    }
  };
}

/**
 * Fetch jobs filtered by shift type (nationwide)
 */
async function fetchShiftJobs(shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedSlug);
  const dbValues = slugToDbValues(normalizedSlug);

  if (!shiftDisplay || !dbValues) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause for shift type variations
  const whereClause = { isActive: true };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [states, specialties, employers, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { isActive: true, shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Fetch employer details
  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format states with full names
  const formattedStates = states
    .filter(s => s.state)
    .map(s => ({
      state: s.state,
      stateFullName: getStateFullName(s.state) || s.state,
      count: s._count.id
    }));

  // Format specialties
  const formattedSpecialties = specialties.map(s => ({
    specialty: s.specialty,
    slug: specialtyToSlug(s.specialty),
    count: s._count.id
  })).filter(s => s.slug);

  // Format employers
  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  // Format job types
  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  // Format other shifts (excluding current)
  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    shiftType: shiftDisplay,
    shiftSlug: normalizedSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs filtered by state + shift type
 */
async function fetchStateShiftJobs(stateCode, shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedSlug);
  const dbValues = slugToDbValues(normalizedSlug);
  const stateFullName = getStateFullName(stateCode);

  if (!shiftDisplay || !dbValues || !stateFullName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = { isActive: true, state: stateCode.toUpperCase() };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [cities, specialties, employers, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { isActive: true, state: stateCode.toUpperCase(), shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedCities = cities.filter(c => c.city).map(c => ({
    city: c.city,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedSpecialties = specialties.map(s => ({
    specialty: s.specialty,
    slug: specialtyToSlug(s.specialty),
    count: s._count.id
  })).filter(s => s.slug);

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    shiftType: shiftDisplay,
    shiftSlug: normalizedSlug,
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: formattedCities,
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs filtered by city + shift type
 */
async function fetchCityShiftJobs(stateCode, citySlug, shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedSlug);
  const dbValues = slugToDbValues(normalizedSlug);
  const stateFullName = getStateFullName(stateCode);
  const cityName = citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (!shiftDisplay || !dbValues || !stateFullName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateCode.toUpperCase(),
    city: { equals: cityName, mode: 'insensitive' }
  };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // If no jobs and city doesn't exist, return null
  if (totalJobs === 0 && rawJobs.length === 0) {
    const cityExists = await prisma.nursingJob.findFirst({
      where: { state: stateCode.toUpperCase(), city: { equals: cityName, mode: 'insensitive' }, isActive: true }
    });
    if (!cityExists) return null;
  }

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);
  const actualCityName = rawJobs.length > 0 ? rawJobs[0].city : cityName;

  const [specialties, employers, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { isActive: true, state: stateCode.toUpperCase(), city: { equals: cityName, mode: 'insensitive' }, shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedSpecialties = specialties.map(s => ({
    specialty: s.specialty,
    slug: specialtyToSlug(s.specialty),
    count: s._count.id
  })).filter(s => s.slug);

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    shiftType: shiftDisplay,
    shiftSlug: normalizedSlug,
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    city: actualCityName,
    citySlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs filtered by specialty + shift type nationwide
 * Example: ICU Day Shift RN Jobs
 */
async function fetchSpecialtyShiftJobs(specialtySlug, shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedShiftSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedShiftSlug);
  const dbValues = slugToDbValues(normalizedShiftSlug);
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!shiftDisplay || !dbValues || !actualSpecialtyName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause for specialty + shift
  const whereClause = {
    isActive: true,
    specialty: actualSpecialtyName
  };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [states, cities, employers, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { isActive: true, specialty: actualSpecialtyName, shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedCities = cities.map(c => ({
    city: c.city,
    state: c.state,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedShiftSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    specialty: actualSpecialtyName,
    specialtySlug,
    shiftType: shiftDisplay,
    shiftSlug: normalizedShiftSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      cities: formattedCities,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs filtered by state + specialty + shift type
 * Example: ICU Day Shift RN Jobs in Ohio
 */
async function fetchStateSpecialtyShiftJobs(stateCode, specialtySlug, shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedShiftSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedShiftSlug);
  const dbValues = slugToDbValues(normalizedShiftSlug);
  const stateFullName = getStateFullName(stateCode);
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!shiftDisplay || !dbValues || !stateFullName || !actualSpecialtyName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateCode.toUpperCase(),
    specialty: actualSpecialtyName
  };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [cities, employers, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { isActive: true, state: stateCode.toUpperCase(), specialty: actualSpecialtyName, shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedCities = cities.map(c => ({
    city: c.city,
    state: c.state,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedShiftSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    specialty: actualSpecialtyName,
    specialtySlug,
    shiftType: shiftDisplay,
    shiftSlug: normalizedShiftSlug,
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: formattedCities,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs filtered by city + specialty + shift type
 * Example: ICU Day Shift RN Jobs in Cleveland, OH
 */
async function fetchCitySpecialtyShiftJobs(stateCode, citySlug, specialtySlug, shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedShiftSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedShiftSlug);
  const dbValues = slugToDbValues(normalizedShiftSlug);
  const stateFullName = getStateFullName(stateCode);
  const cityName = citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const actualSpecialtyName = slugToSpecialty(specialtySlug);

  if (!shiftDisplay || !dbValues || !stateFullName || !actualSpecialtyName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateCode.toUpperCase(),
    city: { equals: cityName, mode: 'insensitive' },
    specialty: actualSpecialtyName
  };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // If no jobs and city doesn't exist for this specialty, return null
  if (totalJobs === 0 && rawJobs.length === 0) {
    const cityExists = await prisma.nursingJob.findFirst({
      where: { state: stateCode.toUpperCase(), city: { equals: cityName, mode: 'insensitive' }, specialty: actualSpecialtyName, isActive: true }
    });
    if (!cityExists) return null;
  }

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);
  const actualCityName = rawJobs.length > 0 ? rawJobs[0].city : cityName;

  const [employers, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { isActive: true, state: stateCode.toUpperCase(), city: { equals: cityName, mode: 'insensitive' }, specialty: actualSpecialtyName, shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedShiftSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    specialty: actualSpecialtyName,
    specialtySlug,
    shiftType: shiftDisplay,
    shiftSlug: normalizedShiftSlug,
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    city: actualCityName,
    citySlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs filtered by employer + shift type
 * Example: Cleveland Clinic Day Shift RN Jobs
 */
async function fetchEmployerShiftJobs(employerSlug, shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedShiftSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedShiftSlug);
  const dbValues = slugToDbValues(normalizedShiftSlug);

  if (!shiftDisplay || !dbValues) return null;

  // Find the employer
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug }
  });

  if (!employer) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause for employer + shift
  const whereClause = {
    isActive: true,
    employerId: employer.id
  };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [states, cities, specialties, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { employerId: employer.id, isActive: true, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { employerId: employer.id, isActive: true, shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedCities = cities.map(c => ({
    city: c.city,
    state: c.state,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedSpecialties = specialties.map(s => ({
    specialty: s.specialty,
    slug: specialtyToSlug(s.specialty),
    count: s._count.id
  })).filter(s => s.slug);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedShiftSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    employer: { id: employer.id, name: employer.name, slug: employer.slug },
    shiftType: shiftDisplay,
    shiftSlug: normalizedShiftSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      cities: formattedCities,
      specialties: formattedSpecialties,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch jobs for employer + specialty + shift pages
 * e.g., "Cleveland Clinic ICU Day Shift RN Jobs"
 */
async function fetchEmployerSpecialtyShiftJobs(employerSlug, specialtySlugParam, shiftSlug, page = 1, limit = 20) {
  const { isShiftType, shiftTypeToDisplay, slugToDbValues, shiftTypeToSlug, getAllShiftTypes } = require('../constants/shiftTypes');
  const { specialtyToSlug, slugToSpecialty } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isShiftType(shiftSlug)) return null;

  const normalizedShiftSlug = shiftTypeToSlug(shiftSlug);
  const shiftDisplay = shiftTypeToDisplay(normalizedShiftSlug);
  const dbValues = slugToDbValues(normalizedShiftSlug);

  if (!shiftDisplay || !dbValues) return null;

  // Convert specialty slug to display name
  const specialtyDisplay = slugToSpecialty(specialtySlugParam);
  if (!specialtyDisplay) return null;

  const specialtySlug = specialtyToSlug(specialtyDisplay);

  // Find the employer
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug }
  });

  if (!employer) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause for employer + specialty + shift
  const whereClause = {
    isActive: true,
    employerId: employer.id,
    specialty: { equals: specialtyDisplay, mode: 'insensitive' }
  };
  if (dbValues.length > 1) {
    whereClause.OR = dbValues.map(v => ({
      shiftType: { equals: v, mode: 'insensitive' }
    }));
  } else {
    whereClause.shiftType = { equals: dbValues[0], mode: 'insensitive' };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [states, cities, jobTypes, allShifts, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { employerId: employer.id, isActive: true, specialty: { equals: specialtyDisplay, mode: 'insensitive' }, shiftType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedCities = cities.map(c => ({
    city: c.city,
    state: c.state,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const otherShifts = [];
  const shiftCounts = {};
  allShifts.forEach(s => {
    const slug = shiftTypeToSlug(s.shiftType);
    if (!slug) return;
    if (!shiftCounts[slug]) {
      shiftCounts[slug] = { slug, display: shiftTypeToDisplay(slug), count: 0 };
    }
    shiftCounts[slug].count += s._count.id;
  });
  Object.values(shiftCounts).forEach(s => {
    if (s.slug !== normalizedShiftSlug) {
      otherShifts.push(s);
    }
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    employer: { id: employer.id, name: employer.name, slug: employer.slug },
    specialty: specialtyDisplay,
    specialtySlug: specialtySlug,
    shiftType: shiftDisplay,
    shiftSlug: normalizedShiftSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      cities: formattedCities,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      otherShifts: otherShifts.sort((a, b) => b.count - a.count)
    }
  };
}

// ============================================================================
// Sign-On Bonus Functions
// Filter jobs that mention sign-on bonus in description or benefits
// ============================================================================

/**
 * Build sign-on bonus where clause for Prisma
 * Uses the hasSignOnBonus field (LLM-extracted) for accurate filtering
 * Note: Run backfill-sign-on-bonus.js to populate this field for existing jobs
 */
function buildSignOnBonusWhereClause() {
  return {
    hasSignOnBonus: true
  };
}

/**
 * Fetch nationwide sign-on bonus jobs
 */
async function fetchSignOnBonusJobs(page = 1, limit = 20) {
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');
  const { experienceLevelToSlug, experienceLevelToDisplay } = require('../constants/experienceLevels');

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [states, specialties, employers, jobTypes, experienceLevels, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['experienceLevel'],
      where: { ...whereClause, experienceLevel: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format statistics
  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedSpecialties = specialties
    .filter(s => s.specialty && s.specialty.toLowerCase() !== 'all specialties')
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  const formattedExperienceLevels = {};
  experienceLevels.forEach(el => {
    const slug = experienceLevelToSlug(el.experienceLevel);
    if (!slug) return;
    if (!formattedExperienceLevels[slug]) {
      formattedExperienceLevels[slug] = { slug, displayName: experienceLevelToDisplay(slug), count: 0 };
    }
    formattedExperienceLevels[slug].count += el._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count),
      experienceLevels: Object.values(formattedExperienceLevels).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch state sign-on bonus jobs
 */
async function fetchStateSignOnBonusJobs(stateCode, page = 1, limit = 20) {
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  const stateUpper = stateCode.toUpperCase();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateUpper,
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [cities, specialties, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format statistics
  const formattedCities = cities.map(c => ({
    city: c.city,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedSpecialties = specialties
    .filter(s => s.specialty && s.specialty.toLowerCase() !== 'all specialties')
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    stateCode: stateUpper,
    stateFullName: getStateFullName(stateUpper) || stateUpper,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: formattedCities,
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch city sign-on bonus jobs
 */
async function fetchCitySignOnBonusJobs(stateCode, citySlug, page = 1, limit = 20) {
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  const stateUpper = stateCode.toUpperCase();
  const normalizedCitySlug = citySlug.toLowerCase();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Find the city name from the slug
  const cityRecord = await prisma.nursingJob.findFirst({
    where: {
      state: stateUpper,
      isActive: true
    },
    select: { city: true }
  });

  // Try to match the city by normalizing
  const allCities = await prisma.nursingJob.findMany({
    where: { state: stateUpper, isActive: true },
    select: { city: true },
    distinct: ['city']
  });

  const matchedCity = allCities.find(c =>
    c.city.toLowerCase().replace(/\s+/g, '-') === normalizedCitySlug
  );

  if (!matchedCity) return null;

  const cityName = matchedCity.city;

  const whereClause = {
    isActive: true,
    state: stateUpper,
    city: { equals: cityName, mode: 'insensitive' },
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [specialties, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format statistics
  const formattedSpecialties = specialties
    .filter(s => s.specialty && s.specialty.toLowerCase() !== 'all specialties')
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    stateCode: stateUpper,
    stateFullName: getStateFullName(stateUpper) || stateUpper,
    city: cityName,
    citySlug: normalizedCitySlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch specialty sign-on bonus jobs
 */
async function fetchSpecialtySignOnBonusJobs(specialtySlug, page = 1, limit = 20) {
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  const specialtyDisplay = slugToSpecialty(specialtySlug);
  if (!specialtyDisplay) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause to match the specialty (case-insensitive)
  const whereClause = {
    isActive: true,
    specialty: { equals: specialtyDisplay, mode: 'insensitive' },
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [states, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format statistics
  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    specialty: specialtyDisplay,
    specialtySlug: specialtyToSlug(specialtyDisplay),
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch employer sign-on bonus jobs
 */
async function fetchEmployerSignOnBonusJobs(employerSlug, page = 1, limit = 20) {
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Find employer
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug }
  });

  if (!employer) return null;

  const whereClause = {
    isActive: true,
    employerId: employer.id,
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: limitNum
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Get statistics
  const [states, cities, specialties, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Format statistics
  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedCities = cities.map(c => ({
    city: c.city,
    state: c.state,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedSpecialties = specialties
    .filter(s => s.specialty && s.specialty.toLowerCase() !== 'all specialties')
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(rawJobs)),
    employer: { id: employer.id, name: employer.name, slug: employer.slug },
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      cities: formattedCities,
      specialties: formattedSpecialties,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch state + specialty sign-on bonus jobs
 */
async function fetchStateSpecialtySignOnBonusJobs(stateCode, specialtySlug, page = 1, limit = 20) {
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  const stateUpper = stateCode.toUpperCase();
  const specialtyDisplay = slugToSpecialty(specialtySlug);
  if (!specialtyDisplay) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateUpper,
    specialty: { equals: specialtyDisplay, mode: 'insensitive' },
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [cities, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format statistics
  const formattedCities = cities.map(c => ({
    city: c.city,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    stateCode: stateUpper,
    stateFullName: getStateFullName(stateUpper) || stateUpper,
    specialty: specialtyDisplay,
    specialtySlug: specialtyToSlug(specialtyDisplay),
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: formattedCities,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch city + specialty sign-on bonus jobs
 */
async function fetchCitySpecialtySignOnBonusJobs(stateCode, citySlug, specialtySlug, page = 1, limit = 20) {
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  const stateUpper = stateCode.toUpperCase();
  const specialtyDisplay = slugToSpecialty(specialtySlug);
  if (!specialtyDisplay) return null;

  const normalizedCitySlug = citySlug.toLowerCase();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Find the city name from the slug
  const allCities = await prisma.nursingJob.findMany({
    where: { state: stateUpper, isActive: true },
    select: { city: true },
    distinct: ['city']
  });

  const matchedCity = allCities.find(c =>
    c.city.toLowerCase().replace(/\s+/g, '-') === normalizedCitySlug
  );

  if (!matchedCity) return null;

  const cityName = matchedCity.city;

  const whereClause = {
    isActive: true,
    state: stateUpper,
    city: { equals: cityName, mode: 'insensitive' },
    specialty: { equals: specialtyDisplay, mode: 'insensitive' },
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    stateCode: stateUpper,
    stateFullName: getStateFullName(stateUpper) || stateUpper,
    city: cityName,
    citySlug: normalizedCitySlug,
    specialty: specialtyDisplay,
    specialtySlug: specialtyToSlug(specialtyDisplay),
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch employer + specialty sign-on bonus jobs
 */
async function fetchEmployerSpecialtySignOnBonusJobs(employerSlug, specialtySlug, page = 1, limit = 20) {
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  const specialtyDisplay = slugToSpecialty(specialtySlug);
  if (!specialtyDisplay) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Find employer
  const employer = await prisma.healthcareEmployer.findUnique({
    where: { slug: employerSlug }
  });

  if (!employer) return null;

  const whereClause = {
    isActive: true,
    employerId: employer.id,
    specialty: { equals: specialtyDisplay, mode: 'insensitive' },
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: limitNum
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  // Get statistics
  const [states, cities, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Format statistics
  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedCities = cities.map(c => ({
    city: c.city,
    state: c.state,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(rawJobs)),
    employer: { id: employer.id, name: employer.name, slug: employer.slug },
    specialty: specialtyDisplay,
    specialtySlug: specialtyToSlug(specialtyDisplay),
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      cities: formattedCities,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch experience level sign-on bonus jobs
 */
async function fetchExperienceLevelSignOnBonusJobs(levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToDbValues } = require('../constants/experienceLevels');
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedSlug = experienceLevelToSlug(levelSlug) || levelSlug;
  const levelDisplay = experienceLevelToDisplay(normalizedSlug);
  const dbValues = slugToDbValues(normalizedSlug);

  if (!levelDisplay || !dbValues) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause for experience level variations
  const baseWhere = { isActive: true, ...buildSignOnBonusWhereClause() };
  let whereClause;
  if (dbValues.length > 1) {
    whereClause = {
      ...baseWhere,
      OR: dbValues.map(v => ({
        experienceLevel: { equals: v, mode: 'insensitive' }
      }))
    };
  } else {
    whereClause = {
      ...baseWhere,
      experienceLevel: { equals: dbValues[0], mode: 'insensitive' }
    };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [states, specialties, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['state'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format statistics
  const formattedStates = states.map(s => ({
    state: s.state,
    stateFullName: getStateFullName(s.state) || s.state,
    count: s._count.id
  }));

  const formattedSpecialties = specialties
    .filter(s => s.specialty && s.specialty.toLowerCase() !== 'all specialties')
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      states: formattedStates,
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch state + experience level sign-on bonus jobs
 */
async function fetchStateExperienceLevelSignOnBonusJobs(stateCode, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToDbValues } = require('../constants/experienceLevels');
  const { specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isExperienceLevel(levelSlug)) return null;

  const stateUpper = stateCode.toUpperCase();
  const normalizedSlug = experienceLevelToSlug(levelSlug) || levelSlug;
  const levelDisplay = experienceLevelToDisplay(normalizedSlug);
  const dbValues = slugToDbValues(normalizedSlug);

  if (!levelDisplay || !dbValues) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build where clause
  const baseWhere = { isActive: true, state: stateUpper, ...buildSignOnBonusWhereClause() };
  let whereClause;
  if (dbValues.length > 1) {
    whereClause = {
      ...baseWhere,
      OR: dbValues.map(v => ({
        experienceLevel: { equals: v, mode: 'insensitive' }
      }))
    };
  } else {
    whereClause = {
      ...baseWhere,
      experienceLevel: { equals: dbValues[0], mode: 'insensitive' }
    };
  }

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  // Get statistics
  const [cities, specialties, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 30
    }),
    prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...whereClause, specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  // Get employer details
  const employerIds = employers.map(e => e.employerId);
  const employerDetails = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  // Format statistics
  const formattedCities = cities.map(c => ({
    city: c.city,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedSpecialties = specialties
    .filter(s => s.specialty && s.specialty.toLowerCase() !== 'all specialties')
    .map(s => ({
      specialty: s.specialty,
      slug: specialtyToSlug(s.specialty),
      count: s._count.id
    }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    stateCode: stateUpper,
    stateFullName: getStateFullName(stateUpper) || stateUpper,
    experienceLevel: levelDisplay,
    experienceLevelSlug: normalizedSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: formattedCities,
      specialties: formattedSpecialties,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch state + specialty + experience level sign-on bonus jobs
 */
async function fetchStateSpecialtyExperienceLevelSignOnBonusJobs(stateCode, specialtySlug, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel, getAllExperienceLevels } = require('../constants/experienceLevels');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedLevelSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedLevelSlug);
  const dbLevelValue = slugToExperienceLevel(normalizedLevelSlug);

  const specialtyName = slugToSpecialty(specialtySlug);
  const stateFullName = getStateFullName(stateCode);

  if (!specialtyName || !levelDisplay || !dbLevelValue || !stateFullName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateCode.toUpperCase(),
    specialty: { equals: specialtyName, mode: 'insensitive' },
    experienceLevel: { equals: dbLevelValue, mode: 'insensitive' },
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [cities, employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['city'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = employerIds.length > 0 ? await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  }) : [];
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedCities = cities.map(c => ({
    city: c.city,
    slug: c.city.toLowerCase().replace(/\s+/g, '-'),
    count: c._count.id
  }));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    specialty: specialtyName,
    specialtySlug,
    experienceLevel: levelDisplay,
    levelSlug: normalizedLevelSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      cities: formattedCities,
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

/**
 * Fetch city + specialty + experience level sign-on bonus jobs
 */
async function fetchCitySpecialtyExperienceLevelSignOnBonusJobs(stateCode, citySlug, specialtySlug, levelSlug, page = 1, limit = 20) {
  const { isExperienceLevel, experienceLevelToDisplay, experienceLevelToSlug, slugToExperienceLevel } = require('../constants/experienceLevels');
  const { slugToSpecialty, specialtyToSlug } = require('../constants/specialties');
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');

  if (!isExperienceLevel(levelSlug)) return null;

  const normalizedLevelSlug = experienceLevelToSlug(levelSlug) || levelSlug.toLowerCase();
  const levelDisplay = experienceLevelToDisplay(normalizedLevelSlug);
  const dbLevelValue = slugToExperienceLevel(normalizedLevelSlug);

  const specialtyName = slugToSpecialty(specialtySlug);
  const stateFullName = getStateFullName(stateCode);
  const cityName = normalizeCity(citySlug);

  if (!specialtyName || !levelDisplay || !dbLevelValue || !stateFullName || !cityName) return null;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    isActive: true,
    state: stateCode.toUpperCase(),
    city: { equals: cityName, mode: 'insensitive' },
    specialty: { equals: specialtyName, mode: 'insensitive' },
    experienceLevel: { equals: dbLevelValue, mode: 'insensitive' },
    ...buildSignOnBonusWhereClause()
  };

  const [rawJobs, totalJobs] = await Promise.all([
    prisma.nursingJob.findMany({
      where: whereClause,
      include: { employer: { select: { id: true, name: true, slug: true } } },
      orderBy: { scrapedAt: 'desc' },
      skip: offset,
      take: MAX_INTERLEAVE_FETCH
    }),
    prisma.nursingJob.count({ where: whereClause })
  ]);

  const jobs = interleaveJobsByEmployer(rawJobs, limitNum);

  const [employers, jobTypes, salaryStats] = await Promise.all([
    prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    }),
    prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...whereClause, jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.nursingJob.aggregate({
      where: whereClause,
      _max: { salaryMaxHourly: true }
    })
  ]);

  const employerIds = employers.map(e => e.employerId).filter(Boolean);
  const employerDetails = employerIds.length > 0 ? await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  }) : [];
  const employerMap = new Map(employerDetails.map(e => [e.id, e]));

  const formattedEmployers = employers
    .map(e => {
      const emp = employerMap.get(e.employerId);
      return emp ? { name: emp.name, slug: emp.slug, count: e._count.id } : null;
    })
    .filter(Boolean);

  const formattedJobTypes = {};
  jobTypes.forEach(jt => {
    const normalized = jobTypeToSlug(jt.jobType);
    if (!normalized) return;
    if (!formattedJobTypes[normalized]) {
      formattedJobTypes[normalized] = { slug: normalized, displayName: jobTypeToDisplay(normalized), count: 0 };
    }
    formattedJobTypes[normalized].count += jt._count.id;
  });

  return {
    jobs: JSON.parse(JSON.stringify(jobs)),
    stateCode: stateCode.toUpperCase(),
    stateFullName,
    city: cityName,
    citySlug,
    specialty: specialtyName,
    specialtySlug,
    experienceLevel: levelDisplay,
    levelSlug: normalizedLevelSlug,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limitNum),
    currentPage: pageNum,
    maxHourlyRate: salaryStats._max.salaryMaxHourly,
    stats: {
      employers: formattedEmployers,
      jobTypes: Object.values(formattedJobTypes).sort((a, b) => b.count - a.count)
    }
  };
}

module.exports = {
  detectStateFromSlug,
  fetchStateJobs,
  fetchBrowseStats,
  fetchJobBySlug,
  fetchCityJobs,
  fetchSpecialtyJobs,
  fetchEmployerJobs,
  fetchStateSalaryStats,
  fetchCitySalaryStats,
  fetchSpecialtySalaryStats,
  fetchStateSpecialtySalaryStats,
  fetchCitySpecialtySalaryStats,
  fetchStateSpecialtyJobs,
  fetchCitySpecialtyJobs,
  fetchEmployerSpecialtyJobs,
  fetchEmployerJobTypeJobs,
  fetchJobTypeJobs,
  fetchStateJobTypeJobs,
  fetchCityJobTypeJobs,
  fetchSpecialtyJobTypeJobs,
  fetchStateSpecialtyJobTypeJobs,
  fetchCitySpecialtyJobTypeJobs,
  fetchEmployerSpecialtyJobTypeJobs,
  // Experience level functions
  fetchExperienceLevelJobs,
  fetchStateExperienceLevelJobs,
  fetchCityExperienceLevelJobs,
  fetchSpecialtyExperienceLevelJobs,
  fetchStateSpecialtyExperienceLevelJobs,
  fetchEmployerExperienceLevelJobs,
  fetchEmployerSpecialtyExperienceLevelJobs,
  fetchCitySpecialtyExperienceLevelJobs,
  // Shift functions
  fetchShiftJobs,
  fetchStateShiftJobs,
  fetchCityShiftJobs,
  // Specialty + Shift functions
  fetchSpecialtyShiftJobs,
  fetchStateSpecialtyShiftJobs,
  fetchCitySpecialtyShiftJobs,
  // Employer + Shift functions
  fetchEmployerShiftJobs,
  // Employer + Specialty + Shift functions
  fetchEmployerSpecialtyShiftJobs,
  // Sign-on Bonus functions
  buildSignOnBonusWhereClause,
  fetchSignOnBonusJobs,
  fetchStateSignOnBonusJobs,
  fetchCitySignOnBonusJobs,
  fetchSpecialtySignOnBonusJobs,
  fetchEmployerSignOnBonusJobs,
  fetchStateSpecialtySignOnBonusJobs,
  fetchCitySpecialtySignOnBonusJobs,
  fetchEmployerSpecialtySignOnBonusJobs,
  fetchExperienceLevelSignOnBonusJobs,
  fetchStateExperienceLevelSignOnBonusJobs,
  fetchStateSpecialtyExperienceLevelSignOnBonusJobs,
  fetchCitySpecialtyExperienceLevelSignOnBonusJobs
};

