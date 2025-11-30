const { PrismaClient } = require('@prisma/client');
const { getStateFullName } = require('../../../lib/jobScraperUtils');

const prisma = new PrismaClient();

/**
 * Get all available locations (cities and states) from active jobs
 * Used for autocomplete in salary calculator
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get all unique city+state combinations
    const cities = await prisma.nursingJob.groupBy({
      by: ['city', 'state'],
      where: { 
        isActive: true
      },
      _count: { id: true }
    });
    
    // Filter out null cities/states after the query
    const validCities = cities.filter(c => c.city && c.state);
    
    // Get all unique states
    const states = await prisma.nursingJob.groupBy({
      by: ['state'],
      where: { isActive: true },
      _count: { id: true }
    });
    
    // Filter out null states
    const validStates = states.filter(s => s.state);
    
    // Format city suggestions
    const citySuggestions = validCities.map(c => ({
      value: `${c.city}, ${c.state}`,
      label: `${c.city}, ${c.state}`,
      type: 'city',
      jobCount: c._count.id
    }));
    
    // Format state suggestions
    const stateSuggestions = validStates.map(s => {
      const stateFullName = getStateFullName(s.state);
      return {
        value: stateFullName || s.state,
        label: `${stateFullName || s.state} (statewide)`,
        type: 'state',
        jobCount: s._count.id
      };
    });
    
    // Combine and sort by job count (most jobs first)
    const allLocations = [...citySuggestions, ...stateSuggestions]
      .sort((a, b) => b.jobCount - a.jobCount);
    
    await prisma.$disconnect();
    
    return res.status(200).json({
      success: true,
      locations: allLocations,
      stats: {
        totalCities: citySuggestions.length,
        totalStates: stateSuggestions.length,
        totalLocations: allLocations.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching locations:', error);
    await prisma.$disconnect();
    
    return res.status(500).json({
      error: 'Failed to fetch locations'
    });
  }
}

