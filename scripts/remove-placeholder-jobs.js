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
  
  // Normalize: lowercase, normalize whitespace (multiple spaces -> single space)
  const normalized = description
    .toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/[.,;:!?]+/g, ' ') // Remove punctuation (might vary)
    .trim();
  
  // Pattern 1: "Job description is being updated" - core message
  // Check with flexible whitespace handling
  if (/job\s+description\s+is\s+being\s+updated/i.test(normalized)) {
    return true;
  }
  
  // Pattern 2: Check if it contains BOTH key phrases
  // "job description is being updated" AND ("please visit" OR "employer website")
  const hasCoreMessage = /job\s+description\s+is\s+being\s+updated/i.test(normalized);
  const hasVisitMessage = normalized.includes('please visit') || normalized.includes('employer website') || normalized.includes('visit the employer');
  
  if (hasCoreMessage && hasVisitMessage) {
    return true;
  }
  
  // Pattern 3: Even if core message missing, if it's very short and has "please visit employer website"
  // This catches variations where the first part might be missing
  if (normalized.length < 300 && hasVisitMessage && normalized.includes('full details')) {
    return true;
  }
  
  // Pattern 4: Very short descriptions that are clearly placeholders
  if (normalized.length < 200) {
    const shortPlaceholderPatterns = [
      /^job\s+description\s+is\s+being\s+updated/i,
      /^description\s+is\s+being\s+updated/i,
      /job\s+description\s+not\s+available/i,
      /^job\s+description\s*$/i,
      /^description\s*$/i,
      /^details\s*$/i,
      /^n\/a$/i,
      /^not\s+available$/i
    ];
    
    for (const pattern of shortPlaceholderPatterns) {
      if (pattern.test(normalized)) {
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
    }
    
    // Filter jobs with placeholder descriptions
    const placeholderJobs = allJobs.filter(job => {
      return isPlaceholderDescription(job.description);
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
    
    console.log(`⚠️  Found ${placeholderJobs.length} jobs with placeholder descriptions:\n`);
    
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

