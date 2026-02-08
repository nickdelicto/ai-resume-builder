import OpenAI from 'openai';
import { z } from 'zod';

// Configure OpenAI with the newer SDK pattern
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Input validation schema
const GenerateSkillsSchema = z.object({
  existingSkills: z.array(z.string()).optional(),
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
  })).optional(),
  education: z.array(z.object({
    degree: z.string().optional(),
    school: z.string().optional(),
    fieldOfStudy: z.string().optional(),
  })).optional(),
  summary: z.string().optional(),
  jobContext: z.string().optional().nullable(),
  count: z.number().min(3).max(15).default(8),
  specialty: z.string().optional(),
  certifications: z.array(z.object({
    name: z.string().optional(),
    id: z.string().optional(),
  })).optional(),
});

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const validatedInput = GenerateSkillsSchema.parse(req.body);
    const {
      existingSkills = [],
      professionalContext,
      experience,
      education,
      summary,
      jobContext,
      count,
      specialty,
      certifications
    } = validatedInput;

    // Check if we have sufficient context
    if (!experience || experience.length === 0) {
      return res.status(400).json({ 
        error: 'Insufficient context',
        details: 'At least one experience entry is required for skill generation'
      });
    }

    // Security check: ensure input doesn't contain potential prompt injection
    const allTextInputs = [
      summary,
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
      existingSkills,
      professionalContext,
      experience,
      education,
      summary,
      jobContext,
      count,
      specialty,
      certifications
    );

    // Call OpenAI with the newer SDK format
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: prompt,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Extract and process the generated skills
    const content = response.choices[0].message.content.trim();
    
    // Parse the skills from the response
    const skills = parseSkillsFromResponse(content);
    
    return res.status(200).json({ skills });
  } catch (error) {
    console.error('Error generating skills:', error);

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
      error: 'Failed to generate skills',
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
function createPrompt(existingSkills, professionalContext, experience, education, summary, jobContext, count, specialty, certifications) {
  // Create system message with detailed instructions
  const systemMessage = {
    role: "system",
    content: `You are an expert nursing resume writer specializing in clinical skills for Registered Nurses, charge nurses, travel nurses, and nursing leadership.

    Guidelines:
    - Generate ${count} relevant clinical skills based on the nurse's work experience and specialty
    - Focus on nursing-specific clinical competencies, not generic soft skills
    - Include skills that ATS systems used by healthcare employers scan for
    - Prioritize: clinical procedures, assessment skills, documentation competencies, patient care techniques, and unit-specific competencies
    - If a nursing specialty is provided, suggest skills common for that specialty
    - Do not include skills already in the existing skills list
    - Do not suggest certifications (BLS, ACLS, etc.) — those belong in the certifications section
    - Do not suggest EHR system names — those belong in the EHR section
    - Skills should be concise (1-4 words each), e.g., "Ventilator Management", "IV Insertion", "Wound Care"
    - Do NOT number the skills
    - Do NOT use bullet points
    - Do NOT include explanations or descriptions
    - Do NOT group skills by category

    Respond ONLY with a LIST of skills, one per line, separated by newlines.
    DO NOT include ANY explanatory text, headers, or additional formatting.`
  };

  const userMessage = buildUserMessageContent(existingSkills, professionalContext, experience, education, summary, jobContext, count, specialty, certifications);

  return [
    systemMessage,
    {
      role: "user",
      content: userMessage
    }
  ];
}

// Build the user message with all available context
function buildUserMessageContent(existingSkills, professionalContext, experience, education, summary, jobContext, count, specialty, certifications) {
  let content = '';

  // Add clear boundary markers to prevent data confusion
  content += '=== TASK ===\n';
  content += `Generate ${count} relevant clinical skills for my nursing resume\n\n`;

  // Add nursing specialty if available
  if (specialty) {
    content += '=== NURSING SPECIALTY ===\n';
    content += `${specialty}\n\n`;
  }

  // Add certifications if available
  if (certifications && certifications.length > 0) {
    content += '=== CERTIFICATIONS ===\n';
    certifications.forEach(cert => {
      if (cert.name) content += `${cert.name}\n`;
    });
    content += '\n';
  }

  // Add existing skills if available
  if (existingSkills && existingSkills.length > 0) {
    content += '=== EXISTING SKILLS (DO NOT DUPLICATE THESE) ===\n';
    existingSkills.forEach(skill => {
      content += `- ${skill}\n`;
    });
    content += '\n';
  }
  
  // Add professional context if available
  if (professionalContext) {
    content += '=== PROFESSIONAL CONTEXT ===\n';
    if (professionalContext.title) content += `Current Title: ${professionalContext.title}\n`;
    if (professionalContext.linkedin) content += `LinkedIn Profile: ${professionalContext.linkedin}\n`;
    if (professionalContext.website) content += `Professional Website: ${professionalContext.website}\n`;
    content += '\n';
  }

  // Add summary if available
  if (summary) {
    content += '=== PROFESSIONAL SUMMARY ===\n';
    content += `${summary}\n\n`;
  }

  // Add experience information if available
  if (experience && experience.length > 0) {
    content += '=== WORK EXPERIENCE ===\n';
    experience.forEach((exp, _index) => {
      content += `Position ${_index + 1}: ${exp.title} at ${exp.company}\n`;
      if (exp.startDate && exp.endDate) content += `Duration: ${exp.startDate} - ${exp.endDate}\n`;
      if (exp.description) content += `Description: ${exp.description}\n`;
      content += '\n';
    });
  }

  // Add education if available
  if (education && education.length > 0) {
    content += '=== EDUCATION ===\n';
    education.forEach((edu, _index) => {
      if (edu.degree) content += `Degree: ${edu.degree}\n`;
      if (edu.school) content += `School: ${edu.school}\n`;
      if (edu.fieldOfStudy) content += `Field of Study: ${edu.fieldOfStudy}\n`;
      content += '\n';
    });
  }

  // Add job context if available
  if (jobContext) {
    content += '=== TARGET JOB DESCRIPTION ===\n';
    content += `${jobContext}\n\n`;
  }

  // Add final request
  content += '=== INSTRUCTIONS ===\n';
  content += `Based on the information above, provide ${count} relevant clinical nursing skills for my resume. `;

  if (existingSkills && existingSkills.length > 0) {
    content += `Do NOT duplicate any of my existing skills. `;
  }

  if (jobContext) {
    content += `Focus on skills that are relevant to the target job description. `;
  }

  content += `Suggest nursing-specific clinical competencies, not generic soft skills. `;
  content += `Remember to follow the guidelines in your instructions and list ONLY the skills, one per line, without numbers, bullets, or explanations.`;

  return content;
}

// Parse skills from the AI response
function parseSkillsFromResponse(content) {
  // Split by newline and clean up each line
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Clean up any potential formatting that might have been added despite instructions
  const cleanedSkills = lines.map(line => {
    // Remove bullet points, dashes or numbers at the beginning
    return line.replace(/^[-•*\d.\s]+/, '').trim();
  });
  
  return cleanedSkills;
} 