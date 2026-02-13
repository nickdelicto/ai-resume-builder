import { PrismaClient } from '@prisma/client';
import { consolidateSpecialties } from '../../../../lib/constants/specialties';

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/by-specialty/[specialty]
 * Fetch jobs for a specific specialty with aggregated statistics
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { specialty, page = 1, limit = 20 } = req.query;

    if (!specialty) {
      return res.status(400).json({ error: 'Specialty is required' });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Normalize specialty name - handle URL slugs like "icu" or "med-surg"
    // Try multiple variations: with hyphen, with space, just lowercase
    const specialtyLower = specialty.toLowerCase();
    const specialtyWithSpace = specialtyLower.replace(/-/g, ' '); // "med-surg" → "med surg"
    const specialtyWithHyphen = specialtyLower.replace(/\s+/g, '-'); // "med surg" → "med-surg"
    
    // First, try to find the actual specialty name from database
    // Try multiple matching strategies: exact match, contains with space, contains with hyphen
    let sampleJob = await prisma.nursingJob.findFirst({
      where: {
        OR: [
          { specialty: { equals: specialtyLower, mode: 'insensitive' } },
          { specialty: { equals: specialtyWithSpace, mode: 'insensitive' } },
          { specialty: { equals: specialtyWithHyphen, mode: 'insensitive' } },
          { specialty: { contains: specialtyLower, mode: 'insensitive' } },
          { specialty: { contains: specialtyWithSpace, mode: 'insensitive' } },
          { specialty: { contains: specialtyWithHyphen, mode: 'insensitive' } }
        ],
        isActive: true
      },
      select: { specialty: true }
    });

    // Use the actual specialty name from database for consistency
    const actualSpecialtyName = sampleJob?.specialty;
    
    if (!actualSpecialtyName) {
      return res.status(404).json({
        success: false,
        error: 'Specialty not found'
      });
    }

    // Use exact match with the actual specialty name from DB
    const finalWhere = {
      specialty: actualSpecialtyName,
      isActive: true
    };

    const [jobs, total] = await Promise.all([
      prisma.nursingJob.findMany({
        where: finalWhere,
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
      prisma.nursingJob.count({ where: finalWhere })
    ]);

    // Get aggregated statistics for the specialty
    const [topStates, topCities, jobTypes, employers, allSpecialties] = await Promise.all([
      // Top states for this specialty
      prisma.nursingJob.groupBy({
        by: ['state'],
        where: { ...finalWhere },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // Top cities for this specialty
      prisma.nursingJob.groupBy({
        by: ['city', 'state'],
        where: { ...finalWhere },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // Job types breakdown
      prisma.nursingJob.groupBy({
        by: ['jobType'],
        where: { ...finalWhere, jobType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      // Top employers for this specialty
      prisma.nursingJob.groupBy({
        by: ['employerId'],
        where: finalWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      // ALL specialties with jobs (for browse by specialty section)
      prisma.nursingJob.groupBy({
        by: ['specialty'],
        where: { isActive: true, specialty: { not: null } },
        _count: { id: true },
        orderBy: { specialty: 'asc' } // Alphabetical for easier browsing
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
        specialty: actualSpecialtyName,
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
          jobTypes: jobTypes.map(jt => ({ jobType: jt.jobType, count: jt._count.id })),
          employers: employersWithNames.filter(e => e.employer).map(e => ({
            employer: e.employer,
            count: e._count.id
          })),
          allSpecialties: consolidateSpecialties(allSpecialties)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching jobs by specialty:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

