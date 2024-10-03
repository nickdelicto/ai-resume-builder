'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/app/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/app/components/ui/card'
import { Check } from 'lucide-react'
import { useToast } from '@/app/components/ui/use-toast'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const PricingPage = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handlePurchase = async () => {
    setIsLoading(true)
    try {
      console.log('Starting purchase process...');
      console.log('User ID:', session?.user?.id);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
        }),
      })
  
      console.log('Received response from create-checkout-session');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(`Failed to create checkout session: ${errorData.error || 'Unknown error'}`)
      }
  
      const { sessionId } = await response.json()
      console.log('Received sessionId:', sessionId);
      const stripe = await stripePromise
      
      if (!stripe) {
        throw new Error('Stripe failed to initialize')
      }
  
      console.log('Redirecting to Stripe checkout...');
      const { error } = await stripe.redirectToCheckout({ sessionId })
  
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'Unable to process payment. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Choose Your Plan</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Create and edit unlimited resumes
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Save one resume
              </li>
              <li className="flex items-center text-gray-500">
                <span className="mr-2 h-4 w-4">✕</span>
                Export resumes
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Continue with Free Plan
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Premium Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Create and edit unlimited resumes
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Save up to 10 resumes
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Export resumes in ATS-friendly format
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                7 days of access
              </li>
            </ul>
            <p className="mt-4 text-2xl font-bold">$9.99</p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handlePurchase} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Purchase 7-Day Access'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default PricingPage