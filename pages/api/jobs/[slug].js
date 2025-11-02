import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API Route: GET /api/jobs/[slug]
 * Fetch a single job by slug
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const job = await prisma.nursingJob.findUnique({
      where: { slug },
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            slug: true,
            careerPageUrl: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Get related jobs (same specialty or same city)
    const relatedJobs = await prisma.nursingJob.findMany({
      where: {
        id: { not: job.id },
        isActive: true,
        OR: [
          { specialty: job.specialty },
          { city: job.city, state: job.state }
        ]
      },
      include: {
        employer: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      take: 5,
      orderBy: {
        scrapedAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        job,
        relatedJobs
      }
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch job',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
