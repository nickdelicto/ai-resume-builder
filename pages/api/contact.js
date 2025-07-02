import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import SibApiV3Sdk from 'sib-api-v3-sdk';
import nodemailer from 'nodemailer';

// Rate limiting implementation
const rateLimit = (() => {
  const ipRequests = new Map();
  
  return (ip, limit, interval) => {
    const now = Date.now();
    const requests = ipRequests.get(ip) || [];
    
    // Remove requests outside of the current interval
    const recentRequests = requests.filter(time => time > now - interval);
    
    // Check if the number of recent requests exceeds the limit
    if (recentRequests.length >= limit) {
      return false;
    }
    
    // Add the current request timestamp
    recentRequests.push(now);
    ipRequests.set(ip, recentRequests);
    
    return true;
  };
})();

// Function to get location info from IP address
async function getLocationFromIp(ip) {
  // Skip lookup for local/private IPs
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1' || ip === 'unknown' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', city: 'Development', region: 'Local Environment' };
  }

  try {
    // Use free IP geolocation API
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) {
      throw new Error(`IP lookup failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the API returned an error
    if (data.error) {
      console.log('IP geolocation error:', data.reason || data.error);
      return null;
    }
    
    return {
      country: data.country_name || 'Unknown',
      city: data.city || 'Unknown',
      region: data.region || 'Unknown',
      countryCode: data.country_code || 'Unknown',
      timezone: data.timezone || 'Unknown'
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return null;
  }
}

// Function to verify reCAPTCHA token
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not set in environment variables');
    return false;
  }
  
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

  try {
    const response = await fetch(verifyUrl, { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      console.log('reCAPTCHA verification successful. Score:', data.score);
      return data.score > 0.5; // Adjust threshold as needed
    } else {
      console.log('reCAPTCHA verification failed. Error codes:', data['error-codes']);
      return false;
    }
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting (5 requests per minute)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const isAllowed = rateLimit(ip, 5, 60 * 1000);
    
    if (!isAllowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Please try again later'
      });
    }

    // Get form data from request body
    const { name, email, subject, message, recaptchaToken } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'All fields are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // Verify reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({
        success: false,
        error: 'reCAPTCHA verification failed',
        message: 'Please complete the reCAPTCHA verification'
      });
    }

    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({
        success: false,
        error: 'reCAPTCHA verification failed',
        message: 'reCAPTCHA verification failed. Please try again.'
      });
    }
    
    // Get location information from IP address
    const locationInfo = await getLocationFromIp(ip);
    const locationString = locationInfo ? 
      `${locationInfo.city}, ${locationInfo.region}, ${locationInfo.country} (${locationInfo.countryCode})` : 
      'Location lookup failed';

    // Format the email content
    const emailContent = `
      <h2>New Contact Form Submission</h2>
      
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap; padding: 15px; background: #f9f9f9; border-left: 4px solid #1a73e8;">${message}</p>
      
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>IP Address:</strong> ${ip}</p>
      <p><strong>Location:</strong> ${locationString}</p>
      ${locationInfo?.timezone ? `<p><strong>Timezone:</strong> ${locationInfo.timezone}</p>` : ''}
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
        
        sendSmtpEmail.subject = `Contact Form: ${subject}`;
        sendSmtpEmail.htmlContent = emailContent;
        sendSmtpEmail.sender = { 
          name: 'IntelliResume Contact Form', 
          email: process.env.EMAIL_FROM || 'noreply@intelliresume.net' 
        };
        
        // Get admin emails from environment variable - support multiple emails separated by semicolons
        const adminEmails = process.env.ADMIN_EMAIL 
          ? process.env.ADMIN_EMAIL.split(';').map(email => email.trim())
          : ["delictodelight@gmail.com"]; // Fallback to default email
        
        // Convert admin emails to the format expected by Brevo
        sendSmtpEmail.to = adminEmails.map(email => ({ email }));
        
        // Add reply-to with the user's email so you can respond directly to them
        sendSmtpEmail.replyTo = {
          email: email,
          name: name
        };
        
        // Send the email via Brevo
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Contact form email sent via Brevo');
        
        return res.status(200).json({
          success: true,
          message: 'Message sent successfully'
        });
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

      // Get admin emails from environment variable - support multiple emails separated by semicolons
      const adminEmails = process.env.ADMIN_EMAIL 
        ? process.env.ADMIN_EMAIL.split(';').map(email => email.trim()).join(', ')
        : "delictodelight@gmail.com"; // Fallback to default email

      // Send the email to all admin recipients
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@intelliresume.net',
        to: adminEmails,
        subject: `Contact Form: ${subject}`,
        html: emailContent,
        replyTo: email
      });
      
      console.log('Contact form email sent via SMTP');
      
      return res.status(200).json({
        success: true,
        message: 'Message sent successfully'
      });
    }
  } catch (error) {
    console.error('Error processing contact form submission:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while sending your message. Please try again later.'
    });
  }
} 