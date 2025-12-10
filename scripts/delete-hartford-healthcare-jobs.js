const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete all Hartford HealthCare nursing job listings from database
 * This script removes all jobs from Hartford HealthCare
 */
async function deleteHartfordHealthCareJobs() {
  try {
    console.log('🗑️  Deleting all Hartford HealthCare jobs from database...');
    
    // Find the Hartford HealthCare employer
    const employer = await prisma.healthcareEmployer.findFirst({
      where: {
        slug: 'hartford-healthcare'
      }
    });
    
    if (!employer) {
      console.log('⚠️  No Hartford HealthCare employer found in database');
      console.log('✅ Nothing to delete');
      return;
    }
    
    console.log(`   Found employer: ${employer.name} (ID: ${employer.id})`);
    
    // Count jobs first
    const count = await prisma.nursingJob.count({
      where: {
        employerId: employer.id
      }
    });
    
    console.log(`   Found ${count} Hartford HealthCare jobs to delete`);
    
    if (count === 0) {
      console.log('✅ No Hartford HealthCare jobs to delete');
      return;
    }
    
    // Delete all Hartford HealthCare jobs
    const result = await prisma.nursingJob.deleteMany({
      where: {
        employerId: employer.id
      }
    });
    
    console.log(`✅ Deleted ${result.count} Hartford HealthCare jobs from database`);
    
  } catch (error) {
    console.error(`❌ Error deleting Hartford HealthCare jobs: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  deleteHartfordHealthCareJobs()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = deleteHartfordHealthCareJobs;

