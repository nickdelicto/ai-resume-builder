/**
 * LLM-Based Job Classification Script
 * Uses OpenAI GPT-4o-mini to accurately classify nursing jobs
 * 
 * Features:
 * - Validates if job is a Staff RN position (not NP, CRNA, LPN, etc.)
 * - Assigns accurate specialty (ICU, ER, Med-Surg, etc.)
 * - Detects job type (Full Time, Part Time, PRN, etc.)
 * - Formats description into clean, standardized markdown
 * 
 * Usage:
 *   node scripts/classify-jobs-with-llm.js [--test] [--limit=20] [--employer=cleveland-clinic]
 * 
 * Options:
 *   --test: Test mode - doesn't save to DB, just shows results
 *   --limit=N: Process only first N jobs (default: 20 for test, all for production)
 *   --employer=slug: Only process jobs from specific employer
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// All supported specialties (extracted from detectSpecialty function)
const SPECIALTIES = [
  'All Specialties',
  'Ambulatory',
  'Cardiac',
  'ER',
  'Geriatrics',
  'Home Care',
  'Home Health',
  'Hospice',
  'ICU',
  'Labor & Delivery',
  'Maternity',
  'Med-Surg',
  'Mental Health',
  'NICU',
  'Oncology',
  'OR',
  'PACU',
  'Pediatrics',
  'Progressive Care',
  'Radiology',
  'Rehabilitation',
  'Telemetry',
  'Travel'
];

// Parse command line arguments
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const employerArg = args.find(arg => arg.startsWith('--employer='));

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : (isTestMode ? 20 : null);
const employerSlug = employerArg ? employerArg.split('=')[1] : null;

console.log('🤖 LLM Job Classifier Starting...\n');
console.log(`Mode: ${isTestMode ? '🧪 TEST (no DB changes)' : '✅ PRODUCTION (will save to DB)'}`);
console.log(`Limit: ${limit || 'ALL jobs'}`);
console.log(`Employer: ${employerSlug || 'ALL employers'}\n`);

/**
 * Build the LLM prompt for job classification
 */
function buildClassificationPrompt(job) {
  // Truncate description to save tokens (first 1000 chars is usually enough)
  const descriptionPreview = job.description ? job.description.slice(0, 1300) : '';
  
  return `You are an expert nursing job classifier. Analyze this job posting and classify it accurately.

**Job Title:** ${job.title || 'N/A'}

**Description Preview:** ${descriptionPreview}

**Location:** ${job.city}, ${job.state}

**Employer:** ${job.employer?.name || 'N/A'}

---

**Task 1: Verify this is a Staff Registered Nurse (RN) position**
- Return TRUE if: Staff RN, Bedside RN, Clinical RN, Unit RN
- Return FALSE if: Nurse Practitioner (NP), CRNA, CNS, LPN, LVN, CNA, Management, Director, Educator

**Task 2: Assign the MOST ACCURATE specialty**
Choose ONE from this list: ${SPECIALTIES.join(', ')}

Guidelines:
- If job clearly specifies a unit/specialty, use that
- If job is multi-specialty or rotational, use "All Specialties"
- If uncertain, use "All Specialties"
- Prioritize specific specialties over general ones

**Task 3: Detect employment type**
Options: Full Time, Part Time, PRN, Per Diem, Contract, Travel, null
- Return null if unclear or not specified

**Task 4: Detect shift type**
Options: days, nights, evenings, variable, rotating, null
- "days" = Day shift only
- "nights" = Night shift only  
- "evenings" = Evening shift only
- "variable" = Multiple shifts available, flexible, various shifts, all shifts
- "rotating" = Rotating shifts required
- Return null if not specified or unclear

**Task 5: Detect experience level**
Options: Entry Level, New Grad, Experienced, Senior, Leadership, null
- "Entry Level" = Explicitly states entry level or 0-1 year required
- "New Grad" = New graduate, residency, fellowship, GN, or new grad program
- "Experienced" = Requires 1-3 years experience
- "Senior" = Requires 3+ years, senior RN, or advanced clinical expertise
- "Leadership" = Charge nurse, lead, manager, supervisor, director, coordinator
- Return null if not specified or unclear

**Return your answer ONLY as valid JSON in this exact format:**
{
  "isStaffRN": true or false,
  "specialty": "one of the specialties from the list",
  "jobType": "Full Time" or "Part Time" or "PRN" or "Per Diem" or "Contract" or "Travel" or null,
  "shiftType": "days" or "nights" or "evenings" or "variable" or "rotating" or null,
  "experienceLevel": "Entry Level" or "New Grad" or "Experienced" or "Senior" or "Leadership" or null,
  "confidence": 0.95
}`;
}

/**
 * Classify a single job using OpenAI API
 */
async function classifyJob(job) {
  try {
    const prompt = buildClassificationPrompt(job);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert nursing job classifier. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      // Note: GPT-5 only supports default temperature (1), no custom values
      max_completion_tokens: 600, // Increased to ensure complete JSON responses (was 300, caused truncation)
      response_format: { type: 'json_object' } // Force JSON response
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      success: true,
      classification: result,
      tokensUsed: response.usage.total_tokens,
      cost: calculateCost(response.usage)
    };
    
  } catch (error) {
    console.error(`❌ Error classifying job ${job.id}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate API cost based on token usage
 * GPT-5-mini pricing (Standard API, Nov 2024):
 * - Input: $0.25 per 1M tokens
 * - Cached Input: $0.025 per 1M tokens  
 * - Output: $2.00 per 1M tokens
 * 
 * Note: We use Standard API (not Batch) for real-time classification
 */
function calculateCost(usage) {
  const inputCost = (usage.prompt_tokens / 1_000_000) * 0.25;
  const outputCost = (usage.completion_tokens / 1_000_000) * 2.00;
  // Note: Cached tokens would be $0.025/1M, but we're conservative and use full price
  return inputCost + outputCost;
}

/**
 * Main classification workflow
 */
async function main() {
  try {
    // Build query to fetch jobs
    const whereClause = {
      isActive: true
    };
    
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
    
    // Fetch jobs to classify
    const jobs = await prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: { name: true }
        }
      },
      take: limit || undefined,
      orderBy: { scrapedAt: 'desc' }
    });
    
    if (jobs.length === 0) {
      console.log('⚠️  No jobs found to classify.');
      return;
    }
    
    console.log(`📊 Found ${jobs.length} jobs to classify\n`);
    console.log('─'.repeat(80));
    
    // Statistics
    let totalCost = 0;
    let totalTokens = 0;
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    // Process each job
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      console.log(`\n[${i + 1}/${jobs.length}] Processing: ${job.title}`);
      console.log(`   Employer: ${job.employer?.name || 'N/A'}`);
      console.log(`   Current specialty: ${job.specialty || 'none'}`);
      
      const result = await classifyJob(job);
      
      if (result.success) {
        successCount++;
        totalCost += result.cost;
        totalTokens += result.tokensUsed;
        
        const c = result.classification;
        console.log(`   ✅ LLM Classification:`);
        console.log(`      Staff RN: ${c.isStaffRN ? '✓ YES' : '✗ NO'}`);
        console.log(`      Specialty: ${c.specialty}`);
        console.log(`      Job Type: ${c.jobType || 'not specified'}`);
        console.log(`      Shift Type: ${c.shiftType || 'not specified'}`);
        console.log(`      Experience: ${c.experienceLevel || 'not specified'}`);
        console.log(`      Confidence: ${(c.confidence * 100).toFixed(0)}%`);
        console.log(`   💰 Cost: $${result.cost.toFixed(6)} | Tokens: ${result.tokensUsed}`);
        
        results.push({
          jobId: job.id,
          title: job.title,
          oldSpecialty: job.specialty,
          newSpecialty: c.specialty,
          isStaffRN: c.isStaffRN,
          jobType: c.jobType,
          shiftType: c.shiftType,
          experienceLevel: c.experienceLevel,
          confidence: c.confidence
        });
        
        // Update database if not in test mode
        if (!isTestMode && c.isStaffRN) {
          await prisma.nursingJob.update({
            where: { id: job.id },
            data: {
              specialty: c.specialty,
              jobType: c.jobType || job.jobType, // Keep existing if LLM didn't detect
              shiftType: c.shiftType || job.shiftType, // Keep existing if LLM didn't detect
              experienceLevel: c.experienceLevel || job.experienceLevel // Keep existing if LLM didn't detect
            }
          });
          console.log(`   💾 Updated in database`);
        } else if (!isTestMode && !c.isStaffRN) {
          // Mark as inactive if not a staff RN position
          await prisma.nursingJob.update({
            where: { id: job.id },
            data: {
              isActive: false
            }
          });
          console.log(`   🚫 Marked as inactive (not a staff RN position)`);
        }
        
      } else {
        failCount++;
        console.log(`   ❌ Classification failed: ${result.error}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Print summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 CLASSIFICATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`🎫 Total Tokens: ${totalTokens.toLocaleString()}`);
    console.log(`📈 Average Cost per Job: $${(totalCost / successCount).toFixed(6)}`);
    
    if (isTestMode) {
      console.log('\n🧪 TEST MODE: No changes were saved to the database');
    } else {
      console.log('\n✅ PRODUCTION MODE: Changes have been saved to the database');
    }
    
    // Show specialty distribution
    console.log('\n📋 Specialty Distribution:');
    const specialtyCounts = {};
    results.forEach(r => {
      if (r.isStaffRN) {
        specialtyCounts[r.newSpecialty] = (specialtyCounts[r.newSpecialty] || 0) + 1;
      }
    });
    Object.entries(specialtyCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([specialty, count]) => {
        console.log(`   ${specialty}: ${count}`);
      });
    
    // Show jobs that changed specialty
    const changedJobs = results.filter(r => r.oldSpecialty !== r.newSpecialty);
    if (changedJobs.length > 0) {
      console.log(`\n🔄 ${changedJobs.length} jobs had specialty changes:`);
      changedJobs.slice(0, 10).forEach(r => {
        console.log(`   "${r.title}": ${r.oldSpecialty || 'none'} → ${r.newSpecialty}`);
      });
      if (changedJobs.length > 10) {
        console.log(`   ... and ${changedJobs.length - 10} more`);
      }
    }
    
    // Show URLs for easy checking (first 10)
    console.log(`\n🔗 URLs to check on your local site:`);
    const jobsToShow = jobs.slice(0, Math.min(10, results.length));
    for (const job of jobsToShow) {
      const result = results.find(r => r.jobId === job.id);
      if (result) {
        const status = result.isStaffRN ? '✅ RN' : '❌ Not RN';
        console.log(`   ${status} - http://localhost:3000/jobs/nursing/${job.slug}`);
        console.log(`      ${job.title}`);
      }
    }
    
    console.log('\n✨ Classification complete!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

