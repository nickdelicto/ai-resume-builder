# Standardized Job Description Template

This template is used by GPT-4o-mini to reformat scraped job descriptions into a consistent format.

---

## Template Structure

```markdown
## About This Role

[1-2 sentence overview of what this role entails and who it's ideal for]

## 📋 Highlights

| | |
|---|---|
| 💰 **Pay** | $X - $Y per hour (or annual salary) |
| 📍 **Location** | City, State |
| ⏰ **Schedule** | Full-time / Part-time / Per Diem, Day/Night/Rotating shifts |
| 🎁 **Sign-On Bonus** | Up to $X,XXX (if applicable) |

## What You'll Do

• Primary responsibility 1
• Primary responsibility 2
• Primary responsibility 3
• Primary responsibility 4
• Primary responsibility 5

## Requirements

**Education:**
• Required education (e.g., BSN, MSN, ADN)
• Preferred education (if different)

**Experience:**
• X years of experience in [specialty/area]
• Preferred experience (if applicable)

**Licenses & Certifications:**
• State RN License required
• BLS/ACLS/PALS certification (as applicable)
• Specialty certification (if required)

## Benefits

• Benefit 1 (e.g., Competitive salary)
• Benefit 2 (e.g., Health/dental/vision insurance)
• Benefit 3 (e.g., Tuition reimbursement)
• Benefit 4 (e.g., Retirement plan with employer match)
• Benefit 5 (e.g., Paid time off)

## About {Employer Name}

[1-2 sentences about the employer, their mission, and what makes them a great place to work]
```

---

## GPT-4o-mini Prompt Template

```
You are a job description formatter for a nursing job board. Rewrite the following job description into a standardized format that is clean, scannable, and highlights the most important information for job seekers.

RULES:
1. Use the exact template structure provided below
2. Extract and organize information into the correct sections
3. If information for a section is not available in the original, SKIP that section entirely - do not make up information
4. Keep bullet points concise (1 line each when possible)
5. For "What You'll Do", include 4-6 key responsibilities
6. For "Requirements", separate into Education, Experience, and Licenses & Certifications
7. For "Benefits", only include if mentioned in original (skip if not present)
8. For "About {Employer Name}", only include if employer info is present (skip if not present)
9. Preserve all specific numbers (pay ranges, sign-on bonuses, years of experience)
10. Do not add information not present in the original

TEMPLATE:
## About This Role
[1-2 sentence overview]

## 📋 Highlights
| | |
|---|---|
| 💰 **Pay** | [Pay range if available] |
| 📍 **Location** | [City, State] |
| ⏰ **Schedule** | [Shift/schedule info] |
| 🎁 **Sign-On Bonus** | [Amount if mentioned] |

## What You'll Do
• [Responsibility 1]
• [Responsibility 2]
...

## Requirements
**Education:**
• [Education requirements]

**Experience:**
• [Experience requirements]

**Licenses & Certifications:**
• [License/cert requirements]

## Benefits
• [Benefit 1]
• [Benefit 2]
...

## About {Employer Name}
[Brief employer description]

---

ORIGINAL JOB DESCRIPTION:
{job_description}

---

OUTPUT (formatted job description):
```

---

## Section Guidelines

### About This Role
- Single paragraph, 1-2 sentences
- Describe what the role is and who would be a good fit
- Example: "Join our Emergency Department team as a Registered Nurse providing critical care to patients in a Level II Trauma Center. Ideal for nurses who thrive in fast-paced environments and have experience in acute care settings."

### Highlights (Table)
- Only include rows where data is available
- Pay: Use exact ranges from original (e.g., "$40.70 - $61.05/hour")
- Location: City, State format
- Schedule: Include shift type (Day/Night/Rotating) and FT/PT/Per Diem
- Sign-On Bonus: Only if mentioned, include exact amount

### What You'll Do
- 4-6 bullet points maximum
- Start each with an action verb
- Focus on primary responsibilities, not administrative tasks
- Keep each bullet to 1 line when possible

### Requirements
- Separate into three clear subsections
- Include both required and preferred if mentioned
- Preserve specific requirements (e.g., "2 years Med/Surg experience")

### Benefits (Optional)
- Skip entirely if not mentioned in original
- List 3-6 key benefits
- Don't include generic benefits unless specifically mentioned

### About {Employer Name} (Optional)
- Skip if no employer context in original
- 1-2 sentences maximum
- Focus on what makes the employer unique

---

## Examples of Section Omission

If original job has no pay info:
- Remove the 💰 **Pay** row from Highlights table

If original job has no benefits section:
- Remove the entire "## Benefits" section

If original job has no employer description:
- Remove the entire "## About {Employer Name}" section
