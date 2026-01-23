/**
 * Backfill Sign-On Bonus Script
 *
 * Updates existing jobs to populate the hasSignOnBonus field based on text matching.
 * This is a fast, free alternative to re-classifying all jobs with LLM.
 *
 * For more accurate classification with bonus amounts, use the main LLM classifier:
 *   node scripts/classify-jobs-with-llm.js
 *
 * Usage:
 *   node scripts/backfill-sign-on-bonus.js [--test] [--limit=100]
 *
 * Options:
 *   --test: Test mode - shows what would be updated without saving
 *   --limit=N: Process only first N jobs (default: all)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

console.log('🎁 Sign-On Bonus Backfill Script\n');
console.log(`Mode: ${isTestMode ? '🧪 TEST (no DB changes)' : '✅ PRODUCTION (will save to DB)'}`);
console.log(`Limit: ${limit || 'ALL jobs'}\n`);

/**
 * Check if text contains sign-on bonus keywords
 */
function containsSignOnBonus(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes('sign-on bonus') ||
    lowerText.includes('sign on bonus') ||
    lowerText.includes('signing bonus') ||
    lowerText.includes('signon bonus') ||
    lowerText.includes('sign-on incentive') ||
    lowerText.includes('welcome bonus')
  );
}

/**
 * Extract sign-on bonus amount from text (basic regex extraction)
 */
function extractBonusAmount(text) {
  if (!text) return null;

  // Look for dollar amounts near sign-on bonus keywords
  // Patterns: "$5,000", "$5000", "$5K", "5,000", "5000"
  const patterns = [
    /\$?([\d,]+)\s*(?:k|K)?\s*sign[- ]?on/i,
    /sign[- ]?on[^\$]*\$?([\d,]+)\s*(?:k|K)?/i,
    /\$?([\d,]+)\s*(?:k|K)?\s*signing/i,
    /signing[^\$]*\$?([\d,]+)\s*(?:k|K)?/i,
    /bonus[^\$]*\$?([\d,]+)\s*(?:k|K)?/i,
    /\$?([\d,]+)\s*(?:k|K)?\s*bonus/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let amount = match[1].replace(/,/g, '');
      let numAmount = parseInt(amount, 10);

      // Handle K notation (e.g., "5K" = 5000)
      if (/k/i.test(match[0]) && numAmount < 1000) {
        numAmount *= 1000;
      }

      // Sanity check: bonuses are typically $1,000 - $50,000
      if (numAmount >= 500 && numAmount <= 100000) {
        return numAmount;
      }
    }
  }

  return null;
}

async function main() {
  try {
    // Find all active jobs that haven't been marked with sign-on bonus yet
    // but might contain sign-on bonus keywords
    const whereClause = {
      isActive: true,
      hasSignOnBonus: false,
      OR: [
        { description: { contains: 'sign-on bonus', mode: 'insensitive' } },
        { description: { contains: 'sign on bonus', mode: 'insensitive' } },
        { description: { contains: 'signing bonus', mode: 'insensitive' } },
        { description: { contains: 'signon bonus', mode: 'insensitive' } },
        { description: { contains: 'sign-on incentive', mode: 'insensitive' } },
        { description: { contains: 'welcome bonus', mode: 'insensitive' } },
        { benefits: { contains: 'sign-on bonus', mode: 'insensitive' } },
        { benefits: { contains: 'sign on bonus', mode: 'insensitive' } },
        { benefits: { contains: 'signing bonus', mode: 'insensitive' } },
        { benefits: { contains: 'signon bonus', mode: 'insensitive' } },
        { benefits: { contains: 'sign-on incentive', mode: 'insensitive' } },
        { benefits: { contains: 'welcome bonus', mode: 'insensitive' } }
      ]
    };

    const jobs = await prisma.nursingJob.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        benefits: true,
        employer: { select: { name: true } }
      },
      take: limit || undefined,
      orderBy: { scrapedAt: 'desc' }
    });

    if (jobs.length === 0) {
      console.log('✅ No jobs found that need sign-on bonus backfill.');
      console.log('   All jobs with sign-on bonus keywords already have hasSignOnBonus: true');
      return;
    }

    console.log(`📊 Found ${jobs.length} jobs with sign-on bonus keywords that need updating\n`);
    console.log('─'.repeat(80));

    let updatedCount = 0;
    let amountExtractedCount = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const combinedText = `${job.description || ''} ${job.benefits || ''}`;

      // Verify it actually contains sign-on bonus (double check)
      if (!containsSignOnBonus(combinedText)) {
        console.log(`[${i + 1}/${jobs.length}] ⏭️  Skipping (no actual match): ${job.title}`);
        continue;
      }

      // Try to extract the amount
      const amount = extractBonusAmount(combinedText);

      console.log(`[${i + 1}/${jobs.length}] 🎁 ${job.title}`);
      console.log(`   Employer: ${job.employer?.name || 'N/A'}`);
      console.log(`   Amount: ${amount ? `$${amount.toLocaleString()}` : 'Not specified'}`);

      if (!isTestMode) {
        await prisma.nursingJob.update({
          where: { id: job.id },
          data: {
            hasSignOnBonus: true,
            signOnBonusAmount: amount
          }
        });
        console.log('   ✅ Updated');
      } else {
        console.log('   🧪 Would update (test mode)');
      }

      updatedCount++;
      if (amount) amountExtractedCount++;
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 BACKFILL SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Jobs updated: ${updatedCount}`);
    console.log(`💰 Amounts extracted: ${amountExtractedCount}`);
    console.log(`❓ Amount unknown: ${updatedCount - amountExtractedCount}`);

    if (isTestMode) {
      console.log('\n🧪 TEST MODE: No changes were saved to the database');
      console.log('   Run without --test to apply changes');
    } else {
      console.log('\n✅ PRODUCTION MODE: Changes have been saved to the database');
    }

    // Show current stats
    const [totalWithBonus, totalActive] = await Promise.all([
      prisma.nursingJob.count({ where: { isActive: true, hasSignOnBonus: true } }),
      prisma.nursingJob.count({ where: { isActive: true } })
    ]);

    console.log(`\n📈 Current Stats:`);
    console.log(`   Total active jobs: ${totalActive.toLocaleString()}`);
    console.log(`   Jobs with sign-on bonus: ${totalWithBonus.toLocaleString()} (${((totalWithBonus / totalActive) * 100).toFixed(1)}%)`);

    console.log('\n✨ Backfill complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
