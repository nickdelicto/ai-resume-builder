import chromium from 'chrome-aws-lambda';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from '../../lib/prisma';

// Detect development environment
const isDev = process.env.NODE_ENV === 'development';

// Use puppeteer in dev and puppeteer-core in production
const puppeteer = isDev 
  ? require('puppeteer') 
  : require('puppeteer-core');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser;
  try {
    // Get user session if available
    const session = await getServerSession(req, res, authOptions);
    const isAuthenticated = !!(session && session.user);
    
    // Get resume data and template from request
    const { template = 'professional', resumeData, sectionOrder, resumeId } = req.body;
    
    // If user is authenticated and we have a resumeId, try to get the latest data from database
    let dataToUse = resumeData;
    if (isAuthenticated && resumeId) {
      try {
        // Fetch the latest version from the database to ensure we're using the most current data
        const dbResume = await prisma.resumeData.findUnique({
          where: { id: resumeId },
          select: { data: true, template: true }
        });
        
        if (dbResume) {
          console.log('Using database version of resume for PDF generation');
          dataToUse = dbResume.data;
          // Use the database template if available and no template was specified
          if (dbResume.template && !template) {
            template = dbResume.template;
          }
        }
      } catch (error) {
        console.error('Error fetching resume from database:', error);
        // Continue with the provided resumeData if database fetch fails
      }
    }
    
    // Determine the URL for capturing the resume template
    const baseUrl = isDev 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://yourproductionsite.com';
    
    // Launch browser with appropriate settings
    if (isDev) {
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security', // Allow cross-origin requests
          '--disable-features=IsolateOrigins,site-per-process' // Disable site isolation
        ]
      });
    } else {
      // For production (AWS Lambda environment)
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });
    }

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
    if (dataToUse) {
      // Use evaluateOnNewDocument to set localStorage before any scripts run
      await page.evaluateOnNewDocument((data, order) => {
        window.localStorage.setItem('modern_resume_data', JSON.stringify(data));
        if (order) {
          window.localStorage.setItem('resume_section_order', JSON.stringify(order));
        }
      }, dataToUse, sectionOrder);
    }
    // Now navigate to the capture page (no data param needed)
    let captureUrl = `${baseUrl}/resume-template-capture?template=${template}`;
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

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume-${template}.pdf"`);
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