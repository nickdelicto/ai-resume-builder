#!/usr/bin/env node

/**
 * Migration Script: Normalize Specialty Values in Database
 *
 * Uses normalizeSpecialty() to dynamically find and fix ALL non-canonical
 * specialty values (e.g., "Operating Room" → "OR", "Cardiac Care" → "Cardiac").
 *
 * Usage:
 *   node scripts/migrate-specialties.js [--dry-run]
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { SPECIALTIES, normalizeSpecialty } = require('../lib/constants/specialties');

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('Specialty Migration Starting...\n');
console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}\n`);

async function main() {
  try {
    // Step 1: Get all distinct specialty values from the database
    console.log('Fetching all distinct specialty values...');
    const distinctSpecialties = await prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { specialty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    console.log(`   Found ${distinctSpecialties.length} distinct specialty values\n`);

    // Step 2: Find non-canonical values using normalizeSpecialty()
    const migrations = {};
    distinctSpecialties.forEach(({ specialty, _count }) => {
      const canonical = normalizeSpecialty(specialty);
      // Flag if: normalized differently OR not in canonical SPECIALTIES list
      if (canonical !== specialty && SPECIALTIES.includes(canonical)) {
        migrations[specialty] = { canonical, count: _count.id };
      } else if (!SPECIALTIES.includes(specialty)) {
        console.log(`   WARNING: "${specialty}" (${_count.id} jobs) - not in canonical list and no alias found`);
      }
    });

    const migrationEntries = Object.entries(migrations);

    if (migrationEntries.length === 0) {
      console.log('\nAll specialties are already normalized!');
      return;
    }

    console.log(`\nFound ${migrationEntries.length} non-canonical values to fix:\n`);
    let totalJobs = 0;
    migrationEntries.forEach(([oldVal, { canonical, count }]) => {
      console.log(`   "${oldVal}" -> "${canonical}" (${count} jobs)`);
      totalJobs += count;
    });
    console.log(`\n   Total jobs to update: ${totalJobs}\n`);

    if (isDryRun) {
      console.log('DRY RUN - No changes made to database');
      console.log('\nTo apply these changes, run:');
      console.log('   node scripts/migrate-specialties.js\n');
      return;
    }

    // Step 3: Apply changes using updateMany for efficiency
    console.log('Applying changes to database...\n');
    let totalUpdated = 0;

    for (const [oldVal, { canonical }] of migrationEntries) {
      const result = await prisma.nursingJob.updateMany({
        where: { specialty: oldVal },
        data: { specialty: canonical }
      });

      if (result.count > 0) {
        console.log(`   "${oldVal}" -> "${canonical}": ${result.count} jobs updated`);
        totalUpdated += result.count;
      }
    }

    console.log(`\nMigration complete! Updated ${totalUpdated} jobs\n`);

    // Step 4: Show final distribution
    console.log('Final Specialty Distribution (top 20):\n');
    const distribution = await prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: { specialty: { not: null }, isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    });

    const total = distribution.reduce((sum, d) => sum + d._count.id, 0);
    distribution.forEach(d => {
      const name = d.specialty || 'Not Specified';
      const count = d._count.id;
      const pct = ((count / total) * 100).toFixed(1);
      const valid = SPECIALTIES.includes(d.specialty) ? '' : ' [NOT CANONICAL]';
      console.log(`   ${name.padEnd(22)} ${count.toString().padStart(4)} jobs  (${pct}%)${valid}`);
    });
    console.log(`\n   Total Active Jobs: ${total}`);

  } catch (error) {
    console.error(`\nMigration failed: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
