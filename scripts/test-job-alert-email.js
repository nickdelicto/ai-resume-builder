#!/usr/bin/env node

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { getMatchingJobs, generateJobAlertEmailHTML } = require('../lib/services/jobAlertEmailService');
const { getEmployerLogoUrl } = require('../lib/utils/employerLogos');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testEmailGeneration() {
  console.log('🧪 Testing Job Alert Email Template\n');

  try {
    // Fetch a real alert or create mock data
    let alert = await prisma.jobAlert.findFirst({
      where: { active: true }
    });

    if (!alert) {
      console.log('No active alerts found, using mock data...');
      alert = {
        id: 'test-123',
        email: 'test@example.com',
        name: 'Test User',
        specialty: 'ICU',
        location: 'Ohio',
        state: 'OH',
        city: null,
        unsubscribeToken: 'test-token-123'
      };
    }

    console.log(`Alert: ${alert.specialty} in ${alert.location}`);
    console.log(`Email: ${alert.email}\n`);

    // Fetch matching jobs
    const jobs = await getMatchingJobs(alert);
    console.log(`Found ${jobs.length} matching jobs\n`);

    // Show which jobs have logos
    console.log('Jobs with employer logos:');
    jobs.forEach((job, idx) => {
      const logoUrl = job.employer?.slug ? getEmployerLogoUrl(job.employer.slug) : null;
      console.log(`  ${idx + 1}. ${job.title} @ ${job.employer?.name || 'Unknown'} ${logoUrl ? '✅ HAS LOGO' : '❌ no logo'}`);
    });

    // Generate HTML
    const html = generateJobAlertEmailHTML(alert, jobs);

    // Save to file
    const outputPath = path.join(__dirname, '..', 'test-email-preview.html');
    fs.writeFileSync(outputPath, html);
    console.log(`\n✅ HTML preview saved to: ${outputPath}`);
    console.log('   Open this file in your browser to preview the email!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailGeneration();
