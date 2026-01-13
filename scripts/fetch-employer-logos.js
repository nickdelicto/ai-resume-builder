#!/usr/bin/env node

/**
 * Employer Logo Fetcher
 *
 * Attempts to fetch logos from employer websites using multiple strategies:
 * 1. Open Graph image (og:image)
 * 2. Apple Touch Icon
 * 3. JSON-LD schema logo
 * 4. Favicon (fallback)
 *
 * Usage: node scripts/fetch-employer-logos.js [--employer=slug]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer');

// Puppeteer browser instance (lazy-loaded)
let browserInstance = null;

// Employer configurations with their website domains
const employers = {
  'cleveland-clinic': {
    name: 'Cleveland Clinic',
    domain: 'clevelandclinic.org',
    website: 'https://www.clevelandclinic.org'
  },
  'mass-general-brigham': {
    name: 'Mass General Brigham',
    domain: 'massgeneralbrigham.org',
    website: 'https://www.massgeneralbrigham.org'
  },
  'northwell-health': {
    name: 'Northwell Health',
    domain: 'northwell.edu',
    website: 'https://www.northwell.edu'
  },
  'yale-new-haven-health-system': {
    name: 'Yale New Haven Health System',
    domain: 'ynhhs.org',
    website: 'https://www.ynhhs.org'  // Note: ynhhs.org (with 's') is the health SYSTEM, ynhh.org is just one hospital
  },
  'hartford-healthcare': {
    name: 'Hartford Healthcare',
    domain: 'hartfordhealthcare.org',
    website: 'https://hartfordhealthcare.org'
  },
  'guthrie': {
    name: 'Guthrie',
    domain: 'guthrie.org',
    website: 'https://www.guthrie.org'
  },
  'upstate-medical': {
    name: 'Upstate Medical University',
    domain: 'upstate.edu',
    website: 'https://www.upstate.edu'
  },
  'strong-memorial-hospital': {
    name: 'Strong Memorial Hospital',
    domain: 'urmc.rochester.edu',
    website: 'https://www.urmc.rochester.edu'
  },
  'adventist-healthcare': {
    name: 'Adventist Healthcare',
    domain: 'adventisthealthcare.com',
    website: 'https://www.adventisthealthcare.com'
  },
  'uhs': {
    name: 'United Health Services',
    domain: 'nyuhs.org',
    website: 'https://www.nyuhs.org'
  }
};

const OUTPUT_DIR = path.join(__dirname, '../public/images/employers');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Get or create Puppeteer browser instance
 */
async function getBrowser() {
  if (!browserInstance) {
    console.log('  🚀 Launching headless browser...');
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  return browserInstance;
}

/**
 * Close browser instance
 */
async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Fetch page content using Puppeteer (for 403-blocked sites)
 */
async function fetchWithPuppeteer(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate and wait for content
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Get page content
    const html = await page.content();
    return Buffer.from(html);
  } finally {
    await page.close();
  }
}

/**
 * Download image using Puppeteer (for 403-blocked image URLs)
 */
async function downloadImageWithPuppeteer(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Intercept response to get raw image data
    let imageBuffer = null;

    page.on('response', async (response) => {
      if (response.url() === url && response.status() === 200) {
        try {
          imageBuffer = await response.buffer();
        } catch (e) {
          // Response might not be available
        }
      }
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (imageBuffer) {
      return imageBuffer;
    }

    // Fallback: try to get image from page
    throw new Error('Could not capture image');
  } finally {
    await page.close();
  }
}

/**
 * Fetch URL content with redirect following
 */
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // Don't request compressed encoding since we don't decompress
        'Cache-Control': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        resolve(fetchUrl(redirectUrl, maxRedirects - 1));
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Extract logo URL from HTML using multiple strategies
 * Improved detection with scoring system
 */
function extractLogoUrl(html, baseUrl) {
  const htmlStr = html.toString();
  const urlObj = new URL(baseUrl);

  const makeAbsolute = (url) => {
    if (!url) return null;
    url = url.replace(/&amp;/g, '&'); // Decode HTML entities
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `${urlObj.protocol}${url}`;
    if (url.startsWith('/')) return `${urlObj.protocol}//${urlObj.host}${url}`;
    return `${urlObj.protocol}//${urlObj.host}/${url}`;
  };

  const fixMalformedUrl = (url) => {
    if (!url) return null;
    // Handle malformed URLs that have domain prepended twice
    if (url.includes('https://') || url.includes('http://')) {
      const lastHttpIndex = Math.max(url.lastIndexOf('https://'), url.lastIndexOf('http://'));
      return url.substring(lastHttpIndex);
    }
    return makeAbsolute(url);
  };

  // Collect all candidates with scores
  const candidates = [];

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 1 (HIGHEST PRIORITY): JSON-LD Schema.org logo
  // Most reliable - explicit logo declaration by the website
  // ═══════════════════════════════════════════════════════════════
  const jsonLdMatch = htmlStr.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
      try {
        const data = JSON.parse(jsonContent);
        // Check multiple possible locations for logo
        const logoSources = [
          data.logo,
          data.image,
          data.publisher?.logo,
          data.organization?.logo,
          data.brand?.logo,
          data['@graph']?.find(item => item.logo)?.logo
        ];

        for (const logo of logoSources) {
          if (logo) {
            let logoUrl = typeof logo === 'string' ? logo : (logo.url || logo['@id']);
            if (logoUrl) {
              logoUrl = fixMalformedUrl(logoUrl);
              // Prefer SVG
              const isSvg = logoUrl.toLowerCase().includes('.svg');
              candidates.push({
                url: logoUrl,
                source: 'JSON-LD',
                score: isSvg ? 100 : 95,
                emoji: '📋'
              });
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 2: Look for img/svg with "logo" in header/nav area
  // Usually the main site logo
  // ═══════════════════════════════════════════════════════════════

  // Extract header/nav section (first 30% of HTML or until </header>)
  const headerEnd = htmlStr.search(/<\/header>/i);
  const headerHtml = headerEnd > 0 ? htmlStr.substring(0, headerEnd + 9) : htmlStr.substring(0, Math.floor(htmlStr.length * 0.3));

  // Look for SVG logos first (inline or linked)
  const svgLogoMatch = headerHtml.match(/<(?:img|a)[^>]+(?:class|id)=["'][^"']*logo[^"']*["'][^>]*(?:src|href)=["']([^"']+\.svg[^"']*)["']/i) ||
                       headerHtml.match(/<(?:img|a)[^>]+(?:src|href)=["']([^"']+logo[^"']*\.svg[^"']*)["']/i);
  if (svgLogoMatch && svgLogoMatch[1]) {
    candidates.push({
      url: makeAbsolute(svgLogoMatch[1]),
      source: 'Header SVG',
      score: 90,
      emoji: '🎨'
    });
  }

  // Look for img with "logo" in class, id, or src within header
  const headerLogoMatch = headerHtml.match(/<img[^>]+(?:class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                          headerHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*logo[^"']*["']/i);
  if (headerLogoMatch && headerLogoMatch[1]) {
    const url = makeAbsolute(headerLogoMatch[1]);
    const isSvg = url.toLowerCase().includes('.svg');
    candidates.push({
      url: url,
      source: 'Header img',
      score: isSvg ? 88 : 85,
      emoji: '🖼️'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 3: img with "logo" anywhere in page
  // ═══════════════════════════════════════════════════════════════
  const logoImgMatch = htmlStr.match(/<img[^>]+(?:class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                       htmlStr.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*logo[^"']*["']/i) ||
                       htmlStr.match(/<img[^>]+src=["']([^"']*logo[^"']+)["']/i);
  if (logoImgMatch && logoImgMatch[1]) {
    const url = makeAbsolute(logoImgMatch[1]);
    const isSvg = url.toLowerCase().includes('.svg');
    // Lower score if not in header
    if (!candidates.some(c => c.url === url)) {
      candidates.push({
        url: url,
        source: 'Page img',
        score: isSvg ? 78 : 75,
        emoji: '🖼️'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 4: Open Graph image (often a banner, but sometimes logo)
  // Lower priority as og:image is often a social sharing banner
  // ═══════════════════════════════════════════════════════════════
  const ogMatch = htmlStr.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                  htmlStr.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch && ogMatch[1]) {
    const url = makeAbsolute(ogMatch[1]);
    // Check if it looks like a logo (has 'logo' in URL)
    const looksLikeLogo = url.toLowerCase().includes('logo');
    candidates.push({
      url: url,
      source: 'og:image',
      score: looksLikeLogo ? 70 : 50, // Lower score if doesn't look like a logo
      emoji: '📸'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 5: Apple Touch Icon (180x180, good for square logos)
  // ═══════════════════════════════════════════════════════════════
  const appleTouchMatches = htmlStr.matchAll(/<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["'](?:[^>]+sizes=["'](\d+))?/gi);
  for (const match of appleTouchMatches) {
    const url = makeAbsolute(match[1]);
    const size = match[2] ? parseInt(match[2]) : 180;
    candidates.push({
      url: url,
      source: `Apple icon (${size}px)`,
      score: size >= 180 ? 60 : 45,
      emoji: '🍎'
    });
  }

  // Alternate pattern for apple-touch-icon
  const appleMatch = htmlStr.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon/i);
  if (appleMatch && appleMatch[1]) {
    const url = makeAbsolute(appleMatch[1]);
    if (!candidates.some(c => c.url === url)) {
      candidates.push({
        url: url,
        source: 'Apple icon',
        score: 55,
        emoji: '🍎'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 6: Large favicon (64px+)
  // Last resort fallback
  // ═══════════════════════════════════════════════════════════════
  const faviconMatches = htmlStr.matchAll(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["'](?:[^>]+sizes=["'](\d+))?/gi);
  for (const match of faviconMatches) {
    const size = match[2] ? parseInt(match[2]) : 32;
    if (size >= 64) {
      candidates.push({
        url: makeAbsolute(match[1]),
        source: `Favicon (${size}px)`,
        score: 30 + Math.min(size / 10, 15), // Max 45 for large favicons
        emoji: '🔷'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SELECT BEST CANDIDATE
  // ═══════════════════════════════════════════════════════════════
  if (candidates.length === 0) {
    return null;
  }

  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);

  // Log all candidates for debugging
  console.log(`  📊 Found ${candidates.length} candidates:`);
  candidates.slice(0, 5).forEach((c, i) => {
    const selected = i === 0 ? ' ⭐' : '';
    console.log(`     ${i + 1}. [${c.score}] ${c.source}${selected}`);
  });

  const best = candidates[0];
  console.log(`  ${best.emoji} Selected: ${best.source} (score: ${best.score})`);

  return best.url;
}

/**
 * Detect image type from buffer
 */
function detectImageType(buffer) {
  const magicBytes = buffer.slice(0, 4).toString('hex');
  const bufferStr = buffer.toString('utf8', 0, 200);

  if (magicBytes.startsWith('89504e47')) return { type: 'png', ext: '.png' };
  if (magicBytes.startsWith('ffd8ff')) return { type: 'jpeg', ext: '.jpg' };
  if (magicBytes.startsWith('47494638')) return { type: 'gif', ext: '.gif' };
  if (magicBytes.startsWith('52494646')) return { type: 'webp', ext: '.webp' };
  if (bufferStr.includes('<svg') || bufferStr.includes('<?xml')) return { type: 'svg', ext: '.svg' };

  return null;
}

/**
 * Download image and save to file
 */
async function downloadImage(url, filepath) {
  const buffer = await fetchUrl(url);

  // Detect image type
  const imageInfo = detectImageType(buffer);

  if (!imageInfo) {
    throw new Error('Not a valid image file');
  }

  // Update filepath with correct extension
  const finalPath = filepath.replace(/\.[^.]+$/, imageInfo.ext);

  fs.writeFileSync(finalPath, buffer);
  return { size: buffer.length, path: finalPath, type: imageInfo.type };
}

/**
 * Check if logo already exists (any extension)
 */
function logoExists(slug) {
  const extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];
  for (const ext of extensions) {
    if (fs.existsSync(path.join(OUTPUT_DIR, `${slug}${ext}`))) {
      return path.join(OUTPUT_DIR, `${slug}${ext}`);
    }
  }
  return null;
}

/**
 * Process a single employer
 */
async function processEmployer(slug, config) {
  const outputFile = path.join(OUTPUT_DIR, `${slug}.png`);

  // Skip if already exists (any extension)
  const existingLogo = logoExists(slug);
  if (existingLogo) {
    console.log(`⏭️  ${config.name}: Logo already exists (${path.basename(existingLogo)}), skipping`);
    return { status: 'skipped', reason: 'exists' };
  }

  console.log(`\n🔍 ${config.name} (${config.domain})`);

  let html = null;
  let usedPuppeteer = false;

  // Try regular fetch first
  try {
    console.log(`  Fetching ${config.website}...`);
    html = await fetchUrl(config.website);
  } catch (error) {
    // If 403, try Puppeteer as fallback
    if (error.message.includes('403')) {
      console.log(`  ⚠️ Blocked (403), trying headless browser...`);
      try {
        html = await fetchWithPuppeteer(config.website);
        usedPuppeteer = true;
        console.log(`  ✓ Puppeteer succeeded`);
      } catch (puppeteerError) {
        console.log(`  ❌ Puppeteer also failed: ${puppeteerError.message}`);
        return { status: 'failed', reason: `403 blocked, Puppeteer failed: ${puppeteerError.message}` };
      }
    } else {
      console.log(`  ❌ Error: ${error.message}`);
      return { status: 'failed', reason: error.message };
    }
  }

  try {
    // Extract logo URL
    const logoUrl = extractLogoUrl(html, config.website);

    if (!logoUrl) {
      console.log('  ❌ No logo found');
      return { status: 'failed', reason: 'no logo found' };
    }

    console.log(`  📥 Downloading: ${logoUrl}`);

    // Try regular download, fall back to Puppeteer if needed
    let result;
    try {
      result = await downloadImage(logoUrl, outputFile);
    } catch (dlError) {
      if (dlError.message.includes('403') || usedPuppeteer) {
        console.log(`  ⚠️ Image blocked, trying Puppeteer...`);
        const buffer = await downloadImageWithPuppeteer(logoUrl);
        const imageInfo = detectImageType(buffer);
        if (!imageInfo) {
          throw new Error('Not a valid image file');
        }
        const finalPath = outputFile.replace(/\.[^.]+$/, imageInfo.ext);
        fs.writeFileSync(finalPath, buffer);
        result = { size: buffer.length, path: finalPath, type: imageInfo.type };
      } else {
        throw dlError;
      }
    }

    console.log(`  ✅ Saved: ${path.basename(result.path)} (${Math.round(result.size/1024)}KB) [${result.type}]${usedPuppeteer ? ' (via Puppeteer)' : ''}`);

    return { status: 'success', path: result.path, size: result.size, type: result.type };

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { status: 'failed', reason: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏥 Employer Logo Fetcher\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // Parse command line args
  const args = process.argv.slice(2);
  const employerArg = args.find(a => a.startsWith('--employer='));
  const specificEmployer = employerArg ? employerArg.split('=')[1] : null;

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  const employersToProcess = specificEmployer
    ? { [specificEmployer]: employers[specificEmployer] }
    : employers;

  if (specificEmployer && !employers[specificEmployer]) {
    console.error(`❌ Unknown employer: ${specificEmployer}`);
    console.log('\nAvailable employers:');
    Object.keys(employers).forEach(k => console.log(`  - ${k}`));
    process.exit(1);
  }

  for (const [slug, config] of Object.entries(employersToProcess)) {
    const result = await processEmployer(slug, config);
    results[result.status === 'success' ? 'success' :
            result.status === 'skipped' ? 'skipped' : 'failed'].push({
      employer: config.name,
      slug,
      ...result
    });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Failed:  ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed employers (try manually):');
    results.failed.forEach(f => console.log(`  - ${f.employer}: ${f.reason}`));
  }

  // Cleanup Puppeteer browser if it was used
  await closeBrowser();
}

main().catch(console.error);
