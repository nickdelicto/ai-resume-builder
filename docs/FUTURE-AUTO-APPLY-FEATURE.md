# Auto-Apply Feature - Future Implementation Guide

> This document outlines how to build an "Apply with IntelliResume" feature that auto-fills job application forms for users.

---

## Table of Contents

1. [Overview](#overview)
2. [How Auto-Apply Tools Work](#how-auto-apply-tools-work)
3. [Technical Approaches](#technical-approaches)
4. [Form Detection Methods](#form-detection-methods)
5. [ATS-Specific Adapters](#ats-specific-adapters)
6. [Handling Authentication](#handling-authentication)
7. [MVP Implementation Plan](#mvp-implementation-plan)
8. [Architecture Diagram](#architecture-diagram)
9. [Code Examples](#code-examples)
10. [Risks and Considerations](#risks-and-considerations)

---

## Overview

### What We're Building

A Chrome extension that:
1. Detects when a user is on a job application page
2. Pulls their IntelliResume profile data
3. Auto-fills the application form
4. User reviews and submits manually

### Why This Works for Us

- We already have jobs in our database with original application URLs
- We know which employer uses which ATS (from our scrapers)
- We have ~11 employers, so we can build specific adapters for each
- Users already have structured resume data in IntelliResume

---

## How Auto-Apply Tools Work

### Industry Examples

| Tool | Approach | Pricing |
|------|----------|---------|
| LazyApply | Browser extension, user watches | $99/mo |
| JobCopilot | Server-side automation, runs 24/7 | $19-49/mo |
| Simplify | Browser extension + autofill | Free tier |
| LoopCV | Server-side, mass apply | $29/mo |

### Two Main Architectures

**1. Browser Extension (Recommended for MVP)**
```
User's Browser → Extension injects into job sites → Fills forms → User submits
```
- Pros: Simpler, user controls the process, no server costs
- Cons: Requires browser to be open

**2. Server-Side Automation**
```
User's profile → Our servers run headless browsers → Applies 24/7
```
- Pros: Fully automated, applies while user sleeps
- Cons: Expensive (Puppeteer servers), bot detection risks, ToS issues

---

## Technical Approaches

### Form Detection (3 Methods)

#### Method 1: Heuristic Pattern Matching (~70-80% coverage)

```javascript
// Common field detection patterns
const FIELD_PATTERNS = {
  firstName: ['first name', 'first_name', 'firstname', 'fname', 'given name'],
  lastName: ['last name', 'last_name', 'lastname', 'lname', 'surname', 'family name'],
  email: ['email', 'e-mail', 'emailaddress', 'email_address'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'phone_number'],
  address: ['address', 'street', 'address_line'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  zip: ['zip', 'postal', 'postcode', 'zip_code'],
  linkedin: ['linkedin', 'linked_in'],
  resume: ['resume', 'cv', 'curriculum'],
  coverLetter: ['cover', 'letter', 'cover_letter'],
  salary: ['salary', 'compensation', 'pay', 'expected_salary'],
  startDate: ['start', 'available', 'availability', 'start_date'],
  yearsExperience: ['years', 'experience', 'years_experience'],
  workAuthorization: ['authorized', 'authorization', 'work_auth', 'visa', 'sponsorship'],
};

function detectFieldType(element) {
  const signals = [
    element.name,
    element.id,
    element.placeholder,
    element.getAttribute('aria-label'),
    element.getAttribute('data-automation-id'),
    findLabelText(element)
  ].filter(Boolean).map(s => s.toLowerCase());

  for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
    if (signals.some(signal => patterns.some(pattern => signal.includes(pattern)))) {
      return fieldType;
    }
  }
  return null;
}

function findLabelText(element) {
  // Check for associated label
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent;
  }
  // Check parent label
  const parentLabel = element.closest('label');
  if (parentLabel) return parentLabel.textContent;
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent;
  }
  return null;
}
```

#### Method 2: ATS-Specific Adapters (~95% coverage for known ATS)

```javascript
const ATS_ADAPTERS = {
  workday: {
    detect: (url) => url.includes('myworkdayjobs.com') || url.includes('.wd1.') || url.includes('.wd5.'),
    selectors: {
      firstName: '[data-automation-id="firstName"]',
      lastName: '[data-automation-id="lastName"]',
      email: '[data-automation-id="email"]',
      phone: '[data-automation-id="phone"]',
      resume: '[data-automation-id="file-upload-input-ref"]',
      // Workday uses data-automation-id consistently
    }
  },
  greenhouse: {
    detect: (url) => url.includes('boards.greenhouse.io') || url.includes('job-boards.greenhouse.io'),
    selectors: {
      firstName: '#first_name',
      lastName: '#last_name',
      email: '#email',
      phone: '#phone',
      resume: '#resume',
      coverLetter: '#cover_letter',
    }
  },
  lever: {
    detect: (url) => url.includes('jobs.lever.co'),
    selectors: {
      name: 'input[name="name"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]',
      resume: 'input[type="file"]',
      // Lever uses name attributes
    }
  },
  icims: {
    detect: (url) => url.includes('icims.com') || url.includes('careers-'),
    selectors: {
      // iCIMS uses iframes, more complex
      // Need to access iframe content
    }
  },
  taleo: {
    detect: (url) => url.includes('taleo.net'),
    selectors: {
      // Taleo is legacy, uses different patterns
    }
  }
};
```

#### Method 3: AI-Powered (Fallback for unknown forms)

```javascript
async function detectFieldsWithAI(pageHTML) {
  const response = await fetch('/api/ai/analyze-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: pageHTML })
  });

  // Returns mapping: { "selector": "fieldType" }
  return response.json();
}

// Server-side API using GPT-4
async function analyzeFormWithGPT(html) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "system",
      content: `You are a form analyzer. Given HTML of a job application form,
        identify form fields and return a JSON object mapping CSS selectors to field types.
        Field types: firstName, lastName, email, phone, address, city, state, zip,
        linkedin, resume, coverLetter, salary, startDate, yearsExperience, workAuthorization`
    }, {
      role: "user",
      content: `Analyze this form HTML:\n\n${html.substring(0, 10000)}`
    }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## ATS-Specific Adapters

### Our Employers and Their ATS Systems

| Employer | ATS Platform | URL Pattern |
|----------|--------------|-------------|
| Cleveland Clinic | Workday | `clevelandclinic.wd1.myworkdayjobs.com` |
| UHS | Workday | `uhs.wd1.myworkdayjobs.com` |
| Mass General Brigham | Workday | `massgeneralbrigham.wd1.myworkdayjobs.com` |
| Strong Memorial | Workday | `urmc.wd5.myworkdayjobs.com` |
| Northwell Health | iCIMS | `careers-northwell.icims.com` |
| NYU Langone | Symphony Talent | Uses m-cloud.io |
| Hartford HealthCare | Phenom People | Custom career site |
| Yale New Haven | Jibe | Custom career site |
| Guthrie | Oracle Recruiting | Uses hcmRestApi |
| Upstate Medical | PageUp | Custom career site |
| Adventist Healthcare | Workday | `adventisthealthcare.wd1.myworkdayjobs.com` |

### Workday Adapter (Covers 5+ Employers)

```javascript
const WorkdayAdapter = {
  name: 'workday',

  detect(url) {
    return url.includes('myworkdayjobs.com') ||
           url.includes('.wd1.') ||
           url.includes('.wd5.');
  },

  async fillForm(profile) {
    // Wait for Workday's React to render
    await waitForSelector('[data-automation-id="firstName"]');

    // Fill basic info
    await fillField('[data-automation-id="firstName"]', profile.firstName);
    await fillField('[data-automation-id="lastName"]', profile.lastName);
    await fillField('[data-automation-id="email"]', profile.email);
    await fillField('[data-automation-id="phone"]', profile.phone);

    // Address fields
    await fillField('[data-automation-id="addressLine1"]', profile.address);
    await fillField('[data-automation-id="city"]', profile.city);

    // State dropdown (Workday uses custom dropdowns)
    await clickDropdown('[data-automation-id="state"]');
    await selectOption(profile.state);

    await fillField('[data-automation-id="postalCode"]', profile.zip);

    // Resume upload
    const resumeInput = document.querySelector('[data-automation-id="file-upload-input-ref"]');
    if (resumeInput && profile.resumeFile) {
      await uploadFile(resumeInput, profile.resumeFile);
    }

    // LinkedIn
    await fillField('[data-automation-id="linkedin"]', profile.linkedin);

    return { success: true, fieldsFound: 10 };
  }
};

// Helper functions
async function fillField(selector, value) {
  const el = document.querySelector(selector);
  if (!el || !value) return false;

  // Workday uses React, need to trigger proper events
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  return true;
}

async function waitForSelector(selector, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (document.querySelector(selector)) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}
```

---

## Handling Authentication

### The Problem

Most ATS systems require users to create an account or sign in before applying:
- Workday: Account required
- Greenhouse: Often allows guest apply
- Lever: Usually allows guest apply
- iCIMS: Account required

### Solution: Session-Based Approach

```javascript
// Check if user is logged into ATS
function checkATSLoginStatus(atsType) {
  const indicators = {
    workday: () => {
      // Check for logged-in user elements
      return !!document.querySelector('[data-automation-id="signOutLink"]') ||
             !!document.querySelector('[data-automation-id="userMenu"]');
    },
    greenhouse: () => {
      // Greenhouse often allows guest apply
      return true;
    },
    icims: () => {
      return !!document.querySelector('.logged-in-indicator');
    }
  };

  return indicators[atsType]?.() ?? false;
}

// Prompt user to login if needed
function promptLogin(atsType, employerName) {
  showNotification({
    title: 'Sign In Required',
    message: `Please sign in to ${employerName} to continue with your application.`,
    buttons: [
      { text: 'Sign in with LinkedIn', action: 'oauth-linkedin' },
      { text: 'Sign in manually', action: 'manual' }
    ]
  });
}
```

### OAuth Integration (Future Enhancement)

```javascript
// Use LinkedIn OAuth for sites that support it
async function initiateLinkedInAuth() {
  // Many ATS systems have "Apply with LinkedIn" buttons
  const linkedInButton = document.querySelector(
    '[data-automation-id="applyWithLinkedIn"], ' +
    '.linkedin-apply, ' +
    '[class*="linkedin"]'
  );

  if (linkedInButton) {
    linkedInButton.click();
    return true;
  }
  return false;
}
```

---

## MVP Implementation Plan

### Phase 1: Chrome Extension Foundation

```
/extension
├── manifest.json
├── background.js          # Service worker
├── content.js             # Injected into job pages
├── popup.html             # Extension popup UI
├── popup.js
├── styles.css
└── adapters/
    ├── index.js           # Adapter registry
    ├── workday.js
    ├── greenhouse.js
    └── generic.js         # Fallback heuristic
```

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "IntelliResume AutoFill",
  "version": "1.0.0",
  "description": "Auto-fill job applications with your IntelliResume profile",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "*://*.myworkdayjobs.com/*",
    "*://boards.greenhouse.io/*",
    "*://jobs.lever.co/*",
    "*://*.icims.com/*",
    "https://intelliresume.net/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [{
    "matches": [
      "*://*.myworkdayjobs.com/*",
      "*://boards.greenhouse.io/*",
      "*://jobs.lever.co/*"
    ],
    "js": ["content.js"],
    "css": ["styles.css"]
  }],
  "background": {
    "service_worker": "background.js"
  }
}
```

### Phase 2: Core Content Script

**content.js:**
```javascript
// IntelliResume AutoFill Content Script

(async function() {
  'use strict';

  // Check if we're on a job application page
  const currentUrl = window.location.href;
  const adapter = detectATS(currentUrl);

  if (!adapter) {
    console.log('[IntelliResume] No ATS detected for this page');
    return;
  }

  console.log(`[IntelliResume] Detected ATS: ${adapter.name}`);

  // Add floating button
  addAutoFillButton();

  function addAutoFillButton() {
    const button = document.createElement('div');
    button.id = 'intelliresume-autofill-btn';
    button.innerHTML = `
      <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="IntelliResume" />
      <span>AutoFill</span>
    `;
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4f46e5;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 500;
    `;

    button.addEventListener('click', handleAutoFill);
    document.body.appendChild(button);
  }

  async function handleAutoFill() {
    try {
      // Get user profile from IntelliResume
      const profile = await fetchUserProfile();

      if (!profile) {
        showNotification('Please sign in to IntelliResume first', 'error');
        return;
      }

      // Check if user is logged into ATS
      const isLoggedIn = adapter.checkLogin?.() ?? true;
      if (!isLoggedIn) {
        showNotification('Please sign in to this employer\'s career site first', 'warning');
        return;
      }

      // Fill the form
      showNotification('Filling application...', 'info');
      const result = await adapter.fillForm(profile);

      if (result.success) {
        showNotification(`Filled ${result.fieldsFound} fields. Please review and submit.`, 'success');
      } else {
        showNotification('Some fields could not be filled. Please complete manually.', 'warning');
      }

    } catch (error) {
      console.error('[IntelliResume] AutoFill error:', error);
      showNotification('An error occurred. Please try again.', 'error');
    }
  }

  async function fetchUserProfile() {
    // Get auth token from extension storage
    const { authToken } = await chrome.storage.local.get('authToken');

    if (!authToken) return null;

    const response = await fetch('https://intelliresume.net/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) return null;

    return response.json();
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `intelliresume-notification intelliresume-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      z-index: 9999999;
      animation: slideIn 0.3s ease;
    `;

    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    notification.style.background = colors[type] || colors.info;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }

})();
```

### Phase 3: API Endpoint for User Profile

**pages/api/user/profile.js:**
```javascript
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  // Allow CORS for extension
  res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch user's resume data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        resumes: {
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user || !user.resumes.length) {
      return res.status(404).json({ error: 'No resume found' });
    }

    const resume = user.resumes[0];
    const resumeData = resume.content; // Parsed resume JSON

    // Return profile in autofill-friendly format
    return res.status(200).json({
      firstName: resumeData.personalInfo?.firstName || '',
      lastName: resumeData.personalInfo?.lastName || '',
      email: user.email,
      phone: resumeData.personalInfo?.phone || '',
      address: resumeData.personalInfo?.address || '',
      city: resumeData.personalInfo?.city || '',
      state: resumeData.personalInfo?.state || '',
      zip: resumeData.personalInfo?.zip || '',
      linkedin: resumeData.personalInfo?.linkedin || '',
      yearsExperience: calculateYearsExperience(resumeData.workHistory),
      // Include resume file URL for upload
      resumeUrl: resume.pdfUrl || null
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function calculateYearsExperience(workHistory) {
  if (!workHistory?.length) return 0;
  // Calculate based on work history dates
  // ... implementation
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IntelliResume Auto-Apply System                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────────────────────┐   │
│  │ IntelliResume   │     │              Chrome Extension               │   │
│  │ Web App         │     │                                             │   │
│  │                 │     │  ┌─────────────┐    ┌───────────────────┐   │   │
│  │ - User Profile  │◄────┼──│ popup.js    │    │ content.js        │   │   │
│  │ - Resumes DB    │     │  │ (Auth UI)   │    │ (Form Detection)  │   │   │
│  │ - Jobs DB       │     │  └─────────────┘    └───────────────────┘   │   │
│  │                 │     │         │                    │              │   │
│  └────────┬────────┘     │         ▼                    ▼              │   │
│           │              │  ┌─────────────────────────────────────┐    │   │
│           │              │  │           ATS Adapters              │    │   │
│           │              │  │                                     │    │   │
│           │              │  │  ┌──────────┐  ┌──────────┐        │    │   │
│           │              │  │  │ Workday  │  │Greenhouse│  ...   │    │   │
│           │              │  │  └──────────┘  └──────────┘        │    │   │
│           │              │  └─────────────────────────────────────┘    │   │
│           │              │                    │                        │   │
│           │              └────────────────────┼────────────────────────┘   │
│           │                                   │                            │
│           │                                   ▼                            │
│           │              ┌─────────────────────────────────────────────┐   │
│           │              │            Employer Career Sites            │   │
│           │              │                                             │   │
│           │              │  Cleveland Clinic  │  Northwell  │  Yale    │   │
│           │              │  (Workday)         │  (iCIMS)    │  (Jibe)  │   │
│           │              └─────────────────────────────────────────────┘   │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────┐                                                       │
│  │ /api/user/      │                                                       │
│  │   profile       │  Returns structured profile data for autofill        │
│  └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Risks and Considerations

### Legal/ToS Issues

| Risk | Mitigation |
|------|------------|
| Violating site ToS | User-initiated, not automated mass apply |
| Bot detection | Extension runs in user's browser, not headless |
| Account bans | User controls the process, reviews before submit |

### Technical Challenges

| Challenge | Solution |
|-----------|----------|
| ATS changes their DOM | Monitor for changes, update adapters |
| Login required | Prompt user to login, don't store passwords |
| File uploads (resume) | Use File API to programmatically set files |
| CAPTCHA | Cannot bypass, user completes manually |
| iFrames | Need to access iframe contentDocument |

### Privacy Considerations

- Extension only activates on job sites
- Profile data fetched only when user clicks AutoFill
- No data sent to third parties
- User can disconnect extension at any time

---

## Development Roadmap

### Phase 1: MVP (2-3 weeks)
- [ ] Chrome extension scaffold
- [ ] Workday adapter (covers 5 employers)
- [ ] Basic profile API endpoint
- [ ] Floating button UI
- [ ] Manual testing with real applications

### Phase 2: Expand Coverage (2-3 weeks)
- [ ] Greenhouse adapter
- [ ] Lever adapter
- [ ] Generic heuristic fallback
- [ ] Better error handling
- [ ] User feedback mechanism

### Phase 3: Polish (1-2 weeks)
- [ ] Extension popup with settings
- [ ] Field mapping customization
- [ ] Application history tracking
- [ ] Chrome Web Store submission

### Phase 4: Advanced Features (Future)
- [ ] AI-powered cover letter generation
- [ ] Answer caching for repeated questions
- [ ] LinkedIn OAuth integration
- [ ] Firefox extension port

---

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Puppeteer for Testing](https://pptr.dev/)
- [Workday DOM Reference](https://community.workday.com/)
- [LazyApply Extension](https://chromewebstore.google.com/detail/lazyapply-job-application/pgnfaifdbfoiehcndkoeemaifhhbgkmm)
- [JobCopilot](https://jobcopilot.com/)

---

*Document created: January 2026*
*Last updated: January 2026*
