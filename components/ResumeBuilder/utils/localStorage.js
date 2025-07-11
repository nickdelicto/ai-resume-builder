// Local storage keys
const RESUME_DATA_KEY = 'modern_resume_data';
const RESUME_PROGRESS_KEY = 'modern_resume_progress';

// Import DB-only mode check from resumeUtils
import { isDbOnlyMode } from '../../../lib/resumeUtils';

// Save resume data to local storage
export const saveResumeData = (data) => {
  try {
    // Skip saving to localStorage if in DB-only mode
    if (isDbOnlyMode()) {
      console.log('📊 Skipping localStorage save - user is in DB-only mode');
      return;
    }
    
    localStorage.setItem(RESUME_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving resume data to localStorage:', error);
  }
};

// Get resume data from local storage
export const getResumeData = () => {
  try {
    // If in DB-only mode, don't read from localStorage
    if (isDbOnlyMode()) {
      console.log('📊 Skipping localStorage read - user is in DB-only mode');
      return null;
    }
    
    const savedData = localStorage.getItem(RESUME_DATA_KEY);
    return savedData ? JSON.parse(savedData) : null;
  } catch (error) {
    console.error('Error retrieving resume data from localStorage:', error);
    return null;
  }
};

// Save resume section completion progress
export const saveResumeProgress = (progress) => {
  try {
    // Skip saving to localStorage if in DB-only mode
    if (isDbOnlyMode()) {
      console.log('📊 Skipping localStorage progress save - user is in DB-only mode');
      return;
    }
    
    localStorage.setItem(RESUME_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving progress to localStorage:', error);
  }
};

// Get resume section completion progress
export const getResumeProgress = () => {
  try {
    // If in DB-only mode, don't read from localStorage
    if (isDbOnlyMode()) {
      console.log('📊 Skipping localStorage progress read - user is in DB-only mode');
      return null;
    }
    
    const savedProgress = localStorage.getItem(RESUME_PROGRESS_KEY);
    return savedProgress ? JSON.parse(savedProgress) : null;
  } catch (error) {
    console.error('Error retrieving progress from localStorage:', error);
    return null;
  }
};

// Clear all resume data from local storage
export const clearResumeData = () => {
  try {
    localStorage.removeItem(RESUME_DATA_KEY);
    localStorage.removeItem(RESUME_PROGRESS_KEY);
  } catch (error) {
    console.error('Error clearing resume data from localStorage:', error);
  }
}; 