const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * API Endpoint: Get Cities by State with Active Jobs
 * 
 * Returns a list of cities in a given state that have active nursing jobs
 * Used for the job alert signup form city dropdown
 * 
 * GET /api/job-alerts/cities?state=OH
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { state } = req.query;

  if (!state) {
    return res.status(400).json({ 
      error: 'Missing state parameter',
      message: 'Please provide a state code (e.g., ?state=OH)' 
    });
  }

  try {
    // Get unique cities in the state with job counts
    const citiesData = await prisma.nursingJob.groupBy({
      by: ['city'],
      where: {
        isActive: true,
        state: state.toUpperCase()
      },
      _count: {
        city: true
      },
      orderBy: {
        _count: {
          city: 'desc'
        }
      }
    });

    // Filter out null/empty cities and format response
    const cities = citiesData
      .filter(item => item.city && item.city.trim() !== '')
      .map(item => ({
        name: item.city,
        jobCount: item._count.city
      }))
      // Sort alphabetically
      .sort((a, b) => a.name.localeCompare(b.name));

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      state: state.toUpperCase(),
      cities,
      totalCities: cities.length
    });

  } catch (error) {
    console.error('Error fetching cities:', error);
    await prisma.$disconnect();
    return res.status(500).json({ 
      error: 'Failed to fetch cities',
      message: error.message 
    });
  }
}


