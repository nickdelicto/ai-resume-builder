import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import ResumePreview from '../components/ResumeBuilder/ui/ResumePreview';
import { getResumeData } from '../components/ResumeBuilder/utils/localStorage';

/**
 * This page renders only the resume preview without UI elements.
 * It's designed to be captured by Puppeteer for PDF generation.
 */
const ResumePreviewCapture = () => {
  const [resumeData, setResumeData] = useState(null);
  const [template, setTemplate] = useState('professional');
  const [sectionOrder, setSectionOrder] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState({
    source: 'initializing',
    dataReceived: false
  });

  useEffect(() => {
    // First try to get data from URL params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setIsLoading(true);
      
      // Check for template param
      if (params.get('template')) {
        setTemplate(params.get('template'));
        setDebugInfo(prev => ({ ...prev, template: params.get('template') }));
      }
      
      // Try to get data directly from URL
      if (params.get('data')) {
        try {
          const parsedData = JSON.parse(decodeURIComponent(params.get('data')));
          setResumeData(parsedData);
          setDebugInfo(prev => ({ 
            ...prev, 
            source: 'url', 
            dataReceived: true,
            dataSize: JSON.stringify(parsedData).length
          }));
          
          // Get section order if available
          if (parsedData.sectionOrder) {
            setSectionOrder(parsedData.sectionOrder);
          }
          
          setIsLoading(false);
          setIsReady(true);
          return;
        } catch (e) {
          console.error('Error parsing resume data from URL:', e);
          setDebugInfo(prev => ({ 
            ...prev, 
            source: 'url-error', 
            error: e.message 
          }));
        }
      }
      
      // Use localStorage as fallback
      try {
        const storedData = getResumeData();
        if (storedData) {
          setResumeData(storedData);
          setDebugInfo(prev => ({ 
            ...prev, 
            source: 'localStorage', 
            dataReceived: true,
            dataSize: JSON.stringify(storedData).length
          }));
          
          // Get section order if available
          if (storedData.sectionOrder) {
            setSectionOrder(storedData.sectionOrder);
          }
        } else {
          setDebugInfo(prev => ({ 
            ...prev, 
            source: 'localStorage-empty'
          }));
          
          // Provide fallback data for testing
          setResumeData({
            personalInfo: {
              name: "John Doe",
              email: "john@example.com",
              phone: "555-123-4567",
              location: "New York, NY"
            },
            summary: "Experienced professional with expertise in test resume generation.",
            experience: [],
            education: [],
            skills: ["Resume Building", "PDF Generation", "Testing"],
            additional: {}
          });
        }
      } catch (e) {
        console.error('Error retrieving resume data from localStorage:', e);
        setDebugInfo(prev => ({ 
          ...prev, 
          source: 'localStorage-error', 
          error: e.message 
        }));
      }
      
      // Mark as ready for rendering
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  // Styles optimized for PDF capture
  const pdfCaptureStyles = `
    body {
      margin: 0;
      padding: 0;
      background: white;
      height: auto !important;
      overflow: visible !important;
    }
    
    /* Main container for PDF capture - ensure NO height limits or overflow hidden */
    .pdf-capture-container {
      width: 100%;
      height: auto !important; 
      overflow: visible !important;
      background: white;
      position: relative;
      padding: 0;
      margin: 0;
    }
    
    /* Ensure the resume content itself has no height limitations */
    .resume-content-for-pdf {
      height: auto !important;
      overflow: visible !important;
      max-height: none !important;
      position: relative;
      background: white;
    }
    
    /* Override any scroll containers from the original preview component */
    .previewContainer, 
    .resumePreview, 
    .noCopy {
      max-height: none !important;
      height: auto !important;
      overflow: visible !important;
      user-select: auto !important;
      -webkit-user-select: auto !important;
      position: relative !important;
      box-shadow: none !important;
    }
    
    /* Hide any scroll indicators */
    .scrollIndicator {
      display: none !important;
    }
    
    /* Ensure sections display properly */
    .section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Ensure text is visible */
    h1, h2, h3, h4, h5, h6, p, div, span {
      color: inherit !important;
    }
  `;

  if (isLoading) {
    return (
      <div className="pdf-capture-container" style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center'
      }}>
        <h2>Loading resume data...</h2>
        <p>Source: {debugInfo.source}</p>
        <p>Data received: {debugInfo.dataReceived ? 'Yes' : 'No'}</p>
        {debugInfo.error && <p>Error: {debugInfo.error}</p>}
      </div>
    );
  }

  if (!isReady || !resumeData) {
    return (
      <div className="pdf-capture-container" style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center'
      }}>
        <h2>No resume data available</h2>
        <p>Please make sure you have saved a resume or passed data via URL.</p>
        <p>Source: {debugInfo.source}</p>
        <p>Data received: {debugInfo.dataReceived ? 'Yes' : 'No'}</p>
        {debugInfo.error && <p>Error: {debugInfo.error}</p>}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Resume PDF Capture</title>
        <style>{pdfCaptureStyles}</style>
      </Head>
      <div className="pdf-capture-container">
        <div id="resume-content-for-pdf" className="resume-content-for-pdf">
          <ResumePreview 
            resumeData={resumeData} 
            template={template}
            sectionOrder={sectionOrder}
          />
        </div>
      </div>
    </>
  );
};

export default ResumePreviewCapture; 