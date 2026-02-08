import OpenAI from 'openai';
import { z } from 'zod';

// Configure OpenAI with the newer SDK pattern
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Input validation schema
const GenerateSummarySchema = z.object({
  existingSummary: z.string().optional().nullable(),
  professionalContext: z.object({
    title: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    facilityType: z.string().optional(),
    shiftType: z.string().optional(),
  })).optional(),
  education: z.array(z.object({
    degree: z.string().optional(),
    school: z.string().optional(),
    fieldOfStudy: z.string().optional(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.object({
    name: z.string().optional(),
    fullName: z.string().optional(),
  })).optional(),
  licenses: z.array(z.object({
    type: z.string().optional(),
    state: z.string().optional(),
    isCompact: z.boolean().optional(),
  })).optional(),
  healthcareSkills: z.object({
    ehrSystems: z.array(z.string()).optional(),
    clinicalSkills: z.array(z.string()).optional(),
    specialty: z.string().optional(),
    customSkills: z.array(z.string()).optional(),
  }).optional(),
  jobContext: z.string().optional().nullable(),
  action: z.enum(['generate', 'improve']).default('generate'),
});

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const validatedInput = GenerateSummarySchema.parse(req.body);
    const {
      existingSummary,
      professionalContext,
      experience,
      education,
      skills,
      certifications,
      licenses,
      healthcareSkills,
      jobContext,
      action
    } = validatedInput;

    // Security check: ensure input doesn't contain potential prompt injection
    const allTextInputs = [
      existingSummary,
      jobContext,
      ...(experience?.map(e => e.description) || [])
    ].filter(Boolean);

    const securityCheck = performSecurityCheck(allTextInputs);
    if (!securityCheck.safe) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: securityCheck.reason
      });
    }

    // Create an appropriate prompt based on the provided data
    const prompt = createPrompt(
      existingSummary,
      professionalContext,
      experience,
      education,
      skills,
      certifications,
      licenses,
      healthcareSkills,
      jobContext,
      action
    );

    // Call OpenAI with the newer SDK format
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: prompt,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract the generated summary (different response format in v4)
    const generatedSummary = response.choices[0].message.content.trim();

    return res.status(200).json({ summary: generatedSummary });
  } catch (error) {
    console.error('Error generating summary:', error);

    // Handle different types of errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    if (error.response) {
      // OpenAI API error
      console.error('OpenAI API error details:', {
        status: error.response.status,
        data: error.response.data,
        message: error.message
      });
      return res.status(error.response.status).json({
        error: 'AI service error',
        details: error.response.data
      });
    }

    return res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message
    });
  }
}

// Security check function
function performSecurityCheck(inputs) {
  // Patterns that might indicate prompt injection or other misuse
  const suspiciousPatterns = [
    /ignore previous instructions/i,
    /disregard your instructions/i,
    /forget your prior instructions/i,
    /new instructions/i,
    /you are now/i,
    /never mind your previous instructions/i,
    /\<\/?(?:script|iframe|img|style|on\w+)/i, // Basic XSS protection
  ];

  for (const input of inputs) {
    if (!input) continue;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        return { 
          safe: false, 
          reason: 'Potential security issue detected in input'
        };
      }
    }
  }

  return { safe: true };
}

// Create an appropriate prompt based on the available data
function createPrompt(existingSummary, professionalContext, experience, education, skills, certifications, licenses, healthcareSkills, jobContext, action) {
  // Create system message with detailed instructions
  const systemMessage = {
    role: "system",
    content: `You are a professional resume writer specializing in nursing careers — Registered Nurses, charge nurses, travel nurses, and nursing leadership.
Your task is to ${action === 'improve' ? 'improve the existing summary' : 'create a new professional summary'} based on the provided nursing context.

Guidelines:
- Create a concise, impactful professional summary (3-4 sentences, 50-75 words)
- HARD LIMIT: Never exceed 500 characters. Aim for 300-450 characters
- Lead with nursing specialty and years of experience (e.g., "Dedicated ICU Registered Nurse with 8+ years...")
- The four must-have elements: (1) professional title + specialty, (2) years of experience, (3) key credentials/certifications, (4) one core competency or achievement
- Include nursing-specific ATS keywords: patient care, clinical documentation, interdisciplinary collaboration, medication administration, patient assessment, care coordination
- If certifications are provided (BLS, ACLS, CCRN, etc.), mention the most relevant 1-2 by abbreviation
- If license info is provided, mention compact/multi-state licensure if applicable
- Reference facility types or care settings when relevant (Level I trauma, Magnet hospital, teaching facility)
- If a nursing specialty is provided, use specialty-specific terminology
- Calculate years of experience from the earliest start date to most recent end date. Round to nearest whole number. Use "X+" format (e.g., "8+ years")
- Use nursing-appropriate professional tone
- Do not use first-person pronouns (I, me, my)
- NEVER mention "resume", "seeking opportunities", or "looking for"
- NEVER fabricate certifications or credentials not provided in the context
- Format as a single paragraph

VERY IMPORTANT: Respond ONLY with the professional summary text. Do not include ANY explanations, introductions, or comments.`
  };

  const userMessage = buildUserMessageContent(existingSummary, professionalContext, experience, education, skills, certifications, licenses, healthcareSkills, jobContext, action);

  return [
    systemMessage,
    {
      role: "user",
      content: userMessage
    }
  ];
}

// Build the user message with all available context
function buildUserMessageContent(existingSummary, professionalContext, experience, education, skills, certifications, licenses, healthcareSkills, jobContext, action) {
  let content = '';

  // Add clear boundary markers to prevent data confusion
  content += '=== ACTION ===\n';
  content += `${action} a professional summary\n\n`;

  // Add existing summary if available and action is improve
  if (action === 'improve' && existingSummary) {
    content += '=== EXISTING SUMMARY ===\n';
    content += `${existingSummary}\n\n`;
  }

  // Add professional context if available
  if (professionalContext) {
    content += '=== PROFESSIONAL CONTEXT ===\n';
    if (professionalContext.title) content += `Current Title: ${professionalContext.title}\n`;
    if (professionalContext.linkedin) content += `LinkedIn Profile: ${professionalContext.linkedin}\n`;
    if (professionalContext.website) content += `Professional Website: ${professionalContext.website}\n`;
    content += '\n';
  }

  // Add experience information if available
  if (experience && experience.length > 0) {
    content += '=== WORK EXPERIENCE ===\n';
    experience.forEach((exp, _index) => {
      content += `Position ${_index + 1}: ${exp.title} at ${exp.company}\n`;
      if (exp.startDate && exp.endDate) content += `Duration: ${exp.startDate} - ${exp.endDate}\n`;
      if (exp.unit) content += `Unit: ${exp.unit}\n`;
      if (exp.facilityType) content += `Facility: ${exp.facilityType}\n`;
      if (exp.shiftType) content += `Shift: ${exp.shiftType}\n`;
      if (exp.description) content += `Description: ${exp.description}\n`;
      content += '\n';
    });
  }

  // Add certifications if available
  if (certifications && certifications.length > 0) {
    content += '=== CERTIFICATIONS ===\n';
    certifications.forEach(cert => {
      const display = cert.fullName ? `${cert.name} (${cert.fullName})` : cert.name;
      if (display) content += `${display}\n`;
    });
    content += '\n';
  }

  // Add licenses if available
  if (licenses && licenses.length > 0) {
    content += '=== NURSING LICENSES ===\n';
    licenses.forEach(lic => {
      let licLine = lic.type ? lic.type.toUpperCase() : '';
      if (lic.state) licLine += ` - ${lic.state}`;
      if (lic.isCompact) licLine += ' (Compact/Multi-State)';
      if (licLine) content += `${licLine}\n`;
    });
    content += '\n';
  }

  // Add healthcare skills if available
  if (healthcareSkills) {
    const hasData = healthcareSkills.specialty ||
      (healthcareSkills.ehrSystems && healthcareSkills.ehrSystems.length > 0) ||
      (healthcareSkills.clinicalSkills && healthcareSkills.clinicalSkills.length > 0) ||
      (healthcareSkills.customSkills && healthcareSkills.customSkills.length > 0);

    if (hasData) {
      content += '=== HEALTHCARE SKILLS ===\n';
      if (healthcareSkills.specialty) content += `Nursing Specialty: ${healthcareSkills.specialty}\n`;
      if (healthcareSkills.ehrSystems && healthcareSkills.ehrSystems.length > 0) {
        content += `EHR Systems: ${healthcareSkills.ehrSystems.join(', ')}\n`;
      }
      const allSkills = [
        ...(healthcareSkills.clinicalSkills || []),
        ...(healthcareSkills.customSkills || [])
      ];
      if (allSkills.length > 0) {
        content += `Clinical Skills: ${allSkills.join(', ')}\n`;
      }
      content += '\n';
    }
  }

  // Add education if available
  if (education && education.length > 0) {
    content += '=== EDUCATION ===\n';
    education.forEach((edu) => {
      if (edu.degree) content += `Degree: ${edu.degree}\n`;
      if (edu.school) content += `School: ${edu.school}\n`;
      if (edu.fieldOfStudy) content += `Field of Study: ${edu.fieldOfStudy}\n`;
      content += '\n';
    });
  }

  // Add skills if available
  if (skills && skills.length > 0) {
    content += '=== SKILLS ===\n';
    content += skills.join(', ') + '\n\n';
  }

  // Add job context if available
  if (jobContext) {
    content += '=== TARGET JOB DESCRIPTION ===\n';
    content += `${jobContext}\n\n`;
  }

  // Add final request
  content += '=== INSTRUCTIONS ===\n';
  if (action === 'improve') {
    content += 'Please improve the existing summary using ALL the provided context (experience, certifications, licenses, skills). Make it more professional, impactful, and ATS-optimized. Keep it under 500 characters.\n';
  } else {
    content += 'Please create a professional summary using ALL the provided context (experience, certifications, licenses, skills). Make it impactful and ATS-optimized. Keep it under 500 characters.\n';
  }
  content += 'Remember to follow the guidelines in your instructions.';

  return content;
} 