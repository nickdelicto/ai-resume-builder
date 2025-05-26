import React, { useState, useEffect } from 'react';
import styles from './Sections.module.css';

const AdditionalInfo = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState('projects');
  const [additionalData, setAdditionalData] = useState(data || {
    projects: [],
    certifications: [],
    languages: [],
    customSections: []
  });
  
  // State for new items
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newCertification, setNewCertification] = useState({ name: '', issuer: '', date: '' });
  const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Conversational' });
  const [newCustomSection, setNewCustomSection] = useState({ title: '', items: [] });
  const [newCustomItem, setNewCustomItem] = useState({ title: '', content: '' });
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  
  useEffect(() => {
    if (data) {
      setAdditionalData({
        projects: data.projects || [],
        certifications: data.certifications || [],
        languages: data.languages || [],
        customSections: data.customSections || []
      });
    }
  }, [data]);
  
  const updateDataAndState = (updatedData) => {
    setAdditionalData(updatedData);
    updateData(updatedData);
  };
  
  // Projects handlers
  const addProject = () => {
    if (!newProject.name.trim()) return;
    
    const updatedData = {
      ...additionalData,
      projects: [...additionalData.projects, {...newProject}]
    };
    
    updateDataAndState(updatedData);
    setNewProject({ name: '', description: '' });
  };
  
  const removeProject = (index) => {
    const updatedData = {
      ...additionalData,
      projects: additionalData.projects.filter((_, i) => i !== index)
    };
    
    updateDataAndState(updatedData);
  };
  
  // Certifications handlers
  const addCertification = () => {
    if (!newCertification.name.trim()) return;
    
    const updatedData = {
      ...additionalData,
      certifications: [...additionalData.certifications, {...newCertification}]
    };
    
    updateDataAndState(updatedData);
    setNewCertification({ name: '', issuer: '', date: '' });
  };
  
  const removeCertification = (index) => {
    const updatedData = {
      ...additionalData,
      certifications: additionalData.certifications.filter((_, i) => i !== index)
    };
    
    updateDataAndState(updatedData);
  };
  
  // Languages handlers
  const addLanguage = () => {
    if (!newLanguage.language.trim()) return;
    
    const updatedData = {
      ...additionalData,
      languages: [...additionalData.languages, {...newLanguage}]
    };
    
    updateDataAndState(updatedData);
    setNewLanguage({ language: '', proficiency: 'Conversational' });
  };
  
  const removeLanguage = (index) => {
    const updatedData = {
      ...additionalData,
      languages: additionalData.languages.filter((_, i) => i !== index)
    };
    
    updateDataAndState(updatedData);
  };
  
  // Custom Sections methods
  const addCustomSection = () => {
    if (!newCustomSection.title) return;
    
    const updatedData = {
      ...additionalData,
      customSections: [
        ...additionalData.customSections,
        {
          id: `section_${Date.now()}`,
          title: newCustomSection.title,
          items: []
        }
      ]
    };
    
    updateDataAndState(updatedData);
    setNewCustomSection({ title: '', items: [] });
    setEditingSectionIndex(updatedData.customSections.length - 1);
  };
  
  const removeCustomSection = (index) => {
    const updatedData = {
      ...additionalData,
      customSections: additionalData.customSections.filter((_, i) => i !== index)
    };
    
    updateDataAndState(updatedData);
    if (editingSectionIndex === index) {
      setEditingSectionIndex(null);
    }
  };
  
  const addCustomItem = () => {
    if (!newCustomItem.content || editingSectionIndex === null) return;
    
    const updatedSections = [...additionalData.customSections];
    updatedSections[editingSectionIndex].items.push({
      id: `item_${Date.now()}`,
      title: newCustomItem.title,
      content: newCustomItem.content
    });
    
    const updatedData = {
      ...additionalData,
      customSections: updatedSections
    };
    
    updateDataAndState(updatedData);
    setNewCustomItem({ title: '', content: '' });
  };
  
  const removeCustomItem = (sectionIndex, itemIndex) => {
    const updatedSections = [...additionalData.customSections];
    updatedSections[sectionIndex].items = updatedSections[sectionIndex].items.filter((_, i) => i !== itemIndex);
    
    const updatedData = {
      ...additionalData,
      customSections: updatedSections
    };
    
    updateDataAndState(updatedData);
  };

  return (
    <div className={styles.sectionContainer}>
      <h2 className={styles.sectionTitle}>Additional Information</h2>
      <p className={styles.sectionDescription}>
        Include other relevant information that showcases your qualifications.
      </p>
      
      <div className={styles.tabNavigation}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'projects' ? styles.activeTabButton : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'certifications' ? styles.activeTabButton : ''}`}
          onClick={() => setActiveTab('certifications')}
        >
          Certifications
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'languages' ? styles.activeTabButton : ''}`}
          onClick={() => setActiveTab('languages')}
        >
          Languages
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'customSections' ? styles.activeTabButton : ''}`}
          onClick={() => setActiveTab('customSections')}
        >
          Custom Sections
        </button>
      </div>
      
      {activeTab === 'projects' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>Projects</h3>
          
          <div className={styles.formGroup}>
            <label htmlFor="projectName">Project Name</label>
            <input
              type="text"
              id="projectName"
              className={styles.formInput}
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              placeholder="e.g. Website Redesign"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="projectDescription">Description</label>
            <textarea
              id="projectDescription"
              className={styles.formInput}
              rows={4}
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              placeholder="Describe your role and the impact of the project"
            />
          </div>
          
          <button 
            className={styles.addItemButton}
            onClick={addProject}
            disabled={!newProject.name}
          >
            Add Project
          </button>
          
          <div className={styles.itemsList}>
            {additionalData.projects.map((project, index) => (
              <div key={index} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <h4 className={styles.itemTitle}>{project.name}</h4>
                  <button 
                    className={styles.removeItemButton}
                    onClick={() => removeProject(index)}
                  >
                    Remove
                  </button>
                </div>
                <p className={styles.itemDescription}>{project.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'certifications' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>Certifications</h3>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="certName">Certification Name</label>
              <input
                type="text"
                id="certName"
                value={newCertification.name}
                onChange={(e) => setNewCertification({...newCertification, name: e.target.value})}
                placeholder="e.g. Project Management Professional (PMP)"
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="certIssuer">Issuing Organization</label>
              <input
                type="text"
                id="certIssuer"
                value={newCertification.issuer}
                onChange={(e) => setNewCertification({...newCertification, issuer: e.target.value})}
                placeholder="e.g. Project Management Institute"
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="certDate">Date</label>
              <input
                type="text"
                id="certDate"
                value={newCertification.date}
                onChange={(e) => setNewCertification({...newCertification, date: e.target.value})}
                placeholder="e.g. April 2020"
                className={styles.formInput}
              />
            </div>
          </div>
          
          <button 
            className={styles.addItemButton}
            onClick={addCertification}
          >
            Add Certification
          </button>
          
          <div className={styles.itemsList}>
            {additionalData.certifications.map((cert, index) => (
              <div key={index} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <h4 className={styles.itemTitle}>{cert.name}</h4>
                  <button 
                    className={styles.removeItemButton}
                    onClick={() => removeCertification(index)}
                  >
                    Remove
                  </button>
                </div>
                <p className={styles.itemDescription}>
                  {cert.issuer && `${cert.issuer}`}
                  {cert.issuer && cert.date && ' • '}
                  {cert.date && `${cert.date}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'languages' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>Languages</h3>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="language">Language</label>
              <input
                type="text"
                id="language"
                value={newLanguage.language}
                onChange={(e) => setNewLanguage({...newLanguage, language: e.target.value})}
                placeholder="e.g. Spanish"
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="proficiency">Proficiency</label>
              <select
                id="proficiency"
                value={newLanguage.proficiency}
                onChange={(e) => setNewLanguage({...newLanguage, proficiency: e.target.value})}
                className={styles.formInput}
              >
                <option value="Native">Native</option>
                <option value="Fluent">Fluent</option>
                <option value="Proficient">Proficient</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Conversational">Conversational</option>
                <option value="Basic">Basic</option>
              </select>
            </div>
          </div>
          
          <button 
            className={styles.addItemButton}
            onClick={addLanguage}
          >
            Add Language
          </button>
          
          <div className={styles.itemsList}>
            {additionalData.languages.map((lang, index) => (
              <div key={index} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <h4 className={styles.itemTitle}>{lang.language}</h4>
                  <button 
                    className={styles.removeItemButton}
                    onClick={() => removeLanguage(index)}
                  >
                    Remove
                  </button>
                </div>
                <p className={styles.itemDescription}>{lang.proficiency}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'customSections' && (
        <div className={styles.tabContent}>
          <h3 className={styles.tabTitle}>Custom Sections</h3>
          
          {editingSectionIndex === null ? (
            <>
              <p className={styles.tabDescription}>
                Create custom sections for achievements, references, volunteer work, or any other information you'd like to include.
              </p>
              
              <div className={styles.formGroup}>
                <label htmlFor="customSectionTitle">Section Title</label>
                <input
                  type="text"
                  id="customSectionTitle"
                  className={styles.formInput}
                  value={newCustomSection.title}
                  onChange={(e) => setNewCustomSection({...newCustomSection, title: e.target.value})}
                  placeholder="e.g. Achievements, References, Volunteer Work"
                />
              </div>
              
              <button 
                className={styles.addItemButton}
                onClick={addCustomSection}
                disabled={!newCustomSection.title}
              >
                Create Section
              </button>
              
              {additionalData.customSections.length > 0 && (
                <div className={styles.customSectionsList}>
                  <h4 className={styles.subsectionTitle}>Your Custom Sections</h4>
                  {additionalData.customSections.map((section, index) => (
                    <div key={section.id} className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <h4 className={styles.itemTitle}>{section.title}</h4>
                        <div className={styles.buttonGroup}>
                          <button 
                            className={styles.editButton}
                            onClick={() => setEditingSectionIndex(index)}
                          >
                            Edit
                          </button>
                          <button 
                            className={styles.removeItemButton}
                            onClick={() => removeCustomSection(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className={styles.itemDescription}>
                        {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.customSectionEditor}>
              <div className={styles.editorHeader}>
                <h4 className={styles.editorTitle}>
                  Editing: {additionalData.customSections[editingSectionIndex].title}
                </h4>
                <button 
                  className={styles.backButton}
                  onClick={() => setEditingSectionIndex(null)}
                >
                  Back to Sections
                </button>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="customItemTitle">Item Title (Optional)</label>
                <input
                  type="text"
                  id="customItemTitle"
                  className={styles.formInput}
                  value={newCustomItem.title}
                  onChange={(e) => setNewCustomItem({...newCustomItem, title: e.target.value})}
                  placeholder="e.g. Achievement Title (Optional)"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="customItemContent">Content</label>
                <textarea
                  id="customItemContent"
                  className={styles.formInput}
                  rows={4}
                  value={newCustomItem.content}
                  onChange={(e) => setNewCustomItem({...newCustomItem, content: e.target.value})}
                  placeholder="Describe your achievement, reference, or other information"
                />
              </div>
              
              <button 
                className={styles.addItemButton}
                onClick={addCustomItem}
                disabled={!newCustomItem.content}
              >
                Add Item
              </button>
              
              <div className={styles.itemsList}>
                {additionalData.customSections[editingSectionIndex].items.map((item, itemIndex) => (
                  <div key={item.id} className={styles.itemCard}>
                    <div className={styles.itemHeader}>
                      {item.title && <h4 className={styles.itemTitle}>{item.title}</h4>}
                      <button 
                        className={styles.removeItemButton}
                        onClick={() => removeCustomItem(editingSectionIndex, itemIndex)}
                      >
                        Remove
                      </button>
                    </div>
                    <p className={styles.itemDescription}>{item.content}</p>
                  </div>
                ))}
                
                {additionalData.customSections[editingSectionIndex].items.length === 0 && (
                  <p className={styles.emptyMessage}>No items yet. Add some using the form above.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={styles.completionHint}>
        <span className={styles.hintIcon}>💡</span>
        <span className={styles.hintText}>
          <strong>Pro Tip:</strong> Only include additional information that is relevant to the job you're applying for.
        </span>
      </div>
    </div>
  );
};

export default AdditionalInfo; 