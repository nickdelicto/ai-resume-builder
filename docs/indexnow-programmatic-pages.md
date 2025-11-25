# IndexNow: Programmatic Pages Submission

## Overview

This script submits programmatic pages (state, city, specialty, and salary pages) to Bing's IndexNow API for faster indexing.

**Key Features:**
- ✅ Only submits pages that have **changed** since last submission (based on job count fingerprint)
- ✅ Batches of 50 URLs with 3-minute delays to avoid rate limiting
- ✅ Tracks submissions in `scripts/indexnow-programmatic-urls.json`
- ✅ Runs automatically via cron every **Wednesday at 1 AM EST**

## How It Works

### 1. **Fingerprint-Based Change Detection**
Each page gets a unique fingerprint based on:
- Page type (state, city, specialty, etc.)
- Location/specialty metadata
- **Job count** (changes when jobs are added/removed)

Example:
```javascript
// State page fingerprint
{ pageType: 'state', state: 'OH', jobCount: 15 }
→ MD5 hash: "a1b2c3d4..."

// If job count changes to 16:
{ pageType: 'state', state: 'OH', jobCount: 16 }
→ MD5 hash: "e5f6g7h8..." (different!)
```

### 2. **What Gets Submitted**
- **State pages**: `/jobs/nursing/ohio`
- **State salary pages**: `/jobs/nursing/ohio/salary`
- **City pages**: `/jobs/nursing/ohio/cleveland`
- **City salary pages**: `/jobs/nursing/ohio/cleveland/salary`
- **State+Specialty pages**: `/jobs/nursing/ohio/icu`
- **State+Specialty salary pages**: `/jobs/nursing/ohio/icu/salary`
- **City+Specialty pages**: `/jobs/nursing/ohio/cleveland/icu`
- **City+Specialty salary pages**: `/jobs/nursing/ohio/cleveland/icu/salary`
- **National specialty pages**: `/jobs/nursing/specialty/icu`
- **Employer pages**: `/jobs/nursing/employer/cleveland-clinic`

### 3. **When It Runs**
- **Automatically**: Every Wednesday at 1 AM EST via cron
- **Manually**: `node scripts/index-programmatic-pages.js`
- **Dry run**: `node scripts/index-programmatic-pages.js --dry-run`

## Usage

### Test Locally (Dry Run)
```bash
node scripts/index-programmatic-pages.js --dry-run
```

Output:
```
🚀 IndexNow: Programmatic Pages Submission
Mode: 🧪 DRY RUN (no actual submissions)

📂 Loaded 308 previously submitted URLs
📊 Fetching data from database...
   States: 4
   Cities: 23
   Specialties: 22
   State+Specialty: 44
   City+Specialty: 70
   Employers: 4

📋 Generated 308 total programmatic URLs
🔄 URLs to submit: 15 (293 unchanged)

🧪 DRY RUN - URLs that would be submitted:
   - https://intelliresume.net/jobs/nursing/ohio
   - https://intelliresume.net/jobs/nursing/ohio/salary
   - https://intelliresume.net/jobs/nursing/ohio/cleveland
   ...
```

### Run Manually
```bash
node scripts/index-programmatic-pages.js
```

### Deploy to VPS

**1. Push to GitHub:**
```bash
git add scripts/index-programmatic-pages.js scripts/CRONTAB-INDEXNOW.txt docs/indexnow-programmatic-pages.md
git commit -m "feat: add IndexNow programmatic pages submission"
git push origin main
```

**2. Pull on VPS:**
```bash
ssh intelliresume@your-vps-ip
cd ~/ai-resume-builder
git pull origin main
```

**3. Test on VPS (dry run):**
```bash
node scripts/index-programmatic-pages.js --dry-run
```

**4. Run initial submission:**
```bash
# This will submit all current pages (first run only)
node scripts/index-programmatic-pages.js
```

**5. Add to crontab:**
```bash
crontab -e
```

Add this line:
```cron
# IndexNow Programmatic Pages - Every Wednesday 1 AM EST (6 AM UTC)
0 6 * * 3 /usr/bin/node /home/intelliresume/ai-resume-builder/scripts/index-programmatic-pages.js >> /home/intelliresume/ai-resume-builder/logs/indexnow-programmatic.log 2>&1
```

**6. Verify crontab:**
```bash
crontab -l | grep indexnow
```

## Tracking File

**Location:** `scripts/indexnow-programmatic-urls.json`

**Structure:**
```json
{
  "lastUpdated": "2025-11-25T06:00:00.000Z",
  "count": 308,
  "urls": {
    "https://intelliresume.net/jobs/nursing/ohio": "a1b2c3d4e5f6...",
    "https://intelliresume.net/jobs/nursing/ohio/salary": "1a2b3c4d5e6f...",
    ...
  }
}
```

Each URL maps to its **fingerprint hash**. When job counts change, the hash changes, triggering a resubmission.

## Monitoring

### Check Logs
```bash
tail -f ~/ai-resume-builder/logs/indexnow-programmatic.log
```

### Check Tracking File
```bash
cat ~/ai-resume-builder/scripts/indexnow-programmatic-urls.json | jq '.count'
```

### Manual Check for Changes
```bash
node scripts/index-programmatic-pages.js --dry-run
```

## Comparison with Job Listings Submission

| Feature | Job Listings (`batch-indexnow.js`) | Programmatic Pages (`index-programmatic-pages.js`) |
|---------|-----------------------------------|--------------------------------------------------|
| **What** | Individual job postings | State/city/specialty/salary pages |
| **When** | After every scrape | Weekly (Wednesday 1 AM) |
| **How** | Compare slugs | Compare fingerprints (job counts) |
| **Frequency** | High (2x/week per employer) | Low (1x/week) |
| **Volume** | 100-200 URLs per scrape | 300-400 URLs total |
| **Tracking** | `indexnow-submitted-urls.json` | `indexnow-programmatic-urls.json` |

## Troubleshooting

### No URLs Submitted (All Unchanged)
✅ **This is normal!** If no jobs were added/removed, no pages changed, so nothing to submit.

### Too Many Requests Error
- Script already includes 3-minute delays
- Check `indexnow-programmatic.log` for rate limit errors
- Increase `DELAY_BETWEEN_BATCHES_MS` if needed

### Tracking File Corrupt
```bash
# Delete and re-run (will submit all pages)
rm scripts/indexnow-programmatic-urls.json
node scripts/index-programmatic-pages.js --dry-run
```

## Related Files

- `scripts/index-programmatic-pages.js` - Main script
- `scripts/batch-indexnow.js` - Job listings submission (runs after scrapes)
- `scripts/indexnow-programmatic-urls.json` - Tracking file (auto-generated)
- `scripts/CRONTAB-INDEXNOW.txt` - Cron entry reference
- `pages/jobs-sitemap.xml.js` - Dynamic sitemap generator

