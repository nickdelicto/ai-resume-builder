'use client'

import { useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/ui/use-toast'

export default function AuthCallback() {
  const { status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const handleRedirect = useCallback(async () => {
    try {
      const response = await fetch('/api/user-status')
      const userData = await response.json()
      
      if (userData.isNewUser) {
        router.push('/pricing')
      } else if (userData.planType === 'free') {
        router.push('/dashboard')
      } else {
        router.push('/resume-builder')
      }
    } catch (error) {
      console.error('Error fetching user status:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while redirecting. Please try again.',
        variant: 'destructive',
      })
      router.push('/dashboard')
    }
  }, [router, toast])

  useEffect(() => {
    if (status === 'authenticated') {
      handleRedirect()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, handleRedirect, router])

  return <div>Authenticating...</div>
}