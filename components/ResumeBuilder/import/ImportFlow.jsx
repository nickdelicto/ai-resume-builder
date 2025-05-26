import React, { useState } from 'react';
import { useRouter } from 'next/router';
import ResumeImport from './ResumeImport';
import styles from './ImportFlow.module.css';

const ImportFlow = ({ onComplete }) => {
  const [stage, setStage] = useState('import'); // Only 'import' stage remains
  const router = useRouter();

  // Preprocess the resume data to ensure proper bullet point formatting
  const preprocessResumeData = (data) => {
    if (!data) return data;
    
    // Deep clone the data to avoid mutating the original
    const processedData = JSON.parse(JSON.stringify(data));
    
    // Process experience descriptions to ensure proper bullet formatting
    if (processedData.experience && Array.isArray(processedData.experience)) {
      processedData.experience = processedData.experience.map(exp => {
        if (exp.description) {
          // Check if the description has bullet points or appears to be a block of text
          const hasBulletFormats = 
            exp.description.includes('• ') || 
            exp.description.includes('- ') || 
            exp.description.includes('* ') ||
            exp.description.includes('\n');
            
          if (!hasBulletFormats && exp.description.length > 100) {
            // Long text without bullet formatting - attempt to split into logical points
            // Split on periods followed by spaces or newlines, but keep the periods
            const sentences = exp.description.match(/[^.!?]+[.!?]+/g) || [];
            
            if (sentences.length > 1) {
              // Format as bullet points with double newlines between them
              exp.description = sentences
                .map(s => s.trim())
                .filter(s => s.length > 10) // Remove very short fragments
                .join('\n\n');
            }
          } else if (exp.description.includes('• ') || exp.description.includes('- ') || exp.description.includes('* ')) {
            // Already has bullet points but may need normalization
            // Replace various bullet formats with standardized format
            const bulletLines = exp.description
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .map(line => {
                // Remove existing bullet characters and standardize format
                return line.replace(/^[•\-*]\s*/, '');
              });
              
            exp.description = bulletLines.join('\n\n');
          }
        }
        return exp;
      });
    }
    
    console.log('📊 ImportFlow - Preprocessed data descriptions for better bullet formatting');
    return processedData;
  };

  // When we have the parsed resume data from the import component
  const handleImportComplete = (data) => {
    console.log('📊 ImportFlow - Received data from ResumeImport:', data);
    console.log('📊 ImportFlow - Data structure check:', {
      hasPersonalInfo: !!data.personalInfo,
      personalInfoKeys: Object.keys(data.personalInfo || {}),
      experienceCount: data.experience?.length || 0,
      educationCount: data.education?.length || 0,
      skillsCount: data.skills?.length || 0
    });
    
    // Preprocess the data to ensure proper bullet point formatting
    const processedData = preprocessResumeData(data);
    
    // Skip confirmation step and directly call onComplete
    if (onComplete) {
      console.log('📊 ImportFlow - Passing processed data directly to parent, skipping confirmation');
      onComplete(processedData);
    }
  };

  // Content display based on current stage
  const renderContent = () => {
    // Only the import stage remains
    return <ResumeImport onComplete={handleImportComplete} />;
  };

  return (
    <div className={styles.importFlowContainer}>
      {renderContent()}
    </div>
  );
};

export default ImportFlow; 