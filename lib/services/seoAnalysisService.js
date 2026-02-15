/**
 * SEO Analysis Service
 * Generates AI-powered conversational analysis from GSC data
 *
 * Used by:
 * - scripts/send-seo-report.js (daily email)
 * - pages/api/admin/seo-chat.js (chat interface)
 * - pages/api/admin/seo.js (dashboard summary)
 */

const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaClient();

const SYSTEM_PROMPT_REPORT = `You are an honest SEO analyst for IntelliResume, a nursing job board at intelliresume.net.
You write daily Google Search Console performance reports for the site owner. Your job is to tell the truth — good or bad — backed by data.

**Formatting rules (MANDATORY):**
- Use markdown formatting: **bold** for key numbers and important terms, bullet lists, and ## headers for sections
- Use emoji in section headers to make the report scannable and visually engaging:
  - 📊 for traffic/overview sections
  - 🏆 for winners/gains
  - 📉 for losers/drops
  - ⚠️ for concerns/warnings
  - 🎯 for action items/recommendations
  - 🔍 for query/keyword insights
  - 📱 for device/mobile insights
- Use bullet points (- prefix) to make data easy to scan
- Bold the most important numbers: e.g., "Clicks jumped to **47** (up from **31**)"

**Content rules:**
- Honest. If performance is bad, say it plainly. Do not sugarcoat or hedge. If it's good, celebrate it.
- Every claim must be backed by a specific number from the data. Never say "performing well" without the stat.
- Lead with the single most important thing the owner needs to know today.
- ALWAYS include the full URL when mentioning any page (e.g., https://intelliresume.net/jobs/nursing/ohio)
- End with 1-2 specific, actionable recommendations under 🎯 Action Items
- Keep it under 600 words

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
You answer questions about the site's Google Search Console performance data.

**Formatting rules (MANDATORY):**
- Use markdown: **bold** key numbers, bullet lists for data points, ## or ### headers when organizing longer answers
- Use emoji to make responses visually engaging and scannable:
  - 📊 traffic data, 🏆 wins/gains, 📉 drops, ⚠️ warnings, 🎯 recommendations, 🔍 queries, 📱 mobile/device
- Bold important numbers: "This page got **12 clicks** (up **+40%** from the 7-day avg of **8.5**)"
- Use bullet lists when presenting multiple data points

**Content rules:**
- Be honest. Bad news is bad news — say it directly with the numbers to prove it.
- Every claim must reference specific numbers from the data. Never make vague statements.
- Be conversational but data-driven. Give actionable insights.
- If you don't have enough data, say so honestly.
- Keep answers concise but thorough (2-5 paragraphs).
- ALWAYS include the full URL from the data when mentioning any page.
- Never describe a page vaguely — always include the actual URL from the data you were given.

You have access to these data sources (when relevant data is provided):
- Search analytics: clicks, impressions, CTR, position by page and query (daily)
- URL Inspection: indexing status, crawl info, canonicals, rich results, mobile usability per page
- Sitemap status: submitted vs indexed counts, errors, warnings per sitemap
- Device breakdown: mobile, desktop, tablet traffic splits (daily)
- Page+query cross-reference: which search queries drive traffic to which pages`;

/**
 * Generate the daily AI report
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<{report: string, alerts: Array, summary: object, topPages: Array, topQueries: Array}>}
 */
async function generateDailyReport(dateStr) {
  const targetDate = new Date(dateStr);

  const twentyEightDaysAgo = new Date(targetDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  // Gather all context in parallel
  const [todaySummary, recentSummaries, todayAlerts, topPages, topQueries, deviceMetrics, inspectionSummary] = await Promise.all([
    prisma.gscSiteSummary.findUnique({ where: { date: targetDate } }),
    prisma.gscSiteSummary.findMany({
      where: { date: { gte: twentyEightDaysAgo } },
      orderBy: { date: 'asc' },
    }),
    prisma.gscAlert.findMany({
      where: { date: targetDate },
      orderBy: { severity: 'asc' },
    }),
    prisma.gscPageMetric.findMany({
      where: { date: targetDate },
      orderBy: { clicks: 'desc' },
      take: 15,
    }),
    prisma.gscQueryMetric.findMany({
      where: { date: targetDate },
      orderBy: { clicks: 'desc' },
      take: 15,
    }),
    prisma.gscDeviceMetric.findMany({
      where: { date: targetDate },
    }),
    prisma.gscUrlInspection.groupBy({
      by: ['verdict'],
      _count: { verdict: true },
    }),
  ]);

  if (!todaySummary) {
    return { report: 'No data available for this date.', alerts: [], summary: null, topPages: [], topQueries: [] };
  }

  // Build 7-day trend
  const last7 = recentSummaries.slice(-7);
  const trendText = last7.map(s =>
    `${s.date.toISOString().split('T')[0]}: ${s.totalClicks} clicks, ${s.totalImpressions} impr, pos ${s.avgPosition.toFixed(1)}`
  ).join('\n');

  // Alerts text
  const alertsText = todayAlerts.length > 0
    ? todayAlerts.map(a => `[${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n')
    : 'No alerts today.';

  // Top pages text
  const pagesText = topPages.map((p, i) =>
    `${i + 1}. ${p.page} — ${p.clicks} clicks, ${p.impressions} impr, pos ${p.position.toFixed(1)}`
  ).join('\n');

  // Top queries text
  const queriesText = topQueries.map((q, i) =>
    `${i + 1}. "${q.query}" — ${q.clicks} clicks, ${q.impressions} impr, pos ${q.position.toFixed(1)}`
  ).join('\n');

  // Compute page-level winners & losers (which pages drove the overall change)
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const todayPages = await prisma.gscPageMetric.findMany({
    where: { date: targetDate, clicks: { gte: 1 } },
    orderBy: { clicks: 'desc' },
    take: 100,
  });

  const pageMovers = [];
  for (const page of todayPages) {
    const history = await prisma.gscPageMetric.findMany({
      where: { page: page.page, date: { gte: sevenDaysAgo, lt: targetDate } },
    });
    if (history.length < 3) continue;
    const avgClicks = history.reduce((s, r) => s + r.clicks, 0) / history.length;
    if (avgClicks < 1) continue;
    const avgPos = history.reduce((s, r) => s + r.position, 0) / history.length;
    const clicksChange = ((page.clicks - avgClicks) / avgClicks) * 100;
    const posChange = page.position - avgPos;
    pageMovers.push({
      page: page.page,
      todayClicks: page.clicks,
      avgClicks: Math.round(avgClicks),
      clicksChange: Math.round(clicksChange),
      todayPos: page.position,
      avgPos: avgPos,
      posChange: posChange,
    });
  }

  const winners = pageMovers.filter(p => p.clicksChange > 20).sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 10);
  const losers = pageMovers.filter(p => p.clicksChange < -20).sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 10);

  const winnersText = winners.length > 0
    ? winners.map(w => `${w.page}: ${w.todayClicks} clicks today (was ${w.avgClicks} avg, ${w.clicksChange > 0 ? '+' : ''}${w.clicksChange}%), position ${w.todayPos.toFixed(1)} (was ${w.avgPos.toFixed(1)})`).join('\n')
    : 'No standout winners today.';

  const losersText = losers.length > 0
    ? losers.map(l => `${l.page}: ${l.todayClicks} clicks today (was ${l.avgClicks} avg, ${l.clicksChange}%), position ${l.todayPos.toFixed(1)} (was ${l.avgPos.toFixed(1)})`).join('\n')
    : 'No significant losers today.';

  // Device breakdown text
  const deviceText = deviceMetrics.length > 0
    ? deviceMetrics.map(d => `${d.device}: ${d.clicks} clicks, ${d.impressions} impr, pos ${d.position.toFixed(1)}`).join(', ')
    : 'No device data';

  // Inspection summary text
  const inspectionText = inspectionSummary.length > 0
    ? inspectionSummary.map(g => `${g.verdict}: ${g._count.verdict}`).join(', ')
    : 'No inspection data yet';

  const userPrompt = `Generate today's SEO report for ${dateStr}.

SITE TOTALS TODAY:
- Clicks: ${todaySummary.totalClicks}
- Impressions: ${todaySummary.totalImpressions}
- Avg CTR: ${(todaySummary.avgCtr * 100).toFixed(2)}%
- Avg Position: ${todaySummary.avgPosition.toFixed(1)}
- Pages with traffic: ${todaySummary.totalPages}
- Queries driving traffic: ${todaySummary.totalQueries}
- Device breakdown: ${deviceText}
- Indexing verdicts (all inspected pages): ${inspectionText}

7-DAY TREND:
${trendText}

ALERTS (${todayAlerts.length}):
${alertsText}

PAGE-LEVEL WINNERS (gaining clicks vs 7-day avg):
${winnersText}

PAGE-LEVEL LOSERS (losing clicks vs 7-day avg):
${losersText}

TOP 15 PAGES BY CLICKS:
${pagesText}

TOP 15 QUERIES:
${queriesText}

Write the daily report. Be conversational and actionable. Name specific pages that are driving gains or losses — the owner wants to know exactly WHICH pages are moving the needle.`;

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

  // Save AI summary to the site summary record
  await prisma.gscSiteSummary.update({
    where: { date: targetDate },
    data: { aiSummary: report },
  });

  return { report, alerts: todayAlerts, summary: todaySummary, topPages, topQueries };
}

/**
 * Answer an SEO question using stored GSC data
 * @param {string} question - User's natural language question
 * @returns {Promise<string>} - Conversational answer
 */
async function answerSeoQuestion(question) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 33); // 30 days + 3 day GSC delay

  // Always fetch recent context
  const [recentSummaries, recentAlerts] = await Promise.all([
    prisma.gscSiteSummary.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
    }),
    prisma.gscAlert.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: [{ date: 'desc' }, { severity: 'asc' }],
      take: 50,
    }),
  ]);

  if (recentSummaries.length === 0) {
    return 'I don\'t have any GSC data yet. The data pull script needs to run first to populate the database.';
  }

  const latestDate = recentSummaries[0]?.date;
  const lowerQ = question.toLowerCase();
  let pageData = [];
  let queryData = [];

  // Check if the user pasted a URL — if so, look up that exact page
  const urlMatch = question.match(/(?:https?:\/\/[^\s]+|(?:\/jobs\/[^\s?#]+|\/nursing-resume-builder|\/blog\/[^\s?#]+))/i);
  if (urlMatch) {
    let searchUrl = urlMatch[0];
    // Normalize: strip domain to get path, or keep path if already a path
    if (searchUrl.startsWith('http')) {
      try {
        const urlObj = new URL(searchUrl);
        searchUrl = urlObj.origin + urlObj.pathname;
      } catch (e) {
        // keep as-is
      }
    }
    // Remove trailing slash for consistency
    searchUrl = searchUrl.replace(/\/$/, '');

    // Use 6-month window for URL-specific lookups (deeper trend analysis)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 183);

    const urlPageData = await prisma.gscPageMetric.findMany({
      where: {
        page: { contains: searchUrl, mode: 'insensitive' },
        date: { gte: sixMonthsAgo },
      },
      orderBy: { date: 'desc' },
    });

    if (urlPageData.length > 0) {
      pageData = urlPageData;

      // Also fetch queries that drove traffic to this page if we have the data
      // Build context and return early — no need for keyword extraction
      const summaryText = recentSummaries.map(s =>
        `${s.date.toISOString().split('T')[0]}: ${s.totalClicks} clicks, ${s.totalImpressions} impr, CTR ${(s.avgCtr * 100).toFixed(1)}%, pos ${s.avgPosition.toFixed(1)}`
      ).join('\n');

      // Group by page and show daily trend
      const pageMap = new Map();
      for (const p of urlPageData) {
        if (!pageMap.has(p.page)) pageMap.set(p.page, []);
        pageMap.get(p.page).push(p);
      }
      const entries = [];
      for (const [page, metrics] of pageMap) {
        metrics.sort((a, b) => new Date(a.date) - new Date(b.date));
        const dailyBreakdown = metrics.map(m =>
          `  ${m.date.toISOString().split('T')[0]}: ${m.clicks} clicks, ${m.impressions} impr, pos ${m.position.toFixed(1)}, CTR ${(m.ctr * 100).toFixed(1)}%`
        ).join('\n');
        entries.push(`${page}:\n${dailyBreakdown}`);
      }
      const pageText = entries.join('\n\n');

      const daysOfData = urlPageData.length > 0
        ? Math.ceil((new Date(urlPageData[0].date) - new Date(urlPageData[urlPageData.length - 1].date)) / (1000 * 60 * 60 * 24))
        : 0;

      // Fetch inspection + page+query data for this URL
      const [urlInspections, urlQueries] = await Promise.all([
        prisma.gscUrlInspection.findMany({
          where: { page: { contains: searchUrl, mode: 'insensitive' } },
          orderBy: { inspectedAt: 'desc' },
          take: 5,
        }),
        prisma.gscPageQueryMetric.findMany({
          where: {
            page: { contains: searchUrl, mode: 'insensitive' },
            date: { gte: thirtyDaysAgo },
          },
          orderBy: { clicks: 'desc' },
          take: 20,
        }),
      ]);

      let extraContext = '';
      if (urlInspections.length > 0) {
        const latest = urlInspections[0];
        extraContext += `\n\nINDEXING STATUS (inspected ${latest.inspectedAt.toISOString().split('T')[0]}):\n`;
        extraContext += `Verdict: ${latest.verdict}, Coverage: ${latest.coverageState || 'N/A'}, Indexing: ${latest.indexingState || 'N/A'}\n`;
        extraContext += `Crawled as: ${latest.crawledAs || 'N/A'}, Last crawl: ${latest.lastCrawlTime ? new Date(latest.lastCrawlTime).toISOString().split('T')[0] : 'N/A'}\n`;
        extraContext += `Fetch state: ${latest.pageFetchState || 'N/A'}, Robots: ${latest.robotsTxtState || 'N/A'}\n`;
        if (latest.googleCanonical) extraContext += `Google canonical: ${latest.googleCanonical}\n`;
        if (latest.richResultsVerdict) extraContext += `Rich results: ${latest.richResultsVerdict}, types: ${(latest.richResultsTypes || []).join(', ')}\n`;
        if (latest.mobileUsabilityVerdict) extraContext += `Mobile usability: ${latest.mobileUsabilityVerdict}\n`;
      }
      if (urlQueries.length > 0) {
        extraContext += `\n\nQUERIES DRIVING TRAFFIC TO THIS PAGE:\n`;
        for (const pq of urlQueries) {
          extraContext += `- "${pq.query}": ${pq.clicks} clicks, ${pq.impressions} impr, pos ${pq.position.toFixed(1)}\n`;
        }
      }

      const contextStr = `The user is asking about a specific URL. Here is the daily data for that page over the last ${daysOfData} days (up to 6 months of history):\n\n${pageText}${extraContext}\n\nSITE CONTEXT (recent 30-day summaries):\n${summaryText}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_CHAT },
          { role: 'user', content: `Here is the GSC data:\n\n${contextStr}\n\nUser question: ${question}` },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      return response.choices[0].message.content.trim();
    }
    // If URL not found in DB, fall through to normal search
  }

  // Extract meaningful search terms from the question (skip common stop words)
  const stopWords = new Set([
    'how', 'is', 'the', 'a', 'an', 'are', 'was', 'were', 'be', 'been',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can',
    'what', 'which', 'who', 'when', 'where', 'why', 'that', 'this',
    'my', 'our', 'your', 'its', 'their', 'his', 'her',
    'and', 'or', 'but', 'not', 'no', 'so', 'if', 'then',
    'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'about',
    'any', 'all', 'some', 'have', 'has', 'had', 'get', 'got',
    'page', 'pages', 'doing', 'going', 'happening', 'tell', 'me',
    'show', 'give', 'look', 'like', 'think', 'know', 'see',
    'up', 'down', 'over', 'out', 'it', 'we', 'they', 'i',
    'site', 'data', 'seo', 'performance', 'status', 'trend',
    'clicks', 'impressions', 'ranking', 'rankings', 'position',
    'lately', 'recently', 'today', 'week', 'month', 'last',
    'well', 'better', 'worse', 'good', 'bad', 'much', 'many',
    'there', 'here', 'just', 'also', 'very', 'really', 'still',
  ]);

  // Clean question and extract search terms
  const words = lowerQ.replace(/[?.,!'"]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  // Also check for multi-word terms (e.g., "new york", "mount sinai", "med surg")
  const multiWordTerms = [];
  const cleanQ = lowerQ.replace(/[?.,!'"]/g, '');
  const twoWordPhrases = cleanQ.match(/\b\w+\s+\w+/g) || [];
  for (const phrase of twoWordPhrases) {
    const phraseWords = phrase.split(/\s+/);
    if (phraseWords.every(w => !stopWords.has(w) && w.length > 2)) {
      multiWordTerms.push(phrase.replace(/\s+/g, '-')); // "new york" -> "new-york" for URL matching
      multiWordTerms.push(phrase); // also keep space version
    }
  }

  const searchTerms = [...new Set([...multiWordTerms, ...words])];

  // Search for pages matching any extracted term
  if (searchTerms.length > 0) {
    const pageSearches = searchTerms.slice(0, 5).map(term =>
      prisma.gscPageMetric.findMany({
        where: {
          page: { contains: term, mode: 'insensitive' },
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: 'desc' },
        take: 50,
      })
    );
    const results = await Promise.all(pageSearches);
    const allPages = results.flat();

    // Deduplicate by page+date
    const seen = new Set();
    for (const p of allPages) {
      const key = `${p.page}|${p.date.toISOString()}`;
      if (!seen.has(key)) {
        seen.add(key);
        pageData.push(p);
      }
    }
  }

  // Search queries if asking about keywords/search terms
  if (lowerQ.includes('query') || lowerQ.includes('queries') || lowerQ.includes('keyword') || lowerQ.includes('search')) {
    if (latestDate) {
      queryData = await prisma.gscQueryMetric.findMany({
        where: { date: latestDate },
        orderBy: { clicks: 'desc' },
        take: 20,
      });
    }
  }

  // Also search for matching queries if specific terms found
  if (searchTerms.length > 0 && queryData.length === 0 && latestDate) {
    const querySearches = searchTerms.slice(0, 3).map(term =>
      prisma.gscQueryMetric.findMany({
        where: {
          query: { contains: term, mode: 'insensitive' },
          date: latestDate,
        },
        orderBy: { clicks: 'desc' },
        take: 10,
      })
    );
    const qResults = await Promise.all(querySearches);
    const seenQ = new Set();
    for (const q of qResults.flat()) {
      if (!seenQ.has(q.query)) {
        seenQ.add(q.query);
        queryData.push(q);
      }
    }
  }

  // Fallback: if no specific pages/queries found, get top performers
  if (pageData.length === 0 && latestDate) {
    [pageData, queryData] = await Promise.all([
      prisma.gscPageMetric.findMany({
        where: { date: latestDate },
        orderBy: { clicks: 'desc' },
        take: 20,
      }),
      queryData.length === 0 ? prisma.gscQueryMetric.findMany({
        where: { date: latestDate },
        orderBy: { clicks: 'desc' },
        take: 20,
      }) : Promise.resolve(queryData),
    ]);
  }

  // --- Conditional data fetching for expanded GSC data ---
  const isIndexingQuestion = /\b(index|indexed|indexing|crawl|crawled|coverage|fetch|canonical|deindex|not found)\b/i.test(lowerQ);
  const isSitemapQuestion = /\b(sitemap|submitted)\b/i.test(lowerQ);
  const isDeviceQuestion = /\b(mobile|desktop|tablet|device|phone)\b/i.test(lowerQ);
  const isPageQueryQuestion = /\b(which quer|what quer|queries.+(?:drive|for)|traffic to|driving.+traffic)\b/i.test(lowerQ);
  const isSchemaQuestion = /\b(schema|rich result|structured data|job.?posting structured)\b/i.test(lowerQ);
  const isMobileUsabilityQuestion = /\b(mobile usability|mobile.+issue|usability issue)\b/i.test(lowerQ);

  let indexingContext = '';
  let sitemapContext = '';
  let deviceContext = '';
  let pageQueryContext = '';

  // Indexing / schema / mobile usability → GscUrlInspection
  if (isIndexingQuestion || isSchemaQuestion || isMobileUsabilityQuestion) {
    const inspections = await prisma.gscUrlInspection.findMany({
      orderBy: { inspectedAt: 'desc' },
      take: 500,
    });

    if (inspections.length > 0) {
      const verdictCounts = {};
      for (const insp of inspections) {
        verdictCounts[insp.verdict] = (verdictCounts[insp.verdict] || 0) + 1;
      }
      const latestInspDate = inspections[0].inspectedAt.toISOString().split('T')[0];

      let text = `URL INSPECTION DATA (${inspections.length} pages inspected, latest: ${latestInspDate}):\n`;
      text += `Verdicts: ${Object.entries(verdictCounts).map(([v, c]) => `${v}: ${c}`).join(', ')}\n`;

      const failures = inspections.filter(i => i.verdict !== 'PASS' && i.verdict !== 'NEUTRAL');
      if (failures.length > 0) {
        text += `\nPages NOT passing (${failures.length}):\n`;
        for (const f of failures.slice(0, 20)) {
          text += `- ${f.page}: verdict=${f.verdict}, coverage=${f.coverageState || 'N/A'}, indexing=${f.indexingState || 'N/A'}, fetch=${f.pageFetchState || 'N/A'}\n`;
        }
      }

      if (isSchemaQuestion) {
        const withRich = inspections.filter(i => i.richResultsVerdict);
        const richFailing = withRich.filter(i => i.richResultsVerdict !== 'PASS');
        text += `\nRICH RESULTS / STRUCTURED DATA:\n`;
        text += `Pages with rich results data: ${withRich.length}, passing: ${withRich.length - richFailing.length}, failing: ${richFailing.length}\n`;
        for (const r of richFailing.slice(0, 15)) {
          const types = (r.richResultsTypes || []).join(', ');
          text += `- ${r.page}: verdict=${r.richResultsVerdict}, types=[${types}]`;
          if (r.richResultsIssues) text += `, issues=${JSON.stringify(r.richResultsIssues)}`;
          text += '\n';
        }
      }

      if (isMobileUsabilityQuestion) {
        const withMobile = inspections.filter(i => i.mobileUsabilityVerdict);
        const mobileFailing = withMobile.filter(i => i.mobileUsabilityVerdict !== 'PASS');
        text += `\nMOBILE USABILITY:\n`;
        text += `Pages checked: ${withMobile.length}, passing: ${withMobile.length - mobileFailing.length}, failing: ${mobileFailing.length}\n`;
        for (const m of mobileFailing.slice(0, 15)) {
          text += `- ${m.page}: verdict=${m.mobileUsabilityVerdict}`;
          if (m.mobileUsabilityIssues) text += `, issues=${JSON.stringify(m.mobileUsabilityIssues)}`;
          text += '\n';
        }
      }

      indexingContext = '\n\n' + text;
    }
  }

  // Sitemap questions → GscSitemapStatus
  if (isSitemapQuestion) {
    const latestSitemaps = await prisma.gscSitemapStatus.findMany({
      orderBy: { date: 'desc' },
      take: 20,
    });

    if (latestSitemaps.length > 0) {
      const sitemapDate = latestSitemaps[0].date.toISOString().split('T')[0];
      const latest = latestSitemaps.filter(s => s.date.toISOString().split('T')[0] === sitemapDate);

      let text = `SITEMAP STATUS (${sitemapDate}):\n`;
      for (const s of latest) {
        text += `- ${s.path}: errors=${s.errors}, warnings=${s.warnings}, pending=${s.isPending}`;
        if (s.lastDownloaded) text += `, lastDownloaded=${new Date(s.lastDownloaded).toISOString().split('T')[0]}`;
        if (s.contents) {
          const contents = typeof s.contents === 'string' ? JSON.parse(s.contents) : s.contents;
          if (Array.isArray(contents)) {
            for (const c of contents) {
              text += `\n  ${c.type}: ${c.submitted} submitted, ${c.indexed} indexed`;
            }
          }
        }
        text += '\n';
      }

      sitemapContext = '\n\n' + text;
    }
  }

  // Device questions → GscDeviceMetric
  if (isDeviceQuestion) {
    const deviceMetrics = await prisma.gscDeviceMetric.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
    });

    if (deviceMetrics.length > 0) {
      const dateMap = new Map();
      for (const d of deviceMetrics) {
        const ds = d.date.toISOString().split('T')[0];
        if (!dateMap.has(ds)) dateMap.set(ds, []);
        dateMap.get(ds).push(d);
      }

      let text = `DEVICE BREAKDOWN (${dateMap.size} days of data):\n`;
      const sortedDates = [...dateMap.keys()].sort().reverse().slice(0, 7);
      for (const ds of sortedDates) {
        const devices = dateMap.get(ds);
        const parts = devices.map(d => `${d.device}: ${d.clicks} clicks, ${d.impressions} impr, pos ${d.position.toFixed(1)}`);
        text += `${ds}: ${parts.join(' | ')}\n`;
      }

      const totals = {};
      for (const d of deviceMetrics) {
        if (!totals[d.device]) totals[d.device] = { clicks: 0, impressions: 0 };
        totals[d.device].clicks += d.clicks;
        totals[d.device].impressions += d.impressions;
      }
      text += `\n30-day totals: ${Object.entries(totals).map(([dev, t]) => `${dev}: ${t.clicks} clicks, ${t.impressions} impr`).join(' | ')}`;

      deviceContext = '\n\n' + text;
    }
  }

  // Page+query questions → GscPageQueryMetric
  if (isPageQueryQuestion) {
    let targetPage = null;
    if (urlMatch) {
      targetPage = urlMatch[0];
    } else {
      const pathMatch = lowerQ.match(/\/jobs\/[^\s?#]+/);
      if (pathMatch) targetPage = `https://intelliresume.net${pathMatch[0]}`;
    }

    let pqData;
    if (targetPage) {
      pqData = await prisma.gscPageQueryMetric.findMany({
        where: {
          page: { contains: targetPage, mode: 'insensitive' },
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { clicks: 'desc' },
        take: 50,
      });
    } else {
      pqData = await prisma.gscPageQueryMetric.findMany({
        where: { date: latestDate, clicks: { gte: 1 } },
        orderBy: { clicks: 'desc' },
        take: 30,
      });
    }

    if (pqData && pqData.length > 0) {
      let text = targetPage
        ? `QUERIES DRIVING TRAFFIC TO ${targetPage}:\n`
        : `TOP PAGE+QUERY COMBINATIONS:\n`;
      for (const pq of pqData.slice(0, 30)) {
        text += `- "${pq.query}" → ${pq.page}: ${pq.clicks} clicks, ${pq.impressions} impr, pos ${pq.position.toFixed(1)}\n`;
      }
      pageQueryContext = '\n\n' + text;
    }
  }

  // Build context string
  const summaryText = recentSummaries.map(s =>
    `${s.date.toISOString().split('T')[0]}: ${s.totalClicks} clicks, ${s.totalImpressions} impr, CTR ${(s.avgCtr * 100).toFixed(1)}%, pos ${s.avgPosition.toFixed(1)}`
  ).join('\n');

  const alertsText = recentAlerts.length > 0
    ? recentAlerts.slice(0, 15).map(a => `[${a.severity}] ${a.date.toISOString().split('T')[0]}: ${a.title}`).join('\n')
    : 'No recent alerts.';

  let pageText = '';
  if (pageData.length > 0) {
    // Group by page and show trend
    const pageMap = new Map();
    for (const p of pageData) {
      if (!pageMap.has(p.page)) pageMap.set(p.page, []);
      pageMap.get(p.page).push(p);
    }
    const entries = [];
    for (const [page, metrics] of pageMap) {
      metrics.sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = metrics[0];
      const oldest = metrics[metrics.length - 1];
      entries.push(`${page}: latest ${latest.clicks} clicks (pos ${latest.position.toFixed(1)}), was ${oldest.clicks} clicks (pos ${oldest.position.toFixed(1)}) ${metrics.length} days ago`);
    }
    pageText = entries.slice(0, 15).join('\n');
  }

  const queryText = queryData.length > 0
    ? queryData.map((q, i) => `${i + 1}. "${q.query}" — ${q.clicks} clicks, ${q.impressions} impr, pos ${q.position.toFixed(1)}`).join('\n')
    : '';

  // Always compute page-level movers (which pages gained or lost clicks vs 7-day avg)
  let moversText = '';
  if (latestDate) {
    const sevenDaysAgo = new Date(latestDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const latestPages = await prisma.gscPageMetric.findMany({
      where: { date: latestDate, clicks: { gte: 1 } },
      orderBy: { clicks: 'desc' },
      take: 80,
    });

    const movers = [];
    for (const page of latestPages) {
      const history = await prisma.gscPageMetric.findMany({
        where: { page: page.page, date: { gte: sevenDaysAgo, lt: latestDate } },
      });
      if (history.length < 3) continue;
      const avgClicks = history.reduce((s, r) => s + r.clicks, 0) / history.length;
      if (avgClicks < 1) continue;
      const avgPos = history.reduce((s, r) => s + r.position, 0) / history.length;
      const change = ((page.clicks - avgClicks) / avgClicks) * 100;
      movers.push({
        page: page.page,
        todayClicks: page.clicks,
        avgClicks: Math.round(avgClicks),
        change: Math.round(change),
        todayPos: page.position,
        avgPos,
      });
    }

    const gainers = movers.filter(m => m.change > 20).sort((a, b) => b.change - a.change).slice(0, 8);
    const decliners = movers.filter(m => m.change < -20).sort((a, b) => a.change - b.change).slice(0, 8);

    if (gainers.length > 0 || decliners.length > 0) {
      const gText = gainers.map(g => `${g.page}: ${g.todayClicks} clicks (+${g.change}% vs 7d avg of ${g.avgClicks}), pos ${g.todayPos.toFixed(1)} (was ${g.avgPos.toFixed(1)})`).join('\n');
      const dText = decliners.map(d => `${d.page}: ${d.todayClicks} clicks (${d.change}% vs 7d avg of ${d.avgClicks}), pos ${d.todayPos.toFixed(1)} (was ${d.avgPos.toFixed(1)})`).join('\n');
      moversText = `\n\nPAGES GAINING CLICKS (vs 7-day avg):\n${gText || 'None'}\n\nPAGES LOSING CLICKS (vs 7-day avg):\n${dText || 'None'}`;
    }
  }

  const contextStr = `DAILY SITE SUMMARIES (last ${recentSummaries.length} days):\n${summaryText}\n\nRECENT ALERTS:\n${alertsText}${moversText}${pageText ? `\n\nPAGE DATA:\n${pageText}` : ''}${queryText ? `\n\nTOP QUERIES:\n${queryText}` : ''}${indexingContext}${sitemapContext}${deviceContext}${pageQueryContext}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_CHAT },
      { role: 'user', content: `Here is the recent GSC data:\n\n${contextStr}\n\nUser question: ${question}` },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0].message.content.trim();
}

module.exports = {
  generateDailyReport,
  answerSeoQuestion,
};
