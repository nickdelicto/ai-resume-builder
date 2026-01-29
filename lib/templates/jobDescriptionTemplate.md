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
| 🏥 **Facility** | Specific hospital/facility name (if part of health system) |
| 🏢 **Department/Unit** | Department or unit name (e.g., Emergency Department, ICU) |
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
3. If information for a Highlights row is not available in the original, SKIP that row - do not make up information
4. Keep bullet points concise (1 line each when possible)
5. For "What You'll Do", include up to 10 key responsibilities
6. For "Requirements", separate into Education, Experience, and Licenses & Certifications - be thorough in extracting ALL education levels (ADN, BSN, MSN, etc.), years of experience, and certifications mentioned
7. For "Benefits", only include if mentioned in original (skip if not present)
8. For "About {Employer Name}", ALWAYS include this section - write 1-2 sentences about the employer based on their name (e.g., if employer is "Cleveland Clinic", mention it's a leading academic medical center)
9. Preserve all specific numbers (pay ranges, sign-on bonuses, years of experience)
10. Do not add information not present in the original (except for About section where a brief employer intro is always needed)
11. IMPORTANT: If the source contains a line like "Facility: Kings County Hospital Center" or similar, you MUST add a row "🏥 **Facility** | Kings County Hospital Center" to the Highlights table. This applies to all health systems with multiple hospitals.
12. For "Department/Unit", include if a specific department or unit is mentioned (e.g., "Emergency Department", "ICU", "Cardiac Care Unit")

TEMPLATE:
## About This Role
[1-2 sentence overview]

## 📋 Highlights
| | |
|---|---|
| 💰 **Pay** | [Pay range if available] |
| 📍 **Location** | [City, State] |
| 🏥 **Facility** | [Specific hospital/facility if part of health system] |
| 🏢 **Department/Unit** | [Department or unit name] |
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
- Facility: Specific hospital/facility within a health system (e.g., "Bellevue Hospital" for NYC Health + Hospitals, "Hillcrest Hospital" for Cleveland Clinic). If source has "Facility: [Name]", always include this row. Skip only if employer IS the facility (single-location employer).
- Department/Unit: The department, unit, or service area (e.g., "Emergency Department", "ICU - Cardiac", "Ambulatory Surgery"). Skip if not mentioned.
- Schedule: Include shift type (Day/Night/Rotating) and FT/PT/Per Diem
- Sign-On Bonus: Only if mentioned, include exact amount

### What You'll Do
- Upto 10 bullet points maximum
- Start each with an action verb
- Focus on primary responsibilities, not administrative tasks
- Keep each bullet to 1 line when possible

### Requirements
- Separate into three clear subsections: Education, Experience, Licenses & Certifications
- Be thorough - extract ALL mentioned requirements:
  - **Education**: List all degree levels (ADN, BSN, MSN, DNP, etc.), mark which are required vs preferred
  - **Experience**: Extract specific years (e.g., "2+ years"), specialties (e.g., "Med/Surg", "ICU"), and any preferred experience
  - **Licenses & Certifications**: List all certifications (BLS, ACLS, PALS, NRP, specialty certs), state licensure requirements
- Include both required and preferred if mentioned
- Preserve exact numbers and requirements from the original

### Benefits (Optional)
- Skip entirely if not mentioned in original
- List upto 6 key benefits
- Don't include generic benefits unless specifically mentioned

### About {Employer Name} (Required)
- ALWAYS include this section - never skip it
- If employer info is in the original, use that
- If not, write 1-2 generic sentences based on employer name (e.g., "{Employer Name} is a leading healthcare provider committed to delivering exceptional patient care.")
- 2-3 sentences maximum
- Focus on what makes the employer unique

---

## Examples of Section Omission

If original job has no pay info:
- Remove the 💰 **Pay** row from Highlights table

If original job has no facility info (or employer IS the facility):
- Remove the 🏥 **Facility** row from Highlights table

If original job has no department/unit info:
- Remove the 🏢 **Department/Unit** row from Highlights table

If original job has no benefits section:
- Remove the entire "## Benefits" section

**Note:** The "## About {Employer Name}" section is ALWAYS required - never omit it
