# Project Handoff: AI Resume Builder - RN Job Board & Scraper

## Project Overview
Building a programmatic SEO job board for Registered Nurse (RN) positions with web scraping, database management, and comprehensive SEO implementation.

## Tech Stack
- **Framework**: Next.js 14 (Pages Router)
- **Database**: PostgreSQL with Prisma ORM
- **Scraping**: Puppeteer
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js

## What's Been Built

### 1. Database Schema (`prisma/schema.prisma`)
- **HealthcareEmployer**: Employer records (Cleveland Clinic, etc.)
- **NursingJob**: Job postings with location, specialty, job type, expiry tracking
- **Location**: Normalized location reference table
- **Key Fields**:
  - `isActive`: Boolean flag for active/inactive jobs
  - `expiresDate`: Explicit expiry from source (nullable)
  - `calculatedExpiresDate`: Auto-calculated 60-day expiry if no explicit date
  - Indexes on: `[state, city]`, `[specialty]`, `[employerId, isActive]`, `[slug]`

### 2. Programmatic SEO Pages (All Complete)

#### State Pages: `/jobs/nursing/[slug]` 
- Example: `/jobs/nursing/oh` or `/jobs/nursing/ohio`
- Shows all RN jobs in a state
- Stats cards: Top 5 Cities, Top 5 Specialties, Top 5 Employers
- Footer: Browse by City (all cities in state)
- SEO: Dynamic meta tags, CollectionPage schema, BreadcrumbList

#### City Pages: `/jobs/nursing/[slug]/[city]`
- Example: `/jobs/nursing/oh/cleveland`
- Shows RN jobs in a specific city
- Stats cards: Top 5 Specialties, Top 5 Employers
- Footer: Browse by State (all states)
- SEO: Full implementation with structured data

#### Specialty Pages: `/jobs/nursing/specialty/[specialty]`
- Example: `/jobs/nursing/specialty/icu`
- Shows RN jobs for a specialty
- Stats cards: Top 5 States, Top 5 Cities, Top 5 Employers
- Footer: Browse by Specialty (all specialties)
- Handles slug variations (hyphens, spaces, case)

#### Employer Pages: `/jobs/nursing/employer/[employerSlug]`
- Example: `/jobs/nursing/employer/cleveland-clinic`
- Shows all jobs from specific employer
- Stats cards: Top 5 States, Top 5 Cities, Top 5 Specialties
- Footer: Browse by State

### 3. API Routes
All routes filter by `isActive = true` for listings, but allow inactive job detail access:
- `/api/jobs/list` - Paginated job listings with filters
- `/api/jobs/[slug]` - Single job detail (works for inactive jobs)
- `/api/jobs/by-state/[state]` - State jobs with stats
- `/api/jobs/by-state/[state]/[city]` - City jobs with stats
- `/api/jobs/by-specialty/[specialty]` - Specialty jobs with stats
- `/api/jobs/by-employer/[employerSlug]` - Employer jobs with stats

### 4. Job Expiration & Active Status Management

**Location**: `lib/services/JobBoardService.js`

**Key Methods**:
- `calculateExpiry()`: Uses `expiresDate` if provided, otherwise `scrapedAt + 60 days`
- `extendExpiryForReFoundJob()`: Extends by 60 days when job re-found during scraping
- `deactivateExpiredJobs()`: Bulk deactivates expired jobs
- `verifyActiveJobs()`: Marks jobs inactive if not found in current scrape
- `saveJob()`: Handles expiry calculation, reactivation, extension
- `saveJobs()`: Auto-verifies active jobs and deactivates missing ones

**Logic**:
- Jobs with explicit `expiresDate`: Use that date
- Jobs without expiry: Calculate 60 days from first scrape
- When re-found: Extend calculated expiry by 60 days from current scrape
- During scraping: Mark jobs inactive if not found in source
- Expired jobs: Auto-deactivated (checks both `expiresDate` and `calculatedExpiresDate`)

### 5. Job Detail Page Updates
**Location**: `pages/jobs/nursing/[slug].jsx`

**Features**:
- Shows amber banner for inactive jobs: "This Position is No Longer Available"
- SEO: Adds `noindex` meta tag for inactive jobs (active jobs remain indexable)
- Page still accessible for SEO (no 404), but hidden from listings

### 6. Web Scraper Implementation
**Location**: `scripts/cleveland-clinic-rn-scraper-production.js`

**Features**:
- **Pagination**: Automatically loops through all pages (uses `&pg=X` URL parameter)
- **Two-Phase Approach**:
  1. Phase 1: Collect all jobs from all pages first
  2. Phase 2: Process detailed info for each job
- **Methods**:
  - `getTotalPages()`: Detects total pages from pagination
  - `navigateToPage()`: Navigates using URL parameter `&pg=X`
  - `collectAllJobsFromAllPages()`: Loops through all pages collecting jobs
- **Safety**: Max 50 pages, stops after 2 consecutive empty pages
- **Delays**: 2-3 seconds between pages/requests
- **Removed**: Testing limit (`slice(0, 5)`) - now processes ALL jobs

**Current Status**: Ready for production, collects jobs from all 6 pages

### 7. SEO Implementation
**Location**: `lib/seo/jobSEO.js`

**Functions**:
- `generateJobMetaTags()`: Individual job pages
- `generateStatePageMetaTags()`: State pages
- `generateCityPageMetaTags()`: City pages
- `generateSpecialtyPageMetaTags()`: Specialty pages
- `generateEmployerPageMetaTags()`: Employer pages
- `generateJobPostingSchema()`: Google Jobs structured data

**Structured Data**:
- `JobPosting` schema for individual jobs
- `CollectionPage` schema for listing pages
- `BreadcrumbList` schema for navigation

## Key File Locations

### Core Files
- Schema: `prisma/schema.prisma`
- Job Service: `lib/services/JobBoardService.js`
- Scraper: `scripts/cleveland-clinic-rn-scraper-production.js`
- SEO Utils: `lib/seo/jobSEO.js`
- Scraper Utils: `lib/jobScraperUtils.js`

### Pages
- State/City: `pages/jobs/nursing/[slug].jsx` (handles both state and job detail)
- City: `pages/jobs/nursing/[slug]/[city].jsx`
- Specialty: `pages/jobs/nursing/specialty/[specialty].jsx`
- Employer: `pages/jobs/nursing/employer/[employerSlug].jsx`

## Internal Linking Strategy

### Stats Cards (Top 5)
- **State Pages**: Top Cities, Top Specialties, Top Employers (all clickable)
- **City Pages**: Top Specialties, Top Employers (all clickable)
- **Specialty Pages**: Top States, Top Cities, Top Employers (all clickable)
- **Employer Pages**: Top States, Top Cities, Top Specialties (all clickable)

### Footer Sections
- **State Pages**: "Browse RN Jobs by City" (all cities in state)
- **City Pages**: "Browse RN Jobs by State" (all states)
- **Specialty Pages**: "Browse RN Jobs by Specialty" (all specialties)
- **Employer Pages**: "Browse RN Jobs by State" (all states)

## Current Status & Next Steps

### ✅ Completed
- Database schema with expiry tracking
- All programmatic SEO page types
- Job expiration/active status management
- Pagination scraper for all pages
- SEO meta tags and structured data
- Internal linking strategy
- Inactive job handling (banner, noindex)

### 🚧 Next Steps (Recommended)
1. **Scraper Testing**: Run full scraper to collect all Cleveland Clinic RN jobs
2. **Additional Employers**: Build scrapers for other healthcare employers
3. **Scraping Scheduler**: Set up cron jobs for weekly scraping
4. **Monitoring**: Add logging/alerting for scraper failures
5. **Performance**: Optimize database queries if needed as data grows
6. **Archiving**: Implement long-term archiving for jobs inactive > 1 year

## Important Notes

### Routing
- `[slug].jsx` handles both job detail pages AND state pages (detects if slug is a state)
- State pages: `/jobs/nursing/oh` or `/jobs/nursing/ohio`
- City pages: `/jobs/nursing/oh/cleveland` (nested route)
- Must use same parameter names at same level (`[slug]` not `[state]`)

### Scraper Usage
```bash
node scripts/cleveland-clinic-rn-scraper-production.js
```

### Database Migration
```bash
npx prisma migrate dev
npx prisma db push  # If migrations have drift
```

### Test Inactive Jobs
```bash
node scripts/test-inactive-job.js      # Mark a job inactive
node scripts/reactivate-test-job.js    # Reactivate it
```

## Key Design Decisions

1. **No Hard Deletes**: Jobs marked `isActive = false`, never deleted (for SEO)
2. **Two-Phase Scraping**: Collect all jobs first, then process details (efficient)
3. **URL Parameter Pagination**: Uses `&pg=X` for reliability
4. **Automatic Expiry Extension**: Jobs re-found extend their expiry automatically
5. **Comprehensive Internal Linking**: Top cards + footer sections for SEO
6. **Dynamic Page Detection**: State vs job page detected intelligently in `[slug].jsx`

## Questions for Next Agent
- What specific feature needs work?
- Any errors encountered?
- Which employer to add next?

---

**Last Updated**: Current implementation complete and ready for production scraping

