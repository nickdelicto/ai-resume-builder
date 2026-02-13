#!/usr/bin/env node

/**
 * Backfill salary fields from LLM-formatted description highlights.
 *
 * Many jobs were classified before the salary extraction feature was added.
 * Their formatted descriptions already contain "💰 **Pay:** $XX/hour" in
 * highlights, but the structured salary DB fields are null.
 *
 * This script extracts salary from existing formatted descriptions using
 * the same regex patterns as the classifier — NO LLM calls, zero cost.
 *
 * Usage:
 *   node scripts/backfill-salary-from-highlights.js                    # Dry run (all employers)
 *   node scripts/backfill-salary-from-highlights.js --save             # Save to DB
 *   node scripts/backfill-salary-from-highlights.js --employer=upstate-medical-university
 *   node scripts/backfill-salary-from-highlights.js --employer=upstate-medical-university --save
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Same extraction logic as classify-jobs-with-llm.js
function extractSalaryFromDescription(description) {
  if (!description) return null;

  const hourlyPatterns = [
    /\*\*Pay:\*\*\s*\$([\d,.]+)\s*(?:[-–—to]+\s*\$?([\d,.]+))?\s*\/?\s*(?:per\s+)?(?:hour|hr|hourly)/i,
    /Pay:\s*\$([\d,.]+)\s*(?:[-–—to]+\s*\$?([\d,.]+))?\s*\/?\s*(?:per\s+)?(?:hour|hr|hourly)/i,
    /Pay Range:\s*\$([\d,.]+)\s*[-–—to]+\s*\$?([\d,.]+)\s*(?:per\s+)?(?:hour|hr|hourly)/i,
    /\$([\d,.]+)\s*[-–—to]+\s*\$?([\d,.]+)\s*(?:per\s+)?(?:hour|hr|hourly)/i,
    /\$([\d,.]+)\s*\/?\s*(?:per\s+)?(?:hour|hr|hourly)/i
  ];

  const annualPatterns = [
    /\*\*Pay:\*\*\s*\$([\d,]+)(?:\.00)?\s*(?:[-–—to]+\s*\$?([\d,]+)(?:\.00)?)?\s*\/?\s*(?:per\s+)?(?:year|annual|annually|yr)/i,
    /Pay:\s*\$([\d,]+)(?:\.00)?\s*(?:[-–—to]+\s*\$?([\d,]+)(?:\.00)?)?\s*\/?\s*(?:per\s+)?(?:year|annual|annually|yr)/i,
    /\$([\d,]+)(?:\.00)?\s*[-–—to]+\s*\$?([\d,]+)(?:\.00)?\s*\/?\s*(?:per\s+)?(?:year|annual|annually|yr)/i,
    /salary.*?\$([\d,]+)(?:\.00)?\s*[-–—to]+\s*\$?([\d,]+)(?:\.00)?/i
  ];

  let salaryMin = null;
  let salaryMax = null;
  let salaryType = null;

  for (const pattern of hourlyPatterns) {
    const match = description.match(pattern);
    if (match) {
      salaryMin = parseFloat(match[1].replace(/,/g, ''));
      salaryMax = match[2] ? parseFloat(match[2].replace(/,/g, '')) : salaryMin;
      salaryType = 'hourly';
      break;
    }
  }

  if (!salaryMin) {
    for (const pattern of annualPatterns) {
      const match = description.match(pattern);
      if (match) {
        salaryMin = parseFloat(match[1].replace(/,/g, ''));
        salaryMax = match[2] ? parseFloat(match[2].replace(/,/g, '')) : salaryMin;
        salaryType = 'annual';
        break;
      }
    }
  }

  // Fallback: look for any 💰 dollar amount in Highlights
  if (!salaryMin) {
    // Try range first: "$70,000 - $85,000" or "$30.50 - $49.49"
    const highlightsRangeMatch = description.match(/## 📋 Highlights[\s\S]*?💰.*?\$([\d,.]+)\s*[-–—to]+\s*\$?([\d,.]+)/i);
    if (highlightsRangeMatch) {
      salaryMin = parseFloat(highlightsRangeMatch[1].replace(/,/g, ''));
      salaryMax = parseFloat(highlightsRangeMatch[2].replace(/,/g, ''));
      salaryType = salaryMin > 500 ? 'annual' : 'hourly';
    } else {
      // Single value fallback
      const highlightsMatch = description.match(/## 📋 Highlights[\s\S]*?💰.*?\$([\d,.]+)/i);
      if (highlightsMatch) {
        const value = parseFloat(highlightsMatch[1].replace(/,/g, ''));
        salaryMin = value;
        salaryMax = value;
        salaryType = value > 500 ? 'annual' : 'hourly';
      }
    }
  }

  if (!salaryMin) return null;

  // Sanity checks
  if (salaryType === 'hourly' && (salaryMin < 20 || salaryMax > 500)) return null;
  if (salaryType === 'annual' && (salaryMin < 40000 || salaryMax < 40000)) return null;

  const result = { salaryMin, salaryMax, salaryType };

  if (salaryType === 'hourly') {
    result.salaryMinHourly = Math.round(salaryMin);
    result.salaryMaxHourly = Math.round(salaryMax);
    result.salaryMinAnnual = Math.round(salaryMin * 2080);
    result.salaryMaxAnnual = Math.round(salaryMax * 2080);
  } else {
    result.salaryMinAnnual = Math.round(salaryMin);
    result.salaryMaxAnnual = Math.round(salaryMax);
    result.salaryMinHourly = Math.round(salaryMin / 2080);
    result.salaryMaxHourly = Math.round(salaryMax / 2080);
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const save = args.includes('--save');
  const employerArg = args.find(a => a.startsWith('--employer='));
  const employerSlug = employerArg ? employerArg.split('=')[1] : null;

  console.log('💰 Salary Backfill from Formatted Descriptions\n');
  console.log(`Mode: ${save ? '✅ SAVE (will update DB)' : '🧪 DRY RUN (no changes)'}`);
  console.log(`Employer: ${employerSlug || 'ALL'}\n`);

  // Find jobs with formatted descriptions but no salary data
  const where = {
    salaryMin: null,
    salaryMax: null,
    classifiedAt: { not: null },
    description: { contains: '## 📋 Highlights' }
  };

  if (employerSlug) {
    where.employer = { slug: employerSlug };
  }

  const jobs = await prisma.nursingJob.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      employer: { select: { slug: true, name: true } }
    }
  });

  console.log(`Found ${jobs.length} classified jobs with highlights but no salary data\n`);

  let extracted = 0;
  let skipped = 0;
  const byEmployer = {};

  for (const job of jobs) {
    const salary = extractSalaryFromDescription(job.description);

    if (salary) {
      extracted++;
      const empSlug = job.employer?.slug || 'unknown';
      byEmployer[empSlug] = (byEmployer[empSlug] || 0) + 1;

      console.log(`  ✅ ${job.title}`);
      console.log(`     $${salary.salaryMin}-$${salary.salaryMax}/${salary.salaryType} (${empSlug})`);

      if (save) {
        await prisma.nursingJob.update({
          where: { id: job.id },
          data: {
            salaryMin: Math.round(salary.salaryMin),
            salaryMax: Math.round(salary.salaryMax),
            salaryType: salary.salaryType,
            salaryMinHourly: salary.salaryMinHourly,
            salaryMaxHourly: salary.salaryMaxHourly,
            salaryMinAnnual: salary.salaryMinAnnual,
            salaryMaxAnnual: salary.salaryMaxAnnual
          }
        });
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total scanned:    ${jobs.length}`);
  console.log(`Salary extracted: ${extracted}`);
  console.log(`No salary found:  ${skipped}`);

  if (Object.keys(byEmployer).length > 0) {
    console.log(`\nBy employer:`);
    for (const [slug, count] of Object.entries(byEmployer).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${slug}: ${count}`);
    }
  }

  if (!save && extracted > 0) {
    console.log(`\n⚠️  Run with --save to update the database`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
