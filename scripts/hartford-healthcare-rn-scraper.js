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
const { formatHartfordDescription } = require('../lib/utils/jobDescriptionFormatter');

/**
 * Hartford Healthcare RN Job Scraper
 * Uses Phenom People API (via Puppeteer + API interception)
 * 
 * Platform: Phenom People
 * Employer: Hartford HealthCare (Connecticut)
 * Total Nursing Jobs: ~419 (as of Dec 2024)
 */

class HartfordHealthcareRNScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://www.hhccareers.org';
    this.searchUrl = 'https://www.hhccareers.org/us/en/search-results';
    this.employerName = 'Hartford HealthCare';
    this.employerSlug = generateEmployerSlug(this.employerName);
    this.careerPageUrl = this.baseUrl;
    this.atsPlatform = 'Phenom People';
    
    // Options
    this.saveToDatabase = options.saveToDatabase !== false; // Default true
    this.maxJobs = options.maxJobs !== undefined ? options.maxJobs : null; // null = no limit
    this.jobService = options.jobService || new JobBoardService();
    
    // Stats tracking
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
   * Main entry point - scrape RN jobs
   */
  async scrapeRNJobs() {
    console.log(`🚀 Starting Hartford HealthCare RN Job Scraping...`);
    console.log(`Search URL: ${this.searchUrl}`);
    console.log(`Save to DB: ${this.saveToDatabase}`);
    console.log(`Max Jobs: ${this.maxJobs || 'Unlimited'}\n`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Collect jobs from API responses
      const allJobs = [];
      
      // Listen for API responses
      page.on('response', async (response) => {
        const url = response.url();
        
        // Capture the widgets API response with job data
        if (url.includes('/widgets') && response.status() === 200) {
          try {
            const data = await response.json();
            
            // Check if this is the job search response
            if (data.eagerLoadRefineSearch && data.eagerLoadRefineSearch.data.jobs) {
              const jobs = data.eagerLoadRefineSearch.data.jobs;
              const totalHits = data.eagerLoadRefineSearch.totalHits;
              
              console.log(`📦 API Response: ${jobs.length} jobs (Total: ${totalHits})`);
              allJobs.push(...jobs);
            }
          } catch (err) {
            // Not JSON or different response format
          }
        }
      });
      
      // Navigate to search page with Nursing filter
      console.log('🔍 Loading Nursing jobs...');
      await page.goto(this.searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for initial jobs to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Click the Nursing filter checkbox
      console.log('✅ Applying Nursing filter...');
      await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        for (const cb of checkboxes) {
          const label = cb.labels && cb.labels[0] ? cb.labels[0].textContent.toLowerCase() : '';
          if (label.includes('nursing')) {
            cb.click();
            return true;
          }
        }
        return false;
      });
      
      // Wait for filtered results
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Now paginate through all results using the API
      console.log('📄 Fetching all pages...\n');
      
      let currentPage = 0;
      const pageSize = 50; // Fetch 50 jobs at a time
      let hasMore = true;
      
      while (hasMore && (!this.maxJobs || allJobs.length < this.maxJobs)) {
        // Call the API via page.evaluate() to get more jobs
        const response = await page.evaluate(async (from, size) => {
          try {
            const res = await fetch('/widgets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sortBy: "",
                subsearch: "",
                from: from,
                jobs: true,
                counts: true,
                all_fields: ["category", "subCategory", "businessUnit", "city", "state", "type", "postedShift", "phLocSlider"],
                pageName: "search-results",
                size: size,
                clearAll: false,
                jdsource: "facets",
                isSliderEnable: true,
                pageId: "page5",
                siteType: "external",
                keywords: "",
                global: true,
                selected_fields: {
                  category: ["Nursing"]
                },
                locationData: {
                  sliderRadius: 10,
                  aboveMaxRadius: false,
                  LocationUnit: "miles"
                },
                s: "1",
                lang: "en_us",
                deviceType: "desktop",
                country: "us",
                refNum: "HHKHHEUS",
                ddoKey: "eagerLoadRefineSearch"
              })
            });
            return await res.json();
          } catch (err) {
            return { error: err.message };
          }
        }, currentPage * pageSize, pageSize);
        
        if (response.error || !response.eagerLoadRefineSearch) {
          console.log('⚠️  Failed to fetch page', currentPage);
          break;
        }
        
        const pageJobs = response.eagerLoadRefineSearch.data.jobs;
        const totalHits = response.eagerLoadRefineSearch.totalHits;
        
        console.log(`📄 Page ${currentPage + 1}: ${pageJobs.length} jobs (${allJobs.length + pageJobs.length}/${totalHits})`);
        
        if (pageJobs.length === 0) {
          hasMore = false;
          break;
        }
        
        allJobs.push(...pageJobs);
        currentPage++;
        
        // Check if we've hit the limit
        if (this.maxJobs && allJobs.length >= this.maxJobs) {
          console.log(`\n✅ Reached max jobs limit (${this.maxJobs})`);
          break;
        }
        
        // Check if we've got all jobs
        if (allJobs.length >= totalHits) {
          hasMore = false;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.stats.totalFound = allJobs.length;
      console.log(`\n✅ Collected ${allJobs.length} nursing jobs\n`);
      
      if (allJobs.length === 0) {
        return {
          success: false,
          error: 'No jobs found',
          stats: this.stats
        };
      }
      
      // Limit to maxJobs if specified
      const jobsToProcess = this.maxJobs ? allJobs.slice(0, this.maxJobs) : allJobs;
      
      // PHASE 2: Get full job descriptions
      console.log(`🔍 Fetching full job descriptions for ${jobsToProcess.length} jobs...\n`);
      
      const detailedJobs = [];
      
      for (let i = 0; i < jobsToProcess.length; i++) {
        const job = jobsToProcess[i];
        this.stats.processed++;
        
        try {
          const jobUrl = this.constructJobUrl(job);
          console.log(`[${i + 1}/${jobsToProcess.length}] ${job.title} - ${job.city}, ${job.state}`);
          
          // Get full description
          const fullDescription = await this.getJobDescription(page, jobUrl, job);
          
          // Skip job if description is null (too short or failed to fetch)
          if (!fullDescription) {
            console.log(`   ⏭️  Skipped (no valid description)`);
            this.stats.errors++;
            continue;
          }
          
          // Map to our schema
          const mappedJob = this.mapJobToSchema(job, fullDescription, jobUrl);
          
          detailedJobs.push(mappedJob);
          console.log(`   ✅ Processed`);
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          this.stats.errors++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`\n📊 Processing complete: ${detailedJobs.length} jobs ready\n`);
      
      // PHASE 3: Save to database
      if (this.saveToDatabase && detailedJobs.length > 0) {
        await this.saveJobsToDatabase(detailedJobs);
      }
      
      return {
        success: true,
        stats: this.stats,
        jobs: detailedJobs
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
   * Construct job URL from job data
   */
  constructJobUrl(job) {
    // Phenom People URL format: /us/en/job/[jobSeqNo]
    return `${this.baseUrl}/us/en/job/${job.jobSeqNo}`;
  }

  /**
   * Get full job description from detail page
   */
  async getJobDescription(page, jobUrl, jobData) {
    try {
      await page.goto(jobUrl, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract full description from Phenom People job page
      const description = await page.evaluate(() => {
        // Phenom People uses .phw-job-description for job details
        const descriptionSelectors = [
          '.phw-job-description',  // Primary: Phenom People job description container
          '[class*="phw-job"]',
          '[class*="job-description"]',
          '[class*="description"]',
          '[id*="description"]',
          '.job-details',
          'article',
          'main'
        ];
        
        for (const selector of descriptionSelectors) {
          const container = document.querySelector(selector);
          if (container && container.textContent.length > 500) {
            // Return text content (strip HTML tags)
            return container.textContent.trim();
          }
        }
        
        // Fallback: shouldn't reach here for Phenom People sites
        return document.body.textContent.trim();
      });
      
      // Clean up description (don't format - LLM will format it during classification)
      const cleaned = description
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      return cleaned.substring(0, 10000); // Limit to 10k chars
      
    } catch (error) {
      console.log(`   ⚠️  Could not fetch full description: ${error.message}`);
      // Fallback to teaser
      const fallbackDescription = jobData.descriptionTeaser || jobData.ml_job_parser?.descriptionTeaser || '';
      
      // Reject if description is too short (likely incomplete)
      if (fallbackDescription.length < 500) {
        console.log(`   ❌  Skipping job (fallback description too short: ${fallbackDescription.length} chars)`);
        return null;
      }
      
      return fallbackDescription;
    }
  }

  /**
   * Format job description with proper line breaks for readability
   */
  formatDescription(text) {
    if (!text) return '';
    
    // Add line breaks after common patterns
    let formatted = text
      // Add breaks after section headers (words ending with colon)
      .replace(/([A-Z][a-z\s&/]+:)(?=[A-Z•·])/g, '$1\n\n')
      // Add breaks before bullet points (• · -)
      .replace(/([.!?])(\s*)(•|·|-\s)/g, '$1\n\n$3')
      // Add breaks after sentences before capital letters (likely new section)
      .replace(/([.!?])\s+(?=[A-Z][a-z]{3,})/g, '$1\n\n')
      // Add breaks before "Qualifications", "Requirements", "Responsibilities", "Benefits", etc.
      .replace(/(Qualifications|Requirements|Responsibilities|Benefits|Experience|Education|Skills|Knowledge|Language|Licensure|Certification)/g, '\n\n$1')
      // Add breaks before numbered lists
      .replace(/([.!?])\s+(\d+\.)/g, '$1\n\n$2')
      // Clean up: normalize multiple spaces but keep line breaks
      .replace(/[ \t]+/g, ' ')
      // Max 2 consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove spaces around line breaks
      .replace(/ \n/g, '\n')
      .replace(/\n /g, '\n')
      .trim();
    
    return formatted;
  }

  /**
   * Map Phenom People job data to our database schema
   */
  mapJobToSchema(job, fullDescription, sourceUrl) {
    const normalizedState = normalizeState(job.state);
    const normalizedCity = normalizeCity(job.city);
    
    // Apply rule-based formatting to raw description
    const formattedDescription = formatHartfordDescription(fullDescription);
    
    return {
      // Basic info
      title: job.title,
      description: formattedDescription,
      slug: generateJobSlug(job.title, normalizedCity, normalizedState, job.jobSeqNo),
      
      // Location
      location: job.location || `${normalizedCity}, ${normalizedState}`,
      city: normalizedCity,
      state: normalizedState,
      zipCode: null, // Not provided
      isRemote: false,
      
      // Classification (will be refined by LLM)
      specialty: this.mapSpecialty(job.subCategory),
      jobType: this.mapJobType(job.type),
      shiftType: this.mapShiftType(job.postedShift),
      experienceLevel: null, // LLM will determine
      
      // Salary (not provided by API)
      salaryMinAnnual: null,
      salaryMaxAnnual: null,
      salaryMinHourly: null,
      salaryMaxHourly: null,
      salaryPeriod: null,
      salaryText: null,
      
      // Source info
      sourceUrl: sourceUrl,
      sourceJobId: job.jobSeqNo,
      department: job.department || null,
      
      // Metadata
      postedDate: job.postedDate ? new Date(job.postedDate) : new Date(),
      
      // Employer will be set during save
    };
  }

  /**
   * Map subCategory to our specialty taxonomy
   */
  mapSpecialty(subCategory) {
    if (!subCategory) return 'General Nursing';
    
    const specialtyMap = {
      'Critical Care / ICU': 'ICU',
      'Emergency Medicine': 'ER',
      'Perioperative': 'Operating Room',
      'Cardiovascular': 'Cardiac Care',
      'Oncology': 'Oncology',
      'Behavioral Health / Psychiatry': 'Psychiatric',
      'Medical': 'Med-Surg',
      'Surgical': 'Med-Surg',
      'Women\'s Health': 'Labor & Delivery',
      'Senior Health Services / Home Care': 'Home Health',
      'PACU': 'PACU',
      'Telemetry': 'Telemetry',
      'Neuroscience': 'Neuro',
      'Orthopedic / Joint': 'Orthopedics',
      'Float Pool': 'Float Pool',
      'Management': 'General Nursing',
      'Education': 'General Nursing'
    };
    
    return specialtyMap[subCategory] || subCategory;
  }

  /**
   * Map job type
   */
  mapJobType(type) {
    if (!type) return null;
    
    const typeMap = {
      'Full Time': 'Full Time',
      'Part Time': 'Part Time',
      'Per Diem': 'PRN',
      'Contract': 'Contract',
      'Travel': 'Travel'
    };
    
    return typeMap[type] || type;
  }

  /**
   * Map shift type
   */
  mapShiftType(postedShift) {
    if (!postedShift) return null;
    
    const shiftMap = {
      'Day': 'days',
      'Night': 'nights',
      'Evening': 'evenings',
      'All Shifts': 'variable',
      'Day/Evening Rotating': 'rotating',
      'Day/Night Rotating': 'rotating',
      'Evening/Night Rotating': 'rotating',
      'Unspecified': null
    };
    
    return shiftMap[postedShift] || null;
  }

  /**
   * Save jobs to database using JobBoardService
   */
  async saveJobsToDatabase(jobs) {
    try {
      const saveResults = await this.jobService.saveJobs(jobs, {
        employerName: this.employerName,
        employerSlug: this.employerSlug,
        careerPageUrl: this.careerPageUrl,
        atsPlatform: this.atsPlatform
      });
      
      // Update our stats from service results
      this.stats.saved = saveResults.created;
      this.stats.updated = saveResults.updated;
      this.stats.errors = saveResults.errors;
      
      return saveResults;
    } catch (error) {
      console.error(`❌ Error saving to database: ${error.message}`);
      this.stats.errors += jobs.length;
      return { error: error.message };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new HartfordHealthcareRNScraper({
    saveToDatabase: true, // Save to database
    maxJobs: null // null = Unlimited (full production - scrapes all ~400 jobs)
  });
  
  scraper.scrapeRNJobs()
    .then(result => {
      console.log('\n' + '='.repeat(60));
      console.log('📊 FINAL STATS');
      console.log('='.repeat(60));
      console.log(`Total Found: ${result.stats.totalFound}`);
      console.log(`Processed: ${result.stats.processed}`);
      console.log(`Saved: ${result.stats.saved}`);
      console.log(`Updated: ${result.stats.updated}`);
      console.log(`Errors: ${result.stats.errors}`);
      console.log('='.repeat(60) + '\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = HartfordHealthcareRNScraper;

