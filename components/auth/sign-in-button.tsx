'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { markLocalStorageForMigration } from '../../components/ModernResumeBuilder/ModernResumeBuilder'
import { clearDbOnlyMode } from '../../lib/resumeUtils'

// Button component with variants
const Button = ({ 
  children, 
  onClick, 
  disabled, 
  className = '', 
  variant = 'default' 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'link';
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background'
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    link: 'underline-offset-4 hover:underline text-primary'
  }
  
  const variantStyles = variants[variant] || variants.default
  
  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

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
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async () => {
    setIsLoading(true)
    // Mark localStorage data for migration before authentication
    // Only if we have resume data to migrate and migration isn't already in progress
    if (typeof window !== 'undefined' && 
        localStorage.getItem('modern_resume_data') && 
        localStorage.getItem('migration_in_progress') !== 'true' &&
        localStorage.getItem('migration_debounce') !== 'true' &&
        localStorage.getItem('db_only_mode') !== 'true') {
      console.log('📊 Sign-in button marking localStorage for migration')
      markLocalStorageForMigration()
    } else if (typeof window !== 'undefined') {
      console.log('📊 Skipping migration mark from sign-in button:', {
        hasLocalData: !!localStorage.getItem('modern_resume_data'),
        inProgress: localStorage.getItem('migration_in_progress') === 'true',
        inDebounce: localStorage.getItem('migration_debounce') === 'true', 
        dbOnlyMode: localStorage.getItem('db_only_mode') === 'true'
      })
    }
    
    // Check if this is a download action
    const isDownloadAction = typeof window !== 'undefined' && 
                            (window.location.href.includes('action=download') || 
                             localStorage.getItem('pending_resume_download') === 'true');
    
    // Only store the original callback URL if it's not a download action
    // For download actions, we want to prioritize the subscription flow
    if (!isDownloadAction && typeof window !== 'undefined' && 
        callbackUrl && callbackUrl !== '/' && !callbackUrl.startsWith('/profile')) {
      localStorage.setItem('post_auth_redirect', callbackUrl)
      
      // Store the action type (not download) to help with post-auth flow decisions
      localStorage.setItem('auth_action', 'standard_signin')
    } else if (isDownloadAction && typeof window !== 'undefined') {
      // For download actions, explicitly set the action type
      localStorage.setItem('auth_action', 'download')
      console.log('📊 Sign-in button detected download action, setting auth_action=download')
    }
    
    // Always redirect to profile page after authentication
    // The profile page will handle further redirects based on subscription status
    const profileRedirect = '/profile?migrate=true'
    
    await signIn('google', { callbackUrl: profileRedirect })
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    
    // Clear DB-only mode when signing out
    // This ensures the user will revert to using localStorage when not authenticated
    if (typeof window !== 'undefined') {
      console.log('📊 Sign-out: Clearing DB-only mode');
      clearDbOnlyMode();
      
      // Also clear any current resume ID to prevent conflicts
      localStorage.removeItem('current_resume_id');
      localStorage.removeItem('editing_existing_resume');
      localStorage.removeItem('editing_resume_id');
      
      // Clear any auth-related localStorage items before signing out
      localStorage.removeItem('post_auth_redirect')
      localStorage.removeItem('auth_action')
    }
    
    await signOut({ callbackUrl: '/' })
  }

  if (!session && mode === 'button') {
    return (
      <Button
        onClick={handleSignIn}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    )
  }

  if (!session && mode === 'link') {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault()
          handleSignIn()
        }}
        className={`text-sm font-medium ${className}`}
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </a>
    )
  }

  if (session && showSignOut) {
    return (
      <div className="flex items-center gap-4">
        {mode === 'button' ? (
          <Button
            onClick={handleSignOut}
            variant="outline"
            className={className}
          >
            {isLoading ? 'Signing out...' : 'Sign out'}
          </Button>
        ) : (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              handleSignOut()
            }}
            className={`text-sm font-medium ${className}`}
          >
            {isLoading ? 'Signing out...' : 'Sign out'}
          </a>
        )}
      </div>
    )
  }

  return null
} 