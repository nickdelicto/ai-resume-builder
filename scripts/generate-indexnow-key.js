#!/usr/bin/env node

/**
 * Generate IndexNow Key and Key File
 * 
 * This script generates a random IndexNow key and creates the verification file
 * that needs to be placed in the public/ directory.
 * 
 * Usage: node scripts/generate-indexnow-key.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a random 32-character hex key
const key = crypto.randomBytes(16).toString('hex');

console.log('\n🔑 IndexNow Key Generated!\n');
console.log('Key:', key);
console.log('\n📝 Next Steps:\n');
console.log('1. Create file: public/' + key + '.txt');
console.log('2. Add this content to the file:');
console.log('   ' + key);
console.log('\n3. Add to your .env file:');
console.log('   INDEXNOW_KEY=' + key);
console.log('\n4. After deploying, verify the key file is accessible at:');
console.log('   https://intelliresume.net/' + key + '.txt');
console.log('\n✅ Done! IndexNow will automatically notify Bing when jobs are added/updated.\n');

// Optionally create the file automatically
const publicDir = path.join(__dirname, '..', 'public');
const keyFilePath = path.join(publicDir, `${key}.txt`);

if (fs.existsSync(publicDir)) {
  try {
    fs.writeFileSync(keyFilePath, key, 'utf8');
    console.log('✨ Key file automatically created at: public/' + key + '.txt\n');
  } catch (error) {
    console.error('⚠️  Could not auto-create key file:', error.message);
    console.log('   Please create it manually following the steps above.\n');
  }
} else {
  console.log('⚠️  public/ directory not found. Please create the key file manually.\n');
}

