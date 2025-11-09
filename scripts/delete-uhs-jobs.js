const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete all UHS nursing job listings from database
 * This script removes all jobs from United Health Services (UHS)
 */
async function deleteUHSJobs() {
  try {
    console.log('🗑️  Deleting all UHS jobs from database...');
    
    // First, find the UHS employer (prioritize by slug to get the correct one)
    const uhsEmployer = await prisma.healthcareEmployer.findFirst({
      where: {
        slug: 'uhs' // Use exact slug match to avoid finding old employer records
      }
    });
    
    if (!uhsEmployer) {
      console.log('⚠️  No UHS employer found in database');
      console.log('✅ Nothing to delete');
      return;
    }
    
    console.log(`   Found employer: ${uhsEmployer.name} (ID: ${uhsEmployer.id})`);
    
    // Count jobs first
    const count = await prisma.nursingJob.count({
      where: {
        employerId: uhsEmployer.id
      }
    });
    
    console.log(`   Found ${count} UHS jobs to delete`);
    
    if (count === 0) {
      console.log('✅ No UHS jobs to delete');
      return;
    }
    
    // Delete all UHS jobs
    const result = await prisma.nursingJob.deleteMany({
      where: {
        employerId: uhsEmployer.id
      }
    });
    
    console.log(`✅ Deleted ${result.count} UHS jobs from database`);
    
  } catch (error) {
    console.error(`❌ Error deleting UHS jobs: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  deleteUHSJobs()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = deleteUHSJobs;

