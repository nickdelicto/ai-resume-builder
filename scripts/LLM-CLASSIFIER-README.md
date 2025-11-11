# LLM Job Classifier - Testing Guide

## What This Does

Uses OpenAI GPT-5-mini to accurately classify nursing jobs by:
1. **Validating** if it's a Staff RN position (not NP, CRNA, LPN, etc.)
2. **Assigning** the correct specialty (ICU, ER, Med-Surg, etc.)
3. **Detecting** employment type (Full Time, Part Time, PRN, etc.)
4. **Detecting** shift type (days, nights, evenings, variable, rotating)
5. **Detecting** experience level (Entry Level, New Grad, Experienced, Senior, Leadership)

## Cost

**GPT-5-mini Standard API Pricing (Nov 2024):**
- Input: $0.25 per 1M tokens
- Cached Input: $0.025 per 1M tokens
- Output: $2.00 per 1M tokens

**Actual Cost:**
- ~$0.0004 - $0.0008 per job
- 856 jobs = ~$0.40 - $0.70
- **Still very affordable!**

## Test Commands

### Test #1: Classify 10 Cleveland Clinic Jobs (TEST MODE - No DB Changes)
```bash
cd ~/ai-resume-builder
node scripts/classify-jobs-with-llm.js --test --limit=10 --employer=cleveland-clinic
```

This will:
- ✅ Process 10 jobs
- ✅ Show LLM classifications
- ✅ Show cost and token usage
- ✅ Compare old vs new specialties
- ❌ NOT save to database (test mode)

### Test #2: Classify 20 Random Jobs (TEST MODE)
```bash
node scripts/classify-jobs-with-llm.js --test --limit=20
```

### Test #3: Classify & Save 10 Jobs (PRODUCTION - Saves to DB)
```bash
node scripts/classify-jobs-with-llm.js --limit=10 --employer=cleveland-clinic
```

**WARNING:** This WILL update your database!

### Test #4: Classify ALL Jobs from One Employer
```bash
node scripts/classify-jobs-with-llm.js --employer=uhs
```

### Test #5: Classify ALL Jobs (Full Production Run)
```bash
node scripts/classify-jobs-with-llm.js
```

## Expected Output

```
🤖 LLM Job Classifier Starting...

Mode: 🧪 TEST (no DB changes)
Limit: 10
Employer: Cleveland Clinic

📊 Found 10 jobs to classify

────────────────────────────────────────

[1/10] Processing: Staff Nurse - ICU
   Employer: Cleveland Clinic
   Current specialty: All Specialties
   ✅ LLM Classification:
      Staff RN: ✓ YES
      Specialty: ICU
      Job Type: Full Time
      Confidence: 98%
      Reasoning: Job title clearly indicates ICU specialty
   💰 Cost: $0.000234 | Tokens: 387

[2/10] Processing: Modern Care Coordinator
   Employer: Cleveland Clinic
   Current specialty: All Specialties
   ✅ LLM Classification:
      Staff RN: ✗ NO
      Specialty: All Specialties
      Job Type: Full Time
      Confidence: 95%
      Reasoning: This is a coordinator/management role, not bedside nursing
   💰 Cost: $0.000198 | Tokens: 342

... etc ...

════════════════════════════════════════
📊 CLASSIFICATION SUMMARY
════════════════════════════════════════
✅ Successful: 10
❌ Failed: 0
💰 Total Cost: $0.0024
🎫 Total Tokens: 3,842
📈 Average Cost per Job: $0.000240

🧪 TEST MODE: No changes were saved to the database

📋 Specialty Distribution:
   ICU: 3
   ER: 2
   Med-Surg: 2
   OR: 1
   Oncology: 1
   All Specialties: 1

🔄 7 jobs had specialty changes:
   "Staff Nurse - ICU": All Specialties → ICU
   "Emergency Department RN": All Specialties → ER
   ... etc ...

✨ Classification complete!
```

## What to Look For

1. **Accuracy:** Does the LLM pick the right specialty?
2. **False Positives:** Does it correctly identify non-RN positions?
3. **Cost:** Is the cost acceptable? (~$0.0002-0.0005 per job)
4. **Changes:** Which jobs are getting reclassified?

## Next Steps

After testing:
1. Review the results
2. If happy, run on all jobs: `node scripts/classify-jobs-with-llm.js`
3. Add to cron workflow (after scrapers)
4. Optionally: Add `processingStatus` field for better workflow

## Troubleshooting

**Error: OPENAI_API_KEY not found**
```bash
# Check if API key is set
echo $OPENAI_API_KEY

# If empty, add to .env file
echo "OPENAI_API_KEY=sk-..." >> .env
```

**Error: Module 'openai' not found**
```bash
npm install openai
```

**Error: Too many requests (429)**
- Script includes 100ms delay between requests
- If still hitting limits, increase delay in code

## Advanced Options

### Batch Processing (Future Enhancement)
Currently processes one job at a time. Could be optimized to send 10-20 jobs per API call for lower cost, but this is already very cheap!

### Description Formatting (Future Enhancement)
Script currently focuses on classification. Could be extended to also reformat descriptions into standardized markdown.

