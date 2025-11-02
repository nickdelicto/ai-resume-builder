import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/by-employer/[employerSlug]
 * Fetch jobs for a specific employer with aggregated statistics
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employerSlug, page = 1, limit = 20 } = req.query;

    if (!employerSlug) {
      return res.status(400).json({ error: 'Employer slug is required' });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Find employer by slug
    const employer = await prisma.healthcareEmployer.findUnique({
      where: { slug: employerSlug },
      select: { id: true, name: true, slug: true }
    });

    if (!employer) {
      return res.status(404).json({
        success: false,
        error: 'Employer not found'
      });
    }

    // Fetch jobs for this employer
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

    // Get aggregated statistics for the employer
    const [topStates, topCities, topSpecialties, jobTypes, allStates] = await Promise.all([
      // Top states for this employer
      prisma.nursingJob.groupBy({
        by: ['state'],
        where: { ...where },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // Top cities for this employer
      prisma.nursingJob.groupBy({
        by: ['city', 'state'],
        where: { ...where },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // Top specialties for this employer
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
      // ALL states with jobs (for browse by state section)
      prisma.nursingJob.groupBy({
        by: ['state'],
        where: { isActive: true },
        _count: { id: true },
        orderBy: { state: 'asc' } // Alphabetical for easier browsing
      })
    ]);

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        employer: {
          id: employer.id,
          name: employer.name,
          slug: employer.slug
        },
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
          states: topStates.map(s => ({ state: s.state, count: s._count.id })),
          cities: topCities.map(c => ({ city: c.city, state: c.state, count: c._count.id })),
          specialties: topSpecialties.map(s => ({ specialty: s.specialty, count: s._count.id })),
          jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id })),
          allStates: allStates.map(s => ({ state: s.state, count: s._count.id }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching jobs by employer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

