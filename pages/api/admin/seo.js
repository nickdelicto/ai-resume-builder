import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminEmails = (process.env.ADMIN_EMAIL || '')
    .split(/[;,]/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(session.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const daysNum = parseInt(req.query.days || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum - 3); // Account for GSC delay

    // Fetch all needed data in parallel
    const [summaries, recentAlerts, latestSummary] = await Promise.all([
      prisma.gscSiteSummary.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: 'asc' },
      }),
      prisma.gscAlert.findMany({
        where: { date: { gte: startDate } },
        orderBy: [{ date: 'desc' }, { severity: 'asc' }],
        take: 50,
      }),
      prisma.gscSiteSummary.findFirst({
        orderBy: { date: 'desc' },
      }),
    ]);

    let topPages = [];
    let topQueries = [];
    let winners = [];
    let losers = [];

    if (latestSummary) {
      // Fetch top pages and queries for latest date
      [topPages, topQueries] = await Promise.all([
        prisma.gscPageMetric.findMany({
          where: { date: latestSummary.date },
          orderBy: { clicks: 'desc' },
          take: 200,
        }),
        prisma.gscQueryMetric.findMany({
          where: { date: latestSummary.date },
          orderBy: { clicks: 'desc' },
          take: 200,
        }),
      ]);

      // Compute winners & losers
      const sevenDaysAgo = new Date(latestSummary.date);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const latestPages = await prisma.gscPageMetric.findMany({
        where: { date: latestSummary.date, clicks: { gte: 1 } },
        orderBy: { clicks: 'desc' },
        take: 100,
      });

      for (const page of latestPages) {
        const history = await prisma.gscPageMetric.findMany({
          where: {
            page: page.page,
            date: { gte: sevenDaysAgo, lt: latestSummary.date },
          },
        });

        if (history.length < 3) continue;

        const avgClicks = history.reduce((s, r) => s + r.clicks, 0) / history.length;
        if (avgClicks < 1) continue;

        const change = ((page.clicks - avgClicks) / avgClicks) * 100;
        const entry = {
          page: page.page,
          clicks: page.clicks,
          avgClicks: Math.round(avgClicks),
          change: Math.round(change),
          impressions: page.impressions,
          position: page.position,
        };

        if (change > 0) winners.push(entry);
        else losers.push(entry);
      }

      winners.sort((a, b) => b.change - a.change);
      losers.sort((a, b) => a.change - b.change);
      winners = winners.slice(0, 10);
      losers = losers.slice(0, 10);
    }

    // Get previous day summary for comparison arrows
    let previousSummary = null;
    if (latestSummary && summaries.length >= 2) {
      previousSummary = summaries[summaries.length - 2];
    }

    return res.status(200).json({
      summaries,
      alerts: recentAlerts,
      latestSummary,
      previousSummary,
      topPages,
      topQueries,
      winners,
      losers,
      aiSummary: latestSummary?.aiSummary || null,
    });
  } catch (error) {
    console.error('Error fetching SEO data:', error);
    return res.status(500).json({ error: 'Failed to fetch SEO data' });
  }
}
