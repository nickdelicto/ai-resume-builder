import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/by-state/[state]/[city]
 * Fetch jobs for a specific city within a state with aggregated statistics
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { state, city, page = 1, limit = 20 } = req.query;

    if (!state || !city) {
      return res.status(400).json({ error: 'State and city are required' });
    }

    const stateUpper = state.toUpperCase();
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Normalize city name - handle URL slugs like "cleveland" or "los-angeles"
    // Convert to proper city name format for database matching
    const citySlug = city.toLowerCase().replace(/-/g, ' ');
    // We'll use case-insensitive search since city names in DB might vary
    const cityPattern = citySlug
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Fetch jobs for city in state
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

    // Get the actual city name from the first job (for consistent display)
    const actualCityName = jobs.length > 0 ? jobs[0].city : cityPattern;

    // Get aggregated statistics for the city
    const [specialties, jobTypes, employers, allStates] = await Promise.all([
      // Top specialties in this city
      prisma.nursingJob.groupBy({
        by: ['specialty'],
        where: { ...where, specialty: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // Job types breakdown
      prisma.nursingJob.groupBy({
        by: ['jobType'],
        where: { ...where, jobType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      // Top employers in this city
      prisma.nursingJob.groupBy({
        by: ['employerId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // ALL states with jobs (for browse by state section)
      prisma.nursingJob.groupBy({
        by: ['state'],
        where: { isActive: true },
        _count: { id: true },
        orderBy: { state: 'asc' } // Alphabetical for easier browsing
      })
    ]);

    // Get employer names for the employer stats
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

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        state: stateUpper,
        city: actualCityName,
        total,
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
          jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id })),
          employers: employersWithNames.filter(e => e.employer).map(e => ({
            employer: e.employer,
            count: e._count.id
          })),
          allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching jobs by city:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

