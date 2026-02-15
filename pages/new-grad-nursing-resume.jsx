import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Meta from '../components/common/Meta';
import styles from '../styles/NewGradResumeLanding.module.css';

const ResumePreview = dynamic(
  () => import('../components/ResumeBuilder/ui/ResumePreview'),
  { ssr: false, loading: () => <div className={styles.previewLoading}>Loading preview...</div> }
);

// ── Sample New Grad Resume ─────────────────────────────────

const NEW_GRAD_SAMPLE_RESUME = {
  personalInfo: {
    name: 'Emily Chen, RN, BSN',
    email: 'emily.chen@email.com',
    phone: '(512) 555-0193',
    location: 'Austin, TX',
    linkedin: 'linkedin.com/in/emily-chen-rn',
    website: '',
  },
  summary: 'Compassionate and dedicated new graduate Registered Nurse with clinical rotations in Medical-Surgical, ICU, and Labor & Delivery units. Strong foundation in patient assessment, medication administration, and interdisciplinary collaboration. Completed 720+ clinical hours across diverse patient populations. Eager to contribute to a collaborative healthcare team while growing as a clinical professional.',
  experience: [
    {
      id: 'exp1',
      title: 'Nurse Extern',
      company: 'Dell Seton Medical Center',
      location: 'Austin, TX',
      startDate: 'Jan 2025',
      endDate: 'May 2025',
      unit: 'med-surg',
      shiftType: 'days',
      facilityType: 'hospital',
      description: '• Assisted RN preceptor with care for 4-6 medical-surgical patients per shift\n• Performed head-to-toe assessments, vital signs monitoring, and wound care\n• Administered oral and IV medications under RN supervision using Epic EHR\n• Participated in interdisciplinary rounds and contributed to care planning\n• Educated patients and families on post-discharge instructions and medication regimens',
    },
    {
      id: 'exp2',
      title: 'Clinical Rotation - ICU',
      company: 'Ascension Seton Medical Center',
      location: 'Austin, TX',
      startDate: 'Aug 2024',
      endDate: 'Dec 2024',
      unit: 'icu',
      shiftType: 'days',
      facilityType: 'hospital',
      description: '• Completed 180-hour clinical rotation in 20-bed Medical ICU\n• Assisted with hemodynamic monitoring, ventilator care, and arterial line management\n• Participated in Code Blue response and rapid response activations\n• Documented patient assessments and interventions in Epic EHR',
    },
  ],
  education: [
    {
      degree: 'BSN',
      school: 'University of Texas at Austin School of Nursing',
      location: 'Austin, TX',
      graduationDate: 'May 2025',
      description: 'Dean\'s List (3 semesters) | Nursing Student Association, Vice President | 720+ clinical hours',
    },
  ],
  licenses: [
    { type: 'rn', state: 'TX', licenseNumber: 'RN-789012', isCompact: true, expirationDate: '2028-05' },
  ],
  certifications: [
    { name: 'BLS', fullName: 'Basic Life Support', expirationDate: '2027-03' },
    { name: 'ACLS', fullName: 'Advanced Cardiovascular Life Support', expirationDate: '2027-03' },
    { name: 'NIHSS', fullName: 'NIH Stroke Scale', expirationDate: '2027-01' },
  ],
  healthcareSkills: {
    ehrSystems: ['epic'],
    clinicalSkills: ['Patient Assessment', 'Medication Administration', 'IV Therapy', 'Wound Care', 'Vital Signs Monitoring', 'Foley Catheter Care', 'Blood Glucose Monitoring', 'Infection Control'],
    customSkills: ['Bilingual: English & Mandarin'],
  },
  skills: [],
  additional: {
    languages: [{ language: 'Mandarin Chinese', proficiency: 'native' }],
    memberships: [{ name: 'American Nurses Association (ANA)' }, { name: 'Sigma Theta Tau International Honor Society' }],
    awards: [{ name: 'Dean\'s List - 3 Semesters' }],
    volunteer: [{ name: 'Volunteer Nurse - Austin Free Clinic, 2023-2025' }],
    references: 'available',
  },
};

// ── FAQ Data ───────────────────────────────────────────────

const FAQ_DATA = [
  {
    question: 'What should a new grad nurse resume look like?',
    answer: 'A new grad nurse resume should be one page with clear sections for your summary, clinical rotations (formatted as experience), education, RN license, certifications, and clinical skills. Use a nursing-specific builder that has dedicated sections for licenses and certs because generic resume formats often fail hospital ATS systems.',
  },
  {
    question: 'How do I write a nurse resume with no experience?',
    answer: 'Your clinical rotations ARE your experience. Format them like job entries: "Clinical Rotation - ICU" as the title, facility name as the company, date range, and 3-5 bullets describing what you did. Include nurse externships, capstone projects, and relevant volunteer work. Focus on skills practiced, patient populations, and hours completed.',
  },
  {
    question: 'Should I include non-nursing jobs on my new grad resume?',
    answer: 'Only if they demonstrate transferable healthcare skills. CNA, EMT, medical assistant, or healthcare aide roles belong on your resume. Skip unrelated retail, food service, or office jobs unless you have absolutely zero clinical experience. Hiring managers want to see nursing-relevant content.',
  },
  {
    question: 'How long should a new grad nurse resume be?',
    answer: 'One page. Hiring managers spend 6-7 seconds on initial screening. A concise, well-organized one-page resume with clear nursing sections outperforms a cluttered two-page document every time. Focus on quality over quantity.',
  },
  {
    question: 'What certifications should a new grad nurse have?',
    answer: 'BLS (Basic Life Support) is mandatory for every new grad. ACLS (Advanced Cardiovascular Life Support) is strongly recommended for any acute care position. Add specialty-specific certs based on your target unit: PALS for pediatrics, NRP for NICU or labor and delivery, NIHSS for neuro or stroke units.',
  },
  {
    question: 'Should I include my GPA on a nursing resume?',
    answer: 'Include it if it is 3.5 or higher. Otherwise, list Dean\'s List, honor society membership (like Sigma Theta Tau), or specific academic awards instead. Once you have 1-2 years of nursing experience, GPA becomes irrelevant and should be removed.',
  },
  {
    question: 'How do I list clinical rotations on a resume?',
    answer: 'Format them as experience entries. Title: "Clinical Rotation - [Unit Type]" (e.g., "Clinical Rotation - ICU"). Company: the facility name. Include dates, total hours, and 3-5 bullet points describing specific skills you practiced, patient populations, and responsibilities. Use action verbs like "assisted," "performed," "administered," and "documented."',
  },
  {
    question: 'What is ATS and why does it matter for nursing resumes?',
    answer: 'ATS (Applicant Tracking System) is software that hospitals use to filter resumes before a human ever sees them. Healthcare ATS systems look for dedicated license and certification sections, specific clinical keywords, and standard formatting. Resumes built with generic builders often lack these nursing-specific sections and get filtered out automatically.',
  },
];

// ── Step Guide Data ────────────────────────────────────────

const STEPS = [
  {
    number: '1',
    title: 'Contact Information',
    content: 'Include your full name with credentials (RN, BSN), professional email, phone number, and city and state. Skip your full street address. City and state is enough. Not a big deal, but if you have LinkedIn or/and a nursing portfolio website, add that too.',
    tip: 'Add your credentials after your name: "Emily Chen, RN, BSN." This immediately tells the recruiter you are licensed and have your degree.',
  },
  {
    number: '2',
    title: 'Professional Summary',
    content: 'Write 3-4 sentences that lead with "new graduate Registered Nurse." Mention your total clinical hours, your strongest 2-3 rotation areas, and one career goal. This replaces the outdated "Objective" format and gives the hiring manager context immediately.',
    tip: 'Avoid generic phrases like "looking for a challenging position." Be specific: "New graduate RN with 720+ clinical hours in ICU and Med-Surg, seeking a residency position in critical care."',
  },
  {
    number: '3',
    title: 'Clinical Rotations as Experience',
    content: 'This is the most important section of your new grad nurse resume. Format each rotation as an experience entry with the title "Clinical Rotation - [Unit]," the facility name, date range, and 3-5 bullets. Include the unit type, bed count, patient population, and specific skills you practiced. Nurse externships, capstone experiences, and preceptorships go here too.',
    tip: 'Hiring managers want to see what you DID, not just where you were. "Assisted with hemodynamic monitoring for 4 ICU patients" is far better than "Observed ICU care."',
  },
  {
    number: '4',
    title: 'Education',
    content: 'List your nursing degree (BSN or ADN), school name, and graduation date. Include your total clinical hours, Dean\'s List or GPA (if 3.5+), nursing organization memberships, and any leadership roles. For new grads, Education carries more weight than for experienced nurses, so keep it detailed.',
    tip: 'Most BSN programs require 500-800+ clinical hours. Including your total hours shows hiring managers the breadth of your hands-on experience.',
  },
  {
    number: '5',
    title: 'Licenses',
    content: 'List your RN license with the issuing state and license number. Note if you hold a compact license. The Nurse Licensure Compact (NLC) allows you to practice in 40+ states, which significantly expands your job options. If you are still waiting on NCLEX results, list "RN License Pending" with your expected date.',
    tip: 'Compact license status is a major advantage. Employers hiring for travel, remote, or telehealth positions actively look for compact-licensed nurses.',
  },
  {
    number: '6',
    title: 'Certifications',
    content: 'BLS is mandatory for every new grad. List it with the expiration date. ACLS is strongly recommended for any acute care position and many new grad residency programs require it. Add specialty-specific certifications based on your target unit: PALS for pediatrics, NRP for NICU or labor and delivery, NIHSS for neuro or stroke, and CPI for behavioral health.',
    tip: 'Get ACLS before you graduate if you can. Many new grad residency programs list it as a requirement, and having it already gives you an edge over other applicants.',
  },
  {
    number: '7',
    title: 'Clinical Skills & EHR Systems',
    content: 'List the EHR system you trained on. Epic is used by 85% of major hospitals. Then add your core clinical skills: patient assessment, medication administration, IV therapy, wound care, vital signs monitoring, catheter care, and any specialty skills from your rotations. Keep soft skills out of this section; they belong in your summary.',
    tip: 'Match your skills to the job posting. If the posting mentions "ventilator management" and you practiced it during your ICU rotation, make sure it appears on your resume.',
  },
];

// ── Mistakes Data ──────────────────────────────────────────

const MISTAKES = [
  {
    title: 'Listing clinical rotations under "Education"',
    description: 'Your rotations are hands-on experience. Format them in the Experience section with dates, facility names, and detailed bullets.',
  },
  {
    title: 'Using a generic resume builder',
    description: 'Hospital ATS systems look for nursing-specific sections like Licenses, Certifications, and EHR Systems. Generic templates miss these entirely.',
  },
  {
    title: 'Including irrelevant non-nursing jobs',
    description: 'Unless you worked as a CNA, EMT, or healthcare aide, skip the retail and food service jobs. Use that space for clinical rotations instead.',
  },
  {
    title: 'Leaving out total clinical hours',
    description: 'Hiring managers want to see 500+ hours of clinical experience. Include your total hours in the Education section.',
  },
  {
    title: 'Forgetting certification expiration dates',
    description: 'BLS and ACLS expire every two years. Including expiration dates shows you are current and saves the recruiter a verification step.',
  },
  {
    title: 'Writing an "Objective" instead of a "Summary"',
    description: 'Objectives are outdated. A professional summary highlighting your clinical strengths and rotation experience is the modern standard.',
  },
];

// ── Job Links ──────────────────────────────────────────────

const JOB_LINKS = [
  { label: 'ICU RN Jobs', href: '/jobs/nursing/specialty/icu/experience/new-grad' },
  { label: 'ER RN Jobs', href: '/jobs/nursing/specialty/er/experience/new-grad' },
  { label: 'Med-Surg RN Jobs', href: '/jobs/nursing/specialty/med-surg/experience/new-grad' },
  { label: 'L&D RN Jobs', href: '/jobs/nursing/specialty/labor-delivery/experience/new-grad' },
  { label: 'Telemetry RN Jobs', href: '/jobs/nursing/specialty/telemetry/experience/new-grad' },
  { label: 'NICU RN Jobs', href: '/jobs/nursing/specialty/nicu/experience/new-grad' },
];

// ── Templates & Builder Demo ──────────────────────────────

const TEMPLATES = [
  { id: 'ats', name: 'Classic', bestFor: 'Hospitals, government, large employers' },
  { id: 'professional', name: 'Professional', bestFor: 'Clinics, outpatient, private practice' },
  { id: 'modern', name: 'Modern', bestFor: 'Telehealth, startups, younger facilities' },
  { id: 'minimalist', name: 'Minimalist', bestFor: 'Leadership, NP, experienced nurses' },
];

const BUILDER_SECTIONS = [
  { id: 'personal', label: 'Personal Info', done: true },
  { id: 'experience', label: 'Experience', done: true },
  { id: 'licenses', label: 'Licenses', done: true },
  { id: 'certifications', label: 'Certifications', done: true },
  { id: 'clinical', label: 'Clinical Skills', done: true },
  { id: 'education', label: 'Education', done: true },
  { id: 'summary', label: 'Summary', done: false },
  { id: 'additional', label: 'Additional', done: false },
];

// ── Structured Data ────────────────────────────────────────

const StructuredData = () => {
  const year = new Date().getFullYear();
  const dateStr = new Date().toISOString().split('T')[0];
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `New Grad Nurse Resume: Step-by-Step Guide & Free Template (${year})`,
    "description": "Build a new grad nurse resume that gets interviews. Step-by-step guide for clinical rotations, certifications, and skills.",
    "author": { "@type": "Organization", "name": "IntelliResume Health", "url": "https://intelliresume.net" },
    "publisher": { "@type": "Organization", "name": "IntelliResume Health", "url": "https://intelliresume.net" },
    "datePublished": "2026-02-15",
    "dateModified": dateStr,
    "url": "https://intelliresume.net/new-grad-nursing-resume",
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Write a New Grad Nurse Resume",
    "description": "Step-by-step guide to building a professional nursing resume as a new graduate with clinical rotations, certifications, and nursing skills.",
    "step": STEPS.map(step => ({
      "@type": "HowToStep",
      "name": step.title,
      "text": step.content,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_DATA.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": { "@type": "Answer", "text": faq.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
};

// ── Page Component ─────────────────────────────────────────

const NewGradNurseResumePage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeBuilderSection, setActiveBuilderSection] = useState('personal');
  const [previewTemplate, setPreviewTemplate] = useState('ats');
  const currentYear = new Date().getFullYear();

  const renderBuilderSection = () => {
    switch (activeBuilderSection) {
      case 'personal':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">👋</span> Let&apos;s Get Started
            </div>
            <p className={styles.mockupSectionSub}>
              Enter your contact info so employers can reach you. Takes a few seconds!
            </p>
            <div className={styles.mockupCardHeader}>
              <span role="img" aria-hidden="true">📋</span> Required Information
            </div>
            <div className={styles.mockupFieldRow}>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>Full Name *</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>Emily Chen, RN, BSN</div>
              </div>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>Email Address *</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>emily.chen@email.com</div>
              </div>
            </div>
            <div className={styles.mockupFieldRow}>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>Phone Number</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>(512) 555-0193</div>
              </div>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>Location</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>Austin, TX</div>
              </div>
            </div>
            <div className={styles.mockupCardHeader} style={{ marginTop: '12px' }}>
              <span role="img" aria-hidden="true">✨</span> Optional (But Helpful)
            </div>
            <div className={styles.mockupField}>
              <div className={styles.mockupLabel}>LinkedIn Profile <span className={styles.mockupOptionalBadge}>optional</span></div>
              <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>linkedin.com/in/emily-chen-rn</div>
            </div>
            <div className={styles.mockupCompletionBadge}>
              ✓ Looking good! Your contact info is ready.
            </div>
          </div>
        );

      case 'experience':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">💼</span> Work Experience
            </div>
            <p className={styles.mockupSectionSub}>
              Add clinical rotations and externships. Format them like job entries!
            </p>
            <div className={styles.mockupTabBar}>
              <div className={`${styles.mockupTab} ${styles.mockupTabActive}`}>1. Nurse Extern</div>
              <div className={styles.mockupTab}>2. Clinical Rotation - ICU</div>
              <div className={styles.mockupTabAdd}>+ Add Position</div>
            </div>
            <div className={styles.mockupExpCard}>
              <div className={styles.mockupExpHeader}>
                <strong>Nurse Extern</strong>
                <span className={styles.mockupExpDates}>Jan 2025 - May 2025</span>
              </div>
              <div className={styles.mockupExpCompany}>Dell Seton Medical Center · Austin, TX</div>
              <div className={styles.mockupCardHeader} style={{ marginTop: '8px', marginBottom: '6px' }}>
                <span role="img" aria-hidden="true">🩺</span> Healthcare Details
              </div>
              <div className={styles.mockupExpTags}>
                <span className={styles.mockupTag}>Med-Surg</span>
                <span className={styles.mockupTag}>Day Shift</span>
                <span className={styles.mockupTag}>Hospital</span>
              </div>
              <div className={styles.mockupExpBullets}>
                <div>• Assisted RN preceptor with care for 4-6 med-surg patients per shift</div>
                <div>• Performed head-to-toe assessments, vital signs, and wound care</div>
                <div>• Administered oral and IV medications under RN supervision using Epic</div>
              </div>
            </div>
            <div className={styles.mockupAiButton}>
              <span role="img" aria-hidden="true">✨</span> Improve Description
            </div>
          </div>
        );

      case 'licenses':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">📜</span> Nursing Licenses
            </div>
            <p className={styles.mockupSectionSub}>
              Add your nursing license. Just passed NCLEX? You can list &quot;License Pending&quot; too.
            </p>
            <div className={styles.mockupLicenseCard}>
              <div className={styles.mockupLicenseTop}>
                <div>
                  <strong>Registered Nurse (RN)</strong>
                  <div className={styles.mockupLicenseState}>Texas · RN-789012</div>
                </div>
                <div className={styles.mockupLicenseBadges}>
                  <span className={styles.mockupBadgeCompact}>Compact</span>
                  <span className={styles.mockupBadgeExp}>Exp: 05/2028</span>
                </div>
              </div>
            </div>
            <div className={styles.mockupCompactInfo}>
              ✓ Compact License: Valid in 40+ states
            </div>
            <div className={styles.mockupAddBtnRow}>
              <div className={styles.mockupAddBtn}>+ RN License</div>
              <div className={styles.mockupAddBtn}>+ APRN License</div>
            </div>
            <div className={styles.mockupInfoHint}>
              <span role="img" aria-hidden="true">💡</span> What is a Compact License?
            </div>
          </div>
        );

      case 'certifications':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">🎖️</span> Certifications
              <span className={styles.mockupCountBadge}>3 added</span>
            </div>
            <p className={styles.mockupSectionSub}>
              Select your nursing certifications. Tap to add, then set expiration dates.
            </p>
            <div className={styles.mockupCardHeader}>Required for Most Jobs</div>
            <div className={styles.mockupCertGrid}>
              <div className={`${styles.mockupCertCard} ${styles.mockupCertSelected}`}>
                <div className={styles.mockupCertCheck}>✓</div>
                <div><strong>BLS</strong><br /><span className={styles.mockupCertFull}>Basic Life Support</span></div>
                <div className={styles.mockupCertExp}>exp. 03/2027</div>
              </div>
              <div className={`${styles.mockupCertCard} ${styles.mockupCertSelected}`}>
                <div className={styles.mockupCertCheck}>✓</div>
                <div><strong>ACLS</strong><br /><span className={styles.mockupCertFull}>Advanced Cardiovascular</span></div>
                <div className={styles.mockupCertExp}>exp. 03/2027</div>
              </div>
              <div className={styles.mockupCertCard}>
                <div className={styles.mockupCertEmpty} />
                <div><strong>PALS</strong><br /><span className={styles.mockupCertFull}>Pediatric Advanced</span></div>
              </div>
            </div>
            <div className={styles.mockupCardHeader} style={{ marginTop: '14px' }}>Specialty Certifications</div>
            <div className={styles.mockupPillWrap}>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>NIHSS ✓</span>
              <span className={styles.mockupPill}>CCRN</span>
              <span className={styles.mockupPill}>CEN</span>
              <span className={styles.mockupPill}>TNCC</span>
              <span className={styles.mockupPill}>NRP</span>
            </div>
          </div>
        );

      case 'clinical':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">🩺</span> Clinical Skills
              <span className={styles.mockupCountBadge}>8 selected</span>
            </div>
            <p className={styles.mockupSectionSub}>
              Select EHR systems and clinical skills from your rotations.
            </p>
            <div className={styles.mockupSubHeading}>EHR/EMR Systems <span className={styles.mockupCountBadge}>1 selected</span></div>
            <div className={styles.mockupPillWrap}>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Epic ✓</span>
              <span className={styles.mockupPill}>Cerner</span>
              <span className={styles.mockupPill}>Meditech</span>
              <span className={styles.mockupPill}>Allscripts</span>
            </div>
            <div className={styles.mockupSubHeading} style={{ marginTop: '12px' }}>Clinical Skills</div>
            <div className={styles.mockupPillWrap}>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Patient Assessment ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Medication Admin ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>IV Therapy ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Wound Care ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Vital Signs ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Foley Catheter ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Blood Glucose ✓</span>
            </div>
            <div className={styles.mockupAiButton} style={{ marginTop: '12px' }}>
              <span role="img" aria-hidden="true">✨</span> Suggest Skills Based on My Experience
            </div>
          </div>
        );

      case 'education':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">🎓</span> Education
            </div>
            <p className={styles.mockupSectionSub}>
              List your nursing education. Tap a common degree or type your own.
            </p>
            <div className={styles.mockupCardHeader}>
              <span role="img" aria-hidden="true">🎓</span> Tap to select your degree
            </div>
            <div className={styles.mockupDegreeGrid}>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>BSN ✓</span>
              <span className={styles.mockupPill}>ADN</span>
              <span className={styles.mockupPill}>MSN</span>
              <span className={styles.mockupPill}>DNP</span>
              <span className={styles.mockupPill}>LPN</span>
              <span className={styles.mockupPill}>ASN</span>
            </div>
            <div className={styles.mockupFieldRow} style={{ marginTop: '12px' }}>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>School / University</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>UT Austin School of Nursing</div>
              </div>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>Graduation Date</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>May 2025</div>
              </div>
            </div>
            <div className={styles.mockupField} style={{ marginTop: '4px' }}>
              <div className={styles.mockupLabel}>Additional Details</div>
              <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>Dean&apos;s List (3 semesters) | NSA Vice President | 720+ clinical hours</div>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">📝</span> Professional Summary
            </div>
            <p className={styles.mockupSectionSub}>
              Tap a template below to get started, or write your own.
            </p>
            <div className={styles.mockupCardHeader}>
              <span role="img" aria-hidden="true">✨</span> Quick Start Templates
            </div>
            <div className={styles.mockupTemplateGrid}>
              <div className={`${styles.mockupMiniTemplate} ${styles.mockupMiniTemplateActive}`}>🎓 New Grad <span className={styles.mockupForYou}>For you</span></div>
              <div className={styles.mockupMiniTemplate}>⭐ Experienced</div>
              <div className={styles.mockupMiniTemplate}>🩺 ICU</div>
              <div className={styles.mockupMiniTemplate}>✈️ Travel</div>
            </div>
            <div className={styles.mockupTextarea}>
              Compassionate and dedicated new graduate Registered Nurse with clinical
              rotations in Medical-Surgical, ICU, and Labor &amp; Delivery units. Strong
              foundation in patient assessment, medication administration, and
              interdisciplinary collaboration. Completed 720+ clinical hours across
              diverse patient populations.
            </div>
            <div className={styles.mockupCharCount}>312 / 500</div>
            <div className={styles.mockupAiButton}>
              <span role="img" aria-hidden="true">✨</span> Improve Summary
            </div>
          </div>
        );

      case 'additional':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">📋</span> Additional Info
              <span className={styles.mockupCountBadge}>4 added</span>
            </div>
            <p className={styles.mockupSectionSub}>
              Quick-add languages, memberships, awards, and more. All optional!
            </p>
            <div className={styles.mockupCollapseCard}>
              <div className={`${styles.mockupCollapseHeader} ${styles.mockupCollapseOpen}`}>
                <span>🌍 Languages <span className={styles.mockupCountBadge}>1</span></span>
                <span className={styles.mockupChevron}>▼</span>
              </div>
              <div className={styles.mockupCollapseBody}>
                <div className={styles.mockupPillWrap}>
                  <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Mandarin ✓</span>
                  <span className={styles.mockupPill}>Spanish</span>
                  <span className={styles.mockupPill}>Tagalog</span>
                  <span className={styles.mockupPill}>ASL</span>
                </div>
              </div>
            </div>
            <div className={styles.mockupCollapseCard}>
              <div className={styles.mockupCollapseHeader}>
                <span>🏥 Professional Memberships <span className={styles.mockupCountBadge}>2</span></span>
                <span className={styles.mockupChevron}>▶</span>
              </div>
            </div>
            <div className={styles.mockupCollapseCard}>
              <div className={styles.mockupCollapseHeader}>
                <span>🏆 Awards &amp; Recognition <span className={styles.mockupCountBadge}>1</span></span>
                <span className={styles.mockupChevron}>▶</span>
              </div>
            </div>
            <div className={styles.mockupCollapseCard}>
              <div className={styles.mockupCollapseHeader}>
                <span>🤝 Volunteer Experience <span className={styles.mockupCountBadge}>1</span></span>
                <span className={styles.mockupChevron}>▶</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Meta
        title={`New Grad Nurse Resume - Free Template & Guide (${currentYear})`}
        description="Build a new grad nurse resume that gets interviews. Step-by-step guide for clinical rotations, certifications, and skills. Free ATS-friendly template."
        keywords="new grad nurse resume, new grad nursing resume, new graduate nurse resume, entry level nurse resume, new grad RN resume, nursing student resume"
        canonicalUrl="https://intelliresume.net/new-grad-nursing-resume"
        ogImage="/og-image-resume.png"
      />
      <StructuredData />

      <div className={styles.page}>

        {/* ═══ 1. Hero ══════════════════════════════════════ */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>{currentYear} Guide</span>
            <h1 className={styles.heroTitle}>
              New Grad Nurse Resume: Step-by-Step Guide & Free Template
            </h1>
            <p className={styles.heroSubtext}>
              Just passed the NCLEX? Build a professional new grad nurse resume in minutes, even with zero paid nursing experience. Our builder has dedicated sections for clinical rotations, certifications, and nursing skills.
            </p>
            <Link href="/new-resume-builder" className={styles.primaryButton}>
              Build Your New Grad Resume
            </Link>
            <p className={styles.trustBadge}>
              Free for your first resume &middot; no credit card to start
            </p>
          </div>
        </section>

        {/* ═══ 2. Quick Facts Bar ═══════════════════════════ */}
        <section style={{ padding: '0 20px', marginTop: '-36px', position: 'relative', zIndex: 3 }}>
          <div className={styles.quickFactsBar}>
            <div className={styles.quickFact}>
              <div className={styles.quickFactValue}>$62K</div>
              <div className={styles.quickFactLabel}>Avg New Grad Salary</div>
            </div>
            <div className={styles.quickFact}>
              <div className={styles.quickFactValue}>6%</div>
              <div className={styles.quickFactLabel}>RN Job Growth</div>
            </div>
            <div className={styles.quickFact}>
              <div className={styles.quickFactValue}>&lt;5 min</div>
              <div className={styles.quickFactLabel}>Time to Build</div>
            </div>
            <div className={styles.quickFact}>
              <div className={styles.quickFactValue}>4</div>
              <div className={styles.quickFactLabel}>ATS Templates</div>
            </div>
          </div>
        </section>

        {/* ═══ 3. Table of Contents ═════════════════════════ */}
        <section className={styles.tocSection}>
          <div className={styles.tocBox}>
            <div className={styles.tocTitle}>In This Guide</div>
            <ul className={styles.tocList}>
              <li className={styles.tocItem}><a href="#builder-demo" className={styles.tocLink}>See the Resume Builder in Action</a></li>
              <li className={styles.tocItem}><a href="#what-makes-it-different" className={styles.tocLink}>What Makes a New Grad Nurse Resume Different?</a></li>
              <li className={styles.tocItem}><a href="#sample-resume" className={styles.tocLink}>Sample New Grad Nurse Resume</a></li>
              <li className={styles.tocItem}><a href="#how-to-write" className={styles.tocLink}>How to Write Each Section</a></li>
              <li className={styles.tocItem}><a href="#common-mistakes" className={styles.tocLink}>Common Mistakes to Avoid</a></li>
              <li className={styles.tocItem}><a href="#faq" className={styles.tocLink}>Frequently Asked Questions</a></li>
            </ul>
          </div>
        </section>

        {/* ═══ 3b. Interactive Builder Demo ════════════════════ */}
        <section id="builder-demo" className={styles.builderDemoSection}>
          <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 className={styles.sectionHeading}>See the Builder in Action</h2>
              <p className={styles.sectionSubtext}>
                Click through each section. This is exactly what you&apos;ll see when building your new grad resume
              </p>
            </div>

            <div className={styles.builderFrame}>
              {/* Browser chrome bar */}
              <div className={styles.builderChrome}>
                <div className={`${styles.builderDot} ${styles.builderDotClose}`} />
                <div className={`${styles.builderDot} ${styles.builderDotMinimize}`} />
                <div className={`${styles.builderDot} ${styles.builderDotExpand}`} />
                <div className={styles.builderChromeUrl}>
                  <span>intelliresume.net/new-resume-builder</span>
                </div>
              </div>

              {/* Header with progress */}
              <div className={styles.builderHeader}>
                <div className={styles.builderHeaderTitle}>Build Your Nursing Resume</div>
                <div className={styles.builderProgress}>
                  <span>6 of 8 done</span>
                  <div className={styles.builderProgressTrack}>
                    <div className={styles.builderProgressFill} style={{ width: '75%' }} />
                  </div>
                  <span>75%</span>
                </div>
              </div>

              {/* Import banner */}
              <div className={styles.builderImport}>
                📋 Import · Have an existing resume? Import it to save time!
              </div>

              {/* Sidebar + content */}
              <div className={styles.builderBody}>
                <div className={styles.builderSidebar}>
                  <div className={styles.builderSidebarLabel}>Edit Sections</div>
                  {BUILDER_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      className={`${styles.builderSidebarItem} ${activeBuilderSection === section.id ? styles.builderSidebarActive : ''}`}
                      onClick={() => setActiveBuilderSection(section.id)}
                    >
                      <div className={`${styles.builderSidebarDot} ${section.done ? styles.builderSidebarDotDone : ''} ${activeBuilderSection === section.id ? styles.builderSidebarDotActive : ''}`} />
                      {section.label}
                    </button>
                  ))}
                </div>

                <div className={styles.builderMain}>
                  {renderBuilderSection()}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/new-resume-builder" className={styles.primaryButton}>
                Start Building Yours
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 4. What Makes It Different ═══════════════════ */}
        <section id="what-makes-it-different" className={styles.contentSection}>
          <div className={styles.contentWrap}>
            <h2 className={styles.sectionHeading}>What Makes a New Grad Nurse Resume Different?</h2>
            <p className={styles.bodyText}>
              As a new graduate nurse, your resume challenge is unique. You have hundreds of clinical hours but no paid nursing experience. Most resume guides, however, are written for experienced professionals with years of work history to draw from. That advice does not apply to you.
            </p>
            <p className={styles.bodyText}>
              Your new grad nurse resume needs to translate clinical rotations into professional experience. Hiring managers at hospitals expect to see the unit type, facility name, patient population, and specific skills you practiced during each rotation, formatted exactly like a job entry, not buried under your Education section.
            </p>
            <p className={styles.bodyText}>
              The other critical difference is that hospital ATS systems scan for nursing-specific sections. A resume without dedicated areas for your RN license, BLS and ACLS certifications, and EHR proficiency will often get filtered out before a human ever reads it. Generic resume builders do not have these sections. A nursing-specific builder does.
            </p>
          </div>
        </section>

        {/* ═══ 5. Sample Resume Preview ═════════════════════ */}
        <section id="sample-resume" className={styles.contentSectionAlt}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 className={styles.sectionHeading}>Sample New Grad Nurse Resume</h2>
              <p className={styles.sectionSubtext}>
                This is what a strong new graduate nursing resume looks like. Clinical rotations formatted as experience, dedicated nursing sections, and ATS-friendly layout.
              </p>
            </div>

            {/* Template toggle */}
            <div className={styles.previewToggleRow}>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  className={`${styles.previewToggleBtn} ${previewTemplate === tpl.id ? styles.previewToggleActive : ''}`}
                  onClick={() => setPreviewTemplate(tpl.id)}
                >
                  {tpl.name}
                </button>
              ))}
            </div>

            {/* Resume preview */}
            <div className={styles.previewFrame}>
              <div className={styles.previewScaler}>
                <ResumePreview
                  resumeData={NEW_GRAD_SAMPLE_RESUME}
                  template={previewTemplate}
                />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <Link href="/new-resume-builder" className={styles.primaryButton}>
                Build a Resume Like This
              </Link>
              <div style={{ marginTop: '10px' }}>
                <Link href="/resume-import" className={styles.secondaryLink}>
                  or import your existing resume
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 6. How to Write Each Section ═════════════════ */}
        <section id="how-to-write" className={styles.contentSection}>
          <div className={styles.contentWrap}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h2 className={styles.sectionHeading}>How to Write Each Section of Your New Grad Nurse Resume</h2>
              <p className={styles.sectionSubtext}>
                Follow these 7 steps to build a resume that gets past hospital ATS systems and impresses nurse recruiters.
              </p>
            </div>

            <div className={styles.stepsContainer}>
              {STEPS.map((step) => (
                <div key={step.number} className={styles.stepCard}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepNumber}>{step.number}</div>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                  </div>
                  <p className={styles.stepContent}>{step.content}</p>
                  <div className={styles.tipCallout}>
                    <span className={styles.tipIcon}>💡</span>
                    <p className={styles.tipText}>{step.tip}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '36px' }}>
              <Link href="/new-resume-builder" className={styles.primaryButton}>
                Start Building Your Resume
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 7. Common Mistakes ═══════════════════════════ */}
        <section id="common-mistakes" className={styles.contentSectionAlt}>
          <div className={styles.contentWrap}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 className={styles.sectionHeading}>6 Common New Grad Nurse Resume Mistakes</h2>
              <p className={styles.sectionSubtext}>
                Avoid these pitfalls that cost new graduate nurses interviews.
              </p>
            </div>

            <div className={styles.mistakesList}>
              {MISTAKES.map((mistake, i) => (
                <div key={i} className={styles.mistakeItem}>
                  <span className={styles.mistakeIcon}>✕</span>
                  <div className={styles.mistakeContent}>
                    <div className={styles.mistakeTitle}>{mistake.title}</div>
                    <p className={styles.mistakeDescription}>{mistake.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 8. Cross-Links ══════════════════════════════ */}
        <section className={styles.crossLinkSection}>
          <div className={styles.crossLinkWrap}>
            <div className={styles.crossLinkContent}>
              <h2 className={styles.crossLinkHeading}>Find New Grad RN Jobs</h2>
              <p className={styles.crossLinkText}>
                Thousands of nursing jobs from top healthcare employers. Residency programs, new grad positions, and direct postings.
              </p>
              <Link href="/jobs/nursing" className={styles.crossLinkButton}>
                Browse All RN Jobs
              </Link>
            </div>
            <div className={styles.jobLinkGrid}>
              {JOB_LINKS.map((job) => (
                <Link key={job.href} href={job.href} className={styles.jobLink}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {job.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 9. More Resources ════════════════════════════ */}
        <section className={styles.contentSection}>
          <div className={styles.contentWrap}>
            <h2 className={styles.sectionHeading}>More Resume Resources</h2>
            <p className={styles.sectionSubtext}>
              Explore our nursing career guides and resume builder tools.
            </p>
            <div className={styles.resourceLinks}>
              <Link href="/nursing-resume-builder" className={styles.resourceLink}>
                Nursing Resume Builder
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
              <Link href="/blog/career-guides/how-to-become-icu-nurse" className={styles.resourceLink}>
                How to Become an ICU Nurse
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
              <Link href="/blog/career-guides/how-to-become-infusion-nurse" className={styles.resourceLink}>
                How to Become an Infusion Nurse
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 10. FAQ ══════════════════════════════════════ */}
        <section id="faq" className={styles.faqSection}>
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h2 className={styles.sectionHeading}>Frequently Asked Questions</h2>
            </div>

            <div className={styles.faqList}>
              {FAQ_DATA.map((faq, index) => (
                <div key={index} className={styles.faqItem} onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                  <div className={styles.faqQuestion}>
                    <span className={styles.faqQuestionText}>{faq.question}</span>
                    <svg
                      className={`${styles.faqChevron} ${openFaq === index ? styles.faqChevronOpen : ''}`}
                      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  {openFaq === index && (
                    <p className={styles.faqAnswer}>{faq.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 11. Final CTA ════════════════════════════════ */}
        <section className={styles.finalCtaSection}>
          <div className={styles.finalCtaWrap}>
            <h2 className={styles.finalCtaHeading}>
              Build Your New Grad Nurse Resume in Minutes
            </h2>
            <p className={styles.finalCtaSubtext}>
              Dedicated sections for clinical rotations, certifications, and nursing skills. ATS-friendly templates built for hospital hiring systems. Free to start.
            </p>
            <Link href="/new-resume-builder" className={styles.primaryButton}>
              Start Building Now
            </Link>
            <div style={{ marginTop: '14px' }}>
              <Link href="/resume-import" className={styles.secondaryLink}>
                or import existing resume
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
            <p className={styles.trustBadge} style={{ marginTop: '24px' }}>
              Free for your first resume &middot; no credit card to start
            </p>
          </div>
        </section>

      </div>
    </>
  );
};

export default NewGradNurseResumePage;
