import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './ResumeImport.module.css';

const ResumeImport = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState('idle'); // idle, uploading, parsing, success, error
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const inputRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);
  
  const onButtonClick = () => {
    inputRef.current.click();
  };
  
  const validateAndProcessFile = (file) => {
    // Check if file is provided
    if (!file) {
      setError('No file selected');
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    // Check file type
    const fileType = file.type;
    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'text/plain'
    ];
    
    const extension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['pdf', 'docx', 'txt'];
    
    if (!validTypes.includes(fileType) && !validExtensions.includes(extension)) {
      setError('Invalid file type. Please upload a PDF, DOCX, or TXT file');
      return;
    }
    
    // Process the file
    setFile(file);
    uploadAndParseResume(file);
  };
  
  const uploadAndParseResume = async (file) => {
    setError(null);
    setIsLoading(true);
    setCurrentStep('uploading');
    
    // Start progress animation
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);
    
    progressIntervalRef.current = interval;

    try {
      // Verify file object
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file); // Make sure this matches the key expected in the API
      
      // Add file extension as a separate field to help the server
      const fileExtension = file.name.split('.').pop().toLowerCase();
      formData.append('fileExtension', fileExtension);
      
      // Debug formData contents
      console.log('FormData contains file:', formData.has('file'));
      console.log('File extension:', fileExtension);

      // Upload the file to our API endpoint
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });
      
      // Complete the progress animation
      clearInterval(progressIntervalRef.current);
      setUploadProgress(100);
      
      // Process server response
      const result = await response.json();
      console.log('API response status:', response.status, 'API response data:', result);
      
      // Check if the request was successful
      if (!response.ok) {
        console.error('API error:', result);
        const errorMessage = result.error || result.details || 'Failed to parse resume';
        const errorCode = result.code || response.status;
        const errorType = result.type || 'unknown';
        
        console.log('Error details extracted from API:', {
          message: errorMessage,
          code: errorCode,
          type: errorType,
          details: result.details || null
        });
        
        // Special handling for extraction_incomplete error type
        if (errorType === 'extraction_incomplete') {
          console.log('Detected extraction_incomplete error type - handling specifically');
        }
        
              // Create a more detailed error object - preserve original error message for specific error types
      let finalErrorMessage = errorMessage;
      // Don't override format_error with generic server error
      if (errorType === 'format_error' || errorType === 'extraction_incomplete') {
        finalErrorMessage = `We couldn't properly analyze your resume: ${result.details || 'Insufficient data found'}`;
      }
      
      throw {
        message: finalErrorMessage,
        code: errorCode,
        type: errorType,
          details: result.details || null,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        };
      }

      // Switch to parsing animation after a short delay
      setTimeout(() => {
        setCurrentStep('parsing');
        
        // After "AI processing" visualization, show success
      setTimeout(() => {
        // Check if data is present and has expected structure
        if (!result.data) {
          throw {
            message: 'No data returned from the server',
            type: 'empty_response',
            fileName: file.name
          };
        }
        
        // Note: 'skills' removed - soft skills implied for nurses, clinical skills in healthcareSkills
        const requiredSections = ['personalInfo', 'experience', 'education'];
        const missingSections = requiredSections.filter(section => !result.data[section]);
        
        if (missingSections.length > 0) {
          console.warn('Warning: Some sections are missing from parsed data:', missingSections);
        }
        
        // Update state with the parsed data
        console.log('Parsed data received:', result.data ? 'Yes' : 'No');
        setParsedData(result.data);
        setIsLoading(false);
        setCurrentStep('success');
      }, 2500);
      }, 500);
      
    } catch (error) {
      console.error('Error parsing resume:', error);
      clearInterval(progressIntervalRef.current);
      
      // Determine error type and set appropriate message
      let errorMessage = '';
      let errorType = error.type || 'unknown';
      
      console.log('Processing error with type:', errorType, 'and code:', error.code);
      
      // Check for specific error types first, regardless of status code
      if (error.type === 'file_format') {
        errorMessage = `File format issue: The system couldn't process your ${error.fileName}. Please try a different file format.`;
      } else if (error.type === 'file_corrupted') {
        errorMessage = `Your file (${error.fileName}) appears to be damaged, unreadable, or in an unsupported format.`;
      } else if (error.type === 'extraction_failed') {
        errorMessage = `We couldn't extract text from your resume. The file might be password-protected or contain only images.`;
      } else if (error.type === 'extraction_incomplete') {
        errorMessage = `We couldn't extract enough meaningful information from your resume. The file appears to be valid, but doesn't contain adequate structured content for our system to process.`;
      } else if (error.type === 'empty_response') {
        errorMessage = 'We couldn\'t extract any information from your resume. Please try a cleaner PDF or DOCX file.';
      } else if (error.type === 'format_error') {
        errorMessage = `We couldn't process your resume: ${error.details || 'The file format could not be properly parsed'}.`;
      } else if (error.code === 413) {
        errorMessage = 'Your file is too large. Please upload a file smaller than 10MB.';
      } 
      // Only use generic server error if no specific error type was found
      else if (error.code >= 500 && errorType === 'unknown') {
        errorMessage = 'Server error. Our systems are experiencing issues. Please try again later.';
      } else {
        errorMessage = error.message || 'Failed to parse resume. Please try a different file.';
      }
      
      setError({
        message: errorMessage,
        code: error.code || 'unknown',
        type: errorType,
        fileName: file?.name || 'Unknown file'
      });
      
      setIsLoading(false);
      setCurrentStep('error');
    }
  };

  const handleContinue = () => {
    if (parsedData && onComplete) {
      // Log structure and content of parsed data
      console.log('📊 ResumeImport - Data being passed to parent component:', parsedData);
      console.log('📊 ResumeImport - personalInfo:', parsedData.personalInfo);
      console.log('📊 ResumeImport - experience entries:', parsedData.experience?.length || 0);
      console.log('📊 ResumeImport - education entries:', parsedData.education?.length || 0);
      console.log('📊 ResumeImport - skills count:', parsedData.skills?.length || 0);
      
      onComplete(parsedData);
    }
  };
  
  const handleRetry = () => {
    setError(null);
    setFile(null);
    setCurrentStep('idle');
  };
  
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const { files } = e.dataTransfer;
    if (files && files[0]) {
      validateAndProcessFile(files[0]);
    }
  };
  
  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault();
    const { files } = e.target;
    
    if (files && files[0]) {
      validateAndProcessFile(files[0]);
    }
  };
  
  // Render upload area
  const renderUploadArea = () => (
    <div 
      className={`${styles.uploadArea} ${isDragging ? styles.dragActive : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Background decoration element */}
      <div className={styles.uploadAreaDecoration}></div>
      
      <input
        ref={inputRef}
        type="file"
        className={styles.inputFile}
        onChange={handleChange}
        accept=".pdf,.docx,.txt"
      />
      
      <div className={styles.uploadIcon}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 8L12 4L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 4L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      <div className={styles.uploadText}>
        <h3 className={styles.uploadTitle}>Drag & Drop Your Resume</h3>
        <p>Upload your existing resume and we will extract all the important information</p>
        <button 
          type="button" 
          className={styles.browseButton}
          onClick={onButtonClick}
        >
          Browse Files
        </button>
        <p className={styles.supportedFormats}>
          Supported formats: PDF, DOCX, TXT
        </p>
      </div>
    </div>
  );
  
  // Render progress indicator
  const renderProgress = () => (
    <div className={styles.progressContainer}>
      <div className={styles.fileInfo}>
        <div className={styles.fileIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className={styles.fileName}>{file.name}</div>
      </div>
      
      <div className={styles.progressBarContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      
      <div className={styles.progressStatus}>
        {currentStep === 'uploading' && 'Uploading resume...'}
        {currentStep === 'parsing' && 'We are analyzing your resume...'}
      </div>
      
      {currentStep === 'parsing' && (
        <div className={styles.aiProcessing}>
          <div className={styles.processingAnimation}>
            <div className={styles.processingNode}></div>
            <div className={styles.processingNode}></div>
            <div className={styles.processingNode}></div>
          </div>
          <div className={styles.processingText}>
            <p>Extracting skills...</p>
            <p>Identifying experience...</p>
            <p>Formatting education details...</p>
          </div>
        </div>
      )}
    </div>
  );
  
  // Render error state
  const renderError = () => {
    // Get appropriate error message and recommendation
    let recommendation = '';
    let errorTitle = 'Something went wrong';
    
    if (typeof error === 'object') {
      console.log('Rendering error of type:', error.type, 'Full error object:', error);
      
      if (error.type === 'file_format') {
        errorTitle = 'Unsupported File Format';
        recommendation = 'Try converting your resume to PDF or DOCX format and upload again.';
      } else if (error.type === 'file_corrupted') {
        errorTitle = 'File Corrupted';
        recommendation = 'Try reopening your file and saving it as a new PDF or DOCX.';
      } else if (error.type === 'extraction_failed') {
        errorTitle = 'Text Extraction Failed';
        recommendation = 'Try a plain text version of your resume.';
      } else if (error.type === 'extraction_incomplete') {
        errorTitle = 'Incomplete Data';
        recommendation = 'Please ensure your resume has clear sections for personal information, work experience, education, skills, etc. You can also build a new resume from scratch below.';
      } else if (error.type === 'empty_response') {
        errorTitle = 'No Data Extracted';
        recommendation = 'Try a file with clearer text formatting or manually enter your information.';
      } else if (error.type === 'format_error') {
        errorTitle = 'Format Error';
        recommendation = 'Try a different file of an actual resume or build a new resume from scratch below.';
      } else if (error.code === 413) {
        errorTitle = 'File Too Large';
        recommendation = 'Compress your file or remove images to reduce its size.';
      } else if (error.code >= 500) {
        errorTitle = 'Server Error';
        recommendation = 'Please try again later. Our team has been notified of the issue.';
      }
    }
    
    const errorMessage = typeof error === 'object' ? error.message : error;
    
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className={styles.errorTitle}>Oops! {errorTitle}</h3>
        <p className={styles.errorMessage}>{errorMessage}</p>
        
        {recommendation && (
          <p className={styles.errorMessage} style={{ marginTop: '10px', opacity: 0.8 }}>
            <strong>Recommendation:</strong> {recommendation}
          </p>
        )}
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button 
            type="button" 
            className={styles.retryButton}
            onClick={handleRetry}
          >
            Try Again
          </button>
          
          {/* Option to skip import and start from scratch */}
          <button 
            type="button" 
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#505050'
            }}
            onClick={() => window.location.href = '/new-resume-builder?mode=builder'}
          >
            Build New Resume
          </button>
        </div>
      </div>
    );
  };
  
  // Render success state
  const renderSuccess = () => {
    // Calculate completeness percentage based on required fields
    const calculateCompleteness = () => {
      let score = 0;
      let total = 0;
      
      // Check personal info fields
      const personalInfoFields = ['name', 'email', 'phone', 'location'];
      personalInfoFields.forEach(field => {
        total++;
        if (parsedData?.personalInfo?.[field]) score++;
      });
      
      // Check for experience entries
      total += 2; // We'll count experience as 2 points of importance
      if (parsedData?.experience?.length > 0) {
        score += 1;
        // Bonus point if we have good experience details
        if (parsedData.experience.some(exp => exp.title && exp.company && exp.description)) {
          score += 1;
        }
      }
      
      // Check for education entries
      total++;
      if (parsedData?.education?.length > 0) score++;
      
      // Check for skills
      total++;
      if (parsedData?.skills?.length >= 3) score++;
      
      // Check for certifications and languages (additional point)
      total++;
      if ((parsedData?.additional?.certifications?.length > 0) || 
          (parsedData?.additional?.languages?.length > 0)) {
        score++;
      }
      
      return Math.round((score / total) * 100);
    };
    
    const completenessScore = calculateCompleteness();
    
    // Function to render completeness indicator
    const renderCompletenessIndicator = () => {
      let statusText = '';
      
      if (completenessScore >= 90) {
        statusText = 'Excellent! We found nearly all information from your resume.';
      } else if (completenessScore >= 70) {
        statusText = 'Great! Most of your resume details were successfully extracted.';
      } else if (completenessScore >= 50) {
        statusText = 'Good start! We found some information from your resume.';
      } else {
        statusText = 'We extracted some basic information. You\'ll need to add more details.';
      }
      
      return (
        <div className={styles.completenessIndicator}>
          <div className={styles.completenessScore}>
            <div 
              className={styles.scoreRing} 
              style={{ '--score': completenessScore }}
            >
              <div className={styles.scoreValue}>
                {completenessScore}<small>%</small>
              </div>
            </div>
          </div>
          <div className={styles.completenessText}>
            {statusText}
          </div>
        </div>
      );
    };
    
    // Format list items with proper styling
    const formatList = (items, limit = 3) => {
      if (!items || items.length === 0) {
        return <span className={styles.noDataMessage}>No data extracted</span>;
      }
      
      const displayItems = items.slice(0, limit);
      const remainingCount = Math.max(0, items.length - limit);
      
      return (
        <div>
          {displayItems.map((item, index) => (
            <div key={index} className={styles.dataListItem}>
              {typeof item === 'string' ? item : 'Item ' + (index + 1)}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className={styles.dataListItem}>
              And {remainingCount} more...
            </div>
          )}
        </div>
      );
    };
    
    // Format language skills specifically
    const formatLanguages = (languages, limit = 3) => {
      if (!languages || languages.length === 0) return null;
      
      const displayItems = languages.slice(0, limit);
      const remainingCount = Math.max(0, languages.length - limit);
      
      return (
        <div>
          {displayItems.map((lang, index) => (
            <div key={index} className={styles.dataListItem}>
              {typeof lang === 'string' ? lang : 
               lang.language ? `${lang.language}${lang.proficiency ? ` (${lang.proficiency})` : ''}` : 
               'Language ' + (index + 1)}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className={styles.dataListItem}>
              And {remainingCount} more languages...
            </div>
          )}
        </div>
      );
    };
    
    // Format certifications specifically
    const formatCertifications = (certifications, limit = 2) => {
      if (!certifications || certifications.length === 0) return null;
      
      const displayItems = certifications.slice(0, limit);
      const remainingCount = Math.max(0, certifications.length - limit);
      
      return (
        <div>
          {displayItems.map((cert, index) => (
            <div key={index} className={styles.dataListItem}>
              {typeof cert === 'string' ? cert : 
               cert.name ? cert.name : 
               'Certification ' + (index + 1)}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className={styles.dataListItem}>
              And {remainingCount} more certifications...
            </div>
          )}
        </div>
      );
    };
    
    return (
      <div className={styles.successContainer}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Resume Successfully Imported!</h2>
        <p className={styles.successMessage}>
          We've extracted the following information from your resume. 
          {/* Continue below to build & enhance your professional resume. */}
        </p>
        
        {renderCompletenessIndicator()}
        
        <div className={styles.dataPreview}>
          <div className={styles.dataSection}>
            <h4>Personal Information</h4>
            <p>
              {parsedData?.personalInfo?.name ? (
                <strong>{parsedData.personalInfo.name}</strong>
              ) : (
                <span style={{ color: '#dc3545' }}>No name found</span>
              )}
              <br />
              {parsedData?.personalInfo?.email ? (
                parsedData.personalInfo.email
              ) : (
                <span style={{ color: '#dc3545' }}>No email found</span>
              )}
              {parsedData?.personalInfo?.phone && <span> • {parsedData.personalInfo.phone}</span>}
              {parsedData?.personalInfo?.location && <span> • {parsedData.personalInfo.location}</span>}
            </p>
            {(!parsedData?.personalInfo?.name || !parsedData?.personalInfo?.email) && (
              <p style={{ fontSize: '13px', color: '#dc3545', marginTop: '10px' }}>
                <strong>Note:</strong> Some essential contact information is missing. 
              </p>
            )}
          </div>
          
          <div className={styles.dataSection}>
            <h4>Professional Experience</h4>
            {parsedData?.experience && parsedData.experience.length > 0 ? (
              <>
                <p>
                  <strong>{parsedData.experience.length}</strong> job entries found
                </p>
                {formatList(parsedData.experience.map(exp => 
                  `${exp.title || 'Position'} at ${exp.company || 'Company'}`
                ))}
              </>
            ) : (
              <p style={{ color: '#dc3545' }}>No experience data found</p>
            )}
          </div>
          
          <div className={styles.dataSection}>
            <h4>Education</h4>
            {parsedData?.education && parsedData.education.length > 0 ? (
              <>
                <p>
                  <strong>{parsedData.education.length}</strong> education entries found
                </p>
                {formatList(parsedData.education.map(edu => 
                  `${edu.degree || edu.studyField || 'Degree'} from ${edu.school || 'Institution'}`
                ))}
              </>
            ) : (
              <p style={{ color: '#dc3545' }}>No education data found</p>
            )}
          </div>
          
          <div className={styles.dataSection}>
            <h4>Skills & Additional Information</h4>
            {parsedData?.skills && parsedData.skills.length > 0 ? (
              <>
                <p>
                  <strong>{parsedData.skills.length}</strong> skills identified
                </p>
                {formatList(parsedData.skills)}
              </>
            ) : (
              <p style={{ color: '#dc3545' }}>No skills found</p>
            )}
            
            {parsedData?.additional && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                {parsedData.additional.languages && parsedData.additional.languages.length > 0 && (
                  <>
                    <p style={{ marginBottom: '5px' }}><strong>Languages:</strong></p>
                    {formatLanguages(parsedData.additional.languages)}
                  </>
                )}
                
                {parsedData.additional.certifications && parsedData.additional.certifications.length > 0 && (
                  <>
                    <p style={{ marginBottom: '5px', marginTop: '10px' }}><strong>Certifications:</strong></p>
                    {formatCertifications(parsedData.additional.certifications)}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        <button 
          className={styles.continueButton}
          onClick={handleContinue}
        >
          Continue to Resume Builder
          <svg width="20" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginLeft: "10px", position: "relative", top: "1px"}}>
            <path d="M1 8H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 2L23 8L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    );
  };
  
  return (
    <div className={styles.importContainer}>
      <div className={styles.importHeader}>
        <h2 className={styles.importTitle}>Import Your Existing Resume</h2>
        <p className={styles.importDescription}>
          Upload your resume and we will automatically extract your information to jumpstart your new professional resume
        </p>
      </div>
      
      <div className={styles.importContent}>
        {currentStep === 'idle' && renderUploadArea()}
        {(currentStep === 'uploading' || currentStep === 'parsing') && renderProgress()}
        {currentStep === 'error' && renderError()}
        {currentStep === 'success' && renderSuccess()}
      </div>
    </div>
  );
};

export default ResumeImport; 