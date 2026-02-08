/**
 * Licenses Section
 * Healthcare-focused nursing license input
 *
 * Target user: Tired nurse who wants to quickly add their license info
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import styles from './Sections.module.css';
import licenseStyles from './Licenses.module.css';
import {
  LICENSE_TYPES,
  US_STATES,
  NLC_STATES,
  isCompactState
} from '../../../lib/constants/healthcareData';

// Draggable License Card — MUST be outside Licenses to avoid remount on every keystroke
const DraggableLicenseCard = ({ license, index, moveLicense, children }) => {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: 'LICENSE',
    item: { id: license.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'LICENSE',
    hover: (draggedItem) => {
      if (draggedItem.index === index) return;
      moveLicense(draggedItem.index, index);
      draggedItem.index = index;
    },
  });

  return (
    <div
      ref={(node) => dragPreview(drop(node))}
      className={`${licenseStyles.licenseCard} ${isDragging ? licenseStyles.draggingCard : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {typeof children === 'function' ? children(drag) : children}
    </div>
  );
};

const Licenses = ({ data, updateData }) => {
  // data structure: [{ type, state, licenseNumber, isCompact, expirationDate }]
  const [licenses, setLicenses] = useState(data || []);
  const [selectedType, setSelectedType] = useState('rn');
  const [showNlcInfo, setShowNlcInfo] = useState(false);

  // Sync with parent data
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setLicenses(data);
    }
  }, [data]);

  // Auto-create first RN license card on mount when empty
  useEffect(() => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      const initialLicense = {
        id: `license-${Date.now()}`,
        type: 'rn',
        state: '',
        licenseNumber: '',
        isCompact: false,
        expirationDate: ''
      };
      setLicenses([initialLicense]);
      updateData([initialLicense]);
    }
  }, []); // Only on mount

  // Add a new license entry of a specific type (tap = add)
  const addLicense = (typeId = selectedType) => {
    const newLicense = {
      id: `license-${Date.now()}`,
      type: typeId,
      state: '',
      licenseNumber: '',
      isCompact: false,
      expirationDate: ''
    };
    const updated = [...licenses, newLicense];
    setLicenses(updated);
    updateData(updated);
    setSelectedType(typeId);
  };

  // Update a license field
  const updateLicense = (licenseId, field, value) => {
    const updated = licenses.map(lic => {
      if (lic.id === licenseId) {
        const updatedLic = { ...lic, [field]: value };
        // Auto-set isCompact when state changes
        if (field === 'state') {
          updatedLic.isCompact = isCompactState(value);
        }
        return updatedLic;
      }
      return lic;
    });
    setLicenses(updated);
    updateData(updated);
  };

  // Remove a license
  const removeLicense = (licenseId) => {
    const updated = licenses.filter(lic => lic.id !== licenseId);
    setLicenses(updated);
    updateData(updated);
  };

  // Reorder licenses via drag-and-drop
  const moveLicense = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const reordered = [...licenses];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setLicenses(reordered);
    updateData(reordered);
  };

  // Get license type display name
  const getLicenseTypeName = (typeId) => {
    const type = LICENSE_TYPES.find(t => t.id === typeId);
    return type ? type.name : typeId.toUpperCase();
  };

  // Generate month options for expiration date picker (4 years ahead)
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 48; i++) {
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
      <h2 className={styles.sectionTitle}>Nursing License</h2>

      <p className={styles.sectionDescription}>
        Add your nursing license information. This is critical for healthcare job applications.
      </p>

      {/* License Entries */}
      <div className={licenseStyles.licenseList}>
        {licenses.map((license, index) => (
          <DraggableLicenseCard
            key={license.id}
            license={license}
            index={index}
            moveLicense={moveLicense}
          >
            {(dragRef) => (
              <>
                <div className={licenseStyles.licenseHeader}>
                  <div className={licenseStyles.headerLeft}>
                    <div
                      ref={dragRef}
                      className={licenseStyles.dragHandle}
                    >
                      <span className={licenseStyles.dragIcon}>☰</span>
                    </div>
                    <span className={licenseStyles.licenseType}>
                      {getLicenseTypeName(license.type)} License #{index + 1}
                    </span>
                  </div>
                  <button
                    className={licenseStyles.removeButton}
                    onClick={() => removeLicense(license.id)}
                    aria-label="Remove license"
                  >
                    ×
                  </button>
                </div>

                <div className={licenseStyles.licenseFields}>
                  {/* State Selection */}
                  <div className={licenseStyles.fieldGroup}>
                    <label className={licenseStyles.fieldLabel}>State</label>
                    <select
                      className={licenseStyles.select}
                      value={license.state}
                      onChange={(e) => updateLicense(license.id, 'state', e.target.value)}
                    >
                      <option value="">Select state...</option>
                      {US_STATES.map(state => (
                        <option key={state.code} value={state.code}>
                          {state.name} {isCompactState(state.code) ? '(Compact)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* License Number */}
                  <div className={licenseStyles.fieldGroup}>
                    <label className={licenseStyles.fieldLabel}>License Number</label>
                    <input
                      type="text"
                      className={licenseStyles.input}
                      placeholder="e.g., RN 12345678"
                      value={license.licenseNumber}
                      onChange={(e) => updateLicense(license.id, 'licenseNumber', e.target.value)}
                    />
                  </div>

                  {/* Expiration Date */}
                  <div className={licenseStyles.fieldGroup}>
                    <label className={licenseStyles.fieldLabel}>Expires (optional)</label>
                    <select
                      className={licenseStyles.select}
                      value={license.expirationDate}
                      onChange={(e) => updateLicense(license.id, 'expirationDate', e.target.value)}
                    >
                      <option value="">Select date...</option>
                      {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Compact State Notice */}
                {license.isCompact && license.state && (
                  <div className={licenseStyles.compactBadge}>
                    <span className={licenseStyles.compactIcon}>✓</span>
                    <span>Compact License - Valid in 40+ states</span>
                  </div>
                )}
              </>
            )}
          </DraggableLicenseCard>
        ))}
      </div>

      {/* Add More Licenses - Type buttons directly add */}
      <div className={licenseStyles.typeSelector}>
        <label className={licenseStyles.typeSelectorLabel}>Add Another License:</label>
        <div className={licenseStyles.typeButtons}>
          {LICENSE_TYPES.filter(t => ['rn', 'aprn'].includes(t.id)).map(type => (
            <button
              key={type.id}
              className={licenseStyles.typeButton}
              onClick={() => addLicense(type.id)}
            >
              + {type.name}
            </button>
          ))}
          <select
            className={licenseStyles.typeDropdown}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addLicense(e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="">+ More...</option>
            {LICENSE_TYPES.filter(t => !['rn', 'aprn'].includes(t.id)).map(type => (
              <option key={type.id} value={type.id}>{type.name} - {type.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Nurse Licensure Compact Info */}
      <div className={licenseStyles.nlcInfo}>
        <button
          className={licenseStyles.nlcToggle}
          onClick={() => setShowNlcInfo(!showNlcInfo)}
        >
          <span className={licenseStyles.nlcIcon}>💡</span>
          <span>What is a Compact License?</span>
          <span className={licenseStyles.nlcArrow}>{showNlcInfo ? '▲' : '▼'}</span>
        </button>

        {showNlcInfo && (
          <div className={licenseStyles.nlcContent}>
            <p>
              The <strong>Nurse Licensure Compact (NLC)</strong> allows nurses to have one multistate license
              that's valid in their home state AND all other compact states (currently 40+ states).
            </p>
            <p>
              <strong>Compact states include:</strong> {NLC_STATES.slice(0, 10).join(', ')}... and more.
            </p>
            <p>
              If your primary residence is in a compact state, your license automatically allows you to
              practice in all other compact states without additional licenses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Licenses;
