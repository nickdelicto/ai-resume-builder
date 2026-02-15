/**
 * Bing Analysis Service
 * Generates AI-powered analysis from Bing Webmaster Tools data
 *
 * Used by:
 * - scripts/pull-bing-data.js (weekly AI summary)
 * - pages/api/admin/bing-chat.js (chat interface)
 */

const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaClient();

const SYSTEM_PROMPT_REPORT = `You are an honest SEO analyst for IntelliResume, a nursing job board at intelliresume.net.
You write weekly Bing Webmaster Tools search performance reports for the site owner. Your job is to tell the truth — good or bad — backed by data.

**Formatting rules (MANDATORY):**
- Use markdown formatting: **bold** for key numbers and important terms, bullet lists, and ## headers for sections
- Use emoji in section headers to make the report scannable and visually engaging:
  - 📊 for traffic/overview sections
  - 🏆 for winners/gains
  - 📉 for losers/drops
  - ⚠️ for concerns/warnings
  - 🎯 for action items/recommendations
  - 🔍 for query/keyword insights
- Use bullet points (- prefix) to make data easy to scan
- Bold the most important numbers: e.g., "Clicks jumped to **47** (up from **31**)"

**Content rules:**
- Honest. If performance is bad, say it plainly. Do not sugarcoat or hedge. If it's good, celebrate it.
- Every claim must be backed by a specific number from the data. Never say "performing well" without the stat.
- Lead with the single most important thing the owner needs to know this week.
- ALWAYS include the full URL when mentioning any page (e.g., https://intelliresume.net/jobs/nursing/ohio)
- End with 1-2 specific, actionable recommendations under 🎯 Action Items
- Keep it under 600 words
- Note: Bing data is weekly (not daily like Google), so trends are week-over-week

The site is a nursing job board with pages like:
- /jobs/nursing/[state] (state job listing pages)
- /jobs/nursing/[city] (city pages)
- /jobs/nursing/[specialty] (specialty like icu, emergency, etc.)
- /jobs/nursing/remote (remote jobs)
- /jobs/nursing/employer/[slug] (employer pages)
- /jobs/nursing/[slug] (individual job pages)
- /nursing-resume-builder (resume builder tool)
- /blog/* (blog posts)`;

const SYSTEM_PROMPT_CHAT = `You are an honest SEO analyst for IntelliResume (intelliresume.net), a nursing job board.
You answer questions about the site's Bing search performance data.

**Formatting rules (MANDATORY):**
- Use markdown: **bold** key numbers, bullet lists for data points, ## or ### headers when organizing longer answers
- Use emoji to make responses visually engaging and scannable:
  - 📊 traffic data, 🏆 wins/gains, 📉 drops, ⚠️ warnings, 🎯 recommendations, 🔍 queries
- Bold important numbers: "This page got **12 clicks** (up **+40%** from the 4-week avg of **8.5**)"
- Use bullet lists when presenting multiple data points

**Content rules:**
- Be honest. Bad news is bad news — say it directly with the numbers to prove it.
- Every claim must reference specific numbers from the data. Never make vague statements.
- Be conversational but data-driven. Give actionable insights.
- If you don't have enough data, say so honestly.
- Keep answers concise but thorough (2-5 paragraphs).
- ALWAYS include the full URL from the data when mentioning any page.
- Never describe a page vaguely — always include the actual URL from the data you were given.
- This is BING data (not Google). Make that clear when relevant — Bing traffic patterns can differ from Google.
- Bing data is weekly (not daily), so trends are week-over-week.

You have access to Bing search analytics: clicks, impressions, CTR, position by page and by query (weekly data).`;

/**
 * Generate weekly AI report for latest Bing data
 * @param {string} dateStr - YYYY-MM-DD (week-ending date)
 */
async function generateWeeklyReport(dateStr) {
  const targetDate = new Date(dateStr);

  // Gather context in parallel
  const [todaySummary, recentSummaries, todayAlerts, topPages, topQueries] = await Promise.all([
    prisma.bingSiteSummary.findUnique({ where: { date: targetDate } }),
    prisma.bingSiteSummary.findMany({
      orderBy: { date: 'desc' },
      take: 12,
    }),
    prisma.bingAlert.findMany({
      where: { date: targetDate },
      orderBy: { severity: 'asc' },
    }),
    prisma.bingPageMetric.findMany({
      where: { date: targetDate },
      orderBy: { clicks: 'desc' },
      take: 15,
    }),
    prisma.bingQueryMetric.findMany({
      where: { date: targetDate },
      orderBy: { clicks: 'desc' },
      take: 15,
    }),
  ]);

  if (!todaySummary) {
    return null;
  }

  // Trend text
  const trendText = recentSummaries
    .slice()
    .reverse()
    .map(s => `${s.date.toISOString().split('T')[0]}: ${s.totalClicks} clicks, ${s.totalImpressions} impr, pos ${s.avgPosition.toFixed(1)}`)
    .join('\n');

  const alertsText = todayAlerts.length > 0
    ? todayAlerts.map(a => `[${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n')
    : 'No alerts this week.';

  const pagesText = topPages.map((p, i) =>
    `${i + 1}. ${p.page} — ${p.clicks} clicks, ${p.impressions} impr, pos ${p.position.toFixed(1)}`
  ).join('\n');

  const queriesText = topQueries.map((q, i) =>
    `${i + 1}. "${q.query}" — ${q.clicks} clicks, ${q.impressions} impr, pos ${q.position.toFixed(1)}`
  ).join('\n');

  // Winners/losers
  const latestPages = await prisma.bingPageMetric.findMany({
    where: { date: targetDate, clicks: { gte: 1 } },
    orderBy: { clicks: 'desc' },
    take: 100,
  });

  const pageMovers = [];
  for (const page of latestPages) {
    const history = await prisma.bingPageMetric.findMany({
      where: { page: page.page, date: { lt: targetDate } },
      orderBy: { date: 'desc' },
      take: 4,
    });
    if (history.length < 2) continue;
    const avgClicks = history.reduce((s, r) => s + r.clicks, 0) / history.length;
    if (avgClicks < 1) continue;
    const clicksChange = ((page.clicks - avgClicks) / avgClicks) * 100;
    pageMovers.push({
      page: page.page,
      thisWeek: page.clicks,
      avgClicks: Math.round(avgClicks),
      change: Math.round(clicksChange),
      position: page.position,
    });
  }

  const winners = pageMovers.filter(p => p.change > 20).sort((a, b) => b.change - a.change).slice(0, 10);
  const losers = pageMovers.filter(p => p.change < -20).sort((a, b) => a.change - b.change).slice(0, 10);

  const winnersText = winners.length > 0
    ? winners.map(w => `${w.page}: ${w.thisWeek} clicks (was ${w.avgClicks} avg, ${w.change > 0 ? '+' : ''}${w.change}%)`).join('\n')
    : 'No standout winners this week.';

  const losersText = losers.length > 0
    ? losers.map(l => `${l.page}: ${l.thisWeek} clicks (was ${l.avgClicks} avg, ${l.change}%)`).join('\n')
    : 'No significant losers this week.';

  const userPrompt = `Generate this week's Bing SEO report for week ending ${dateStr}.

SITE TOTALS THIS WEEK:
- Clicks: ${todaySummary.totalClicks}
- Impressions: ${todaySummary.totalImpressions}
- Avg CTR: ${(todaySummary.avgCtr * 100).toFixed(2)}%
- Avg Position: ${todaySummary.avgPosition.toFixed(1)}
- Pages with traffic: ${todaySummary.totalPages}
- Queries driving traffic: ${todaySummary.totalQueries}

WEEKLY TREND (recent 12 weeks):
${trendText}

ALERTS (${todayAlerts.length}):
${alertsText}

PAGE-LEVEL WINNERS (gaining clicks vs prior weeks):
${winnersText}

PAGE-LEVEL LOSERS (losing clicks vs prior weeks):
${losersText}

TOP 15 PAGES BY CLICKS:
${pagesText}

TOP 15 QUERIES:
${queriesText}

Write the weekly report. Be conversational and actionable. Name specific pages that are driving gains or losses.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_REPORT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const report = response.choices[0].message.content.trim();

  await prisma.bingSiteSummary.update({
    where: { date: targetDate },
    data: { aiSummary: report },
  });

  return report;
}

/**
 * Answer a Bing SEO question using stored data
 * @param {string} question
 * @returns {Promise<string>}
 */
async function answerBingQuestion(question) {
  // Get recent summaries (all available weekly data)
  const [recentSummaries, recentAlerts] = await Promise.all([
    prisma.bingSiteSummary.findMany({
      orderBy: { date: 'desc' },
      take: 12,
    }),
    prisma.bingAlert.findMany({
      orderBy: [{ date: 'desc' }, { severity: 'asc' }],
      take: 30,
    }),
  ]);

  if (recentSummaries.length === 0) {
    return 'I don\'t have any Bing data yet. Run the pull-bing-data.js script first to populate the database.';
  }

  const latestDate = recentSummaries[0]?.date;
  const lowerQ = question.toLowerCase();
  let pageData = [];
  let queryData = [];

  // Check if user pasted a URL
  const urlMatch = question.match(/(?:https?:\/\/[^\s]+|(?:\/jobs\/[^\s?#]+|\/nursing-resume-builder|\/blog\/[^\s?#]+))/i);
  if (urlMatch) {
    let searchUrl = urlMatch[0];
    if (searchUrl.startsWith('http')) {
      try { searchUrl = new URL(searchUrl).origin + new URL(searchUrl).pathname; } catch {}
    }
    searchUrl = searchUrl.replace(/\/$/, '');

    pageData = await prisma.bingPageMetric.findMany({
      where: { page: { contains: searchUrl, mode: 'insensitive' } },
      orderBy: { date: 'desc' },
    });
  }

  // Keyword extraction for page/query lookup
  if (pageData.length === 0) {
    const keywords = lowerQ
      .replace(/[?.,!'"]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['what', 'which', 'how', 'does', 'about', 'this', 'that', 'from', 'with', 'have', 'been', 'bing', 'search', 'traffic', 'clicks', 'impressions', 'page', 'pages', 'query', 'queries', 'best', 'worst', 'performance'].includes(w));

    if (keywords.length > 0) {
      const searchTerm = keywords.slice(0, 3).join(' ');
      [pageData, queryData] = await Promise.all([
        prisma.bingPageMetric.findMany({
          where: {
            page: { contains: searchTerm, mode: 'insensitive' },
            date: latestDate,
          },
          orderBy: { clicks: 'desc' },
          take: 20,
        }),
        prisma.bingQueryMetric.findMany({
          where: {
            query: { contains: searchTerm, mode: 'insensitive' },
            date: latestDate,
          },
          orderBy: { clicks: 'desc' },
          take: 20,
        }),
      ]);
    }
  }

  // If no keyword match, get overall top pages/queries
  if (pageData.length === 0 && queryData.length === 0) {
    [pageData, queryData] = await Promise.all([
      prisma.bingPageMetric.findMany({
        where: { date: latestDate },
        orderBy: { clicks: 'desc' },
        take: 20,
      }),
      prisma.bingQueryMetric.findMany({
        where: { date: latestDate },
        orderBy: { clicks: 'desc' },
        take: 20,
      }),
    ]);
  }

  // Build context
  const summaryText = recentSummaries
    .slice()
    .reverse()
    .map(s => `${s.date.toISOString().split('T')[0]}: ${s.totalClicks} clicks, ${s.totalImpressions} impr, CTR ${(s.avgCtr * 100).toFixed(1)}%, pos ${s.avgPosition.toFixed(1)}`)
    .join('\n');

  const alertsText = recentAlerts.length > 0
    ? recentAlerts.slice(0, 15).map(a => `[${a.date.toISOString().split('T')[0]} ${a.severity.toUpperCase()}] ${a.title}`).join('\n')
    : 'No alerts.';

  const pageText = pageData.length > 0
    ? pageData.map((p, i) => `${i + 1}. ${p.page} — ${p.clicks}c, ${p.impressions}i, pos ${p.position.toFixed(1)} (${p.date.toISOString().split('T')[0]})`).join('\n')
    : 'No matching page data.';

  const queryText = queryData.length > 0
    ? queryData.map((q, i) => `${i + 1}. "${q.query}" — ${q.clicks}c, ${q.impressions}i, pos ${q.position.toFixed(1)}`).join('\n')
    : 'No matching query data.';

  let context = `BING WEEKLY SITE SUMMARIES (recent weeks):
${summaryText}

RECENT BING ALERTS:
${alertsText}

RELEVANT BING PAGES:
${pageText}

RELEVANT BING QUERIES:
${queryText}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_CHAT },
      { role: 'user', content: `Question: ${question}\n\nData:\n${context}` },
    ],
    temperature: 0.5,
    max_tokens: 800,
  });

  return response.choices[0].message.content.trim();
}

module.exports = {
  generateWeeklyReport,
  answerBingQuestion,
};
