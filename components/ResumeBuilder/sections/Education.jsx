import React, { useState, useEffect } from 'react';
import styles from './Sections.module.css';

const Education = ({ data, updateData }) => {
  // Ensure data is always an array with at least one default item
  const [educations, setEducations] = useState(() => {
    const defaultEducation = { 
      degree: '', 
      school: '', 
      location: '', 
      graduationDate: '', 
      description: '' 
    };
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [defaultEducation];
    }
    
    // Normalize each education to ensure it has all required properties
    return data.map(edu => ({
      degree: edu.degree || '',
      school: edu.school || '',
      location: edu.location || '',
      graduationDate: edu.graduationDate || '',
      description: edu.description || ''
    }));
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      // Normalize the data to ensure all required fields exist
      const normalizedData = data.map(edu => ({
        degree: edu.degree || '',
        school: edu.school || '',
        location: edu.location || '',
        graduationDate: edu.graduationDate || '',
        description: edu.description || ''
      }));
      
      setEducations(normalizedData);
      
      // Ensure currentIndex is valid for the new data
      if (currentIndex >= normalizedData.length) {
        setCurrentIndex(Math.max(0, normalizedData.length - 1));
      }
    }
  }, [data]);
  
  const handleInputChange = (field, value) => {
    // Make sure educations array and current index are valid
    if (!educations || !Array.isArray(educations) || currentIndex >= educations.length) {
      console.error('Invalid educations data structure in handleInputChange');
      return;
    }
    
    const updatedEducations = [...educations];
    updatedEducations[currentIndex] = {
      ...updatedEducations[currentIndex],
      [field]: value
    };
    
    setEducations(updatedEducations);
    updateData(updatedEducations);
  };
  
  const addNewEducation = () => {
    // Ensure educations is an array before trying to update it
    if (!educations || !Array.isArray(educations)) {
      console.error('Invalid educations data structure in addNewEducation');
      
      // Reset educations to a default array with one item if it's invalid
      const defaultEducation = { 
        degree: '', 
        school: '', 
        location: '', 
        graduationDate: '', 
        description: '' 
      };
      
      setEducations([defaultEducation]);
      setCurrentIndex(0);
      updateData([defaultEducation]);
      return;
    }
    
    const updatedEducations = [
      ...educations,
      { 
        degree: '', 
        school: '', 
        location: '', 
        graduationDate: '', 
        description: '' 
      }
    ];
    
    setEducations(updatedEducations);
    setCurrentIndex(updatedEducations.length - 1);
    updateData(updatedEducations);
  };
  
  const removeEducation = (index) => {
    // Ensure educations is a valid array
    if (!educations || !Array.isArray(educations)) {
      console.error('Invalid educations data structure in removeEducation');
      return;
    }
    
    // Make sure index is valid
    if (index < 0 || index >= educations.length) {
      console.error(`Invalid index ${index} in removeEducation`);
      return;
    }
    
    // Don't remove if it's the only one
    if (educations.length === 1) {
      return;
    }
    
    const updatedEducations = educations.filter((_, i) => i !== index);
    setEducations(updatedEducations);
    
    // Adjust current index if needed
    if (index <= currentIndex) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
    
    updateData(updatedEducations);
  };

  return (
    <div className={styles.sectionContainer}>
      <h2 className={styles.sectionTitle}>Education</h2>
      <p className={styles.sectionDescription}>
        List your education history, including degrees, certifications, and relevant coursework.
      </p>
      
      {/* Education Tabs Navigation */}
      <div className={styles.experienceTabs}>
        {Array.isArray(educations) && educations.map((edu, index) => (
          <div 
            key={index}
            className={`${styles.experienceTab} ${index === currentIndex ? styles.activeTab : ''}`}
            onClick={() => setCurrentIndex(index)}
          >
            <span className={styles.tabContent}>
              {(edu?.degree || edu?.school) 
                ? `${edu?.degree || 'Degree'} at ${edu?.school || 'School'}` 
                : `Education ${index + 1}`}
            </span>
            {Array.isArray(educations) && educations.length > 1 && (
              <button 
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  removeEducation(index);
                }}
                aria-label="Remove education"
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        <button 
          className={styles.addButton}
          onClick={addNewEducation}
          aria-label="Add education"
        >
          + Add Education
        </button>
      </div>
      
      {/* Education Fields */}
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="degree">Degree / Certificate</label>
          <input
            type="text"
            id="degree"
            value={educations[currentIndex]?.degree || ''}
            onChange={(e) => handleInputChange('degree', e.target.value)}
            placeholder="e.g. Bachelor of Science in Computer Science"
            className={styles.formInput}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="school">School / University</label>
          <input
            type="text"
            id="school"
            value={educations[currentIndex]?.school || ''}
            onChange={(e) => handleInputChange('school', e.target.value)}
            placeholder="e.g. Stanford University"
            className={styles.formInput}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            value={educations[currentIndex]?.location || ''}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="e.g. Stanford, CA"
            className={styles.formInput}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="graduationDate">Graduation Date</label>
          <input
            type="text"
            id="graduationDate"
            value={educations[currentIndex]?.graduationDate || ''}
            onChange={(e) => handleInputChange('graduationDate', e.target.value)}
            placeholder="e.g. May 2020"
            className={styles.formInput}
          />
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="description">
          Additional Information (Optional)
          <span className={styles.sublabel}>Relevant coursework, honors, achievements</span>
        </label>
        <textarea
          id="description"
          value={educations[currentIndex]?.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="List relevant coursework, honors, academic achievements, extracurricular activities, etc."
          className={styles.formInput}
          rows={4}
        />
      </div>
      
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> If you've been in the workforce for several years, focus on your degrees rather than detailed coursework.
        </span>
      </div>
    </div>
  );
};

export default Education; 