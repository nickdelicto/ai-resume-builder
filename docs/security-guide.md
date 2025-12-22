# Deployment Safety Guide

## Preventing Supply Chain Attacks (Next.js Malware Incident - Dec 2025)

---

## What Happened

A malicious npm package hidden in Next.js 15's dependency chain downloaded a cryptocurrency miner when apps handled HTTP requests. This was a **supply chain attack** - not your code, but a compromised dependency.

**Affected:** Next.js 15.x versions  
**Safe:** Next.js 14.2.35 (patched)

---

## Current Safe Version (as of Dec 2025)

**ai-resume-builder (intelliresume.net):** `"next": "14.2.35"` ✅

---

## CRITICAL: Pin Your Versions

In `package.json`, **remove the `^` symbol**:

```json
// ❌ BAD - allows auto-upgrade to potentially compromised versions
"next": "^14.2.35"

// ✅ GOOD - locks to exact safe version
"next": "14.2.35"
```

---

## Safe Deployment Process

### On Server (after git pull):

```bash
cd ~/ai-resume-builder

# 1. Pull updates
git pull origin main

# 2. If conflicts with package files:
git checkout --theirs package.json package-lock.json
git pull origin main

# 3. Install safely
npm ci --legacy-peer-deps
# If npm ci fails:
npm install --legacy-peer-deps

# 4. Build
npm run build

# 5. Restart
pm2 restart intelliresume

# 6. MONITOR FOR 5-10 MINUTES
top                           # CPU should stay 0-5%
ls ~/.local/share/next        # Should say "No such file"
```

---

## Before Pushing from Local PC

```bash
# 1. Check for vulnerabilities
npm audit

# 2. Verify pinned versions (no ^ or ~)
grep '"next"' package.json
# Should show: "next": "14.2.35"

# 3. ALWAYS commit both files
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

---

## Files to ALWAYS Commit

| File | Why |
|------|-----|
| `package.json` | Your dependency requirements |
| `package-lock.json` | Locks EXACT versions - prevents auto-upgrade |

---

## Quick Commands Reference

```bash
# Safe install (respects lock file)
npm ci --legacy-peer-deps

# Check current Next.js version
grep '"next"' package.json

# Check for vulnerabilities
npm audit

# Monitor CPU after deploy
top

# Check for miner file (should not exist)
ls ~/.local/share/next

# PM2 commands
pm2 list                    # See app status
pm2 restart intelliresume   # Restart app
pm2 logs intelliresume      # View logs
pm2 save                    # Save current config
```

---

## Warning Signs of Infection

- CPU usage jumps to 180-200%
- File appears at `~/.local/share/next`
- 502/504 gateway errors (app can't respond due to CPU starvation)
- Process named `/home/USER/.local/share/next` in `top` or `ps aux`

---

## If Infected Again

```bash
# 1. Kill miner
pkill -f "\.local/share/next"
rm -f ~/.local/share/next

# 2. Stop app
pm2 stop intelliresume

# 3. Downgrade to safe version
cd ~/ai-resume-builder
sed -i 's/"next": ".*"/"next": "14.2.35"/' package.json

# 4. Clean reinstall
rm -rf node_modules .next package-lock.json
npm install --legacy-peer-deps

# 5. Rebuild and restart
npm run build
pm2 restart intelliresume

# 6. Monitor
top
```

---

## Before Upgrading Next.js

1. **Check security advisories:** https://nextjs.org/blog
2. **Wait 2-4 weeks** after new major versions
3. **Test in staging first**
4. **Pin exact version** (no `^`)

---

## Server Status Commands

```bash
# App status
pm2 list

# CPU/Memory usage
top

# Check port
ss -tlnp | grep 3000

# Test app
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

---

## Contact/Resources

- Next.js Security: https://nextjs.org/blog (check for security posts)
- npm audit: Run before every deploy
- This guide created: December 22, 2025

---

*Keep this file in your repo root so all devs/agents have access.*

