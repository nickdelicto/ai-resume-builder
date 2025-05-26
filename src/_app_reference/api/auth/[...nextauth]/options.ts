import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
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
  // Use the MongoDB adapter with the clientPromise
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    // Callback for custom sign-in logic
    async signIn({ user, account }) {
      if (account && account.provider === 'google') {
        try {
          const client = await clientPromise;
          const db = client.db();
          const usersCollection = db.collection('users');
          const accountsCollection = db.collection('accounts');

          const existingUser = await usersCollection.findOne({ email: user.email });

          if (existingUser) {
            // Link the Google account to the existing user
            await accountsCollection.updateOne(
              { userId: new ObjectId(existingUser._id) },
              {
                $set: {
                  provider: account.provider,
                  type: account.type,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  scope: account.scope,
                  token_type: account.token_type,
                  id_token: account.id_token
                }
              },
              { upsert: true }
            );

            // Update the user's Google-specific information
            await usersCollection.updateOne(
              { _id: new ObjectId(existingUser._id) },
              {
                $set: {
                  name: user.name,
                  image: user.image,
                }
              }
            );
          }
          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          // You might want to return false here if you want to prevent sign-in on error
          return true;
        }
      }
      return true;
    },
    // Callback to add user ID to the session
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    // Callback for custom redirect logic
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
    error: '/auth/error',
  },
  events: {
    // Event handler for sign-in events
    async signIn({ user, isNewUser }) {
      try {
        const client = await clientPromise;
        const db = client.db();
        const usersCollection = db.collection('users');

        if (isNewUser) {
          // Set initial user properties for new users
          await usersCollection.updateOne(
            { _id: new ObjectId(user.id) },
            {
              $set: {
                isNewUser: true,
                planType: 'free',
                planExpirationDate: null,
                maxSavedResumes: 1,
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );
        } else {
          // Update existing user properties
          await usersCollection.updateOne(
            { _id: new ObjectId(user.id) },
            {
              $set: {
                isNewUser: false,
              },
            }
          );
        }
      } catch (error) {
        console.error('Error in signIn event:', error);
        // Consider how you want to handle errors here
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

export function Component() {
  // This is a dummy component to satisfy the React Component code block requirements
  return null;
}