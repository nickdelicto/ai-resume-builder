import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define interfaces for the resume data structure
interface Experience {
  position: string;
  company: string;
  description: string;
}

interface Education {
  degree: string;
  fieldOfStudy: string;
  institution: string;
}

interface Skill {
  name: string;
}

interface ResumeData {
  professionalSummary: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
}

export async function POST(req: Request) {
  try {
    // Parse the incoming resume data
    const resumeData: ResumeData = await req.json()

    // Construct the prompt for the OpenAI API
    const prompt = `Based on the following resume information, suggest 5 relevant skills that are not already listed, while adhering to best practices for resumes. Provide ONLY the suggested skills, EACH AT A TIME ON ITS OWN LINE, without any numbering, bullet points, additional titles, introductions, or explanations.:

Professional Summary: ${resumeData.professionalSummary}

Work Experience:
${resumeData.experience.map((exp: Experience) => `
- ${exp.position} at ${exp.company}
  ${exp.description}
`).join('\n')}

Education:
${resumeData.education.map((edu: Education) => `
- ${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution}
`).join('\n')}

Existing Skills:
${resumeData.skills.map((skill: Skill) => skill.name).join(', ')}

Suggested skills:`

    // Call the OpenAI API to generate skill suggestions
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      n: 1,
      temperature: 0.5,
    })

    // Process the API response
    const suggestedSkillsText = completion.choices[0].message.content?.trim() || ''
    const suggestedSkills = suggestedSkillsText.split('\n').map(skill => skill.replace(/^-\s*/, '').trim())

    // Return the suggested skills as a JSON response
    return NextResponse.json(suggestedSkills)
  } catch (error) {
    // Log and return an error response if an exception occurs
    console.error('Error suggesting skills:', error)
    return NextResponse.error()
  }
}