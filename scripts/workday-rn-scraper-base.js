// Load environment variables from .env file
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

/**
 * Base Workday RN Job Scraper
 * 
 * This is a flexible scraper that can handle multiple employers using Workday ATS.
 * Each employer is configured with their specific URLs, filters, and selectors.
 * 
 * The scraper follows the same data contract as other scrapers and uses the same
 * normalization utilities to ensure consistency.
 */
class WorkdayRNScraper {
  /**
   * @param {object} config - Employer-specific configuration
   * @param {object} options - Scraper options (saveToDatabase, maxPages, etc.)
   */
  constructor(config, options = {}) {
    // Validate required config fields
    if (!config.employerName) {
      throw new Error('Config must include employerName');
    }
    if (!config.baseUrl) {
      throw new Error('Config must include baseUrl');
    }
    if (!config.searchUrl) {
      throw new Error('Config must include searchUrl');
    }

    // Store configuration
    this.config = config;
    this.employerName = config.employerName;
    this.employerSlug = generateEmployerSlug(config.employerName);
    this.baseUrl = config.baseUrl;
    this.searchUrl = config.searchUrl;
    this.careerPageUrl = config.careerPageUrl || config.baseUrl;
    this.atsPlatform = 'workday';
    
    // Store custom selectors if provided (otherwise use defaults)
    this.selectors = {
      // Default Workday selectors (most Workday sites use these)
      jobCard: config.selectors?.jobCard || '[data-automation-id="jobTitle"]',
      jobTitle: config.selectors?.jobTitle || '[data-automation-id="jobTitle"]',
      jobLocation: config.selectors?.jobLocation || '[data-automation-id="jobPostingHeader"]',
      jobLink: config.selectors?.jobLink || 'a[data-automation-id="jobTitle"]',
      paginationNext: config.selectors?.paginationNext || 'button[aria-label*="next" i], button[aria-label*="Next" i]',
      paginationContainer: config.selectors?.paginationContainer || '[data-automation-id="pagination"]',
      loadMoreButton: config.selectors?.loadMoreButton || 'button[data-automation-id="loadMoreJobs"]',
      jobDescription: config.selectors?.jobDescription || '[data-automation-id="jobPostingDescription"]',
      ...config.selectors // Allow overriding any selector
    };

    // Scraper options
    this.jobs = [];
    this.saveToDatabase = options.saveToDatabase !== false; // Default true
    this.jobService = options.jobService || new JobBoardService();
    this.maxPages = options.maxPages || null; // Limit pages for testing (null = no limit)
  }

  /**
   * Main entry point - scrape RN jobs
   * @returns {Promise<object>} - Scraping results
   */
  async scrapeRNJobs() {
    console.log(`🚀 Starting ${this.employerName} RN Job Scraping (Workday)...`);
    console.log(`Search URL: ${this.searchUrl}`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // BATCH PROCESSING APPROACH: Collect and process jobs page-by-page
      // This prevents frame detachment issues by keeping page context fresh
      console.log('📦 Using batch processing: Collect → Process → Next Page\n');
      
      const allDetailedJobs = [];
      const allJobListings = [];
      let totalProcessed = 0;
      let totalErrors = 0;
      let currentPageNumber = 1;
      const seenJobUrls = new Set();
      let stableCount = 0;
      const maxStableIterations = 3;
      let iteration = 0;
      const maxIterations = 200;
      
      // Navigate to search URL
      await page.goto(this.searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for job listings to load
      await page.waitForSelector(this.selectors.jobCard, { timeout: 15000 }).catch(() => {
        console.log('⚠️  Job cards not found with default selector, trying alternative...');
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      while (iteration < maxIterations) {
        iteration++;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📄 PAGE ${currentPageNumber} - Iteration ${iteration}`);
        console.log(`${'='.repeat(60)}\n`);
        
        // STEP 1: Extract jobs from current page
        const pageJobs = await this.extractJobListings(page);
        console.log(`   Found ${pageJobs.length} jobs on page ${currentPageNumber}`);
        
        // Check for new unique jobs
        const newJobs = pageJobs.filter(job => {
          return job.link && !seenJobUrls.has(job.link);
        });
        
        if (newJobs.length === 0) {
          stableCount++;
          console.log(`   ⚠️  No new unique jobs (stable count: ${stableCount}/${maxStableIterations})`);
          
          if (stableCount >= maxStableIterations) {
            console.log(`\n✅ Reached end of results (no new unique jobs after ${maxStableIterations} iterations)`);
            break;
          }
        } else {
          stableCount = 0;
          newJobs.forEach(job => {
            if (job.link) seenJobUrls.add(job.link);
          });
          allJobListings.push(...newJobs);
          console.log(`   ✅ Added ${newJobs.length} new unique jobs (Total collected: ${allJobListings.length})`);
        }
        
        // STEP 2: Filter for RN jobs from this page
        const rnJobsFromPage = this.filterRNJobs(newJobs);
        console.log(`   🎯 Found ${rnJobsFromPage.length} RN jobs on this page\n`);
        
        // STEP 3: Process RN jobs from this page immediately (while page context is fresh)
        if (rnJobsFromPage.length > 0) {
          console.log(`   🔍 Processing ${rnJobsFromPage.length} RN jobs from page ${currentPageNumber}...\n`);
          
          for (let i = 0; i < rnJobsFromPage.length; i++) {
            const job = rnJobsFromPage[i];
            totalProcessed++;
            console.log(`   [${i + 1}/${rnJobsFromPage.length}] Processing: ${job.title}`);
            
            try {
              const normalizedJob = await this.processJob(page, job);
              
              // Validate the job data
              const validation = validateJobData(normalizedJob);
              if (validation.valid) {
                allDetailedJobs.push(normalizedJob);
                console.log(`      ✅ Validated and added`);
              } else {
                totalErrors++;
                console.log(`      ⚠️  Validation failed: ${validation.errors.join(', ')}`);
              }
            } catch (error) {
              totalErrors++;
              console.log(`      ❌ Error: ${error.message}`);
            }
            
            // Delay between jobs
            if (i < rnJobsFromPage.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          console.log(`\n   ✅ Completed page ${currentPageNumber}: ${rnJobsFromPage.length} RN jobs processed`);
        }
        
        // STEP 4: Navigate back to listing page before trying to go to next page
        // (We might be on a job detail page after processing jobs)
        // IMPORTANT: We need to get back to the CURRENT page, not page 1
        console.log(`   🔄 Returning to job listing page ${currentPageNumber}...`);
        try {
          // First, check what page we're actually on by looking at the URL or page indicators
          const currentUrl = page.url();
          
          // If we're already on a listing page (not a job detail), we might be good
          // But if we're on a job detail page, we need to go back
          if (!currentUrl.includes('/job/') && currentUrl.includes(this.baseUrl)) {
            // We're already on a listing page - check if it's the right page number
            // Try to verify we're on the right page by checking visible page numbers
            const visiblePageInfo = await page.evaluate(() => {
              // Look for active/current page indicator
              const activePage = document.querySelector('[aria-current="page"], .active, [class*="active"]');
              if (activePage) {
                const text = activePage.textContent.trim();
                if (/^\d+$/.test(text)) {
                  return parseInt(text);
                }
              }
              return null;
            });
            
            // If we're on the wrong page, navigate to the right one
            if (visiblePageInfo && visiblePageInfo !== currentPageNumber) {
              console.log(`   📍 Currently on page ${visiblePageInfo}, need page ${currentPageNumber}`);
              // Navigate to search URL and then click to the right page
              await page.goto(this.searchUrl, { 
                waitUntil: 'networkidle2',
                timeout: 20000 
              });
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Click to the current page number
              if (currentPageNumber > 1) {
                await this.navigateToPageNumber(page, currentPageNumber);
              }
            }
          } else {
            // We're on a job detail page - navigate back to listing page
            await page.goto(this.searchUrl, { 
              waitUntil: 'networkidle2',
              timeout: 20000 
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Navigate to the current page number if we're past page 1
            if (currentPageNumber > 1) {
              await this.navigateToPageNumber(page, currentPageNumber);
            }
          }
        } catch (navError) {
          console.log(`   ⚠️  Could not return to listing page: ${navError.message}`);
          // Try a simple navigation as fallback
          try {
            await page.goto(this.searchUrl, { 
              waitUntil: 'networkidle2',
              timeout: 20000 
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (e) {
            // Continue anyway
          }
        }
        
        // STEP 5: Try to load next page
        console.log(`   🔍 Looking for page ${currentPageNumber + 1}...`);
        const loadMoreResult = await this.loadMoreJobs(page, seenJobUrls.size, currentPageNumber);
        
        if (loadMoreResult.success && loadMoreResult.newPageNumber) {
          const oldPage = currentPageNumber;
          currentPageNumber = loadMoreResult.newPageNumber;
          console.log(`   ✅ Successfully advanced from page ${oldPage} to page ${currentPageNumber}`);
        } else {
          // Check if there might be more pages by looking at available page numbers
          const availablePages = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            return buttons
              .filter(el => {
                const text = el.textContent.trim();
                return /^\d+$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 100;
              })
              .map(el => parseInt(el.textContent.trim()))
              .sort((a, b) => a - b);
          });
          
          const maxAvailablePage = availablePages.length > 0 ? Math.max(...availablePages) : currentPageNumber;
          
          if (maxAvailablePage > currentPageNumber) {
            console.log(`   ⚠️  Found page ${maxAvailablePage} available, but couldn't navigate. Trying direct navigation...`);
            // Try to navigate directly to the next page
            const directNavSuccess = await this.navigateToPageNumber(page, currentPageNumber + 1);
            if (directNavSuccess) {
              currentPageNumber = currentPageNumber + 1;
              console.log(`   ✅ Direct navigation to page ${currentPageNumber} successful`);
              // Continue to next iteration
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }
          }
          
          console.log(`\n✅ No more pages to load (last page: ${currentPageNumber}, max available: ${maxAvailablePage})`);
          break;
        }
        
        // Wait for next page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      this.jobs = allDetailedJobs;
      
      // Calculate totals
      const totalRNJobs = allDetailedJobs.length + totalErrors; // Approximate (some might be filtered out)
      
      console.log(`\n🎉 Scraping complete!`);
      console.log(`   Total jobs found: ${allJobListings.length}`);
      console.log(`   RN jobs processed: ${totalProcessed}`);
      console.log(`   Successfully processed: ${allDetailedJobs.length}`);
      console.log(`   Errors/Invalid: ${totalErrors}`);
      
      // Save to database if enabled
      let saveResults = null;
      if (this.saveToDatabase && this.jobs.length > 0) {
        console.log('\n💾 Saving jobs to database...');
        try {
          saveResults = await this.jobService.saveJobs(this.jobs, {
            employerName: this.employerName,
            employerSlug: this.employerSlug,
            careerPageUrl: this.careerPageUrl,
            atsPlatform: this.atsPlatform
          });
        } catch (error) {
          console.error(`❌ Error saving to database: ${error.message}`);
          saveResults = { error: error.message };
        }
      }
      
      return {
        success: true,
        totalJobs: allJobListings.length,
        rnJobs: totalProcessed,
        validatedJobs: this.jobs.length,
        jobs: this.jobs,
        saveResults: saveResults,
        stats: {
          totalListings: allJobListings.length,
          rnListings: totalProcessed,
          successfullyProcessed: allDetailedJobs.length,
          errors: totalErrors
        }
      };
      
    } catch (error) {
      console.error('❌ Error during scraping:', error.message);
      return {
        success: false,
        error: error.message,
        jobs: []
      };
    } finally {
      await browser.close();
      
      // Close database connection if we created it
      if (this.jobService) {
        await this.jobService.disconnect();
      }
    }
  }

  /**
   * Navigate to a specific page number
   * @param {object} page - Puppeteer page object
   * @param {number} pageNumber - Page number to navigate to
   * @returns {Promise<boolean>} - True if navigation successful
   */
  async navigateToPageNumber(page, pageNumber) {
    try {
      const pageNumberInfo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons
          .filter(el => {
            const text = el.textContent.trim();
            return /^\d+$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 100 &&
                   !el.disabled && el.getAttribute('aria-disabled') !== 'true';
          })
          .map(el => ({
            text: el.textContent.trim(),
            number: parseInt(el.textContent.trim())
          }));
      });
      
      const targetPage = pageNumberInfo.find(p => p.number === pageNumber);
      if (targetPage) {
        const buttonHandle = await page.evaluateHandle((pageText) => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          return buttons.find(btn => btn.textContent.trim() === pageText && 
                                    !btn.disabled && 
                                    btn.getAttribute('aria-disabled') !== 'true');
        }, targetPage.text);
        
        if (buttonHandle && buttonHandle.asElement()) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
            buttonHandle.asElement().click()
          ]).catch(() => {
            buttonHandle.asElement().click();
          });
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log(`   ⚠️  Error navigating to page ${pageNumber}: ${error.message}`);
      return false;
    }
  }

  /**
   * Collect all job listings from all pages
   * Workday typically uses infinite scroll or "Load More" buttons
   * @param {object} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of all job listings
   */
  async collectAllJobsFromAllPages(page) {
    console.log('📚 Collecting jobs from all pages...\n');
    
    // Navigate to search URL
    await page.goto(this.searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for job listings to load
    await page.waitForSelector(this.selectors.jobCard, { timeout: 15000 }).catch(() => {
      console.log('⚠️  Job cards not found with default selector, trying alternative...');
    });
    
    // Wait a bit for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const allJobs = [];
    const seenJobUrls = new Set(); // Track unique job URLs to detect new jobs
    let stableCount = 0; // Count how many times no new unique jobs found
    const maxStableIterations = 3; // Stop after 3 iterations with no new jobs
    let iteration = 0;
    let currentPageNumber = 1; // Track current page number for pagination
    const maxIterations = 200; // Safety limit (increased for large job lists - 200 iterations = ~4000 jobs max)
    
    while (iteration < maxIterations) {
      iteration++;
      console.log(`📄 Iteration ${iteration}: Extracting jobs...`);
      
      // Extract jobs from current page state
      const pageJobs = await this.extractJobListings(page);
      console.log(`   Found ${pageJobs.length} jobs on current page`);
      
      // Check for new unique jobs (by URL)
      const newJobs = pageJobs.filter(job => {
        return job.link && !seenJobUrls.has(job.link);
      });
      
      if (newJobs.length > 0) {
        // New unique jobs found - add them
        newJobs.forEach(job => {
          if (job.link) seenJobUrls.add(job.link);
        });
        allJobs.push(...newJobs);
        console.log(`   ✅ Added ${newJobs.length} new unique jobs (Total: ${allJobs.length})`);
        stableCount = 0; // Reset stable count
      } else {
        // No new unique jobs
        stableCount++;
        console.log(`   ⚠️  No new unique jobs (stable count: ${stableCount}/${maxStableIterations})`);
        
        if (stableCount >= maxStableIterations) {
          console.log(`\n✅ Reached end of results (no new unique jobs after ${maxStableIterations} iterations)`);
          break;
        }
      }
      
      // Try to load more jobs (Workday typically uses "Load More" button or infinite scroll)
      const loadMoreResult = await this.loadMoreJobs(page, seenJobUrls.size, currentPageNumber);
      
      // Update current page number if we successfully navigated
      if (loadMoreResult.success && loadMoreResult.newPageNumber) {
        currentPageNumber = loadMoreResult.newPageNumber;
      }
      
      if (!loadMoreResult.success) {
        // No more jobs to load
        console.log(`\n✅ No more jobs to load`);
        break;
      }
      
      // Wait for new content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\n📊 Collection complete: ${allJobs.length} total jobs found\n`);
    return allJobs;
  }

  /**
   * Try to load more jobs (click "Load More" button or scroll)
   * @param {object} page - Puppeteer page object
   * @param {number} currentUniqueJobCount - Current number of unique jobs collected
   * @param {number} currentPageNumber - Current page number we're on
   * @returns {Promise<{success: boolean, newPageNumber?: number}>} - Success status and new page number if navigated
   */
  async loadMoreJobs(page, currentUniqueJobCount, currentPageNumber = 1) {
    try {
      // Get current unique job URLs before attempting to load more
      const jobUrlsBefore = await page.evaluate((selectors) => {
        const cards = document.querySelectorAll(selectors.jobCard);
        const urls = [];
        cards.forEach(card => {
          const linkEl = card.querySelector('a[href]') || card.querySelector(selectors.jobLink);
          if (linkEl && linkEl.href) {
            urls.push(linkEl.href);
          }
        });
        return urls;
      }, this.selectors);
      
      const uniqueUrlsBefore = new Set(jobUrlsBefore);
      
      // Method 1: Try to find and click "Load More" button (Workday specific)
      const loadMoreSelectors = [
        this.selectors.loadMoreButton,
        'button[data-automation-id="loadMoreJobs"]',
        '[data-automation-id="loadMoreJobs"]',
        'button.wd-button[aria-label*="more" i]'
      ];
      
      // Also try finding buttons by text content
      const loadMoreByText = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons
          .filter(btn => {
            const text = btn.textContent.trim().toLowerCase();
            return (text.includes('load more') || text.includes('show more')) &&
                   !btn.disabled &&
                   btn.getAttribute('aria-disabled') !== 'true';
          })
          .map(btn => ({
            element: btn,
            text: btn.textContent.trim()
          }));
      });
      
      // Try clicking buttons found by text
      if (loadMoreByText && loadMoreByText.length > 0) {
        try {
          const buttonHandle = await page.evaluateHandle((buttonText) => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            return buttons.find(btn => btn.textContent.trim().toLowerCase().includes(buttonText.toLowerCase()) &&
                                      !btn.disabled &&
                                      btn.getAttribute('aria-disabled') !== 'true');
          }, 'load more');
          
          if (buttonHandle && buttonHandle.asElement()) {
            const isVisible = await page.evaluate(el => {
              const rect = el.getBoundingClientRect();
              return rect.top >= 0 && rect.left >= 0 && 
                     rect.bottom <= window.innerHeight && 
                     rect.right <= window.innerWidth;
            }, buttonHandle.asElement());
            
            if (isVisible) {
              console.log(`   🔘 Clicking "Load More" button (found by text)...`);
              await buttonHandle.asElement().click();
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              const jobUrlsAfter = await page.evaluate((selectors) => {
                const cards = document.querySelectorAll(selectors.jobCard);
                const urls = [];
                cards.forEach(card => {
                  const linkEl = card.querySelector('a[href]') || card.querySelector(selectors.jobLink);
                  if (linkEl && linkEl.href) {
                    urls.push(linkEl.href);
                  }
                });
                return urls;
              }, this.selectors);
              
              const newUrls = jobUrlsAfter.filter(url => !uniqueUrlsBefore.has(url));
              if (newUrls.length > 0) {
                console.log(`   ✅ Loaded ${newUrls.length} more unique jobs`);
                return { success: true, newPageNumber: currentPageNumber };
              }
            }
          }
        } catch (e) {
          // Continue to selector-based methods
        }
      }
      
      for (const selector of loadMoreSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            const isVisible = await page.evaluate(el => {
              const rect = el.getBoundingClientRect();
              return rect.top >= 0 && rect.left >= 0 && 
                     rect.bottom <= window.innerHeight && 
                     rect.right <= window.innerWidth &&
                     !el.disabled &&
                     el.getAttribute('aria-disabled') !== 'true';
            }, button);
            
            if (isVisible) {
              console.log(`   🔘 Clicking "Load More" button...`);
              await button.click();
              await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for content to load
              
              // Check if new unique jobs appeared
              const jobUrlsAfter = await page.evaluate((selectors) => {
                const cards = document.querySelectorAll(selectors.jobCard);
                const urls = [];
                cards.forEach(card => {
                  const linkEl = card.querySelector('a[href]') || card.querySelector(selectors.jobLink);
                  if (linkEl && linkEl.href) {
                    urls.push(linkEl.href);
                  }
                });
                return urls;
              }, this.selectors);
              
              const uniqueUrlsAfter = new Set(jobUrlsAfter);
              const newUrls = jobUrlsAfter.filter(url => !uniqueUrlsBefore.has(url));
              
              if (newUrls.length > 0) {
                console.log(`   ✅ Loaded ${newUrls.length} more unique jobs`);
                return { success: true, newPageNumber: currentPageNumber };
              }
            }
          }
        } catch (e) {
          // Continue to next selector
          continue;
        }
      }
      
      // Method 2: Try pagination "Next" button (Workday specific)
      const nextButtonSelectors = [
        this.selectors.paginationNext,
        'button[aria-label*="next" i]',
        'button[aria-label*="Next" i]',
        'button[data-automation-id="paginationNext"]',
        'a[aria-label*="next" i]',
        '[data-automation-id="pagination"] button:last-child',
        'button.wd-button[aria-label*="next" i]'
      ];
      
      for (const selector of nextButtonSelectors) {
        try {
          const nextButton = await page.$(selector);
          if (nextButton) {
            const isVisible = await page.evaluate(el => {
              const rect = el.getBoundingClientRect();
              return rect.top >= 0 && rect.left >= 0 && 
                     rect.bottom <= window.innerHeight && 
                     rect.right <= window.innerWidth;
            }, nextButton);
            
            const isDisabled = await page.evaluate(el => {
              return el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled');
            }, nextButton);
            
            if (isVisible && !isDisabled) {
              console.log(`   🔘 Clicking "Next" pagination button...`);
              await nextButton.click();
              await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to load
              
              // Check if new unique jobs appeared
              const jobUrlsAfter = await page.evaluate((selectors) => {
                const cards = document.querySelectorAll(selectors.jobCard);
                const urls = [];
                cards.forEach(card => {
                  const linkEl = card.querySelector('a[href]') || card.querySelector(selectors.jobLink);
                  if (linkEl && linkEl.href) {
                    urls.push(linkEl.href);
                  }
                });
                return urls;
              }, this.selectors);
              
              const uniqueUrlsAfter = new Set(jobUrlsAfter);
              const newUrls = jobUrlsAfter.filter(url => !uniqueUrlsBefore.has(url));
              
              if (newUrls.length > 0) {
                console.log(`   ✅ Loaded ${newUrls.length} more unique jobs`);
                return { success: true, newPageNumber: currentPageNumber };
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // Method 3: Scroll to bottom to trigger infinite scroll (with multiple scrolls)
      console.log(`   📜 Scrolling to trigger infinite scroll...`);
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if new unique jobs appeared after scroll
        const jobUrlsAfterScroll = await page.evaluate((selectors) => {
          const cards = document.querySelectorAll(selectors.jobCard);
          const urls = [];
          cards.forEach(card => {
            const linkEl = card.querySelector('a[href]') || card.querySelector(selectors.jobLink);
            if (linkEl && linkEl.href) {
              urls.push(linkEl.href);
            }
          });
          return urls;
        }, this.selectors);
        
        const newUrlsAfterScroll = jobUrlsAfterScroll.filter(url => !uniqueUrlsBefore.has(url));
        if (newUrlsAfterScroll.length > 0) {
          console.log(`   ✅ Infinite scroll loaded ${newUrlsAfterScroll.length} more unique jobs`);
          return { success: true, newPageNumber: currentPageNumber };
        }
      }
      
      // Method 4: Try clicking pagination page numbers (if visible)
      // Use the actual current page number passed in, or estimate from job count
      const estimatedCurrentPage = currentPageNumber || Math.ceil(currentUniqueJobCount / 20) || 1;
      const nextPageNumber = estimatedCurrentPage + 1;
      
      const pageNumberInfo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons
          .filter(el => {
            const text = el.textContent.trim();
            // Look for page numbers
            return /^\d+$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 100 &&
                   !el.disabled && el.getAttribute('aria-disabled') !== 'true';
          })
          .map(el => ({
            text: el.textContent.trim(),
            number: parseInt(el.textContent.trim())
          }));
      });
      
      if (pageNumberInfo.length > 0) {
        // Try clicking the next page number
        const nextPage = pageNumberInfo.find(p => p.number === nextPageNumber);
        if (nextPage) {
          try {
            const nextPageButton = await page.evaluateHandle((pageText) => {
              const buttons = Array.from(document.querySelectorAll('button, a'));
              return buttons.find(btn => btn.textContent.trim() === pageText && 
                                        !btn.disabled && 
                                        btn.getAttribute('aria-disabled') !== 'true');
            }, nextPage.text);
            
            if (nextPageButton && nextPageButton.asElement()) {
              console.log(`   🔘 Clicking page ${nextPage.text}...`);
              
              // Wait for navigation if it's a link, or just click if it's a button
              const urlBefore = page.url();
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}), // May not navigate
                nextPageButton.asElement().click()
              ]).catch(() => {
                // If navigation doesn't happen, that's okay - might be AJAX
                nextPageButton.asElement().click();
              });
              
              // Wait for content to load (either navigation or AJAX)
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Wait for job cards to appear - try multiple selectors
              const cardSelectors = [
                this.selectors.jobCard,
                '[data-automation-id="jobTitle"]',
                'li[data-automation-id="jobTitle"]',
                'div[data-automation-id="jobTitle"]',
                'a[data-automation-id="jobTitle"]'
              ];
              
              let cardsFound = false;
              for (const selector of cardSelectors) {
                try {
                  await page.waitForSelector(selector, { timeout: 8000, visible: false });
                  cardsFound = true;
                  break;
                } catch (e) {
                  continue;
                }
              }
              
              if (!cardsFound) {
                console.log(`   ⚠️  No job cards found after clicking page ${nextPage.text}, waiting longer...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
              
              const jobUrlsAfter = await page.evaluate((selectors) => {
                // Try multiple selectors to find job cards
                const cardSelectors = [
                  selectors.jobCard,
                  '[data-automation-id="jobTitle"]',
                  'li[data-automation-id="jobTitle"]',
                  'div[data-automation-id="jobTitle"]'
                ];
                
                let cards = [];
                for (const sel of cardSelectors) {
                  cards = Array.from(document.querySelectorAll(sel));
                  if (cards.length > 0) break;
                }
                
                const urls = [];
                cards.forEach(card => {
                  const linkEl = card.querySelector('a[href]') || card.querySelector(selectors.jobLink) || card;
                  if (linkEl && linkEl.href) {
                    urls.push(linkEl.href);
                  }
                });
                return urls;
              }, this.selectors);
              
              const newUrls = jobUrlsAfter.filter(url => !uniqueUrlsBefore.has(url));
              const sameUrls = jobUrlsAfter.filter(url => uniqueUrlsBefore.has(url));
              
              console.log(`   📊 After page ${nextPage.text}: ${jobUrlsAfter.length} total jobs, ${newUrls.length} new, ${sameUrls.length} same`);
              
              // Check if we successfully navigated to a new page
              // Success criteria: Either new URLs found, OR all jobs are different (page replaced)
              if (newUrls.length > 0) {
                console.log(`   ✅ Loaded ${newUrls.length} more unique jobs from page ${nextPage.text}`);
                return { success: true, newPageNumber: nextPage.number };
              } else if (jobUrlsAfter.length > 0 && sameUrls.length === 0) {
                // All jobs are different (page replaced, not appended) - this is still progress!
                console.log(`   ✅ Page ${nextPage.text} loaded ${jobUrlsAfter.length} different jobs (page replaced)`);
                return { success: true, newPageNumber: nextPage.number };
              } else if (jobUrlsAfter.length >= 10 && newUrls.length === 0 && sameUrls.length < jobUrlsAfter.length) {
                // Some jobs are different - we're on a new page but some overlap
                // This can happen if there's some overlap between pages
                const differentCount = jobUrlsAfter.length - sameUrls.length;
                if (differentCount >= 10) { // At least 10 different jobs = likely a new page
                  console.log(`   ✅ Page ${nextPage.text} loaded ${differentCount} different jobs (partial overlap)`);
                  return { success: true, newPageNumber: nextPage.number };
                }
              } else {
                console.log(`   ⚠️  Page ${nextPage.text} clicked but showing same jobs (might need to try different approach)`);
              }
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // No new jobs were loaded
      return { success: false };
      
    } catch (error) {
      console.log(`   ⚠️  Error loading more jobs: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Extract job listings from current page
   * @param {object} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of job listing objects
   */
  async extractJobListings(page) {
    const jobListings = await page.evaluate((selectors) => {
      const jobs = [];
      
      // Find all job cards using the configured selector
      const jobCards = document.querySelectorAll(selectors.jobCard);
      
      jobCards.forEach((card) => {
        try {
          // Extract job title and link
          const titleElement = card.querySelector(selectors.jobTitle) || card;
          const title = titleElement.textContent.trim();
          
          // Find link - could be on title element or parent
          let linkElement = card.querySelector(selectors.jobLink);
          if (!linkElement && titleElement.tagName === 'A') {
            linkElement = titleElement;
          }
          if (!linkElement) {
            // Try to find any link in the card
            linkElement = card.querySelector('a[href]');
          }
          
          const link = linkElement ? linkElement.href : null;
          
          // Extract location from dedicated location field (with map pin icon)
          // Workday uses data-automation-id="locations" for the location field
          let location = null;
          
          // Method 1: Try configured selector
          if (selectors.jobLocation) {
            const locationElement = card.querySelector(selectors.jobLocation);
            if (locationElement) {
              location = locationElement.textContent.trim();
            }
          }
          
          // Method 2: Try Workday's standard location selectors
          if (!location) {
            const locationSelectors = [
              '[data-automation-id="locations"]', // Standard Workday location field
              '[data-automation-id="jobLocation"]', // Alternative location field
              '[data-automation-id="jobPostingHeader"] [data-automation-id="locations"]', // Nested location
              'span[data-automation-id="locations"]', // Span with location
              'div[data-automation-id="locations"]' // Div with location
            ];
            
            for (const selector of locationSelectors) {
              const locationElement = card.querySelector(selector);
              if (locationElement) {
                const locationText = locationElement.textContent.trim();
                // Validate it looks like a location (City, State format)
                if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s+[A-Z]{2}$/.test(locationText)) {
                  location = locationText;
                  break;
                }
              }
            }
          }
          
          // Method 3: Look for location near map pin icon (last resort)
          if (!location) {
            // Find element with map pin icon (usually an svg or icon element)
            const mapPinIcon = card.querySelector('svg[class*="location"], [class*="location-icon"], [aria-label*="location" i]');
            if (mapPinIcon) {
              // Get the next sibling or parent's text that contains location pattern
              let locationElement = mapPinIcon.parentElement || mapPinIcon.nextElementSibling;
              if (locationElement) {
                const locationText = locationElement.textContent.trim();
                const locationMatch = locationText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})/);
                if (locationMatch) {
                  location = locationMatch[0];
                }
              }
            }
          }
          
          // Extract job ID from URL or data attributes
          let jobId = null;
          if (link) {
            const idMatch = link.match(/\/([a-f0-9]{32}|[A-Z0-9]+)\/?$/);
            if (idMatch) {
              jobId = idMatch[1];
            }
          }
          
          if (title && link) {
            jobs.push({
              jobId: jobId,
              title: title,
              location: location,
              link: link,
              rawText: card.textContent
            });
          }
        } catch (error) {
          console.log(`Error processing job card:`, error.message);
        }
      });
      
      return jobs;
    }, this.selectors);
    
    return jobListings;
  }

  /**
   * Filter out clearly non-RN positions by title
   * @param {Array} jobListings - Array of job listings
   * @returns {Array} - Filtered array of potential RN jobs
   */
  filterRNJobs(jobListings) {
    console.log('🎯 Filtering out clearly NON-RN positions by title...');
    
    const rnJobs = jobListings.filter(job => {
      const title = job.title || '';
      
      // Exclude if title clearly indicates non-RN role
      if (this.isNonRNTitle(title)) {
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Kept ${rnJobs.length} jobs for detailed checking (excluded ${jobListings.length - rnJobs.length} non-RN positions)`);
    
    return rnJobs;
  }

  /**
   * Check if title indicates a non-RN support role
   * @param {string} title - Job title
   * @returns {boolean} - True if should be excluded
   */
  isNonRNTitle(title) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    
    const nonRNTitles = [
      'surgical technologist',
      'surgical technician',
      'clinical assistant',
      'clinical technician',
      'home health aide',
      'patient care assistant',
      'patient care aide',
      'pcna',
      'health unit coordinator',
      'nursing assistant',
      'nurse aide',
      'patient care tech',
      'patient care technician',
      'nurse technician',
      'lpn',
      'licensed practical nurse',
      'licensed vocational nurse',
      'lvn',
      'licensed vocational nursing assistant',
      'cna',
      'certified nursing assistant',
      'stna'
    ];
    
    for (const nonRNTitle of nonRNTitles) {
      if (titleLower.includes(nonRNTitle)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if text contains explicit RN/Registered Nurse mention
   * @param {string} text - Text to check
   * @returns {boolean} - True if RN/Registered Nurse is mentioned
   */
  hasRNMention(text) {
    if (!text) return false;
    
    const rnIndicators = [
      /\brn\b/i,
      /\bregistered nurse\b/i,
      /\br\.n\.\b/i,
      /\br\. n\.\b/i
    ];
    
    return rnIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Check if RN is mentioned in exclusion context (assists RN, works with RN, etc.)
   * @param {string} text - Description text
   * @returns {boolean} - True if RN is mentioned but in wrong context
   */
  hasRNExclusionContext(text) {
    if (!text) return false;
    
    const textLower = text.toLowerCase();
    
    const exclusionContexts = [
      /\bassists\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bassisting\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bworks?\s+with\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bsupports?\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bunder\s+(?:the\s+)?supervision\s+of\s+(?:rn|registered\s+nurse|r\.n\.)\b/i
    ];
    
    return exclusionContexts.some(pattern => pattern.test(textLower));
  }

  /**
   * Check if description is placeholder/incomplete
   * @param {string} description - Job description
   * @returns {boolean} - True if description is placeholder
   */
  isPlaceholderDescription(description) {
    if (!description) return true;
    
    const descLower = description.toLowerCase().trim();
    
    const placeholderPatterns = [
      /job\s+description\s+is\s+being\s+updated/i,
      /please\s+visit\s+(?:the\s+)?employer\s+website/i,
      /description\s+coming\s+soon/i,
      /job\s+description\s+not\s+available/i
    ];
    
    return placeholderPatterns.some(pattern => pattern.test(descLower));
  }

  /**
   * Process a single job - get details and normalize
   * @param {object} page - Puppeteer page object
   * @param {object} job - Job listing object
   * @returns {Promise<object>} - Normalized job object
   */
  async processJob(page, job) {
    // Get detailed job information
    const jobDetails = await this.getJobDetails(page, job);
    
    // Validate RN requirement
    const title = job.title || jobDetails.title || '';
    const fullDescription = jobDetails.description || job.rawText || '';
    
    // Check if extraction failed
    if (jobDetails.extractionFailed) {
      throw new Error(`Job "${title}" - JD extraction failed. Skipping.`);
    }
    
    // Check if description is too short
    if (!fullDescription || fullDescription.trim().length < 500) {
      throw new Error(`Job "${title}" - Description too short. Skipping.`);
    }
    
    // Check for placeholder
    if (this.isPlaceholderDescription(fullDescription)) {
      throw new Error(`Job "${title}" has placeholder description - cannot verify RN requirement`);
    }
    
    // Check for RN exclusion context
    if (this.hasRNExclusionContext(fullDescription)) {
      throw new Error(`Job "${title}" mentions RN but in supporting role context`);
    }
    
    // Check for RN requirement
    const titleHasRN = this.hasRNMention(title);
    const descriptionHasRN = this.hasRNMention(fullDescription);
    
    if (!titleHasRN && !descriptionHasRN) {
      throw new Error(`Job "${title}" does not explicitly mention RN or Registered Nurse`);
    }
    
    // Parse location
    const locationParts = this.parseLocation(job.location || jobDetails.location);
    
    // Normalize and create job object
    const normalizedJob = {
      // Required fields
      title: job.title || jobDetails.title,
      location: jobDetails.location || job.location || 'Location not specified',
      city: normalizeCity(locationParts.city),
      state: normalizeState(locationParts.state),
      description: jobDetails.description || job.rawText.substring(0, 500),
      sourceUrl: job.link || jobDetails.sourceUrl,
      
      // Employer information
      employerName: this.employerName,
      employerSlug: this.employerSlug,
      careerPageUrl: this.careerPageUrl,
      
      // Optional fields
      zipCode: normalizeZipCode(locationParts.zipCode),
      isRemote: jobDetails.isRemote || false,
      jobType: normalizeJobType(jobDetails.employmentType),
      shiftType: jobDetails.shiftType || null,
      specialty: detectSpecialty(job.title, jobDetails.description || job.rawText),
      experienceLevel: detectExperienceLevel(job.title, jobDetails.description || job.rawText),
      requirements: jobDetails.requirements || null,
      responsibilities: jobDetails.responsibilities || null,
      benefits: jobDetails.benefits || null,
      department: jobDetails.department || null,
      salaryMin: jobDetails.salaryMin || null,
      salaryMax: jobDetails.salaryMax || null,
      salaryCurrency: 'USD',
      salaryType: jobDetails.salaryType || null,
      salaryMinHourly: jobDetails.salaryType === 'hourly' ? jobDetails.salaryMin : 
                       jobDetails.salaryType === 'annual' && jobDetails.salaryMin ? Math.round(jobDetails.salaryMin / 2080) : null,
      salaryMaxHourly: jobDetails.salaryType === 'hourly' ? jobDetails.salaryMax : 
                       jobDetails.salaryType === 'annual' && jobDetails.salaryMax ? Math.round(jobDetails.salaryMax / 2080) : null,
      salaryMinAnnual: jobDetails.salaryType === 'annual' ? jobDetails.salaryMin : 
                       jobDetails.salaryType === 'hourly' && jobDetails.salaryMin ? Math.round(jobDetails.salaryMin * 2080) : null,
      salaryMaxAnnual: jobDetails.salaryType === 'annual' ? jobDetails.salaryMax : 
                       jobDetails.salaryType === 'hourly' && jobDetails.salaryMax ? Math.round(jobDetails.salaryMax * 2080) : null,
      sourceJobId: job.jobId || null,
      postedDate: jobDetails.postedDate || null,
      expiresDate: jobDetails.expiresDate || null
    };
    
    // Generate slug
    normalizedJob.slug = generateJobSlug(
      normalizedJob.title,
      normalizedJob.city,
      normalizedJob.state,
      normalizedJob.sourceJobId
    );
    
    // Generate meta description for SEO
    normalizedJob.metaDescription = this.generateMetaDescription(normalizedJob);
    
    // Generate keywords for AI SEO
    normalizedJob.keywords = this.generateKeywords(normalizedJob);
    
    return normalizedJob;
  }

  /**
   * Parse location string into city, state, zipCode
   * @param {string} locationString - Location string
   * @returns {object} - { city, state, zipCode }
   */
  parseLocation(locationString) {
    if (!locationString || typeof locationString !== 'string') {
      return { city: null, state: null, zipCode: null };
    }
    
    const clean = locationString.trim();
    
    // Pattern: "City, ST" or "City, ST 12345"
    const patterns = [
      /^([A-Z][a-z]+(?:\s+(?:Heights?|Hts?|Beach|Hills|City|Town|Burg|Port|Haven))?),\s+([A-Z]{2})(?:\s+(\d{5}))?$/,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})(?:\s+(\d{5}))?$/,
      /^([A-Z][a-z]+)\s+([A-Z]{2})$/
    ];
    
    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match && match[2] && match[2].length === 2) {
        return {
          city: match[1],
          state: match[2],
          zipCode: match[3] || null
        };
      }
    }
    
    // Fallback: try to extract city and state
    const parts = clean.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 2) {
      const stateMatch = parts[1].match(/([A-Z]{2})/);
      if (stateMatch) {
        return {
          city: parts[0],
          state: stateMatch[1],
          zipCode: parts[1].match(/\d{5}/)?.[0] || null
        };
      }
    }
    
    // Last resort: try to find state anywhere
    const stateMatch = clean.match(/\b([A-Z]{2})\b/);
    if (stateMatch) {
      const state = stateMatch[1];
      const cityPart = clean.split(',')[0] || clean.split(state)[0];
      return {
        city: cityPart.trim() || null,
        state: state,
        zipCode: clean.match(/\d{5}/)?.[0] || null
      };
    }
    
    return { city: null, state: null, zipCode: null };
  }

  /**
   * Get detailed job information from job detail page
   * @param {object} page - Puppeteer page object
   * @param {object} job - Job listing object
   * @returns {Promise<object>} - Job details object
   */
  async getJobDetails(page, job) {
    if (!job.link) {
      return {
        title: job.title,
        location: job.location,
        description: job.rawText.substring(0, 1000),
        sourceUrl: null,
        extractionFailed: true
      };
    }
    
    try {
      // Check if page is still valid (not detached or closed)
      let pageIsValid = false;
      try {
        // Check if page is closed
        if (page.isClosed()) {
          throw new Error('Page is closed');
        }
        // Quick check if page frame is accessible
        await page.evaluate(() => document.title);
        pageIsValid = true;
      } catch (frameError) {
        // Page frame is detached or closed - we need to handle this differently
        // The page object might be invalid, so we can't navigate with it
        if (frameError.message.includes('closed') || frameError.message.includes('Target closed')) {
          throw new Error('Page is closed - cannot process job details');
        }
        // For detached frames, try to navigate but catch the error
        pageIsValid = false;
      }
      
      // If page is not valid, try to navigate to base URL first
      if (!pageIsValid) {
        console.log(`   ⚠️  Page frame was detached, attempting to re-establish...`);
        try {
          // Use a fresh navigation attempt
          await page.goto(this.baseUrl, { 
            waitUntil: 'networkidle2',
            timeout: 15000 
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          pageIsValid = true;
        } catch (reconnectError) {
          // If we can't reconnect, the page object is truly invalid
          throw new Error(`Page frame is detached and cannot be reconnected: ${reconnectError.message}`);
        }
      }
      
      // Navigate to job detail page
      await page.goto(job.link, { 
        waitUntil: 'networkidle2',
        timeout: 20000
      });
      
      // Wait for description element
      try {
        await page.waitForSelector(this.selectors.jobDescription, {
          timeout: 12000,
          visible: false
        });
      } catch (waitError) {
        console.log(`   ⚠️  Description element not found, continuing...`);
      }
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove scripts and styles
      await page.evaluate(() => {
        document.querySelectorAll('script, style').forEach(el => el.remove());
        document.querySelectorAll('nav, header, footer, [class*="nav"], [class*="menu"], [class*="footer"]').forEach(el => {
          el.style.display = 'none';
        });
      });

      // Extract job details
      const jobDetails = await page.evaluate((selectors) => {
        // Get ONLY the job description area (not entire page with Similar Jobs, etc.)
        const descriptionElement = document.querySelector('[data-automation-id="jobPostingDescription"]');
        const bodyText = descriptionElement ? descriptionElement.textContent : (document.body ? document.body.textContent : '');
        
        // Helper to get clean text (for non-description fields)
        const getCleanText = (element) => {
          if (!element) return null;
          const clone = element.cloneNode(true);
          clone.querySelectorAll('script, style').forEach(el => el.remove());
          let text = clone.textContent || clone.innerText || '';
          text = text.replace(/\s+/g, ' ').trim();
          return text || null;
        };

        // Helper to convert HTML to formatted markdown-style text with structure preserved
        // This preserves paragraphs, lists, headings, and adds formatting markers
        const htmlToFormattedText = (element) => {
          if (!element) return null;
          
          const clone = element.cloneNode(true);
          
          // Remove scripts and styles
          clone.querySelectorAll('script, style').forEach(el => el.remove());
          
          // Convert HTML to formatted text with markdown-style formatting
          let text = '';
          
          // Helper to check if text is bold in HTML
          const isBoldElement = (node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const tagName = node.tagName.toLowerCase();
            return tagName === 'b' || tagName === 'strong' || 
                   (node.style && node.style.fontWeight && 
                    (node.style.fontWeight === 'bold' || parseInt(node.style.fontWeight) >= 600));
          };
          
          // Helper to check if text is a heading
          const isHeadingElement = (node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const tagName = node.tagName.toLowerCase();
            return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
          };
          
          // Process each node recursively
          const processNode = (node, parentTag = null) => {
            if (node.nodeType === Node.TEXT_NODE) {
              let nodeText = node.textContent;
              // Don't add extra spaces if we're in a list item
              if (parentTag !== 'li' && nodeText.trim()) {
                text += nodeText.trim() + ' ';
              } else if (parentTag === 'li') {
                // For list items, preserve the text as-is (we'll handle spacing separately)
                text += nodeText;
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName.toLowerCase();
              const isBold = isBoldElement(node);
              const isHeading = isHeadingElement(node);
              
              // Handle headings - convert to markdown headings (## for h2, ### for h3, etc.)
              if (isHeading) {
                const level = parseInt(tagName.charAt(1)) || 2;
                const headingMark = '#'.repeat(Math.min(level + 1, 6)); // h1 -> ##, h2 -> ###, etc.
                
                if (text && !text.endsWith('\n\n')) {
                  text += '\n\n';
                }
                
                const headingText = node.textContent.trim();
                text += `${headingMark} ${headingText}\n\n`;
                return; // Don't process children, we already got the text
              }
              
              // Add line breaks for block elements (paragraphs, divs, list items, line breaks)
              if (['p', 'div', 'li', 'br'].includes(tagName)) {
                if (text && !text.endsWith('\n\n') && tagName !== 'li') {
                  text += '\n\n';
                } else if (tagName === 'li' && text && !text.endsWith('\n')) {
                  // For list items, just ensure we have a newline before
                  if (!text.endsWith('\n')) {
                    text += '\n';
                  }
                }
              }
              
              // Handle lists - add spacing before list
              if (tagName === 'ul' || tagName === 'ol') {
                if (text && !text.endsWith('\n')) {
                  text += '\n';
                }
              }
              
              // Add bullet point for list items (with proper alignment)
              if (tagName === 'li') {
                // Ensure bullet is on same line as text
                if (!text.endsWith('• ') && !text.endsWith('\n• ')) {
                  text += '• ';
                }
              }
              
              // Process children recursively
              Array.from(node.childNodes).forEach(child => {
                if (isBold && child.nodeType === Node.TEXT_NODE) {
                  // Wrap bold text in markdown bold
                  const boldText = child.textContent.trim();
                  if (boldText) {
                    // Check if this is a standalone bold paragraph (like section names)
                    // If parent is 'p' and the bold element is the only/main content, keep it on its own line
                    const isStandaloneBoldParagraph = tagName === 'p' && 
                      node.textContent.trim() === boldText && 
                      boldText.length < 100; // Reasonable length for a section heading
                    if (isStandaloneBoldParagraph) {
                      text += `**${boldText}**`;
                    } else {
                      text += `**${boldText}** `;
                    }
                  }
                } else if (isBold && child.nodeType === Node.ELEMENT_NODE) {
                  // Handle nested elements inside bold tags (like <b><span>text</span></b>)
                  const boldText = child.textContent.trim();
                  if (boldText) {
                    // Check if this is a standalone bold paragraph
                    const isStandaloneBoldParagraph = tagName === 'p' && 
                      node.textContent.trim() === boldText && 
                      boldText.length < 100;
                    if (isStandaloneBoldParagraph) {
                      text += `**${boldText}**`;
                    } else {
                      text += `**${boldText}** `;
                    }
                  }
                } else {
                  processNode(child, tagName);
                }
              });
              
              // Add line breaks after block elements
              if (['p', 'div', 'li'].includes(tagName)) {
                if (tagName === 'li') {
                  // For list items, add newline after content
                  if (!text.endsWith('\n')) {
                    text += '\n';
                  }
                } else if (!text.endsWith('\n')) {
                  text += '\n';
                }
              }
            }
          };
          
          // Process all child nodes
          Array.from(clone.childNodes).forEach(child => processNode(child));
          
          // Post-process: Add formatting for text followed by colons
          // Note: We should NOT override HTML-based formatting (e.g., <h1> or <p><b>)
          // Only match patterns that appear as plain text WITHOUT bold/heading tags in source
          let lines = text.split('\n');
          let formattedLines = [];
          
          // Only match truly major standalone headings that were NOT already processed as <h1> tags
          // These patterns should be VERY selective - only for sections that appear as plain text
          // Most headings are already handled by the HTML processor above
          const standaloneHeadingPatterns = [
            // Only include patterns that commonly appear without HTML tags in Workday
            // Most sections like "Education/Experience" are already <p><b>...</b></p> and handled as bold
          ];
          
          for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmedLine = line.trim();
            
            // Check if line matches a standalone heading pattern (very rare - most are already handled)
            let isStandaloneHeading = false;
            for (const pattern of standaloneHeadingPatterns) {
              if (pattern.test(trimmedLine)) {
                isStandaloneHeading = true;
                break;
              }
            }
            
            if (isStandaloneHeading && trimmedLine.length > 0 && trimmedLine.length < 100) {
              // Format as markdown heading (## for subheadings)
              const headingText = trimmedLine.replace(/:\s*$/, ''); // Remove trailing colon if present
              // Only add leading newline if previous line wasn't empty
              const needsLeadingNewline = formattedLines.length > 0 && formattedLines[formattedLines.length - 1].trim() !== '';
              formattedLines.push((needsLeadingNewline ? '\n' : '') + `## ${headingText}`);
            } else if (trimmedLine.length > 0) {
              // Check for text followed by colon (should be bolded ONLY if it was already bold in HTML)
              // In UHS's case, most text with colons is NOT bolded in source (e.g., "Minimum Required:")
              // We should preserve the text as-is unless it has explicit bold markers
              
              // Skip bolding for common sub-section labels that appear as plain text in source
              const plainTextLabels = /^(Minimum Required|Preferred|Required|Optional):\s*$/i;
              
              if (plainTextLabels.test(trimmedLine)) {
                // Keep as plain text - these are sub-section labels in UHS format
                formattedLines.push(line);
              } else if (trimmedLine.match(/^\*\*.*\*\*\s*$/)) {
                // Already has markdown bold from HTML processing - keep as-is
                formattedLines.push(line);
              } else {
                // Check if it's a metadata field that should be bolded (these have content after colon)
                const colonBoldPattern = /^(•\s*)?([A-Z][A-Za-z\s&/]+?):\s*(.+)$/;
                const match = trimmedLine.match(colonBoldPattern);
                
                if (match && match[3].trim().length > 0) {
                  const bullet = match[1] || '';
                  const label = match[2].trim();
                  const content = match[3].trim();
                  
                  // Only bold if it's a short metadata field (not a long sentence)
                  if (label.length < 50) {
                    formattedLines.push(`${bullet}**${label}:** ${content}`);
                  } else {
                    formattedLines.push(line);
                  }
                } else {
                  // No match or no content after colon - keep as-is
                  formattedLines.push(line);
                }
              }
            } else {
              // Empty line - preserve for spacing
              formattedLines.push('');
            }
          }
          
          text = formattedLines.join('\n');
          
          // Clean up: normalize whitespace but preserve paragraph breaks
          text = text
            .replace(/\n{3,}/g, '\n\n') // Max 2 newlines (one blank line) for better spacing
            .replace(/[ \t]+/g, ' ') // Normalize spaces (multiple spaces to single)
            .replace(/ \n/g, '\n') // Remove space before newline
            .replace(/\n /g, '\n') // Remove space after newline
            .replace(/\n•\s*\n/g, '\n• ') // Fix bullet points that got separated
            .replace(/•\s+•/g, '•') // Remove duplicate bullets
            .replace(/##\s*\n+/g, '## ') // Remove extra newlines after heading marker
            .replace(/\n+(## )/g, '\n\n$1') // Ensure exactly one blank line before headings
            .trim();
          
          return text;
        };

        // Extract description with formatted structure
        let description = null;
        const descElement = document.querySelector(selectors.jobDescription);
        if (descElement) {
          description = htmlToFormattedText(descElement);
        } else {
          // Fallback: try common Workday description selectors
          const fallbackSelectors = [
            '[data-automation-id="jobPostingDescription"]',
            '[class*="description"]',
            '[class*="job-description"]'
          ];
          for (const selector of fallbackSelectors) {
            const el = document.querySelector(selector);
            if (el) {
              description = htmlToFormattedText(el);
              if (description && description.length > 500) break;
            }
          }
        }
        
        // If still no description, try to get formatted text from main content area
        if (!description || description.length < 500) {
          // Try to find the main job content area
          const mainContentSelectors = [
            '[data-automation-id="jobPostingDescription"]',
            'main',
            '[role="main"]',
            '[class*="job-posting"]',
            '[class*="job-content"]'
          ];
          for (const selector of mainContentSelectors) {
            const el = document.querySelector(selector);
            if (el) {
              const formatted = htmlToFormattedText(el);
              if (formatted && formatted.length > 500) {
                description = formatted;
                break;
              }
            }
          }
        }

        // Extract title (skip generic site headers)
        let title = null;
        const titleSelectors = [
          'h1[data-automation-id*="job"]', // Workday-specific job title
          '[data-automation-id="jobPostingHeader"] h1', // Title within job header
          '[class*="job-title"]',
          'h1' // Generic h1 as fallback
        ];
        
        const genericTitles = ['career opportunities', 'careers', 'jobs', 'job search'];
        
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const extractedTitle = el.textContent.trim();
            const isGeneric = genericTitles.some(generic => 
              extractedTitle.toLowerCase() === generic
            );
            
            // Only accept if it's not a generic site header and is reasonable length
            if (!isGeneric && extractedTitle.length > 0 && extractedTitle.length < 200) {
              title = extractedTitle;
              break;
            }
          }
        }

        // Extract location from dedicated location field (with map pin icon)
        // Workday uses data-automation-id="locations" for the location field in job detail page
        let location = null;
        
        // Method 1: Try Workday's standard location selectors (dedicated field)
        const locationSelectors = [
          '[data-automation-id="locations"]', // Standard Workday location field
          '[data-automation-id="jobLocation"]', // Alternative location field
          'span[data-automation-id="locations"]', // Span with location
          'div[data-automation-id="locations"]', // Div with location
          '[data-automation-id="jobPostingHeader"] [data-automation-id="locations"]' // Nested in header
        ];
        
        for (const selector of locationSelectors) {
          const locationElement = document.querySelector(selector);
          if (locationElement) {
            const locationText = getCleanText(locationElement);
            // Validate it looks like a location (City, State format)
            if (locationText && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s+[A-Z]{2}$/.test(locationText)) {
              location = locationText;
              break;
            }
          }
        }
        
        // Method 2: Look for location near map pin icon in metadata section
        if (!location) {
          // Find element with map pin icon (usually an svg or icon element)
          const mapPinIcon = document.querySelector('svg[class*="location"], [class*="location-icon"], [aria-label*="location" i], [data-automation-id*="location" i]');
          if (mapPinIcon) {
            // Get the parent or next sibling that contains location text
            let locationElement = mapPinIcon.parentElement;
            if (locationElement) {
              const locationText = getCleanText(locationElement);
              const locationMatch = locationText ? locationText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})/) : null;
              if (locationMatch) {
                location = locationMatch[0];
              }
            }
          }
        }
        
        // Method 3: Look in metadata section (last resort - but validate format)
        if (!location) {
          const metadataSelectors = [
            '[data-automation-id="jobPostingHeader"]',
            '[class*="job-header"]',
            '[class*="metadata"]'
          ];
          for (const selector of metadataSelectors) {
            const el = document.querySelector(selector);
            if (el) {
              const text = getCleanText(el);
              // Only accept if it matches proper location format
              const locationMatch = text ? text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})$/) : null;
              if (locationMatch && locationMatch[0].length < 50) {
                location = locationMatch[0];
                break;
              }
            }
          }
        }

        // Extract employment type from dedicated field (with briefcase icon)
        // Workday uses data-automation-id="timeType" or similar for employment type
        let employmentType = null;
        
        // Method 1: Try Workday's standard employment type selectors (dedicated field)
        const employmentTypeSelectors = [
          '[data-automation-id="timeType"]', // Standard Workday employment type field
          '[data-automation-id="jobPostingHeader"] [data-automation-id="timeType"]', // Nested in header
          'span[data-automation-id="timeType"]', // Span with employment type
          'div[data-automation-id="timeType"]' // Div with employment type
        ];
        
        // *** METHOD 1: Check "Scheduled Weekly Hours:" FIRST (most reliable) ***
        // 36+ = Full Time (healthcare standard), 1-35 = Part Time
        const weeklyHoursMatch = bodyText.match(/Scheduled Weekly Hours:[\s\n]*(\d+)/i);
        if (weeklyHoursMatch) {
          const hours = parseInt(weeklyHoursMatch[1]);
          if (!isNaN(hours) && hours > 0) {
            if (hours >= 36) {
              employmentType = 'Full Time';
            } else if (hours >= 1 && hours < 36) {
              employmentType = 'Part Time';
            }
          }
          // If hours is 0, continue to other methods
        }
        
        // Method 2: Look for Workday-specific employment type fields (if hours not found or is 0)
        if (!employmentType) {
          for (const selector of employmentTypeSelectors) {
            const employmentElement = document.querySelector(selector);
            if (employmentElement) {
              const employmentText = getCleanText(employmentElement);
              if (employmentText) {
                const employmentLower = employmentText.toLowerCase();
                if (employmentLower.includes('full time') || employmentLower.includes('full-time')) {
                  employmentType = 'Full Time';
                } else if (employmentLower.includes('part time') || employmentLower.includes('part-time')) {
                  employmentType = 'Part Time';
                } else if (employmentLower.includes('prn')) {
                  employmentType = 'PRN';
                } else if (employmentLower.includes('contract')) {
                  employmentType = 'Contract';
                } else {
                  // Use the text as-is if it's short and looks valid
                  if (employmentText.length < 50) {
                    employmentType = employmentText;
                  }
                }
                if (employmentType) break;
              }
            }
          }
        }
        
        // Method 3: REMOVED briefcase icon method - causes false positives from benefits text
        
        // Method 4: Check for explicit PRN/Per Diem/On-Call mentions (must be a position type, not just a preference)
        if (!employmentType) {
          if (bodyText.match(/\b(prn|per diem|per-diem)\s+(position|role|schedule|basis|nurse|rn)/i) ||
              bodyText.match(/\b(on-call|on call)\s+(position|role|schedule|basis|nurse|rn)/i)) {
            employmentType = 'PRN';
          }
        }
        
        // NO GENERIC TEXT SEARCHES - Hours and specific fields only
        // This prevents false positives from benefits descriptions like "24+ hours/week eligibility"

        // Extract shift type (UHS-specific: use "Primary Work Shift:" field first)
        // Skip shift detection for "Expression of Interest" positions
        let shiftType = null;
        
        // Check if this is an "Expression of Interest" job - these are not regular scheduled positions
        const isExpressionOfInterest = title && title.toLowerCase().includes('expression of interest');
        
        if (!isExpressionOfInterest) {
          // Method 1: Look for "Primary Work Shift:" field (UHS Workday standard)
          // Allow for newlines between field name and value
          const primaryShiftMatch = bodyText.match(/Primary Work Shift:[\s\n]*([^\n]+)/i);
          if (primaryShiftMatch) {
            const shiftValue = primaryShiftMatch[1].trim().toLowerCase();
            // Only set if not empty
            if (shiftValue && shiftValue.length > 0 && shiftValue !== '0' && shiftValue !== 'n/a') {
              // Check for rotating/variable FIRST (e.g., "Day Rotational" should be "rotating", not "days")
              if (shiftValue.includes('rotational') || shiftValue.includes('rotating')) shiftType = 'rotating';
              else if (shiftValue.includes('variable') || shiftValue.includes('varied') || 
                       shiftValue.includes('multiple') || shiftValue.includes('various') || 
                       shiftValue.includes('flexible') || shiftValue.includes('all shifts') ||
                       shiftValue.includes('mixed')) shiftType = 'variable';
              else if (shiftValue.includes('night')) shiftType = 'nights';
              else if (shiftValue.includes('evening')) shiftType = 'evenings';
              else if (shiftValue.includes('day')) shiftType = 'days';
            }
          }
        
          // Method 2: Fallback to generic "Shift:" field if Primary Work Shift is empty
          if (!shiftType) {
            const shiftMatch = bodyText.match(/Shift:[\s\n]*([^\n]+)/i);
            if (shiftMatch) {
              const shiftValue = shiftMatch[1].trim().toLowerCase();
              if (shiftValue && shiftValue.length > 0) {
                // Check rotating/variable FIRST (same as Method 1)
                if (shiftValue.includes('rotational') || shiftValue.includes('rotating')) shiftType = 'rotating';
                else if (shiftValue.includes('variable') || shiftValue.includes('varied') || 
                         shiftValue.includes('multiple') || shiftValue.includes('various') || 
                         shiftValue.includes('flexible') || shiftValue.includes('all shifts') ||
                         shiftValue.includes('mixed')) shiftType = 'variable';
                else if (shiftValue.includes('night')) shiftType = 'nights';
                else if (shiftValue.includes('evening')) shiftType = 'evenings';
                else if (shiftValue.includes('day')) shiftType = 'days';
              }
            }
          }
          
          // Method 3: Look for shift keywords in Schedule field (only if not found above)
          if (!shiftType) {
            const scheduleMatch = bodyText.match(/Schedule:[\s\n]*([^\n]+)/i);
            if (scheduleMatch) {
              const scheduleValue = scheduleMatch[1].trim().toLowerCase();
              // Only check explicit shift mentions in Schedule field, not general description
              if (scheduleValue.match(/\b(rotating|rotational)\b/)) shiftType = 'rotating';
              else if (scheduleValue.includes('variable') || scheduleValue.includes('multiple') || 
                       scheduleValue.includes('various') || scheduleValue.includes('flexible')) shiftType = 'variable';
              else if (scheduleValue.match(/\b(day|days)\b/) && !scheduleValue.includes('night')) shiftType = 'days';
              else if (scheduleValue.includes('night')) shiftType = 'nights';
              else if (scheduleValue.includes('evening')) shiftType = 'evenings';
            }
          }
        }

        // Extract salary (if available) - Workday-specific patterns
        let salaryMin = null;
        let salaryMax = null;
        let salaryType = null;
        
        // Method 1: Look for Workday's "Pay Range" or "Compensation" section
        // Try to find dedicated salary field with data-automation-id
        const salarySelectors = [
          '[data-automation-id="compensation"]',
          '[data-automation-id="payRange"]',
          '[data-automation-id="salary"]',
          '[class*="compensation"]',
          '[class*="pay-range"]',
          '[class*="salary"]'
        ];
        
        let salaryText = null;
        for (const selector of salarySelectors) {
          const salaryElement = document.querySelector(selector);
          if (salaryElement) {
            salaryText = getCleanText(salaryElement);
            if (salaryText && salaryText.length < 200) {
              break;
            }
          }
        }
        
        // Method 2: Look for "Compensation Range", "Pay Range", or "Salary Range" in description/body text
        if (!salaryText) {
          // Pattern: "Compensation Range: $XX,XXX - $XX,XXX" (UHS uses this)
          // Also matches: "Pay Range:", "Salary Range:", etc.
          const payRangePattern = /(?:Compensation\s+Range|Pay\s+Range|Salary\s+Range|Compensation|Pay|Salary)[:\s]+(?:USD\s+)?\$?([\d,]+\.?\d*)\s*[-–—to]+\s*\$?([\d,]+\.?\d*)/i;
          const payRangeMatch = bodyText.match(payRangePattern);
          if (payRangeMatch) {
            salaryText = payRangeMatch[0];
          }
        }
        
        // Method 3: Look for hourly/annual patterns with min/max
        if (!salaryText) {
          const hourlyMinMatch = bodyText.match(/minimum\s+hourly[:\s]+(?:USD\s+)?\$?([\d,]+\.?\d*)/i);
          const hourlyMaxMatch = bodyText.match(/maximum\s+hourly[:\s]+(?:USD\s+)?\$?([\d,]+\.?\d*)/i);
          
          const annualMinMatch = bodyText.match(/minimum\s+annual\s+salary[:\s]+(?:USD\s+)?\$?([\d,]+\.?\d*)/i);
          const annualMaxMatch = bodyText.match(/maximum\s+annual\s+salary[:\s]+(?:USD\s+)?\$?([\d,]+\.?\d*)/i);
          
          if (hourlyMinMatch || hourlyMaxMatch) {
            salaryType = 'hourly';
            if (hourlyMinMatch) {
              salaryMin = Math.round(parseFloat(hourlyMinMatch[1].replace(/,/g, '')));
            }
            if (hourlyMaxMatch) {
              salaryMax = Math.round(parseFloat(hourlyMaxMatch[1].replace(/,/g, '')));
            }
            if (hourlyMinMatch && !hourlyMaxMatch) {
              salaryMax = salaryMin; // Single value
            }
          } else if (annualMinMatch || annualMaxMatch) {
            salaryType = 'annual';
            if (annualMinMatch) {
              salaryMin = Math.round(parseFloat(annualMinMatch[1].replace(/,/g, '')));
            }
            if (annualMaxMatch) {
              salaryMax = Math.round(parseFloat(annualMaxMatch[1].replace(/,/g, '')));
            }
            if (annualMinMatch && !annualMaxMatch) {
              salaryMax = salaryMin; // Single value
            }
          }
        }
        
        // Method 4: Parse salary text if we found it
        if (salaryText && !salaryMin && !salaryMax) {
          // Pattern: "$XX,XXX - $XX,XXX" or "$XX,XXX to $XX,XXX"
          const rangePattern = /\$?([\d,]+\.?\d*)\s*[-–—to]+\s*\$?([\d,]+\.?\d*)/i;
          const rangeMatch = salaryText.match(rangePattern);
          
          if (rangeMatch) {
            salaryMin = Math.round(parseFloat(rangeMatch[1].replace(/,/g, '')));
            salaryMax = Math.round(parseFloat(rangeMatch[2].replace(/,/g, '')));
            
            // Determine type from context
            const textLower = salaryText.toLowerCase();
            if (textLower.includes('hourly') || textLower.includes('per hour') || textLower.includes('/hour')) {
              salaryType = 'hourly';
            } else if (textLower.includes('annual') || textLower.includes('per year') || textLower.includes('/year') || textLower.includes('yearly')) {
              salaryType = 'annual';
            } else {
              // Default to annual for large numbers, hourly for smaller
              if (salaryMin > 100000) {
                salaryType = 'annual';
              } else if (salaryMin < 50) {
                salaryType = 'hourly';
              } else {
                // Could be either - check if it's in a range that makes sense
                salaryType = salaryMin > 1000 ? 'annual' : 'hourly';
              }
            }
          } else {
            // Single value pattern
            const singlePattern = /\$?([\d,]+\.?\d*)/;
            const singleMatch = salaryText.match(singlePattern);
            if (singleMatch) {
              const value = Math.round(parseFloat(singleMatch[1].replace(/,/g, '')));
              salaryMin = value;
              salaryMax = value;
              
              // Determine type from context
              const textLower = salaryText.toLowerCase();
              if (textLower.includes('hourly') || textLower.includes('per hour') || textLower.includes('/hour')) {
                salaryType = 'hourly';
              } else if (textLower.includes('annual') || textLower.includes('per year') || textLower.includes('/year')) {
                salaryType = 'annual';
              } else {
                salaryType = value > 1000 ? 'annual' : 'hourly';
              }
            }
          }
        }
        
        // Method 5: Fallback to simple pattern matching in body text
        if (!salaryMin && !salaryMax) {
          const salaryPattern = /(?:hourly|annual|salary)[:\s]+(?:USD\s+)?\$?([\d,]+\.?\d*)(?:\s*[-–—]\s*\$?([\d,]+\.?\d*))?/i;
          const salaryMatch = bodyText.match(salaryPattern);
          if (salaryMatch) {
            salaryMin = Math.round(parseFloat(salaryMatch[1].replace(/,/g, '')));
            if (salaryMatch[2]) {
              salaryMax = Math.round(parseFloat(salaryMatch[2].replace(/,/g, '')));
            } else {
              salaryMax = salaryMin;
            }
            
            // Determine type
            const matchText = salaryMatch[0].toLowerCase();
            if (matchText.includes('hourly')) {
              salaryType = 'hourly';
            } else {
              salaryType = 'annual';
            }
          }
        }

        // If description is still not found or too short, use formatted body text as fallback
        if (!description || description.length < 500) {
          // Try to format the body text nicely
          const bodyElement = document.body;
          if (bodyElement) {
            description = htmlToFormattedText(bodyElement);
            // Limit to reasonable length (5000 chars)
            if (description && description.length > 5000) {
              description = description.substring(0, 5000) + '...';
            }
          } else {
            // Last resort: plain text
            description = bodyText.substring(0, 5000);
          }
        }

        return {
          title: title || document.title.replace(/\s*[-|]\s*.*$/, '').trim(),
          location: location,
          description: description || bodyText.substring(0, 5000),
          employmentType: employmentType,
          shiftType: shiftType,
          isRemote: bodyText.toLowerCase().includes('remote'),
          sourceUrl: window.location.href,
          salaryMin: salaryMin,
          salaryMax: salaryMax,
          salaryType: salaryType
        };
      }, this.selectors);
      
      return jobDetails;
      
    } catch (error) {
      // Check if it's a frame detachment error
      if (error.message.includes('detached') || error.message.includes('Target closed') || error.message.includes('Frame was detached')) {
        console.log(`   ⚠️  Frame detachment error: ${error.message}`);
        console.log(`   🔄 Attempting to recover by navigating to base URL...`);
        
        try {
          // Try to recover by navigating to base URL
          await page.goto(this.baseUrl, { 
            waitUntil: 'networkidle2',
            timeout: 15000 
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try one more time to get job details
          try {
            await page.goto(job.link, { 
              waitUntil: 'networkidle2',
              timeout: 20000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Quick extraction attempt
            const quickDetails = await page.evaluate(() => {
              return {
                title: document.querySelector('h1')?.textContent?.trim() || document.title,
                description: document.body?.textContent?.substring(0, 5000) || '',
                location: document.body?.textContent?.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})/)?.[0] || null
              };
            });
            
            if (quickDetails.description && quickDetails.description.length > 500) {
              console.log(`   ✅ Recovered and extracted job details`);
              return {
                title: quickDetails.title || job.title,
                location: quickDetails.location || job.location,
                description: quickDetails.description,
                sourceUrl: job.link,
                extractionFailed: false
              };
            }
          } catch (retryError) {
            // Recovery failed
          }
        } catch (recoveryError) {
          // Recovery attempt failed
        }
      }
      
      console.log(`   ⚠️  Error getting job details: ${error.message}`);
      return {
        title: job.title,
        location: job.location,
        description: job.rawText.substring(0, 1000),
        sourceUrl: job.link,
        extractionFailed: true
      };
    }
  }

  /**
   * Generate meta description for SEO
   * @param {object} job - Job object
   * @returns {string} - Meta description
   */
  generateMetaDescription(job) {
    const parts = [
      job.title,
      `in ${job.city}, ${job.state}`,
      job.specialty ? `(${job.specialty} specialty)` : '',
      job.jobType ? `- ${job.jobType}` : ''
    ].filter(p => p);
    
    return parts.join(' ') + `. Find RN nursing jobs at ${this.employerName}.`;
  }

  /**
   * Generate keywords for SEO
   * @param {object} job - Job object
   * @returns {Array<string>} - Keywords array
   */
  generateKeywords(job) {
    const keywords = [
      'registered nurse',
      'rn jobs',
      'nursing jobs',
      job.city?.toLowerCase(),
      job.state?.toLowerCase(),
      job.specialty?.toLowerCase(),
      this.employerName.toLowerCase()
    ].filter(k => k);
    
    return keywords;
  }
}

module.exports = WorkdayRNScraper;

