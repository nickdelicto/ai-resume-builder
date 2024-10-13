import NextAuth from 'next-auth'
import { authOptions } from './options'

// Create the NextAuth handler using the configured options
const handler = NextAuth(authOptions)

// Export the handler for both GET and POST requests
export { handler as GET, handler as POST }