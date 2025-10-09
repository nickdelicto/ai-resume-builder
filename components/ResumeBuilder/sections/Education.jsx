import React, { useState, useEffect } from 'react';
import styles from './Sections.module.css';
import { useDrag, useDrop } from 'react-dnd';

const Education = ({ data, updateData }) => {
  // Helper function to generate unique ID
  const generateEducationId = () => `edu_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Ensure data is always an array with at least one default item
  const [educations, setEducations] = useState(() => {
    const defaultEducation = { 
      id: generateEducationId(),
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
      id: edu.id || generateEducationId(), // Add ID if missing
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
        id: edu.id || generateEducationId(), // Add ID if missing
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
        id: generateEducationId(),
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
        id: generateEducationId(),
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

  // Helper function to truncate text for tab display
  const truncateText = (text, maxLength = 25) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Function to handle education reordering
  const moveEducation = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const reorderedEducations = [...educations];
    const [movedEducation] = reorderedEducations.splice(fromIndex, 1);
    reorderedEducations.splice(toIndex, 0, movedEducation);
    
    setEducations(reorderedEducations);
    updateData(reorderedEducations);
    
    // Update currentIndex if needed
    if (currentIndex === fromIndex) {
      setCurrentIndex(toIndex);
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Draggable Education Tab Component
  const DraggableEducationTab = ({ edu, index, isActive, onTabClick, onRemove }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'EDUCATION',
      item: { id: edu.id, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [, drop] = useDrop({
      accept: 'EDUCATION',
      hover: (draggedItem) => {
        if (draggedItem.index === index) {
          return;
        }
        moveEducation(draggedItem.index, index);
        draggedItem.index = index;
      },
    });

    // Handle click with drag prevention
    const handleTabClick = (e) => {
      // Don't trigger tab change if we're dragging or if click was on drag handle
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
        className={`${styles.experienceTab} ${isActive ? styles.activeTab : ''} ${isDragging ? styles.draggingTab : ''}`}
        onClick={handleTabClick}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <span className={styles.tabContent}>
          {(edu?.degree || edu?.school) 
            ? `${truncateText(edu?.degree || 'Degree')} at ${truncateText(edu?.school || 'School')}` 
            : `Education ${index + 1}`}
        </span>
        
        {/* Drag Handle */}
        <div 
          className={styles.dragHandle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span className={styles.dragIcon}>☰</span>
        </div>
        
        {Array.isArray(educations) && educations.length > 1 && (
          <button 
            className={styles.removeButton}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            aria-label="Remove education"
          >
            ×
          </button>
        )}
      </div>
    );
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
          <DraggableEducationTab
            key={edu.id}
            edu={edu}
            index={index}
            isActive={index === currentIndex}
            onTabClick={setCurrentIndex}
            onRemove={removeEducation}
          />
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