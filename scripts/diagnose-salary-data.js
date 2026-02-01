#!/usr/bin/env node
/**
 * Diagnostic script to investigate bad salary data
 *
 * Finds jobs with suspicious salary classifications:
 * - Low values marked as "annual" (clearly mislabeled hourly rates)
 * - Weekly pay patterns (travel nursing jobs)
 *
 * Usage: node scripts/diagnose-salary-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SALARY DATA DIAGNOSTIC ===\n');

  // 1. Find jobs where salaryMin < 500 AND salaryType = 'annual' (clearly mislabeled)
  console.log('--- Jobs with LOW values marked as ANNUAL (likely mislabeled hourly) ---\n');

  const mislabeledAnnual = await prisma.nursingJob.findMany({
    where: {
      salaryMin: { lt: 500 },
      salaryType: 'annual',
      isActive: true
    },
    select: {
      id: true,
      title: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      employer: { select: { name: true, slug: true } },
      createdAt: true,
      scrapedAt: true
    },
    orderBy: { salaryMin: 'asc' }
  });

  console.log(`Found ${mislabeledAnnual.length} jobs with salaryMin < $500 marked as annual:\n`);

  // Group by employer
  const byEmployerMislabeled = {};
  for (const job of mislabeledAnnual) {
    const slug = job.employer?.slug || 'unknown';
    if (!byEmployerMislabeled[slug]) {
      byEmployerMislabeled[slug] = { name: job.employer?.name, jobs: [] };
    }
    byEmployerMislabeled[slug].jobs.push(job);
  }

  for (const [slug, data] of Object.entries(byEmployerMislabeled)) {
    console.log(`\n${data.name || slug} (${data.jobs.length} jobs):`);
    for (const job of data.jobs.slice(0, 5)) {
      console.log(`  - $${job.salaryMin}/${job.salaryType} | ${job.title.substring(0, 50)}`);
      console.log(`    ID: ${job.id} | Scraped: ${job.scrapedAt?.toISOString().split('T')[0]}`);
    }
    if (data.jobs.length > 5) {
      console.log(`  ... and ${data.jobs.length - 5} more`);
    }
  }

  // 2. Find all salary types in use
  console.log('\n\n--- ALL SALARY TYPES IN DATABASE ---\n');

  const salaryTypes = await prisma.nursingJob.groupBy({
    by: ['salaryType'],
    where: { isActive: true, salaryMin: { not: null } },
    _count: { id: true },
    _min: { salaryMin: true },
    _max: { salaryMax: true }
  });

  console.log('Type\t\tCount\t\tMin Value\tMax Value');
  console.log('-'.repeat(60));
  for (const st of salaryTypes) {
    const type = st.salaryType || '(null)';
    console.log(`${type.padEnd(12)}\t${st._count.id}\t\t$${st._min.salaryMin}\t\t$${st._max.salaryMax || 'N/A'}`);
  }

  // 3. Find weekly pay patterns (travel nursing)
  console.log('\n\n--- Jobs with WEEKLY salary type ---\n');

  const weeklyJobs = await prisma.nursingJob.findMany({
    where: {
      salaryType: 'weekly',
      isActive: true
    },
    select: {
      id: true,
      title: true,
      salaryMin: true,
      salaryMax: true,
      employer: { select: { name: true, slug: true } }
    },
    take: 20
  });

  console.log(`Found ${weeklyJobs.length} jobs with weekly salary type:`);
  for (const job of weeklyJobs) {
    console.log(`  - $${job.salaryMin}-${job.salaryMax || '?'}/week | ${job.employer?.name} | ${job.title.substring(0, 40)}`);
  }

  // 4. Check for any pattern in raw description mentioning "/hr" or "per hour"
  console.log('\n\n--- Jobs marked ANNUAL but description mentions hourly ---\n');

  const suspiciousAnnual = await prisma.nursingJob.findMany({
    where: {
      salaryType: 'annual',
      isActive: true,
      salaryMin: { lt: 200 },
      OR: [
        { description: { contains: '/hr' } },
        { description: { contains: 'per hour' } },
        { description: { contains: '/hour' } }
      ]
    },
    select: {
      id: true,
      title: true,
      salaryMin: true,
      salaryMax: true,
      description: true,
      employer: { select: { name: true, slug: true } }
    },
    take: 10
  });

  console.log(`Found ${suspiciousAnnual.length} suspicious jobs (annual < $200 but mentions hourly):\n`);
  for (const job of suspiciousAnnual) {
    console.log(`ID: ${job.id}`);
    console.log(`Title: ${job.title}`);
    console.log(`Employer: ${job.employer?.name}`);
    console.log(`Salary: $${job.salaryMin}-${job.salaryMax || '?'} (${job.salaryType})`);

    // Extract salary-related text from description
    const desc = job.description || '';
    const salaryMatch = desc.match(/.{0,50}(\$\d+|\d+\.\d+).{0,50}/i);
    if (salaryMatch) {
      console.log(`Desc excerpt: ...${salaryMatch[0]}...`);
    }
    console.log('---');
  }

  // 5. Check salaryMinHourly vs salaryMin for inconsistencies
  console.log('\n\n--- Jobs where hourly conversion seems wrong ---\n');

  const hourlyMismatch = await prisma.nursingJob.findMany({
    where: {
      isActive: true,
      salaryMin: { not: null },
      salaryMinHourly: { not: null },
      // Hourly should be in $20-150 range typically
      OR: [
        { salaryMinHourly: { lt: 15 } },
        { salaryMinHourly: { gt: 200 } }
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
      employer: { select: { name: true, slug: true } }
    },
    take: 20
  });

  console.log(`Found ${hourlyMismatch.length} jobs with unusual hourly rates:\n`);
  for (const job of hourlyMismatch) {
    console.log(`  $${job.salaryMinHourly?.toFixed(2)}/hr (from $${job.salaryMin}/${job.salaryType}) | ${job.employer?.name} | ${job.title.substring(0, 40)}`);
  }

  // 6. Summary by employer - who has the most salary data issues?
  console.log('\n\n--- EMPLOYER SUMMARY: Jobs with salaryMin but no salaryMinHourly ---\n');

  const employerSummary = await prisma.nursingJob.groupBy({
    by: ['employerId'],
    where: {
      isActive: true,
      salaryMin: { not: null },
      salaryMinHourly: null
    },
    _count: { id: true }
  });

  // Get employer names
  const employerIds = employerSummary.map(e => e.employerId);
  const employers = await prisma.healthcareEmployer.findMany({
    where: { id: { in: employerIds } },
    select: { id: true, name: true, slug: true }
  });
  const employerMap = Object.fromEntries(employers.map(e => [e.id, e]));

  const sorted = employerSummary.sort((a, b) => b._count.id - a._count.id);
  console.log('Employer\t\t\t\t\tMissing Hourly');
  console.log('-'.repeat(60));
  for (const e of sorted) {
    const emp = employerMap[e.employerId];
    const name = (emp?.name || 'Unknown').substring(0, 35).padEnd(40);
    console.log(`${name}\t${e._count.id}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
