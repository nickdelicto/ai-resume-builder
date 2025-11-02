const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInactiveJob() {
  try {
    console.log('🔍 Finding an active job to test with...');
    
    // Find first active job
    const activeJob = await prisma.nursingJob.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        title: true,
        isActive: true
      }
    });

    if (!activeJob) {
      console.log('❌ No active jobs found in database. Please scrape some jobs first.');
      return;
    }

    console.log(`\n✅ Found job: ${activeJob.title}`);
    console.log(`   Slug: ${activeJob.slug}`);
    console.log(`   Current status: ${activeJob.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   URL: http://localhost:3000/jobs/nursing/${activeJob.slug}`);

    // Mark it as inactive
    console.log('\n🔄 Marking job as inactive...');
    const updatedJob = await prisma.nursingJob.update({
      where: { id: activeJob.id },
      data: { isActive: false }
    });

    console.log(`✅ Job marked as inactive!`);
    console.log(`\n📋 Test Instructions:`);
    console.log(`   1. Open: http://localhost:3000/jobs/nursing/${activeJob.slug}`);
    console.log(`   2. You should see an amber banner saying "This Position is No Longer Available"`);
    console.log(`   3. The job should NOT appear in job listings (try /jobs/nursing)`);
    console.log(`   4. The page should have "noindex" meta tag`);
    console.log(`\n🔄 To reactivate: Run this script again or manually set isActive=true in database`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testInactiveJob();

