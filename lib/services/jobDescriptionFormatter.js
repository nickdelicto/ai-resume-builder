/**
 * Job Description Formatter Service
 * Uses GPT-4o-mini to reformat job descriptions into a standardized template
 *
 * Template sections:
 * - About This Role (overview)
 * - Highlights (pay, location, schedule, sign-on bonus)
 * - What You'll Do (responsibilities)
 * - Requirements (education, experience, licenses)
 * - Benefits (if available)
 * - About {Employer} (if available)
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Build the formatting prompt for a job
 */
function buildFormattingPrompt(job) {
  return `Reformat this job description into the standardized template below.

**Job Title:** ${job.title}
**Employer:** ${job.employer?.name || 'Unknown'}
**Location:** ${job.city || 'Unknown'}, ${job.state || ''}

---

**TEMPLATE TO USE (IMPORTANT: NO blank line between ## headers and content):**

## About This Role
[1-2 sentence overview of what this role entails and who it's ideal for. Extract from the intro/summary of the original.]

## 📋 Highlights
- 💰 **Pay:** [Pay range if mentioned, e.g., "$40.70 - $61.05/hour" - OMIT this line if not mentioned]
- 📍 **Location:** [City, State]
- ⏰ **Schedule:** [e.g., "Full-time, Day shift" or "Per Diem, Rotating"]
- 🎁 **Sign-On Bonus:** [e.g., "Up to $25,000" - OMIT this line if not mentioned]

(IMPORTANT: Only include lines where info is available. Do NOT write "Not mentioned" - just omit the line entirely.)

## What You'll Do
- [Key responsibility 1]
- [Key responsibility 2]
- [Key responsibility 3]
- [Key responsibility 4]
- [Key responsibility 5]
- [Add more if the original has more, but aim for 5-8 max]

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
[1-2 sentences about the employer if mentioned in the original. Skip if not available.]

---

**SECTION RULES:**

**CRITICAL FORMATTING RULE:** Do NOT add a blank line between ## section headers and their content. The content must start on the very next line after the header. Keep blank lines ONLY between sections (after content ends, before next ## header).

1. **About This Role**: Always include. Write 1-2 sentences summarizing the position.

2. **Highlights**:
   - Pay: Include if salary/hourly rate mentioned. Use exact numbers. OMIT line if not mentioned.
   - Location: Always include (use the data provided).
   - Schedule: Include if shift type or full-time/part-time mentioned. OMIT line if not mentioned.
   - Sign-On Bonus: Only include if explicitly mentioned. OMIT line if not mentioned.
   - NEVER write "Not mentioned" - just omit the line entirely.

3. **What You'll Do**: Always include. Extract key responsibilities. Start with action verbs.

4. **Requirements**: Always include. Separate into Education, Experience, Licenses subsections. Skip subsections if not mentioned.

5. **Benefits**: Only include if benefits are explicitly listed. OMIT entire section if no benefits - do NOT write "Not mentioned".

6. **About Employer**: Only include if employer description exists. OMIT entire section if not available.

---

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

    const formattedDescription = response.choices[0].message.content.trim();
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
