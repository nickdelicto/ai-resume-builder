/**
 * Healthcare Skills Section
 * Specialty-based clinical skills picker with EHR systems
 *
 * Target user: Tired nurse who wants to quickly select their skills
 * Design principle: "Tap, don't type" - select from pre-populated lists
 * Mobile-first, large touch targets, clear visual hierarchy
 */

import React, { useState, useEffect, useMemo } from 'react';
import styles from './HealthcareSkills.module.css';
import { useResumeContext } from '../ResumeContext';
import {
  EHR_SYSTEMS,
  NURSING_SPECIALTIES,
  SKILLS_BY_SPECIALTY,
  getSuggestedSkills
} from '../../../lib/constants/healthcareData';

const MAX_SKILLS = 15;

const HealthcareSkills = ({ data, updateData, experienceData, certifications, onNavigateToSection }) => {
  const [skills, setSkills] = useState({
    ehrSystems: [],
    clinicalSkills: [],
    specialty: '',
    customSkills: []
  });
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [ehrExpanded, setEhrExpanded] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showPrereqWarning, setShowPrereqWarning] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Access license data via resume context (same pattern as Summary.jsx)
  const resumeContext = useResumeContext();
  const licenseData = resumeContext?.resumeData?.licenses || [];

  // Prereq checks
  const hasFullExperience = experienceData && experienceData.length > 0 &&
    experienceData.some(exp => exp.title && exp.company && exp.description && exp.description.trim().length > 0);
  const hasLicense = licenseData.length > 0 &&
    licenseData.some(lic => lic.state);

  // Navigation helper (same pattern as Summary.jsx)
  const navigateToSection = (e, sectionId) => {
    e.preventDefault();
    if (onNavigateToSection) {
      onNavigateToSection(sectionId);
    }
  };

  // Dismiss tooltip on outside click
  useEffect(() => {
    if (activeTooltip) {
      const dismiss = () => setActiveTooltip(null);
      document.addEventListener('click', dismiss);
      return () => document.removeEventListener('click', dismiss);
    }
  }, [activeTooltip]);

  // Sync with parent data
  useEffect(() => {
    if (data) {
      setSkills({
        ehrSystems: data.ehrSystems || [],
        clinicalSkills: data.clinicalSkills || [],
        specialty: data.specialty || '',
        customSkills: data.customSkills || []
      });
    }
  }, [data]);

  // Update parent when skills change
  const updateSkills = (newSkills) => {
    setSkills(newSkills);
    updateData(newSkills);
  };

  // Build reverse map: skill → which specialties include it
  const skillSpecialtyMap = useMemo(() => {
    const map = {};
    Object.entries(SKILLS_BY_SPECIALTY).forEach(([specId, specSkills]) => {
      if (specId === 'core') return;
      const specName = NURSING_SPECIALTIES.find(s => s.id === specId)?.name;
      if (!specName) return;
      specSkills.forEach(skill => {
        if (!map[skill]) map[skill] = [];
        map[skill].push({ id: specId, name: specName });
      });
    });
    return map;
  }, []);

  // Toggle EHR system
  const toggleEhr = (ehrId) => {
    const ehrSystems = skills.ehrSystems.includes(ehrId)
      ? skills.ehrSystems.filter(id => id !== ehrId)
      : [...skills.ehrSystems, ehrId];
    updateSkills({ ...skills, ehrSystems });
  };

  // Toggle clinical skill
  const toggleClinicalSkill = (skill) => {
    const clinicalSkills = skills.clinicalSkills.includes(skill)
      ? skills.clinicalSkills.filter(s => s !== skill)
      : [...skills.clinicalSkills, skill];
    updateSkills({ ...skills, clinicalSkills });
  };

  // Update specialty — just switch displayed skills, keep existing selections
  const updateSpecialty = (specialtyId) => {
    updateSkills({ ...skills, specialty: specialtyId });
  };

  // Add custom skill
  const addCustomSkill = () => {
    if (!customSkillInput.trim()) return;
    const newSkill = customSkillInput.trim();
    if (!skills.customSkills.includes(newSkill) && !skills.clinicalSkills.includes(newSkill)) {
      updateSkills({
        ...skills,
        customSkills: [...skills.customSkills, newSkill]
      });
    }
    setCustomSkillInput('');
  };

  // Remove custom skill
  const removeCustomSkill = (skill) => {
    updateSkills({
      ...skills,
      customSkills: skills.customSkills.filter(s => s !== skill)
    });
  };

  // Handle AI suggest button click with prereq checks
  const handleSuggestClick = () => {
    setShowPrereqWarning(false);

    // Check prereqs: need at least 1 full experience AND 1 license
    if (!hasFullExperience || !hasLicense) {
      setShowPrereqWarning(true);
      setTimeout(() => setShowPrereqWarning(false), 12000);
      return;
    }

    // If max skills reached, don't suggest (button text already communicates this)
    if (totalCount >= MAX_SKILLS) return;

    suggestSkills();
  };

  // AI Suggest Skills
  const suggestSkills = async () => {
    if (aiSuggesting) return;

    setAiSuggesting(true);
    setAiSuggestions([]);

    try {
      const allExistingSkills = [
        ...skills.clinicalSkills,
        ...skills.customSkills,
        ...skills.ehrSystems.map(id => EHR_SYSTEMS.find(e => e.id === id)?.name).filter(Boolean)
      ];

      const remaining = MAX_SKILLS - (skills.clinicalSkills.length + skills.customSkills.length);
      const suggestCount = Math.max(3, Math.min(8, remaining));

      const response = await fetch('/api/generate-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingSkills: allExistingSkills,
          experience: experienceData.map(exp => ({
            title: exp.title || '',
            company: exp.company || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            description: exp.description || '',
          })),
          count: suggestCount,
          specialty: skills.specialty || undefined,
          certifications: certifications || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSuggestions = (data.skills || []).filter(
          s => !allExistingSkills.includes(s)
        );
        setAiSuggestions(newSuggestions);
      }
    } catch (err) {
      console.error('Error suggesting skills:', err);
    } finally {
      setAiSuggesting(false);
    }
  };

  // Accept an AI suggestion
  const acceptSuggestion = (skill) => {
    if (!skills.clinicalSkills.includes(skill) && !skills.customSkills.includes(skill)) {
      updateSkills({
        ...skills,
        clinicalSkills: [...skills.clinicalSkills, skill]
      });
    }
    setAiSuggestions(prev => prev.filter(s => s !== skill));
  };

  // Dismiss a suggestion
  const dismissSuggestion = (skill) => {
    setAiSuggestions(prev => prev.filter(s => s !== skill));
  };

  // Get skills to display based on specialty + any accepted AI skills not in the list
  const displaySkills = useMemo(() => {
    const baseSkills = !skills.specialty
      ? (SKILLS_BY_SPECIALTY['core'] || [])
      : getSuggestedSkills(skills.specialty);
    // Append any clinicalSkills the user selected that aren't in the predefined list
    // (e.g., AI-suggested skills for a different specialty)
    const extra = skills.clinicalSkills.filter(s => !baseSkills.includes(s));
    return extra.length > 0 ? [...baseSkills, ...extra] : baseSkills;
  }, [skills.specialty, skills.clinicalSkills]);

  // Total skills count
  const totalCount = skills.ehrSystems.length + skills.clinicalSkills.length + skills.customSkills.length;
  const allClinicalSkills = [...skills.clinicalSkills, ...skills.customSkills];

  // Get other specialty names for a skill (excluding current specialty)
  const getOtherSpecialties = (skill) => {
    const specs = skillSpecialtyMap[skill];
    if (!specs || specs.length <= 1) return null;
    const others = specs.filter(s => s.id !== skills.specialty).map(s => s.name);
    return others.length > 0 ? others.slice(0, 2) : null;
  };

  // AI suggest button text
  const getSuggestButtonContent = () => {
    if (aiSuggesting) {
      return (
        <>
          <span className={styles.aiSpinner} />
          Analyzing your experience...
        </>
      );
    }
    if (totalCount >= MAX_SKILLS) {
      return (
        <>
          <span className={styles.aiIcon}>✨</span>
          Maximum of {MAX_SKILLS} skills reached
        </>
      );
    }
    return (
      <>
        <span className={styles.aiIcon}>✨</span>
        Suggest Skills Based on My Experience
      </>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>🩺</span>
          Clinical Skills
        </h2>
        {totalCount > 0 && (
          <span className={styles.badge}>{totalCount} selected</span>
        )}
      </div>

      <p className={styles.description}>
        Select your EHR systems and clinical skills. We'll suggest skills based on your specialty.
      </p>

      {/* Max Skills Warning */}
      {totalCount >= MAX_SKILLS && (
        <div className={styles.maxWarning}>
          <span>⚠️</span>
          <span>Most recruiters recommend <strong>10–15 skills</strong>, but you have {totalCount}. Keep only the most relevant.</span>
        </div>
      )}

      {/* Specialty Selector */}
      <div className={styles.specialtySelector}>
        <label className={styles.selectorLabel}>Your Primary Specialty:</label>
        <select
          className={styles.specialtyDropdown}
          value={skills.specialty}
          onChange={(e) => updateSpecialty(e.target.value)}
        >
          <option value="">Select specialty...</option>
          {NURSING_SPECIALTIES.map(spec => (
            <option key={spec.id} value={spec.id}>{spec.name}</option>
          ))}
        </select>
      </div>

      {/* EHR Systems — Collapsible */}
      <div className={styles.skillGroup}>
        <button
          type="button"
          className={styles.ehrToggle}
          onClick={() => setEhrExpanded(!ehrExpanded)}
        >
          <div className={styles.ehrToggleLeft}>
            <span className={styles.ehrToggleTitle}>EHR/EMR Systems</span>
            <span className={styles.groupHint}>{skills.ehrSystems.length} selected</span>
          </div>
          <span className={`${styles.ehrToggleArrow} ${ehrExpanded ? styles.ehrToggleArrowOpen : ''}`}>▾</span>
        </button>

        {/* Selected EHR Chips (shown when collapsed) */}
        {skills.ehrSystems.length > 0 && !ehrExpanded && (
          <div className={styles.ehrChips}>
            {skills.ehrSystems.map(id => {
              const ehr = EHR_SYSTEMS.find(e => e.id === id);
              return (
                <span key={id} className={styles.ehrChip}>
                  {ehr?.name || id}
                  <button
                    className={styles.ehrChipRemove}
                    onClick={(e) => { e.stopPropagation(); toggleEhr(id); }}
                    aria-label={`Remove ${ehr?.name || id}`}
                  >×</button>
                </span>
              );
            })}
          </div>
        )}

        {/* EHR Checklist (expanded) */}
        {ehrExpanded && (
          <div className={styles.ehrChecklist}>
            {EHR_SYSTEMS.map(ehr => {
              const isSelected = skills.ehrSystems.includes(ehr.id);
              return (
                <label key={ehr.id} className={`${styles.ehrChecklistItem} ${isSelected ? styles.ehrChecklistItemSelected : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleEhr(ehr.id)}
                    className={styles.ehrChecklistCheckbox}
                  />
                  <div className={styles.ehrChecklistInfo}>
                    <span className={styles.ehrChecklistName}>{ehr.name}</span>
                    <span className={styles.ehrChecklistDesc}>{ehr.description}</span>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Clinical Skills */}
      <div className={styles.skillGroup}>
        <h3 className={styles.groupTitle}>
          Clinical Skills
          {skills.specialty && (
            <span className={styles.groupHint}>
              Common for {NURSING_SPECIALTIES.find(s => s.id === skills.specialty)?.name}
            </span>
          )}
        </h3>

        {!skills.specialty && (
          <div className={styles.selectSpecialtyHint}>
            <span>👆</span> Select your specialty above to see relevant skills
          </div>
        )}

        <div className={styles.skillsGrid}>
          {displaySkills.map((skill, index) => {
            const isSelected = skills.clinicalSkills.includes(skill);
            const otherSpecs = getOtherSpecialties(skill);
            const tooltipKey = `${skill}-${index}`;
            return (
              <label
                key={tooltipKey}
                className={`${styles.skillItem} ${isSelected ? styles.skillItemSelected : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleClinicalSkill(skill)}
                  className={styles.skillCheckbox}
                />
                <span className={styles.skillName}>
                  {skill}
                  {otherSpecs && (
                    <span
                      className={styles.tooltipTrigger}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTooltip(prev => prev === tooltipKey ? null : tooltipKey);
                      }}
                      onMouseEnter={() => setActiveTooltip(tooltipKey)}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <span className={styles.tooltipIcon}>ⓘ</span>
                      {activeTooltip === tooltipKey && (
                        <span className={styles.tooltipContent}>
                          Also: {otherSpecs.join(', ')}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Custom Skill Input (inline, no separate "Additional Skills" header) */}
      <div className={styles.customSkillSection}>
        {skills.customSkills.length > 0 && (
          <div className={styles.customSkillsList}>
            {skills.customSkills.map(skill => (
              <span key={skill} className={styles.customSkillTag}>
                {skill}
                <button
                  className={styles.removeSkillButton}
                  onClick={() => removeCustomSkill(skill)}
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.customSkillInput}>
          <input
            type="text"
            placeholder="Add a skill not listed above..."
            value={customSkillInput}
            onChange={(e) => setCustomSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
            className={styles.input}
          />
          <button
            className={styles.addButton}
            onClick={addCustomSkill}
            disabled={!customSkillInput.trim()}
          >
            Add
          </button>
        </div>
      </div>

      {/* AI Skill Suggestions — always visible */}
      {aiSuggestions.length === 0 && (
        <>
          <button
            type="button"
            className={`${styles.aiSuggestButton} ${totalCount >= MAX_SKILLS ? styles.aiSuggestButtonMaxed : ''}`}
            onClick={handleSuggestClick}
            disabled={aiSuggesting || totalCount >= MAX_SKILLS}
          >
            {getSuggestButtonContent()}
          </button>

          {/* Prerequisite Warning */}
          {showPrereqWarning && (
            <div className={styles.prereqWarning}>
              <span className={styles.prereqIcon}>⚠️</span>
              <span className={styles.prereqText}>
                <strong>Fill in earlier sections first!</strong> We need your{' '}
                {!hasFullExperience && (
                  <a href="#" className={styles.sectionLink} onClick={(e) => navigateToSection(e, 'experience')}>experience</a>
                )}
                {!hasFullExperience && !hasLicense && ' and '}
                {!hasLicense && (
                  <a href="#" className={styles.sectionLink} onClick={(e) => navigateToSection(e, 'licenses')}>licenses</a>
                )}
                {' '}to suggest relevant skills.
                {!hasFullExperience && ' Add at least one position with a description.'}
                {hasFullExperience && !hasLicense && ' Add at least one license with a state selected.'}
              </span>
            </div>
          )}
        </>
      )}

      {/* AI Suggestions Results */}
      {aiSuggestions.length > 0 && (
        <div className={styles.aiSuggestionsPanel}>
          <div className={styles.aiSuggestionsHeader}>
            <span className={styles.aiIcon}>✨</span>
            <span>Suggested for you — tap to add</span>
          </div>
          <div className={styles.aiSuggestionsList}>
            {aiSuggestions.map(skill => (
              <div key={skill} className={styles.aiSuggestionItem}>
                <button
                  className={styles.aiSuggestionAdd}
                  onClick={() => acceptSuggestion(skill)}
                >
                  + {skill}
                </button>
                <button
                  className={styles.aiSuggestionDismiss}
                  onClick={() => dismissSuggestion(skill)}
                  aria-label={`Dismiss ${skill}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Skills Summary */}
      {totalCount > 0 && (
        <div className={styles.summary}>
          <h4 className={styles.summaryTitle}>
            {totalCount} Skills {totalCount > MAX_SKILLS ? ' (max recommended is 15!)' : ''}
          </h4>
          <div className={styles.summaryContent}>
            {skills.ehrSystems.length > 0 && (
              <div className={styles.summarySection}>
                <span className={styles.summaryLabel}>EHR:</span>
                <span className={styles.summaryValue}>
                  {skills.ehrSystems.map(id => EHR_SYSTEMS.find(e => e.id === id)?.name).join(', ')}
                </span>
              </div>
            )}
            {allClinicalSkills.length > 0 && (
              <div className={styles.summarySection}>
                <span className={styles.summaryLabel}>Clinical:</span>
                <span className={styles.summaryValue}>
                  {allClinicalSkills.slice(0, 5).join(', ')}
                  {allClinicalSkills.length > 5 && ` +${allClinicalSkills.length - 5} more`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pro Tip */}
      <div className={styles.proTip}>
        <span className={styles.proTipIcon}>💡</span>
        <span className={styles.proTipText}>
          <strong>Pro Tip:</strong> List EHR systems first - 98% of hospitals use electronic records.
          Epic and Cerner are the most common.
        </span>
      </div>
    </div>
  );
};

export default HealthcareSkills;
