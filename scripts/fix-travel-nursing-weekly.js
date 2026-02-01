#!/usr/bin/env node
/**
 * Fix travel/contract nursing jobs with weekly pay
 *
 * Travel and FlexStaff jobs quote weekly rates ($2000-4000/week) which were
 * incorrectly marked as annual. This script:
 * 1. Identifies weekly-pay jobs by title patterns (Travel, FlexStaff, Temp contracts)
 * 2. Sets salaryType to 'weekly'
 * 3. Nulls out hourly/annual computed fields (excludes from salary calculations)
 *
 * The raw salaryMin/salaryMax are preserved for display purposes.
 *
 * Detection patterns:
 * - "Travel" in title
 * - "FlexStaff" in title
 * - "Temp" + contract patterns
 * - Explicit weekly amounts in title ($2902/week, $3k/wk)
 *
 * Usage: node scripts/fix-travel-nursing-weekly.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Check if a job title indicates weekly pay
 */
function isWeeklyPayTitle(title) {
  if (!title) return false;
  const lower = title.toLowerCase();

  // Direct indicators
  if (lower.includes('travel')) return true;
  if (lower.includes('flexstaff')) return true;

  // Temp contract patterns
  if (lower.includes('temp') && (lower.includes('contract') || lower.includes('flex'))) return true;

  // Explicit weekly in title: "$2902/week", "$3k/wk"
  if (/\/\s*w(?:ee)?k/i.test(title)) return true;

  return false;
}

async function main() {
  console.log('=== FIX WEEKLY PAY JOBS (Travel/FlexStaff/Contracts) ===');
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE');
  console.log('');

  // Find all jobs with salary in weekly range that aren't already marked weekly
  const allJobsInRange = await prisma.nursingJob.findMany({
    where: {
      isActive: true,
      salaryMin: { gte: 1500, lte: 6000 },
      salaryType: { not: 'weekly' }  // Not already fixed
    },
    select: {
      id: true,
      title: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      salaryMinHourly: true,
      employer: { select: { name: true, slug: true } }
    }
  });

  // Filter to only weekly-pay jobs based on title patterns
  const weeklyJobs = allJobsInRange.filter(job => isWeeklyPayTitle(job.title));

  console.log(`Found ${weeklyJobs.length} weekly-pay jobs (from ${allJobsInRange.length} in salary range)\n`);

  if (weeklyJobs.length === 0) {
    console.log('Nothing to fix!');
    await prisma.$disconnect();
    return;
  }

  // Group by employer
  const byEmployer = {};
  for (const job of weeklyJobs) {
    const slug = job.employer?.slug || 'unknown';
    if (!byEmployer[slug]) {
      byEmployer[slug] = { name: job.employer?.name, jobs: [] };
    }
    byEmployer[slug].jobs.push(job);
  }

  console.log('Jobs by employer:');
  for (const [slug, data] of Object.entries(byEmployer)) {
    console.log(`  ${data.name}: ${data.jobs.length}`);
  }
  console.log('');

  // Categorize by detection pattern
  const byPattern = {
    travel: weeklyJobs.filter(j => j.title.toLowerCase().includes('travel')),
    flexstaff: weeklyJobs.filter(j => j.title.toLowerCase().includes('flexstaff') && !j.title.toLowerCase().includes('travel')),
    tempContract: weeklyJobs.filter(j => j.title.toLowerCase().includes('temp') && !j.title.toLowerCase().includes('travel') && !j.title.toLowerCase().includes('flexstaff')),
    weeklyInTitle: weeklyJobs.filter(j => /\/\s*w(?:ee)?k/i.test(j.title) && !j.title.toLowerCase().includes('travel') && !j.title.toLowerCase().includes('flexstaff'))
  };

  console.log('By detection pattern:');
  console.log(`  Travel: ${byPattern.travel.length}`);
  console.log(`  FlexStaff: ${byPattern.flexstaff.length}`);
  console.log(`  Temp/Contract: ${byPattern.tempContract.length}`);
  console.log(`  Weekly in title: ${byPattern.weeklyInTitle.length}`);
  console.log('');

  // Show sample jobs
  console.log('Sample jobs to fix:');
  for (const job of weeklyJobs.slice(0, 10)) {
    console.log(`  $${job.salaryMin}/week | ${job.title.substring(0, 55)}`);
  }
  if (weeklyJobs.length > 10) {
    console.log(`  ... and ${weeklyJobs.length - 10} more`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('Would update these jobs to:');
    console.log('  salaryType: "weekly"');
    console.log('  salaryMinHourly: null');
    console.log('  salaryMaxHourly: null');
    console.log('  salaryMinAnnual: null');
    console.log('  salaryMaxAnnual: null');
    console.log('\nRun without --dry-run to apply changes');
  } else {
    const result = await prisma.nursingJob.updateMany({
      where: {
        id: { in: weeklyJobs.map(j => j.id) }
      },
      data: {
        salaryType: 'weekly',
        salaryMinHourly: null,
        salaryMaxHourly: null,
        salaryMinAnnual: null,
        salaryMaxAnnual: null
      }
    });

    console.log(`Updated ${result.count} weekly-pay jobs`);
    console.log('  - salaryType set to "weekly"');
    console.log('  - Hourly/annual fields nulled (excluded from salary stats)');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
