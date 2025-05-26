import React, { useState, useEffect } from 'react';
import styles from './SectionNavigation.module.css';

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
        <div className={styles.navigationTitle}>Resume Sections</div>
        
        <ul className={styles.sectionsList}>
          {sections.map((section, index) => {
            const isComplete = completedSections[section.id];
            const isActive = activeSection === section.id;
            const isFixed = section.id === 'personalInfo';
            
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
        
        <div className={styles.resetOrderInfo}>
          <small>Changed resume section order? You can restore the recommended order here.</small>
        </div>
        
        <button 
          className={styles.resetOrderButton}
          onClick={onResetSectionOrder}
          title="Return sections to recommended order"
        >
          <span className={styles.resetIcon}>↻</span> Restore Default Order
        </button>
      </div>
    );
  }
  
  // Use dynamic imports for browser-only code with proper ESM syntax
  // This code will only run on the client
  const DndComponents = () => {
    // Using useState and useEffect for dynamic imports
    const [dndModules, setDndModules] = useState(null);
    // State to track if we should show the reset hint animation
    const [showResetHint, setShowResetHint] = useState(false);
    
    useEffect(() => {
      const loadDndModules = async () => {
        try {
          // Dynamically import both modules
          const [dndModule, backendModule] = await Promise.all([
            import('react-dnd'),
            import('react-dnd-html5-backend')
          ]);
          
          setDndModules({
            DndProvider: dndModule.DndProvider,
            useDrag: dndModule.useDrag,
            useDrop: dndModule.useDrop,
            HTML5Backend: backendModule.HTML5Backend
          });
        } catch (error) {
          console.error('Error loading drag-and-drop modules:', error);
        }
      };
      
      loadDndModules();
    }, []);
    
    // Don't render anything until modules are loaded
    if (!dndModules) {
      return (
        <div className={styles.navigationContainer}>
          <div className={styles.navigationTitle}>Resume Sections</div>
          <ul className={styles.sectionsList}>
            {sections.map((section, index) => {
              const isComplete = completedSections[section.id];
              const isActive = activeSection === section.id;
              const isFixed = section.id === 'personalInfo';
              
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
          
          <div className={styles.resetOrderInfo}>
            <small>Changed resume section order? You can restore the recommended order here.</small>
          </div>
          
          <button 
            className={styles.resetOrderButton}
            onClick={onResetSectionOrder}
            title="Return sections to recommended order"
          >
            <span className={styles.resetIcon}>↻</span> Restore Default Order
          </button>
        </div>
      );
    }
    
    const { DndProvider, useDrag, useDrop } = dndModules;
    const { HTML5Backend } = dndModules;
    
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
      <DndProvider backend={HTML5Backend}>
        <div className={styles.navigationContainer}>
          <div className={styles.navigationTitle}>Resume Sections</div>
          
          <ul className={styles.sectionsList}>
            {sections.map((section, index) => {
              const isComplete = completedSections[section.id];
              const isActive = activeSection === section.id;
              const isFixed = section.id === 'personalInfo'; // Personal Info is fixed at the top
              
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
          
          <div className={styles.resetOrderInfo}>
            <small>Changed resume section order? You can restore the recommended order here.</small>
          </div>
          
          <button 
            className={`${styles.resetOrderButton} ${showResetHint ? styles.showResetHint : ''}`}
            onClick={onResetSectionOrder}
            title="Return sections to recommended order"
          >
            <span className={styles.resetIcon}>↻</span> Restore Default Order
          </button>
        </div>
      </DndProvider>
    );
  };
  
  return <DndComponents />;
};

export default SectionNavigation; 