import React from 'react';

/**
 * SkillsSection Component
 * 
 * Displays a list of skills in a multi-column layout
 * Used primarily in resume example posts to showcase relevant skills
 */
const SkillsSection = ({ title, skills, description, columns = 2 }) => {
  if (!skills || skills.length === 0) {
    return null;
  }
  
  // Split skills into columns
  const skillsPerColumn = Math.ceil(skills.length / columns);
  const skillColumns = [];
  
  for (let i = 0; i < columns; i++) {
    skillColumns.push(skills.slice(i * skillsPerColumn, (i + 1) * skillsPerColumn));
  }
  
  return (
    <div className="skills-section">
      <div className="skills-header">
        <div className="skills-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>
        <h2 className="skills-title">{title}</h2>
      </div>
      
      {description && (
        <p className="skills-description">{description}</p>
      )}
      
      <div className={`skills-grid columns-${columns}`}>
        {skillColumns.map((columnSkills, columnIndex) => (
          <div key={columnIndex} className="skills-column">
            <ul className="skills-list">
              {columnSkills.map((skill, index) => (
                <li key={index} className="skill-item">
                  <div className="skill-check">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="skill-name">{skill}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .skills-section {
          margin: 3rem 0;
          padding: 1.5rem;
          background-color: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        
        .skills-header {
          display: flex;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        
        .skills-icon {
          background-color: #ebf5ff;
          color: var(--primary-blue);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          flex-shrink: 0;
        }
        
        .skills-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #1a202c;
        }
        
        .skills-description {
          margin: 0 0 1.5rem 0;
          color: #4b5563;
          font-size: 1rem;
          line-height: 1.6;
        }
        
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(var(--columns), 1fr);
          gap: 1.5rem;
        }
        
        .skills-grid.columns-1 {
          --columns: 1;
        }
        
        .skills-grid.columns-2 {
          --columns: 2;
        }
        
        .skills-grid.columns-3 {
          --columns: 3;
        }
        
        .skills-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .skill-item {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .skill-check {
          background-color: #e6f7ef;
          color: #10b981;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }
        
        .skill-name {
          font-size: 0.9375rem;
          color: #4b5563;
        }
        
        @media (max-width: 768px) {
          .skills-grid.columns-3 {
            --columns: 2;
          }
        }
        
        @media (max-width: 640px) {
          .skills-grid {
            --columns: 1 !important;
          }
          
          .skills-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .skills-icon {
            margin-bottom: 1rem;
            margin-right: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SkillsSection; 