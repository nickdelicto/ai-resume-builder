# Job Classification Fix - Preventing Expired Job Reactivation

## The Problem

**Critical Bug Discovered:** The LLM classifier was reactivating jobs that had been marked as expired by the scraper.

### How It Happened:

1. **Week 1:** Job scraped → `isActive: false` (pending classification)
2. **Week 1:** Classifier runs → `isActive: true` (validated as RN job)
3. **Week 2:** Job removed from employer site → Scraper marks `isActive: false` (expired)
4. **Week 3:** Classifier runs again → Sees `isActive: false` → **Reactivates job** ❌

**Result:** Jobs no longer available on employer sites were being shown on our site!

---

## The Solution

### Added `classifiedAt` Timestamp

**Database Field:**
```prisma
classifiedAt DateTime? // When job was classified by LLM (null = needs classification)
```

### Updated Logic:

#### 1. **Classifier** (`scripts/classify-jobs-with-llm.js`)
```javascript
// OLD: Process ALL inactive jobs
const whereClause = {
  isActive: false
};

// NEW: Only process jobs that haven't been classified yet
const whereClause = {
  isActive: false,      // Inactive jobs
  classifiedAt: null    // Never been classified
};

// When classifying, SET the timestamp
data: {
  isActive: true,
  classifiedAt: new Date()  // Mark as classified
}
```

#### 2. **Scraper** (`lib/services/JobBoardService.js`)

**New Jobs:**
```javascript
// Create with classifiedAt: null (needs classification)
classifiedAt: null
```

**Existing Jobs (Re-found):**
```javascript
// Keep existing classifiedAt (don't reset)
// Only reset if description changed significantly
const descriptionChanged = existingJob.description !== jobData.description;
const shouldReClassify = descriptionChanged && existingJob.classifiedAt !== null;

classifiedAt: shouldReClassify ? null : existingJob.classifiedAt
```

**Expired Jobs (Not found in scrape):**
```javascript
// verifyActiveJobs() marks as inactive
// But keeps existing classifiedAt (prevents re-classification)
```

---

## Workflow After Fix

### Scenario 1: New Job
```
1. Scraper creates job
   → isActive: false
   → classifiedAt: null

2. Classifier processes job
   → isActive: true (if valid RN)
   → classifiedAt: 2025-11-13 12:00:00

3. Job is LIVE ✅
```

### Scenario 2: Job Removed from Employer Site
```
1. Job exists in DB
   → isActive: true
   → classifiedAt: 2025-11-13 12:00:00

2. Scraper runs, job NOT found
   → isActive: false (marked expired)
   → classifiedAt: 2025-11-13 12:00:00 (UNCHANGED)

3. Classifier runs
   → SKIPS this job (classifiedAt is not null)
   → Job stays inactive ✅
```

### Scenario 3: Job Re-found (Still Available)
```
1. Job exists in DB
   → isActive: true
   → classifiedAt: 2025-11-13 12:00:00

2. Scraper finds same job again
   → Updates details (salary, description, etc.)
   → isActive: true (keeps active if already classified)
   → classifiedAt: 2025-11-13 12:00:00 (UNCHANGED)
   
   UNLESS description changed significantly:
   → isActive: false
   → classifiedAt: null (needs re-classification)
```

### Scenario 4: Job Description Changed
```
1. Job exists with significant description change
   → isActive: false
   → classifiedAt: null (reset for re-classification)

2. Classifier processes again
   → Validates changes
   → isActive: true (if still valid RN)
   → classifiedAt: 2025-11-20 14:30:00 (new timestamp)
```

---

## Benefits of This Fix

1. ✅ **Prevents Expired Job Reactivation** - Once a job is gone, it stays gone
2. ✅ **Saves API Costs** - Don't re-classify already classified jobs
3. ✅ **Handles Job Updates** - Re-classifies if description changes significantly
4. ✅ **Maintains Data Quality** - Only show jobs actually available on employer sites
5. ✅ **Efficient** - Classifier only processes truly new jobs

---

## Migration Required

### Step 1: Add Database Field

```bash
# Generate migration
npx prisma migrate dev --name add_classified_at_to_nursing_jobs

# Push to production
npx prisma migrate deploy
```

### Step 2: Backfill Existing Jobs (Optional)

For existing jobs in database, you can either:

**Option A: Mark all active jobs as classified**
```javascript
// All currently active jobs were previously classified
await prisma.nursingJob.updateMany({
  where: { isActive: true },
  data: { classifiedAt: new Date() }
});
```

**Option B: Leave null and let them be re-classified**
```javascript
// They'll be processed next time classifier runs
// Only if they're inactive
```

### Step 3: Deploy Code Changes

```bash
git add .
git commit -m "Fix: Prevent classifier from reactivating expired jobs"
git push origin main
```

---

## Testing

### Test Case 1: New Job Classification
```bash
# 1. Create new job (classifiedAt: null)
# 2. Run classifier
# 3. Verify: job is active AND classifiedAt is set
```

### Test Case 2: Expired Job NOT Reactivated
```bash
# 1. Have active job with classifiedAt set
# 2. Manually mark isActive: false (simulate expiry)
# 3. Run classifier
# 4. Verify: job stays inactive (NOT reactivated)
```

### Test Case 3: Description Change Re-classification
```bash
# 1. Have classified job
# 2. Scraper finds same job with different description
# 3. Verify: classifiedAt reset to null, isActive: false
# 4. Run classifier
# 5. Verify: Re-classified and reactivated
```

---

## Monitoring

### Check Classification Status

```sql
-- Count jobs by classification status
SELECT 
  isActive,
  CASE 
    WHEN classifiedAt IS NULL THEN 'Pending Classification'
    ELSE 'Classified'
  END as status,
  COUNT(*) as count
FROM "NursingJob"
GROUP BY isActive, classifiedAt IS NULL;
```

### Find Jobs Needing Classification

```sql
-- Jobs waiting for LLM classification
SELECT id, title, "employerId", "scrapedAt"
FROM "NursingJob"
WHERE isActive = false 
  AND classifiedAt IS NULL
ORDER BY "scrapedAt" DESC
LIMIT 20;
```

### Verify No Reactivation Issues

```sql
-- Jobs that are inactive but were previously classified
-- (Should stay inactive - expired jobs)
SELECT id, title, "scrapedAt", classifiedAt
FROM "NursingJob"
WHERE isActive = false 
  AND classifiedAt IS NOT NULL
ORDER BY classifiedAt DESC
LIMIT 20;
```

---

## Rollback Plan (If Needed)

If issues arise:

1. **Revert database migration:**
```bash
npx prisma migrate resolve --rolled-back add_classified_at_to_nursing_jobs
```

2. **Revert code changes:**
```bash
git revert <commit-hash>
git push origin main
```

3. **Emergency fix:**
- Manually set all jobs `classifiedAt: null`
- Run classifier once to re-classify everything
- Monitor for duplicates

---

## Future Enhancements

### Potential Improvements:

1. **Classification Confidence Threshold**
   - Only activate jobs with confidence > 90%
   - Keep lower confidence jobs for manual review

2. **Classification History**
   - Track all classifications (not just latest)
   - Useful for debugging and quality analysis

3. **Automatic Re-classification Schedule**
   - Re-classify jobs older than 60 days
   - Catch jobs that may have changed categories

4. **Classification Audit Log**
   - Store LLM decisions and reasoning
   - Useful for improving prompts

---

## Questions?

See also:
- `docs/scraper-data-contract.md` - Job data structure
- `scripts/LLM-CLASSIFIER-README.md` - Classifier usage
- `PROJECT-HANDOFF.md` - Overall system architecture

