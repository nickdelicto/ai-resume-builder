import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ResumeProvider } from '../ResumeBuilder/ResumeContext';
import SectionNavigation from '../ResumeBuilder/ui/SectionNavigation';
import ProgressBar from '../ResumeBuilder/ui/ProgressBar';
import Celebrations from '../ResumeBuilder/ui/Celebrations';
import ResumePreview from '../ResumeBuilder/ui/ResumePreview';
import PersonalInfo from '../ResumeBuilder/sections/PersonalInfo';
import Summary from '../ResumeBuilder/sections/Summary';
import Experience from '../ResumeBuilder/sections/Experience';
import Education from '../ResumeBuilder/sections/Education';
// Skills section removed - soft skills are implied for healthcare workers
// Clinical skills are covered by HealthcareSkills component
import AdditionalInfo from '../ResumeBuilder/sections/AdditionalInfo';
import Licenses from '../ResumeBuilder/sections/Licenses';
import Certifications from '../ResumeBuilder/sections/Certifications';
import HealthcareSkills from '../ResumeBuilder/sections/HealthcareSkills';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { saveResumeData as saveToLocalStorage, getResumeData as getFromLocalStorage, saveResumeProgress, getResumeProgress } from '../ResumeBuilder/utils/localStorage';
import { loadResumeData, saveResumeData, startNewResume, migrateToDatabase } from '../../lib/resumeUtils';
import { useResumeService } from '../../lib/contexts/ResumeServiceContext';
import styles from './ModernResumeBuilder.module.css';
import Head from 'next/head';
import TemplateSelector from '../ResumeBuilder/ui/TemplateSelector';
import { FaArrowLeft, FaPencilAlt, FaBriefcase, FaInfoCircle, FaTimes, FaLightbulb, FaSpinner, FaDownload, FaEye, FaChartLine } from 'react-icons/fa';
import { ATSScorePanel } from '../ResumeBuilder/ATSScore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { useResumeSelection } from '../common/ResumeSelectionProvider';
import { ALL_CERTIFICATIONS, EHR_SYSTEMS, SKILLS_BY_SPECIALTY, NURSING_SPECIALTIES, NLC_STATES } from '../../lib/constants/healthcareData';
import { usePaywall } from '../common/PaywallModal';

// Helper function to mark localStorage data for migration to database
// This can be imported and called when a user signs in from another component
export const markLocalStorageForMigration = () => {
  if (typeof window !== 'undefined') {
    // Don't set the flag if it's already being processed
    if (localStorage.getItem('migration_in_progress') !== 'true') {
      // Generate a unique migration session ID to prevent duplicate migrations
      const migrationSessionId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('migration_session_id', migrationSessionId);
      localStorage.setItem('needs_db_migration', 'true');
      localStorage.setItem('migration_marked_time', Date.now().toString());
      console.log('📊 Marked localStorage data for migration to database');
      
      // Set a debounce timer to prevent rapid consecutive migrations
      localStorage.setItem('migration_debounce', 'true');
      setTimeout(() => {
        localStorage.removeItem('migration_debounce');
      }, 5000); // 5 second debounce
    } else {
      console.log('📊 Migration already in progress, skipping mark');
    }
  }
};

// Helper function to check if user is in DB-only mode
export const isDbOnlyMode = () => {
  return typeof window !== 'undefined' && localStorage.getItem('db_only_mode') === 'true';
};

// Helper function to set DB-only mode
export const setDbOnlyMode = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('db_only_mode', 'true');
    console.log('📊 User is now in DB-only mode');
  }
};

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
                placeholder="e.g. ICU Registered Nurse"
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
  
  // Get resume service from context
  const { 
    service, 
    isDbService,
    isLocalStorageService,
    currentResumeId: contextResumeId,
    setCurrentResumeId: updateContextResumeId,
    isAuthenticated: serviceIsAuthenticated
  } = useResumeService();
  
  // Add ref for scrolling to preview
  const previewRef = useRef(null);

  // Add ref for section content (for mobile smooth scroll)
  const sectionContentRef = useRef(null);

  // Add ref to track if a migration has already run in this session
  const hasMigratedRef = useRef(false);
  const templateChangeFromDbLoad = useRef(false);
  // Track when an import was just processed — prevents the useEffect re-run
  // (triggered by currentResumeId/importedResumeData changes) from overwriting
  // enriched smart-matched data with raw DB data
  const importJustProcessedRef = useRef(false);
  const creatingResumeRef = useRef(false); // Lock to prevent StrictMode double-create
  const actionContainerRef = useRef(null);
  const [showStickyDownload, setShowStickyDownload] = useState(false);

  // Job description modal state
  const [isJobDescriptionModalOpen, setIsJobDescriptionModalOpen] = useState(false);
  const [internalJobContext, setInternalJobContext] = useState(jobContext);
  
  // Add state for download eligibility
  const [isEligibleForDownload, setIsEligibleForDownload] = useState(true);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  
  // Add state for subscription details
  const [subscriptionDetails, setSubscriptionDetails] = useState({
    planName: '',
    expirationDate: null
  });

  // Add state to track which resume IDs are eligible for download with one-time plans
  const [eligibleResumeIds, setEligibleResumeIds] = useState([]);
  
  // Add a state variable to track when we need to force a refresh from the database
  const [forceDbRefresh, setForceDbRefresh] = useState(false);
  
  // Add state for current resume ID (for saving to database)
  const [currentResumeId, setCurrentResumeId] = useState(() => {
    // DEBUG: Log all localStorage keys at initialization time
    if (typeof window !== 'undefined') {
      console.log('📊 DEBUG - INIT - localStorage keys:', Object.keys(localStorage));
      console.log('📊 DEBUG - INIT - resumeId from prop:', resumeId);
      console.log('📊 DEBUG - INIT - resumeId in localStorage:', localStorage.getItem('current_resume_id'));
      console.log('📊 DEBUG - INIT - starting_new_resume flag:', localStorage.getItem('starting_new_resume'));
      console.log('📊 DEBUG - INIT - creating_new_resume flag:', localStorage.getItem('creating_new_resume'));
    }
    
    // IMPORTANT: Check if we're starting a new resume first - this takes priority over everything
    if (typeof window !== 'undefined' && localStorage.getItem('starting_new_resume') === 'true') {
      console.log('📊 DEBUG - INIT - Found starting_new_resume flag, returning null for resumeId');
      return null;
    }
    
    // Check if we're in the process of creating a new resume from the homepage
    if (typeof window !== 'undefined' && localStorage.getItem('creating_new_resume') === 'true') {
      console.log('📊 DEBUG - INIT - Found creating_new_resume flag, using resumeId from prop');
      // Use the resumeId from prop (which should be the newly created resume ID)
      if (resumeId) {
        return resumeId;
      }
      return null;
    }
    
    // Initialize from prop if provided - THIS SHOULD HAVE HIGHEST PRIORITY FOR EDITING
    if (resumeId) {
      console.log('📊 Initializing currentResumeId from prop:', resumeId);
      // IMPORTANT: Also update localStorage immediately to prevent syncing issues
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_resume_id', resumeId);
        // Set a flag to indicate we're editing an existing resume
        localStorage.setItem('editing_existing_resume', 'true');
        localStorage.setItem('editing_resume_id', resumeId);
      }
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
    
    // If context has a resumeId, use that
    if (contextResumeId) {
      console.log('📊 Using resumeId from context:', contextResumeId);
      return contextResumeId;
    }
    
    console.log('📊 No resumeId found, starting with null');
    return null;
  });
  
  // Monitor changes to resumeId prop
  useEffect(() => {
    if (resumeId && resumeId !== currentResumeId) {
      console.log('📊 resumeId prop changed, updating currentResumeId:', resumeId);
      
      // Check if we're in the process of creating a new resume
      const isCreatingNew = localStorage.getItem('creating_new_resume') === 'true';
      const currentStoredId = localStorage.getItem('current_resume_id');
      
      // If we're creating a new resume and already have a valid ID in localStorage, don't override it
      if (isCreatingNew && currentStoredId) {
        console.log('📊 Creating new resume - keeping current ID:', currentStoredId);
        return;
      }
      
      // Clean up any existing resume data from localStorage to prevent bleeding between resumes
      if (currentResumeId && currentResumeId !== resumeId) {
        console.log('📊 Detected resume switch - clearing local state to prevent data bleeding');
        // Don't clear currentResumeId from localStorage as we're about to set it
        
        // Force a clean slate for the new resume
      setCurrentResumeId(resumeId);
      
        // Mark that we shouldn't use any localStorage data for this resume
        localStorage.setItem('resume_state_reset', 'true');
      } else {
        setCurrentResumeId(resumeId);
      }
      
      // Always update localStorage with the new resumeId
      localStorage.setItem('current_resume_id', resumeId);
    }
  }, [resumeId]);
  
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
  
  // Define all resume sections in builder fill order
  // Experience right after Personal Info — it's the most important section
  // Summary near end — so AI has full context to generate a strong summary
  // Note: The actual resume render order (preview/PDF) pins Summary as #2
  const defaultSections = [
    { id: 'personalInfo', label: 'Personal Info', component: PersonalInfo },
    { id: 'experience', label: 'Experience', component: Experience },
    { id: 'licenses', label: 'Licenses', component: Licenses },
    { id: 'certifications', label: 'Certifications', component: Certifications },
    { id: 'healthcareSkills', label: 'Clinical Skills', component: HealthcareSkills },
    { id: 'education', label: 'Education', component: Education },
    { id: 'summary', label: 'Summary', component: Summary },
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
  
  // Get ordered sections (for builder navigation)
  const orderedSections = sectionOrder.map(
    sectionId => defaultSections.find(s => s.id === sectionId)
  ).filter(Boolean); // Filter out any undefined sections

  // Resume render order — for preview/PDF, always pin Summary as #2
  // Builder fill order may differ (Summary near end), but the actual resume
  // always shows: Personal Info → Summary → everything else
  const resumeRenderOrder = useMemo(() => {
    const order = [...sectionOrder];
    // Remove summary from its current position
    const summaryIdx = order.indexOf('summary');
    if (summaryIdx > -1) {
      order.splice(summaryIdx, 1);
    }
    // Insert summary right after personalInfo (index 1)
    const personalIdx = order.indexOf('personalInfo');
    order.splice(personalIdx + 1, 0, 'summary');
    return order;
  }, [sectionOrder]);
  
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
    licenses: [], // Nursing licenses [{type, state, licenseNumber, isCompact, expirationDate}]
    certifications: [], // Healthcare certifications [{id, name, fullName, expirationDate, issuingBody}]
    summary: '',
    experience: [],
    education: [],
    skills: [],
    healthcareSkills: { // Clinical skills picker data
      ehrSystems: [],
      clinicalSkills: [],
      specialty: '',
      customSkills: []
    },
    additional: {
      certifications: [], // Legacy - keeping for backwards compatibility
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
      
      // Set special import flags to override db-only mode behavior
      localStorage.setItem('import_pending', 'true');
      
      // Check if we should create a new resume instead of updating the current one
      const importCreateNew = localStorage.getItem('import_create_new') === 'true';
      
      // Only set target resumeId if we're NOT creating a new resume
      if (currentResumeId && !importCreateNew) {
        console.log('📊 Setting import target to current resumeId:', currentResumeId);
        localStorage.setItem('import_target_resumeId', currentResumeId);
      } else if (importCreateNew) {
        console.log('📊 Import will create a new resume instead of updating current one');
        // Ensure we don't have any target resumeId set
        localStorage.removeItem('import_target_resumeId');
      }
      
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
            // Map graduation date: prefer graduationDate, fall back to endDate
            let gradDate = edu.graduationDate || edu.endDate || '';
            // If we have a raw date that's not in "Month Year" format, try to parse it
            if (gradDate && !/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/.test(gradDate)) {
              // Try to extract year from various formats
              const yearMatch = gradDate.match(/\d{4}/);
              if (yearMatch) {
                const monthMatch = gradDate.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
                const monthMap = { jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', jun: 'June', jul: 'July', aug: 'August', sep: 'September', oct: 'October', nov: 'November', dec: 'December' };
                if (monthMatch) {
                  gradDate = `${monthMap[monthMatch[1].toLowerCase().substring(0, 3)] || 'May'} ${yearMatch[0]}`;
                } else {
                  gradDate = `May ${yearMatch[0]}`;
                }
              }
            }
            educationEntries.push({
              degree: edu.degree || '',
              school: edu.school || '',
              location: edu.location || '',
              graduationDate: gradDate,
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
      
      // === SMART MATCHING: Certifications ===
      // Match parsed certs against builder's known certification list
      const matchedCertifications = [];
      const unmatchedCertificates = [];

      mergedCertificates.forEach(cert => {
        const certName = (cert.name || '').trim();
        if (!certName) return;
        const certLower = certName.toLowerCase().replace(/[^a-z0-9]/g, '');

        const match = ALL_CERTIFICATIONS.find(known => {
          const idMatch = certLower === known.id;
          const nameMatch = certLower === known.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const fullNameMatch = certLower === known.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
          // Partial: "CCRN-K" contains "CCRN", "BLS (AHA)" contains "BLS"
          const partialMatch = certLower.includes(known.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
            || certName.toLowerCase().includes(known.name.toLowerCase());
          return idMatch || nameMatch || fullNameMatch || partialMatch;
        });

        if (match && !matchedCertifications.some(m => m.id === match.id)) {
          matchedCertifications.push({
            id: match.id,
            name: match.name,
            fullName: match.fullName,
            expirationDate: cert.date || '',
            issuingBody: cert.issuer || (match.issuingBodies?.[0] || '')
          });
        } else if (!match) {
          unmatchedCertificates.push(cert);
        }
      });

      // === SMART MATCHING: EHR Systems ===
      const matchedEhrSystems = [];
      const remainingSkills = [];

      skills.forEach(skill => {
        const skillLower = (typeof skill === 'string' ? skill : '').toLowerCase();
        const ehrMatch = EHR_SYSTEMS.find(ehr => {
          const ehrNameLower = ehr.name.toLowerCase();
          // "Epic" in "Epic Systems", "Cerner" in "Cerner (Oracle Health)"
          return skillLower.includes(ehrNameLower.split(' ')[0].toLowerCase())
            || ehrNameLower.toLowerCase().includes(skillLower.split(' ')[0]);
        });

        if (ehrMatch && !matchedEhrSystems.includes(ehrMatch.id)) {
          matchedEhrSystems.push(ehrMatch.id);
        } else {
          remainingSkills.push(skill);
        }
      });

      // === SMART MATCHING: Clinical Skills ===
      const allKnownSkills = Object.values(SKILLS_BY_SPECIALTY).flat();
      const matchedClinicalSkills = [];
      const genericSkills = [];

      remainingSkills.forEach(skill => {
        const skillLower = (typeof skill === 'string' ? skill : '').toLowerCase().trim();
        const clinicalMatch = allKnownSkills.find(known =>
          known.toLowerCase() === skillLower
          || skillLower.includes(known.toLowerCase())
          || known.toLowerCase().includes(skillLower)
        );

        if (clinicalMatch && !matchedClinicalSkills.includes(clinicalMatch)) {
          matchedClinicalSkills.push(clinicalMatch);
        } else {
          genericSkills.push(skill);
        }
      });

      // === SMART MATCHING: Specialty Detection ===
      // Detect nursing specialty from experience titles/descriptions
      let detectedSpecialty = '';
      const experienceText = (importedResumeData.experience || [])
        .map(exp => `${exp.title || ''} ${exp.description || ''}`)
        .join(' ');

      for (const spec of NURSING_SPECIALTIES) {
        if (spec.keywords.some(kw => experienceText.toLowerCase().includes(kw.toLowerCase()))) {
          detectedSpecialty = spec.id;
          break;
        }
      }

      // === SMART MATCHING: Licenses ===
      const mappedLicenses = [];
      if (Array.isArray(importedResumeData.licenses)) {
        importedResumeData.licenses.forEach(lic => {
          if (!lic || !lic.type) return;
          const stateCode = (lic.state || '').toUpperCase().trim();
          mappedLicenses.push({
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: lic.type.toLowerCase(),
            state: stateCode.length === 2 ? stateCode : '',
            licenseNumber: lic.licenseNumber || '',
            isCompact: lic.isCompact || (stateCode.length === 2 && NLC_STATES.includes(stateCode)),
            expirationDate: lic.expirationDate || ''
          });
        });
      }

      // ========== MEMBERSHIPS MATCHING ==========
      const NURSING_ORGANIZATIONS = [
        { id: 'ana', name: 'American Nurses Association (ANA)' },
        { id: 'aacn', name: 'AACN - Critical Care Nurses' },
        { id: 'aorn', name: 'AORN - Perioperative Nurses' },
        { id: 'ena', name: 'ENA - Emergency Nurses' },
        { id: 'oncology', name: 'ONS - Oncology Nursing Society' },
        { id: 'aann', name: 'AANN - Neuroscience Nurses' },
        { id: 'awhonn', name: 'AWHONN - Women\'s Health/OB Nurses' },
        { id: 'apna', name: 'APNA - Psychiatric Nurses' },
        { id: 'sigma', name: 'Sigma Theta Tau International' }
      ];
      const matchedMemberships = [];
      const rawMemberships = Array.isArray(importedResumeData.additional?.memberships)
        ? importedResumeData.additional.memberships : [];
      rawMemberships.forEach(mem => {
        const memName = typeof mem === 'string' ? mem.trim() : (mem?.name || '').trim();
        if (!memName) return;
        const memLower = memName.toLowerCase();
        // Try to match against known nursing organizations
        const match = NURSING_ORGANIZATIONS.find(org => {
          const orgLower = org.name.toLowerCase();
          const orgAbbrev = org.id.toLowerCase();
          return memLower.includes(orgAbbrev) || orgLower.includes(memLower)
            || memLower.includes(orgLower.split(' - ')[0]?.toLowerCase() || '');
        });
        if (match && !matchedMemberships.some(m => m.id === match.id)) {
          matchedMemberships.push({ id: match.id, name: match.name });
        } else if (!match) {
          matchedMemberships.push({ id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: memName });
        }
      });

      // ========== VOLUNTEER MAPPING ==========
      const mappedVolunteer = [];
      const rawVolunteer = Array.isArray(importedResumeData.additional?.volunteer)
        ? importedResumeData.additional.volunteer : [];
      rawVolunteer.forEach(vol => {
        if (typeof vol === 'string') {
          if (vol.trim()) {
            mappedVolunteer.push({
              id: `vol-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              organization: vol.trim(),
              role: ''
            });
          }
        } else if (vol && typeof vol === 'object') {
          const org = (vol.organization || vol.org || vol.name || '').trim();
          if (org) {
            mappedVolunteer.push({
              id: `vol-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              organization: org,
              role: (vol.role || vol.position || '').trim()
            });
          }
        }
      });

      // ========== AWARDS MAPPING ==========
      const COMMON_AWARDS = [
        { id: 'daisy', name: 'DAISY Award' },
        { id: 'employee-month', name: 'Employee of the Month' },
        { id: 'excellence', name: 'Nursing Excellence Award' },
        { id: 'preceptor', name: 'Preceptor of the Year' },
        { id: 'patient-satisfaction', name: 'Patient Satisfaction Award' },
        { id: 'safety', name: 'Patient Safety Award' }
      ];
      const mappedAwards = [];
      const rawAwards = Array.isArray(importedResumeData.additional?.awards)
        ? importedResumeData.additional.awards : [];
      rawAwards.forEach(award => {
        const awardName = typeof award === 'string' ? award.trim() : (award?.name || '').trim();
        if (!awardName) return;
        const awardLower = awardName.toLowerCase();
        // Try to match against known awards
        const match = COMMON_AWARDS.find(a => awardLower.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(awardLower));
        if (match && !mappedAwards.some(a => a.id === match.id)) {
          mappedAwards.push({ id: match.id, name: match.name });
        } else if (!match) {
          mappedAwards.push({ id: `award-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: awardName });
        }
      });

      console.log('📊 SMART MATCHING RESULTS:', {
        matchedCerts: matchedCertifications.length,
        unmatchedCerts: unmatchedCertificates.length,
        ehrSystems: matchedEhrSystems.length,
        clinicalSkills: matchedClinicalSkills.length,
        genericSkills: genericSkills.length,
        specialty: detectedSpecialty,
        licenses: mappedLicenses.length,
        memberships: matchedMemberships.length,
        volunteer: mappedVolunteer.length,
        awards: mappedAwards.length
      });

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
        licenses: mappedLicenses,
        certifications: matchedCertifications,
        skills: genericSkills,
        healthcareSkills: {
          ehrSystems: matchedEhrSystems,
          clinicalSkills: matchedClinicalSkills,
          specialty: detectedSpecialty,
          customSkills: []
        },
        additional: {
          certifications: unmatchedCertificates,
          projects: Array.isArray(importedResumeData.additional?.projects)
            ? importedResumeData.additional.projects
            : [],
          languages: languageEntries,
          memberships: matchedMemberships,
          volunteer: mappedVolunteer,
          awards: mappedAwards,
          customSections: Array.isArray(importedResumeData.additional?.customSections)
            ? importedResumeData.additional.customSections
            : []
        }
      };
      
      console.log('📊 MAPPED IMPORTED DATA:', JSON.stringify(mappedData, null, 2));
      
      // Save the mapped data to localStorage for persistence with a special flag
      // to indicate this is an import-triggered update that should fully replace existing data
      localStorage.setItem('imported_resume_override', 'true');
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
  const [isFullCelebration, setIsFullCelebration] = useState(false);
  
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
    
    // Default to Professional template
    console.log('📊 No template found, defaulting to "professional"');
    return 'professional';
  });
  
  // Track if we initialized from imported data
  const [initializedFromImport, setInitializedFromImport] = useState(!!importedResumeData);
  
  // Add this new state variable
  const [isTailoring, setIsTailoring] = useState(false);
  
  // Add state for download status
  const [isDownloading, setIsDownloading] = useState(false);

  // Add state for preview/ATS Score tab
  const [activePreviewTab, setActivePreviewTab] = useState('preview'); // 'preview' | 'score'

  // Function to reorder sections
  const reorderSections = (fromIndex, toIndex) => {
    // Don't allow reordering fixed sections (personalInfo, summary)
    if (fromIndex === 0 || toIndex === 0) return;
    const fromId = sectionOrder[fromIndex];
    const toId = sectionOrder[toIndex];
    if (fromId === 'summary' || toId === 'summary') return;
    
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
  
  // Function to set template from database without triggering save loop
  const setTemplateFromDatabase = (template) => {
    console.log('📊 Setting template from database:', template);
    templateChangeFromDbLoad.current = true;
    setSelectedTemplate(template);
    // Reset after a short delay to allow the effect to be skipped
    setTimeout(() => {
      templateChangeFromDbLoad.current = false;
    }, 100);
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
    showToastMessage("Section order reset");
  };
  
  // Helper function to show a toast message without confetti
  const showToastMessage = (message) => {
    // Create toast container
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '24px';
    toastContainer.style.left = '50%';
    toastContainer.style.transform = 'translateX(-50%)';
    toastContainer.style.zIndex = '1000';
    toastContainer.style.pointerEvents = 'none';

    // Create toast element matching Celebrations component styling
    const toastEl = document.createElement('div');
    toastEl.style.display = 'flex';
    toastEl.style.alignItems = 'center';
    toastEl.style.gap = '10px';
    toastEl.style.padding = '12px 20px';
    toastEl.style.background = '#1d2129';
    toastEl.style.color = 'white';
    toastEl.style.borderRadius = '10px';
    toastEl.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    toastEl.style.fontFamily = "'Figtree', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    toastEl.style.animation = 'toastSlideUp 0.3s ease-out';

    // Add checkmark icon
    const iconEl = document.createElement('span');
    iconEl.textContent = '✓';
    iconEl.style.display = 'flex';
    iconEl.style.alignItems = 'center';
    iconEl.style.justifyContent = 'center';
    iconEl.style.width = '22px';
    iconEl.style.height = '22px';
    iconEl.style.background = '#34a853';
    iconEl.style.color = 'white';
    iconEl.style.borderRadius = '50%';
    iconEl.style.fontSize = '12px';
    iconEl.style.fontWeight = '700';
    iconEl.style.flexShrink = '0';

    // Add message
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    messageEl.style.fontSize = '0.95rem';
    messageEl.style.fontWeight = '500';
    messageEl.style.lineHeight = '1.3';

    toastEl.appendChild(iconEl);
    toastEl.appendChild(messageEl);
    toastContainer.appendChild(toastEl);
    document.body.appendChild(toastContainer);

    // Remove after delay with fade out
    setTimeout(() => {
      toastEl.style.animation = 'toastFadeOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (document.body.contains(toastContainer)) {
          document.body.removeChild(toastContainer);
        }
      }, 300);
    }, 2000);
  };
  
  // Add animation styles to head
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes toastSlideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes toastFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
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

  // Show sticky download bar when the original button scrolls out of view
  useEffect(() => {
    const el = actionContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyDownload(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load resume data from the appropriate source on mount
  useEffect(() => {
    let isStale = false; // Cleanup guard for StrictMode double-invoke

    const fetchResumeData = async () => {
      console.log('📊 DEBUG - FETCH - Starting fetchResumeData with service');
      console.log('📊 DEBUG - FETCH - Service available:', service && service.isAvailable());
      console.log('📊 DEBUG - FETCH - currentResumeId:', currentResumeId);
      console.log('📊 DEBUG - FETCH - Is DB service:', isDbService);
      console.log('📊 DEBUG - FETCH - Is authenticated:', serviceIsAuthenticated);
      console.log('📊 DEBUG - FETCH - creating_new_resume flag:', localStorage.getItem('creating_new_resume'));
      
      // Check if we're in the process of creating a new resume
      if (localStorage.getItem('creating_new_resume') === 'true') {
        console.log('📊 DEBUG - FETCH - Creating new resume flag is set, skipping database operations');
        
        // Just use the default template or initialData if provided
        if (initialData) {
          setResumeData(initialData);
        } else {
          setResumeData(defaultTemplate);
        }
        
        return;
      }
      
      // Check for newly imported resume ID
      const importNewResumeId = typeof window !== 'undefined' && localStorage.getItem('import_new_resume_id');
      if (importNewResumeId && service) {
        console.log('📊 Found newly imported resume ID in localStorage:', importNewResumeId);

        try {
          // Load the newly imported resume to get meta (title, template) and set resumeId
          const result = await service.loadResume(importNewResumeId);

          if (result.success && result.data) {
            const meta = result.data.meta || {};

            console.log('📊 Successfully loaded newly imported resume for ID:', importNewResumeId);

            // CRITICAL: If smart-matched data already exists in state (from importedResumeData
            // initialization), do NOT overwrite it with raw DB data. The raw DB data was saved
            // by resume-import.jsx BEFORE smart matching ran, so it lacks healthcareSkills,
            // matched certifications, clinicalSkills, etc. Instead, keep the enriched state
            // and let autosave persist it to DB on the next cycle.
            if (importedResumeData) {
              console.log('📊 Smart-matched data already in state — preserving enriched data (not overwriting with raw DB data)');
              // Only update completion status from the already-initialized state
              updateCompletionStatusFromData(resumeData);
            } else {
              // No smart matching ran (e.g., importedResumeData was cleared) — use DB data
              const fetchedData = result.data.resumeData;
              setResumeData(fetchedData);
              updateCompletionStatusFromData(fetchedData);
            }

            setResumeName(meta.title || 'Imported Resume');

            // If template is available, set it
            if (meta.template) {
              setTemplateFromDatabase(meta.template);
              console.log('📊 Setting template from imported resume:', meta.template);
            }

            // Update current resume ID
            setCurrentResumeId(importNewResumeId);
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_resume_id', importNewResumeId);
            }

            // Clear import flags after successful load
            localStorage.removeItem('import_pending');
            localStorage.removeItem('import_target_resumeId');
            localStorage.removeItem('import_create_new');
            localStorage.removeItem('imported_resume_data');
            localStorage.removeItem('import_new_resume_id');

            // Mark that import was just processed — when setCurrentResumeId triggers
            // a useEffect re-run, all localStorage flags will be cleared, so the
            // currentResumeId loading path would overwrite enriched data with raw DB data.
            // This ref survives the re-render and tells the next run to skip the DB load.
            importJustProcessedRef.current = true;

            // Force-save enriched data to DB immediately. The autosave useEffect
            // skips its first run as "initial load", so the enriched certifications
            // and healthcareSkills would never persist. Without this force-save,
            // reloading the page loads the raw DB data (saved before smart matching)
            // which lacks these fields.
            if (importedResumeData && serviceIsAuthenticated) {
              try {
                const forceSaveResult = await saveResumeData(
                  resumeData,
                  serviceIsAuthenticated,
                  selectedTemplate,
                  importNewResumeId,
                  meta.title || 'Imported Resume',
                  true // forceUpdate
                );
                if (forceSaveResult.success) {
                  console.log('📊 Force-saved enriched import data to DB (certifications + healthcareSkills preserved)');
                }
              } catch (saveError) {
                console.error('📊 Failed to force-save enriched data:', saveError);
              }
            }

            // Show success message
            toast.success('Resume imported successfully!', { id: 'import-toast' });

            return;
          }
        } catch (error) {
          console.error('Error loading newly imported resume:', error);
        }
      }
      
      // If we have a resume service and ID, try to load it
      if (service && currentResumeId) {
        try {
          // Guard: If an import was just processed in a previous run of this useEffect,
          // skip the DB load entirely. The enriched smart-matched data is already in state
          // and autosave will persist it to DB shortly.
          if (importJustProcessedRef.current) {
            console.log('📊 Import just processed — skipping DB load to preserve enriched data');
            importJustProcessedRef.current = false;
            return;
          }

          console.log('📊 Loading resume data with service, ID:', currentResumeId);

          // IMPORTANT: Check if there's an import pending before loading from DB
          const importPending = typeof window !== 'undefined' && localStorage.getItem('import_pending') === 'true';
          const importTargetResumeId = localStorage.getItem('import_target_resumeId');
          
          if (importPending && serviceIsAuthenticated) {
            console.log('📊 Import operation pending for resumeId:', importTargetResumeId || 'new resume');
            // If we have imported data that's been loaded into state, use that
            // instead of loading from DB to prevent data loss
            if (importedResumeData || resumeData.personalInfo) {
              console.log('📊 Using already loaded imported data instead of fetching from DB');
              return;
            }
          }
          
          // First check if the resume exists (for DB service only)
          if (isDbService) {
            const exists = await service.checkResumeExists(currentResumeId);
            if (!exists) {
              console.log('📊 Resume does not exist in database:', currentResumeId);

              // StrictMode guard: if this effect was already cleaned up, abort
              if (isStale) {
                console.log('📊 Stale effect — skipping resume-not-found handling');
                return;
              }

              // Clear invalid resume ID from localStorage
              if (typeof window !== 'undefined') {
                localStorage.removeItem('current_resume_id');
                localStorage.removeItem('editing_resume_id');
                localStorage.removeItem('editing_existing_resume');

                // Show error toast (use stable ID to deduplicate)
                toast.error('The resume you were trying to edit no longer exists. Starting with a new resume.', { id: 'resume-not-found' });
              }

              // Set default template data
              setResumeData(defaultTemplate);
              setResumeName('My Resume');
              setCompletedSections({});

              // If authenticated, create a new resume (with lock to prevent double-create)
              if (serviceIsAuthenticated && !creatingResumeRef.current) {
                creatingResumeRef.current = true;
                console.log('📊 Creating new resume to replace missing one');
                try {
                  const saveResult = await service.saveResume(defaultTemplate, {
                    title: 'My Resume',
                    template: 'ats'
                  });

                  if (isStale) {
                    console.log('📊 Stale after create — skipping state updates');
                    return;
                  }

                  if (saveResult.success && saveResult.data?.resumeId) {
                    // Update IDs
                    setCurrentResumeId(saveResult.data.resumeId);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('current_resume_id', saveResult.data.resumeId);
                    }

                    console.log('📊 Created new resume with ID:', saveResult.data.resumeId);
                    // Delay success toast so it slides in after the error toast, not on top
                    setTimeout(() => {
                      toast.success('Created a new resume for you', { id: 'resume-created' });
                    }, 600);
                  }
                } finally {
                  creatingResumeRef.current = false;
                }
              }

              return;
            }
          }
          
          // Skip DB load if we're handling an import and already have imported data
          if (importPending && (importedResumeData || resumeData.personalInfo)) {
            console.log('📊 Skipping database load during import process to prevent data loss');
            return;
          }
          
          // Load the resume data
          const result = await service.loadResume(currentResumeId);
          
          if (result.success && result.data) {
            const fetchedData = result.data.resumeData;
            const meta = result.data.meta || {};
            
            console.log('📊 Successfully loaded resume data for ID:', currentResumeId);
            
            // Don't override imported data with DB data if import is pending
            if (importPending && importedResumeData) {
              console.log('📊 Import pending, keeping imported data instead of loaded DB data');
              return;
            }
            
            // Set the fetched data to state
            setResumeData(fetchedData);
            setResumeName(meta.title || 'My Resume');
            
            // If template is available, set it
            if (meta.template) {
              setTemplateFromDatabase(meta.template);
              console.log('📊 Setting template from loaded resume:', meta.template);
            }
            
            // Always update completion status for fetched data
            updateCompletionStatusFromData(fetchedData);
            
            // If in DB-only mode, make sure localStorage is cleared of resume data
            if (isDbService && isDbOnlyMode()) {
              localStorage.removeItem('modern_resume_data');
            }
            
            return;
          } else {
            console.error('📊 Failed to load resume with service:', result.error);
            if (isStale) return;

            // Handle different error conditions
            if (result.error && result.error.includes('not found')) {
              // Clear invalid resume ID from localStorage
              if (typeof window !== 'undefined') {
                localStorage.removeItem('current_resume_id');
                localStorage.removeItem('editing_resume_id');
                localStorage.removeItem('editing_existing_resume');

                // Show error toast (deduplicated with same ID as primary handler)
                toast.error('The resume you were trying to edit no longer exists. Starting with a new resume.', { id: 'resume-not-found' });
              }
            } else {
              toast.error('Failed to load resume. Starting with a new one.', { id: 'resume-load-failed' });
            }
            
            // Fall back to localStorage or default template
            const savedData = getFromLocalStorage();
            if (savedData) {
              setResumeData(savedData);
              updateCompletionStatusFromData(savedData);
            } else {
              setResumeData(defaultTemplate);
              setResumeName('My Resume');
              setCompletedSections({});
            }
          }
        } catch (error) {
          console.error('Error loading resume with service:', error);
          toast.error('Error loading resume. Using backup data.');
          
          // On error, try localStorage or default
          const savedData = getFromLocalStorage();
          if (savedData) {
            setResumeData(savedData);
            updateCompletionStatusFromData(savedData);
          } else {
            setResumeData(defaultTemplate);
            setCompletedSections({});
          }
        }
      } else {
        // If no service or no resume ID, use initialData or default template
        console.log('📊 Using initialData or default template data');
        setResumeData(initialData || defaultTemplate);
        setResumeName(initialData?.title || 'My Resume');
        setCompletedSections({});
      }
    };
    
    fetchResumeData();

    return () => { isStale = true; }; // StrictMode cleanup — second invoke becomes a no-op
  }, [service, isDbService, initialData, importedResumeData, currentResumeId, contextResumeId, serviceIsAuthenticated, updateContextResumeId]);

  // Add a helper function to update completion status from data
  const updateCompletionStatusFromData = (data) => {
    console.log('📊 Updating completion status based on loaded data');
    const newCompletions = {};
    
    // Personal info section - check if required fields exist
    if (data.personalInfo) {
      const hasName = data.personalInfo.name && data.personalInfo.name.trim().length > 0;
      const hasEmail = data.personalInfo.email && data.personalInfo.email.trim().length > 0;
      const hasLocation = data.personalInfo.location && data.personalInfo.location.trim().length > 0;
      
      // Mark as complete if at least name and one other field are filled
      if (hasName && (hasEmail || hasLocation)) {
        newCompletions.personalInfo = hasEmail ? data.personalInfo.email : true;
      }
    }
    
    // Summary section
    if (data.summary && typeof data.summary === 'string' && data.summary.trim().length > 0) {
      newCompletions.summary = true;
    }
    
    // Experience section - check if there's at least one job with title and company
    if (Array.isArray(data.experience) && data.experience.length > 0) {
      const hasValidExperience = data.experience.some(job => 
        job.title && job.title.trim().length > 0 && 
        job.company && job.company.trim().length > 0
      );
      
      if (hasValidExperience) {
        newCompletions.experience = true;
      }
    }
    
    // Education section - check if there's at least one education entry with school/degree
    if (Array.isArray(data.education) && data.education.length > 0) {
      const hasValidEducation = data.education.some(edu => 
        (edu.school && edu.school.trim().length > 0) || 
        (edu.degree && edu.degree.trim().length > 0)
      );
      
      if (hasValidEducation) {
        newCompletions.education = true;
      }
    }
    
    // Skills section
    if (Array.isArray(data.skills) && data.skills.length > 0) {
      const hasValidSkills = data.skills.some(skill => 
        typeof skill === 'string' ? skill.trim().length > 0 : 
        (skill.name && skill.name.trim().length > 0)
      );
      
      if (hasValidSkills) {
        newCompletions.skills = true;
      }
    }
    
    // Licenses section - at least one license with state selected
    if (Array.isArray(data.licenses) && data.licenses.length > 0) {
      const hasValidLicense = data.licenses.some(lic => lic.state);
      if (hasValidLicense) {
        newCompletions.licenses = true;
      }
    }

    // Certifications section - at least one certification
    if (Array.isArray(data.certifications) && data.certifications.length > 0) {
      newCompletions.certifications = true;
    }

    // Healthcare Skills section - at least one EHR, clinical skill, or custom skill
    if (data.healthcareSkills) {
      const hasHealthcareSkills =
        (data.healthcareSkills.ehrSystems && data.healthcareSkills.ehrSystems.length > 0) ||
        (data.healthcareSkills.clinicalSkills && data.healthcareSkills.clinicalSkills.length > 0) ||
        (data.healthcareSkills.customSkills && data.healthcareSkills.customSkills.length > 0);
      if (hasHealthcareSkills) {
        newCompletions.healthcareSkills = true;
      }
    }

    // Additional info section - check if any subfield has content
    const hasAdditionalInfo = data.additional && (
      (Array.isArray(data.additional.certifications) && data.additional.certifications.length > 0) ||
      (Array.isArray(data.additional.languages) && data.additional.languages.length > 0) ||
      (Array.isArray(data.additional.projects) && data.additional.projects.length > 0) ||
      (Array.isArray(data.additional.volunteer) && data.additional.volunteer.length > 0) ||
      (Array.isArray(data.additional.awards) && data.additional.awards.length > 0) ||
      (Array.isArray(data.additional.customSections) && data.additional.customSections.length > 0)
    );

    if (hasAdditionalInfo) {
      newCompletions.additional = true;
    }

    console.log('📊 Calculated completion status:', newCompletions);
    setCompletedSections(newCompletions);
    localStorage.setItem('modern_resume_progress', JSON.stringify(newCompletions));
    console.log('📊 Updated section completion status after loading data');
  };
  
  // Auto-save to database for authenticated users
  useEffect(() => {
    // Add explicit debug logging at the beginning
    console.log('📊 Auto-save effect triggered with:', { 
      serviceIsAuthenticated, 
      hasResumeData: !!resumeData,
      hasPersonalInfo: !!(resumeData?.personalInfo),
      isNavigatingAway, 
      initialLoad: initialLoadRef.current,
      resumeId: currentResumeId,
      template: selectedTemplate,
      service: !!service,
      creatingNewResume: localStorage.getItem('creating_new_resume') === 'true'
    });
    
    // Skip auto-save if we're in the process of creating a new resume
    if (localStorage.getItem('creating_new_resume') === 'true') {
      console.log('📊 Auto-save skipped - creating new resume flag is set');
      return;
    }
    
    // Only auto-save if we have a service, user is authenticated, and there's resume data
    // Skip auto-save if we're navigating away
    if (service && serviceIsAuthenticated && resumeData && resumeData.personalInfo && !isNavigatingAway) {
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
      
      // Check if we're in editing mode
      const isEditingExistingResume = localStorage.getItem('editing_existing_resume') === 'true';
      const editingResumeId = localStorage.getItem('editing_resume_id');
      
      // Create a debounced auto-save
      const autoSaveTimeout = setTimeout(async () => {
        // Skip if already saving or navigating away
        if (isSaving || isNavigatingAway) return;

        // SAFETY: Clear stale import flags before autosave. The import flow
        // handles its own save in resume-import.jsx — autosave must NEVER
        // create new resumes via import_create_new. If these flags somehow
        // persist (race condition, incomplete import), nuke them here.
        if (typeof window !== 'undefined') {
          const staleImportPending = localStorage.getItem('import_pending') === 'true';
          const staleImportCreateNew = localStorage.getItem('import_create_new') === 'true';
          if (staleImportPending || staleImportCreateNew) {
            console.warn('📊 Auto-save: clearing stale import flags to prevent duplicate resume creation');
            localStorage.removeItem('import_pending');
            localStorage.removeItem('import_create_new');
          }
        }
        
        try {
          setIsSaving(true);
          // Show auto-save indicator
          setShowAutoSaveIndicator(true);
          
          // If we're in editing mode, ensure we're using the correct resumeId
          const saveId = isEditingExistingResume ? editingResumeId : currentResumeId;

          // GUARD: Autosave must ONLY update existing resumes, never create new ones.
          // Creation is handled by the data loading useEffect or the import flow.
          if (!saveId) {
            console.log('📊 Auto-save skipped — no resumeId yet (waiting for creation)');
            setIsSaving(false);
            setShowAutoSaveIndicator(false);
            return;
          }

          console.log('📊 Starting auto-save with resumeId:', saveId, 'template:', selectedTemplate,
                     isEditingExistingResume ? '(EDITING MODE)' : '');
          
          // Save using our service
          const saveResult = await saveResumeData(
            resumeData, 
            serviceIsAuthenticated, 
            selectedTemplate, 
            saveId,
            resumeName
          );
          
          // Update currentResumeId if a new ID was returned
          if (saveResult.success && saveResult.resumeId) {
            if (saveResult.resumeId !== currentResumeId) {
              console.log('📊 Updated resumeId from auto-save:', saveResult.resumeId, '(was:', currentResumeId, ')');
              
              // CRITICAL FIX: Update the state with the new resumeId
              updateContextResumeId(saveResult.resumeId);
              
              // Also update context if available
              if (updateContextResumeId) {
                updateContextResumeId(saveResult.resumeId);
              }
              
              // Also update localStorage for consistency
              localStorage.setItem('current_resume_id', saveResult.resumeId);
              
              // If we're in editing mode, also update the editing resume ID
              if (isEditingExistingResume) {
                localStorage.setItem('editing_resume_id', saveResult.resumeId);
              }
            } else {
              console.log('📊 Auto-save successful with existing resumeId:', currentResumeId);
            }
            
            // Clear the pending changes flag since we've successfully saved to the database
            localStorage.removeItem('pending_resume_changes');
            localStorage.removeItem('pending_resume_timestamp');
          } else {
            console.warn('📊 Auto-save problem:', saveResult.error || 'No resumeId returned');
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
    } else if (!serviceIsAuthenticated) {
      console.log('📊 Auto-save skipped - user not authenticated');
      
      // For unauthenticated users, always save to localStorage
      if (resumeData && resumeData.personalInfo) {
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
    } else if (!resumeData || !resumeData.personalInfo) {
      console.log('📊 Auto-save skipped - missing resume data or personal info');
    } else if (!service) {
      console.log('📊 Auto-save skipped - resume service not initialized');
    }
  }, [resumeData, serviceIsAuthenticated, selectedTemplate, currentResumeId, isSaving, resumeName, isNavigatingAway, resumeModified, service, updateContextResumeId]);
  
  // Save data to localStorage for unauthenticated users
  useEffect(() => {
    // Skip localStorage save if in DB-only mode
    if (isDbOnlyMode()) {
      console.log('📊 Skipping localStorage save - user is in DB-only mode');
      return;
    }
    
    // Save to localStorage for unauthenticated users
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
    
    // IMMEDIATE SAVE: Only save to localStorage if not in DB-only mode
    if (!isDbOnlyMode()) {
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
    } else {
      console.log('📊 Skipping localStorage save for section update - user is in DB-only mode');
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
      
      // Save progress to localStorage only if not in DB-only mode
      if (!isDbOnlyMode()) {
        saveResumeProgress(updatedCompletions);
      }
      
      // Show toast when a section is newly completed
      if (isComplete && !completedSections[sectionId]) {
        // Check if this completion brings us to 100%
        const newCompletions = { ...completedSections, [sectionId]: true };
        const allComplete = orderedSections.every(s => newCompletions[s.id]);

        if (allComplete) {
          // Full celebration: confetti + voice
          setCelebrationMessage("Your resume is ready to land your next role!");
          setIsFullCelebration(true);
          setShowCelebration(true);

          // Trigger speech NOW — must be in user gesture context (onChange chain)
          // setTimeout breaks the gesture chain, so we speak synchronously here
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance('Well, that was easy!');
            utterance.rate = 0.95;
            utterance.pitch = 0.85;
            utterance.volume = 0.9;
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v =>
              v.name.includes('Google US English') || v.name === 'Daniel' || v.name === 'Alex'
            ) || voices.find(v =>
              v.name.includes('Google') && v.lang.startsWith('en')
            ) || voices.find(v =>
              v.lang.startsWith('en')
            );
            if (preferred) utterance.voice = preferred;
            window.speechSynthesis.speak(utterance);
          }

          setTimeout(() => {
            setShowCelebration(false);
            setIsFullCelebration(false);
          }, 6500);
        } else {
          // Regular toast for individual section
          const messages = {
            personalInfo: "Contact info added",
            summary: "Summary done",
            experience: "Experience added",
            education: "Education added",
            skills: "Skills added",
            additional: "Additional info saved",
            licenses: "License added",
            certifications: "Certifications added",
            healthcareSkills: "Clinical skills added"
          };

          const message = messages[sectionId] || "Section complete";

          setIsFullCelebration(false);
          setCelebrationMessage(message);
          setShowCelebration(true);

          setTimeout(() => {
            setShowCelebration(false);
          }, 2500);
        }
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

      case 'licenses':
        // At least one license with state selected
        return Array.isArray(data) && data.length > 0 && data.some(lic => lic.state);

      case 'certifications':
        // At least one certification selected
        return Array.isArray(data) && data.length > 0;

      case 'healthcareSkills':
        // At least one EHR system or clinical skill selected
        return data && (
          (data.ehrSystems && data.ehrSystems.length > 0) ||
          (data.clinicalSkills && data.clinicalSkills.length > 0) ||
          (data.customSkills && data.customSkills.length > 0)
        );

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

  // Healthcare-specific section handlers
  const handleLicensesChange = (data) => {
    updateResumeData('licenses', data);
  };

  const handleCertificationsChange = (data) => {
    updateResumeData('certifications', data);
  };

  const handleHealthcareSkillsChange = (data) => {
    updateResumeData('healthcareSkills', data);
  };

  // Handle section completion
  const handleSectionComplete = (sectionId) => {
    // This function will be called when a section signals it's complete
    // We could add additional logic here if needed beyond what's in updateResumeData
    console.log(`Section ${sectionId} marked as complete`);
  };

  // Handle section change with smooth scroll on mobile
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);

    // Scroll to the top of the section content on all screen sizes
    setTimeout(() => {
      if (sectionContentRef.current) {
        // Reset internal scroll position
        sectionContentRef.current.scrollTop = 0;
        // Scroll viewport so the section is visible
        sectionContentRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 50);
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
      case 'licenses':
        return (
          <Licenses
            data={resumeData.licenses || []}
            updateData={handleLicensesChange}
          />
        );
      case 'certifications':
        return (
          <Certifications
            data={resumeData.certifications || []}
            updateData={handleCertificationsChange}
          />
        );
      case 'healthcareSkills':
        return (
          <HealthcareSkills
            data={resumeData.healthcareSkills || { ehrSystems: [], clinicalSkills: [], specialty: '', customSkills: [] }}
            updateData={handleHealthcareSkillsChange}
            experienceData={resumeData.experience}
            certifications={resumeData.certifications}
            onNavigateToSection={handleSectionChange}
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
            onNavigateToSection={handleSectionChange}
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
      
      // Priority immediate save to database for imports when authenticated
      if (isAuthenticated && service) {
        console.log('📊 IMPORT: Priority save to database for imported data, isDbOnlyMode:', isDbOnlyMode());
        
        // Show toast for import status
        toast.loading('Saving imported resume data...', { id: 'import-toast' });
        
        // Immediate save to database to override existing resume
        saveResumeData(
          resumeData, 
          true, 
          selectedTemplate, 
          currentResumeId,
          resumeName || 'Imported Resume',
          true // Force update
        ).then(result => {
          if (result && result.success) {
            console.log('📊 IMPORT: Successfully saved imported data to database with ID:', result.resumeId || currentResumeId);
            
            // Update IDs if needed
            if (result.resumeId && result.resumeId !== currentResumeId) {
              setCurrentResumeId(result.resumeId);
              localStorage.setItem('current_resume_id', result.resumeId);
            }
            
            // Verify the data was saved properly by loading it from the database
            const verifyImportSave = async () => {
              try {
                console.log('📊 IMPORT: Verifying imported data was saved correctly');
                const verifyId = result.resumeId || currentResumeId;
                
                // Fetch the resume data from the database
                const response = await fetch(`/api/resume/get?id=${verifyId}`);
                
                if (!response.ok) {
                  throw new Error(`Failed to verify import: ${response.status}`);
                }
                
                const verifyResult = await response.json();
                
                if (verifyResult.resume) {
                  console.log('📊 IMPORT: Verification successful, data saved correctly');

                  // Important: Clear import flags AFTER successful verification
                  localStorage.removeItem('import_pending');
                  localStorage.removeItem('import_target_resumeId');
                  localStorage.removeItem('import_create_new');
                  localStorage.removeItem('imported_resume_data');
                  localStorage.removeItem('imported_resume_override');
                  localStorage.removeItem('import_save_successful');
                  localStorage.removeItem('import_saved_resume_id');

                  // Update UI with verified data from database
                  setResumeData(verifyResult.resume.data);
                  updateCompletionStatusFromData(verifyResult.resume.data);

                  // Show success message
                  toast.success('Resume imported successfully!', { id: 'import-toast' });

                  // Force a refresh from the database to ensure we have the latest data
                  setForceDbRefresh(true);
                } else {
                  console.error('📊 IMPORT: Verification failed, data may not be saved correctly');
                  toast.error('Import verification failed. Please try again.', { id: 'import-toast' });
                }
              } catch (error) {
                console.error('📊 IMPORT: Error verifying import:', error);
                toast.error('Error verifying import. Please try again.', { id: 'import-toast' });
              }
            };
            
            // Run the verification after a short delay to ensure the database has been updated
            setTimeout(verifyImportSave, 500);
          } else {
            console.error('📊 IMPORT: Failed to save imported data to database:', result?.error);
            toast.error('Failed to save imported resume. Please try again.', { id: 'import-toast' });
          }
        }).catch(error => {
          console.error('📊 IMPORT: Error saving imported data:', error);
          toast.error('Error saving imported resume. Please try again.', { id: 'import-toast' });
        });
      } else {
        // For non-db users, just show a success message and clear the import flags
        toast.success('Resume imported successfully!', { id: 'import-toast' });
        localStorage.removeItem('imported_resume_data');
        localStorage.removeItem('imported_resume_override');
        localStorage.removeItem('import_pending');
        localStorage.removeItem('import_target_resumeId');
      }
    }
  }, [importedResumeData, isAuthenticated, currentResumeId, resumeData, selectedTemplate, resumeName, service, updateCompletionStatusFromData]);

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

  // Get the resume selection modal functionality
  const { navigateToPricing } = useResumeSelection();
  const { showPaywall } = usePaywall();

  // Replace the download handler with Puppeteer-based logic
  const handleDownloadPDF = async () => {
    // Check if user is authenticated
    if (!serviceIsAuthenticated) {
      // Save current resume data to localStorage before redirecting
      localStorage.setItem('pending_resume_download', 'true');
      
      // Also save the template choice and section order so they can be restored
      localStorage.setItem('modern_resume_data', JSON.stringify(resumeData));
      localStorage.setItem('resume_section_order', JSON.stringify(sectionOrder));
      localStorage.setItem('selected_resume_template', selectedTemplate);
      
      // Set flag to indicate migration is needed after authentication
      localStorage.setItem('needs_db_migration', 'true');
      
      // Generate a unique migration session ID to prevent duplicate migrations
      const migrationSessionId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('migration_session_id', migrationSessionId);
      
      // For download actions, we want to follow the subscription flow
      // rather than returning to the resume builder immediately
      // So we DON'T set post_auth_redirect here
      
      // Show message to user
      toast.loading('Please sign in to download your resume...', { id: 'download-auth-toast' });
      
      // Redirect to sign-in page with special action parameter
      router.push('/auth/signin?action=download');
      return;
    }

    // If we already know the resume isn't eligible, show paywall modal
    if ((!isEligibleForDownload || (subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId))) && currentResumeId) {
      showPaywall('download');
      return;
    }

    // Show initial loading toast
    const toastId = toast.loading('Checking subscription...');
    setIsDownloading(true);

    try {
      // Get the current resume ID for eligibility check
      const resumeIdForCheck = currentResumeId;
      
      // Check if user is eligible to download
      const eligibilityResponse = await fetch(`/api/resume/check-download-eligibility${resumeIdForCheck ? `?resumeId=${resumeIdForCheck}` : ''}`);
      const eligibilityData = await eligibilityResponse.json();

      if (!eligibilityData.eligible) {
        toast.dismiss(toastId);
        setIsDownloading(false);
        showPaywall('download');
        return;
      }
      
      // Handle one-time plan restrictions
      if (eligibilityData.plan === 'one-time') {
        // Check if this is the first download for a one-time plan
        if (eligibilityData.isFirstDownload) {
          // Show warning to user about one-time plan restriction
          toast.loading(
            'Note: Your one-time plan allows you to download this resume multiple times, but you cannot download different resumes.', 
            { id: toastId, duration: 5000 }
          );
        } else if (eligibilityData.error === 'different_resume_needs_plan') {
          // User is trying to download a different resume than their first download
          // They need to purchase another plan
          toast.error(
            'Your one-time plan only allows downloading the resume you previously downloaded. To download this different resume, you need to purchase another plan.', 
            { id: toastId, duration: 5000 }
          );
          setIsDownloading(false);
          
          // Save the current state before redirecting
          localStorage.setItem('pending_resume_download', 'true');
          localStorage.setItem('modern_resume_data', JSON.stringify(resumeData));
          localStorage.setItem('resume_section_order', JSON.stringify(sectionOrder));
          localStorage.setItem('selected_resume_template', selectedTemplate);
          
          // Store the current resume ID to maintain context after purchase
          localStorage.setItem('pending_download_resume_id', resumeIdForCheck);
          
          // Redirect to subscription page with special parameters
          router.push(`/subscription?action=download&reason=different_resume&current_resume=${resumeIdForCheck}&previous_resume=${eligibilityData.downloadedResumeId}`);
          return;
        } else if (eligibilityData.downloadedResumeId && eligibilityData.downloadedResumeId !== resumeIdForCheck) {
          // Fallback for old API response format
          toast.error(
            `Your one-time plan only allows downloading the resume you previously downloaded. Please contact support if you need to change resumes.`, 
            { id: toastId }
          );
          setIsDownloading(false);
          return;
        }
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
      
      // Only save if this is a new resume (no ID) or if there are unsaved changes
      const needsToSave = !resumeIdForDownload || resumeModified;
      
      if (serviceIsAuthenticated && needsToSave && service) {
        try {
          console.log('[DownloadPDF] Saving current resume data to database before generating PDF');
          const saveResult = await saveResumeData(
            resumeData, 
            serviceIsAuthenticated, 
            selectedTemplate,
            resumeIdForDownload,
            resumeName,
            true // Force update to ensure we have latest data for PDF
          );
          
          if (saveResult.success && saveResult.resumeId) {
            resumeIdForDownload = saveResult.resumeId;
            setCurrentResumeId(saveResult.resumeId);
            
            if (updateContextResumeId) {
              updateContextResumeId(saveResult.resumeId);
            }
            
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
          template: selectedTemplate || 'professional', // Default to Professional if not set
          resumeData,
          sectionOrder: resumeRenderOrder, // Render order pins Summary as #2
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
      
      // Record the download with our new API endpoint
      try {
        await fetch('/api/resume/record-download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resumeId: resumeIdForDownload
          }),
        });
        console.log('[DownloadPDF] Successfully recorded download for resume ID:', resumeIdForDownload);
      } catch (recordError) {
        // Don't block the download if recording fails
        console.error('[DownloadPDF] Error recording download:', recordError);
      }

      toast.success('Resume downloaded successfully!', { id: toastId });

      // If this was a free download, flip eligibility so next attempt shows paywall
      if (eligibilityData.isFreeDownload) {
        setIsEligibleForDownload(false);
      }
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
              updateContextResumeId(result.resumeId);
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
            updateContextResumeId(storedResumeId);
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
      
      // Check if we're in editing mode - if so, we should never override the resumeId
      const isEditingExistingResume = localStorage.getItem('editing_existing_resume') === 'true';
      const editingResumeId = localStorage.getItem('editing_resume_id');
      
      if (isEditingExistingResume && editingResumeId) {
        console.log('📊 SYNC - In editing mode, enforcing edited resume ID:', editingResumeId);
        
        // If our current state doesn't match the resume being edited, update it
        if (currentResumeId !== editingResumeId) {
          console.log('📊 SYNC - Correcting resumeId to match editing_resume_id');
          setCurrentResumeId(editingResumeId);
          localStorage.setItem('current_resume_id', editingResumeId);
        }
        return;
      }
      
      // Regular sync behavior for non-editing mode
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
        
        // Only update if we're not in editing mode
        const isEditingExistingResume = localStorage.getItem('editing_existing_resume') === 'true';
        if (!isEditingExistingResume && e.newValue !== currentResumeId) {
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
    
    // Skip if this template change is from database load
    if (templateChangeFromDbLoad.current) {
      console.log('📊 Template change from database load, skipping effect');
      return;
    }
    
    // Mark as modified when template changes
    setResumeModified(true);
    console.log('📊 Template changed to:', selectedTemplate, '- marking resume as modified');
    console.log('📊 Template change source:', new Error().stack);
    
    // Also save template to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_resume_template', selectedTemplate);
    }
    
  }, [selectedTemplate]);

  // Migrate localStorage data to database when user authenticates
  // This is the first step in moving toward using DB as single source of truth
  // for authenticated users while maintaining backward compatibility
  useEffect(() => {
    const migrateLocalStorageToDatabase = async () => {
      // Skip if we've already migrated in this session
      if (hasMigratedRef.current) {
        console.log('📊 Migration skipped - Already migrated in this React session');
        return;
      }
      
      // Only proceed if user is authenticated
      if (!isAuthenticated) {
        console.log('📊 Migration skipped - User not authenticated');
        return;
      }
      
      // Check if we have resume data to migrate
      const hasResumeData = typeof window !== 'undefined' && 
                           localStorage.getItem('modern_resume_data') !== null;
      
      // Check if migration is needed
      const needsMigration = typeof window !== 'undefined' && 
                            localStorage.getItem('needs_db_migration') === 'true';
      
      // Check if in DB-only mode
      const dbOnlyMode = typeof window !== 'undefined' && 
                        localStorage.getItem('db_only_mode') === 'true';
      
      // Use the centralized migration function
      try {
        const migrationResult = await migrateToDatabase({
          source: 'modern_resume_builder',
          // Include detailed context information
          context: {
            component: 'ModernResumeBuilder',
            currentResumeId,
            hasResumeData,
            needsMigration,
            dbOnlyMode,
            isAuthenticated,
            hasMigratedRef: hasMigratedRef.current,
            selectedTemplate,
            resumeName,
            url: typeof window !== 'undefined' ? window.location.href : 'server-side',
            timestamp: new Date().toISOString()
          },
          onSuccess: ({ resumeId }) => {
            // Mark that we've migrated in this session
            hasMigratedRef.current = true;
            
            // Update state with new resumeId
            setCurrentResumeId(resumeId);
            
            // Store the successful migration time
            if (typeof window !== 'undefined') {
              localStorage.setItem('migration_success_time', Date.now().toString());
              localStorage.setItem('migration_success_resumeId', resumeId);
            }
          },
          onError: (error) => {
            // Store the error for debugging
            if (typeof window !== 'undefined') {
              localStorage.setItem('migration_last_error', error.message || 'Unknown error');
              localStorage.setItem('migration_error_time', Date.now().toString());
            }
          }
        });
        
        if (migrationResult.success) {
          if (migrationResult.code === 'MIGRATION_SUCCESS') {
            toast.success('Your resume has been synced to your account! ⚠️ If you do not see it, REFRESH/RELOAD page.', { 
              id: 'migration-toast', 
              duration: 10000,
              style: {
                background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1), rgba(46, 204, 113, 0.1))',
                border: '1px solid rgba(52, 168, 83, 0.2)',
                padding: '16px',
                color: '#34a853'
              }
            });
          }
        } else if (migrationResult.code === 'ALREADY_DB_ONLY') {
          // Already in DB-only mode, update our ref
          hasMigratedRef.current = true;
        } else if (migrationResult.error) {
          // Show a more specific error message
          toast.error(`Unable to sync your resume data. Try to refresh/reload the page. If the problem persists, please contact me. Error: ${migrationResult.error}`, { id: 'migration-toast' });
        }
      } catch (error) {
        console.error('📊 Error during migration:', error);
        toast.error(`Unable to sync your resume data. Error: ${error.message || 'Unknown error'}`, { id: 'migration-toast' });
        
        // Store the error for debugging
        if (typeof window !== 'undefined') {
          localStorage.setItem('migration_last_error', error.message || 'Unknown error');
          localStorage.setItem('migration_error_time', Date.now().toString());
        }
      }
    };
    
    migrateLocalStorageToDatabase();
  }, [isAuthenticated, currentResumeId, selectedTemplate, resumeName]);

  // Add a new useEffect to update our migration ref when localStorage changes
  // This helps sync migration state across components
  useEffect(() => {
    const checkMigrationStatus = () => {
      if (typeof window === 'undefined') return;
      
      // If another component has completed migration, update our ref
      if (localStorage.getItem('db_only_mode') === 'true' && !hasMigratedRef.current) {
        console.log('📊 Detected migration completed by another component - updating ref');
        hasMigratedRef.current = true;
      }
    };
    
    // Check immediately and set up interval
    checkMigrationStatus();
    const interval = setInterval(checkMigrationStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Improve the DB-only mode transition
  useEffect(() => {
    // This effect ensures that authenticated users in DB-only mode 
    // completely stop using localStorage for resume data
    if (isAuthenticated && isDbOnlyMode()) {
      console.log('📊 User is authenticated and in DB-only mode');
      
      // Function to load resume directly from database, bypassing localStorage
      const loadFromDatabase = async () => {
        if (!currentResumeId) {
          console.log('📊 No resumeId available, cannot load from database');
          return;
        }
        
        // IMPORTANT: Check if there's an import pending before loading from DB
        const importPending = typeof window !== 'undefined' && localStorage.getItem('import_pending') === 'true';
        const importTargetResumeId = localStorage.getItem('import_target_resumeId');
        const importSaveSuccessful = localStorage.getItem('import_save_successful') === 'true';
        const importSavedResumeId = localStorage.getItem('import_saved_resume_id');
        
        // If we have a successful import save, prioritize loading that data
        if (importSaveSuccessful && importSavedResumeId) {
          console.log('📊 Import save successful, loading verified data from database:', importSavedResumeId);
          
          try {
            const response = await fetch(`/api/resume/get?id=${importSavedResumeId}`);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch resume: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success && result.resume) {
              console.log('📊 Successfully loaded verified import data from database');
              setResumeData(result.resume.data);
              setResumeName(result.resume.title || 'My Resume');
              if (result.resume.template) {
                setTemplateFromDatabase(result.resume.template);
              }
              updateCompletionStatusFromData(result.resume.data);
              
              // Clear import flags now that we've loaded the verified data
              localStorage.removeItem('import_pending');
              localStorage.removeItem('import_target_resumeId');
              localStorage.removeItem('import_create_new');
              localStorage.removeItem('imported_resume_data');
              localStorage.removeItem('imported_resume_override');
              localStorage.removeItem('import_save_successful');
              localStorage.removeItem('import_saved_resume_id');
              
              return; // Skip further processing
            }
          } catch (error) {
            console.error('📊 Error loading verified import data:', error);
          }
        }
        
        // If this is an import operation targeting the current resumeId, skip database load
        if (importPending && (importTargetResumeId === currentResumeId || !importTargetResumeId)) {
          console.log('📊 Import operation pending for resumeId:', importTargetResumeId || 'new resume');
          console.log('📊 Skipping database load to prevent overriding imported data');
          
          // If we have imported data in memory or localStorage, prioritize it
          const importedDataStr = localStorage.getItem('imported_resume_data');
          if (importedDataStr) {
            try {
              const importedData = JSON.parse(importedDataStr);
              console.log('📊 Using imported data instead of loading from database');
              
              // Instead of just returning, proactively save imported data to DB
              // This ensures the imported data persists in the database
              try {
                const response = await fetch('/api/resume/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    resumeData: importedData,
                    resumeId: currentResumeId,
                    template: selectedTemplate || 'ats',
                    title: resumeName || 'Imported Resume',
                    forceUpdate: true,
                    isImport: true // Explicitly mark as import
                  }),
                });
                
                if (response.ok) {
                  const result = await response.json();
                  if (result.success) {
                    console.log('�� Successfully saved imported data to database');
                    
                    // Update UI with imported data
                    setResumeData(importedData);
                    updateCompletionStatusFromData(importedData);
                    
                    // Show success message
                    toast.success('Resume imported successfully!', { id: 'import-toast' });

                    // Set force refresh flag to ensure we have the latest data
                    setForceDbRefresh(true);
                    
                    // Store the successful save result ID for verification
                    localStorage.setItem('import_save_successful', 'true');
                    localStorage.setItem('import_saved_resume_id', result.resumeId || currentResumeId);
                    
                    // Verify the save was successful by loading from the database after a delay
                    setTimeout(async () => {
                      try {
                        const verifyResponse = await fetch(`/api/resume/get?id=${currentResumeId}`);
                        if (verifyResponse.ok) {
                          const verifyResult = await verifyResponse.json();
                          if (verifyResult.resume) {
                            console.log('📊 Import verification successful');
                            
                            // Compare the imported data with the data in the database
                            const importedDataStr = localStorage.getItem('imported_resume_data');
                            if (importedDataStr) {
                              try {
                                const importedData = JSON.parse(importedDataStr);
                                const dbData = verifyResult.resume.data;
                                
                                // Check if the name matches as a simple verification
                                const importedName = importedData.personalInfo?.name;
                                const dbName = dbData.personalInfo?.name;
                                
                                if (importedName === dbName) {
                                  console.log('📊 Import verification confirmed - names match:', importedName);
                                  
                                  // Only now that we've verified, clear import flags
                                  localStorage.removeItem('import_pending');
                                  localStorage.removeItem('import_target_resumeId');
                                  localStorage.removeItem('import_create_new');
                                  localStorage.removeItem('imported_resume_data');
                                  localStorage.removeItem('imported_resume_override');
                                } else {
                                  console.warn('📊 Import verification failed - names do not match:', 
                                    { importedName, dbName });
                                  
                                  // Retry the save with a stronger force update
                                  console.log('📊 Retrying import with stronger force update');
                                  const retryResponse = await fetch('/api/resume/save', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      resumeData: importedData,
                                      resumeId: currentResumeId,
                                      template: selectedTemplate || 'ats',
                                      title: resumeName || 'Imported Resume',
                                      forceUpdate: true,
                                      isImport: true
                                    }),
                                  });
                                  
                                  if (retryResponse.ok) {
                                    console.log('📊 Retry save successful, scheduling final verification');
                                    // Schedule a final verification
                                    setTimeout(async () => {
                                      try {
                                        const finalVerifyResponse = await fetch(`/api/resume/get?id=${currentResumeId}`);
                                        if (finalVerifyResponse.ok) {
                                          const finalVerifyResult = await finalVerifyResponse.json();
                                          if (finalVerifyResult.success) {
                                            console.log('📊 Final import verification completed');
                                            
                                            // Update UI with verified data
                                            setResumeData(finalVerifyResult.resume.data);
                                            updateCompletionStatusFromData(finalVerifyResult.resume.data);
                                            
                                            // Clear import flags after final verification
                                            localStorage.removeItem('import_pending');
                                            localStorage.removeItem('import_target_resumeId');
                                            localStorage.removeItem('import_create_new');
                                            localStorage.removeItem('imported_resume_data');
                                            localStorage.removeItem('imported_resume_override');
                                          }
                                        }
                                      } catch (error) {
                                        console.error('📊 Error in final verification:', error);
                                      }
                                    }, 1000); // Longer delay for final verification
                                  }
                                }
                              } catch (error) {
                                console.error('📊 Error comparing imported data with DB data:', error);
                              }
                            } else {
                              // If we can't compare, just clear the flags
                              localStorage.removeItem('import_pending');
                              localStorage.removeItem('import_target_resumeId');
                              localStorage.removeItem('import_create_new');
                              localStorage.removeItem('imported_resume_data');
                              localStorage.removeItem('imported_resume_override');
                            }
                          }
                        }
                      } catch (error) {
                        console.error('📊 Error verifying import:', error);
                      }
                    }, 1000); // Increased delay from 500ms to 1000ms
                  }
                }
              } catch (error) {
                console.error('📊 Error saving imported data to database:', error);
              }
              
              return;
            } catch (error) {
              console.error('📊 Error parsing imported data:', error);
            }
          }
          
          return;
        }
        
        try {
          console.log('📊 Loading resume directly from database, ID:', currentResumeId);
          const response = await fetch(`/api/resume/get?id=${currentResumeId}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              console.error(`Resume with ID ${currentResumeId} not found in database.`);
              return;
            }
            throw new Error(`Failed to fetch resume: ${response.status}`);
          }
          
          const result = await response.json();
          if (result.success && result.resume) {
            console.log('📊 Successfully loaded resume from database');
            setResumeData(result.resume.data);
            setResumeName(result.resume.title || 'My Resume');
            if (result.resume.template) {
              setTemplateFromDatabase(result.resume.template);
            }
            updateCompletionStatusFromData(result.resume.data);
          }
        } catch (error) {
          console.error('Error loading resume from database:', error);
        }
      };
      
      // Only load from database if we're not in initial load or if force refresh is requested
      if (!initialLoadRef.current || forceDbRefresh) {
        loadFromDatabase();
        
        // Reset the force refresh flag after attempting to load
        if (forceDbRefresh) {
          setForceDbRefresh(false);
        }
      }
    }
  }, [isAuthenticated, currentResumeId, isDbOnlyMode, forceDbRefresh]);

  // Add cleanup of editing flags when component unmounts
  useEffect(() => {
    // Cleanup function for component unmount
    return () => {
      if (typeof window !== 'undefined') {
        // Clean up editing flags on unmount
        localStorage.removeItem('editing_existing_resume');
        localStorage.removeItem('editing_resume_id');
      }
    };
  }, []);
  
  // Check download eligibility when the page loads or resumeId changes
  useEffect(() => {
    const checkDownloadEligibility = async () => {
      if (!serviceIsAuthenticated || !currentResumeId) return;
      
      setIsCheckingEligibility(true);
      try {
        const eligibilityResponse = await fetch(`/api/resume/check-download-eligibility?resumeId=${currentResumeId}`);
        const eligibilityData = await eligibilityResponse.json();
        
        console.log('🔍 Download eligibility check:', eligibilityData);
        
        // Only set as eligible if the API explicitly says it's eligible
        // For one-time plans, this means the resume ID must match the downloaded resume ID
        setIsEligibleForDownload(eligibilityData.eligible === true);
      } catch (error) {
        console.error('Error checking download eligibility:', error);
        // Default to not eligible in case of error to prevent bypassing subscription requirements
        setIsEligibleForDownload(false);
      } finally {
        setIsCheckingEligibility(false);
      }
    };
    
    checkDownloadEligibility();
  }, [serviceIsAuthenticated, currentResumeId]);

  // Check subscription details when the page loads
  useEffect(() => {
    const checkSubscriptionDetails = async () => {
      if (!serviceIsAuthenticated) return;
      
      try {
        const response = await fetch('/api/resume/check-download-eligibility');
        const data = await response.json();
        
        if (data.eligible && data.plan) {
          // Set the plan name based on the subscription data
          let planDisplayName = 'Free Plan';
          
          // Map plan IDs to display names
          if (data.plan === 'weekly') {
            planDisplayName = 'Weekly Pro';
          } else if (data.plan === 'monthly') {
            planDisplayName = 'Monthly Pro';
          } else if (data.plan === 'one-time') {
            planDisplayName = 'One-Time Download';
            
            // For one-time plans, check which resume IDs are eligible
            try {
              const oneTimeResponse = await fetch('/api/subscription/get-one-time-subscriptions');
              if (oneTimeResponse.ok) {
                const oneTimeData = await oneTimeResponse.json();
                console.log('One-time subscriptions:', oneTimeData.subscriptions);
                
                // Extract eligible resume IDs from subscriptions
                if (oneTimeData.subscriptions && oneTimeData.subscriptions.length > 0) {
                  const eligibleIds = oneTimeData.subscriptions
                    .filter(sub => sub.metadata?.downloadedResumeId)
                    .map(sub => sub.metadata.downloadedResumeId);
                  
                  console.log('Eligible resume IDs for one-time plans:', eligibleIds);
                  setEligibleResumeIds(eligibleIds);
                }
              }
            } catch (oneTimeError) {
              console.error('Error fetching one-time subscriptions:', oneTimeError);
            }
          } else {
            // Use the plan name directly if it doesn't match our known IDs
            planDisplayName = data.plan;
          }
          
          setSubscriptionDetails({
            planName: planDisplayName,
            expirationDate: data.expirationDate
          });
          
          // Store the plan name in localStorage for other components to access
          localStorage.setItem('current_subscription_plan', planDisplayName);
        }
      } catch (error) {
        console.error('Error checking subscription details:', error);
      }
    };
    
    checkSubscriptionDetails();
  }, [serviceIsAuthenticated]);

  return (
    <DndProvider backend={HTML5Backend}>
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
        
        {/* Debug tools removed */}
        
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
          <Celebrations message={celebrationMessage} isFullCelebration={isFullCelebration} />
        )}
        
        {/* Floating View Preview Button */}
        <button
          className={`${styles.viewPreviewButton} ${previewUpdated ? styles.previewUpdated : ''}`}
          onClick={scrollToPreview}
          aria-label="View resume preview"
          style={showStickyDownload && calculateProgress() >= 50 ? { bottom: '80px' } : undefined}
        >
          <span className={styles.viewPreviewIcon}>👁️</span>
          <span>View Preview</span>
          {previewUpdated && <span className={styles.updateIndicator}></span>}
        </button>
        
        <div className={styles.builderColumn}>
          <a href="/profile" className={styles.backToProfile}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Profile
          </a>
          <h1 className={styles.builderTitle}>
            {internalJobContext ? 'Tailor Your Resume' : 'Build Your Resume'}
          </h1>

          {/* Compact Job Tailoring Banner — one block replaces banner + card + import */}
          {internalJobContext && (
            <div className={styles.tailoringBanner}>
              {/* Top row: job target + edit link */}
              <div className={styles.tailoringBannerTop}>
                <div className={styles.tailoringJobBadge}>
                  <span className={styles.tailoringJobIcon}>🎯</span>
                  <span className={styles.tailoringJobTitle}>{internalJobContext.jobTitle || 'Target Position'}</span>
                </div>
                <button
                  className={styles.tailoringEditBtn}
                  onClick={() => setIsJobDescriptionModalOpen(true)}
                  aria-label="Change job description"
                >
                  Edit Job
                </button>
              </div>

              {/* Tailor button */}
              <button
                className={styles.tailorAllButton}
                onClick={handleTailorAllClick}
                disabled={isTailoring || !resumeData.experience || resumeData.experience.length === 0}
                title={!resumeData.experience || resumeData.experience.length === 0 ?
                  "Add at least one work experience first" :
                  "Tailor your resume to the job description"}
              >
                {isTailoring ? (
                  <>
                    <FaSpinner className={styles.spinnerIcon} />
                    Tailoring...
                  </>
                ) : (
                  <>
                    <span className={styles.tailorAllButtonIcon}>⚡</span>
                    Customize in One Click
                  </>
                )}
              </button>

              {/* Status note + import link */}
              <div className={styles.tailoringBannerFooter}>
                {isTailoring ? (
                  <span className={styles.tailoringNote}>Optimizing your summary, experience, and skills...</span>
                ) : !resumeData.experience || resumeData.experience.length === 0 ? (
                  <span className={styles.tailoringNote}>Add experience below first, then customize</span>
                ) : (
                  <span className={styles.tailoringNote}>Updates summary & experience only</span>
                )}
                <a
                  href={`/resume-import?job=${encodeURIComponent(JSON.stringify(internalJobContext))}&job_targeting=true`}
                  className={styles.tailoringImportLink}
                  onClick={() => {
                    localStorage.setItem('import_pending', 'true');
                    localStorage.setItem('import_create_new', 'true');
                  }}
                >
                  Wrong resume? Import a different one
                </a>
              </div>
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

          {/* Import Resume - only show when no sections completed yet */}
          {!internalJobContext && calculateProgress() === 0 && (
            <div className={styles.importButtonContainer}>
              <a
                href="/resume-import"
                className={styles.importButton}
                onClick={() => {
                  localStorage.setItem('import_pending', 'true');
                  localStorage.setItem('import_create_new', 'true');
                }}
              >
                <span className={styles.importIcon}>📄</span>
                Import
              </a>
              <p className={styles.importDescription}>
                Have an existing resume? Import it to save time!
              </p>
            </div>
          )}
          
          <div className={styles.builderContent}>
            <div className={styles.navigationColumn}>
              <SectionNavigation
                sections={orderedSections}
                activeSection={activeSection}
                completedSections={completedSections}
                onSectionChange={handleSectionChange}
                onReorderSections={reorderSections}
                onResetSectionOrder={resetSectionOrder}
              />
            </div>

            <div className={styles.sectionContent} ref={sectionContentRef}>
              {renderCurrentSection()}

              {/* Next / Back section navigation */}
              {(() => {
                const currentIdx = orderedSections.findIndex(s => s.id === activeSection);
                const prevSection = currentIdx > 0 ? orderedSections[currentIdx - 1] : null;
                const nextSection = currentIdx < orderedSections.length - 1 ? orderedSections[currentIdx + 1] : null;
                const isLast = currentIdx === orderedSections.length - 1;

                return (
                  <div className={styles.sectionNav}>
                    {prevSection ? (
                      <button
                        className={styles.sectionNavBack}
                        onClick={() => handleSectionChange(prevSection.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        {prevSection.label}
                      </button>
                    ) : <span />}

                    {nextSection ? (
                      <button
                        className={styles.sectionNavNext}
                        onClick={() => handleSectionChange(nextSection.id)}
                      >
                        {nextSection.label}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ) : isLast ? (
                      <button
                        className={styles.sectionNavNext}
                        onClick={() => {
                          // Scroll to template selector / preview area
                          const templateSection = document.querySelector(`.${styles.templateSelectorContainer}`);
                          if (templateSection) {
                            templateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                      >
                        Preview &amp; Download
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ) : <span />}
                  </div>
                );
              })()}
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
          {/* Tab Navigation */}
          <div className={styles.previewTabs}>
            <button
              className={`${styles.tabButton} ${activePreviewTab === 'preview' ? styles.activeTab : ''}`}
              onClick={() => setActivePreviewTab('preview')}
            >
              <FaEye /> Preview
            </button>
            <button
              className={`${styles.tabButton} ${activePreviewTab === 'score' ? styles.activeTab : ''}`}
              onClick={() => setActivePreviewTab('score')}
            >
              <FaChartLine /> ATS Score
            </button>
          </div>

          {/* Tab Content */}
          {activePreviewTab === 'preview' ? (
            <>
              <div className={styles.previewHeader}>
                <h2 className={styles.previewTitle}>Resume Preview</h2>
                <p className={styles.previewSubtitle}>This is how your resume will look to employers</p>
              </div>
              <ResumePreview
                resumeData={resumeData}
                template={selectedTemplate}
                sectionOrder={resumeRenderOrder}
              />
            </>
          ) : (
            <ATSScorePanel
              resumeData={resumeData}
              jobContext={internalJobContext}
            />
          )}
        </div>
        
        <div className={styles.actionContainer} ref={actionContainerRef}>
          {subscriptionDetails.planName === 'One-Time Download' && currentResumeId && eligibleResumeIds.includes(currentResumeId) && (
            <div className={styles.purchasedBadgeContainer}>
              <span className={styles.purchasedBadge}>
                Purchased
              </span>
            </div>
          )}
          <button 
            className={`${styles.downloadButton} ${(!isEligibleForDownload || (subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId))) ? styles.buyPlanButton : ''}`}
            onClick={handleDownloadPDF}
            disabled={isDownloading || isCheckingEligibility}
            style={{
              background: (isEligibleForDownload && !(subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId))) ? 
                'linear-gradient(135deg, var(--secondary-green), #28b485)' : 
                'linear-gradient(135deg, #f39c12, #f5b041)',
              boxShadow: (isEligibleForDownload && !(subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId))) ? 
                '0 6px 15px rgba(52, 168, 83, 0.2)' : 
                '0 6px 15px rgba(243, 156, 18, 0.2)'
            }}
          >
            {isDownloading ? (
              <>
                <FaSpinner className={styles.spinnerIcon} />
                Preparing PDF...
              </>
            ) : isCheckingEligibility ? (
              <>
                <FaSpinner className={styles.spinnerIcon} />
                Checking eligibility...
              </>
            ) : (
              <>
                <FaDownload className={styles.downloadIcon} />
                {(isEligibleForDownload && !(subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId))) ? 'Download Resume' : 'Buy Plan'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sticky download bar — visible when original button is scrolled out of view and progress ≥ 50% */}
      {showStickyDownload && calculateProgress() >= 50 && (
        <div className={styles.stickyDownloadBar}>
          <button
            className={`${styles.downloadButton} ${(!isEligibleForDownload || (subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId))) ? styles.buyPlanButton : ''}`}
            onClick={handleDownloadPDF}
            disabled={isDownloading || isCheckingEligibility}
            style={{
              background: (isEligibleForDownload && !(subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId)))
                ? 'linear-gradient(135deg, var(--secondary-green), #28b485)'
                : 'linear-gradient(135deg, #f39c12, #f5b041)',
              boxShadow: 'none'
            }}
          >
            {isDownloading ? (
              <>
                <FaSpinner className={styles.spinnerIcon} />
                Preparing PDF...
              </>
            ) : isCheckingEligibility ? (
              <>
                <FaSpinner className={styles.spinnerIcon} />
                Checking...
              </>
            ) : (
              <>
                <FaDownload className={styles.downloadIcon} />
                {(isEligibleForDownload && !(subscriptionDetails.planName === 'One-Time Download' && currentResumeId && !eligibleResumeIds.includes(currentResumeId))) ? 'Download Resume' : 'Buy Plan'}
              </>
            )}
          </button>
        </div>
      )}
      </ResumeProvider>
    </DndProvider>
  );
};

export default ModernResumeBuilder; 