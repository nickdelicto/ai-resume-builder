import { Metadata } from 'next'
import ClientContactPage from './ClientContactPage'

export const metadata: Metadata = {
  title: 'Contact Us | IntelliResume',
  description: 'Get in touch with IntelliResume. We\'re here to help with any questions about our AI-powered resume builder.',
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
        <ClientContactPage />
      </div>
    </div>
  )
}