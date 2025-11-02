const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reactivateTestJob() {
  try {
    // Find the inactive job we just tested
    const job = await prisma.nursingJob.findFirst({
      where: { 
        slug: 'hospice-registered-nurse-cuyahoga-county-independence-oh-22116229'
      }
    });

    if (!job) {
      console.log('❌ Job not found');
      return;
    }

    console.log(`📋 Job: ${job.title}`);
    console.log(`   Current status: ${job.isActive ? 'Active' : 'Inactive'}`);

    if (job.isActive) {
      console.log('ℹ️ Job is already active');
      return;
    }

    // Reactivate it
    await prisma.nursingJob.update({
      where: { id: job.id },
      data: { isActive: true }
    });

    console.log('✅ Job reactivated!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

reactivateTestJob();

