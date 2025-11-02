const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete all nursing job listings from database
 * WARNING: This permanently deletes all jobs!
 */
async function deleteAllJobs() {
  try {
    console.log('🗑️  Deleting all nursing jobs from database...');
    
    // Count jobs first
    const count = await prisma.nursingJob.count();
    console.log(`   Found ${count} jobs to delete`);
    
    if (count === 0) {
      console.log('✅ No jobs to delete');
      return;
    }
    
    // Delete all jobs
    const result = await prisma.nursingJob.deleteMany({});
    
    console.log(`✅ Deleted ${result.count} jobs from database`);
    
    // Also optionally delete locations that have no jobs
    // (Leave employers as they might be referenced elsewhere)
    
  } catch (error) {
    console.error(`❌ Error deleting jobs: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  deleteAllJobs()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = deleteAllJobs;

