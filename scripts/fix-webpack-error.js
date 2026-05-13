#!/usr/bin/env node

/**
 * Fix Webpack Module Resolution Errors
 * 
 * This script fixes the "Cannot find module './XXX.js'" error
 * by cleaning the Next.js build cache and rebuilding.
 * 
 * Common causes:
 * - Corrupted .next cache
 * - Incomplete build
 * - Module resolution conflicts
 * - Fast refresh issues
 * 
 * Usage:
 *   node scripts/fix-webpack-error.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing Webpack Module Resolution Error...\n');

const steps = [
  {
    name: 'Stop dev server',
    action: () => {
      console.log('⏹️  Please stop the dev server (Ctrl+C) if running...');
      console.log('   Waiting 3 seconds...');
      execSync('timeout /t 3 /nobreak', { stdio: 'ignore' });
    }
  },
  {
    name: 'Remove .next cache',
    action: () => {
      const nextDir = path.join(process.cwd(), '.next');
      if (fs.existsSync(nextDir)) {
        console.log('🗑️  Removing .next directory...');
        fs.rmSync(nextDir, { recursive: true, force: true });
        console.log('✅ .next directory removed');
      } else {
        console.log('ℹ️  .next directory does not exist');
      }
    }
  },
  {
    name: 'Remove node_modules/.cache',
    action: () => {
      const cacheDir = path.join(process.cwd(), 'node_modules', '.cache');
      if (fs.existsSync(cacheDir)) {
        console.log('🗑️  Removing node_modules/.cache...');
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log('✅ Cache directory removed');
      } else {
        console.log('ℹ️  Cache directory does not exist');
      }
    }
  },
  {
    name: 'Clear npm cache (optional)',
    action: () => {
      try {
        console.log('🧹 Clearing npm cache...');
        execSync('npm cache clean --force', { stdio: 'inherit' });
        console.log('✅ npm cache cleared');
      } catch (error) {
        console.log('⚠️  Failed to clear npm cache (non-critical)');
      }
    }
  }
];

// Execute all steps
for (const step of steps) {
  console.log(`\n📋 ${step.name}`);
  try {
    step.action();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

console.log('\n' + '='.repeat(50));
console.log('✅ Cleanup complete!');
console.log('='.repeat(50));

console.log('\n📝 Next steps:');
console.log('1. Run: npm run dev');
console.log('2. Wait for compilation to complete');
console.log('3. Refresh your browser');
console.log('4. If error persists, try: npm install');

console.log('\n💡 Tips to prevent this error:');
console.log('- Always stop dev server before git operations');
console.log('- Clear cache after major dependency updates');
console.log('- Use "npm run dev" instead of "next dev" directly');
console.log('- Avoid editing files in .next directory');

console.log('\n🎉 Done!\n');
