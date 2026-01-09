/**
 * Salary Statistics Calculation Utilities
 * Handles calculation of average salaries, ranges, and breakdowns
 */

/**
 * Check if a job is a Travel position (should be excluded from salary stats)
 * Travel positions have weekly rates that would skew hourly/annual calculations
 * @param {object} job - Job object
 * @returns {boolean} - True if job is a travel position
 */
function isTravelJob(job) {
  if (!job) return false;
  const jobType = job.jobType || '';
  return jobType.toLowerCase() === 'travel';
}

/**
 * Calculate midpoint salary for a job
 * Uses midpoint if range exists, otherwise uses single value
 * @param {object} job - Job object with salary fields
 * @param {string} type - 'hourly' or 'annual'
 * @returns {number|null} - Midpoint salary or null if no data
 */
function getJobSalaryMidpoint(job, type = 'hourly') {
  if (type === 'hourly') {
    if (job.salaryMinHourly && job.salaryMaxHourly) {
      return (job.salaryMinHourly + job.salaryMaxHourly) / 2; // Midpoint
    } else if (job.salaryMinHourly) {
      return job.salaryMinHourly; // Only min
    } else if (job.salaryMaxHourly) {
      return job.salaryMaxHourly; // Only max
    }
  } else if (type === 'annual') {
    if (job.salaryMinAnnual && job.salaryMaxAnnual) {
      return (job.salaryMinAnnual + job.salaryMaxAnnual) / 2; // Midpoint
    } else if (job.salaryMinAnnual) {
      return job.salaryMinAnnual; // Only min
    } else if (job.salaryMaxAnnual) {
      return job.salaryMaxAnnual; // Only max
    }
  }
  return null; // No salary data
}

/**
 * Calculate salary statistics from array of jobs
 * @param {Array} jobs - Array of job objects with salary fields
 * @returns {object} - Salary statistics object
 */
function calculateSalaryStats(jobs) {
  if (!jobs || jobs.length === 0) {
    return {
      jobCount: 0,
      hourly: null,
      annual: null,
      bySpecialty: [],
      byEmployer: []
    };
  }

  // Filter jobs with salary data, excluding Travel positions
  // (Travel jobs have weekly rates that would skew hourly/annual calculations)
  const jobsWithHourly = jobs.filter(job =>
    (job.salaryMinHourly !== null || job.salaryMaxHourly !== null) && !isTravelJob(job)
  );
  const jobsWithAnnual = jobs.filter(job =>
    (job.salaryMinAnnual !== null || job.salaryMaxAnnual !== null) && !isTravelJob(job)
  );

  // Calculate hourly statistics
  let hourlyStats = null;
  if (jobsWithHourly.length > 0) {
    const hourlyMidpoints = jobsWithHourly
      .map(job => getJobSalaryMidpoint(job, 'hourly'))
      .filter(val => val !== null);
    
    if (hourlyMidpoints.length > 0) {
      const avgHourly = hourlyMidpoints.reduce((sum, val) => sum + val, 0) / hourlyMidpoints.length;
      const minHourly = Math.min(...jobsWithHourly.map(j => j.salaryMinHourly).filter(v => v !== null));
      const maxHourly = Math.max(...jobsWithHourly.map(j => j.salaryMaxHourly).filter(v => v !== null));
      
      hourlyStats = {
        average: avgHourly,
        min: minHourly,
        max: maxHourly,
        jobCount: hourlyMidpoints.length
      };
    }
  }

  // Calculate annual statistics
  let annualStats = null;
  if (jobsWithAnnual.length > 0) {
    const annualMidpoints = jobsWithAnnual
      .map(job => getJobSalaryMidpoint(job, 'annual'))
      .filter(val => val !== null);
    
    if (annualMidpoints.length > 0) {
      const avgAnnual = annualMidpoints.reduce((sum, val) => sum + val, 0) / annualMidpoints.length;
      const minAnnual = Math.min(...jobsWithAnnual.map(j => j.salaryMinAnnual).filter(v => v !== null));
      const maxAnnual = Math.max(...jobsWithAnnual.map(j => j.salaryMaxAnnual).filter(v => v !== null));
      
      annualStats = {
        average: avgAnnual,
        min: minAnnual,
        max: maxAnnual,
        jobCount: annualMidpoints.length
      };
    }
  }

  // Calculate breakdown by specialty
  const specialtyMap = new Map();
  jobsWithHourly.forEach(job => {
    if (job.specialty) {
      if (!specialtyMap.has(job.specialty)) {
        specialtyMap.set(job.specialty, []);
      }
      specialtyMap.get(job.specialty).push(job);
    }
  });

  const bySpecialty = Array.from(specialtyMap.entries())
    .map(([specialty, specialtyJobs]) => {
      // Only include if 2+ jobs (as discussed)
      if (specialtyJobs.length < 2) return null;
      
      const hourlyMidpoints = specialtyJobs
        .map(job => getJobSalaryMidpoint(job, 'hourly'))
        .filter(val => val !== null);
      const annualMidpoints = specialtyJobs
        .map(job => getJobSalaryMidpoint(job, 'annual'))
        .filter(val => val !== null);
      
      if (hourlyMidpoints.length === 0 && annualMidpoints.length === 0) return null;
      
      const result = {
        specialty,
        jobCount: specialtyJobs.length,
        hourly: null,
        annual: null
      };
      
      if (hourlyMidpoints.length > 0) {
        result.hourly = {
          average: hourlyMidpoints.reduce((sum, val) => sum + val, 0) / hourlyMidpoints.length,
          min: Math.min(...specialtyJobs.map(j => j.salaryMinHourly).filter(v => v !== null)),
          max: Math.max(...specialtyJobs.map(j => j.salaryMaxHourly).filter(v => v !== null))
        };
      }
      
      if (annualMidpoints.length > 0) {
        result.annual = {
          average: annualMidpoints.reduce((sum, val) => sum + val, 0) / annualMidpoints.length,
          min: Math.min(...specialtyJobs.map(j => j.salaryMinAnnual).filter(v => v !== null)),
          max: Math.max(...specialtyJobs.map(j => j.salaryMaxAnnual).filter(v => v !== null))
        };
      }
      
      return result;
    })
    .filter(Boolean)
    .sort((a, b) => b.jobCount - a.jobCount); // Sort by job count descending

  // Calculate breakdown by employer
  const employerMap = new Map();
  jobsWithHourly.forEach(job => {
    if (job.employerId) {
      const key = job.employerId;
      if (!employerMap.has(key)) {
        employerMap.set(key, {
          employerId: key,
          employerName: job.employer?.name || 'Unknown',
          employerSlug: job.employer?.slug || null,
          jobs: []
        });
      }
      employerMap.get(key).jobs.push(job);
    }
  });

  const byEmployer = Array.from(employerMap.values())
    .map(employerData => {
      // Only include if 2+ jobs
      if (employerData.jobs.length < 2) return null;
      
      const hourlyMidpoints = employerData.jobs
        .map(job => getJobSalaryMidpoint(job, 'hourly'))
        .filter(val => val !== null);
      const annualMidpoints = employerData.jobs
        .map(job => getJobSalaryMidpoint(job, 'annual'))
        .filter(val => val !== null);
      
      if (hourlyMidpoints.length === 0 && annualMidpoints.length === 0) return null;
      
      const result = {
        employerId: employerData.employerId,
        employerName: employerData.employerName,
        employerSlug: employerData.employerSlug,
        jobCount: employerData.jobs.length,
        hourly: null,
        annual: null
      };
      
      if (hourlyMidpoints.length > 0) {
        result.hourly = {
          average: hourlyMidpoints.reduce((sum, val) => sum + val, 0) / hourlyMidpoints.length,
          min: Math.min(...employerData.jobs.map(j => j.salaryMinHourly).filter(v => v !== null)),
          max: Math.max(...employerData.jobs.map(j => j.salaryMaxHourly).filter(v => v !== null))
        };
      }
      
      if (annualMidpoints.length > 0) {
        result.annual = {
          average: annualMidpoints.reduce((sum, val) => sum + val, 0) / annualMidpoints.length,
          min: Math.min(...employerData.jobs.map(j => j.salaryMinAnnual).filter(v => v !== null)),
          max: Math.max(...employerData.jobs.map(j => j.salaryMaxAnnual).filter(v => v !== null))
        };
      }
      
      return result;
    })
    .filter(Boolean)
    .sort((a, b) => b.jobCount - a.jobCount); // Sort by job count descending

  return {
    jobCount: Math.max(jobsWithHourly.length, jobsWithAnnual.length),
    hourly: hourlyStats,
    annual: annualStats,
    bySpecialty,
    byEmployer
  };
}

/**
 * Format salary for display (no rounding, show decimals)
 * @param {number} amount - Salary amount
 * @param {string} type - 'hourly' or 'annual'
 * @returns {string} - Formatted salary string
 */
function formatSalary(amount, type = 'hourly') {
  if (amount === null || amount === undefined) return null;
  
  if (type === 'hourly') {
    return `$${amount.toFixed(2)}/hour`;
  } else if (type === 'annual') {
    return `$${Math.round(amount).toLocaleString()}/year`;
  }
  return null;
}

/**
 * Format salary range for display
 * @param {number} min - Minimum salary
 * @param {number} max - Maximum salary
 * @param {string} type - 'hourly' or 'annual'
 * @returns {string} - Formatted range string
 */
function formatSalaryRange(min, max, type = 'hourly') {
  if (min === null || max === null) return null;
  
  if (type === 'hourly') {
    return `$${min.toFixed(2)} - $${max.toFixed(2)}/hour`;
  } else if (type === 'annual') {
    return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}/year`;
  }
  return null;
}

module.exports = {
  calculateSalaryStats,
  formatSalary,
  formatSalaryRange,
  getJobSalaryMidpoint
};

