# Puppeteer Setup for PDF Generation

This document provides instructions for setting up Puppeteer for PDF generation on the VPS server.

## Changes Made

We've updated the codebase to use the full Puppeteer package instead of puppeteer-core with chrome-aws-lambda. This ensures consistent behavior between development and production environments.

Changes include:
1. Updated imports to use `import puppeteer from 'puppeteer'` in PDF generation files
2. Removed conditional code that used different browser launch settings for dev/prod
3. Moved puppeteer from devDependencies to dependencies in package.json
4. Removed puppeteer-core and chrome-aws-lambda dependencies

## Setup Instructions for VPS

1. Pull the latest code changes to your VPS server:
   ```bash
   cd /home/intelliresume/ai-resume-builder
   git pull
   ```

2. Install the full Puppeteer package (includes Chrome browser binary):
   ```bash
   npm install --save puppeteer
   ```

3. If you encounter any issues with Puppeteer installation, you may need to install additional dependencies:
   ```bash
   sudo apt-get update
   sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
   ```

4. Test Puppeteer installation:
   ```bash
   node scripts/test-puppeteer.js
   ```

5. Restart the application:
   ```bash
   pm2 restart intelliresume
   ```

## Troubleshooting

If you encounter issues with Puppeteer after installation:

1. Check Puppeteer logs:
   ```bash
   pm2 logs intelliresume
   ```

2. Verify Chrome installation:
   ```bash
   node -e "console.log(require('puppeteer').executablePath())"
   ```

3. If you see sandbox-related errors, make sure you're using the `--no-sandbox` flag in the browser launch options (already included in the code).

4. For memory issues, consider adding swap space to your VPS if it has limited RAM.

## Testing PDF Generation

After setup, test the PDF generation by:

1. Logging into the application
2. Creating or editing a resume
3. Clicking the download button to generate a PDF 