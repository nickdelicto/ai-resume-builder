'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/use-toast'

export default function PaymentCancelled() {
  const router = useRouter()
  const { toast } = useToast()

  const handleReturnToPricing = () => {
    toast({
      title: 'Payment Cancelled',
      description: 'Your payment was cancelled. You can try again or continue with the free plan.',
      variant: 'default',
    })
    router.push('/pricing')
  }

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
      <p className="mb-6">Your payment was cancelled. If you have any questions, please contact our support team.</p>
      <Button onClick={handleReturnToPricing}>Return to Pricing</Button>
    </div>
  )
}