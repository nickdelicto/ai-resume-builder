'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Button } from '../../src/app/components/ui/button'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface SignInButtonProps {
  mode?: 'button' | 'link'
  showSignOut?: boolean
  callbackUrl?: string
  className?: string
}

export function SignInButton({
  mode = 'button',
  showSignOut = true,
  callbackUrl = '/',
  className = '',
}: SignInButtonProps) {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    await signIn('google', { callbackUrl })
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    await signOut({ callbackUrl: '/' })
  }

  // If the user is authenticated and we want to show sign out option
  if (status === 'authenticated' && showSignOut) {
    return (
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading
          </>
        ) : (
          'Sign Out'
        )}
      </Button>
    )
  }

  // If the user is not authenticated or we don't want to show sign out
  if (status === 'unauthenticated' || (status === 'authenticated' && !showSignOut)) {
    if (mode === 'button') {
      return (
        <Button onClick={handleSignIn} disabled={isLoading} className={className}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      )
    } else {
      return (
        <Button
          variant="link"
          onClick={handleSignIn}
          disabled={isLoading}
          className={`p-0 text-base text-blue-600 hover:text-blue-500 font-normal hover:no-underline ${className}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      )
    }
  }

  // Loading state
  return (
    <Button disabled className={className}>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading
    </Button>
  )
} 