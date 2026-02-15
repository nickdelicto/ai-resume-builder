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
    const weeksNum = parseInt(req.query.weeks || '26');

    // Fetch summaries
    const summaries = await prisma.bingSiteSummary.findMany({
      orderBy: { date: 'asc' },
      take: weeksNum,
    });

    const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
    const previousSummary = summaries.length > 1 ? summaries[summaries.length - 2] : null;

    let topPages = [];
    let topQueries = [];
    let recentAlerts = [];
    let winners = [];
    let losers = [];

    if (latestSummary) {
      // Fetch top pages, queries, and alerts in parallel
      [topPages, topQueries, recentAlerts] = await Promise.all([
        prisma.bingPageMetric.findMany({
          where: { date: latestSummary.date },
          orderBy: { clicks: 'desc' },
          take: 200,
        }),
        prisma.bingQueryMetric.findMany({
          where: { date: latestSummary.date },
          orderBy: { clicks: 'desc' },
          take: 200,
        }),
        prisma.bingAlert.findMany({
          orderBy: [{ date: 'desc' }, { severity: 'asc' }],
          take: 50,
        }),
      ]);

      // Bing page data can lag behind query data by a week.
      // If no pages for the latest date, fall back to the most recent week with pages.
      if (topPages.length === 0) {
        const fallbackPage = await prisma.bingPageMetric.findFirst({
          orderBy: { date: 'desc' },
          select: { date: true },
        });
        if (fallbackPage) {
          topPages = await prisma.bingPageMetric.findMany({
            where: { date: fallbackPage.date },
            orderBy: { clicks: 'desc' },
            take: 200,
          });
        }
      }

      // Use the date that pages are from for winners/losers calculation
      const pagesDate = topPages.length > 0 ? topPages[0].date : latestSummary.date;

      // Compute winners & losers (compare latest page week vs avg of previous 4 weeks)
      const latestPages = await prisma.bingPageMetric.findMany({
        where: { date: pagesDate, clicks: { gte: 1 } },
        orderBy: { clicks: 'desc' },
        take: 100,
      });

      for (const page of latestPages) {
        const history = await prisma.bingPageMetric.findMany({
          where: {
            page: page.page,
            date: { lt: pagesDate },
          },
          orderBy: { date: 'desc' },
          take: 4,
        });

        if (history.length < 2) continue;

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

    return res.status(200).json({
      summaries,
      latestSummary,
      previousSummary,
      topPages,
      topQueries,
      alerts: recentAlerts,
      winners,
      losers,
      aiSummary: latestSummary?.aiSummary || null,
      configured: !!process.env.BING_WEBMASTER_API_KEY,
    });
  } catch (error) {
    console.error('Error fetching Bing data:', error);
    return res.status(500).json({ error: 'Failed to fetch Bing data' });
  }
}
