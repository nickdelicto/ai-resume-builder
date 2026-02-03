#!/usr/bin/env node
/**
 * NYC Health and Hospitals RN Job Scraper
 *
 * Platform: Oracle PeopleSoft HCM
 * URL: https://careers.nychhc.org
 *
 * NYC Health and Hospitals (formerly HHC - Health and Hospitals Corporation)
 * is the largest municipal health system in the United States.
 * All jobs are in New York City (Manhattan, Brooklyn, Queens, Bronx, Staten Island).
 *
 * Note: PeopleSoft doesn't have a REST API - we use Puppeteer DOM scraping.
 * The site limits display to first 500 jobs, but Nursing category has ~387 jobs.
 *
 * Usage:
 *   node nyc-health-hospitals-rn-scraper.js [options]
 *
 * Options:
 *   --no-save      Dry run - don't save to database
 *   --max-pages=N  Limit to N pages (default: scrape all)
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

// Configuration
const CONFIG = {
  employerName: 'NYC Health and Hospitals',
  employerSlug: 'nyc-health-hospitals',
  careerPageUrl: 'https://careers.nychhc.org/psc/hrtam/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U',
  atsPlatform: 'peoplesoft',

  // All locations are in New York
  defaultState: 'NY',

  // Borough to city mapping (for normalization)
  boroughMapping: {
    'manhattan': 'New York',
    'brooklyn': 'Brooklyn',
    'queens': 'Queens',
    'bronx': 'Bronx',
    'staten island': 'Staten Island'
  },

  // PeopleSoft selectors (discovered via test scraper)
  selectors: {
    categoryButton: '#PTSCATEGORYBTN',
    nursingCategory: 'a[aria-label*="Nursing"]',
    searchButton: 'button[id*="SEARCH"], a[id*="SEARCH"]',
    jobRows: 'tr[id*="trPTSRCHRESULTS"], [class*="result"]',
    jobTitle: '[id*="JOBTITLE"], .ps-text',
    jobId: '[id*="JOB_ID"]',
    pagination: '[id*="PAGING"], [class*="paging"]',
    nextPageButton: 'a[id*="NEXT"], button[aria-label*="Next"]'
  },

  // Delays (be respectful to the server)
  pageLoadDelay: 5000,
  betweenPagesDelay: 3000,
  betweenJobsDelay: 3000 // Increased from 1000 to avoid rate limiting
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--no-save');
const maxPagesArg = args.find(a => a.startsWith('--max-pages='));
const MAX_PAGES = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : null;
const maxJobsArg = args.find(a => a.startsWith('--max-jobs='));
const MAX_JOBS = maxJobsArg ? parseInt(maxJobsArg.split('=')[1], 10) : null;

/**
 * NYC Health and Hospitals RN Scraper Class
 */
class NYCHealthHospitalsRNScraper {
  constructor(options = {}) {
    this.config = CONFIG;
    this.employerName = CONFIG.employerName;
    this.employerSlug = CONFIG.employerSlug;
    this.careerPageUrl = CONFIG.careerPageUrl;
    this.atsPlatform = CONFIG.atsPlatform;
    this.jobs = [];
    this.saveToDatabase = options.saveToDatabase !== false;
    this.jobService = options.jobService || new JobBoardService();
    this.maxPages = options.maxPages || null;
    this.maxJobs = options.maxJobs || null; // Limit total jobs collected (for testing)
    this.skippedCount = 0; // Track jobs skipped due to existing descriptions
    this.fetchedCount = 0; // Track jobs where detail page was fetched
  }

  /**
   * Check if a job already has complete data in the database
   * Used to skip detail page fetches for jobs we already have data for
   *
   * Checks rawDescription (not description) because:
   * - LLM formatter overwrites description with formatted version
   * - Formatted descriptions can be long even with minimal source data (fabricated content)
   * - rawDescription preserves the original scraper output with markers
   *
   * Markers indicate successful detail page fetch:
   * - "Duties & Responsibilities:" - only added when duties extracted from detail page
   * - "Minimum Qualifications:" - only added when qualifications extracted from detail page
   *
   * @param {string} sourceJobId - The employer's job ID
   * @returns {Promise<object|null>} - Existing job with complete data, or null
   */
  async checkExistingCompleteData(sourceJobId) {
    if (!sourceJobId || !this.saveToDatabase) return null;

    try {
      const existingJob = await this.jobService.findExistingJob(null, sourceJobId);

      if (!existingJob || !existingJob.rawDescription) {
        return null;
      }

      const raw = existingJob.rawDescription;

      // Belt-and-suspenders: check BOTH markers AND length
      // Markers prove detail page was fetched, length ensures content was extracted
      const hasMarkers = raw.includes('Duties & Responsibilities:') ||
                        raw.includes('Minimum Qualifications:');
      const hasSubstantialContent = raw.length > 500;

      if (hasMarkers && hasSubstantialContent) {
        return existingJob;
      }

      return null;
    } catch (error) {
      // Don't fail on DB check errors - just proceed with normal fetch
      console.log(`      ⚠️ DB check error: ${error.message}`);
      return null;
    }
  }

  /**
   * Main entry point - scrape RN jobs
   */
  async scrapeRNJobs() {
    console.log('='.repeat(70));
    console.log(`🏥 ${this.employerName} RN Job Scraper`);
    console.log('='.repeat(70));
    console.log(`\nCareer URL: ${this.careerPageUrl}`);
    console.log(`Platform: ${this.atsPlatform}`);
    console.log(`Save to DB: ${this.saveToDatabase ? 'Yes' : 'No (dry run)'}`);
    if (this.maxPages) console.log(`Max pages: ${this.maxPages}`);
    if (this.maxJobs) console.log(`Max jobs: ${this.maxJobs}`);
    console.log('\nLaunching browser...\n');

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate to career page
      console.log('📄 Loading career page...');
      await page.goto(this.careerPageUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      await new Promise(resolve => setTimeout(resolve, CONFIG.pageLoadDelay));

      // Apply Nursing category filter
      console.log('🔍 Applying Nursing category filter...');
      const filterApplied = await this.applyNursingFilter(page);
      if (!filterApplied) {
        console.log('⚠️  Could not apply Nursing filter, proceeding with all jobs');
      }

      // Wait for results to load
      await new Promise(resolve => setTimeout(resolve, CONFIG.pageLoadDelay));

      // Get total job count
      const totalCount = await this.getTotalJobCount(page);
      console.log(`\n📊 Total Nursing jobs available: ${totalCount || 'Unknown'}`);

      // Collect all job listings from all pages
      const allJobs = await this.collectAllJobs(page);
      console.log(`\n📦 Collected ${allJobs.length} job listings`);

      if (allJobs.length === 0) {
        console.log('⚠️  No jobs found');
        return { success: false, error: 'No jobs found', jobs: [] };
      }

      // Skip RN filtering - all jobs from Nursing category are nursing jobs
      // LLM classifier will do better filtering (exclude NP, CRNA, etc.)
      const nursingJobs = allJobs;
      console.log(`\n✅ Processing all ${nursingJobs.length} nursing jobs (LLM classifier will filter)`);

      // Process and normalize each job
      console.log(`\n🔄 Processing ${nursingJobs.length} jobs...\n`);
      const processedJobs = [];
      let errorCount = 0;

      // Find max DOM index to know how much we need to scroll after reloads
      const maxDomIndex = Math.max(...nursingJobs.map(j => j.domIndex || 0));
      console.log(`   Max DOM index to process: ${maxDomIndex}`);

      for (let i = 0; i < nursingJobs.length; i++) {
        const job = nursingJobs[i];
        console.log(`[${i + 1}/${nursingJobs.length}] ${job.title} (DOM index: ${job.domIndex})`);

        try {
          // Use job.domIndex (original DOM position) not i (filtered array index)
          // Pass maxDomIndex so we know how much to scroll after reloads
          const normalizedJob = await this.processJob(page, job, job.domIndex, maxDomIndex);
          const validation = validateJobData(normalizedJob);

          if (validation.valid) {
            processedJobs.push(normalizedJob);
            console.log(`   ✅ Valid`);
          } else {
            errorCount++;
            console.log(`   ⚠️  Invalid: ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          errorCount++;
          console.log(`   ❌ Error: ${error.message}`);
        }

        // Delay between jobs
        if (i < nursingJobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.betweenJobsDelay));
        }
      }

      this.jobs = processedJobs;

      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('📊 SCRAPING COMPLETE');
      console.log('='.repeat(70));
      console.log(`   Total listings: ${allJobs.length}`);
      console.log(`   Nursing jobs: ${nursingJobs.length}`);
      console.log(`   Successfully processed: ${processedJobs.length}`);
      console.log(`   Detail pages fetched: ${this.fetchedCount}`);
      console.log(`   Skipped (has rawDescription): ${this.skippedCount}`);
      console.log(`   Errors: ${errorCount}`);

      // Save to database
      let saveResults = null;
      if (this.saveToDatabase && processedJobs.length > 0) {
        console.log('\n💾 Saving to database...');
        try {
          saveResults = await this.jobService.saveJobs(processedJobs, {
            employerName: this.employerName,
            employerSlug: this.employerSlug,
            careerPageUrl: this.careerPageUrl,
            atsPlatform: this.atsPlatform
          });
          console.log('✅ Save complete');
        } catch (error) {
          console.error(`❌ Save error: ${error.message}`);
          saveResults = { error: error.message };
        }
      }

      return {
        success: true,
        totalJobs: allJobs.length,
        nursingJobs: nursingJobs.length,
        validatedJobs: processedJobs.length,
        jobs: processedJobs,
        saveResults
      };

    } catch (error) {
      console.error('\n❌ Scraper error:', error.message);
      return { success: false, error: error.message, jobs: [] };
    } finally {
      await browser.close();
      if (this.jobService) {
        await this.jobService.disconnect();
      }
      console.log('\n✅ Browser closed');
    }
  }

  /**
   * Apply Category Name filter for Nursing
   * The sidebar has "Category Name" section with "Nursing (387)" checkbox
   */
  async applyNursingFilter(page) {
    try {
      // Look for "Nursing (387)" or similar in the Category Name section
      // The checkbox label contains "Nursing" followed by a count in parentheses

      console.log('   Looking for Category Name > Nursing filter...');

      // Method 1: Find and click the Nursing checkbox/label in Category Name section
      const clicked = await page.evaluate(() => {
        // Find all elements that could be the Nursing filter
        const allElements = Array.from(document.querySelectorAll('*'));

        for (const el of allElements) {
          const text = (el.textContent || '').trim();

          // Look specifically for "Nursing (XXX)" pattern - exact match to avoid partial matches
          // This should be the Category Name filter, not Job Family items
          if (/^Nursing\s*\(\d+\)$/.test(text)) {
            // Found it! Now find the clickable element (checkbox or label)
            const checkbox = el.querySelector('input[type="checkbox"]') ||
                           el.closest('label')?.querySelector('input[type="checkbox"]');

            if (checkbox && !checkbox.checked) {
              checkbox.click();
              return { clicked: true, text: text, method: 'checkbox' };
            }

            // Try clicking the element itself (might be a link or clickable span)
            if (el.click) {
              el.click();
              return { clicked: true, text: text, method: 'element' };
            }
          }
        }

        // Alternative: Look for checkbox labels containing just "Nursing"
        const labels = Array.from(document.querySelectorAll('label, span, a'));
        for (const label of labels) {
          const text = (label.textContent || '').trim();
          if (/^Nursing\s*\(\d+\)$/.test(text)) {
            // Click the label or its checkbox
            const checkbox = label.querySelector('input[type="checkbox"]') ||
                           document.querySelector(`input[id="${label.getAttribute('for')}"]`);
            if (checkbox && !checkbox.checked) {
              checkbox.click();
              return { clicked: true, text: text, method: 'label-checkbox' };
            }
            label.click();
            return { clicked: true, text: text, method: 'label' };
          }
        }

        // Last resort: Find any element with "Nursing" and a count that's near Category Name
        const categorySection = Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent?.includes('Category Name')
        );

        if (categorySection) {
          const nursingInCategory = Array.from(categorySection.querySelectorAll('*')).find(el => {
            const t = (el.textContent || '').trim();
            return /^Nursing\s*\(\d+\)$/.test(t);
          });

          if (nursingInCategory) {
            nursingInCategory.click();
            return { clicked: true, text: nursingInCategory.textContent.trim(), method: 'category-section' };
          }
        }

        return { clicked: false };
      });

      if (clicked.clicked) {
        console.log(`   ✅ Clicked: "${clicked.text}" (method: ${clicked.method})`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.pageLoadDelay));
        return true;
      }

      // Method 2: Try using Puppeteer's click with XPath for more precise targeting
      console.log('   Trying XPath selector...');

      try {
        // Find element containing exactly "Nursing (XXX)"
        const nursingElements = await page.$$('xpath/.//span[contains(text(), "Nursing (")]');

        for (const el of nursingElements) {
          const text = await el.evaluate(e => e.textContent.trim());
          if (/^Nursing\s*\(\d+\)$/.test(text)) {
            await el.click();
            console.log(`   ✅ Clicked via XPath: "${text}"`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.pageLoadDelay));
            return true;
          }
        }
      } catch (xpathError) {
        console.log(`   XPath method failed: ${xpathError.message}`);
      }

      // Method 3: Screenshot for debugging and try CSS selector
      console.log('   Trying CSS selectors for checkboxes...');

      const checkboxClicked = await page.evaluate(() => {
        // Find all checkboxes and check if their labels mention Nursing
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));

        for (const cb of checkboxes) {
          const label = cb.closest('label') ||
                       document.querySelector(`label[for="${cb.id}"]`) ||
                       cb.parentElement;

          if (label) {
            const labelText = label.textContent || '';
            if (/Nursing\s*\(\d+\)/i.test(labelText) && !labelText.includes('Director')) {
              if (!cb.checked) {
                cb.click();
                return { clicked: true, text: labelText.trim() };
              }
            }
          }
        }

        return { clicked: false };
      });

      if (checkboxClicked.clicked) {
        console.log(`   ✅ Clicked checkbox: "${checkboxClicked.text}"`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.pageLoadDelay));
        return true;
      }

      console.log('   ⚠️  Could not find Nursing filter');
      return false;
    } catch (error) {
      console.log(`   Filter error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get total job count from page
   */
  async getTotalJobCount(page) {
    try {
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/(\d+)\s+jobs?\s+found/i);
      return match ? parseInt(match[1], 10) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Collect all jobs using infinite scroll
   * PeopleSoft loads ~50 jobs at a time as you scroll down
   */
  async collectAllJobs(page) {
    console.log('\n📚 Collecting jobs via infinite scroll...');

    const allJobs = [];
    const seenJobIds = new Set();
    let scrollAttempts = 0;
    // Increase max attempts - 391 jobs / 50 per scroll = ~8 scrolls needed, add buffer
    const maxScrollAttempts = this.maxPages ? this.maxPages * 2 : 15;
    let consecutiveNoNewJobs = 0;
    const maxConsecutiveEmpty = 4; // Increased from 3 - PeopleSoft can be slow

    while (scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      console.log(`\n📜 Scroll ${scrollAttempts}/${maxScrollAttempts}...`);

      // Extract all jobs currently visible on the page
      const pageJobs = await this.extractJobsFromPage(page);
      console.log(`   Found ${pageJobs.length} total jobs on page`);

      // Filter for new unique jobs we haven't seen yet
      const newJobs = pageJobs.filter(job => {
        if (job.jobId && !seenJobIds.has(job.jobId)) {
          seenJobIds.add(job.jobId);
          return true;
        }
        return false;
      });

      if (newJobs.length === 0) {
        consecutiveNoNewJobs++;
        console.log(`   ⚠️  No new jobs found (attempt ${consecutiveNoNewJobs}/${maxConsecutiveEmpty})`);

        if (consecutiveNoNewJobs >= maxConsecutiveEmpty) {
          console.log('   ✅ Reached end of results (no more new jobs after scrolling)');
          break;
        }

        // Extra wait on empty scroll - give PeopleSoft more time
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        consecutiveNoNewJobs = 0;
        allJobs.push(...newJobs);
        console.log(`   ✅ Added ${newJobs.length} new jobs (Total: ${allJobs.length})`);

        // Check if we've hit the max jobs limit
        if (this.maxJobs && allJobs.length >= this.maxJobs) {
          console.log(`   ✅ Reached max jobs limit (${this.maxJobs})`);
          return allJobs.slice(0, this.maxJobs);
        }
      }

      // Scroll down to trigger loading more jobs
      const scrolled = await this.scrollToLoadMore(page);
      if (!scrolled) {
        // Scroll failed but don't give up - PeopleSoft can be flaky
        // The consecutiveNoNewJobs logic will determine when to truly stop
        console.log(`   ⚠️  Scroll returned false, but continuing (will stop after ${maxConsecutiveEmpty} empty attempts)`);
        // Extra wait when scroll fails - give PeopleSoft time to recover
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // Wait for new content to load
        await new Promise(resolve => setTimeout(resolve, CONFIG.betweenPagesDelay));
      }
    }

    // Final summary
    console.log(`\n   📊 Scroll summary: ${scrollAttempts} scrolls, ${allJobs.length} unique jobs collected`);

    return allJobs;
  }

  /**
   * Scroll down to load more jobs (infinite scroll)
   * PeopleSoft uses a specific container for results: win0divHRS_AGNT_RSLT_I$grid$0
   *
   * NOTE: PeopleSoft's infinite scroll can be finicky - the container's scrollHeight
   * may not update until AFTER content loads via AJAX. We use multiple strategies
   * and always attempt to scroll, then check if new content appeared.
   */
  async scrollToLoadMore(page) {
    try {
      // Count jobs before scrolling
      const beforeCount = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.split(/\bSelect\b/).length - 1;
      });

      // Get container info for debugging
      const containerInfo = await page.evaluate(() => {
        const container = document.getElementById('win0divHRS_AGNT_RSLT_I$grid$0');
        if (container) {
          return {
            found: true,
            id: container.id,
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            maxScroll: container.scrollHeight - container.clientHeight
          };
        }
        return { found: false };
      });

      if (containerInfo.found) {
        console.log(`   📐 Container: scrollTop=${containerInfo.scrollTop}, scrollHeight=${containerInfo.scrollHeight}, clientHeight=${containerInfo.clientHeight}`);
      }

      // Strategy 1: Focus on the container and scroll via mouse wheel
      // Mouse wheel events are more likely to trigger PeopleSoft's infinite scroll listener
      await page.evaluate(() => {
        const container = document.getElementById('win0divHRS_AGNT_RSLT_I$grid$0');
        if (container) {
          container.focus();
          // Dispatch wheel event to trigger scroll listeners
          container.dispatchEvent(new WheelEvent('wheel', {
            deltaY: 1000,
            bubbles: true
          }));
        }
      });

      // Use Puppeteer's mouse wheel for more realistic scrolling
      await page.mouse.wheel({ deltaY: 2000 });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Strategy 2: Scroll the container programmatically in chunks
      // Some infinite scroll implementations need incremental scrolls
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const container = document.getElementById('win0divHRS_AGNT_RSLT_I$grid$0');
          if (container) {
            container.scrollTop += 500; // Scroll in chunks
          }
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Strategy 3: Scroll to actual bottom
      await page.evaluate(() => {
        const container = document.getElementById('win0divHRS_AGNT_RSLT_I$grid$0');
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Strategy 4: Simulate keyboard End key and Page Down
      await page.keyboard.press('End');
      await new Promise(resolve => setTimeout(resolve, 200));
      await page.keyboard.press('PageDown');

      // Strategy 5: Scroll the last job row into view - this can trigger "load more"
      await page.evaluate(() => {
        // Find all job detail buttons and scroll the last one into view
        const detailButtons = document.querySelectorAll('[id^="HRS_VIEW_DETAILSPB"]');
        if (detailButtons.length > 0) {
          const lastButton = detailButtons[detailButtons.length - 1];
          lastButton.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      });

      // Wait for AJAX content to load - PeopleSoft can be slow
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Count jobs after scrolling
      const afterCount = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.split(/\bSelect\b/).length - 1;
      });

      // Get updated container info
      const afterContainerInfo = await page.evaluate(() => {
        const container = document.getElementById('win0divHRS_AGNT_RSLT_I$grid$0');
        if (container) {
          return {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight
          };
        }
        return null;
      });

      // Check if new jobs appeared (primary success indicator)
      if (afterCount > beforeCount) {
        console.log(`   📜 Scrolled: ${beforeCount} → ${afterCount} jobs (+${afterCount - beforeCount})`);
        return true;
      }

      // Check if container expanded (content might still be rendering)
      if (afterContainerInfo && containerInfo.found) {
        if (afterContainerInfo.scrollHeight > containerInfo.scrollHeight) {
          console.log(`   📜 Container expanded: ${containerInfo.scrollHeight} → ${afterContainerInfo.scrollHeight}px, waiting for content...`);
          return true;
        }

        // Check if we're truly at the bottom (scrollHeight hasn't changed and we're at max scroll)
        const atBottom = afterContainerInfo.scrollTop >= (afterContainerInfo.scrollHeight - afterContainerInfo.clientHeight - 20);
        if (atBottom && afterContainerInfo.scrollHeight === containerInfo.scrollHeight) {
          console.log(`   ⚠️  At bottom of container (scrollHeight stable at ${afterContainerInfo.scrollHeight}px)`);
          return false;
        }
      }

      // If we got here but scroll position changed, give it another chance
      if (afterContainerInfo && afterContainerInfo.scrollTop > containerInfo.scrollTop) {
        console.log(`   📜 Scroll position changed, content may still load...`);
        return true;
      }

      console.log(`   ⚠️  No new content after scroll (jobs: ${beforeCount} → ${afterCount})`);
      return false;
    } catch (error) {
      console.log(`   Scroll error: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract jobs from current page
   * PeopleSoft displays jobs in a grid/list format with text like:
   * "Select | Title | Job ID123456 | LocationBrooklyn | DepartmentXXX | ..."
   */
  async extractJobsFromPage(page) {
    return await page.evaluate(() => {
      const jobs = [];

      // Get all text content and parse job blocks
      // PeopleSoft jobs appear as text blocks with pattern:
      // Title name
      // Job ID######
      // Location{Borough}
      // Department{NAME}
      // Business Unit{HOSPITAL}
      // Posted DateMM/DD/YYYY

      const bodyText = document.body.innerText;

      // Split by "Select" which appears before each job
      const jobBlocks = bodyText.split(/\bSelect\b/).slice(1); // Skip first empty split

      for (let domIndex = 0; domIndex < jobBlocks.length; domIndex++) {
        const block = jobBlocks[domIndex];
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length < 3) continue;

        // First meaningful line after "Select" is usually the job title
        let title = null;
        let jobId = null;
        let location = null;
        let department = null;
        let businessUnit = null;
        let postedDate = null;

        for (let i = 0; i < lines.length && i < 15; i++) {
          const line = lines[i];

          // Extract Job ID (6 digits, often prefixed with "Job ID")
          const jobIdMatch = line.match(/Job\s*ID\s*(\d{6})/i) || line.match(/^(\d{6})$/);
          if (jobIdMatch && !jobId) {
            jobId = jobIdMatch[1];
            continue;
          }

          // Extract Location (borough)
          const locationMatch = line.match(/Location\s*(Manhattan|Brooklyn|Queens|Bronx|Staten Island)/i) ||
                               line.match(/^(Manhattan|Brooklyn|Queens|Bronx|Staten Island)$/i);
          if (locationMatch && !location) {
            location = locationMatch[1];
            continue;
          }

          // Extract Department
          const deptMatch = line.match(/Department\s*([A-Z\s\/\-]+)/i);
          if (deptMatch && !department) {
            department = deptMatch[1].trim();
            continue;
          }

          // Extract Business Unit (hospital name)
          const buMatch = line.match(/Business\s*Unit\s*([A-Z\s]+)/i);
          if (buMatch && !businessUnit) {
            businessUnit = buMatch[1].trim();
            continue;
          }

          // Extract Posted Date
          const dateMatch = line.match(/Posted\s*Date\s*(\d{2}\/\d{2}\/\d{4})/i);
          if (dateMatch && !postedDate) {
            postedDate = dateMatch[1];
            continue;
          }

          // Title is usually the first line that looks like a job title
          // (not a keyword like "Job ID", "Location", etc.)
          if (!title && i < 3 && line.length > 5 && line.length < 100) {
            if (!line.match(/^(Job ID|Location|Department|Business Unit|Posted|Close|Select|Title)/i)) {
              title = line;
            }
          }
        }

        if (title && jobId) {
          jobs.push({
            jobId,
            title,
            domIndex, // Store the DOM index for clicking later
            link: null, // Will construct URL from jobId
            location,
            department,
            businessUnit,
            postedDate,
            rawText: block.substring(0, 500)
          });
        }
      }

      // Alternative: Look for links to job details
      if (jobs.length === 0) {
        // Find all links that might be job titles
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const href = link.href || '';
          const text = link.textContent.trim();

          // Job detail links often contain job-related URL patterns
          if (href.includes('HRS_CE') || href.includes('jobdetail') || href.includes('JOB_OPENING')) {
            const jobIdMatch = href.match(/(\d{6})/);
            if (text && text.length > 5 && text.length < 100) {
              jobs.push({
                jobId: jobIdMatch ? jobIdMatch[1] : null,
                title: text,
                link: href,
                location: null,
                department: null,
                businessUnit: null,
                postedDate: null,
                rawText: ''
              });
            }
          }
        }
      }

      return jobs;
    });
  }

  /**
   * Navigate to next page
   * PeopleSoft uses various pagination controls - we try multiple methods
   */
  async goToNextPage(page) {
    try {
      // Method 1: Use page.evaluate for more flexible element finding
      const clicked = await page.evaluate(() => {
        // Look for various "Next" patterns in PeopleSoft
        const patterns = [
          // Next button/link patterns
          { selector: 'a', text: /^Next$/i },
          { selector: 'a', text: /Next\s*Page/i },
          { selector: 'a', text: /^>$/i },
          { selector: 'a', text: /^>>$/i },
          { selector: 'button', text: /^Next$/i },
          { selector: 'span', text: /^Next$/i },
          // PeopleSoft specific patterns
          { selector: '[id*="NEXT"]', any: true },
          { selector: '[id*="next"]', any: true },
          { selector: '[aria-label*="Next"]', any: true },
          { selector: '[title*="Next"]', any: true },
          { selector: 'a[class*="next"]', any: true },
        ];

        for (const pattern of patterns) {
          let elements;
          if (pattern.any) {
            elements = Array.from(document.querySelectorAll(pattern.selector));
          } else {
            elements = Array.from(document.querySelectorAll(pattern.selector))
              .filter(el => pattern.text.test(el.textContent.trim()));
          }

          for (const el of elements) {
            // Check if disabled
            const isDisabled = el.disabled ||
                             el.classList.contains('disabled') ||
                             el.getAttribute('aria-disabled') === 'true' ||
                             el.style.display === 'none' ||
                             el.style.visibility === 'hidden';

            if (!isDisabled && el.offsetParent !== null) { // Element is visible
              el.click();
              return { clicked: true, text: el.textContent.trim(), selector: pattern.selector };
            }
          }
        }

        return { clicked: false };
      });

      if (clicked.clicked) {
        console.log(`   📄 Navigated to next page (clicked: "${clicked.text}")`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.pageLoadDelay));
        return true;
      }

      // Method 2: Look for numbered pagination and click next number
      const currentPage = this.currentPageNumber || 1;
      const nextPageNumber = currentPage + 1;

      const pageClicked = await page.evaluate((nextNum) => {
        // Find page number links
        const links = Array.from(document.querySelectorAll('a, button, span'));
        for (const el of links) {
          const text = el.textContent.trim();
          if (text === String(nextNum)) {
            // Make sure it's a pagination element (small text, numeric)
            if (el.offsetParent !== null) {
              el.click();
              return { clicked: true, page: nextNum };
            }
          }
        }
        return { clicked: false };
      }, nextPageNumber);

      if (pageClicked.clicked) {
        this.currentPageNumber = nextPageNumber;
        console.log(`   📄 Navigated to page ${nextPageNumber}`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.pageLoadDelay));
        return true;
      }

      // Method 3: Scroll down to load more (infinite scroll)
      const scrolledMore = await page.evaluate(() => {
        const oldHeight = document.body.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
        return { scrolled: true, oldHeight };
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight > scrolledMore.oldHeight) {
        console.log('   📄 Scrolled for more content');
        return true;
      }

      return false;
    } catch (error) {
      console.log(`   Pagination error: ${error.message}`);
      return false;
    }
  }

  /**
   * Fetch full job details by clicking on the job in search results
   * PeopleSoft requires session state - can't navigate directly to detail URLs
   * Uses submitAction_win0(document.win0,'HRS_VIEW_DETAILSPB$N') to view details
   * @param {object} page - Puppeteer page
   * @param {object} job - Job data from listing
   * @param {number} jobIndex - DOM index for clicking this job
   * @param {number} maxDomIndex - Maximum DOM index we need to access (for scroll calculation)
   */
  async fetchJobDetails(page, job, jobIndex, maxDomIndex = 0) {
    try {
      console.log(`      Finding job ${job.jobId} to view details...`);

      // Find and click the job by its jobId (not by index, which can get stale after back navigation)
      // PeopleSoft displays jobId in the job listing rows
      const clicked = await page.evaluate((targetJobId, fallbackIdx) => {
        // Method 1: Find the job row containing this jobId and click its detail button
        const bodyText = document.body.innerText;
        const jobBlocks = bodyText.split(/\bSelect\b/).slice(1);

        // Find which index has our target jobId
        let foundIndex = -1;
        for (let i = 0; i < jobBlocks.length; i++) {
          if (jobBlocks[i].includes(targetJobId)) {
            foundIndex = i;
            break;
          }
        }

        // Use found index or fall back to provided index
        const idx = foundIndex >= 0 ? foundIndex : fallbackIdx;

        // Try to find and click the detail link for this job
        // PeopleSoft uses submitAction_win0 for navigation
        if (typeof submitAction_win0 === 'function') {
          try {
            submitAction_win0(document.win0, `HRS_VIEW_DETAILSPB$${idx}`);
            return { success: true, method: 'submitAction', foundByJobId: foundIndex >= 0, usedIndex: idx };
          } catch (e) {
            // Try alternative approach
          }
        }

        // Alternative: Find the link/button by index
        const detailLinks = document.querySelectorAll('[id^="HRS_VIEW_DETAILSPB"]');
        if (detailLinks[idx]) {
          detailLinks[idx].click();
          return { success: true, method: 'direct-click', foundByJobId: foundIndex >= 0, usedIndex: idx };
        }

        // Try clicking on job title links
        const jobTitles = document.querySelectorAll('a[id*="JOBTITLE"], a[id*="POSTINGTITLE"]');
        if (jobTitles[idx]) {
          jobTitles[idx].click();
          return { success: true, method: 'title-click', foundByJobId: foundIndex >= 0, usedIndex: idx };
        }

        return { success: false, foundByJobId: foundIndex >= 0 };
      }, job.jobId, jobIndex);

      if (!clicked.success) {
        console.log(`      ⚠️  Could not click job detail button`);
        return null;
      }

      console.log(`      ✓ Clicked via ${clicked.method} (index: ${clicked.usedIndex}, found by jobId: ${clicked.foundByJobId})`);

      // Wait for detail page to load (give PeopleSoft time to render)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify we're on detail page (not still on search results) - retry if needed
      let pageLoaded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const pageState = await page.evaluate(() => {
          const text = document.body.innerText;
          // Check if we're still on search results page
          const isSearchPage = text.includes('Search Jobs') && text.includes('jobs found') && text.includes('Apply for Job');
          // Check for key sections that indicate detail page loaded
          const hasDetailContent = (text.includes('Duties') || text.includes('Responsibilities')) &&
                 (text.includes('Qualifications') || text.includes('Requirements') || text.includes('Minimum'));
          return { isSearchPage, hasDetailContent };
        });

        if (pageState.hasDetailContent && !pageState.isSearchPage) {
          pageLoaded = true;
          break;
        }

        console.log(`      ⚠️  Detail page may not have fully loaded (attempt ${attempt + 1}/3), waiting...`);
        // If still on search page, try clicking again
        if (pageState.isSearchPage && attempt < 2) {
          console.log(`      🔄 Still on search page, retrying click...`);
          await page.evaluate((idx) => {
            const btn = document.querySelector(`#HRS_VIEW_DETAILSPB\\$${idx}`);
            if (btn) btn.click();
          }, jobIndex);
        }
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      if (!pageLoaded) {
        console.log(`      ⚠️  Detail page failed to load after retries - returning null`);
        return null;
      }

      // Extract all job details from the PeopleSoft detail page
      // Based on actual page structure: Department, Location, Job ID, Salary Range, Pay Frequency,
      // Full/Part Time, Regular Shift, Work Shifts, Duties & Responsibilities, etc.
      const details = await page.evaluate(() => {
        const result = {
          salary: null,
          salaryMin: null,
          salaryMax: null,
          salaryType: null,
          fullTimePartTime: null,
          shift: null,
          regularShift: null,
          workShifts: null,
          workShiftsSection: null, // Full Work Shifts section (hours, on-call, weekends)
          departmentPreferences: null, // Additional requirements from employer
          department: null,
          location: null,
          facility: null,
          description: null,
          duties: null,
          requirements: null,
          qualifications: null,
          benefits: null,
          additionalCompensation: null
        };

        const bodyText = document.body.innerText;

        // Extract Salary Range (format: "$109,490.00 - $109,490.00" or "Salary Range $X - $Y")
        const salaryPatterns = [
          /Salary\s*Range\s*\$?([\d,]+(?:\.\d{2})?)\s*-\s*\$?([\d,]+(?:\.\d{2})?)/i,
          /Hire\s*In\s*Rate\s*\$?([\d,]+(?:\.\d{2})?)/i,
          /\$?([\d,]+(?:\.\d{2})?)\s*-\s*\$?([\d,]+(?:\.\d{2})?)/
        ];

        for (const pattern of salaryPatterns) {
          const match = bodyText.match(pattern);
          if (match && match[1]) {
            const val1 = parseFloat(match[1].replace(/,/g, ''));
            // Only accept if it looks like a salary (> $10,000 annual or > $10 hourly)
            if (val1 > 10) {
              result.salaryMin = val1;
              result.salaryMax = match[2] ? parseFloat(match[2].replace(/,/g, '')) : val1;
              result.salary = match[0];
              break;
            }
          }
        }

        // Extract Pay Frequency to determine salary type
        const payFreqMatch = bodyText.match(/Pay\s*Frequency\s*(Year|Hour|Annual|Hourly|Bi-?Weekly|Weekly)/i);
        if (payFreqMatch) {
          const freq = payFreqMatch[1].toLowerCase();
          if (freq.includes('hour')) {
            result.salaryType = 'hourly';
          } else {
            result.salaryType = 'annual';
          }
        } else if (result.salaryMin) {
          // Infer from value: if > 500, likely annual
          result.salaryType = result.salaryMin > 500 ? 'annual' : 'hourly';
        }

        // Extract Full/Part Time
        const ftptMatch = bodyText.match(/Full[\/\s]?Part\s*Time\s*(Full-?Time|Part-?Time|Per\s*Diem)/i);
        if (ftptMatch) {
          result.fullTimePartTime = ftptMatch[1];
        }

        // Extract Regular Shift (Day, Night, Evening, Rotating)
        const regularShiftMatch = bodyText.match(/Regular\s*Shift\s*(Day|Night|Evening|Rotating|Variable)/i);
        if (regularShiftMatch) {
          result.regularShift = regularShiftMatch[1];
        }

        // Extract Work Shifts (specific times like "7:00 P.M – 7:30 A.M")
        const workShiftsMatch = bodyText.match(/Work\s*Shifts?\s*([\d:]+\s*[AP]\.?M\.?\s*[–-]\s*[\d:]+\s*[AP]\.?M\.?)/i);
        if (workShiftsMatch) {
          result.workShifts = workShiftsMatch[1];
        }

        // Extract full Work Shifts section (includes hours per week, on-call, weekend requirements)
        // Example: "Work Shifts 7:00 A.M – 7:30 P.M 37.5 Hours w/ on-call duties: 10:00 P.M – 6:00 A.M Alternating weekends"
        const workShiftsSectionMatch = bodyText.match(/Work\s*Shifts?\s*([\s\S]*?)(?=Duties|About\s*NYC|Minimum\s*Qualifications|$)/i);
        if (workShiftsSectionMatch && workShiftsSectionMatch[1].trim().length > 5) {
          // Clean up and limit the section (stop at next major section or newline patterns)
          let shiftSection = workShiftsSectionMatch[1].trim();
          // Take first 300 chars or up to first major break (double newline or section header)
          const breakPoint = shiftSection.search(/\n\s*\n|Duties|About|Minimum/i);
          if (breakPoint > 0 && breakPoint < 300) {
            shiftSection = shiftSection.substring(0, breakPoint).trim();
          } else if (shiftSection.length > 300) {
            shiftSection = shiftSection.substring(0, 300).trim();
          }
          result.workShiftsSection = shiftSection;
        }

        // Extract Department Preferences (additional requirements beyond minimum qualifications)
        // Example: "Department Preferences 2 years experience in Emergency Services ACLS certification required"
        const deptPrefsMatch = bodyText.match(/Department\s*Preferences?\s*([\s\S]*?)(?=How\s*To\s*Apply|Benefits|Additional\s*Salary|About|$)/i);
        if (deptPrefsMatch && deptPrefsMatch[1].trim().length > 10) {
          let prefs = deptPrefsMatch[1].trim();
          // Limit to 500 chars
          if (prefs.length > 500) {
            prefs = prefs.substring(0, 500).trim();
          }
          result.departmentPreferences = prefs;
        }

        // Combine shift info
        if (result.regularShift) {
          result.shift = result.regularShift;
          if (result.workShifts) {
            result.shift += ' (' + result.workShifts + ')';
          }
        } else if (result.workShifts) {
          result.shift = result.workShifts;
        }

        // Extract Department
        const deptMatch = bodyText.match(/Department\s+([A-Z][A-Z0-9\s\/\-]+?)(?=\s*(?:Location|Hire|Salary|Job ID|Civil|$))/i);
        if (deptMatch) {
          result.department = deptMatch[1].trim();
        }

        // Extract Location (borough)
        const locMatch = bodyText.match(/Location\s+(Manhattan|Brooklyn|Queens|Bronx|Staten Island)/i);
        if (locMatch) {
          result.location = locMatch[1];
        }

        // =====================================================================
        // DOM-BASED EXTRACTION WITH CONTENT DETECTION
        // PeopleSoft uses dynamic indices for HRS_SCH_PSTDSC_DESCRLONG$N elements
        // Index shifts if a section is missing, so we detect by content patterns
        // =====================================================================

        // Collect all description long elements and classify by content
        const descElements = document.querySelectorAll('[id^="HRS_SCH_PSTDSC_DESCRLONG"]');
        const sections = {
          duties: '',
          qualifications: '',
          deptPreferences: '',
          benefits: '',
          additionalCompensation: '',
          workShifts: '',
          about: ''
        };

        descElements.forEach((el) => {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length < 30) return; // Skip empty/short elements

          // Classify by content patterns (order matters - most specific first)

          // Helper: Check if text contains qualifications-like content (licenses, certs, experience requirements)
          const isQualificationsContent = /valid.*(?:license|registration)|current.*(?:license|registration)|certification.*(?:BLS|ACLS|required)|holds.*(?:obtains|certification)|years?\s*(?:of\s*)?experience\s*as\s*a|ability\s*to\s*travel|demonstrated\s*commitment/i.test(text);

          // 1. Qualifications - licenses and education requirements
          // Also catch numbered lists that contain qualifications content
          if (
            (/licensed.*registered.*nurse|bachelor.*degree.*nursing|minimum.*qualifications|education.*required|years.*experience.*nursing|RN\s*license|currently\s*registered\s*to\s*practice/i.test(text) && !/purpose\s*of\s*position/i.test(text)) ||
            (text.match(/^\d+\.\s+/m) && isQualificationsContent && !/purpose\s*of\s*position|examples\s*of\s*typical\s*tasks/i.test(text))
          ) {
            sections.qualifications = text;
          }
          // 2. Department Preferences - additional requirements beyond qualifications
          else if ((/department\s*preferences?|experience\s*in\s*long\s*term\s*care|preferred\s*qualifications/i.test(text) || /^(?:five|six|three|two|one|\d+)\s*(?:to\s*(?:five|six|three|two|one|\d+)\s*)?years?\s*(?:of\s*)?.*experience/i.test(text)) && text.length < 500) {
            sections.deptPreferences = text;
          }
          // 3. Duties - "Purpose of Position", "Essential Functions", or numbered tasks
          // BUT exclude numbered lists that contain qualifications content
          else if (
            /purpose\s*of\s*position|examples\s*of\s*typical\s*tasks|essential\s*functions|under\s*(?:the\s*)?(?:general\s*)?(?:direction|supervision)/i.test(text) ||
            (text.match(/^\d+\.\s+/m) && !isQualificationsContent)
          ) {
            sections.duties = text;
          }
          // 4. Benefits - actual benefits package info
          else if (/benefits\s*package|retirement|health\s*benefits|vacation|paid\s*time|dental|vision|pension|401k|competitive\s*benefits/i.test(text)) {
            sections.benefits = text;
          }
          // 5. Additional Compensation - differentials
          else if (/differential|additional.*compensation|education.*differential|salary.*addition|BSN.*differential/i.test(text)) {
            sections.additionalCompensation = text;
          }
          // 6. Work Shifts - time patterns
          else if (/\d+:\d+\s*[AP]\.?M|work\s*shifts?|hours\s*per\s*week|on-call|rotating\s*weekends|alternating\s*weekends/i.test(text)) {
            sections.workShifts = text;
          }
          // 7. About section - employer info
          else if (/about\s*nyc|nyc\s*health.*hospitals|public\s*hospital\s*system|at\s*nyc\s*health|rich\s*legacy|teaching\s*hospital/i.test(text)) {
            sections.about = text;
          }
          // Skip "How to Apply" sections
        });

        // Also try to extract structured fields via direct DOM queries
        const structuredFields = {
          department: document.querySelector('#HRS_DEPT_I_DESCR')?.innerText?.trim(),
          location: document.querySelector('#HRS_SCH_WRK_HRS_DESCRLONG')?.innerText?.trim(),
          salaryMin: document.querySelector('#HHC_HRS_JO_WRK_HRS_JO_MIN_RT')?.innerText?.trim(),
          salaryMax: document.querySelector('#HHC_HRS_JO_WRK_HRS_JO_MAX_RT')?.innerText?.trim(),
          salaryFreq: document.querySelector('#HHC_HRS_JO_WRK_HRS_JO_SAL_FREQ')?.innerText?.trim()
        };

        // Use DOM-extracted sections if available, otherwise fall back to regex
        if (sections.duties && sections.duties.length > 100) {
          result.duties = sections.duties.substring(0, 5000);
        } else {
          // Fallback: regex on bodyText
          const dutiesMatch = bodyText.match(/Duties\s*(?:&|and)?\s*Responsibilities\s*([\s\S]*?)(?=Minimum\s*Qualifications|Requirements|Knowledge|Skills|Education|How\s*To\s*Apply|$)/i);
          if (dutiesMatch && dutiesMatch[1].trim().length > 50) {
            result.duties = dutiesMatch[1].trim().substring(0, 5000);
          }
        }

        // Qualifications - prefer DOM extraction
        if (sections.qualifications && sections.qualifications.length > 30) {
          result.qualifications = sections.qualifications.substring(0, 3000);
        } else {
          const qualMatch = bodyText.match(/Minimum\s*Qualifications\s*([\s\S]*?)(?=Additional\s*Salary|How\s*To\s*Apply|Benefits|About|Department|$)/i);
          if (qualMatch && qualMatch[1].trim().length > 30) {
            result.qualifications = qualMatch[1].trim().substring(0, 3000);
          }
        }

        // Benefits - prefer DOM extraction
        if (sections.benefits && sections.benefits.length > 30) {
          result.benefits = sections.benefits.substring(0, 2000);
        } else {
          const benefitsMatch = bodyText.match(/Benefits\s*([\s\S]*?)(?=How\s*To\s*Apply|$)/i);
          if (benefitsMatch && benefitsMatch[1].trim().length > 30) {
            result.benefits = benefitsMatch[1].trim().substring(0, 2000);
          }
        }

        // Additional Compensation - prefer DOM extraction
        if (sections.additionalCompensation && sections.additionalCompensation.length > 30) {
          result.additionalCompensation = sections.additionalCompensation.substring(0, 1500);
        } else {
          const addlSalaryMatch = bodyText.match(/Additional\s*Salary\s*Compensation\s*([\s\S]*?)(?=Benefits|How\s*To\s*Apply|$)/i);
          if (addlSalaryMatch && addlSalaryMatch[1].trim().length > 30) {
            result.additionalCompensation = addlSalaryMatch[1].trim().substring(0, 1500);
          }
        }

        // Use structured salary fields if available
        if (structuredFields.salaryMin && !result.salaryMin) {
          result.salaryMin = structuredFields.salaryMin;
        }
        if (structuredFields.salaryMax && !result.salaryMax) {
          result.salaryMax = structuredFields.salaryMax;
        }
        if (structuredFields.department && !result.department) {
          result.department = structuredFields.department;
        }

        // Extract About section (employer info) - contains facility name
        const aboutMatch = bodyText.match(/About\s*NYC\s*Health\s*\+?\s*Hospitals\s*([\s\S]*?)(?=Work\s*Shifts|Duties|At\s*NYC\s*Health|$)/i);
        let aboutSection = '';
        if (aboutMatch && aboutMatch[1].trim().length > 50) {
          aboutSection = aboutMatch[1].trim().substring(0, 1500);

          // Extract facility name from About section (first sentence usually has facility name)
          // Examples: "Lincoln Medical and Mental Health Center is one of...", "Queens Hospital Center is making...",
          //           "NYC Health and Hospitals/Jacobi is a 457-bed..."
          const facilityPatterns = [
            // Pattern: "NYC Health and Hospitals/FacilityName is..."
            /NYC\s*Health\s*\+?\s*Hospitals\s*\/\s*([A-Za-z\s]+)\s+is\b/i,
            // Pattern: "Facility Name Medical Center is..."
            /^([A-Z][A-Za-z\s]+(?:Medical|Hospital|Health)\s*(?:Center|and\s*Mental\s*Health\s*Center)?)\s+is\b/i,
            // Pattern: "Facility Name Hospital is/has/provides..."
            /^([A-Z][A-Za-z\s]+(?:Hospital|Center))\s+(?:is|has|provides)/i
          ];
          for (const pattern of facilityPatterns) {
            const facilityMatch = aboutSection.match(pattern);
            if (facilityMatch && facilityMatch[1]) {
              result.facility = facilityMatch[1].trim();
              break;
            }
          }
        }

        // Build full description from available parts
        // Format data to match universal template expectations
        let fullDesc = '';

        // Put Facility on its own prominent line (template expects this for Highlights table)
        if (result.facility) {
          fullDesc += `Facility: ${result.facility}\n\n`;
        }

        // Build Schedule line with all details (employment type, shift, weekend requirements)
        let scheduleParts = [];
        if (result.fullTimePartTime) {
          scheduleParts.push(result.fullTimePartTime);
        }
        if (result.shift) {
          scheduleParts.push(result.shift);
        }
        // Add weekend/on-call details from workShiftsSection if available
        if (result.workShiftsSection) {
          // Extract weekend/on-call info from the section
          const weekendMatch = result.workShiftsSection.match(/(Alternating\s*Weekends?|Every\s*Weekend|No\s*Weekends?|Weekend\s*Only)/i);
          if (weekendMatch) {
            scheduleParts.push(weekendMatch[1]);
          }
          const oncallMatch = result.workShiftsSection.match(/(w\/\s*on-call|on-call\s*duties[^.]*)/i);
          if (oncallMatch) {
            scheduleParts.push(oncallMatch[1]);
          }
          const hoursMatch = result.workShiftsSection.match(/(\d+(?:\.\d+)?\s*Hours?(?:\s*per\s*week)?)/i);
          if (hoursMatch) {
            scheduleParts.push(hoursMatch[1]);
          }
          const daysMatch = result.workShiftsSection.match(/\(?(Monday\s*(?:to|through|-)\s*Friday)\)?/i);
          if (daysMatch) {
            scheduleParts.push(daysMatch[1]);
          }
        }
        if (scheduleParts.length > 0) {
          fullDesc += `Schedule: ${scheduleParts.join(', ')}\n\n`;
        }

        // Add salary info
        if (result.salaryMin && result.salaryMax) {
          const salaryTypeLabel = result.salaryType === 'hourly' ? 'hour' : 'year';
          if (result.salaryMin === result.salaryMax) {
            fullDesc += `Pay: $${result.salaryMin.toLocaleString()}/${salaryTypeLabel}\n\n`;
          } else {
            fullDesc += `Pay: $${result.salaryMin.toLocaleString()} - $${result.salaryMax.toLocaleString()}/${salaryTypeLabel}\n\n`;
          }
        }

        // Add location
        if (result.location) {
          fullDesc += `Location: ${result.location}, NY\n\n`;
        }

        // Add department if available
        if (result.department) {
          fullDesc += `Department: ${result.department}\n\n`;
        }

        if (aboutSection) {
          fullDesc += 'About the Facility:\n' + aboutSection + '\n\n';
        }

        if (result.duties) {
          fullDesc += 'Duties & Responsibilities:\n' + result.duties + '\n\n';
        }

        if (result.qualifications) {
          fullDesc += 'Minimum Qualifications:\n' + result.qualifications + '\n\n';
        }

        // Add Department Preferences as "Preferred Requirements" so LLM includes in Requirements section
        if (result.departmentPreferences) {
          fullDesc += 'Preferred Requirements:\n' + result.departmentPreferences + '\n\n';
        }

        if (result.additionalCompensation) {
          fullDesc += 'Additional Salary Compensation:\n' + result.additionalCompensation + '\n\n';
        }

        if (result.benefits) {
          fullDesc += 'Benefits:\n' + result.benefits;
        }

        // Fallback: Get main content if no structured sections found
        if (!fullDesc || fullDesc.length < 200) {
          // Get text starting from "About" or "Job Description" section
          const startIdx = bodyText.indexOf('About NYC Health');
          if (startIdx > -1) {
            fullDesc = bodyText.substring(startIdx, startIdx + 8000);
          } else {
            fullDesc = bodyText.substring(0, 8000);
          }
        }

        result.description = fullDesc.trim();

        return result;
      });

      // Navigate back to search results by reloading the career page fresh
      // PeopleSoft's back navigation breaks the session state, so we reload instead
      console.log(`      Reloading search page...`);
      await page.goto(this.careerPageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Re-apply the Nursing filter
      await this.applyNursingFilter(page);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll down to load jobs (need to scroll to make jobs visible for next click)
      // PeopleSoft loads ~50 jobs per scroll, so scroll based on max job index we need
      const targetIndex = Math.max(jobIndex, maxDomIndex);
      const scrollsNeeded = Math.max(2, Math.ceil((targetIndex + 10) / 50) + 1);
      console.log(`      Scrolling ${scrollsNeeded}x to load jobs up to index ${targetIndex}...`);

      for (let scrollAttempt = 0; scrollAttempt < scrollsNeeded; scrollAttempt++) {
        await page.evaluate(() => {
          const container = document.getElementById('win0divHRS_AGNT_RSLT_I$grid$0');
          if (container) {
            container.scrollTo(0, container.scrollHeight);
          } else {
            window.scrollTo(0, document.body.scrollHeight);
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return details;

    } catch (error) {
      console.log(`      ⚠️  Could not fetch details: ${error.message}`);

      // Try to recover by going back
      try {
        await page.goBack({ waitUntil: 'networkidle2', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (backError) {
        // Ignore back navigation errors
      }

      return null;
    }
  }

  /**
   * Filter for RN-specific jobs
   */
  filterRNJobs(jobs) {
    const excluded = [];
    const included = [];

    const filtered = jobs.filter(job => {
      const title = (job.title || '');

      // Exclude non-RN roles
      const excludePatterns = [
        /\blpn\b/i,
        /\blvn\b/i,
        /\bcna\b/i,
        /\bpatient care (tech|assistant|aide|associate)\b/i,
        /\bnursing assistant\b/i,
        /\bnurse aide\b/i,
        /\bhealth aide\b/i,
        /\bmedical assistant\b/i,
        /\bsurgical tech/i,
        /\bradiol.*tech/i,
        /\bpharmac/i,
        /\bsocial worker/i,
        /\bphysician\b/i,
        /\bphysician assistant\b/i,
        /\bpa\-c\b/i
      ];

      const excludeMatch = excludePatterns.find(pattern => pattern.test(title));
      if (excludeMatch) {
        excluded.push({ title, reason: 'excluded pattern: ' + excludeMatch.toString() });
        return false;
      }

      // Include RN indicators
      const includePatterns = [
        /\brn\b/i,
        /\bregistered nurse\b/i,
        /\bstaff nurse\b/i,
        /\bcharge nurse\b/i,
        /\bnurse manager\b/i,
        /\bdirector.*nurs/i,
        /\bassistant director.*nurs/i,
        /\bnurse supervisor\b/i,
        /\bnurse coordinator\b/i,
        /\bnurse educator\b/i,
        /\bclinical nurse\b/i,
        /\bnurse practitioner\b/i,
        /\bnp\b/i,
        /\baprn\b/i
      ];

      const includeMatch = includePatterns.some(pattern => pattern.test(title));
      if (includeMatch) {
        included.push(title);
        return true;
      } else {
        excluded.push({ title, reason: 'no RN pattern match' });
        return false;
      }
    });

    // Log filtered jobs
    if (excluded.length > 0) {
      console.log('\n   📋 Filtered out ' + excluded.length + ' non-RN jobs:');
      excluded.forEach(({ title, reason }) => {
        console.log('      ❌ "' + title + '" - ' + reason);
      });
    }

    return filtered;
  }

  /**
   * Process and normalize a job (now fetches full details from detail page)
   * @param {object} page - Puppeteer page
   * @param {object} job - Job data from listing
   * @param {number} jobIndex - DOM index for clicking this job
   * @param {number} maxDomIndex - Maximum DOM index we need to access (for scroll calculation)
   */
  async processJob(page, job, jobIndex, maxDomIndex = 0) {
    // Ensure title is a string
    const title = String(job.title || '').trim();

    // Map borough to city
    let city = job.location;
    if (city) {
      const cityLower = String(city).toLowerCase();
      city = CONFIG.boroughMapping[cityLower] || city;
    }

    // Default to New York if no specific borough
    if (!city || city === 'NYC' || city === 'New York City') {
      city = 'New York';
    }

    // Normalize city
    city = normalizeCity(city);

    // All jobs are in NY
    const state = CONFIG.defaultState;

    // Build direct job URL using the discovered PeopleSoft URL pattern
    // Found via "Email this Job" feature - contains JobOpeningId parameter
    const jobUrl = `https://careers.nychhc.org/psp/hrtam/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1&JobOpeningId=${job.jobId}&PostingSeq=1`;

    // Check if job already has complete data in DB (skip rate-limited detail fetch)
    // Uses rawDescription with markers check - see checkExistingCompleteData for details
    const existingJob = await this.checkExistingCompleteData(job.jobId);
    if (existingJob) {
      this.skippedCount++;
      console.log(`      ⏭️ Already has complete data (rawDescription: ${existingJob.rawDescription?.length || 0} chars), skipping detail fetch`);

      // Return existing job data merged with current search results info
      // This ensures the job is still counted in the save list for deactivation logic
      return {
        title,
        slug: existingJob.slug, // Preserve existing slug for URL stability
        sourceJobId: job.jobId,
        employerName: this.employerName,
        employerSlug: this.employerSlug,
        location: existingJob.location || `${city}, ${state}`,
        city: existingJob.city || city,
        state: existingJob.state || state,
        zipCode: existingJob.zipCode,
        country: 'US',
        jobType: existingJob.jobType || 'full-time',
        shiftType: existingJob.shiftType,
        specialty: existingJob.specialty || 'general',
        experienceLevel: existingJob.experienceLevel || 'experienced',
        description: existingJob.description,
        requirements: existingJob.requirements || '',
        benefits: existingJob.benefits || '',
        salaryMin: existingJob.salaryMin,
        salaryMax: existingJob.salaryMax,
        salaryType: existingJob.salaryType,
        salaryMinHourly: existingJob.salaryMinHourly,
        salaryMaxHourly: existingJob.salaryMaxHourly,
        salaryMinAnnual: existingJob.salaryMinAnnual,
        salaryMaxAnnual: existingJob.salaryMaxAnnual,
        sourceUrl: jobUrl,
        jobUrl,
        careerPageUrl: this.careerPageUrl,
        atsPlatform: this.atsPlatform,
        postedAt: existingJob.postedAt || new Date(),
        department: existingJob.department,
        _skipped: true // Flag for logging purposes
      };
    }

    this.fetchedCount++;

    // Fetch full details from detail page (pass jobIndex for clicking the right job)
    const details = await this.fetchJobDetails(page, job, jobIndex, maxDomIndex);

    // Use detail page data if available
    let description = '';
    let requirements = '';
    let benefits = '';
    let salaryMin = null;
    let salaryMax = null;
    let salaryType = null;
    let salaryMinHourly = null;
    let salaryMaxHourly = null;
    let salaryMinAnnual = null;
    let salaryMaxAnnual = null;
    let shift = null;
    let employmentType = 'full-time';
    let department = job.department || job.businessUnit || null;

    if (details) {
      // Use fetched description (already includes qualifications/requirements section)
      description = details.description || '';

      // NOTE: Don't store requirements separately - they're already in description
      // This avoids duplicate content on the job detail page

      // Use fetched benefits
      if (details.benefits) {
        benefits = details.benefits;
      }

      // Use fetched salary
      if (details.salaryMin) {
        salaryMin = details.salaryMin;
        salaryMax = details.salaryMax || details.salaryMin;
        salaryType = details.salaryType || 'annual';

        // Calculate hourly and annual values
        if (salaryType === 'hourly') {
          salaryMinHourly = Math.round(salaryMin);
          salaryMaxHourly = Math.round(salaryMax);
          salaryMinAnnual = Math.round(salaryMin * 2080);
          salaryMaxAnnual = Math.round(salaryMax * 2080);
        } else {
          salaryMinAnnual = Math.round(salaryMin);
          salaryMaxAnnual = Math.round(salaryMax);
          salaryMinHourly = Math.round(salaryMin / 2080);
          salaryMaxHourly = Math.round(salaryMax / 2080);
        }

        console.log(`      💰 Salary: $${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()} (${salaryType})`);
      }

      // Use fetched shift
      if (details.shift) {
        shift = details.shift;
      }

      // Use fetched employment type
      if (details.fullTimePartTime) {
        const ftpt = details.fullTimePartTime.toLowerCase();
        if (ftpt.includes('part')) {
          employmentType = 'part-time';
        } else if (ftpt.includes('diem')) {
          employmentType = 'per-diem';
        }
      }

      // Use fetched department
      if (details.department) {
        department = details.department;
      }
    }

    // Fallback description if detail fetch failed or returned empty
    if (!description || description.length < 50) {
      description = job.rawText || '';
      if (description.length < 50) {
        description = `${title} position at ${this.employerName} in ${city}, ${state}. ${department ? `Department: ${department}. ` : ''}${job.businessUnit ? `Facility: ${job.businessUnit}. ` : ''}Apply now for this nursing opportunity.`;
      }
    }

    // Detect specialty from title
    const specialty = detectSpecialty(title);

    // Detect experience level
    const experienceLevel = detectExperienceLevel(title);

    // Generate slug (function takes individual params, not object)
    const slug = generateJobSlug(title, city, state, job.jobId);

    // Build location string (city, state)
    const location = `${city}, ${state}`;

    return {
      title,
      slug,
      sourceJobId: job.jobId || null,
      employerName: this.employerName,
      employerSlug: this.employerSlug,
      location, // Required field: "City, ST" format
      city,
      state,
      zipCode: null,
      country: 'US',
      jobType: employmentType,
      shiftType: shift,
      specialty: specialty || 'general',
      experienceLevel: experienceLevel || 'experienced',
      description,
      rawDescription: description, // Store raw scraper output for skip logic (markers check)
      requirements,
      benefits,
      salaryMin,
      salaryMax,
      salaryType,
      salaryMinHourly,
      salaryMaxHourly,
      salaryMinAnnual,
      salaryMaxAnnual,
      // Detect work arrangement (remote/hybrid/onsite)
      workArrangement: detectWorkArrangement({
        title: title,
        description: description,
        location: location,
        employmentType: employmentType || ''
      }),
      sourceUrl: jobUrl, // Required field (validator expects sourceUrl, not jobUrl)
      jobUrl, // Keep for compatibility
      careerPageUrl: this.careerPageUrl,
      atsPlatform: this.atsPlatform,
      postedAt: job.postedDate ? new Date(job.postedDate) : new Date(),
      department
    };
  }
}

// Main execution
async function main() {
  console.log('\n');
  console.log('🏥 NYC Health and Hospitals RN Job Scraper');
  console.log('   Platform: Oracle PeopleSoft HCM');
  console.log('   Method: Puppeteer DOM Scraping');
  console.log('\n');

  const scraper = new NYCHealthHospitalsRNScraper({
    saveToDatabase: !DRY_RUN,
    maxPages: MAX_PAGES,
    maxJobs: MAX_JOBS
  });

  const results = await scraper.scrapeRNJobs();

  console.log('\n' + '='.repeat(70));
  console.log('FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(JSON.stringify({
    success: results.success,
    totalJobs: results.totalJobs,
    nursingJobs: results.nursingJobs,
    validatedJobs: results.validatedJobs,
    saveResults: results.saveResults
  }, null, 2));

  if (DRY_RUN && results.jobs?.length > 0) {
    console.log('\n📋 Sample jobs (first 5):');
    results.jobs.slice(0, 5).forEach((job, i) => {
      console.log(`\n${i + 1}. ${job.title}`);
      console.log(`   Location: ${job.city}, ${job.state}`);
      console.log(`   Specialty: ${job.specialty}`);
      console.log(`   URL: ${job.jobUrl}`);
    });
  }
}

main().catch(console.error);

module.exports = NYCHealthHospitalsRNScraper;
