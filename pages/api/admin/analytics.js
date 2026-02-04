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

  // Get custom date from query params (format: YYYY-MM-DD)
  // For comparison mode: dateA and dateB
  const { date: customDate, dateA, dateB } = req.query;

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

    // Parse custom date if provided (format: YYYY-MM-DD)
    // Returns { start: Date, end: Date } for the full day in EST
    const getCustomDateRange = (dateStr) => {
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date at midnight EST for the given date
      const estDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      // Convert to UTC (same logic as getESTMidnight)
      const utcNow = new Date();
      const estNow = new Date(utcNow.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const offsetMs = utcNow.getTime() - estNow.getTime();
      const start = new Date(estDate.getTime() + offsetMs);
      // End is start of next day
      const nextDay = new Date(estDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const end = new Date(nextDay.getTime() + offsetMs);
      return { start, end };
    };

    const customDateRange = getCustomDateRange(customDate);

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

    // Get counts for custom date (if provided)
    let customPageViews = 0, customApplyClicks = 0, customEmployerRedirects = 0, customModalSubscribes = 0;
    if (customDateRange) {
      [customPageViews, customApplyClicks, customEmployerRedirects, customModalSubscribes] = await Promise.all([
        prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: customDateRange.start, lt: customDateRange.end } } }),
        prisma.analyticsEvent.count({ where: { eventType: 'apply_click', createdAt: { gte: customDateRange.start, lt: customDateRange.end } } }),
        prisma.analyticsEvent.count({ where: { eventType: 'employer_redirect', createdAt: { gte: customDateRange.start, lt: customDateRange.end } } }),
        prisma.analyticsEvent.count({ where: { eventType: 'modal_subscribe', createdAt: { gte: customDateRange.start, lt: customDateRange.end } } })
      ]);
    }

    // Comparison mode: Get counts for dateA and dateB
    let comparison = null;
    const dateARangeData = getCustomDateRange(dateA);
    const dateBRangeData = getCustomDateRange(dateB);

    if (dateARangeData && dateBRangeData) {
      const [periodA, periodB] = await Promise.all([
        // Period A counts
        Promise.all([
          prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: dateARangeData.start, lt: dateARangeData.end } } }),
          prisma.analyticsEvent.count({ where: { eventType: 'apply_click', createdAt: { gte: dateARangeData.start, lt: dateARangeData.end } } }),
          prisma.analyticsEvent.count({ where: { eventType: 'employer_redirect', createdAt: { gte: dateARangeData.start, lt: dateARangeData.end } } }),
          prisma.analyticsEvent.count({ where: { eventType: 'modal_subscribe', createdAt: { gte: dateARangeData.start, lt: dateARangeData.end } } })
        ]),
        // Period B counts
        Promise.all([
          prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: dateBRangeData.start, lt: dateBRangeData.end } } }),
          prisma.analyticsEvent.count({ where: { eventType: 'apply_click', createdAt: { gte: dateBRangeData.start, lt: dateBRangeData.end } } }),
          prisma.analyticsEvent.count({ where: { eventType: 'employer_redirect', createdAt: { gte: dateBRangeData.start, lt: dateBRangeData.end } } }),
          prisma.analyticsEvent.count({ where: { eventType: 'modal_subscribe', createdAt: { gte: dateBRangeData.start, lt: dateBRangeData.end } } })
        ])
      ]);

      // Calculate deltas: how Date B (new) compares to Date A (old)
      // Positive = Date B is higher, Negative = Date B is lower
      const calcDelta = (oldVal, newVal) => {
        const diff = newVal - oldVal;
        const pct = oldVal === 0 ? (newVal > 0 ? 100 : 0) : ((diff / oldVal) * 100);
        return { diff, pct: parseFloat(pct.toFixed(1)) };
      };

      comparison = {
        dateA,
        dateB,
        periodA: {
          pageViews: periodA[0],
          applyClicks: periodA[1],
          employerRedirects: periodA[2],
          modalSubscribes: periodA[3]
        },
        periodB: {
          pageViews: periodB[0],
          applyClicks: periodB[1],
          employerRedirects: periodB[2],
          modalSubscribes: periodB[3]
        },
        delta: {
          pageViews: calcDelta(periodA[0], periodB[0]),
          applyClicks: calcDelta(periodA[1], periodB[1]),
          employerRedirects: calcDelta(periodA[2], periodB[2]),
          modalSubscribes: calcDelta(periodA[3], periodB[3])
        }
      };
    }

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
        // Custom date data (only if date param provided)
        ...(customDateRange && {
          custom: {
            date: customDate,
            pageViews: customPageViews,
            applyClicks: customApplyClicks,
            employerRedirects: customEmployerRedirects,
            modalSubscribes: customModalSubscribes
          }
        }),
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
      recentKnownUsers: recentKnownUsers,
      // Comparison data (only if both dateA and dateB provided)
      ...(comparison && { comparison })
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
