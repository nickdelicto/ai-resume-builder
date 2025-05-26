import React, { useState, useEffect } from 'react';
import styles from './Sections.module.css';
import { useResumeContext } from '../ResumeContext';
import { toast } from 'react-hot-toast';

const Skills = ({ data, updateData, jobContext, onNavigateToSection }) => {
  const [skills, setSkills] = useState(data || []);
  const [newSkill, setNewSkill] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [manuallyAddedSkills, setManuallyAddedSkills] = useState(new Set());
  const [showContextWarning, setShowContextWarning] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  
  // Get resume context to access experience data
  const resumeContext = useResumeContext();
  const experienceData = resumeContext?.resumeData?.experience || [];
  
  // Function to navigate to the Experience section
  const navigateToExperience = (e) => {
    e.preventDefault();
    if (onNavigateToSection) {
      onNavigateToSection('experience');
    }
  };
  
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setSkills(data);
      
      // Initialize manually added skills tracking from existing data
      const initialManualSkills = new Set();
      data.forEach(skill => initialManualSkills.add(skill));
      setManuallyAddedSkills(initialManualSkills);
    }
  }, [data]);
  
  const addSkill = () => {
    if (!newSkill.trim()) return;
    
    const skillToAdd = newSkill.trim();
    
    // Check for maximum skills limit
    const MAX_SKILLS = 20;
    if (skills.length >= MAX_SKILLS) {
      setShowLimitWarning(true);
      // Clear warning after 10 seconds
      setTimeout(() => setShowLimitWarning(false), 10000);
      setNewSkill('');
      return;
    }
    
    // Only add if not already in the list
    if (!skills.includes(skillToAdd)) {
      const updatedSkills = [...skills, skillToAdd];
    setSkills(updatedSkills);
      updateData(updatedSkills);
      
      // Track that this was manually added
      const updatedManualSkills = new Set(manuallyAddedSkills);
      updatedManualSkills.add(skillToAdd);
      setManuallyAddedSkills(updatedManualSkills);
      
      // Check if we're approaching or at the limit after adding
      const remainingSlots = MAX_SKILLS - updatedSkills.length;
      if (remainingSlots === 0) {
        toast.info('You\'ve reached the maximum limit of 20 skills.', { duration: 3000 });
      } else if (remainingSlots <= 3) {
        toast.info(`You can add ${remainingSlots} more skill${remainingSlots !== 1 ? 's' : ''} before reaching the limit.`, { duration: 3000 });
      }
    } else {
      toast.info('This skill is already in your list.', { duration: 2000 });
    }
    
    setNewSkill('');
  };
  
  const removeSkill = (index) => {
    const skillToRemove = skills[index];
    const updatedSkills = skills.filter((_, i) => i !== index);
    setSkills(updatedSkills);
    updateData(updatedSkills);
    
    // Remove from manually added set if present
    if (manuallyAddedSkills.has(skillToRemove)) {
      const updatedManualSkills = new Set(manuallyAddedSkills);
      updatedManualSkills.delete(skillToRemove);
      setManuallyAddedSkills(updatedManualSkills);
    }
    
    // Clear limit warning if we're removing skills
    if (showLimitWarning) {
      setShowLimitWarning(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };
  
  const generateSkills = async () => {
    // Check if already at maximum skill limit (20)
    const MAX_SKILLS = 20;
    if (skills.length >= MAX_SKILLS) {
      setShowLimitWarning(true);
      // Clear warning after 10 seconds
      setTimeout(() => setShowLimitWarning(false), 10000);
      return;
    }
    
    // Check if we have enough experience data to generate relevant skills
    const hasEnoughContext = experienceData && 
      experienceData.length > 0 && 
      experienceData[0].title && 
      experienceData[0].company;
    
    if (!hasEnoughContext) {
      // Show contextual warning if no experience data
      setShowContextWarning(true);
      // Clear warning after 10 seconds
      setTimeout(() => setShowContextWarning(false), 10000);
      return;
    }
    
    setIsGenerating(true);
    
    // Calculate how many more skills we can add before hitting the limit
    const remainingSlots = MAX_SKILLS - skills.length;
    
    try {
      // Get the resume summary and personal info from context
      const summary = resumeContext?.resumeData?.summary || '';
      const education = resumeContext?.resumeData?.education || [];
      const personalInfo = resumeContext?.resumeData?.personalInfo || {};
      
      // Prepare the API request payload
      // Adjust requested skill count based on remaining slots
      const requestCount = Math.min(8, remainingSlots);
      
      const payload = {
        existingSkills: skills,
        professionalContext: {
          title: experienceData[0]?.title || '',
          linkedin: personalInfo.linkedin || '',
          website: personalInfo.website || ''
        },
        experience: experienceData.map(exp => ({
          title: exp.title || '',
          company: exp.company || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          description: exp.description || ''
        })),
        education: education,
        summary: summary,
        jobContext: jobContext?.description || null,
        count: requestCount // Request only as many skills as we have space for
      };
      
      // Call our API endpoint
      const response = await fetch('/api/generate-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate skills');
      }
      
      const data = await response.json();
      
      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        // Only add skills that don't already exist in the list
        const newSkills = data.skills.filter(skill => 
          !skills.includes(skill) && skill.trim() !== ''
        );
        
        if (newSkills.length > 0) {
          const updatedSkills = [...skills, ...newSkills];
          setSkills(updatedSkills);
          updateData(updatedSkills);
          
          // Check if we've reached or are approaching the maximum after adding new skills
          const updatedCount = updatedSkills.length;
          const isAtMaximum = updatedCount >= MAX_SKILLS;
          const isApproachingMax = updatedCount >= MAX_SKILLS - 3;
          
          // Show appropriate success message
          if (isAtMaximum) {
            toast.success(
              <div>
                <p>Added {newSkills.length} skills to your resume!</p>
                <p>You've reached the maximum limit of {MAX_SKILLS} skills.</p>
              </div>, 
              { duration: 5000 }
            );
          } else if (isApproachingMax) {
            toast.success(
              <div>
                <p>Added {newSkills.length} skills to your resume!</p>
                <p>You can add {MAX_SKILLS - updatedCount} more skill{MAX_SKILLS - updatedCount !== 1 ? 's' : ''} before reaching the limit.</p>
              </div>, 
              { duration: 5000 }
            );
          } else {
            toast.success(`Added ${newSkills.length} relevant skills to your resume!`, { duration: 3000 });
          }
        } else {
          // If all suggested skills were duplicates
          toast.info('All suggested skills are already in your list. Try adding some experience details for more varied suggestions.', { duration: 4000 });
        }
      } else {
        throw new Error('No skills generated');
      }
    } catch (error) {
      console.error('Error generating skills:', error);
      
      // Create custom error messages based on error type
      let errorMessage = 'We\'re having trouble generating skills.';
      
      // Check for common API errors
      if (error.message.includes('API key')) {
        errorMessage = 'Our AI service is temporarily unavailable.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'We\'ve reached our AI service limit for the moment.';
      } else if (error.message.includes('timeout') || error.message.includes('network')) {
        errorMessage = 'Connection to our AI service timed out.';
      }
      
      toast.error(
        <div>
          <p>{errorMessage}</p>
          <p>Please try again later or add skills manually.</p>
        </div>,
        { duration: 7000 }
      );
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Helper function to shuffle array (used for sample skills)
  const shuffleArray = (array) => {
    // Create a copy to avoid mutating the original array
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  return (
    <div className={styles.sectionContainer}>
      <h2 className={styles.sectionTitle}>Skills</h2>
      <p className={styles.sectionDescription}>
        List your technical, professional, and relevant soft skills.
      </p>
      
        <div className={styles.skillInputContainer}>
          <input
            type="text"
          className={styles.formInput}
          placeholder="Add a skill (e.g. Project Management)"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className={styles.addSkillButton}
            onClick={addSkill}
          disabled={!newSkill.trim()}
          >
            Add
          </button>
        </div>
      
      {showLimitWarning && (
        <div className={`${styles.completionHint} ${styles.warningHint}`}>
          <span className={styles.hintIcon}>⚠️</span>
          <span className={styles.hintText}>
            <strong>Maximum skills limit reached (20).</strong> Please remove some skills before adding more to maintain a focused, relevant skills section.
          </span>
      </div>
      )}
      
      <div className={styles.skillsContainer}>
        {skills.map((skill, index) => (
          <div 
            key={index} 
            className={`${styles.skillBadge} ${manuallyAddedSkills.has(skill) ? styles.manualSkill : styles.aiSkill}`}
          >
            <span className={styles.skillText}>{skill}</span>
            <button 
              className={styles.removeSkillButton}
              onClick={() => removeSkill(index)}
              aria-label={`Remove ${skill}`}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      
      {/* {skills.length === 0 && (
        <div className={styles.emptyMessage}>
          No skills added yet. Add skills manually or generate them.
        </div>
      )} */}
      
      {showContextWarning && (
        <div className={`${styles.completionHint} ${styles.warningHint}`}>
          <span className={styles.hintIcon}>⚠️</span>
          <span className={styles.hintText}>
            <strong>Please <a href="#" className={styles.sectionLink} onClick={navigateToExperience}>add work experience first</a>!</strong> This helps our AI suggest skills relevant to your background. Or, you can add skills manually using the input above.
          </span>
        </div>
      )}
      
      <button 
        className={`${styles.aiButton} ${isGenerating ? styles.generating : ''}`}
        onClick={generateSkills}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : '✨ Suggest Relevant Skills'}
      </button>
      
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> Include a mix of technical skills, soft skills, and industry-specific expertise. Aim for 8-12 key skills.
        </span>
      </div>
    </div>
  );
};

export default Skills; 