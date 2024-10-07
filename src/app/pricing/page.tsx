'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/app/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/app/components/ui/card'
import { Check, X, ArrowRight, Shield, Clock, FileText } from 'lucide-react'
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
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
        }),
      })
  
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to create checkout session: ${errorData.error || 'Unknown error'}`)
      }
  
      const { sessionId } = await response.json()
      const stripe = await stripePromise
      
      if (!stripe) {
        throw new Error('Stripe failed to initialize')
      }
  
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
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
          Choose Your Perfect Plan
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Access the full potential of your resume with our flexible pricing options. No hidden fees, no auto-renewals.
        </p>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="bg-white shadow-lg transform transition-all duration-300 hover:scale-105">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Free Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold mb-4 text-purple-600">$0</p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Create and edit unlimited resumes</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Save one resume</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Basic AI suggestions</span>
                </li>
                <li className="flex items-center text-gray-400">
                  <X className="mr-2 h-5 w-5 text-red-500" />
                  <span>Export resumes</span>
                </li>
                <li className="flex items-center text-gray-400">
                  <X className="mr-2 h-5 w-5 text-red-500" />
                  <span>Advanced AI features</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/dashboard')} className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                Continue with Free Plan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
          <Card className="bg-purple-50 shadow-lg border-2 border-purple-500 transform transition-all duration-300 hover:scale-105">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-purple-700">Premium Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold mb-2 text-purple-600">$9.99</p>
              <p className="text-lg font-semibold mb-4 text-purple-700">7 Days Full Access</p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Create and edit unlimited resumes</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Save up to 10 resumes</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Export resumes in ATS-friendly format</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Advanced AI-powered suggestions</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  <span>Priority customer support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handlePurchase} 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Get 7-Day Access'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
        <p className="mt-8 text-center text-gray-600">
          No auto-renewals. No hidden fees. Just 7 days of full access to create your perfect resume.
        </p>
      </div>
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Why Choose IntelliResume Premium?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white shadow-md">
              <CardContent className="flex flex-col items-center p-6">
                <Shield className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-800">ATS-Optimized</h3>
                <p className="text-center text-gray-600">Our resumes are designed to pass Applicant Tracking Systems, increasing your chances of landing an interview.</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md">
              <CardContent className="flex flex-col items-center p-6">
                <Clock className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Time-Saving</h3>
                <p className="text-center text-gray-600">Create a professional resume in minutes, not hours, with our intuitive AI-powered builder.</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md">
              <CardContent className="flex flex-col items-center p-6">
                <FileText className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Tailored Content</h3>
                <p className="text-center text-gray-600">Get personalized suggestions and content tailored to your industry and experience level.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="bg-purple-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-purple-800">Still have questions?</h2>
          <p className="text-xl mb-8 text-purple-700">
            Our support team is here to help you make the best choice for your career.
          </p>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PricingPage