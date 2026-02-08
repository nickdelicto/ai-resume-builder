# Credential Vault & Smart Apply - Feature Roadmap

> **Status:** Planning Phase
> **Last Updated:** 2026-02-04
> **Priority:** High - Core monetization differentiator

---

## Executive Summary

Build a **Credential Vault** system that stores and manages nursing credentials, enabling a **"Smart Apply"** feature that dramatically reduces job application time from 45+ minutes to under 2 minutes. This positions IntelliResume as "LinkedIn Easy Apply for Nursing" rather than another generic auto-apply bot.

**Key Insight:** The real barrier in nursing job applications isn't form-filling—it's credential management. Nurses must repeatedly provide the same licenses, certifications, work history, and references for every application. Solving THIS problem creates a defensible moat.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution](#the-solution-credential-vault--smart-apply)
3. [Competitive Analysis](#competitive-analysis)
4. [Credential Verification Strategy](#credential-verification-strategy)
5. [Implementation Options](#implementation-options)
6. [Resume & Cover Letter Integration](#resume--cover-letter-integration)
7. [User Flows](#user-flows)
8. [Data Model](#data-model)
9. [Value Proposition](#value-proposition)
10. [Monetization](#monetization-tiers)
11. [Implementation Phases](#implementation-phases)
12. [MVP Definition](#mvp-definition)
13. [Open Questions](#open-questions)
14. [Success Metrics](#success-metrics)
15. [References](#references)

---

## The Problem

### Current Nurse Job Application Pain Points

Every time a nurse applies to a job, they must:
1. Re-enter the same license info (copy/paste from notes or memory)
2. Re-upload the same PDF of their BLS card
3. Re-type their work history in slightly different formats
4. Fill out a 50-100 question skills checklist
5. Provide references (again) who get bombarded with calls
6. Sign background check authorization (again)

**This takes 30-60 minutes PER APPLICATION.**

Industry data shows hospitals take **62-103 days on average** to hire an experienced RN, with much of that delay caused by credential verification back-and-forth.

### Why Generic Auto-Apply Tools Fail for Nursing

| Generic Auto-Apply | Nursing Reality |
|-------------------|-----------------|
| Fills forms blindly | Nursing forms have specialized fields (license #, NPI, unit types) |
| No verification | Healthcare requires verified credentials |
| "Spray and pray" reputation | Employers add barriers against mass applications |
| Tech job focused | Doesn't understand nursing specialties, certifications, or compliance |

### The Auto-Apply Market Problem

From [Harvard Business Review (Jan 2026)](https://hbr.org/2026/01/ai-has-made-hiring-worse-but-it-can-still-help):
> "AI has made hiring a noisy, crowded arms race of automation... with a rising crisis of trust."

From [The Interview Guys](https://blog.theinterviewguys.com/auto-apply-job-bots-might-feel-smart-but-theyre-killing-your-chances/):
> "These tools submit irrelevant applications with embarrassing errors... Networking has become more crucial than ever as employers retreat behind referral walls to escape the flood of AI-generated applications."

**Our Differentiation:** We don't do "spray and pray." We help qualified nurses apply efficiently with verified credentials.

---

## The Solution: Credential Vault + Smart Apply

### Core Concept

Nurses enter their credentials **ONCE** and can apply to jobs **instantly** with verified, pre-filled applications.

### What We Store (Credential Types)

| Category | Items | Notes |
|----------|-------|-------|
| **Licenses** | RN License (state-specific), Compact License (NLC) | Must track: state, number, expiration, verification status |
| **Basic Certifications** | BLS, ACLS, PALS | Expire every 2 years, need renewal reminders |
| **Specialty Certifications** | CCRN, CEN, CNOR, OCN, etc. | Proves expertise, valuable for matching |
| **Education** | Nursing degree (ADN, BSN, MSN), school, graduation | Healthcare verifies differently than other industries |
| **Work History** | Employer, unit, dates, patient ratios, supervisor | Nursing-specific details (not just job titles) |
| **Skills Checklist** | Clinical skills with proficiency ratings | Many hospitals require these lengthy forms |
| **References** | Name, title, contact, relationship | Often required upfront, not post-interview |
| **Immunizations** | Hep B, TB test, COVID, Flu | Compliance requirement at most hospitals |
| **Documents** | PDFs of license, certs, cards | Stored for easy re-upload |

---

## Competitive Analysis

### Incredible Health - The Main Competitor

**Business Model:** "Reverse marketplace" - hospitals apply TO nurses, not the other way around.

| Aspect | Details |
|--------|---------|
| **Who pays** | Hospitals pay, nurses use it FREE |
| **Pricing model** | Not publicly disclosed |
| **Likely fee structure** | 15-25% of first-year salary per hire ($10K-$20K per nurse) OR subscription + per-hire |
| **Value proposition** | [Saves hospitals $2-5M annually](https://www.incrediblehealth.com/blog/how-incredible-health-saves-millions-for-healthcare-employers-through-nurse-hiring-innovation/) per facility in travel nurse/overtime costs |
| **Scale** | 1,500+ hospitals, 1.5M nurses on platform |
| **Valuation** | [$1.65B (2022 Series B)](https://www.incrediblehealth.com/blog/series-b-funding-2022/) |
| **Funding** | $80M Series B led by Andreessen Horowitz |

**Why hospitals pay Incredible Health:**
- Travel nurses cost 2-3x permanent staff salary
- If they place a permanent nurse, hospitals save $50K-$100K/year vs. travel contracts
- Pre-verified candidates = faster time-to-hire
- Reduced HR workload for credential verification

**How We Differentiate:**

| Incredible Health | IntelliResume |
|-------------------|---------------|
| Hospitals apply to nurses | Nurses apply to jobs (traditional flow) |
| Nurses wait to be contacted | Nurses proactively apply |
| B2B revenue model (hospitals pay) | B2C revenue model (nurses pay), B2B potential |
| Platform-only job access | Works with ANY job (our listings + external) |
| No resume building | Full resume builder integrated |
| Passive job search | Active job search with tools |

**Our Positioning:** We're the "self-serve" option for nurses who want control over their job search. Incredible Health is great if you want hospitals to come to you—we're for nurses who want to actively pursue opportunities.

### Other Competitors

| Competitor | Model | Weakness |
|------------|-------|----------|
| **LazyApply** | Generic auto-apply, $99-249 one-time | [1.9 stars on Trustpilot](https://www.trustpilot.com/review/lazyapply.com), doesn't understand nursing |
| **Sonara** | AI job matching | [Went bankrupt Feb 2024](https://www.tealhq.com/post/sonara-review), acquired by BOLD |
| **StaffDNA** | Staffing agency platform | Agency-tied, not independent |
| **LinkedIn Easy Apply** | Generic one-click | No credential management, not nursing-specific |

---

## Credential Verification Strategy

### Option 1: Nursys Integration (FREE - Primary Source for Licenses)

[Nursys](https://www.nursys.com/) is run by NCSBN (National Council of State Boards of Nursing) and is THE authoritative source for nurse license verification in the US.

| Feature | Details |
|---------|---------|
| **[Nursys e-Notify](https://ncsbn.zendesk.com/hc/en-us/sections/4411150544663-Nursys-e-Notify)** | FREE service for automated license status updates |
| **[API Available](https://ncsbn.zendesk.com/hc/en-us/articles/18773959621399-What-is-available-via-the-Nursys-API)** | Yes - build/maintain nurse list, get status updates |
| **What it verifies** | License active/expired/disciplined, expiration dates, compact status |
| **How it works** | Uses birth year + last 4 SSN to match, nightly batch updates |
| **Coverage** | All 50 states + territories |
| **Cost** | FREE for e-Notify service |

**Implementation approach:**
1. Nurse enters license info + birth year + last 4 SSN
2. We submit to Nursys API for verification
3. Nursys returns: active/expired/disciplined status
4. We display "Nursys Verified ✓" badge on profile
5. Ongoing: Nursys notifies us of status changes (expiration, discipline)

**This is a major differentiator** - we can offer "Nursys-verified" credentials at no cost.

### Option 2: Commercial Verification Services (For Certifications)

| Service | What They Verify | Pricing | Notes |
|---------|------------------|---------|-------|
| [Propelus](https://propelus.com/api) | Licenses, certs, registrations | Enterprise pricing | 20+ years of board connectivity |
| [Verifiable](https://verifiable.com/primary-source-verification) | 3,200+ primary sources | Per-verification fee | NCQA credentialed |
| [HealthStream](https://www.healthstream.com/solution/credentialing/cvo-credentials-verification-organization) | Full CVO services | Enterprise | Overkill for our needs |

**Recommendation:** Start with Nursys (free) for licenses. Consider Propelus/Verifiable later for premium "fully verified" tier.

### Option 3: DIY Verification (MVP Approach)

For certifications (BLS, ACLS, specialty certs), start with:

1. **User attestation:** "I certify this information is accurate" with legal terms
2. **Document upload:** Store PDFs of cards/certificates
3. **Basic validation:** Check expiration dates, flag expired
4. **Spot-check sampling:** Manually verify a random sample to build trust
5. **Expiration tracking:** Auto-alert when credentials expire

**Future enhancement:** Add verification badges as premium feature.

### Recommended Verification Strategy

| Credential Type | MVP Approach | Future Enhancement |
|-----------------|--------------|-------------------|
| **RN License** | Nursys e-Notify (FREE) | Real-time API verification |
| **BLS/ACLS** | User attestation + document upload | AHA verification API |
| **Specialty Certs** | User attestation + document upload | Propelus/Verifiable integration |
| **Education** | User attestation | National Student Clearinghouse |
| **Work History** | User attestation | Reference check service |

---

## Implementation Options

### The Reality: Most Employer ATS Systems Are Closed

You **cannot** directly submit applications to Workday, iCIMS, Taleo, etc. via API. These are closed enterprise systems. This is why most auto-apply tools use browser automation (which is fragile and often blocked).

### Option A: Pre-Fill + Redirect (Recommended for MVP)

**How it works:**

```
User sees job on IntelliResume
        ↓
Clicks "Smart Apply"
        ↓
Modal shows:
  - Tailored resume (PDF ready to download)
  - Generated cover letter (PDF ready)
  - Credential "cheat sheet" (copy-paste ready):
    • License #: OH-RN-12345
    • BLS Exp: 2026-03-01
    • ACLS Exp: 2026-03-01
    • Supervisor: Jane Smith, 555-123-4567
        ↓
Click "Continue to Employer Site"
        ↓
Opens employer ATS in new tab
  - Resume auto-downloads (or user copies from modal)
  - Cheat sheet stays visible for easy copy-paste
        ↓
User fills form (now 5 min instead of 45 min)
        ↓
Returns to IntelliResume → Clicks "Mark as Applied"
        ↓
Application tracked in dashboard
```

**Pros:**
- Works with ANY employer ATS (Workday, iCIMS, Taleo, custom)
- No fragile browser automation
- Legally clean (no TOS violations)
- Shippable in weeks, not months
- 80% of the value with 20% of the complexity

**Cons:**
- Still requires some manual work from user
- Not "true" one-click apply

### Option B: Browser Extension (Future Enhancement)

**How it works:**

```
User installs IntelliResume Chrome extension
        ↓
Browses to ANY nursing job (Indeed, employer site, LinkedIn)
        ↓
Extension detects job application form
        ↓
Shows overlay: "Auto-fill with IntelliResume"
        ↓
Click → Extension fills form fields from Credential Vault
        ↓
User reviews and clicks Submit
        ↓
Application tracked in IntelliResume dashboard
```

**Pros:**
- Works anywhere on the web (not just our platform)
- True auto-fill experience
- Powerful UX differentiator
- Can detect jobs we don't have scraped

**Cons:**
- Extension development cost (2-3 months)
- Users must install browser extension
- Sites can block/detect extensions
- Ongoing maintenance as ATS forms change

### Option C: Employer API Partnerships (Long-Term B2B)

**How it works:**

```
Partner with healthcare ATS providers or directly with hospitals
        ↓
Get API access for verified candidate submission
        ↓
User clicks "Apply" → Direct submission to employer
        ↓
No redirect needed, true one-click apply
        ↓
Employer receives structured, verified application
```

**Pros:**
- Seamless user experience
- Employers prefer pre-verified candidates
- B2B revenue opportunity
- Strongest competitive moat

**Cons:**
- Requires business development resources
- Enterprise sales cycles (6-12 months)
- Each employer/ATS is separate integration
- Need critical mass of candidates first

### Recommended Path

| Phase | Approach | Timeline |
|-------|----------|----------|
| **MVP** | Option A (Pre-fill + Redirect) | 4-6 weeks |
| **V2** | Option B (Browser Extension) | +2-3 months |
| **V3** | Option C (Employer Partnerships) | +6-12 months |

---

## Resume & Cover Letter Integration

### How Resume Fits Into Smart Apply

We already have a full resume builder. Here's how it integrates:

**When user clicks "Smart Apply":**

1. **Pull master resume** from existing ResumeData
2. **Pull credential vault** data (licenses, certs, work history)
3. **Merge & sync** - ensure resume reflects latest credentials
4. **Analyze job requirements** (we have parsed job data)
5. **AI tailors resume:**
   - Reorders experience to match job priorities
   - Highlights relevant certifications prominently
   - Adjusts summary for the specific role
   - Adds keywords from job description
6. **Generate PDF** ready for download/upload

**Existing infrastructure we leverage:**
- `/api/tailor-resume` - Already does AI resume tailoring
- `/api/generate-summary` - Summary generation
- `ResumePDF.jsx` - PDF generation
- Job data from our scrapers

### Cover Letter Generation (NEW)

Add cover letter generation to the Smart Apply flow:

**Input:**
- Nurse profile (name, credentials, experience)
- Job details (title, employer, requirements, description)
- Resume data (for consistency)

**Output:**
```
Dear Hiring Manager,

I am excited to apply for the ICU Registered Nurse position at Cleveland
Clinic. With 5 years of critical care experience and active CCRN certification,
I am well-prepared to contribute to your Medical ICU team.

In my current role at University Hospitals, I manage ventilator-dependent
patients with a 1:2 ratio and have extensive experience with CRRT and
hemodynamic monitoring. My BLS and ACLS certifications are current through
March 2026.

I am particularly drawn to Cleveland Clinic's reputation for nursing excellence
and would welcome the opportunity to discuss how my background aligns with
your needs.

Sincerely,
[Name]
RN, BSN, CCRN
Ohio License #12345
```

**Implementation:**
- New API endpoint: `/api/generate-cover-letter`
- Uses same AI infrastructure as resume tailoring
- Output: Editable text + PDF download option

### The Complete Smart Apply Package

When user clicks "Smart Apply", they receive:

| Item | Source | Action |
|------|--------|--------|
| **Tailored Resume PDF** | AI-generated from resume + job | Download |
| **Cover Letter PDF** | AI-generated from profile + job | Download |
| **Credential Cheat Sheet** | From Credential Vault | Copy-paste for forms |
| **Application Record** | Auto-created | Track in dashboard |

---

## User Flows

### Flow 1: Building the Credential Vault

```
Sign Up / Sign In
       ↓
"Complete Your Credential Profile" prompt (can skip, reminded later)
       ↓
Step 1: Licenses
  - Add RN license (state, number, expiration)
  - Enter birth year + last 4 SSN for Nursys verification
  - Upload PDF (optional but encouraged)
  - Mark if Compact license holder
  - → Nursys verification runs in background
       ↓
Step 2: Certifications
  - Add BLS, ACLS (required for most jobs)
  - Add specialty certs (CCRN, CEN, etc.)
  - Upload cards/certificates
  - Attestation checkbox: "I certify this is accurate"
       ↓
Step 3: Work History
  - Import from existing resume OR enter manually
  - Add nursing-specific details (unit, patient ratios, bed count)
  - Add supervisor for each position (becomes reference)
       ↓
Step 4: Skills Checklist
  - Pre-populated based on specialty/experience
  - Rate proficiency (1-5 scale)
  - Takes ~5 min once, reusable forever
       ↓
Step 5: Immunizations (optional)
  - Common ones pre-listed (Hep B, TB, COVID, Flu)
  - Upload records if available
       ↓
Profile Complete!
  - Show "Nursys Verified ✓" badge if license verified
  - Ready to Smart Apply
```

### Flow 2: Smart Apply to a Job (MVP - Option A)

```
Browse jobs on IntelliResume
       ↓
Find interesting job → Click "Smart Apply"
       ↓
[If no Credential Vault] → Prompt to complete profile first
       ↓
Smart Apply Modal shows:
  ┌─────────────────────────────────────────────────────┐
  │ Smart Apply to: ICU RN at Cleveland Clinic          │
  │                                                     │
  │ ✓ Your credentials match this job                   │
  │                                                     │
  │ [Resume]        [Cover Letter]    [Credentials]     │
  │  ↓ Download      ↓ Download        ↓ Copy All       │
  │                                                     │
  │ Quick Copy (for application forms):                 │
  │ ┌─────────────────────────────────────────────────┐ │
  │ │ License: OH-RN-12345 (exp 2026-08)    [Copy]    │ │
  │ │ BLS: exp 2026-03-01                   [Copy]    │ │
  │ │ ACLS: exp 2026-03-01                  [Copy]    │ │
  │ │ CCRN: #98765 (exp 2026-11)            [Copy]    │ │
  │ │ Reference: Jane Smith, 555-123-4567   [Copy]    │ │
  │ └─────────────────────────────────────────────────┘ │
  │                                                     │
  │ [Continue to Cleveland Clinic Website →]            │
  └─────────────────────────────────────────────────────┘
       ↓
Click "Continue" → Opens employer ATS in new tab
       ↓
User fills form using downloaded materials + cheat sheet
(Now takes 5 min instead of 45 min)
       ↓
Returns to IntelliResume
       ↓
Prompt: "Did you complete your application?"
  - [Yes, Mark as Applied] → Saved to Application Tracker
  - [No, Save for Later] → Added to "In Progress" list
       ↓
Application Dashboard updated
  - Shows: Job, Employer, Date Applied, Status
  - Can add notes, track follow-ups
```

### Flow 3: Credential Expiration Alerts

```
Weekly cron job checks all credentials
       ↓
Credential expiring in 30 days?
       ↓
Email: "Your BLS certification expires in 30 days"
  - Link to AHA renewal page
  - Reminder to upload new cert when renewed
  - "This may affect your job applications"
       ↓
Credential expiring in 7 days?
       ↓
Email: "URGENT: Your BLS expires in 7 days"
  - Stronger warning about application impact
  - Direct link to update in profile
       ↓
Credential expired?
       ↓
Mark as expired in profile
  - Dashboard shows warning banner
  - Smart Apply shows warning for jobs requiring that cert
  - Can still apply but with "expired credential" notice
       ↓
User uploads renewed credential
       ↓
Status updated, warnings cleared
```

---

## Data Model

### Proposed Prisma Schema

```prisma
// ============================================
// CREDENTIAL VAULT MODELS
// ============================================

model NurseCredentialProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id])

  // Basic Info
  npiNumber             String?  // National Provider Identifier (optional)

  // Nursys Verification Data (for license verification)
  nursysBirthYear       Int?     // Required for Nursys lookup
  nursysLast4SSN        String?  // Required for Nursys lookup (encrypted)
  nursysVerifiedAt      DateTime?
  nursysSubscribed      Boolean  @default(false) // Subscribed to e-Notify

  // Profile Completion Tracking
  profileCompletedAt    DateTime?
  lastUpdatedAt         DateTime @updatedAt

  // Relations
  licenses              NurseLicense[]
  certifications        NurseCertification[]
  workHistory           NurseWorkHistory[]
  skills                NurseSkillsChecklist?
  references            NurseReference[]
  immunizations         NurseImmunization[]
  documents             NurseDocument[]
  applications          JobApplication[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model NurseLicense {
  id                    String   @id @default(cuid())
  profileId             String
  profile               NurseCredentialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  licenseType           String   // RN, LPN, APRN, NP, etc.
  state                 String   // Two-letter state code
  licenseNumber         String
  issueDate             DateTime?
  expirationDate        DateTime
  isCompact             Boolean  @default(false) // Nurse Licensure Compact

  // Verification
  verificationStatus    String   @default("pending") // pending, verified, expired, disciplined, invalid
  verificationSource    String?  // "nursys", "manual", "user_attestation"
  verifiedAt            DateTime?
  lastCheckedAt         DateTime?

  // Discipline/Alerts (from Nursys e-Notify)
  hasDiscipline         Boolean  @default(false)
  disciplineDetails     String?

  documentId            String?  // Link to uploaded PDF

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([profileId, state, licenseType])
  @@index([expirationDate])
  @@index([verificationStatus])
}

model NurseCertification {
  id                    String   @id @default(cuid())
  profileId             String
  profile               NurseCredentialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  certType              String   // BLS, ACLS, PALS, CCRN, CEN, CNOR, etc.
  issuingBody           String   // American Heart Association, AACN, ENA, etc.
  certificationNumber   String?
  issueDate             DateTime?
  expirationDate        DateTime

  // Verification
  verificationStatus    String   @default("user_attestation") // user_attestation, verified, expired
  verifiedAt            DateTime?

  documentId            String?  // Link to uploaded card/certificate

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([expirationDate])
  @@index([certType])
}

model NurseWorkHistory {
  id                    String   @id @default(cuid())
  profileId             String
  profile               NurseCredentialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  employerName          String
  facilityType          String   // Hospital, Clinic, SNF, Home Health, Ambulatory, etc.
  unit                  String   // ICU, Med-Surg, ER, OR, L&D, etc.
  jobTitle              String
  employmentType        String?  // Full-time, Part-time, PRN, Travel, Contract

  startDate             DateTime
  endDate               DateTime?
  isCurrentPosition     Boolean  @default(false)

  // Nursing-specific details
  patientRatio          String?  // e.g., "1:2", "1:4-6"
  bedCount              Int?     // Facility/unit size
  shiftType             String?  // Days, Nights, Rotating
  floatPool             Boolean  @default(false)
  chargeExperience      Boolean  @default(false)
  preceptorExperience   Boolean  @default(false)

  responsibilities      String?  // Key duties (for resume content)
  achievements          String?  // Accomplishments (for resume content)

  // Supervisor (doubles as reference)
  supervisorName        String?
  supervisorTitle       String?
  supervisorEmail       String?
  supervisorPhone       String?
  canContactSupervisor  Boolean  @default(true)

  // Reason for leaving (common ATS question)
  reasonForLeaving      String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([profileId])
}

model NurseSkillsChecklist {
  id                    String   @id @default(cuid())
  profileId             String   @unique
  profile               NurseCredentialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  // Store as JSON - skills vary by specialty
  // Format: {
  //   "category": {
  //     "skill_name": {
  //       "proficiency": 1-5,
  //       "yearsExperience": number,
  //       "lastUsed": "2024-01",
  //       "frequency": "daily|weekly|monthly|rarely|never"
  //     }
  //   }
  // }
  // Categories: Assessment, Medication Administration, IV Therapy,
  //             Respiratory, Cardiac, Wound Care, Equipment, Documentation, etc.
  clinicalSkills        Json

  completedAt           DateTime?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model NurseReference {
  id                    String   @id @default(cuid())
  profileId             String
  profile               NurseCredentialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  name                  String
  title                 String   // Charge Nurse, Nurse Manager, Director, etc.
  organization          String
  relationship          String   // Former supervisor, Charge nurse, Colleague, Preceptor
  email                 String
  phone                 String?
  yearsKnown            Int?
  canContact            Boolean  @default(true)

  // Link to work history if applicable
  workHistoryId         String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model NurseImmunization {
  id                    String   @id @default(cuid())
  profileId             String
  profile               NurseCredentialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  immunizationType      String   // HepB, TB_Test, COVID, Flu, MMR, Varicella, Tdap
  status                String   // Complete, In_Progress, Declined, Exempt, Due

  dateAdministered      DateTime?
  expirationDate        DateTime? // For annual ones like Flu, TB

  // For multi-dose series
  seriesComplete        Boolean  @default(true)
  dosesReceived         Int?

  documentId            String?
  notes                 String?  // Exemption reason, etc.

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([profileId, immunizationType])
}

model NurseDocument {
  id                    String   @id @default(cuid())
  profileId             String
  profile               NurseCredentialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  documentType          String   // license, certification, immunization, education, other
  fileName              String
  fileUrl               String   // S3 or similar storage URL
  fileSize              Int
  mimeType              String

  // Optional links to specific credentials
  linkedLicenseId       String?
  linkedCertificationId String?
  linkedImmunizationId  String?

  uploadedAt            DateTime @default(now())
}

// ============================================
// APPLICATION TRACKING
// ============================================

model JobApplication {
  id                    String   @id @default(cuid())

  // Link to nurse profile
  credentialProfileId   String
  credentialProfile     NurseCredentialProfile @relation(fields: [credentialProfileId], references: [id])

  // Link to job (if from our platform)
  jobId                 String?
  job                   NursingJob? @relation(fields: [jobId], references: [id])

  // For external jobs not in our system
  externalJobTitle      String?
  externalEmployer      String?
  externalJobUrl        String?

  // Application details
  appliedAt             DateTime @default(now())
  applicationMethod     String   // smart_apply, direct, external

  // Status tracking
  status                String   @default("applied") // applied, in_review, interview_scheduled, offer, rejected, withdrawn
  statusUpdatedAt       DateTime @default(now())

  // Materials used
  resumeVersionId       String?  // Which resume version was used
  coverLetterGenerated  Boolean  @default(false)

  // Follow-up tracking
  followUpDate          DateTime?
  notes                 String?

  // Outcome tracking (for analytics)
  responseReceived      Boolean  @default(false)
  responseDate          DateTime?
  interviewOffered      Boolean  @default(false)
  offerReceived         Boolean  @default(false)
  offerAmount           Float?   // For salary tracking

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([credentialProfileId])
  @@index([status])
  @@index([appliedAt])
}
```

---

## Value Proposition

### For Nurses (B2C)

| Benefit | Impact |
|---------|--------|
| Apply in 5 min instead of 45 min | 9x faster applications |
| Never re-enter same credentials | Eliminates repetitive data entry |
| Nursys-verified license badge | Credibility with employers |
| Expiration alerts | Never miss a renewal deadline |
| Skills checklist done once | Saves hours across job search |
| Track all applications | Single dashboard for job search |
| Tailored resume + cover letter per job | Higher response rates |

### For IntelliResume (Business)

| Benefit | Impact |
|---------|--------|
| High switching cost | Once credentials stored, users stay |
| Premium feature | Clear monetization path |
| Data moat | Deep understanding of nursing credentials |
| Employer partnership potential | B2B revenue stream |
| Differentiation | No generic auto-apply does this |
| Verified candidate pool | Asset for B2B sales |

### For Employers (Future B2B)

| Benefit | Impact |
|---------|--------|
| Pre-verified candidates | Faster time-to-hire |
| Structured credential data | Less manual verification |
| Quality applicants | Not "spray and pray" applications |
| Compliance documentation | Ready from day one |
| Reduced travel nurse dependence | Cost savings |

---

## Monetization Tiers

### Current Pricing (Resume-Only)

| Tier | Price | Features |
|------|-------|----------|
| One-Time Download | $6.99 | Single resume PDF |
| Weekly | $4.99/week | Unlimited downloads |
| Monthly | $9.99/month | Unlimited downloads |

### Proposed New Pricing (With Credential Vault)

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Resume builder, Credential Vault storage, 3 Smart Applies/month |
| **Job Seeker** | $14.99/mo | Unlimited Smart Apply, tailored resumes, cover letters, application tracking |
| **Pro** | $24.99/mo | Everything + Nursys verification badge, priority support, interview prep |
| **Lifetime** | $149 one-time | Credential Vault forever, 100 Smart Applies, all features |

### B2B Pricing (Future)

| Tier | Price | Features |
|------|-------|----------|
| **Employer Basic** | $500/mo | Access to verified candidate pool, job postings |
| **Employer Pro** | $1,000/mo | Direct applications, candidate matching, analytics |
| **Enterprise** | Custom | API access, ATS integration, dedicated support |

---

## Implementation Phases

### Phase 1: Credential Vault Foundation (4-6 weeks)

- [ ] Database schema migration (add Credential Vault models)
- [ ] Profile builder UI (multi-step form)
  - [ ] License entry with state selection
  - [ ] Certification entry with expiration dates
  - [ ] Work history import from existing resume
  - [ ] Skills checklist by specialty
- [ ] Document upload to S3
- [ ] Basic expiration tracking
- [ ] Credential "cheat sheet" view (copy-paste)
- [ ] Profile completion progress indicator

### Phase 2: Nursys Integration (2-3 weeks)

- [ ] Nursys e-Notify account setup
- [ ] API integration for license verification
- [ ] Store verification status in database
- [ ] Display "Nursys Verified ✓" badge
- [ ] Handle Nursys status updates (webhook or polling)
- [ ] Alert on license discipline or expiration

### Phase 3: Smart Apply MVP (3-4 weeks)

- [ ] "Smart Apply" button on job pages
- [ ] Smart Apply modal UI
  - [ ] Job match indicator
  - [ ] Resume download (tailored)
  - [ ] Cover letter generation + download
  - [ ] Credential cheat sheet with copy buttons
- [ ] Redirect to employer site flow
- [ ] "Mark as Applied" confirmation
- [ ] Application tracking table in profile

### Phase 4: Cover Letter Generation (1-2 weeks)

- [ ] New API endpoint: `/api/generate-cover-letter`
- [ ] AI prompt for nursing-specific cover letters
- [ ] Integration with job data and credential profile
- [ ] PDF generation for cover letters
- [ ] Editable text output option

### Phase 5: Expiration Alerts (1-2 weeks)

- [ ] Cron job for credential expiration checking
- [ ] Email templates for 30-day, 7-day, expired alerts
- [ ] Dashboard warnings for expiring credentials
- [ ] Smart Apply warnings for expired certs

### Phase 6: Browser Extension (Future - 8-12 weeks)

- [ ] Chrome extension development
- [ ] Form field detection on employer ATS sites
- [ ] Auto-fill from Credential Vault
- [ ] Job detection on external sites
- [ ] Application tracking from anywhere

### Phase 7: B2B & Partnerships (Future - Ongoing)

- [ ] Employer dashboard for verified candidates
- [ ] API for employers to receive applications
- [ ] Partnership outreach to healthcare employers
- [ ] ATS integration partnerships
- [ ] Pricing model for employer access

---

## MVP Definition

### What's In MVP (Ship in 8-10 weeks)

| Component | Build Effort | Already Have? |
|-----------|--------------|---------------|
| Credential Vault data entry UI | Medium | No |
| Database schema + migrations | Low | No |
| Document upload to S3 | Low | Partial (resume PDFs) |
| Nursys license verification | Low | No |
| "Smart Apply" modal | Medium | No |
| Resume tailoring per job | Low | **Yes** - exists |
| Cover letter generation | Low | No |
| Credential cheat sheet (copy-paste) | Low | No |
| Application tracking table | Medium | No |
| Expiration alerts (email) | Low | Partial (job alerts exist) |

### What's NOT in MVP

- Browser extension (Phase 6)
- Employer dashboard / B2B features (Phase 7)
- Full certification verification (beyond Nursys)
- Skills checklist templates by specialty (nice-to-have)
- Interview prep features
- Salary negotiation tools

### MVP User Story

> As a nurse, I can store my credentials once, click "Smart Apply" on any job, get a tailored resume + cover letter + credential cheat sheet, and track my applications in one dashboard.

---

## Open Questions

### Resolved

1. ~~**Credential Verification:** Manual vs. API integration with state boards?~~
   - **Answer:** Use Nursys e-Notify (FREE) for licenses, user attestation for certs in MVP

2. ~~**ATS Integration:** Browser extension vs. iframe vs. redirect with pre-fill?~~
   - **Answer:** Start with redirect + cheat sheet (Option A), browser extension in V2

3. ~~**How does Incredible Health charge?~~
   - **Answer:** B2B model, hospitals pay (likely 15-25% of salary or subscription)

### Still Open

4. **Compliance:** HIPAA considerations for storing health credentials (immunizations)?
   - Likely need privacy policy update, secure storage, user consent

5. **SSN Handling:** Nursys requires last 4 SSN - encryption and compliance requirements?
   - Need to encrypt at rest, consider not storing (verify once, discard)

6. **Employer Partnerships:** How to approach? What to charge?
   - Research needed on hospital recruiting pain points

7. **Competitive Response:** How will Incredible Health respond if we gain traction?
   - They may add B2C features or acquire us

---

## Success Metrics

| Metric | Target (3 months) | Target (6 months) |
|--------|-------------------|-------------------|
| Credential profiles created | 500 | 2,000 |
| Profile completion rate | 60% | 70% |
| Smart Apply usage rate | 20% of job viewers | 35% of job viewers |
| Applications tracked | 1,000 | 5,000 |
| Paid conversion (vault users) | 8% | 12% |
| Nursys verifications completed | 300 | 1,500 |
| User retention (monthly active) | 40% | 55% |

---

## References

### Market Research
- [Harvard Business Review: AI Has Made Hiring Worse](https://hbr.org/2026/01/ai-has-made-hiring-worse-but-it-can-still-help)
- [The Interview Guys: Auto-Apply Bots](https://blog.theinterviewguys.com/auto-apply-job-bots-might-feel-smart-but-theyre-killing-your-chances/)

### Competitors
- [Incredible Health](https://www.incrediblehealth.com/) - $1.65B valuation, B2B model
- [Incredible Health Series B Announcement](https://www.incrediblehealth.com/blog/series-b-funding-2022/)
- [Incredible Health Cost Savings](https://www.incrediblehealth.com/blog/how-incredible-health-saves-millions-for-healthcare-employers-through-nurse-hiring-innovation/)
- [StaffDNA AI Job Matching](https://staffdna.com/)
- [LazyApply Trustpilot Reviews](https://www.trustpilot.com/review/lazyapply.com)
- [Sonara Acquisition by BOLD](https://www.tealhq.com/post/sonara-review)

### Credential Verification
- [Nursys - NCSBN License Verification](https://www.nursys.com/)
- [Nursys e-Notify (FREE)](https://ncsbn.zendesk.com/hc/en-us/sections/4411150544663-Nursys-e-Notify)
- [Nursys API Documentation](https://ncsbn.zendesk.com/hc/en-us/articles/18773959621399-What-is-available-via-the-Nursys-API)
- [Propelus Primary Source Verification API](https://propelus.com/api)
- [Verifiable - 3,200+ Primary Sources](https://verifiable.com/primary-source-verification)

### Technical
- [Nursys e-Notify API Specifications (PDF)](https://www.nursys.com/_assets/docs/Nursys%20e-Notify%20File%20and%20API%20Specifications%20v2.1.6.pdf)
