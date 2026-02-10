/**
 * ATS Score Service - Healthcare-Focused Resume Scoring
 *
 * Analyzes nursing resumes against ATS (Applicant Tracking System) criteria
 * with healthcare-specific factors that matter to nurse recruiters.
 *
 * Score Categories (Total: 100 points):
 * - Content Quality (40 points)
 * - Format & Structure (20 points)
 * - Healthcare Essentials (40 points)
 */

// Strong action verbs for nursing resumes
const POWER_VERBS = [
  'achieved', 'administered', 'assessed', 'assisted', 'collaborated',
  'coordinated', 'delivered', 'documented', 'educated', 'ensured',
  'evaluated', 'implemented', 'improved', 'led', 'maintained',
  'managed', 'mentored', 'monitored', 'organized', 'performed',
  'precepted', 'prioritized', 'provided', 'reduced', 'resolved',
  'responded', 'supervised', 'trained', 'triaged'
];

// Nursing-specific keywords
const NURSING_KEYWORDS = [
  'patient care', 'medication administration', 'vital signs', 'assessment',
  'documentation', 'clinical', 'bedside', 'charting', 'EMR', 'EHR', 'Epic',
  'Cerner', 'Meditech', 'IV', 'wound care', 'patient education', 'discharge',
  'care plan', 'interdisciplinary', 'HIPAA', 'infection control', 'code blue',
  'rapid response', 'telemetry', 'ventilator', 'titration', 'drips'
];

/**
 * Score Factors - Exactly 100 points total
 *
 * Content Quality: 40 points
 * Format & Structure: 20 points
 * Healthcare Essentials: 40 points
 */
const SCORE_FACTORS = {
  // ============================================
  // CONTENT QUALITY (40 points)
  // ============================================

  hasProfessionalSummary: {
    points: 8,
    category: 'content',
    label: 'Professional Summary',
    priority: 5,
    check: (data) => {
      const summary = data.summary || '';
      // More flexible: at least 30 chars is enough for a brief summary
      return summary.length >= 30;
    },
    suggestion: 'Add a professional summary (2-4 sentences highlighting your key qualifications)',
    details: (data) => {
      const len = (data.summary || '').length;
      if (len === 0) return 'No summary';
      if (len < 30) return `Too short (${len} chars)`;
      return 'Summary added';
    }
  },

  hasQuantifiedAchievements: {
    points: 10,
    category: 'content',
    label: 'Quantified Achievements',
    priority: 5,
    check: (data) => {
      const bullets = getAllExperienceBullets(data);
      if (bullets.length === 0) return false;
      const withNumbers = bullets.filter(b => /\d+/.test(b));
      return withNumbers.length >= 1;
    },
    suggestion: 'Add numbers to your achievements (e.g., "Managed care for 15 patients daily")',
    details: (data) => {
      const bullets = getAllExperienceBullets(data);
      const withNumbers = bullets.filter(b => /\d+/.test(b));
      return `${withNumbers.length} bullets with numbers`;
    }
  },

  usesPowerVerbs: {
    points: 6,
    category: 'content',
    label: 'Action Verbs',
    priority: 3,
    check: (data) => {
      const bullets = getAllExperienceBullets(data);
      if (bullets.length === 0) return false;
      const withPowerVerbs = bullets.filter(bullet => {
        const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() || '';
        return POWER_VERBS.some(verb => firstWord.startsWith(verb));
      });
      return withPowerVerbs.length >= 1;
    },
    suggestion: 'Start bullets with action verbs (Managed, Coordinated, Assessed)',
    details: (data) => {
      const bullets = getAllExperienceBullets(data);
      const withPowerVerbs = bullets.filter(bullet => {
        const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() || '';
        return POWER_VERBS.some(verb => firstWord.startsWith(verb));
      });
      return `${withPowerVerbs.length}/${bullets.length} use action verbs`;
    }
  },

  experienceHasDetails: {
    points: 8,
    category: 'content',
    label: 'Experience Details',
    priority: 4,
    check: (data) => {
      const experience = data.experience || [];
      if (experience.length === 0) return false;
      return experience.some(job => (job.description || '').length >= 30);
    },
    suggestion: 'Add bullet points describing your responsibilities and achievements',
    details: (data) => {
      const experience = data.experience || [];
      const withDetails = experience.filter(j => (j.description || '').length >= 30);
      return `${withDetails.length}/${experience.length} jobs have details`;
    }
  },

  hasSkills: {
    points: 8,
    category: 'content',
    label: 'Skills Section',
    priority: 4,
    check: (data) => {
      const skills = data.skills || [];
      return skills.length >= 3;
    },
    suggestion: 'Add at least 3-5 relevant skills',
    details: (data) => {
      const count = (data.skills || []).length;
      return `${count} skills listed`;
    }
  },

  // ============================================
  // FORMAT & STRUCTURE (20 points)
  // ============================================

  hasContactInfo: {
    points: 6,
    category: 'format',
    label: 'Contact Info',
    priority: 5,
    check: (data) => {
      const pi = data.personalInfo || {};
      return !!(pi.name && pi.email && pi.phone);
    },
    suggestion: 'Include your name, email, and phone number',
    details: (data) => {
      const pi = data.personalInfo || {};
      const missing = [];
      if (!pi.name) missing.push('name');
      if (!pi.email) missing.push('email');
      if (!pi.phone) missing.push('phone');
      return missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Complete';
    }
  },

  hasLocation: {
    points: 4,
    category: 'format',
    label: 'Location',
    priority: 3,
    check: (data) => {
      const location = data.personalInfo?.location || '';
      return location.length >= 2;
    },
    suggestion: 'Add your city and state',
    details: (data) => {
      return data.personalInfo?.location ? 'Location added' : 'No location';
    }
  },

  hasExperience: {
    points: 6,
    category: 'format',
    label: 'Work Experience',
    priority: 5,
    check: (data) => {
      const experience = data.experience || [];
      return experience.length > 0 && experience.some(j => j.title && j.company);
    },
    suggestion: 'Add at least one work experience entry with job title and company',
    details: (data) => {
      const experience = data.experience || [];
      return `${experience.length} job(s) added`;
    }
  },

  hasEducation: {
    points: 4,
    category: 'format',
    label: 'Education',
    priority: 4,
    check: (data) => {
      const education = data.education || [];
      return education.length > 0 && education.some(e => e.degree || e.school);
    },
    suggestion: 'Add your nursing degree and school',
    details: (data) => {
      const education = data.education || [];
      return `${education.length} education entry(s)`;
    }
  },

  // ============================================
  // HEALTHCARE ESSENTIALS (40 points)
  // These are critical for nursing job applications
  // ============================================

  hasNursingLicense: {
    points: 10,
    category: 'healthcare',
    label: 'Nursing License',
    priority: 5,
    check: (data) => {
      const licenses = data.licenses || [];
      return licenses.length > 0 && licenses.some(l => l.state || l.type);
    },
    suggestion: 'Add your nursing license (required for healthcare jobs)',
    details: (data) => {
      const licenses = data.licenses || [];
      if (licenses.length === 0) return 'No license added';
      return `${licenses.length} license(s) added`;
    }
  },

  hasBLSCertification: {
    points: 8,
    category: 'healthcare',
    label: 'BLS Certification',
    priority: 5,
    check: (data) => {
      const certs = data.certifications || [];
      // Check for BLS, BCLS, or Basic Life Support
      return certs.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('bls') || name.includes('basic life support') || name.includes('bcls');
      });
    },
    suggestion: 'Add BLS certification (required by 98% of employers)',
    details: (data) => {
      const certs = data.certifications || [];
      const hasBLS = certs.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('bls') || name.includes('basic life support');
      });
      return hasBLS ? 'BLS added' : 'BLS not found';
    }
  },

  hasOtherCertifications: {
    points: 6,
    category: 'healthcare',
    label: 'Additional Certifications',
    priority: 4,
    check: (data) => {
      const certs = data.certifications || [];
      // Has certifications beyond BLS (ACLS, PALS, specialty certs)
      return certs.length >= 2;
    },
    suggestion: 'Add ACLS, PALS, or specialty certifications',
    details: (data) => {
      const certs = data.certifications || [];
      return `${certs.length} certification(s)`;
    }
  },

  hasEhrExperience: {
    points: 8,
    category: 'healthcare',
    label: 'EHR/EMR Systems',
    priority: 4,
    check: (data) => {
      const healthcareSkills = data.healthcareSkills || {};
      const ehrSystems = healthcareSkills.ehrSystems || [];
      return ehrSystems.length > 0;
    },
    suggestion: 'Add EHR systems you know (Epic, Cerner, Meditech)',
    details: (data) => {
      const ehrSystems = data.healthcareSkills?.ehrSystems || [];
      if (ehrSystems.length === 0) return 'No EHR listed';
      return ehrSystems.slice(0, 3).join(', ');
    }
  },

  hasClinicalSkills: {
    points: 8,
    category: 'healthcare',
    label: 'Clinical Skills',
    priority: 4,
    check: (data) => {
      const healthcareSkills = data.healthcareSkills || {};
      const clinicalSkills = healthcareSkills.clinicalSkills || [];
      return clinicalSkills.length >= 3;
    },
    suggestion: 'Add clinical skills relevant to your specialty',
    details: (data) => {
      const clinicalSkills = data.healthcareSkills?.clinicalSkills || [];
      return `${clinicalSkills.length} clinical skills`;
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAllExperienceBullets(data) {
  const experience = data.experience || [];
  const bullets = [];

  experience.forEach(job => {
    const desc = job.description || '';
    const lines = desc.split(/[\n•\-\d\.]+/).map(s => s.trim()).filter(s => s.length > 10);
    bullets.push(...lines);
  });

  return bullets;
}

function getResumeWordCount(data) {
  let text = '';
  const pi = data.personalInfo || {};
  text += `${pi.name || ''} ${pi.email || ''} ${pi.location || ''} `;
  text += (data.summary || '') + ' ';
  (data.experience || []).forEach(job => {
    text += `${job.title || ''} ${job.company || ''} ${job.description || ''} `;
  });
  (data.education || []).forEach(edu => {
    text += `${edu.degree || ''} ${edu.school || ''} `;
  });
  text += (data.skills || []).join(' ');
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function getResumeFullText(data) {
  let text = '';
  const pi = data.personalInfo || {};
  text += Object.values(pi).join(' ') + ' ';
  text += (data.summary || '') + ' ';
  (data.experience || []).forEach(job => {
    text += `${job.title || ''} ${job.company || ''} ${job.description || ''} `;
  });
  (data.education || []).forEach(edu => {
    text += `${edu.degree || ''} ${edu.school || ''} ${edu.field || ''} `;
  });
  text += (data.skills || []).join(' ') + ' ';
  const additional = data.additional || {};
  (additional.certifications || []).forEach(cert => {
    text += `${cert.name || ''} ${cert.issuer || ''} `;
  });
  return text.toLowerCase();
}

function extractKeywords(jobDescription) {
  if (!jobDescription) return [];
  const text = jobDescription.toLowerCase();
  const words = text.split(/[\s,;:.\-()[\]{}]+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'our', 'we', 'you', 'your',
    'their', 'this', 'that', 'these', 'those', 'it', 'its', 'all', 'each', 'every'
  ]);
  const keywords = [...new Set(
    words
      .filter(w => w.length > 3 && !stopWords.has(w))
      .filter(w => /^[a-z]+$/.test(w))
  )];
  return keywords.slice(0, 30);
}

// ============================================
// MAIN EXPORT FUNCTIONS
// ============================================

/**
 * Calculate ATS Score for resume data
 */
export function calculateATSScore(resumeData, jobContext = null) {
  const results = {
    score: 0,
    maxScore: 100,
    percentage: 0,
    factors: {},
    suggestions: [],
    breakdown: {
      content: { earned: 0, possible: 40, percentage: 0 },
      format: { earned: 0, possible: 20, percentage: 0 },
      healthcare: { earned: 0, possible: 40, percentage: 0 }
    },
    jobMatch: null
  };

  if (!resumeData) {
    return results;
  }

  // Calculate each factor
  Object.entries(SCORE_FACTORS).forEach(([key, factor]) => {
    let passed = false;
    try {
      passed = factor.check(resumeData);
    } catch (e) {
      console.error(`Error checking factor ${key}:`, e);
    }

    const earned = passed ? factor.points : 0;

    results.factors[key] = {
      key,
      passed,
      points: earned,
      maxPoints: factor.points,
      label: factor.label,
      category: factor.category,
      priority: factor.priority,
      details: factor.details ? factor.details(resumeData) : null
    };

    results.score += earned;
    results.breakdown[factor.category].earned += earned;

    if (!passed) {
      results.suggestions.push({
        factor: key,
        label: factor.label,
        suggestion: factor.suggestion,
        points: factor.points,
        priority: factor.priority,
        category: factor.category
      });
    }
  });

  // Calculate percentages
  results.percentage = Math.round((results.score / results.maxScore) * 100);

  Object.keys(results.breakdown).forEach(category => {
    const cat = results.breakdown[category];
    cat.percentage = Math.round((cat.earned / cat.possible) * 100);
  });

  // Sort suggestions by priority then points
  results.suggestions.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.points - a.points;
  });

  // Calculate job match if context provided
  if (jobContext?.description) {
    results.jobMatch = calculateJobMatchScore(resumeData, jobContext);
  }

  return results;
}

/**
 * Calculate how well resume matches a job description
 */
export function calculateJobMatchScore(resumeData, jobContext) {
  if (!jobContext?.description) return null;

  const jobKeywords = extractKeywords(jobContext.description);
  if (jobKeywords.length === 0) return null;

  const resumeText = getResumeFullText(resumeData);
  const matched = [];
  const missing = [];

  jobKeywords.forEach(keyword => {
    if (resumeText.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  const importantKeywords = missing.filter(k =>
    NURSING_KEYWORDS.some(nk => nk.includes(k) || k.includes(nk.split(' ')[0]))
  );

  return {
    matchPercent: Math.round((matched.length / jobKeywords.length) * 100),
    matched,
    missing,
    importantMissing: importantKeywords.slice(0, 5),
    totalKeywords: jobKeywords.length,
    jobTitle: jobContext.jobTitle || 'Job'
  };
}

/**
 * Get score label, color, and message based on score
 */
export function getScoreLabel(score) {
  if (score >= 90) {
    return {
      label: 'Excellent',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      badge: '🎯',
      message: 'Ready to apply!'
    };
  }
  if (score >= 75) {
    return {
      label: 'Strong',
      color: '#34a853',
      bgColor: 'rgba(52, 168, 83, 0.1)',
      badge: '✅',
      message: 'Looking great!'
    };
  }
  if (score >= 50) {
    return {
      label: 'Good',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      badge: '📈',
      message: 'Almost there!'
    };
  }
  if (score >= 25) {
    return {
      label: 'Building',
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      badge: '🔨',
      message: 'Keep going!'
    };
  }
  return {
    label: 'Getting Started',
    color: '#9ca3af',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    badge: '👋',
    message: 'Let\'s build your resume!'
  };
}

/**
 * Get category info
 */
export function getCategoryInfo(category) {
  const categories = {
    content: { label: 'Content', color: '#1a73e8', icon: '📝' },
    format: { label: 'Format', color: '#6c5ce7', icon: '📋' },
    healthcare: { label: 'Healthcare', color: '#10b981', icon: '🏥' }
  };
  return categories[category] || { label: category, color: '#666', icon: '•' };
}

/**
 * Check if score crossed a milestone
 */
export function checkMilestone(previousScore, newScore) {
  const milestones = [
    { threshold: 25, message: 'Great start!' },
    { threshold: 50, message: 'Halfway there!' },
    { threshold: 75, message: 'Looking strong!' },
    { threshold: 90, message: 'Excellent work!' }
  ];

  for (const milestone of milestones) {
    if (previousScore < milestone.threshold && newScore >= milestone.threshold) {
      return milestone;
    }
  }

  return null;
}

export default {
  calculateATSScore,
  calculateJobMatchScore,
  getScoreLabel,
  getCategoryInfo,
  checkMilestone
};
