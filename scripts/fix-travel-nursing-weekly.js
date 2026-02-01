#!/usr/bin/env node
/**
 * Fix travel nursing jobs with weekly pay
 *
 * Travel nursing jobs quote weekly rates ($2000-4000/week) which were incorrectly
 * marked as annual. This script:
 * 1. Identifies travel nursing jobs by title pattern
 * 2. Sets salaryType to 'weekly'
 * 3. Nulls out hourly/annual computed fields (excludes from salary calculations)
 *
 * The raw salaryMin/salaryMax are preserved for display purposes.
 *
 * Usage: node scripts/fix-travel-nursing-weekly.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('=== FIX TRAVEL NURSING WEEKLY PAY ===');
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE');
  console.log('');

  // Find travel nursing jobs with suspicious salary data
  // Criteria: title contains "travel" AND salary in weekly range ($1500-5000)
  const travelJobs = await prisma.nursingJob.findMany({
    where: {
      isActive: true,
      title: { contains: 'Travel', mode: 'insensitive' },
      salaryMin: { gte: 1500, lte: 5000 },
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

  console.log(`Found ${travelJobs.length} travel nursing jobs with weekly pay\n`);

  if (travelJobs.length === 0) {
    console.log('Nothing to fix!');
    await prisma.$disconnect();
    return;
  }

  // Group by employer
  const byEmployer = {};
  for (const job of travelJobs) {
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

  // Show sample jobs
  console.log('Sample jobs to fix:');
  for (const job of travelJobs.slice(0, 10)) {
    console.log(`  $${job.salaryMin}/week | ${job.title.substring(0, 50)}`);
  }
  if (travelJobs.length > 10) {
    console.log(`  ... and ${travelJobs.length - 10} more`);
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
        id: { in: travelJobs.map(j => j.id) }
      },
      data: {
        salaryType: 'weekly',
        salaryMinHourly: null,
        salaryMaxHourly: null,
        salaryMinAnnual: null,
        salaryMaxAnnual: null
      }
    });

    console.log(`Updated ${result.count} travel nursing jobs`);
    console.log('  - salaryType set to "weekly"');
    console.log('  - Hourly/annual fields nulled (excluded from salary stats)');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
