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
  })).optional(),
  education: z.array(z.object({
    degree: z.string().optional(),
    school: z.string().optional(),
    fieldOfStudy: z.string().optional(),
  })).optional(),
  skills: z.array(z.string()).optional(),
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
function createPrompt(existingSummary, professionalContext, experience, education, skills, jobContext, action) {
  // Create system message with detailed instructions
  const systemMessage = {
    role: "system",
    content: `You are a professional resume writer specializing in crafting compelling professional summaries. You focus on highlighting key strengths, experiences, and career objectives.
    Your task is to ${action === 'improve' ? 'improve the existing summary' : 'create a new professional summary'} based on the provided information.
    
    Guidelines:
    - Create a concise, impactful professional summary in accordance with best practices for resumes (3-4 sentences, maximum 100 words)   
    - Use a professional tone with strong action verbs
    - Highlight key skills, experiences, and accomplishments
    - Include relevant keywords for ATS optimization
    - Focus on quantifiable achievements when possible
    - Tailor to the job description if provided
    - Do not use first-person pronouns (I, me, my)
    - Start with a strong professional identifier (e.g., "Experienced Software Engineer" rather than "I am a Software Engineer")
    - Format as a single paragraph
    - NEVER mention "resume" or "CV" in the summary
    - NEVER address the reader directly
    - NEVER mention "seeking new opportunities" or job searching
    
    VERY IMPORTANT: Respond ONLY with the professional summary text. Do not include ANY explanations, introductions, or comments.`
  };

  const userMessage = buildUserMessageContent(existingSummary, professionalContext, experience, education, skills, jobContext, action);

  return [
    systemMessage,
    {
      role: "user",
      content: userMessage
    }
  ];
}

// Build the user message with all available context
function buildUserMessageContent(existingSummary, professionalContext, experience, education, skills, jobContext, action) {
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
    experience.forEach((exp, index) => {
      content += `Position ${index + 1}: ${exp.title} at ${exp.company}\n`;
      if (exp.startDate && exp.endDate) content += `Duration: ${exp.startDate} - ${exp.endDate}\n`;
      if (exp.description) content += `Description: ${exp.description}\n`;
      content += '\n';
    });
  }

  // Add education if available
  if (education && education.length > 0) {
    content += '=== EDUCATION ===\n';
    education.forEach((edu, index) => {
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
    content += 'Please improve the existing summary using the provided context. Make it more professional, impactful, and tailored to the job description if provided, and always according to resume best practices.\n';
  } else {
    content += 'Please create a professional summary based on the provided information. Make it impactful and tailored to the job description if provided, and always according to resume best practices.\n';
  }
  content += 'Remember to follow the guidelines in your instructions.';

  return content;
} 