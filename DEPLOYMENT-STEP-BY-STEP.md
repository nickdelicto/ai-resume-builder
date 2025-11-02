# Step-by-Step Deployment Guide

## Decision: Same VPS vs Separate VPS

Since you already have `ai-resume-builder` on your Hetzner VPS, you have two options:

### Option 1: Same VPS (RECOMMENDED - Simpler)
- Run scrapers on the **same VPS** as your web app
- Just pull latest code and set up cron jobs
- ✅ Simpler setup
- ✅ Same database connection
- ✅ Easier to manage
- ❌ Scrapers share resources with web app

### Option 2: Separate VPS (More Isolation)
- Create a **new VPS** just for scrapers
- Clone the repo separately
- ✅ Complete isolation
- ✅ Can scale independently
- ❌ More setup work
- ❌ Two VPSs to manage

**Recommendation: Start with Option 1 (same VPS). You can always split later if needed.**

---

## Option 1: Deploy to Same VPS (Recommended)

### Step 1: Commit Everything to Git (Local Dev)

```bash
# From your local dev machine
cd /home/dell/ai-resume-builder

# Stage all scraper-related files
git add .

# Review what will be committed
git status

# Commit everything
git commit -m "Add job scrapers (Cleveland Clinic, Northwell Health) and deployment setup"

# Push to GitHub
git push origin main
```

### Step 2: Update VPS (Production)

SSH into your Hetzner VPS:

```bash
ssh intelliresume@your-vps-ip
```

Navigate to project and pull latest:

```bash
cd ~/ai-resume-builder

# Check current status
git status

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Generate Prisma client (if schema changed)
npx prisma generate
```

### Step 3: Install Puppeteer Dependencies (VPS)

On your VPS, install system dependencies for Puppeteer:

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

### Step 4: Verify Database Connection (VPS)

Make sure `.env` has `DATABASE_URL`:

```bash
cd ~/ai-resume-builder

# Check if DATABASE_URL is set (don't show full value)
grep DATABASE_URL .env | head -c 50
```

If not set, add it to `.env`:
```bash
nano .env
```

Add:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### Step 5: Test Scraper Manually (VPS)

Test that scrapers work:

```bash
cd ~/ai-resume-builder

# Test with limited pages (modify scraper temporarily if needed)
# Or create a test script
node scripts/cleveland-clinic-rn-scraper-production.js
```

**Note:** You may want to temporarily limit pages for testing. Edit the scraper file:

```bash
nano scripts/cleveland-clinic-rn-scraper-production.js
```

Change line ~1710 to:
```javascript
const scraper = new ClevelandClinicRNScraper({ maxPages: 2 }); // Test with 2 pages
```

Run test, then change back to no limit.

### Step 6: Make Scraper Script Executable (VPS)

```bash
cd ~/ai-resume-builder
chmod +x scripts/run-scraper.sh
```

### Step 7: Test Scraper Script (VPS)

```bash
cd ~/ai-resume-builder
./scripts/run-scraper.sh cleveland-clinic
```

Check logs:
```bash
ls -la logs/
tail -f logs/cleveland-clinic_*.log
```

### Step 8: Set Up Cron Jobs (VPS)

Edit crontab:

```bash
crontab -e
```

Add these lines (adjust paths if needed):

```cron
# Cleveland Clinic scraper - Every Monday at 2 AM (low priority to avoid impacting site)
0 2 * * 1 cd /home/intelliresume/ai-resume-builder && /usr/bin/nice -n 10 ./scripts/run-scraper.sh cleveland-clinic

# Northwell Health scraper - Every Monday at 3 AM (low priority, staggered)
0 3 * * 1 cd /home/intelliresume/ai-resume-builder && /usr/bin/nice -n 10 ./scripts/run-scraper.sh northwell-health
```

**Key optimizations:**
- `nice -n 10`: Lower CPU priority (scrapers won't slow down site)
- Staggered times (2 AM and 3 AM): Prevents running simultaneously
- Weekly schedule: Fresh data without overload

**Important:** 
- Use the **full absolute path** to your project directory
- Use full path to `nice`: `/usr/bin/nice` (varies by system)

Verify cron:
```bash
crontab -l
```

**Note:** See `docs/scraper-scheduling-guide.md` for detailed performance analysis and monitoring tips.

### Step 9: Verify Everything Works

1. **Manual test:**
   ```bash
   cd ~/ai-resume-builder
   ./scripts/run-scraper.sh cleveland-clinic
   ```

2. **Check database:**
   - Jobs should appear on your frontend
   - Check `/jobs/nursing` pages

3. **Check logs:**
   ```bash
   tail -f logs/cleveland-clinic_*.log
   ```

---

## Option 2: Deploy to Separate VPS

If you prefer a separate VPS for scrapers:

### Step 1: Commit to Git (Same as Option 1)

### Step 2: Create New VPS
- Create a new Hetzner VPS
- Install Node.js 20 LTS
- Install Puppeteer dependencies

### Step 3: Clone Repository

```bash
cd /opt
git clone git@github.com:nickdelicto/ai-resume-builder.git scrapers
cd scrapers
npm install
```

### Step 4: Configure Environment

```bash
nano .env
```

Add `DATABASE_URL` (same as web app VPS):
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
NODE_ENV=production
```

### Step 5-9: Follow Option 1 Steps 5-9

(Install dependencies, test, set up cron)

**Update cron paths:**
```cron
0 2 * * 1 cd /opt/scrapers && ./scripts/run-scraper.sh cleveland-clinic
0 3 * * 1 cd /opt/scrapers && ./scripts/run-scraper.sh northwell-health
```

---

## Troubleshooting

### Issue: "Command not found" when running scraper
**Fix:** Use full paths or ensure Node.js is in PATH:
```bash
which node
export PATH=$PATH:/usr/bin/node
```

### Issue: Puppeteer can't find Chrome
**Fix:** Reinstall Puppeteer:
```bash
cd ~/ai-resume-builder
npm install puppeteer --force
```

### Issue: Database connection fails
**Fix:** 
- Verify `DATABASE_URL` in `.env`
- Check if database allows connections from VPS IP
- Test connection: `node -e "require('@prisma/client').PrismaClient"`

### Issue: Cron job not running
**Fix:**
- Check cron logs: `grep CRON /var/log/syslog`
- Verify paths are absolute in crontab
- Ensure script is executable: `chmod +x scripts/run-scraper.sh`
- Test manually first

### Issue: Scraper runs but no jobs saved
**Fix:**
- Check scraper logs: `tail -f logs/*.log`
- Verify `saveToDatabase: true` in scraper options
- Check database directly

---

## Quick Reference Commands (VPS)

```bash
# Navigate to project
cd ~/ai-resume-builder

# Pull latest code
git pull origin main

# Install dependencies
npm install
npx prisma generate

# Run scraper manually
./scripts/run-scraper.sh cleveland-clinic
./scripts/run-scraper.sh northwell-health

# View logs
tail -f logs/cleveland-clinic_*.log
tail -f logs/northwell-health_*.log

# Check cron jobs
crontab -l

# Edit cron jobs
crontab -e
```

---

## Next Steps After Deployment

1. ✅ Monitor first scheduled run
2. ✅ Verify jobs appear on frontend
3. ✅ Check logs for errors
4. ✅ Adjust cron schedule if needed
5. ✅ Set up log rotation/monitoring
6. ✅ Add more scrapers as needed

