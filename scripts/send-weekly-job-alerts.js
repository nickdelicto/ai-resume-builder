#!/usr/bin/env node

/**
 * Weekly Job Alerts Script
 * 
 * Runs every Tuesday at 7 AM EST via cron
 * Sends personalized job alerts to all active subscribers
 * 
 * Usage:
 *   node scripts/send-weekly-job-alerts.js
 *   node scripts/send-weekly-job-alerts.js --dry-run (test without sending)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import email service
const { getMatchingJobs, sendJobAlertEmail } = require('../lib/services/jobAlertEmailService');

const isDryRun = process.argv.includes('--dry-run');
const skipRecencyCheck = process.argv.includes('--skip-recency-check'); // For testing only

/**
 * Check if a date is within the last N days
 */
function isWithinLastNDays(date, days) {
  if (!date) return false;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);
  return new Date(date) > daysAgo;
}

/**
 * Main function to send weekly job alerts
 */
async function sendWeeklyJobAlerts() {
  console.log('🚀 Starting Weekly Job Alerts Script');
  console.log(`📅 Run Date: ${new Date().toISOString()}`);
  console.log(`🧪 Mode: ${isDryRun ? 'DRY RUN (no emails sent)' : 'LIVE'}`);
  if (skipRecencyCheck) console.log('⚠️  SKIP RECENCY CHECK: Enabled (testing mode)');
  console.log('---');

  let stats = {
    totalAlerts: 0,
    emailsSent: 0,
    skippedRecent: 0,
    skippedNoJobs: 0,
    skippedTooFewJobs: 0,
    errors: 0
  };

  try {
    // 1. Fetch all active job alerts
    const alerts = await prisma.jobAlert.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' }
    });

    stats.totalAlerts = alerts.length;
    console.log(`📬 Found ${alerts.length} active job alert(s)\n`);

    if (alerts.length === 0) {
      console.log('✅ No active alerts to process. Exiting.');
      return;
    }

    // 2. Process each alert
    for (const alert of alerts) {
      console.log(`\n📧 Processing Alert #${alert.id.substring(0, 8)}...`);
      console.log(`   Email: ${alert.email}`);
      console.log(`   Specialty: ${alert.specialty || 'Any'}`);
      console.log(`   Location: ${alert.location || 'Any'}`);
      console.log(`   Source: ${alert.source}`);

      try {
        // Check if we sent email in last 6 days (prevent duplicates)
        if (!skipRecencyCheck && alert.lastEmailSent && isWithinLastNDays(alert.lastEmailSent, 6)) {
          console.log(`   ⏭️  SKIPPED: Email sent ${Math.floor((Date.now() - new Date(alert.lastEmailSent)) / (1000 * 60 * 60 * 24))} days ago`);
          stats.skippedRecent++;
          continue;
        }

        // Fetch matching jobs
        const jobs = await getMatchingJobs(alert);

        if (!jobs || jobs.length === 0) {
          console.log(`   ⏭️  SKIPPED: No matching jobs found`);
          stats.skippedNoJobs++;
          continue;
        }

        // Check minimum job threshold (2 jobs)
        if (jobs.length < 2) {
          console.log(`   ⏭️  SKIPPED: Only ${jobs.length} job(s) found (minimum 2 required)`);
          stats.skippedTooFewJobs++;
          continue;
        }

        console.log(`   ✅ Found ${jobs.length} matching job(s)`);

        // Send email (unless dry run)
        if (!isDryRun) {
          await sendJobAlertEmail(alert, jobs);
          console.log(`   📨 Email sent successfully!`);
          stats.emailsSent++;
        } else {
          console.log(`   🧪 DRY RUN: Would send email with ${jobs.length} jobs`);
          stats.emailsSent++;
        }

        // Small delay to avoid rate limiting (100ms between emails)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ ERROR processing alert:`, error.message);
        stats.errors++;
        // Continue to next alert even if one fails
        continue;
      }
    }

    // 3. Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Active Alerts:     ${stats.totalAlerts}`);
    console.log(`Emails Sent:             ${stats.emailsSent} ✅`);
    console.log(`Skipped (Recent):        ${stats.skippedRecent}`);
    console.log(`Skipped (No Jobs):       ${stats.skippedNoJobs}`);
    console.log(`Skipped (Too Few Jobs):  ${stats.skippedTooFewJobs}`);
    console.log(`Errors:                  ${stats.errors} ${stats.errors > 0 ? '⚠️' : ''}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n🧪 DRY RUN COMPLETE - No emails were actually sent');
    } else {
      console.log('\n✅ Weekly Job Alerts Complete!');
    }

  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
sendWeeklyJobAlerts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

