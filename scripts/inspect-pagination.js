const puppeteer = require('puppeteer');

/**
 * Script to inspect Cleveland Clinic job search pagination structure
 * This will help us understand how to loop through all pages
 */

async function inspectPagination() {
  console.log('🔍 Inspecting Cleveland Clinic job search pagination...');
  console.log('URL: https://jobs.clevelandclinic.org/job-search-results/?keyword=nurse\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser so we can see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to search page
    const searchUrl = 'https://jobs.clevelandclinic.org/job-search-results/?keyword=nurse';
    console.log('📄 Navigating to search results page...');
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Inspect pagination structure
    const paginationInfo = await page.evaluate(() => {
      const info = {
        currentUrl: window.location.href,
        hasPagination: false,
        paginationType: null,
        totalPages: null,
        currentPage: null,
        nextButton: null,
        pageNumbers: [],
        urlParams: {},
        paginationHTML: null
      };
      
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.forEach((value, key) => {
        info.urlParams[key] = value;
      });
      
      // Look for pagination container
      const paginationSelectors = [
        '.pagination',
        '[class*="pagination"]',
        '[class*="page"]',
        '.page-numbers',
        '.paging',
        '[id*="pagination"]',
        '[id*="paging"]'
      ];
      
      let paginationElement = null;
      for (const selector of paginationSelectors) {
        paginationElement = document.querySelector(selector);
        if (paginationElement) {
          info.hasPagination = true;
          info.paginationHTML = paginationElement.innerHTML;
          break;
        }
      }
      
      // If no pagination container found, search for "Next" button anywhere
      if (!paginationElement) {
        const nextSelectors = [
          'a:contains("Next")',
          'button:contains("Next")',
          '[class*="next"]',
          '[id*="next"]',
          'a[aria-label*="next" i]',
          'button[aria-label*="next" i]'
        ];
        
        for (const selector of nextSelectors) {
          try {
            const elements = Array.from(document.querySelectorAll('a, button'));
            const nextBtn = elements.find(el => {
              const text = el.textContent.toLowerCase().trim();
              const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
              return text.includes('next') || ariaLabel.includes('next');
            });
            
            if (nextBtn) {
              info.hasPagination = true;
              info.nextButton = {
                text: nextBtn.textContent.trim(),
                href: nextBtn.href || nextBtn.getAttribute('href'),
                disabled: nextBtn.hasAttribute('disabled') || nextBtn.classList.contains('disabled'),
                ariaLabel: nextBtn.getAttribute('aria-label'),
                className: nextBtn.className,
                id: nextBtn.id
              };
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Look for page numbers
      const pageNumberElements = Array.from(document.querySelectorAll('a, button, span')).filter(el => {
        const text = el.textContent.trim();
        // Check if it's a number (1, 2, 3, etc.) and likely a page number
        return /^\d+$/.test(text) && parseInt(text) > 0 && parseInt(text) < 1000;
      });
      
      if (pageNumberElements.length > 0) {
        info.pageNumbers = pageNumberElements.map(el => ({
          text: el.textContent.trim(),
          href: el.href || el.getAttribute('href'),
          isActive: el.classList.contains('active') || el.classList.contains('current'),
          className: el.className,
          parentHTML: el.parentElement ? el.parentElement.innerHTML.substring(0, 200) : null
        }));
        
        // Try to determine total pages
        const pageNums = pageNumberElements
          .map(el => parseInt(el.textContent.trim()))
          .filter(num => !isNaN(num));
        if (pageNums.length > 0) {
          info.totalPages = Math.max(...pageNums);
          info.currentPage = pageNums.find((num, idx) => {
            const el = pageNumberElements[idx];
            return el.classList.contains('active') || el.classList.contains('current');
          }) || pageNums[0];
        }
      }
      
      // Determine pagination type
      if (info.urlParams.page || info.urlParams.p || info.urlParams.pg) {
        info.paginationType = 'URL_PARAM';
      } else if (info.nextButton) {
        info.paginationType = 'NEXT_BUTTON';
      } else if (info.pageNumbers.length > 0) {
        info.paginationType = 'PAGE_NUMBERS';
      } else {
        info.paginationType = 'UNKNOWN';
      }
      
      // Count jobs on current page
      const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt, [class*="job"]');
      info.jobsOnPage = jobElements.length;
      
      // Check if there's a "results count" or "showing X of Y" text
      const bodyText = document.body.textContent;
      const resultsPatterns = [
        /showing\s+(\d+)\s+of\s+(\d+)/i,
        /(\d+)\s+results?/i,
        /(\d+)\s+-\s+(\d+)\s+of\s+(\d+)/i,
        /page\s+(\d+)\s+of\s+(\d+)/i
      ];
      
      for (const pattern of resultsPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          info.resultsText = match[0];
          if (match[2]) info.totalResults = parseInt(match[2]);
          if (match[1] && !match[2]) info.totalResults = parseInt(match[1]);
          break;
        }
      }
      
      return info;
    });
    
    console.log('\n📊 PAGINATION INSPECTION RESULTS:');
    console.log('═'.repeat(60));
    console.log('\n📍 Current URL:');
    console.log(`   ${paginationInfo.currentUrl}`);
    
    console.log('\n🔗 URL Parameters:');
    Object.entries(paginationInfo.urlParams).forEach(([key, value]) => {
      console.log(`   ${key} = ${value}`);
    });
    
    console.log(`\n📋 Jobs on this page: ${paginationInfo.jobsOnPage}`);
    if (paginationInfo.totalResults) {
      console.log(`📊 Total results: ${paginationInfo.totalResults}`);
    }
    
    console.log(`\n🔍 Pagination Detected: ${paginationInfo.hasPagination ? 'YES ✅' : 'NO ❌'}`);
    console.log(`📌 Pagination Type: ${paginationInfo.paginationType}`);
    
    if (paginationInfo.currentPage) {
      console.log(`📄 Current Page: ${paginationInfo.currentPage}`);
    }
    if (paginationInfo.totalPages) {
      console.log(`📚 Total Pages: ${paginationInfo.totalPages}`);
    }
    
    if (paginationInfo.nextButton) {
      console.log('\n▶️  Next Button Found:');
      console.log(`   Text: "${paginationInfo.nextButton.text}"`);
      console.log(`   Href: ${paginationInfo.nextButton.href || 'N/A'}`);
      console.log(`   Disabled: ${paginationInfo.nextButton.disabled ? 'YES' : 'NO'}`);
      console.log(`   Class: ${paginationInfo.nextButton.className || 'N/A'}`);
    }
    
    if (paginationInfo.pageNumbers.length > 0) {
      console.log(`\n🔢 Found ${paginationInfo.pageNumbers.length} page number elements:`);
      paginationInfo.pageNumbers.slice(0, 10).forEach((page, idx) => {
        console.log(`   ${idx + 1}. Page ${page.text} ${page.isActive ? '(ACTIVE)' : ''}`);
        if (page.href) console.log(`      → ${page.href}`);
      });
      if (paginationInfo.pageNumbers.length > 10) {
        console.log(`   ... and ${paginationInfo.pageNumbers.length - 10} more`);
      }
    }
    
    if (paginationInfo.paginationHTML) {
      console.log('\n📄 Pagination HTML (first 500 chars):');
      console.log(paginationInfo.paginationHTML.substring(0, 500));
    }
    
    // Try to navigate to page 2 to see what happens
    console.log('\n\n🧪 TESTING PAGE NAVIGATION:');
    console.log('═'.repeat(60));
    
    // Method 1: Try URL parameter
    console.log('\n1️⃣ Trying URL parameter: ?page=2');
    const urlWithPage = `${searchUrl}&page=2`;
    await page.goto(urlWithPage, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const page2Info = await page.evaluate(() => {
      const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt, [class*="job"]');
      return {
        url: window.location.href,
        jobsCount: jobElements.length,
        hasDifferentJobs: jobElements.length > 0
      };
    });
    
    console.log(`   URL after navigation: ${page2Info.url}`);
    console.log(`   Jobs on page 2: ${page2Info.jobsCount}`);
    console.log(`   Different jobs? ${page2Info.hasDifferentJobs ? 'YES ✅' : 'NO ❌'}`);
    
    // Method 2: Try clicking Next button if it exists
    if (paginationInfo.nextButton && !paginationInfo.nextButton.disabled) {
      console.log('\n2️⃣ Trying Next Button click...');
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const nextClicked = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('a, button'));
          const nextBtn = elements.find(el => {
            const text = el.textContent.toLowerCase().trim();
            return text.includes('next');
          });
          
          if (nextBtn) {
            nextBtn.click();
            return true;
          }
          return false;
        });
        
        if (nextClicked) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for navigation
          
          const afterClick = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt, [class*="job"]');
            return {
              url: window.location.href,
              jobsCount: jobElements.length
            };
          });
          
          console.log(`   URL after Next click: ${afterClick.url}`);
          console.log(`   Jobs on next page: ${afterClick.jobsCount}`);
        }
      } catch (error) {
        console.log(`   Error clicking Next: ${error.message}`);
      }
    }
    
    // Method 3: Look for page number links
    if (paginationInfo.pageNumbers.length > 0) {
      console.log('\n3️⃣ Trying page number link click...');
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const page2Link = paginationInfo.pageNumbers.find(p => p.text === '2');
      if (page2Link && page2Link.href) {
        try {
          await page.goto(page2Link.href, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const afterPageClick = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt, [class*="job"]');
            return {
              url: window.location.href,
              jobsCount: jobElements.length
            };
          });
          
          console.log(`   URL after page 2 click: ${afterPageClick.url}`);
          console.log(`   Jobs on page 2: ${afterPageClick.jobsCount}`);
        } catch (error) {
          console.log(`   Error clicking page link: ${error.message}`);
        }
      }
    }
    
    console.log('\n\n💡 RECOMMENDATION:');
    console.log('═'.repeat(60));
    
    if (paginationInfo.paginationType === 'URL_PARAM') {
      console.log('✅ Use URL parameter pagination');
      console.log('   Example: ?keyword=nurse&page=1, ?keyword=nurse&page=2, etc.');
    } else if (paginationInfo.nextButton && !paginationInfo.nextButton.disabled) {
      console.log('✅ Use Next button pagination');
      console.log('   Click the Next button until it becomes disabled');
    } else if (paginationInfo.pageNumbers.length > 0) {
      console.log('✅ Use page number links');
      console.log('   Extract all page numbers and iterate through them');
    } else {
      console.log('⚠️  Pagination structure unclear - may need manual inspection');
      console.log('   Check the browser window to see the actual pagination UI');
    }
    
    // Keep browser open for manual inspection
    console.log('\n\n👀 Browser will stay open for 30 seconds for manual inspection...');
    console.log('   Check the pagination UI in the browser window');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    return paginationInfo;
    
  } catch (error) {
    console.error('❌ Error during inspection:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run inspection
inspectPagination()
  .then(() => {
    console.log('\n✅ Inspection complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

