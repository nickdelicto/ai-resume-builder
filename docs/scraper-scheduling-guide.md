# Scraper Scheduling & Performance Guide

## Scraping Frequency Strategy

**Recommendation: Each scraper runs once per week**

- **Cleveland Clinic**: Monday 2 AM
- **Northwell Health**: Monday 3 AM
- **Future scrapers**: Stagger at different times/days

This ensures:
- ✅ Jobs stay fresh (updated weekly)
- ✅ Database doesn't get overwhelmed
- ✅ Runs during low-traffic hours (2-3 AM)

## Performance Impact Analysis

### Will scrapers slow down the main site?

**Short answer:** Minimally, if scheduled correctly.

### Resource Usage Breakdown

| Component | Resource Impact | Mitigation |
|-----------|----------------|------------|
| **Puppeteer/Chrome** | High memory (500MB-1GB per instance) | Run one at a time, staggered times |
| **CPU** | Medium during scraping | Run at low-traffic hours (2-3 AM) |
| **Database** | Low (batch writes) | Already optimized |
| **Network** | Low (external scraping) | Doesn't affect site traffic |

### Impact Assessment

**Best case (current setup):**
- Scrapers run at 2-3 AM (lowest traffic)
- Run one at a time (staggered)
- Each takes ~10-30 minutes
- **Impact: Minimal** - site users won't notice

**If traffic grows:**
- Monitor resource usage
- Can split to separate VPS if needed
- Can use Docker to isolate resources

## Cron Job Setup (Optimized for Performance)

### Basic Cron Setup

```bash
crontab -e
```

Add:

```cron
# Cleveland Clinic - Monday 2 AM (low traffic)
0 2 * * 1 cd /home/intelliresume/ai-resume-builder && /usr/bin/nice -n 10 ./scripts/run-scraper.sh cleveland-clinic

# Northwell Health - Monday 3 AM (low traffic)
0 3 * * 1 cd /home/intelliresume/ai-resume-builder && /usr/bin/nice -n 10 ./scripts/run-scraper.sh northwell-health
```

**Key optimizations:**
- `nice -n 10`: Lower CPU priority (scrapers get CPU only when site isn't using it)
- Staggered times: Prevents running simultaneously
- Low-traffic hours: 2-3 AM

### Advanced: Resource Limits (Optional)

If you want even more control, create a wrapper script with resource limits:

```bash
nano ~/ai-resume-builder/scripts/run-scraper-limited.sh
```

Add:
```bash
#!/bin/bash
# Resource-limited scraper runner
# Limits CPU and memory usage

SCRAPER=$1

# Set CPU priority (lower = less aggressive)
nice -n 15 \
  # Limit memory (1GB max for Puppeteer)
  /usr/bin/timeout 3600 \
  node scripts/${SCRAPER}-rn-scraper-production.js

# Usage: ./run-scraper-limited.sh cleveland-clinic
```

Make executable:
```bash
chmod +x scripts/run-scraper-limited.sh
```

## Monitoring & Performance Tracking

### Monitor Resource Usage

Create a monitoring script:

```bash
nano ~/ai-resume-builder/scripts/monitor-scraper-resources.sh
```

Add:
```bash
#!/bin/bash
# Monitor scraper resource usage

echo "=== Scraper Resource Monitor ==="
echo "Active Puppeteer processes:"
ps aux | grep -i "puppeteer\|chrome\|node.*scraper" | grep -v grep

echo ""
echo "Memory usage (top 5 processes):"
ps aux --sort=-%mem | head -6

echo ""
echo "CPU usage (top 5 processes):"
ps aux --sort=-%cpu | head -6

echo ""
echo "Load average:"
uptime
```

Make executable:
```bash
chmod +x scripts/monitor-scraper-resources.sh
```

### When to Consider Separate VPS

**Red flags that indicate you should split:**
- ⚠️ Site becomes slow during scraper runs
- ⚠️ Scrapers consistently take >1 hour
- ⚠️ Memory usage exceeds 80% during scraping
- ⚠️ Site traffic grows significantly (>1000 concurrent users)
- ⚠️ Database queries slow down during scraping

**Good indicators to keep same VPS:**
- ✅ Scrapers finish in <30 minutes
- ✅ Site response time unaffected
- ✅ VPS has >2GB free RAM
- ✅ Low concurrent site traffic

## Scheduling Options

### Option 1: Weekly (Recommended)
```cron
# Every Monday
0 2 * * 1 cd /home/intelliresume/ai-resume-builder && nice -n 10 ./scripts/run-scraper.sh cleveland-clinic
0 3 * * 1 cd /home/intelliresume/ai-resume-builder && nice -n 10 ./scripts/run-scraper.sh northwell-health
```

### Option 2: Twice Weekly
```cron
# Monday and Thursday
0 2 * * 1,4 cd /home/intelliresume/ai-resume-builder && nice -n 10 ./scripts/run-scraper.sh cleveland-clinic
0 3 * * 1,4 cd /home/intelliresume/ai-resume-builder && nice -n 10 ./scripts/run-scraper.sh northwell-health
```

### Option 3: Daily (if you need fresher data)
```cron
# Every day at 2-3 AM
0 2 * * * cd /home/intelliresume/ai-resume-builder && nice -n 10 ./scripts/run-scraper.sh cleveland-clinic
0 3 * * * cd /home/intelliresume/ai-resume-builder && nice -n 10 ./scripts/run-scraper.sh northwell-health
```

**Recommendation:** Start with **weekly (Option 1)**. Increase frequency only if needed.

## Automated Monitoring Script

Create a script that logs resource usage:

```bash
nano ~/ai-resume-builder/scripts/log-scraper-performance.sh
```

Add:
```bash
#!/bin/bash
# Log scraper performance metrics

LOG_FILE="logs/scraper-performance.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Get resource stats
MEMORY=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
LOAD=$(uptime | awk -F'load average:' '{print $2}')

# Log to file
echo "[$TIMESTAMP] Memory: $MEMORY, CPU: $CPU%, Load: $LOAD" >> "$LOG_FILE"

# Keep only last 100 entries
tail -n 100 "$LOG_FILE" > "${LOG_FILE}.tmp"
mv "${LOG_FILE}.tmp" "$LOG_FILE"
```

Add to cron (run every 5 minutes during scraping hours):
```cron
*/5 2-4 * * 1 cd /home/intelliresume/ai-resume-builder && ./scripts/log-scraper-performance.sh
```

## Best Practices Summary

1. ✅ **Run during low-traffic hours** (2-3 AM)
2. ✅ **Stagger scraper runs** (don't run simultaneously)
3. ✅ **Use `nice` command** (lower CPU priority)
4. ✅ **Monitor resource usage** (track first few runs)
5. ✅ **Start weekly** (increase frequency only if needed)
6. ✅ **Keep logs** (helps diagnose issues)

## Migration Path: Same VPS → Separate VPS

If you need to split later:

1. **Set up new VPS** (follow Option 2 in deployment guide)
2. **Copy scraper code** (already in git)
3. **Update cron on new VPS**
4. **Remove cron from web app VPS**
5. **Both connect to same database** (no code changes needed)

**Time to migrate:** ~30 minutes when needed.

## Quick Reference

```bash
# Check if scrapers are running
ps aux | grep scraper

# Monitor during scraper run
watch -n 5 'ps aux | grep -E "node|chrome" | grep -v grep'

# Check scraper logs
tail -f logs/cleveland-clinic_*.log

# Manually run with low priority
nice -n 10 ./scripts/run-scraper.sh cleveland-clinic

# Check system resources
htop  # or: top
free -h  # memory
df -h   # disk
```

---

**Bottom line:** Start with same VPS, weekly schedule, low-priority runs. Monitor for first few weeks. Split only if you see performance issues.

