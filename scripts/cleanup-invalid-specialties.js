#!/usr/bin/env node

/**
 * Cleanup Invalid Specialties
 * 
 * Finds jobs with invalid specialty values (not in SPECIALTIES list)
 * and marks them inactive or updates them
 */

const { PrismaClient } = require('@prisma/client');
const { SPECIALTIES } = require('../lib/constants/specialties');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for invalid specialties...\n');
  
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--fix');
  
  console.log(`Mode: ${isDryRun ? '🧪 DRY RUN (no changes)' : '✅ LIVE (will update database)'}\n`);
  
  // Fetch all unique specialties from active jobs
  const uniqueSpecialties = await prisma.nursingJob.groupBy({
    by: ['specialty'],
    where: { isActive: true },
    _count: { id: true }
  });
  
  console.log(`📊 Found ${uniqueSpecialties.length} unique specialties in database\n`);
  
  // Find invalid ones
  const invalidSpecialties = uniqueSpecialties.filter(s => {
    return s.specialty && !SPECIALTIES.includes(s.specialty);
  });
  
  if (invalidSpecialties.length === 0) {
    console.log('✅ No invalid specialties found! All specialties are valid.\n');
    return;
  }
  
  console.log(`❌ Found ${invalidSpecialties.length} INVALID specialties:\n`);
  invalidSpecialties.forEach(s => {
    console.log(`   - "${s.specialty}" (${s._count.id} jobs)`);
  });
  console.log('');
  
  if (isDryRun) {
    console.log('🧪 DRY RUN - No changes made');
    console.log('   Run with --fix to convert invalid specialties to "General Nursing"\n');
    
    // Show valid specialties for reference
    console.log('✅ Valid specialties:');
    SPECIALTIES.forEach(s => console.log(`   - ${s}`));
    return;
  }
  
  // FIX MODE: Convert invalid specialties to "General Nursing"
  console.log('🔧 Converting invalid specialties to "General Nursing"...\n');
  
  let totalUpdated = 0;
  for (const invalid of invalidSpecialties) {
    const result = await prisma.nursingJob.updateMany({
      where: {
        specialty: invalid.specialty,
        isActive: true
      },
      data: {
        specialty: 'General Nursing'
      }
    });
    
    console.log(`   ✅ Converted ${result.count} "${invalid.specialty}" jobs to "General Nursing"`);
    totalUpdated += result.count;
  }
  
  console.log(`\n✅ Complete! Converted ${totalUpdated} jobs to "General Nursing"`);
  console.log('   These jobs will now appear under the General Nursing specialty\n');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

