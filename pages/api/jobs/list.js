import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/list
 * Fetch paginated list of nursing jobs with filters
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = 1,
      limit = 20,
      state,
      city,
      specialty,
      employerSlug,
      jobType,
      search,
      isActive = true
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      isActive: isActive === 'true' || isActive === true,
    };

    // Filter by state
    if (state) {
      where.state = state.toUpperCase();
    }

    // Filter by city
    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive'
      };
    }

    // Filter by specialty
    if (specialty) {
      where.specialty = specialty;
    }

    // Filter by employer
    if (employerSlug) {
      where.employer = {
        slug: employerSlug
      };
    }

    // Filter by job type
    if (jobType) {
      where.jobType = jobType;
    }

    // Search in title and description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch jobs with employer info
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

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
