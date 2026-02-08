import React, { useState, useEffect, useRef } from 'react';
import styles from './Education.module.css';
import { useDrag, useDrop } from 'react-dnd';

// Common nursing degrees - tap to select
const NURSING_DEGREES = [
  { id: 'bsn', name: 'BSN (Bachelor of Science in Nursing)', short: 'BSN' },
  { id: 'adn', name: 'ADN (Associate Degree in Nursing)', short: 'ADN' },
  { id: 'asn', name: 'ASN (Associate of Science in Nursing)', short: 'ASN' },
  { id: 'aas', name: 'AAS in Nursing', short: 'AAS' },
  { id: 'diploma', name: 'Diploma in Nursing (Hospital-Based)', short: 'RN Diploma' },
  { id: 'msn', name: 'MSN (Master of Science in Nursing)', short: 'MSN' },
  { id: 'dnp', name: 'DNP (Doctor of Nursing Practice)', short: 'DNP' },
  { id: 'phd', name: 'PhD in Nursing', short: 'PhD' },
  { id: 'lpn', name: 'LPN Diploma / Certificate', short: 'LPN' },
  { id: 'lvn', name: 'LVN Certificate (TX/CA)', short: 'LVN' },
  { id: 'np', name: 'Nurse Practitioner Certificate', short: 'NP Cert' }
];

// Months for graduation date picker
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Years for graduation date picker (current year + 4 down to 1975)
const GRADUATION_YEARS = (() => {
  const years = [];
  for (let y = new Date().getFullYear() + 4; y >= 1975; y--) {
    years.push(y.toString());
  }
  return years;
})();

// Parse "May 2020" into { month, year } — also handles partial values
const parseGradDate = (dateStr) => {
  if (!dateStr) return { month: '', year: '' };
  const parts = dateStr.trim().split(' ');
  if (parts.length === 2 && MONTHS.includes(parts[0])) {
    return { month: parts[0], year: parts[1] };
  }
  // Handle partial values (only month or only year selected so far)
  if (parts.length === 1) {
    if (MONTHS.includes(parts[0])) {
      return { month: parts[0], year: '' };
    }
    if (/^\d{4}$/.test(parts[0])) {
      return { month: '', year: parts[0] };
    }
  }
  return { month: '', year: '' };
};

// Helper function to truncate text for tab display
const truncateText = (text, maxLength = 25) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Draggable Education Tab — MUST be outside Education to avoid remount on every keystroke
const DraggableEducationTab = ({ edu, index, isActive, onTabClick, onRemove, moveEducation, itemCount }) => {
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
      if (draggedItem.index === index) return;
      moveEducation(draggedItem.index, index);
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
      className={`${styles.experienceTab} ${isActive ? styles.activeTab : ''} ${isDragging ? styles.draggingTab : ''}`}
      onClick={handleTabClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <span className={styles.tabContent}>
        <span className={styles.tabNumber}>{index + 1}.</span>
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

      {itemCount > 1 && (
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
  const [showDegreeSuggestions, setShowDegreeSuggestions] = useState(false);
  const degreeInputRef = useRef(null);

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

  // Quick select a nursing degree
  const selectDegree = (degreeName) => {
    handleInputChange('degree', degreeName);
    setShowDegreeSuggestions(false);
  };

  // Check if degree matches a predefined option
  const isKnownDegree = (degree) => {
    if (!degree) return false;
    const lowerDegree = degree.toLowerCase();
    return NURSING_DEGREES.some(d =>
      d.name.toLowerCase() === lowerDegree || d.short.toLowerCase() === lowerDegree
    );
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>🎓</span>
          Education
        </h2>
      </div>
      <p className={styles.description}>
        List your nursing education. Tap a common degree or type your own.
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
            moveEducation={moveEducation}
            itemCount={educations.length}
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
      
      {/* Degree Quick Select */}
      <div className={styles.degreeSection}>
        <div className={styles.degreeHeader}>
          <span className={styles.degreeIcon}>🎓</span>
          <span className={styles.degreeTitle}>Tap to select your degree</span>
        </div>

        {/* Nursing Degrees */}
        <div className={styles.degreeCategory}>
          <span className={styles.categoryLabel}>Nursing Degrees</span>
          <div className={styles.degreeGrid}>
            {NURSING_DEGREES.map(degree => (
              <button
                key={degree.id}
                type="button"
                className={`${styles.degreeBtn} ${
                  educations[currentIndex]?.degree === degree.name ? styles.degreeBtnSelected : ''
                }`}
                onClick={() => selectDegree(degree.name)}
              >
                {degree.short}
                {educations[currentIndex]?.degree === degree.name && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Degree Input */}
        <div className={styles.customDegree}>
          <span className={styles.customLabel}>Or type your degree:</span>
          <input
            ref={degreeInputRef}
            type="text"
            id="degree"
            value={educations[currentIndex]?.degree || ''}
            onChange={(e) => handleInputChange('degree', e.target.value)}
            placeholder="e.g. BSN, ADN, or other degree"
            className={`${styles.formInput} ${styles.degreeInput}`}
          />
        </div>
      </div>

      {/* Education Fields */}
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="school">School / University</label>
          <input
            type="text"
            id="school"
            value={educations[currentIndex]?.school || ''}
            onChange={(e) => handleInputChange('school', e.target.value)}
            placeholder="e.g. University of Pennsylvania"
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
            placeholder="e.g. Philadelphia, PA"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Graduation Date</label>
          <div className={styles.gradDateRow}>
            <select
              value={parseGradDate(educations[currentIndex]?.graduationDate).month}
              onChange={(e) => {
                const newMonth = e.target.value;
                const { year } = parseGradDate(educations[currentIndex]?.graduationDate);
                handleInputChange('graduationDate', newMonth && year ? `${newMonth} ${year}` : newMonth || year || '');
              }}
              className={styles.gradSelect}
            >
              <option value="">Month</option>
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={parseGradDate(educations[currentIndex]?.graduationDate).year}
              onChange={(e) => {
                const newYear = e.target.value;
                const { month } = parseGradDate(educations[currentIndex]?.graduationDate);
                handleInputChange('graduationDate', month && newYear ? `${month} ${newYear}` : month || newYear || '');
              }}
              className={styles.gradSelect}
            >
              <option value="">Year</option>
              {GRADUATION_YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">
          Additional Information (Optional)
          <span className={styles.sublabel}>Clinical rotations, honors, GPA if recent grad</span>
        </label>
        <textarea
          id="description"
          value={educations[currentIndex]?.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="e.g. Dean's List, Clinical rotations at Johns Hopkins, Sigma Theta Tau Honor Society"
          className={styles.formInput}
          rows={4}
        />
      </div>

      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> New grads should include clinical rotation sites and GPA if above 3.5. Experienced nurses can focus on degrees and certifications.
        </span>
      </div>
    </div>
  );
};

export default Education; 