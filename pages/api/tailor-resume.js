import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumeData, jobContext } = req.body;
    
    // Validate input data
    if (!resumeData) {
      return res.status(400).json({ error: 'Missing resume data' });
    }
    
    if (!jobContext || !jobContext.jobTitle || !jobContext.description) {
      return res.status(400).json({ error: 'Missing or invalid job context' });
    }

    console.log('📊 Tailoring resume for job:', jobContext.jobTitle);
    
    // Tailor different sections in parallel for efficiency
    const [tailoredSummary, tailoredExperience, tailoredSkills] = await Promise.all([
      tailorSummary(resumeData, jobContext),
      tailorExperience(resumeData, jobContext),
      tailorSkills(resumeData, jobContext)
    ]);

    // Return the tailored content
    return res.status(200).json({
      summary: tailoredSummary,
      experience: tailoredExperience,
      skills: tailoredSkills,
      metadata: {
        tailoredAt: new Date().toISOString(),
        jobTitle: jobContext.jobTitle
      }
    });
  } catch (error) {
    console.error('Error tailoring resume:', error);
    return res.status(500).json({ 
      error: 'Failed to tailor resume',
      message: error.message 
    });
  }
}

/**
 * Creates a tailored professional summary based on job context
 */
async function tailorSummary(resumeData, jobContext) {
  // Create prompt for summary tailoring
  const prompt = createSummaryPrompt(resumeData, jobContext);
  
  try {
    // Call AI model
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // Use the most advanced available model
      messages: [
        { 
          role: "system", 
          content: "You are an expert resume writer specialized in tailoring professional summaries to match job descriptions. You focus on highlighting key strengths, experiences, and career objectives."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and return the tailored summary
    const tailoredSummary = response.choices[0].message.content.trim();
    return tailoredSummary;
  } catch (error) {
    console.error('Error tailoring summary:', error);
    // Return the original summary if there's an error
    return resumeData.summary || '';
  }
}

/**
 * Creates a prompt for tailoring experience descriptions
 */
function createExperiencePrompt(resumeData, jobContext) {
  const experiencePrompts = resumeData.experience?.map((exp, index) => {
    return `
EXPERIENCE ITEM ${index + 1}:
Job Title: ${exp.title || 'Not provided'}
Company: ${exp.company || 'Not provided'}
Period: ${exp.startDate || 'N/A'} to ${exp.endDate || 'Present'}
Current Position: ${exp.isCurrentPosition ? 'Yes' : 'No'}

Current Description:
${exp.description || "No description provided."}

TAILORING INSTRUCTIONS:
1. Rewrite this experience description to highlight aspects most relevant to the job, while guided by ATS-compatible resume best practices: "${jobContext.jobTitle}".
2. Focus on achievements and responsibilities that match the job requirements.
3. Use bullet points, beginning with strong action verbs BUT DO NOT EXCEED 200 characters for each bullet point.
4. Do not add any actual dashes, asterisks, or other formatting to the bullet points.
5. Include metrics and quantifiable results where possible, focusing on impactful contributions.
6. ONLY return the tailored description text and nothing else, with each beginning on a new line.
7. Ensure each description item is unique and not repeated from the original description.
8. Where you feel the existing description points are insufficient, generate new ones intelligently that are relevant to the job according to resume best practices.
9. Each description item should begin on a new line.

The job requires: ${extractKeyRequirements(jobContext.description)}
`;
  }).join('\n\n---\n\n') || '';

  return `
TASK: Tailor the following work experience descriptions to better match the target job.

TARGET JOB TITLE: ${jobContext.jobTitle}

JOB DESCRIPTION:
${jobContext.description}

${experiencePrompts}

Format your response as follows for each experience item. DO NOT include the job title, company name, or any other info - ONLY the description text:

EXPERIENCE ITEM 1 TAILORED:
[Tailored description here]

EXPERIENCE ITEM 2 TAILORED:
[Tailored description here]

And so on for each experience item.

IMPORTANT: Only provide the tailored description text for each experience. Do not return the job title, company name, dates, or any other information.
`;
}

/**
 * Tailors experience descriptions to highlight relevant skills and achievements
 */
async function tailorExperience(resumeData, jobContext) {
  console.log('📊 tailorExperience - Starting experience tailoring');
  
  // Skip if no experience data
  if (!resumeData.experience || resumeData.experience.length === 0) {
    console.log('📊 tailorExperience - No experience data found, returning empty array');
    return [];
  }

  console.log(`📊 tailorExperience - Processing ${resumeData.experience.length} experience items`);
  console.log('📊 tailorExperience - First experience sample:', JSON.stringify(resumeData.experience[0]).substring(0, 200) + '...');

  // Create prompt for experience tailoring
  const prompt = createExperiencePrompt(resumeData, jobContext);
  console.log('📊 tailorExperience - Created prompt with length:', prompt.length);
  
  try {
    console.log('📊 tailorExperience - Calling OpenAI API for experience tailoring');
    // Call AI model
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert resume writer who tailors descriptions for specific experiences in a resume to match a given job description. You tailor intelligently while guided by ATS resume best practices."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    console.log('📊 tailorExperience - Received response from OpenAI');
    const responseText = response.choices[0].message.content.trim();
    console.log('📊 tailorExperience - Response text sample:', responseText.substring(0, 200) + '...');
    
    // Create a copy of the original experience items that we'll update with tailored descriptions
    const tailoredExperience = [...resumeData.experience];
    
    // Process each experience item to extract the tailored description
    resumeData.experience.forEach((exp, index) => {
      // Look for the marker for this experience item
      const markerPattern = new RegExp(`EXPERIENCE\\s*ITEM\\s*${index + 1}\\s*TAILORED:?`, 'i');
      const nextMarkerPattern = index < resumeData.experience.length - 1 
        ? new RegExp(`EXPERIENCE\\s*ITEM\\s*${index + 2}\\s*TAILORED:?`, 'i') 
        : /CONCLUSION|SUMMARY|END|$/i;  // Look for a conclusion marker or end of text
      
      console.log(`📊 tailorExperience - Looking for marker pattern for experience ${index + 1}`);
      
      // Find the start marker using regex
      const markerMatch = responseText.match(markerPattern);
      if (!markerMatch) {
        console.log(`📊 tailorExperience - Marker pattern not found for experience ${index + 1}, keeping original`);
        return; // Keep original, continue to next experience
      }
      
      const startIdx = markerMatch.index + markerMatch[0].length;
      console.log(`�� tailorExperience - Found marker for experience ${index + 1} at position ${markerMatch.index}`);
      
      // Find the end marker or use end of text
      let endIdx;
      const nextMarkerMatch = responseText.slice(startIdx).match(nextMarkerPattern);
      if (nextMarkerMatch) {
        endIdx = startIdx + nextMarkerMatch.index;
        console.log(`📊 tailorExperience - Found next marker at position ${endIdx}`);
      } else {
        console.log(`📊 tailorExperience - Next marker not found, using end of text for experience ${index + 1}`);
        endIdx = responseText.length;
      }
      
      let tailoredDescription = responseText.substring(startIdx, endIdx).trim();
      
      // Extra processing to clean up the description
      // Remove any remaining markdown formatting or artifacts
      tailoredDescription = tailoredDescription
        .replace(/^```.*$/gm, '') // Remove code blocks
        .replace(/^```$/gm, '')   // Remove code block endings
        .replace(/^\s*\*\s+/gm, '') // Remove markdown list markers
        .replace(/^\s*-\s+/gm, '') // Remove dash list markers
        .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
        .trim();
      
      console.log(`📊 tailorExperience - Extracted description for experience ${index + 1}, length: ${tailoredDescription.length}`);
      console.log(`📊 tailorExperience - Description sample: ${tailoredDescription.substring(0, 100)}...`);
      
      if (!tailoredDescription || tailoredDescription.length < 20) {
        console.log(`📊 tailorExperience - Empty or too short description for experience ${index + 1}, keeping original`);
        return; // Keep original, continue to next experience
      }
      
      // Update the description in our copy of the experience array
      tailoredExperience[index] = {
        ...tailoredExperience[index],
        description: tailoredDescription
      };
    });
    
    console.log(`📊 tailorExperience - Processed ${tailoredExperience.length} experience items`);
    console.log('📊 tailorExperience - First processed experience sample:', 
      tailoredExperience[0] ? JSON.stringify(tailoredExperience[0]).substring(0, 200) + '...' : 'None');
    
    return tailoredExperience;
    
  } catch (error) {
    console.error('📊 tailorExperience - Error tailoring experience:', error);
    console.error('📊 tailorExperience - Error details:', error.message);
    if (error.response) {
      console.error('📊 tailorExperience - OpenAI API error:', error.response.data);
    }
    // Return the original experience if there's an error
    return resumeData.experience;
  }
}

/**
 * Tailors skills to match job requirements
 */
async function tailorSkills(resumeData, jobContext) {
  // Skip if no skills data
  if (!resumeData.skills || resumeData.skills.length === 0) {
    return [];
  }

  // Create prompt for skills tailoring
  const prompt = createSkillsPrompt(resumeData, jobContext);
  
  try {
    // Call AI model
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert resume writer who's specialized at identifying relevant skills for job applications. You prioritize skills that match job requirements and suggest relevant additions."
        },
        { role: "user", content: prompt }
      ],
      // temperature: 0.6,
      max_tokens: 800,
    });

    const responseText = response.choices[0].message.content.trim();
    
    // Try to parse as JSON
    try {
      // Look for a JSON array pattern
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const tailoredSkills = JSON.parse(jsonStr);
        return tailoredSkills;
      }
    } catch (parseError) {
      console.error('Error parsing skills JSON:', parseError);
    }
    
    // Fallback: extract skills as a comma-separated list
    console.log('Falling back to text processing for skills');
    const skillsSection = responseText.split('\n').find(line => 
      line.includes('TAILORED SKILLS:') || 
      line.includes('SKILLS LIST:') || 
      line.includes('RECOMMENDED SKILLS:')
    );
    
    if (skillsSection) {
      const skillsPart = skillsSection.split(':')[1].trim();
      const extractedSkills = skillsPart.split(',').map(skill => skill.trim());
      return extractedSkills.filter(skill => skill.length > 0);
    }
    
    // If all parsing fails, return original skills
    return resumeData.skills;
    
  } catch (error) {
    console.error('Error tailoring skills:', error);
    // Return the original skills if there's an error
    return resumeData.skills;
  }
}

/**
 * Creates a prompt for tailoring the professional summary
 */
function createSummaryPrompt(resumeData, jobContext) {
  return `
TASK: Create a tailored professional summary for a resume based on the job description.

JOB TITLE: ${jobContext.jobTitle}

JOB DESCRIPTION:
${jobContext.description}

CURRENT RESUME SUMMARY:
${resumeData.summary || "No existing summary provided."}

CANDIDATE EXPERIENCE OVERVIEW:
${resumeData.experience?.map(exp => 
  `- ${exp.title} at ${exp.company} (${exp.startDate || 'N/A'} to ${exp.endDate || 'Present'})
   Key responsibilities: ${exp.description?.substring(0, 150) || 'Not provided'}${exp.description?.length > 150 ? '...' : ''}`
).join('\n') || 'No experience provided'}

CANDIDATE SKILLS:
${resumeData.skills?.join(', ') || 'No skills provided'}

INSTRUCTIONS:
1. Create a compelling professional summary (3-5 sentences, max 60 words) that highlights the candidate's most relevant key strengths, experiences, and career objectives for this specific job.
2. Make it concise, impactful, and adhere to best practices for resumes while tailoring it to the job description accordingly.
3. Use industry-specific language that matches the job description.

TAILORED PROFESSIONAL SUMMARY:
`;
}

/**
 * Creates a prompt for tailoring skills
 */
function createSkillsPrompt(resumeData, jobContext) {
  return `
TASK: Optimize the skills section of a resume to match a specific job description.

JOB TITLE: ${jobContext.jobTitle}

JOB DESCRIPTION:
${jobContext.description}

CURRENT SKILLS LIST:
${resumeData.skills?.join(', ') || 'No skills provided'}

INSTRUCTIONS:
1. Analyze the job description and identify key required skills and competencies.
2. While adhering to ATS-compatible resume best practices, generate skills that:
   a) Are likely possessed by the candidate based on their existing skills and experience
   b) Are mentioned or implied in the job description
   c) Would strengthen the candidate's application
4. Return a JSON array of skills, with the most relevant skills for the job listed first.
5. Limit the total number of skills to 10-15 for readability.
6. DO NOT remove technical skills that might be relevant but not explicitly mentioned.
7. The skills should always be concise using best practices for listing skills in resumes.

TAILORED SKILLS LIST:
`;
}

/**
 * Helper function to extract key requirements from a job description
 */
function extractKeyRequirements(jobDescription) {
  // This is a simple extraction - in production, you might use more sophisticated NLP
  if (!jobDescription) return '';
  
  const description = jobDescription.toLowerCase();
  const keywords = [
    'required', 'requirements', 'qualifications', 'skills', 'experience',
    'proficient', 'knowledge', 'familiarity', 'ability', 'years'
  ];
  
  const sentences = description.split(/[.!?]+/);
  return sentences
    .filter(sentence => 
      keywords.some(keyword => sentence.includes(keyword))
    )
    .join('. ');
} 