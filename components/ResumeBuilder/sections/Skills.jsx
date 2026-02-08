/**
 * Skills Section - Healthcare Optimized
 * Tap-to-select soft skills, leadership, and other non-clinical skills
 *
 * Note: Clinical skills and EHR systems are in HealthcareSkills.jsx
 * This section is for soft skills, leadership, and general professional skills
 */

import React, { useState, useEffect } from 'react';
import styles from './Skills.module.css';

// Soft skills highly valued in healthcare
const SOFT_SKILLS = [
  { id: 'communication', name: 'Communication' },
  { id: 'teamwork', name: 'Teamwork' },
  { id: 'critical-thinking', name: 'Critical Thinking' },
  { id: 'time-management', name: 'Time Management' },
  { id: 'adaptability', name: 'Adaptability' },
  { id: 'attention-detail', name: 'Attention to Detail' },
  { id: 'problem-solving', name: 'Problem Solving' },
  { id: 'stress-management', name: 'Stress Management' },
  { id: 'empathy', name: 'Empathy' },
  { id: 'active-listening', name: 'Active Listening' }
];

// Patient-focused skills
const PATIENT_SKILLS = [
  { id: 'patient-advocacy', name: 'Patient Advocacy' },
  { id: 'patient-education', name: 'Patient Education' },
  { id: 'family-communication', name: 'Family Communication' },
  { id: 'cultural-competency', name: 'Cultural Competency' },
  { id: 'compassionate-care', name: 'Compassionate Care' },
  { id: 'patient-safety', name: 'Patient Safety' },
  { id: 'discharge-planning', name: 'Discharge Planning' },
  { id: 'care-coordination', name: 'Care Coordination' }
];

// Leadership & mentoring skills
const LEADERSHIP_SKILLS = [
  { id: 'charge-nurse', name: 'Charge Nurse Experience' },
  { id: 'preceptor', name: 'Preceptor/Mentor' },
  { id: 'team-leadership', name: 'Team Leadership' },
  { id: 'conflict-resolution', name: 'Conflict Resolution' },
  { id: 'delegation', name: 'Delegation' },
  { id: 'staff-training', name: 'Staff Training' },
  { id: 'quality-improvement', name: 'Quality Improvement' },
  { id: 'policy-development', name: 'Policy Development' }
];

// Technical/administrative skills
const TECHNICAL_SKILLS = [
  { id: 'documentation', name: 'Clinical Documentation' },
  { id: 'hipaa', name: 'HIPAA Compliance' },
  { id: 'infection-control', name: 'Infection Control' },
  { id: 'inventory-management', name: 'Supply/Inventory Management' },
  { id: 'scheduling', name: 'Staff Scheduling' },
  { id: 'microsoft-office', name: 'Microsoft Office' },
  { id: 'telehealth', name: 'Telehealth/Virtual Care' },
  { id: 'data-entry', name: 'Data Entry' }
];

const Skills = ({ data, updateData }) => {
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('soft');

  // Sync with parent data
  useEffect(() => {
    if (data && Array.isArray(data)) {
      // Convert string array to our format if needed
      const formatted = data.map(skill => {
        if (typeof skill === 'string') {
          // Check if it matches a pre-defined skill
          const allSkills = [...SOFT_SKILLS, ...PATIENT_SKILLS, ...LEADERSHIP_SKILLS, ...TECHNICAL_SKILLS];
          const found = allSkills.find(s => s.name === skill);
          return found ? { id: found.id, name: skill } : { id: `custom-${skill}`, name: skill };
        }
        return skill;
      });
      setSelectedSkills(formatted);
    }
  }, [data]);

  const updateAndSave = (newSkills) => {
    setSelectedSkills(newSkills);
    // Save as string array for compatibility
    updateData(newSkills.map(s => s.name));
  };

  // Toggle skill selection
  const toggleSkill = (skillId, skillName) => {
    const existing = selectedSkills.find(s => s.id === skillId);
    if (existing) {
      updateAndSave(selectedSkills.filter(s => s.id !== skillId));
    } else {
      updateAndSave([...selectedSkills, { id: skillId, name: skillName }]);
    }
  };

  // Add custom skill
  const addCustomSkill = () => {
    if (!customSkill.trim()) return;
    const skillName = customSkill.trim();
    // Check for duplicates
    if (selectedSkills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) {
      setCustomSkill('');
      return;
    }
    updateAndSave([...selectedSkills, { id: `custom-${Date.now()}`, name: skillName }]);
    setCustomSkill('');
  };

  // Remove skill
  const removeSkill = (skillId) => {
    updateAndSave(selectedSkills.filter(s => s.id !== skillId));
  };

  // Check if skill is selected
  const isSelected = (skillId) => selectedSkills.some(s => s.id === skillId);

  // Render skill buttons for a category
  const renderSkillButtons = (skillList) => (
    <div className={styles.skillGrid}>
      {skillList.map(skill => (
        <button
          key={skill.id}
          className={`${styles.skillBtn} ${isSelected(skill.id) ? styles.skillBtnSelected : ''}`}
          onClick={() => toggleSkill(skill.id, skill.name)}
        >
          {skill.name}
          {isSelected(skill.id) && <span className={styles.checkmark}>✓</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>💼</span>
          Other Skills
        </h2>
        {selectedSkills.length > 0 && (
          <span className={styles.badge}>{selectedSkills.length} selected</span>
        )}
      </div>

      <p className={styles.description}>
        Tap to add soft skills, leadership abilities, and professional competencies.
        Clinical skills are in the Clinical Skills section above.
      </p>

      {/* Selected Skills Display */}
      {selectedSkills.length > 0 && (
        <div className={styles.selectedSkills}>
          {selectedSkills.map(skill => (
            <span key={skill.id} className={styles.selectedTag}>
              {skill.name}
              <button
                className={styles.tagRemove}
                onClick={() => removeSkill(skill.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Soft Skills Category */}
      <div className={styles.category}>
        <button
          className={styles.categoryHeader}
          onClick={() => setExpandedCategory(expandedCategory === 'soft' ? '' : 'soft')}
        >
          <div className={styles.categoryLeft}>
            <span className={styles.categoryIcon}>💬</span>
            <span className={styles.categoryTitle}>Soft Skills</span>
            <span className={styles.categoryHint}>Most important for nurses</span>
          </div>
          <span className={styles.categoryArrow}>
            {expandedCategory === 'soft' ? '▼' : '▶'}
          </span>
        </button>
        {expandedCategory === 'soft' && (
          <div className={styles.categoryContent}>
            {renderSkillButtons(SOFT_SKILLS)}
          </div>
        )}
      </div>

      {/* Patient Care Category */}
      <div className={styles.category}>
        <button
          className={styles.categoryHeader}
          onClick={() => setExpandedCategory(expandedCategory === 'patient' ? '' : 'patient')}
        >
          <div className={styles.categoryLeft}>
            <span className={styles.categoryIcon}>❤️</span>
            <span className={styles.categoryTitle}>Patient Care</span>
          </div>
          <span className={styles.categoryArrow}>
            {expandedCategory === 'patient' ? '▼' : '▶'}
          </span>
        </button>
        {expandedCategory === 'patient' && (
          <div className={styles.categoryContent}>
            {renderSkillButtons(PATIENT_SKILLS)}
          </div>
        )}
      </div>

      {/* Leadership Category */}
      <div className={styles.category}>
        <button
          className={styles.categoryHeader}
          onClick={() => setExpandedCategory(expandedCategory === 'leadership' ? '' : 'leadership')}
        >
          <div className={styles.categoryLeft}>
            <span className={styles.categoryIcon}>👑</span>
            <span className={styles.categoryTitle}>Leadership & Mentoring</span>
          </div>
          <span className={styles.categoryArrow}>
            {expandedCategory === 'leadership' ? '▼' : '▶'}
          </span>
        </button>
        {expandedCategory === 'leadership' && (
          <div className={styles.categoryContent}>
            {renderSkillButtons(LEADERSHIP_SKILLS)}
          </div>
        )}
      </div>

      {/* Technical Category */}
      <div className={styles.category}>
        <button
          className={styles.categoryHeader}
          onClick={() => setExpandedCategory(expandedCategory === 'technical' ? '' : 'technical')}
        >
          <div className={styles.categoryLeft}>
            <span className={styles.categoryIcon}>💻</span>
            <span className={styles.categoryTitle}>Technical & Administrative</span>
          </div>
          <span className={styles.categoryArrow}>
            {expandedCategory === 'technical' ? '▼' : '▶'}
          </span>
        </button>
        {expandedCategory === 'technical' && (
          <div className={styles.categoryContent}>
            {renderSkillButtons(TECHNICAL_SKILLS)}
          </div>
        )}
      </div>

      {/* Custom Skill Input */}
      <div className={styles.customSection}>
        <span className={styles.customLabel}>Add other skill:</span>
        <div className={styles.customInput}>
          <input
            type="text"
            placeholder="Type a skill..."
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
            className={styles.input}
          />
          <button
            onClick={addCustomSkill}
            disabled={!customSkill.trim()}
            className={styles.addBtn}
          >
            Add
          </button>
        </div>
      </div>

      {/* Tip */}
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> Soft skills like Communication and Critical Thinking are highly valued by nurse recruiters. Select 5-8 that best represent you.
        </span>
      </div>
    </div>
  );
};

export default Skills;
