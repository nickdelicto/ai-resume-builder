import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import nodemailer from 'nodemailer';
import SibApiV3Sdk from 'sib-api-v3-sdk';

/**
 * API endpoint to send cancellation feedback to admin email
 * 
 * Request body:
 * - subscriptionId: The ID of the subscription being canceled
 * - reason: The reason for cancellation (from predefined list)
 * - otherReason: Additional details if reason is 'other'
 * - missingFeaturesReason: Details about missing features
 * - betterAlternativeReason: Details about alternative service
 * - planName: The name of the plan being canceled
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated',
        message: 'You need to be signed in to send feedback'
      });
    }

    // Get feedback data from request body
    const { 
      subscriptionId, 
      reason, 
      otherReason, 
      missingFeaturesReason,
      betterAlternativeReason,
      planName 
    } = req.body;

    if (!subscriptionId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Subscription ID and reason are required'
      });
    }

    // Get the subscription from the database
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
        message: 'The specified subscription does not exist or does not belong to you'
      });
    }

    // Get user details for the email
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        name: true,
        email: true
      }
    });

    // Map reason codes to readable text
    const reasonMap = {
      'too-expensive': 'Too expensive',
      'not-using': 'Not using it enough',
      'missing-features': 'Missing features I need',
      'found-alternative': 'Found a better alternative',
      'job-found': 'Found a job, no longer needed',
      'other': 'Other reason'
    };

    // Format the email content
    const emailContent = `
      <h2>Subscription Cancellation Feedback</h2>
      
      <p><strong>User:</strong> ${user.name || 'Unknown'} (${user.email})</p>
      <p><strong>Plan:</strong> ${planName || subscription.planId}</p>
      <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
      <p><strong>Cancellation Reason:</strong> ${reasonMap[reason] || reason}</p>
      
      ${reason === 'other' && otherReason ? `<p><strong>Additional Details:</strong> ${otherReason}</p>` : ''}
      ${reason === 'missing-features' && missingFeaturesReason ? `<p><strong>Missing Features:</strong> ${missingFeaturesReason}</p>` : ''}
      ${reason === 'found-alternative' && betterAlternativeReason ? `<p><strong>Alternative Service:</strong> ${betterAlternativeReason}</p>` : ''}
      
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    `;

    // Try to send email using Brevo first
    try {
      if (process.env.BREVO_API_KEY) {
        // Configure Brevo API client
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        
        sendSmtpEmail.subject = `Subscription Cancellation: ${user.email}`;
        sendSmtpEmail.htmlContent = emailContent;
        sendSmtpEmail.sender = { 
          name: 'IntelliResume Cancellation', 
          email: process.env.EMAIL_FROM || 'noreply@intelliresume.net' 
        };
        sendSmtpEmail.to = [
          { email: 'delictodelight@gmail.com' },
          { email: 'nick@intelliresume.net' }
        ];
        
        // Add reply-to with the user's email so you can respond directly to them
        sendSmtpEmail.replyTo = {
          email: user.email,
          name: user.name || user.email.split('@')[0]
        };
        
        // Send the email via Brevo
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Cancellation feedback email sent via Brevo');
      } else {
        // Fallback to nodemailer if Brevo API key is not available
        throw new Error('Brevo API key not available, falling back to SMTP');
      }
    } catch (emailError) {
      console.log('Falling back to SMTP for sending email:', emailError);
      
      // Create transporter for sending email via SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT || '587') === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Send the email to both recipients
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@intelliresume.net',
        to: 'delictodelight@gmail.com, nick@intelliresume.net',
        subject: `Subscription Cancellation: ${user.email}`,
        html: emailContent,
        replyTo: user.email
      });
      
      console.log('Cancellation feedback email sent via SMTP');
    }

    // Store the feedback in the database for future reference
    await prisma.feedbackEntry.create({
      data: {
        userId: session.user.id,
        type: 'cancellation',
        content: {
          subscriptionId,
          reason,
          otherReason,
          missingFeaturesReason,
          betterAlternativeReason,
          planName
        }
      }
    }).catch(err => {
      // Log error but don't fail the request if storage fails
      console.error('Error storing feedback:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Feedback sent successfully'
    });
  } catch (error) {
    console.error('Error sending cancellation feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while sending feedback'
    });
  }
} 