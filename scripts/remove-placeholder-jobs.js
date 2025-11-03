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
  
  // Check for placeholder text patterns
  const placeholderPatterns = [
    /job\s+description\s+is\s+being\s+updated/i,
    /please\s+visit\s+(?:the\s+)?employer\s+website\s+(?:for\s+)?full\s+details/i,
    /please\s+visit\s+(?:the\s+)?employer\s+website/i,
    /visit\s+(?:the\s+)?employer\s+website\s+(?:for\s+)?full\s+details/i,
    /description\s+coming\s+soon/i,
    /description\s+to\s+be\s+added/i,
    /details\s+to\s+follow/i,
    /job\s+description\s+not\s+available/i,
    /description\s+will\s+be\s+updated/i
  ];
  
  // Check for placeholder patterns regardless of length
  for (const pattern of placeholderPatterns) {
    if (pattern.test(descLower)) {
      return true;
    }
  }
  
  // Also check if description is suspiciously short (likely timeout/truncation)
  if (descLower.length < 200) {
    const genericPatterns = [
      /^job\s+description\s*$/i,
      /^description\s*$/i,
      /^details\s*$/i,
      /^n\/a/i,
      /^not\s+available/i
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
    
    // Filter jobs with placeholder descriptions
    const placeholderJobs = allJobs.filter(job => {
      return isPlaceholderDescription(job.description);
    });
    
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

