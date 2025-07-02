import React, { createContext, useContext } from 'react';
import ResumeSelectionModal from './ResumeSelectionModal';
import useResumeSelectionModal from '../../hooks/useResumeSelectionModal';

// Create context
const ResumeSelectionContext = createContext(null);

/**
 * Provider component for resume selection modal
 * Makes the modal and its functionality available throughout the app
 */
export const ResumeSelectionProvider = ({ children }) => {
  const {
    isModalOpen,
    openModal,
    closeModal,
    handleResumeSelect,
    checkAndHandlePricingNavigation
  } = useResumeSelectionModal();

  return (
    <ResumeSelectionContext.Provider
      value={{
        openResumeSelectionModal: openModal,
        navigateToPricing: checkAndHandlePricingNavigation
      }}
    >
      {children}
      <ResumeSelectionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSelectResume={handleResumeSelect}
      />
    </ResumeSelectionContext.Provider>
  );
};

/**
 * Custom hook to use the resume selection context
 * @returns {Object} Resume selection context
 */
export const useResumeSelection = () => {
  const context = useContext(ResumeSelectionContext);
  if (!context) {
    throw new Error('useResumeSelection must be used within a ResumeSelectionProvider');
  }
  return context;
};

export default ResumeSelectionProvider; 