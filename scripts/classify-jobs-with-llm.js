// Load environment variables (required for cron jobs)
require('dotenv').config();

/**
 * LLM-Based Job Classification Script
 * Uses OpenAI GPT-4o-mini to accurately classify nursing jobs
 * 
 * Features:
 * - Validates if job is a Staff RN position (not NP, CRNA, LPN, etc.)
 * - Assigns accurate specialty (ICU, ER, Med-Surg, etc.)
 * - Detects job type (Full Time, Part Time, PRN, etc.)
 * - Formats description into clean, standardized markdown
 * - Only classifies jobs scraped within last 48 hours (prevents stale jobs from being activated)
 * 
 * Usage:
 *   node scripts/classify-jobs-with-llm.js [--test] [--limit=20] [--employer=cleveland-clinic]
 * 
 * Options:
 *   --test: Test mode - doesn't save to DB, just shows results
 *   --limit=N: Process only first N jobs (default: 20 for test, all for production)
 *   --employer=slug: Only process jobs from specific employer
 */

// Load environment variables from .env file
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const { normalizeExperienceLevel } = require('../lib/utils/experienceLevelUtils');
const googleIndexingService = require('../lib/services/googleIndexingService');
const { formatJobDescription } = require('../lib/services/jobDescriptionFormatter');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// All supported specialties (extracted from detectSpecialty function)
// Import specialties from centralized constants file
const { SPECIALTIES, normalizeSpecialty } = require('../lib/constants/specialties');
// Note: "Travel" is NOT a specialty - it's a job type (employment model)
// Travel nurses still have a specialty (ICU, ER, etc.)

// Parse command line arguments
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const employerArg = args.find(arg => arg.startsWith('--employer='));

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : (isTestMode ? 20 : null);

/**
 * Extract salary information from formatted description
 * Parses patterns like "💰 **Pay:** $78.75/hour" or "$45-$55/hr" from the description
 * @param {string} description - The formatted job description
 * @returns {Object} - { salaryMin, salaryMax, salaryType, salaryMinHourly, salaryMaxHourly, salaryMinAnnual, salaryMaxAnnual }
 */
function extractSalaryFromDescription(description) {
  if (!description) return {};

  // Pattern 1: "💰 **Pay:** $XX.XX/hour" or "$XX-$YY/hour" or "$XX.XX - $YY.YY/hr"
  // IMPORTANT: Dollar sign ($) is REQUIRED to avoid matching work hours like "24 hours"
  const hourlyPatterns = [
    /\*\*Pay:\*\*\s*\$([\d,.]+)\s*(?:[-–—to]+\s*\$?([\d,.]+))?\s*\/?\s*(?:hour|hr|hourly)/i,
    /Pay:\s*\$([\d,.]+)\s*(?:[-–—to]+\s*\$?([\d,.]+))?\s*\/?\s*(?:hour|hr|hourly)/i,
    /\$([\d,.]+)\s*[-–—to]+\s*\$?([\d,.]+)\s*\/?\s*(?:hour|hr|hourly)/i,
    /\$([\d,.]+)\s*\/?\s*(?:hour|hr|hourly)/i
  ];

  // Pattern 2: Annual salary patterns "$XX,XXX - $YY,YYY" or "$XX,XXX/year"
  // IMPORTANT: Dollar sign ($) is REQUIRED
  const annualPatterns = [
    /\*\*Pay:\*\*\s*\$([\d,]+)\s*(?:[-–—to]+\s*\$?([\d,]+))?\s*\/?\s*(?:year|annual|annually|yr)/i,
    /Pay:\s*\$([\d,]+)\s*(?:[-–—to]+\s*\$?([\d,]+))?\s*\/?\s*(?:year|annual|annually|yr)/i,
    /\$([\d,]+)\s*[-–—to]+\s*\$?([\d,]+)\s*\/?\s*(?:year|annual|annually|yr)/i,
    /salary.*?\$([\d,]+)\s*[-–—to]+\s*\$?([\d,]+)/i
  ];

  let salaryMin = null;
  let salaryMax = null;
  let salaryType = null;

  // Try hourly patterns first
  for (const pattern of hourlyPatterns) {
    const match = description.match(pattern);
    if (match) {
      salaryMin = parseFloat(match[1].replace(/,/g, ''));
      salaryMax = match[2] ? parseFloat(match[2].replace(/,/g, '')) : salaryMin;
      salaryType = 'hourly';
      break;
    }
  }

  // If no hourly match, try annual patterns
  if (!salaryMin) {
    for (const pattern of annualPatterns) {
      const match = description.match(pattern);
      if (match) {
        salaryMin = parseFloat(match[1].replace(/,/g, ''));
        salaryMax = match[2] ? parseFloat(match[2].replace(/,/g, '')) : salaryMin;
        salaryType = 'annual';
        break;
      }
    }
  }

  // If still no match, try a general dollar amount in Highlights section
  // IMPORTANT: Dollar sign ($) is REQUIRED
  if (!salaryMin) {
    const highlightsMatch = description.match(/## 📋 Highlights[\s\S]*?💰.*?\$([\d,.]+)/i);
    if (highlightsMatch) {
      const value = parseFloat(highlightsMatch[1].replace(/,/g, ''));
      salaryMin = value;
      salaryMax = value;
      // Determine type by value magnitude
      salaryType = value > 500 ? 'annual' : 'hourly';
    }
  }

  if (!salaryMin) return {};

  // Calculate hourly/annual equivalents
  const result = {
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryType: salaryType
  };

  if (salaryType === 'hourly') {
    result.salaryMinHourly = Math.round(salaryMin);
    result.salaryMaxHourly = Math.round(salaryMax);
    result.salaryMinAnnual = Math.round(salaryMin * 2080);
    result.salaryMaxAnnual = Math.round(salaryMax * 2080);
  } else if (salaryType === 'annual') {
    result.salaryMinAnnual = Math.round(salaryMin);
    result.salaryMaxAnnual = Math.round(salaryMax);
    result.salaryMinHourly = Math.round(salaryMin / 2080);
    result.salaryMaxHourly = Math.round(salaryMax / 2080);
  }

  return result;
}
const employerSlug = employerArg ? employerArg.split('=')[1] : null;

console.log('🤖 LLM Job Classifier Starting...\n');
console.log(`Mode: ${isTestMode ? '🧪 TEST (no DB changes)' : '✅ PRODUCTION (will save to DB)'}`);
console.log(`Limit: ${limit || 'ALL jobs'}`);
console.log(`Employer: ${employerSlug || 'ALL employers'}\n`);

/**
 * Build the LLM prompt for job classification
 */
function buildClassificationPrompt(job) {
  // Truncate description to save tokens (first 1000 chars is usually enough)
  const descriptionPreview = job.description ? job.description.slice(0, 1300) : '';
  
  return `You are an expert nursing job classifier. Analyze this job posting and classify it accurately.

**Job Title:** ${job.title || 'N/A'}

**Description Preview:** ${descriptionPreview}

**Location:** ${job.city}, ${job.state}

**Employer:** ${job.employer?.name || 'N/A'}

---

**Task 1: Verify this is a Registered Nurse (RN) position that requires ONLY an RN license**
- Return TRUE if: Staff RN, Bedside RN, Clinical RN, Unit RN, Charge Nurse, Nurse Manager, Assistant Nurse Manager, Team Lead, Coordinator (if only requires RN license)
- Return FALSE ONLY if the position requires an ADVANCED NURSING DEGREE:
  * Nurse Practitioner (NP) - requires Master's/DNP
  * CRNA (Certified Registered Nurse Anesthetist) - requires Master's/DNP
  * CNS (Clinical Nurse Specialist) - requires Master's/DNP
  * CNM (Certified Nurse Midwife) - requires Master's/DNP
  * OR if it's NOT an RN position at all: LPN, LVN, CNA, Medical Assistant, non-nursing roles
- KEY: If the job only requires RN license (BSN or Associate degree acceptable), return TRUE even if it's a leadership/management role

**Task 2: Assign the MOST ACCURATE specialty (REQUIRED - never return null)**
Choose ONE from this list: ${SPECIALTIES.join(', ')}

CRITICAL: You MUST always assign a specialty. Never return null for specialty.

Guidelines:
- If job clearly specifies a unit/specialty, use that specific specialty (ICU, ER, OR, etc.)
- Use "Float Pool" ONLY if job explicitly mentions: float, floating, multi-specialty, rotational between units, or can work in any unit
- If no specific specialty can be determined, INFER from context clues:
  * Job in "ambulatory", "clinic", "outpatient", "physician office" setting → Ambulatory Care
  * Job mentions "home health", "home care", "visiting nurse" → Home Health
  * Job in "long-term care", "skilled nursing facility", "SNF", "nursing home" → Long-Term Care
  * Job in "rehabilitation", "rehab" → Rehabilitation
  * Job mentions "case management", "care coordination" → Case Management
  * Job in "oncology", "cancer center" → Oncology
  * If truly NO context clues exist → "General Nursing" (last resort)
- Prioritize specific specialties over general ones
- Examples:
  * "Float Pool RN" or "Multi-Specialty RN" → Float Pool
  * "ICU RN" → ICU
  * "Emergency Department Nurse" → ER
  * "RN - Outpatient Clinic" → Ambulatory Care
  * "Generic RN with vague description" → General Nursing

**Task 3: Detect employment type**
Options: Full Time, Part Time, PRN, Per Diem, Contract, Travel, null

Guidelines:
- "Full Time" = Permanent position, typically 36-40 hours/week
- "Part Time" = Permanent position, less than 36 hours/week
- "PRN" or "Per Diem" = As needed, on-call, flexible schedule
- "Contract" = Temporary local assignment (3-6 months), NO relocation typically required
- "Travel" = Temporary assignment (typically 13 weeks) with RELOCATION to different city/state, may include housing stipends
- Return null if unclear or not specified

Key distinction for Contract vs Travel:
- If job mentions relocation, housing stipend, travel benefits, or assignments in different cities, and/or is a travel nurse assignment → "Travel"
- If job is temporary/contract but at a local facility with no mention or indication that it is a travel nurse assignment or relocation → "Contract"

**Task 4: Detect shift type**
Options: days, nights, evenings, variable, rotating, null
- "days" = Day shift only
- "nights" = Night shift only  
- "evenings" = Evening shift only
- "variable" = Multiple shifts available, flexible, various shifts, all shifts
- "rotating" = Rotating shifts required
- Return null if not specified or unclear

**Task 5: Detect experience level (REQUIRED - use context clues and make educated inferences)**
Options: New Grad, Experienced, Leadership, null

CRITICAL: You MUST assign an experience level to almost every job. Return null ONLY if the posting is extremely vague with ZERO context clues.

**3-Level Taxonomy:**

1. **"New Grad"** - For nurses with 0-12 months experience:
   - Nurse residency or fellowship programs
   - Explicitly welcomes new graduates ("new grad welcome", "new grad RN")
   - "GN" or "Graduate Nurse" in title
   - States "no experience required" or "will train"
   - Designed for recent nursing school graduates

2. **"Experienced"** - DEFAULT for standard RN positions (1+ years):
   - Requires 1+ years of nursing experience
   - Standard staff RN, bedside nursing positions
   - Specialty positions that need competency (ICU, ER, OR, PACU)
   - Float Pool and Travel positions (usually need experience)
   - States "previous RN experience required/preferred"
   - Any position that isn't explicitly New Grad or Leadership
   - NOTE: Specialty certifications (CCRN, CEN, etc.) still = Experienced, not a separate level

3. **"Leadership"** - Management/supervisory roles:
   - Charge Nurse (even if bedside, has supervisory duties)
   - Nurse Manager, Assistant Nurse Manager
   - Director, Supervisor, Coordinator
   - Team Lead, Unit Lead
   - Any role with supervisory/management responsibilities

**Decision Logic:**
1. Check title first: "Residency", "New Grad", "GN" → New Grad
2. Check title: "Charge", "Manager", "Lead", "Director", "Coordinator" → Leadership
3. Check requirements for years experience or "new grad welcome"
4. DEFAULT to "Experienced" for standard staff RN positions
5. Return null ONLY if posting has NO title hints AND NO context clues

**Task 6: Extract or validate location**
Current scraped location: City="${job.city || 'null'}", State="${job.state || 'null'}"

If the scraped location is missing (null) or seems invalid:
- Look in the job title or full description for the actual city and state
- If job is remote/virtual/work-from-home, return city: "Remote", state: null
- If job mentions multiple locations, return the PRIMARY/FIRST location only
- Return ONLY valid 2-letter US state codes (AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY, DC)
- If location truly cannot be determined, return city: null, state: null

**Task 7: Detect sign-on bonus**
Look for sign-on bonus, signing bonus, or similar incentives in the job posting.

- hasSignOnBonus: true if job mentions any sign-on bonus, signing bonus, welcome bonus, or similar hiring incentive
- signOnBonusAmount: Extract the dollar amount if specified (as integer, e.g., 10000 for "$10,000"), or null if not specified

Examples:
- "$5,000 sign-on bonus" → hasSignOnBonus: true, signOnBonusAmount: 5000
- "Sign-on bonus available" → hasSignOnBonus: true, signOnBonusAmount: null
- "Up to $15K signing bonus" → hasSignOnBonus: true, signOnBonusAmount: 15000
- No mention → hasSignOnBonus: false, signOnBonusAmount: null

**CRITICAL: Keep CLASSIFICATION values SHORT and CONCISE. Use ONLY the exact values from the lists above.**

GOOD examples for classification (concise):
{
  "specialty": "ICU",
  "jobType": "Full Time",
  "shiftType": "nights",
  "experienceLevel": "Experienced"
}

BAD examples for classification (too verbose - DO NOT do this):
{
  "specialty": "ICU - Intensive Care with trauma focus",
  "jobType": "Full Time - 40 hours per week with benefits",
  "shiftType": "nights - primarily 7pm-7am shifts",
  "experienceLevel": "Experienced - requires 2-3 years"
}

**Task 7: Format the COMPLETE job description for readability**

⚠️ **CRITICAL RULES FOR DESCRIPTION FORMATTING:**
1. **DO NOT SUMMARIZE, CONDENSE, OR SHORTEN THE DESCRIPTION IN ANY WAY**
2. **PRESERVE EVERY SINGLE WORD, SENTENCE, BULLET POINT, AND DETAIL FROM THE ORIGINAL**
3. **YOUR ONLY JOB IS TO ADD MARKDOWN FORMATTING - NOT TO REWRITE OR EDIT CONTENT**
4. **IF THE ORIGINAL HAS 50 BULLET POINTS, YOUR OUTPUT MUST HAVE ALL 50 BULLET POINTS**
5. **DO NOT SKIP ANY SECTIONS - include everything from intro to closing paragraph**
6. **DO NOT CREATE NEW TEXT - only reorganize and format what exists**

Formatting Instructions:
- Use ## for major sections (e.g., "## Job Summary", "## Responsibilities", "## Qualifications")
- Use ### for subsections (e.g., "### Required", "### Preferred", "### Education", "### Experience")
- Use - for bullet points (convert • or · to -)
- Use **bold** for important terms (certifications, requirements, key skills, license types)
- Use blank lines to separate sections
- Maintain logical hierarchy (## > ###)
- Remove ONLY "Save job" or "Apply now" buttons/text at the very end

Example showing COMPLETE preservation:
Original: "We offer tuition reimbursement up to $5,250.00 after six months and 40% discounts."
Formatted: "- **Tuition Reimbursement:** up to $5,250.00 after six months and 40% discounts."
(Notice: EXACT same text, just reformatted)

Structure example:
## Job Summary
Full intro paragraph here with all original text preserved...

## Responsibilities
- First responsibility with complete original wording
- Second responsibility with complete original wording
- Third responsibility with complete original wording
[...all remaining bullets...]

## Qualifications

### Required
- **License:** Full original requirement text
- **Certification:** Full original requirement text
[...all requirements...]

### Preferred
- Full preferred qualification 1
- Full preferred qualification 2
[...all preferred items...]

### Experience
- Full experience requirement with all details

[...continue ALL remaining sections from original...]

**Return your answer ONLY as valid JSON in this exact format:**
{
  "isStaffRN": true or false,
  "specialty": "REQUIRED - one of the specialties from the list (never null)",
  "jobType": "Full Time" or "Part Time" or "PRN" or "Per Diem" or "Contract" or "Travel" or null,
  "shiftType": "days" or "nights" or "evenings" or "variable" or "rotating" or null,
  "experienceLevel": "New Grad" or "Experienced" or "Leadership" or null,
  "city": "City Name" or "Remote" or null,
  "state": "OH" or null (2-letter code only),
  "hasSignOnBonus": true or false,
  "signOnBonusAmount": 10000 or null (integer, no dollar sign or commas),
  "confidence": 0.95
}`;
}

/**
 * Classify job attributes ONLY (split from formatting for better results)
 */
async function classifyJobAttributes(job) {
  const prompt = `Analyze this nursing job and extract key attributes:

Job Title: ${job.title}
Location: ${job.city}, ${job.state}
Employer: ${job.employer?.name || 'Unknown'}

Description:
${job.description}

Extract the following:
1. Is this a Staff RN position requiring ONLY an RN license? (Include bedside RNs, charge nurses, nurse managers, coordinators. Exclude only: NP, CRNA, CNS, CNM, non-RN roles)
2. Specialty (REQUIRED - never return null)
   - Use specific specialty if job mentions a unit (ICU, ER, Med-Surg, OR, etc.)
   - If NOT explicitly stated, INFER from context:
     * "ambulatory", "clinic", "outpatient" → Ambulatory Care
     * "home health", "home care", "visiting" → Home Health
     * "long-term care", "SNF", "nursing home" → Long-Term Care
     * "rehabilitation", "rehab" → Rehabilitation
     * "oncology", "cancer" → Oncology
     * If truly NO context → "General Nursing"
3. Job Type (Full Time, Part Time, Per Diem, etc.)
   - Use what's explicitly stated in the description
   - If NOT explicitly stated, INFER from context:
     * "Per Diem" or "PRN" in title → Per Diem
     * "Part Time" or "PT" in title → Part Time
     * "Travel" or "FlexStaff" or "Contract" in title → Contract
     * Otherwise assume Full Time (most common for staff RN)
4. Shift Type (days, nights, evenings, variable, rotating)
   - Use what's explicitly stated in the description
   - If NOT explicitly stated, INFER from context:
     * "Ambulatory", "Clinic", "Outpatient", "Office" → days
     * "Home Health", "Home Care", "Visiting" → days
     * "School Nurse" → days
     * "ED", "ER", "Emergency", "ICU", "Critical Care" → variable (24/7 units)
     * "OR", "Surgery", "Perioperative" → variable
     * "Night" in title → nights
     * "Evening" in title → evenings
     * If still unclear, use "variable" rather than null
5. Experience Level (3-level taxonomy):
   - "New Grad" = 0-12 months, residency programs, "new grad welcome", "GN"
   - "Experienced" = 1+ years, standard staff RN positions (DEFAULT)
   - "Leadership" = Charge nurse, manager, director, coordinator, supervisory roles
6. City and State (2-letter code)
7. Sign-on Bonus: Does the job mention a sign-on bonus, signing bonus, or welcome bonus? If yes, extract the amount if specified.

**Specialty Options (REQUIRED - always pick one):** ${SPECIALTIES.join(', ')}

Return ONLY valid JSON:
{
  "isStaffRN": true or false,
  "specialty": "from list above (REQUIRED, never null)",
  "jobType": "Full Time" | "Part Time" | "Per Diem" | "Contract" | "Travel" | null,
  "shiftType": "days" | "nights" | "evenings" | "variable" | "rotating" | null,
  "experienceLevel": "New Grad" | "Experienced" | "Leadership" | null,
  "city": "city name",
  "state": "2-letter code",
  "hasSignOnBonus": true or false,
  "signOnBonusAmount": 10000 or null (integer only),
  "confidence": 0.95
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: 'You are an expert nursing job classifier. Respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    max_completion_tokens: 5000, // Increased to handle longer job descriptions
    response_format: { type: 'json_object' }
  });

  console.log('\n🔍 DEBUG: Classification Call:');
  console.log('   Finish Reason:', response.choices[0].finish_reason);
  console.log('   Tokens:', response.usage.completion_tokens, '/', response.usage.total_tokens);
  
  return {
    classification: JSON.parse(response.choices[0].message.content),
    usage: response.usage
  };
}

/**
 * Format job description ONLY (split from classification for better results)
 * NOTE: DISABLED - formatting removed for cost efficiency
 */
/*
async function formatJobDescription(job) {
  const prompt = `Format this job description into clean, professional Markdown following resume/job posting best practices.

**CRITICAL RULES - CONTENT PRESERVATION:**
1. PRESERVE EVERY SINGLE WORD from the original (all ${job.description.length} characters)
2. Do NOT skip ANY content or sections
3. Do NOT summarize or condense
4. If original has 50 bullets, your output MUST have 50 bullets
5. Your response will be LONGER than ${job.description.length} characters (because you're adding paragraph breaks, bullets, and markdown formatting - this is GOOD)

**IMPORTANT CLARIFICATION:**
Adding paragraph breaks (\n\n), bullets (- ), and markdown headers (##) is NOT "changing content" - it's formatting. Your job is to take the raw text and make it readable by adding proper spacing and structure. The word count stays the same, but character count will INCREASE due to formatting.

**FORMATTING IMPROVEMENTS:**

**CRITICAL EXCEPTION TO "PRESERVE EVERYTHING" RULE:**
Section headers like "Responsibilities:", "Job Summary:", "Qualifications:" are the ONLY text you should NOT preserve word-for-word. These get REPLACED with markdown headers. Everything else (job descriptions, requirements, benefits text) must be preserved 100%.

**CRITICAL: FOR LONG JOB DESCRIPTIONS (over 3000 characters):**
You MUST be extra careful to add paragraph breaks. Long descriptions require MORE breaks, not fewer. Every 2-3 sentences = new paragraph. Do NOT output walls of text just because the job is long.

**Here are CONCRETE EXAMPLES of the transformation:**

❌ WRONG (duplicated headers):
Job Summary
Job Summary:
• Provides direct nursing care...

✅ CORRECT (replaced header):
## Job Summary
• Provides direct nursing care...

❌ WRONG (duplicated headers):
Key Responsibilities
Responsibilities:
• Implements and monitors...

✅ CORRECT (replaced header):
## Key Responsibilities
• Implements and monitors...

❌ WRONG (tripled header):
Qualifications
Qualifications Qualifications
• Graduate of an accredited...

✅ CORRECT (replaced header):
## Qualifications
• Graduate of an accredited...

❌ WRONG (wall of text in Qualifications):
## Qualifications
Qualifications BSN preferred Current RN license Must have experience...

✅ CORRECT (formatted with bullets):
## Qualifications
- **BSN** preferred
- Current **RN** license
- Must have experience...

**REPLACEMENT RULES:**
1. Metadata lines (Location Detail:, Shift Detail:) → Keep as plain text
2. "Job Summary:" → becomes "## Job Summary" (delete "Job Summary:")
3. "Responsibilities:" or "Responsibilities include..." → becomes "## Key Responsibilities" (delete the original text)
4. "Qualifications:" or "Qualifications Minimum Requirements:" → becomes "## Qualifications" (delete the original text)
5. "Benefits:" → becomes "## Benefits" (delete "Benefits:")
6. "Minimum Requirements:" (under Qualifications) → becomes "### Minimum Requirements" (delete "Minimum Requirements:")
7. "Education:" (under Qualifications) → becomes "### Education" (delete "Education:")
8. "Experience:" (under Qualifications) → becomes "### Experience" (delete "Experience:")

**OTHER FORMATTING IMPROVEMENTS:**
1. Convert qualification/requirement lists into bullets:
   - If Qualifications section is a wall of text (e.g., "BSN preferred Current RN license Must have experience..."), break it into individual bullet points
   - Each requirement gets its own bullet line
   - Example: "BSN preferred Current RN license Must have..." → "- **BSN** preferred\n- Current **RN** license\n- Must have..."
   - Apply this to ANY section that lists requirements, skills, or qualifications

2. Bold subsection dividers within major sections:
   - If the original JD has plain text subsection organizers (e.g., "Direct Patient Care", "Care Coordination", "Education" under Responsibilities), wrap them in **bold** markdown
   - Example: "Direct Patient Care" → "**Direct Patient Care**"
   - These are NOT markdown headers (##), just bolded text to make them visible as organizers
   - Do NOT bold metadata lines (Location Detail:, Shift Detail:, etc.)

3. Fix grammar and spacing:
   - Ensure responsibility bullets use present tense third-person verbs
   - "Collaborate with" → "Collaborates with"
   - "Triage of patients" → "Triages patients"
   - "Manage a caseload" → "Manages a caseload"
   - **CRITICAL SPACING RULE:** ALWAYS add a space after periods when combining sentences or lines. "matters. Every day" is correct, "matters.Every day" is WRONG. Check EVERY period in your output.

4. **MANDATORY: Break long paragraphs into digestible chunks:**
   - **CRITICAL: NEVER output a wall of text longer than 3-4 sentences without a paragraph break**
   - ALWAYS use double line breaks (\n\n) between EVERY paragraph
   - If you see a block of text longer than 300 characters, break it into multiple paragraphs
   - This applies to ALL text: intro, program descriptions, benefits, employer info
   - Every section header (like "Program Description:", "The Role of the OR Nurse:") should be followed by \n\n and then the content in digestible 2-3 sentence chunks
   - **CHECK YOUR OUTPUT: If any paragraph is longer than 500 characters, you MUST break it up**

5. Use markdown bullets (- ) for all bullet points:
   - **CRITICAL:** When converting bullets to markdown format, REMOVE the original bullet character (•, ·, -, *) from the text
   - Example: "• Provides direct care..." → "- Provides direct care..." (NOT "- • Provides direct care...")
   - The frontend will add its own bullet styling, so strip the original bullet to avoid double bullets

6. Bold important terms: certifications (BLS, OCN), licenses (RN License), degree requirements (BSN, MSN)

Original Description (${job.description.length} characters):
${job.description}

---

**RETURN FORMAT:**
Return ONLY the formatted markdown text. 
- Do NOT include "Original:" comparison notes
- Do NOT include the source text at the end
- Do NOT show before/after examples
- Just return the clean, formatted job description and nothing else`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: 'You are an expert at formatting job descriptions with Markdown while applying professional writing best practices. You NEVER summarize - you preserve every word while improving clarity, grammar, and structure.' },
      { role: 'user', content: prompt }
    ],
    max_completion_tokens: 12000
  });

  console.log('\n🔍 DEBUG: Formatting Call:');
  console.log('   Finish Reason:', response.choices[0].finish_reason);
  console.log('   Tokens:', response.usage.completion_tokens, '/', response.usage.total_tokens);
  console.log('   Output Length:', response.choices[0].message.content.length, 'characters');
  console.log('   Original Length:', job.description.length, 'characters');
  console.log('   Ratio:', ((response.choices[0].message.content.length / job.description.length) * 100).toFixed(1) + '%');
  
  return {
    formattedDescription: response.choices[0].message.content.trim(),
    usage: response.usage
  };
}
*/

/**
 * Classify a single job using TWO parallel OpenAI calls (like resume builder pattern)
 */
async function classifyJob(job) {
  try {
    // Check if this job needs description formatting
    // Format ALL jobs, but skip ones already in our template format
    const FORMATTED_MARKERS = ['## About This Role', '## 📋 Highlights', '## What You\'ll Do'];
    const isAlreadyFormatted = job.description && FORMATTED_MARKERS.some(marker => job.description.includes(marker));
    const needsFormatting = !isAlreadyFormatted;

    // For jobs needing formatting: run classification AND formatting in parallel
    // For other jobs: only run classification
    let classificationResult, formattingResult;

    if (needsFormatting) {
      console.log(`   🔄 Running classification + formatting...`);
      [classificationResult, formattingResult] = await Promise.all([
        classifyJobAttributes(job),
        formatJobDescription(job)  // Use standardized formatter from /lib/services/
      ]);
    } else {
      console.log(`   ⏭️  Skipping formatting (already formatted)`);
      classificationResult = await classifyJobAttributes(job);
      formattingResult = null;
    }
    
    // Get results
    const result = classificationResult.classification;
    let combinedUsage = classificationResult.usage;
    
    // If job was formatted, add formatting tokens to usage
    if (formattingResult && formattingResult.success) {
      combinedUsage = {
        prompt_tokens: combinedUsage.prompt_tokens + (formattingResult.inputTokens || 0),
        completion_tokens: combinedUsage.completion_tokens + (formattingResult.outputTokens || 0),
        total_tokens: combinedUsage.total_tokens + (formattingResult.tokensUsed || 0)
      };
      
      console.log('\n📝 Formatting Results:');
      console.log('   Finish Reason:', formattingResult.finishReason);
      console.log('   Tokens:', formattingResult.inputTokens, '/', formattingResult.outputTokens);
      console.log('   Formatted length:', formattingResult.formattedDescription.length, 'chars');
    }
    
    console.log('\n✅ Classification Results:');
    console.log('   Confidence:', result.confidence);
    console.log('   Total tokens:', combinedUsage.total_tokens);
    
    // Normalize experience level to proper Title Case format
    // Handles LLM variations like "new-grad", "senior", "experienced"
    if (result.experienceLevel) {
      result.experienceLevel = normalizeExperienceLevel(result.experienceLevel);
    }

    // Normalize specialty to canonical format
    // Handles LLM variations like "Step Down", "L&D", "Psychiatric", etc.
    if (result.specialty) {
      result.specialty = normalizeSpecialty(result.specialty);
    }
    
    const returnObj = {
      success: true,
      classification: result,
      tokensUsed: combinedUsage.total_tokens,
      cost: calculateCost(combinedUsage)
    };
    
    // Add formatted description if job was formatted successfully
    if (formattingResult && formattingResult.success) {
      returnObj.formattedDescription = formattingResult.formattedDescription;
    }
    
    return returnObj;
    
  } catch (error) {
    console.error(`❌ Error classifying job ${job.id}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate API cost based on token usage
 * GPT-5-mini pricing (Standard API, Nov 2024):
 * - Input: $0.25 per 1M tokens
 * - Cached Input: $0.025 per 1M tokens  
 * - Output: $2.00 per 1M tokens
 * 
 * Note: We use Standard API (not Batch) for real-time classification + formatting
 * Typical usage per job: ~2700 input tokens, ~2500 output tokens (~$0.0057 per job)
 * With 12k token limit and debugging to understand truncation issue
 */
function calculateCost(usage) {
  const inputCost = (usage.prompt_tokens / 1_000_000) * 0.25;
  const outputCost = (usage.completion_tokens / 1_000_000) * 2.00;
  // Note: Cached tokens would be $0.025/1M, but we're conservative and use full price
  return inputCost + outputCost;
}

/**
 * Main classification workflow
 */
async function main() {
  try {
    // Calculate 48-hour cutoff (prevent classifying old stale jobs)
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    
    // Build query to fetch jobs - only process jobs that haven't been classified yet
    const whereClause = {
      isActive: false,      // Only classify inactive jobs (pending or expired)
      classifiedAt: null,   // Only classify jobs that haven't been classified yet (prevents re-activating expired jobs)
      scrapedAt: {
        gte: fortyEightHoursAgo  // Only classify jobs scraped within last 48 hours (prevents old stale jobs from being activated)
      }
    };
    
    // Filter by employer if specified
    if (employerSlug) {
      const employer = await prisma.healthcareEmployer.findFirst({
        where: { slug: employerSlug }
      });
      
      if (!employer) {
        console.error(`❌ Employer not found: ${employerSlug}`);
        process.exit(1);
      }
      
      whereClause.employerId = employer.id;
      console.log(`📍 Filtering: ${employer.name}\n`);
    }
    
    console.log(`⏰ Only classifying jobs scraped within last 48 hours (after ${fortyEightHoursAgo.toISOString()})\n`);
    
    // Fetch jobs to classify
    const jobs = await prisma.nursingJob.findMany({
      where: whereClause,
      include: {
        employer: {
          select: { name: true, slug: true }
        }
      },
      take: limit || undefined,
      orderBy: { scrapedAt: 'desc' }
    });
    
    if (jobs.length === 0) {
      console.log('⚠️  No jobs found to classify.');
      return;
    }
    
    console.log(`📊 Found ${jobs.length} jobs to classify\n`);
    console.log('─'.repeat(80));
    
    // Statistics
    let totalCost = 0;
    let totalTokens = 0;
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    // Statistics for skipped jobs
    let skippedSkeletonCount = 0;

    // Process each job
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      console.log(`\n[${i + 1}/${jobs.length}] Processing: ${job.title}`);
      console.log(`   Employer: ${job.employer?.name || 'N/A'}`);
      console.log(`   Current specialty: ${job.specialty || 'none'}`);

      // ============================================================
      // SKELETON DESCRIPTION SKIP (NYC Health Hospitals specific)
      // ============================================================
      // NYC Health scraper fetches detail pages which can fail, resulting
      // in skeleton descriptions. Don't classify these - wait for complete data.
      // Markers indicate successful detail page fetch:
      // - "Duties & Responsibilities:" - only present when duties extracted
      // - "Minimum Qualifications:" - only present when qualifications extracted
      // ============================================================
      if (job.employer?.slug === 'nyc-health-hospitals') {
        const rawDesc = job.rawDescription || job.description || '';
        const hasMarkers = rawDesc.includes('Duties & Responsibilities:') ||
                          rawDesc.includes('Minimum Qualifications:');
        const isSubstantial = rawDesc.length > 500;
        const isComplete = hasMarkers && isSubstantial;

        if (!isComplete) {
          console.log(`   ⏭️ SKIPPING - skeleton description (${rawDesc.length} chars, no detail page markers)`);
          console.log(`      Job will be classified when scraper fetches complete detail page data`);
          skippedSkeletonCount++;
          continue;
        }
      }

      const result = await classifyJob(job);
      
      if (result.success) {
        successCount++;
        totalCost += result.cost;
        totalTokens += result.tokensUsed;
        
        const c = result.classification;
        console.log(`   ✅ LLM Classification:`);
        console.log(`      Staff RN: ${c.isStaffRN ? '✓ YES' : '✗ NO'}`);
        console.log(`      Specialty: ${c.specialty}`);
        console.log(`      Job Type: ${c.jobType || 'not specified'}`);
        console.log(`      Shift Type: ${c.shiftType || 'not specified'}`);
        console.log(`      Experience: ${c.experienceLevel || 'not specified'}`);
        console.log(`      Location: ${c.city || 'unknown'}, ${c.state || 'unknown'}`);
        console.log(`      Sign-on Bonus: ${c.hasSignOnBonus ? (c.signOnBonusAmount ? `$${c.signOnBonusAmount.toLocaleString()}` : 'Yes (amount not specified)') : 'No'}`);
        console.log(`      Confidence: ${(c.confidence * 100).toFixed(0)}%`);
        console.log(`   💰 Cost: $${result.cost.toFixed(6)} | Tokens: ${result.tokensUsed}`);
        
        results.push({
          jobId: job.id,
          title: job.title,
          oldSpecialty: job.specialty,
          newSpecialty: c.specialty,
          isStaffRN: c.isStaffRN,
          jobType: c.jobType,
          shiftType: c.shiftType,
          experienceLevel: c.experienceLevel,
          city: c.city,
          state: c.state,
          hasSignOnBonus: c.hasSignOnBonus || false,
          signOnBonusAmount: c.signOnBonusAmount || null,
          confidence: c.confidence
        });
        
        // Update database if not in test mode
        if (!isTestMode && c.isStaffRN && c.city && c.state) {
          // Staff RN with valid location → Activate job
          const updateData = {
            city: c.city,           // Update with LLM-extracted location
            state: c.state,         // Update with LLM-validated state
            specialty: c.specialty || job.specialty || 'General Nursing', // Fallback: existing → General Nursing
            jobType: c.jobType || job.jobType, // Keep existing if LLM didn't detect
            shiftType: c.shiftType || job.shiftType, // Keep existing if LLM didn't detect
            experienceLevel: c.experienceLevel || job.experienceLevel, // Keep existing if LLM didn't detect
            hasSignOnBonus: c.hasSignOnBonus || false,
            signOnBonusAmount: c.signOnBonusAmount || null,
            isActive: true,       // ✅ Activate job - validated as Staff RN with location
            wasEverActive: true,  // ✅ One-way flag - enables reactivation if job is deactivated then found again
            classifiedAt: new Date()  // ✅ Mark as classified (prevents future re-classification)
          };
          
          // If job was formatted, save the formatted description
          if (result.formattedDescription) {
            updateData.description = result.formattedDescription;
            console.log(`   📝 Saving formatted description (${result.formattedDescription.length} chars)`);

            // Extract salary from formatted description and update salary fields
            // (only if job doesn't already have salary from scraper)
            if (!job.salaryMin && !job.salaryMax) {
              const salaryData = extractSalaryFromDescription(result.formattedDescription);
              if (salaryData.salaryMin) {
                updateData.salaryMin = salaryData.salaryMin;
                updateData.salaryMax = salaryData.salaryMax;
                updateData.salaryType = salaryData.salaryType;
                updateData.salaryMinHourly = salaryData.salaryMinHourly;
                updateData.salaryMaxHourly = salaryData.salaryMaxHourly;
                updateData.salaryMinAnnual = salaryData.salaryMinAnnual;
                updateData.salaryMaxAnnual = salaryData.salaryMaxAnnual;
                console.log(`   💰 Extracted salary: $${salaryData.salaryMin}${salaryData.salaryMax !== salaryData.salaryMin ? '-$' + salaryData.salaryMax : ''}/${salaryData.salaryType}`);
              }
            }
          }

          await prisma.nursingJob.update({
            where: { id: job.id },
            data: updateData
          });
          console.log(`   💾 Updated in database with location: ${c.city}, ${c.state}`);
          console.log(`   ✅ Job activated and live on site`);

          // Notify Google Indexing API about the new job (for Google for Jobs widget)
          googleIndexingService.notifyJobCreatedOrUpdated({ slug: job.slug }).catch(err => {
            console.error(`   ⚠️ Google Indexing notification failed:`, err.message);
          });
        } else if (!isTestMode && c.isStaffRN && (!c.city || !c.state)) {
          // Staff RN but no valid location → Keep inactive but mark as classified
          const updateData = {
            specialty: c.specialty || job.specialty || 'General Nursing', // Fallback: existing → General Nursing
            jobType: c.jobType || job.jobType,
            shiftType: c.shiftType || job.shiftType,
            experienceLevel: c.experienceLevel || job.experienceLevel,
            hasSignOnBonus: c.hasSignOnBonus || false,
            signOnBonusAmount: c.signOnBonusAmount || null,
            isActive: false,      // ❌ Keep inactive - no valid location
            classifiedAt: new Date()  // ✅ Mark as classified (prevents reprocessing)
          };
          
          // If job was formatted, save the formatted description
          if (result.formattedDescription) {
            updateData.description = result.formattedDescription;

            // Extract salary from formatted description (even for inactive jobs)
            if (!job.salaryMin && !job.salaryMax) {
              const salaryData = extractSalaryFromDescription(result.formattedDescription);
              if (salaryData.salaryMin) {
                updateData.salaryMin = salaryData.salaryMin;
                updateData.salaryMax = salaryData.salaryMax;
                updateData.salaryType = salaryData.salaryType;
                updateData.salaryMinHourly = salaryData.salaryMinHourly;
                updateData.salaryMaxHourly = salaryData.salaryMaxHourly;
                updateData.salaryMinAnnual = salaryData.salaryMinAnnual;
                updateData.salaryMaxAnnual = salaryData.salaryMaxAnnual;
              }
            }
          }

          await prisma.nursingJob.update({
            where: { id: job.id },
            data: updateData
          });
          console.log(`   🚫 Staff RN but location unknown (${c.city || 'null'}, ${c.state || 'null'}) - kept inactive`);
        } else if (!isTestMode && !c.isStaffRN) {
          // Not a staff RN position → Keep inactive
          await prisma.nursingJob.update({
            where: { id: job.id },
            data: {
              // description: keep original as-is (no LLM formatting)
              classifiedAt: new Date()  // ✅ Mark as classified even if rejected (prevents reprocessing)
            }
          });
          console.log(`   🚫 Kept inactive (not a staff RN position - will not appear on site)`);
        }
        
      } else {
        failCount++;
        console.log(`   ❌ Classification failed: ${result.error}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Print summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 CLASSIFICATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    if (skippedSkeletonCount > 0) {
      console.log(`⏭️ Skipped (skeleton): ${skippedSkeletonCount} (NYC Health jobs waiting for complete detail page data)`);
    }
    console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`🎫 Total Tokens: ${totalTokens.toLocaleString()}`);
    console.log(`📈 Average Cost per Job: $${successCount > 0 ? (totalCost / successCount).toFixed(6) : '0.000000'}`);
    
    if (isTestMode) {
      console.log('\n🧪 TEST MODE: No changes were saved to the database');
    } else {
      console.log('\n✅ PRODUCTION MODE: Changes have been saved to the database');
    }
    
    // Show specialty distribution
    console.log('\n📋 Specialty Distribution:');
    const specialtyCounts = {};
    results.forEach(r => {
      if (r.isStaffRN) {
        specialtyCounts[r.newSpecialty] = (specialtyCounts[r.newSpecialty] || 0) + 1;
      }
    });
    Object.entries(specialtyCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([specialty, count]) => {
        console.log(`   ${specialty}: ${count}`);
      });
    
    // Show jobs that changed specialty
    const changedJobs = results.filter(r => r.oldSpecialty !== r.newSpecialty);
    if (changedJobs.length > 0) {
      console.log(`\n🔄 ${changedJobs.length} jobs had specialty changes:`);
      changedJobs.slice(0, 10).forEach(r => {
        console.log(`   "${r.title}": ${r.oldSpecialty || 'none'} → ${r.newSpecialty}`);
      });
      if (changedJobs.length > 10) {
        console.log(`   ... and ${changedJobs.length - 10} more`);
      }
    }
    
    // Show URLs for easy checking (first 10)
    console.log(`\n🔗 URLs to check on your local site:`);
    const jobsToShow = jobs.slice(0, Math.min(10, results.length));
    for (const job of jobsToShow) {
      const result = results.find(r => r.jobId === job.id);
      if (result) {
        const status = result.isStaffRN ? '✅ RN' : '❌ Not RN';
        console.log(`   ${status} - http://localhost:3000/jobs/nursing/${job.slug}`);
        console.log(`      ${job.title}`);
      }
    }
    
    console.log('\n✨ Classification complete!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

