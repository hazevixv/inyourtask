#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const disableConsolePath = path.join(__dirname, '../lib/disable-console.ts');

function toggleConsole(enable = false) {
  const content = fs.readFileSync(disableConsolePath, 'utf8');
  
  if (enable) {
    // Enable console by commenting out the overrides
    const enabledContent = content
      .replace(/console\.log = noop;/g, '// console.log = noop;')
      .replace(/console\.info = noop;/g, '// console.info = noop;')
      .replace(/console\.warn = noop;/g, '// console.warn = noop;')
      .replace(/console\.error = noop;/g, '// console.error = noop;')
      .replace(/console\.debug = noop;/g, '// console.debug = noop;');
    
    fs.writeFileSync(disableConsolePath, enabledContent);
    console.log('✅ Console logging ENABLED for debugging');
  } else {
    // Disable console by uncommenting the overrides
    const disabledContent = content
      .replace(/\/\/ console\.log = noop;/g, 'console.log = noop;')
      .replace(/\/\/ console\.info = noop;/g, 'console.info = noop;')
      .replace(/\/\/ console\.warn = noop;/g, 'console.warn = noop;')
      .replace(/\/\/ console\.error = noop;/g, 'console.error = noop;')
      .replace(/\/\/ console\.debug = noop;/g, 'console.debug = noop;');
    
    fs.writeFileSync(disableConsolePath, disabledContent);
    console.log('✅ Console logging DISABLED for clean console');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'enable' || command === 'on') {
  toggleConsole(true);
} else if (command === 'disable' || command === 'off') {
  toggleConsole(false);
} else {
  console.log('Usage:');
  console.log('  node scripts/toggle-console.js enable   # Enable console logs');
  console.log('  node scripts/toggle-console.js disable  # Disable console logs');
  console.log('  node scripts/toggle-console.js on       # Enable console logs');
  console.log('  node scripts/toggle-console.js off      # Disable console logs');
}