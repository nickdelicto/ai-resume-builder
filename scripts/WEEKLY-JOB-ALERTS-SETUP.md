# Weekly Job Alerts Setup Guide

## Overview
Automated weekly email system that sends personalized job alerts to all active subscribers every Tuesday at 7 AM EST.

---

## Script Details

**File:** `scripts/send-weekly-job-alerts.js`

**What it does:**
1. Queries all active job alerts from database
2. Skips alerts that received email in last 6 days (prevents duplicates)
3. Fetches matching jobs for each alert (specialty + location)
4. Only sends if **2+ jobs** are found (minimum threshold)
5. Sends personalized email via Brevo
6. Updates `lastEmailSent` timestamp
7. Logs all results

---

## Testing Locally

### Dry Run (no emails sent):
```bash
node scripts/send-weekly-job-alerts.js --dry-run
```

### Live Run (sends actual emails):
```bash
node scripts/send-weekly-job-alerts.js
```

**Expected output:**
```
🚀 Starting Weekly Job Alerts Script
📅 Run Date: 2025-12-02T12:00:00.000Z
🧪 Mode: LIVE
---
📬 Found 15 active job alert(s)

📧 Processing Alert #cmikwpih...
   Email: user@example.com
   Specialty: ICU
   Location: Cleveland, OH
   Source: salary-calculator
   ✅ Found 12 matching job(s)
   📨 Email sent successfully!

============================================================
📊 SUMMARY
============================================================
Total Active Alerts:     15
Emails Sent:             12 ✅
Skipped (Recent):        2
Skipped (No Jobs):       1
Skipped (Too Few Jobs):  0
Errors:                  0
============================================================

✅ Weekly Job Alerts Complete!
```

---

## Production Setup (VPS)

### 1. Ensure Environment Variables Are Set

Check `/home/intelliresume/ai-resume-builder/.env`:
```bash
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=rnjobs@intelliresume.net
EMAIL_FROM_NAME=IntelliResume RN Jobs
EMAIL_REPLY_TO=nick@intelliresume.net
DATABASE_URL=postgresql://...
```

### 2. Test on VPS First

SSH into VPS and test:
```bash
cd /home/intelliresume/ai-resume-builder
node scripts/send-weekly-job-alerts.js --dry-run
```

### 3. Add to Crontab

Edit crontab:
```bash
crontab -e
```

Add this line (Tuesday 7 AM EST):
```bash
# Weekly Job Alerts - Tuesday 7 AM EST
0 7 * * 2 cd /home/intelliresume/ai-resume-builder && NODE_ENV=production /usr/bin/node scripts/send-weekly-job-alerts.js >> logs/job-alerts.log 2>&1
```

**Notes:**
- `0 7 * * 2` = Tuesday at 7 AM
- Logs go to `logs/job-alerts.log`
- Uses full path to node (`/usr/bin/node`)

### 4. Create Logs Directory

```bash
mkdir -p /home/intelliresume/ai-resume-builder/logs
```

### 5. Verify Crontab

```bash
crontab -l | grep "job-alerts"
```

---

## Monitoring

### Check Logs:
```bash
tail -f logs/job-alerts.log
```

### Check Last Run:
```bash
tail -50 logs/job-alerts.log
```

### Check Database:
```bash
# See when emails were last sent
SELECT email, specialty, location, "lastEmailSent", active 
FROM "JobAlert" 
ORDER BY "lastEmailSent" DESC 
LIMIT 10;
```

---

## Email Behavior

### When emails are sent:
- ✅ Alert is active
- ✅ Last email sent > 6 days ago (or never sent)
- ✅ 2+ matching jobs found
- ✅ Brevo API responds successfully

### When emails are skipped:
- ⏭️ Alert is inactive
- ⏭️ Email sent in last 6 days
- ⏭️ No matching jobs found
- ⏭️ Less than 2 jobs match

### Email Content:
- **Subject:** `X ICU RN Jobs in Cleveland, OH`
- **Greeting:** Personalized with name (if provided)
- **Job List:** Up to 20 jobs, sorted by highest paying
- **Each Job:** Title, location, employer, salary, "View Job" + "Tailor Resume" buttons
- **Footer:** Manage Alerts, Unsubscribe links, Physical address

---

## Troubleshooting

### Issue: Script fails with "Brevo API error"
**Solution:** Check `BREVO_API_KEY` in `.env`

### Issue: No emails sent (all skipped)
**Possible causes:**
- All alerts have `lastEmailSent` within 6 days
- No jobs match the alert criteria
- All alerts are inactive

**Check:**
```bash
node scripts/send-weekly-job-alerts.js --dry-run
```

### Issue: Script times out
**Possible cause:** Too many alerts (1000+)
**Solution:** The script processes ~5-10 alerts per second, so 1000 alerts = ~2-3 minutes (acceptable)

### Issue: Users not receiving emails
**Check:**
1. Is their alert active? (check database)
2. Did they unsubscribe? (check `active` field)
3. Is Brevo API working? (check logs)
4. Is email address correct? (check database)

---

## Future Enhancements

- [ ] Add "NEW" badge for jobs posted since last email
- [ ] Track open rates and click-through rates
- [ ] Add ad/offer insertion system
- [ ] Implement smart frequency (pause if user doesn't open 3 emails in a row)
- [ ] Add batch processing for 10K+ subscribers
- [ ] Create admin dashboard to view email stats

---

## Key Files

- `scripts/send-weekly-job-alerts.js` - Main script
- `lib/services/jobAlertEmailService.js` - Email generation and sending
- `pages/api/salary-calculator/subscribe.js` - Initial signup API
- `pages/job-alerts/manage.jsx` - Alert management UI
- `pages/job-alerts/unsubscribe.jsx` - Unsubscribe UI

---

**Script Version:** 1.0
**Last Updated:** December 2, 2025

