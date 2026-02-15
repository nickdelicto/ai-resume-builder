#!/usr/bin/env node

/**
 * Pull Bing Webmaster Tools search analytics data
 *
 * Fetches query and page stats from Bing API (weekly buckets),
 * stores in BingPageMetric/BingQueryMetric/BingSiteSummary,
 * detects alerts, and generates AI summary.
 *
 * Usage:
 *   node scripts/pull-bing-data.js              # Full run
 *   node scripts/pull-bing-data.js --dry-run    # Show stats without saving
 *   node scripts/pull-bing-data.js --skip-ai    # Skip AI summary generation
 *
 * Cron: 0 12 * * 1 (Monday 7 AM EST, weekly)
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bingService = require('../lib/services/bingWebmasterService');

const prisma = new PrismaClient();

const BATCH_SIZE = 100;

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipAi = args.includes('--skip-ai');

/**
 * Group rows by date string (YYYY-MM-DD)
 */
function groupByDate(rows) {
  const groups = {};
  for (const row of rows) {
    const dateStr = row.date.toISOString().split('T')[0];
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(row);
  }
  return groups;
}

/**
 * Save page and query metrics for all weeks
 */
async function saveMetrics(queryRows, pageRows) {
  const queryByDate = groupByDate(queryRows);
  const pageByDate = groupByDate(pageRows);

  // All unique week dates
  const allDates = new Set([...Object.keys(queryByDate), ...Object.keys(pageByDate)]);
  const sortedDates = [...allDates].sort();

  let totalQueries = 0;
  let totalPages = 0;

  for (const dateStr of sortedDates) {
    const dateObj = new Date(dateStr);
    const queries = queryByDate[dateStr] || [];
    const pages = pageByDate[dateStr] || [];

    // Batch upsert queries
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      const batch = queries.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map(q => prisma.bingQueryMetric.upsert({
          where: { date_query: { date: dateObj, query: q.query } },
          update: { clicks: q.clicks, impressions: q.impressions, ctr: q.ctr, position: q.position },
          create: { date: dateObj, query: q.query, clicks: q.clicks, impressions: q.impressions, ctr: q.ctr, position: q.position },
        }))
      );
    }
    totalQueries += queries.length;

    // Batch upsert pages
    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const batch = pages.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map(p => prisma.bingPageMetric.upsert({
          where: { date_page: { date: dateObj, page: p.page } },
          update: { clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position },
          create: { date: dateObj, page: p.page, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position },
        }))
      );
    }
    totalPages += pages.length;

    // Compute and save site summary for this week
    const totalClicks = pages.reduce((s, p) => s + p.clicks, 0);
    const totalImpressions = pages.reduce((s, p) => s + p.impressions, 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = pages.length > 0
      ? pages.reduce((s, p) => s + p.position, 0) / pages.length
      : 0;

    await prisma.bingSiteSummary.upsert({
      where: { date: dateObj },
      update: {
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
        totalPages: pages.length,
        totalQueries: queries.length,
      },
      create: {
        date: dateObj,
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
        totalPages: pages.length,
        totalQueries: queries.length,
      },
    });
  }

  console.log(`  Saved: ${sortedDates.length} weeks, ${totalPages} page rows, ${totalQueries} query rows`);
  return sortedDates;
}

/**
 * Detect alerts for the latest week by comparing to previous weeks
 */
async function detectAlerts(latestDateStr) {
  const targetDate = new Date(latestDateStr);

  // Get previous 4 weeks of summaries
  const previousSummaries = await prisma.bingSiteSummary.findMany({
    where: { date: { lt: targetDate } },
    orderBy: { date: 'desc' },
    take: 4,
  });

  const todaySummary = await prisma.bingSiteSummary.findUnique({
    where: { date: targetDate },
  });

  if (!todaySummary || previousSummaries.length < 2) {
    console.log(`  Not enough historical data for alerts (need 2+ weeks, have ${previousSummaries.length})`);
    return 0;
  }

  // Clear existing alerts for this date
  await prisma.bingAlert.deleteMany({ where: { date: targetDate } });

  const alerts = [];

  // Week-over-week averages
  const avgClicks = previousSummaries.reduce((s, r) => s + r.totalClicks, 0) / previousSummaries.length;
  const avgImpressions = previousSummaries.reduce((s, r) => s + r.totalImpressions, 0) / previousSummaries.length;

  // --- SITE-LEVEL ALERTS ---

  if (avgClicks > 0) {
    const clicksChange = ((todaySummary.totalClicks - avgClicks) / avgClicks) * 100;

    if (clicksChange < -30) {
      alerts.push({
        severity: 'critical',
        category: 'clicks_drop',
        title: `Bing clicks dropped ${Math.abs(Math.round(clicksChange))}% vs prior weeks`,
        description: `This week: ${todaySummary.totalClicks} clicks. Avg prior ${previousSummaries.length} weeks: ${Math.round(avgClicks)}.`,
        metric: 'clicks',
        entityType: 'site',
        currentValue: todaySummary.totalClicks,
        previousValue: avgClicks,
        changePercent: clicksChange,
      });
    } else if (clicksChange < -15) {
      alerts.push({
        severity: 'warning',
        category: 'clicks_drop',
        title: `Bing clicks down ${Math.abs(Math.round(clicksChange))}% vs prior weeks`,
        description: `This week: ${todaySummary.totalClicks}. Avg prior weeks: ${Math.round(avgClicks)}.`,
        metric: 'clicks',
        entityType: 'site',
        currentValue: todaySummary.totalClicks,
        previousValue: avgClicks,
        changePercent: clicksChange,
      });
    } else if (clicksChange > 50) {
      alerts.push({
        severity: 'info',
        category: 'new_winner',
        title: `Bing clicks surged ${Math.round(clicksChange)}% vs prior weeks`,
        description: `This week: ${todaySummary.totalClicks}. Avg prior weeks: ${Math.round(avgClicks)}.`,
        metric: 'clicks',
        entityType: 'site',
        currentValue: todaySummary.totalClicks,
        previousValue: avgClicks,
        changePercent: clicksChange,
      });
    }
  }

  if (avgImpressions > 0) {
    const impressionsChange = ((todaySummary.totalImpressions - avgImpressions) / avgImpressions) * 100;

    if (impressionsChange < -30) {
      alerts.push({
        severity: 'critical',
        category: 'impressions_drop',
        title: `Bing impressions dropped ${Math.abs(Math.round(impressionsChange))}% vs prior weeks`,
        description: `This week: ${todaySummary.totalImpressions}. Avg prior weeks: ${Math.round(avgImpressions)}.`,
        metric: 'impressions',
        entityType: 'site',
        currentValue: todaySummary.totalImpressions,
        previousValue: avgImpressions,
        changePercent: impressionsChange,
      });
    } else if (impressionsChange < -15) {
      alerts.push({
        severity: 'warning',
        category: 'impressions_drop',
        title: `Bing impressions down ${Math.abs(Math.round(impressionsChange))}% vs prior weeks`,
        description: `This week: ${todaySummary.totalImpressions}. Avg prior weeks: ${Math.round(avgImpressions)}.`,
        metric: 'impressions',
        entityType: 'site',
        currentValue: todaySummary.totalImpressions,
        previousValue: avgImpressions,
        changePercent: impressionsChange,
      });
    }
  }

  // --- PAGE-LEVEL ALERTS ---

  const latestPages = await prisma.bingPageMetric.findMany({
    where: { date: targetDate },
    orderBy: { clicks: 'desc' },
    take: 200,
  });

  // Get previous week date for comparison
  const prevWeekDate = previousSummaries[0]?.date;
  if (prevWeekDate) {
    for (const page of latestPages) {
      const pageHistory = await prisma.bingPageMetric.findMany({
        where: {
          page: page.page,
          date: { lt: targetDate },
        },
        orderBy: { date: 'desc' },
        take: 4,
      });

      if (pageHistory.length < 2) continue;

      const avgPageClicks = pageHistory.reduce((s, r) => s + r.clicks, 0) / pageHistory.length;
      if (avgPageClicks < 2) continue;

      const clicksChange = ((page.clicks - avgPageClicks) / avgPageClicks) * 100;

      if (clicksChange < -50 && avgPageClicks >= 5) {
        alerts.push({
          severity: 'warning',
          category: 'clicks_drop',
          title: `Page lost ${Math.abs(Math.round(clicksChange))}% Bing clicks`,
          description: `${page.page}: ${page.clicks} this week vs ${Math.round(avgPageClicks)} avg`,
          metric: 'clicks',
          entityType: 'page',
          entity: page.page,
          currentValue: page.clicks,
          previousValue: avgPageClicks,
          changePercent: clicksChange,
        });
      }

      if (clicksChange > 100 && page.clicks >= 5) {
        alerts.push({
          severity: 'info',
          category: 'new_winner',
          title: `Page gained ${Math.round(clicksChange)}% Bing clicks`,
          description: `${page.page}: ${page.clicks} this week vs ${Math.round(avgPageClicks)} avg`,
          metric: 'clicks',
          entityType: 'page',
          entity: page.page,
          currentValue: page.clicks,
          previousValue: avgPageClicks,
          changePercent: clicksChange,
        });
      }

      // Position changes
      const avgPos = pageHistory.reduce((s, r) => s + r.position, 0) / pageHistory.length;
      const posChange = page.position - avgPos;

      if (posChange > 5 && avgPos < 20) {
        alerts.push({
          severity: 'warning',
          category: 'position_change',
          title: `Page dropped ${Math.round(posChange)} Bing positions`,
          description: `${page.page}: pos ${page.position.toFixed(1)} this week vs ${avgPos.toFixed(1)} avg`,
          metric: 'position',
          entityType: 'page',
          entity: page.page,
          currentValue: page.position,
          previousValue: avgPos,
          changePercent: posChange,
        });
      }
    }
  }

  // Save alerts
  for (const alert of alerts) {
    await prisma.bingAlert.create({
      data: { ...alert, date: targetDate },
    });
  }

  const critical = alerts.filter(a => a.severity === 'critical').length;
  const warning = alerts.filter(a => a.severity === 'warning').length;
  const info = alerts.filter(a => a.severity === 'info').length;
  console.log(`  Generated ${alerts.length} alerts (${critical} critical, ${warning} warning, ${info} info)`);
  return alerts.length;
}

async function main() {
  console.log('Pulling Bing Webmaster data...\n');

  const { configured } = bingService.checkConfiguration();
  if (!configured) {
    console.error('BING_WEBMASTER_API_KEY not set. Exiting.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Fetch all data from Bing API (returns ~6 months of weekly data)
  console.log('  Fetching query and page stats from Bing...');
  const [queryRows, pageRows] = await Promise.all([
    bingService.getQueryStats(),
    bingService.getPageStats(),
  ]);

  console.log(`  API returned: ${queryRows.length} query rows, ${pageRows.length} page rows`);

  if (queryRows.length === 0 && pageRows.length === 0) {
    console.log('  No data returned from Bing API.');
    await prisma.$disconnect();
    return;
  }

  if (isDryRun) {
    // Show stats without saving
    const queryByDate = groupByDate(queryRows);
    const pageByDate = groupByDate(pageRows);
    const allDates = [...new Set([...Object.keys(queryByDate), ...Object.keys(pageByDate)])].sort();

    console.log(`\n  Weeks of data: ${allDates.length}`);
    console.log(`  Date range: ${allDates[0]} to ${allDates[allDates.length - 1]}`);

    // Show latest week stats
    const latestDate = allDates[allDates.length - 1];
    const latestPages = pageByDate[latestDate] || [];
    const latestQueries = queryByDate[latestDate] || [];
    const totalClicks = latestPages.reduce((s, p) => s + p.clicks, 0);
    const totalImpressions = latestPages.reduce((s, p) => s + p.impressions, 0);

    console.log(`\n  Latest week (${latestDate}):`);
    console.log(`    Pages: ${latestPages.length}, Queries: ${latestQueries.length}`);
    console.log(`    Clicks: ${totalClicks}, Impressions: ${totalImpressions}`);

    if (latestPages.length > 0) {
      console.log(`\n  Top 10 pages by clicks:`);
      latestPages.sort((a, b) => b.clicks - a.clicks).slice(0, 10).forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.page} — ${p.clicks} clicks`);
      });
    }

    if (latestQueries.length > 0) {
      console.log(`\n  Top 10 queries by clicks:`);
      latestQueries.sort((a, b) => b.clicks - a.clicks).slice(0, 10).forEach((q, i) => {
        console.log(`    ${i + 1}. "${q.query}" — ${q.clicks} clicks`);
      });
    }

    console.log('\n  (Dry run — nothing saved)');
    await prisma.$disconnect();
    return;
  }

  // Save to database
  const sortedDates = await saveMetrics(queryRows, pageRows);

  // Detect alerts for the latest week
  const latestDate = sortedDates[sortedDates.length - 1];
  console.log(`\n  Detecting alerts for latest week (${latestDate})...`);
  await detectAlerts(latestDate);

  // Generate AI summary
  if (!skipAi) {
    try {
      const { generateWeeklyReport } = require('../lib/services/bingAnalysisService');
      console.log('\n  Generating AI summary...');
      await generateWeeklyReport(latestDate);
      console.log('  AI summary saved.');
    } catch (error) {
      console.error('  AI summary failed:', error.message);
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
