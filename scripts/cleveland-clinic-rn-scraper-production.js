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
 * Cleveland Clinic RN Job Scraper - Production Version
 * Conforms to scraper data contract and uses normalization utilities
 */

class ClevelandClinicRNScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://jobs.clevelandclinic.org/';
    this.searchUrl = 'https://jobs.clevelandclinic.org/job-search-results/?keyword=nurse';
    this.employerName = 'Cleveland Clinic';
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
        // Add or update pg parameter
        const urlObj = new URL(pageUrl);
        urlObj.searchParams.set('pg', pageNum);
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
    console.log('🚀 Starting Cleveland Clinic RN Job Scraping (Production)...');
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

  async extractJobListings(page) {
    console.log('📋 Extracting job listings from page...');
    
    const jobListings = await page.evaluate(() => {
      const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt');
      const jobs = [];
      
      jobElements.forEach((jobElement) => {
        try {
          // Extract job ID from class name
          const jobId = jobElement.className.match(/jobid-(\d+)/);
          const jobIdValue = jobId ? jobId[1] : null;
          
          // Find the job title element
          const titleElement = jobElement.querySelector('.jobTitle');
          const title = titleElement ? titleElement.textContent.trim() : null;
          
          // Find the job link
          const linkElement = jobElement.querySelector('a[href]');
          const link = linkElement ? linkElement.href : null;
          
          if (title && link) {
            // Extract location and other details from specific elements, not just text
            const jobText = jobElement.textContent;
            const lines = jobText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            let location = null;
            let employmentType = null;
            let department = null;
            
            // Look for location in specific child elements first
            const locationSelectors = [
              '[class*="location"]',
              '[class*="city"]',
              '[class*="address"]',
              '.jobLocation',
              '.location'
            ];
            
            for (const selector of locationSelectors) {
              const locEl = jobElement.querySelector(selector);
              if (locEl) {
                const locText = locEl.textContent.trim();
                // Check if it looks like a location (City, ST pattern)
                if (/[A-Z][a-z]+(\s+[A-Z][a-z]+)*,\s+[A-Z]{2}/.test(locText)) {
                  location = locText;
                  break;
                }
              }
            }
            
            // If no location element found, parse from text lines
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
            
            // Look for employment type in text
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.match(/^(Full\s+Time|Part\s+Time|PRN|Remote|Contract)$/i)) {
                employmentType = line;
                break;
              }
            }
            
            // Look for department/facility
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.match(/Hospital|Medical Center|Health Center|Campus|FHC/i) && line.length < 100) {
                department = line;
                break;
              }
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
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
          
          // End markers - stop extraction here (but AFTER pay range)
          // Priority: Stop at "Contact a recruiter" first, but make sure we capture pay range
          const endMarkers = [
            'Contact a recruiter',
            'Join our Talent Community',
            'Application Status'
          ];
          
          // Legal/EEO markers that come AFTER pay range - stop here if we've already captured pay range
          // Stop at these markers (they come after Pay Range explanation)
          const legalMarkers = [
            'The policy of Cleveland Clinic Health System',
            'Cleveland Clinic Health System administers an influenza prevention program',
            'Decisions concerning employment, transfers and promotions',
            'Information provided on this application may be shared',
            'Equal Employment Opportunity Poster',
            'Cleveland Clinic Health System is pleased to be an equal employment employer',
            'We use cookies'
          ];
          
          // Check if content contains end markers and trim there
          let html = clone.innerHTML;
          let minIndex = html.length;
          
          // First, find "Contact a recruiter" - this is our primary stop point
          const contactIndex = html.toLowerCase().indexOf('contact a recruiter');
          
          // Check if Pay Range exists and where it is
          const payRangeIndex = html.toLowerCase().indexOf('pay range');
          const hasPayRange = payRangeIndex !== -1;
          
          if (contactIndex !== -1) {
            // We found "Contact a recruiter"
            if (hasPayRange && payRangeIndex < contactIndex) {
              // Pay range is BEFORE contact - check if legal text comes between them
              // If so, stop at legal text (includes pay range but excludes EEO text)
              let stopAtLegal = false;
              let legalStopIndex = contactIndex;
              
              legalMarkers.forEach(marker => {
                const markerIndex = html.toLowerCase().indexOf(marker.toLowerCase(), payRangeIndex);
                if (markerIndex !== -1 && markerIndex < contactIndex && markerIndex > payRangeIndex) {
                  // Legal marker is between Pay Range and Contact
                  if (markerIndex < legalStopIndex) {
                    legalStopIndex = markerIndex;
                    stopAtLegal = true;
                  }
                }
              });
              
              if (stopAtLegal) {
                // Stop at legal text (includes Pay Range, excludes EEO)
                minIndex = legalStopIndex;
              } else {
                // No legal text between, stop at contact (includes everything)
                minIndex = contactIndex;
              }
            } else if (hasPayRange && payRangeIndex > contactIndex) {
              // Pay range is AFTER contact (shouldn't happen, but handle it)
              // Find where pay range section ends (look for legal text after it)
              const afterPayRange = html.substring(payRangeIndex);
              let payRangeEnd = html.length;
              
              legalMarkers.forEach(marker => {
                const markerIndex = afterPayRange.toLowerCase().indexOf(marker.toLowerCase());
                if (markerIndex !== -1) {
                  const absoluteIndex = payRangeIndex + markerIndex;
                  if (absoluteIndex < payRangeEnd) {
                    payRangeEnd = absoluteIndex;
                  }
                }
              });
              
              // Stop at end of pay range section
              minIndex = payRangeEnd;
            } else {
              // No pay range found, stop at contact
              minIndex = contactIndex;
            }
          } else {
            // No "Contact a recruiter" found
            // Check for other end markers
            endMarkers.forEach(marker => {
              const index = html.toLowerCase().indexOf(marker.toLowerCase());
              if (index !== -1 && index < minIndex) {
                minIndex = index;
              }
            });
            
            // If still no end marker and we have pay range, stop at legal markers
            if (minIndex === html.length && hasPayRange) {
              legalMarkers.forEach(marker => {
                const index = html.toLowerCase().indexOf(marker.toLowerCase());
                if (index !== -1 && index > payRangeIndex && index < minIndex) {
                  minIndex = index;
                }
              });
            }
          }
          
          if (minIndex < html.length) {
            html = html.substring(0, minIndex);
            clone.innerHTML = html;
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
        
        // Helper to split description into logical sections
        const splitDescriptionIntoSections = (text) => {
          if (!text) return text;
          
          // Common section headers to split on
          const sectionMarkers = [
            /^(Minimum qualifications|Minimum Requirements)/i,
            /^(Preferred qualifications|Preferred Requirements)/i,
            /^(Requirements|Qualifications)/i,
            /^(Responsibilities|Duties|Key Responsibilities)/i,
            /^(Benefits|Compensation|What We Offer)/i,
            /^(Physical Requirements|Work Environment)/i,
            /^(Personal Protective Equipment)/i,
            /^(Pay Range)/i,
            /^(About|Overview|Summary)/i,
            /^(Skills|Competencies)/i
          ];
          
          const lines = text.split('\n');
          const sections = [];
          let currentSection = { title: '', content: [] };
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Check if this line is a section header
            let isHeader = false;
            for (const marker of sectionMarkers) {
              if (marker.test(trimmedLine)) {
                // Save previous section
                if (currentSection.content.length > 0) {
                  sections.push({
                    title: currentSection.title,
                    content: currentSection.content.join('\n').trim()
                  });
                }
                // Start new section
                currentSection = { title: trimmedLine, content: [] };
                isHeader = true;
                break;
              }
            }
            
            if (!isHeader) {
              currentSection.content.push(trimmedLine);
            }
          }
          
          // Add last section
          if (currentSection.content.length > 0) {
            sections.push({
              title: currentSection.title || 'Job Description',
              content: currentSection.content.join('\n').trim()
            });
          }
          
          // If we found sections, format nicely
          if (sections.length > 1) {
            return sections.map(section => {
              if (section.title) {
                return `${section.title}\n\n${section.content}`;
              }
              return section.content;
            }).join('\n\n---\n\n');
          }
          
          // Otherwise return original text
          return text;
        };
        
        // Find description element - Cleveland Clinic specific
        // Pay Range is in a separate .jd-salary element, so we need to get the parent container
        // that includes both jd-description and jd-salary
        let description = null;
        
        // First, try to find the parent container (jd-desc) that has both description and salary
        const parentContainer = document.querySelector('.jd-desc, [class*="job-desc"], [class*="desc-full"]');
        
        if (parentContainer) {
          // We found the parent container - extract from it (includes both description and salary)
          const containerClone = parentContainer.cloneNode(true);
          containerClone.querySelectorAll('script, style').forEach(el => el.remove());
          
          // Extract formatted version from the entire container
          const formattedText = htmlToFormattedText(containerClone);
          
          if (formattedText && formattedText.length > 500) {
            description = formattedText;
          }
        }
        
        // Fallback: if parent container not found or extraction failed, use original method
        if (!description) {
          const descElements = document.querySelectorAll('[class*="description"]');
          
          for (const el of descElements) {
            const rawText = getCleanText(el);
            
            // Check if this is the actual job description
            if (rawText && 
                rawText.length > 500 && 
                rawText.length < 20000 &&
                !rawText.includes('Cleveland Clinic CareersCareers') &&
                !rawText.includes('Toggle Navigation') &&
                !rawText.includes('function shareOn') &&
                rawText.split(' ').length > 50) {
              
              // Extract formatted version
              const formattedText = htmlToFormattedText(el);
              
              if (formattedText && formattedText.length > 500) {
                description = formattedText;
                break;
              }
            }
          }
        }
        
        // Extract location - Cleveland Clinic format: "City, ST, US" or in title/header
        let location = null;
        
        // Try to find location in specific elements first
        const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Heights?|Hts?|Beach|Hills|City|Town|Burg|Port|Haven))?),?\s+([A-Z]{2})(?:\s+US)?/;
        
        // Check in common location selectors
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
              if (match) {
                location = `${match[1]}, ${match[2]}`;
                break;
              }
            }
          }
        }
        
        // If not found in elements, search in page text (but avoid CSS/JS)
        if (!location) {
          const bodyText = document.body.textContent;
          const matches = bodyText.match(locationPattern);
          
          if (matches && matches.length > 0) {
            // Use the first match that's not in suspicious context
            for (const match of matches) {
              const matchIndex = bodyText.indexOf(match);
              const context = bodyText.substring(Math.max(0, matchIndex - 50), matchIndex + 100);
              
              // Skip if it's in CSS/JS context
              if (!context.includes('{display:') && 
                  !context.includes('function') &&
                  !context.includes('.dropdown-menu')) {
                const cleanMatch = match.replace(/\s+US$/, '').trim();
                location = cleanMatch;
                break;
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
        
        // Extract department/facility - look for hospital/center names
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
        
        // If not found, try to extract from body text (hospital/center names)
        if (!department) {
          const bodyText = document.body.textContent;
          const hospitalPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Hospital|Medical Center|Health Center|Campus|FHC))/;
          const match = bodyText.match(hospitalPattern);
          if (match && match[0].length < 100) {
            department = match[0];
          }
        }
        
        // Extract Schedule/Job Type from metadata section
        // Look for "Schedule:" in the metadata section (usually at the top of description)
        let employmentType = null;
        const bodyText = document.body.textContent;
        
        // Pattern to match "Schedule: Full Time" or "Schedule:Part Time" etc.
        const schedulePattern = /Schedule:\s*([^\n\r]+)/i;
        const scheduleMatch = bodyText.match(schedulePattern);
        if (scheduleMatch && scheduleMatch[1]) {
          // Clean up the matched value
          let scheduleValue = scheduleMatch[1].trim();
          // Remove any trailing metadata fields that might have been captured
          scheduleValue = scheduleValue.split(/\n|,|$/)[0].trim();
          
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
            // Use the value as-is if it looks valid
            if (scheduleValue.length > 0 && scheduleValue.length < 50) {
              employmentType = scheduleValue;
            }
          }
        }
        
        // Extract Shift Type (Days, Nights, Variable, etc.)
        let shiftType = null;
        // Look for "Shift:" in metadata
        const shiftPattern = /Shift:\s*([^\n\r]+)/i;
        const shiftMatch = bodyText.match(shiftPattern);
        if (shiftMatch && shiftMatch[1]) {
          let shiftValue = shiftMatch[1].trim().split(/\n|,|$/)[0].trim().toLowerCase();
          
          // Only process if shiftValue has actual content (not just whitespace/empty)
          if (shiftValue && shiftValue.length > 0) {
            // Normalize shift types
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
        
        // Format description with sections if we have it
        let formattedDescription = description || 'Job description not available';
        if (description && description.length > 100) {
          formattedDescription = splitDescriptionIntoSections(description);
        }
        
        // Extract salary/pay information from description or body text
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
        
        // Look for single salary values (no min/max) - fallback patterns
        const singleHourlyMatch = bodyText.match(/(?:hourly|hourly\s+rate|hourly\s+wage):\s*\$?([\d,]+\.?\d*)/i);
        const singleAnnualMatch = bodyText.match(/(?:annual\s+salary|salary|pay):\s*\$?([\d,]+\.?\d*)/i);
        
        // If we found hourly values (min/max)
        if (hourlyMinMatch || hourlyMaxMatch) {
          salaryType = 'hourly';
          if (hourlyMinMatch) {
            salaryMin = Math.round(parseFloat(hourlyMinMatch[1].replace(/,/g, '')));
          }
          if (hourlyMaxMatch) {
            salaryMax = Math.round(parseFloat(hourlyMaxMatch[1].replace(/,/g, '')));
          }
        }
        // If we found annual values (min/max) (and not hourly)
        else if (annualMinMatch || annualMaxMatch) {
          salaryType = 'annual';
          if (annualMinMatch) {
            salaryMin = Math.round(parseFloat(annualMinMatch[1].replace(/,/g, '')));
          }
          if (annualMaxMatch) {
            salaryMax = Math.round(parseFloat(annualMaxMatch[1].replace(/,/g, '')));
          }
        }
        // Fallback: Single hourly value (set as both min and max)
        else if (singleHourlyMatch) {
          salaryType = 'hourly';
          const singleValue = Math.round(parseFloat(singleHourlyMatch[1].replace(/,/g, '')));
          salaryMin = singleValue;
          salaryMax = singleValue;
        }
        // Fallback: Single annual value (set as both min and max)
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
          benefits: getCleanText(document.querySelector('[class*="benefit"]')),
          department: department || getCleanText(document.querySelector('[class*="department"], [class*="division"], [class*="facility"]')),
          employmentType: employmentType || null,
          shiftType: shiftType || null,
          isRemote: document.body.textContent.toLowerCase().includes('remote'),
          sourceUrl: window.location.href,
          salaryMin: salaryMin,
          salaryMax: salaryMax,
          salaryType: salaryType // 'hourly' or 'annual' - we'll need to add this to schema later
        };
      });
      
      return jobDetails;
      
    } catch (error) {
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
    
    return parts.join(' ') + '. Find RN nursing jobs at Cleveland Clinic.';
  }

  generateKeywords(job) {
    const keywords = [
      'registered nurse',
      'rn jobs',
      'nursing jobs',
      job.city?.toLowerCase(),
      job.state?.toLowerCase(),
      job.specialty?.toLowerCase(),
      'cleveland clinic',
      'healthcare jobs'
    ].filter(k => k);
    
    return [...new Set(keywords)]; // Remove duplicates
  }
}

// Run the scraper if called directly
if (require.main === module) {
  // For testing: limit to 10 pages (uncomment to test with limited pages)
  // const scraper = new ClevelandClinicRNScraper({ maxPages: 10 });
  // For production: no limit (defaults to 100 pages max)
  const scraper = new ClevelandClinicRNScraper();
  scraper.scrapeRNJobs()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Scraping Results:');
        console.log(`Total jobs found: ${result.totalJobs}`);
        console.log(`RN jobs found: ${result.rnJobs}`);
        console.log(`Validated jobs: ${result.validatedJobs}`);
        
        // Show sample job
        if (result.jobs.length > 0) {
          console.log('\n📋 Sample Job Data:');
          console.log(JSON.stringify(result.jobs[0], null, 2));
        }
      } else {
        console.error('❌ Scraping failed:', result.error);
      }
    })
    .catch(console.error);
}

module.exports = ClevelandClinicRNScraper;
