import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AnimatedButton from './AnimatedButton';

/**
 * ResumeExample Component
 * 
 * Displays a resume example image with download option and call-to-action
 * Used in resume example blog posts
 */
const ResumeExample = ({ 
  title, 
  description, 
  imageSrc, 
  templateName, 
  downloadPdfUrl 
}) => {
  return (
    <div className="resume-example">
      <div className="resume-example-header">
        <h3 className="resume-example-title">{title}</h3>
        {description && (
          <p className="resume-example-description">{description}</p>
        )}
      </div>
      
      <div className="resume-example-content">
        <div className="resume-image-container">
          {imageSrc && (
            <Image
              src={imageSrc}
              alt={title || "Resume Example"}
              width={600}
              height={800}
              className="resume-image"
            />
          )}
          
          {templateName && (
            <div className="template-badge">
              <span className="template-name">{templateName} Template</span>
            </div>
          )}
        </div>
        
        <div className="resume-actions">
          {downloadPdfUrl && (
            <a 
              href={downloadPdfUrl} 
              className="download-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download PDF
            </a>
          )}
          
          <AnimatedButton 
            href="/nursing-resume-builder"
            text="Create Your Resume" 
            style={{ fontSize: '0.9375rem', padding: '0.75rem 1.5rem' }}
          />
        </div>
      </div>
      
      <style jsx>{`
        .resume-example {
          margin: 2.5rem 0;
          padding: 1.5rem;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
        }
        
        .resume-example-header {
          margin-bottom: 1.5rem;
        }
        
        .resume-example-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.75rem 0;
          color: #1a202c;
        }
        
        .resume-example-description {
          font-size: 1rem;
          color: #4b5563;
          margin: 0;
          line-height: 1.6;
        }
        
        .resume-example-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .resume-image-container {
          position: relative;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          max-width: 100%;
        }
        
        .resume-image {
          display: block;
          max-width: 100%;
          height: auto;
          object-fit: contain;
        }
        
        .template-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background-color: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }
        
        .resume-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          width: 100%;
        }
        
        .download-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9375rem;
          text-decoration: none;
          transition: all 0.2s ease;
          background-color: #f3f4f6;
          color: #4b5563;
        }
        
        .download-button:hover {
          background-color: #e5e7eb;
        }
        
        @media (max-width: 640px) {
          .resume-example {
            padding: 1.25rem;
          }
          
          .resume-actions {
            flex-direction: column;
          }
          
          .download-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ResumeExample; 