import React, { useState, useEffect } from 'react';
import styles from './Sections.module.css';

const PersonalInfo = ({ data, updateData }) => {
  const [formData, setFormData] = useState({
    name: data?.name || '',
    email: data?.email || '',
    phone: data?.phone || '',
    location: data?.location || '',
    linkedin: data?.linkedin || '',
    website: data?.website || '',
  });
  
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

  return (
    <div className={styles.sectionContainer}>
      <h2 className={styles.sectionTitle}>Personal Information</h2>
      <p className={styles.sectionDescription}>
        Let's start with your basic contact information so employers can reach you.
      </p>
      
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Full Name*</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g. John Smith"
            className={styles.formInput}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="email">Email Address*</label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="e.g. john.smith@example.com"
            className={styles.formInput}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="e.g. (555) 123-4567"
            className={styles.formInput}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="e.g. San Francisco, CA"
            className={styles.formInput}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="linkedin">LinkedIn (Optional)</label>
          <input
            type="url"
            id="linkedin"
            value={formData.linkedin}
            onChange={(e) => handleInputChange('linkedin', e.target.value)}
            placeholder="e.g. linkedin.com/in/johnsmith"
            className={styles.formInput}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="website">Website/Portfolio (Optional)</label>
          <input
            type="url"
            id="website"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="e.g. johnsmith.com"
            className={styles.formInput}
          />
        </div>
      </div>
      
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> Use a professional email address and make sure your phone number is correct.
        </span>
      </div>
    </div>
  );
};

export default PersonalInfo; 