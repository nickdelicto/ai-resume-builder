# Scrape and Classify Automation

## Overview

The `scrape-and-classify.sh` script automates the complete job scraping and classification workflow:

1. **Runs the scraper** for a specified employer
2. **Checks if scraper succeeded**
3. **Runs LLM classifier** (only if scraper succeeded)
4. **Sends email alerts** on failure
5. **Logs everything** to separate log files
6. **Cleans up old logs** (30+ days)

## Why This Approach?

**Problem:** Jobs scraped are saved with `isActive: false` (inactive) until the LLM classifier validates and activates them.

**Solution:** This wrapper script automatically runs the classifier after scraping, but only if the scraper succeeds. This prevents wasting OpenAI API calls when scrapers fail.

## Usage

### Manual Run

```bash
cd ~/ai-resume-builder
./scripts/scrape-and-classify.sh [employer-slug]
```

**Examples:**
```bash
# Cleveland Clinic
./scripts/scrape-and-classify.sh cleveland-clinic

# UHS
./scripts/scrape-and-classify.sh uhs

# Adventist Healthcare
./scripts/scrape-and-classify.sh adventist

# Northwell Health
./scripts/scrape-and-classify.sh northwell-health
```

### Automated (Cron)

See the "Updated Crontab" section below.

## Supported Employers

| Employer Slug | Scraper Type | Description |
|--------------|--------------|-------------|
| `cleveland-clinic` | Custom | Cleveland Clinic (Ohio) |
| `uhs` | Workday | United Health Services (New York) |
| `adventist` | Workday | Adventist Healthcare (Maryland) |
| `northwell-health` | Custom | Northwell Health (New York) |

## How It Works

### Workflow

```
┌─────────────────────┐
│   Run Scraper       │
│  (for employer)     │
└──────┬──────────────┘
       │
       ├─ Success? ───────┐
       │                  │
       │                  ▼
       │         ┌────────────────┐
       │         │ Run Classifier │
       │         │  (LLM OpenAI)  │
       │         └────┬───────────┘
       │              │
       │              ├─ Success? ───► ✅ Jobs Activated
       │              │
       │              └─ Failed? ────► ❌ Email Alert
       │
       └─ Failed? ──────────────────► ❌ Email Alert
                                       🚫 Skip Classifier
```

### Exit Codes

- **0** - Success (both scraper and classifier completed)
- **Non-zero** - Failure
  - Scraper failed → Classifier skipped
  - Classifier failed → Jobs remain inactive

## Email Notifications

**When do emails get sent?**
- ❌ Scraper fails
- ❌ Classifier fails
- ❌ Unknown employer slug

**What's included in the email?**
- Exit code
- Timestamp and hostname
- Last 20 lines of the failed log
- Next steps / troubleshooting hints

**Email recipient:** `delictodelight@gmail.com`

### Setting Up Email (First Time)

The script uses the `mail` command for email notifications. If not installed:

```bash
# Install mailutils
sudo apt-get update
sudo apt-get install mailutils

# Test email
echo "Test email from $(hostname)" | mail -s "Test" delictodelight@gmail.com

# Check if it sent
tail -f /var/log/mail.log
```

**Alternative:** If you prefer sendmail or another method, the script will auto-detect and use it.

## Logs

All logs are saved to: `~/ai-resume-builder/logs/`

### Log Files

```
logs/
├── cleveland-clinic_scraper_20251112_070000.log    # Scraper output
├── cleveland-clinic_classifier_20251112_070500.log # Classifier output
├── uhs_scraper_20251112_080000.log
├── uhs_classifier_20251112_080400.log
├── adventist_scraper_20251112_090000.log
├── adventist_classifier_20251112_090300.log
└── scrape-classify-summary.log                     # Summary of all runs
```

### Viewing Logs

```bash
# List recent logs
ls -lt ~/ai-resume-builder/logs/ | head -20

# View latest scraper log for Cleveland Clinic
tail -f ~/ai-resume-builder/logs/cleveland-clinic_scraper_*.log

# View latest classifier log for UHS
tail -f ~/ai-resume-builder/logs/uhs_classifier_*.log

# View summary of all runs
tail -50 ~/ai-resume-builder/logs/scrape-classify-summary.log

# Search for errors
grep -i error ~/ai-resume-builder/logs/*.log
```

### Log Cleanup

Logs older than 30 days are automatically deleted after each run.

## Updated Crontab

Replace your current cron jobs with these:

```bash
# Cleveland Clinic - Every other Sunday at 2 AM EST (7 AM UTC)
0 7 * * 0 [ $(expr $(date +\%U) \% 2) -eq 0 ] && /home/intelliresume/ai-resume-builder/scripts/scrape-and-classify.sh cleveland-clinic

# UHS - Every other Monday at 2 AM EST (7 AM UTC)
0 7 * * 1 [ $(expr $(date +\%U) \% 2) -eq 0 ] && /home/intelliresume/ai-resume-builder/scripts/scrape-and-classify.sh uhs

# Adventist Healthcare - Every other Monday at 3 AM EST (8 AM UTC)
0 8 * * 1 [ $(expr $(date +\%U) \% 2) -eq 0 ] && /home/intelliresume/ai-resume-builder/scripts/scrape-and-classify.sh adventist
```

**To update your crontab:**
```bash
crontab -e
# Replace the old cron jobs with the new ones above
```

## Troubleshooting

### Scraper Failed

**Check the scraper log:**
```bash
tail -100 ~/ai-resume-builder/logs/[employer]_scraper_*.log | less
```

**Common issues:**
- Website structure changed (CSS selectors outdated)
- Network/timeout issues
- Puppeteer/Chrome issues
- Database connection issues

### Classifier Failed

**Check the classifier log:**
```bash
tail -100 ~/ai-resume-builder/logs/[employer]_classifier_*.log | less
```

**Common issues:**
- OpenAI API key invalid/expired
- OpenAI API quota exceeded
- No jobs to classify (all already active)
- Database connection issues

### No Email Received

**Check if mail is installed:**
```bash
command -v mail
# If nothing returned, install mailutils
sudo apt-get install mailutils
```

**Check mail logs:**
```bash
sudo tail -f /var/log/mail.log
```

**Test email manually:**
```bash
echo "Test" | mail -s "Test from $(hostname)" delictodelight@gmail.com
```

### Jobs Not Appearing on Site

**Possible causes:**

1. **Scraper failed** → No new jobs scraped
   - Check scraper logs

2. **Classifier failed** → Jobs scraped but not activated
   - Check classifier logs
   - Jobs will have `isActive: false` in database

3. **Jobs filtered out by LLM** → Not Staff RN positions
   - LLM detected job is NP, CRNA, LPN, etc.
   - These jobs stay `isActive: false` permanently

**Manual check:**
```bash
# SSH into VPS
cd ~/ai-resume-builder

# Check recent inactive jobs
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const jobs = await prisma.nursingJob.findMany({
    where: { isActive: false },
    orderBy: { scrapedAt: 'desc' },
    take: 10,
    select: { id: true, title: true, scrapedAt: true }
  });
  console.log('Recent inactive jobs:', jobs);
  process.exit(0);
})();
"
```

**Manual classifier run:**
```bash
# Classify pending jobs for specific employer
node scripts/classify-jobs-with-llm.js --employer=cleveland-clinic

# Or classify ALL pending jobs
node scripts/classify-jobs-with-llm.js
```

## Cost Monitoring

The classifier uses OpenAI GPT-5-mini, which is very affordable:

- **~$0.0004 - $0.0008 per job**
- 100 jobs = ~$0.04 - $0.08
- 1000 jobs = ~$0.40 - $0.80

**Track costs in classifier logs:**
```bash
grep "Total Cost" ~/ai-resume-builder/logs/*_classifier_*.log
```

## Testing

### Test Full Workflow (Test Mode)

The classifier has a `--test` flag that doesn't save to database:

```bash
# 1. Run scraper (saves to DB)
./scripts/scrape-and-classify.sh cleveland-clinic

# Wait for it to complete...

# 2. Test classifier in test mode (no DB changes)
node scripts/classify-jobs-with-llm.js --test --limit=10 --employer=cleveland-clinic
```

### Test Individual Components

**Test scraper only:**
```bash
# Cleveland Clinic
node scripts/cleveland-clinic-rn-scraper-production.js

# UHS
node scripts/workday-scraper-runner.js uhs

# Adventist
node scripts/workday-scraper-runner.js adventist
```

**Test classifier only:**
```bash
# Test mode (no DB changes)
node scripts/classify-jobs-with-llm.js --test --limit=10 --employer=uhs

# Production mode (saves to DB)
node scripts/classify-jobs-with-llm.js --limit=10 --employer=uhs
```

## Monitoring Dashboard (Optional)

Consider setting up a simple monitoring dashboard:

1. **Parse logs** into structured format
2. **Track metrics:**
   - Scrape success rate
   - Classification success rate
   - API costs
   - Jobs activated per run
3. **Visualize trends** over time

## Support

**Questions?** Check the main documentation:
- `scripts/LLM-CLASSIFIER-README.md` - Classifier details
- `docs/scraper-deployment-guide.md` - Scraper deployment
- `docs/scraper-scheduling-guide.md` - Cron scheduling

**Found a bug?** Check the logs first, then contact the developer.

