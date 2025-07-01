/**
 * Test script to verify Puppeteer installation and functionality
 * Run with: node scripts/test-puppeteer.js
 */

const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('Starting Puppeteer test...');
  
  try {
    // Launch browser
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create a new page
    console.log('Creating new page...');
    const page = await browser.newPage();
    
    // Navigate to a test page
    console.log('Navigating to test page...');
    await page.goto('https://example.com');
    
    // Take a screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'puppeteer-test.png' });
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Close browser
    await browser.close();
    
    console.log('Puppeteer test completed successfully!');
    console.log('Screenshot saved as puppeteer-test.png');
    
    return true;
  } catch (error) {
    console.error('Puppeteer test failed:', error);
    return false;
  }
}

// Run the test
testPuppeteer()
  .then(success => {
    if (success) {
      console.log('✅ Puppeteer is working correctly');
      process.exit(0);
    } else {
      console.log('❌ Puppeteer test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
  }); 