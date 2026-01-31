const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Merge clicks and applications data for breakdowns
 * Returns array sorted by total (clicks + applied)
 */
function mergeBreakdownData(clicksData, appliedData, field) {
  const merged = new Map();

  // Add clicks data
  for (const item of clicksData) {
    const name = item[field];
    merged.set(name, { name, clicks: item._count[field], applied: 0 });
  }

  // Add/merge applied data
  for (const item of appliedData) {
    const name = item[field];
    if (merged.has(name)) {
      merged.get(name).applied = item._count[field];
    } else {
      merged.set(name, { name, clicks: 0, applied: item._count[field] });
    }
  }

  // Convert to array and sort by total (clicks + applied)
  return Array.from(merged.values())
    .sort((a, b) => (b.clicks + b.applied) - (a.clicks + a.applied))
    .slice(0, 10);
}

/**
 * Merge city breakdown data (includes state for display)
 */
function mergeCityBreakdownData(clicksData, appliedData) {
  const merged = new Map();

  for (const item of clicksData) {
    const key = `${item.city}-${item.state}`;
    merged.set(key, {
      name: item.city,
      state: item.state,
      clicks: item._count.city,
      applied: 0
    });
  }

  for (const item of appliedData) {
    const key = `${item.city}-${item.state}`;
    if (merged.has(key)) {
      merged.get(key).applied = item._count.city;
    } else {
      merged.set(key, {
        name: item.city,
        state: item.state,
        clicks: 0,
        applied: item._count.city
      });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (b.clicks + b.applied) - (a.clicks + a.applied))
    .slice(0, 10);
}

/**
 * API Endpoint: Get Analytics Data
 *
 * Returns aggregated analytics data for the admin dashboard:
 * - Funnel metrics (page views -> apply clicks -> modal subscriptions)
 * - Conversion rates
 * - Breakdowns by employer, specialty, state
 * - Time-based trends
 *
 * GET /api/admin/analytics
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
    // Get date boundaries in EST/New York timezone
    // This ensures "today" means today in EST, not UTC
    const getESTMidnight = (daysAgo = 0) => {
      const now = new Date();
      // Format current time in EST to get the EST date components
      const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const estDate = new Date(estString);
      // Set to midnight EST
      estDate.setHours(0, 0, 0, 0);
      // Subtract days if needed
      estDate.setDate(estDate.getDate() - daysAgo);
      // Convert back: find the UTC time when it's midnight EST
      // EST is UTC-5 (or UTC-4 during DST)
      const estMidnightString = estDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
      // Parse and find offset
      const utcNow = new Date();
      const estNow = new Date(utcNow.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const offsetMs = utcNow.getTime() - estNow.getTime();
      // Return UTC time that corresponds to EST midnight
      return new Date(estDate.getTime() + offsetMs);
    };

    const todayStart = getESTMidnight(0);
    const weekStart = getESTMidnight(7);
    const monthStart = getESTMidnight(30);

    // Get total counts by event type
    const [totalPageViews, totalApplyClicks, totalEmployerRedirects, totalModalSubscribes] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: 'page_view' } }),
      prisma.analyticsEvent.count({ where: { eventType: 'apply_click' } }),
      prisma.analyticsEvent.count({ where: { eventType: 'employer_redirect' } }),
      prisma.analyticsEvent.count({ where: { eventType: 'modal_subscribe' } })
    ]);

    // Get counts for today
    const [todayPageViews, todayApplyClicks, todayEmployerRedirects, todayModalSubscribes] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: todayStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'apply_click', createdAt: { gte: todayStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'employer_redirect', createdAt: { gte: todayStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'modal_subscribe', createdAt: { gte: todayStart } } })
    ]);

    // Get counts for last 7 days
    const [weekPageViews, weekApplyClicks, weekEmployerRedirects, weekModalSubscribes] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: weekStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'apply_click', createdAt: { gte: weekStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'employer_redirect', createdAt: { gte: weekStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'modal_subscribe', createdAt: { gte: weekStart } } })
    ]);

    // Get counts for last 30 days
    const [monthPageViews, monthApplyClicks, monthEmployerRedirects, monthModalSubscribes] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: monthStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'apply_click', createdAt: { gte: monthStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'employer_redirect', createdAt: { gte: monthStart } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'modal_subscribe', createdAt: { gte: monthStart } } })
    ]);

    // Get unique sessions and emails
    const uniqueSessions = await prisma.analyticsEvent.groupBy({
      by: ['sessionId'],
      _count: true
    });

    const uniqueEmails = await prisma.analyticsEvent.groupBy({
      by: ['email'],
      where: { email: { not: null } },
      _count: true
    });

    // Get top employers by apply clicks AND applications
    const [topEmployersClicks, topEmployersApplied] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ['employer'],
        where: { eventType: 'apply_click', employer: { not: null } },
        _count: { employer: true },
        orderBy: { _count: { employer: 'desc' } },
        take: 10
      }),
      prisma.analyticsEvent.groupBy({
        by: ['employer'],
        where: { eventType: 'employer_redirect', employer: { not: null } },
        _count: { employer: true },
        orderBy: { _count: { employer: 'desc' } },
        take: 10
      })
    ]);

    // Get top specialties by apply clicks AND applications
    const [topSpecialtiesClicks, topSpecialtiesApplied] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ['specialty'],
        where: { eventType: 'apply_click', specialty: { not: null } },
        _count: { specialty: true },
        orderBy: { _count: { specialty: 'desc' } },
        take: 10
      }),
      prisma.analyticsEvent.groupBy({
        by: ['specialty'],
        where: { eventType: 'employer_redirect', specialty: { not: null } },
        _count: { specialty: true },
        orderBy: { _count: { specialty: 'desc' } },
        take: 10
      })
    ]);

    // Get top states by apply clicks AND applications
    const [topStatesClicks, topStatesApplied] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ['state'],
        where: { eventType: 'apply_click', state: { not: null } },
        _count: { state: true },
        orderBy: { _count: { state: 'desc' } },
        take: 10
      }),
      prisma.analyticsEvent.groupBy({
        by: ['state'],
        where: { eventType: 'employer_redirect', state: { not: null } },
        _count: { state: true },
        orderBy: { _count: { state: 'desc' } },
        take: 10
      })
    ]);

    // Get top cities by apply clicks AND applications
    const [topCitiesClicks, topCitiesApplied] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ['city', 'state'],
        where: { eventType: 'apply_click', city: { not: null } },
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10
      }),
      prisma.analyticsEvent.groupBy({
        by: ['city', 'state'],
        where: { eventType: 'employer_redirect', city: { not: null } },
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10
      })
    ]);

    // Get daily stats for the last 14 days (for chart)
    const dailyStats = await prisma.$queryRaw`
      SELECT
        DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York') as date,
        "eventType",
        COUNT(*)::int as count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)}
      GROUP BY DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'), "eventType"
      ORDER BY date DESC
    `;

    // Get recent events with emails (known users)
    const recentKnownUsers = await prisma.analyticsEvent.findMany({
      where: { email: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        sessionId: true,
        eventType: true,
        email: true,
        jobSlug: true,
        employer: true,
        specialty: true,
        createdAt: true
      }
    });

    await prisma.$disconnect();

    // Calculate conversion rates
    // Funnel: Page View → Apply Click (modal opens) → Employer Redirect (actually applied) → Modal Subscribe (gave email)
    const applyRate = totalPageViews > 0 ? ((totalApplyClicks / totalPageViews) * 100).toFixed(1) : 0;
    const redirectRate = totalApplyClicks > 0 ? ((totalEmployerRedirects / totalApplyClicks) * 100).toFixed(1) : 0;
    const subscribeRate = totalEmployerRedirects > 0 ? ((totalModalSubscribes / totalEmployerRedirects) * 100).toFixed(1) : 0;

    // Key business metrics
    // 1. Session Conversion: % of visitors who gave email (per-person, not per-page)
    const sessionConversion = uniqueSessions.length > 0
      ? ((uniqueEmails.length / uniqueSessions.length) * 100).toFixed(1)
      : 0;

    // 2. Apply-Through Rate: % of job views that led to actual applications (job board effectiveness)
    const applyThroughRate = totalPageViews > 0
      ? ((totalEmployerRedirects / totalPageViews) * 100).toFixed(1)
      : 0;

    // 3. Email Capture Rate: Of people who applied, what % gave email first? (modal effectiveness)
    const emailCaptureRate = totalEmployerRedirects > 0
      ? ((totalModalSubscribes / totalEmployerRedirects) * 100).toFixed(1)
      : 0;

    return res.status(200).json({
      success: true,
      funnel: {
        total: {
          pageViews: totalPageViews,
          applyClicks: totalApplyClicks,
          employerRedirects: totalEmployerRedirects,
          modalSubscribes: totalModalSubscribes
        },
        today: {
          pageViews: todayPageViews,
          applyClicks: todayApplyClicks,
          employerRedirects: todayEmployerRedirects,
          modalSubscribes: todayModalSubscribes
        },
        week: {
          pageViews: weekPageViews,
          applyClicks: weekApplyClicks,
          employerRedirects: weekEmployerRedirects,
          modalSubscribes: weekModalSubscribes
        },
        month: {
          pageViews: monthPageViews,
          applyClicks: monthApplyClicks,
          employerRedirects: monthEmployerRedirects,
          modalSubscribes: monthModalSubscribes
        },
        rates: {
          applyRate: parseFloat(applyRate),
          redirectRate: parseFloat(redirectRate),
          subscribeRate: parseFloat(subscribeRate)
        },
        // Key business metrics
        keyMetrics: {
          sessionConversion: parseFloat(sessionConversion),    // % of visitors who became leads
          applyThroughRate: parseFloat(applyThroughRate),      // % of job views → applications (job board effectiveness)
          emailCaptureRate: parseFloat(emailCaptureRate)       // % of applicants who gave email (modal effectiveness)
        }
      },
      engagement: {
        uniqueSessions: uniqueSessions.length,
        uniqueEmails: uniqueEmails.length
      },
      breakdowns: {
        employers: mergeBreakdownData(topEmployersClicks, topEmployersApplied, 'employer'),
        specialties: mergeBreakdownData(topSpecialtiesClicks, topSpecialtiesApplied, 'specialty'),
        states: mergeBreakdownData(topStatesClicks, topStatesApplied, 'state'),
        cities: mergeCityBreakdownData(topCitiesClicks, topCitiesApplied)
      },
      dailyStats: dailyStats,
      recentKnownUsers: recentKnownUsers
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    await prisma.$disconnect();
    return res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
}
