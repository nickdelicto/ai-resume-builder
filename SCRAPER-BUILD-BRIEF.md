# Scraper Development Brief - Northwell Health RN Scraper

## Project Context
Building a web scraper for Northwell Health (largest healthcare system in NY) to collect Registered Nurse (RN) job postings. This follows the same pattern as the completed Cleveland Clinic scraper.

## Reference Implementation
**File:** `scripts/cleveland-clinic-rn-scraper-production.js`
- Complete working scraper with RN filtering, pagination, and data extraction
- Use this as the template/pattern for Northwell scraper

## Key Components & Patterns

### 1. Scraper Class Structure
The scraper should follow this structure:
```javascript
class NorthwellHealthRNScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://jobs.northwell.edu/'; // UPDATE THIS
    this.searchUrl = 'https://jobs.northwell.edu/search?q=nurse'; // UPDATE THIS
    this.employerName = 'Northwell Health';
    this.employerSlug = generateEmployerSlug(this.employerName); // Uses utility
    // ... other config
    this.maxPages = options.maxPages || null; // null = no limit (100 max)
  }
}
```

### 2. Required Methods (Copy Pattern from Cleveland Clinic)

#### Core Scraping Methods:
- `scrapeRNJobs()` - Main entry point
- `collectAllJobsFromAllPages(page)` - Handles pagination (stops after 2 consecutive empty pages)
- `extractJobListings(page)` - Extracts job cards from listing page
- `getJobDetails(page, job)` - Navigates to job detail page and extracts full info
- `navigateToPage(page, pageNum)` - Handles pagination navigation
- `getTotalPages(page)` - Gets visible page count (may be inaccurate due to dynamic loading)

#### RN Filtering Methods (CRITICAL):
- `filterRNJobs(jobListings)` - First pass filter (removes obvious non-RN titles)
- `processJob(page, job)` - Detailed validation (checks for RN requirement)
- `isNonRNTitle(title)` - Excludes titles like "Surgical Technologist", "LPN", "CNA", etc.
- `hasRNExclusionContext(text)` - Detects "assists RN", "works with RN" patterns (exclude these)
- `isPlaceholderDescription(description)` - Detects incomplete descriptions (exclude)
- `hasRNMention(text)` - Checks for explicit "RN" or "Registered Nurse" mention

**Filtering Logic (IMPORTANT):**
1. Exclude by title if matches non-RN roles (Surgical Tech, LPN, CNA, etc.)
2. Exclude if RN mentioned in supporting context ("assists RN", "works with RN")
3. Exclude if placeholder description (even if title has RN)
4. Require explicit "RN" or "Registered Nurse" in title OR full description

#### Data Extraction (from `getJobDetails`):
- Title, Location, Description
- Salary: Look for "Minimum hourly:", "Maximum hourly:", "Minimum Annual Salary:", "Maximum Annual Salary:"
- Salary Type: Set to "hourly" or "annual" based on what's found
- Shift Type: Look for "Shift:" metadata, normalize to "days", "nights", "evenings", "variable", "rotating"
- Employment Type: Look for "Schedule:" or similar metadata

#### Data Normalization (in `processJob`):
- Use utilities from `lib/jobScraperUtils.js`:
  - `normalizeState()`, `normalizeCity()`, `normalizeJobType()`
  - `detectSpecialty()`, `detectExperienceLevel()`
  - `generateJobSlug()`, `generateEmployerSlug()`
  - `validateJobData()`
- Calculate normalized salary values:
  - `salaryMinHourly`, `salaryMaxHourly` (convert annual using /2080 if needed)
  - `salaryMinAnnual`, `salaryMaxAnnual` (convert hourly using *2080 if needed)

### 3. Database Integration
**File:** `lib/services/JobBoardService.js`
- Use `JobBoardService` class to save jobs
- Call `saveJobs(jobsArray, options)` method
- Handles deduplication by `sourceUrl`
- Creates/updates `HealthcareEmployer` records automatically
- Sets `isActive` status and expiry dates

### 4. Data Contract
**File:** `docs/scraper-data-contract.md`
The normalized job object must include:
```javascript
{
  // Required
  title: string,
  location: string,
  city: string,
  state: string (2-letter code),
  description: string,
  sourceUrl: string,
  
  // Employer
  employerName: string,
  employerSlug: string,
  careerPageUrl: string,
  
  // Optional but recommended
  zipCode: string | null,
  isRemote: boolean,
  jobType: string, // normalized: "full-time", "part-time", "prn", "contract"
  shiftType: string, // "days", "nights", "evenings", "variable", "rotating"
  specialty: string | null,
  experienceLevel: string | null,
  
  // Salary (if available)
  salaryMin: number | null,
  salaryMax: number | null,
  salaryType: "hourly" | "annual" | null,
  salaryMinHourly: number | null, // normalized
  salaryMaxHourly: number | null,
  salaryMinAnnual: number | null,
  salaryMaxAnnual: number | null,
  
  // Generated
  slug: string, // from generateJobSlug()
  metaDescription: string,
  keywords: string[]
}
```

### 5. Schema Fields (Database)
**File:** `prisma/schema.prisma` - `NursingJob` model
All fields are already defined. Key fields:
- `salaryType`, `salaryMinHourly`, `salaryMaxHourly`, `salaryMinAnnual`, `salaryMaxAnnual`
- `shiftType`
- `slug`, `metaDescription`, `keywords`

## Implementation Steps for Northwell

1. **Research Northwell's Job Site Structure**
   - Find the careers/jobs page URL
   - Identify job listing page structure (CSS selectors for job cards)
   - Identify pagination mechanism (URL params, buttons, infinite scroll)
   - Test navigation to a job detail page

2. **Adapt Cleveland Clinic Scraper**
   - Copy `cleveland-clinic-rn-scraper-production.js` → `northwell-health-rn-scraper-production.js`
   - Update class name to `NorthwellHealthRNScraper`
   - Update URLs (baseUrl, searchUrl)
   - Update `employerName` to "Northwell Health"
   - Update CSS selectors in `extractJobListings()` and `getJobDetails()`
   - Update pagination logic if needed (check if URL params vs buttons)
   - Update salary/shift extraction patterns to match Northwell's format

3. **Test Filtering Logic**
   - Run scraper with `maxPages: 2` for testing
   - Verify only RN jobs are captured
   - Check that LPN, CNA, Surgical Tech jobs are excluded
   - Verify salary and shift data extraction

4. **Test Database Integration**
   - Run full scrape (or limited pages)
   - Verify jobs are saved to database
   - Check employer record is created
   - Verify salary normalization works

## Key Differences to Expect

Northwell's site structure will likely differ:
- Different CSS class names/selectors
- Different pagination mechanism
- Different metadata format (salary, shift, location may be in different places)
- Different job detail page layout

**Solution:** Inspect Northwell's site using browser dev tools, identify selectors, then adapt the extraction logic.

## Testing Pattern

```javascript
// Test with limited pages
const scraper = new NorthwellHealthRNScraper({ maxPages: 2 });
const result = await scraper.scrapeRNJobs();
console.log(result);
```

## Important Notes

1. **RN Filtering is Critical** - Only capture jobs that explicitly require RN license
2. **Case Sensitivity Fix** - The LPN filter had a bug (fixed in Cleveland Clinic) - ensure `nonRNTitle.toLowerCase()` is used
3. **Pagination** - Don't trust initial page count, use "2 consecutive empty pages" to detect end
4. **Respectful Scraping** - Add delays between requests (2-3 seconds)
5. **Error Handling** - Jobs that fail validation should be logged but not crash the scraper

## Files to Reference

- **Template:** `scripts/cleveland-clinic-rn-scraper-production.js` (full implementation)
- **Utilities:** `lib/jobScraperUtils.js` (normalization functions)
- **Database Service:** `lib/services/JobBoardService.js` (saveJobs method)
- **Schema:** `prisma/schema.prisma` (NursingJob model)
- **Data Contract:** `docs/scraper-data-contract.md`

## Next Steps After Scraper is Built

1. Test scraper with limited pages
2. Verify RN filtering works correctly
3. Run full scrape
4. Verify data appears on frontend job listing pages
5. Add to cron job/automation if needed

---

**Current Status:** Cleveland Clinic scraper is complete and working. Need to build Northwell Health scraper following the same pattern.


