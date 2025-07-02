import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "../../../lib/prisma";
// Import nodemailer for sending emails
import nodemailer from "nodemailer";
// Import kept for potential future use
// import { markLocalStorageForMigration } from '../../../components/ModernResumeBuilder/ModernResumeBuilder';

/**
 * Helper function to send admin notifications about new user signups
 */
async function sendAdminNotification(user) {
  try {
    // Create a transport using the same SMTP settings as NextAuth
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    // Get admin emails - support multiple emails separated by semicolons
    const adminEmails = process.env.ADMIN_EMAIL 
      ? process.env.ADMIN_EMAIL.split(';').map(email => email.trim())
      : ["delictodelight@gmail.com"]; // Fallback to your email
    
    // Send notification to admin(s)
    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: adminEmails.join(', '), // Join all admin emails with commas for proper email format
      subject: `New User Signup: ${user.email}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2>New User Registration</h2>
          <p>A new user has signed up for IntelliResume:</p>
          <ul>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Name:</strong> ${user.name || 'Not provided'}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>You can view all user data in your database or admin interface.</p>
        </div>
      `
    });
    
    console.log(`Admin notification sent for new user: ${user.email}`);
  } catch (error) {
    // Log error but don't block the auth process
    console.error("Error sending admin notification:", error);
  }
}

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
      // Custom email template
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { host } = new URL(url);
        const transport = require("nodemailer").createTransport(provider.server);
        
        const escapedHost = host.replace(/\./g, "&#8203;.");
        
        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Sign in to IntelliResume`,
          text: `Sign in to IntelliResume\n\nClick the link below to sign in:\n${url}\n\nIf you did not request this email, you can safely ignore it.`,
          html: `
            <div style="background-color: #f9fafb; padding: 40px 0; font-family: Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #4a6cf7 0%, #2451e6 100%); padding: 30px; text-align: center;">
                  <!-- Brand name and slogan -->
                  <div style="display: inline-block; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">IntelliResume</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 15px; font-weight: 400;">Building careers, one resume at a time</p>
                  </div>
                </div>
                
                <div style="padding: 30px; text-align: center;">
                  <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Sign in to your account</h2>
                  <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
                    Click the button below to securely sign in to your IntelliResume account.
                  </p>
                  
                  <div style="margin: 30px 0;">
                    <a href="${url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block; font-size: 16px;">Sign in</a>
                  </div>
                  
                  <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">
                      If you're having trouble with the button above, copy and paste the URL below into your web browser:
                    </p>
                    <p style="color: #4b5563; font-size: 14px; word-break: break-all;">
                      ${url}
                    </p>
                  </div>
                </div>
                
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                  <p>If you did not request this email, you can safely ignore it.</p>
                  <p style="margin-top: 12px;">© ${new Date().getFullYear()} IntelliResume. All rights reserved.</p>
                </div>
              </div>
            </div>
          `
        });
        
        if (result.rejected.length) {
          throw new Error("Email could not be sent");
        }
      },
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
    },
    // Add account linking callback
    async signIn({ user, account, profile }) {
      // Allow sign-in if this is a first time sign-in
      if (account.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        // If user exists but doesn't have a Google account linked
        if (existingUser && existingUser.accounts.length === 0) {
          // Link the Google account to the existing user
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
          });
          return true;
        }
      }
      return true;
    }
  },
  events: {
    createUser: async ({ user }) => {
      // Send notification when a new user is created
      await sendAdminNotification(user);
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions); 