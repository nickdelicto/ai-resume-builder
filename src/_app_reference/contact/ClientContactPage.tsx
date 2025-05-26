'use client'

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import ContactForm from './ContactForm'

export default function ClientContactPage() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: 'head',
        nonce: undefined,
      }}
    >
      <ContactForm />
    </GoogleReCaptchaProvider>
  )
}