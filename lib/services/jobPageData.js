/**
 * Server-side data fetching for job pages
 * Used by getServerSideProps for SSR
 */

const { PrismaClient } = require('@prisma/client');
const { getStateFullName, normalizeState } = require('../jobScraperUtils');

const prisma = new PrismaClient();

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

  // Normalize specialty for matching
  const specialtyLower = specialtySlug.toLowerCase();
  const specialtyWithSpace = specialtyLower.replace(/-/g, ' ');
  const specialtyWithHyphen = specialtyLower.replace(/\s+/g, '-');

  // Find actual specialty name from database
  const sampleJob = await prisma.nursingJob.findFirst({
    where: {
      OR: [
        { specialty: { equals: specialtyLower, mode: 'insensitive' } },
        { specialty: { equals: specialtyWithSpace, mode: 'insensitive' } },
        { specialty: { equals: specialtyWithHyphen, mode: 'insensitive' } },
        { specialty: { contains: specialtyLower, mode: 'insensitive' } }
      ],
      isActive: true
    },
    select: { specialty: true }
  });

  const actualSpecialtyName = sampleJob?.specialty;

  if (!actualSpecialtyName) {
    return null; // Specialty not found
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
  const [states, cities, specialties, allStates] = await Promise.all([
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
      by: ['state'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { state: 'asc' }
    })
  ]);

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
      allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
    }
  };
}

module.exports = {
  detectStateFromSlug,
  fetchStateJobs,
  fetchJobBySlug,
  fetchCityJobs,
  fetchSpecialtyJobs,
  fetchEmployerJobs
};

