# Workday Scraper Guide

## Overview

The Workday scraper system is a flexible, reusable scraper that can handle multiple employers using Workday ATS. Instead of creating a separate scraper for each employer, you configure each employer in a simple config file and use the same base scraper.

## Benefits

- **One scraper, many employers**: Add new Workday employers by just adding a config entry
- **Consistent data format**: All employers follow the same data contract
- **Easy maintenance**: Fix bugs once, benefit all employers
- **Flexible filtering**: Each employer can specify their own filter parameters

## Files

1. **`scripts/workday-rn-scraper-base.js`**: Base scraper class with common Workday patterns
2. **`scripts/workday-employer-configs.js`**: Configuration file for all Workday employers
3. **`scripts/workday-scraper-runner.js`**: Runner script to execute scrapers

## Quick Start

### Run scraper for a specific employer:
```bash
node scripts/workday-scraper-runner.js uhs
```

### Run scrapers for all configured employers:
```bash
node scripts/workday-scraper-runner.js
```

### Test mode (don't save to database):
```bash
node scripts/workday-scraper-runner.js uhs --no-save
```

### Limit pages for testing:
```bash
node scripts/workday-scraper-runner.js uhs --max-pages 2
```

## Adding a New Employer

### Step 1: Identify the Workday URL

Workday URLs typically follow this pattern:
- `https://company.wd12.myworkdayjobs.com/careers`
- `https://company.wd1.myworkdayjobs.com/careers`

### Step 2: Find Filter Parameters

1. Go to the employer's Workday career page
2. Apply filters (e.g., "Nursing", "Registered Nurse", job family group)
3. Copy the URL with all filter parameters

Example:
```
https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1?jobFamilyGroup=51ad2a131e9d101654b4e5de9a300000
```

Common filter parameters:
- `jobFamilyGroup`: Job family/category ID (e.g., "Nursing Care")
- `keyword`: Search keyword (e.g., "nurse")
- `location`: Location filter (e.g., "New York, NY")

### Step 3: Add Configuration

Edit `scripts/workday-employer-configs.js` and add a new entry:

```javascript
'employer-slug': {
  employerName: 'Employer Name',
  baseUrl: 'https://employer.wd12.myworkdayjobs.com/careers',
  searchUrl: 'https://employer.wd12.myworkdayjobs.com/careers?jobFamilyGroup=xxx&keyword=nurse',
  careerPageUrl: 'https://employer.wd12.myworkdayjobs.com/careers',
  filters: {
    jobFamilyGroup: 'xxx', // Optional
    keyword: 'nurse',      // Optional
    location: 'City, ST'   // Optional
  },
  selectors: {
    // Only specify if default selectors don't work
    // Most Workday sites use the same selectors
  }
}
```

**Important**: Use a URL-friendly slug for the key (e.g., `'uhs'`, `'cleveland-clinic'`).

### Step 4: Test the Configuration

Run the scraper in test mode:
```bash
node scripts/workday-scraper-runner.js employer-slug --no-save --max-pages 2
```

Check the output to ensure:
- Jobs are being found
- Job titles and links are extracted correctly
- Location information is parsed properly

### Step 5: Custom Selectors (if needed)

If the default Workday selectors don't work for a specific employer, you can override them:

```javascript
selectors: {
  jobCard: '[data-automation-id="customJobCard"]',
  jobTitle: '[data-automation-id="customJobTitle"]',
  jobLocation: '[data-automation-id="customLocation"]',
  jobLink: 'a[data-automation-id="customLink"]',
  paginationNext: 'button[aria-label="Next Page"]',
  jobDescription: '[data-automation-id="customDescription"]'
}
```

**Default selectors** (work for most Workday sites):
- `jobCard`: `[data-automation-id="jobTitle"]`
- `jobTitle`: `[data-automation-id="jobTitle"]`
- `jobLocation`: `[data-automation-id="jobPostingHeader"]`
- `jobLink`: `a[data-automation-id="jobTitle"]`
- `paginationNext`: `button[aria-label*="next" i]`
- `loadMoreButton`: `button[data-automation-id="loadMoreJobs"]`
- `jobDescription`: `[data-automation-id="jobPostingDescription"]`

## How It Works

### 1. Job Collection Phase

The scraper:
1. Navigates to the search URL with filters applied
2. Extracts all job listings from the page
3. Tries to load more jobs (via "Load More" button or infinite scroll)
4. Continues until no new jobs are found

### 2. RN Filtering Phase

The scraper filters jobs to keep only RN positions:
- Excludes non-RN titles (LPN, CNA, Surgical Tech, etc.)
- Checks for RN/Registered Nurse mentions in title or description
- Excludes jobs that mention RN in supporting role context (e.g., "assists RN")

### 3. Job Detail Extraction Phase

For each RN job:
1. Navigates to the job detail page
2. Extracts full description, location, requirements, etc.
3. Validates RN requirement
4. Normalizes data (city, state, job type, specialty, etc.)

### 4. Data Normalization

All data is normalized using the same utilities as other scrapers:
- State names → 2-letter codes (e.g., "Ohio" → "OH")
- City names → Proper capitalization
- Job types → Standard values ("full-time", "part-time", "prn", "contract")
- Specialty detection from title/description
- Experience level detection

### 5. Database Storage

Jobs are saved to the database following the same data contract as other scrapers.

## Troubleshooting

### No jobs found

1. **Check the search URL**: Make sure filters are applied correctly
2. **Check selectors**: The default selectors might not work for this employer
3. **Inspect the page**: Use browser DevTools to find the correct selectors

### Jobs found but not being processed

1. **Check RN filtering**: Jobs might be filtered out if they don't mention RN
2. **Check description extraction**: Job descriptions might not be loading
3. **Check validation errors**: Look for validation error messages in the output

### Custom selectors not working

1. **Inspect the page**: Use browser DevTools to find the actual selectors
2. **Check data-automation-id**: Workday uses these attributes for automation
3. **Try alternative selectors**: Some employers might use different class names

## Example: United Health Services (UHS)

```javascript
'uhs': {
  employerName: 'United Health Services',
  baseUrl: 'https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1',
  searchUrl: 'https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1?jobFamilyGroup=51ad2a131e9d101654b4e5de9a300000',
  careerPageUrl: 'https://nyuhs.wd12.myworkdayjobs.com/nyuhscareers1',
  filters: {
    jobFamilyGroup: '51ad2a131e9d101654b4e5de9a300000' // Nursing Care
  },
  selectors: {} // Uses defaults
}
```

## Best Practices

1. **Test first**: Always test with `--no-save` and `--max-pages 2` before running full scrape
2. **Use specific filters**: Apply filters in the URL to reduce the number of jobs to process
3. **Document custom selectors**: If you add custom selectors, add a comment explaining why
4. **Keep configs simple**: Only override selectors if absolutely necessary
5. **Monitor results**: Check the summary output to ensure jobs are being found and processed

## Integration with Existing System

The Workday scraper:
- Uses the same `JobBoardService` for database operations
- Follows the same data contract as other scrapers
- Uses the same normalization utilities (`jobScraperUtils.js`)
- Outputs the same data format for consistency

This means Workday-scraped jobs are indistinguishable from jobs scraped by other methods in your database.

## Future Enhancements

Potential improvements:
- Support for RSS/XML feeds if available
- Automatic filter parameter discovery
- Better pagination detection
- Support for different Workday versions (wd1, wd12, etc.)

