# Programmatic SEO Pages - Implementation Plan

## Overview
Create programmatic SEO pages to rank for location-based and specialty-based searches. These pages will drive massive organic traffic.

## Page Structure

### 1. State-Level Pages
- **URL Pattern:** `/jobs/nursing/[state]`
- **Example:** `/jobs/nursing/ohio`, `/jobs/nursing/california`
- **Purpose:** Rank for "RN jobs in [State]" queries
- **Content:** List of all RN jobs in that state, with city breakdown

### 2. City-Level Pages  
- **URL Pattern:** `/jobs/nursing/[state]/[city]`
- **Example:** `/jobs/nursing/ohio/cleveland`, `/jobs/nursing/california/los-angeles`
- **Purpose:** Rank for "RN jobs in [City], [State]" queries
- **Content:** List of all RN jobs in that city

### 3. Specialty Pages
- **URL Pattern:** `/jobs/nursing/specialty/[specialty]`
- **Example:** `/jobs/nursing/specialty/icu`, `/jobs/nursing/specialty/travel`
- **Purpose:** Rank for "[Specialty] RN jobs" queries
- **Content:** List of all jobs for that specialty

### 4. Combined Pages (Future Enhancement)
- **URL Pattern:** `/jobs/nursing/[state]/specialty/[specialty]`
- **Example:** `/jobs/nursing/ohio/specialty/icu`
- **Purpose:** Rank for highly specific queries

### 5. Employer Pages
- **URL Pattern:** `/jobs/nursing/employer/[employerSlug]`
- **Example:** `/jobs/nursing/employer/cleveland-clinic`
- **Purpose:** Rank for "[Employer] RN jobs" queries

## SEO Strategy

### Meta Tags
- Dynamic titles: "RN Jobs in [Location] | IntelliResume"
- Dynamic descriptions: Include job count, location, specialty
- Keywords: Location + specialty + job type keywords

### Structured Data
- CollectionPage schema for listing pages
- JobPosting schema snippets in lists
- BreadcrumbList for navigation

### Internal Linking
- State pages link to city pages
- City pages link back to state and specialty pages
- Specialty pages link to location-specific specialty pages

## Implementation Priority

**Phase 1 (High Priority):**
1. State-level pages (highest volume searches)
2. Specialty pages (highly targeted)

**Phase 2 (Medium Priority):**
3. City-level pages (local SEO goldmine)
4. Employer pages (brand-specific searches)

**Phase 3 (Future):**
5. Combined pages (location + specialty)
6. Dynamic sitemap generation

## Technical Details

### API Routes Needed
- `/api/jobs/by-state/[state]` - Get jobs by state
- `/api/jobs/by-city/[state]/[city]` - Get jobs by city
- `/api/jobs/by-specialty/[specialty]` - Get jobs by specialty
- `/api/jobs/by-employer/[employerSlug]` - Get jobs by employer

### Data Requirements
- Query jobs grouped by state/city/specialty
- Aggregate statistics (job counts, specialties available)
- Related locations for internal linking

### Performance
- Use getStaticProps/getStaticPaths for static generation
- Generate pages at build time for top locations
- ISR (Incremental Static Regeneration) for updates

