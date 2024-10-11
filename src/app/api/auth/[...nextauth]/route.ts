import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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
    async signIn({ user, account }) {
      if (account && account.provider === 'google') {
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

          return true;
        }
      }
      return true;
    },
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
    error: '/auth/error',
  },
  events: {
    async signIn({ user, isNewUser }) {
      const client = await clientPromise;
      const db = client.db();
      const usersCollection = db.collection('users');

      if (isNewUser) {
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
        await usersCollection.updateOne(
          { _id: new ObjectId(user.id) },
          {
            $set: {
              isNewUser: false,
            },
          }
        );
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }