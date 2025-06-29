import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import RawResumeTemplate from '../components/ResumeBuilder/ui/RawResumeTemplate';
import { getResumeData } from '../components/ResumeBuilder/utils/localStorage';

/**
 * This page renders only the raw resume template without any UI elements.
 * It's designed specifically for PDF generation through Puppeteer.
 */
const ResumeTemplateCapture = () => {
  const [resumeData, setResumeData] = useState(null);
  const [template, setTemplate] = useState('professional');
  const [sectionOrder, setSectionOrder] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Handle data fetch on component mount
    const fetchResumeData = () => {
      if (typeof window === 'undefined') return;
      
      setIsLoading(true);
      const params = new URLSearchParams(window.location.search);
      
      // Get template parameter
      if (params.get('template')) {
        setTemplate(params.get('template'));
      }
      
      try {
        // First try to get data from URL parameter
        if (params.get('data')) {
          try {
            const parsedData = JSON.parse(decodeURIComponent(params.get('data')));
            setResumeData(parsedData);
            
            // Get section order from URL data if available
            if (parsedData.sectionOrder) {
              setSectionOrder(parsedData.sectionOrder);
            }
            
            setIsReady(true);
            setIsLoading(false);
            return;
          } catch (err) {
            console.error('Error parsing resume data from URL:', err);
            setError('Could not parse resume data from URL');
          }
        }
        
        // Otherwise, get data from localStorage
        const storedData = getResumeData();
        if (storedData) {
          setResumeData(storedData);
          
          // Get section order from localStorage using the correct key
          try {
            const savedOrder = localStorage.getItem('resume_section_order');
            if (savedOrder) {
              setSectionOrder(JSON.parse(savedOrder));
            }
          } catch (err) {
            console.error('Error parsing section order from localStorage:', err);
          }
          
          setIsReady(true);
        } else {
          setError('No resume data available');
        }
      } catch (err) {
        console.error('Error loading resume data:', err);
        setError('Error loading resume data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResumeData();
  }, []);

  // Styles specific to PDF generation - much simpler now!
  const pdfCaptureStyles = `
    /* Import fonts conditionally based on template */
    ${template !== 'ats' ? `
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap');
    ` : ''}
    
    /* Reset any global font settings */
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      ${template !== 'ats' ? 
        `font-family: 'Montserrat', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;` : 
        `font-family: Arial, Helvetica, sans-serif !important;`
      }
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      overflow-y: visible !important;
    }
    
    /* Fix for the blue rectangle issue */
    #template-for-pdf-capture {
      background: white !important;
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      position: relative !important;
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
      max-height: none !important;
    }
    
    /* Fix for Modern template header */
    .headerSidebar {
      margin-bottom: 15px !important;
      width: auto !important;
      height: auto !important;
      min-height: auto !important;
      max-height: fit-content !important;
    }
    
    /* Fix for Creative template header */
    .headerMain {
      margin-bottom: 0 !important;
      border-radius: 12px !important;
      height: auto !important;
      min-height: auto !important;
      max-height: fit-content !important;
    }
    
    /* Aggressive fix for blue rectangle issue */
    .resumePreview {
      background: white !important;
      background-color: white !important;
      height: auto !important;
      min-height: auto !important;
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
      overflow: visible !important;
    }
    
    /* Fix for Creative template */
    .header {
      margin-bottom: 15px !important;
      height: auto !important;
      min-height: auto !important;
    }
    
    /* Remove any pseudo-elements that might create the blue rectangle */
    .resumePreview *::after,
    .resumePreview *::before,
    .header::after,
    .header::before,
    .headerMain::after,
    .headerMain::before,
    .headerSidebar::after,
    .headerSidebar::before {
      display: none !important;
      content: none !important;
    }
    
    /* Special styles for ATS template */
    ${template === 'ats' ? `
      body, .resumePreview, h1, h2, h3, h4, h5, h6, p, div, span {
        font-family: Arial, Helvetica, sans-serif !important;
        color: #000 !important;
      }
      .name, .sectionTitle {
        font-weight: 700 !important;
      }
      .itemTitle {
        font-weight: bold !important;
      }
    ` : ''}
    
    /* Ensure proper page breaks */
    .section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Make sure colors print properly */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Make sure we don't include any site navigation */
    nav, header, footer, .nav-container, .navigation {
      display: none !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
        <h2>Loading resume data...</h2>
      </div>
    );
  }

  if (error || !isReady || !resumeData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
        <h2>Error loading resume data</h2>
        <p>{error || 'No resume data available'}</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Resume Template for PDF Generation</title>
        {/* Load Playfair Display for minimalist template and Montserrat for modern, etc. */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" 
          rel="stylesheet"
        />
        {/* It's important to load Playfair Display here so the minimalist template PDF matches the preview exactly. */}
        <style>{pdfCaptureStyles}</style>
      </Head>
      
      {/* Render the raw template without any containers */}
      <div id="template-for-pdf-capture" style={{ 
        background: 'white', 
        height: 'auto', 
        minHeight: 'auto',
        paddingBottom: 0,
        marginBottom: 0,
        overflow: 'visible'
      }}>
        <RawResumeTemplate 
          resumeData={resumeData} 
          template={template}
          sectionOrder={sectionOrder}
        />
      </div>
      
      {/* Add an empty div to ensure there's no extra space at the bottom */}
      <div style={{ height: 0, overflow: 'hidden', background: 'white' }}></div>
    </>
  );
};

export default ResumeTemplateCapture; 