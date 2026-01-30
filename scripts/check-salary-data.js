#!/usr/bin/env node
/**
 * Check salary data by specialty and state from database
 * Used to verify/update salary calculator page figures
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SALARY DATA BY SPECIALTY ===\n');

  // Get salary stats grouped by specialty
  const specialtyStats = await prisma.$queryRaw`
    SELECT
      specialty,
      COUNT(*) as job_count,
      ROUND(AVG("salaryMinAnnual")) as avg_min_annual,
      ROUND(AVG("salaryMaxAnnual")) as avg_max_annual,
      ROUND(AVG("salaryMinHourly")) as avg_min_hourly,
      ROUND(AVG("salaryMaxHourly")) as avg_max_hourly,
      MIN("salaryMinAnnual") as min_annual,
      MAX("salaryMaxAnnual") as max_annual
    FROM "NursingJob"
    WHERE "isActive" = true
      AND "salaryMinAnnual" IS NOT NULL
      AND specialty IS NOT NULL
    GROUP BY specialty
    ORDER BY avg_max_annual DESC
    LIMIT 15
  `;

  console.log('Top 15 Specialties by Average Max Annual Salary:');
  console.log('------------------------------------------------');
  specialtyStats.forEach((s, i) => {
    const avgAnnual = `$${Math.round(s.avg_min_annual/1000)}K - $${Math.round(s.avg_max_annual/1000)}K`;
    const avgHourly = `$${s.avg_min_hourly} - $${s.avg_max_hourly}/hr`;
    console.log(`${i+1}. ${s.specialty} (${s.job_count} jobs)`);
    console.log(`   Annual: ${avgAnnual}`);
    console.log(`   Hourly: ${avgHourly}`);
    console.log(`   Range: $${s.min_annual?.toLocaleString()} - $${s.max_annual?.toLocaleString()}`);
    console.log('');
  });

  console.log('\n=== STATES WITH JOB DATA ===\n');

  // Get states with job counts
  const stateStats = await prisma.$queryRaw`
    SELECT
      state,
      COUNT(*) as job_count
    FROM "NursingJob"
    WHERE "isActive" = true
    GROUP BY state
    ORDER BY job_count DESC
  `;

  console.log('States with active jobs:');
  stateStats.forEach(s => {
    console.log(`  ${s.state}: ${s.job_count} jobs`);
  });

  console.log('\n=== OVERALL SALARY AVERAGE ===\n');

  // Get overall average
  const overallStats = await prisma.$queryRaw`
    SELECT
      COUNT(*) as total_jobs,
      ROUND(AVG("salaryMinAnnual")) as avg_min_annual,
      ROUND(AVG("salaryMaxAnnual")) as avg_max_annual,
      ROUND(AVG("salaryMinHourly")) as avg_min_hourly,
      ROUND(AVG("salaryMaxHourly")) as avg_max_hourly
    FROM "NursingJob"
    WHERE "isActive" = true
      AND "salaryMinAnnual" IS NOT NULL
  `;

  const overall = overallStats[0];
  console.log(`Total jobs with salary data: ${overall.total_jobs}`);
  console.log(`Average Annual: $${overall.avg_min_annual?.toLocaleString()} - $${overall.avg_max_annual?.toLocaleString()}`);
  console.log(`Average Hourly: $${overall.avg_min_hourly} - $${overall.avg_max_hourly}/hr`);

  await prisma.$disconnect();
}

main().catch(console.error);
