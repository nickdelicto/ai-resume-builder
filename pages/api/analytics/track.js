const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Valid event types
const VALID_EVENT_TYPES = ['page_view', 'apply_click', 'modal_subscribe', 'resume_click', 'employer_redirect'];

/**
 * API Endpoint: Track Analytics Events
 *
 * Records user interactions for internal analytics (page views, clicks, conversions)
 *
 * POST /api/analytics/track
 *
 * Body:
 * - sessionId: string (required) - Links events from same visitor
 * - eventType: string (required) - One of: page_view, apply_click, modal_subscribe, resume_click
 * - email: string (optional) - User email when known (from modal subscription)
 * - jobId: string (optional) - Internal job ID
 * - jobSlug: string (optional) - Job URL slug
 * - sourceUrl: string (required) - Full URL where event occurred
 * - employer: string (optional) - Employer name
 * - specialty: string (optional) - Job specialty
 * - state: string (optional) - State code
 * - city: string (optional) - City name
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    sessionId,
    eventType,
    email,
    jobId,
    jobSlug,
    sourceUrl,
    employer,
    specialty,
    state,
    city
  } = req.body;

  // Validate required fields
  if (!sessionId || !eventType || !sourceUrl) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'sessionId, eventType, and sourceUrl are required'
    });
  }

  // Validate event type
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return res.status(400).json({
      error: 'Invalid event type',
      message: `eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`
    });
  }

  // Skip tracking for admin users to avoid polluting analytics
  const ADMIN_EMAILS = ['delictodelight@gmail.com'];
  if (email && ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
    return res.status(200).json({
      success: true,
      skipped: true,
      reason: 'admin_user'
    });
  }

  try {
    // Deduplicate: For page_view and apply_click, only count once per session per job
    // This prevents inflated numbers from refreshes or repeated modal opens
    const shouldDedupe = ['page_view', 'apply_click'].includes(eventType);

    if (shouldDedupe && jobSlug) {
      const existing = await prisma.analyticsEvent.findFirst({
        where: {
          sessionId,
          eventType,
          jobSlug
        }
      });

      if (existing) {
        // Already tracked this event for this job in this session
        await prisma.$disconnect();
        return res.status(200).json({
          success: true,
          deduplicated: true,
          eventId: existing.id
        });
      }
    }

    // Create the analytics event
    const event = await prisma.analyticsEvent.create({
      data: {
        sessionId,
        eventType,
        email: email?.toLowerCase().trim() || null,
        jobId: jobId || null,
        jobSlug: jobSlug || null,
        sourceUrl,
        employer: employer || null,
        specialty: specialty || null,
        state: state || null,
        city: city || null
      }
    });

    // If this is a modal_subscribe event with an email, backfill previous events
    // from the same session that don't have an email yet
    if (eventType === 'modal_subscribe' && email) {
      const normalizedEmail = email.toLowerCase().trim();

      await prisma.analyticsEvent.updateMany({
        where: {
          sessionId,
          email: null
        },
        data: {
          email: normalizedEmail
        }
      });
    }

    await prisma.$disconnect();

    return res.status(201).json({
      success: true,
      eventId: event.id
    });

  } catch (error) {
    console.error('Error tracking analytics event:', error);
    await prisma.$disconnect();

    return res.status(500).json({
      error: 'Failed to track event',
      message: 'Something went wrong. Please try again.'
    });
  }
}
