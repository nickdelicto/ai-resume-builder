const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const prisma = new PrismaClient();

/**
 * Job Alert Email Service
 * Sends matching job alerts to users who subscribed via salary calculator or job pages
 */

/**
 * Fetch matching jobs for an alert
 * Returns jobs sorted by salary (highest to lowest)
 */
async function getMatchingJobs(alert) {
  const whereClause = {
    isActive: true
    // No experience level filtering - send ALL matching jobs including leadership
  };

  // Add specialty filter (if provided)
  if (alert.specialty) {
    whereClause.specialty = { equals: alert.specialty, mode: 'insensitive' };
  }

  // Add location filters (PRECISE matching)
  if (alert.city && alert.state) {
    // User wants specific city - match EXACTLY
    whereClause.city = { equals: alert.city, mode: 'insensitive' };
    whereClause.state = alert.state;
  } else if (alert.state) {
    // User wants entire state - match state only
    whereClause.state = alert.state;
  }
  // If no location specified, return all jobs (nationwide)

  // Fetch jobs with salary data
  const jobs = await prisma.nursingJob.findMany({
    where: whereClause,
    include: {
      employer: {
        select: {
          name: true,
          slug: true
        }
      }
    }
    // Note: We'll sort in JavaScript after fetching
  });

  // Calculate salary midpoint for sorting (normalize hourly to annual for comparison)
  const jobsWithMidpoint = jobs.map(job => {
    let annualMidpoint = null;
    
    if (job.salaryMinAnnual && job.salaryMaxAnnual) {
      // Already annual
      annualMidpoint = (job.salaryMinAnnual + job.salaryMaxAnnual) / 2;
    } else if (job.salaryMinHourly && job.salaryMaxHourly) {
      // Convert hourly to annual for comparison (2080 hours/year)
      const annualMin = job.salaryMinHourly * 2080;
      const annualMax = job.salaryMaxHourly * 2080;
      annualMidpoint = (annualMin + annualMax) / 2;
    }
    
    return {
      ...job,
      salaryMidpoint: annualMidpoint
    };
  });

  // Sort by midpoint salary (highest to lowest), nulls at end
  return jobsWithMidpoint
    .sort((a, b) => {
      if (a.salaryMidpoint === null) return 1;
      if (b.salaryMidpoint === null) return -1;
      return b.salaryMidpoint - a.salaryMidpoint;
    })
    .slice(0, 20); // Limit to top 20 jobs
}

/**
 * Generate HTML email template for job alert
 */
function generateJobAlertEmailHTML(alert, jobs) {
  const jobsHTML = jobs.map((job, idx) => {
    // Show salary in its ORIGINAL format (hourly if posted hourly, annual if posted annual)
    let salaryRange = 'Salary not listed';
    
    if (job.salaryMinHourly && job.salaryMaxHourly) {
      // Originally posted as hourly - show hourly
      salaryRange = `$${job.salaryMinHourly.toFixed(2)} - $${job.salaryMaxHourly.toFixed(2)}/hr`;
    } else if (job.salaryMinAnnual && job.salaryMaxAnnual) {
      // Originally posted as annual - show annual
      salaryRange = `$${Math.round(job.salaryMinAnnual / 1000)}K - $${Math.round(job.salaryMaxAnnual / 1000)}K/year`;
    }

    const jobUrl = `https://intelliresume.net/jobs/nursing/${job.slug}`;
    const tailorResumeUrl = `https://intelliresume.net/job-targeting?jobSlug=${job.slug}`;
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 20px 0;">
          <div style="margin-bottom: 8px;">
            <a href="${jobUrl}" style="color: #1f2937; font-size: 18px; font-weight: 600; text-decoration: none; hover: underline;">
              ${idx + 1}. ${job.title}
            </a>
          </div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
            📍 ${job.city}, ${job.state} ${job.employer?.name ? `• ${job.employer.name}` : ''}
          </div>
          <div style="color: #059669; font-weight: 600; font-size: 16px; margin-bottom: 12px;">
            💰 ${salaryRange}
          </div>
          ${job.jobType ? `<div style="color: #6b7280; font-size: 13px; margin-bottom: 16px;">${job.jobType}${job.shiftType ? ` • ${job.shiftType} shift` : ''}</div>` : '<div style="margin-bottom: 16px;"></div>'}
          
          <!-- Action Buttons (using table for better email client compatibility) -->
          <table style="margin-top: 12px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right: 8px;">
                <a href="${jobUrl}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  View Full Job →
                </a>
              </td>
              <td>
                <a href="${tailorResumeUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Tailor Resume 📝
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const unsubscribeUrl = `https://intelliresume.net/job-alerts/unsubscribe?token=${alert.unsubscribeToken}`;
  const manageUrl = `https://intelliresume.net/job-alerts/manage?token=${alert.unsubscribeToken}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
        💼 Your ${alert.specialty} RN Job Matches
      </h1>
      <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">
        ${jobs.length} job${jobs.length === 1 ? '' : 's'} in ${alert.location}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 24px;">
      ${jobs.length > 0 ? `
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Hi${alert.name ? ` ${alert.name}` : ''},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Here are <strong>${jobs.length} ${alert.specialty} RN position${jobs.length === 1 ? '' : 's'}</strong> in ${alert.location} that match your preferences, sorted by highest paying first:
        </p>

        <table style="width: 100%; border-collapse: collapse;">
          ${jobsHTML}
        </table>

        <!-- Value Proposition Banner -->
        <div style="margin-top: 32px; padding: 24px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; border: 2px solid #3b82f6;">
          <div style="text-align: center;">
            <div style="font-size: 20px; margin-bottom: 8px;">🎯</div>
            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 18px; font-weight: 700;">
              Nurses with tailored resumes are 3x more likely to get interviews
            </h3>
            <p style="margin: 0 0 16px 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">
              Our AI-powered Resume Tailor analyzes each job posting and instantly customizes your resume to match what hiring managers are looking for.
            </p>
            <a href="https://intelliresume.net/job-targeting" style="display: inline-block; padding: 12px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              Try It Free →
            </a>
          </div>
        </div>
      ` : `
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Hi${alert.name ? ` ${alert.name}` : ''},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          We don't have any ${alert.specialty} RN jobs in ${alert.location} right now, but we're actively adding new employers and positions every day.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          <strong>We'll notify you immediately when matching jobs become available!</strong>
        </p>
        
        <!-- While You Wait CTA -->
        <div style="padding: 24px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 18px; font-weight: 700;">
            While You Wait: Get Your Resume Ready
          </h3>
          <p style="margin: 0 0 16px 0; color: #047857; font-size: 15px; line-height: 1.5;">
            Don't wait until jobs appear! Get ahead by creating a polished, ATS-optimized resume now. When your perfect job drops, you'll be ready to apply within minutes.
          </p>
          <a href="https://intelliresume.net/new-resume-builder" style="display: inline-block; padding: 12px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 15px;">
            Build My Resume Now →
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          💡 <strong>Tip:</strong> Consider broadening your search to nearby cities or exploring other specialties to find opportunities faster.
        </p>
      `}
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: center;">
        <a href="${manageUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Manage Alerts</a>
        &nbsp;•&nbsp;
        <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>
      </p>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; text-align: center;">
        IntelliResume • Building RN careers!
      </p>
      <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center;">
        58 Floral Ave, Binghamton, NY
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Send job alert email to user
 * Uses Brevo API (primary) with nodemailer fallback
 * 
 * @param {Object|String} alertOrId - Alert object or alert ID
 * @param {Array} jobs - Optional pre-fetched jobs array
 */
async function sendJobAlertEmail(alertOrId, jobs = null) {
  try {
    // Handle both alert object and alert ID
    let alert;
    if (typeof alertOrId === 'string') {
      // Fetch alert details if ID provided
      alert = await prisma.jobAlert.findUnique({
        where: { id: alertOrId }
      });
      
      if (!alert || !alert.active) {
        throw new Error('Alert not found or inactive');
      }
    } else {
      // Use alert object directly
      alert = alertOrId;
    }

    // Get matching jobs if not provided
    if (!jobs) {
      jobs = await getMatchingJobs(alert);
    }

    // Generate email HTML
    const emailHTML = generateJobAlertEmailHTML(alert, jobs);
    
    const subject = jobs.length > 0
      ? `${jobs.length} ${alert.specialty} RN Job${jobs.length === 1 ? '' : 's'} in ${alert.location}`
      : `We're watching for ${alert.specialty} RN jobs in ${alert.location}`;

    // Try Brevo first
    if (process.env.BREVO_API_KEY) {
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY;
      
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = emailHTML;
      sendSmtpEmail.sender = { 
        name: process.env.EMAIL_FROM_NAME || 'IntelliResume RN Jobs', 
        email: process.env.EMAIL_FROM || 'rnjobs@intelliresume.net' 
      };
      sendSmtpEmail.to = [{ email: alert.email, name: alert.name }];
      sendSmtpEmail.replyTo = { 
        email: process.env.EMAIL_REPLY_TO || 'nick@intelliresume.net' 
      };
      
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Job alert email sent via Brevo to ${alert.email}`);
      
    } else {
      // Fallback to nodemailer/SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `${process.env.EMAIL_FROM_NAME || 'IntelliResume RN Jobs'} <${process.env.EMAIL_FROM || 'rnjobs@intelliresume.net'}>`,
        replyTo: process.env.EMAIL_REPLY_TO || 'nick@intelliresume.net',
        to: alert.email,
        subject: subject,
        html: emailHTML
      });
      
      console.log(`✅ Job alert email sent via SMTP to ${alert.email}`);
    }

    // Update lastEmailSent timestamp
    await prisma.jobAlert.update({
      where: { id: alert.id },
      data: { lastEmailSent: new Date() }
    });

    await prisma.$disconnect();
    
    return { success: true, jobCount: jobs.length };

  } catch (error) {
    console.error('Error sending job alert email:', error);
    await prisma.$disconnect();
    throw error;
  }
}

module.exports = {
  sendJobAlertEmail,
  getMatchingJobs
};

