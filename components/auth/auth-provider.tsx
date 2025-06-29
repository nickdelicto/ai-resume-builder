'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, FC } from 'react'
import AuthGuard from './auth-guard'
import dynamic from 'next/dynamic'

// Dynamically import the migration hook to avoid SSR issues
const DynamicAuthMigration = dynamic(
  () => import('./useAuthMigration').then(mod => ({ default: mod.default })),
  { ssr: false }
)

type AuthProviderProps = {
  children: ReactNode
}

/**
 * AuthProvider wraps our application with SessionProvider
 * to provide authentication context to all components
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <AuthGuard>
        <AuthMigrationWrapper>
          {children}
        </AuthMigrationWrapper>
      </AuthGuard>
    </SessionProvider>
  )
}

// Helper component to use our migration hook
const AuthMigrationWrapper: FC<{children: ReactNode}> = ({ children }) => {
  // Use the dynamically imported hook
  const AuthMigration = DynamicAuthMigration ? <DynamicAuthMigration /> : null
  
  return (
    <>
      {AuthMigration}
      {children}
    </>
  )
} 