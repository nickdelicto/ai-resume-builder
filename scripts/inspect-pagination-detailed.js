const puppeteer = require('puppeteer');

/**
 * Detailed pagination inspection - checking how to detect current page
 * and how to reliably navigate between pages
 */

async function inspectPaginationDetailed() {
  console.log('🔍 Detailed Pagination Inspection\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const searchUrl = 'https://jobs.clevelandclinic.org/job-search-results/?keyword=nurse';
    
    console.log('📄 Page 1 Analysis:');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const page1Analysis = await page.evaluate(() => {
      const analysis = {
        url: window.location.href,
        pageNumbers: [],
        activePage: null,
        firstJobTitle: null,
        lastJobTitle: null,
        totalJobsFound: 0
      };
      
      // Find all page number elements
      const allLinks = Array.from(document.querySelectorAll('a'));
      const pageLinks = allLinks.filter(link => {
        const text = link.textContent.trim();
        return /^\d+$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 100;
      });
      
      pageLinks.forEach(link => {
        const pageNum = parseInt(link.textContent.trim());
        const isActive = link.classList.contains('active') || 
                        link.classList.contains('current') ||
                        link.parentElement?.classList.contains('active') ||
                        link.getAttribute('aria-current') === 'page';
        
        analysis.pageNumbers.push({
          number: pageNum,
          text: link.textContent.trim(),
          href: link.href,
          isActive: isActive,
          className: link.className,
          onclick: link.getAttribute('onclick'),
          dataAttributes: {}
        });
        
        // Get data attributes
        Array.from(link.attributes).forEach(attr => {
          if (attr.name.startsWith('data-')) {
            analysis.pageNumbers[analysis.pageNumbers.length - 1].dataAttributes[attr.name] = attr.value;
          }
        });
        
        if (isActive) {
          analysis.activePage = pageNum;
        }
      });
      
      // Get first and last job titles to verify we're on different pages
      const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt');
      analysis.totalJobsFound = jobElements.length;
      
      if (jobElements.length > 0) {
        const firstJob = jobElements[0];
        const lastJob = jobElements[jobElements.length - 1];
        const titleSelectors = ['.jobTitle', 'a', 'h3', 'h2'];
        
        for (const selector of titleSelectors) {
          const firstTitleEl = firstJob.querySelector(selector);
          const lastTitleEl = lastJob.querySelector(selector);
          if (firstTitleEl) {
            analysis.firstJobTitle = firstTitleEl.textContent.trim().substring(0, 80);
          }
          if (lastTitleEl) {
            analysis.lastJobTitle = lastTitleEl.textContent.trim().substring(0, 80);
          }
          if (analysis.firstJobTitle && analysis.lastJobTitle) break;
        }
      }
      
      return analysis;
    });
    
    console.log(`   URL: ${page1Analysis.url}`);
    console.log(`   Active Page: ${page1Analysis.activePage || 'Unknown'}`);
    console.log(`   Total Jobs: ${page1Analysis.totalJobsFound}`);
    console.log(`   First Job: ${page1Analysis.firstJobTitle}`);
    console.log(`   Last Job: ${page1Analysis.lastJobTitle}`);
    console.log(`   Page Numbers Found: ${page1Analysis.pageNumbers.length}`);
    
    if (page1Analysis.pageNumbers.length > 0) {
      console.log('\n   Page Number Details:');
      page1Analysis.pageNumbers.forEach(pg => {
        console.log(`   - Page ${pg.number}: Active=${pg.isActive}, Class="${pg.className}", Href="${pg.href}"`);
        if (Object.keys(pg.dataAttributes).length > 0) {
          console.log(`     Data attributes:`, pg.dataAttributes);
        }
      });
    }
    
    // Now try to navigate to page 2 and compare
    console.log('\n\n📄 Navigating to Page 2...');
    
    // Method: Click page 2 link
    const page2Clickable = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const page2Link = allLinks.find(link => {
        const text = link.textContent.trim();
        return text === '2' && /^\d+$/.test(text);
      });
      
      if (page2Link) {
        return {
          found: true,
          href: page2Link.href,
          className: page2Link.className,
          onclick: page2Link.getAttribute('onclick')
        };
      }
      return { found: false };
    });
    
    if (page2Clickable.found) {
      console.log(`   Found page 2 link: ${page2Clickable.href}`);
      console.log(`   Class: ${page2Clickable.className}`);
      
      // Try clicking it
      await page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        const page2Link = allLinks.find(link => link.textContent.trim() === '2');
        if (page2Link) {
          page2Link.click();
        return true;
        }
        return false;
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const page2Analysis = await page.evaluate(() => {
        const analysis = {
          url: window.location.href,
          activePage: null,
          firstJobTitle: null,
          totalJobsFound: 0
        };
        
        // Find active page
        const allLinks = Array.from(document.querySelectorAll('a'));
        const pageLinks = allLinks.filter(link => {
          const text = link.textContent.trim();
          if (!/^\d+$/.test(text)) return false;
          return link.classList.contains('active') || 
                 link.classList.contains('current') ||
                 link.parentElement?.classList.contains('active');
        });
        
        if (pageLinks.length > 0) {
          analysis.activePage = parseInt(pageLinks[0].textContent.trim());
        }
        
        const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt');
        analysis.totalJobsFound = jobElements.length;
        
        if (jobElements.length > 0) {
          const firstJob = jobElements[0];
          const titleSelectors = ['.jobTitle', 'a', 'h3'];
          for (const selector of titleSelectors) {
            const titleEl = firstJob.querySelector(selector);
            if (titleEl) {
              analysis.firstJobTitle = titleEl.textContent.trim().substring(0, 80);
              break;
            }
          }
        }
        
        return analysis;
      });
      
      console.log(`   URL after click: ${page2Analysis.url}`);
      console.log(`   Active Page: ${page2Analysis.activePage || 'Unknown'}`);
      console.log(`   Total Jobs: ${page2Analysis.totalJobsFound}`);
      console.log(`   First Job: ${page2Analysis.firstJobTitle}`);
      
      // Compare with page 1
      if (page2Analysis.firstJobTitle !== page1Analysis.firstJobTitle) {
        console.log('\n   ✅ SUCCESS! Different jobs loaded (pagination working)');
      } else {
        console.log('\n   ⚠️  WARNING: Same jobs as page 1 (pagination may not be working)');
      }
    }
    
    // Test pagination loop - collect all page numbers and try to navigate
    console.log('\n\n🔄 Testing Full Pagination Loop:');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const allPages = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const pageLinks = allLinks.filter(link => {
        const text = link.textContent.trim();
        return /^\d+$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 100;
      });
      
      return pageLinks.map(link => ({
        number: parseInt(link.textContent.trim()),
        href: link.href,
        className: link.className
      })).sort((a, b) => a.number - b.number);
    });
    
    console.log(`   Found ${allPages.length} page links: ${allPages.map(p => p.number).join(', ')}`);
    
    // Try navigating through first 3 pages
    const pagesToTest = Math.min(3, allPages.length);
    const pageResults = [];
    
    for (let i = 0; i < pagesToTest; i++) {
      const targetPage = allPages[i].number;
      console.log(`\n   Testing Page ${targetPage}...`);
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const clicked = await page.evaluate((pageNum) => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        const pageLink = allLinks.find(link => link.textContent.trim() === String(pageNum));
        if (pageLink) {
          pageLink.click();
          return true;
        }
        return false;
      }, targetPage);
      
      if (clicked) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const result = await page.evaluate(() => {
          const jobElements = document.querySelectorAll('.job.clearfix, .job.clearfix.alt');
          const firstJob = jobElements[0];
          let firstTitle = null;
          if (firstJob) {
            const titleEl = firstJob.querySelector('.jobTitle, a, h3');
            if (titleEl) firstTitle = titleEl.textContent.trim().substring(0, 60);
          }
          
          // Check active page
          const allLinks = Array.from(document.querySelectorAll('a'));
          const activeLink = allLinks.find(link => {
            const text = link.textContent.trim();
            if (!/^\d+$/.test(text)) return false;
            return link.classList.contains('active') || 
                   link.classList.contains('current');
          });
          
          return {
            jobsCount: jobElements.length,
            firstJobTitle: firstTitle,
            activePage: activeLink ? parseInt(activeLink.textContent.trim()) : null
          };
        });
        
        pageResults.push({
          page: targetPage,
          ...result
        });
        
        console.log(`      Jobs: ${result.jobsCount}, Active Page: ${result.activePage || 'Unknown'}`);
        console.log(`      First Job: ${result.firstJobTitle || 'N/A'}`);
      }
    }
    
    // Summary
    console.log('\n\n📊 PAGINATION SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Total Pages: ${allPages.length}`);
    console.log(`Jobs per page: ~${pageResults[0]?.jobsCount || 'Unknown'}`);
    console.log(`Estimated total jobs: ~${allPages.length * (pageResults[0]?.jobsCount || 0)}`);
    
    console.log('\n✅ Navigation Method:');
    console.log('   - Click page number links using text content');
    console.log('   - Wait 5 seconds after each click for content to load');
    console.log('   - Verify active page by checking class="active" or class="current"');
    console.log('   - Collect jobs from each page before moving to next');
    
    console.log('\n⏱️  Keep browser open for 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

inspectPaginationDetailed()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

