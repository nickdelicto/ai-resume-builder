/**
 * Additional Info Section - Healthcare Optimized
 * Simple, tap-to-select design for busy nurses
 *
 * Design: No tabs, just clean collapsible cards with pre-populated options
 */

import React, { useState, useEffect } from 'react';
import styles from './AdditionalInfo.module.css';

// Common languages in healthcare settings
const COMMON_LANGUAGES = [
  { id: 'spanish', name: 'Spanish' },
  { id: 'tagalog', name: 'Tagalog' },
  { id: 'mandarin', name: 'Mandarin' },
  { id: 'cantonese', name: 'Cantonese' },
  { id: 'vietnamese', name: 'Vietnamese' },
  { id: 'korean', name: 'Korean' },
  { id: 'arabic', name: 'Arabic' },
  { id: 'russian', name: 'Russian' },
  { id: 'haitian-creole', name: 'Haitian Creole' },
  { id: 'portuguese', name: 'Portuguese' },
  { id: 'french', name: 'French' },
  { id: 'hindi', name: 'Hindi' },
  { id: 'polish', name: 'Polish' },
  { id: 'asl', name: 'American Sign Language (ASL)' }
];

const PROFICIENCY_LEVELS = [
  { id: 'native', label: 'Native', description: 'First language' },
  { id: 'fluent', label: 'Fluent', description: 'Near-native proficiency' },
  { id: 'proficient', label: 'Proficient', description: 'Can discuss medical topics' },
  { id: 'conversational', label: 'Conversational', description: 'Basic patient communication' }
];

// Common nursing professional organizations
const NURSING_ORGANIZATIONS = [
  { id: 'ana', name: 'American Nurses Association (ANA)' },
  { id: 'aacn', name: 'AACN - Critical Care Nurses' },
  { id: 'aorn', name: 'AORN - Perioperative Nurses' },
  { id: 'ena', name: 'ENA - Emergency Nurses' },
  { id: 'oncology', name: 'ONS - Oncology Nursing Society' },
  { id: 'aann', name: 'AANN - Neuroscience Nurses' },
  { id: 'awhonn', name: 'AWHONN - Women\'s Health/OB Nurses' },
  { id: 'apna', name: 'APNA - Psychiatric Nurses' },
  { id: 'sigma', name: 'Sigma Theta Tau International' }
];

// Common nursing awards
const COMMON_AWARDS = [
  { id: 'daisy', name: 'DAISY Award' },
  { id: 'employee-month', name: 'Employee of the Month' },
  { id: 'excellence', name: 'Nursing Excellence Award' },
  { id: 'preceptor', name: 'Preceptor of the Year' },
  { id: 'patient-satisfaction', name: 'Patient Satisfaction Award' },
  { id: 'safety', name: 'Patient Safety Award' }
];

const AdditionalInfo = ({ data, updateData }) => {
  const [additionalData, setAdditionalData] = useState({
    languages: [],
    memberships: [],
    awards: [],
    volunteer: [],
    references: 'none', // 'none', 'available', 'listed'
    ...data
  });

  // For custom inputs
  const [customLanguage, setCustomLanguage] = useState('');
  const [customMembership, setCustomMembership] = useState('');
  const [customAward, setCustomAward] = useState('');
  const [volunteerEntry, setVolunteerEntry] = useState({ org: '', role: '' });

  // Expanded sections
  const [expandedSection, setExpandedSection] = useState('languages');

  useEffect(() => {
    if (data) {
      setAdditionalData({
        languages: data.languages || [],
        memberships: data.memberships || [],
        awards: data.awards || [],
        volunteer: data.volunteer || [],
        references: data.references || 'none'
      });
    }
  }, [data]);

  const updateAndSave = (newData) => {
    setAdditionalData(newData);
    updateData(newData);
  };

  // Language handlers
  const toggleLanguage = (langId, proficiency = 'conversational') => {
    const existing = additionalData.languages.find(l => l.id === langId);
    if (existing) {
      // Remove it
      updateAndSave({
        ...additionalData,
        languages: additionalData.languages.filter(l => l.id !== langId)
      });
    } else {
      // Add it
      const langData = COMMON_LANGUAGES.find(l => l.id === langId);
      updateAndSave({
        ...additionalData,
        languages: [...additionalData.languages, {
          id: langId,
          language: langData?.name || langId,
          proficiency
        }]
      });
    }
  };

  const updateLanguageProficiency = (langId, proficiency) => {
    updateAndSave({
      ...additionalData,
      languages: additionalData.languages.map(l =>
        l.id === langId ? { ...l, proficiency } : l
      )
    });
  };

  const addCustomLanguage = () => {
    if (!customLanguage.trim()) return;
    const id = `custom-${Date.now()}`;
    updateAndSave({
      ...additionalData,
      languages: [...additionalData.languages, {
        id,
        language: customLanguage.trim(),
        proficiency: 'conversational'
      }]
    });
    setCustomLanguage('');
  };

  // Membership handlers
  const toggleMembership = (orgId) => {
    const existing = additionalData.memberships.find(m => m.id === orgId);
    if (existing) {
      updateAndSave({
        ...additionalData,
        memberships: additionalData.memberships.filter(m => m.id !== orgId)
      });
    } else {
      const orgData = NURSING_ORGANIZATIONS.find(o => o.id === orgId);
      updateAndSave({
        ...additionalData,
        memberships: [...additionalData.memberships, {
          id: orgId,
          name: orgData?.name || orgId
        }]
      });
    }
  };

  const addCustomMembership = () => {
    if (!customMembership.trim()) return;
    updateAndSave({
      ...additionalData,
      memberships: [...additionalData.memberships, {
        id: `custom-${Date.now()}`,
        name: customMembership.trim()
      }]
    });
    setCustomMembership('');
  };

  // Award handlers
  const toggleAward = (awardId) => {
    const existing = additionalData.awards.find(a => a.id === awardId);
    if (existing) {
      updateAndSave({
        ...additionalData,
        awards: additionalData.awards.filter(a => a.id !== awardId)
      });
    } else {
      const awardData = COMMON_AWARDS.find(a => a.id === awardId);
      updateAndSave({
        ...additionalData,
        awards: [...additionalData.awards, {
          id: awardId,
          name: awardData?.name || awardId
        }]
      });
    }
  };

  const addCustomAward = () => {
    if (!customAward.trim()) return;
    updateAndSave({
      ...additionalData,
      awards: [...additionalData.awards, {
        id: `custom-${Date.now()}`,
        name: customAward.trim()
      }]
    });
    setCustomAward('');
  };

  // Volunteer handlers
  const addVolunteer = () => {
    if (!volunteerEntry.org.trim()) return;
    updateAndSave({
      ...additionalData,
      volunteer: [...additionalData.volunteer, {
        id: `vol-${Date.now()}`,
        organization: volunteerEntry.org.trim(),
        role: volunteerEntry.role.trim()
      }]
    });
    setVolunteerEntry({ org: '', role: '' });
  };

  const removeVolunteer = (volId) => {
    updateAndSave({
      ...additionalData,
      volunteer: additionalData.volunteer.filter(v => v.id !== volId)
    });
  };

  // Reference handler
  const setReferences = (value) => {
    updateAndSave({ ...additionalData, references: value });
  };

  // Count total items
  const totalItems =
    additionalData.languages.length +
    additionalData.memberships.length +
    additionalData.awards.length +
    additionalData.volunteer.length +
    (additionalData.references !== 'none' ? 1 : 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>📋</span>
          Additional Info
        </h2>
        {totalItems > 0 && (
          <span className={styles.badge}>{totalItems} added</span>
        )}
      </div>

      <p className={styles.description}>
        Quick-add languages, memberships, awards, and more. All optional!
      </p>

      {/* Languages Section */}
      <div className={styles.card}>
        <button
          className={styles.cardHeader}
          onClick={() => setExpandedSection(expandedSection === 'languages' ? '' : 'languages')}
        >
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardIcon}>🌍</span>
            <span className={styles.cardTitle}>Languages</span>
            {additionalData.languages.length > 0 && (
              <span className={styles.cardCount}>{additionalData.languages.length}</span>
            )}
          </div>
          <span className={styles.cardArrow}>
            {expandedSection === 'languages' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'languages' && (
          <div className={styles.cardContent}>
            <p className={styles.hint}>
              Bilingual nurses are in high demand! Tap to add languages you speak.
            </p>

            {/* Selected languages with proficiency */}
            {additionalData.languages.length > 0 && (
              <div className={styles.selectedItems}>
                {additionalData.languages.map(lang => (
                  <div key={lang.id} className={styles.selectedLanguage}>
                    <div className={styles.langInfo}>
                      <span className={styles.langName}>{lang.language}</span>
                      <select
                        value={lang.proficiency}
                        onChange={(e) => updateLanguageProficiency(lang.id, e.target.value)}
                        className={styles.proficiencySelect}
                      >
                        {PROFICIENCY_LEVELS.map(level => (
                          <option key={level.id} value={level.id}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => toggleLanguage(lang.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Language buttons */}
            <div className={styles.optionsGrid}>
              {COMMON_LANGUAGES.map(lang => {
                const isSelected = additionalData.languages.some(l => l.id === lang.id);
                return (
                  <button
                    key={lang.id}
                    className={`${styles.optionBtn} ${isSelected ? styles.optionBtnSelected : ''}`}
                    onClick={() => toggleLanguage(lang.id)}
                  >
                    {lang.name}
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Custom language input */}
            <div className={styles.customInput}>
              <input
                type="text"
                placeholder="Other language..."
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomLanguage()}
                className={styles.input}
              />
              <button
                onClick={addCustomLanguage}
                disabled={!customLanguage.trim()}
                className={styles.addBtn}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Professional Memberships Section */}
      <div className={styles.card}>
        <button
          className={styles.cardHeader}
          onClick={() => setExpandedSection(expandedSection === 'memberships' ? '' : 'memberships')}
        >
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardIcon}>🏥</span>
            <span className={styles.cardTitle}>Professional Memberships</span>
            {additionalData.memberships.length > 0 && (
              <span className={styles.cardCount}>{additionalData.memberships.length}</span>
            )}
          </div>
          <span className={styles.cardArrow}>
            {expandedSection === 'memberships' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'memberships' && (
          <div className={styles.cardContent}>
            <p className={styles.hint}>
              Professional memberships show dedication to your specialty.
            </p>

            {/* Selected memberships */}
            {additionalData.memberships.length > 0 && (
              <div className={styles.selectedTags}>
                {additionalData.memberships.map(mem => (
                  <span key={mem.id} className={styles.selectedTag}>
                    {mem.name}
                    <button
                      className={styles.tagRemove}
                      onClick={() => toggleMembership(mem.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Membership buttons */}
            <div className={styles.optionsGrid}>
              {NURSING_ORGANIZATIONS.map(org => {
                const isSelected = additionalData.memberships.some(m => m.id === org.id);
                return (
                  <button
                    key={org.id}
                    className={`${styles.optionBtn} ${isSelected ? styles.optionBtnSelected : ''}`}
                    onClick={() => toggleMembership(org.id)}
                  >
                    {org.name}
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Custom membership input */}
            <div className={styles.customInput}>
              <input
                type="text"
                placeholder="Other organization..."
                value={customMembership}
                onChange={(e) => setCustomMembership(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomMembership()}
                className={styles.input}
              />
              <button
                onClick={addCustomMembership}
                disabled={!customMembership.trim()}
                className={styles.addBtn}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Awards Section */}
      <div className={styles.card}>
        <button
          className={styles.cardHeader}
          onClick={() => setExpandedSection(expandedSection === 'awards' ? '' : 'awards')}
        >
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardIcon}>🏆</span>
            <span className={styles.cardTitle}>Awards & Recognition</span>
            {additionalData.awards.length > 0 && (
              <span className={styles.cardCount}>{additionalData.awards.length}</span>
            )}
          </div>
          <span className={styles.cardArrow}>
            {expandedSection === 'awards' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'awards' && (
          <div className={styles.cardContent}>
            <p className={styles.hint}>
              Received any awards? They make your resume stand out!
            </p>

            {/* Selected awards */}
            {additionalData.awards.length > 0 && (
              <div className={styles.selectedTags}>
                {additionalData.awards.map(award => (
                  <span key={award.id} className={styles.selectedTag}>
                    {award.name}
                    <button
                      className={styles.tagRemove}
                      onClick={() => toggleAward(award.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Award buttons */}
            <div className={styles.optionsGrid}>
              {COMMON_AWARDS.map(award => {
                const isSelected = additionalData.awards.some(a => a.id === award.id);
                return (
                  <button
                    key={award.id}
                    className={`${styles.optionBtn} ${isSelected ? styles.optionBtnSelected : ''}`}
                    onClick={() => toggleAward(award.id)}
                  >
                    {award.name}
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Custom award input */}
            <div className={styles.customInput}>
              <input
                type="text"
                placeholder="Other award..."
                value={customAward}
                onChange={(e) => setCustomAward(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomAward()}
                className={styles.input}
              />
              <button
                onClick={addCustomAward}
                disabled={!customAward.trim()}
                className={styles.addBtn}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Volunteer Section */}
      <div className={styles.card}>
        <button
          className={styles.cardHeader}
          onClick={() => setExpandedSection(expandedSection === 'volunteer' ? '' : 'volunteer')}
        >
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardIcon}>❤️</span>
            <span className={styles.cardTitle}>Volunteer Experience</span>
            {additionalData.volunteer.length > 0 && (
              <span className={styles.cardCount}>{additionalData.volunteer.length}</span>
            )}
          </div>
          <span className={styles.cardArrow}>
            {expandedSection === 'volunteer' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'volunteer' && (
          <div className={styles.cardContent}>
            <p className={styles.hint}>
              Community involvement shows character and commitment.
            </p>

            {/* Volunteer entries */}
            {additionalData.volunteer.length > 0 && (
              <div className={styles.volunteerList}>
                {additionalData.volunteer.map(vol => (
                  <div key={vol.id} className={styles.volunteerItem}>
                    <div className={styles.volunteerInfo}>
                      <span className={styles.volunteerOrg}>{vol.organization}</span>
                      {vol.role && <span className={styles.volunteerRole}>{vol.role}</span>}
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeVolunteer(vol.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add volunteer */}
            <div className={styles.volunteerForm}>
              <input
                type="text"
                placeholder="Organization name"
                value={volunteerEntry.org}
                onChange={(e) => setVolunteerEntry({ ...volunteerEntry, org: e.target.value })}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="Your role (optional)"
                value={volunteerEntry.role}
                onChange={(e) => setVolunteerEntry({ ...volunteerEntry, role: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addVolunteer()}
                className={styles.input}
              />
              <button
                onClick={addVolunteer}
                disabled={!volunteerEntry.org.trim()}
                className={styles.addBtn}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* References Section */}
      <div className={styles.card}>
        <button
          className={styles.cardHeader}
          onClick={() => setExpandedSection(expandedSection === 'references' ? '' : 'references')}
        >
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardIcon}>📋</span>
            <span className={styles.cardTitle}>References</span>
            {additionalData.references !== 'none' && (
              <span className={styles.cardCount}>✓</span>
            )}
          </div>
          <span className={styles.cardArrow}>
            {expandedSection === 'references' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'references' && (
          <div className={styles.cardContent}>
            <div className={styles.referenceOptions}>
              <label className={styles.referenceOption}>
                <input
                  type="radio"
                  name="references"
                  checked={additionalData.references === 'none'}
                  onChange={() => setReferences('none')}
                />
                <span className={styles.referenceLabel}>Don't include references section</span>
              </label>
              <label className={styles.referenceOption}>
                <input
                  type="radio"
                  name="references"
                  checked={additionalData.references === 'available'}
                  onChange={() => setReferences('available')}
                />
                <span className={styles.referenceLabel}>"References available upon request"</span>
              </label>
            </div>
            <p className={styles.referenceHint}>
              Most recruiters prefer no references section - they'll ask if needed.
            </p>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> Only include what's relevant to the job. Less is more!
        </span>
      </div>
    </div>
  );
};

export default AdditionalInfo;
