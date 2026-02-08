# ATS Score Feature - Implementation Plan

> **Status:** Ready to Implement
> **Created:** 2026-02-04
> **Estimated Effort:** 1-2 weeks

---

## Overview

Add a real-time ATS (Applicant Tracking System) Score feature to the resume builder that:
1. Analyzes resume content against 15+ factors
2. Shows a 0-100 score that updates as user edits
3. Provides actionable suggestions for improvement
4. Demonstrates value before the paywall
5. Creates urgency to fix issues

---

## Architecture Decision

### Where to Place the ATS Score

**Decision: Tabbed Interface in Preview Column**

```
┌─────────────────────────────────────────────────────────────┐
│  Resume Builder                                             │
├──────────┬──────────────────────┬───────────────────────────┤
│          │                      │ [Preview] [ATS Score]     │ ← Tab buttons
│ Sidebar  │   Main Edit Area     │───────────────────────────│
│ (200px)  │   (Active section)   │                           │
│          │                      │  If Preview tab:          │
│ - Nav    │                      │    Resume Preview         │
│ - Prog   │                      │                           │
│          │                      │  If ATS Score tab:        │
│          │                      │    Score Gauge (67/100)   │
│          │                      │    Factor breakdown       │
│          │                      │    Suggestions list       │
│          │                      │                           │
└──────────┴──────────────────────┴───────────────────────────┘
```

**Why this approach:**
- Doesn't clutter the main editing area
- User can switch between preview and analysis
- Score is always accessible while editing
- Clean, professional UI
- Works on mobile (tabs stack naturally)

---

## Scoring System Design

### Score Categories (100 points total)

#### Content Quality (45 points)
| Factor | Points | Criteria |
|--------|--------|----------|
| Professional Summary | 8 | Has summary with 50-300 characters |
| Quantified Achievements | 12 | Experience bullets contain numbers/metrics |
| Action Verbs | 8 | Bullets start with strong verbs |
| Summary Length | 5 | 2-4 sentences (optimal for ATS) |
| Bullet Points | 7 | Each job has 3-6 bullet points |
| Skills Relevance | 5 | Has 5-15 skills listed |

#### Format & Structure (25 points)
| Factor | Points | Criteria |
|--------|--------|----------|
| Standard Sections | 5 | Has all major sections |
| Consistent Dates | 5 | Date formats are consistent |
| Employment Continuity | 5 | No unexplained gaps > 6 months |
| Resume Length | 5 | 300-800 words (1-2 pages) |
| Contact Info | 5 | Name + email + phone minimum |

#### Completeness (30 points)
| Factor | Points | Criteria |
|--------|--------|----------|
| Contact Information | 8 | All fields filled |
| Work Experience | 10 | At least 1 position with details |
| Education | 6 | At least 1 entry |
| Skills Section | 6 | Has skills listed |

### Score Thresholds

| Score | Label | Color | Badge |
|-------|-------|-------|-------|
| 0-39 | Needs Work | `#dc3545` (red) | ⚠️ |
| 40-59 | Getting There | `#fd7e14` (orange) | 🔶 |
| 60-79 | Good | `#ffc107` (yellow) | ⭐ |
| 80-89 | Strong | `#28a745` (light green) | ✅ |
| 90-100 | Excellent | `#20c997` (teal) | 🎯 |

---

## File Structure

### New Files to Create

```
lib/
  services/
    atsScoreService.js          # Core scoring logic

components/
  ResumeBuilder/
    ATSScore/
      ATSScorePanel.jsx         # Main panel component
      ATSScoreGauge.jsx         # Circular score visualization
      ScoreFactorList.jsx       # Factor breakdown
      ScoreSuggestions.jsx      # Improvement tips
      ATSScore.module.css       # Styles
      index.js                  # Exports
```

### Files to Modify

```
components/
  ModernResumeBuilder/
    ModernResumeBuilder.jsx     # Add tab interface + score panel
    ModernResumeBuilder.module.css  # Add tab styles

pages/
  resume-builder.jsx            # Add score teaser on landing
```

---

## Implementation Details

### 1. ATS Score Service (`lib/services/atsScoreService.js`)

```javascript
/**
 * ATS Score Service
 * Analyzes resume data and returns a score with detailed breakdown
 */

const SCORE_FACTORS = {
  // Content Quality (45 points)
  hasSummary: {
    points: 8,
    category: 'content',
    label: 'Professional Summary',
    check: (data) => data.summary && data.summary.length >= 50,
    suggestion: 'Add a professional summary (2-4 sentences about your experience)'
  },

  hasQuantifiedAchievements: {
    points: 12,
    category: 'content',
    label: 'Quantified Achievements',
    check: (data) => {
      const bullets = getAllBullets(data.experience);
      const withNumbers = bullets.filter(b => /\d+/.test(b));
      return withNumbers.length >= 2;
    },
    suggestion: 'Add numbers to your achievements (e.g., "Managed 10 patients daily")'
  },

  // ... more factors
};

export function calculateATSScore(resumeData) {
  const results = {
    score: 0,
    maxScore: 100,
    factors: {},
    suggestions: [],
    breakdown: {
      content: { earned: 0, possible: 45 },
      format: { earned: 0, possible: 25 },
      completeness: { earned: 0, possible: 30 }
    }
  };

  // Calculate each factor
  Object.entries(SCORE_FACTORS).forEach(([key, factor]) => {
    const passed = factor.check(resumeData);
    const earned = passed ? factor.points : 0;

    results.factors[key] = {
      passed,
      points: earned,
      maxPoints: factor.points,
      label: factor.label,
      category: factor.category
    };

    results.score += earned;
    results.breakdown[factor.category].earned += earned;

    if (!passed) {
      results.suggestions.push({
        factor: key,
        label: factor.label,
        suggestion: factor.suggestion,
        points: factor.points
      });
    }
  });

  // Sort suggestions by impact (highest points first)
  results.suggestions.sort((a, b) => b.points - a.points);

  return results;
}

export function getScoreLabel(score) {
  if (score >= 90) return { label: 'Excellent', color: '#20c997', badge: '🎯' };
  if (score >= 80) return { label: 'Strong', color: '#28a745', badge: '✅' };
  if (score >= 60) return { label: 'Good', color: '#ffc107', badge: '⭐' };
  if (score >= 40) return { label: 'Getting There', color: '#fd7e14', badge: '🔶' };
  return { label: 'Needs Work', color: '#dc3545', badge: '⚠️' };
}
```

### 2. ATS Score Panel Component (`components/ResumeBuilder/ATSScore/ATSScorePanel.jsx`)

```jsx
import { useMemo } from 'react';
import { calculateATSScore, getScoreLabel } from '@/lib/services/atsScoreService';
import ATSScoreGauge from './ATSScoreGauge';
import ScoreFactorList from './ScoreFactorList';
import ScoreSuggestions from './ScoreSuggestions';
import styles from './ATSScore.module.css';

export default function ATSScorePanel({ resumeData, jobContext }) {
  // Calculate score (memoized to prevent recalc on every render)
  const scoreResult = useMemo(() => {
    return calculateATSScore(resumeData, jobContext);
  }, [resumeData, jobContext]);

  const { label, color, badge } = getScoreLabel(scoreResult.score);

  return (
    <div className={styles.panel}>
      {/* Score Gauge */}
      <div className={styles.gaugeContainer}>
        <ATSScoreGauge
          score={scoreResult.score}
          color={color}
          label={label}
          badge={badge}
        />
      </div>

      {/* Category Breakdown */}
      <div className={styles.breakdown}>
        <h4>Score Breakdown</h4>
        <div className={styles.categories}>
          <CategoryBar
            label="Content"
            earned={scoreResult.breakdown.content.earned}
            possible={scoreResult.breakdown.content.possible}
          />
          <CategoryBar
            label="Format"
            earned={scoreResult.breakdown.format.earned}
            possible={scoreResult.breakdown.format.possible}
          />
          <CategoryBar
            label="Completeness"
            earned={scoreResult.breakdown.completeness.earned}
            possible={scoreResult.breakdown.completeness.possible}
          />
        </div>
      </div>

      {/* Top Suggestions */}
      <div className={styles.suggestions}>
        <h4>Top Improvements</h4>
        <ScoreSuggestions
          suggestions={scoreResult.suggestions.slice(0, 5)}
        />
      </div>

      {/* Detailed Factors (collapsible) */}
      <details className={styles.details}>
        <summary>View All Factors ({Object.keys(scoreResult.factors).length})</summary>
        <ScoreFactorList factors={scoreResult.factors} />
      </details>
    </div>
  );
}
```

### 3. Integration into ModernResumeBuilder

**Add state for active tab:**
```javascript
const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'score'
```

**Modify previewColumn JSX:**
```jsx
<div className={styles.previewColumn} ref={previewRef}>
  {/* Tab Navigation */}
  <div className={styles.previewTabs}>
    <button
      className={`${styles.tabButton} ${activeTab === 'preview' ? styles.activeTab : ''}`}
      onClick={() => setActiveTab('preview')}
    >
      <FaEye /> Preview
    </button>
    <button
      className={`${styles.tabButton} ${activeTab === 'score' ? styles.activeTab : ''}`}
      onClick={() => setActiveTab('score')}
    >
      <FaChartLine /> ATS Score
    </button>
  </div>

  {/* Tab Content */}
  {activeTab === 'preview' ? (
    <>
      <div className={styles.previewHeader}>
        <h2 className={styles.previewTitle}>Resume Preview</h2>
        <p className={styles.previewSubtitle}>This is how your resume will look</p>
      </div>
      <ResumePreview
        resumeData={resumeData}
        template={selectedTemplate}
        sectionOrder={sectionOrder}
      />
    </>
  ) : (
    <ATSScorePanel
      resumeData={resumeData}
      jobContext={internalJobContext}
    />
  )}
</div>
```

---

## Job Match Score (Bonus Feature)

When user is in Tailor mode (has `jobContext`), show additional job match analysis:

```javascript
export function calculateJobMatchScore(resumeData, jobContext) {
  if (!jobContext?.description) return null;

  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobContext.description);

  // Check which keywords are in resume
  const resumeText = getResumeFullText(resumeData);
  const matched = [];
  const missing = [];

  jobKeywords.forEach(keyword => {
    if (resumeText.toLowerCase().includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  return {
    matchPercent: Math.round((matched.length / jobKeywords.length) * 100),
    matched,
    missing,
    total: jobKeywords.length
  };
}
```

**UI Addition:**
```jsx
{jobContext && (
  <div className={styles.jobMatch}>
    <h4>Job Match</h4>
    <div className={styles.matchPercent}>{jobMatch.matchPercent}%</div>
    <div className={styles.keywords}>
      <span className={styles.matched}>✓ {jobMatch.matched.length} matched</span>
      <span className={styles.missing}>✗ {jobMatch.missing.length} missing</span>
    </div>
    {jobMatch.missing.length > 0 && (
      <div className={styles.missingKeywords}>
        <small>Missing: {jobMatch.missing.slice(0, 5).join(', ')}</small>
      </div>
    )}
  </div>
)}
```

---

## CSS Styling

### Tab Styles
```css
.previewTabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-color);
  border-radius: 16px 16px 0 0;
}

.tabButton {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-medium);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.tabButton:hover {
  background: var(--background-color);
}

.activeTab {
  background: var(--primary-blue);
  color: white;
}
```

### Score Panel Styles
```css
.panel {
  padding: 24px;
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.gaugeContainer {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.breakdown {
  margin-top: 24px;
  padding: 16px;
  background: var(--background-color);
  border-radius: 12px;
}

.suggestions {
  margin-top: 24px;
}

.suggestionItem {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fff8e6;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #ffc107;
}
```

---

## Mobile Responsiveness

On mobile (< 768px):
- Tabs stack horizontally (full width each)
- Score gauge scales down
- Preview/Score becomes toggle (not visible simultaneously with editor)
- "View Preview" floating button shows current score badge

```css
@media (max-width: 768px) {
  .previewTabs {
    flex-direction: column;
  }

  .tabButton {
    width: 100%;
  }

  .panel {
    padding: 16px;
  }

  .gaugeContainer svg {
    width: 150px;
    height: 150px;
  }
}
```

---

## Integration with 3 Flows

### Flow 1: Build New Resume
- Score starts at ~20-30 (only contact info)
- Updates in real-time as user fills sections
- Celebrate when score crosses thresholds (60, 80, 90)
- Show score tab with pulse animation when new section completed

### Flow 2: Import Resume
- Calculate score immediately after import
- Show "Your imported resume scores X/100"
- Highlight what's missing from imported data
- Suggest improvements before editing

### Flow 3: Tailor for Job
- Show BOTH ATS Score AND Job Match Score
- "ATS Score: 75 | Job Match: 62%"
- Missing keywords highlighted prominently
- "Tailor Now" button shows potential score improvement

---

## Success Celebration

When user reaches milestones:

```javascript
const MILESTONES = [60, 80, 90];

// In score calculation effect
useEffect(() => {
  const newScore = scoreResult.score;
  const crossedMilestone = MILESTONES.find(m =>
    previousScore < m && newScore >= m
  );

  if (crossedMilestone) {
    showCelebration({
      60: "Great progress! Your resume is now Good.",
      80: "Excellent! Your resume is Strong.",
      90: "Amazing! Your resume is Application-Ready!"
    }[crossedMilestone]);
  }

  setPreviousScore(newScore);
}, [scoreResult.score]);
```

---

## Paywall Integration

### What's Free
- Full ATS Score visibility
- All factor breakdown
- Top 3 suggestions

### What's Premium
- AI-powered fix suggestions (not just what's wrong, but how to fix)
- One-click AI improvements
- Job Match keyword insertion
- Unlimited downloads

### Paywall Messaging
```jsx
{!isPremium && scoreResult.score < 80 && (
  <div className={styles.premiumUpsell}>
    <h4>Want to improve your score?</h4>
    <p>Upgrade to get AI-powered suggestions that can boost your score to 90+</p>
    <button onClick={handleUpgrade}>Upgrade Now</button>
  </div>
)}
```

---

## Testing Checklist

- [ ] Score calculates correctly for empty resume
- [ ] Score updates in real-time as user types
- [ ] All 3 flows show score correctly
- [ ] Tab switching works smoothly
- [ ] Mobile layout responsive
- [ ] Job Match shows when job context present
- [ ] Suggestions are actionable and specific
- [ ] Celebration animations trigger at milestones
- [ ] Score persists after page refresh
- [ ] Works for imported resumes
- [ ] Works for tailored resumes

---

## Future Enhancements

1. **AI-Powered Suggestions** - Not just "add numbers" but "Your 'Managed patient care' could become 'Managed care for 15+ patients daily, improving satisfaction scores by 20%'"

2. **Industry-Specific Scoring** - Nursing-specific factors (certifications, license info, clinical skills)

3. **Comparison Tool** - "Your resume scores higher than 72% of candidates for this role"

4. **History Tracking** - Show score improvement over time

5. **A/B Testing** - Test different scoring weights and suggestions
