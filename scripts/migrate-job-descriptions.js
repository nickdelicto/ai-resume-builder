#!/usr/bin/env node
/**
 * Batch Migration: Reformat Job Descriptions
 *
 * Reformats all existing job descriptions using the standardized template.
 * Uses GPT-4o-mini for consistent, clean formatting.
 *
 * Usage:
 *   node scripts/migrate-job-descriptions.js [options]
 *
 * Options:
 *   --test              Test mode - preview without saving
 *   --limit=N           Process only N jobs (default: all)
 *   --employer=slug     Only process jobs from specific employer
 *   --batch-size=N      Number of jobs to process in each batch (default: 50)
 *   --delay=N           Delay in ms between API calls (default: 100)
 *   --skip-formatted    Skip jobs that already have formatted descriptions (based on markers)
 *   --force             Force reformat all jobs even if already formatted
 *
 * Examples:
 *   node scripts/migrate-job-descriptions.js --test --limit=10
 *   node scripts/migrate-job-descriptions.js --employer=cleveland-clinic
 *   node scripts/migrate-job-descriptions.js --batch-size=100 --delay=50
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { formatJobDescription } = require('../lib/services/jobDescriptionFormatter');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');
const skipFormatted = args.includes('--skip-formatted');
const forceReformat = args.includes('--force');

const limitArg = args.find(arg => arg.startsWith('--limit='));
const employerArg = args.find(arg => arg.startsWith('--employer='));
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const delayArg = args.find(arg => arg.startsWith('--delay='));

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const employerSlug = employerArg ? employerArg.split('=')[1] : null;
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 50;
const delayMs = delayArg ? parseInt(delayArg.split('=')[1]) : 100;

// Markers that indicate a job is already formatted with our template
const FORMATTED_MARKERS = [
  '## About This Role',
  '## 📋 Highlights',
  '## What You\'ll Do'
];

function isAlreadyFormatted(description) {
  if (!description) return false;
  return FORMATTED_MARKERS.some(marker => description.includes(marker));
}

console.log('');
console.log('═'.repeat(80));
console.log('📝 Job Description Migration Tool');
console.log('═'.repeat(80));
console.log('');
console.log(`Mode: ${isTestMode ? '🧪 TEST (preview only)' : '✅ PRODUCTION (will save to DB)'}`);
console.log(`Employer: ${employerSlug || 'ALL'}`);
console.log(`Limit: ${limit || 'ALL jobs'}`);
console.log(`Batch size: ${batchSize}`);
console.log(`Delay between calls: ${delayMs}ms`);
console.log(`Skip already formatted: ${skipFormatted}`);
console.log(`Force reformat: ${forceReformat}`);
console.log('');
console.log('─'.repeat(80));

async function main() {
  try {
    // Build query
    const whereClause = {
      isActive: true
    };

    // If skipFormatted, filter at database level (much faster than checking each job)
    if (skipFormatted && !forceReformat) {
      whereClause.NOT = {
        description: { contains: '## About This Role' }
      };
    }

    // Filter by employer if specified
    if (employerSlug) {
      const employer = await prisma.healthcareEmployer.findFirst({
        where: { slug: employerSlug }
      });

      if (!employer) {
        console.error(`❌ Employer not found: ${employerSlug}`);
        process.exit(1);
      }

      whereClause.employerId = employer.id;
      console.log(`📍 Filtering: ${employer.name}\n`);
    }

    // Get total count
    const totalCount = await prisma.nursingJob.count({ where: whereClause });
    console.log(`📊 Total active jobs matching filter: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️ No jobs to process.');
      return;
    }

    // Fetch jobs in batches
    let processedCount = 0;
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let totalCost = 0;
    let totalTokens = 0;

    const jobsToProcess = limit ? Math.min(limit, totalCount) : totalCount;
    const numBatches = Math.ceil(jobsToProcess / batchSize);

    console.log(`📦 Processing ${jobsToProcess} jobs in ${numBatches} batch(es)\n`);

    for (let batchNum = 0; batchNum < numBatches; batchNum++) {
      const skip = batchNum * batchSize;
      const take = Math.min(batchSize, jobsToProcess - skip);

      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Batch ${batchNum + 1}/${numBatches} (jobs ${skip + 1} to ${skip + take})`);
      console.log('─'.repeat(60));

      const jobs = await prisma.nursingJob.findMany({
        where: whereClause,
        include: {
          employer: { select: { name: true, slug: true } }
        },
        skip,
        take,
        orderBy: { scrapedAt: 'desc' }
      });

      for (const job of jobs) {
        processedCount++;

        // Check if already formatted
        if (skipFormatted && !forceReformat && isAlreadyFormatted(job.description)) {
          skippedCount++;
          console.log(`[${processedCount}/${jobsToProcess}] ⏭️ Skipping (already formatted): ${job.title.substring(0, 50)}`);
          continue;
        }

        if (!job.description) {
          skippedCount++;
          console.log(`[${processedCount}/${jobsToProcess}] ⏭️ Skipping (no description): ${job.title.substring(0, 50)}`);
          continue;
        }

        console.log(`[${processedCount}/${jobsToProcess}] 🔄 Formatting: ${job.title.substring(0, 50)}...`);

        const result = await formatJobDescription(job);

        if (result.success) {
          successCount++;
          totalCost += result.cost;
          totalTokens += result.tokensUsed;

          console.log(`   ✅ Success | Tokens: ${result.tokensUsed} | Cost: $${result.cost.toFixed(5)}`);

          // Save to database if not in test mode
          if (!isTestMode) {
            await prisma.nursingJob.update({
              where: { id: job.id },
              data: {
                description: result.formattedDescription,
                updatedAt: new Date()
              }
            });
          }
        } else {
          failCount++;
          console.log(`   ❌ Failed: ${result.error}`);
        }

        // Rate limiting delay
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Progress summary after each batch
      const batchProgress = ((processedCount / jobsToProcess) * 100).toFixed(1);
      console.log(`\n📊 Progress: ${batchProgress}% | Success: ${successCount} | Failed: ${failCount} | Skipped: ${skippedCount} | Cost so far: $${totalCost.toFixed(4)}`);
    }

    // Final summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total processed: ${processedCount}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log('');
    console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`🎫 Total Tokens: ${totalTokens.toLocaleString()}`);
    if (successCount > 0) {
      console.log(`📈 Average Cost per Job: $${(totalCost / successCount).toFixed(6)}`);
      console.log(`📈 Average Tokens per Job: ${Math.round(totalTokens / successCount)}`);
    }
    console.log('');

    if (isTestMode) {
      console.log('🧪 TEST MODE: No changes were saved to the database');
      console.log('   Run without --test flag to save changes');
    } else {
      console.log('✅ PRODUCTION MODE: Changes have been saved to the database');
    }

    // Estimate cost for remaining jobs
    if (limit && totalCount > limit && successCount > 0) {
      const avgCost = totalCost / successCount;
      const remainingJobs = totalCount - limit;
      const estimatedCost = remainingJobs * avgCost;
      console.log('');
      console.log(`💡 Estimated cost for remaining ${remainingJobs} jobs: $${estimatedCost.toFixed(2)}`);
    }

    console.log('\n✨ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
