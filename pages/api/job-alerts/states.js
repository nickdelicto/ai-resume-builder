const { PrismaClient } = require('@prisma/client');
const { getStateFullName } = require('../../../lib/jobScraperUtils');

const prisma = new PrismaClient();

/**
 * API Endpoint: Get Unique States with Active Jobs
 * 
 * Returns a list of states that have active nursing jobs
 * Used for the job alert signup form state dropdown
 * 
 * GET /api/job-alerts/states
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get unique states with job counts
    const statesData = await prisma.nursingJob.groupBy({
      by: ['state'],
      where: {
        isActive: true
      },
      _count: {
        state: true
      },
      orderBy: {
        _count: {
          state: 'desc'
        }
      }
    });

    // Filter out null/empty states and format response
    const states = statesData
      .filter(item => item.state && item.state.trim() !== '')
      .map(item => ({
        code: item.state,
        name: getStateFullName(item.state) || item.state,
        jobCount: item._count.state
      }))
      // Sort alphabetically by full name
      .sort((a, b) => a.name.localeCompare(b.name));

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      states,
      totalStates: states.length
    });

  } catch (error) {
    console.error('Error fetching states:', error);
    await prisma.$disconnect();
    return res.status(500).json({ 
      error: 'Failed to fetch states',
      message: error.message 
    });
  }
}


