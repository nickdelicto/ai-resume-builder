#!/usr/bin/env node
/**
 * Reset jobs with old format so they can be re-classified with the LLM formatter template
 *
 * Usage: node scripts/reset-old-format-jobs.js <employer-slug>
 * Example: node scripts/reset-old-format-jobs.js yale-new-haven-health
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employerSlug = process.argv[2];

  if (!employerSlug) {
    console.log('Usage: node scripts/reset-old-format-jobs.js <employer-slug>');
    console.log('Example: node scripts/reset-old-format-jobs.js yale-new-haven-health');
    process.exit(1);
  }

  const employer = await prisma.healthcareEmployer.findFirst({
    where: { slug: employerSlug }
  });

  if (!employer) {
    console.log('Employer not found:', employerSlug);
    process.exit(1);
  }

  console.log('Employer:', employer.name);

  // Find jobs that are active and classified but don't have the new template format
  const jobs = await prisma.nursingJob.findMany({
    where: {
      employerId: employer.id,
      isActive: true,
      classifiedAt: { not: null }
    },
    select: { id: true, title: true, description: true }
  });

  // New template markers
  const NEW_FORMAT_MARKERS = ['## About This Role', '## 📋 Highlights', "## What You'll Do"];

  const oldFormatJobs = jobs.filter(j => {
    const desc = j.description || '';
    return !NEW_FORMAT_MARKERS.some(marker => desc.includes(marker));
  });

  console.log('Total active classified jobs:', jobs.length);
  console.log('Jobs with old format:', oldFormatJobs.length);

  if (oldFormatJobs.length === 0) {
    console.log('No jobs need reformatting.');
    await prisma.$disconnect();
    return;
  }

  console.log('\nJobs to reset:');
  oldFormatJobs.forEach(j => console.log('  -', j.title));

  // Reset these jobs so classifier will pick them up
  const result = await prisma.nursingJob.updateMany({
    where: { id: { in: oldFormatJobs.map(j => j.id) } },
    data: {
      classifiedAt: null,   // Clear so classifier picks them up
      isActive: false,      // Classifier only processes inactive jobs
      scrapedAt: new Date() // Update so 48-hour cutoff doesn't exclude them
    }
  });

  console.log('\nReset', result.count, 'jobs');
  console.log('\nNow run: node scripts/classify-jobs-with-llm.js --employer=' + employerSlug);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
