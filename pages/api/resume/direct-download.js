import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import puppeteer from 'puppeteer';

// Detect development environment
const isDev = process.env.NODE_ENV === 'development';

/**
 * API endpoint to directly download a resume as PDF
 * - Checks eligibility including one-time plan restrictions
 * - Generates PDF using Puppeteer
 * - Returns PDF as download
 * 
 * Query parameters:
 * - id: The ID of the resume to download (required)
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser;
  
  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'You need to be signed in to download a resume'
      });
    }
    
    // Get resume ID from query parameters
    const { id: resumeId } = req.query;
    
    if (!resumeId) {
      return res.status(400).json({ 
        error: 'Missing resume ID',
        message: 'Resume ID is required'
      });
    }

    // Check if the resume exists and belongs to the user
    const resume = await prisma.resumeData.findFirst({
      where: {
        id: resumeId,
        userId: session.user.id
      }
    });

    if (!resume) {
      return res.status(404).json({
        error: 'Resume not found',
        message: 'The specified resume does not exist or does not belong to you'
      });
    }

    // Check download eligibility including one-time plan restrictions
    const eligibilityResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || (isDev ? 'http://localhost:3000' : 'https://yourproductionsite.com')}/api/resume/check-download-eligibility?resumeId=${resumeId}`,
      {
        headers: {
          cookie: req.headers.cookie || ''
        }
      }
    );
    
    const eligibilityData = await eligibilityResponse.json();
    console.log('🔍 Debug - Eligibility check result:', {
      eligible: eligibilityData.eligible,
      plan: eligibilityData.plan,
      isFirstDownload: eligibilityData.isFirstDownload,
      downloadedResumeId: eligibilityData.downloadedResumeId,
      error: eligibilityData.error
    });

    if (!eligibilityData.eligible) {
      return res.status(403).json({
        error: eligibilityData.error || 'Not eligible',
        message: eligibilityData.message || 'You are not eligible to download this resume',
        needsPlan: eligibilityData.needsPlan,
        downloadedResumeId: eligibilityData.downloadedResumeId,
        currentResumeId: resumeId
      });
    }

    // Determine the URL for capturing the resume template
    const baseUrl = isDev 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://yourproductionsite.com';
    
    // Launch browser with consistent settings for both dev and production
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    
    // Enable more detailed logging in development
    if (isDev) {
      page.on('console', msg => console.log('Browser console:', msg.text()));
      page.on('pageerror', err => console.error('Browser page error:', err));
      page.on('error', err => console.error('Browser error:', err));
    }
    
    // Set viewport to match A4 paper size at 300 DPI for high quality
    await page.setViewport({
      width: 2480, // A4 width at 300 DPI
      height: 3508, // A4 height at 300 DPI
      deviceScaleFactor: 1.5,
    });
    
    // Prepare Puppeteer to inject localStorage before loading the capture page
    await page.evaluateOnNewDocument((data) => {
      window.localStorage.setItem('modern_resume_data', JSON.stringify(data));
      if (data.sectionOrder) {
        window.localStorage.setItem('resume_section_order', JSON.stringify(data.sectionOrder));
      }
    }, resume.data);
    
    // Navigate to the capture page
    let captureUrl = `${baseUrl}/resume-template-capture?template=${resume.template || 'ats'}`;
    console.log(`Capturing PDF from: ${captureUrl}`);
    await page.goto(captureUrl, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000 // 60 second timeout for slow connections
    });
    
    // Wait for the template content to be fully loaded
    try {
      await page.waitForSelector('#template-for-pdf-capture', { 
        visible: true,
        timeout: 20000 
      });
    
      // Wait for fonts to load
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      
      console.log('Template content and fonts loaded');
    } catch (error) {
      console.error('Error waiting for template content:', error);
      // Continue anyway as the element might be there but not matching exactly
    }
    
    // Inject styles to ensure the PDF captures correctly
    await page.addStyleTag({
      content: `
        /* Reset body styles */
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          height: auto !important;
          min-height: 100% !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Ensure PDF capture container takes full width and has no restrictions */
        .pdf-capture-container {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          min-height: 100% !important;
          max-height: none !important;
          overflow: visible !important;
          position: relative !important;
          display: block !important;
        }
        
        /* Resume content styling */
        .resume-content-for-pdf {
          width: 100% !important;
          height: auto !important;
          min-height: 100% !important;
          max-height: none !important;
          padding: 0 !important;
          margin: 0 auto !important;
          overflow: visible !important;
          position: relative !important;
          display: block !important;
          background: white !important;
        }
        
        /* Make all content elements visible */
        .previewContainer, 
        .resumePreview,
        .noCopy {
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          box-shadow: none !important;
          border: none !important;
          user-select: auto !important;
          -webkit-user-select: auto !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Hide any UI elements that shouldn't be in the PDF */
        button, 
        [role="button"], 
        .scrollIndicator, 
        nav, 
        header,
        footer,
        .nav-container,
        .navigation,
        .header-navigation,
        .nav-content,
        .nav-controls {
          display: none !important;
          height: 0 !important;
          width: 0 !important;
          position: absolute !important;
          top: -9999px !important;
          left: -9999px !important;
          opacity: 0 !important;
          visibility: hidden !important;
          overflow: hidden !important;
          max-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Fix text colors */
        h1, h2, h3, h4, h5, h6, p, span, div {
          color: inherit !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Ensure sections don't break across pages */
        .section {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* Reset any app-container padding */
        .app-container {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
      `
    });
    
    // Give the browser a moment to apply styles without using waitFor/waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));
      
    // Take screenshot for debugging in dev mode
    if (isDev) {
      await page.screenshot({ 
        path: 'resume-capture.png',
        fullPage: true 
      });
      console.log('Screenshot saved for debugging');
    }
      
    // Get the height of the content to ensure we capture everything
    const contentHeight = await page.evaluate(() => {
      const content = document.querySelector('#template-for-pdf-capture');
      if (!content) return 1123; // Default A4 height
      return Math.max(content.scrollHeight, content.offsetHeight);
    });
    
    console.log(`Content height: ${contentHeight}px`);
        
    // Set viewport height to match content
    await page.setViewport({
      width: 2480,
      height: Math.max(contentHeight, 3508), // Ensure minimum A4 height
      deviceScaleFactor: 1.5,
    });
    
    // Generate PDF with better quality settings
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      scale: 0.8, // Slightly scale down to ensure content fits
      displayHeaderFooter: false,
    });

    await browser.close();

    // Record the download with the record-download API endpoint
    try {
      const recordResponse = await fetch(`${baseUrl}/api/resume/record-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || ''
        },
        body: JSON.stringify({
          resumeId: resumeId
        }),
      });
      
      const recordData = await recordResponse.json();
      
      // Check if recording was successful
      if (!recordResponse.ok) {
        console.error('[DirectDownload] Error recording download:', recordData);
        
        // If this is a one-time plan restriction error, return that to the user
        if (recordResponse.status === 403 && recordData.error === 'One-time download limit') {
          await browser.close();
          return res.status(403).json({
            error: recordData.error,
            message: recordData.message,
            downloadedResumeId: recordData.downloadedResumeId
          });
        }
      } else {
        console.log('[DirectDownload] Successfully recorded download for resume ID:', resumeId);
      }
    } catch (recordError) {
      // Don't block the download if recording fails
      console.error('[DirectDownload] Error recording download:', recordError);
    }

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.title || 'resume'}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    
    res.status(200).send(Buffer.from(pdf));
  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Clean up browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    // Return detailed error information
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: error.message,
      stack: isDev ? error.stack : undefined 
    });
  }
} 