const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * API Endpoint: Get Employers by State (optionally filtered by city)
 * 
 * Returns a list of employers with active jobs in a given state/city
 * Used for the job alert signup form employer dropdown
 * 
 * GET /api/job-alerts/employers?state=OH
 * GET /api/job-alerts/employers?state=OH&city=Cleveland
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { state, city } = req.query;

  if (!state) {
    return res.status(400).json({ 
      error: 'Missing state parameter',
      message: 'Please provide a state code (e.g., ?state=OH)' 
    });
  }

  try {
    // Build where clause (can't use { not: null } in groupBy - filter in JS)
    const whereClause = {
      isActive: true,
      state: state.toUpperCase()
    };

    // Add city filter if provided
    if (city) {
      whereClause.city = city;
    }

    // Get unique employers with job counts
    const employersData = await prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: whereClause,
      _count: {
        employerId: true
      },
      orderBy: {
        _count: {
          employerId: 'desc'
        }
      }
    });

    // Filter out null employerIds (jobs without employers) in JavaScript
    const employerIds = employersData
      .map(e => e.employerId)
      .filter(id => id !== null && id !== undefined);

    // If no employers found, return empty array
    if (employerIds.length === 0) {
      await prisma.$disconnect();
      return res.status(200).json({
        success: true,
        state: state.toUpperCase(),
        city: city || null,
        employers: [],
        totalEmployers: 0
      });
    }
    
    const employers = await prisma.healthcareEmployer.findMany({
      where: {
        id: { in: employerIds }
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    // If no employer records found, return empty
    if (!employers || employers.length === 0) {
      await prisma.$disconnect();
      return res.status(200).json({
        success: true,
        state: state.toUpperCase(),
        city: city || null,
        employers: [],
        totalEmployers: 0
      });
    }

    // Merge employer details with job counts
    const employerMap = new Map(employers.map(e => [e.id, e]));
    
    const result = [];
    for (const e of employersData) {
      if (e.employerId && employerMap.has(e.employerId)) {
        const emp = employerMap.get(e.employerId);
        result.push({
          id: emp.id,
          name: emp.name,
          slug: emp.slug,
          jobCount: e._count.employerId
        });
      }
    }
    
    // Sort alphabetically by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      state: state.toUpperCase(),
      city: city || null,
      employers: result,
      totalEmployers: result.length
    });

  } catch (error) {
    console.error('Error fetching employers:', error);
    await prisma.$disconnect();
    return res.status(500).json({ 
      error: 'Failed to fetch employers',
      message: error.message 
    });
  }
}

