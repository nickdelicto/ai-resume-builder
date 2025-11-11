const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Delete all Cleveland Clinic jobs from the database
 * Useful for testing the pending-to-active workflow
 */
async function deleteClevelandClinicJobs() {
  try {
    console.log('🔍 Looking for Cleveland Clinic employer...');
    
    // Find Cleveland Clinic employer
    const employer = await prisma.healthcareEmployer.findFirst({
      where: { slug: 'cleveland-clinic' }
    });
    
    if (!employer) {
      console.log('❌ Cleveland Clinic employer not found');
      return;
    }
    
    console.log(`✅ Found employer: ${employer.name} (ID: ${employer.id})`);
    
    // Count jobs first
    const count = await prisma.nursingJob.count({
      where: { employerId: employer.id }
    });
    
    console.log(`📊 Found ${count} Cleveland Clinic jobs`);
    
    if (count === 0) {
      console.log('✅ No jobs to delete');
      return;
    }
    
    // Delete all jobs
    console.log('🗑️  Deleting jobs...');
    const result = await prisma.nursingJob.deleteMany({
      where: { employerId: employer.id }
    });
    
    console.log(`✅ Successfully deleted ${result.count} Cleveland Clinic jobs`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  deleteClevelandClinicJobs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deleteClevelandClinicJobs };

