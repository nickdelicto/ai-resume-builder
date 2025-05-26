import React, { useState, useEffect, useRef } from 'react';
import { ResumeProvider } from '../ResumeBuilder/ResumeContext';
import SectionNavigation from '../ResumeBuilder/ui/SectionNavigation';
import ProgressBar from '../ResumeBuilder/ui/ProgressBar';
import Celebrations from '../ResumeBuilder/ui/Celebrations';
import ResumePreview from '../ResumeBuilder/ui/ResumePreview';
import PersonalInfo from '../ResumeBuilder/sections/PersonalInfo';
import Summary from '../ResumeBuilder/sections/Summary';
import Experience from '../ResumeBuilder/sections/Experience';
import Education from '../ResumeBuilder/sections/Education';
import Skills from '../ResumeBuilder/sections/Skills';
import AdditionalInfo from '../ResumeBuilder/sections/AdditionalInfo';
import { saveResumeData as saveToLocalStorage, getResumeData as getFromLocalStorage, saveResumeProgress, getResumeProgress } from '../ResumeBuilder/utils/localStorage';
import { loadResumeData, saveResumeData } from '../../lib/resumeUtils';
import styles from './ModernResumeBuilder.module.css';
import Head from 'next/head';
import TemplateSelector from '../ResumeBuilder/ui/TemplateSelector';
import { FaArrowLeft, FaPencilAlt, FaBriefcase, FaInfoCircle, FaTimes, FaLightbulb, FaSpinner, FaDownload } from 'react-icons/fa';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { startNewResume } from '../../lib/resumeUtils';

/**
 * Job Description Modal Component for editing job details
 * Used for changing job targeting context without losing resume data
 */
const JobDescriptionModal = ({ isOpen, onClose, currentJobContext, onUpdateJobContext }) => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Initialize form with current job context when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Debug - Current job context:', currentJobContext);
      
      if (currentJobContext) {
        // Try multiple possible property names for title to handle inconsistencies
        const title = currentJobContext.jobTitle || currentJobContext.title || currentJobContext.position || '';
        setJobTitle(title);
        setJobDescription(currentJobContext.description || currentJobContext.jobDescription || '');
      } else {
        // If no job context, try to load from localStorage directly
        try {
          const savedJobContext = localStorage.getItem('job_targeting_context');
          if (savedJobContext) {
            const parsedContext = JSON.parse(savedJobContext);
            console.log('Debug - Loaded from localStorage:', parsedContext);
            
            const title = parsedContext.jobTitle || parsedContext.title || parsedContext.position || '';
            setJobTitle(title);
            setJobDescription(parsedContext.description || parsedContext.jobDescription || '');
          }
        } catch (error) {
          console.error('Error loading job context from localStorage:', error);
        }
      }
    }
  }, [isOpen, currentJobContext]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!jobTitle.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }
    
    // Simulate analysis process
    setIsAnalyzing(true);
    
    setTimeout(() => {
      // Create updated job context with consistent property naming
      const updatedJobContext = {
        jobTitle: jobTitle.trim(),  // Always use jobTitle as the standard property name
        description: jobDescription.trim(),  // Always use description as the standard property name
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Debug - Created job context in modal:', updatedJobContext);
      
      // Save to localStorage with consistent property names
      localStorage.setItem('job_targeting_context', JSON.stringify(updatedJobContext));
      
      // Update parent component
      onUpdateJobContext(updatedJobContext);
      
      setIsAnalyzing(false);
      onClose();
      
      // Show success message
      toast.success('Job description updated successfully');
    }, 1500);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Change Job Description</h2>
          <button className={styles.modalCloseButton} onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label htmlFor="jobTitle" className={styles.formLabel}>Job Title<span style={{color: 'var(--primary-blue)'}}>*</span></label>
              <input
                id="jobTitle"
                type="text"
                className={styles.formInput}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="jobDescription" className={styles.formLabel}>Job Description<span style={{color: 'var(--primary-blue)'}}>*</span></label>
              <textarea
                id="jobDescription"
                className={`${styles.formInput} ${styles.textareaInput}`}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                required
              />
              <small style={{
                display: 'block',
                marginTop: '8px',
                fontSize: '13px',
                color: 'var(--text-light, #6c757d)'
              }}>
                Include skills, requirements, and responsibilities from the job posting
              </small>
            </div>
            
            <div className={styles.modalInfo}>
              <FaInfoCircle className={styles.infoIcon} />
              <p>
                Changing the job description will update the tailoring recommendations for your resume. 
                Your current resume data will be preserved, but you may want to review each section to 
                ensure it aligns with the new job requirements.
              </p>
            </div>
          </div>
          
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.analyzeButton}
              disabled={isAnalyzing || !jobTitle.trim() || !jobDescription.trim()}
            >
              {isAnalyzing ? (
                <>
                  <FaSpinner className={styles.spinnerIcon} />
                  Analyzing...
                </>
              ) : (
                <>
                  <FaLightbulb className={styles.analyzeIcon} />
                  Update Job Context
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModernResumeBuilder = ({ 
  initialData = null, 
  jobContext = null, 
  isAuthenticated = false,
  resumeId = null,
  isNavigatingAway = false
}) => {
  // Add router for navigation
  const router = useRouter();
  
  // Add ref for scrolling to preview
  const previewRef = useRef(null);
  
  // Job description modal state
  const [isJobDescriptionModalOpen, setIsJobDescriptionModalOpen] = useState(false);
  const [internalJobContext, setInternalJobContext] = useState(jobContext);
  
  // Add state for current resume ID (for saving to database)
  const [currentResumeId, setCurrentResumeId] = useState(() => {
    // DEBUG: Log all localStorage keys at initialization time
    if (typeof window !== 'undefined') {
      console.log('📊 DEBUG - INIT - localStorage keys:', Object.keys(localStorage));
      console.log('📊 DEBUG - INIT - resumeId from prop:', resumeId);
      console.log('📊 DEBUG - INIT - resumeId in localStorage:', localStorage.getItem('current_resume_id'));
      console.log('📊 DEBUG - INIT - starting_new_resume flag:', localStorage.getItem('starting_new_resume'));
    }
    
    // IMPORTANT: Check if we're starting a new resume first - this takes priority over everything
    if (typeof window !== 'undefined' && localStorage.getItem('starting_new_resume') === 'true') {
      console.log('📊 DEBUG - INIT - Found starting_new_resume flag, returning null for resumeId');
      return null;
    }
    
    // Initialize from prop if provided
    if (resumeId) {
      console.log('📊 Initializing currentResumeId from prop:', resumeId);
      return resumeId;
    }
    
    // Try to get from localStorage if available (for consistency across refreshes)
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('current_resume_id');
      if (storedId) {
        console.log('📊 Retrieved resumeId from localStorage:', storedId);
        return storedId;
      }
    }
    
    console.log('📊 No resumeId found, starting with null');
    return null;
  });
  
  // Ensure currentResumeId stays updated if resumeId prop changes
  useEffect(() => {
    if (resumeId && resumeId !== currentResumeId) {
      console.log('📊 resumeId prop changed, updating currentResumeId:', resumeId);
      setCurrentResumeId(resumeId);
      
      // Also update localStorage
      localStorage.setItem('current_resume_id', resumeId);
    }
  }, [resumeId, currentResumeId]);
  
  // Add state for auto-save
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Add state for resume name
  const [resumeName, setResumeName] = useState('');
  const [nameValidationMessage, setNameValidationMessage] = useState('');
  const [isValidatingName, setIsValidatingName] = useState(false);
  
  // Add state to track if resume has been modified since last save
  const [resumeModified, setResumeModified] = useState(false);
  
  // Add a ref to track if this is the initial load
  const initialLoadRef = useRef(true);
  const previousResumeDataRef = useRef(null);
  
  // Add state for showing auto-save indicator
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  
  // Update internal job context when prop changes
  useEffect(() => {
    console.log('📊 ModernResumeBuilder - jobContext prop received:', jobContext);
    
    if (jobContext) {
      // Normalize incoming job context
      const normalizedJobContext = {
        jobTitle: jobContext.jobTitle || jobContext.title || jobContext.position || '',
        description: jobContext.description || jobContext.jobDescription || '',
        lastUpdated: jobContext.lastUpdated || new Date().toISOString()
      };
      console.log('📊 ModernResumeBuilder - Normalized job context from prop:', normalizedJobContext);
      setInternalJobContext(normalizedJobContext);
    } else {
      // Check if we have job context in localStorage
      const savedJobContext = localStorage.getItem('job_targeting_context');
      console.log('📊 ModernResumeBuilder - No prop, checking localStorage:', savedJobContext ? 'Found' : 'Not found');
      
      if (savedJobContext) {
        try {
          const parsedContext = JSON.parse(savedJobContext);
          console.log('📊 ModernResumeBuilder - Parsed from localStorage:', parsedContext);
          
          // Normalize the loaded job context
          const normalizedJobContext = {
            jobTitle: parsedContext.jobTitle || parsedContext.title || parsedContext.position || '',
            description: parsedContext.description || parsedContext.jobDescription || '',
            lastUpdated: parsedContext.lastUpdated || new Date().toISOString()
          };
          
          console.log('📊 ModernResumeBuilder - Final normalized context:', normalizedJobContext);
          setInternalJobContext(normalizedJobContext);
        } catch (error) {
          console.error('Error parsing job context from localStorage', error);
          setInternalJobContext(null);
        }
      } else {
        console.log('📊 ModernResumeBuilder - No job context found anywhere, setting to null');
        setInternalJobContext(null);
      }
    }
  }, [jobContext]);
  
  // Define all resume sections in order
  const defaultSections = [
    { id: 'personalInfo', label: 'Personal Info', component: PersonalInfo },
    { id: 'summary', label: 'Summary', component: Summary },
    { id: 'experience', label: 'Experience', component: Experience },
    { id: 'education', label: 'Education', component: Education },
    { id: 'skills', label: 'Skills', component: Skills },
    { id: 'additional', label: 'Additional', component: AdditionalInfo },
  ];
  
  // Section order state
  const [sectionOrder, setSectionOrder] = useState(() => {
    // Try to load saved section order from localStorage
    try {
      const savedOrder = localStorage.getItem('resume_section_order');
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder);
        // Ensure personalInfo is first
        if (parsedOrder[0] !== 'personalInfo') {
          // Move personalInfo to first position if it exists in the array
          const personalInfoIndex = parsedOrder.indexOf('personalInfo');
          if (personalInfoIndex !== -1) {
            parsedOrder.splice(personalInfoIndex, 1);
            parsedOrder.unshift('personalInfo');
          } else {
            // If personalInfo doesn't exist, add it
            parsedOrder.unshift('personalInfo');
          }
        }
        return parsedOrder;
      }
    } catch (error) {
      console.error('Error loading section order:', error);
    }
    
    // Default order if no saved order exists
    return defaultSections.map(section => section.id);
  });
  
  // Get ordered sections
  const orderedSections = sectionOrder.map(
    sectionId => defaultSections.find(s => s.id === sectionId)
  ).filter(Boolean); // Filter out any undefined sections
  
  // Default template for new resumes
  const defaultTemplate = {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      website: ''
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    additional: {
      certifications: [],
      projects: [],
      languages: [],
      volunteer: [],
      awards: []
    }
  };
  
  // Check for imported data in localStorage
  const checkForImportedData = () => {
    try {
      const importedData = localStorage.getItem('imported_resume_data');
      if (!importedData) {
        return null;
      }

      console.log('📊 DETECTED IMPORTED RESUME DATA');
      
      // Parse the JSON data
      const parsedData = JSON.parse(importedData);
      
      // Validate the imported data structure
      const isValidData = parsedData && 
        typeof parsedData === 'object' &&
        !Array.isArray(parsedData);
      
      if (!isValidData) {
        console.error('📊 INVALID IMPORTED DATA FORMAT:', parsedData);
        return null;
      }
      
      // Log the structure of the parsed data
      console.log('📊 IMPORTED DATA STRUCTURE:', {
        hasPersonalInfo: !!parsedData.personalInfo,
        personalInfoKeys: parsedData.personalInfo ? Object.keys(parsedData.personalInfo) : [],
        hasSummary: typeof parsedData.summary === 'string',
        summaryLength: typeof parsedData.summary === 'string' ? parsedData.summary.length : 0,
        experienceCount: Array.isArray(parsedData.experience) ? parsedData.experience.length : 'Not an array',
        educationCount: Array.isArray(parsedData.education) ? parsedData.education.length : 'Not an array',
        skillsCount: Array.isArray(parsedData.skills) ? parsedData.skills.length : 'Not an array',
        hasAdditional: !!parsedData.additional,
        additionalSections: parsedData.additional ? Object.keys(parsedData.additional) : []
      });
      
      // Validate critical sections
      const validateSection = (section, expectedType) => {
        if (section === undefined) return false;
        
        if (expectedType === 'array') {
          return Array.isArray(section);
        } else if (expectedType === 'object') {
          return typeof section === 'object' && !Array.isArray(section) && section !== null;
        } else if (expectedType === 'string') {
          return typeof section === 'string';
        }
        
        return false;
      };
      
      const validation = {
        personalInfo: validateSection(parsedData.personalInfo, 'object'),
        experience: validateSection(parsedData.experience, 'array'),
        education: validateSection(parsedData.education, 'array'),
        skills: validateSection(parsedData.skills, 'array')
      };
      
      const isDataUsable = validation.personalInfo || 
                           validation.experience || 
                           validation.education || 
                           validation.skills;
      
      if (!isDataUsable) {
        console.error('📊 IMPORTED DATA IS MISSING CRITICAL SECTIONS:', validation);
        return null;
      }
      
      console.log('📊 IMPORTED DATA VALIDATION PASSED:', validation);
      return parsedData;
    } catch (error) {
      console.error('📊 ERROR PARSING IMPORTED DATA:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('imported_resume_data');
      return null;
    }
  };

  // Try to get imported data first
  const importedResumeData = checkForImportedData();
  
  // Use imported data if available, otherwise fall back to initialData or savedData
  const [resumeData, setResumeData] = useState(() => {
    // First try to use imported data
    if (importedResumeData) {
      console.log('📊 USING IMPORTED DATA FOR INITIALIZATION');
      
      // Helper function to detect if an education item is actually a certificate
      const isCertificate = (eduItem) => {
        // More comprehensive list of certificate keywords
        const certificateKeywords = [
          'certificate', 'certification', 'certified', 'diploma', 'course', 'training',
          'workshop', 'seminar', 'professional development', 'credential', 'license',
          'bootcamp', 'nanodegree', 'specialization', 'microcredential', 'microdegree', 
          'professional certificate', 'udemy', 'coursera', 'edx', 'skillshare', 'linkedin learning'
        ];
        
        // Keywords that typically indicate formal education
        const formalEducationKeywords = [
          'bachelor', 'master', 'phd', 'doctorate', 'undergraduate', 'graduate', 
          'bs', 'ba', 'ms', 'ma', 'mba', 'bsc', 'msc', 'university', 'college'
        ];
        
        // Check the degree field for certificate keywords
        if (eduItem.degree) {
          const degreeLower = eduItem.degree.toLowerCase();
          
          // First check if it's clearly formal education
          if (formalEducationKeywords.some(keyword => degreeLower.includes(keyword))) {
            return false; // This is formal education, not a certificate
          }
          
          // Then check if it matches certificate keywords
          if (certificateKeywords.some(keyword => degreeLower.includes(keyword))) {
            return true;
          }
        }
        
        // Check the school field for training providers rather than academic institutions
        if (eduItem.school) {
          const schoolLower = eduItem.school.toLowerCase();
          
          // If it has university/college, likely formal education
          if (schoolLower.includes('university') || 
              schoolLower.includes('college') || 
              schoolLower.includes('institute of technology')) {
            return false;
          }
          
          // If it mentions certificate providers or training terms
          if (schoolLower.includes('course') || 
              schoolLower.includes('workshop') || 
              schoolLower.includes('training') ||
              schoolLower.includes('certificate') ||
              schoolLower.includes('udemy') ||
              schoolLower.includes('coursera') ||
              schoolLower.includes('skillshare') ||
              schoolLower.includes('learning platform')) {
            return true;
          }
        }
        
        // Duration-based check (certificates are typically shorter)
        if (eduItem.startDate && eduItem.endDate) {
          try {
            const start = new Date(eduItem.startDate);
            const end = new Date(eduItem.endDate);
            
            // If duration is less than 3 months, likely a certificate
            if (start && end && end - start < 1000 * 60 * 60 * 24 * 90) {
              return true;
            }
          } catch (e) {
            // Date parsing failed, skip this check
          }
        }
        
        // Check description for certificate hints
        if (eduItem.description) {
          const descLower = eduItem.description.toLowerCase();
          if (certificateKeywords.some(keyword => descLower.includes(keyword))) {
            return true;
          }
        }
        
        return false;
      };
      
      // Helper function to detect language skills
      const isLanguageSkill = (skill) => {
        if (!skill || typeof skill !== 'string') return false;
        
        const skillLower = skill.toLowerCase();
        
        // Check for language mentions
        if (skillLower.includes('fluent in') || 
            skillLower.includes('proficient in') || 
            skillLower.includes('native') ||
            skillLower.includes('speaker') ||
            skillLower.includes('language') ||
            skillLower.includes('bilingual') ||
            skillLower.includes('multilingual') ||
            skillLower.includes('translator') ||
            skillLower.includes('interpretation')) {
          return true;
        }
        
        // Common languages - extended list
        const commonLanguages = [
          'english', 'spanish', 'french', 'german', 'italian', 'portuguese', 
          'russian', 'mandarin', 'chinese', 'japanese', 'korean', 'arabic',
          'hindi', 'bengali', 'urdu', 'swahili', 'dutch', 'swedish', 'norwegian',
          'danish', 'finnish', 'polish', 'turkish', 'vietnamese', 'thai',
          'greek', 'hebrew', 'farsi', 'persian', 'lingala', 'cantonese',
          'punjabi', 'tagalog', 'filipino', 'indonesian', 'malay', 'tamil',
          'telugu', 'marathi', 'gujarati', 'ukrainian', 'czech', 'slovak',
          'romanian', 'hungarian', 'bulgarian', 'serbian', 'croatian', 'latin',
          'amharic', 'somali', 'hausa', 'igbo', 'yoruba', 'zulu', 'xhosa',
          'afrikaans', 'malagasy', 'nepali', 'khmer', 'lao', 'burmese', 'mongol'
        ];
        
        // Check if the skill directly matches a language
        return commonLanguages.some(lang => 
          skillLower === lang || 
          skillLower.startsWith(lang + ' ') || 
          skillLower.includes(' ' + lang + ' ') ||
          skillLower.endsWith(' ' + lang)
        );
      };
      
      // Helper function to extract language name from skill
      const extractLanguageName = (skill) => {
        if (!skill || typeof skill !== 'string') return null;
        
        const skillLower = skill.toLowerCase();
        
        // Patterns: "Fluent in X", "X speaker", etc.
        if (skillLower.startsWith('fluent in ')) return capitalizeFirstLetter(skill.substring(10).trim());
        if (skillLower.startsWith('proficient in ')) return capitalizeFirstLetter(skill.substring(14).trim());
        if (skillLower.includes('native speaker of ')) {
          const parts = skill.split('native speaker of ');
          if (parts.length > 1) return capitalizeFirstLetter(parts[1].trim());
        }
        if (skillLower.includes(' speaker')) {
          const parts = skill.split(' speaker');
          if (parts.length > 0) return capitalizeFirstLetter(parts[0].trim());
        }
        
        // Common languages check - extended list
        const commonLanguages = [
          'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
          'Russian', 'Mandarin', 'Chinese', 'Japanese', 'Korean', 'Arabic',
          'Hindi', 'Bengali', 'Urdu', 'Swahili', 'Dutch', 'Swedish', 'Norwegian',
          'Danish', 'Finnish', 'Polish', 'Turkish', 'Vietnamese', 'Thai',
          'Greek', 'Hebrew', 'Farsi', 'Persian', 'Lingala', 'Cantonese',
          'Punjabi', 'Tagalog', 'Filipino', 'Indonesian', 'Malay', 'Tamil',
          'Telugu', 'Marathi', 'Gujarati', 'Ukrainian', 'Czech', 'Slovak',
          'Romanian', 'Hungarian', 'Bulgarian', 'Serbian', 'Croatian', 'Latin',
          'Amharic', 'Somali', 'Hausa', 'Igbo', 'Yoruba', 'Zulu', 'Xhosa',
          'Afrikaans', 'Malagasy', 'Nepali', 'Khmer', 'Lao', 'Burmese', 'Mongolian'
        ];
        
        // Helper function to capitalize first letter
        function capitalizeFirstLetter(string) {
          if (!string) return '';
          return string.charAt(0).toUpperCase() + string.slice(1);
        }
        
        for (const lang of commonLanguages) {
          if (skillLower.includes(lang.toLowerCase())) {
            // If skill is just the language name or clearly about the language,
            // return the proper cased language name
            if (skillLower === lang.toLowerCase() || 
                skillLower.includes(`${lang.toLowerCase()} language`) ||
                skillLower.includes(`${lang.toLowerCase()} speaker`) ||
                skillLower.startsWith(`${lang.toLowerCase()} `) ||
                skillLower.endsWith(` ${lang.toLowerCase()}`)) {
              return lang;
            }
          }
        }
        
        // If we can't clearly extract just the language name, return the whole skill
        return skill;
      };
      
      // Separate education and certificates
      const educationEntries = [];
      const certificateEntries = [];
      
      if (Array.isArray(importedResumeData.education)) {
        importedResumeData.education.forEach(edu => {
          // Skip entries with no degree or school information
          if (!edu.degree && !edu.school) return;
          
          if (isCertificate(edu)) {
            certificateEntries.push({
              name: edu.degree || '',
              issuer: edu.school || '',
              date: edu.endDate || '',
              description: edu.description || ''
            });
          } else {
            educationEntries.push({
              degree: edu.degree || '',
              school: edu.school || '',
              location: edu.location || '',
              startDate: edu.startDate || '',
              endDate: edu.endDate || '',
              description: edu.description || '',
              isCurrentlyStudying: !!edu.isCurrentlyStudying
            });
          }
        });
      }
      
      // Extract languages from skills
      const skills = Array.isArray(importedResumeData.skills) ? 
        importedResumeData.skills.filter(skill => {
          return typeof skill === 'string' && skill.trim() !== '' && !isLanguageSkill(skill);
        }) : [];
      
      const languageSkills = Array.isArray(importedResumeData.skills) ?
        importedResumeData.skills.filter(skill => typeof skill === 'string' && isLanguageSkill(skill)) : [];
      
      const languageEntries = [];
      
      // Look for languages in skills
      languageSkills.forEach(skill => {
        const languageName = extractLanguageName(skill);
        if (languageName) {
          // Only add if not already in the languages array
          if (!languageEntries.some(lang => 
              lang.language.toLowerCase() === languageName.toLowerCase())) {
            languageEntries.push({
              language: languageName,
              proficiency: 'Fluent' // Default to "Fluent" as requested
            });
          }
        }
      });
      
      // Add any languages from the additional section if present
      if (importedResumeData.additional && 
          Array.isArray(importedResumeData.additional.languages)) {
        importedResumeData.additional.languages.forEach(lang => {
          // If it's a string, convert to object format
          if (typeof lang === 'string') {
            const langName = lang.trim();
            if (langName && !languageEntries.some(l => 
                l.language.toLowerCase() === langName.toLowerCase())) {
              languageEntries.push({
                language: langName,
                proficiency: 'Fluent'
              });
            }
          } 
          // If it's already an object with language property
          else if (lang && typeof lang === 'object' && lang.language) {
            const langName = lang.language.trim();
            if (langName && !languageEntries.some(l => 
                l.language.toLowerCase() === langName.toLowerCase())) {
              languageEntries.push({
                language: langName,
                proficiency: lang.proficiency || 'Fluent'
              });
            }
          }
        });
      }
      
      console.log('📊 DATA CATEGORIZATION:', {
        educationEntries: educationEntries.length,
        certificateEntries: certificateEntries.length,
        languageEntries: languageEntries.length,
        skills: skills.length
      });
      
      // Merge any certificates from additional section if present
      const mergedCertificates = [...certificateEntries];
      if (importedResumeData.additional && 
          Array.isArray(importedResumeData.additional.certifications)) {
        importedResumeData.additional.certifications.forEach(cert => {
          // If it's a string, convert to object format
          if (typeof cert === 'string') {
            // Check if this certificate is already in our array
            const certName = cert.trim();
            if (certName && !mergedCertificates.some(c => c.name === certName)) {
              mergedCertificates.push({
                name: certName,
                issuer: '',
                date: '',
                description: ''
              });
            }
          } 
          // If it's already an object with name property
          else if (cert && typeof cert === 'object' && cert.name) {
            // Check if this certificate is already in our array
            const certName = cert.name.trim();
            if (certName && !mergedCertificates.some(c => c.name === certName)) {
              mergedCertificates.push({
                name: certName,
                issuer: cert.issuer || '',
                date: cert.date || '',
                description: cert.description || ''
              });
            }
          }
        });
      }
      
      // Map the imported data structure to our internal structure
      const mappedData = {
        personalInfo: importedResumeData.personalInfo || {
          name: '',
          email: '',
          phone: '',
          location: '',
          linkedin: '',
          website: ''
        },
        summary: typeof importedResumeData.summary === 'string' 
          ? importedResumeData.summary 
          : '',
        experience: Array.isArray(importedResumeData.experience) 
          ? importedResumeData.experience.map(exp => ({
              title: exp.title || '',
              company: exp.company || '',
              location: exp.location || '',
              startDate: exp.startDate || '',
              endDate: exp.endDate || '',
              description: exp.description || '',
              isCurrentPosition: !!exp.isCurrentPosition
            }))
          : [],
        education: educationEntries,
        skills: skills,
        additional: {
          certifications: mergedCertificates,
          projects: Array.isArray(importedResumeData.additional?.projects) 
            ? importedResumeData.additional.projects
            : [],
          languages: languageEntries,
          volunteer: Array.isArray(importedResumeData.additional?.volunteer) 
            ? importedResumeData.additional.volunteer
            : [],
          awards: Array.isArray(importedResumeData.additional?.awards) 
            ? importedResumeData.additional.awards
            : [],
          customSections: Array.isArray(importedResumeData.additional?.customSections) 
            ? importedResumeData.additional.customSections
            : []
        }
      };
      
      console.log('📊 MAPPED IMPORTED DATA:', JSON.stringify(mappedData, null, 2));
      
      // Save the mapped data to localStorage for persistence
      // This ensures data is saved before we remove the imported_resume_data
      saveToLocalStorage(mappedData);
      
      // Do NOT remove the imported data here, we'll do it in a useEffect after render
      
      return mappedData;
    }
    
    // Otherwise try to use initial data or saved data
    if (initialData) {
      return initialData;
    } else {
      // Try to get saved data from localStorage
      const savedData = getFromLocalStorage();
      if (savedData) {
        return savedData;
      }
      return defaultTemplate;
    }
  });
  
  // Track current active section
  const [activeSection, setActiveSection] = useState('personalInfo');
  
  // Track section completion status
  const [completedSections, setCompletedSections] = useState(() => {
    // First try to initialize from imported data completion status
    if (importedResumeData) {
      // Create completion status based on the mapped imported data
      const importedCompletionStatus = {};
      const mappedData = {
        personalInfo: importedResumeData.personalInfo || {},
        summary: importedResumeData.summary || '',
        experience: Array.isArray(importedResumeData.experience) ? importedResumeData.experience : [],
        education: Array.isArray(importedResumeData.education) ? importedResumeData.education : [],
        skills: Array.isArray(importedResumeData.skills) ? importedResumeData.skills : [],
        additional: importedResumeData.additional || {}
      };
      
      // Check sections completion based on the mapped data
      Object.keys(mappedData).forEach(section => {
        if (section === 'personalInfo') {
          importedCompletionStatus[section] = !!(mappedData.personalInfo.name && mappedData.personalInfo.email);
        } else if (section === 'summary') {
          importedCompletionStatus[section] = typeof mappedData.summary === 'string' && mappedData.summary.length > 30;
        } else if (section === 'experience') {
          importedCompletionStatus[section] = mappedData.experience.length > 0 && 
            mappedData.experience.some(exp => exp.title && exp.company && exp.description && exp.description.length >= 400);
        } else if (section === 'education') {
          importedCompletionStatus[section] = mappedData.education.length > 0 && 
            mappedData.education.some(edu => edu.degree && edu.school);
        } else if (section === 'skills') {
          importedCompletionStatus[section] = mappedData.skills.length >= 3;
        } else if (section === 'additional') {
          importedCompletionStatus[section] = true; // Additional is optional
        }
      });
      
      console.log('📊 INITIALIZED COMPLETION STATUS FROM IMPORT:', importedCompletionStatus);
      return importedCompletionStatus;
    }
    
    // Otherwise try to load from localStorage
    try {
      const savedProgress = getResumeProgress();
      if (savedProgress) {
        console.log('📊 LOADED COMPLETION STATUS FROM LOCALSTORAGE:', savedProgress);
        return savedProgress;
      }
    } catch (error) {
      console.error('Error loading section completion status:', error);
    }
    
    // Default empty object if no saved progress
    return {};
  });
  
  // State for celebration animations
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  
  // State to track if preview was recently updated
  const [previewUpdated, setPreviewUpdated] = useState(false);
  
  // Add template state with initialization from props or localStorage
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    // If initialData comes with a template property, use it
    if (initialData && initialData.template) {
      console.log('📊 Using template from initialData:', initialData.template);
      return initialData.template;
    }
    
    // Try to get from localStorage if available
    if (typeof window !== 'undefined') {
      const storedTemplate = localStorage.getItem('selected_resume_template');
      if (storedTemplate) {
        console.log('📊 Retrieved template from localStorage:', storedTemplate);
        return storedTemplate;
      }
    }
    
    // Default to ATS template
    console.log('📊 No template found, defaulting to "ats"');
    return 'ats';
  });
  
  // Track if we initialized from imported data
  const [initializedFromImport, setInitializedFromImport] = useState(!!importedResumeData);
  
  // Add this new state variable
  const [isTailoring, setIsTailoring] = useState(false);
  
  // Add state for download status
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Function to reorder sections
  const reorderSections = (fromIndex, toIndex) => {
    // Don't allow reordering the first item (personalInfo)
    if (fromIndex === 0 || toIndex === 0) return;
    
    const newOrder = [...sectionOrder];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    setSectionOrder(newOrder);
    
    // Save to localStorage
    localStorage.setItem('resume_section_order', JSON.stringify(newOrder));
    
    // Show preview updated indicator
    setPreviewUpdated(true);
    setTimeout(() => setPreviewUpdated(false), 2000);
  };
  
  // Function to reset section order to default
  const resetSectionOrder = () => {
    // Reset to the default order
    const defaultOrder = defaultSections.map(section => section.id);
    setSectionOrder(defaultOrder);
    
    // Save to localStorage
    localStorage.setItem('resume_section_order', JSON.stringify(defaultOrder));
    
    // Show preview updated indicator
    setPreviewUpdated(true);
    setTimeout(() => setPreviewUpdated(false), 2000);
    
    // Show toast message without celebration animation
    showToastMessage("Successfully restored recommended section order!");
  };
  
  // Helper function to show a toast message without confetti
  const showToastMessage = (message) => {
    // Update message but don't trigger the celebration animation
    setCelebrationMessage(message);
    
    // Create a toast-only element by setting a custom data attribute
    const toastEl = document.createElement('div');
    toastEl.className = 'toast-message';
    toastEl.textContent = message;
    toastEl.style.position = 'fixed';
    toastEl.style.bottom = '20px';
    toastEl.style.left = '50%';
    toastEl.style.transform = 'translateX(-50%)';
    toastEl.style.backgroundColor = 'rgba(40, 167, 69, 0.95)'; // Success green color
    toastEl.style.color = 'white';
    toastEl.style.padding = '12px 24px';
    toastEl.style.borderRadius = '4px';
    toastEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    toastEl.style.zIndex = '9999';
    toastEl.style.textAlign = 'center';
    toastEl.style.fontWeight = '500';
    toastEl.style.maxWidth = '80%';
    toastEl.style.display = 'flex';
    toastEl.style.alignItems = 'center';
    toastEl.style.border = '1px solid rgba(25, 135, 84, 0.3)'; // Subtle border
    
    // Add a checkmark icon
    const iconEl = document.createElement('span');
    iconEl.textContent = '✓';
    iconEl.style.marginRight = '10px';
    iconEl.style.fontWeight = 'bold';
    iconEl.style.fontSize = '16px';
    toastEl.prepend(iconEl);
    
    // Add to document
    document.body.appendChild(toastEl);
    
    // Animate in
    toastEl.style.animation = 'fadeInUp 0.3s ease forwards';
    
    // Remove after delay
    setTimeout(() => {
      toastEl.style.animation = 'fadeOutDown 0.3s ease forwards';
      setTimeout(() => {
        document.body.removeChild(toastEl);
      }, 300);
    }, 3000);
  };
  
  // Add animation styles to head
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes fadeOutDown {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, 20px); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Function to scroll to preview
  const scrollToPreview = () => {
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Load resume data from the appropriate source on mount
  useEffect(() => {
    const fetchResumeData = async () => {
      console.log('📊 DEBUG - FETCH - Starting fetchResumeData');
      console.log('📊 DEBUG - FETCH - localStorage keys:', Object.keys(localStorage));
      console.log('📊 DEBUG - FETCH - resumeId:', currentResumeId);
      console.log('📊 DEBUG - FETCH - starting_new_resume flag:', localStorage.getItem('starting_new_resume'));
      
      if (importedResumeData) {
        console.log('📊 Using imported data, skipping fetch');
        
        // Set initial resume name for imported data
        if (importedResumeData.personalInfo?.name) {
          setResumeName(`${importedResumeData.personalInfo.name}'s Resume`);
        } else {
          setResumeName(`Imported Resume - ${new Date().toLocaleDateString()}`);
        }
        
      return;
    }
    
      // Check if we're starting a new resume - in which case use default template
      const startingNewResume = localStorage.getItem('starting_new_resume') === 'true';
      if (startingNewResume) {
        console.log('📊 Starting new resume, using default template');
        // Clear the flag
        localStorage.removeItem('starting_new_resume');
        console.log('📊 DEBUG - FETCH - Cleared starting_new_resume flag');
        
        // Also clear resumeId from state to ensure it's completely fresh
        if (currentResumeId) {
          console.log('📊 DEBUG - FETCH - Clearing resumeId from state:', currentResumeId);
          setCurrentResumeId(null);
        }
        
        console.log('📊 DEBUG - FETCH - After clearing flags, current resumeId:', currentResumeId);
        
        // Set default data
        setResumeData(defaultTemplate);
        setResumeName(`Untitled Resume - ${new Date().toLocaleDateString()}`);
        return;
      }
    
      try {
        // Load data from appropriate source based on authentication status
        const data = await loadResumeData(isAuthenticated, initialData);
        
        if (data) {
          console.log('📊 Resume data loaded successfully');
          setResumeData(data);
          
          // Set initial resume name from personal info or default
          if (data.personalInfo?.name) {
            setResumeName(`${data.personalInfo.name}'s Resume`);
        } else {
            setResumeName(`Untitled Resume - ${new Date().toLocaleDateString()}`);
          }
        } else if (!initialData) {
          // If no data from any source, use default template
          console.log('📊 No resume data found, using default template');
          setResumeData(defaultTemplate);
          setResumeName(`Untitled Resume - ${new Date().toLocaleDateString()}`);
        }
      } catch (error) {
        console.error('Error loading resume data:', error);
        toast.error('Failed to load resume data');
        
        // Fallback to default template if load fails
        if (!initialData) {
          setResumeData(defaultTemplate);
          setResumeName(`Untitled Resume - ${new Date().toLocaleDateString()}`);
        }
      }
    };
    
    fetchResumeData();
  }, [isAuthenticated, initialData, importedResumeData, currentResumeId]);
  
  // Auto-save to database for authenticated users
  useEffect(() => {
    // Add explicit debug logging at the beginning
    console.log('📊 Auto-save effect triggered with:', { 
      isAuthenticated, 
      hasResumeData: !!resumeData,
      hasPersonalInfo: !!(resumeData?.personalInfo),
      isNavigatingAway, 
      initialLoad: initialLoadRef.current,
      resumeId: currentResumeId,
      template: selectedTemplate
    });
    
    // Only auto-save for authenticated users and if there's actual resume data
    // Skip auto-save if we're navigating away
    if (isAuthenticated && resumeData && resumeData.personalInfo && !isNavigatingAway) {
      // Skip auto-save on initial load
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        // Include template in the saved state reference
        previousResumeDataRef.current = JSON.stringify({
          data: resumeData,
          template: selectedTemplate,
          name: resumeName
        });
        console.log('📊 Initial load, skipping auto-save. Current resumeId:', currentResumeId);
        return;
      }
      
      // Check if data has actually changed before saving
      // Create a composite object that includes both resume data and template
      const currentState = {
        data: resumeData,
        template: selectedTemplate,
        name: resumeName
      };
      const currentStateStr = JSON.stringify(currentState);
      
      if (previousResumeDataRef.current === currentStateStr) {
        console.log('📊 Auto-save skipped - no data changes detected. Current resumeId:', currentResumeId);
        return;
      }
      
      // Update ref for next comparison
      previousResumeDataRef.current = currentStateStr;
      
      // Create a debounced auto-save
      const autoSaveTimeout = setTimeout(async () => {
        // Skip if already saving or navigating away
        if (isSaving || isNavigatingAway) return;
        
        try {
          setIsSaving(true);
          // Show auto-save indicator
          setShowAutoSaveIndicator(true);
          
          console.log('📊 Starting auto-save with resumeId:', currentResumeId, 'template:', selectedTemplate);
          
          // Save to the appropriate source
          const saveResult = await saveResumeData(
            resumeData, 
            isAuthenticated, 
            selectedTemplate, 
            currentResumeId,
            resumeName
          );
          
          // Update currentResumeId if a new ID was returned
          if (saveResult && saveResult.resumeId) {
            if (saveResult.resumeId !== currentResumeId) {
              console.log('📊 Updated resumeId from auto-save:', saveResult.resumeId, '(was:', currentResumeId, ')');
              
              // CRITICAL FIX: Update the state with the new resumeId
              setCurrentResumeId(saveResult.resumeId);
              
              // Also update localStorage for consistency
              localStorage.setItem('current_resume_id', saveResult.resumeId);
            } else {
              console.log('📊 Auto-save successful with existing resumeId:', currentResumeId);
            }
            
            // Clear the pending changes flag since we've successfully saved to the database
            localStorage.removeItem('pending_resume_changes');
            localStorage.removeItem('pending_resume_timestamp');
          } else {
            console.warn('📊 Auto-save returned no resumeId:', saveResult);
          }
          
          // Update last saved timestamp
          setLastSaved(new Date());
          setResumeModified(false); // Reset modified flag after save
      } catch (error) {
          console.error('📊 Auto-save failed:', error);
        } finally {
          setIsSaving(false);
          
          // Hide auto-save indicator after a short delay
          setTimeout(() => {
            setShowAutoSaveIndicator(false);
          }, 1500);
        }
      }, 1000); // Reduced from 2 seconds to 1 second for faster auto-save
      
      return () => clearTimeout(autoSaveTimeout);
    } else if (isNavigatingAway) {
      console.log('📊 Auto-save skipped - navigating away flag is set');
    } else if (!isAuthenticated) {
      console.log('📊 Auto-save skipped - user not authenticated');
    } else if (!resumeData || !resumeData.personalInfo) {
      console.log('📊 Auto-save skipped - missing resume data or personal info');
    }
  }, [resumeData, isAuthenticated, selectedTemplate, currentResumeId, isSaving, resumeName, isNavigatingAway, resumeModified]);
  
  // Save data to localStorage for unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('📊 SAVING RESUME DATA TO LOCALSTORAGE', {
        hasPersonalInfo: !!resumeData.personalInfo,
        namePresent: !!resumeData.personalInfo?.name,
        emailPresent: !!resumeData.personalInfo?.email,
        experienceCount: resumeData.experience?.length || 0,
        educationCount: resumeData.education?.length || 0,
        skillsCount: resumeData.skills?.length || 0
      });
      
      saveToLocalStorage(resumeData);
      
      // Also save completion progress
      const currentProgress = Object.keys(completedSections).filter(key => completedSections[key]).length;
      const totalSections = orderedSections.length;
      console.log(`📊 SAVED PROGRESS: ${currentProgress}/${totalSections} sections complete`);
    }
  }, [resumeData, completedSections, isAuthenticated, orderedSections.length]);
  
  // Update resume data for a specific section and check completion
  const updateResumeData = (sectionId, sectionData) => {
    // Update resume data state
    const updatedData = {
      ...resumeData,
      [sectionId]: sectionData
    };
    
    setResumeData(updatedData);
    setResumeModified(true); // Mark that resume has been modified
    
    // IMMEDIATE SAVE: Always save to localStorage immediately regardless of authentication
    // This provides an instant backup in case of refresh before auto-save completes
    try {
      console.log('📊 Immediate save to localStorage after update to:', sectionId);
      localStorage.setItem('modern_resume_data', JSON.stringify(updatedData));
      
      // Also store resumeId to maintain consistency
      if (currentResumeId) {
        localStorage.setItem('current_resume_id', currentResumeId);
      }
      
      // For authenticated users, set a flag to indicate unsaved changes
      if (isAuthenticated) {
        localStorage.setItem('pending_resume_changes', 'true');
        localStorage.setItem('pending_resume_timestamp', Date.now().toString());
      }
    } catch (error) {
      console.error('Error during immediate localStorage save:', error);
    }
    
    // Show preview updated indicator
    setPreviewUpdated(true);
    setTimeout(() => setPreviewUpdated(false), 2000);
    
    // Check if section is now complete
    const isComplete = checkSectionCompletion(sectionId, sectionData);
    
    if (isComplete !== completedSections[sectionId]) {
      const updatedCompletions = {
        ...completedSections,
        [sectionId]: isComplete
      };
      
      setCompletedSections(updatedCompletions);
      saveResumeProgress(updatedCompletions);
      
      // Show celebration when a section is newly completed
      if (isComplete && !completedSections[sectionId]) {
        // Message pools for each section
        const messagePool = {
          personalInfo: [
            "Off to a great start! Your contact details look polished.",
            "Perfect start! Employers now know how to reach their next great hire.",
            "Contact details added with style! You're making yourself accessible.",
            "Great job adding your details! First connection with employers: established."
          ],
          summary: [
            "That summary really packs a punch! Employers will take notice.",
            "Compelling overview! Your professional brand is shining through.",
            "What a captivating introduction to your professional story!",
            "Your summary sets the perfect tone for the rest of your resume!"
          ],
          experience: [
            "Your professional journey is looking impressive!",
            "Those career highlights show your professional growth beautifully!",
            "Your experience section really demonstrates your expertise!",
            "Oh my...What a compelling work history!"
          ],
          education: [
            "Your academic credentials are shaping up nicely!",
            "Educational background that speaks volumes about your knowledge base!",
            "Your learning journey shows dedication and expertise!",
            "Those academic achievements set a strong foundation!"
          ],
          skills: [
            "What a well-rounded set of abilities you've highlighted!",
            "Those skills showcase your professional toolkit perfectly!",
            "Your capabilities align wonderfully with what employers seek!",
            "Your skill set demonstrates your professional versatility!"
          ],
          additional: [
            "Those extra details add wonderful depth to your story!",
            "The additional information really rounds out your professional profile!",
            "These personal touches make your resume more memorable!",
            "Extra details that showcase your well-rounded background!"
          ]
        };
        
        // Get section id
        const sectionMessages = messagePool[sectionId] || [`Your ${orderedSections.find(s => s.id === sectionId).label} section is looking great!`];
        
        // Randomly select a message
        const randomIndex = Math.floor(Math.random() * sectionMessages.length);
        const message = sectionMessages[randomIndex];
        
        setCelebrationMessage(message);
        setShowCelebration(true);
        
        setTimeout(() => {
          setShowCelebration(false);
        }, 3000);
      }
    }
  };
  
  // Logic to check if a section is complete
  const checkSectionCompletion = (sectionId, data) => {
    if (!data) return false;
    
    switch (sectionId) {
      case 'personalInfo':
        return data.name && data.email;
      
      case 'summary':
        return data.length > 30;
      
      case 'experience':
        return data.length > 0 && data.some(exp => 
          exp.title && exp.company && exp.description && exp.description.length >= 400
        );
      
      case 'education':
        return data.length > 0 && data.some(edu => 
          edu.degree && edu.school
        );
      
      case 'skills':
        return data.length >= 3;
      
      case 'additional':
        // Additional info is optional
        return true;
      
      default:
        return false;
    }
  };
  
  // Calculate overall progress percentage
  const calculateProgress = () => {
    const totalSections = orderedSections.length;
    const completedCount = Object.values(completedSections).filter(Boolean).length;
    return Math.round((completedCount / totalSections) * 100);
  };
  
  // Section handler functions
  const handlePersonalInfoChange = (data) => {
    updateResumeData('personalInfo', data);
  };
  
  const handleSummaryChange = (data) => {
    updateResumeData('summary', data);
  };
  
  const handleExperienceChange = (data) => {
    updateResumeData('experience', data);
  };
  
  const handleEducationChange = (data) => {
    updateResumeData('education', data);
  };
  
  const handleSkillsChange = (data) => {
    updateResumeData('skills', data);
  };
  
  const handleAdditionalInfoChange = (data) => {
    updateResumeData('additional', data);
  };
  
  // Handle section completion
  const handleSectionComplete = (sectionId) => {
    // This function will be called when a section signals it's complete
    // We could add additional logic here if needed beyond what's in updateResumeData
    console.log(`Section ${sectionId} marked as complete`);
  };
  
  // Render current section component
  const renderCurrentSection = () => {
    console.log(`📊 Rendering section: ${activeSection}`);
    
    // Log the data being passed to the current section
    console.log(`📊 SECTION DATA (${activeSection}):`, JSON.stringify(resumeData[activeSection], null, 2));
    
    // Simply render the appropriate component based on active section
    switch (activeSection) {
      case 'personalInfo':
        return (
          <PersonalInfo 
            data={resumeData.personalInfo} 
            updateData={handlePersonalInfoChange} 
            onComplete={() => handleSectionComplete('personalInfo')}
            isCompleted={completedSections.personalInfo}
            jobContext={internalJobContext}
          />
        );
      case 'summary':
        return (
          <Summary 
            data={resumeData.summary} 
            updateData={handleSummaryChange} 
            onComplete={() => handleSectionComplete('summary')}
            isCompleted={completedSections.summary}
            jobContext={internalJobContext}
          />
        );
      case 'experience':
        return (
          <Experience 
            data={resumeData.experience} 
            updateData={handleExperienceChange} 
            onComplete={() => handleSectionComplete('experience')}
            isCompleted={completedSections.experience}
            jobContext={internalJobContext}
          />
        );
      case 'education':
        return (
          <Education 
            data={resumeData.education} 
            updateData={handleEducationChange} 
            onComplete={() => handleSectionComplete('education')}
            isCompleted={completedSections.education}
            jobContext={internalJobContext}
          />
        );
      case 'skills':
        return (
          <Skills 
            data={resumeData.skills} 
            updateData={handleSkillsChange} 
            onComplete={() => handleSectionComplete('skills')}
            isCompleted={completedSections.skills}
            jobContext={internalJobContext}
          />
        );
      case 'additional':
        return (
          <AdditionalInfo 
            data={resumeData.additional} 
            updateData={handleAdditionalInfoChange} 
            onComplete={() => handleSectionComplete('additional')}
            isCompleted={completedSections.additional}
            jobContext={internalJobContext}
          />
        );
      default:
        return null;
    }
  };

  // Remove imported data from localStorage after the component has mounted
  // and the state has been initialized
  useEffect(() => {
    if (importedResumeData) {
      console.log('📊 REMOVING IMPORTED DATA FROM LOCALSTORAGE AFTER INITIALIZATION');
      localStorage.removeItem('imported_resume_data');
    }
  }, []);

  // Function to handle job context update
  const handleJobContextUpdate = (updatedJobContext) => {
    console.log('Debug - Job context before update:', internalJobContext);
    console.log('Debug - Received updated job context:', updatedJobContext);
    
    // Ensure consistent property naming
    const normalizedJobContext = {
      jobTitle: updatedJobContext.jobTitle || updatedJobContext.title || updatedJobContext.position || '',
      description: updatedJobContext.description || updatedJobContext.jobDescription || '',
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Debug - Normalized job context:', normalizedJobContext);
    
    // Update state with normalized context
    setInternalJobContext(normalizedJobContext);
    
    // Save to localStorage with consistent property names
    localStorage.setItem('job_targeting_context', JSON.stringify(normalizedJobContext));
    
    // You could add additional logic here if needed
    toast.success('Resume targeting updated for new job description');
    
    // Show preview updated indicator
    setPreviewUpdated(true);
    setTimeout(() => setPreviewUpdated(false), 2000);
  };

  // Add a diagnostic test function to debug experience tailoring
  const testExperienceTailoring = async () => {
    console.log('🔍 testExperienceTailoring - Starting test');
    
    // Test toast functionality with success to confirm it works
    toast.success('Starting experience tailoring test...', { duration: 3000 });
    
    if (!resumeData || !resumeData.experience) {
      console.log('🔍 testExperienceTailoring - No experience data to test');
      toast.error('No experience data to test');
      return;
    }
    
    try {
      // First test the experience format with our test endpoint
      console.log('🔍 testExperienceTailoring - Testing experience format...');
      const formatResponse = await fetch('/api/test-experience-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeData }),
      });
      
      const formatData = await formatResponse.json();
      console.log('🔍 testExperienceTailoring - Format test results:', formatData);
      
      // Now test just the experience tailoring part of the API
      if (!internalJobContext || !internalJobContext.jobTitle) {
        console.log('🔍 testExperienceTailoring - No job context available, skipping tailoring test');
        toast.error('Please add a job description to test tailoring');
        return;
      }
      
      console.log('🔍 testExperienceTailoring - Testing experience tailoring with API...');
      toast.success('Testing experience tailoring - check console for results', { duration: 5000 });
      
      // Make a direct call to the API
      const tailorResponse = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeData: { 
            experience: resumeData.experience,
            // Include personal info and summary for better context
            personalInfo: resumeData.personalInfo,
            summary: resumeData.summary
          },
          jobContext: {
            jobTitle: internalJobContext.jobTitle,
            description: internalJobContext.description
          }
        }),
      });
      
      const tailoredData = await tailorResponse.json();
      console.log('🔍 testExperienceTailoring - Tailoring API response:', tailoredData);
      
      // Display the results
      console.log('🔍 testExperienceTailoring - Summary tailored:', !!tailoredData.summary);
      console.log('🔍 testExperienceTailoring - Skills tailored:', tailoredData.skills?.length || 0);
      console.log('🔍 testExperienceTailoring - Experience tailored count:', tailoredData.experience?.length || 0);
      
      // Check if we received tailored experience data
      if (tailoredData.experience && tailoredData.experience.length > 0) {
        console.log('🔍 testExperienceTailoring - First tailored experience:', tailoredData.experience[0]);
        
        // Compare original and tailored descriptions
        if (resumeData.experience[0] && tailoredData.experience[0]) {
          const originalDesc = resumeData.experience[0].description;
          const tailoredDesc = tailoredData.experience[0].description;
          
          console.log('🔍 testExperienceTailoring - Original description length:', originalDesc?.length || 0);
          console.log('🔍 testExperienceTailoring - Tailored description length:', tailoredDesc?.length || 0);
          console.log('🔍 testExperienceTailoring - Description changed:', originalDesc !== tailoredDesc);
          
          // Show a sample of both descriptions
          console.log('🔍 testExperienceTailoring - Original description sample:', 
            originalDesc?.substring(0, 100) + '...');
          console.log('🔍 testExperienceTailoring - Tailored description sample:', 
            tailoredDesc?.substring(0, 100) + '...');
        }
        
        // Apply the tailored data to update the resume
        const updatedResumeData = {
          ...resumeData,
          experience: tailoredData.experience
        };
        
        setResumeData(updatedResumeData);
        toast.success('Experience tailoring test complete - Descriptions updated!', { duration: 5000 });
      } else {
        console.log('🔍 testExperienceTailoring - No tailored experience data received');
        toast.error('No experience data returned from tailoring API');
      }
      
    } catch (error) {
      console.error('🔍 testExperienceTailoring - Error during test:', error);
      toast.error('Test failed: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle tailoring of all resume sections
  const handleTailorAllClick = async () => {
    console.log('📊 handleTailorAllClick - Starting resume tailoring');
    console.log('📊 handleTailorAllClick - Job context for tailoring:', internalJobContext);
    
    if (!internalJobContext) {
      toast.error('Please add a job description first');
      return;
    }
    
    // Additional validation for required fields
    if (!internalJobContext.jobTitle || !internalJobContext.jobTitle.trim()) {
      toast.error('Job title is missing. Please update the job description with a title.');
      setIsJobDescriptionModalOpen(true);
      return;
    }
    
    if (!internalJobContext.description || !internalJobContext.description.trim()) {
      toast.error('Job description is missing. Please add a detailed job description.');
      setIsJobDescriptionModalOpen(true);
      return;
    }
    
    // Check for at least one experience entry before proceeding
    if (!resumeData.experience || resumeData.experience.length === 0) {
      toast.error('Please add at least one work experience before tailoring your resume.');
      // Optionally navigate to the experience section
      setActiveSection('experience');
      return;
    }
    
    setIsTailoring(true);
    console.log('📊 handleTailorAllClick - Current resume data before tailoring:', resumeData);
    console.log('📊 handleTailorAllClick - Experience count before tailoring:', resumeData.experience?.length || 0);
    
    if (resumeData.experience && resumeData.experience.length > 0) {
      console.log('📊 handleTailorAllClick - First experience before tailoring:', resumeData.experience[0]);
    }
    
    try {
      // Ensure we're using consistent property names in the API request
      const apiPayload = {
        resumeData,
        jobContext: {
          jobTitle: internalJobContext.jobTitle,
          description: internalJobContext.description
        }
      };
      
      console.log('📊 handleTailorAllClick - API payload prepared, sending request');
      
      // Call our API endpoint
      const response = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });
      
      console.log('📊 handleTailorAllClick - API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to tailor resume');
      }
      
      // Parse the response
      const tailoredData = await response.json();
      console.log('📊 handleTailorAllClick - Received tailored resume data:', tailoredData);
      console.log('📊 handleTailorAllClick - Summary tailored:', !!tailoredData.summary);
      console.log('📊 handleTailorAllClick - Skills tailored:', tailoredData.skills?.length || 0);
      console.log('📊 handleTailorAllClick - Experience tailored count:', tailoredData.experience?.length || 0);
      
      if (tailoredData.experience && tailoredData.experience.length > 0) {
        console.log('📊 handleTailorAllClick - First tailored experience:', tailoredData.experience[0]);
      }
      
      // Create updated resume data with tailored content
      // The API now returns complete experience objects with updated descriptions,
      // so we can use them directly
      const updatedResumeData = {
        ...resumeData,
        summary: tailoredData.summary || resumeData.summary,
        skills: tailoredData.skills || resumeData.skills,
        experience: tailoredData.experience || resumeData.experience
      };
      
      console.log('📊 handleTailorAllClick - Final updated resume data:', updatedResumeData);
      console.log('📊 handleTailorAllClick - Updated experience count:', updatedResumeData.experience?.length || 0);
      
      if (updatedResumeData.experience && updatedResumeData.experience.length > 0) {
        console.log('📊 handleTailorAllClick - First experience after update:', updatedResumeData.experience[0]);
      }
      
      // Update the resume data state
      setResumeData(updatedResumeData);
      
      // Check completion status for updated sections
      ['summary', 'experience', 'skills'].forEach(sectionId => {
        if (checkSectionCompletion(sectionId, updatedResumeData[sectionId])) {
          const updatedCompletions = {
            ...completedSections,
            [sectionId]: true
          };
          setCompletedSections(updatedCompletions);
          saveResumeProgress(updatedCompletions);
        }
      });
      
      // Show toast success message
      toast.success('Resume successfully tailored for the job!');
      
      // Show preview updated indicator
      setPreviewUpdated(true);
      setTimeout(() => setPreviewUpdated(false), 2000);
      
      // Scroll to preview section
      setTimeout(() => {
        scrollToPreview();
      }, 500);
      
    } catch (error) {
      console.error('📊 handleTailorAllClick - Error tailoring resume:', error);
      toast.error(error.message || 'Failed to tailor your resume. Please try again.');
    } finally {
      setIsTailoring(false);
    }
  };

  // Replace the download handler with Puppeteer-based logic
  const handleDownloadPDF = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Save current resume data to localStorage before redirecting
      localStorage.setItem('pending_resume_download', 'true');
      
      // Also save the template choice and section order so they can be restored
      localStorage.setItem('modern_resume_data', JSON.stringify(resumeData));
      localStorage.setItem('resume_section_order', JSON.stringify(sectionOrder));
      localStorage.setItem('selected_resume_template', selectedTemplate);
      
      // Redirect to sign-in page
      router.push('/auth/signin?callbackUrl=/profile&action=download');
      return;
    }

    // Show initial loading toast
    const toastId = toast.loading('Checking subscription...');
    setIsDownloading(true);

    try {
      // Check if user is eligible to download
      const eligibilityResponse = await fetch('/api/resume/check-download-eligibility');
      const eligibilityData = await eligibilityResponse.json();

      if (!eligibilityData.eligible) {
        // User doesn't have an active subscription
        toast.error(eligibilityData.message || 'Subscription required', { id: toastId });
        setIsDownloading(false);
        
        // Redirect to subscription page
        router.push('/subscription');
        return;
      }

      // Update toast to show we're preparing the PDF
      toast.loading('Preparing your resume...', { id: toastId });

      // Validate that we have at least some resume data before trying to create a PDF
      if (!resumeData || !resumeData.personalInfo) {
        toast.error('Please add your personal information before downloading', { id: toastId });
        setIsDownloading(false);
        return;
      }

      // --- For authenticated users, only save to database if needed ---
      let resumeIdForDownload = currentResumeId;
      
      // Retrieve resumeId from localStorage if not available in state
      if (!resumeIdForDownload) {
        const storedResumeId = localStorage.getItem('current_resume_id');
        if (storedResumeId) {
          console.log('[DownloadPDF] Retrieved resumeId from localStorage:', storedResumeId);
          resumeIdForDownload = storedResumeId;
        }
      }
      
      // Only save if this is a new resume (no ID) or if there are unsaved changes
      const needsToSave = !resumeIdForDownload || resumeModified;
      
      if (isAuthenticated && needsToSave) {
        try {
          console.log('[DownloadPDF] Saving current resume data to database before generating PDF');
          const saveResult = await saveResumeData(
            resumeData, 
            isAuthenticated, 
            selectedTemplate,
            resumeIdForDownload,
            resumeName,
            true // Force update to ensure we have latest data for PDF
          );
          
          if (saveResult && saveResult.resumeId) {
            resumeIdForDownload = saveResult.resumeId;
            setCurrentResumeId(saveResult.resumeId);
            // Also update localStorage for consistency
            localStorage.setItem('current_resume_id', saveResult.resumeId);
            setLastSaved(new Date());
            setResumeModified(false); // Reset modified flag after save
            console.log('[DownloadPDF] Successfully saved to database with ID:', resumeIdForDownload);
          }
        } catch (error) {
          console.error('[DownloadPDF] Error saving to database:', error);
          // Continue with download using current resumeId if available
        }
      } else if (resumeIdForDownload) {
        console.log('[DownloadPDF] Using existing resume ID for download:', resumeIdForDownload);
      }

      // --- Always save to localStorage as a fallback ---
      localStorage.setItem('modern_resume_data', JSON.stringify(resumeData));
      if (sectionOrder) {
        localStorage.setItem('resume_section_order', JSON.stringify(sectionOrder));
      }
      // --- END AUTOSAVE FOR PDF GENERATION ---

      // Log for debugging: ensure we're using the correct template and data
      console.log('[DownloadPDF] Using template:', selectedTemplate);
      console.log('[DownloadPDF] Resume ID:', resumeIdForDownload);
      console.log('[DownloadPDF] Resume name:', resumeName);

      // Prepare the POST request to the Puppeteer PDF API
      const response = await fetch('/api/test-pdf-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: selectedTemplate || 'ats', // Default to ATS-Friendly if not set
          resumeData,
          sectionOrder,
          resumeId: resumeIdForDownload,
          resumeName
        }),
      });

      if (!response.ok) {
        // Try to get more detailed error message from the response
        try {
          const errorData = await response.json();
          throw new Error(`${errorData.error}: ${errorData.details || ''}`);
        } catch (jsonError) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      }

      // Get the PDF blob from the response
      const blob = await response.blob();
      // Create a blob URL for the PDF
      const url = URL.createObjectURL(blob);

      // Trigger the download in the browser
      const link = document.createElement('a');
      link.href = url;
      // Use the resume name for the file name, sanitized for file system
      const fileName = resumeName
        ? resumeName.replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid file characters
        : `resume-${selectedTemplate || 'ats'}`;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Resume downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download resume. Please try again later.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to validate resume name
  const validateResumeName = async () => {
    if (!isAuthenticated) return true;
    
    try {
      setIsValidatingName(true);
      
      const response = await fetch('/api/resume/validate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: resumeName,
          resumeId: currentResumeId
        }),
      });
      
      if (!response.ok) {
        console.error('Name validation failed');
        setNameValidationMessage('');
        return true; // Allow the operation to continue
      }
      
      const result = await response.json();
      
      if (!result.isValid) {
        setNameValidationMessage(`A resume with this name already exists. Suggested: "${result.suggestedName}"`);
        return false;
      } else {
        setNameValidationMessage('');
        return true;
      }
    } catch (error) {
      console.error('Error validating name:', error);
      return true; // Allow the operation to continue on error
    } finally {
      setIsValidatingName(false);
    }
  };

  // Add effect to handle navigation changes
  useEffect(() => {
    // This effect will run when the isNavigatingAway prop changes
    // When navigating away, make sure we don't trigger any more auto-saves
    if (isNavigatingAway) {
      console.log('📊 Component is being unmounted or navigating away, storing resumeId:', currentResumeId);
      
      // Store current resumeId to localStorage before navigating away for consistency
      if (currentResumeId) {
        localStorage.setItem('current_resume_id', currentResumeId);
      }
    } else {
      // When isNavigatingAway changes from true to false, we should re-enable auto-save
      console.log('📊 Auto-save re-enabled, resumeId:', currentResumeId);
      
      // Reset initial load flag to false to ensure auto-save works immediately
      initialLoadRef.current = false;
      
      // Force an immediate save if there are pending changes
      if (resumeModified) {
        console.log('📊 Detected pending changes after navigation state change, triggering save');
        
        // Set saving state to prevent duplicate saves
        setIsSaving(true);
        
        saveResumeData(
          resumeData, 
          isAuthenticated, 
          selectedTemplate, 
          currentResumeId,
          resumeName
        ).then(result => {
          if (result && result.success) {
            console.log('📊 Successfully saved pending changes, resumeId:', result.resumeId || currentResumeId);
            setResumeModified(false);
            
            // CRITICAL FIX: Update currentResumeId if a new one was returned
            if (result.resumeId && result.resumeId !== currentResumeId) {
              console.log('📊 Updating resumeId after save:', result.resumeId);
              setCurrentResumeId(result.resumeId);
              localStorage.setItem('current_resume_id', result.resumeId);
            }
          }
        }).catch(error => {
          console.error('📊 Error saving pending changes:', error);
        }).finally(() => {
          setIsSaving(false);
        });
      }
    }
  }, [isNavigatingAway, currentResumeId, resumeData, isAuthenticated, selectedTemplate, resumeName, resumeModified]);
  
  // Add effect to detect potential page refreshes
  useEffect(() => {
    // This will run on component mount
    const handleBeforeUnload = () => {
      // Set a flag in localStorage to indicate a page refresh might be happening
      localStorage.setItem('possible_page_refresh', 'true');
      localStorage.setItem('refresh_timestamp', Date.now().toString());
      
      // Store current resumeId to localStorage before refreshing
      if (currentResumeId) {
        localStorage.setItem('current_resume_id', currentResumeId);
        console.log('📊 Storing resumeId before potential refresh:', currentResumeId);
      }
    };
    
    // Check if this is a page reload by checking the flag
    const checkPageRefresh = () => {
      const isPossibleRefresh = localStorage.getItem('possible_page_refresh') === 'true';
      const refreshTimestamp = localStorage.getItem('refresh_timestamp');
      
      if (isPossibleRefresh && refreshTimestamp) {
        const timeSinceRefresh = Date.now() - parseInt(refreshTimestamp, 10);
        console.log(`📊 Page loaded after possible refresh (${timeSinceRefresh}ms ago)`);
        
        // If this is a recent refresh (within last 5 seconds)
        if (timeSinceRefresh < 5000) {
          console.log('📊 Detected page refresh, will use existing resumeId');
          
          // Retrieve the resumeId that was stored before refresh
          const storedResumeId = localStorage.getItem('current_resume_id');
          if (storedResumeId && storedResumeId !== currentResumeId) {
            console.log('📊 Restoring resumeId after refresh:', storedResumeId);
            setCurrentResumeId(storedResumeId);
          }
          
          // Set a flag to delay auto-save after refresh
          localStorage.setItem('just_refreshed', 'true');
          localStorage.setItem('refresh_recovery_time', Date.now().toString());
        }
      }
      
      // Clear the refresh flags for next time
      localStorage.removeItem('possible_page_refresh');
    };
    
    // On mount, check if this is a page refresh
    checkPageRefresh();
    
    // Add event listener for beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentResumeId]);
  
  // Add a specific effect to synchronize with localStorage changes
  useEffect(() => {
    // Function to check localStorage for resumeId changes
    const checkLocalStorageForResumeId = () => {
      if (typeof window === 'undefined') return;
      
      const storedId = localStorage.getItem('current_resume_id');
      
      // If localStorage has a resumeId but we don't, or it's different from our current one
      if (storedId && storedId !== currentResumeId) {
        console.log('📊 SYNC - Detected resumeId change in localStorage:', storedId);
        console.log('📊 SYNC - Updating component state with new resumeId');
        setCurrentResumeId(storedId);
      }
      // If we have a resumeId but localStorage doesn't, update localStorage
      else if (currentResumeId && !storedId) {
        console.log('📊 SYNC - Updating localStorage with resumeId from state:', currentResumeId);
        localStorage.setItem('current_resume_id', currentResumeId);
      }
    };
    
    // Check immediately on mount or when currentResumeId changes
    checkLocalStorageForResumeId();
    
    // Setup listener for storage events (in case another tab updates localStorage)
    const handleStorageChange = (e) => {
      if (e.key === 'current_resume_id') {
        console.log('📊 SYNC - Storage event detected for resumeId:', e.newValue);
        if (e.newValue !== currentResumeId) {
          setCurrentResumeId(e.newValue);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentResumeId]);
  
  // Additional effect to handle post-refresh recovery
  useEffect(() => {
    const justRefreshed = localStorage.getItem('just_refreshed') === 'true';
    
    if (justRefreshed) {
      console.log('📊 In post-refresh recovery mode');
      
      // Delay auto-save after refresh to prevent duplicate creation
      const recoveryTime = parseInt(localStorage.getItem('refresh_recovery_time') || '0', 10);
      const timeSinceRecovery = Date.now() - recoveryTime;
      
      // After 5 seconds, clear the just_refreshed flag
      const cleanupTimeout = setTimeout(() => {
        console.log('📊 Clearing post-refresh recovery mode');
        localStorage.removeItem('just_refreshed');
        localStorage.removeItem('refresh_recovery_time');
      }, Math.max(5000 - timeSinceRecovery, 0));
      
      return () => clearTimeout(cleanupTimeout);
    }
  }, []);

  // Add a utility function to clear localStorage resume data (for debugging)
  const clearLocalStorageResumeData = () => {
    if (window.confirm('This will clear all resume data from localStorage. Are you sure?')) {
      // Use our new utility function
      startNewResume(isAuthenticated, resumeData, selectedTemplate, currentResumeId, resumeName)
        .then(success => {
          if (success) {
            // Log success and reload page
            console.log('📊 Cleared all resume data from localStorage');
            toast.success('localStorage cleared. Page will reload.', { duration: 3000 });
            
            // Reload the page after a short delay
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            toast.error('Failed to clear localStorage');
          }
        })
        .catch(error => {
          console.error('Error clearing localStorage:', error);
          toast.error('Error clearing localStorage');
        });
    }
  };

  // Add effect to detect template changes and mark as modified
  useEffect(() => {
    // Skip on initial load
    if (initialLoadRef.current) return;
    
    // Mark as modified when template changes
    setResumeModified(true);
    console.log('📊 Template changed to:', selectedTemplate, '- marking resume as modified');
    
    // Also save template to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_resume_template', selectedTemplate);
    }
    
  }, [selectedTemplate]);

  return (
    <ResumeProvider value={{ resumeData, updateResumeData, jobContext: internalJobContext, selectedTemplate }}>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.resumeBuilder}>
        {console.log('📊 ModernResumeBuilder - Rendering with internalJobContext:', 
          internalJobContext ? {
            exists: true,
            jobTitle: internalJobContext.jobTitle,
            hasDescription: !!internalJobContext.description
          } : 'null'
        )}
        
        {/* Debug tools in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '90px',
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '8px',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <button 
              onClick={clearLocalStorageResumeData}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🗑️ Clear localStorage
            </button>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              ResumeID: {currentResumeId ? currentResumeId.substring(0, 8) + '...' : 'none'}
            </div>
          </div>
        )}
        
        {/* Auto-save indicator */}
        {showAutoSaveIndicator && (
          <div className={styles.autoSaveIndicator}>
            <div className={styles.saving}>
              <span className={styles.spinnerIcon}>⟳</span>
              Saving...
            </div>
          </div>
        )}
        
        {/* Job Description Modal */}
        <JobDescriptionModal 
          isOpen={isJobDescriptionModalOpen}
          onClose={() => setIsJobDescriptionModalOpen(false)}
          currentJobContext={internalJobContext}
          onUpdateJobContext={handleJobContextUpdate}
        />
        
        {showCelebration && (
          <Celebrations message={celebrationMessage} />
        )}
        
        {/* Floating View Preview Button */}
        <button 
          className={`${styles.viewPreviewButton} ${previewUpdated ? styles.previewUpdated : ''}`}
          onClick={scrollToPreview}
          aria-label="View resume preview"
        >
          <span className={styles.viewPreviewIcon}>👁️</span>
          <span>View Preview</span>
          {previewUpdated && <span className={styles.updateIndicator}></span>}
        </button>
        
        <div className={styles.builderColumn}>
          <h1 className={styles.builderTitle}>
            {internalJobContext ? 'Tailor Your Resume' : 'Build Your Resume'}
          </h1>
          
          {/* Job Targeting Indicator with Edit Button */}
          {internalJobContext && (
            <div className={styles.jobTargetingContainer}>
              <div className={styles.jobTargetingIndicator}>
                <div className={styles.jobTargetIcon}>🎯</div>
                <div className={styles.jobTargetInfo}>
                  <span className={styles.jobTargetLabel}>Optimizing for:</span>
                  <span className={styles.jobTargetTitle}>{internalJobContext.jobTitle || 'Target Position'}</span>
                </div>
              </div>
              
              <button 
                className={styles.changeJobButton}
                onClick={() => setIsJobDescriptionModalOpen(true)}
                aria-label="Change job description"
              >
                <span className={styles.changeJobIcon}>✏️</span>
                Change Job Description
              </button>
            </div>
          )}
          
          {/* Centralized Resume Tailoring Card */}
          {internalJobContext && (
            <div className={styles.tailoringCard}>
              <div className={styles.tailoringCardHeader}>
                <h3 className={styles.tailoringCardTitle}>
                  <span className={styles.tailoringCardIcon}>✨</span>
                  Tailor Resume to This Job in One Click
                </h3>
              </div>
              {/* <p className={styles.tailoringCardDescription}>
                Let's get down to business! We'll optimize your resume for {internalJobContext.jobTitle || 'this position'} by enhancing your summary, 
                experience, and skills.
              </p> */}
              <button
                className={styles.tailorAllButton}
                onClick={handleTailorAllClick}
                disabled={isTailoring || !resumeData.experience || resumeData.experience.length === 0}
                title={!resumeData.experience || resumeData.experience.length === 0 ? 
                  "Please add at least one work experience before tailoring your resume" : 
                  "Tailor your resume to the job description"}
              >
                {isTailoring ? (
                  <>
                    <FaSpinner className={styles.spinnerIcon} />
                    Tailoring your resume...
                  </>
                ) : (
                  <>
                    <span className={styles.tailorAllButtonIcon}>⚡</span>
                    Tailor Now!
                  </>
                )}
              </button>
              
              {/* Debug button - only visible in development */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={testExperienceTailoring}
                  disabled={isTailoring}
                >
                  <span>🔍</span>
                  Debug Experience Tailoring
                </button>
              )}
              
              {isTailoring ? (
                <p className={styles.tailoringCardNote} style={{ marginTop: '15px' }}>
                  AI is analyzing your resume and the job description to optimize your content...
                </p>
              ) : (
                <p className={styles.tailoringCardNote}>
                  {!resumeData.experience || resumeData.experience.length === 0 ? 
                    "Please add at least one work experience before tailoring your resume." :
                    "This will update your Summary, Experience, and Skills sections based on the job description."}
                </p>
              )}
            </div>
          )}
          
          {/* Only show ProgressBar when not in job tailoring mode */}
          {!internalJobContext && (
            <ProgressBar 
              progress={calculateProgress()} 
              completedSections={Object.values(completedSections).filter(Boolean).length}
              totalSections={orderedSections.length}
            />
          )}
          
          {/* Move Import Resume to compact button when in job tailoring mode */}
          {!internalJobContext && (
            <div className={styles.importButtonContainer}>
              <a href="/resume-import" className={styles.importButton}>
                <span className={styles.importIcon}>📄</span>
                Import Resume
              </a>
              <p className={styles.importDescription}>Have an existing resume? Import it to save time!</p>
            </div>
          )}
          
          {/* Add compact import resume link for job tailoring mode */}
          {internalJobContext && (
            <div className={styles.compactImportContainer}>
              <a 
                href={`/resume-import?job=${encodeURIComponent(JSON.stringify(internalJobContext))}&job_targeting=true`} 
                className={styles.compactImportLink}
              >
                <span className={styles.compactImportIcon}>📄</span>
                Import new resume for this job
              </a>
            </div>
          )}
          
          <div className={styles.builderContent}>
            <div className={styles.navigationColumn}>
              <SectionNavigation 
                sections={orderedSections}
                activeSection={activeSection}
                completedSections={completedSections}
                onSectionChange={setActiveSection}
                onReorderSections={reorderSections}
                onResetSectionOrder={resetSectionOrder}
              />
            </div>
            
            <div className={styles.sectionContent}>
              {renderCurrentSection()}
            </div>
          </div>
          
          {/* Template Selector - moved below the resume sections */}
          <div className={styles.templateSelectorContainer}>
            <h3 className={styles.templateSectionTitle}>Choose a Template</h3>
            <TemplateSelector 
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
            />
          </div>
        </div>
        
        <div className={styles.previewColumn} ref={previewRef}>
          <div className={styles.previewHeader}>
            <h2 className={styles.previewTitle}>Resume Preview</h2>
            <p className={styles.previewSubtitle}>This is how your resume will look to employers</p>
          </div>
          <ResumePreview 
            resumeData={resumeData} 
            template={selectedTemplate} 
            sectionOrder={sectionOrder}
          />
        </div>
        
        <div className={styles.actionContainer}>
          <button 
            className={styles.downloadButton} 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <FaSpinner className={styles.spinnerIcon} />
                Preparing PDF...
              </>
            ) : (
              <>
                <FaDownload className={styles.downloadIcon} />
                Download Resume
              </>
            )}
          </button>
        </div>
      </div>
    </ResumeProvider>
  );
};

export default ModernResumeBuilder; 