# Deployment Checklist

## Pre-Deployment

- [ ] Review all scraper code changes
- [ ] Test scrapers locally (with limited pages)
- [ ] Commit all changes to git
- [ ] Push to repository

## Scraper VPS Setup

- [ ] Create new Hetzner VPS for scrapers
- [ ] SSH into scraper VPS
- [ ] Install Node.js 20 LTS
- [ ] Install Puppeteer system dependencies
- [ ] Clone repository
- [ ] Install npm packages
- [ ] Set up `.env` file with `DATABASE_URL`
- [ ] Run `npx prisma generate`
- [ ] Test database connection
- [ ] Test scraper manually (limited pages)
- [ ] Set up `run-scraper.sh` script
- [ ] Configure cron jobs
- [ ] Test cron job execution

## Web App VPS

- [ ] Verify database connection still works
- [ ] Verify scraped jobs appear on frontend
- [ ] No changes needed (scrapers write to shared DB)

## Post-Deployment

- [ ] Monitor first cron run
- [ ] Check logs for errors
- [ ] Verify jobs are being saved correctly
- [ ] Set up log rotation/monitoring
- [ ] Document any VPS-specific notes

## Quick Reference

### Scraper VPS Commands

```bash
# Manual scraper run
cd /opt/scrapers
./scripts/run-scraper.sh cleveland-clinic
./scripts/run-scraper.sh northwell-health

# View logs
tail -f logs/cleveland-clinic_*.log

# Update from git
cd /opt/scrapers
git pull
npm install
npx prisma generate
```

### Database Connection

Both VPSs use the same `DATABASE_URL`:
```env
DATABASE_URL="postgresql://user:password@db-host:5432/dbname?sslmode=require"
```

### Cron Schedule (Recommended)

```cron
# Every Monday at 2 AM - Cleveland Clinic
0 2 * * 1 cd /opt/scrapers && ./scripts/run-scraper.sh cleveland-clinic

# Every Monday at 3 AM - Northwell Health
0 3 * * 1 cd /opt/scrapers && ./scripts/run-scraper.sh northwell-health
```

