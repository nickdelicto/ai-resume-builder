import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const resumeData = await req.json()

    const prompt = `Based on the following resume information, suggest 5 relevant skills that are not already listed, while adhering to best practices for resumes. Provide ONLY the suggested skills, EACH AT A TIME ON ITS OWN LINE, without any numbering, bullet points, additional titles, introductions, or explanations.:

Professional Summary: ${resumeData.professionalSummary}

Work Experience:
${resumeData.experience.map(exp => `
- ${exp.position} at ${exp.company}
  ${exp.description}
`).join('\n')}

Education:
${resumeData.education.map(edu => `
- ${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution}
`).join('\n')}

Existing Skills:
${resumeData.skills.map(skill => skill.name).join(', ')}

Suggested skills:`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      n: 1,
      temperature: 0.5,
    })

    const suggestedSkillsText = completion.choices[0].message.content?.trim() || ''
    const suggestedSkills = suggestedSkillsText.split('\n').map(skill => skill.replace(/^-\s*/, '').trim())

    return NextResponse.json(suggestedSkills)
  } catch (error) {
    console.error('Error suggesting skills:', error)
    return NextResponse.error()
  }
}