const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * API Endpoint: Get User Journeys
 *
 * Returns analytics events grouped by email for journey visualization.
 * Shows the path each known user took through the site.
 *
 * GET /api/admin/user-journeys
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin auth
  const authHeader = req.headers.cookie;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all events for users who have email (known users)
    // Group by email and order by time
    const events = await prisma.analyticsEvent.findMany({
      where: {
        email: { not: null }
      },
      orderBy: [
        { email: 'asc' },
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        sessionId: true,
        eventType: true,
        email: true,
        jobSlug: true,
        employer: true,
        specialty: true,
        state: true,
        city: true,
        createdAt: true
      }
    });

    // Group events by email
    const journeyMap = new Map();

    for (const event of events) {
      const email = event.email;
      if (!journeyMap.has(email)) {
        journeyMap.set(email, {
          email,
          events: [],
          firstSeen: event.createdAt,
          lastSeen: event.createdAt
        });
      }

      const journey = journeyMap.get(email);
      journey.events.push(event);
      journey.lastSeen = event.createdAt;
    }

    // Convert to array and add summary info
    const journeys = Array.from(journeyMap.values()).map(journey => {
      // Count event types
      const eventCounts = {
        page_view: 0,
        apply_click: 0,
        employer_redirect: 0,
        modal_subscribe: 0
      };

      // Get unique jobs viewed
      const jobsViewed = new Set();
      const employers = new Set();

      for (const event of journey.events) {
        if (eventCounts[event.eventType] !== undefined) {
          eventCounts[event.eventType]++;
        }
        if (event.jobSlug) {
          jobsViewed.add(event.jobSlug);
        }
        if (event.employer) {
          employers.add(event.employer);
        }
      }

      return {
        email: journey.email,
        eventCounts,
        totalEvents: journey.events.length,
        uniqueJobsViewed: jobsViewed.size,
        employers: Array.from(employers).slice(0, 3), // Top 3 employers
        firstSeen: journey.firstSeen,
        lastSeen: journey.lastSeen,
        events: journey.events
      };
    });

    // Sort by last activity (most recent first)
    journeys.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

    // Limit to most recent 50 users
    const limitedJourneys = journeys.slice(0, 50);

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      journeys: limitedJourneys,
      totalKnownUsers: journeys.length
    });

  } catch (error) {
    console.error('Error fetching user journeys:', error);
    await prisma.$disconnect();
    return res.status(500).json({
      error: 'Failed to fetch user journeys',
      message: error.message
    });
  }
}
