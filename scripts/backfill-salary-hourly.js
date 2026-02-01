#!/usr/bin/env node
/**
 * Backfill missing salaryMinHourly/salaryMaxHourly for jobs that have salaryMin/salaryMax
 *
 * Jobs have raw salary data but missing the normalized hourly conversion needed for
 * salary pages and statistics.
 *
 * Usage: node scripts/backfill-salary-hourly.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('=== SALARY HOURLY BACKFILL ===');
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE');
  console.log('');

  // Find jobs missing hourly conversion
  const jobs = await prisma.nursingJob.findMany({
    where: {
      isActive: true,
      salaryMin: { not: null },
      // Skip weekly jobs - they should stay excluded from salary stats
      NOT: { salaryType: 'weekly' },
      OR: [
        { salaryMinHourly: null },
        { salaryMaxHourly: null }
      ]
    },
    select: {
      id: true,
      title: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      salaryMinHourly: true,
      salaryMaxHourly: true,
      salaryMinAnnual: true,
      salaryMaxAnnual: true,
      employer: { select: { name: true, slug: true } }
    }
  });

  console.log(`Found ${jobs.length} jobs needing hourly conversion\n`);

  if (jobs.length === 0) {
    console.log('Nothing to do!');
    await prisma.$disconnect();
    return;
  }

  // Group by employer for logging
  const byEmployer = {};
  for (const job of jobs) {
    const slug = job.employer?.slug || 'unknown';
    if (!byEmployer[slug]) {
      byEmployer[slug] = { name: job.employer?.name, count: 0 };
    }
    byEmployer[slug].count++;
  }

  console.log('Jobs by employer:');
  for (const [slug, data] of Object.entries(byEmployer)) {
    console.log(`  ${data.name}: ${data.count}`);
  }
  console.log('');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const job of jobs) {
    try {
      let salaryMinHourly = job.salaryMinHourly;
      let salaryMaxHourly = job.salaryMaxHourly;
      let salaryMinAnnual = job.salaryMinAnnual;
      let salaryMaxAnnual = job.salaryMaxAnnual;
      let salaryType = job.salaryType;

      // Detect travel nursing with weekly pay - skip these
      const isTravel = job.title.toLowerCase().includes('travel');
      const isWeeklyRange = job.salaryMin >= 1500 && job.salaryMin <= 5000;
      if (isTravel && isWeeklyRange) {
        console.log(`  Skipping travel job (weekly pay): ${job.title.substring(0, 40)}`);
        skipped++;
        continue;
      }

      // If no salaryType, infer from value magnitude
      if (!salaryType) {
        // Values under 500 are hourly, over are annual
        salaryType = job.salaryMin < 500 ? 'hourly' : 'annual';
      }

      // Compute missing fields based on type
      if (salaryType === 'hourly') {
        if (!salaryMinHourly && job.salaryMin) {
          salaryMinHourly = job.salaryMin;
        }
        if (!salaryMaxHourly && job.salaryMax) {
          salaryMaxHourly = job.salaryMax;
        }
        // Also compute annual from hourly (2080 hours/year)
        if (!salaryMinAnnual && salaryMinHourly) {
          salaryMinAnnual = Math.round(salaryMinHourly * 2080);
        }
        if (!salaryMaxAnnual && salaryMaxHourly) {
          salaryMaxAnnual = Math.round(salaryMaxHourly * 2080);
        }
      } else if (salaryType === 'annual') {
        if (!salaryMinAnnual && job.salaryMin) {
          salaryMinAnnual = job.salaryMin;
        }
        if (!salaryMaxAnnual && job.salaryMax) {
          salaryMaxAnnual = job.salaryMax;
        }
        // Compute hourly from annual (2080 hours/year)
        if (!salaryMinHourly && salaryMinAnnual) {
          salaryMinHourly = Math.round(salaryMinAnnual / 2080);
        }
        if (!salaryMaxHourly && salaryMaxAnnual) {
          salaryMaxHourly = Math.round(salaryMaxAnnual / 2080);
        }
      }

      // Skip if nothing changed
      if (
        salaryMinHourly === job.salaryMinHourly &&
        salaryMaxHourly === job.salaryMaxHourly &&
        salaryMinAnnual === job.salaryMinAnnual &&
        salaryMaxAnnual === job.salaryMaxAnnual &&
        salaryType === job.salaryType
      ) {
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`Would update: ${job.title.substring(0, 40)}`);
        console.log(`  Raw: $${job.salaryMin}-${job.salaryMax || '?'}/${job.salaryType || 'unknown'}`);
        console.log(`  → hourly: $${salaryMinHourly}-${salaryMaxHourly}, annual: $${salaryMinAnnual}-${salaryMaxAnnual}`);
        updated++;
      } else {
        await prisma.nursingJob.update({
          where: { id: job.id },
          data: {
            salaryType,
            salaryMinHourly,
            salaryMaxHourly,
            salaryMinAnnual,
            salaryMaxAnnual
          }
        });
        updated++;
      }
    } catch (err) {
      console.error(`Error updating job ${job.id}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n=== RESULTS ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no change): ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (DRY_RUN && updated > 0) {
    console.log('\nRun without --dry-run to apply changes');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
