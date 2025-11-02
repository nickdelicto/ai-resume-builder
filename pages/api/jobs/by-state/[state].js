import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/by-state/[state]
 * Fetch jobs for a specific state with aggregated statistics
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { state, page = 1, limit = 20 } = req.query;

    if (!state) {
      return res.status(400).json({ error: 'State is required' });
    }

    const stateUpper = state.toUpperCase();
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Fetch jobs for state
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

    // Get aggregated statistics for the state
    const [topCities, allCities, specialties, jobTypes, employers] = await Promise.all([
      // Top cities in this state (for display in stats card)
      prisma.nursingJob.groupBy({
        by: ['city'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // ALL cities in this state (for browse by city section)
      prisma.nursingJob.groupBy({
        by: ['city'],
        where,
        _count: { id: true },
        orderBy: { city: 'asc' } // Alphabetical for easier browsing
      }),
      // Top specialties in this state
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
      // Top employers in this state
      prisma.nursingJob.groupBy({
        by: ['employerId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
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
          cities: topCities.map(c => ({ city: c.city, count: c._count.id })),
          allCities: allCities.map(c => ({ city: c.city, count: c._count.id })),
          specialties: specialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
          jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id })),
          employers: employersWithNames.filter(e => e.employer).map(e => ({
            employer: e.employer,
            count: e._count.id
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching jobs by state:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

