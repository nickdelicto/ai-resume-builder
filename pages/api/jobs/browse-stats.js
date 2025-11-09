const { PrismaClient } = require('@prisma/client');
const { getStateFullName } = require('../../../lib/jobScraperUtils');

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/browse-stats
 * Fetch statistics for browse sections (states, employers, specialties)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      slug: s.state.toLowerCase() // Use state code as slug (e.g., "oh", "ny")
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
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Format specialties
    const specialtiesFormatted = specialties.map(s => ({
      name: s.specialty,
      count: s._count.id,
      slug: s.specialty.toLowerCase().replace(/\s+/g, '-')
    }));

    // Format job types
    const jobTypesFormatted = jobTypes.map(jt => ({
      name: jt.jobType,
      count: jt._count.id,
      slug: jt.jobType.toLowerCase().replace(/\s+/g, '-')
    }));

    return res.status(200).json({
      success: true,
      data: {
        states: statesFormatted,
        employers: employersFormatted,
        specialties: specialtiesFormatted,
        jobTypes: jobTypesFormatted
      }
    });

  } catch (error) {
    console.error('Error fetching browse stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch browse statistics',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

