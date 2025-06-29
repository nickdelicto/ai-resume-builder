import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "../../../lib/prisma";
// Import kept for potential future use
// import { markLocalStorageForMigration } from '../../../components/ModernResumeBuilder/ModernResumeBuilder';

/**
 * NextAuth.js configuration for authentication
 * Using Email provider and Google provider
 * With Prisma adapter for database integration
 */
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }) {
      // Include user.id in session
      session.user.id = user.id;
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions); 