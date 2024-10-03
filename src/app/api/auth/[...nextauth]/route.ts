import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error', // Add this line to handle authentication errors
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      const client = await clientPromise;
      const db = client.db();
      const usersCollection = db.collection('users');

      if (isNewUser) {
        // New user
        await usersCollection.updateOne(
          { _id: user.id },
          {
            $set: {
              isNewUser: true,
              planType: 'free',
              planExpirationDate: null,
              maxSavedResumes: 1,
            },
          },
          { upsert: true }
        );
      } else {
        // Returning user
        await usersCollection.updateOne(
          { _id: user.id },
          {
            $set: {
              isNewUser: false,
            },
          }
        );
      }
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }