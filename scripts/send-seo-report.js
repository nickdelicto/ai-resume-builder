#!/usr/bin/env node

/**
 * Send daily SEO report email via Brevo
 *
 * Usage:
 *   node scripts/send-seo-report.js           # Generate and send report for latest data
 *   node scripts/send-seo-report.js --preview  # Print report to console, don't send email
 *
 * Cron: 30 11 * * * (6:30 AM EST daily on production VPS, after pull-gsc-data.js)
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { generateDailyReport } = require('../lib/services/seoAnalysisService');

const prisma = new PrismaClient();

const RECIPIENTS = [
  { email: 'delictodelight@gmail.com', name: 'Nick' },
  { email: 'nick@intelliresume.net', name: 'Nick' },
];

function buildReportEmail(dateStr, aiReport, alerts, summary, topPages, topQueries) {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  const alertsSection = (items, color, bgColor, borderColor, title) => {
    if (items.length === 0) return '';
    return `
    <div style="margin: 16px 20px; padding: 16px; background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 4px;">
      <h3 style="margin: 0 0 8px; color: ${borderColor}; font-size: 14px; font-weight: 600;">${title}</h3>
      ${items.map(a => `<p style="margin: 4px 0; font-size: 13px; color: ${color};">${a.title}</p>`).join('')}
    </div>`;
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">SEO Daily Report</h1>
      <p style="color: #93c5fd; margin: 8px 0 0; font-size: 14px;">${dateStr}</p>
    </div>

    <!-- Quick Stats -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #e5e7eb;">
      <tr>
        <td style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${summary.totalClicks}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Clicks</div>
        </td>
        <td style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${summary.totalImpressions.toLocaleString()}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Impressions</div>
        </td>
        <td style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #059669;">${(summary.avgCtr * 100).toFixed(1)}%</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">CTR</div>
        </td>
        <td style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #d97706;">${summary.avgPosition.toFixed(1)}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Avg Position</div>
        </td>
      </tr>
    </table>

    <!-- Alerts -->
    ${alertsSection(criticalAlerts, '#991b1b', '#fef2f2', '#dc2626', 'Critical Alerts')}
    ${alertsSection(warningAlerts, '#92400e', '#fffbeb', '#d97706', 'Warnings')}
    ${alertsSection(infoAlerts, '#166534', '#f0fdf4', '#16a34a', 'Wins')}

    <!-- AI Analysis -->
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827; font-weight: 600;">Analysis</h3>
      <div style="font-size: 14px; line-height: 1.7; color: #374151; white-space: pre-wrap;">${aiReport}</div>
    </div>

    <!-- Top Pages -->
    <div style="padding: 0 20px 16px;">
      <h3 style="margin: 0 0 10px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Top Pages</h3>
      ${topPages.slice(0, 20).map((p, i) => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px;">
          <span style="color: #374151;">${i + 1}. ${p.page.length > 45 ? p.page.slice(0, 45) + '...' : p.page}</span>
          <span style="color: #2563eb; font-weight: 600; white-space: nowrap; margin-left: 8px;">${p.clicks} clicks</span>
        </div>
      `).join('')}
    </div>

    <!-- Top Queries -->
    <div style="padding: 0 20px 20px;">
      <h3 style="margin: 0 0 10px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Top Queries</h3>
      ${topQueries.slice(0, 20).map((q, i) => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px;">
          <span style="color: #374151;">${i + 1}. "${q.query.length > 40 ? q.query.slice(0, 40) + '...' : q.query}"</span>
          <span style="color: #7c3aed; font-weight: 600; white-space: nowrap; margin-left: 8px;">${q.clicks} clicks</span>
        </div>
      `).join('')}
    </div>

    <!-- Footer -->
    <div style="padding: 16px 20px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
      <a href="https://intelliresume.net/admin/seo" style="color: #2563eb; text-decoration: none; font-size: 13px; font-weight: 500;">View Full Dashboard</a>
      <p style="margin: 8px 0 0; font-size: 11px; color: #9ca3af;">IntelliResume SEO Monitor</p>
    </div>

  </div>
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const previewMode = args.includes('--preview');

  // Find the latest date with data
  const latestSummary = await prisma.gscSiteSummary.findFirst({
    orderBy: { date: 'desc' },
  });

  if (!latestSummary) {
    console.error('No GSC data found. Run pull-gsc-data.js first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const dateStr = latestSummary.date.toISOString().split('T')[0];
  console.log(`Generating SEO report for ${dateStr}...`);

  const { report, alerts, summary, topPages, topQueries } = await generateDailyReport(dateStr);

  if (previewMode) {
    console.log('\n=== AI REPORT ===\n');
    console.log(report);
    console.log('\n=== ALERTS ===');
    for (const a of alerts) {
      console.log(`  [${a.severity}] ${a.title}`);
    }
    console.log(`\n=== TOP PAGES ===`);
    for (const p of topPages.slice(0, 20)) {
      console.log(`  ${p.page} — ${p.clicks} clicks`);
    }
    console.log(`\n=== TOP QUERIES ===`);
    for (const q of topQueries.slice(0, 20)) {
      console.log(`  "${q.query}" — ${q.clicks} clicks`);
    }
    console.log('\n(Preview mode — email not sent)');
    await prisma.$disconnect();
    return;
  }

  // Build email HTML
  const emailHTML = buildReportEmail(dateStr, report, alerts, summary, topPages, topQueries);

  // Send via Brevo
  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY not set. Cannot send email.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  let subjectEmoji = '';
  if (criticalCount > 0) subjectEmoji = '🔴 ';
  else if (warningCount > 0) subjectEmoji = '🟡 ';
  else subjectEmoji = '🟢 ';

  sendSmtpEmail.subject = `${subjectEmoji}SEO Report ${dateStr}: ${summary.totalClicks} clicks, ${summary.totalImpressions.toLocaleString()} impressions`;
  sendSmtpEmail.htmlContent = emailHTML;
  sendSmtpEmail.sender = {
    name: process.env.EMAIL_FROM_NAME || 'IntelliResume SEO Monitor',
    email: process.env.EMAIL_FROM || 'rnjobs@intelliresume.net',
  };
  sendSmtpEmail.to = RECIPIENTS;
  sendSmtpEmail.replyTo = { email: process.env.EMAIL_REPLY_TO || 'nick@intelliresume.net' };

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`SEO report sent to: ${RECIPIENTS.map(r => r.email).join(', ')}`);
  } catch (error) {
    console.error('Failed to send email:', error.message);
    if (error.response?.body) {
      console.error('Brevo error:', JSON.stringify(error.response.body));
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
