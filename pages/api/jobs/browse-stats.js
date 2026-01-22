const { PrismaClient } = require('@prisma/client');
const { getStateFullName } = require('../../../lib/jobScraperUtils');
const { shiftTypeToDisplay, shiftTypeToSlug, SHIFT_TYPES } = require('../../../lib/constants/shiftTypes');

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/browse-stats
 * Fetch statistics for browse sections (states, employers, specialties)
 * Supports filter params to get dynamic counts based on current selection
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract filter params from query
    const { state, specialty, jobType, experienceLevel, shiftType, employerSlug, search } = req.query;

    // Build base where clause with active filters
    const baseWhere = { isActive: true };

    // Helper to build where clause excluding one filter type
    // This lets us show counts for a category without filtering by that category
    const buildWhereExcluding = (excludeKey) => {
      const where = { ...baseWhere };

      if (state && excludeKey !== 'state') {
        where.state = state.toUpperCase();
      }
      if (specialty && excludeKey !== 'specialty') {
        // Handle case-insensitive specialty matching
        where.specialty = { equals: specialty, mode: 'insensitive' };
      }
      if (jobType && excludeKey !== 'jobType') {
        // Handle multiple possible DB values for job types (PRN, per-diem, Per Diem)
        where.jobType = { equals: jobType, mode: 'insensitive' };
      }
      if (experienceLevel && excludeKey !== 'experienceLevel') {
        where.experienceLevel = { equals: experienceLevel, mode: 'insensitive' };
      }
      if (shiftType && excludeKey !== 'shiftType') {
        // Use the shift type constants to get all DB values for this shift type
        const shiftData = SHIFT_TYPES.find(st => st.slug === shiftType || st.display.toLowerCase() === shiftType.toLowerCase());
        if (shiftData) {
          where.shiftType = { in: shiftData.dbValues };
        } else {
          where.shiftType = { equals: shiftType, mode: 'insensitive' };
        }
      }
      if (employerSlug && excludeKey !== 'employer') {
        where.employer = { slug: employerSlug };
      }
      if (search && excludeKey !== 'search') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { specialty: { contains: search, mode: 'insensitive' } }
        ];
      }

      return where;
    };

    // Get states with job counts (filtered by specialty, jobType, experienceLevel but NOT state)
    const states = await prisma.nursingJob.groupBy({
      by: ['state'],
      where: buildWhereExcluding('state'),
      _count: { id: true },
      orderBy: { state: 'asc' }
    });

    // Get top 20 employers with job counts (filtered by all active filters)
    const topEmployers = await prisma.nursingJob.groupBy({
      by: ['employerId'],
      where: buildWhereExcluding(null), // Apply all filters for employers
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

    // Get specialties with job counts (filtered by state, jobType, experienceLevel but NOT specialty)
    const specialties = await prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { ...buildWhereExcluding('specialty'), specialty: { not: null } },
      _count: { id: true },
      orderBy: { specialty: 'asc' }
    });

    // Get job types with counts (filtered by state, specialty, experienceLevel but NOT jobType)
    const jobTypes = await prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { ...buildWhereExcluding('jobType'), jobType: { not: null } },
      _count: { id: true },
      orderBy: { jobType: 'asc' }
    });

    // Get experience levels with counts (filtered by state, specialty, jobType but NOT experienceLevel)
    const experienceLevels = await prisma.nursingJob.groupBy({
      by: ['experienceLevel'],
      where: { ...buildWhereExcluding('experienceLevel'), experienceLevel: { not: null } },
      _count: { id: true },
      orderBy: { experienceLevel: 'asc' }
    });

    // Get shift types with counts (filtered by state, specialty, jobType, experienceLevel but NOT shiftType)
    const shiftTypes = await prisma.nursingJob.groupBy({
      by: ['shiftType'],
      where: { ...buildWhereExcluding('shiftType'), shiftType: { not: null } },
      _count: { id: true },
      orderBy: { shiftType: 'asc' }
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
      
      // Replace hyphens with spaces BEFORE processing (Med-Surg → Med Surg)
      // Then normalize to Title Case, but keep common nursing acronyms in ALL CAPS
      const normalizedValue = specialtyValue.replace(/-/g, ' ');
      const displayName = normalizedValue
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
      if (jobTypeValue.toLowerCase() === 'prn' || jobTypeValue.toLowerCase() === 'per diem' || jobTypeValue.toLowerCase() === 'per-diem') {
        displayName = 'Per Diem';
      } else {
        // Replace hyphens with spaces BEFORE processing (Full-time → Full Time)
        // Then title case for consistent display
        const normalizedValue = jobTypeValue.replace(/-/g, ' ');
        displayName = normalizedValue.split(' ').map(word => 
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

    // Format experience levels and merge case-insensitive duplicates
    const experienceLevelsMap = new Map();
    experienceLevels.forEach(el => {
      const experienceLevelValue = el.experienceLevel; // Raw DB value
      // Replace hyphens with spaces BEFORE processing (new-grad → New Grad)
      // Then normalize to Title Case for consistent display
      const normalizedValue = experienceLevelValue.replace(/-/g, ' ');
      const displayName = normalizedValue
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Merge duplicates by displayName (case-insensitive)
      if (experienceLevelsMap.has(displayName)) {
        experienceLevelsMap.get(displayName).count += el._count.id;
      } else {
        experienceLevelsMap.set(displayName, {
          name: displayName,
          count: el._count.id,
          slug: displayName.toLowerCase().replace(/\s+/g, '-')
        });
      }
    });
    const experienceLevelsFormatted = Array.from(experienceLevelsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Format shift types and merge case-insensitive duplicates using shiftTypes constants
    const shiftTypesMap = new Map();
    shiftTypes.forEach(st => {
      const shiftTypeValue = st.shiftType; // Raw DB value (e.g., "days", "nights", "Day", "Night")
      // Use the shiftTypeToSlug to get consistent slug, then shiftTypeToDisplay for display name
      const slug = shiftTypeToSlug(shiftTypeValue);
      if (!slug) return; // Skip unknown shift types

      const displayName = shiftTypeToDisplay(slug);
      if (!displayName) return;

      // Merge duplicates by slug (e.g., "days" and "Day" both map to "day-shift")
      if (shiftTypesMap.has(slug)) {
        shiftTypesMap.get(slug).count += st._count.id;
      } else {
        shiftTypesMap.set(slug, {
          name: displayName,
          count: st._count.id,
          slug: slug
        });
      }
    });
    const shiftTypesFormatted = Array.from(shiftTypesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      data: {
        states: statesFormatted,
        employers: employersFormatted,
        specialties: specialtiesFormatted,
        jobTypes: jobTypesFormatted,
        experienceLevels: experienceLevelsFormatted,
        shiftTypes: shiftTypesFormatted
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

