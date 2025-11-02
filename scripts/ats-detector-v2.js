const puppeteer = require('puppeteer');

/**
 * Enhanced ATS Detection Script
 * Attempts to search for jobs to discover the actual ATS platform
 */

const employers = [
  {
    name: 'Kaiser Permanente',
    url: 'https://www.kaiserpermanentejobs.org/',
    searchTerms: ['nurse', 'RN', 'registered nurse']
  },
  {
    name: 'Mayo Clinic',
    url: 'https://jobs.mayoclinic.org/',
    searchTerms: ['nurse', 'RN', 'registered nurse']
  },
  {
    name: 'Cleveland Clinic',
    url: 'https://jobs.clevelandclinic.org/',
    searchTerms: ['nurse', 'RN', 'registered nurse']
  },
  {
    name: 'HCA Healthcare',
    url: 'https://careers.hcahealthcare.com/',
    searchTerms: ['nurse', 'RN', 'registered nurse']
  },
  {
    name: 'Ascension Health',
    url: 'https://jobs.ascension.org/',
    searchTerms: ['nurse', 'RN', 'registered nurse']
  }
];

async function detectATSWithSearch(url, employerName, searchTerms) {
  console.log(`\n🔍 Analyzing ${employerName} with job search...`);
  console.log(`URL: ${url}`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the main career page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find and interact with search functionality
    const searchResults = await page.evaluate((searchTerms) => {
      // Look for search inputs
      const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="job"], input[placeholder*="search"], input[name*="search"], input[id*="search"]');
      
      // Look for search buttons
      const searchButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
      const searchButtonsText = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent && btn.textContent.toLowerCase().includes('search')
      );
      
      // Look for job category links
      const jobLinks = document.querySelectorAll('a[href*="job"], a[href*="career"], a[href*="nurse"], a[href*="RN"]');
      
      return {
        searchInputs: Array.from(searchInputs).map(input => ({
          type: input.type,
          placeholder: input.placeholder,
          name: input.name,
          id: input.id,
          className: input.className
        })),
        searchButtons: Array.from(searchButtons).map(button => ({
          text: button.textContent?.trim(),
          className: button.className,
          type: button.type
        })),
        searchButtonsText: Array.from(searchButtonsText).map(button => ({
          text: button.textContent?.trim(),
          className: button.className,
          type: button.type
        })),
        jobLinks: Array.from(jobLinks).map(link => ({
          text: link.textContent?.trim(),
          href: link.href
        })).slice(0, 10), // Limit to first 10
        currentUrl: window.location.href,
        pageTitle: document.title
      };
    }, searchTerms);
    
    console.log(`Found ${searchResults.searchInputs.length} search inputs`);
    console.log(`Found ${searchResults.searchButtons.length} search buttons`);
    console.log(`Found ${searchResults.searchButtonsText.length} search buttons (by text)`);
    console.log(`Found ${searchResults.jobLinks.length} job-related links`);
    
    // Try to perform a search if possible
    let searchPerformed = false;
    let redirectUrl = null;
    
    if (searchResults.searchInputs.length > 0) {
      try {
        // Try to fill in search term
        const searchInput = searchResults.searchInputs[0];
        await page.focus(`input[${searchInput.id ? 'id' : 'name'}="${searchInput.id || searchInput.name}"]`);
        await page.type(`input[${searchInput.id ? 'id' : 'name'}="${searchInput.id || searchInput.name}"]`, 'nurse');
        
        // Try to submit search
        if (searchResults.searchButtons.length > 0) {
          await page.click('button[type="submit"], input[type="submit"]');
          searchPerformed = true;
        } else {
          // Try pressing Enter
          await page.keyboard.press('Enter');
          searchPerformed = true;
        }
        
        // Wait for navigation or results
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        redirectUrl = page.url();
        console.log(`Search performed, redirected to: ${redirectUrl}`);
        
      } catch (error) {
        console.log(`Search attempt failed: ${error.message}`);
      }
    }
    
    // Analyze the current page (after potential search)
    const atsData = await page.evaluate(() => {
      const indicators = {
        // URL patterns
        urls: {
          workday: window.location.href.includes('workday') || 
                  window.location.href.includes('wd5.myworkday.com') ||
                  window.location.href.includes('wd1.myworkday.com'),
          icims: window.location.href.includes('icims') || 
                 window.location.href.includes('careers.icims.com'),
          taleo: window.location.href.includes('taleo') || 
                 window.location.href.includes('oracle.com'),
          greenhouse: window.location.href.includes('greenhouse') || 
                     window.location.href.includes('boards.greenhouse.io'),
          brassring: window.location.href.includes('brassring') || 
                    window.location.href.includes('brassring.com'),
          custom: !window.location.href.includes('workday') && 
                  !window.location.href.includes('icims') && 
                  !window.location.href.includes('taleo') && 
                  !window.location.href.includes('greenhouse') && 
                  !window.location.href.includes('brassring')
        },
        
        // Script sources
        scripts: {
          workday: Array.from(document.querySelectorAll('script[src]'))
            .map(s => s.src)
            .filter(src => src.includes('workday')),
          icims: Array.from(document.querySelectorAll('script[src]'))
            .map(s => s.src)
            .filter(src => src.includes('icims')),
          taleo: Array.from(document.querySelectorAll('script[src]'))
            .map(s => s.src)
            .filter(src => src.includes('taleo')),
          greenhouse: Array.from(document.querySelectorAll('script[src]'))
            .map(s => s.src)
            .filter(src => src.includes('greenhouse'))
        },
        
        // Meta tags
        meta: {
          workday: document.querySelector('meta[name*="workday"]')?.content || 
                  document.querySelector('meta[property*="workday"]')?.content,
          icims: document.querySelector('meta[name*="icims"]')?.content || 
                 document.querySelector('meta[property*="icims"]')?.content,
          taleo: document.querySelector('meta[name*="taleo"]')?.content || 
                 document.querySelector('meta[property*="taleo"]')?.content
        },
        
        // CSS classes and data attributes
        elements: {
          workday: document.querySelector('[class*="workday"]')?.className || 
                  document.querySelector('[data-automation-id*="workday"]')?.getAttribute('data-automation-id'),
          icims: document.querySelector('[class*="icims"]')?.className || 
                 document.querySelector('[id*="icims"]')?.id,
          taleo: document.querySelector('[class*="taleo"]')?.className || 
                 document.querySelector('[id*="taleo"]')?.id,
          greenhouse: document.querySelector('[class*="greenhouse"]')?.className || 
                     document.querySelector('[id*="greenhouse"]')?.id
        },
        
        // Page title and content
        title: document.title,
        hasJobSearch: document.querySelector('input[type="search"]') !== null ||
                     document.querySelector('input[placeholder*="job"]') !== null ||
                     document.querySelector('input[placeholder*="search"]') !== null,
        
        // Look for job listings
        jobListings: document.querySelectorAll('[class*="job"], [class*="position"], [class*="listing"]').length,
        
        // Look for pagination
        pagination: document.querySelector('[class*="pagination"], [class*="page"]') !== null
      };
      
      return indicators;
    });
    
    // Get network requests
    const networkRequests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .map(entry => entry.name)
        .filter(name => name.includes('workday') || 
                       name.includes('icims') || 
                       name.includes('taleo') || 
                       name.includes('greenhouse') ||
                       name.includes('brassring'));
    });
    
    atsData.networkRequests = networkRequests;
    
    // Analyze the results
    const detectedATS = analyzeATSData(atsData);
    
    console.log(`✅ Analysis complete for ${employerName}`);
    console.log(`Detected ATS: ${detectedATS.primary}`);
    console.log(`Confidence: ${detectedATS.confidence}%`);
    console.log(`Job listings found: ${atsData.jobListings}`);
    console.log(`Has pagination: ${atsData.pagination}`);
    
    if (detectedATS.indicators.length > 0) {
      console.log(`Key indicators: ${detectedATS.indicators.join(', ')}`);
    }
    
    return {
      employer: employerName,
      url: url,
      redirectUrl: redirectUrl,
      searchPerformed: searchPerformed,
      searchResults: searchResults,
      detectedATS: detectedATS,
      rawData: atsData
    };
    
  } catch (error) {
    console.error(`❌ Error analyzing ${employerName}:`, error.message);
    return {
      employer: employerName,
      url: url,
      error: error.message,
      detectedATS: { primary: 'Unknown', confidence: 0, indicators: [] }
    };
  } finally {
    await browser.close();
  }
}

function analyzeATSData(data) {
  const scores = {
    workday: 0,
    icims: 0,
    taleo: 0,
    greenhouse: 0,
    brassring: 0,
    custom: 0
  };
  
  const indicators = [];
  
  // URL analysis (high weight)
  if (data.urls.workday) { scores.workday += 40; indicators.push('Workday URL pattern'); }
  if (data.urls.icims) { scores.icims += 40; indicators.push('iCIMS URL pattern'); }
  if (data.urls.taleo) { scores.taleo += 40; indicators.push('Taleo URL pattern'); }
  if (data.urls.greenhouse) { scores.greenhouse += 40; indicators.push('Greenhouse URL pattern'); }
  if (data.urls.brassring) { scores.brassring += 40; indicators.push('BrassRing URL pattern'); }
  if (data.urls.custom) { scores.custom += 20; indicators.push('Custom career page'); }
  
  // Script analysis (medium weight)
  if (data.scripts.workday.length > 0) { scores.workday += 30; indicators.push('Workday scripts loaded'); }
  if (data.scripts.icims.length > 0) { scores.icims += 30; indicators.push('iCIMS scripts loaded'); }
  if (data.scripts.taleo.length > 0) { scores.taleo += 30; indicators.push('Taleo scripts loaded'); }
  if (data.scripts.greenhouse.length > 0) { scores.greenhouse += 30; indicators.push('Greenhouse scripts loaded'); }
  
  // Meta tag analysis (low weight)
  if (data.meta.workday) { scores.workday += 10; indicators.push('Workday meta tags'); }
  if (data.meta.icims) { scores.icims += 10; indicators.push('iCIMS meta tags'); }
  if (data.meta.taleo) { scores.taleo += 10; indicators.push('Taleo meta tags'); }
  
  // Element analysis (medium weight)
  if (data.elements.workday) { scores.workday += 20; indicators.push('Workday CSS classes'); }
  if (data.elements.icims) { scores.icims += 20; indicators.push('iCIMS CSS classes'); }
  if (data.elements.taleo) { scores.taleo += 20; indicators.push('Taleo CSS classes'); }
  if (data.elements.greenhouse) { scores.greenhouse += 20; indicators.push('Greenhouse CSS classes'); }
  
  // Network requests analysis (high weight)
  data.networkRequests.forEach(request => {
    if (request.includes('workday')) { scores.workday += 25; indicators.push('Workday API calls'); }
    if (request.includes('icims')) { scores.icims += 25; indicators.push('iCIMS API calls'); }
    if (request.includes('taleo')) { scores.taleo += 25; indicators.push('Taleo API calls'); }
    if (request.includes('greenhouse')) { scores.greenhouse += 25; indicators.push('Greenhouse API calls'); }
    if (request.includes('brassring')) { scores.brassring += 25; indicators.push('BrassRing API calls'); }
  });
  
  // Job listings analysis (medium weight)
  if (data.jobListings > 0) { 
    scores.custom += 15; 
    indicators.push(`${data.jobListings} job listings found`); 
  }
  
  // Pagination analysis (low weight)
  if (data.pagination) { 
    scores.custom += 5; 
    indicators.push('Pagination detected'); 
  }
  
  // Find the highest scoring ATS
  const primaryATS = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  const maxScore = scores[primaryATS];
  const confidence = Math.min(100, Math.round((maxScore / 100) * 100));
  
  return {
    primary: primaryATS.charAt(0).toUpperCase() + primaryATS.slice(1),
    confidence: confidence,
    scores: scores,
    indicators: indicators
  };
}

async function runEnhancedATSDetection() {
  console.log('🚀 Starting Enhanced ATS Detection for Top 5 Healthcare Employers\n');
  console.log('=' .repeat(70));
  
  const results = [];
  
  for (const employer of employers) {
    try {
      const result = await detectATSWithSearch(employer.url, employer.name, employer.searchTerms);
      results.push(result);
      
      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`Failed to analyze ${employer.name}:`, error.message);
      results.push({
        employer: employer.name,
        url: employer.url,
        error: error.message,
        detectedATS: { primary: 'Unknown', confidence: 0, indicators: [] }
      });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 ENHANCED ATS DETECTION SUMMARY');
  console.log('=' .repeat(70));
  
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.employer}: ERROR - ${result.error}`);
    } else {
      console.log(`✅ ${result.employer}: ${result.detectedATS.primary} (${result.detectedATS.confidence}% confidence)`);
      if (result.redirectUrl && result.redirectUrl !== result.url) {
        console.log(`   Redirected to: ${result.redirectUrl}`);
      }
      if (result.searchPerformed) {
        console.log(`   Search performed: Yes`);
      }
    }
  });
  
  // Save results to file
  const fs = require('fs');
  const outputFile = '/home/dell/ai-resume-builder/scripts/ats-detection-enhanced-results.json';
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Enhanced results saved to: ${outputFile}`);
  
  return results;
}

// Run the detection
if (require.main === module) {
  runEnhancedATSDetection().catch(console.error);
}

module.exports = { detectATSWithSearch, runEnhancedATSDetection };
