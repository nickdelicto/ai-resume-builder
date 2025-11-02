# Scraper Data Contract

## Overview
This document defines the **standard data format** that all healthcare employer job scrapers must output. This ensures consistency across all scrapers and proper database storage.

**Important**: All scrapers must conform to this contract, even if some fields are optional.

---

## Required Output Format

All scrapers must return an array of job objects in the following format:

```javascript
[
  {
    // ===== REQUIRED FIELDS =====
    title: "ICU Registered Nurse",           // Job title (REQUIRED)
    location: "Mayfield Heights, OH 44124",  // Full location string (REQUIRED)
    city: "Mayfield Heights",                // Normalized city name (REQUIRED)
    state: "OH",                              // State abbreviation (REQUIRED) - MUST be 2-letter code
    description: "Full job description...",   // Job description (REQUIRED) - at least 50 chars
    sourceUrl: "https://jobs.clevelandclinic.org/job/12345/...", // Original job URL (REQUIRED)
    
    // ===== EMPLOYER INFORMATION =====
    employerName: "Cleveland Clinic",       // Company name (REQUIRED)
    employerSlug: "cleveland-clinic",       // URL-friendly version (REQUIRED) - lowercase, hyphens
    careerPageUrl: "https://jobs.clevelandclinic.org/", // Their career page (REQUIRED)
    
    // ===== OPTIONAL BUT HIGHLY RECOMMENDED FIELDS =====
    zipCode: "44124",                        // Optional but extract if available
    isRemote: false,                          // Boolean, default false
    
    // Job Classification
    jobType: "full-time",                     // Options: "full-time", "part-time", "prn", "contract"
    specialty: "ICU",                         // Options: "ICU", "ER", "Travel", "Med-Surg", "Home Health", "Hospice", "Ambulatory", etc.
    experienceLevel: "experienced",          // Options: "new-grad", "experienced", "senior"
    
    // Job Details
    requirements: "RN license required...",  // Qualifications/requirements text
    responsibilities: "Patient care duties...", // Job responsibilities text
    benefits: "Health insurance, 401k...",   // Benefits information
    department: "Hillcrest Hospital",        // Department or facility name
    
    // Compensation (if available)
    salaryMin: 65000,                         // Minimum salary (integer)
    salaryMax: 85000,                         // Maximum salary (integer)
    salaryCurrency: "USD",                    // Default "USD"
    
    // Source Tracking
    sourceJobId: "22583653",                 // Job ID from employer's system (for deduplication)
    
    // Dates
    postedDate: "2024-01-15T00:00:00Z",      // ISO 8601 format, null if not available
    expiresDate: "2024-02-15T00:00:00Z",     // ISO 8601 format, null if not available
  }
]
```

---

## Field Details & Rules

### Title
- **Required**: Yes
- **Format**: String, max 255 characters
- **Rules**: 
  - Capitalize properly
  - Remove extra whitespace
  - Keep original employer wording

### Location Fields
- **location**: Full address string (e.g., "Mayfield Heights, OH 44124")
- **city**: Normalized city name
  - Capitalize properly: "Mayfield Heights" not "mayfield heights"
  - Handle abbreviations: "St." vs "Saint"
  - Remove trailing punctuation
- **state**: MUST be 2-letter uppercase code (OH, CA, NY, TX, etc.)
  - Use standard US state abbreviations
  - Convert full state names to abbreviations if needed
- **zipCode**: Optional, 5-digit format preferred

### Description
- **Required**: Yes
- **Min Length**: 50 characters
- **Format**: Plain text (strip HTML tags)
- **Rules**: 
  - Remove HTML markup
  - Remove excessive whitespace/newlines
  - Keep original content intact

### Source URL
- **Required**: Yes
- **Format**: Full absolute URL
- **Rules**: 
  - Must be unique per job
  - Must be the direct link to the job posting
  - Used for deduplication

### Employer Fields
- **employerName**: Official company name as it appears on their website
- **employerSlug**: URL-friendly version
  - Lowercase
  - Replace spaces with hyphens
  - Remove special characters
  - Examples: "cleveland-clinic", "kaiser-permanente", "hca-healthcare"
- **careerPageUrl**: Main career page URL (where we scrape from)

### Job Classification
- **jobType**: Standardize to these values:
  - `"full-time"` (not "Full-Time", "FT", etc.)
  - `"part-time"` 
  - `"prn"` (for PRN/per diem positions)
  - `"contract"` (for contract/temporary positions)
  - `null` if not specified

- **specialty**: Extract from title/description
  - Common values: "ICU", "ER", "Emergency", "Travel", "Med-Surg", "Home Health", "Hospice", "Ambulatory", "OR", "Pediatrics", "Geriatrics", "Oncology"
  - Use title case
  - `null` if not specified

- **experienceLevel**: Standardize to:
  - `"new-grad"` (new graduate, entry-level)
  - `"experienced"` (requires experience)
  - `"senior"` (senior/lead positions)
  - `null` if not specified

### Compensation
- **salaryMin/salaryMax**: Integers (not strings)
- Extract from description if listed
- Convert to annual salary if hourly (multiply hourly rate by 2080)
- `null` if not available

### Dates
- **Format**: ISO 8601 string (e.g., "2024-01-15T00:00:00Z")
- **postedDate**: When job was posted
- **expiresDate**: When job expires/closes
- Use `null` if not available

---

## Data Normalization Functions

### Location Normalization
```javascript
// Example function to normalize state
function normalizeState(stateInput) {
  const stateMap = {
    'ohio': 'OH',
    'california': 'CA',
    'new york': 'NY',
    'texas': 'TX',
    // ... etc
  };
  
  const normalized = stateInput.toLowerCase().trim();
  return stateMap[normalized] || stateInput.toUpperCase().slice(0, 2);
}

// Example function to normalize city
function normalizeCity(cityInput) {
  return cityInput
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
```

### Employer Slug Generation
```javascript
function generateEmployerSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}
```

### Job Type Normalization
```javascript
function normalizeJobType(typeInput) {
  const typeMap = {
    'full-time': 'full-time',
    'fulltime': 'full-time',
    'ft': 'full-time',
    'f/t': 'full-time',
    'part-time': 'part-time',
    'parttime': 'part-time',
    'pt': 'part-time',
    'p/t': 'part-time',
    'prn': 'prn',
    'per diem': 'prn',
    'per-diem': 'prn',
    'contract': 'contract',
    'temporary': 'contract',
    'temp': 'contract',
  };
  
  return typeMap[typeInput.toLowerCase()] || null;
}
```

---

## Specialty Detection

Extract specialty from job title and description:

```javascript
function detectSpecialty(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('icu') || text.includes('intensive care')) return 'ICU';
  if (text.includes('emergency') || text.includes('er ')) return 'ER';
  if (text.includes('travel')) return 'Travel';
  if (text.includes('home health')) return 'Home Health';
  if (text.includes('hospice')) return 'Hospice';
  if (text.includes('ambulatory')) return 'Ambulatory';
  if (text.includes('med-surg') || text.includes('medical surgical')) return 'Med-Surg';
  // ... etc
  
  return null;
}
```

---

## Error Handling

If a required field cannot be extracted:
1. **Log a warning** with job details
2. **Skip that job** (don't include incomplete data)
3. **Continue scraping** other jobs

If an optional field cannot be extracted:
1. Set to `null` or appropriate default
2. Continue processing

---

## Validation Checklist

Before saving to database, validate:
- [ ] All required fields present
- [ ] State is 2-letter uppercase code
- [ ] City is properly capitalized
- [ ] Description is at least 50 characters
- [ ] Source URL is absolute and unique
- [ ] Employer slug is URL-friendly
- [ ] Job type is one of the standard values or null
- [ ] Dates are in ISO 8601 format or null
- [ ] Salary values are integers or null

---

## Example Output

```javascript
[
  {
    title: "ICU Registered Nurse",
    location: "Mayfield Heights, OH 44124",
    city: "Mayfield Heights",
    state: "OH",
    zipCode: "44124",
    isRemote: false,
    description: "We are seeking an experienced ICU Registered Nurse to join our team...",
    sourceUrl: "https://jobs.clevelandclinic.org/job/22583653/rn-warrensville-hts-oh/",
    employerName: "Cleveland Clinic",
    employerSlug: "cleveland-clinic",
    careerPageUrl: "https://jobs.clevelandclinic.org/",
    jobType: "full-time",
    specialty: "ICU",
    experienceLevel: "experienced",
    requirements: "Active RN license, BSN preferred, 2+ years ICU experience",
    department: "Hillcrest Hospital",
    sourceJobId: "22583653",
    salaryMin: null,
    salaryMax: null,
    postedDate: "2024-01-15T00:00:00Z",
    expiresDate: null
  }
]
```

---

## Notes for Developers

1. **Always normalize data** - Don't save raw scraped data directly
2. **Handle missing fields gracefully** - Use null for optional fields
3. **Log warnings** - If you can't extract required fields, log it
4. **Test with real data** - Validate output against this contract before deploying
5. **Update this contract** - If you discover new fields needed, update this document first

---

## Questions?

If you encounter edge cases or need clarification on any field, update this document and notify the team.
