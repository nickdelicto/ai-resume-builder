/**
 * Alert Service for Scraper Notifications
 * Sends email alerts when scrapers encounter issues
 *
 * Uses SMTP configuration from environment variables
 */

const nodemailer = require('nodemailer');

// Lazy-load transporter to avoid issues if SMTP not configured
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');

    if (!host) {
      console.warn('⚠️ SMTP_HOST not configured - email alerts disabled');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

/**
 * Send an alert email
 * @param {string} subject - Email subject
 * @param {string} body - Email body (plain text)
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendAlert(subject, body) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`📧 Alert (not sent - SMTP not configured):\n   Subject: ${subject}\n   Body: ${body}`);
    return false;
  }

  const recipientEmail = process.env.ADMIN_EMAIL || 'delictodelight@gmail.com';
  const fromEmail = process.env.EMAIL_FROM || 'noreply@intelliresume.net';

  try {
    await transport.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject: `[IntelliResume Alert] ${subject}`,
      text: body,
      html: `<pre style="font-family: monospace; white-space: pre-wrap;">${body}</pre>`
    });

    console.log(`📧 Alert sent to ${recipientEmail}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send alert email: ${error.message}`);
    return false;
  }
}

/**
 * Send scraper failure alert
 * @param {string} employerName - Name of the employer
 * @param {string} reason - Why the scraper failed
 * @param {object} details - Additional details
 */
async function sendScraperAlert(employerName, reason, details = {}) {
  const subject = `Scraper Issue: ${employerName}`;

  const body = `
SCRAPER ALERT
=============

Employer: ${employerName}
Reason: ${reason}
Time: ${new Date().toISOString()}

Details:
${JSON.stringify(details, null, 2)}

Action Required:
- Check if the source site is down
- Check if the page structure changed
- Check if API endpoints changed
- Review scraper logs for more details

This alert was triggered because the scraper found significantly fewer jobs than expected,
which could indicate a problem with the source site or scraper configuration.
`.trim();

  return await sendAlert(subject, body);
}

/**
 * Send low job count warning
 * @param {string} employerName - Name of the employer
 * @param {number} foundCount - Number of jobs found in current scrape
 * @param {number} expectedCount - Number of active jobs in DB before scrape
 */
async function sendLowJobCountAlert(employerName, foundCount, expectedCount) {
  const subject = `Low Job Count: ${employerName}`;

  const body = `
LOW JOB COUNT ALERT
===================

Employer: ${employerName}
Jobs Found in Scrape: ${foundCount}
Active Jobs in DB: ${expectedCount}
Time: ${new Date().toISOString()}

SAFETY GUARD ACTIVATED:
- Job deactivation was SKIPPED to prevent mass deactivation
- Existing jobs remain active until this is investigated

Possible Causes:
1. Source site is down or having issues
2. Page/API structure changed
3. Rate limiting or IP blocking
4. Authentication required
5. Scraper bug

Next Steps:
1. Manually check the employer's career page
2. Review the scraper script for errors
3. Check VPS logs: pm2 logs or cron logs
4. If site structure changed, update the scraper

Once resolved, you can run the scraper manually to update jobs.
`.trim();

  return await sendAlert(subject, body);
}

module.exports = {
  sendAlert,
  sendScraperAlert,
  sendLowJobCountAlert
};
