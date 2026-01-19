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

    if (recentRequests.length >= limit) {
      return false;
    }

    recentRequests.push(now);
    ipRequests.set(ip, recentRequests);

    return true;
  };
})();

/**
 * Validate .edu email address
 */
function isValidEduEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.edu$/i;
  return emailRegex.test(email);
}

/**
 * Validate Google Drive URL
 * Accepts: drive.google.com/file/d/..., drive.google.com/open?id=..., docs.google.com/...
 */
function isValidGoogleDriveUrl(url) {
  const drivePatterns = [
    /^https?:\/\/(drive|docs)\.google\.com\//i,
  ];
  return drivePatterns.some(pattern => pattern.test(url));
}

/**
 * Verify reCAPTCHA token
 */
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not set');
    return false;
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

  try {
    const response = await fetch(verifyUrl, { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      return data.score > 0.5;
    }
    return false;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting (3 submissions per hour per IP)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const isAllowed = rateLimit(ip, 3, 60 * 60 * 1000);

    if (!isAllowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many submissions',
        message: 'Please try again later. Limit: 3 submissions per hour.'
      });
    }

    const {
      name,
      email,
      school,
      programType,
      videoLink,
      enrollmentProofLink,
      consentToFeature,
      recaptchaToken
    } = req.body;

    // Validate required fields
    if (!name || !email || !school || !programType || !videoLink || !enrollmentProofLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'All fields are required'
      });
    }

    // Validate consent checkbox (required)
    if (!consentToFeature) {
      return res.status(400).json({
        success: false,
        error: 'Consent required',
        message: 'You must consent to the Future Nurses Spotlight to apply'
      });
    }

    // Validate .edu email
    if (!isValidEduEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email',
        message: 'Please use your school email address (.edu)'
      });
    }

    // Validate Google Drive URLs
    if (!isValidGoogleDriveUrl(videoLink)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video link',
        message: 'Please provide a valid Google Drive link for your video'
      });
    }

    if (!isValidGoogleDriveUrl(enrollmentProofLink)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid enrollment proof link',
        message: 'Please provide a valid Google Drive link for your enrollment proof'
      });
    }

    // Validate program type
    const validPrograms = ['ADN', 'BSN', 'Accelerated BSN', 'Direct Entry MSN'];
    if (!validPrograms.includes(programType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid program type',
        message: 'Please select a valid program type'
      });
    }

    // Verify reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({
        success: false,
        error: 'reCAPTCHA required',
        message: 'Please complete the reCAPTCHA verification'
      });
    }

    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({
        success: false,
        error: 'reCAPTCHA failed',
        message: 'reCAPTCHA verification failed. Please try again.'
      });
    }

    // Format email content
    const currentYear = new Date().getFullYear();
    const emailContent = `
      <h2>New Scholarship Application - ${currentYear}</h2>

      <h3>Applicant Information</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>School:</strong> ${school}</p>
      <p><strong>Program:</strong> ${programType}</p>

      <h3>Submission Links</h3>
      <p><strong>Video (60-second "Why Nursing"):</strong><br/>
      <a href="${videoLink}">${videoLink}</a></p>

      <p><strong>Enrollment Proof:</strong><br/>
      <a href="${enrollmentProofLink}">${enrollmentProofLink}</a></p>

      <h3>Consent</h3>
      <p><strong>Future Nurses Spotlight Consent:</strong> Yes - Applicant has consented to have their story featured and shared on IntelliResume website and social media, regardless of scholarship outcome.</p>

      <hr/>
      <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>IP Address:</strong> ${ip}</p>
    `;

    // Send email via Brevo or SMTP
    try {
      if (process.env.BREVO_API_KEY) {
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.subject = `Scholarship Application: ${name} (${school})`;
        sendSmtpEmail.htmlContent = emailContent;
        sendSmtpEmail.sender = {
          name: 'IntelliResume Scholarship',
          email: process.env.EMAIL_FROM || 'noreply@intelliresume.net'
        };

        // Get admin emails from environment variable - support multiple emails separated by semicolons
        const adminEmails = process.env.ADMIN_EMAIL
          ? process.env.ADMIN_EMAIL.split(';').map(email => email.trim())
          : ['delictodelight@gmail.com'];
        sendSmtpEmail.to = adminEmails.map(email => ({ email }));
        sendSmtpEmail.replyTo = { email: email, name: name };

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Scholarship application sent via Brevo');
      } else {
        throw new Error('Brevo API key not available');
      }
    } catch (emailError) {
      console.log('Falling back to SMTP:', emailError.message);

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT || '587') === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Get admin emails from environment variable
      const adminEmails = process.env.ADMIN_EMAIL
        ? process.env.ADMIN_EMAIL.split(';').map(email => email.trim()).join(', ')
        : 'delictodelight@gmail.com';

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@intelliresume.net',
        to: adminEmails,
        subject: `Scholarship Application: ${name} (${school})`,
        html: emailContent,
        replyTo: email
      });

      console.log('Scholarship application sent via SMTP');
    }

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Error processing scholarship application:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An error occurred. Please try again later.'
    });
  }
}
