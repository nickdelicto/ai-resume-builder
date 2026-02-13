#!/usr/bin/env node

/**
 * Normalize non-canonical specialty values in the database.
 *
 * Many jobs were classified before normalizeSpecialty() validation was added.
 * Their specialty field contains non-canonical values like "Care Coordination"
 * (should be "Case Management"), "Operating Room" (should be "OR"), etc.
 *
 * This script reads all distinct specialties from the DB, maps non-canonical
 * values to their canonical forms using normalizeSpecialty(), and batch-updates.
 *
 * Usage:
 *   node scripts/normalize-specialties.js              # Dry run
 *   node scripts/normalize-specialties.js --save       # Save to DB
 */

const { PrismaClient } = require('@prisma/client');
const { normalizeSpecialty, SPECIALTIES } = require('../lib/constants/specialties');

const prisma = new PrismaClient();

async function main() {
  const save = process.argv.includes('--save');

  console.log('🏥 Specialty Normalization\n');
  console.log(`Mode: ${save ? '✅ SAVE (will update DB)' : '🧪 DRY RUN (no changes)'}\n`);

  // Get all distinct specialty values from active jobs
  const rawSpecialties = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: { specialty: { not: null } },
    _count: { id: true },
    orderBy: { specialty: 'asc' }
  });

  console.log(`Found ${rawSpecialties.length} distinct specialty values in DB\n`);

  let canonical = 0;
  let nonCanonical = 0;
  let totalJobsToFix = 0;
  const fixes = [];

  for (const row of rawSpecialties) {
    const raw = row.specialty;
    const normalized = normalizeSpecialty(raw);
    const count = row._count.id;

    if (normalized === raw && SPECIALTIES.includes(raw)) {
      // Already canonical
      canonical++;
      continue;
    }

    if (normalized && SPECIALTIES.includes(normalized) && normalized !== raw) {
      // Non-canonical → has a canonical mapping
      nonCanonical++;
      totalJobsToFix += count;
      fixes.push({ from: raw, to: normalized, count });
      console.log(`  ❌ "${raw}" → "${normalized}"  (${count} jobs)`);
    } else {
      // Unknown specialty (no canonical mapping)
      nonCanonical++;
      totalJobsToFix += count;
      fixes.push({ from: raw, to: 'General Nursing', count });
      console.log(`  ⚠️  "${raw}" → "General Nursing" (no mapping, ${count} jobs)`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Already canonical:  ${canonical}`);
  console.log(`Non-canonical:      ${nonCanonical}`);
  console.log(`Total jobs to fix:  ${totalJobsToFix}`);

  if (save && fixes.length > 0) {
    console.log(`\nUpdating database...`);
    for (const fix of fixes) {
      const result = await prisma.nursingJob.updateMany({
        where: { specialty: fix.from },
        data: { specialty: fix.to }
      });
      console.log(`  ✅ "${fix.from}" → "${fix.to}": ${result.count} updated`);
    }
    console.log(`\nDone! All specialties normalized.`);
  } else if (fixes.length > 0) {
    console.log(`\n⚠️  Run with --save to update the database`);
  } else {
    console.log(`\n✅ All specialties are already canonical!`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
