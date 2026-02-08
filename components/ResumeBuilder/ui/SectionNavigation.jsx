import React, { useState, useEffect } from 'react';
import styles from './SectionNavigation.module.css';
import { useDrag, useDrop } from 'react-dnd';

// Basic version of the section item without drag-and-drop
const BasicSectionItem = ({ 
  section, 
  isActive, 
  isComplete, 
  isFixed,
  onSectionChange 
}) => {
  return (
    <li 
      className={`
        ${styles.sectionItem} 
        ${isActive ? styles.activeSection : ''} 
        ${isComplete ? styles.completedSection : ''}
        ${isFixed ? styles.fixedSection : ''}
      `}
      onClick={() => onSectionChange(section.id)}
    >
      <div className={styles.sectionStatus}>
        {isComplete ? (
          <span className={styles.completedIcon}>✓</span>
        ) : (
          <span className={styles.incompleteIcon}></span>
        )}
      </div>
      
      <span className={styles.sectionLabel}>{section.label}</span>
      
      {!isFixed && (
        <div className={styles.dragHandle}>
          <span className={styles.dragIcon}>☰</span>
        </div>
      )}
      
      {isActive && <div className={styles.activeIndicator}></div>}
    </li>
  );
};

// The main component that conditionally uses drag-and-drop
const SectionNavigation = ({ 
  sections, 
  activeSection, 
  completedSections,
  onSectionChange,
  onReorderSections,
  onResetSectionOrder
}) => {
  // In SSR, we can't use browser-specific APIs, so we need to render the basic version
  if (typeof window === 'undefined') {
    return (
      <div className={styles.navigationContainer}>
        <div className={styles.navigationHeader}>
          <div className={styles.navigationTitle}>Resume Sections</div>
          <div className={styles.resetButtonWrapper}>
            <button
              className={styles.resetOrderButton}
              onClick={onResetSectionOrder}
              aria-label="Reset section order"
            >
              <span className={styles.resetIcon}>↻</span>
            </button>
            <span className={styles.tooltip}>Reset Sections order</span>
          </div>
        </div>

        <ul className={styles.sectionsList}>
          {sections.map((section, index) => {
            const isComplete = completedSections[section.id];
            const isActive = activeSection === section.id;
            const isFixed = section.id === 'personalInfo' || section.id === 'summary';

            return (
              <BasicSectionItem
                key={section.id}
                section={section}
                isActive={isActive}
                isComplete={isComplete}
                isFixed={isFixed}
                onSectionChange={onSectionChange}
              />
            );
          })}
        </ul>
      </div>
    );
  }

  // Use dynamic imports for browser-only code with proper ESM syntax
  // State to track if we should show the reset hint animation
  const [showResetHint, setShowResetHint] = useState(false);
    
  // The draggable version of SectionItem
  const DraggableSectionItem = ({ 
    section, 
    index, 
    isActive, 
    isComplete, 
    isFixed,
    moveSection, 
    onSectionChange 
  }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'SECTION',
      item: { id: section.id, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: !isFixed, // Prevent dragging if section is fixed (Personal Info)
    });

    const [, drop] = useDrop({
      accept: 'SECTION',
      hover: (draggedItem) => {
        if (draggedItem.index === index || isFixed) {
          return;
        }
        moveSection(draggedItem.index, index);
        draggedItem.index = index;
      },
    });

      return (
        <li 
          ref={isFixed ? null : (node) => drag(drop(node))}
          className={`
            ${styles.sectionItem} 
            ${isActive ? styles.activeSection : ''} 
            ${isComplete ? styles.completedSection : ''}
            ${isDragging ? styles.draggingSection : ''}
            ${isFixed ? styles.fixedSection : ''}
          `}
          onClick={() => onSectionChange(section.id)}
          style={{ opacity: isDragging ? 0.5 : 1 }}
        >
          <div className={styles.sectionStatus}>
            {isComplete ? (
              <span className={styles.completedIcon}>✓</span>
            ) : (
              <span className={styles.incompleteIcon}></span>
            )}
          </div>
          
          <span className={styles.sectionLabel}>{section.label}</span>
          
          {!isFixed && (
            <div className={styles.dragHandle}>
              <span className={styles.dragIcon}>☰</span>
            </div>
          )}
          
          {isActive && <div className={styles.activeIndicator}></div>}
        </li>
      );
    };
    
  // Add this inner moveSection function to work with the drag-and-drop
  const innerMoveSection = (fromIndex, toIndex) => {
    // Don't allow moving sections before Personal Info
    if (toIndex === 0) return;
    onReorderSections(fromIndex, toIndex);
    
    // Show hint animation on the reset button after a reordering
    setShowResetHint(true);
    // Hide the hint after 8 seconds
    setTimeout(() => setShowResetHint(false), 8000);
  };
  
  // Client-side rendering with DnD
  return (
    <div className={styles.navigationContainer}>
      <div className={styles.navigationHeader}>
        <div className={styles.navigationTitle}>Edit Sections</div>
        <div className={styles.resetButtonWrapper}>
          <button
            className={`${styles.resetOrderButton} ${showResetHint ? styles.showResetHint : ''}`}
            onClick={onResetSectionOrder}
            aria-label="Reset section order"
          >
            <span className={styles.resetIcon}>↻</span>
          </button>
          <span className={styles.tooltip}>Reset order</span>
        </div>
      </div>

      <ul className={styles.sectionsList}>
        {sections.map((section, index) => {
          const isComplete = completedSections[section.id];
          const isActive = activeSection === section.id;
          const isFixed = section.id === 'personalInfo' || section.id === 'summary'; // Personal Info + Summary are fixed

          return (
            <DraggableSectionItem
              key={section.id}
              section={section}
              index={index}
              isActive={isActive}
              isComplete={isComplete}
              isFixed={isFixed}
              moveSection={innerMoveSection}
              onSectionChange={onSectionChange}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default SectionNavigation; 