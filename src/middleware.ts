import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (token) {
    // User is authenticated, fetch user data
    const userResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/user`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
    })

    if (userResponse.ok) {
      const userData = await userResponse.json()

      if (userData.isNewUser) {
        // New user, redirect to pricing page
        return NextResponse.redirect(new URL('/pricing', request.url))
      } else if (userData.planType === 'free') {
        // Free user, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else if (userData.planType === 'paid') {
        // Paid user, redirect to resume builder
        return NextResponse.redirect(new URL('/resume-builder', request.url))
      }
    }
  }

  // If not authenticated or doesn't match any condition, continue to the requested page
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/resume-builder',
    '/pricing',
  ],
}