'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useToast } from '@/app/components/ui/use-toast'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { 
        callbackUrl: '/dashboard', // The middleware will handle the actual redirection
        redirect: true
      })
    } catch (error) {
      console.error('Google sign-in error:', error)
      toast({
        title: 'Error',
        description: 'An error occurred during Google sign-in. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('email', { 
        email, 
        redirect: false,
        callbackUrl: '/dashboard' // The middleware will handle the actual redirection
      })
      if (result?.error) {
        console.error('Sign-in error:', result.error)
        setError('An error occurred during sign-in. Please try again.')
        toast({
          title: 'Error',
          description: 'An error occurred during sign-in. Please try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Check your email',
          description: 'A sign in link has been sent to your email address. If you don\'t see it, please check your spam folder.',
        })
      }
    } catch (error) {
      console.error('Sign-in error:', error)
      setError('An unexpected error occurred. Please try again.')
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Login to IntelliResume</h1>
      <div className="w-full max-w-md space-y-8">
        <Button 
          onClick={handleGoogleSignIn}
          className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_13183_10121)"><path d="M20.3081 10.2303C20.3081 9.55056 20.253 8.86711 20.1354 8.19836H10.7031V12.0492H16.1046C15.8804 13.2911 15.1602 14.3898 14.1057 15.0879V17.5866H17.3282C19.2205 15.8449 20.3081 13.2728 20.3081 10.2303Z" fill="#3F83F8"/><path d="M10.7019 20.0006C13.3989 20.0006 15.6734 19.1151 17.3306 17.5865L14.1081 15.0879C13.2115 15.6979 12.0541 16.0433 10.7056 16.0433C8.09669 16.0433 5.88468 14.2832 5.091 11.9169H1.76562V14.4927C3.46322 17.8695 6.92087 20.0006 10.7019 20.0006V20.0006Z" fill="#34A853"/><path d="M5.08857 11.9169C4.66969 10.6749 4.66969 9.33008 5.08857 8.08811V5.51233H1.76688C0.348541 8.33798 0.348541 11.667 1.76688 14.4927L5.08857 11.9169V11.9169Z" fill="#FBBC04"/><path d="M10.7019 3.95805C12.1276 3.936 13.5055 4.47247 14.538 5.45722L17.393 2.60218C15.5852 0.904587 13.1858 -0.0287217 10.7019 0.000673888C6.92087 0.000673888 3.46322 2.13185 1.76562 5.51234L5.08732 8.08813C5.87733 5.71811 8.09302 3.95805 10.7019 3.95805V3.95805Z" fill="#EA4335"/></g><defs><clipPath id="clip0_13183_10121"><rect width="20" height="20" fill="white" transform="translate(0.5)"/></clipPath></defs>
          </svg>
          Sign in with Google
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleEmailSignIn}>
          <Input
            type="email"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Sign in with Email'}
          </Button>
        </form>
      </div>
    </div>
  )
}