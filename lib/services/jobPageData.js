/**
 * Server-side data fetching for job pages
 * Used by getServerSideProps for SSR
 */

const { getStateFullName, normalizeState } = require('../jobScraperUtils');
const { calculateSalaryStats } = require('../utils/salaryStatsUtils');
const { slugToSpecialty } = require('../constants/specialties');

// Import the shared Prisma singleton from lib/prisma.ts
const { prisma } = require('../prisma');

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
  const [topCities, allCities, specialties, jobTypes, employers] = await Promise.all([
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

  const actualCityName = jobs.length > 0 ? jobs[0].city : cityPattern;

  // Get aggregated statistics
  const [specialties, employers, allStates] = await Promise.all([
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
      allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
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
  const [states, cities, employers, allSpecialties] = await Promise.all([
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
      employers: employersWithNames.filter(e => e.employer).map(e => ({
        employer: e.employer,
        count: e._count.id
      })),
      allSpecialties: allSpecialties.map(s => ({ specialty: s.specialty, count: s._count.id }))
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
  const [states, cities, specialties, jobTypes, allStates] = await Promise.all([
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

  // Generate statistics for this state + specialty
  const [cities, employers] = await Promise.all([
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
      employers: employersWithDetails
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

  // Get job types at this employer
  const { jobTypeToSlug, jobTypeToDisplay } = require('../constants/jobTypes');
  const jobTypes = await prisma.nursingJob.groupBy({
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

  return {
    jobs,
    employer,
    specialty: actualSpecialtyName,
    totalJobs: totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
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

  // Get specialties at this employer
  const specialties = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: {
      employerId: employer.id,
      specialty: { not: null },
      isActive: true
    },
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    }
  });

  return {
    jobs,
    employer,
    jobType: jobTypeDisplay,
    jobTypeSlug: normalizedJobType,
    totalJobs,
    totalPages: Math.ceil(totalJobs / limit),
    currentPage: page,
    stats: {
      otherJobTypes: Object.values(mergedJobTypes),
      specialties: specialties.map(s => ({
        specialty: s.specialty,
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
  fetchEmployerJobTypeJobs
};

