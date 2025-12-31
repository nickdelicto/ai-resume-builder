#!/usr/bin/env node

/**
 * Migration Script: Normalize Specialty Values in Database
 *
 * Fixes existing jobs that have old specialty names
 * (e.g., "Step Down" → "Stepdown", "L&D" → "Labor & Delivery")
 *
 * This is a one-time migration to clean up existing data.
 * Future jobs will be automatically normalized by the classifier.
 *
 * Usage:
 *   node scripts/migrate-specialties.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Specialty mappings: old values → new canonical values
const SPECIALTY_MIGRATIONS = {
  'Step Down': 'Stepdown',
  'Progressive Care': 'Stepdown',
  'L&D': 'Labor & Delivery',
  'Psychiatric': 'Mental Health',
  'Rehab': 'Rehabilitation',
  'Cardiac Care': 'Cardiac',
  'Travel': 'General Nursing'
};

console.log('🔧 Specialty Migration Starting...\n');
console.log(`Mode: ${isDryRun ? '🧪 DRY RUN (no changes will be made)' : '✅ LIVE (will update database)'}\n`);

async function main() {
  try {
    // Fetch all jobs with old specialty values
    const oldSpecialties = Object.keys(SPECIALTY_MIGRATIONS);

    console.log('📊 Fetching jobs with old specialty values...');
    const jobs = await prisma.nursingJob.findMany({
      where: {
        specialty: { in: oldSpecialties }
      },
      select: {
        id: true,
        title: true,
        specialty: true,
        isActive: true
      }
    });

    console.log(`   Found ${jobs.length} jobs needing migration\n`);

    if (jobs.length === 0) {
      console.log('✅ No jobs to migrate - all specialties are already normalized!');
      return;
    }

    // Group changes by transformation
    const groupedChanges = {};
    jobs.forEach(job => {
      const oldVal = job.specialty;
      const newVal = SPECIALTY_MIGRATIONS[oldVal];
      const key = `${oldVal} → ${newVal}`;
      if (!groupedChanges[key]) {
        groupedChanges[key] = [];
      }
      groupedChanges[key].push(job);
    });

    console.log('🔄 Changes to be made:\n');
    Object.entries(groupedChanges).forEach(([transformation, items]) => {
      console.log(`   ${transformation}: ${items.length} jobs`);
    });
    console.log('');

    // Show sample changes (first 10)
    console.log('📝 Sample changes (first 10):\n');
    jobs.slice(0, 10).forEach((job, idx) => {
      const status = job.isActive ? '🟢 Active' : '🔴 Inactive';
      const newVal = SPECIALTY_MIGRATIONS[job.specialty];
      console.log(`   ${idx + 1}. [${status}] "${job.specialty}" → "${newVal}"`);
      console.log(`      ${job.title.substring(0, 60)}${job.title.length > 60 ? '...' : ''}`);
    });
    console.log('');

    if (isDryRun) {
      console.log('🧪 DRY RUN - No changes made to database');
      console.log('\nTo apply these changes, run:');
      console.log('   node scripts/migrate-specialties.js\n');
      return;
    }

    // Apply changes using updateMany for efficiency
    console.log('💾 Applying changes to database...\n');
    let totalUpdated = 0;

    for (const [oldVal, newVal] of Object.entries(SPECIALTY_MIGRATIONS)) {
      const result = await prisma.nursingJob.updateMany({
        where: { specialty: oldVal },
        data: { specialty: newVal }
      });

      if (result.count > 0) {
        console.log(`   ${oldVal} → ${newVal}: ${result.count} jobs updated`);
        totalUpdated += result.count;
      }
    }

    console.log('');
    console.log('✅ Migration complete!');
    console.log(`   Successfully updated: ${totalUpdated} jobs`);
    console.log('');

    // Show final distribution
    console.log('📊 Final Specialty Distribution (top 15):\n');
    const distribution = await prisma.nursingJob.groupBy({
      by: ['specialty'],
      where: {
        specialty: { not: null },
        isActive: true
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15
    });

    const total = distribution.reduce((sum, d) => sum + d._count.id, 0);
    distribution.forEach(d => {
      const name = d.specialty || 'Not Specified';
      const count = d._count.id;
      const percentage = ((count / total) * 100).toFixed(1);
      console.log(`   ${name.padEnd(20)} ${count.toString().padStart(4)} jobs  (${percentage}%)`);
    });
    console.log(`\n   Total Active Jobs: ${total}`);

  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main().catch(error => {
  console.error(error);
  process.exit(1);
});
