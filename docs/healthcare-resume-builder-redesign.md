# Healthcare Resume Builder Redesign

> **Status:** In Progress
> **Goal:** Make it effortless for a tired nurse to build a professional resume
> **Design Principle:** "Tap, don't type"

---

## Target User Profile

**Sarah, 32, ICU Nurse**
- Works 12-hour shifts, 3-4 days/week
- Exhausted after work, limited mental energy
- Has 5-10 minutes during break or before bed
- On her phone 80% of the time
- Knows her credentials but hates typing them out
- Wants to apply to jobs but dreads the resume process

**What Sarah needs:**
- Pre-populated options she can tap/select
- Smart suggestions based on her specialty
- Auto-save so she never loses progress
- Mobile-first design
- Visual progress that motivates completion
- Quick wins (see resume taking shape immediately)

---

## UX Principles for Tired Users

### 1. Tap, Don't Type
- Checkboxes over text fields
- Dropdown menus with common options
- Pre-populated lists to select from
- "Add custom" only as secondary option

### 2. Smart Defaults
- Pre-select common certifications (BLS always checked)
- Suggest skills based on selected specialty
- Auto-format phone numbers, dates
- Default to most common choices

### 3. Progressive Disclosure
- Show only essential fields first
- "Add more details" expands optional fields
- Don't overwhelm with all options at once

### 4. Instant Gratification
- Show resume preview updating in real-time
- Celebrate small wins (section complete!)
- ATS score increases as they fill sections

### 5. Forgiveness
- Auto-save every change
- Easy undo/redo
- "Skip for now" on every section
- Can return to any section anytime

---

## New Section Designs

### 1. Certifications Section (NEW)

**Current:** None (certifications mixed into Skills)

**New Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Certifications                                    2/5 added │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Required for Most Jobs:                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] BLS (Basic Life Support)     Exp: [Dec 2026 ▼]  │   │
│  │ [✓] ACLS (Advanced Cardiac)      Exp: [Mar 2027 ▼]  │   │
│  │ [ ] PALS (Pediatric Advanced)    Exp: [________▼]   │   │
│  │ [ ] NRP (Neonatal Resuscitation) Exp: [________▼]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Specialty Certifications:                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [ ] CCRN (Critical Care)                            │   │
│  │ [ ] CEN (Emergency Nursing)                         │   │
│  │ [ ] CNOR (Operating Room)                           │   │
│  │ [ ] RNC-OB (Obstetric Nursing)                      │   │
│  │ [+ Add other certification...]                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Tip: 98% of hospitals require BLS. Add expiration      │
│     dates to show you're current.                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Structure:**
```javascript
certifications: [
  {
    id: 'bls',
    name: 'BLS',
    fullName: 'Basic Life Support',
    expirationDate: '2026-12-15',
    issuingBody: 'American Heart Association' // optional
  },
  // ...
]
```

---

### 2. Licenses Section (NEW)

**Current:** None (license info in Personal Info or nowhere)

**New Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Nursing License                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  License Type: [RN ▼]  [LPN]  [APRN]  [NP]                 │
│                                                             │
│  State(s) Licensed:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] California        License #: [RN 12345678    ]  │   │
│  │ [✓] Nevada (Compact)  License #: [______________]   │   │
│  │ [+ Add another state...]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 Nurse Licensure Compact (NLC)                    │   │
│  │ If you live in an NLC state, your license is valid  │   │
│  │ in 40+ states. [Learn more]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Structure:**
```javascript
licenses: [
  {
    type: 'RN', // RN, LPN, APRN, NP
    state: 'CA',
    licenseNumber: 'RN 12345678',
    isCompact: false,
    expirationDate: '2026-06-30' // optional
  }
]
```

---

### 3. Healthcare Skills Section (ENHANCED)

**Current:** Generic skills text field

**New Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Clinical Skills                                   12 added │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Specialty: [ICU/Critical Care ▼]                     │
│                                                             │
│  EHR/EMR Systems (select all you know):                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] Epic        [✓] Cerner      [ ] Meditech       │   │
│  │ [ ] Allscripts  [ ] eClinicalWorks  [+ Other...]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Clinical Skills (common for ICU):                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] Ventilator Management    [✓] Hemodynamic Mon.  │   │
│  │ [✓] Arterial Lines           [✓] Central Lines     │   │
│  │ [✓] CRRT                     [ ] ECMO              │   │
│  │ [✓] Sedation Management      [✓] Blood Products    │   │
│  │ [✓] Code Blue Response       [✓] Rapid Response    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Core Nursing Skills:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] Patient Assessment       [✓] Medication Admin  │   │
│  │ [✓] IV Therapy               [✓] Wound Care        │   │
│  │ [✓] Patient Education        [✓] Care Planning     │   │
│  │ [✓] Documentation            [ ] Discharge Plan    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Add custom skill...]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Smart Feature:** When user selects specialty (ICU), pre-check common skills for that specialty.

---

### 4. Experience Section (ENHANCED)

**Current:** Generic job entry with free-text description

**New Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Work Experience                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Position: [Staff Nurse ▼] [Charge Nurse] [Travel] [Other] │
│                                                             │
│  Employer: [Cleveland Clinic_________________]              │
│  Unit/Department: [Medical ICU ▼]                          │
│  Location: [Cleveland, OH___]  Dates: [01/2022] - [Present]│
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Quick Stats (helps your resume stand out):                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Patients per shift: [4-6 ▼]    Bed count: [24 ▼]   │   │
│  │ Nurse:Patient ratio: [1:2 ▼]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Key Responsibilities (select or type):                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] Managed care for critically ill patients        │   │
│  │ [✓] Administered medications via IV, PO, IM         │   │
│  │ [✓] Monitored ventilators and hemodynamic status    │   │
│  │ [✓] Collaborated with interdisciplinary team        │   │
│  │ [ ] Precepted new graduate nurses                   │   │
│  │ [ ] Participated in code blue responses             │   │
│  │ [+ Write custom bullet point...]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [✨ AI: Generate more bullet points based on my role]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section Order (Optimized for Healthcare)

**Current Order:**
1. Personal Info
2. Summary
3. Experience
4. Education
5. Skills
6. Additional Info

**New Order:**
1. Personal Info (keep)
2. Licenses (NEW - critical for healthcare)
3. Certifications (NEW - critical for healthcare)
4. Experience (enhanced)
5. Clinical Skills (enhanced - replaces generic Skills)
6. Education (keep)
7. Summary (moved - can auto-generate from above)

**Why this order?**
- Licenses/Certifications are **required** - get them first
- Experience is the meat of the resume
- Skills support experience claims
- Summary can be AI-generated from the data above

---

## Pre-populated Data

### Certification Options
```javascript
const CERTIFICATIONS = {
  required: [
    { id: 'bls', name: 'BLS', fullName: 'Basic Life Support', requiredBy: '98% of employers' },
    { id: 'acls', name: 'ACLS', fullName: 'Advanced Cardiovascular Life Support', requiredBy: 'Most acute care' },
    { id: 'pals', name: 'PALS', fullName: 'Pediatric Advanced Life Support', requiredBy: 'Pediatric units' },
    { id: 'nrp', name: 'NRP', fullName: 'Neonatal Resuscitation Program', requiredBy: 'L&D, NICU' },
  ],
  specialty: [
    { id: 'ccrn', name: 'CCRN', fullName: 'Critical Care Registered Nurse', specialty: ['icu', 'critical-care'] },
    { id: 'cen', name: 'CEN', fullName: 'Certified Emergency Nurse', specialty: ['er', 'emergency'] },
    { id: 'cnor', name: 'CNOR', fullName: 'Certified Perioperative Nurse', specialty: ['or', 'surgery'] },
    { id: 'rnc-ob', name: 'RNC-OB', fullName: 'Inpatient Obstetric Nursing', specialty: ['labor-delivery', 'ob'] },
    { id: 'rnc-nic', name: 'RNC-NIC', fullName: 'Neonatal Intensive Care', specialty: ['nicu'] },
    { id: 'cmsrn', name: 'CMSRN', fullName: 'Certified Medical-Surgical RN', specialty: ['med-surg'] },
    { id: 'cpen', name: 'CPEN', fullName: 'Certified Pediatric Emergency Nurse', specialty: ['peds-er'] },
    { id: 'ocn', name: 'OCN', fullName: 'Oncology Certified Nurse', specialty: ['oncology'] },
    { id: 'chpn', name: 'CHPN', fullName: 'Certified Hospice and Palliative Nurse', specialty: ['hospice', 'palliative'] },
  ]
};
```

### EHR Systems
```javascript
const EHR_SYSTEMS = [
  { id: 'epic', name: 'Epic', popularity: 'Most common' },
  { id: 'cerner', name: 'Cerner', popularity: 'Very common' },
  { id: 'meditech', name: 'Meditech', popularity: 'Common' },
  { id: 'allscripts', name: 'Allscripts', popularity: 'Common' },
  { id: 'eclinicalworks', name: 'eClinicalWorks', popularity: 'Outpatient' },
  { id: 'nextgen', name: 'NextGen', popularity: 'Outpatient' },
  { id: 'athenahealth', name: 'athenahealth', popularity: 'Outpatient' },
];
```

### Skills by Specialty
```javascript
const SKILLS_BY_SPECIALTY = {
  'icu': [
    'Ventilator Management',
    'Hemodynamic Monitoring',
    'Arterial Line Management',
    'Central Line Care',
    'CRRT/Dialysis',
    'Sedation Management',
    'Vasopressor Titration',
    'Blood Product Administration',
    'Code Blue Response',
    'Rapid Response',
  ],
  'er': [
    'Triage Assessment',
    'Trauma Care',
    'Cardiac Monitoring',
    'Procedural Sedation',
    'Splinting/Casting',
    'Wound Care',
    'IV Insertion',
    'Point of Care Testing',
    'Mass Casualty Response',
  ],
  'labor-delivery': [
    'Fetal Monitoring',
    'Labor Support',
    'Postpartum Care',
    'Breastfeeding Support',
    'Newborn Assessment',
    'C-Section Assistance',
    'High-Risk Pregnancy',
    'Pitocin Administration',
    'Epidural Monitoring',
  ],
  // ... more specialties
};
```

---

## Mobile-First Design

The builder should work great on a phone (nurse on break):

```
┌─────────────────────────┐
│ ≡  Build Resume    [?]  │
├─────────────────────────┤
│                         │
│  ████████░░ 70%         │
│  ATS Score: 72/100      │
│                         │
├─────────────────────────┤
│                         │
│  ✓ Personal Info        │
│  ✓ Licenses             │
│  → Certifications       │  ← Currently editing
│  ○ Experience           │
│  ○ Skills               │
│  ○ Education            │
│                         │
├─────────────────────────┤
│                         │
│  Certifications         │
│  ─────────────────────  │
│                         │
│  [✓] BLS    [Dec 2026▼] │
│  [✓] ACLS   [Mar 2027▼] │
│  [ ] PALS   [________▼] │
│  [ ] CCRN   [________▼] │
│                         │
│  [+ Add certification]  │
│                         │
├─────────────────────────┤
│  [← Back]    [Next →]   │
└─────────────────────────┘
```

---

## Implementation Plan

### Phase 1: New Sections (This Sprint)
1. Create `CertificationsSection.jsx` component
2. Create `LicensesSection.jsx` component
3. Create `HealthcareSkillsSection.jsx` component
4. Add data constants (`lib/constants/healthcareData.js`)
5. Update resume data schema to include new fields
6. Integrate into ModernResumeBuilder

### Phase 2: Enhanced Experience
1. Add nursing-specific fields to Experience section
2. Pre-populated responsibility checkboxes
3. AI bullet point generator for nursing roles

### Phase 3: Polish
1. Mobile optimization
2. Animations/micro-interactions
3. Onboarding flow improvements
4. A/B test against current design

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Completion rate | Unknown | 60%+ |
| Time to complete | Unknown | < 10 min |
| Mobile completion | Unknown | 40%+ |
| ATS Score avg | Unknown | 75+ |
| Conversion to paid | ~1-2% | 5%+ |

---

## Files to Create/Modify

### New Files
- `components/ResumeBuilder/sections/Certifications.jsx`
- `components/ResumeBuilder/sections/Licenses.jsx`
- `components/ResumeBuilder/sections/HealthcareSkills.jsx`
- `lib/constants/healthcareData.js`

### Files to Modify
- `components/ModernResumeBuilder/ModernResumeBuilder.jsx` (add new sections)
- `components/ResumeBuilder/sections/Experience.jsx` (enhance for healthcare)
- `lib/services/atsScoreService.js` (add healthcare keyword weighting)
- Resume data schema/types

