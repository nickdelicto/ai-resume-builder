import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert resume writer that improves work experience descriptions for resumes. Your task is to enhance the given description by using action verbs, quantifying achievements where possible, and focusing on impactful contributions, according to best practices for resumes. Maintain the bullet point format, ensuring each point starts with '- '. Make sure your improved bullet point DOES NOT EXCEED 150 characters. Provide only the improved description, without any additional titles, introductions, or explanations. If the content is not relevant to work experience, respond by kindly asking the user to write their relevant work experience."
        },
        {
          role: "user",
          content: description
        }
      ],
    })

    const improvedDescription = completion.choices[0].message.content

    if (!improvedDescription) {
      return NextResponse.json({ error: 'No improvement generated' }, { status: 400 })
    }

    // Ensure each line starts with '- '
    const cleanedDescription = improvedDescription
      .split('\n')
      .map(line => line.trim().startsWith('- ') ? line.trim() : `- ${line.trim()}`)
      .join('\n')

    return NextResponse.json({ improvedDescription: cleanedDescription })
  } catch (error) {
    console.error('Error in AI suggestion:', error)
    return NextResponse.json({ error: 'Error generating AI suggestion' }, { status: 500 })
  }
}