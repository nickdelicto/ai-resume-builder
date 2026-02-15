#!/usr/bin/env node

/**
 * Pull Google Search Console data and detect alerts
 *
 * Usage:
 *   node scripts/pull-gsc-data.js              # Pull latest available day (3 days ago)
 *   node scripts/pull-gsc-data.js --backfill=16 # Backfill last 16 days
 *   node scripts/pull-gsc-data.js --test        # Test API connection only
 *
 * Cron: 0 23 * * * (6:00 PM EST daily on production VPS)
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const gscService = require('../lib/services/gscService');

const prisma = new PrismaClient();

const DATA_DELAY_DAYS = 3;
const URL_INSPECTION_BUDGET = 500;
const INSPECTION_FRESHNESS_DAYS = 7;

async function pullDataForDate(dateStr) {
  // Check if data already exists
  const existing = await prisma.gscSiteSummary.findUnique({
    where: { date: new Date(dateStr) },
  });
  if (existing) {
    console.log(`  Data for ${dateStr} already exists, skipping fetch.`);
    return { skipped: true, pageCount: 0, queryCount: 0 };
  }

  // Fetch all dimensions in parallel
  console.log(`  Fetching page, query, device, and page+query metrics for ${dateStr}...`);
  const [pageRows, queryRows, deviceRows, pageQueryRows] = await Promise.all([
    gscService.getSearchAnalytics({
      startDate: dateStr, endDate: dateStr,
      dimensions: ['page'], rowLimit: 5000,
    }),
    gscService.getSearchAnalytics({
      startDate: dateStr, endDate: dateStr,
      dimensions: ['query'], rowLimit: 5000,
    }),
    gscService.getSearchAnalytics({
      startDate: dateStr, endDate: dateStr,
      dimensions: ['device'], rowLimit: 10,
    }),
    gscService.getSearchAnalytics({
      startDate: dateStr, endDate: dateStr,
      dimensions: ['page', 'query'], rowLimit: 2000,
    }),
  ]);

  // Save page metrics
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

  // Save query metrics
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

  // Save device metrics (only 3 rows: DESKTOP, MOBILE, TABLET)
  for (const row of deviceRows) {
    await prisma.gscDeviceMetric.upsert({
      where: {
        date_device: { date: new Date(dateStr), device: row.keys[0] },
      },
      update: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
      create: {
        date: new Date(dateStr),
        device: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    });
  }

  // Save page+query metrics in batches
  let savedPageQueries = 0;
  const PQ_BATCH_SIZE = 100;
  for (let i = 0; i < pageQueryRows.length; i += PQ_BATCH_SIZE) {
    const batch = pageQueryRows.slice(i, i + PQ_BATCH_SIZE);
    await prisma.$transaction(
      batch.map(row => {
        let pagePath;
        try { pagePath = new URL(row.keys[0]).pathname; }
        catch { pagePath = row.keys[0]; }
        const query = row.keys[1];

        return prisma.gscPageQueryMetric.upsert({
          where: {
            date_page_query: { date: new Date(dateStr), page: pagePath, query },
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
            query,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          },
        });
      })
    );
    savedPageQueries += batch.length;
  }

  // Compute device breakdown for site summary
  const mobileRow = deviceRows.find(r => r.keys[0] === 'MOBILE');
  const desktopRow = deviceRows.find(r => r.keys[0] === 'DESKTOP');

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
      mobileClicks: mobileRow?.clicks || null,
      mobileImpressions: mobileRow?.impressions || null,
      desktopClicks: desktopRow?.clicks || null,
      desktopImpressions: desktopRow?.impressions || null,
    },
    create: {
      date: new Date(dateStr),
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition,
      totalPages: pageRows.length,
      totalQueries: queryRows.length,
      mobileClicks: mobileRow?.clicks || null,
      mobileImpressions: mobileRow?.impressions || null,
      desktopClicks: desktopRow?.clicks || null,
      desktopImpressions: desktopRow?.impressions || null,
    },
  });

  console.log(`  Saved: ${savedPages} pages, ${savedQueries} queries, ${deviceRows.length} devices, ${savedPageQueries} page+query pairs`);
  console.log(`  Clicks: ${totalClicks} | Impressions: ${totalImpressions} | Mobile: ${mobileRow?.clicks || 0}c / Desktop: ${desktopRow?.clicks || 0}c`);
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

async function pullSitemapStatus(dateStr) {
  console.log('  Fetching sitemap status...');
  try {
    const sitemaps = await gscService.getSitemapStatus();

    for (const sitemap of sitemaps) {
      await prisma.gscSitemapStatus.upsert({
        where: {
          date_path: { date: new Date(dateStr), path: sitemap.path },
        },
        update: {
          lastDownloaded: sitemap.lastDownloaded ? new Date(sitemap.lastDownloaded) : null,
          lastSubmitted: sitemap.lastSubmitted ? new Date(sitemap.lastSubmitted) : null,
          isPending: sitemap.isPending,
          errors: sitemap.errors,
          warnings: sitemap.warnings,
          contents: sitemap.contents,
        },
        create: {
          date: new Date(dateStr),
          path: sitemap.path,
          lastDownloaded: sitemap.lastDownloaded ? new Date(sitemap.lastDownloaded) : null,
          lastSubmitted: sitemap.lastSubmitted ? new Date(sitemap.lastSubmitted) : null,
          isPending: sitemap.isPending,
          errors: sitemap.errors,
          warnings: sitemap.warnings,
          contents: sitemap.contents,
        },
      });
    }

    console.log(`  Saved ${sitemaps.length} sitemap status records`);
  } catch (error) {
    console.error('  Sitemap status fetch failed:', error.message);
  }
}

async function inspectPagesWithRotation(dateStr) {
  const targetDate = new Date(dateStr);
  const freshnessDate = new Date(targetDate);
  freshnessDate.setDate(freshnessDate.getDate() - INSPECTION_FRESHNESS_DAYS);
  const threeDaysAgo = new Date(targetDate);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // 1. All known pages ever seen in GSC
  const allPages = await prisma.gscPageMetric.findMany({
    select: { page: true },
    distinct: ['page'],
  });
  const allPageSet = new Set(allPages.map(p => p.page));

  // 2. Pages already inspected in the freshness window
  const recentInspections = await prisma.gscUrlInspection.findMany({
    where: { inspectedAt: { gte: freshnessDate } },
    select: { page: true },
    distinct: ['page'],
  });
  const recentSet = new Set(recentInspections.map(p => p.page));

  // 3. Pages needing inspection
  const uninspected = [...allPageSet].filter(p => !recentSet.has(p));

  let candidates;
  if (uninspected.length === 0) {
    // All pages recently inspected — pick oldest inspected ones
    const oldest = await prisma.gscUrlInspection.findMany({
      select: { page: true },
      distinct: ['page'],
      orderBy: { inspectedAt: 'asc' },
      take: URL_INSPECTION_BUDGET,
    });
    candidates = oldest.map(p => p.page);
    console.log(`  All ${allPageSet.size} pages inspected within ${INSPECTION_FRESHNESS_DAYS}d, re-checking ${candidates.length} oldest`);
  } else {
    // Prioritize: pages with recent traffic first, then rest alphabetically
    const recentTraffic = await prisma.gscPageMetric.findMany({
      where: { date: { gte: threeDaysAgo }, clicks: { gte: 1 } },
      select: { page: true },
      distinct: ['page'],
    });
    const trafficSet = new Set(recentTraffic.map(p => p.page));

    const withTraffic = uninspected.filter(p => trafficSet.has(p)).sort();
    const withoutTraffic = uninspected.filter(p => !trafficSet.has(p)).sort();
    candidates = [...withTraffic, ...withoutTraffic];
    console.log(`  ${uninspected.length} pages need inspection (${withTraffic.length} with recent traffic)`);
  }

  const pagesToInspect = candidates.slice(0, URL_INSPECTION_BUDGET);
  if (pagesToInspect.length === 0) {
    console.log('  No pages to inspect.');
    return;
  }

  const baseUrl = 'https://intelliresume.net';
  const urls = pagesToInspect.map(p => `${baseUrl}${p}`);

  console.log(`  Inspecting ${urls.length} pages...`);
  const results = await gscService.getIndexingStatus(urls);

  let issueCount = 0;
  let savedCount = 0;
  for (const result of results) {
    if (result.verdict === 'ERROR') continue;

    let pagePath;
    try { pagePath = new URL(result.url).pathname; }
    catch { pagePath = result.url; }

    // Save full inspection result
    await prisma.gscUrlInspection.upsert({
      where: {
        page_inspectedAt: { page: pagePath, inspectedAt: targetDate },
      },
      update: {
        verdict: result.verdict,
        coverageState: result.coverageState,
        indexingState: result.indexingState,
        crawledAs: result.crawledAs,
        lastCrawlTime: result.lastCrawlTime ? new Date(result.lastCrawlTime) : null,
        pageFetchState: result.pageFetchState,
        robotsTxtState: result.robotsTxtState,
        userCanonical: result.userCanonical,
        googleCanonical: result.googleCanonical,
        referringUrls: result.referringUrls,
        sitemap: result.sitemap,
        richResultsVerdict: result.richResultsVerdict,
        richResultsTypes: result.richResultsTypes,
        richResultsIssues: result.richResultsIssues?.length > 0 ? result.richResultsIssues : undefined,
        mobileUsabilityVerdict: result.mobileUsabilityVerdict,
        mobileUsabilityIssues: result.mobileUsabilityIssues?.length > 0 ? result.mobileUsabilityIssues : undefined,
      },
      create: {
        page: pagePath,
        inspectedAt: targetDate,
        verdict: result.verdict,
        coverageState: result.coverageState,
        indexingState: result.indexingState,
        crawledAs: result.crawledAs,
        lastCrawlTime: result.lastCrawlTime ? new Date(result.lastCrawlTime) : null,
        pageFetchState: result.pageFetchState,
        robotsTxtState: result.robotsTxtState,
        userCanonical: result.userCanonical,
        googleCanonical: result.googleCanonical,
        referringUrls: result.referringUrls,
        sitemap: result.sitemap,
        richResultsVerdict: result.richResultsVerdict,
        richResultsTypes: result.richResultsTypes,
        richResultsIssues: result.richResultsIssues?.length > 0 ? result.richResultsIssues : undefined,
        mobileUsabilityVerdict: result.mobileUsabilityVerdict,
        mobileUsabilityIssues: result.mobileUsabilityIssues?.length > 0 ? result.mobileUsabilityIssues : undefined,
      },
    });
    savedCount++;

    // Still create GscAlert for failures (backward compat with dashboard)
    if (result.verdict !== 'PASS' && result.verdict !== 'UNKNOWN') {
      issueCount++;
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

  console.log(`  URL inspection: ${savedCount} saved, ${issueCount} issues found`);
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
      // Alert detection and sitemap status can run in parallel
      console.log('\nRunning alert detection and sitemap status...');
      await Promise.all([
        detectAlerts(dateStr),
        pullSitemapStatus(dateStr),
      ]);

      if (!skipInspection) {
        console.log('\nRunning URL inspection (rotation)...');
        await inspectPagesWithRotation(dateStr);
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
