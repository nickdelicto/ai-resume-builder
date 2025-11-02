# Scraper Deployment Guide

## Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│   Web App VPS       │         │   Scraper VPS       │
│   (Hetzner)         │         │   (Hetzner)         │
│                     │         │                     │
│   - Next.js App     │         │   - Node.js         │
│   - API Routes      │◄────────┤   - Scrapers        │
│   - Frontend        │         │   - Cron Jobs       │
│                     │         │   - Puppeteer        │
└──────────┬──────────┘         └──────────┬──────────┘
           │                                │
           └────────────┬───────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  PostgreSQL DB  │
              │  (Shared)        │
              └─────────────────┘
```

**Key Points:**
- Both VPSs connect to the **same PostgreSQL database**
- Web App VPS hosts the Next.js application
- Scraper VPS runs scrapers on a schedule (cron)
- Scrapers use `DATABASE_URL` to connect directly to the database

## Step 1: Prepare for Git Commit

Before deploying, commit all scraper work to git:

```bash
# Stage all scraper-related files
git add scripts/northwell-health-rn-scraper-production.js
git add scripts/cleveland-clinic-rn-scraper-production.js
git add lib/jobScraperUtils.js
git add lib/services/JobBoardService.js
git add prisma/schema.prisma
git add docs/scraper-data-contract.md
git add docs/scraper-deployment-guide.md

# Commit
git commit -m "Add Northwell Health scraper and deployment setup"
```

## Step 2: Set Up Scraper VPS

### 2.1 Initial Setup

```bash
# SSH into scraper VPS
ssh root@your-scraper-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install dependencies for Puppeteer
apt-get install -y \
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

# Create app directory
mkdir -p /opt/scrapers
cd /opt/scrapers
```

### 2.2 Clone Repository

```bash
# Install git if not already installed
apt-get install -y git

# Clone your repository (use your actual repo URL)
git clone https://github.com/your-username/ai-resume-builder.git .

# Or if using SSH key
git clone git@github.com:your-username/ai-resume-builder.git .
```

### 2.3 Install Dependencies

```bash
cd /opt/scrapers
npm install
```

### 2.4 Set Up Environment Variables

Create `.env` file with database connection:

```bash
# Copy from web app VPS or set directly
nano .env
```

Add:
```env
DATABASE_URL="postgresql://user:password@your-db-host:5432/dbname?sslmode=require"
NODE_ENV=production
```

**Security Note:** 
- Store `.env` file securely (never commit to git)
- Use the same `DATABASE_URL` as your web app VPS
- Consider using environment variable secrets management if available

### 2.5 Generate Prisma Client

```bash
npx prisma generate
```

## Step 3: Test Scraper Connection

Test that scraper can connect to database:

```bash
# Test Cleveland Clinic scraper (limited pages)
node scripts/cleveland-clinic-rn-scraper-production.js

# Test Northwell Health scraper (limited pages)
node scripts/northwell-health-rn-scraper-production.js
```

## Step 4: Set Up Cron Jobs

### 4.1 Create Scraper Runner Script

Create a wrapper script for better logging:

```bash
nano /opt/scrapers/scripts/run-scraper.sh
```

Add:
```bash
#!/bin/bash

# Scraper runner script with logging
# Usage: ./run-scraper.sh cleveland-clinic|northwell-health

SCRAPER=$1
LOG_DIR="/opt/scrapers/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $LOG_DIR

cd /opt/scrapers

case $SCRAPER in
  cleveland-clinic)
    node scripts/cleveland-clinic-rn-scraper-production.js > "$LOG_DIR/cleveland-clinic_$TIMESTAMP.log" 2>&1
    ;;
  northwell-health)
    node scripts/northwell-health-rn-scraper-production.js > "$LOG_DIR/northwell-health_$TIMESTAMP.log" 2>&1
    ;;
  *)
    echo "Unknown scraper: $SCRAPER"
    exit 1
    ;;
esac

# Keep only last 30 days of logs
find $LOG_DIR -name "*.log" -mtime +30 -delete
```

Make executable:
```bash
chmod +x /opt/scrapers/scripts/run-scraper.sh
```

### 4.2 Set Up Cron

```bash
crontab -e
```

Add cron jobs (example: run every Monday at 2 AM):

```cron
# Cleveland Clinic scraper - every Monday at 2 AM
0 2 * * 1 cd /opt/scrapers && /opt/scrapers/scripts/run-scraper.sh cleveland-clinic

# Northwell Health scraper - every Monday at 3 AM  
0 3 * * 1 cd /opt/scrapers && /opt/scrapers/scripts/run-scraper.sh northwell-health

# Optional: Add email notifications (requires mail setup)
# MAILTO=your-email@example.com
```

**Alternative Schedule Options:**
```cron
# Daily at 2 AM
0 2 * * * cd /opt/scrapers && /opt/scrapers/scripts/run-scraper.sh cleveland-clinic

# Every 3 days at 2 AM
0 2 */3 * * cd /opt/scrapers && /opt/scrapers/scripts/run-scraper.sh cleveland-clinic

# Weekly on Sunday at midnight
0 0 * * 0 cd /opt/scrapers && /opt/scrapers/scripts/run-scraper.sh cleveland-clinic
```

### 4.3 Verify Cron Setup

```bash
# List current cron jobs
crontab -l

# Check cron logs (if available)
tail -f /var/log/syslog | grep CRON
```

## Step 5: Monitoring & Maintenance

### 5.1 Check Logs

```bash
# View latest log
ls -lt /opt/scrapers/logs/ | head

# Tail latest log
tail -f /opt/scrapers/logs/cleveland-clinic_*.log

# Search for errors
grep -i error /opt/scrapers/logs/*.log
```

### 5.2 Manual Scraper Runs

```bash
cd /opt/scrapers

# Run specific scraper
./scripts/run-scraper.sh cleveland-clinic
./scripts/run-scraper.sh northwell-health

# Or directly
node scripts/cleveland-clinic-rn-scraper-production.js
node scripts/northwell-health-rn-scraper-production.js
```

### 5.3 Update Scrapers

When you update scrapers in git:

```bash
cd /opt/scrapers
git pull origin main
npm install  # If package.json changed
npx prisma generate  # If schema changed
```

## Step 6: Web App VPS Configuration

Ensure your web app VPS has:
- Same `DATABASE_URL` in `.env`
- Prisma schema synced
- Access to read the same database

**No additional configuration needed** - scrapers write directly to the shared database.

## Security Best Practices

1. **Database Access:**
   - Use strong database passwords
   - Consider IP whitelisting if database supports it
   - Use SSL/TLS for database connections (`?sslmode=require`)

2. **Environment Variables:**
   - Never commit `.env` files
   - Use separate database user for scrapers (with write-only permissions if possible)
   - Rotate credentials periodically

3. **File Permissions:**
   ```bash
   chmod 600 /opt/scrapers/.env  # Only owner can read/write
   chown -R scraper-user:scraper-user /opt/scrapers
   ```

4. **Firewall:**
   - Only allow necessary ports (SSH, HTTP/HTTPS for web app)
   - Block direct database access from internet (only allow from VPSs)

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
cd /opt/scrapers
node -e "require('@prisma/client').PrismaClient.$connect()"

# Check if DATABASE_URL is set
echo $DATABASE_URL
```

### Puppeteer Issues

```bash
# Verify Chromium dependencies
ldd node_modules/puppeteer/.local-chromium/*/chrome-linux/chrome | grep "not found"

# Reinstall Puppeteer if needed
npm install puppeteer --force
```

### Memory Issues

If scrapers consume too much memory:

```bash
# Add swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Next Steps

1. ✅ Commit scraper code to git
2. ✅ Set up scraper VPS
3. ✅ Test manual scraper runs
4. ✅ Set up cron jobs
5. ✅ Monitor first scheduled runs
6. 🔄 Add more scrapers as needed
7. 🔄 Set up alerting/notifications for failures

