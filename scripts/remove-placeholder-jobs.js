#!/usr/bin/env node

/**
 * Cleanup script to remove/deactivate jobs with placeholder descriptions
 * Finds jobs with "Job description is being updated" or similar placeholder text
 * and marks them as inactive
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Check if description is placeholder/incomplete
 * @param {string} description - Job description
 * @returns {boolean} - True if description is placeholder
 */
function isPlaceholderDescription(description) {
  if (!description) return true;
  
  const descLower = description.toLowerCase().trim();
  
  // PRIMARY CHECK: Match the EXACT phrase from the website
  // "Job description is being updated. Please visit the employer website for full details."
  // This is the exact phrase that appears on all problematic listings
  
  // Pattern 1: Complete exact phrase (flexible whitespace and punctuation)
  // Match: "job description is being updated" followed by "please visit the employer website for full details"
  const exactPhrasePattern = /job\s+description\s+is\s+being\s+updated[^a-z]*please\s+visit\s+(?:the\s+)?employer\s+website\s+for\s+full\s+details/i;
  if (exactPhrasePattern.test(descLower)) {
    return true;
  }
  
  // Pattern 2: Both parts present (more flexible - handles punctuation variations)
  // Check if it contains ALL key components:
  // - "job description is being updated"
  // - "please visit"
  // - "employer website" 
  // - "full details"
  const hasPart1 = /job\s+description\s+is\s+being\s+updated/i.test(descLower);
  const hasPart2a = descLower.includes('please visit');
  const hasPart2b = descLower.includes('employer website');
  const hasPart2c = descLower.includes('full details');
  
  if (hasPart1 && hasPart2a && hasPart2b && hasPart2c) {
    return true;
  }
  
  // Pattern 3: Just the core message (if description is very short)
  // Sometimes only first part is present in incomplete extractions
  if (descLower.length < 200 && /job\s+description\s+is\s+being\s+updated/i.test(descLower)) {
    return true;
  }
  
  // Pattern 4: Generic placeholder patterns (for other edge cases)
  if (descLower.length < 200) {
    const genericPatterns = [
      /^job\s+description\s+is\s+being\s+updated/i,
      /^description\s+is\s+being\s+updated/i,
      /job\s+description\s+not\s+available/i,
      /^job\s+description\s*$/i,
      /^description\s*$/i,
      /^details\s*$/i,
      /^n\/a$/i,
      /^not\s+available$/i
    ];
    
    for (const pattern of genericPatterns) {
      if (pattern.test(descLower)) {
        return true;
      }
    }
  }
  
  return false;
}

async function removePlaceholderJobs() {
  console.log('🔍 Finding jobs with placeholder descriptions...\n');
  
  try {
    // Get all active jobs
    const allJobs = await prisma.nursingJob.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        title: true,
        description: true,
        sourceUrl: true,
        employer: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${allJobs.length} active jobs in database\n`);
    
    // Debug: Show sample descriptions to see what we're working with
    if (allJobs.length > 0) {
      console.log('📝 Sample descriptions from database (first 3):');
      allJobs.slice(0, 3).forEach((job, index) => {
        const preview = job.description ? job.description.substring(0, 150) : 'NO DESCRIPTION';
        console.log(`   ${index + 1}. ${job.title.substring(0, 50)}...`);
        console.log(`      Description: "${preview}"`);
        console.log(`      Length: ${job.description ? job.description.length : 0} chars\n`);
      });
      
      // Also search for jobs with the exact placeholder phrase
      console.log('🔍 Searching for jobs containing the EXACT placeholder phrase...\n');
      console.log('   Looking for: "Job description is being updated. Please visit the employer website for full details."\n');
      const jobsWithPlaceholderText = allJobs.filter(job => {
        if (!job.description) return false;
        const descLower = job.description.toLowerCase();
        // Check for the complete phrase or key components
        return descLower.includes('job description is being updated') && 
               descLower.includes('please visit') && 
               descLower.includes('employer website') &&
               descLower.includes('full details');
      });
      
      if (jobsWithPlaceholderText.length > 0) {
        console.log(`   Found ${jobsWithPlaceholderText.length} jobs with placeholder-related text:\n`);
        jobsWithPlaceholderText.slice(0, 5).forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.title.substring(0, 60)}`);
          console.log(`      Full description: "${job.description}"`);
          console.log(`      Length: ${job.description.length} chars\n`);
        });
      } else {
        console.log('   No jobs found with "job description is being updated" or "please visit employer website"\n');
      }
      
      // Check for very short descriptions (might be incomplete)
      const shortJobs = allJobs.filter(job => job.description && job.description.length < 200);
      console.log(`📏 Found ${shortJobs.length} jobs with descriptions < 200 chars (might be incomplete)\n`);
      console.log('   Showing ALL short descriptions for review:\n');
      shortJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.title.substring(0, 60)} (${job.employer.name})`);
        console.log(`      Full description: "${job.description}"`);
        console.log(`      Length: ${job.description.length} chars`);
        console.log(`      URL: ${job.sourceUrl || 'N/A'}\n`);
      });
      
      // Also check if any descriptions contain partial matches
      console.log('🔍 Checking for partial matches (case-insensitive substring search)...\n');
      const partialMatches = allJobs.filter(job => {
        if (!job.description) return false;
        const desc = job.description.toLowerCase();
        return desc.includes('description') && desc.includes('updated') && desc.includes('visit');
      });
      
      if (partialMatches.length > 0) {
        console.log(`   Found ${partialMatches.length} jobs with partial match keywords:\n`);
        partialMatches.slice(0, 10).forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.title.substring(0, 60)}`);
          console.log(`      Description: "${job.description.substring(0, 200)}${job.description.length > 200 ? '...' : ''}"`);
          console.log(`      Length: ${job.description.length} chars\n`);
        });
      }
    }
    
    // Filter jobs with placeholder descriptions OR incomplete descriptions (just metadata)
    const placeholderJobs = allJobs.filter(job => {
      // Check if it's a known placeholder pattern
      if (isPlaceholderDescription(job.description)) {
        return true;
      }
      
      // ALSO check: Very short descriptions that are just metadata (extraction likely failed)
      // These look like: "TitleJobTypeLocation, STFacility" - no actual description content
      // These happen when JD extraction times out or fails, and only listing page metadata is saved
      if (job.description && job.description.length < 200) {
        const desc = job.description;
        
        // If it looks like just concatenated metadata (title + job type + location)
        // Pattern: No sentence punctuation, few words, looks like concatenated fields
        const hasSentenceStructure = /[.!?]/.test(desc);
        const wordCount = desc.split(/\s+/).length;
        const looksLikeMetadata = !hasSentenceStructure && wordCount < 15 && desc.length < 120;
        
        // Also check if it's missing key description words that would appear in real descriptions
        const hasDescriptionContent = /\b(?:performs|responsibilities|requirements|experience|skills|must have|provide|assist|manage|implement|collaborate|assess|evaluate|duties|functions|work with|care for)\b/i.test(desc);
        
        // Pattern: If it's very short and looks like concatenated fields without spaces
        // Examples: "RN Homecare Visit NurseFull TimeIndependence, OHBusiness Operations Ctr"
        const hasConcatenatedFields = /[A-Z][a-z]+(?:[A-Z][a-z]+)+/.test(desc) && wordCount < 10;
        
        if (looksLikeMetadata || hasConcatenatedFields || (!hasDescriptionContent && desc.length < 120)) {
          return true; // This is likely an incomplete description from failed extraction
        }
      }
      
      return false;
    });
    
    // Debug: Show first few matches to verify pattern is working
    if (placeholderJobs.length > 0) {
      console.log('✓ First few matched jobs:');
      placeholderJobs.slice(0, 5).forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.title.substring(0, 50)}...`);
        console.log(`      Description preview: "${job.description ? job.description.substring(0, 100) : 'NO DESCRIPTION'}..."`);
      });
      console.log('');
    }
    
    console.log(`⚠️  Found ${placeholderJobs.length} jobs with placeholder OR incomplete descriptions:\n`);
    console.log(`   (Includes jobs with placeholder text AND jobs with metadata-only descriptions < 120 chars)\n`);
    
    // Show sample of jobs to be deactivated
    if (placeholderJobs.length > 0) {
      console.log('Sample jobs to be deactivated:');
      placeholderJobs.slice(0, 10).forEach((job, index) => {
        const descPreview = job.description ? job.description.substring(0, 100) : 'No description';
        console.log(`  ${index + 1}. ${job.title} (${job.employer.name})`);
        console.log(`     Description: ${descPreview}...`);
      });
      
      if (placeholderJobs.length > 10) {
        console.log(`     ... and ${placeholderJobs.length - 10} more\n`);
      } else {
        console.log('');
      }
    }
    
    if (placeholderJobs.length === 0) {
      console.log('✅ No placeholder jobs found. Database is clean!\n');
      return;
    }
    
    // Deactivate placeholder jobs
    console.log(`🗑️  Deactivating ${placeholderJobs.length} placeholder jobs...\n`);
    
    const jobIds = placeholderJobs.map(job => job.id);
    
    const updateResult = await prisma.nursingJob.updateMany({
      where: {
        id: {
          in: jobIds
        }
      },
      data: {
        isActive: false
      }
    });
    
    console.log(`✅ Successfully deactivated ${updateResult.count} jobs\n`);
    
    // Summary
    const remainingActive = allJobs.length - updateResult.count;
    console.log('📊 Summary:');
    console.log(`   Total active jobs: ${allJobs.length}`);
    console.log(`   Placeholder jobs found: ${placeholderJobs.length}`);
    console.log(`   Deactivated: ${updateResult.count}`);
    console.log(`   Remaining active: ${remainingActive}\n`);
    
  } catch (error) {
    console.error('❌ Error removing placeholder jobs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  removePlaceholderJobs()
    .then(() => {
      console.log('✅ Cleanup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { removePlaceholderJobs, isPlaceholderDescription };

