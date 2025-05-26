import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const TestPDFPage = () => {
  const [generationTime, setGenerationTime] = useState(null);
  const [error, setError] = useState(null);
  const [pdfSize, setPdfSize] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [resumeDataAvailable, setResumeDataAvailable] = useState(false);
  const [resumeDataSize, setResumeDataSize] = useState(null);
  const iframeRef = useRef(null);

  const isDev = process.env.NODE_ENV === 'development';

  // Check if resume data is available
  useEffect(() => {
    try {
      const resumeData = localStorage.getItem('modern_resume_data');
      setResumeDataAvailable(!!resumeData);
      
      if (resumeData) {
        const size = (new Blob([resumeData]).size / 1024).toFixed(2);
        setResumeDataSize(size);
      }
    } catch (err) {
      console.error('Error checking for resume data:', err);
    }
  }, []);

  const generatePDF = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      
      // Get resume data from localStorage
      let resumeData = null;
      let sectionOrder = null;
      try {
        const storedData = localStorage.getItem('modern_resume_data');
        const storedOrder = localStorage.getItem('resume_section_order');
        if (storedData) {
          resumeData = JSON.parse(storedData);
          console.log('Using resume data from localStorage');
        }
        if (storedOrder) {
          sectionOrder = JSON.parse(storedOrder);
          console.log('Using section order from localStorage:', sectionOrder);
        }
      } catch (err) {
        console.error('Error parsing data from localStorage:', err);
      }
      
      // --- IMPORTANT: Always save the latest data to localStorage before PDF generation ---
      // This ensures that, even for large resumes (where data is not passed via URL),
      // the capture page will always find the latest data in localStorage.
      localStorage.setItem('modern_resume_data', JSON.stringify(resumeData));
      if (sectionOrder) {
        localStorage.setItem('resume_section_order', JSON.stringify(sectionOrder));
      }
      // --- END AUTOSAVE FOR PDF GENERATION ---
      
      const response = await fetch('/api/test-pdf-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          template: selectedTemplate,
          resumeData,
          sectionOrder
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
      
      const blob = await response.blob();
      const endTime = performance.now();
      
      // Calculate generation time and size
      setGenerationTime((endTime - startTime).toFixed(2));
      setPdfSize((blob.size / 1024).toFixed(2));
      
      // Create a blob URL for the PDF
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      // Automatically view in iframe
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    } catch (err) {
      setError(`Error generating PDF: ${err.message}`);
      console.error('Error generating PDF:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle direct download of the PDF
  const downloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `resume-${selectedTemplate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle opening PDF in new tab
  const openPdfInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // List of available templates
  const templates = [
    { id: 'professional', name: 'Professional', description: 'Clean and standard professional layout' },
    { id: 'modern', name: 'Modern', description: 'Contemporary design with colored accents' },
    { id: 'creative', name: 'Creative', description: 'Unique layout with visual elements' },
    { id: 'minimalist', name: 'Minimalist', description: 'Simple and elegant minimal design' },
    { id: 'executive', name: 'Executive', description: 'Traditional format for senior positions' },
    { id: 'ats', name: 'ATS-Friendly', description: 'Optimized for applicant tracking systems' }
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Head>
        <title>Resume PDF Test</title>
      </Head>
      
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>Test Resume PDF Generation</h1>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', marginTop: 0 }}>Environment Info</h2>
      <p>Environment: <strong>{isDev ? 'Development' : 'Production'}</strong></p>
            <p>Resume data: <strong>{resumeDataAvailable ? 'Available' : 'Not available'}</strong></p>
            {resumeDataSize && <p>Data size: <strong>{resumeDataSize} KB</strong></p>}
          </div>
          
      {!resumeDataAvailable && (
            <div style={{ padding: '15px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fbbf24', color: '#92400e', marginBottom: '20px' }}>
              <p style={{ fontWeight: 'bold', marginTop: 0 }}>No resume data found</p>
              <p style={{ margin: '10px 0 0' }}>Please create a resume first, or the test will generate a PDF with sample data.</p>
        </div>
      )}
      
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Select Template:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '15px' }}>
              {templates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  style={{
                    borderRadius: '6px',
                    padding: '10px',
                    border: `2px solid ${selectedTemplate === template.id ? '#2563eb' : '#e2e8f0'}`,
                    backgroundColor: selectedTemplate === template.id ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{template.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{template.description}</div>
                </div>
          ))}
            </div>
      </div>
      
      <button
        onClick={generatePDF}
        disabled={isLoading}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              width: '100%',
              fontSize: '16px',
              transition: 'background-color 0.2s',
              opacity: isLoading ? 0.7 : 1,
            }}
      >
            {isLoading ? 'Generating PDF...' : 'Generate Test Resume PDF'}
      </button>
      
      {error && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', padding: '15px', borderRadius: '6px', marginTop: '20px' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</p>
        </div>
      )}
      
      {generationTime && pdfSize && (
            <div style={{ marginTop: '20px', backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '6px', border: '1px solid #86efac' }}>
              <h3 style={{ fontSize: '16px', margin: '0 0 10px', color: '#166534' }}>PDF Generated Successfully</h3>
              <p style={{ margin: '5px 0' }}>Generation Time: <strong>{generationTime} ms</strong></p>
              <p style={{ margin: '5px 0' }}>PDF Size: <strong>{pdfSize} KB</strong></p>
              <p style={{ margin: '5px 0' }}>Template: <strong>{templates.find(t => t.id === selectedTemplate)?.name}</strong></p>
        </div>
      )}

      {pdfUrl && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={downloadPdf}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1,
                }}
            >
              Download PDF
            </button>
            <button
                onClick={openPdfInNewTab}
                style={{
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Open in New Tab
            </button>
            </div>
          )}
          </div>
          
        <div style={{ flex: '1', minWidth: '300px' }}>
          {pdfUrl ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', height: '700px' }}>
            <iframe 
              ref={iframeRef}
                style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF Preview"
            />
          </div>
          ) : (
            <div style={{ 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              height: '700px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#f8fafc',
              flexDirection: 'column',
              color: '#64748b'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px', color: '#94a3b8' }}>
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 5px' }}>PDF Preview</p>
              <p style={{ fontSize: '14px', margin: 0 }}>Generate a PDF to see the preview here</p>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '14px' }}>
        <h2 style={{ fontSize: '18px', marginTop: 0 }}>How This Works</h2>
        <p>This PDF generation approach uses a dedicated page that renders <strong>only the template</strong> with your resume data:</p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
          <li>The <code>resume-template-capture</code> page renders exactly what you see in the preview, but without any containers or UI elements</li>
          <li>Puppeteer captures this "raw" template with your data, ensuring an exact match to what you see in the preview</li>
          <li>All template styling and formatting is preserved in the PDF</li>
          <li>This approach ensures the entire resume is captured, not just what's visible in a scrollable container</li>
        </ul>
      </div>
    </div>
  );
};

export default TestPDFPage; 