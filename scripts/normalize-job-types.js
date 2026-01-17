#!/usr/bin/env node
/**
 * One-time migration script to normalize jobType values in the database
 *
 * This script normalizes inconsistent job type values:
 * - "Full Time", "full-time", "Full-Time" → "full-time"
 * - "Per Diem", "prn", "PRN" → "per-diem"
 * - "Part Time", "part-time" → "part-time"
 * - "Travel" → "travel"
 * - "Contract" → "contract"
 *
 * Run with: node scripts/normalize-job-types.js
 * Add --dry-run to preview changes without applying them
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapping of raw DB values to canonical normalized values
const JOB_TYPE_NORMALIZATION = {
  // Full-time variations
  'Full Time': 'full-time',
  'full-time': 'full-time',
  'Full-Time': 'full-time',
  'full time': 'full-time',
  'fulltime': 'full-time',
  'FULL TIME': 'full-time',

  // Part-time variations
  'Part Time': 'part-time',
  'part-time': 'part-time',
  'Part-Time': 'part-time',
  'part time': 'part-time',
  'parttime': 'part-time',
  'PART TIME': 'part-time',

  // PRN/Per Diem variations - all normalize to 'per-diem'
  'Per Diem': 'per-diem',
  'per-diem': 'per-diem',
  'per diem': 'per-diem',
  'PRN': 'per-diem',
  'prn': 'per-diem',
  'perdiem': 'per-diem',

  // Travel variations
  'Travel': 'travel',
  'travel': 'travel',
  'TRAVEL': 'travel',

  // Contract variations
  'Contract': 'contract',
  'contract': 'contract',
  'CONTRACT': 'contract'
};

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Job Type Normalization Script');
  console.log(isDryRun ? '** DRY RUN MODE - No changes will be made **' : '** LIVE MODE - Changes will be applied **');
  console.log('='.repeat(60));
  console.log('');

  // Get current state of job types
  console.log('Current job type distribution:');
  const currentJobTypes = await prisma.nursingJob.groupBy({
    by: ['jobType'],
    where: { jobType: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  currentJobTypes.forEach(jt => {
    const normalized = JOB_TYPE_NORMALIZATION[jt.jobType];
    const needsUpdate = normalized && normalized !== jt.jobType;
    const status = needsUpdate ? `→ "${normalized}"` : '(already normalized)';
    console.log(`  "${jt.jobType}": ${jt._count.id} jobs ${status}`);
  });

  console.log('');

  // Group updates by target value
  const updates = {};
  for (const [raw, normalized] of Object.entries(JOB_TYPE_NORMALIZATION)) {
    if (raw !== normalized) {
      if (!updates[normalized]) {
        updates[normalized] = [];
      }
      updates[normalized].push(raw);
    }
  }

  // Perform updates
  let totalUpdated = 0;

  for (const [targetValue, sourceValues] of Object.entries(updates)) {
    console.log(`Normalizing to "${targetValue}"...`);

    for (const sourceValue of sourceValues) {
      // Count how many will be updated
      const count = await prisma.nursingJob.count({
        where: { jobType: sourceValue }
      });

      if (count > 0) {
        console.log(`  "${sourceValue}" → "${targetValue}": ${count} jobs`);

        if (!isDryRun) {
          await prisma.nursingJob.updateMany({
            where: { jobType: sourceValue },
            data: { jobType: targetValue }
          });
        }

        totalUpdated += count;
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Total jobs ${isDryRun ? 'to be updated' : 'updated'}: ${totalUpdated}`);
  console.log('='.repeat(60));

  if (!isDryRun) {
    // Verify final state
    console.log('');
    console.log('Final job type distribution:');
    const finalJobTypes = await prisma.nursingJob.groupBy({
      by: ['jobType'],
      where: { jobType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    finalJobTypes.forEach(jt => {
      console.log(`  "${jt.jobType}": ${jt._count.id} jobs`);
    });
  }

  if (isDryRun) {
    console.log('');
    console.log('To apply these changes, run without --dry-run:');
    console.log('  node scripts/normalize-job-types.js');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
