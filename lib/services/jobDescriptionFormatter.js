/**
 * Job Description Formatter Service
 * Uses GPT-4o-mini to reformat job descriptions into a standardized template
 *
 * Template sections:
 * - About This Role (overview)
 * - Highlights (pay, location, facility, department/unit, schedule, sign-on bonus)
 * - What You'll Do (responsibilities)
 * - Requirements (education, experience, licenses)
 * - Benefits (if available)
 * - About {Employer} (always required)
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Post-process formatted description to remove "Not specified" lines
 * LLMs sometimes ignore instructions to omit lines and write "Not specified" anyway
 */
function cleanFormattedDescription(description) {
  if (!description) return description;

  // Patterns that indicate the LLM should have omitted the line entirely
  const notSpecifiedPatterns = [
    /not specified/i,
    /not mentioned/i,
    /not available/i,
    /not provided/i,
    /\bN\/A\b/i,
    /\bnone\b/i,
    /not stated/i,
  ];

  // Split into lines, filter out problematic ones from Highlights section
  const lines = description.split('\n');
  const cleanedLines = [];
  let inHighlights = false;

  for (const line of lines) {
    // Track if we're in the Highlights section
    if (line.includes('## 📋 Highlights')) {
      inHighlights = true;
      cleanedLines.push(line);
      continue;
    }
    if (line.startsWith('## ') && !line.includes('Highlights')) {
      inHighlights = false;
    }

    // Only filter bullet points in Highlights section
    if (inHighlights && line.trim().startsWith('-')) {
      const hasNotSpecified = notSpecifiedPatterns.some(pattern => pattern.test(line));
      if (hasNotSpecified) {
        // Skip this line entirely
        continue;
      }
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n');
}

/**
 * GPT-4o-mini prompt for standardized job description formatting
 */
const FORMATTING_SYSTEM_PROMPT = `You are a job description formatter for a nursing job board. Your job is to rewrite job descriptions into a clean, standardized format that highlights the most important information for job seekers.

IMPORTANT RULES:
1. Use the EXACT template structure provided
2. Extract and organize information into the correct sections
3. If information for a section is NOT available in the original, SKIP that section entirely - do NOT write "Not mentioned" or similar
4. Keep bullet points concise (1 line each when possible)
5. DO NOT make up or infer information not present in the original
6. Preserve all specific numbers (pay ranges, sign-on bonuses, years of experience)
7. Use emojis only in the Highlights section as shown
8. NEVER include placeholder text like "Not mentioned", "N/A", or "Not specified" - simply omit that line or section

OUTPUT FORMAT: Return ONLY the formatted markdown. No JSON, no commentary, no explanations.`;

/**
 * Get employer-specific formatting instructions
 * These are appended to the base prompt for employers with unique job description formats
 */
function getEmployerSpecificInstructions(job) {
  const employerSlug = job.employer?.slug;

  if (employerSlug === 'nyc-health-hospitals') {
    return `
**⚠️ NYC HEALTH + HOSPITALS SPECIFIC INSTRUCTIONS:**

This employer's job descriptions have a STRUCTURED FORMAT with labeled sections. You MUST extract content from the correct sections:

**CRITICAL - "What You'll Do" section:**
- Extract duties ONLY from the "Duties & Responsibilities:" section in the original
- Look for "Purpose of Position:" and "Examples of Typical Tasks:" - these contain the actual duties
- The duties are usually numbered (1, 2, 3...) - extract up to 10 of these
- Do NOT put content from "Minimum Qualifications:" in this section - that's a common mistake
- **IMPORTANT:** Sometimes the "Duties & Responsibilities:" section incorrectly contains qualification-like content (licenses, certifications, years of experience). If you see content like "A valid New York State license...", "BLS certification...", or "X years of experience..." in the duties section - that's actually qualifications, NOT duties. In this case, write 3-5 bullet points describing what this role likely involves based on the job title (e.g., "Community Health Nurse" → provide in-home patient care, assess patient health status, coordinate care plans, educate patients and families)

**CRITICAL - "Requirements" section:**
- Extract ONLY from "Minimum Qualifications:" section
- ONLY include requirements that are EXPLICITLY stated - do NOT infer or add common requirements
- If no education requirement is mentioned (like "BSN required"), do NOT add one - just omit the Education subsection
- If no experience requirement is mentioned, omit the Experience subsection
- Look for "Assignment Qualification Preference:" or "Preferred Requirements:" for preferred qualifications

**CRITICAL - "About" section:**
- Look for "About the Facility:" or "About NYC Health and Hospitals" section
- Extract the ACTUAL facility description including: bed count, specialties, awards, rankings, CMS ratings
- Do NOT write generic text if specific facility info exists (e.g., "320-bed skilled nursing facility with 5-Star CMS rating")

**Additional Compensation (if present):**
- If you see "Additional Salary Compensation:" section with education/certification/experience differentials
- Add a new section "## 💵 Additional Compensation" with this info - it's valuable for job seekers

**Schedule:**
- Include rotation info if mentioned (e.g., "Rotating weekends", "Alternating weekends", "Every other weekend")

`;
  }

  if (employerSlug === 'kaleida-health') {
    return `
**⚠️ KALEIDA HEALTH SPECIFIC INSTRUCTIONS:**

This employer's job descriptions contain EXACT education and experience requirements that you MUST preserve word-for-word.

**CRITICAL - "Requirements" section:**
- Look for "Education Requirements:" section in the original - extract the EXACT text
- If it says "Associate's Degree in Applied Science in Nursing required; Bachelor's degree preferred" → write EXACTLY that, do NOT change to "BSN required"
- If it says "Associate's required, Bachelor's preferred" → write EXACTLY that
- Look for "Experience:" section - extract the EXACT years and details
- If it says "Minimum of 2–3 years of nursing leadership" → write EXACTLY "2-3 years of nursing leadership", do NOT change to "3+ years"
- NEVER round up or generalize experience requirements

**CRITICAL - "What You'll Do" section:**
- Extract specific duties from the job description text
- If the job title mentions a specialty (e.g., "Oncology"), include relevant clinical duties
- Do NOT write generic bullets like "Provide patient care" - be specific to the role

**CRITICAL - Numbers:**
- Preserve EXACT salary figures (e.g., "$74,997 - $85,497")
- Preserve EXACT years of experience as stated (e.g., "2-3 years" NOT "3+ years")
- Preserve EXACT degree requirements as stated

`;
  }

  // No employer-specific instructions for other employers
  return '';
}

/**
 * Build the formatting prompt for a job
 */
function buildFormattingPrompt(job) {
  // Build structured metadata from fields scrapers capture (may not be in description text)
  const structuredFields = [];
  if (job.jobType) structuredFields.push(`**Job Type:** ${job.jobType}`);
  if (job.shiftType) structuredFields.push(`**Shift:** ${job.shiftType}`);
  if (job.department) structuredFields.push(`**Department/Unit:** ${job.department}`);
  if (job.hours) structuredFields.push(`**Hours:** ${job.hours}`);

  const structuredSection = structuredFields.length > 0
    ? `\n${structuredFields.join('\n')}`
    : '';

  return `Reformat this job description into the standardized template below.

**Job Title:** ${job.title}
**Employer:** ${job.employer?.name || 'Unknown'}
**Location:** ${job.city || 'Unknown'}, ${job.state || ''}${structuredSection}

---

**TEMPLATE TO USE (IMPORTANT: NO blank line between ## headers and content):**

## About This Role
[1-2 sentence overview of what this role entails and who it's ideal for. Extract from the intro/summary of the original.]

## 📋 Highlights
- 💰 **Pay:** [ONLY include if a dollar amount is EXPLICITLY stated in the original, e.g., "$40.70/hour" or "Salary: $85,000". OMIT this line completely if no dollar sign ($) appears in the original. Do NOT confuse hours worked (e.g., "24 hours/week") with hourly pay rates.]
- 📍 **Location:** [City, State]
- 🏥 **Facility:** [Specific hospital/facility name if part of a health system - OMIT if not mentioned]
- 🏢 **Department/Unit:** [Department or unit name, e.g., "Emergency Department", "ICU" - OMIT if not mentioned]
- ⏰ **Schedule:** [e.g., "Full-time, Day shift" or "Per Diem, Rotating"]
- 🎁 **Sign-On Bonus:** [ONLY include if the words "sign-on bonus", "signing bonus", or "welcome bonus" appear in the original WITH a dollar amount. OMIT this line completely if not explicitly stated. DO NOT invent or assume a sign-on bonus exists.]

(IMPORTANT: Only include lines where info is available. Do NOT write "Not mentioned" - just omit the line entirely.)

## What You'll Do
- [Extract SPECIFIC duty 1 from source - do NOT generalize]
- [Extract SPECIFIC duty 2 from source]
- [Extract SPECIFIC duty 3 from source]
- [Continue with actual duties from the original, up to 10 max]
- [If source has numbered tasks like "1. Assists in developing...", extract those exact items]

## Requirements
**Education:**
- [Education requirement, e.g., "BSN required, MSN preferred"]

**Experience:**
- [Experience requirement, e.g., "2+ years in acute care"]

**Licenses & Certifications:**
- [e.g., "Current RN License in [State]"]
- [e.g., "BLS certification required"]
- [e.g., "ACLS preferred"]

## Benefits
- [Benefit 1]
- [Benefit 2]
- [etc.]

(OMIT THIS ENTIRE SECTION if no benefits mentioned. Do NOT include with "Not mentioned" - just skip it.)

## About ${job.employer?.name || 'the Employer'}
[2-3 sentences about the employer. ALWAYS include this section - if employer info is not in the original, write a brief generic intro based on the employer name.]

---

**SECTION RULES:**

**CRITICAL FORMATTING RULE:** Do NOT add a blank line between ## section headers and their content. The content must start on the very next line after the header. Keep blank lines ONLY between sections (after content ends, before next ## header).

1. **About This Role**: Always include. Write 1-2 sentences summarizing the position.

2. **Highlights**:
   - Pay: ONLY include if an explicit dollar amount ($) is stated. Numbers like "24 hours" or "36 hours/week" are WORK HOURS, not pay. OMIT line if no $ amount exists.
   - Location: Always include (use the data provided).
   - Facility: IMPORTANT - If source contains a line like "Facility: Kings County Hospital Center", you MUST include this row. This applies to health systems with multiple hospitals.
   - Department/Unit: Include if a specific department or unit is mentioned (e.g., "Emergency Department", "ICU", "Cardiac Care Unit"). OMIT if not mentioned.
   - Schedule: Include if shift type or full-time/part-time mentioned. OMIT line if not mentioned.
   - Sign-On Bonus: ONLY include if "sign-on bonus", "signing bonus", or "welcome bonus" appears in source WITH a $ amount. DO NOT invent or assume bonuses exist - many jobs don't have them. OMIT if not explicitly stated.
   - NEVER write "Not mentioned" - just omit the line entirely.

3. **What You'll Do**: Always include. IMPORTANT: Extract the SPECIFIC duties and responsibilities from the original - do NOT summarize or generalize. If the source has numbered items like "1. Assists in developing policies..." include those exact tasks. Start with action verbs. Include up to 10 specific responsibilities.

4. **Requirements**: Always include. Separate into Education, Experience, Licenses & Certifications subsections. Be thorough - extract ALL education levels (ADN, BSN, MSN, DNP), specific years of experience, specialties, and ALL certifications (BLS, ACLS, PALS, NRP, specialty certs). Mark which are required vs preferred (e.g., "BSN required, MSN preferred").

5. **Benefits**: Only include if benefits are explicitly listed. OMIT entire section if no benefits - do NOT write "Not mentioned".

6. **About Employer**: ALWAYS include this section - never skip it. If employer info is in the original, use that. If not, write 1-2 generic sentences based on the employer name (e.g., "{Employer Name} is a leading healthcare provider committed to delivering exceptional patient care."). IMPORTANT: Convert any first-person language (our, we, us) to third-person (their, they, the organization) since this is a job board, not the employer's website.

---
${getEmployerSpecificInstructions(job)}
**ORIGINAL JOB DESCRIPTION:**

${job.description}

---

**YOUR FORMATTED OUTPUT:**`;
}

/**
 * Format a job description using GPT-4o-mini
 * @param {Object} job - Job object with title, description, employer, city, state
 * @returns {Object} { success, formattedDescription, tokensUsed, cost, error }
 */
async function formatJobDescription(job) {
  if (!job.description) {
    return {
      success: false,
      error: 'No description to format'
    };
  }

  try {
    const prompt = buildFormattingPrompt(job);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: FORMATTING_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2, // Low temperature for consistent output
      max_completion_tokens: 4000 // Most job descriptions fit in 2-3k tokens
    });

    const rawDescription = response.choices[0].message.content.trim();
    const formattedDescription = cleanFormattedDescription(rawDescription);
    const usage = response.usage;

    // Calculate cost (GPT-4o-mini pricing)
    // Input: $0.15 per 1M tokens, Output: $0.60 per 1M tokens
    const cost = (usage.prompt_tokens / 1_000_000) * 0.15 +
                 (usage.completion_tokens / 1_000_000) * 0.60;

    return {
      success: true,
      formattedDescription,
      tokensUsed: usage.total_tokens,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      cost,
      finishReason: response.choices[0].finish_reason
    };

  } catch (error) {
    console.error('Job description formatting error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format multiple jobs in batch
 * @param {Array} jobs - Array of job objects
 * @param {Object} options - { onProgress, delayMs }
 * @returns {Object} { results, totalCost, totalTokens, successCount, failCount }
 */
async function formatJobsBatch(jobs, options = {}) {
  const { onProgress, delayMs = 100 } = options;

  const results = [];
  let totalCost = 0;
  let totalTokens = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: jobs.length,
        jobId: job.id,
        jobTitle: job.title
      });
    }

    const result = await formatJobDescription(job);

    results.push({
      jobId: job.id,
      jobTitle: job.title,
      ...result
    });

    if (result.success) {
      successCount++;
      totalCost += result.cost;
      totalTokens += result.tokensUsed;
    } else {
      failCount++;
    }

    // Rate limiting delay
    if (delayMs > 0 && i < jobs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return {
    results,
    totalCost,
    totalTokens,
    successCount,
    failCount,
    averageCost: successCount > 0 ? totalCost / successCount : 0
  };
}

module.exports = {
  formatJobDescription,
  formatJobsBatch,
  buildFormattingPrompt,
  FORMATTING_SYSTEM_PROMPT
};
