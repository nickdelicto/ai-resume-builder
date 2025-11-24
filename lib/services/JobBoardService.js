const { PrismaClient } = require('@prisma/client');
const { normalizeState, normalizeCity, generateEmployerSlug } = require('../jobScraperUtils');
const { notifyJobCreatedOrUpdated, notifyJobDeleted, notifyJobsBatch } = require('./indexNowService');

const prisma = new PrismaClient();

/**
 * Job Board Database Service
 * Handles saving scraped jobs to the database with proper deduplication
 */
class JobBoardService {
  /**
   * Get or create a healthcare employer
   * @param {object} employerData - Employer data from scraper
   * @returns {Promise<object>} - HealthcareEmployer record
   */
  async getOrCreateEmployer(employerData) {
    const { employerName, employerSlug, careerPageUrl, atsPlatform } = employerData;
    
    // First try to find existing employer by slug (most reliable)
    let employer = await prisma.healthcareEmployer.findUnique({
      where: { slug: employerSlug }
    });
    
    // If not found by slug, try by name
    if (!employer) {
      employer = await prisma.healthcareEmployer.findUnique({
        where: { name: employerName }
      });
    }
    
    // If still not found, create new employer
    if (!employer) {
      employer = await prisma.healthcareEmployer.create({
        data: {
          name: employerName,
          slug: employerSlug,
          careerPageUrl: careerPageUrl,
          atsPlatform: atsPlatform || 'custom',
          isActive: true
        }
      });
      console.log(`✅ Created new employer: ${employerName}`);
    } else {
      // Update last scraped timestamp
      employer = await prisma.healthcareEmployer.update({
        where: { id: employer.id },
        data: { lastScraped: new Date() }
      });
      console.log(`📋 Found existing employer: ${employerName}`);
    }
    
    return employer;
  }

  /**
   * Get or create a location record
   * @param {string} city - City name
   * @param {string} state - State abbreviation
   * @returns {Promise<object>} - Location record
   */
  async getOrCreateLocation(city, state) {
    if (!city || !state) {
      return null;
    }
    
    // Normalize inputs
    const normalizedCity = normalizeCity(city);
    const normalizedState = normalizeState(state);
    
    if (!normalizedCity || !normalizedState) {
      return null;
    }
    
    // Get full state name
    const stateFull = this.getStateFullName(normalizedState);
    
    // Try to find existing location using composite unique key
    let location = await prisma.location.findFirst({
      where: {
        city: normalizedCity,
        state: normalizedState
      }
    });
    
    // If not found, create new location
    if (!location) {
      location = await prisma.location.create({
        data: {
          city: normalizedCity,
          state: normalizedState,
          stateFull: stateFull
        }
      });
      console.log(`📍 Created new location: ${normalizedCity}, ${normalizedState}`);
    }
    
    return location;
  }

  /**
   * Check if job already exists (deduplication)
   * @param {string} sourceUrl - Original job URL (unique identifier)
   * @returns {Promise<object|null>} - Existing job or null
   */
  async findExistingJob(sourceUrl) {
    return await prisma.nursingJob.findUnique({
      where: { sourceUrl: sourceUrl }
    });
  }

  /**
   * Calculate expiry date for a job
   * Uses expiresDate if provided, otherwise calculates 60 days from now
   * @param {Date|null} expiresDate - Explicit expiry date from source (optional)
   * @param {Date} scrapedAt - When job was scraped
   * @returns {object} - { expiresDate, calculatedExpiresDate }
   */
  calculateExpiry(expiresDate, scrapedAt = new Date()) {
    const now = new Date();
    
    // If source provides explicit expiry, use it
    if (expiresDate) {
      const expires = new Date(expiresDate);
      return {
        expiresDate: expires,
        calculatedExpiresDate: null
      };
    }
    
    // Otherwise, calculate 60 days from scrape date
    const calculatedExpires = new Date(scrapedAt);
    calculatedExpires.setDate(calculatedExpires.getDate() + 60);
    
    return {
      expiresDate: null,
      calculatedExpiresDate: calculatedExpires
    };
  }

  /**
   * Extend expiry for an existing job when re-found during scraping
   * If job has calculatedExpiresDate, extend it by 60 days from current scrape
   * @param {Date} currentScrapedAt - Current scrape timestamp
   * @param {object} existingJob - Existing job record
   * @returns {object} - Updated expiry fields
   */
  extendExpiryForReFoundJob(currentScrapedAt, existingJob) {
    const now = new Date(currentScrapedAt);
    
    // If job has explicit expiresDate from source, don't extend it
    if (existingJob.expiresDate) {
      return {
        expiresDate: existingJob.expiresDate,
        calculatedExpiresDate: existingJob.calculatedExpiresDate,
        scrapedAt: now
      };
    }
    
    // If job was using calculatedExpiresDate, extend it by 60 days from now
    const newCalculatedExpires = new Date(now);
    newCalculatedExpires.setDate(newCalculatedExpires.getDate() + 60);
    
    return {
      expiresDate: null,
      calculatedExpiresDate: newCalculatedExpires,
      scrapedAt: now
    };
  }

  /**
   * Save a single job to the database
   * @param {object} jobData - Job data from scraper (conforming to data contract)
   * @param {object} employer - HealthcareEmployer record
   * @returns {Promise<object>} - Created or updated NursingJob record
   */
  async saveJob(jobData, employer) {
    try {
      const now = new Date();
      
      // Check if job already exists
      const existingJob = await this.findExistingJob(jobData.sourceUrl);
      
      if (existingJob) {
        // Job was re-found during scraping - extend expiry if needed and reactivate if inactive
        const expiryData = this.extendExpiryForReFoundJob(now, existingJob);
        
        // Determine if job needs re-classification
        // Re-classify only if description changed significantly (indicating job changed)
        const descriptionChanged = existingJob.description !== jobData.description;
        const shouldReClassify = descriptionChanged && existingJob.classifiedAt !== null;
        
        // Update existing job (in case details changed)
        const updatedJob = await prisma.nursingJob.update({
          where: { id: existingJob.id },
          data: {
            title: jobData.title,
            location: jobData.location,
            city: jobData.city,
            state: jobData.state,
            zipCode: jobData.zipCode || null,
            isRemote: jobData.isRemote || false,
            jobType: jobData.jobType || null,
            shiftType: jobData.shiftType || null,
            specialty: jobData.specialty || null,
            experienceLevel: jobData.experienceLevel || null,
            description: jobData.description,
            requirements: jobData.requirements || null,
            responsibilities: jobData.responsibilities || null,
            benefits: jobData.benefits || null,
            department: jobData.department || null,
            salaryMin: jobData.salaryMin || null,
            salaryMax: jobData.salaryMax || null,
            salaryCurrency: jobData.salaryCurrency || 'USD',
            salaryType: jobData.salaryType || null,
            salaryMinHourly: jobData.salaryMinHourly || null,
            salaryMaxHourly: jobData.salaryMaxHourly || null,
            salaryMinAnnual: jobData.salaryMinAnnual || null,
            salaryMaxAnnual: jobData.salaryMaxAnnual || null,
            sourceJobId: jobData.sourceJobId || null,
            postedDate: jobData.postedDate ? new Date(jobData.postedDate) : null,
            expiresDate: expiryData.expiresDate,
            calculatedExpiresDate: expiryData.calculatedExpiresDate,
            // If job was previously classified and description changed, reset classification
            // Otherwise RESPECT the previous classification decision (keep existing isActive state)
            // This prevents re-activating jobs that were correctly rejected by the LLM classifier
            isActive: shouldReClassify ? false : existingJob.isActive,
            classifiedAt: shouldReClassify ? null : existingJob.classifiedAt, // Clear if needs re-classification
            slug: jobData.slug,
            metaDescription: jobData.metaDescription || null,
            keywords: jobData.keywords || [],
            scrapedAt: expiryData.scrapedAt
          }
        });
        
        const wasReactivated = !existingJob.isActive;
        console.log(`🔄 Updated existing job: ${jobData.title}${wasReactivated ? ' (reactivated)' : ''}`);
        
        // IndexNow: Disabled real-time notifications (causes rate limiting during scraping)
        // URLs are now submitted in batches after scraping completes (see scripts/batch-indexnow.js)
        // notifyJobCreatedOrUpdated(updatedJob).catch(err => {
        //   console.error(`⚠️ IndexNow notification failed for job ${updatedJob.slug}:`, err.message);
        // });
        
        return { job: updatedJob, isNew: false, wasReactivated };
      }
      
      // Create new job - calculate expiry
      const expiryData = this.calculateExpiry(
        jobData.expiresDate ? new Date(jobData.expiresDate) : null,
        now
      );
      
      const newJob = await prisma.nursingJob.create({
        data: {
          title: jobData.title,
          employerId: employer.id,
          location: jobData.location,
          city: jobData.city,
          state: jobData.state,
          zipCode: jobData.zipCode || null,
          isRemote: jobData.isRemote || false,
          jobType: jobData.jobType || null,
          shiftType: jobData.shiftType || null,
          specialty: jobData.specialty || null,
          experienceLevel: jobData.experienceLevel || null,
          description: jobData.description,
          requirements: jobData.requirements || null,
          responsibilities: jobData.responsibilities || null,
          benefits: jobData.benefits || null,
          department: jobData.department || null,
          salaryMin: jobData.salaryMin || null,
          salaryMax: jobData.salaryMax || null,
          salaryCurrency: jobData.salaryCurrency || 'USD',
          salaryType: jobData.salaryType || null,
          salaryMinHourly: jobData.salaryMinHourly || null,
          salaryMaxHourly: jobData.salaryMaxHourly || null,
          salaryMinAnnual: jobData.salaryMinAnnual || null,
          salaryMaxAnnual: jobData.salaryMaxAnnual || null,
          sourceUrl: jobData.sourceUrl,
          sourceJobId: jobData.sourceJobId || null,
          postedDate: jobData.postedDate ? new Date(jobData.postedDate) : null,
          expiresDate: expiryData.expiresDate,
          calculatedExpiresDate: expiryData.calculatedExpiresDate,
          isActive: false, // Pending - requires LLM classification before going live
          classifiedAt: null, // Not yet classified - will be set by LLM classifier
          slug: jobData.slug,
          metaDescription: jobData.metaDescription || null,
          keywords: jobData.keywords || [],
          scrapedAt: now
        }
      });
      
      // Also create/update location record
      if (jobData.city && jobData.state) {
        await this.getOrCreateLocation(jobData.city, jobData.state);
      }
      
      console.log(`✅ Created new job: ${jobData.title}`);
      
      // IndexNow: Disabled real-time notifications (causes rate limiting during scraping)
      // URLs are now submitted in batches after scraping completes (see scripts/batch-indexnow.js)
      // notifyJobCreatedOrUpdated(newJob).catch(err => {
      //   console.error(`⚠️ IndexNow notification failed for job ${newJob.slug}:`, err.message);
      // });
      
      return { job: newJob, isNew: true };
      
    } catch (error) {
      console.error(`❌ Error saving job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save multiple jobs in batch
   * @param {Array} jobsData - Array of job data objects
   * @param {object} employerData - Employer data
   * @param {object} options - Additional options
   * @param {boolean} options.verifyActiveJobs - If true, mark active jobs not in this scrape as inactive (default: true)
   * @returns {Promise<object>} - Summary of saved jobs
   */
  async saveJobs(jobsData, employerData, options = {}) {
    const { verifyActiveJobs = true } = options;
    
    console.log(`\n💾 Saving ${jobsData.length} jobs to database...`);
    
    // Get or create employer first
    const employer = await this.getOrCreateEmployer(employerData);
    
    const results = {
      total: jobsData.length,
      created: 0,
      updated: 0,
      reactivated: 0,
      errors: 0,
      errorsDetails: [],
      deactivated: 0
    };
    
    // Collect source URLs from current scrape for verification
    const foundSourceUrls = jobsData.map(job => job.sourceUrl).filter(Boolean);
    
    // Process jobs one by one (to handle errors gracefully)
    for (const jobData of jobsData) {
      try {
        const result = await this.saveJob(jobData, employer);
        if (result.isNew) {
          results.created++;
        } else {
          results.updated++;
          if (result.wasReactivated) {
            results.reactivated++;
          }
        }
      } catch (error) {
        results.errors++;
        results.errorsDetails.push({
          title: jobData.title,
          error: error.message
        });
        console.error(`❌ Failed to save job: ${jobData.title} - ${error.message}`);
      }
    }
    
    // Verify and deactivate jobs that weren't found in current scrape
    if (verifyActiveJobs && foundSourceUrls.length > 0) {
      try {
        const verificationResult = await this.verifyActiveJobs(foundSourceUrls, employer.id);
        results.deactivated = verificationResult.count;
      } catch (error) {
        console.error(`⚠️ Error verifying active jobs: ${error.message}`);
      }
    }
    
    // Deactivate expired jobs (checks both expiresDate and calculatedExpiresDate)
    try {
      const expiredResult = await this.deactivateExpiredJobs();
      // Only count if we haven't already counted them in verification
      if (results.deactivated === 0) {
        results.deactivated = expiredResult.count;
      }
    } catch (error) {
      console.error(`⚠️ Error deactivating expired jobs: ${error.message}`);
    }
    
    // Update employer's last scraped timestamp
    await prisma.healthcareEmployer.update({
      where: { id: employer.id },
      data: { lastScraped: new Date() }
    });
    
    console.log(`\n📊 Save Results:`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Created: ${results.created}`);
    console.log(`   Updated: ${results.updated}`);
    if (results.reactivated > 0) {
      console.log(`   Reactivated: ${results.reactivated}`);
    }
    if (results.deactivated > 0) {
      console.log(`   Deactivated: ${results.deactivated}`);
    }
    console.log(`   Errors: ${results.errors}`);
    
    return results;
  }

  /**
   * Get state full name from abbreviation
   * @param {string} stateAbbr - State abbreviation
   * @returns {string} - Full state name
   */
  getStateFullName(stateAbbr) {
    const stateMap = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
    };
    
    return stateMap[stateAbbr.toUpperCase()] || stateAbbr;
  }

  /**
   * Mark job as inactive (job removed from source or expired)
   * @param {string} jobId - Job ID
   * @param {string} reason - Reason for deactivation ('expired', 'not_found', 'manual')
   * @returns {Promise<object>} - Updated job record
   */
  async deactivateJob(jobId, reason = 'not_found') {
    try {
      const updatedJob = await prisma.nursingJob.update({
        where: { id: jobId },
        data: { isActive: false }
      });
      
      console.log(`🔴 Deactivated job ${jobId}: ${reason}`);
      return updatedJob;
    } catch (error) {
      console.error(`❌ Error deactivating job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate all expired jobs
   * Checks both expiresDate and calculatedExpiresDate
   * @returns {Promise<object>} - Summary of deactivated jobs
   */
  async deactivateExpiredJobs() {
    try {
      const now = new Date();
      
      // Find jobs that are active but have expired
      const expiredJobs = await prisma.nursingJob.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresDate: { lte: now } },
            { calculatedExpiresDate: { lte: now } }
          ]
        },
        select: { id: true, title: true }
      });
      
      if (expiredJobs.length === 0) {
        console.log('✅ No expired jobs to deactivate');
        return { count: 0, jobs: [] };
      }
      
      // Deactivate all expired jobs
      const result = await prisma.nursingJob.updateMany({
        where: {
          id: { in: expiredJobs.map(j => j.id) }
        },
        data: { isActive: false }
      });
      
      console.log(`🔴 Deactivated ${result.count} expired jobs`);
      
      // Notify IndexNow about deactivated jobs (fire and forget - don't block on this)
      if (expiredJobs.length > 0) {
        // Fetch full job records with slugs for IndexNow
        const jobsWithSlugs = await prisma.nursingJob.findMany({
          where: { id: { in: expiredJobs.map(j => j.id) } },
          select: { slug: true }
        });
        
        notifyJobsBatch(jobsWithSlugs, 'delete').catch(err => {
          console.error(`⚠️ IndexNow batch notification failed for expired jobs:`, err.message);
        });
      }
      
      return {
        count: result.count,
        jobs: expiredJobs.map(j => ({ id: j.id, title: j.title }))
      };
    } catch (error) {
      console.error(`❌ Error deactivating expired jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify active jobs against source URLs during scraping
   * Marks jobs as inactive if they're not found in the current scrape results
   * @param {Array<string>} foundSourceUrls - Array of sourceUrls found in current scrape
   * @param {string} employerId - Employer ID to scope the check
   * @returns {Promise<object>} - Summary of deactivated jobs
   */
  async verifyActiveJobs(foundSourceUrls, employerId) {
    try {
      // Get all active jobs for this employer that weren't found in current scrape
      const activeJobs = await prisma.nursingJob.findMany({
        where: {
          employerId: employerId,
          isActive: true,
          sourceUrl: { notIn: foundSourceUrls }
        },
        select: { id: true, title: true, sourceUrl: true }
      });
      
      if (activeJobs.length === 0) {
        return { count: 0, jobs: [] };
      }
      
      // Mark them as inactive (they weren't found in current scrape)
      const result = await prisma.nursingJob.updateMany({
        where: {
          id: { in: activeJobs.map(j => j.id) }
        },
        data: { isActive: false }
      });
      
      console.log(`🔴 Marked ${result.count} jobs as inactive (not found in source)`);
      
      // Notify IndexNow about deactivated jobs (fire and forget - don't block on this)
      if (activeJobs.length > 0) {
        // Fetch full job records with slugs for IndexNow
        const jobsWithSlugs = await prisma.nursingJob.findMany({
          where: { id: { in: activeJobs.map(j => j.id) } },
          select: { slug: true }
        });
        
        notifyJobsBatch(jobsWithSlugs, 'delete').catch(err => {
          console.error(`⚠️ IndexNow batch notification failed for verified inactive jobs:`, err.message);
        });
      }
      
      return {
        count: result.count,
        jobs: activeJobs.map(j => ({ id: j.id, title: j.title, sourceUrl: j.sourceUrl }))
      };
    } catch (error) {
      console.error(`❌ Error verifying active jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get statistics about jobs in database
   * @returns {Promise<object>} - Job statistics
   */
  async getJobStats() {
    const [
      totalJobs,
      activeJobs,
      jobsByEmployer,
      jobsByState,
      jobsBySpecialty
    ] = await Promise.all([
      prisma.nursingJob.count(),
      prisma.nursingJob.count({ where: { isActive: true } }),
      prisma.nursingJob.groupBy({
        by: ['employerId'],
        _count: { id: true },
        where: { isActive: true }
      }),
      prisma.nursingJob.groupBy({
        by: ['state'],
        _count: { id: true },
        where: { isActive: true }
      }),
      prisma.nursingJob.groupBy({
        by: ['specialty'],
        _count: { id: true },
        where: { isActive: true, specialty: { not: null } }
      })
    ]);
    
    return {
      total: totalJobs,
      active: activeJobs,
      byEmployer: jobsByEmployer,
      byState: jobsByState,
      bySpecialty: jobsBySpecialty
    };
  }

  /**
   * Close database connection (for cleanup)
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}

module.exports = JobBoardService;
