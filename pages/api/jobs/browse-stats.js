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

    // Get all experience levels with counts
    const experienceLevels = await prisma.nursingJob.groupBy({
      by: ['experienceLevel'],
      where: { isActive: true, experienceLevel: { not: null } },
      _count: { id: true },
      orderBy: { experienceLevel: 'asc' }
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

    // Format specialties and merge case-insensitive duplicates
    const specialtiesMap = new Map();
    const nursingAcronyms = ['ICU', 'NICU', 'ER', 'OR', 'PACU', 'PCU', 'CCU', 'CVICU', 'MICU', 'SICU', 'PICU'];
    
    specialties.forEach(s => {
      const specialtyValue = s.specialty; // Raw DB value
      
      // Handle legacy "All Specialties" tags - convert to "General Nursing"
      // (New jobs use "Float Pool" or "General Nursing", but old DB entries might have "All Specialties")
      if (specialtyValue && specialtyValue.toLowerCase() === 'all specialties') {
        // Treat legacy "All Specialties" as "General Nursing"
        const displayName = 'General Nursing';
        if (specialtiesMap.has(displayName)) {
          specialtiesMap.get(displayName).count += s._count.id;
        } else {
          specialtiesMap.set(displayName, {
            name: displayName,
            count: s._count.id,
            slug: displayName.toLowerCase().replace(/\s+/g, '-')
          });
        }
        return; // Skip normal processing
      }
      
      // Normalize to Title Case, but keep common nursing acronyms in ALL CAPS
      const displayName = specialtyValue
        .split(' ')
        .map(word => {
          const upperWord = word.toUpperCase();
          // Keep nursing acronyms in all caps
          if (nursingAcronyms.includes(upperWord)) {
            return upperWord;
          }
          // Title case for everything else
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
      
      // Merge duplicates by displayName (case-insensitive)
      if (specialtiesMap.has(displayName)) {
        specialtiesMap.get(displayName).count += s._count.id;
      } else {
        specialtiesMap.set(displayName, {
          name: displayName,
          count: s._count.id,
          slug: displayName.toLowerCase().replace(/\s+/g, '-')
        });
      }
    });
    const specialtiesFormatted = Array.from(specialtiesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Format job types with proper capitalization and merge duplicates (PRN, Per Diem in caps)
    const jobTypesMap = new Map();
    jobTypes.forEach(jt => {
      const jobTypeValue = jt.jobType; // Raw DB value
      // Normalize and capitalize properly for display
      let displayName = jobTypeValue;
      if (jobTypeValue.toLowerCase() === 'prn' || jobTypeValue.toLowerCase() === 'per diem') {
        displayName = 'PRN';
      } else {
        // Title case for others (Full Time, Part Time, etc.)
        displayName = jobTypeValue.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
      
      // Merge duplicates by displayName
      if (jobTypesMap.has(displayName)) {
        const entry = jobTypesMap.get(displayName);
        entry.count += jt._count.id;
        // Collect all raw DB values for this display name
        if (!entry.dbValues.includes(jobTypeValue)) {
          entry.dbValues.push(jobTypeValue);
        }
      } else {
        jobTypesMap.set(displayName, {
          name: displayName,
          count: jt._count.id,
          slug: displayName.toLowerCase().replace(/\s+/g, '-'),
          dbValues: [jobTypeValue] // Store original DB value(s) for filtering
        });
      }
    });
    const jobTypesFormatted = Array.from(jobTypesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Format experience levels
    const experienceLevelsFormatted = experienceLevels.map(el => ({
      name: el.experienceLevel,
      count: el._count.id,
      slug: el.experienceLevel.toLowerCase().replace(/\s+/g, '-')
    }));

    return res.status(200).json({
      success: true,
      data: {
        states: statesFormatted,
        employers: employersFormatted,
        specialties: specialtiesFormatted,
        jobTypes: jobTypesFormatted,
        experienceLevels: experienceLevelsFormatted
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

