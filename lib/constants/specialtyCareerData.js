/**
 * Specialty Career Data
 *
 * Comprehensive career guide data for nursing specialties.
 * Each specialty includes researched, authoritative content for
 * programmatic "How to Become a [Specialty] Nurse" pages.
 *
 * Data sources: AACN, BLS, NCC, nursing certification bodies
 * Last updated: January 2025
 */

const SPECIALTY_CAREER_DATA = {
  "how-to-become-icu-nurse": {
    // Basic identification
    slug: "how-to-become-icu-nurse",
    specialty: "icu",  // For linking to job pages
    name: "ICU",
    fullName: "Intensive Care Unit",
    alternateNames: ["Critical Care", "CCU", "MICU", "SICU"],

    // SEO metadata
    seo: {
      title: "How to Become an ICU Nurse in {year}: Salary, Requirements & Career Paths",
      description: "Learn how to become an ICU nurse with our comprehensive guide covering education requirements, CCRN certification, salary expectations, and career advancement paths.",
      keywords: ["ICU nurse", "critical care nurse", "CCRN certification", "ICU nurse salary", "how to become ICU nurse"]
    },

    // Hero section - quick facts
    quickFacts: {
      avgSalary: "$85,000–$95,000",
      salaryRange: "$78,000 - $121,000+",
      salarySource: "Salary.com, ZipRecruiter",
      salarySourceUrl: "https://www.salary.com/research/salary/alternate/icu-nurse-salary",
      typicalTimeToSpecialize: "4–6 years",
      jobGrowth: "5% (2024–2034)",
      jobGrowthSource: "Bureau of Labor Statistics",
      jobGrowthSourceUrl: "https://www.bls.gov/ooh/healthcare/registered-nurses.htm",
      demandLevel: "Very High",
      certificationRequired: false,
      certificationRecommended: true
    },

    // Article introduction
    introduction: `If you thrive under pressure and want to make a profound difference in patients' lives during their most vulnerable moments, a career as an ICU nurse might be your calling. Intensive Care Unit nurses, also known as critical care nurses, provide round-the-clock care to patients facing life-threatening conditions, from traumatic injuries to severe infections and post-surgical complications.

It's a specialty that demands exceptional clinical skills, rapid decision-making, and the emotional resilience to navigate both triumphant recoveries and heartbreaking losses. But for those drawn to this challenging work, the rewards are immeasurable: the chance to quite literally save lives, master cutting-edge medical technology, and develop expertise that's in high demand nationwide.

This guide covers everything you need to know about becoming an ICU nurse, including education requirements, certification pathways, realistic salary expectations, and career advancement opportunities.`,

    // What they do section
    roleOverview: {
      title: "What Do ICU Nurses Do?",
      content: `ICU nurses care for patients with the most severe and complex medical conditions, specifically those who require continuous monitoring and life-sustaining interventions. Unlike general medical-surgical units where nurses might care for five or six patients, ICU nurses typically manage just one or two patients at a time, allowing for the intensive focus these critical cases demand.

Your patients might include someone recovering from open-heart surgery, a trauma victim stabilizing after a car accident, a patient in septic shock from a severe infection, or someone requiring mechanical ventilation after respiratory failure. The work is technically demanding, emotionally intense, and deeply rewarding.`,

      dailyResponsibilities: [
        "Continuously monitor vital signs, hemodynamic status, and neurological function",
        "Manage mechanical ventilators and troubleshoot airway issues",
        "Administer and titrate vasoactive medications (pressors, sedatives, paralytics)",
        "Interpret cardiac rhythms, lab values, and arterial blood gases",
        "Perform advanced assessments and recognize early signs of deterioration",
        "Collaborate with physicians, respiratory therapists, and multidisciplinary teams",
        "Insert and manage arterial lines, central lines, and other invasive monitoring",
        "Provide compassionate support to families navigating critical illness",
        "Respond to rapid changes in patient condition, including codes and emergencies",
        "Document meticulously in electronic health records"
      ],

      workEnvironment: `ICU nurses work in hospital intensive care units, which may be general ICUs or specialized units like cardiac ICUs (CCU), surgical ICUs (SICU), medical ICUs (MICU), neuro ICUs, or trauma ICUs. The environment is fast-paced and technology-rich, with monitors, ventilators, IV pumps, and other equipment surrounding each patient bed.

Most ICU nurses work 12-hour shifts (7 AM – 7 PM or 7 PM – 7 AM), with night and weekend rotations common. The work is physically demanding, requiring you to be on your feet, repositioning patients, and responding to emergencies. Emotionally, you'll experience the highs of seeing critically ill patients recover and the lows of losing patients despite your best efforts.`
    },

    // Step-by-step guide
    steps: [
      {
        number: 1,
        title: "Earn Your Nursing Degree",
        content: `Your journey begins with completing an accredited nursing program. You have two main options:

**Associate Degree in Nursing (ADN):** A two-year program that covers nursing fundamentals and prepares you for the NCLEX-RN exam. This is the faster path to becoming an RN, though many hospitals increasingly prefer BSN-prepared nurses for ICU positions.

**Bachelor of Science in Nursing (BSN):** A four-year program that provides deeper coursework in leadership, research, community health, and advanced clinical skills. The [American Association of Colleges of Nursing (AACN)](https://www.aacnnursing.org/news-data/fact-sheets/nursing-workforce-fact-sheet) reports that most healthcare employers now prefer BSN graduates, particularly for specialized units like the ICU.

If you already have a bachelor's degree in another field, [accelerated BSN (ABSN) programs](https://thecollegeapplication.com/accelerated-bsn-programs-for-non-nurses/) offer a fast-track option, typically completing in 12–18 months.

**Bottom line:** While an ADN can get you started, a BSN will open more doors in critical care. Many ADN nurses pursue RN-to-BSN bridge programs while working.`,
        sources: [
          { name: "American Association of Colleges of Nursing", url: "https://www.aacnnursing.org/news-data/fact-sheets/nursing-workforce-fact-sheet" }
        ]
      },
      {
        number: 2,
        title: "Pass the NCLEX-RN Exam",
        content: `After graduating from your nursing program, you'll need to pass the National Council Licensure Examination for Registered Nurses (NCLEX-RN) to earn your RN license. This computer-adaptive test assesses your readiness for entry-level nursing practice, covering:

- Safe and effective care environment
- Health promotion and maintenance
- Psychosocial integrity
- Physiological integrity (the largest portion)

The [Next Generation NCLEX](https://www.nclex.com/next-generation-nclex.page), launched in April 2023, adapts to your ability level in real-time. Most candidates receive between **85–150 questions**, including case studies that test clinical judgment. Results are typically available within 48 hours.

**Pro tip:** Take your NCLEX-RN soon after graduation while the material is fresh. Use a [reputable NCLEX-RN review course](https://thecollegeapplication.com/best-nclex-prep-courses/) and practice with NCLEX-style questions.`,
        sources: [
          { name: "NCSBN - Next Generation NCLEX", url: "https://www.nclex.com/next-generation-nclex.page" }
        ]
      },
      {
        number: 3,
        title: "Gain Foundational Nursing Experience",
        content: `While direct-entry ICU positions are becoming more common, many hospitals still prefer nurses with foundational experience before transitioning to critical care.

**The typical path:** Spend 1–2 years in a medical-surgical unit, step-down/progressive care unit, or telemetry floor. These units help you develop:

- Time management and prioritization skills
- Confidence with common medications and IV administration
- Assessment skills to recognize patient deterioration
- Communication with physicians and interdisciplinary teams
- Comfort with electronic health records and documentation

**New graduate ICU residencies:** Increasingly, hospitals offer structured new graduate ICU residency programs with extended orientations (often 6–12 months), dedicated preceptors, and gradual patient acuity progression. Programs at [Mayo Clinic](https://jobs.mayoclinic.org/nurseresidencyprograms), [Kaiser Permanente](https://www.kaiserpermanentejobs.org/nurse-residency-career), and other academic medical centers actively recruit new graduates. These programs are competitive but worth pursuing if you're committed to critical care.

During this phase, express your ICU interest to your manager, volunteer for critical care float shifts if available, and pursue certifications like BLS, ACLS, and NIH Stroke Scale.`,
        sources: [
          { name: "Mayo Clinic Nurse Residency Programs", url: "https://jobs.mayoclinic.org/nurseresidencyprograms" }
        ]
      },
      {
        number: 4,
        title: "Transition to the ICU",
        content: `Once you've built your foundation (or secured a new-grad residency position), it's time to make the move. When applying for ICU positions, highlight:

- Your patient acuity experience (step-down, telemetry, complex cases)
- Any exposure to critical care through floating or codes
- Certifications you've obtained (ACLS is often required)
- Your commitment to continued learning in critical care

**What to expect during ICU orientation:** Most hospitals provide 8–16 weeks of ICU-specific orientation, pairing you with an experienced preceptor. You'll progress from stable patients to increasingly complex cases, learning:

- Ventilator management and modes
- Hemodynamic monitoring and interpretation
- Vasoactive medication titration
- Common ICU diagnoses and treatment protocols
- End-of-life care and family communication

Don't be discouraged if the learning curve feels steep. It's normal to feel overwhelmed initially. Critical care nursing builds on thousands of small experiences, and competence develops over time.`,
        sources: []
      },
      {
        number: 5,
        title: "Pursue CCRN Certification",
        content: `While not legally required, the Certification for Adult Critical Care Nurses (CCRN) is the gold standard credential for ICU nurses. Offered by the [American Association of Critical-Care Nurses (AACN)](https://www.aacn.org/certification/get-certified/ccrn-adult), the CCRN demonstrates your specialized knowledge and commitment to excellence.

**Eligibility requirements:**
- Current, unencumbered RN or APRN license
- **Two-year option:** 1,750 hours of direct bedside care for acutely/critically ill patients in the past 2 years, with 875 hours in the most recent year
- **Five-year option:** 2,000 hours of direct care over 5 years, with 144 hours in the most recent year

**The exam:**
- 150 questions (125 scored, 25 pilot questions)
- 3 hours to complete
- 80% clinical judgment, 20% professional caring and ethical practice
- Based on the AACN Synergy Model for Patient Care
- Cost: $255 (AACN members) / $370 (non-members)

**Exam content areas include:**
- Cardiovascular (17%)
- Pulmonary (15%)
- Neurology (10%)
- Multisystem (14%)
- Endocrine, hematology, renal, GI, and behavioral/psychosocial

CCRN certification is valid for 3 years and can be renewed through continuing education or re-examination. AACN periodically updates exam blueprints, so candidates should verify current exam details on the [AACN website](https://www.aacn.org/certification/get-certified/ccrn-adult).`,
        sources: [
          { name: "AACN CCRN Certification", url: "https://www.aacn.org/certification/get-certified/ccrn-adult" },
          { name: "AACN CCRN FAQ", url: "https://www.aacn.org/certification/get-certified/ccrn-frequently-asked-questions" }
        ]
      }
    ],

    // Skills section
    skills: {
      technical: [
        {
          name: "Ventilator Management",
          description: "Understanding ventilator modes (AC, SIMV, CPAP, BiPAP), troubleshooting alarms, and weaning protocols"
        },
        {
          name: "Hemodynamic Monitoring",
          description: "Interpreting arterial lines, central venous pressure, cardiac output, and vasoactive medication effects"
        },
        {
          name: "Cardiac Rhythm Interpretation",
          description: "Recognizing arrhythmias, understanding 12-lead EKGs, and responding to life-threatening rhythms"
        },
        {
          name: "Advanced Assessment",
          description: "Performing comprehensive neurological, respiratory, and cardiovascular assessments"
        },
        {
          name: "Medication Expertise",
          description: "Administering and titrating high-risk medications including pressors, sedatives, and paralytics"
        },
        {
          name: "Life Support Interventions",
          description: "ACLS protocols, defibrillation, cardioversion, and post-arrest care"
        }
      ],
      soft: [
        {
          name: "Critical Thinking Under Pressure",
          description: "Making rapid decisions when patients deteriorate, prioritizing interventions effectively"
        },
        {
          name: "Communication",
          description: "Clearly conveying patient status to physicians, collaborating with multidisciplinary teams, and supporting families"
        },
        {
          name: "Emotional Resilience",
          description: "Processing difficult outcomes, maintaining composure during crises, and practicing self-care"
        },
        {
          name: "Attention to Detail",
          description: "Catching subtle changes in patient status, maintaining accurate documentation, and preventing errors"
        },
        {
          name: "Adaptability",
          description: "Adjusting care plans as patient conditions change, learning new technologies and protocols"
        }
      ]
    },

    // Certifications section
    certifications: [
      {
        name: "CCRN",
        fullName: "Critical Care Registered Nurse",
        organization: "AACN (American Association of Critical-Care Nurses)",
        required: false,
        recommended: true,
        isPrimary: true,
        requirements: "1,750 hours direct care in past 2 years (or 2,000 hours over 5 years)",
        examDetails: "150 questions, 3 hours, $255-$370",
        renewalPeriod: "3 years",
        url: "https://www.aacn.org/certification/get-certified/ccrn-adult"
      },
      {
        name: "CMC",
        fullName: "Cardiac Medicine Certification",
        organization: "AACN",
        required: false,
        recommended: false, // Only relevant for cardiac-specific ICUs (CCU, CVICU)
        isPrimary: false,
        specialtyNote: "For cardiac ICU nurses only (CCU, CVICU)",
        requirements: "875 cardiac hours in past 2 years (or 1,000 over 5 years) plus a nationally accredited clinical nursing specialty certification",
        examDetails: "90 questions, subspecialty certification, $145-$235",
        renewalPeriod: "3 years",
        url: "https://www.aacn.org/certification/get-certified/cmc-adult"
      },
      {
        name: "CSC",
        fullName: "Cardiac Surgery Certification",
        organization: "AACN",
        required: false,
        recommended: false, // Only relevant for cardiac surgery ICU nurses
        isPrimary: false,
        specialtyNote: "For cardiac surgery ICU nurses only (CVICU, CTICU)",
        requirements: "875 cardiac surgery hours in past 2 years (or 1,000 over 5 years) plus a nationally accredited clinical nursing specialty certification (e.g., CCRN, PCCN, CEN)",
        examDetails: "Subspecialty certification exam, $145-$235",
        renewalPeriod: "3 years",
        url: "https://www.aacn.org/certification/get-certified/csc-adult"
      },
      {
        name: "ACLS",
        fullName: "Advanced Cardiovascular Life Support",
        organization: "American Heart Association (AHA)",
        required: true,
        recommended: true,
        isPrimary: false,
        requirements: "Current BLS Provider certification required",
        examDetails: "Skills assessment and written exam, $150-$200",
        renewalPeriod: "2 years",
        url: "https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/acls"
      }
    ],

    // Salary section
    salary: {
      overview: `ICU nurses are among the higher-paid nursing specialties, reflecting the advanced skills and demanding nature of the work. According to [Salary.com](https://www.salary.com/research/salary/alternate/icu-nurse-salary) and [ZipRecruiter](https://www.ziprecruiter.com/Salaries/Icu-Nurse-Salary) data for 2025, critical care nurses earn significantly more than the national average for all registered nurses.`,

      national: {
        average: "$85,000–$95,000",
        range: {
          low: "$78,000",
          median: "$86,700",
          high: "$121,000+"
        },
        hourly: "$41-$58"
      },

      byExperience: [
        { level: "Entry-level (< 1 year)", salary: "$70,000 - $80,000", hourly: "$34-$38" },
        { level: "Early career (1-4 years)", salary: "$78,000 - $88,000", hourly: "$38-$42" },
        { level: "Mid-career (5-9 years)", salary: "$88,000 - $100,000", hourly: "$42-$48" },
        { level: "Experienced (10+ years)", salary: "$100,000 - $121,000+", hourly: "$48-$58+" }
      ],

      topStates: [
        { state: "California", salary: "$100,400" },
        { state: "New York", salary: "$98,700" },
        { state: "Massachusetts", salary: "$99,000" },
        { state: "Washington", salary: "$95,300" },
        { state: "Oregon", salary: "$93,800" }
      ],

      factors: [
        "Geographic location (urban areas and coastal states pay more)",
        "Facility type (teaching hospitals and trauma centers often pay higher)",
        "Shift differentials (night and weekend shifts add 10-20%)",
        "Certifications (CCRN holders may earn higher pay or bonuses, depending on employer)",
        "Travel nursing (temporary contracts can pay 1.5-2x staff rates)"
      ],

      sources: [
        { name: "Bureau of Labor Statistics", url: "https://www.bls.gov/ooh/healthcare/registered-nurses.htm" },
        { name: "Salary.com", url: "https://www.salary.com/research/salary/alternate/icu-nurse-salary" },
        { name: "ZipRecruiter", url: "https://www.ziprecruiter.com/Salaries/Icu-Nurse-Salary" }
      ]
    },

    // Job outlook
    jobOutlook: {
      growth: "5%",
      growthPeriod: "2024–2034",
      growthDescription: "Faster than average",
      content: `The demand for ICU nurses remains strong and is projected to grow faster than the average for all occupations, according to the [Bureau of Labor Statistics](https://www.bls.gov/ooh/healthcare/registered-nurses.htm). About 189,100 openings for registered nurses are projected each year over the decade. Several factors drive ICU-specific demand:

**Aging population:** As the baby boomer generation ages, more patients require intensive care for conditions like heart failure, stroke, and post-surgical recovery.

**Advancing medical technology:** Patients who once would not have survived are now viable ICU candidates, thanks to innovations in life support and treatment protocols.

**Pandemic preparedness:** COVID-19 highlighted the critical shortage of ICU nurses, prompting hospitals and health systems to expand critical care capacity.

**Burnout and turnover:** High stress and emotional demands lead to significant turnover in ICU nursing, creating ongoing job openings.

For nurses with CCRN certification and solid ICU experience, job opportunities are abundant. Many hospitals offer sign-on bonuses, tuition reimbursement, and flexible scheduling to attract and retain critical care nurses.`
    },

    // Career advancement
    careerAdvancement: {
      content: `ICU nursing opens doors to numerous advanced career paths. With experience and additional education, you can move into:`,

      paths: [
        {
          title: "ICU Charge Nurse",
          description: "Lead a shift, manage patient assignments, and coordinate unit operations while maintaining your clinical skills."
        },
        {
          title: "Clinical Nurse Educator",
          description: "Train new ICU nurses, develop orientation programs, and keep staff updated on best practices and new technologies."
        },
        {
          title: "Nurse Manager/Director",
          description: "Oversee unit operations, staffing, budgets, and quality improvement initiatives. Typically requires MSN or healthcare administration degree."
        },
        {
          title: "Acute Care Nurse Practitioner (ACNP)",
          description: "With a master's or doctoral degree, diagnose and treat critically ill patients with significant autonomy. ACNPs work in ICUs, hospitals, and specialty practices."
        },
        {
          title: "Certified Registered Nurse Anesthetist (CRNA)",
          description: "Administer anesthesia for surgical procedures. Requires doctoral-level education (DNP or DNAP) and 1–3 years of high-acuity ICU experience. Among the highest-paid nursing roles."
        },
        {
          title: "Critical Care Transport/Flight Nurse",
          description: "Provide care during helicopter or ground transport of critically ill patients. Requires additional certifications (CFRN, CTRN)."
        },
        {
          title: "Clinical Nurse Specialist (CNS)",
          description: "Serve as an expert resource, drive evidence-based practice, and lead quality improvement in critical care settings."
        }
      ]
    },

    // FAQs
    faqs: [
      {
        question: "How long does it take to become an ICU nurse?",
        answer: "Typically 4–6 years total: 2–4 years for your nursing degree (ADN or BSN), plus 1–2 years of medical-surgical or step-down experience before transitioning to the ICU. Some new graduate ICU residency programs allow direct entry, but these are competitive and include extended orientations of 6–12 months."
      },
      {
        question: "Can new grad nurses work in the ICU?",
        answer: "Yes, increasingly so. Many hospitals now offer structured new graduate ICU residency programs with 6–12 month orientations, dedicated preceptors, and gradual patient acuity progression. These programs are competitive. Look for them at large academic medical centers and Magnet-designated hospitals like Mayo Clinic, Kaiser Permanente, and Vanderbilt."
      },
      {
        question: "Is CCRN certification required to work in the ICU?",
        answer: "No, CCRN is not legally required. However, it's strongly recommended and often preferred by employers. The CCRN demonstrates specialized knowledge and may lead to higher pay or bonuses depending on employer policy. Most nurses pursue CCRN after 2+ years of ICU experience."
      },
      {
        question: "What's the difference between ICU and step-down nursing?",
        answer: "Step-down units (also called progressive care or intermediate care) care for patients who need more monitoring than a general floor but less than ICU-level care. Step-down nurses typically have 3–4 patients versus 1–2 in the ICU. Step-down is an excellent stepping stone to ICU nursing."
      },
      {
        question: "Is ICU nursing stressful?",
        answer: "Yes, ICU nursing is among the most stressful nursing specialties. You'll manage life-threatening emergencies, witness patient deaths, support grieving families, and make critical decisions under pressure. However, many ICU nurses find this intensity meaningful because the ability to save lives and provide comfort during the hardest times is deeply rewarding. Developing coping strategies and maintaining work-life boundaries is essential."
      },
      {
        question: "What certifications do ICU nurses need?",
        answer: "Required: BLS and ACLS (most employers mandate these). Highly recommended: CCRN after 2+ years of experience. Additional certifications like CMC (cardiac medicine) or CSC (cardiac surgery) can further specialize your expertise. NIH Stroke Scale certification is often required for neuro ICUs."
      },
      {
        question: "Do ICU nurses make more than other nurses?",
        answer: "Generally yes. ICU nurses earn 10–20% more than general medical-surgical nurses due to the specialized skills required. The national average for ICU nurses is approximately $85,000–$95,000, compared to about $86,000 for all RNs according to BLS data. Shift differentials, certifications, and travel assignments can increase earnings further."
      }
    ],

    // Related career guides (for internal linking)
    relatedGuides: [
      "how-to-become-er-nurse",
      "how-to-become-stepdown-nurse",
      "how-to-become-cardiac-nurse",
      "how-to-become-surgical-nurse",
      "how-to-become-neuro-nurse"
    ],

    // Author/credibility info
    meta: {
      lastUpdated: "2025-01",
      reviewedBy: "IntelliResume Editorial Team",
      sources: [
        { name: "American Association of Critical-Care Nurses (AACN)", url: "https://www.aacn.org" },
        { name: "Bureau of Labor Statistics (BLS)", url: "https://www.bls.gov/ooh/healthcare/registered-nurses.htm" },
        { name: "National Council of State Boards of Nursing (NCSBN)", url: "https://www.ncsbn.org" },
        { name: "Salary.com", url: "https://www.salary.com/research/salary/alternate/icu-nurse-salary" }
      ]
    }
  }

  // Additional career guides will be added here:
  // "how-to-become-er-nurse": { ... },
  // "how-to-become-labor-delivery-nurse": { ... },
  // "how-to-become-med-surg-nurse": { ... },
  // "how-to-become-or-nurse": { ... },
};

/**
 * Get career data for a guide by slug
 * @param {string} slug - The guide slug (e.g., "how-to-become-icu-nurse")
 * @returns {Object|null} The career guide data or null if not found
 */
function getSpecialtyCareerData(slug) {
  return SPECIALTY_CAREER_DATA[slug] || null;
}

/**
 * Get all available specialty slugs with career data
 * @returns {string[]} Array of specialty slugs
 */
function getAvailableCareerGuides() {
  return Object.keys(SPECIALTY_CAREER_DATA);
}

/**
 * Check if a specialty has career guide data
 * @param {string} slug - The specialty slug
 * @returns {boolean}
 */
function hasCareerGuide(slug) {
  return slug in SPECIALTY_CAREER_DATA;
}

module.exports = {
  SPECIALTY_CAREER_DATA,
  getSpecialtyCareerData,
  getAvailableCareerGuides,
  hasCareerGuide
};
