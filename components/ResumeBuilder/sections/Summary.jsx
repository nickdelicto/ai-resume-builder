import React, { useState, useEffect, useMemo } from 'react';
import styles from './Summary.module.css';
import { useResumeContext } from '../ResumeContext';
import { toast } from 'react-hot-toast';

// Best practice: 3-5 sentences, 50-75 words ≈ 300-500 characters
const MAX_SUMMARY_LENGTH = 500;
const WARN_SUMMARY_LENGTH = 450;
const MIN_SUMMARY_LENGTH = 30;

// Pre-filled nursing summary templates - tap to use
const NURSING_TEMPLATES = [
  // General Templates
  {
    id: 'new-grad',
    label: 'New Grad',
    icon: '🎓',
    matchUnits: [],
    matchSpecialties: [],
    template: 'Compassionate and dedicated new graduate Registered Nurse with clinical rotations in [UNIT]. Committed to delivering high-quality, patient-centered care. Strong foundation in assessment, medication administration, and care coordination. Eager to contribute to a collaborative healthcare team while continuing professional growth.'
  },
  {
    id: 'experienced',
    label: 'Experienced',
    icon: '⭐',
    matchUnits: [],
    matchSpecialties: [],
    template: 'Experienced Registered Nurse with [X] years of [SPECIALTY] nursing experience. Proven ability to manage high-acuity patients while maintaining exceptional standards of care. Skilled in patient assessment, care planning, and interdisciplinary collaboration. Track record of mentoring new nurses and contributing to quality improvement initiatives.'
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: '✈️',
    matchUnits: [],
    matchSpecialties: ['travel'],
    template: 'Adaptable Travel Registered Nurse with [X] years of diverse healthcare experience across multiple facilities and EHR systems. Quick learner who integrates seamlessly into new teams. Brings fresh perspectives and best practices from various healthcare settings. Flexible, reliable, and committed to excellence in patient care.'
  },
  {
    id: 'leadership',
    label: 'Charge/Lead',
    icon: '👑',
    matchUnits: [],
    matchSpecialties: [],
    template: 'Results-driven Charge Nurse with [X] years of nursing experience including [X] years in leadership. Expertise in staff coordination, patient flow optimization, and real-time problem solving. Proven ability to mentor new nurses, manage unit operations, and maintain high standards of patient care during complex situations.'
  },
  // Specialty Templates
  {
    id: 'med-surg',
    label: 'Med-Surg',
    icon: '🩺',
    matchUnits: ['med-surg'],
    matchSpecialties: ['med-surg'],
    template: 'Dedicated Medical-Surgical Registered Nurse with [X] years of experience providing comprehensive care to diverse patient populations. Skilled in post-operative care, wound management, and patient education. Proficient in managing multiple patients with complex medical conditions while maintaining attention to detail and safety protocols.'
  },
  {
    id: 'icu-critical',
    label: 'ICU',
    icon: '🏥',
    matchUnits: ['icu'],
    matchSpecialties: ['icu'],
    template: 'Critical Care Registered Nurse with [X] years of ICU experience caring for complex, high-acuity patients. Proficient in ventilator management, vasoactive medications, and continuous renal replacement therapy. ACLS and CCRN certified. Demonstrates composure under pressure and strong clinical decision-making skills.'
  },
  {
    id: 'er',
    label: 'ER',
    icon: '🚑',
    matchUnits: ['er'],
    matchSpecialties: ['er'],
    template: 'Dynamic Emergency Department Registered Nurse with [X] years of fast-paced ER experience. Skilled in rapid triage, trauma care, and managing multiple critical patients simultaneously. ACLS, PALS, and TNCC certified. Thrives in high-stress environments while delivering compassionate, efficient patient care.'
  },
  {
    id: 'labor-delivery',
    label: 'L&D / OB',
    icon: '👶',
    matchUnits: ['labor-delivery', 'postpartum'],
    matchSpecialties: ['labor-delivery', 'postpartum'],
    template: 'Compassionate Labor and Delivery Registered Nurse with [X] years of experience supporting mothers through all stages of childbirth. Skilled in fetal monitoring, labor support, and postpartum care. NRP and AWHONN certified. Committed to providing family-centered care during one of life\'s most important moments.'
  },
  {
    id: 'pediatrics',
    label: 'Pediatrics',
    icon: '🧸',
    matchUnits: ['pediatrics', 'nicu'],
    matchSpecialties: ['pediatrics', 'nicu'],
    template: 'Caring Pediatric Registered Nurse with [X] years of experience providing age-appropriate care to infants, children, and adolescents. Skilled in pediatric assessment, medication calculations, and family education. PALS certified. Creates a calm, supportive environment that puts young patients and their families at ease.'
  },
  {
    id: 'oncology',
    label: 'Oncology',
    icon: '🎗️',
    matchUnits: ['oncology'],
    matchSpecialties: ['oncology'],
    template: 'Compassionate Oncology Registered Nurse with [X] years of experience caring for patients throughout their cancer journey. Skilled in chemotherapy administration, symptom management, and end-of-life care. OCN certified. Provides emotional support and patient education while maintaining strict safety protocols for hazardous medications.'
  },
  {
    id: 'or-periop',
    label: 'OR / Periop',
    icon: '🔬',
    matchUnits: ['or', 'pacu'],
    matchSpecialties: ['or'],
    template: 'Detail-oriented Perioperative Registered Nurse with [X] years of OR experience across multiple surgical specialties. Skilled in sterile technique, surgical instrumentation, and patient positioning. CNOR certified. Maintains composure during complex procedures while ensuring patient safety and optimal surgical outcomes.'
  },
  {
    id: 'telemetry',
    label: 'Tele/Cardiac',
    icon: '❤️',
    matchUnits: ['telemetry', 'cardiac'],
    matchSpecialties: ['telemetry', 'cardiac'],
    template: 'Skilled Telemetry Registered Nurse with [X] years of experience monitoring and caring for cardiac patients. Proficient in rhythm interpretation, hemodynamic monitoring, and rapid response to changes in patient condition. ACLS certified. Committed to early detection and intervention for optimal patient outcomes.'
  },
  {
    id: 'psych',
    label: 'Psych/MH',
    icon: '🧠',
    matchUnits: ['psych'],
    matchSpecialties: ['psych'],
    template: 'Empathetic Psychiatric Registered Nurse with [X] years of experience in mental health settings. Skilled in therapeutic communication, crisis intervention, and medication management. Experienced with diverse populations including acute psychiatric, substance abuse, and dual-diagnosis patients. Maintains a calm, non-judgmental approach.'
  },
  {
    id: 'home-health',
    label: 'Home Health',
    icon: '🏠',
    matchUnits: ['home-health'],
    matchSpecialties: ['home-health'],
    template: 'Independent Home Health Registered Nurse with [X] years of experience providing skilled nursing care in patient homes. Proficient in wound care, IV therapy, and chronic disease management. Excellent assessment skills and ability to work autonomously. Strong patient education and family communication abilities.'
  },
  {
    id: 'case-mgmt',
    label: 'Case Mgmt',
    icon: '📋',
    matchUnits: ['case-management'],
    matchSpecialties: ['case-management'],
    template: 'Organized Case Management Registered Nurse with [X] years of experience coordinating patient care across the healthcare continuum. Skilled in utilization review, discharge planning, and care transitions. Strong knowledge of insurance requirements and community resources. Advocates for optimal patient outcomes while managing healthcare costs.'
  },
  {
    id: 'dialysis',
    label: 'Dialysis',
    icon: '💧',
    matchUnits: ['dialysis'],
    matchSpecialties: ['dialysis'],
    template: 'Specialized Dialysis Registered Nurse with [X] years of experience providing hemodialysis and peritoneal dialysis care. Proficient in vascular access management, water treatment systems, and patient education. CNN certified. Builds strong relationships with chronic patients while monitoring for complications and optimizing treatment outcomes.'
  }
];

const Summary = ({ data, updateData, jobContext, onNavigateToSection }) => {
  const [summary, setSummary] = useState(data || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showPrereqWarning, setShowPrereqWarning] = useState(false);
  const [showLengthWarning, setShowLengthWarning] = useState(false);

  // Get resume context to access ALL section data
  const resumeContext = useResumeContext();
  const experienceData = resumeContext?.resumeData?.experience || [];
  const certificationData = resumeContext?.resumeData?.certifications || [];
  const licenseData = resumeContext?.resumeData?.licenses || [];
  const healthcareSkills = resumeContext?.resumeData?.healthcareSkills || {};
  const educationData = resumeContext?.resumeData?.education || [];
  const skillsData = resumeContext?.resumeData?.skills || [];

  // Determine if prerequisite sections are filled
  const hasExperience = experienceData.length > 0 &&
    experienceData[0]?.title && experienceData[0]?.company;

  // Character count state
  const charCount = summary.length;
  const isOverLimit = charCount > MAX_SUMMARY_LENGTH;
  const isNearLimit = charCount > WARN_SUMMARY_LENGTH && charCount <= MAX_SUMMARY_LENGTH;

  // Smart template suggestion: find the best match based on experience/specialty
  const suggestedTemplateId = useMemo(() => {
    // Check healthcareSkills specialty first (most explicit signal)
    const specialty = healthcareSkills?.specialty || '';
    // Check first experience entry's unit
    const firstUnit = experienceData[0]?.unit || '';

    if (!specialty && !firstUnit) return null;

    // Find a template that matches the unit or specialty
    for (const tmpl of NURSING_TEMPLATES) {
      if (specialty && tmpl.matchSpecialties.includes(specialty)) return tmpl.id;
      if (firstUnit && tmpl.matchUnits.includes(firstUnit)) return tmpl.id;
    }
    return null;
  }, [healthcareSkills?.specialty, experienceData]);

  // Sort templates: suggested first, then rest in original order
  const sortedTemplates = useMemo(() => {
    if (!suggestedTemplateId) return NURSING_TEMPLATES;
    const suggested = NURSING_TEMPLATES.find(t => t.id === suggestedTemplateId);
    const rest = NURSING_TEMPLATES.filter(t => t.id !== suggestedTemplateId);
    return suggested ? [suggested, ...rest] : NURSING_TEMPLATES;
  }, [suggestedTemplateId]);

  // Navigation helpers
  const navigateToSection = (e, sectionId) => {
    e.preventDefault();
    if (onNavigateToSection) {
      onNavigateToSection(sectionId);
    }
  };

  useEffect(() => {
    if (data !== undefined) {
      setSummary(data);

      // If summary already has content when component first mounts,
      // assume it was imported and mark as already generated
      if (data && data.length > 0) {
        setHasAutoGenerated(true);
      }
    }
  }, [data]);


  const handleChange = (e) => {
    const value = e.target.value;
    setSummary(value);
    updateData(value);

    // Clear warnings when user types
    if (showPrereqWarning) setShowPrereqWarning(false);
    if (showLengthWarning) setShowLengthWarning(false);
  };

  // Select a template to use as starting point
  const selectTemplate = (template) => {
    setSummary(template.template);
    updateData(template.template);
    setShowTemplates(false);
    setHasAutoGenerated(true);
    toast.success('Template selected! Edit the [BRACKETS] with your details, then tap Improve Summary.', { duration: 5000 });
  };

  // Generate summary based on ALL available resume context
  const generateSummaryFromContext = async (useExistingText = false) => {
    setIsGenerating(true);

    try {
      const personalInfo = resumeContext?.resumeData?.personalInfo || {};

      // Build the full payload with ALL nursing context
      const payload = {
        existingSummary: useExistingText ? summary : null,
        professionalContext: {
          title: experienceData[0]?.title || '',
          linkedin: personalInfo.linkedin || '',
          website: personalInfo.website || ''
        },
        experience: experienceData.map(exp => ({
          title: exp.title || '',
          company: exp.company || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          description: exp.description || '',
          unit: exp.unit || '',
          facilityType: exp.facilityType || '',
          shiftType: exp.shiftType || ''
        })),
        education: educationData,
        skills: skillsData,
        // Pass certifications, licenses, and healthcare skills
        certifications: certificationData.map(cert => ({
          name: cert.name || '',
          fullName: cert.fullName || ''
        })),
        licenses: licenseData.map(lic => ({
          type: lic.type || '',
          state: lic.state || '',
          isCompact: lic.isCompact || false
        })),
        healthcareSkills: {
          ehrSystems: healthcareSkills?.ehrSystems || [],
          clinicalSkills: healthcareSkills?.clinicalSkills || [],
          specialty: healthcareSkills?.specialty || '',
          customSkills: healthcareSkills?.customSkills || []
        },
        jobContext: jobContext?.description || null,
        action: useExistingText ? 'improve' : 'generate'
      };

      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const result = await response.json();

      if (result.summary) {
        setSummary(result.summary);
        updateData(result.summary);
        setHasAutoGenerated(true);
        toast.success(useExistingText ? 'Summary improved!' : 'Summary generated!', { duration: 3000 });
      } else {
        throw new Error('No summary generated');
      }
    } catch (error) {
      console.error('Error generating summary:', error);

      let errorMessage = 'Having trouble generating your summary.';

      if (error.message.includes('API key')) {
        errorMessage = 'Our AI service is temporarily unavailable.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'AI service limit reached for the moment.';
      } else if (error.message.includes('timeout') || error.message.includes('network')) {
        errorMessage = 'Connection to AI service timed out.';
      }

      toast.error(`${errorMessage} Try again or pick a template above and customize it.`, { duration: 7000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSummary = async () => {
    setShowPrereqWarning(false);
    setShowLengthWarning(false);

    const hasExistingText = summary && summary.trim().length > 0;

    // If the user has typed something but it's too short, warn them
    if (hasExistingText && summary.trim().length < MIN_SUMMARY_LENGTH && !hasExperience) {
      setShowLengthWarning(true);
      setTimeout(() => setShowLengthWarning(false), 10000);
      return;
    }

    // Prerequisite check: need at least experience data for AI generation
    if (!hasExperience && !hasExistingText) {
      setShowPrereqWarning(true);
      setTimeout(() => setShowPrereqWarning(false), 12000);
      return;
    }

    generateSummaryFromContext(hasExistingText);
  };

  // Button text logic
  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    if (hasAutoGenerated || summary) return '✨ Improve Summary';
    return '✨ Generate Summary';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>📝</span>
          Professional Summary
        </h2>
      </div>
      <p className={styles.description}>
        Tap a template below to get started, or write your own. We'll use your experience, certifications, and skills to personalize it.
      </p>

      {/* Template Selection */}
      <div className={styles.templateSection}>
        <button
          type="button"
          className={styles.templateHeader}
          onClick={() => setShowTemplates(!showTemplates)}
        >
          <div className={styles.templateHeaderLeft}>
            <span className={styles.templateIcon}>✨</span>
            <span className={styles.templateTitle}>Quick Start Templates</span>
            <span className={styles.templateHint}>Tap to use</span>
          </div>
          <span className={styles.templateArrow}>
            {showTemplates ? '▼' : '▶'}
          </span>
        </button>

        {showTemplates && (
          <div className={styles.templateGrid}>
            {sortedTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                className={`${styles.templateCard} ${template.id === suggestedTemplateId ? styles.templateCardSuggested : ''}`}
                onClick={() => selectTemplate(template)}
              >
                <span className={styles.cardIcon}>{template.icon}</span>
                <span className={styles.cardLabel}>{template.label}</span>
                {template.id === suggestedTemplateId && (
                  <span className={styles.suggestedBadge}>For you</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Textarea */}
      <div className={styles.formGroup}>
        <label htmlFor="summary" className={styles.textareaLabel}>
          Your Summary
          {summary && summary.includes('[') && (
            <span className={styles.editHint}>Edit the [BRACKETS] with your info</span>
          )}
        </label>
        <textarea
          id="summary"
          value={summary}
          onChange={handleChange}
          placeholder="Write a 3-4 sentence summary highlighting your nursing specialty, years of experience, key certifications, and clinical strengths..."
          className={`${styles.formInput} ${isOverLimit ? styles.formInputWarn : ''}`}
          rows={6}
        />

        {/* Character counter */}
        {summary.length > 0 && (
          <div className={styles.charCounter}>
            <span className={`${styles.charCount} ${isOverLimit ? styles.charCountOver : ''} ${isNearLimit ? styles.charCountWarn : ''}`}>
              {charCount} / {MAX_SUMMARY_LENGTH}
            </span>
            {isOverLimit && (
              <span className={styles.charLimitMsg}>
                Over limit — keep to 3-4 sentences for best results
              </span>
            )}
          </div>
        )}
      </div>

      {/* Prerequisite Warning */}
      {showPrereqWarning && (
        <div className={`${styles.completionHint} ${styles.warningHint}`}>
          <span className={styles.hintIcon}>⚠️</span>
          <span className={styles.hintText}>
            <strong>Fill in earlier sections first!</strong> We need your{' '}
            <a href="#" className={styles.sectionLink} onClick={(e) => navigateToSection(e, 'experience')}>experience</a>
            {' '}to write a strong summary. Add at least one position with a title and employer, then come back here.
          </span>
        </div>
      )}

      {/* Length Warning */}
      {showLengthWarning && (
        <div className={`${styles.completionHint} ${styles.warningHint}`}>
          <span className={styles.hintIcon}>⚠️</span>
          <span className={styles.hintText}>
            <strong>Write at least {MIN_SUMMARY_LENGTH} characters</strong> so AI has enough to work with, or pick a template above.
          </span>
        </div>
      )}

      {/* Generate / Improve Button */}
      <button
        className={`${styles.aiButton} ${isGenerating ? styles.generating : ''}`}
        onClick={generateSummary}
        disabled={isGenerating}
      >
        {getButtonText()}
      </button>

      {/* Pro Tip */}
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> {summary
            ? 'Tap "Improve Summary" - We will weave in your certifications, specialty, and years of experience to help pass ATS screening.'
            : 'Recruiters spend 6-7 seconds per resume. Lead with your specialty and years of experience to grab their attention.'}
        </span>
      </div>
    </div>
  );
};

export default Summary;
