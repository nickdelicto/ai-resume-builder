'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const PaymentSuccessClient = dynamic(() => import('./PaymentSuccessClient'), {
  ssr: false,
})

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <PaymentSuccessClient />
    </Suspense>
  )
}