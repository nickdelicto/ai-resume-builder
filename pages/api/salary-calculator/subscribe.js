const { PrismaClient } = require('@prisma/client');
const { sendJobAlertEmail } = require('../../../lib/services/jobAlertEmailService');

const prisma = new PrismaClient();

// Rate limiting implementation - prevents spam by limiting requests per IP
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

// Function to verify reCAPTCHA token - prevents bot submissions
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
      return data.score > 0.5; // Adjust threshold as needed (0.5 is moderate, 0.7+ is stricter)
    } else {
      console.log('reCAPTCHA verification failed. Error codes:', data['error-codes']);
      return false;
    }
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
}

/**
 * API Endpoint: Subscribe to Job Alerts
 * 
 * Creates a job alert subscription from the salary calculator
 * User will receive matching jobs via email
 * 
 * POST /api/salary-calculator/subscribe
 * 
 * SPAM PROTECTION:
 * - reCAPTCHA v3 verification
 * - Rate limiting (5 requests per minute per IP)
 * - Honeypot field detection
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting (5 requests per minute per IP)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const isAllowed = rateLimit(ip, 5, 60 * 1000);
  
  if (!isAllowed) {
    console.log(`⚠️ Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again in a minute'
    });
  }

  const { email, name, specialty, location, state, city, employerId, recaptchaToken, website } = req.body;

  // HONEYPOT CHECK: If 'website' field is filled, it's a bot (humans can't see this field)
  if (website) {
    console.log(`🚫 Honeypot triggered for: ${email} (website field filled)`);
    // Return success to fool the bot, but don't actually create alert
    return res.status(201).json({
      success: true,
      message: 'Job alert created successfully',
      alertId: 'fake-id-' + Date.now()
    });
  }

  // RECAPTCHA VERIFICATION: Check if submission is from a human
  if (!recaptchaToken) {
    console.log(`🚫 No reCAPTCHA token provided for: ${email}`);
    return res.status(400).json({
      error: 'Security verification required',
      message: 'Please complete the security verification'
    });
  }

  const isHuman = await verifyRecaptcha(recaptchaToken);
  if (!isHuman) {
    console.log(`🚫 reCAPTCHA verification failed for: ${email}`);
    return res.status(400).json({
      error: 'Security verification failed',
      message: 'Security verification failed. Please try again.'
    });
  }

  // VALIDATION: Check required fields
  if (!email || !specialty || !location) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Email, specialty, and location are required'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Invalid email',
      message: 'Please enter a valid email address'
    });
  }

  console.log(`✅ Security checks passed for: ${email} (IP: ${ip})`);
  console.log(`📝 Job alert request: ${specialty} in ${location}`);

  try {
    // Check total number of active alerts for this email (5 max limit)
    const totalAlerts = await prisma.jobAlert.count({
      where: {
        email: email.toLowerCase().trim(),
        active: true
      }
    });

    if (totalAlerts >= 5) {
      // Fetch one existing alert to get the unsubscribe token for manage page
      const existingAlert = await prisma.jobAlert.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          active: true
        },
        select: {
          unsubscribeToken: true
        }
      });

      await prisma.$disconnect();
      return res.status(400).json({
        error: 'Maximum alerts reached',
        message: 'You can have up to 5 active job alerts. Please manage your existing alerts to create new ones.',
        maxReached: true,
        manageToken: existingAlert?.unsubscribeToken || null
      });
    }

    // Check if this exact alert already exists (same email + specialty + location + employer)
    const existingAlert = await prisma.jobAlert.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        specialty,
        location,
        employerId: employerId || null,
        active: true
      }
    });

    if (existingAlert) {
      // Already subscribed - send them a fresh email with current jobs
      console.log(`📧 Existing alert found (ID: ${existingAlert.id}), sending fresh job list...`);
      
      sendJobAlertEmail(existingAlert.id).catch(err => {
        console.error('Failed to send reminder email:', err);
      });
      
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to this job alert',
        alertId: existingAlert.id,
        isNew: false
      });
    }

    // Create new job alert
    console.log(`✨ Creating new job alert: ${specialty} in ${location} for ${email}${employerId ? ` (employer: ${employerId})` : ''}`);
    
    const jobAlert = await prisma.jobAlert.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        specialty,
        location,
        state: state || null,
        city: city || null,
        employerId: employerId || null,
        source: 'salary-calculator',
        active: true
        // unsubscribeToken is auto-generated by default(cuid())
      }
    });

    console.log(`✅ Job alert created (ID: ${jobAlert.id}), state: ${state || 'null'}, city: ${city || 'null'}`);

    await prisma.$disconnect();

    // Send welcome email with matching jobs (async, don't wait)
    console.log(`📧 Sending welcome email to ${email}...`);
    sendJobAlertEmail(jobAlert.id).catch(err => {
      console.error('Failed to send welcome email:', err);
      // Don't fail the subscription if email fails
    });

    return res.status(201).json({
      success: true,
      message: 'Job alert created successfully',
      alertId: jobAlert.id,
      isNew: true,
      alert: {
        specialty: jobAlert.specialty,
        location: jobAlert.location
      }
    });

  } catch (error) {
    console.error('Error creating job alert:', error);
    await prisma.$disconnect();

    return res.status(500).json({
      error: 'Failed to create job alert',
      message: 'Something went wrong. Please try again.'
    });
  }
}

