#!/usr/bin/env node

/**
 * Pull Google Search Console data and detect alerts
 *
 * Usage:
 *   node scripts/pull-gsc-data.js              # Pull latest available day (3 days ago)
 *   node scripts/pull-gsc-data.js --backfill=16 # Backfill last 16 days
 *   node scripts/pull-gsc-data.js --test        # Test API connection only
 *
 * Cron: 0 11 * * * (6:00 AM EST daily on production VPS)
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const gscService = require('../lib/services/gscService');

const prisma = new PrismaClient();

const DATA_DELAY_DAYS = 3;
const URL_INSPECTION_BUDGET = 50;

async function pullDataForDate(dateStr) {
  // Check if data already exists
  const existing = await prisma.gscSiteSummary.findUnique({
    where: { date: new Date(dateStr) },
  });
  if (existing) {
    console.log(`  Data for ${dateStr} already exists, skipping fetch.`);
    return { skipped: true, pageCount: 0, queryCount: 0 };
  }

  // Fetch page metrics
  console.log(`  Fetching page metrics for ${dateStr}...`);
  const pageRows = await gscService.getSearchAnalytics({
    startDate: dateStr,
    endDate: dateStr,
    dimensions: ['page'],
    rowLimit: 5000,
  });

  // Fetch query metrics
  console.log(`  Fetching query metrics for ${dateStr}...`);
  const queryRows = await gscService.getSearchAnalytics({
    startDate: dateStr,
    endDate: dateStr,
    dimensions: ['query'],
    rowLimit: 5000,
  });

  // Save page metrics in batches
  let savedPages = 0;
  for (const row of pageRows) {
    let pagePath;
    try {
      pagePath = new URL(row.keys[0]).pathname;
    } catch {
      pagePath = row.keys[0];
    }

    await prisma.gscPageMetric.upsert({
      where: {
        date_page: { date: new Date(dateStr), page: pagePath },
      },
      update: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
      create: {
        date: new Date(dateStr),
        page: pagePath,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    });
    savedPages++;
  }

  // Save query metrics in batches
  let savedQueries = 0;
  for (const row of queryRows) {
    await prisma.gscQueryMetric.upsert({
      where: {
        date_query: { date: new Date(dateStr), query: row.keys[0] },
      },
      update: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
      create: {
        date: new Date(dateStr),
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    });
    savedQueries++;
  }

  // Compute and save site summary
  const totalClicks = pageRows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = pageRows.reduce((s, r) => s + r.impressions, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = pageRows.length > 0
    ? pageRows.reduce((s, r) => s + r.position, 0) / pageRows.length
    : 0;

  await prisma.gscSiteSummary.upsert({
    where: { date: new Date(dateStr) },
    update: {
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition,
      totalPages: pageRows.length,
      totalQueries: queryRows.length,
    },
    create: {
      date: new Date(dateStr),
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition,
      totalPages: pageRows.length,
      totalQueries: queryRows.length,
    },
  });

  console.log(`  Saved: ${savedPages} pages, ${savedQueries} queries | clicks: ${totalClicks}, impressions: ${totalImpressions}`);
  return { skipped: false, pageCount: savedPages, queryCount: savedQueries };
}

async function detectAlerts(dateStr) {
  const targetDate = new Date(dateStr);

  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const twentyEightDaysAgo = new Date(targetDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  // Get historical summaries
  const recentSummaries = await prisma.gscSiteSummary.findMany({
    where: { date: { gte: twentyEightDaysAgo, lt: targetDate } },
    orderBy: { date: 'desc' },
  });

  const todaySummary = await prisma.gscSiteSummary.findUnique({
    where: { date: targetDate },
  });

  if (!todaySummary || recentSummaries.length < 5) {
    console.log(`  Not enough historical data for alerts (need 5+ days, have ${recentSummaries.length})`);
    return 0;
  }

  // Clear existing alerts for this date
  await prisma.gscAlert.deleteMany({ where: { date: targetDate } });

  const alerts = [];

  // 7-day averages
  const last7 = recentSummaries.slice(0, Math.min(7, recentSummaries.length));
  const avg7Clicks = last7.reduce((s, r) => s + r.totalClicks, 0) / last7.length;
  const avg7Impressions = last7.reduce((s, r) => s + r.totalImpressions, 0) / last7.length;

  // 28-day averages
  const avg28Clicks = recentSummaries.reduce((s, r) => s + r.totalClicks, 0) / recentSummaries.length;

  // --- SITE-LEVEL ALERTS ---

  if (avg7Clicks > 0) {
    const clicksChange = ((todaySummary.totalClicks - avg7Clicks) / avg7Clicks) * 100;

    if (clicksChange < -30) {
      alerts.push({
        severity: 'critical',
        category: 'clicks_drop',
        title: `Site clicks dropped ${Math.abs(Math.round(clicksChange))}% vs 7-day avg`,
        description: `Today: ${todaySummary.totalClicks} clicks. 7-day avg: ${Math.round(avg7Clicks)}. 28-day avg: ${Math.round(avg28Clicks)}.`,
        metric: 'clicks',
        entityType: 'site',
        currentValue: todaySummary.totalClicks,
        previousValue: avg7Clicks,
        changePercent: clicksChange,
      });
    } else if (clicksChange < -15) {
      alerts.push({
        severity: 'warning',
        category: 'clicks_drop',
        title: `Site clicks down ${Math.abs(Math.round(clicksChange))}% vs 7-day avg`,
        description: `Today: ${todaySummary.totalClicks}. 7-day avg: ${Math.round(avg7Clicks)}.`,
        metric: 'clicks',
        entityType: 'site',
        currentValue: todaySummary.totalClicks,
        previousValue: avg7Clicks,
        changePercent: clicksChange,
      });
    } else if (clicksChange > 50) {
      alerts.push({
        severity: 'info',
        category: 'new_winner',
        title: `Site clicks surged ${Math.round(clicksChange)}% vs 7-day avg`,
        description: `Today: ${todaySummary.totalClicks}. 7-day avg: ${Math.round(avg7Clicks)}.`,
        metric: 'clicks',
        entityType: 'site',
        currentValue: todaySummary.totalClicks,
        previousValue: avg7Clicks,
        changePercent: clicksChange,
      });
    }
  }

  if (avg7Impressions > 0) {
    const impressionsChange = ((todaySummary.totalImpressions - avg7Impressions) / avg7Impressions) * 100;

    if (impressionsChange < -30) {
      alerts.push({
        severity: 'critical',
        category: 'impressions_drop',
        title: `Site impressions dropped ${Math.abs(Math.round(impressionsChange))}% vs 7-day avg`,
        description: `Today: ${todaySummary.totalImpressions}. 7-day avg: ${Math.round(avg7Impressions)}.`,
        metric: 'impressions',
        entityType: 'site',
        currentValue: todaySummary.totalImpressions,
        previousValue: avg7Impressions,
        changePercent: impressionsChange,
      });
    } else if (impressionsChange < -15) {
      alerts.push({
        severity: 'warning',
        category: 'impressions_drop',
        title: `Site impressions down ${Math.abs(Math.round(impressionsChange))}% vs 7-day avg`,
        description: `Today: ${todaySummary.totalImpressions}. 7-day avg: ${Math.round(avg7Impressions)}.`,
        metric: 'impressions',
        entityType: 'site',
        currentValue: todaySummary.totalImpressions,
        previousValue: avg7Impressions,
        changePercent: impressionsChange,
      });
    }
  }

  // --- PAGE-LEVEL ALERTS ---

  const todayPages = await prisma.gscPageMetric.findMany({
    where: { date: targetDate },
    orderBy: { clicks: 'desc' },
    take: 200,
  });

  for (const page of todayPages) {
    const pageHistory = await prisma.gscPageMetric.findMany({
      where: {
        page: page.page,
        date: { gte: sevenDaysAgo, lt: targetDate },
      },
    });

    if (pageHistory.length < 3) continue;

    const avgClicks = pageHistory.reduce((s, r) => s + r.clicks, 0) / pageHistory.length;
    if (avgClicks < 2) continue;

    const clicksChange = ((page.clicks - avgClicks) / avgClicks) * 100;

    // Page lost >50% clicks (was getting 5+/day)
    if (clicksChange < -50 && avgClicks >= 5) {
      alerts.push({
        severity: 'warning',
        category: 'clicks_drop',
        title: `Page lost ${Math.abs(Math.round(clicksChange))}% clicks`,
        description: `${page.page}: ${page.clicks} today vs ${Math.round(avgClicks)} avg`,
        metric: 'clicks',
        entityType: 'page',
        entity: page.page,
        currentValue: page.clicks,
        previousValue: avgClicks,
        changePercent: clicksChange,
      });
    }

    // Page gained >100% clicks (now getting 5+)
    if (clicksChange > 100 && page.clicks >= 5) {
      alerts.push({
        severity: 'info',
        category: 'new_winner',
        title: `Page gained ${Math.round(clicksChange)}% clicks`,
        description: `${page.page}: ${page.clicks} today vs ${Math.round(avgClicks)} avg`,
        metric: 'clicks',
        entityType: 'page',
        entity: page.page,
        currentValue: page.clicks,
        previousValue: avgClicks,
        changePercent: clicksChange,
      });
    }

    // Position dropped >5 spots (was in top 20)
    const avgPos = pageHistory.reduce((s, r) => s + r.position, 0) / pageHistory.length;
    const posChange = page.position - avgPos;

    if (posChange > 5 && avgPos < 20) {
      alerts.push({
        severity: 'warning',
        category: 'position_change',
        title: `Page dropped ${Math.round(posChange)} positions`,
        description: `${page.page}: pos ${page.position.toFixed(1)} today vs ${avgPos.toFixed(1)} avg`,
        metric: 'position',
        entityType: 'page',
        entity: page.page,
        currentValue: page.position,
        previousValue: avgPos,
        changePercent: posChange,
      });
    }
  }

  // Save alerts
  for (const alert of alerts) {
    await prisma.gscAlert.create({
      data: { ...alert, date: targetDate },
    });
  }

  console.log(`  Generated ${alerts.length} alerts (${alerts.filter(a => a.severity === 'critical').length} critical, ${alerts.filter(a => a.severity === 'warning').length} warning, ${alerts.filter(a => a.severity === 'info').length} info)`);
  return alerts.length;
}

async function inspectImportantPages(dateStr) {
  const targetDate = new Date(dateStr);
  const threeDaysAgo = new Date(targetDate);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Get top-traffic pages
  const topPages = await prisma.gscPageMetric.findMany({
    where: {
      date: { gte: threeDaysAgo },
      clicks: { gte: 1 },
    },
    orderBy: { clicks: 'desc' },
    take: URL_INSPECTION_BUDGET,
    distinct: ['page'],
  });

  if (topPages.length === 0) {
    console.log('  No pages to inspect.');
    return;
  }

  const baseUrl = 'https://intelliresume.net';
  const urls = topPages.map(p => `${baseUrl}${p.page}`);

  console.log(`  Inspecting ${urls.length} pages...`);
  const results = await gscService.getIndexingStatus(urls);

  let issueCount = 0;
  for (const result of results) {
    if (result.verdict && result.verdict !== 'PASS' && result.verdict !== 'ERROR') {
      issueCount++;
      let pagePath;
      try {
        pagePath = new URL(result.url).pathname;
      } catch {
        pagePath = result.url;
      }
      await prisma.gscAlert.create({
        data: {
          date: targetDate,
          severity: 'warning',
          category: 'indexing',
          title: `Page not indexed: ${result.verdict}`,
          description: `${pagePath} — State: ${result.indexingState}, Fetch: ${result.pageFetchState}`,
          entityType: 'page',
          entity: pagePath,
        },
      });
    }
  }

  console.log(`  URL inspection: ${results.length} checked, ${issueCount} issues found`);
}

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const backfillArg = args.find(a => a.startsWith('--backfill='));
  const backfillDays = backfillArg ? parseInt(backfillArg.split('=')[1]) : 0;
  const skipInspection = args.includes('--skip-inspection');

  if (testMode) {
    console.log('Testing GSC API connection...');
    try {
      const result = await gscService.testConnection();
      console.log('Connection successful:', result);
    } catch (error) {
      console.error('Connection failed:', error.message);
    }
    await prisma.$disconnect();
    return;
  }

  if (backfillDays > 0) {
    console.log(`Backfilling ${backfillDays} days of GSC data...\n`);
    for (let i = backfillDays + DATA_DELAY_DAYS; i >= DATA_DELAY_DAYS; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      console.log(`[${dateStr}]`);
      await pullDataForDate(dateStr);
      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Run alert detection for the most recent date
    const latestDate = new Date();
    latestDate.setDate(latestDate.getDate() - DATA_DELAY_DAYS);
    const latestDateStr = latestDate.toISOString().split('T')[0];
    console.log(`\nRunning alert detection for ${latestDateStr}...`);
    await detectAlerts(latestDateStr);
  } else {
    // Normal daily run: fetch latest available date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - DATA_DELAY_DAYS);
    const dateStr = targetDate.toISOString().split('T')[0];

    console.log(`Pulling GSC data for ${dateStr}...\n`);
    const result = await pullDataForDate(dateStr);

    if (!result.skipped) {
      console.log('\nRunning alert detection...');
      await detectAlerts(dateStr);

      if (!skipInspection) {
        console.log('\nRunning URL inspection...');
        await inspectImportantPages(dateStr);
      }
    }
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
