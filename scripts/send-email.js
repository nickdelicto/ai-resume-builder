#!/usr/bin/env node

/**
 * Email Sender Script for Scraper Alerts
 * Uses existing SMTP configuration (Brevo/Nodemailer)
 * 
 * Usage:
 *   node send-email.js "Subject" "Body text"
 * 
 * Example:
 *   node send-email.js "Test Alert" "This is a test message"
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Get command line arguments
const subject = process.argv[2];
const body = process.argv[3];

if (!subject || !body) {
  console.error('❌ Usage: node send-email.js "Subject" "Body text"');
  process.exit(1);
}

// Get recipient email from environment (defaults to fallback)
const recipientEmail = process.env.ADMIN_EMAIL || 'delictodelight@gmail.com';

// Create SMTP transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Send email
async function sendEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@intelliresume.net',
      to: recipientEmail,
      subject: subject,
      text: body,
      html: `<pre style="font-family: monospace; white-space: pre-wrap;">${body}</pre>`
    });
    
    console.log(`✅ Email sent successfully to ${recipientEmail}`);
    console.log(`   Message ID: ${info.messageId}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    process.exit(1);
  }
}

sendEmail();

