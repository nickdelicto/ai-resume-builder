'use client'

import React, { useState } from 'react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Label } from "../components/ui/label"

// Define types for form data and errors
interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function ContactForm() {
  // State for form data, errors, submission status, and messages
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [honeypot, setHoneypot] = useState('') // Honeypot field for bot detection

  // Hook to execute reCAPTCHA
  const { executeRecaptcha } = useGoogleReCaptcha()

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }))
  }

  // Validate form inputs
  const validateForm = () => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid"
    if (!formData.subject.trim()) newErrors.subject = "Subject is required"
    if (!formData.message.trim()) newErrors.message = "Message is required"
    return newErrors
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Check if honeypot field is filled (bot detection)
    if (honeypot) {
      console.log('Potential bot submission detected')
      return
    }

    const newErrors = validateForm()
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true)
      setSubmitMessage('')
      try {
        if (!executeRecaptcha) {
          throw new Error('reCAPTCHA not initialized')
        }
        // Execute reCAPTCHA and get token
        const token = await executeRecaptcha('contact_form')
        
        // Send form data to API
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...formData, recaptchaToken: token }),
        })

        const data = await response.json()

        if (response.ok) {
          setSubmitMessage('Message sent successfully!')
          setFormData({ name: '', email: '', subject: '', message: '' })
        } else {
          setSubmitMessage(`Error: ${data.error || 'An unknown error occurred'}`)
        }
      } catch (error) {
        console.error('Error submitting form:', error)
        setSubmitMessage('An error occurred while sending the message. Please try again later.')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      setErrors(newErrors)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name field */}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Email field */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      {/* Subject field */}
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className={errors.subject ? "border-red-500" : ""}
        />
        {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
      </div>

      {/* Message field */}
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          className={errors.message ? "border-red-500" : ""}
        />
        {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
      </div>

      {/* Honeypot field (hidden from users, used to catch bots) */}
      <Input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
      />

      {/* Submit button */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>

      {/* Submission message (success or error) */}
      {submitMessage && (
        <p className={`mt-4 ${submitMessage.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>
          {submitMessage}
        </p>
      )}
    </form>
  )
}