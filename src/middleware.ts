import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (token) {
    // User is authenticated
    const isNewUser = token.isNewUser as boolean
    const planType = token.planType as string
    const createdAt = token.createdAt as number

    if (isNewUser || (Date.now() - createdAt < 60000)) {
      // New user or user created less than a minute ago, redirect to payment plan selection
      return NextResponse.redirect(new URL('/pricing', request.url))
    } else if (planType === 'free') {
      // Returning free user, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (planType === 'paid') {
      // Returning paid user, redirect to resume builder
      return NextResponse.redirect(new URL('/resume-builder', request.url))
    }
  }

  // If not authenticated or doesn't match any condition, continue to the requested page
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/resume-builder', '/pricing'],
}