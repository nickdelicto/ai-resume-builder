const { PrismaClient } = require('@prisma/client');
const { getStateCode } = require('../../lib/jobScraperUtils');

const prisma = new PrismaClient();

// Experience multipliers (conservative, defensible)
const EXPERIENCE_MULTIPLIERS = {
  0: 0.90,   // 0-1 years: -10%
  1: 0.90,
  2: 1.0,    // 2-3 years: baseline
  3: 1.0,
  4: 1.05,   // 4-5 years: +5%
  5: 1.05,
  6: 1.12,   // 6-10 years: +12%
  7: 1.12,
  8: 1.12,
  9: 1.12,
  10: 1.12,
  11: 1.18,  // 10+ years: +18%
  12: 1.18,
  13: 1.18,
  14: 1.18,
  15: 1.18,
  16: 1.18,
  17: 1.18,
  18: 1.18,
  19: 1.18,
  20: 1.18
};

function getExperienceMultiplier(years) {
  return EXPERIENCE_MULTIPLIERS[Math.min(years, 20)] || 1.0;
}

/**
 * Parse location input to extract city and/or state
 * Handles formats: "Cleveland, OH", "Ohio", "OH", "Cleveland, Ohio"
 */
function parseLocation(locationInput) {
  const input = locationInput.trim();
  
  // Format: "City, ST" or "City, State"
  if (input.includes(',')) {
    const parts = input.split(',').map(s => s.trim());
    const cityPart = parts[0];
    const statePart = parts[1];
    
    // Convert state name to code if needed (e.g., "Ohio" → "OH")
    const stateCode = statePart.length === 2 
      ? statePart.toUpperCase() 
      : getStateCode(statePart) || statePart.toUpperCase();
    
    return {
      city: cityPart,
      state: stateCode
    };
  }
  
  // Check if it's a 2-letter state code (e.g., "OH")
  if (input.length === 2) {
    return {
      city: null,
      state: input.toUpperCase()
    };
  }
  
  // Check if it's a state name (e.g., "Ohio", "Florida")
  const stateCode = getStateCode(input);
  if (stateCode) {
    return {
      city: null,
      state: stateCode
    };
  }
  
  // Otherwise, treat as city name (fallback, shouldn't happen with autocomplete)
  return {
    city: input,
    state: null
  };
}

/**
 * Get base salary data from database
 * @param {string} specialty - Nursing specialty
 * @param {string} location - City/State
 * @param {string} jobType - Optional job type filter
 * @param {string} shiftType - Optional shift type filter
 */
async function getBaseSalary(specialty, location, jobType = null, shiftType = null) {
  const { city, state } = parseLocation(location);
  
  // Build where clause - prioritize city, fallback to state
  let whereClause = {
    isActive: true,
    specialty: { equals: specialty, mode: 'insensitive' },
    salaryMinAnnual: { not: null },
    salaryMaxAnnual: { not: null },
    // Exclude Leadership positions (they skew salary data high)
    // Use OR to explicitly allow NULL values
    OR: [
      { experienceLevel: { not: 'Leadership' } },
      { experienceLevel: null }
    ]
  };
  
  // Add optional filters if provided
  if (jobType && jobType !== 'any') {
    whereClause.jobType = { equals: jobType, mode: 'insensitive' };
  }
  if (shiftType && shiftType !== 'any') {
    whereClause.shiftType = { equals: shiftType, mode: 'insensitive' };
  }
  
  // Try city first if provided
  if (city && state) {
    whereClause.city = { equals: city, mode: 'insensitive' };
    whereClause.state = state;
  } else if (state) {
    whereClause.state = state;
  } else if (city) {
    whereClause.city = { equals: city, mode: 'insensitive' };
  }
  
  let result = await prisma.nursingJob.aggregate({
    where: whereClause,
    _avg: {
      salaryMinAnnual: true,
      salaryMaxAnnual: true,
      salaryMinHourly: true,
      salaryMaxHourly: true
    },
    _count: { id: true }
  });
  
  // Track which filters were used for transparency
  let filtersApplied = { jobType: !!jobType, shiftType: !!shiftType };
  
  // Fallback strategy if not enough data (need at least 3 jobs for reliability)
  if (result._count.id < 3) {
    // Try removing shift filter first
    if (shiftType) {
      delete whereClause.shiftType;
      const shiftFallbackResult = await prisma.nursingJob.aggregate({
        where: whereClause,
        _avg: {
          salaryMinAnnual: true,
          salaryMaxAnnual: true,
          salaryMinHourly: true,
          salaryMaxHourly: true
        },
        _count: { id: true }
      });
      
      if (shiftFallbackResult._count.id >= 3) {
        return {
          ...shiftFallbackResult,
          fallbackToState: false,
          filtersApplied: { jobType: !!jobType, shiftType: false }
        };
      }
      result = shiftFallbackResult;
    }
    
    // Try removing job type filter
    if (jobType) {
      delete whereClause.jobType;
      const jobTypeFallbackResult = await prisma.nursingJob.aggregate({
        where: whereClause,
        _avg: {
          salaryMinAnnual: true,
          salaryMaxAnnual: true,
          salaryMinHourly: true,
          salaryMaxHourly: true
        },
        _count: { id: true }
      });
      
      if (jobTypeFallbackResult._count.id >= 3) {
        return {
          ...jobTypeFallbackResult,
          fallbackToState: false,
          filtersApplied: { jobType: false, shiftType: false }
        };
      }
      result = jobTypeFallbackResult;
    }
  }
  
  // If still no results or not enough (city too specific), try just state
  if (result._count.id < 3 && city && state) {
    whereClause = {
      isActive: true,
      specialty: { equals: specialty, mode: 'insensitive' },
      salaryMinAnnual: { not: null },
      salaryMaxAnnual: { not: null },
      state: state,
      OR: [
        { experienceLevel: { not: 'Leadership' } },
        { experienceLevel: null }
      ]
    };
    
    // Re-apply filters if they were originally provided
    if (jobType && jobType !== 'any') {
      whereClause.jobType = { equals: jobType, mode: 'insensitive' };
    }
    if (shiftType && shiftType !== 'any') {
      whereClause.shiftType = { equals: shiftType, mode: 'insensitive' };
    }
    
    const stateResult = await prisma.nursingJob.aggregate({
      where: whereClause,
      _avg: {
        salaryMinAnnual: true,
        salaryMaxAnnual: true,
        salaryMinHourly: true,
        salaryMaxHourly: true
      },
      _count: { id: true }
    });
    
    // If still not enough with filters, remove them
    if (stateResult._count.id < 3 && (jobType || shiftType)) {
      delete whereClause.jobType;
      delete whereClause.shiftType;
      
      const broadStateResult = await prisma.nursingJob.aggregate({
        where: whereClause,
        _avg: {
          salaryMinAnnual: true,
          salaryMaxAnnual: true,
          salaryMinHourly: true,
          salaryMaxHourly: true
        },
        _count: { id: true }
      });
      
      return {
        ...broadStateResult,
        fallbackToState: true,
        filtersApplied: { jobType: false, shiftType: false }
      };
    }
    
    return {
      ...stateResult,
      fallbackToState: true,
      filtersApplied
    };
  }
  
  return {
    ...result,
    fallbackToState: false,
    filtersApplied
  };
}

/**
 * Get comparison data (state and national averages)
 */
async function getComparisons(specialty, state) {
  // State average
  let stateAvg = null;
  if (state) {
    const stateResult = await prisma.nursingJob.aggregate({
      where: {
        isActive: true,
        specialty: { equals: specialty, mode: 'insensitive' },
        state: state,
        salaryMaxAnnual: { not: null },
        OR: [
          { experienceLevel: { not: 'Leadership' } },
          { experienceLevel: null }
        ]
      },
      _avg: { salaryMaxAnnual: true }
    });
    stateAvg = stateResult._avg.salaryMaxAnnual;
  }
  
  // National average
  const nationalResult = await prisma.nursingJob.aggregate({
    where: {
      isActive: true,
      specialty: { equals: specialty, mode: 'insensitive' },
      salaryMaxAnnual: { not: null },
      OR: [
        { experienceLevel: { not: 'Leadership' } },
        { experienceLevel: null }
      ]
    },
    _avg: { salaryMaxAnnual: true }
  });
  const nationalAvg = nationalResult._avg.salaryMaxAnnual;
  
  return {
    stateAvg: stateAvg ? Math.round(stateAvg) : null,
    nationalAvg: nationalAvg ? Math.round(nationalAvg) : null
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { specialty, location, experience, jobType, shiftType } = req.body;
  
  // Validation
  if (!specialty || !location || experience === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields: specialty, location, experience' 
    });
  }
  
  try {
    // Get base salary from database (with optional filters)
    const baseSalaryData = await getBaseSalary(specialty, location, jobType, shiftType);
    
    // Check if we have data
    if (!baseSalaryData._count.id) {
      return res.status(404).json({
        error: 'No salary data available',
        message: `We don't have enough data for ${specialty} in ${location} yet. Try a different location or specialty.`
      });
    }
    
    // Extract base salary averages
    const baseMinAnnual = baseSalaryData._avg.salaryMinAnnual || 0;
    const baseMaxAnnual = baseSalaryData._avg.salaryMaxAnnual || 0;
    const baseMinHourly = baseSalaryData._avg.salaryMinHourly || 0;
    const baseMaxHourly = baseSalaryData._avg.salaryMaxHourly || 0;
    
    // Apply experience multiplier
    const experienceMultiplier = getExperienceMultiplier(parseInt(experience));
    
    const adjustedMinAnnual = Math.round(baseMinAnnual * experienceMultiplier);
    const adjustedMaxAnnual = Math.round(baseMaxAnnual * experienceMultiplier);
    
    // Calculate hourly rates (2080 hours per year = 52 weeks × 40 hours)
    const adjustedMinHourly = baseMinHourly 
      ? Math.round(baseMinHourly * experienceMultiplier * 100) / 100
      : Math.round((adjustedMinAnnual / 2080) * 100) / 100;
    
    const adjustedMaxHourly = baseMaxHourly
      ? Math.round(baseMaxHourly * experienceMultiplier * 100) / 100
      : Math.round((adjustedMaxAnnual / 2080) * 100) / 100;
    
    // Get comparison data (RAW averages - no multiplier applied)
    const { city, state } = parseLocation(location);
    const comparisons = await getComparisons(specialty, state);
    
    await prisma.$disconnect();
    
    return res.status(200).json({
      success: true,
      salary: {
        annual: {
          min: adjustedMinAnnual,
          max: adjustedMaxAnnual
        },
        hourly: {
          min: adjustedMinHourly,
          max: adjustedMaxHourly
        }
      },
      comparisons: {
        state: comparisons.stateAvg ? {
          annual: comparisons.stateAvg,
          hourly: Math.round((comparisons.stateAvg / 2080) * 100) / 100
        } : null,
        national: comparisons.nationalAvg ? {
          annual: comparisons.nationalAvg,
          hourly: Math.round((comparisons.nationalAvg / 2080) * 100) / 100
        } : null
      },
      metadata: {
        specialty,
        location,
        experience,
        jobCount: baseSalaryData._count.id,
        experienceMultiplier,
        fallbackToState: baseSalaryData.fallbackToState || false,
        filtersApplied: baseSalaryData.filtersApplied || { jobType: false, shiftType: false },
        requestedFilters: { jobType, shiftType }
      }
    });
    
  } catch (error) {
    console.error('Salary calculator error:', error);
    await prisma.$disconnect();
    
    return res.status(500).json({
      error: 'Calculation failed',
      message: 'Unable to calculate salary. Please try again.'
    });
  }
}

