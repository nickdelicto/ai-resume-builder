/**
 * Pricing Configuration
 *
 * Monetization strategy for the AI Resume Builder
 * Target audience: Healthcare professionals (nurses)
 */

// Single source of truth for free tier limits — imported by API endpoints
export const FREE_RESUME_LIMIT = 5;
export const FREE_DOWNLOAD_LIMIT = 1;

export const PRICING_TIERS = {
  free: {
    name: 'Free',
    planId: 'free',
    price: 0,
    features: {
      resumes: FREE_RESUME_LIMIT,
      pdfDownloads: 1,
      allTemplates: true,
      atsScore: true,           // Static rule-based scoring
      jobTargeting: false,       // AI-powered job matching
      aiContentAnalysis: false,  // LLM-powered suggestions
      aiBulletWriter: false,     // AI generates bullet points
      aiSummaryGenerator: false, // AI generates professional summary
      coverLetter: false,        // Coming later
    },
  },

  pro: {
    name: 'Pro',
    features: {
      resumes: 'unlimited',
      pdfDownloads: 'unlimited',
      allTemplates: true,
      atsScore: true,
      jobTargeting: true,
      aiContentAnalysis: true,
      aiBulletWriter: true,
      aiSummaryGenerator: true,
      coverLetter: true,  // When implemented
    },
  },
};

/**
 * Subscription Plans (maps to database SubscriptionPlan table)
 * These are the actual billable plans users can purchase
 */
export const SUBSCRIPTION_PLANS = {
  weekly: {
    id: 'weekly',
    name: 'Weekly Pro',
    description: 'Perfect for active job seekers on short-term search',
    price: 7.99,
    interval: 'weekly',
    tier: 'pro',
    isPopular: true,
    features: [
      'Unlimited resume downloads',
      'Create multiple versions',
      'All premium templates',
      'AI-powered improvements',
      'Job targeting & tailoring',
    ],
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Pro',
    description: 'Best value for extended job search',
    price: 19.99,
    interval: 'monthly',
    tier: 'pro',
    isPopular: false,
    features: [
      'Unlimited resume downloads',
      'Create multiple versions',
      'All premium templates',
      'AI-powered improvements',
      'Job targeting & tailoring',
      'Save 37% vs weekly',
    ],
  },
};

/**
 * Feature descriptions for UI display
 */
export const FEATURE_DESCRIPTIONS = {
  resumes: 'Number of resumes you can create',
  pdfDownloads: 'Download your resume as PDF',
  allTemplates: 'Access all resume templates',
  atsScore: 'ATS compatibility score with actionable checklist',
  jobTargeting: 'Tailor your resume to specific job postings',
  aiContentAnalysis: 'AI-powered suggestions to improve your content',
  aiBulletWriter: 'AI generates impactful bullet points from your experience',
  aiSummaryGenerator: 'AI crafts your professional summary',
  coverLetter: 'AI-powered cover letter generator',
};

/**
 * Paywall triggers - when to show upgrade prompts
 */
export const PAYWALL_TRIGGERS = {
  // When free tier limits are reached
  resumeLimitReached: true,
  downloadLimitReached: true,
  // When attempting to use AI features
  jobTargeting: true,
  aiFeatures: true,
};

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier, featureName) {
  const tierConfig = PRICING_TIERS[tier];
  if (!tierConfig) return false;
  return tierConfig.features[featureName] === true ||
         tierConfig.features[featureName] === 'unlimited';
}

/**
 * Check if user has exceeded free tier limits
 */
export function hasExceededLimit(tier, featureName, currentCount) {
  const tierConfig = PRICING_TIERS[tier];
  if (!tierConfig) return true;

  const limit = tierConfig.features[featureName];
  if (limit === 'unlimited' || limit === true) return false;
  if (typeof limit === 'number') return currentCount >= limit;
  return true;
}
