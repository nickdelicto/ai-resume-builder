#!/usr/bin/env node
/**
 * Test Job Description Formatter
 *
 * Tests the standardized job description formatter on sample jobs from each employer.
 *
 * Usage:
 *   node scripts/test-job-formatter.js [--employer=slug] [--limit=5] [--save]
 *
 * Options:
 *   --employer=slug  Test only jobs from specific employer
 *   --limit=N        Number of jobs per employer to test (default: 2)
 *   --save           Save formatted descriptions to database
 *   --job=id         Test a specific job by ID
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { formatJobDescription, formatJobsBatch } = require('../lib/services/jobDescriptionFormatter');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const employerArg = args.find(arg => arg.startsWith('--employer='));
const limitArg = args.find(arg => arg.startsWith('--limit='));
const jobArg = args.find(arg => arg.startsWith('--job='));
const shouldSave = args.includes('--save');

const employerSlug = employerArg ? employerArg.split('=')[1] : null;
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 2;
const jobId = jobArg ? jobArg.split('=')[1] : null;

console.log('🧪 Job Description Formatter Test\n');
console.log('─'.repeat(80));
console.log(`Mode: ${shouldSave ? '💾 SAVE to database' : '👀 Preview only (use --save to persist)'}`);
if (jobId) {
  console.log(`Testing specific job: ${jobId}`);
} else {
  console.log(`Employer: ${employerSlug || 'ALL'}`);
  console.log(`Jobs per employer: ${limit}`);
}
console.log('─'.repeat(80) + '\n');

async function testSingleJob(job) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`JOB: ${job.title}`);
  console.log(`Employer: ${job.employer?.name || 'Unknown'}`);
  console.log(`Location: ${job.city}, ${job.state}`);
  console.log(`ID: ${job.id}`);
  console.log('═'.repeat(80));

  console.log('\n📄 ORIGINAL DESCRIPTION (first 1000 chars):');
  console.log('─'.repeat(40));
  console.log(job.description?.substring(0, 1000) || 'No description');
  console.log('...\n');

  // Format the job
  console.log('🔄 Formatting with GPT-4o-mini...');
  const result = await formatJobDescription(job);

  if (result.success) {
    console.log(`✅ Formatted successfully!`);
    console.log(`   Tokens: ${result.tokensUsed} (in: ${result.inputTokens}, out: ${result.outputTokens})`);
    console.log(`   Cost: $${result.cost.toFixed(6)}`);
    console.log(`   Finish reason: ${result.finishReason}`);

    console.log('\n✨ FORMATTED DESCRIPTION:');
    console.log('─'.repeat(40));
    console.log(result.formattedDescription);
    console.log('─'.repeat(40));

    // Save if requested
    if (shouldSave) {
      await prisma.nursingJob.update({
        where: { id: job.id },
        data: {
          description: result.formattedDescription
        }
      });
      console.log('\n💾 Saved to database!');
    }

    return result;
  } else {
    console.log(`❌ Formatting failed: ${result.error}`);
    return null;
  }
}

async function main() {
  try {
    // Test specific job if ID provided
    if (jobId) {
      const job = await prisma.nursingJob.findUnique({
        where: { id: jobId },
        include: {
          employer: { select: { name: true, slug: true } }
        }
      });

      if (!job) {
        console.error(`❌ Job not found: ${jobId}`);
        process.exit(1);
      }

      await testSingleJob(job);
      return;
    }

    // Get employers to test
    const whereClause = employerSlug
      ? { slug: employerSlug }
      : {};

    const employers = await prisma.healthcareEmployer.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    if (employers.length === 0) {
      console.error('❌ No employers found');
      process.exit(1);
    }

    console.log(`📊 Testing ${employers.length} employer(s)\n`);

    // Stats
    let totalJobs = 0;
    let totalCost = 0;
    let totalTokens = 0;
    let successCount = 0;
    let failCount = 0;

    // Test jobs from each employer
    for (const employer of employers) {
      console.log(`\n${'#'.repeat(80)}`);
      console.log(`# EMPLOYER: ${employer.name}`);
      console.log(`${'#'.repeat(80)}`);

      // Get sample jobs from this employer
      const allJobs = await prisma.nursingJob.findMany({
        where: {
          employerId: employer.id,
          isActive: true
        },
        include: {
          employer: { select: { name: true, slug: true } }
        },
        take: limit * 2, // Fetch extra to filter nulls
        orderBy: { scrapedAt: 'desc' }
      });
      const jobs = allJobs.filter(j => j.description).slice(0, limit);

      if (jobs.length === 0) {
        console.log(`   ⚠️ No active jobs found for ${employer.name}`);
        continue;
      }

      console.log(`   Found ${jobs.length} jobs to test\n`);

      for (const job of jobs) {
        totalJobs++;
        const result = await testSingleJob(job);

        if (result) {
          successCount++;
          totalCost += result.cost;
          totalTokens += result.tokensUsed;
        } else {
          failCount++;
        }

        // Small delay between jobs
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Print summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total jobs tested: ${totalJobs}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`🎫 Total Tokens: ${totalTokens.toLocaleString()}`);
    if (successCount > 0) {
      console.log(`📈 Average Cost per Job: $${(totalCost / successCount).toFixed(6)}`);
      console.log(`📈 Average Tokens per Job: ${Math.round(totalTokens / successCount)}`);
    }

    if (shouldSave) {
      console.log('\n💾 All formatted descriptions saved to database');
    } else {
      console.log('\n💡 Use --save flag to persist changes to database');
    }

    console.log('\n✨ Test complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
