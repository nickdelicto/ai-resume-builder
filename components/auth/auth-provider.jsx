import { SessionProvider } from 'next-auth/react';
import AuthGuard from './auth-guard';

/**
 * AuthProvider wraps our application with SessionProvider
 * to provide authentication context to all components
 */
export default function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <AuthGuard>
        {children}
      </AuthGuard>
    </SessionProvider>
  );
} 