'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const AuthErrorClient = dynamic(() => import('./AuthErrorClient'), {
  ssr: false,
})

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorClient />
    </Suspense>
  )
}