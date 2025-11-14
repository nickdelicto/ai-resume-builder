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
 * Northwell Health RN Job Scraper - Production Version
 * Conforms to scraper data contract and uses normalization utilities
 * 
 * NOTE: CSS selectors and extraction patterns marked with "TODO: INSPECT & UPDATE"
 * need to be adapted based on Northwell's actual site structure
 */

class NorthwellHealthRNScraper {
  constructor(options = {}) {
    // Updated URLs based on site inspection
    this.baseUrl = 'https://jobs.northwell.edu/';
    // Use Nursing category filter - gets all nursing roles (includes RN)
    this.searchUrl = 'https://jobs.northwell.edu/job-search-results/?category[]=Nursing';
    this.employerName = 'Northwell Health';
    this.employerSlug = generateEmployerSlug(this.employerName);
    this.careerPageUrl = this.baseUrl;
    this.atsPlatform = 'custom';
    this.jobs = [];
    this.saveToDatabase = options.saveToDatabase !== false; // Default true
    this.jobService = options.jobService || new JobBoardService();
    this.maxPages = options.maxPages || null; // Limit pages for testing (null = no limit)
  }

  /**
   * Get total number of pages from pagination
   * @param {object} page - Puppeteer page object
   * @returns {Promise<number>} - Total pages or null if cannot determine
   */
  async getTotalPages(page) {
    try {
      const totalPages = await page.evaluate(() => {
        // Find all page number links
        // TODO: INSPECT & UPDATE - Check if Northwell uses same pagination pattern
        const allLinks = Array.from(document.querySelectorAll('a'));
        const pageLinks = allLinks.filter(link => {
          const text = link.textContent.trim();
          return /^\d+$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 1000;
        });
        
        if (pageLinks.length > 0) {
          const pageNumbers = pageLinks.map(link => parseInt(link.textContent.trim()));
          return Math.max(...pageNumbers);
        }
        
        // Alternative: Look for "page X of Y" text
        const bodyText = document.body.textContent;
        const pageOfMatch = bodyText.match(/page\s+(\d+)\s+of\s+(\d+)/i);
        if (pageOfMatch) {
          return parseInt(pageOfMatch[2]);
        }
        
        return null;
      });
      
      return totalPages;
    } catch (error) {
      console.log(`⚠️ Could not determine total pages: ${error.message}`);
      return null;
    }
  }

  /**
   * Navigate to a specific page using URL parameter
   * @param {object} page - Puppeteer page object
   * @param {number} pageNum - Page number (1-based)
   * @returns {Promise<boolean>} - True if navigation successful
   */
  async navigateToPage(page, pageNum) {
    try {
      let pageUrl = this.searchUrl;
      if (pageNum > 1) {
        // Northwell pagination - need to check actual parameter name
        // Based on inspection, pagination links exist but need to verify URL param format
        const urlObj = new URL(pageUrl);
        
        // Try 'page' parameter (most common pattern)
        urlObj.searchParams.set('page', pageNum);
        
        pageUrl = urlObj.toString();
      }
      
      await page.goto(pageUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for content to load (JavaScript pagination needs time)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return true;
    } catch (error) {
      console.error(`❌ Error navigating to page ${pageNum}: ${error.message}`);
      return false;
    }
  }

  /**
   * Collect all job listings from all pages
   * @param {object} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of all job listings from all pages
   */
  async collectAllJobsFromAllPages(page) {
    console.log('📚 Collecting jobs from all pages...\n');
    
    // Navigate to first page to get initial page count (but don't trust it - dynamic pagination reveals more)
    await this.navigateToPage(page, 1);
    const initialPageCount = await this.getTotalPages(page);
    
    if (initialPageCount) {
      console.log(`📄 Initially visible: ${initialPageCount} pages (but more may be available via dynamic pagination)\n`);
    } else {
      console.log('⚠️  Cannot determine initial page count, will use dynamic detection\n');
    }
    
    const allJobs = [];
    let currentPage = 1;
    // Use constructor maxPages if set, otherwise use high safety limit
    let maxPages = this.maxPages || 100;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 2; // Stop after 2 empty pages
    
    if (this.maxPages) {
      console.log(`📌 Page limit set: will process up to ${this.maxPages} pages\n`);
    }
    
    // IMPORTANT: Don't stop at initial page count - dynamic pagination reveals more pages as we navigate
    while (currentPage <= maxPages) {
      console.log(`📄 Processing page ${currentPage}...`);
      
      // Navigate to current page
      const navSuccess = await this.navigateToPage(page, currentPage);
      if (!navSuccess) {
        console.log(`⚠️  Failed to navigate to page ${currentPage}, skipping...`);
        currentPage++;
        continue;
      }
      
      // Extract jobs from this page
      const pageJobs = await this.extractJobListings(page);
      console.log(`   Found ${pageJobs.length} jobs on page ${currentPage}`);
      
      if (pageJobs.length === 0) {
        consecutiveEmptyPages++;
        console.log(`   ⚠️  Empty page detected (${consecutiveEmptyPages}/${maxEmptyPages})`);
        
        if (consecutiveEmptyPages >= maxEmptyPages) {
          console.log(`\n✅ Reached end of results (${consecutiveEmptyPages} empty pages)`);
          break;
        }
      } else {
        consecutiveEmptyPages = 0; // Reset counter
        allJobs.push(...pageJobs);
        console.log(`   ✅ Added ${pageJobs.length} jobs (Total collected: ${allJobs.length})`);
      }
      
      // Continue to next page - don't stop based on initial page count
      // Dynamic pagination reveals more pages as we navigate, so we rely on empty page detection
      currentPage++;
      
      // Add delay between pages to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 Collection complete: ${allJobs.length} total jobs found across ${currentPage - 1} pages\n`);
    return allJobs;
  }

  async scrapeRNJobs() {
    console.log('🚀 Starting Northwell Health RN Job Scraping (Production)...');
    console.log(`Search URL: ${this.searchUrl}`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // PHASE 1: Collect ALL jobs from ALL pages
      const allJobListings = await this.collectAllJobsFromAllPages(page);
      
      if (allJobListings.length === 0) {
        console.log('⚠️  No jobs found on any page');
        return {
          success: false,
          error: 'No jobs found',
          jobs: []
        };
      }
      
      // Filter for RN-specific positions
      console.log('🎯 Filtering for RN-specific positions...');
      const rnJobs = this.filterRNJobs(allJobListings);
      console.log(`✅ Found ${rnJobs.length} RN-specific positions out of ${allJobListings.length} total jobs\n`);
      
      if (rnJobs.length === 0) {
        console.log('⚠️  No RN-specific jobs found');
        return {
          success: false,
          error: 'No RN jobs found',
          jobs: []
        };
      }
      
      // PHASE 2: Get detailed information for each RN job
      console.log(`🔍 Processing detailed information for ${rnJobs.length} RN jobs...\n`);
      const detailedJobs = [];
      let processedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < rnJobs.length; i++) {
        processedCount++;
        const job = rnJobs[i];
        console.log(`[${processedCount}/${rnJobs.length}] Processing: ${job.title}`);
        
        try {
          const normalizedJob = await this.processJob(page, job);
          
          // Validate the job data
          const validation = validateJobData(normalizedJob);
          if (validation.valid) {
            detailedJobs.push(normalizedJob);
            console.log(`   ✅ Validated and added`);
          } else {
            errorCount++;
            console.log(`   ⚠️  Validation failed: ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          errorCount++;
          console.log(`   ❌ Error processing job: ${error.message}`);
        }
        
        // Add delay between requests to avoid overwhelming the server
        if (i < rnJobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      this.jobs = detailedJobs;
      
      console.log(`\n🎉 Scraping complete!`);
      console.log(`   Total jobs found: ${allJobListings.length}`);
      console.log(`   RN jobs found: ${rnJobs.length}`);
      console.log(`   Successfully processed: ${detailedJobs.length}`);
      console.log(`   Errors/Invalid: ${errorCount}`);
      
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
        rnJobs: rnJobs.length,
        validatedJobs: this.jobs.length,
        jobs: this.jobs,
        saveResults: saveResults,
        stats: {
          totalListings: allJobListings.length,
          rnListings: rnJobs.length,
          successfullyProcessed: detailedJobs.length,
          errors: errorCount
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
   * Extract job listings from the current page
   * UPDATED: Based on site inspection - using actual Northwell selectors
   */
  async extractJobListings(page) {
    console.log('📋 Extracting job listings from page...');
    
    const jobListings = await page.evaluate(() => {
      // Northwell uses .job.clearfix for each job listing
      const jobElements = document.querySelectorAll('.job.clearfix');
      const jobs = [];
      
      jobElements.forEach((jobElement) => {
        try {
          // Job ID is in div.job-data.ref (reference number)
          const refElement = jobElement.querySelector('.job-data.ref');
          const jobIdValue = refElement ? refElement.textContent.trim() : null;
          
          // Title is in .jobTitle > a
          const titleElement = jobElement.querySelector('.jobTitle a');
          const title = titleElement ? titleElement.textContent.trim() : null;
          
          // Link is the href from title link (might be relative, need to make absolute)
          const linkElement = jobElement.querySelector('.jobTitle a');
          let link = linkElement ? linkElement.href : null;
          
          // Make link absolute if it's relative
          if (link && !link.startsWith('http')) {
            link = new URL(link, window.location.origin).href;
          }
          
          if (title && link) {
            // Extract location and other details from specific elements
            const jobText = jobElement.textContent;
            const lines = jobText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            let location = null;
            let employmentType = null;
            let department = null;
            
            // Location is in .job-data.city_state_or_locationtype > .parent.location
            const locationEl = jobElement.querySelector('.job-data.city_state_or_locationtype .parent.location');
            if (locationEl) {
              location = locationEl.textContent.trim();
            }
            
            // If not found, try the parent element directly
            if (!location) {
              const cityStateEl = jobElement.querySelector('.job-data.city_state_or_locationtype');
              if (cityStateEl) {
                location = cityStateEl.textContent.trim();
              }
            }
            
            // If still not found, parse from text lines
            if (!location) {
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Look for location patterns: "City, ST" or "City Heights, ST" etc
                const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Heights?|Hts?|Beach|Hills|City|Town|Burg|Port|Haven))?),?\s+[A-Z]{2}(?:\s+US)?/;
                const match = line.match(locationPattern);
                if (match && match[0].length < 100) { // Reasonable length check
                  location = match[0].replace(/\s+US$/, '').trim();
                  break;
                }
              }
            }
            
            // Look for employment type in text (not always visible on listing page)
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.match(/^(Full\s+Time|Part\s+Time|PRN|Remote|Contract)$/i)) {
                employmentType = line;
                break;
              }
            }
            
            // Look for department/facility (might be in primary_category or other fields)
            // Primary category shows "Nursing" - department might be in description
            const primaryCategoryEl = jobElement.querySelector('.job-data.primary_category');
            if (primaryCategoryEl) {
              department = primaryCategoryEl.textContent.trim();
            }
            
            jobs.push({
              jobId: jobIdValue,
              title: title,
              location: location,
              employmentType: employmentType,
              department: department,
              link: link,
              rawText: jobText
            });
          }
          
        } catch (error) {
          console.log(`Error processing job element:`, error.message);
        }
      });
      
      return jobs;
    });
    
    return jobListings;
  }

  /**
   * Check if text contains explicit RN/Registered Nurse mention
   * @param {string} text - Text to check
   * @returns {boolean} - True if RN/Registered Nurse is mentioned
   */
  hasRNMention(text) {
    if (!text) return false;
    
    const rnIndicators = [
      /\brn\b/i,                    // "RN" as whole word (case insensitive)
      /\bregistered nurse\b/i,      // "Registered Nurse" as phrase
      /\br\.n\.\b/i,                // "R.N." abbreviation
      /\br\. n\.\b/i                // "R. N." with spaces
    ];
    
    return rnIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Check if title indicates a non-RN support role (exclude these)
   * NOTE: We keep roles that might require RN (like Lactation Consultant, Case Manager)
   * @param {string} title - Job title
   * @returns {boolean} - True if should be excluded
   */
  isNonRNTitle(title) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    
    // Non-RN support roles to exclude by title
    const nonRNTitles = [
      'surgical technologist',
      'surgical technician',
      'clinical assistant',
      'clinical technician',
      'home health aide',
      'hospice home health aide',
      'patient care assistant',
      'patient care aide',
      'patient care nursing assistant',
      'pcna',
      'health unit coordinator',
      'nursing department assistant',
      'utilization management specialist',
      'outpatient clinical care assistant',
      'clinical care assistant',
      'advanced endoscopy technician',
      'certified surgical technician',
      'nursing assistant', // Different from RN - this is CNA/STNA
      'nurse aide',
      'patient care tech',
      'patient care technician',
      'nurse technician',
      'LPN',
      'LVN',
      'CNA',
      'Certified Nursing Assistant',
      'STNA',
      'Certified Surgical Technician',
      'Certified Clinical Assistant',
      'Certified Clinical Technician',
      'Certified Patient Care Assistant',
      'Certified Patient Care Aide',
      'Certified Patient Care Nursing Assistant',
      'Certified Health Unit Coordinator',
      'Certified Nursing Department Assistant',
      'Licensed Nursing Assistant',
      'Licensed Vocational Nursing Assistant',
      'Licensed Nursing Assistant',
      'Licensed Practical Nurse',
      'Licensed Vocational Nurse',
    ];
    
    // Check if title matches any non-RN role
    for (const nonRNTitle of nonRNTitles) {
      if (titleLower.includes(nonRNTitle)) {
        return true; // Exclude this job
      }
    }
    
    // Also check for patterns like "Technologist", "Technician" when combined with medical terms
    const techPatterns = [
      /surgical\s+tech/i,
      /medical\s+tech/i,
      /clinical\s+tech/i,
      /patient\s+care\s+tech/i
    ];
    
    for (const pattern of techPatterns) {
      if (pattern.test(titleLower)) {
        return true;
      }
    }
    
    return false; // Keep it for further checking
  }

  /**
   * Check if RN is mentioned in exclusion context (assists RN, works with RN, etc.)
   * @param {string} text - Description text
   * @returns {boolean} - True if RN is mentioned but in wrong context (should exclude)
   */
  hasRNExclusionContext(text) {
    if (!text) return false;
    
    const textLower = text.toLowerCase();
    
    // Patterns where RN is mentioned but job doesn't REQUIRE RN (it assists/works with RN)
    const exclusionContexts = [
      /\bassists\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bassisting\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bassist\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bunder\s+(?:the\s+)?supervision\s+of\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bsupervised\s+by\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bworks?\s+with\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bworking\s+with\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bparticipates?\s+with\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bparticipating\s+with\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bsupports?\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bsupporting\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bcollaborates?\s+with\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bcollaborating\s+with\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\baids?\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\baiding\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bhelps?\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bhelping\s+(?:the\s+)?(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bprovides?\s+support\s+to\s+(?:rn|registered\s+nurse|r\.n\.)\b/i,
      /\bin\s+support\s+of\s+(?:rn|registered\s+nurse|r\.n\.)\b/i
    ];
    
    // Check if any exclusion context pattern matches
    for (const pattern of exclusionContexts) {
      if (pattern.test(textLower)) {
        return true; // RN mentioned but in wrong context - exclude
      }
    }
    
    return false; // No exclusion context found
  }

  /**
   * Check if description is placeholder/incomplete
   * @param {string} description - Job description
   * @returns {boolean} - True if description is placeholder
   */
  isPlaceholderDescription(description) {
    if (!description) return true;
    
    const descLower = description.toLowerCase().trim();
    
    // Check for placeholder text patterns
    const placeholderPatterns = [
      /job\s+description\s+is\s+being\s+updated/i,
      /please\s+visit\s+(?:the\s+)?employer\s+website/i,
      /full\s+details/i,
      /description\s+coming\s+soon/i,
      /description\s+to\s+be\s+added/i,
      /details\s+to\s+follow/i
    ];
    
    // If description is very short and contains placeholder text
    if (descLower.length < 200) {
      for (const pattern of placeholderPatterns) {
        if (pattern.test(descLower)) {
          return true;
        }
      }
    }
    
    return false;
  }

  filterRNJobs(jobListings) {
    console.log('🎯 Filtering out clearly NON-RN positions by title (will check full descriptions later)...');
    
    // Phase 1: Exclude jobs with non-RN titles (but keep roles that might require RN)
    const rnJobs = jobListings.filter(job => {
      const title = job.title || '';
      
      // Exclude if title clearly indicates non-RN role
      if (this.isNonRNTitle(title)) {
        return false; // Exclude this job
      }
      
      // Everything else passes through for full description check
      return true;
    });
    
    console.log(`✅ Kept ${rnJobs.length} jobs for detailed checking (excluded ${jobListings.length - rnJobs.length} non-RN positions by title)`);
    
    return rnJobs;
  }

  async processJob(page, job) {
    // Get detailed job information
    const jobDetails = await this.getJobDetails(page, job);
    
    // Validate RN requirement: must have RN/Registered Nurse in title OR full description
    const title = job.title || jobDetails.title || '';
    const fullDescription = jobDetails.description || job.rawText || '';
    
    // Check for placeholder/incomplete description
    const isPlaceholder = this.isPlaceholderDescription(fullDescription);
    
    // Check for RN exclusion context (assists RN, works with RN, etc.)
    const hasExclusionContext = this.hasRNExclusionContext(fullDescription);
    
    // If description has exclusion context (assists RN, etc.), exclude this job
    if (hasExclusionContext) {
      throw new Error(`Job "${title}" mentions RN but in supporting role context (assists/works with RN), not requiring RN license`);
    }
    
    // Skip jobs with placeholder descriptions - can't verify RN requirement
    if (isPlaceholder) {
      throw new Error(`Job "${title}" has placeholder/incomplete description - cannot verify RN requirement`);
    }
    
    // Description exists - check for RN requirement
    const titleHasRN = this.hasRNMention(title);
    const descriptionHasRN = this.hasRNMention(fullDescription);
    
    // If title doesn't have RN, description must have it
    if (!titleHasRN && !descriptionHasRN) {
      throw new Error(`Job "${title}" does not explicitly mention RN or Registered Nurse in title or description`);
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
      jobType: normalizeJobType(job.employmentType || jobDetails.employmentType),
      shiftType: jobDetails.shiftType || null,
      specialty: detectSpecialty(job.title, jobDetails.description || job.rawText),
      experienceLevel: detectExperienceLevel(job.title, jobDetails.description || job.rawText),
      requirements: jobDetails.requirements || null,
      responsibilities: jobDetails.responsibilities || null,
      benefits: jobDetails.benefits || null,
      department: job.department || jobDetails.department || null,
      salaryMin: jobDetails.salaryMin || null,
      salaryMax: jobDetails.salaryMax || null,
      salaryCurrency: 'USD',
      salaryType: jobDetails.salaryType || null,
      // Calculate normalized values for comparison/statistics
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

  parseLocation(locationString) {
    if (!locationString || typeof locationString !== 'string') {
      return { city: null, state: null, zipCode: null };
    }
    
    // Clean the string first
    const clean = locationString.trim();
    
    // Pattern: "City, ST" or "City, ST 12345" or "City Hts, ST"
    const patterns = [
      /^([A-Z][a-z]+(?:\s+(?:Heights?|Hts?|Beach|Hills|City|Town|Burg|Port|Haven|County))?),\s+([A-Z]{2})(?:\s+(\d{5}))?$/,
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
    
    // Last resort: try to find state anywhere in string
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
   * Get detailed job information from the job detail page
   * TODO: INSPECT & UPDATE - This function needs the most adaptation
   * Open a Northwell job detail page in browser dev tools and identify:
   * 1. Description container selector
   * 2. Location selector
   * 3. Title selector
   * 4. Salary/shift patterns (may differ from Cleveland Clinic)
   * 5. End markers for description (where to stop extracting)
   */
  async getJobDetails(page, job) {
    if (!job.link) {
      return {
        title: job.title,
        location: job.location,
        description: job.rawText.substring(0, 1000),
        sourceUrl: null
      };
    }
    
    try {
      // Navigate to the job details page
      await page.goto(job.link, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      // Wait longer for page to fully load (helps prevent detached frame errors)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Remove all scripts, styles, and hidden elements BEFORE extracting content
      await page.evaluate(() => {
        // Remove all script tags
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Remove all style tags
        const styles = document.querySelectorAll('style');
        styles.forEach(style => style.remove());
        
        // Hide navigation, headers, footers, and other non-content elements
        const elementsToHide = document.querySelectorAll(
          'nav, header, footer, .nav-container, .navigation, .header-navigation, ' +
          '[class*="nav"], [class*="menu"], [class*="sidebar"], [class*="footer"], ' +
          '[id*="nav"], [id*="menu"], [id*="footer"], [id*="header"], ' +
          '.cookie, .cookie-banner, .gtm, iframe, noscript, ' +
          '.afterhero, [class*="share"], [class*="save"], [class*="recruiter"]'
        );
        elementsToHide.forEach(el => el.style.display = 'none');
      });

      // Extract detailed job information
      const jobDetails = await page.evaluate(() => {
        // Helper to get clean text from element (for non-description fields)
        const getCleanText = (element) => {
          if (!element) return null;
          
          // Clone to avoid modifying original
          const clone = element.cloneNode(true);
          
          // Remove script and style elements from clone
          clone.querySelectorAll('script, style').forEach(el => el.remove());
          
          // Get text content
          let text = clone.textContent || clone.innerText || '';
          
          // Aggressive cleaning
          text = text
            // Remove CSS-like patterns
            .replace(/\{[^}]{0,200}\}/g, '')
            // Remove bracket content like [uib-...]
            .replace(/\[[^\]]{0,100}\]/g, '')
            // Remove common JavaScript patterns
            .replace(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, '')
            .replace(/var\s+\w+\s*=\s*[^;]+;/g, '')
            .replace(/\.\w+\s*\{[^}]*\}/g, '')
            // Remove long technical strings (likely code)
            .replace(/[a-zA-Z0-9\-_\.]+\{[^}]{10,}\}/g, '')
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            .trim();
          
          return text || null;
        };
        
        // Helper to convert HTML to formatted text
        const htmlToFormattedText = (element) => {
          if (!element) return null;
          
          const clone = element.cloneNode(true);
          
          // Remove scripts and styles
          clone.querySelectorAll('script, style').forEach(el => el.remove());
          
          // UPDATED: End markers for Northwell's format - stop extraction here
          // Strategy: ALWAYS capture everything including "*Additional Salary Detail" and salary range
          // Stop ONLY at the disclaimer that comes AFTER the salary range line
          const html = clone.innerHTML;
          const htmlLower = html.toLowerCase();
          let stopIndex = html.length;
          
          // Step 1: Find "*Additional Salary Detail" section (if present)
          // This ensures we capture it regardless of where disclaimers appear
          const additionalSalaryPattern = /(?:<[^>]+>)?\s*\*\s*Additional\s+Salary\s+Detail\s*(?:<\/[^>]+>)?/i;
          const additionalSalaryMatch = html.match(additionalSalaryPattern);
          
          // Step 2: Find the salary range line (our anchor point - MUST be captured)
          // Pattern: "The salary range for this position is $X-$Y/year"
          const salaryRangePattern = /The\s+salary\s+range\s+for\s+this\s+position\s+is[^<]*\$?[\d,]+[^<]*\/year/i;
          const salaryRangeMatch = html.match(salaryRangePattern);
          
          if (salaryRangeMatch) {
            // Found salary range - this is our primary anchor
            const salaryRangeStart = html.indexOf(salaryRangeMatch[0]);
            const salaryRangeEnd = salaryRangeStart + salaryRangeMatch[0].length;
            
            // Find the end of the salary range line (usually </p> or closing tag)
            const afterSalaryRange = html.substring(salaryRangeEnd);
            const nextTagMatch = afterSalaryRange.match(/<\/[^>]+>/);
            const salaryRangeLineEnd = nextTagMatch ? salaryRangeEnd + nextTagMatch.index + nextTagMatch[0].length : salaryRangeEnd + 100;
            
            // Step 3: Look for disclaimer text that comes AFTER the salary range
            // Only consider disclaimers that appear AFTER the salary range line
            const htmlAfterSalaryRange = html.substring(salaryRangeLineEnd);
            const disclaimerPatterns = [
              /Salary\s+ranges\s+shown\s+on\s+third-party\s+job\s+sites[^<]*Candidates\s+should\s+check/i,
              /Salary\s+ranges\s+shown\s+on\s+third-party\s+job\s+sites/i,
              /Salary\s+ranges\s+shown\s+on\s+third\s+party\s+job\s+sites/i,
              /Candidates\s+should\s+check\s+Northwell\s+Health\s+Careers/i
            ];
            
            for (const pattern of disclaimerPatterns) {
              const match = htmlAfterSalaryRange.match(pattern);
              if (match && match.index !== undefined && match.index < 500) {
                // Found disclaimer AFTER salary range - stop right before it
                stopIndex = salaryRangeLineEnd + match.index;
                break;
              }
            }
            
            // If no disclaimer found after salary range, stop at end of salary range line
            // This ensures we capture the salary range even if disclaimer structure varies
            if (stopIndex === html.length) {
              stopIndex = salaryRangeLineEnd;
            }
          } else if (additionalSalaryMatch) {
            // No salary range found, but we have "*Additional Salary Detail"
            // Find end of that section and stop at disclaimer
            const additionalSalaryEnd = html.indexOf(additionalSalaryMatch[0]) + additionalSalaryMatch[0].length;
            const htmlAfterAdditionalSalary = html.substring(additionalSalaryEnd, additionalSalaryEnd + 2000);
            const disclaimerMarkers = [
              'salary ranges shown on third-party job sites',
              'salary ranges shown on third party job sites',
              'candidates should check northwell health careers'
            ];
            
            for (const marker of disclaimerMarkers) {
              const index = htmlAfterAdditionalSalary.toLowerCase().indexOf(marker);
              if (index !== -1 && index < 500) {
                stopIndex = additionalSalaryEnd + index;
                break;
              }
            }
          } else {
            // Neither salary range nor "*Additional Salary Detail" found
            // Use conservative end markers - only stop at clear disclaimers
            const endMarkers = [
              'salary ranges shown on third-party job sites',
              'salary ranges shown on third party job sites',
              'candidates should check northwell health careers'
            ];
            
            for (const marker of endMarkers) {
              const index = htmlLower.indexOf(marker);
              if (index !== -1 && index < stopIndex && index > 5000) {
                // Only stop if disclaimer is after substantial content (after Requirements)
                stopIndex = index;
                break;
              }
            }
          }
          
          // Always trim if we found a valid stop point
          // REMOVED safety check - we trust our logic to find the right stop point
          if (stopIndex < html.length) {
            clone.innerHTML = html.substring(0, stopIndex);
          }
          
          // Convert HTML to formatted text
          let text = '';
          
          // Process each node
          const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const nodeText = node.textContent.trim();
              if (nodeText) {
                text += nodeText + ' ';
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName.toLowerCase();
              
              // Add line breaks for block elements
              if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br'].includes(tagName)) {
                if (text && !text.endsWith('\n\n')) {
                  text += '\n\n';
                }
              }
              
              // Handle lists
              if (tagName === 'ul' || tagName === 'ol') {
                text += '\n';
              }
              
              if (tagName === 'li') {
                text += '• ';
              }
              
              // Process children
              Array.from(node.childNodes).forEach(child => processNode(child));
              
              // Add line breaks after block elements
              if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tagName)) {
                if (!text.endsWith('\n')) {
                  text += '\n';
                }
              }
            }
          };
          
          Array.from(clone.childNodes).forEach(child => processNode(child));
          
          // Clean up: normalize whitespace but preserve paragraph breaks
          text = text
            .replace(/\n{3,}/g, '\n\n') // Max 2 newlines in a row
            .replace(/[ \t]+/g, ' ') // Normalize spaces
            .replace(/ \n/g, '\n') // Remove space before newline
            .replace(/\n /g, '\n') // Remove space after newline
            .trim();
          
          return text;
        };
        
        // Helper to split description into logical sections with proper formatting
        const splitDescriptionIntoSections = (text) => {
          if (!text) return text;
          
          // Northwell-specific section headers (must match frontend pattern)
          // Frontend expects: Minimum|Preferred|Requirements|Responsibilities|Benefits|Physical|Personal Protective|Pay Range|About|Overview|Summary|Skills|Duties|Key|Additional Salary Detail
          const sectionMarkers = [
            /^(Job\s+)?Responsibility$/i, // "Responsibility" or "Job Responsibility" (singular)
            /^(Job\s+)?Responsibilities$/i, // "Responsibilities" or "Job Responsibilities" (plural)
            /^(Job\s+)?Qualification$/i, // "Qualification" or "Job Qualification" (singular)
            /^(Job\s+)?Qualifications$/i, // "Qualifications" or "Job Qualifications" (plural)
            /^Requirements$/i,
            /^Minimum\s+Qualifications|Minimum\s+Requirements/i,
            /^Preferred\s+Qualifications|Preferred\s+Requirements/i,
            /^Benefits/i,
            /^Compensation|What\s+We\s+Offer/i,
            /^Physical\s+Requirements|Work\s+Environment/i,
            /^Personal\s+Protective\s+Equipment/i,
            /^Pay\s+Range|Salary/i,
            /^About|Overview|Summary/i,
            /^Skills|Competencies/i,
            /^Duties/i,
            /^Key/i,
            /^\*\s*Additional\s+Salary\s+Detail/i, // Handle asterisk version: "*Additional Salary Detail"
            /^Additional\s+Salary\s+Detail$/i // "Additional Salary Detail" (without asterisk)
          ];
          
          // Normalize section titles to match frontend pattern
          const normalizeSectionTitle = (title) => {
            if (!title) return title;
            
            // Remove asterisks and "Job " prefix
            let normalized = title
              .replace(/^\*\s*/, '') // Remove leading asterisk
              .replace(/^Job\s+/i, '') // Remove "Job " prefix
              .trim();
            
            // Normalize to match frontend expectations
            if (/^Responsibility$/i.test(normalized)) {
              return 'Responsibilities'; // Singular → Plural
            }
            if (/^Qualification|Qualifications$/i.test(normalized)) {
              return 'Requirements'; // Qualification → Requirements (what frontend expects)
            }
            if (/^Additional\s+Salary\s+Detail$/i.test(normalized)) {
              return 'Additional Salary Detail'; // Keep as-is (frontend will handle)
            }
            
            // Remove trailing colon if present (e.g., "Qualifications:" → "Qualifications")
            normalized = normalized.replace(/:\s*$/, '');
            
            // Capitalize first letter of each word for consistency
            return normalized.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
          };
          
          const lines = text.split('\n');
          const sections = [];
          let currentSection = { title: '', content: [] };
          
          for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            if (!trimmedLine) {
              // Preserve empty lines between content
              if (currentSection.content.length > 0) {
                currentSection.content.push('');
              }
              continue;
            }
            
            // Check if this line is a section header
            let isHeader = false;
            let matchedTitle = null;
            
            for (const marker of sectionMarkers) {
              if (marker.test(trimmedLine)) {
                // Save previous section
                if (currentSection.content.length > 0) {
                  sections.push({
                    title: currentSection.title,
                    content: currentSection.content.join('\n').trim()
                  });
                }
                // Normalize and start new section
                matchedTitle = normalizeSectionTitle(trimmedLine);
                currentSection = { title: matchedTitle || trimmedLine, content: [] };
                isHeader = true;
                break;
              }
            }
            
            if (!isHeader) {
              // Check if line starts with bullet point (already formatted from HTML conversion)
              if (trimmedLine.startsWith('•')) {
                // Preserve bullet points - they're already formatted from htmlToFormattedText
                currentSection.content.push(trimmedLine);
              }
              // Format numbered items (e.g., "1.", "1)", "1.Conducts")
              // Northwell uses format like "1.Conducts" or "1) Conducts"
              else if (/^\d+[\.\)]/.test(trimmedLine)) {
                const numberedPattern = /^(\d+)[\.\)]\s*(.+)$/;
                const numberedMatch = trimmedLine.match(numberedPattern);
                
                if (numberedMatch) {
                  const number = numberedMatch[1];
                  const content = numberedMatch[2];
                  // Format as "1. Content" for better readability
                  currentSection.content.push(`${number}. ${content}`);
                } else {
                  currentSection.content.push(trimmedLine);
                }
              }
              // Regular text line
              else {
                currentSection.content.push(trimmedLine);
              }
            }
          }
          
          // Add last section
          if (currentSection.content.length > 0) {
            sections.push({
              title: currentSection.title || 'Job Description',
              content: currentSection.content.join('\n').trim()
            });
          }
          
          // Always format with separators if we have at least one section with a title
          // This ensures frontend can detect headers properly
          const sectionsWithTitles = sections.filter(s => s.title && s.title.trim());
          
          if (sectionsWithTitles.length > 0) {
            return sections.map(section => {
              if (section.title) {
                // Format section with title and content
                return `${section.title}\n\n${section.content}`;
              }
              // Section without title - just return content
              return section.content;
            }).join('\n\n---\n\n');
          }
          
          // If no sections were found, check if we can detect headers in the text directly
          // Look for common header patterns even without explicit section splitting
          // Handle headers with asterisks, colons, "Job " prefix
          const headerPattern = /^(?:\*\s*)?(?:Job\s+)?(?:Responsibilities?|Qualifications?|Requirements|Benefits|Additional\s+Salary\s+Detail)/i;
          const fallbackLines = text.split('\n');
          const potentialSections = [];
          let fallbackSection = { title: '', content: [] };
          
          for (let i = 0; i < fallbackLines.length; i++) {
            const line = fallbackLines[i].trim();
            if (headerPattern.test(line)) {
              // Found a potential header - save previous section and start new one
              if (fallbackSection.content.length > 0 || fallbackSection.title) {
                potentialSections.push(fallbackSection);
              }
              // Clean up the title: remove asterisk, colon, "Job " prefix
              let cleanTitle = line.replace(/^\*\s*/, '').replace(/:\s*$/, '').replace(/^Job\s+/i, '').trim();
              // Normalize similar to normalizeSectionTitle
              if (/^Responsibility$/i.test(cleanTitle)) cleanTitle = 'Responsibilities';
              if (/^Qualification|Qualifications$/i.test(cleanTitle)) cleanTitle = 'Requirements';
              fallbackSection = { title: cleanTitle, content: [] };
            } else if (line) {
              fallbackSection.content.push(line);
            }
          }
          
          // Add last section
          if (fallbackSection.content.length > 0 || fallbackSection.title) {
            potentialSections.push(fallbackSection);
          }
          
          // If we found sections this way, format them
          if (potentialSections.length > 0) {
            return potentialSections.map(section => {
              if (section.title) {
                return `${section.title}\n\n${section.content.join('\n')}`;
              }
              return section.content.join('\n');
            }).join('\n\n---\n\n');
          }
          
          // Otherwise return original text (with number formatting applied)
          return text.replace(/(\d+)[\.\)]\s*(.+)/g, '$1. $2');
        };
        
        // UPDATED: Northwell uses .jd-desc-section for job description
        let description = null;
        
        // Primary selector: Northwell's job description section
        const primaryDescSelector = '.jd-desc-section, #av_section_2, [class*="jd-desc"]';
        const descElement = document.querySelector(primaryDescSelector);
        
        if (descElement) {
          // Remove script tags and navigation elements BEFORE extracting
          const clone = descElement.cloneNode(true);
          
          // Remove all script tags
          clone.querySelectorAll('script').forEach(script => script.remove());
          
          // Remove navigation elements like "<< Back to Search Results"
          clone.querySelectorAll('a[href*="search"], a[href*="job-search"]').forEach(link => {
            const text = link.textContent.trim();
            if (text.includes('Back') || text.includes('Search Results')) {
              link.remove();
            }
          });
          
          const formattedText = htmlToFormattedText(clone);
          
          if (formattedText && formattedText.length > 500) {
            // Clean up the text - remove JavaScript code and navigation elements
            let cleanedText = formattedText;
            
            // Remove JavaScript code patterns at the start (MORE AGGRESSIVE)
            cleanedText = cleanedText.replace(/^\s*<<\s*Back\s+to\s+Search\s+Results\s*/i, '');
            cleanedText = cleanedText.replace(/\$\(document\)\.ready\s*\([^)]*\)\s*\{[^}]*\}/gi, '');
            cleanedText = cleanedText.replace(/if\s*\([^)]*\)\s*\{[^}]*\}/g, '');
            cleanedText = cleanedText.replace(/current_job\.[^;]*;/g, '');
            
            // Remove ALL JavaScript function patterns (any function declaration or call)
            cleanedText = cleanedText.replace(/\$\s*\([^)]*\)/g, ''); // jQuery calls
            cleanedText = cleanedText.replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, ''); // Anonymous functions
            cleanedText = cleanedText.replace(/\w+\s*=\s*function\s*\([^)]*\)\s*\{[^}]*\}/g, ''); // Named function assignments
            cleanedText = cleanedText.replace(/var\s+\w+\s*=\s*[^;]+;/g, ''); // Variable declarations
            cleanedText = cleanedText.replace(/const\s+\w+\s*=\s*[^;]+;/g, ''); // Const declarations
            cleanedText = cleanedText.replace(/let\s+\w+\s*=\s*[^;]+;/g, ''); // Let declarations
            cleanedText = cleanedText.replace(/if\s*\([^)]*\)\s*\{[^}]*\}/g, ''); // If statements
            cleanedText = cleanedText.replace(/\.\w+\s*\([^)]*\)\s*\{[^}]*\}/g, ''); // Method calls with blocks
            
            // Remove script-like patterns that might contain "function" keyword
            cleanedText = cleanedText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ''); // Script tags (shouldn't be in textContent, but just in case)
            cleanedText = cleanedText.replace(/\{[^}]{0,100}\}/g, ''); // Any curly brace blocks
            cleanedText = cleanedText.replace(/\(function\s*\([^)]*\)\s*\{[^}]*\}\)\s*\([^)]*\)/g, ''); // IIFE patterns
            
            // Remove "Job details" and "Job Description" headers at the start (we already have these in layout)
            cleanedText = cleanedText.replace(/^(Job\s+details\s*\n?\s*)?(Job\s+Description\s*\n?\s*)/i, '');
            cleanedText = cleanedText.replace(/^(Job\s+Description\s*\n?\s*)(Job\s+details\s*\n?\s*)/i, '');
            
            // Find where actual job description starts (look for actual content like "Performs")
            const jobDescIndex = cleanedText.search(/(?:Performs|Responsibilities|Requirements|Job\s+Responsibility|Job\s+Qualification)/i);
            if (jobDescIndex > 0 && jobDescIndex < 500) {
              // Start from where actual content begins
              cleanedText = cleanedText.substring(jobDescIndex);
            }
            
            // Remove any remaining jQuery/JavaScript patterns
            cleanedText = cleanedText.replace(/\$\([^)]*\)/g, '');
            cleanedText = cleanedText.replace(/document\.[^;]*;/g, '');
            cleanedText = cleanedText.replace(/window\.[^;]*;/g, '');
            cleanedText = cleanedText.replace(/console\.[^;]*;/g, '');
            
            // Remove patterns that look like code but might have slipped through
            cleanedText = cleanedText.replace(/\w+\.\w+\s*=\s*[^;]+;/g, ''); // Object property assignments
            cleanedText = cleanedText.replace(/[\w\.]+\s*=\s*[\w\.]+/g, (match) => {
              // Only remove if it looks like code (has dots and no spaces)
              if (match.includes('.') && !match.includes(' ')) {
                return '';
              }
              return match;
            });
            
            // Clean up excessive whitespace but preserve structure
            cleanedText = cleanedText
              .replace(/^\s+/, '') // Remove leading whitespace
              .replace(/\s+$/g, '') // Remove trailing whitespace
              .replace(/\n{4,}/g, '\n\n\n') // Max 3 newlines
              .replace(/function\s*\(/gi, '') // Remove any remaining "function(" patterns
              .replace(/\s+function\s+/gi, ' function '); // Normalize "function" word (keep legitimate uses like "liver function")
            
            // Final check: if cleaned text still has suspicious JavaScript patterns, try to remove them more aggressively
            const suspiciousPatterns = [
              /current_job/g,
              /\$\(document\)/g,
              /\.ready\(/g,
              /jQuery/g,
              /window\.location/g
            ];
            
            suspiciousPatterns.forEach(pattern => {
              cleanedText = cleanedText.replace(pattern, '');
            });
            
            if (cleanedText.length > 500) {
              description = cleanedText;
            }
          }
        }
        
        // Fallback: try other description selectors if primary doesn't work
        if (!description) {
          const descSelectors = [
            '[class*="job-desc"]',
            '[class*="description"]',
            '#job-details',
            '[id*="description"]',
            '.job-content'
          ];
          
          for (const selector of descSelectors) {
            const el = document.querySelector(selector);
            if (el) {
              const formattedText = htmlToFormattedText(el);
              if (formattedText && formattedText.length > 500) {
                description = formattedText;
                break;
              }
            }
          }
        }
        
        // UPDATED: Extract location from Northwell detail page
        // Location is usually in the banner area or job metadata
        let location = null;
        const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Heights?|Hts?|Beach|Hills|City|Town|Burg|Port|Haven))?),?\s+([A-Z]{2})(?:\s+US)?/;
        
        // Try banner/header area first (where location is usually shown)
        const bannerSelectors = [
          '.banner-description',
          '[class*="banner"]',
          '.job-header',
          '[class*="header"]'
        ];
        
        for (const selector of bannerSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = getCleanText(el);
            if (text && locationPattern.test(text)) {
              const match = text.match(locationPattern);
              if (match && match[0].length < 100) {
                location = match[0].replace(/\s+US$/, '').trim();
                break;
              }
            }
          }
        }
        
        // If not found, try other location selectors
        if (!location) {
          const locationSelectors = [
            '[class*="location"]',
            '[class*="city"]',
            '[class*="address"]',
            '.jobLocation',
            '.job-location'
          ];
          
          for (const selector of locationSelectors) {
            const el = document.querySelector(selector);
            if (el) {
              const text = getCleanText(el);
              if (text && locationPattern.test(text)) {
                const match = text.match(locationPattern);
                if (match && match[0].length < 100) {
                  location = match[0].replace(/\s+US$/, '').trim();
                  break;
                }
              }
            }
          }
        }
        
        // Last resort: search in body text but avoid sidebar/footer content
        if (!location) {
          const bodyText = document.body.textContent;
          const matches = bodyText.match(new RegExp(locationPattern, 'g'));
          
          if (matches && matches.length > 0) {
            // Try to find a match near the top of the page (more likely to be job location)
            const firstHalf = bodyText.substring(0, Math.floor(bodyText.length / 3));
            for (const match of matches) {
              if (firstHalf.includes(match)) {
                const matchIndex = firstHalf.indexOf(match);
                const context = firstHalf.substring(Math.max(0, matchIndex - 50), matchIndex + 100);
                
                // Skip if it's in CSS/JS context or common non-location words
                if (!context.includes('{display:') && 
                    !context.includes('function') &&
                    !context.includes('.dropdown-menu') &&
                    !context.includes('Surgical, OR') && // Exclude this common false positive
                    !context.includes('Operating Room')) {
                  location = match.replace(/\s+US$/, '').trim();
                  break;
                }
              }
            }
          }
        }
        
        // Extract title - try multiple selectors
        const titleSelectors = [
          'h1',
          '[class*="job-title"]',
          '[class*="title"]',
          '.job-title',
          'title'
        ];
        
        let title = null;
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            title = element.textContent.trim();
            if (title.length > 0 && title.length < 200) break;
          }
        }
        
        // Extract department/facility
        let department = null;
        const deptSelectors = [
          '[class*="department"]',
          '[class*="facility"]',
          '[class*="hospital"]',
          '[class*="center"]'
        ];
        
        for (const selector of deptSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = getCleanText(el);
            if (text && text.length < 200 && !text.includes('function')) {
              department = text;
              break;
            }
          }
        }
        
        // Extract Schedule/Job Type from metadata section
        // TODO: INSPECT & UPDATE - Check if Northwell uses "Schedule:" or different label
        let employmentType = null;
        const bodyText = document.body.textContent;
        
        // Pattern to match "Schedule:", "Employment Type:", "Job Type:", etc.
        const schedulePattern = /(?:Schedule|Employment Type|Job Type|Work Schedule):\s*([^\n\r]+)/i;
        const scheduleMatch = bodyText.match(schedulePattern);
        if (scheduleMatch && scheduleMatch[1]) {
          let scheduleValue = scheduleMatch[1].trim().split(/\n|,|$/)[0].trim();
          
          // Normalize common variations
          if (scheduleValue.toLowerCase().includes('full time') || scheduleValue.toLowerCase().includes('full-time')) {
            employmentType = 'Full Time';
          } else if (scheduleValue.toLowerCase().includes('part time') || scheduleValue.toLowerCase().includes('part-time')) {
            employmentType = 'Part Time';
          } else if (scheduleValue.toLowerCase().includes('prn')) {
            employmentType = 'PRN';
          } else if (scheduleValue.toLowerCase().includes('contract')) {
            employmentType = 'Contract';
          } else {
            if (scheduleValue.length > 0 && scheduleValue.length < 50) {
              employmentType = scheduleValue;
            }
          }
        }
        
        // TODO: INSPECT & UPDATE - Extract Shift Type
        // Check how Northwell displays shift information
        let shiftType = null;
        const shiftPattern = /Shift:\s*([^\n\r]+)/i;
        const shiftMatch = bodyText.match(shiftPattern);
        if (shiftMatch && shiftMatch[1]) {
          let shiftValue = shiftMatch[1].trim().split(/\n|,|$/)[0].trim().toLowerCase();
          
          if (shiftValue && shiftValue.length > 0) {
            if (shiftValue.includes('day') || shiftValue === 'days') {
              shiftType = 'days';
            } else if (shiftValue.includes('night') || shiftValue === 'nights') {
              shiftType = 'nights';
            } else if (shiftValue.includes('evening')) {
              shiftType = 'evenings';
            } else if (shiftValue.includes('variable') || shiftValue.includes('varied')) {
              shiftType = 'variable';
            } else if (shiftValue.includes('rotating') || shiftValue.includes('rotate')) {
              shiftType = 'rotating';
            }
          }
        }
        
        // If not found in Shift: field, try to detect from description
        if (!shiftType) {
          const descLower = bodyText.toLowerCase();
          if (descLower.includes('day shift') || descLower.includes('days shift')) {
            shiftType = 'days';
          } else if (descLower.includes('night shift') || descLower.includes('nights shift')) {
            shiftType = 'nights';
          } else if (descLower.includes('evening shift')) {
            shiftType = 'evenings';
          } else if (descLower.includes('variable shift') || descLower.includes('varied shift')) {
            shiftType = 'variable';
          } else if (descLower.includes('rotating shift') || descLower.includes('rotate shifts')) {
            shiftType = 'rotating';
          }
        }
        
        // Remove disclaimer text from "Salary ranges shown on third party..." onwards
        // BUT: Only remove if it comes AFTER the salary range line
        // This prevents removing disclaimers that appear earlier in the HTML (headers/sidebars)
        if (description) {
          // First, find where the salary range line is
          const salaryRangeLineIndex = description.toLowerCase().indexOf('the salary range for this position is');
          
          // Only remove disclaimer if it comes AFTER the salary range line
          // This ensures we don't accidentally cut off "*Additional Salary Detail"
          const disclaimerIndex = description.toLowerCase().indexOf('salary ranges shown on third-party');
          if (disclaimerIndex !== -1) {
            // Only remove if disclaimer comes after salary range (or if no salary range found, still remove)
            if (salaryRangeLineIndex === -1 || disclaimerIndex > salaryRangeLineIndex) {
              description = description.substring(0, disclaimerIndex).trim();
            }
          }
          
          // Also check for variations (same logic)
          const alternateDisclaimerIndex = description.toLowerCase().indexOf('salary ranges shown on third party');
          if (alternateDisclaimerIndex !== -1) {
            if (salaryRangeLineIndex === -1 || alternateDisclaimerIndex > salaryRangeLineIndex) {
              description = description.substring(0, alternateDisclaimerIndex).trim();
            }
          }
        }
        
        // Format description with sections if we have it
        let formattedDescription = description || 'Job description not available';
        if (description && description.length > 100) {
          formattedDescription = splitDescriptionIntoSections(description);
        }
        
        // TODO: INSPECT & UPDATE - Extract salary/pay information
        // Check how Northwell displays salary (may differ from Cleveland Clinic)
        // Common patterns: "Salary Range:", "Pay Range:", "Compensation:", "Minimum hourly:", etc.
        let salaryMin = null;
        let salaryMax = null;
        let salaryType = null; // 'hourly' or 'annual'
        
        const fullText = (description || bodyText || '').toLowerCase();
        
        // Look for hourly pay patterns (min/max)
        const hourlyMinMatch = bodyText.match(/minimum\s+hourly:\s*\$?([\d,]+\.?\d*)/i);
        const hourlyMaxMatch = bodyText.match(/maximum\s+hourly:\s*\$?([\d,]+\.?\d*)/i);
        
        // Look for annual salary patterns (min/max)
        const annualMinMatch = bodyText.match(/minimum\s+annual\s+salary:\s*\$?([\d,]+\.?\d*)/i);
        const annualMaxMatch = bodyText.match(/maximum\s+annual\s+salary:\s*\$?([\d,]+\.?\d*)/i);
        
        // UPDATED: Look for Northwell's salary range pattern with "/year" or "/per year" indicator
        // Pattern: "The salary range for this position is $68,000-$115,000/year"
        // Try to find range with /year FIRST (before other patterns that might match incorrectly)
        const rangePatternWithYear = /\$?([\d,]+\.?\d*)\s*[-–—]\s*\$?([\d,]+\.?\d*)\s*(?:\/year|\/per\s+year|\/per\s+year|per\s+year)/i;
        const rangeMatchWithYear = bodyText.match(rangePatternWithYear);
        
        // Also check for explicit "salary range" text with /year
        const salaryRangeWithYearPattern = /(?:salary|pay)\s+range[^:]*:\s*\$?([\d,]+\.?\d*)\s*[-–—]\s*\$?([\d,]+\.?\d*)\s*(?:\/year|\/per\s+year)/i;
        const salaryRangeWithYearMatch = bodyText.match(salaryRangeWithYearPattern);
        
        // Also check for explicit "salary range" text without /year (check context)
        const salaryRangePattern = /(?:salary|pay)\s+range[^:]*:\s*\$?([\d,]+\.?\d*)\s*[-–—]\s*\$?([\d,]+\.?\d*)/i;
        const salaryRangeMatch = bodyText.match(salaryRangePattern);
        
        // Look for single salary values (no min/max) - fallback patterns
        const singleHourlyMatch = bodyText.match(/(?:hourly|hourly\s+rate|hourly\s+wage|per\s+hour)[:\s]+.*?\$?([\d,]+\.?\d*)/i);
        const singleAnnualMatch = bodyText.match(/(?:annual\s+salary)[:\s]+.*?\$?([\d,]+\.?\d*)/i);
        
        // Priority order (highest first):
        // 1. Explicit hourly min/max
        // 2. Explicit annual min/max  
        // 3. Range with /year (Northwell format) - HIGH PRIORITY
        // 4. Salary range with /year
        // 5. Salary range without /year (check context)
        // 6. Fallbacks
        
        if (hourlyMinMatch || hourlyMaxMatch) {
          salaryType = 'hourly';
          if (hourlyMinMatch) {
            salaryMin = Math.round(parseFloat(hourlyMinMatch[1].replace(/,/g, '')));
          }
          if (hourlyMaxMatch) {
            salaryMax = Math.round(parseFloat(hourlyMaxMatch[1].replace(/,/g, '')));
          }
        }
        else if (annualMinMatch || annualMaxMatch) {
          salaryType = 'annual';
          if (annualMinMatch) {
            salaryMin = Math.round(parseFloat(annualMinMatch[1].replace(/,/g, '')));
          }
          if (annualMaxMatch) {
            salaryMax = Math.round(parseFloat(annualMaxMatch[1].replace(/,/g, '')));
          }
        }
        // HIGH PRIORITY: Range with /year indicator (Northwell's format)
        else if (rangeMatchWithYear) {
          salaryType = 'annual'; // Explicitly annual because of /year indicator
          salaryMin = Math.round(parseFloat(rangeMatchWithYear[1].replace(/,/g, '')));
          salaryMax = Math.round(parseFloat(rangeMatchWithYear[2].replace(/,/g, '')));
        }
        // Salary range with /year
        else if (salaryRangeWithYearMatch) {
          salaryType = 'annual'; // Explicitly annual
          salaryMin = Math.round(parseFloat(salaryRangeWithYearMatch[1].replace(/,/g, '')));
          salaryMax = Math.round(parseFloat(salaryRangeWithYearMatch[2].replace(/,/g, '')));
        }
        // Salary range without /year (check context)
        else if (salaryRangeMatch) {
          // Check context around the match to determine if hourly or annual
          const matchIndex = bodyText.indexOf(salaryRangeMatch[0]);
          const context = bodyText.substring(Math.max(0, matchIndex - 100), matchIndex + 200).toLowerCase();
          
          if (context.includes('per hour') || context.includes('hourly') || context.includes('/hour')) {
            salaryType = 'hourly';
          } else {
            salaryType = 'annual'; // Default to annual for salary ranges
          }
          salaryMin = Math.round(parseFloat(salaryRangeMatch[1].replace(/,/g, '')));
          salaryMax = Math.round(parseFloat(salaryRangeMatch[2].replace(/,/g, '')));
        }
        // Fallback: Single hourly value
        else if (singleHourlyMatch) {
          salaryType = 'hourly';
          const singleValue = Math.round(parseFloat(singleHourlyMatch[1].replace(/,/g, '')));
          salaryMin = singleValue;
          salaryMax = singleValue;
        }
        // Fallback: Single annual value (only if explicitly says "annual salary")
        else if (singleAnnualMatch) {
          salaryType = 'annual';
          const singleValue = Math.round(parseFloat(singleAnnualMatch[1].replace(/,/g, '')));
          salaryMin = singleValue;
          salaryMax = singleValue;
        }
        
        return {
          title: title || document.title.replace(/\s*[-|]\s*.*$/, '').trim(),
          location: location || null,
          description: formattedDescription,
          requirements: getCleanText(document.querySelector('[class*="requirement"], [class*="qualification"]')),
          responsibilities: getCleanText(document.querySelector('[class*="responsibility"], [class*="duty"]')),
          benefits: null, // Not extracted - generic HR text, not job-specific
          department: department || getCleanText(document.querySelector('[class*="department"], [class*="division"], [class*="facility"]')),
          employmentType: employmentType || null,
          shiftType: shiftType || null,
          isRemote: document.body.textContent.toLowerCase().includes('remote'),
          sourceUrl: window.location.href,
          salaryMin: salaryMin,
          salaryMax: salaryMax,
          salaryType: salaryType
        };
      });
      
      return jobDetails;
      
    } catch (error) {
      // Handle detached frame errors - retry once
      if (error.message && error.message.includes('detached')) {
        console.log(`⚠️ Detached frame error, retrying job: ${job.title}`);
        try {
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          return await this.getJobDetails(page, job); // Recursive retry
        } catch (retryError) {
          console.log(`⚠️ Retry failed for job: ${job.title}`);
        }
      }
      
      console.log(`⚠️ Error getting job details: ${error.message}`);
      return {
        title: job.title,
        location: job.location,
        description: job.rawText.substring(0, 1000),
        sourceUrl: job.link
      };
    }
  }

  generateMetaDescription(job) {
    const parts = [
      job.title,
      `in ${job.city}, ${job.state}`,
      job.specialty ? `(${job.specialty} specialty)` : '',
      job.jobType ? `- ${job.jobType}` : ''
    ].filter(p => p);
    
    return parts.join(' ') + '. Find RN nursing jobs at Northwell Health.';
  }

  generateKeywords(job) {
    const keywords = [
      'registered nurse',
      'rn jobs',
      'nursing jobs',
      job.city?.toLowerCase(),
      job.state?.toLowerCase(),
      job.specialty?.toLowerCase(),
      'northwell health',
      'healthcare jobs'
    ].filter(k => k);
    
    return [...new Set(keywords)]; // Remove duplicates
  }
}

// Run the scraper if called directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const maxPagesIndex = args.indexOf('--max-pages');
  const maxPages = maxPagesIndex !== -1 ? parseInt(args[maxPagesIndex + 1]) : null;
  
  // Create scraper with options
  const options = {};
  if (maxPages) {
    options.maxPages = maxPages;
    console.log(`🔧 Running with --max-pages ${maxPages}`);
  }
  
  const scraper = new NorthwellHealthRNScraper(options);
  scraper.scrapeRNJobs()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Scraping Results:');
        console.log(`Total jobs found: ${result.totalJobs}`);
        console.log(`RN jobs found: ${result.rnJobs}`);
        console.log(`Validated jobs: ${result.validatedJobs}`);
        
        // Show sample job with key fields
        if (result.jobs.length > 0) {
          const sample = result.jobs[0];
          console.log('\n📋 Sample Job Data:');
          console.log('═══════════════════════════════════════════');
          console.log(`Title: ${sample.title}`);
          console.log(`Location: ${sample.location}`);
          console.log(`City: ${sample.city}, State: ${sample.state}`);
          console.log(`Salary: ${sample.salaryMin ? `$${sample.salaryMin.toLocaleString()}` : 'N/A'} - ${sample.salaryMax ? `$${sample.salaryMax.toLocaleString()}` : 'N/A'} ${sample.salaryType || 'N/A'}`);
          console.log(`Salary Type: ${sample.salaryType || 'NOT SET'}`);
          console.log(`Description Length: ${sample.description ? sample.description.length : 0} characters`);
          console.log(`\nDescription Preview (first 300 chars):`);
          console.log(sample.description ? sample.description.substring(0, 300) + '...' : 'NO DESCRIPTION');
          console.log(`\nFull Job Object:`);
          console.log(JSON.stringify(sample, null, 2));
        }
      } else {
        console.error('❌ Scraping failed:', result.error);
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = NorthwellHealthRNScraper;

