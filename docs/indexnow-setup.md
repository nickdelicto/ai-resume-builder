# Bing IndexNow Setup Guide

IndexNow is an open protocol that allows you to notify Bing (and other search engines like Yandex) when URLs on your site are added, updated, or deleted. This helps get your job postings indexed faster.

## What It Does

- **Automatically notifies Bing** when new jobs are added
- **Notifies Bing** when jobs are updated
- **Notifies Bing** when jobs expire and are deactivated
- **Works automatically** - no manual intervention needed

## Setup Steps

### 1. Generate an IndexNow Key

You need a random string (typically 32-128 characters). You can generate one using:

```bash
# Generate a random 32-character key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Or use an online generator, or just create a random string.

**Example key:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 2. Create the Key Verification File

Create a file in your `public/` directory with the key as the filename:

**File:** `public/{YOUR_KEY}.txt`

**Content:** Just the key itself (no other text)

**Example:**
- If your key is `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- Create: `public/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt`
- Content: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

This file must be publicly accessible at: `https://intelliresume.net/{YOUR_KEY}.txt`

### 3. Set Environment Variable (Optional but Recommended)

Add to your `.env` file:

```bash
INDEXNOW_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

If you don't set this, IndexNow will still work but will generate a random key each time (not recommended for production).

### 4. Deploy

After deploying:
1. Verify the key file is accessible: `https://intelliresume.net/{YOUR_KEY}.txt`
2. The system will automatically start notifying IndexNow when jobs are added/updated/deleted

## How It Works

The IndexNow service is integrated into the job saving flow:

1. **New Jobs**: When a scraper adds a new job → IndexNow is notified
2. **Updated Jobs**: When a job is updated/reactivated → IndexNow is notified  
3. **Expired Jobs**: When jobs expire → IndexNow is notified (batch)
4. **Removed Jobs**: When jobs are marked inactive → IndexNow is notified (batch)

All notifications are "fire and forget" - they won't block the job saving process if IndexNow is temporarily unavailable.

## Monitoring

Check your PM2 logs to see IndexNow notifications:

```bash
pm2 logs intelliresume | grep IndexNow
```

You should see messages like:
- `✅ IndexNow: Notified about 1 URLs (update)`
- `✅ IndexNow: Notified about 10 URLs (delete)`

## Troubleshooting

**Issue:** No IndexNow notifications in logs
- Check that `INDEXNOW_KEY` environment variable is set
- Verify the key file exists in `public/` directory
- Check that the key file is publicly accessible

**Issue:** IndexNow errors in logs
- Check your internet connection
- Verify the IndexNow API endpoint is accessible
- Errors are non-blocking, so job saving will continue

## More Information

- [IndexNow Official Site](https://www.indexnow.org/)
- [IndexNow Documentation](https://www.indexnow.org/documentation)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)

