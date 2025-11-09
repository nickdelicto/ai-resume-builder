#!/usr/bin/env node

/**
 * Workday Scraper Runner
 * 
 * This script runs Workday scrapers for one or all configured employers.
 * 
 * Usage:
 *   node workday-scraper-runner.js                    # Run all employers
 *   node workday-scraper-runner.js nyu-health         # Run specific employer
 *   node workday-scraper-runner.js --no-save          # Run without saving to database
 *   node workday-scraper-runner.js --max-pages 5      # Limit to 5 pages (for testing)
 */

const WorkdayRNScraper = require('./workday-rn-scraper-base');
const { getConfig, getAllConfigs, getEmployerSlugs } = require('./workday-employer-configs');

// Parse command line arguments
const args = process.argv.slice(2);
const employerSlug = args.find(arg => !arg.startsWith('--'));
const noSave = args.includes('--no-save');
const maxPagesArg = args.find(arg => arg.startsWith('--max-pages'));
const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : null;

/**
 * Run scraper for a single employer
 * @param {string} slug - Employer slug
 * @returns {Promise<object>} - Scraping results
 */
async function runScraperForEmployer(slug) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping: ${slug}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const config = getConfig(slug);
  if (!config) {
    console.error(`❌ Configuration not found for employer: ${slug}`);
    return { success: false, error: 'Configuration not found' };
  }
  
  const scraper = new WorkdayRNScraper(config, {
    saveToDatabase: !noSave,
    maxPages: maxPages
  });
  
  const results = await scraper.scrapeRNJobs();
  
  return {
    employerSlug: slug,
    employerName: config.employerName,
    ...results
  };
}

/**
 * Run scrapers for all employers
 * @returns {Promise<Array>} - Array of results for each employer
 */
async function runAllScrapers() {
  const slugs = getEmployerSlugs();
  console.log(`\n📋 Found ${slugs.length} configured employer(s): ${slugs.join(', ')}\n`);
  
  const results = [];
  
  for (const slug of slugs) {
    try {
      const result = await runScraperForEmployer(slug);
      results.push(result);
      
      // Add delay between employers to be respectful
      if (slug !== slugs[slugs.length - 1]) {
        console.log('\n⏳ Waiting 5 seconds before next employer...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`❌ Error scraping ${slug}: ${error.message}`);
      results.push({
        employerSlug: slug,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Workday RN Job Scraper Runner\n');
  
  if (noSave) {
    console.log('⚠️  Running in TEST MODE (--no-save): Jobs will NOT be saved to database\n');
  }
  
  if (maxPages) {
    console.log(`📌 Page limit set: ${maxPages} pages per employer (for testing)\n`);
  }
  
  let results;
  
  if (employerSlug) {
    // Run for specific employer
    console.log(`🎯 Running scraper for: ${employerSlug}\n`);
    results = [await runScraperForEmployer(employerSlug)];
  } else {
    // Run for all employers
    console.log('🌐 Running scrapers for ALL configured employers\n');
    results = await runAllScrapers();
  }
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(60)}\n`);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.employerName || result.employerSlug}:`);
      console.log(`   Total jobs: ${result.totalJobs || 0}`);
      console.log(`   RN jobs: ${result.rnJobs || 0}`);
      console.log(`   Successfully processed: ${result.validatedJobs || 0}`);
      if (result.saveResults) {
        console.log(`   Saved to database: ${result.saveResults.created || 0} created, ${result.saveResults.updated || 0} updated`);
      }
      
      // Show sample job with formatted description (if jobs were scraped)
      if (result.jobs && result.jobs.length > 0) {
        const sample = result.jobs[0];
        console.log(`\n📋 Sample Job (First of ${result.jobs.length}):`);
        console.log('═══════════════════════════════════════════');
        console.log(`Title: ${sample.title}`);
        console.log(`Location: ${sample.location}`);
        console.log(`City: ${sample.city}, State: ${sample.state}`);
        console.log(`Description Length: ${sample.description ? sample.description.length : 0} characters`);
        console.log(`\nDescription Preview (first 500 chars):`);
        console.log('───────────────────────────────────────────');
        if (sample.description) {
          const preview = sample.description.substring(0, 500);
          console.log(preview);
          if (sample.description.length > 500) {
            console.log('...');
            console.log(`\n[Full description is ${sample.description.length} characters]`);
          }
        } else {
          console.log('NO DESCRIPTION');
        }
        console.log('═══════════════════════════════════════════\n');
      }
    } else {
      console.log(`❌ ${result.employerName || result.employerSlug}: ${result.error || 'Failed'}`);
    }
    console.log('');
  });
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n✅ Completed: ${successful}/${total} employer(s) scraped successfully\n`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runScraperForEmployer, runAllScrapers };

