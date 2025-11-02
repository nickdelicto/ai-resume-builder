/**
 * Check what descriptions are actually saved in the database for Northwell jobs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDescriptions() {
  try {
    // Get the failing job
    const failingJob = await prisma.nursingJob.findFirst({
      where: {
        sourceUrl: {
          contains: '22602474' // Cardiology RN job ID
        },
        employer: {
          name: 'Northwell Health'
        }
      },
      select: {
        title: true,
        slug: true,
        description: true,
        sourceUrl: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true
      }
    });
    
    console.log('\n🔍 Failing Job (Cardiology RN):');
    console.log('═══════════════════════════════════════════');
    if (failingJob) {
      console.log(`Title: ${failingJob.title}`);
      console.log(`URL: ${failingJob.sourceUrl}`);
      console.log(`Salary: ${failingJob.salaryMin}-${failingJob.salaryMax} ${failingJob.salaryType}`);
      console.log(`Description Length: ${failingJob.description ? failingJob.description.length : 0} characters`);
      console.log(`\nDescription Preview (first 500 chars):`);
      console.log(failingJob.description ? failingJob.description.substring(0, 500) : 'NO DESCRIPTION');
      console.log(`\nDescription Ends With (last 200 chars):`);
      console.log(failingJob.description ? failingJob.description.substring(Math.max(0, failingJob.description.length - 200)) : 'NO DESCRIPTION');
      
      // Check for JavaScript patterns
      const hasFunction = failingJob.description && failingJob.description.includes('function');
      const hasVar = failingJob.description && failingJob.description.includes('var ');
      const hasDocument = failingJob.description && failingJob.description.includes('$(document)');
      console.log(`\nJavaScript Patterns:`);
      console.log(`  Has "function": ${hasFunction}`);
      console.log(`  Has "var ": ${hasVar}`);
      console.log(`  Has "$(document)": ${hasDocument}`);
      
      // Count occurrences
      if (failingJob.description) {
        const functionCount = (failingJob.description.match(/function/g) || []).length;
        const varCount = (failingJob.description.match(/var\s+/g) || []).length;
        console.log(`  "function" count: ${functionCount}`);
        console.log(`  "var " count: ${varCount}`);
      }
    } else {
      console.log('Job not found in database');
    }
    
    // Get the working job for comparison
    const workingJob = await prisma.nursingJob.findFirst({
      where: {
        sourceUrl: {
          contains: '22599259' // Local RN job ID
        },
        employer: {
          name: 'Northwell Health'
        }
      },
      select: {
        title: true,
        slug: true,
        description: true,
        sourceUrl: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true
      }
    });
    
    console.log('\n\n✅ Working Job (Local RN):');
    console.log('═══════════════════════════════════════════');
    if (workingJob) {
      console.log(`Title: ${workingJob.title}`);
      console.log(`URL: ${workingJob.sourceUrl}`);
      console.log(`Salary: ${workingJob.salaryMin}-${workingJob.salaryMax} ${workingJob.salaryType}`);
      console.log(`Description Length: ${workingJob.description ? workingJob.description.length : 0} characters`);
      console.log(`\nDescription Preview (first 500 chars):`);
      console.log(workingJob.description ? workingJob.description.substring(0, 500) : 'NO DESCRIPTION');
      
      // Check for JavaScript patterns
      const hasFunction = workingJob.description && workingJob.description.includes('function');
      const hasVar = workingJob.description && workingJob.description.includes('var ');
      const hasDocument = workingJob.description && workingJob.description.includes('$(document)');
      console.log(`\nJavaScript Patterns:`);
      console.log(`  Has "function": ${hasFunction}`);
      console.log(`  Has "var ": ${hasVar}`);
      console.log(`  Has "$(document)": ${hasDocument}`);
      
      // Count occurrences
      if (workingJob.description) {
        const functionCount = (workingJob.description.match(/function/g) || []).length;
        const varCount = (workingJob.description.match(/var\s+/g) || []).length;
        console.log(`  "function" count: ${functionCount}`);
        console.log(`  "var " count: ${varCount}`);
      }
    } else {
      console.log('Job not found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDescriptions();

