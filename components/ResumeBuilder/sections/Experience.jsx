/**
 * Experience Section
 * Healthcare-focused work experience input
 *
 * Target user: Tired nurse who wants to quickly add their work history
 * Mobile-first, large touch targets, clear visual hierarchy
 */

import React, { useState, useEffect, useRef } from 'react';
import styles from './Experience.module.css';
import { toast } from 'react-hot-toast';
import { useDrag, useDrop } from 'react-dnd';
import { METRIC_OPTIONS, EHR_SYSTEMS } from '../../../lib/constants/healthcareData';

// Healthcare-specific options
const NURSING_UNITS = [
  { id: '', name: 'Select unit...' },
  { id: 'icu', name: 'ICU / Critical Care' },
  { id: 'er', name: 'Emergency Room' },
  { id: 'med-surg', name: 'Med-Surg' },
  { id: 'telemetry', name: 'Telemetry / Step-Down' },
  { id: 'or', name: 'Operating Room' },
  { id: 'pacu', name: 'PACU / Recovery' },
  { id: 'labor-delivery', name: 'Labor & Delivery' },
  { id: 'postpartum', name: 'Postpartum / Mother-Baby' },
  { id: 'nicu', name: 'NICU' },
  { id: 'pediatrics', name: 'Pediatrics' },
  { id: 'oncology', name: 'Oncology' },
  { id: 'cardiac', name: 'Cardiac / CVICU' },
  { id: 'neuro', name: 'Neurology / Neuro ICU' },
  { id: 'rehab', name: 'Rehab / Physical Medicine' },
  { id: 'psych', name: 'Psychiatric / Behavioral' },
  { id: 'home-health', name: 'Home Health' },
  { id: 'hospice', name: 'Hospice / Palliative' },
  { id: 'clinic', name: 'Outpatient Clinic' },
  { id: 'dialysis', name: 'Dialysis' },
  { id: 'infusion', name: 'Infusion Center' },
  { id: 'case-management', name: 'Case Management' },
  { id: 'float-pool', name: 'Float Pool' },
  { id: 'other', name: 'Other' }
];

const SHIFT_TYPES = [
  { id: '', name: 'Select shift...' },
  { id: 'days', name: 'Days (7a-7p)' },
  { id: 'nights', name: 'Nights (7p-7a)' },
  { id: 'day-8', name: 'Day Shift (8hr)' },
  { id: 'evening', name: 'Evening (3p-11p)' },
  { id: 'night-8', name: 'Night Shift (8hr)' },
  { id: 'rotating', name: 'Rotating' },
  { id: 'prn', name: 'PRN / Per Diem' },
  { id: 'weekends', name: 'Weekends Only' },
  { id: 'variable', name: 'Variable' },
  { id: 'other', name: 'Other' }
];

const FACILITY_TYPES = [
  { id: '', name: 'Select facility type...' },
  { id: 'hospital', name: 'Hospital' },
  { id: 'hospital-magnet', name: 'Hospital (Magnet)' },
  { id: 'hospital-teaching', name: 'Teaching Hospital' },
  { id: 'hospital-trauma', name: 'Level 1 Trauma Center' },
  { id: 'hospital-community', name: 'Community Hospital' },
  { id: 'ltac', name: 'LTAC (Long-Term Acute Care)' },
  { id: 'snf', name: 'Skilled Nursing Facility' },
  { id: 'rehab-facility', name: 'Rehab Facility' },
  { id: 'clinic', name: 'Clinic / Outpatient' },
  { id: 'urgent-care', name: 'Urgent Care' },
  { id: 'home-health', name: 'Home Health Agency' },
  { id: 'hospice', name: 'Hospice' },
  { id: 'travel', name: 'Travel Assignment' },
  { id: 'agency', name: 'Staffing Agency' },
  { id: 'other', name: 'Other' }
];

// Helper function to truncate text for tab display
const truncateText = (text, maxLength = 20) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Draggable Experience Tab — MUST be outside Experience to avoid remount on every keystroke
const DraggableExperienceTab = ({ exp, index, isActive, onTabClick, onRemove, moveExperience, itemCount }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'EXPERIENCE',
    item: { id: exp.id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: 'EXPERIENCE',
    hover: (draggedItem) => {
      if (draggedItem.index === index) return;
      moveExperience(draggedItem.index, index);
      draggedItem.index = index;
    },
  });

  const handleTabClick = (e) => {
    if (isDragging || e.target.closest(`.${styles.dragHandle}`)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onTabClick(index);
  };

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`${styles.experienceTab} ${isActive ? styles.experienceTabActive : ''} ${isDragging ? styles.draggingTab : ''}`}
      onClick={handleTabClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <span className={styles.tabContent}>
        <span className={styles.tabNumber}>{index + 1}</span>
        <span className={styles.tabTitle}>
          {(exp?.title || exp?.company)
            ? `${truncateText(exp?.title || 'Position')}`
            : `Position ${index + 1}`}
        </span>
      </span>

      {/* Drag Handle */}
      <div
        className={styles.dragHandle}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <span className={styles.dragIcon}>☰</span>
      </div>

      {itemCount > 1 && (
        <button
          className={styles.tabRemoveButton}
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          aria-label="Remove experience"
        >
          ×
        </button>
      )}
    </div>
  );
};

const Experience = ({ data, updateData, jobContext }) => {
  // Helper function to generate unique ID
  const generateExperienceId = () => `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Ensure data is always an array with at least one default item
  const [experiences, setExperiences] = useState(() => {
    const defaultExperience = {
      id: generateExperienceId(),
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      description: '',
      unit: '',
      shiftType: '',
      facilityType: ''
    };

    if (!data || !Array.isArray(data) || data.length === 0) {
      return [defaultExperience];
    }

    return data.map(exp => ({
      id: exp.id || generateExperienceId(),
      title: exp.title || '',
      company: exp.company || '',
      location: exp.location || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: exp.description || '',
      unit: exp.unit || '',
      shiftType: exp.shiftType || '',
      facilityType: exp.facilityType || ''
    }));
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGeneratedIndices, setAutoGeneratedIndices] = useState(new Set());
  const [showRequiredFieldsWarning, setShowRequiredFieldsWarning] = useState(false);
  const [showMetricDrawer, setShowMetricDrawer] = useState(false);
  const [metricStep, setMetricStep] = useState(0);
  const [selectedMetrics, setSelectedMetrics] = useState({
    patientRatio: null,
    patientRatioCustom: '',
    bedCount: null,
    bedCountCustom: '',
    ehrSystem: null,
    ehrSystemCustom: '',
    achievement: null,
    achievementCustom: '',
    achievementMetric: ''
  });
  const formContentRef = useRef(null);
  const metricDrawerRef = useRef(null);
  const requiredFieldsRef = useRef(null);
  const [wizardPulse, setWizardPulse] = useState(false);

  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      const normalizedData = data.map(exp => ({
        id: exp.id || generateExperienceId(),
        title: exp.title || '',
        company: exp.company || '',
        location: exp.location || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        description: exp.description || '',
        unit: exp.unit || '',
        shiftType: exp.shiftType || '',
        facilityType: exp.facilityType || ''
      }));

      setExperiences(normalizedData);

      const newAutoGeneratedIndices = new Set(autoGeneratedIndices);
      for (let i = 0; i < normalizedData.length; i++) {
        if (normalizedData[i].title && normalizedData[i].company) {
          newAutoGeneratedIndices.add(i);
        }
      }
      setAutoGeneratedIndices(newAutoGeneratedIndices);

      if (currentIndex >= normalizedData.length) {
        setCurrentIndex(Math.max(0, normalizedData.length - 1));
      }
    }
  }, [data]);

  // Close metric drawer when switching experience tabs
  useEffect(() => {
    setShowMetricDrawer(false);
    setMetricStep(0);
  }, [currentIndex]);

  const handleInputChange = (field, value) => {
    if (!experiences || !Array.isArray(experiences) || currentIndex >= experiences.length) {
      return;
    }

    const updatedExperiences = [...experiences];
    updatedExperiences[currentIndex] = {
      ...updatedExperiences[currentIndex],
      [field]: value
    };

    setExperiences(updatedExperiences);
    updateData(updatedExperiences);

    if ((field === 'title' || field === 'company' || field === 'startDate' || field === 'endDate') && showRequiredFieldsWarning) {
      const currentExp = updatedExperiences[currentIndex];
      if (currentExp.title && currentExp.company && currentExp.startDate && currentExp.endDate) {
        setShowRequiredFieldsWarning(false);
      }
    }
  };


  const addNewExperience = () => {
    if (!experiences || !Array.isArray(experiences)) {
      const defaultExperience = {
        id: generateExperienceId(),
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
        unit: '',
        shiftType: '',
        facilityType: ''
      };

      setExperiences([defaultExperience]);
      setCurrentIndex(0);
      updateData([defaultExperience]);
      return;
    }

    const updatedExperiences = [
      ...experiences,
      {
        id: generateExperienceId(),
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
        unit: '',
        shiftType: '',
        facilityType: ''
      }
    ];

    setExperiences(updatedExperiences);
    setCurrentIndex(updatedExperiences.length - 1);
    updateData(updatedExperiences);
    setShowRequiredFieldsWarning(false);
  };

  const removeExperience = (index) => {
    if (!experiences || !Array.isArray(experiences)) return;
    if (index < 0 || index >= experiences.length) return;
    if (experiences.length === 1) return;

    const updatedExperiences = experiences.filter((_, i) => i !== index);
    setExperiences(updatedExperiences);

    if (index <= currentIndex) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }

    if (autoGeneratedIndices.has(index)) {
      const updatedIndices = new Set(autoGeneratedIndices);
      updatedIndices.delete(index);

      const adjustedIndices = new Set();
      updatedIndices.forEach(idx => {
        if (idx > index) {
          adjustedIndices.add(idx - 1);
        } else {
          adjustedIndices.add(idx);
        }
      });

      setAutoGeneratedIndices(adjustedIndices);
    }

    updateData(updatedExperiences);
    setShowRequiredFieldsWarning(false);
  };


  const handleGenerateClick = () => {
    const currentExp = experiences[currentIndex];
    if (!currentExp?.title || !currentExp?.company || !currentExp?.startDate || !currentExp?.endDate) {
      setShowRequiredFieldsWarning(true);
      setTimeout(() => {
        setShowRequiredFieldsWarning(false);
        // Auto-scroll to required fields only if they're not already visible
        const el = requiredFieldsRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (!isVisible) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 5000);
      return;
    }
    // If wizard is already open, scroll to it and pulse
    if (showMetricDrawer) {
      metricDrawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setWizardPulse(true);
      setTimeout(() => setWizardPulse(false), 800);
      return;
    }
    setMetricStep(0);
    setShowMetricDrawer(true);
  };

  const generateDescription = async (metrics = null) => {
    if (!experiences || !Array.isArray(experiences) || currentIndex >= experiences.length) return;

    const currentExp = experiences[currentIndex];
    if (!currentExp) return;

    if (!currentExp.title || !currentExp.company || !currentExp.startDate || !currentExp.endDate) return;

    const isImproving = currentExp.description && currentExp.description.trim().length > 0;

    const updatedIndices = new Set(autoGeneratedIndices);
    updatedIndices.add(currentIndex);
    setAutoGeneratedIndices(updatedIndices);

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentExp.title,
          company: currentExp.company,
          location: currentExp.location,
          startDate: currentExp.startDate,
          endDate: currentExp.endDate,
          description: isImproving ? currentExp.description : null,
          jobContext: jobContext?.description || null,
          action: isImproving ? 'improve' : 'generate',
          unit: currentExp.unit || null,
          shiftType: currentExp.shiftType || null,
          facilityType: currentExp.facilityType || null,
          metrics: metrics
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate');
      }

      const data = await response.json();

      if (data.description) {
        // Normalize AI output: ensure double newlines between bullets for neat spacing
        const formatted = data.description
          .replace(/\r\n/g, '\n')           // normalize line endings
          .replace(/\n{3,}/g, '\n\n')       // collapse 3+ newlines to 2
          .replace(/(?<!\n)\n(?!\n)/g, '\n\n'); // single newlines → double
        handleInputChange('description', formatted);
        toast.success(isImproving ? 'Description improved!' : 'Description generated!', { duration: 3000 });
      }

      // Reset metrics after successful generation
      if (metrics) {
        setSelectedMetrics({
          patientRatio: null, patientRatioCustom: '',
          bedCount: null, bedCountCustom: '',
          ehrSystem: null, ehrSystemCustom: '',
          achievement: null, achievementCustom: '', achievementMetric: ''
        });
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error('Having trouble generating. Please try again.', { duration: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    const currentExp = experiences[currentIndex];
    if (currentExp?.title && currentExp?.company && currentExp?.description) {
      return '✨ Improve Description';
    }
    return '✨ Generate Description';
  };

  const moveExperience = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const reorderedExperiences = [...experiences];
    const [movedExperience] = reorderedExperiences.splice(fromIndex, 1);
    reorderedExperiences.splice(toIndex, 0, movedExperience);

    setExperiences(reorderedExperiences);
    updateData(reorderedExperiences);

    if (currentIndex === fromIndex) {
      setCurrentIndex(toIndex);
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }

    const updatedIndices = new Set();
    autoGeneratedIndices.forEach(index => {
      if (index === fromIndex) {
        updatedIndices.add(toIndex);
      } else if (fromIndex < index && toIndex >= index) {
        updatedIndices.add(index - 1);
      } else if (fromIndex > index && toIndex <= index) {
        updatedIndices.add(index + 1);
      } else {
        updatedIndices.add(index);
      }
    });
    setAutoGeneratedIndices(updatedIndices);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>💼</span>
          Work Experience
        </h2>
        <p className={styles.description}>
          Add your nursing experience. We'll help you write achievement-focused descriptions!
        </p>
      </div>

      {/* Experience Tabs Navigation */}
      <div className={styles.experienceTabs}>
        {Array.isArray(experiences) && experiences.map((exp, index) => (
          <DraggableExperienceTab
            key={exp.id}
            exp={exp}
            index={index}
            isActive={index === currentIndex}
            onTabClick={setCurrentIndex}
            onRemove={removeExperience}
            moveExperience={moveExperience}
            itemCount={experiences.length}
          />
        ))}

        <button
          className={styles.addPositionButton}
          onClick={addNewExperience}
          aria-label="Add experience"
        >
          + Add Position
        </button>
      </div>

      {/* Experience Card */}
      <div className={styles.experienceCard} ref={formContentRef}>
        {/* Basic Fields */}
        <div className={styles.formGrid} ref={requiredFieldsRef}>
          <div className={styles.fieldGroup}>
            <label htmlFor="title" className={styles.label}>
              <span className={styles.labelIcon}>👤</span>
              Job Title
              <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="title"
              value={experiences[currentIndex]?.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. Registered Nurse, Charge Nurse"
              className={styles.input}
              autoComplete="organization-title"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="company" className={styles.label}>
              <span className={styles.labelIcon}>🏥</span>
              Employer
              <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="company"
              value={experiences[currentIndex]?.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="e.g. Cleveland Clinic, Memorial Hospital"
              className={styles.input}
              autoComplete="organization"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="location" className={styles.label}>
              <span className={styles.labelIcon}>📍</span>
              Location
            </label>
            <input
              type="text"
              id="location"
              value={experiences[currentIndex]?.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g. Cleveland, OH"
              className={styles.input}
              autoComplete="address-level2"
            />
          </div>
        </div>

        {/* Healthcare-Specific Fields */}
        <div className={styles.healthcareFields}>
          <div className={styles.healthcareHeader}>
            <span className={styles.healthcareIcon}>🩺</span>
            <span className={styles.healthcareTitle}>Healthcare Details</span>
            <span className={styles.healthcareHint}>optional</span>
          </div>

          <div className={styles.healthcareGrid}>
            <div className={styles.fieldGroup}>
              <label htmlFor="unit" className={styles.label}>Unit / Department</label>
              <select
                id="unit"
                value={experiences[currentIndex]?.unit || ''}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                className={styles.select}
              >
                {NURSING_UNITS.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="shiftType" className={styles.label}>Shift Type</label>
              <select
                id="shiftType"
                value={experiences[currentIndex]?.shiftType || ''}
                onChange={(e) => handleInputChange('shiftType', e.target.value)}
                className={styles.select}
              >
                {SHIFT_TYPES.map(shift => (
                  <option key={shift.id} value={shift.id}>{shift.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="facilityType" className={styles.label}>Facility Type</label>
              <select
                id="facilityType"
                value={experiences[currentIndex]?.facilityType || ''}
                onChange={(e) => handleInputChange('facilityType', e.target.value)}
                className={styles.select}
              >
                {FACILITY_TYPES.map(facility => (
                  <option key={facility.id} value={facility.id}>{facility.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date Fields */}
        <div className={styles.dateRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="startDate" className={styles.label}>
              <span className={styles.labelIcon}>📅</span>
              Start Date
            </label>
            <input
              type="text"
              id="startDate"
              value={experiences[currentIndex]?.startDate || ''}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              placeholder="e.g. June 2020"
              className={styles.input}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="endDate" className={styles.label}>
              <span className={styles.labelIcon}>📅</span>
              End Date
            </label>
            <input
              type="text"
              id="endDate"
              value={experiences[currentIndex]?.endDate || ''}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              placeholder="e.g. Present"
              className={styles.input}
            />
          </div>
        </div>

        {/* Quick Tips */}
        <div className={styles.tipsBox}>
          <div className={styles.tipsHeader}>
            <span className={styles.tipsIcon}>💡</span>
            <span className={styles.tipsTitle}>Quick Tips for Nurses</span>
          </div>
          <ul className={styles.tipsList}>
            <li>Start with action verbs (Managed, Coordinated, Assessed)</li>
            <li>Include patient ratios and measurable outcomes</li>
            <li>Highlight certifications, equipment, or processes improved</li>
          </ul>
          <div className={styles.tipsExample}>
            <div className={styles.tipsExampleLabel}>Example:</div>
            <div className={styles.tipsExampleText}>
              "Managed care for 6 ICU patients per shift on a 24-bed unit using Epic documentation"
            </div>
          </div>
        </div>

        {/* Description Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="description" className={styles.label}>
            <span className={styles.labelIcon}>📝</span>
            Responsibilities & Achievements
            <span className={styles.labelHint}>each line = 1 bullet</span>
          </label>
          <textarea
            id="description"
            value={experiences[currentIndex]?.description || ''}
            onChange={(e) => {
              // Auto-strip leading bullet characters (dashes, asterisks, bullets)
              const cleaned = e.target.value.replace(/^[\s]*[-•*–—]\s*/gm, '');
              handleInputChange('description', cleaned);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const textarea = e.target;
                const { selectionStart, selectionEnd } = textarea;
                const val = textarea.value;
                // Insert double newline for visual spacing between bullets
                const newVal = val.substring(0, selectionStart) + '\n\n' + val.substring(selectionEnd);
                const cleaned = newVal.replace(/^[\s]*[-•*–—]\s*/gm, '');
                handleInputChange('description', cleaned);
                // Set cursor after the double newline
                requestAnimationFrame(() => {
                  textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
                });
              }
            }}
            placeholder={"Coordinated care for 6 patients per shift on a 30-bed Med-Surg unit\n\nDocumented assessments and interventions in Epic with 100% compliance\n\nPrecepted 4 new graduate nurses through 12-week orientation program"}
            className={`${styles.textarea} ${(() => {
              const d = experiences[currentIndex]?.description || '';
              return d.split('\n').some(line => line.trim().length > 160) ? styles.textareaWarn : '';
            })()}`}
            rows={8}
          />
          {/* Live bullet feedback — only warnings */}
          {(() => {
            const desc = experiences[currentIndex]?.description || '';
            const bullets = desc.split('\n').filter(line => line.trim().length > 0);
            const bulletCount = bullets.length;
            const longBulletIndices = bullets.reduce((acc, b, i) => {
              if (b.trim().length > 160) acc.push(i + 1);
              return acc;
            }, []);
            const hasWarnings = bulletCount > 8 || longBulletIndices.length > 0;
            if (!hasWarnings) return null;
            return (
              <div className={styles.bulletFeedback}>
                {bulletCount > 8 && (
                  <span className={styles.bulletCountWarn}>
                    {bulletCount} bullets (8 max recommended)
                  </span>
                )}
                {longBulletIndices.length > 0 && (
                  <span className={styles.bulletLengthWarn}>
                    Bullet{longBulletIndices.length > 1 ? 's' : ''} {longBulletIndices.join(', ')} too long (keep under 160 chars)
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Metric Wizard — one question at a time */}
        {showMetricDrawer && (() => {
          const METRIC_STEPS = [
            {
              key: 'patientRatio',
              icon: '👥',
              title: 'What was your patient ratio?',
              options: METRIC_OPTIONS.patientRatio.options,
              customKey: 'patientRatioCustom',
              customPlaceholder: 'e.g. 1:5, varies',
              customMaxLength: 31
            },
            {
              key: 'bedCount',
              icon: '🛏️',
              title: 'How many beds in your unit?',
              options: METRIC_OPTIONS.bedCount.options,
              customKey: 'bedCountCustom',
              customPlaceholder: 'e.g. 35, 60',
              customMaxLength: 31
            },
            {
              key: 'ehrSystem',
              icon: '💻',
              title: 'Which EHR system did you use?',
              options: EHR_SYSTEMS.slice(0, 5).map(ehr => ehr.name),
              customKey: 'ehrSystemCustom',
              customPlaceholder: 'e.g. PointClickCare, HomeCare HomeBase',
              customMaxLength: 31
            },
            {
              key: 'achievement',
              icon: '🏆',
              title: 'Any key achievement to highlight?',
              options: METRIC_OPTIONS.achievement.options.slice(0, 4),
              customKey: 'achievementCustom',
              customPlaceholder: 'e.g. Reduced falls, Implemented new protocol',
              customMaxLength: 500,
              hasMetricInput: true,
              metricPlaceholder: 'by how much? e.g. 20%, 15 per shift'
            }
          ];
          const totalSteps = METRIC_STEPS.length;
          const step = METRIC_STEPS[metricStep];
          const isLastStep = metricStep === totalSteps - 1;
          const skipLabel = experiences[currentIndex]?.description?.trim() ? 'Skip all, just improve' : 'Skip all, just generate';

          return (
            <div ref={metricDrawerRef} className={`${styles.metricDrawer} ${wizardPulse ? styles.metricDrawerPulse : ''}`}>
              {/* Header with progress + skip */}
              <div className={styles.wizardHeader}>
                <div className={styles.wizardProgress}>
                  {METRIC_STEPS.map((s, i) => (
                    <div key={s.key} className={styles.wizardProgressStep}>
                      <div className={`${styles.wizardDot} ${i < metricStep ? styles.wizardDotDone : ''} ${i === metricStep ? styles.wizardDotActive : ''}`}>
                        {i < metricStep ? '✓' : i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div className={`${styles.wizardLine} ${i < metricStep ? styles.wizardLineDone : ''}`} />
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.metricSkip} onClick={() => {
                  setShowMetricDrawer(false);
                  setMetricStep(0);
                  generateDescription();
                }}>
                  {skipLabel}
                </button>
              </div>

              {/* Step Content */}
              <div className={styles.wizardStepContent}>
                <h4 className={styles.wizardStepTitle}>
                  <span>{step.icon}</span> {step.title}
                </h4>

                <div className={styles.metricChips}>
                  {step.options.map(option => (
                    <button key={option}
                      type="button"
                      className={`${styles.metricChip} ${selectedMetrics[step.key] === option ? styles.metricChipSelected : ''}`}
                      onClick={() => {
                        const isDeselecting = selectedMetrics[step.key] === option;
                        setSelectedMetrics(prev => ({
                          ...prev,
                          [step.key]: isDeselecting ? null : option,
                          ...(step.customKey ? { [step.customKey]: '' } : {})
                        }));
                        // Auto-advance on selection (not deselection), except on last step
                        if (!isDeselecting && !isLastStep) {
                          setTimeout(() => setMetricStep(prev => prev + 1), 300);
                        }
                      }}
                    >{option}</button>
                  ))}
                </div>

                {/* "Other" free text input */}
                {step.customKey && (
                  <div className={styles.metricInputWrapper}>
                    <input
                      type="text"
                      className={`${styles.metricInput} ${selectedMetrics[step.customKey]?.length >= step.customMaxLength ? styles.metricInputAtLimit : ''}`}
                      placeholder={step.customPlaceholder}
                      value={selectedMetrics[step.customKey]}
                      maxLength={step.customMaxLength}
                      onChange={(e) => {
                        setSelectedMetrics(prev => ({
                          ...prev,
                          [step.customKey]: e.target.value,
                          [step.key]: e.target.value ? null : prev[step.key]
                        }));
                      }}
                    />
                    {selectedMetrics[step.customKey]?.length >= step.customMaxLength && (
                      <span className={styles.metricCharLimit}>Max reached</span>
                    )}
                  </div>
                )}

                {/* Achievement: "by how much?" input appears when an achievement is selected or typed */}
                {step.hasMetricInput && (selectedMetrics.achievement || selectedMetrics.achievementCustom) && (
                  <div className={styles.metricInputWrapper}>
                    <input
                      type="text"
                      className={`${styles.metricInput} ${selectedMetrics.achievementMetric?.length >= 40 ? styles.metricInputAtLimit : ''}`}
                      placeholder={step.metricPlaceholder}
                      value={selectedMetrics.achievementMetric}
                      maxLength={40}
                      onChange={(e) => setSelectedMetrics(prev => ({
                        ...prev, achievementMetric: e.target.value
                      }))}
                    />
                    {selectedMetrics.achievementMetric?.length >= 40 && (
                      <span className={styles.metricCharLimit}>Max reached</span>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className={styles.wizardNav}>
                <div className={styles.wizardNavButtons}>
                  {metricStep > 0 && (
                    <button type="button" className={styles.wizardBack} onClick={() => setMetricStep(prev => prev - 1)}>
                      ← Back
                    </button>
                  )}

                  {isLastStep ? (
                    <button type="button" className={styles.metricApply} onClick={() => {
                      // Build final metrics — merge custom values
                      const finalMetrics = { ...selectedMetrics };
                      if (finalMetrics.patientRatioCustom) finalMetrics.patientRatio = finalMetrics.patientRatioCustom;
                      if (finalMetrics.bedCountCustom) finalMetrics.bedCount = finalMetrics.bedCountCustom;
                      if (finalMetrics.ehrSystemCustom) finalMetrics.ehrSystem = finalMetrics.ehrSystemCustom;
                      if (finalMetrics.achievementCustom) finalMetrics.achievement = finalMetrics.achievementCustom;
                      setShowMetricDrawer(false);
                      setMetricStep(0);
                      generateDescription(finalMetrics);
                    }} disabled={isGenerating}>
                      Done! Generate Now
                    </button>
                  ) : (
                    <button type="button" className={styles.wizardNext} onClick={() => setMetricStep(prev => prev + 1)}>
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Required Fields Warning — near the button so it's visible */}
        {showRequiredFieldsWarning && (
          <div className={styles.warningBanner}>
            <span className={styles.warningIcon}>⚠️</span>
            <span className={styles.warningText}>
              <strong>Please fill in Job Title, Employer, and Dates of Service</strong> above to generate a description.
            </span>
          </div>
        )}

        {/* Generate Button */}
        <button
          className={`${styles.generateButton} ${isGenerating ? styles.generating : ''} ${showMetricDrawer && !isGenerating ? styles.generateButtonInactive : ''}`}
          onClick={handleGenerateClick}
          disabled={isGenerating}
        >
          <span className={styles.generateButtonIcon}>✨</span>
          {getButtonText()}
        </button>

        {/* Pro Tip */}
        <div className={styles.proTip}>
          <span className={styles.proTipIcon}>💡</span>
          <span className={styles.proTipText}>
            <strong>Pro Tip:</strong> Tap Generate and add your patient ratio, unit size, or key achievements - We will weave them into strong, ATS-friendly bullets.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Experience;
