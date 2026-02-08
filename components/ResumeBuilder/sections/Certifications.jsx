/**
 * Certifications Section
 * Healthcare-focused certification picker with "tap, don't type" design
 *
 * Target user: Tired nurse who wants to quickly add their certifications
 */

import React, { useState, useEffect, useMemo } from 'react';
import styles from './Sections.module.css';
import certStyles from './Certifications.module.css';
import { CERTIFICATIONS } from '../../../lib/constants/healthcareData';

const Certifications = ({ data, updateData }) => {
  // data structure: [{ id, name, fullName, expirationDate, issuingBody }]
  const [certifications, setCertifications] = useState(data || []);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCert, setCustomCert] = useState({ name: '', fullName: '', expirationDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with parent data
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setCertifications(data);
    }
  }, [data]);

  // Check if certification is already added
  const isCertAdded = (certId) => {
    return certifications.some(c => c.id === certId);
  };

  // Toggle certification (add/remove)
  const toggleCertification = (cert) => {
    let updated;
    if (isCertAdded(cert.id)) {
      // Remove
      updated = certifications.filter(c => c.id !== cert.id);
    } else {
      // Add with empty expiration date
      updated = [...certifications, {
        id: cert.id,
        name: cert.name,
        fullName: cert.fullName,
        expirationDate: '',
        issuingBody: cert.issuingBodies?.[0] || ''
      }];
    }
    setCertifications(updated);
    updateData(updated);
  };

  // Update expiration date for a certification
  const updateExpirationDate = (certId, date) => {
    const updated = certifications.map(c =>
      c.id === certId ? { ...c, expirationDate: date } : c
    );
    setCertifications(updated);
    updateData(updated);
  };

  // Add custom certification
  const addCustomCertification = () => {
    if (!customCert.name.trim()) return;

    const newCert = {
      id: `custom-${Date.now()}`,
      name: customCert.name.trim(),
      fullName: customCert.fullName.trim() || customCert.name.trim(),
      expirationDate: customCert.expirationDate,
      issuingBody: '',
      isCustom: true
    };

    const updated = [...certifications, newCert];
    setCertifications(updated);
    updateData(updated);

    // Reset form
    setCustomCert({ name: '', fullName: '', expirationDate: '' });
    setShowCustomInput(false);
  };

  // Remove certification
  const removeCertification = (certId) => {
    const updated = certifications.filter(c => c.id !== certId);
    setCertifications(updated);
    updateData(updated);
  };

  // Filter certifications by search query
  const filteredSpecialty = useMemo(() => {
    if (!searchQuery.trim()) return CERTIFICATIONS.specialty;
    const query = searchQuery.toLowerCase();
    return CERTIFICATIONS.specialty.filter(cert =>
      cert.name.toLowerCase().includes(query) ||
      cert.fullName.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Count added certifications
  const addedCount = certifications.length;

  // Generate month options for expiration date picker
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 48; i++) { // 4 years ahead
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }
    return months;
  }, []);

  return (
    <div className={styles.sectionContainer}>
      <div className={certStyles.header}>
        <h2 className={styles.sectionTitle}>Certifications</h2>
        {addedCount > 0 && (
          <span className={certStyles.badge}>{addedCount} added</span>
        )}
      </div>

      <p className={styles.sectionDescription}>
        Select your nursing certifications. Add expiration dates to show you're current.
      </p>

      {/* Required Certifications */}
      <div className={certStyles.certGroup}>
        <h3 className={certStyles.groupTitle}>
          Required for Most Jobs
          <span className={certStyles.groupHint}>98% of employers require BLS</span>
        </h3>

        <div className={certStyles.certGrid}>
          {CERTIFICATIONS.required.map(cert => {
            const isAdded = isCertAdded(cert.id);
            const addedCert = certifications.find(c => c.id === cert.id);

            return (
              <div
                key={cert.id}
                className={`${certStyles.certCard} ${isAdded ? certStyles.certCardSelected : ''}`}
              >
                <label className={certStyles.certLabel}>
                  <input
                    type="checkbox"
                    checked={isAdded}
                    onChange={() => toggleCertification(cert)}
                    className={certStyles.certCheckbox}
                  />
                  <div className={certStyles.certInfo}>
                    <span className={certStyles.certName}>{cert.name}</span>
                    <span className={certStyles.certFullName}>{cert.fullName}</span>
                  </div>
                </label>

                {isAdded && (
                  <div className={certStyles.expirationRow}>
                    <label className={certStyles.expLabel}>Expires:</label>
                    <select
                      value={addedCert?.expirationDate || ''}
                      onChange={(e) => updateExpirationDate(cert.id, e.target.value)}
                      className={certStyles.expSelect}
                    >
                      <option value="">Select date</option>
                      {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Specialty Certifications */}
      <div className={certStyles.certGroup}>
        <h3 className={certStyles.groupTitle}>
          Specialty Certifications
          <span className={certStyles.groupHint}>Stand out with specialty credentials</span>
        </h3>

        {/* Search filter */}
        <div className={certStyles.searchContainer}>
          <input
            type="text"
            placeholder="Search certifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={certStyles.searchInput}
          />
          {searchQuery && (
            <button
              className={certStyles.clearSearch}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className={certStyles.certGrid}>
          {filteredSpecialty.map(cert => {
            const isAdded = isCertAdded(cert.id);
            const addedCert = certifications.find(c => c.id === cert.id);

            return (
              <div
                key={cert.id}
                className={`${certStyles.certCard} ${isAdded ? certStyles.certCardSelected : ''}`}
              >
                <label className={certStyles.certLabel}>
                  <input
                    type="checkbox"
                    checked={isAdded}
                    onChange={() => toggleCertification(cert)}
                    className={certStyles.certCheckbox}
                  />
                  <div className={certStyles.certInfo}>
                    <span className={certStyles.certName}>{cert.name}</span>
                    <span className={certStyles.certFullName}>{cert.fullName}</span>
                  </div>
                </label>

                {isAdded && (
                  <div className={certStyles.expirationRow}>
                    <label className={certStyles.expLabel}>Expires:</label>
                    <select
                      value={addedCert?.expirationDate || ''}
                      onChange={(e) => updateExpirationDate(cert.id, e.target.value)}
                      className={certStyles.expSelect}
                    >
                      <option value="">Select date</option>
                      {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}

          {filteredSpecialty.length === 0 && searchQuery && (
            <div className={certStyles.noResults}>
              No certifications found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Custom Certification */}
      <div className={certStyles.customSection}>
        {!showCustomInput ? (
          <button
            className={certStyles.addCustomButton}
            onClick={() => setShowCustomInput(true)}
          >
            + Add other certification
          </button>
        ) : (
          <div className={certStyles.customForm}>
            <h4 className={certStyles.customTitle}>Add Custom Certification</h4>
            <div className={certStyles.customInputs}>
              <input
                type="text"
                placeholder="Abbreviation (e.g., TNCC)"
                value={customCert.name}
                onChange={(e) => setCustomCert({ ...customCert, name: e.target.value })}
                className={certStyles.customInput}
              />
              <input
                type="text"
                placeholder="Full name (optional)"
                value={customCert.fullName}
                onChange={(e) => setCustomCert({ ...customCert, fullName: e.target.value })}
                className={certStyles.customInput}
              />
              <select
                value={customCert.expirationDate}
                onChange={(e) => setCustomCert({ ...customCert, expirationDate: e.target.value })}
                className={certStyles.expSelect}
              >
                <option value="">Expiration (optional)</option>
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={certStyles.customButtons}>
              <button
                className={certStyles.addButton}
                onClick={addCustomCertification}
                disabled={!customCert.name.trim()}
              >
                Add
              </button>
              <button
                className={certStyles.cancelButton}
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomCert({ name: '', fullName: '', expirationDate: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Added Certifications Summary */}
      {addedCount > 0 && (
        <div className={certStyles.addedSummary}>
          <h4 className={certStyles.summaryTitle}>Your Certifications ({addedCount})</h4>
          <div className={certStyles.summaryList}>
            {certifications.map(cert => (
              <div key={cert.id} className={certStyles.summaryItem}>
                <span className={certStyles.summaryName}>
                  {cert.name}
                  {cert.expirationDate && (
                    <span className={certStyles.summaryExp}>
                      (exp. {new Date(cert.expirationDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                    </span>
                  )}
                </span>
                <button
                  className={certStyles.removeButton}
                  onClick={() => removeCertification(cert.id)}
                  aria-label={`Remove ${cert.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> Add expiration dates to show employers your certifications are current. Most certifications need renewal every 2-5 years.
        </span>
      </div>
    </div>
  );
};

export default Certifications;
