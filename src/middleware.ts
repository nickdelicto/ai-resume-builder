import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Helper function to check if a string is an IP address (IPv4 or IPv6)
// Handles both with and without port numbers
function isIPAddress(host: string): boolean {
  // Remove port if present (e.g., "192.168.1.1:3000" -> "192.168.1.1")
  const hostWithoutPort = host.split(':')[0]
  
  // IPv4 pattern: 1.2.3.4 or 192.168.1.1
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 pattern: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 or ::1
  // Note: IPv6 with port is like [2001::1]:3000, but Host header usually has brackets removed
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$|^::1$|^::/
  
  return ipv4Pattern.test(hostWithoutPort) || ipv6Pattern.test(hostWithoutPort)
}

export async function middleware(request: NextRequest) {
  // CRITICAL: Redirect IP address requests to domain (Bing SEO fix)
  // This prevents Bing from indexing IP URLs which show as unsecured
  const host = request.headers.get('host') || ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net'
  
  // If request is coming via IP address, redirect to domain
  if (isIPAddress(host)) {
    // Get the pathname from the request URL
    const pathname = new URL(request.url).pathname
    const search = new URL(request.url).search
    // Construct the redirect URL using the domain
    const redirectUrl = `${siteUrl}${pathname}${search}`
    return NextResponse.redirect(redirectUrl, 301) // 301 permanent redirect for SEO
  }

  // Auth-based routing ONLY applies to homepage
  // This prevents infinite redirect loops and allows normal navigation on public pages
  const pathname = new URL(request.url).pathname

  if (pathname === '/') {
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
  }

  // Continue to the requested page
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * NOTE: The IP-to-domain redirect runs on all matched routes (for SEO).
     * The auth redirect logic is further restricted inside the middleware function.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}