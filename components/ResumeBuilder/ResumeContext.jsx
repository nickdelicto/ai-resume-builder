import React, { createContext, useContext } from 'react';

// Create the context
const ResumeContext = createContext(null);

// Provider component
export const ResumeProvider = ({ children, value }) => {
  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  );
};

// Hook for using the resume context
export const useResumeContext = () => {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResumeContext must be used within a ResumeProvider');
  }
  return context;
}; 