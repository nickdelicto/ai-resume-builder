import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Meta from '../components/common/Meta';
import StickyHeader from '../components/common/StickyHeader';
import { usePaywall } from '../components/common/PaywallModal';
import styles from '../styles/NursingResumeLanding.module.css';

// Lazy-load ResumePreview (client-only, no SSR)
const ResumePreview = dynamic(
  () => import('../components/ResumeBuilder/ui/ResumePreview'),
  { ssr: false, loading: () => <div className={styles.previewLoading}>Loading preview...</div> }
);

// ── Sample Nursing Resume (for interactive preview) ─────

const SAMPLE_RESUME = {
  personalInfo: {
    name: 'Sarah Johnson, RN, BSN',
    email: 'sarah.johnson@email.com',
    phone: '(216) 555-0147',
    location: 'Cleveland, OH',
    linkedin: 'linkedin.com/in/sarah-johnson-rn',
    website: '',
  },
  summary: 'Compassionate ICU Registered Nurse with 6+ years of critical care experience. Skilled in ventilator management, hemodynamic monitoring, and interdisciplinary collaboration. Proven ability to improve patient outcomes while mentoring new graduate nurses in high-acuity environments.',
  experience: [
    {
      id: 'exp1',
      title: 'ICU Registered Nurse',
      company: 'Cleveland Clinic',
      location: 'Cleveland, OH',
      startDate: 'Jan 2021',
      endDate: 'Present',
      unit: 'icu',
      shiftType: 'nights',
      facilityType: 'hospital-magnet',
      description: '• Provided comprehensive care for 4-6 critically ill patients per shift in 32-bed mixed medical-surgical ICU\n• Managed invasive hemodynamic monitoring including arterial lines, central venous catheters, and Swan-Ganz catheters\n• Mentored 3 new graduate nurses through 12-week ICU orientation program\n• Participated in rapid response team, responding to 2-3 codes per month\n• Maintained 97% patient satisfaction scores over 3-year period',
    },
    {
      id: 'exp2',
      title: 'Medical-Surgical Registered Nurse',
      company: 'Summa Health System',
      location: 'Akron, OH',
      startDate: 'Jun 2019',
      endDate: 'Dec 2020',
      unit: 'med-surg',
      shiftType: 'days',
      facilityType: 'hospital',
      description: '• Cared for 6-8 medical-surgical patients with diverse diagnoses including post-operative, cardiac, and respiratory conditions\n• Coordinated discharge planning with case management and social work teams\n• Led unit quality improvement project that reduced patient falls by 18%\n• Cross-trained in telemetry monitoring and cardiac rhythm interpretation',
    },
  ],
  education: [
    {
      degree: 'BSN',
      school: 'Ohio State University College of Nursing',
      location: 'Columbus, OH',
      graduationDate: 'May 2019',
      description: '',
    },
  ],
  licenses: [
    { type: 'rn', state: 'OH', licenseNumber: 'RN-234567', isCompact: true, expirationDate: '2026-08' },
  ],
  certifications: [
    { name: 'CCRN', fullName: 'Critical Care Registered Nurse', expirationDate: '2026-04' },
    { name: 'ACLS', fullName: 'Advanced Cardiovascular Life Support', expirationDate: '2025-11' },
    { name: 'BLS', fullName: 'Basic Life Support', expirationDate: '2025-11' },
  ],
  healthcareSkills: {
    ehrSystems: ['epic', 'cerner'],
    clinicalSkills: ['Ventilator Management', 'Hemodynamic Monitoring', 'Arterial Line Management', 'Central Line Care', 'Code Blue Response', 'IV Therapy', 'Patient Assessment', 'Medication Administration'],
    customSkills: ['Charge nurse rotation', 'Preceptor experience'],
  },
  skills: [],
  additional: {
    languages: [{ language: 'Spanish', proficiency: 'conversational' }],
    memberships: [{ name: 'American Association of Critical-Care Nurses (AACN)' }],
    awards: [{ name: 'Excellence in Nursing Award 2023' }],
    volunteer: [],
    references: 'available',
  },
};

// ── Static Data ─────────────────────────────────────────

const COMPARISON = [
  { feature: 'Nursing Licenses', generic: 'Not available', ours: 'State licenses, compact status & expiration dates' },
  { feature: 'Certifications', generic: 'Type them yourself', ours: '46 nursing certs — tap to add' },
  { feature: 'Clinical Skills', generic: 'One generic skills box', ours: 'Pre-loaded for ICU, ER, L&D & 20+ specialties' },
  { feature: 'EHR Proficiency', generic: 'Not available', ours: 'Epic, Cerner, Meditech & 7 more' },
  { feature: 'AI-improved content', generic: 'Generic corporate filler', ours: 'Clinical terms, patient ratios, nursing verbs' },
  { feature: 'ATS Templates', generic: 'Untested for healthcare', ours: '4 templates built for hospital ATS systems' },
];

const TEMPLATES = [
  { id: 'ats', name: 'Classic', bestFor: 'Hospitals, government, large employers', barColor: '#1e293b', accentColor: '#1e293b' },
  { id: 'professional', name: 'Professional', bestFor: 'Clinics, outpatient, private practice', barColor: '#0d9488', accentColor: '#0d9488' },
  { id: 'modern', name: 'Modern', bestFor: 'Telehealth, startups, younger facilities', barColor: '#0891b2', accentColor: '#0891b2' },
  { id: 'minimalist', name: 'Minimalist', bestFor: 'Leadership, NP, experienced nurses', barColor: '#64748b', accentColor: '#64748b' },
];

const STEPS = [
  { number: '1', title: 'Add your nursing details', description: 'Licenses, certs, clinical skills, experience. Just tap to add, no typing!' },
  { number: '2', title: 'Let AI do the heavy lifting', description: 'Generate professional bullets and summaries with clinical terminology' },
  { number: '3', title: 'Choose a template & preview', description: '4 ATS-friendly designs. See your resume take shape in real time' },
  { number: '4', title: 'Download your PDF', description: 'ATS-optimized and ready for nursing job applications' },
];

const SPECIALTIES = [
  { name: 'ICU / Critical Care', slug: 'icu' },
  { name: 'Emergency / ER', slug: 'er' },
  { name: 'Medical-Surgical', slug: 'med-surg' },
  { name: 'Labor & Delivery', slug: 'labor-delivery' },
  { name: 'NICU', slug: 'nicu' },
  { name: 'Pediatrics', slug: 'pediatrics' },
  { name: 'Telemetry', slug: 'telemetry' },
  { name: 'Operating Room', slug: 'or' },
  { name: 'Cardiac', slug: 'cardiac' },
  { name: 'Oncology', slug: 'oncology' },
  { name: 'Home Health', slug: 'home-health' },
  { name: 'Mental Health', slug: 'mental-health' },
];

const FAQ_DATA = [
  {
    question: 'Is this nursing resume builder really free?',
    answer: 'Yes. You can build and preview your nursing resume completely free with no signup required. Your first PDF download is free. Premium plans unlock unlimited downloads and additional resumes.',
  },
  {
    question: 'Will my nursing resume pass ATS systems?',
    answer: 'Yes. All four templates use ATS-friendly formatting with standard section headers like Licenses, Certifications, and Clinical Skills that healthcare applicant tracking systems parse correctly. We use system fonts like Arial and Calibri for maximum compatibility.',
  },
  {
    question: 'What makes this different from a generic resume builder?',
    answer: 'Most resume builders have no concept of nursing licenses, clinical certifications, or EHR systems. Our builder includes dedicated sections for state licenses with compact status, 46 nursing certifications from BLS to CCRN, specialty-specific clinical skills, EHR proficiency, and experience fields for unit type, shift, and patient ratio.',
  },
  {
    question: 'Can I import my existing nursing resume?',
    answer: 'Yes. Upload your existing resume in PDF or Word format and our parser will extract your information automatically. You can then enhance it with nursing-specific sections and AI-powered suggestions.',
  },
  {
    question: 'What nursing specialties are supported?',
    answer: 'We support over 24 nursing specialties including ICU, ER, Med-Surg, Labor and Delivery, NICU, Pediatrics, Oncology, OR, Cardiac, Telemetry, Mental Health, Home Health, Case Management, and more. Each specialty has pre-loaded clinical skills and certification suggestions.',
  },
  {
    question: 'How does the AI help write my nursing resume?',
    answer: 'Our AI generates professional experience bullets using clinical action verbs and healthcare terminology. It suggests content based on your specialty, unit type, patient ratios, and certifications. It only uses metrics and numbers you actually provide — it never fabricates statistics.',
  },
];

const JOB_LINKS = [
  { label: 'ICU RN Jobs', href: '/jobs/nursing/specialty/icu' },
  { label: 'ER RN Jobs', href: '/jobs/nursing/specialty/er' },
  { label: 'Med-Surg RN Jobs', href: '/jobs/nursing/specialty/med-surg' },
  { label: 'L&D RN Jobs', href: '/jobs/nursing/specialty/labor-delivery' },
  { label: 'NICU RN Jobs', href: '/jobs/nursing/specialty/nicu' },
  { label: 'Telemetry RN Jobs', href: '/jobs/nursing/specialty/telemetry' },
];

const BUILDER_SECTIONS = [
  { id: 'personal', label: 'Personal Info', done: true },
  { id: 'experience', label: 'Experience', done: true },
  { id: 'licenses', label: 'Licenses', done: true },
  { id: 'certifications', label: 'Certifications', done: true },
  { id: 'clinical', label: 'Clinical Skills', done: true },
  { id: 'education', label: 'Education', done: false },
  { id: 'summary', label: 'Summary', done: false },
  { id: 'additional', label: 'Additional', done: false },
];

// ── Structured Data ─────────────────────────────────────

const NursingStructuredData = () => {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "IntelliResume Nursing Resume Builder",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to start - build up to 5 nursing resumes with no signup"
    },
    "description": "AI-powered nursing resume builder with dedicated sections for RN licenses, clinical certifications, EHR systems, and specialty skills. ATS-optimized templates for healthcare.",
    "url": "https://intelliresume.net/nursing-resume-builder",
    "featureList": [
      "Nursing license tracking with compact state support",
      "46 clinical certifications (BLS, ACLS, PALS, CCRN, CEN)",
      "Specialty-specific clinical skills for 24+ nursing specialties",
      "EHR system proficiency (Epic, Cerner, Meditech)",
      "AI-generated experience bullets with nursing terminology",
      "4 ATS-optimized resume templates",
      "One-click job tailoring for RN positions",
      "PDF export optimized for hospital ATS systems"
    ],
    "author": {
      "@type": "Organization",
      "name": "IntelliResume Health",
      "url": "https://intelliresume.net"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_DATA.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
};

// ── Page Component ──────────────────────────────────────

const NursingResumeBuilderPage = () => {
  const router = useRouter();
  const { data: _session, status } = useSession();
  const { showPaywall } = usePaywall();
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState('ats');
  const [activeBuilderSection, setActiveBuilderSection] = useState('personal');

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBuildNewClick = async () => {
    let toastId;
    if (typeof toast !== 'undefined') {
      toastId = toast.loading('Creating new resume...');
    }

    try {
      if (status === 'authenticated') {
        try {
          const eligibilityRes = await fetch('/api/resume/check-creation-eligibility');
          const eligibilityData = await eligibilityRes.json();
          if (!eligibilityData.eligible) {
            if (toastId) toast.dismiss(toastId);
            showPaywall('resume_creation');
            return;
          }
        } catch (e) {
          console.error('Error checking creation eligibility:', e);
        }

        localStorage.setItem('creating_new_resume', 'true');
        localStorage.setItem('starting_new_resume', 'true');

        const blankResumeData = {
          personalInfo: { name: '', email: '', phone: '', location: '', linkedin: '', website: '' },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          additional: { certifications: [], projects: [], languages: [], volunteer: [], awards: [] },
        };

        const response = await fetch('/api/resume/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeData: blankResumeData, template: 'ats', title: 'My Resume' }),
        });

        const result = await response.json();

        if (!response.ok || result.error === 'resume_limit_reached') {
          if (toastId) toast.dismiss(toastId);
          showPaywall('resume_creation');
          return;
        }

        if (result.success && result.resumeId) {
          localStorage.removeItem('current_resume_id');
          localStorage.removeItem('editing_resume_id');
          localStorage.removeItem('editing_existing_resume');
          localStorage.setItem('current_resume_id', result.resumeId);
          router.push(`/new-resume-builder?resumeId=${result.resumeId}&source=new`);
          if (toastId) toast.success('Created new resume!', { id: toastId });
          setTimeout(() => {
            localStorage.removeItem('creating_new_resume');
            localStorage.removeItem('starting_new_resume');
          }, 2000);
          return;
        }
      }

      router.push('/new-resume-builder');
      if (toastId) toast.success('Starting new resume!', { id: toastId });
    } catch (error) {
      console.error('Error creating new resume:', error);
      localStorage.removeItem('creating_new_resume');
      localStorage.removeItem('starting_new_resume');
      router.push('/new-resume-builder');
      if (toastId) toast.error('Something went wrong. Starting with a blank resume.', { id: toastId });
    }
  };

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
                <div className={styles.mockupLabel}>👤 Full Name *</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>Sarah Johnson, RN, BSN</div>
              </div>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>📧 Email Address *</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>sarah.johnson@email.com</div>
              </div>
            </div>
            <div className={styles.mockupFieldRow}>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>📱 Phone Number</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>(216) 555-0147</div>
              </div>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>📍 Location</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>Cleveland, OH</div>
              </div>
            </div>
            <div className={styles.mockupCardHeader} style={{ marginTop: '12px' }}>
              <span role="img" aria-hidden="true">✨</span> Optional (But Helpful)
            </div>
            <div className={styles.mockupField}>
              <div className={styles.mockupLabel}>💼 LinkedIn Profile <span className={styles.mockupOptionalBadge}>optional</span></div>
              <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>linkedin.com/in/sarah-johnson-rn</div>
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
              Add your nursing experience. We&apos;ll help you write achievement-focused descriptions!
            </p>
            {/* Tab navigation */}
            <div className={styles.mockupTabBar}>
              <div className={`${styles.mockupTab} ${styles.mockupTabActive}`}>1. ICU Registered Nurse</div>
              <div className={styles.mockupTab}>2. Med-Surg RN</div>
              <div className={styles.mockupTabAdd}>+ Add Position</div>
            </div>
            <div className={styles.mockupExpCard}>
              <div className={styles.mockupExpHeader}>
                <strong>ICU Registered Nurse</strong>
                <span className={styles.mockupExpDates}>Jan 2021 – Present</span>
              </div>
              <div className={styles.mockupExpCompany}>Cleveland Clinic · Cleveland, OH</div>
              <div className={styles.mockupCardHeader} style={{ marginTop: '8px', marginBottom: '6px' }}>
                <span role="img" aria-hidden="true">🩺</span> Healthcare Details
              </div>
              <div className={styles.mockupExpTags}>
                <span className={styles.mockupTag}>ICU / Critical Care</span>
                <span className={styles.mockupTag}>Night Shift</span>
                <span className={styles.mockupTag}>Magnet Hospital</span>
              </div>
              <div className={styles.mockupExpBullets}>
                <div>• Provided care for 4-6 critically ill patients per shift in 32-bed ICU</div>
                <div>• Managed hemodynamic monitoring including arterial lines &amp; Swan-Ganz</div>
                <div>• Mentored 3 new graduate nurses through 12-week orientation</div>
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
              Add your nursing license information. Critical for healthcare job applications.
            </p>
            <div className={styles.mockupLicenseCard}>
              <div className={styles.mockupLicenseTop}>
                <div>
                  <strong>Registered Nurse (RN)</strong>
                  <div className={styles.mockupLicenseState}>Ohio · RN-234567</div>
                </div>
                <div className={styles.mockupLicenseBadges}>
                  <span className={styles.mockupBadgeCompact}>Compact</span>
                  <span className={styles.mockupBadgeExp}>Exp: 08/2026</span>
                </div>
              </div>
            </div>
            <div className={styles.mockupCompactInfo}>
              ✓ Compact License — Valid in 40+ states
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
              Select your nursing certifications. Add expiration dates to show you&apos;re current.
            </p>
            <div className={styles.mockupCardHeader}>Required for Most Jobs</div>
            <div className={styles.mockupCertGrid}>
              <div className={`${styles.mockupCertCard} ${styles.mockupCertSelected}`}>
                <div className={styles.mockupCertCheck}>✓</div>
                <div><strong>BLS</strong><br /><span className={styles.mockupCertFull}>Basic Life Support</span></div>
                <div className={styles.mockupCertExp}>exp. 11/2025</div>
              </div>
              <div className={`${styles.mockupCertCard} ${styles.mockupCertSelected}`}>
                <div className={styles.mockupCertCheck}>✓</div>
                <div><strong>ACLS</strong><br /><span className={styles.mockupCertFull}>Advanced Cardiovascular</span></div>
                <div className={styles.mockupCertExp}>exp. 11/2025</div>
              </div>
              <div className={styles.mockupCertCard}>
                <div className={styles.mockupCertEmpty} />
                <div><strong>PALS</strong><br /><span className={styles.mockupCertFull}>Pediatric Advanced</span></div>
              </div>
            </div>
            <div className={styles.mockupCardHeader} style={{ marginTop: '14px' }}>Specialty Certifications</div>
            <div className={styles.mockupPillWrap}>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>CCRN ✓</span>
              <span className={styles.mockupPill}>CEN</span>
              <span className={styles.mockupPill}>TNCC</span>
              <span className={styles.mockupPill}>CNOR</span>
              <span className={styles.mockupPill}>NIHSS</span>
            </div>
          </div>
        );

      case 'clinical':
        return (
          <div className={styles.mockupSection}>
            <div className={styles.mockupSectionTitle}>
              <span role="img" aria-hidden="true">🩺</span> Clinical Skills
              <span className={styles.mockupCountBadge}>7 selected</span>
            </div>
            <p className={styles.mockupSectionSub}>
              Select your EHR systems and clinical skills. We&apos;ll suggest skills based on your specialty.
            </p>
            <div className={styles.mockupField} style={{ marginBottom: '14px' }}>
              <div className={styles.mockupLabel}>Your Primary Specialty:</div>
              <div className={styles.mockupSelect}>ICU / Critical Care</div>
            </div>
            <div className={styles.mockupSubHeading}>EHR/EMR Systems <span className={styles.mockupCountBadge}>2 selected</span></div>
            <div className={styles.mockupPillWrap}>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Epic ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Cerner ✓</span>
              <span className={styles.mockupPill}>Meditech</span>
              <span className={styles.mockupPill}>Allscripts</span>
            </div>
            <div className={styles.mockupSubHeading} style={{ marginTop: '12px' }}>Clinical Skills — ICU</div>
            <div className={styles.mockupPillWrap}>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Ventilator Mgmt ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Hemodynamic ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Arterial Lines ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Code Blue ✓</span>
              <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>IV Therapy ✓</span>
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
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>Ohio State University</div>
              </div>
              <div className={styles.mockupField}>
                <div className={styles.mockupLabel}>Graduation Date</div>
                <div className={`${styles.mockupInput} ${styles.mockupInputFilled}`}>May 2019</div>
              </div>
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
              <div className={styles.mockupMiniTemplate}>🎓 New Grad</div>
              <div className={styles.mockupMiniTemplate}>⭐ Experienced</div>
              <div className={`${styles.mockupMiniTemplate} ${styles.mockupMiniTemplateActive}`}>🩺 ICU <span className={styles.mockupForYou}>For you</span></div>
              <div className={styles.mockupMiniTemplate}>✈️ Travel</div>
            </div>
            <div className={styles.mockupTextarea}>
              Compassionate ICU Registered Nurse with 6+ years of critical care experience.
              Skilled in ventilator management, hemodynamic monitoring, and interdisciplinary
              collaboration. Proven ability to improve patient outcomes while mentoring new
              graduate nurses in high-acuity environments.
            </div>
            <div className={styles.mockupCharCount}>285 / 500</div>
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
            {/* Languages (expanded) */}
            <div className={styles.mockupCollapseCard}>
              <div className={`${styles.mockupCollapseHeader} ${styles.mockupCollapseOpen}`}>
                <span>🌍 Languages <span className={styles.mockupCountBadge}>1</span></span>
                <span className={styles.mockupChevron}>▼</span>
              </div>
              <div className={styles.mockupCollapseBody}>
                <div className={styles.mockupPillWrap}>
                  <span className={`${styles.mockupPill} ${styles.mockupPillSelected}`}>Spanish ✓</span>
                  <span className={styles.mockupPill}>Tagalog</span>
                  <span className={styles.mockupPill}>Mandarin</span>
                  <span className={styles.mockupPill}>ASL</span>
                </div>
              </div>
            </div>
            {/* Memberships (collapsed) */}
            <div className={styles.mockupCollapseCard}>
              <div className={styles.mockupCollapseHeader}>
                <span>🏥 Professional Memberships <span className={styles.mockupCountBadge}>1</span></span>
                <span className={styles.mockupChevron}>▶</span>
              </div>
            </div>
            {/* Awards (collapsed) */}
            <div className={styles.mockupCollapseCard}>
              <div className={styles.mockupCollapseHeader}>
                <span>🏆 Awards &amp; Recognition <span className={styles.mockupCountBadge}>1</span></span>
                <span className={styles.mockupChevron}>▶</span>
              </div>
            </div>
            {/* References (collapsed) */}
            <div className={styles.mockupCollapseCard}>
              <div className={styles.mockupCollapseHeader}>
                <span>📋 References <span className={styles.mockupCountBadge}>✓</span></span>
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
        title="Nursing Resume Builder - Free ATS-Friendly RN Resume"
        description="Build a professional nursing resume in minutes. Dedicated sections for licenses, certifications, clinical skills, and EHR systems. Free to start."
        keywords="nursing resume builder, nurse resume builder, RN resume builder, nursing resume template, healthcare resume, registered nurse resume, ATS nursing resume, free nursing resume builder"
        canonicalUrl="https://intelliresume.net/nursing-resume-builder"
        ogImage="/og-image-resume.png"
      />
      <NursingStructuredData />
      {showStickyHeader && <StickyHeader />}

      <div className={styles.landingPage}>

        {/* ═══ 1. Hero ══════════════════════════════════════ */}
        <section className={styles.heroSection}>
          {/* Dot grid overlay */}
          <div className={styles.heroDotGrid} aria-hidden="true" />

          {/* Blurred teal/mint orbs */}
          <div className={`${styles.heroOrb} ${styles.heroOrb1}`} aria-hidden="true" />
          <div className={`${styles.heroOrb} ${styles.heroOrb2}`} aria-hidden="true" />
          <div className={`${styles.heroOrb} ${styles.heroOrb3}`} aria-hidden="true" />

          {/* Floating healthcare crosses */}
          <svg className={`${styles.heroCross} ${styles.heroCross1}`} aria-hidden="true" width="28" height="28" viewBox="0 0 28 28" fill="currentColor">
            <rect x="10" y="2" width="8" height="24" rx="2" />
            <rect x="2" y="10" width="24" height="8" rx="2" />
          </svg>
          <svg className={`${styles.heroCross} ${styles.heroCross2}`} aria-hidden="true" width="22" height="22" viewBox="0 0 28 28" fill="currentColor">
            <rect x="10" y="2" width="8" height="24" rx="2" />
            <rect x="2" y="10" width="24" height="8" rx="2" />
          </svg>
          <svg className={`${styles.heroCross} ${styles.heroCross3}`} aria-hidden="true" width="18" height="18" viewBox="0 0 28 28" fill="currentColor">
            <rect x="10" y="2" width="8" height="24" rx="2" />
            <rect x="2" y="10" width="24" height="8" rx="2" />
          </svg>
          <svg className={`${styles.heroCross} ${styles.heroCross4}`} aria-hidden="true" width="16" height="16" viewBox="0 0 28 28" fill="currentColor">
            <rect x="10" y="2" width="8" height="24" rx="2" />
            <rect x="2" y="10" width="24" height="8" rx="2" />
          </svg>
          <svg className={`${styles.heroCross} ${styles.heroCross5}`} aria-hidden="true" width="24" height="24" viewBox="0 0 28 28" fill="currentColor">
            <rect x="10" y="2" width="8" height="24" rx="2" />
            <rect x="2" y="10" width="24" height="8" rx="2" />
          </svg>

          {/* Faint heartbeat / pulse line */}
          <svg className={styles.heroPulseLine} aria-hidden="true" viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" style={{ width: '100%', height: '60px' }}>
            <path
              d="M0 30 H480 L500 30 L520 8 L540 52 L560 4 L580 56 L600 28 L620 30 H1440"
              stroke="#0d9488"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Wave divider at bottom */}
          <div className={styles.heroWave} aria-hidden="true">
            <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" style={{ width: '100%', height: '50px', display: 'block' }}>
              <path d="M0,48 C288,80 576,16 720,48 C864,80 1152,16 1440,48 L1440,80 L0,80 Z" fill="#f9fafb" />
            </svg>
          </div>

          {/* Hero content */}
          <div className={styles.heroContent}>
            <h1 className={styles.heroHeading}>
              The Resume Builder Made for Nurses
            </h1>
            <p className={styles.bodyText} style={{
              fontSize: '18px',
              maxWidth: '560px',
              margin: '0 auto 32px',
              color: '#64748b',
            }}>
              Dedicated sections for nursing licenses, clinical certifications,
              EHR systems, and specialty skills. Not a generic builder with
              healthcare bolted on.
            </p>

            <button className={styles.primaryButton} onClick={handleBuildNewClick}>
              Build Your Nursing Resume
            </button>

            <div style={{ marginTop: '16px' }}>
              <button
                className={styles.secondaryLink}
                onClick={() => router.push('/resume-import')}
              >
                or import your existing resume
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <p className={styles.trustBadge} style={{ marginTop: '28px' }}>
              Free for your first resume &middot; no credit card to start
            </p>
          </div>
        </section>

        {/* ═══ 1b. Interactive Builder Demo ═════════════════ */}
        <section className={styles.builderDemoSection}>
          <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 className={styles.sectionHeading}>See the Builder in Action</h2>
              <p className={styles.sectionSubtext}>
                Click through each section. This is exactly what you&apos;ll see
              </p>
            </div>

            <div className={styles.builderFrame}>
              {/* Browser chrome bar (macOS traffic lights) */}
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
                  <span>5 of 8 done</span>
                  <div className={styles.builderProgressTrack}>
                    <div className={styles.builderProgressFill} style={{ width: '63%' }} />
                  </div>
                  <span>63%</span>
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
              <button className={styles.primaryButton} onClick={handleBuildNewClick}>
                Start Building Yours
              </button>
            </div>
          </div>
        </section>

        {/* ═══ 2. Built for Nurses ══════════════════════════ */}
        <section className={styles.featuresSection}>
          <div className={styles.featuresBgPattern} aria-hidden="true" />
          <div style={{ maxWidth: '780px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 className={styles.sectionHeading}>Built for Nurses, Not Generic Resumes</h2>
              <p className={styles.sectionSubtext}>
                See what other resume builders are missing
              </p>
            </div>

            {/* Comparison table */}
            <div className={styles.comparisonCard}>
              <div className={styles.comparisonHeader}>
                <div className={styles.comparisonHeaderLabel} />
                <div className={styles.comparisonHeaderGeneric}>Other Builders</div>
                <div className={styles.comparisonHeaderOurs}>IntelliResume</div>
              </div>

              {COMPARISON.map((item, i) => (
                <div key={i} className={styles.comparisonRow}>
                  <div className={styles.comparisonFeature}>{item.feature}</div>
                  <div className={styles.comparisonGeneric}>
                    <span className={styles.comparisonX} aria-label="Not available">&#10005;</span>
                    <span>{item.generic}</span>
                  </div>
                  <div className={styles.comparisonOurs}>
                    <span className={styles.comparisonCheck} aria-label="Available">&#10003;</span>
                    <span>{item.ours}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stat badges */}
            <div className={styles.statRow}>
              <div className={styles.statBadge}>
                <span className={styles.statNumber}>46</span>
                <span className={styles.statLabel}>Certifications</span>
              </div>
              <div className={styles.statBadge}>
                <span className={styles.statNumber}>24+</span>
                <span className={styles.statLabel}>Specialties</span>
              </div>
              <div className={styles.statBadge}>
                <span className={styles.statNumber}>10</span>
                <span className={styles.statLabel}>EHR Systems</span>
              </div>
              <div className={styles.statBadge}>
                <span className={styles.statNumber}>4</span>
                <span className={styles.statLabel}>ATS Templates</span>
              </div>
            </div>
          </div>
        </section>

        {/* Wave: features → templates */}
        <div className={styles.sectionWave} aria-hidden="true">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ width: '100%', height: '32px', display: 'block' }}>
            <path d="M0,24 C360,48 720,0 1080,24 C1260,36 1380,40 1440,24 L1440,48 L0,48 Z" fill="white" />
            <path d="M0,24 C360,48 720,0 1080,24 C1260,36 1380,40 1440,24 L1440,0 L0,0 Z" fill="#f5fffe" />
          </svg>
        </div>

        {/* ═══ 3. Templates ═════════════════════════════════ */}
        <section className={styles.templateSection}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 className={styles.sectionHeading}>4 ATS-Friendly Nursing Templates</h2>
              <p className={styles.sectionSubtext}>
                Optimized for hospital applicant tracking systems
              </p>
            </div>

            <div className={styles.templateGrid}>
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className={styles.templateCard}
                  onClick={() => router.push(`/new-resume-builder?template=${tpl.id}`)}
                >
                  {/* Mini wireframe thumbnail */}
                  <div className={styles.templatePreview}>
                    <div style={{ height: '6px', width: '65%', background: tpl.barColor, borderRadius: '3px', opacity: 0.85 }} />
                    <div style={{ height: '3px', width: '80%', background: '#cbd5e1', borderRadius: '2px' }} />
                    <div style={{ height: '3px', width: '60%', background: '#cbd5e1', borderRadius: '2px' }} />
                    <div style={{ marginTop: '5px', height: '4px', width: '50%', background: tpl.accentColor, borderRadius: '2px', opacity: 0.5 }} />
                    <div style={{ height: '3px', width: '90%', background: '#e2e8f0', borderRadius: '2px' }} />
                    <div style={{ height: '3px', width: '70%', background: '#e2e8f0', borderRadius: '2px' }} />
                    <div style={{ height: '3px', width: '82%', background: '#e2e8f0', borderRadius: '2px' }} />
                    <div style={{ marginTop: '5px', height: '4px', width: '45%', background: tpl.accentColor, borderRadius: '2px', opacity: 0.5 }} />
                    <div style={{ height: '3px', width: '75%', background: '#e2e8f0', borderRadius: '2px' }} />
                  </div>
                  {/* Template info */}
                  <div className={styles.templateInfo}>
                    <div className={styles.templateName}>{tpl.name}</div>
                    <div className={styles.templateBestFor}>{tpl.bestFor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 3b. Template Preview ═════════════════════════ */}
        <section className={styles.previewSection}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 className={styles.sectionHeading}>See What Your Resume Could Look Like</h2>
              <p className={styles.sectionSubtext}>
                Real nursing sections. Licenses, certs, clinical skills, and more
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

            {/* Resume preview container */}
            <div className={styles.previewFrame}>
              <div className={styles.previewScaler}>
                <ResumePreview
                  resumeData={SAMPLE_RESUME}
                  template={previewTemplate}
                />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button className={styles.primaryButton} onClick={handleBuildNewClick}>
                Build Yours Now
              </button>
            </div>
          </div>
        </section>

        {/* Wave: preview → steps */}
        <div className={styles.sectionWave} aria-hidden="true">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ width: '100%', height: '28px', display: 'block' }}>
            <path d="M0,20 C480,44 960,4 1440,28 L1440,48 L0,48 Z" fill="#f8fffe" />
            <path d="M0,20 C480,44 960,4 1440,28 L1440,0 L0,0 Z" fill="#f9fafb" />
          </svg>
        </div>

        {/* ═══ 4. How It Works ══════════════════════════════ */}
        <section className={styles.stepsSection}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 className={styles.sectionHeading}>How It Works</h2>
              <p className={styles.sectionSubtext}>
                Build a professional nursing resume in under 5 minutes
              </p>
            </div>

            <div className={styles.stepsGrid}>
              {STEPS.map((step) => (
                <div key={step.number} className={styles.stepCard}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepNumber}>{step.number}</div>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                  </div>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 5. Specialty Quick Links ═════════════════════ */}
        <section className={styles.specialtySection}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 className={styles.sectionHeading}>Resume Help by Specialty</h2>
              <p className={styles.sectionSubtext}>
                Tailored skills and content for your area of practice
              </p>
            </div>

            <div className={styles.specialtyWrap}>
              {SPECIALTIES.map((spec) => (
                <Link
                  key={spec.slug}
                  href="/new-resume-builder"
                  className={styles.specialtyPill}
                >
                  {spec.name}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 6. Cross-Link to Job Board ══════════════════ */}
        <section style={{
          padding: '56px 20px',
          background: '#0d9488',
          color: 'white',
        }}>
          <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '36px', alignItems: 'center' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: '700', color: 'white', marginBottom: '10px', lineHeight: '1.3' }}>
                Find Your Next RN Job
              </h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', marginBottom: '20px' }}>
                Thousands of nursing jobs from top healthcare employers. Direct postings, no recruiter spam.
              </p>
              <Link
                href="/jobs/nursing"
                style={{
                  display: 'inline-block',
                  padding: '11px 22px',
                  backgroundColor: 'white',
                  color: '#0d9488',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                Browse All RN Jobs
              </Link>
            </div>
            <div style={{ flex: '1 1 260px' }}>
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
          </div>
        </section>

        {/* ═══ 7. FAQ ═══════════════════════════════════════ */}
        <section style={{ padding: '64px 20px', backgroundColor: 'white' }}>
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

        {/* ═══ 8. Final CTA ═════════════════════════════════ */}
        <section style={{
          padding: '72px 20px',
          background: '#f0fdfa',
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontSize: '30px',
              fontWeight: '700',
              color: '#0f4f4a',
              marginBottom: '14px',
              lineHeight: '1.3',
              letterSpacing: '-0.01em',
            }}>
              Build Your Nursing Resume in Minutes
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              lineHeight: '1.6',
              marginBottom: '28px',
            }}>
              Dedicated nursing sections, AI-powered content, and ATS-friendly
              templates. All free to start.
            </p>

            <button className={styles.primaryButton} onClick={handleBuildNewClick}>
              Start Building Now
            </button>

            <div style={{ marginTop: '14px' }}>
              <button
                className={styles.secondaryLink}
                onClick={() => router.push('/resume-import')}
              >
                or import existing resume
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
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

export default NursingResumeBuilderPage;
