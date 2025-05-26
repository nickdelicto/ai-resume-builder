'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/use-toast'

export default function PaymentSuccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId) {
      // Verify the payment session and update user status
      fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast({
              title: 'Payment Successful',
              description: 'Your account has been upgraded to premium.',
              variant: 'default',
            })
          } else {
            toast({
              title: 'Error',
              description: 'There was an issue verifying your payment. Please contact support.',
              variant: 'destructive',
            })
          }
        })
        .catch((error) => {
          console.error('Error verifying payment:', error)
          toast({
            title: 'Error',
            description: 'An unexpected error occurred. Please try again or contact support.',
            variant: 'destructive',
          })
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [searchParams, toast])

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Verifying payment...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
      <p className="mb-6">Thank you for upgrading to our premium plan. Your account has been updated.</p>
      <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
    </div>
  )
}