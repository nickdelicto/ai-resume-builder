import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Multiplier for fetching extra jobs for interleaving
 * We fetch 3x the page size to have enough jobs from different employers to interleave
 */
const INTERLEAVE_MULTIPLIER = 3;

/**
 * Interleave jobs by employer for variety on listing pages
 * Takes jobs (typically 3x the page size) and round-robin selects from each employer
 * This prevents pages from being dominated by a single employer when jobs are scraped in batches
 * @param {Array} jobs - Jobs fetched from database (should be 3x desired count)
 * @param {number} desiredCount - Number of jobs to return (page size)
 * @returns {Array} - Interleaved jobs with employer variety
 */
function interleaveJobsByEmployer(jobs, desiredCount) {
  if (!jobs || jobs.length === 0) return [];
  if (jobs.length <= 1) return jobs.slice(0, desiredCount);

  // Group jobs by employer (preserve order within each employer)
  const byEmployer = new Map();
  for (const job of jobs) {
    const employerId = job.employerId || job.employer?.id || 'unknown';
    if (!byEmployer.has(employerId)) {
      byEmployer.set(employerId, []);
    }
    byEmployer.get(employerId).push(job);
  }

  // Round-robin pick from each employer
  const result = [];
  const employerQueues = Array.from(byEmployer.values());

  // Keep picking until we have enough or run out
  while (result.length < desiredCount && employerQueues.some(q => q.length > 0)) {
    for (const queue of employerQueues) {
      if (queue.length > 0 && result.length < desiredCount) {
        result.push(queue.shift());
      }
    }
  }

  return result;
}

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
      experienceLevel,
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

    // Filter by specialty (case-insensitive, handle legacy tags and hyphen variations)
    if (specialty) {
      const normalized = specialty.toLowerCase();
      // If user selects "General Nursing", also match legacy "All Specialties" tags
      if (normalized === 'general nursing') {
        // Use IN to match multiple possible values
        where.specialty = {
          in: ['General Nursing', 'general nursing', 'All Specialties', 'all specialties']
        };
      } else if (normalized === 'med surg') {
        // Match both space and hyphen versions
        where.specialty = {
          in: ['Med Surg', 'med surg', 'Med-Surg', 'med-surg']
        };
      } else {
        // Case-insensitive match for others
        where.specialty = {
          mode: 'insensitive',
          equals: specialty
        };
      }
    }

    // Filter by employer
    if (employerSlug) {
      where.employer = {
        slug: employerSlug
      };
    }

    // Filter by job type (handle case-insensitive and multiple formats)
    if (jobType) {
      // Normalize input to match possible DB values
      // Frontend sends display format (e.g., "PRN", "Full Time", "Per Diem")
      // DB might have "prn", "full time", "Full Time", "Full-time", "Part-time", "per diem", etc.
      const normalized = jobType.toLowerCase().replace(/-/g, ' ');
      if (normalized === 'prn' || normalized === 'per diem') {
        // Match any variation of PRN/Per Diem
        where.jobType = {
          in: ['prn', 'PRN', 'per diem', 'Per Diem', 'Per-Diem', 'per-diem']
        };
      } else if (normalized === 'full time') {
        // Match both space and hyphen versions
        where.jobType = {
          in: ['Full Time', 'full time', 'Full-time', 'full-time']
        };
      } else if (normalized === 'part time') {
        // Match both space and hyphen versions
        where.jobType = {
          in: ['Part Time', 'part time', 'Part-time', 'part-time']
        };
      } else {
        // Case-insensitive match for others (Contract, Travel, etc.)
        where.jobType = {
          mode: 'insensitive',
          equals: jobType
        };
      }
    }

    // Filter by experience level (handle case-insensitive and hyphen variations)
    if (experienceLevel) {
      const normalized = experienceLevel.toLowerCase();
      if (normalized === 'new grad') {
        // Match both space and hyphen versions
        where.experienceLevel = {
          in: ['New Grad', 'new grad', 'New-Grad', 'new-grad']
        };
      } else {
        // Case-insensitive match for others (Entry Level, Experienced, Senior, Leadership)
        where.experienceLevel = {
          mode: 'insensitive',
          equals: experienceLevel
        };
      }
    }

    // Search in title and description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch jobs with employer info
    // Skip interleaving when filtering by employer (all jobs from same employer)
    const shouldInterleave = !employerSlug;
    const fetchMultiplier = shouldInterleave ? INTERLEAVE_MULTIPLIER : 1;

    const [rawJobs, total] = await Promise.all([
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
        take: limitNum * fetchMultiplier
      }),
      prisma.nursingJob.count({ where })
    ]);

    // Interleave jobs for employer variety (unless filtering by employer)
    const jobs = shouldInterleave ? interleaveJobsByEmployer(rawJobs, limitNum) : rawJobs;

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
