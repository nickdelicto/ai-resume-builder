import { NextResponse } from 'next/server'
import * as brevo from '@getbrevo/brevo'

// Initialize Brevo API instance
const apiInstance = new brevo.TransactionalEmailsApi()

// Configure API key authorization
const apiKey = process.env.BREVO_API_KEY
if (!apiKey) {
  throw new Error('BREVO_API_KEY is not set in environment variables')
}
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)

// Function to verify reCAPTCHA token
async function verifyRecaptcha(token: string) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not set in environment variables')
    return false
  }
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`

  try {
    console.log('Attempting reCAPTCHA verification with URL:', verifyUrl)
    console.log('reCAPTCHA token:', token)
    const response = await fetch(verifyUrl, { method: 'POST' })
    console.log('reCAPTCHA verification response status:', response.status)
    const data = await response.json()
    console.log('reCAPTCHA verification response data:', data)
    if (data.success) {
      console.log('reCAPTCHA verification successful. Score:', data.score)
    } else {
      console.log('reCAPTCHA verification failed. Error codes:', data['error-codes'])
    }
    return data.success && data.score > 0.5 // Adjust this threshold as needed
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error)
    return false
  }
}

// Rate limiting implementation
interface RateLimitEntry {
  count: number
  lastReset: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip) || { count: 0, lastReset: now }

  if (now - entry.lastReset > windowMs) {
    entry.count = 1
    entry.lastReset = now
  } else {
    entry.count++
  }

  rateLimitMap.set(ip, entry)

  return entry.count <= limit
}

// Main POST handler for contact form submissions
export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const isAllowed = rateLimit(ip, 5, 60 * 1000) // 5 requests per minute

    if (!isAllowed) {
      console.log('Rate limit exceeded for IP:', ip)
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, subject, message, recaptchaToken } = body

    console.log('Received form submission:', { name, email, subject, message: message.substring(0, 50) + '...' })
    console.log('reCAPTCHA token received:', recaptchaToken ? 'Yes' : 'No')

    // Verify reCAPTCHA
    console.log('Starting reCAPTCHA verification...')
    const isHuman = await verifyRecaptcha(recaptchaToken)
    if (!isHuman) {
      console.log('reCAPTCHA verification failed')
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed' },
        { status: 400 }
      )
    }

    console.log('reCAPTCHA verification passed')

    // Validate the input
    if (!name || !email || !subject || !message) {
      console.log('Missing required fields:', { name: !!name, email: !!email, subject: !!subject, message: !!message })
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('Invalid email address:', email)
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Create the email
    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.to = [{ email: 'delictodelight@gmail.com', name: 'Nick from IntelliResume' }]
    sendSmtpEmail.subject = `New Contact Form Submission: ${subject}`
    sendSmtpEmail.htmlContent = `
      <html>
        <body>
          <h1>New Contact Form Submission</h1>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        </body>
      </html>
    `
    sendSmtpEmail.sender = { email: email, name: name }

    console.log('Attempting to send email via Brevo')

    // Send the email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail)

    console.log('Email sent successfully. Returned data:', JSON.stringify(data))
    return NextResponse.json(
      { message: 'Form submitted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing form submission:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}