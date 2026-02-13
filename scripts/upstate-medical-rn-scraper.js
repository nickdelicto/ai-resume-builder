#!/usr/bin/env node
/**
 * Upstate Medical University RN Job Scraper
 *
 * Platform: PageUp
 * Employer: SUNY Upstate Medical University (Syracuse, NY)
 * Career Page: https://careers.upstate.edu
 *
 * Uses JSON-LD structured data for reliable job extraction
 */

require('dotenv').config();

const puppeteer = require('puppeteer');
const {
  normalizeState,
  normalizeCity,
  generateEmployerSlug,
  normalizeJobType,
  detectSpecialty,
  detectExperienceLevel,
  normalizeZipCode,
  generateJobSlug,
  validateJobData
} = require('../lib/jobScraperUtils');
const JobBoardService = require('../lib/services/JobBoardService');
const { detectWorkArrangement } = require('../lib/utils/workArrangementUtils');

class UpstateMedicalRNScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://careers.upstate.edu';
    // Nursing category filter already applied via category_uids
    this.searchUrl = 'https://careers.upstate.edu/jobs/search?page=1&category_uids%5B%5D=c21c3469e78b45c12e24ee40a1a4a051&query=';
    this.employerName = 'Upstate Medical University';
    this.employerSlug = generateEmployerSlug(this.employerName);
    this.careerPageUrl = this.baseUrl;
    this.atsPlatform = 'PageUp';

    // Options
    this.saveToDatabase = options.saveToDatabase !== false;
    this.maxPages = options.maxPages || 50; // Safety limit
    this.maxJobs = options.maxJobs || null;
    this.jobService = options.jobService || new JobBoardService();

    // Stats
    this.stats = {
      totalFound: 0,
      processed: 0,
      saved: 0,
      updated: 0,
      errors: 0,
      skipped: 0
    };
  }

  /**
   * Main entry point
   */
  async scrapeRNJobs() {
    console.log(`🏥 Starting Upstate Medical University RN Job Scraping...`);
    console.log(`Search URL: ${this.searchUrl}`);
    console.log(`Save to DB: ${this.saveToDatabase}`);
    console.log(`Max Pages: ${this.maxPages}`);
    console.log(`Max Jobs: ${this.maxJobs || 'Unlimited'}\n`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // PHASE 1: Collect all job URLs from search results
      console.log('📋 PHASE 1: Collecting job URLs from search pages...\n');
      const jobUrls = await this.collectJobUrls(page);

      this.stats.totalFound = jobUrls.length;
      console.log(`\n✅ Found ${jobUrls.length} job URLs\n`);

      if (jobUrls.length === 0) {
        console.log('⚠️  No jobs found. Exiting.');
        return { success: true, stats: this.stats, jobs: [] };
      }

      // PHASE 2: Process each job detail page
      console.log('📄 PHASE 2: Processing job details...\n');
      const jobs = [];
      const limit = this.maxJobs ? Math.min(jobUrls.length, this.maxJobs) : jobUrls.length;

      for (let i = 0; i < limit; i++) {
        const url = jobUrls[i];
        console.log(`[${i + 1}/${limit}] ${url.split('/jobs/')[1]?.substring(0, 50)}...`);

        try {
          const jobData = await this.processJobPage(page, url);

          if (jobData) {
            // Validate
            const validation = validateJobData(jobData);
            if (validation.valid) {
              jobs.push(jobData);
              this.stats.processed++;
              console.log(`   ✅ ${jobData.title}`);
            } else {
              console.log(`   ⚠️  Validation failed: ${validation.errors.join(', ')}`);
              this.stats.skipped++;
            }
          } else {
            this.stats.skipped++;
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          this.stats.errors++;
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 800));
      }

      console.log(`\n📊 Processing complete: ${jobs.length} jobs ready\n`);

      // PHASE 3: Save to database
      if (this.saveToDatabase && jobs.length > 0) {
        await this.saveJobsToDatabase(jobs);
      }

      return {
        success: true,
        stats: this.stats,
        jobs
      };

    } catch (error) {
      console.error('❌ Fatal error:', error);
      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Collect all job URLs by paginating through search results
   */
  async collectJobUrls(page) {
    const allUrls = new Set();
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= this.maxPages) {
      const pageUrl = this.searchUrl.replace('page=1', `page=${currentPage}`);
      console.log(`   Page ${currentPage}: ${pageUrl.substring(0, 80)}...`);

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      } catch (navError) {
        console.log(`   ⚠️  Page ${currentPage} navigation failed: ${navError.message}`);
        console.log(`   Continuing with ${allUrls.size} jobs collected so far`);
        break;
      }
      await new Promise(r => setTimeout(r, 2000));

      // Extract job URLs from page
      const urls = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/jobs/"]');
        const jobUrls = [];

        links.forEach(link => {
          const href = link.href;
          // Filter: must be job detail page (has UUID-like slug), not search page
          if (href.includes('/jobs/') &&
              !href.includes('/jobs/search') &&
              !href.includes('#') &&
              href.match(/[a-f0-9]{8}-[a-f0-9]{4}/)) {
            jobUrls.push(href);
          }
        });

        return [...new Set(jobUrls)]; // Dedupe
      });

      urls.forEach(url => allUrls.add(url));
      console.log(`   Found ${urls.length} jobs (Total: ${allUrls.size})`);

      // Check for next page
      hasNextPage = await page.evaluate(() => {
        const nextLink = document.querySelector('a[rel="next"]');
        return nextLink !== null;
      });

      if (hasNextPage) {
        currentPage++;
      }

      // Safety check
      if (this.maxJobs && allUrls.size >= this.maxJobs) {
        console.log(`   Reached max jobs limit (${this.maxJobs})`);
        break;
      }
    }

    return [...allUrls];
  }

  /**
   * Process a single job detail page
   */
  async processJobPage(page, jobUrl) {
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));

    // Extract job data - prefer JSON-LD, fallback to DOM
    const jobData = await page.evaluate(() => {
      const result = {
        title: null,
        description: null,
        location: null,
        city: null,
        state: null,
        datePosted: null,
        employmentType: null,
        sourceUrl: window.location.href
      };

      // Try JSON-LD first (most reliable)
      const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) {
        try {
          const jsonLd = JSON.parse(jsonLdScript.textContent);
          if (jsonLd['@type'] === 'JobPosting') {
            result.title = jsonLd.title;
            result.description = jsonLd.description;
            result.datePosted = jsonLd.datePosted;
            result.employmentType = jsonLd.employmentType;

            // Location from JSON-LD
            if (jsonLd.jobLocation) {
              const loc = jsonLd.jobLocation;
              if (loc.address) {
                result.city = loc.address.addressLocality;
                result.state = loc.address.addressRegion;
                result.location = `${result.city}, ${result.state}`;
              }
            }
          }
        } catch (e) {
          // JSON parse error, fall back to DOM
        }
      }

      // Fallback to DOM selectors if needed
      if (!result.title) {
        const titleEl = document.querySelector('h3.job-title') || document.querySelector('h1');
        result.title = titleEl ? titleEl.textContent.trim() : null;
      }

      if (!result.location) {
        const locEl = document.querySelector('.job-component-location') ||
                      document.querySelector('.job-field.job-location');
        if (locEl) {
          result.location = locEl.textContent.trim();
        }
      }

      if (!result.description) {
        const descEl = document.querySelector('.job-description');
        if (descEl) {
          result.description = descEl.innerHTML; // Keep HTML for processing
        }
      }

      return result;
    });

    if (!jobData.title || !jobData.description) {
      console.log(`   ⚠️  Missing title or description`);
      return null;
    }

    // Clean and format description
    const cleanDescription = this.cleanDescription(jobData.description);

    // Parse location
    let city = jobData.city || 'Syracuse';
    let state = jobData.state || 'NY';

    if (jobData.location && !jobData.city) {
      const locationParts = jobData.location.split(',').map(s => s.trim());
      if (locationParts.length >= 1) city = locationParts[0];
      if (locationParts.length >= 2) state = locationParts[1];
    }

    const normalizedCity = normalizeCity(city);
    const normalizedState = normalizeState(state);

    // Generate unique job ID from URL
    const urlMatch = jobUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
    const sourceJobId = urlMatch ? urlMatch[1] : jobUrl.split('/').pop();

    // Detect job type from title/description
    const jobType = this.detectJobType(jobData.title, cleanDescription, jobData.employmentType);

    // Build job object
    return {
      title: jobData.title,
      description: cleanDescription,
      slug: generateJobSlug(jobData.title, normalizedCity, normalizedState, sourceJobId.substring(0, 8)),

      location: `${normalizedCity}, ${normalizedState}`,
      city: normalizedCity,
      state: normalizedState,
      zipCode: null,
      isRemote: false,

      specialty: detectSpecialty(jobData.title, cleanDescription),
      experienceLevel: detectExperienceLevel(jobData.title, cleanDescription),
      jobType: jobType,
      shiftType: null,

      department: null,
      requirements: null,
      responsibilities: null,
      benefits: null,

      salaryMin: null,
      salaryMax: null,
      salaryCurrency: 'USD',
      salaryType: null,
      // Computed fields (null since no salary data from this employer)
      salaryMinHourly: null,
      salaryMaxHourly: null,
      salaryMinAnnual: null,
      salaryMaxAnnual: null,

      postedDate: jobData.datePosted ? new Date(jobData.datePosted).toISOString() : null,
      expiresDate: null,

      // Detect work arrangement (remote/hybrid/onsite)
      workArrangement: detectWorkArrangement({
        title: jobData.title,
        description: cleanDescription,
        location: `${normalizedCity}, ${normalizedState}`,
        employmentType: jobData.employmentType || ''
      }),

      sourceUrl: jobUrl,
      sourceJobId: sourceJobId,

      employerName: this.employerName,
      employerSlug: this.employerSlug,
      careerPageUrl: this.careerPageUrl
    };
  }

  /**
   * Clean HTML description to plain text
   */
  cleanDescription(html) {
    if (!html) return '';

    // Decode HTML entities
    const decoded = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\n/g, '\n');

    // Convert common HTML to text
    const text = decoded
      // Convert headers to text with newlines
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n')
      // Convert paragraphs
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Convert list items
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      // Convert bold/strong to plain text
      .replace(/<\/?(?:strong|b)[^>]*>/gi, '')
      // Remove all other HTML tags
      .replace(/<[^>]+>/g, '')
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text.substring(0, 10000);
  }

  /**
   * Detect job type from various sources
   */
  detectJobType(title, description, employmentType) {
    // First check employmentType from JSON-LD
    if (employmentType) {
      const et = employmentType.toLowerCase();
      if (et.includes('full')) return 'full-time';
      if (et.includes('part')) return 'part-time';
      if (et.includes('per diem') || et.includes('prn')) return 'prn';
      if (et.includes('contract') || et.includes('temp')) return 'contract';
    }

    // Fall back to normalizeJobType utility
    return normalizeJobType(title) || normalizeJobType(description);
  }

  /**
   * Save jobs to database
   */
  async saveJobsToDatabase(jobs) {
    console.log('💾 PHASE 3: Saving to database...\n');

    const employerData = {
      employerName: this.employerName,
      employerSlug: this.employerSlug,
      careerPageUrl: this.careerPageUrl,
      atsPlatform: this.atsPlatform
    };

    try {
      const result = await this.jobService.saveJobs(jobs, employerData, {
        verifyActiveJobs: true
      });

      this.stats.saved = result.created;
      this.stats.updated = result.updated;

      console.log(`📊 Database Results:`);
      console.log(`   Created: ${result.created}`);
      console.log(`   Updated: ${result.updated}`);
      console.log(`   Reactivated: ${result.reactivated}`);
      console.log(`   Deactivated: ${result.deactivated}`);
      console.log(`   Errors: ${result.errors}`);

    } catch (error) {
      console.error('❌ Database error:', error.message);
      throw error;
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  const options = {
    saveToDatabase: !args.includes('--no-save'),
    maxPages: 50,
    maxJobs: null
  };

  // Parse --max-pages N
  const maxPagesIdx = args.indexOf('--max-pages');
  if (maxPagesIdx !== -1 && args[maxPagesIdx + 1]) {
    options.maxPages = parseInt(args[maxPagesIdx + 1], 10);
  }

  // Parse --max-jobs N
  const maxJobsIdx = args.indexOf('--max-jobs');
  if (maxJobsIdx !== -1 && args[maxJobsIdx + 1]) {
    options.maxJobs = parseInt(args[maxJobsIdx + 1], 10);
  }

  console.log('═'.repeat(60));
  console.log('  UPSTATE MEDICAL UNIVERSITY RN SCRAPER');
  console.log('═'.repeat(60) + '\n');

  const scraper = new UpstateMedicalRNScraper(options);
  const result = await scraper.scrapeRNJobs();

  console.log('\n' + '═'.repeat(60));
  console.log('  FINAL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total Found:  ${result.stats.totalFound}`);
  console.log(`  Processed:    ${result.stats.processed}`);
  console.log(`  Saved:        ${result.stats.saved}`);
  console.log(`  Updated:      ${result.stats.updated}`);
  console.log(`  Skipped:      ${result.stats.skipped}`);
  console.log(`  Errors:       ${result.stats.errors}`);
  console.log('═'.repeat(60) + '\n');

  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

module.exports = UpstateMedicalRNScraper;
