#!/usr/bin/env node

/**
 * Migration Script: Normalize Experience Levels in Database
 * 
 * Fixes existing jobs that have lowercase or hyphenated experience levels
 * (e.g., "new-grad" → "New Grad", "senior" → "Senior")
 * 
 * This is a one-time migration to clean up existing data.
 * Future jobs will be automatically normalized by the classifier.
 * 
 * Usage:
 *   node scripts/migrate-experience-levels.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const { normalizeExperienceLevel } = require('../lib/utils/experienceLevelUtils');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('🔧 Experience Level Migration Starting...\n');
console.log(`Mode: ${isDryRun ? '🧪 DRY RUN (no changes will be made)' : '✅ LIVE (will update database)'}\n`);

async function main() {
  try {
    // Fetch all jobs with experience levels (including inactive for complete migration)
    console.log('📊 Fetching jobs with experience levels...');
    const jobs = await prisma.nursingJob.findMany({
      where: {
        experienceLevel: { not: null }
      },
      select: {
        id: true,
        title: true,
        experienceLevel: true,
        isActive: true
      }
    });
    
    console.log(`   Found ${jobs.length} jobs with experience levels\n`);
    
    if (jobs.length === 0) {
      console.log('✅ No jobs to migrate');
      return;
    }
    
    // Analyze what needs to be changed
    const changes = [];
    const noChangeNeeded = [];
    
    for (const job of jobs) {
      const original = job.experienceLevel;
      const normalized = normalizeExperienceLevel(original);
      
      if (normalized !== original) {
        changes.push({
          id: job.id,
          title: job.title,
          isActive: job.isActive,
          from: original,
          to: normalized
        });
      } else {
        noChangeNeeded.push(job);
      }
    }
    
    // Display summary
    console.log('📋 Migration Summary:\n');
    console.log(`   Jobs needing update: ${changes.length}`);
    console.log(`   Jobs already correct: ${noChangeNeeded.length}`);
    console.log(`   Total jobs: ${jobs.length}\n`);
    
    if (changes.length === 0) {
      console.log('✅ All experience levels are already in correct format!');
      return;
    }
    
    // Group changes by transformation
    const groupedChanges = {};
    changes.forEach(change => {
      const key = `${change.from} → ${change.to}`;
      if (!groupedChanges[key]) {
        groupedChanges[key] = [];
      }
      groupedChanges[key].push(change);
    });
    
    console.log('🔄 Changes to be made:\n');
    Object.entries(groupedChanges).forEach(([transformation, items]) => {
      console.log(`   ${transformation}: ${items.length} jobs`);
    });
    console.log('');
    
    // Show sample changes (first 10)
    if (changes.length > 0) {
      console.log('📝 Sample changes (first 10):\n');
      changes.slice(0, 10).forEach((change, idx) => {
        const status = change.isActive ? '🟢 Active' : '🔴 Inactive';
        console.log(`   ${idx + 1}. [${status}] "${change.from}" → "${change.to}"`);
        console.log(`      ${change.title.substring(0, 60)}${change.title.length > 60 ? '...' : ''}`);
      });
      console.log('');
    }
    
    if (isDryRun) {
      console.log('🧪 DRY RUN - No changes made to database');
      console.log('\nTo apply these changes, run:');
      console.log('   node scripts/migrate-experience-levels.js\n');
      return;
    }
    
    // Apply changes
    console.log('💾 Applying changes to database...\n');
    let updated = 0;
    let failed = 0;
    
    for (const change of changes) {
      try {
        await prisma.nursingJob.update({
          where: { id: change.id },
          data: { experienceLevel: change.to }
        });
        updated++;
        
        // Show progress every 50 jobs
        if (updated % 50 === 0) {
          console.log(`   Updated ${updated}/${changes.length} jobs...`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to update job ${change.id}: ${error.message}`);
        failed++;
      }
    }
    
    console.log('');
    console.log('✅ Migration complete!');
    console.log(`   Successfully updated: ${updated} jobs`);
    if (failed > 0) {
      console.log(`   Failed: ${failed} jobs`);
    }
    console.log('');
    
    // Show final distribution
    console.log('📊 Final Experience Level Distribution:\n');
    const distribution = await prisma.nursingJob.groupBy({
      by: ['experienceLevel'],
      where: { 
        experienceLevel: { not: null },
        isActive: true 
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    const total = distribution.reduce((sum, d) => sum + d._count.id, 0);
    distribution.forEach(d => {
      const name = d.experienceLevel || 'Not Specified';
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

