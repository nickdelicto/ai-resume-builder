/**
 * Personal Info Section
 * Healthcare-focused contact information input
 *
 * Target user: Tired nurse who needs to quickly enter their details
 * Mobile-first, large touch targets, clear visual hierarchy
 */

import React, { useState, useEffect } from 'react';
import styles from './PersonalInfo.module.css';

const PersonalInfo = ({ data, updateData }) => {
  const [formData, setFormData] = useState({
    name: data?.name || '',
    email: data?.email || '',
    phone: data?.phone || '',
    location: data?.location || '',
    linkedin: data?.linkedin || '',
    website: data?.website || '',
  });
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || '',
        linkedin: data.linkedin || '',
        website: data.website || '',
      });
    }
  }, [data]);

  const handleInputChange = (field, value) => {
    const updatedData = {
      ...formData,
      [field]: value
    };

    setFormData(updatedData);
    updateData(updatedData);
  };

  // Check if required fields are complete
  const isComplete = formData.name.trim() && formData.email.trim();

  // Check if email looks valid
  const isEmailValid = formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>👋</span>
          Let's Get Started
        </h2>
        <p className={styles.description}>
          Enter your contact info so employers can reach you. Takes a few seconds!
        </p>
      </div>

      {/* Required Fields Card */}
      <div className={styles.requiredCard}>
        <h3 className={styles.requiredCardTitle}>
          <span>📋</span>
          Required Information
        </h3>

        <div className={styles.requiredFields}>
          {/* Full Name */}
          <div className={styles.fieldGroup}>
            <label htmlFor="name" className={styles.label}>
              <span className={styles.labelIcon}>👤</span>
              Full Name
              <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g. Sarah Johnson, RN"
              className={`${styles.input} ${formData.name.trim() ? styles.inputValid : ''}`}
              autoComplete="name"
              required
            />
          </div>

          {/* Email */}
          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>
              <span className={styles.labelIcon}>📧</span>
              Email Address
              <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="e.g. sarah.johnson@email.com"
              className={`${styles.input} ${isEmailValid ? styles.inputValid : ''}`}
              autoComplete="email"
              required
            />
          </div>

          {/* Phone */}
          <div className={styles.fieldGroup}>
            <label htmlFor="phone" className={styles.label}>
              <span className={styles.labelIcon}>📱</span>
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="e.g. (555) 123-4567"
              className={`${styles.input} ${formData.phone.trim() ? styles.inputValid : ''}`}
              autoComplete="tel"
            />
            <span className={styles.phoneHint}>
              Recruiters often call - make sure this is correct!
            </span>
          </div>

          {/* Location */}
          <div className={styles.fieldGroup}>
            <label htmlFor="location" className={styles.label}>
              <span className={styles.labelIcon}>📍</span>
              Location
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g. Cleveland, OH or Toronto, ON"
              className={`${styles.input} ${formData.location.trim() ? styles.inputValid : ''}`}
              autoComplete="address-level2"
            />
          </div>
        </div>
      </div>

      {/* Optional Fields Card */}
      <div className={styles.optionalCard}>
        <h3 className={styles.optionalCardTitle}>
          <span>✨</span>
          Optional (But Helpful)
        </h3>

        <div className={styles.optionalFields}>
          {/* LinkedIn */}
          <div className={styles.fieldGroup}>
            <label htmlFor="linkedin" className={styles.label}>
              <span className={styles.labelIcon}>💼</span>
              LinkedIn Profile
              <span className={styles.labelOptional}>optional</span>
            </label>
            <input
              type="url"
              id="linkedin"
              value={formData.linkedin}
              onChange={(e) => handleInputChange('linkedin', e.target.value)}
              placeholder="linkedin.com/in/yourname"
              className={styles.input}
              autoComplete="url"
            />
          </div>

          {/* Website */}
          <div className={styles.fieldGroup}>
            <label htmlFor="website" className={styles.label}>
              <span className={styles.labelIcon}>🌐</span>
              Personal Website
              <span className={styles.labelOptional}>optional</span>
            </label>
            <input
              type="url"
              id="website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="e.g. yourportfolio.com"
              className={styles.input}
              autoComplete="url"
            />
          </div>
        </div>
      </div>

      {/* Completion Badge */}
      {isComplete && (
        <div className={styles.completionBadge}>
          <span className={styles.completionIcon}>✓</span>
          <span className={styles.completionText}>
            Looking good! Your contact info is ready.
          </span>
        </div>
      )}

      {/* Tips Section */}
      <div className={styles.tipsSection}>
        <button
          className={styles.tipsToggle}
          onClick={() => setShowTips(!showTips)}
          type="button"
        >
          <span className={styles.tipsIcon}>💡</span>
          <span>Pro Tips for Nurses</span>
          <span className={styles.tipsArrow}>{showTips ? '▲' : '▼'}</span>
        </button>

        {showTips && (
          <div className={styles.tipsContent}>
            <ul className={styles.tipsList}>
              <li className={styles.tipItem}>
                <span className={styles.tipBullet}>✓</span>
                <span>Use a professional email (avoid nicknames or numbers)</span>
              </li>
              <li className={styles.tipItem}>
                <span className={styles.tipBullet}>✓</span>
                <span>Include your credentials after your name (e.g., "BSN, RN")</span>
              </li>
              <li className={styles.tipItem}>
                <span className={styles.tipBullet}>✓</span>
                <span>Double-check your phone number - recruiters often call!</span>
              </li>
              <li className={styles.tipItem}>
                <span className={styles.tipBullet}>✓</span>
                <span>For location, city and state/province is enough (no street address needed)</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfo;
