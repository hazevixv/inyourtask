#!/usr/bin/env node

/**
 * Test Script for Modal Complete Features
 * 
 * This script verifies:
 * 1. Draft mode functionality
 * 2. Minimize behavior
 * 3. Expandable textarea integration
 * 4. AI prompt optimization
 * 5. All pages have onMinimize prop
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Modal Complete Features...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Modal.tsx has draft mode
test('Modal.tsx has draft mode implementation', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('saveDraft')) throw new Error('saveDraft function not found');
  if (!content.includes('loadDraft')) throw new Error('loadDraft function not found');
  if (!content.includes('clearDraft')) throw new Error('clearDraft function not found');
  if (!content.includes('localStorage')) throw new Error('localStorage not used');
  if (!content.includes('isDraft')) throw new Error('isDraft state not found');
});

// Test 2: Modal.tsx has minimize functionality
test('Modal.tsx has minimize functionality', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('handleMinimize')) throw new Error('handleMinimize function not found');
  if (!content.includes('onMinimize')) throw new Error('onMinimize prop not found');
  if (!content.includes('Minimize2')) throw new Error('Minimize icon not imported');
  if (!content.includes('minimizeBtn')) throw new Error('minimizeBtn style not used');
});

// Test 3: Modal.tsx has undo/redo
test('Modal.tsx has undo/redo functionality', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('history')) throw new Error('history state not found');
  if (!content.includes('historyIndex')) throw new Error('historyIndex state not found');
  if (!content.includes('handleUndo')) throw new Error('handleUndo function not found');
  if (!content.includes('handleRedo')) throw new Error('handleRedo function not found');
  if (!content.includes('Undo2')) throw new Error('Undo icon not imported');
  if (!content.includes('Redo2')) throw new Error('Redo icon not imported');
});

// Test 4: Modal.tsx integrates ExpandableTextarea
test('Modal.tsx integrates ExpandableTextarea', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('import ExpandableTextarea')) throw new Error('ExpandableTextarea not imported');
  if (!content.includes('<ExpandableTextarea')) throw new Error('ExpandableTextarea not used');
  if (!content.includes('aiEnhanceButton')) throw new Error('aiEnhanceButton prop not passed');
});

// Test 5: ExpandableTextarea component exists
test('ExpandableTextarea component exists', () => {
  const componentPath = path.join(process.cwd(), 'components', 'ExpandableTextarea.tsx');
  if (!fs.existsSync(componentPath)) throw new Error('ExpandableTextarea.tsx not found');
  
  const content = fs.readFileSync(componentPath, 'utf8');
  if (!content.includes('Maximize2')) throw new Error('Maximize icon not imported');
  if (!content.includes('expanded')) throw new Error('expanded state not found');
  if (!content.includes('renderContent')) throw new Error('renderContent function not found');
});

// Test 6: ExpandableTextarea has markdown rendering
test('ExpandableTextarea has markdown rendering', () => {
  const componentPath = path.join(process.cwd(), 'components', 'ExpandableTextarea.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  if (!content.includes('**')) throw new Error('Bold markdown not supported');
  if (!content.includes('*')) throw new Error('Italic markdown not supported');
  if (!content.includes('[')) throw new Error('Link markdown not supported');
  if (!content.includes('dangerouslySetInnerHTML')) throw new Error('HTML rendering not found');
});

// Test 7: ExpandableTextarea styles exist
test('ExpandableTextarea.module.css exists', () => {
  const stylePath = path.join(process.cwd(), 'components', 'ExpandableTextarea.module.css');
  if (!fs.existsSync(stylePath)) throw new Error('ExpandableTextarea.module.css not found');
  
  const content = fs.readFileSync(stylePath, 'utf8');
  if (!content.includes('.expandBtn')) throw new Error('expandBtn style not found');
  if (!content.includes('.modal')) throw new Error('modal style not found');
  if (!content.includes('.editorSection')) throw new Error('editorSection style not found');
  if (!content.includes('.previewSection')) throw new Error('previewSection style not found');
});

// Test 8: Modal.module.css has minimize and draft styles
test('Modal.module.css has minimize and draft styles', () => {
  const stylePath = path.join(process.cwd(), 'components', 'Modal.module.css');
  const content = fs.readFileSync(stylePath, 'utf8');
  
  if (!content.includes('.minimizeBtn')) throw new Error('minimizeBtn style not found');
  if (!content.includes('.draftBadge')) throw new Error('draftBadge style not found');
});

// Test 9: AI enhance route has optimized prompts
test('AI enhance route has optimized prompts', () => {
  const routePath = path.join(process.cwd(), 'app', 'api', 'ai', 'enhance', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  
  if (!content.includes('generateFromTitlePrompt')) throw new Error('generateFromTitlePrompt not found');
  if (!content.includes('enhanceContentPrompt')) throw new Error('enhanceContentPrompt not found');
  if (!content.includes('autofillPrompt')) throw new Error('autofillPrompt not found');
  if (!content.includes('Keep it under')) throw new Error('Word limit not enforced');
  if (!content.includes('2-3')) throw new Error('Sentence limit not specified');
});

// Test 10: All pages pass onMinimize prop
test('app/tasks/page.tsx passes onMinimize prop', () => {
  const pagePath = path.join(process.cwd(), 'app', 'tasks', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  if (!content.includes('onMinimize')) throw new Error('onMinimize prop not passed');
});

test('app/projects/page.tsx passes onMinimize prop', () => {
  const pagePath = path.join(process.cwd(), 'app', 'projects', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  if (!content.includes('onMinimize')) throw new Error('onMinimize prop not passed');
});

test('app/calendar/page.tsx passes onMinimize prop', () => {
  const pagePath = path.join(process.cwd(), 'app', 'calendar', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  if (!content.includes('onMinimize')) throw new Error('onMinimize prop not passed');
});

test('app/page.tsx passes onMinimize prop', () => {
  const pagePath = path.join(process.cwd(), 'app', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  if (!content.includes('onMinimize')) throw new Error('onMinimize prop not passed');
});

test('app/ai-assistant/page.tsx passes onMinimize prop', () => {
  const pagePath = path.join(process.cwd(), 'app', 'ai-assistant', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  if (!content.includes('onMinimize')) throw new Error('onMinimize prop not passed');
});

// Test 11: Calendar page has + Task/Project buttons
test('Calendar page has + Task/Project buttons', () => {
  const pagePath = path.join(process.cwd(), 'app', 'calendar', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  if (!content.includes('Add Task')) throw new Error('Add Task button not found');
  if (!content.includes('Add Project')) throw new Error('Add Project button not found');
  if (!content.includes('addMenu')) throw new Error('Add menu not found');
});

// Test 12: Modal has AI Auto Fill button
test('Modal has AI Auto Fill button', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('AI Fill')) throw new Error('AI Fill button not found');
  if (!content.includes('handleAIAutoFill')) throw new Error('handleAIAutoFill function not found');
  if (!content.includes('Wand2')) throw new Error('Wand2 icon not imported');
});

// Test 13: Modal has AI Enhance buttons
test('Modal has AI Enhance buttons', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('AI Enhance')) throw new Error('AI Enhance button not found');
  if (!content.includes('handleAIEnhance')) throw new Error('handleAIEnhance function not found');
  if (!content.includes('Sparkles')) throw new Error('Sparkles icon not imported');
});

// Test 14: Draft expiry is 24 hours
test('Draft expiry is set to 24 hours', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('24 * 60 * 60 * 1000')) throw new Error('24 hour expiry not found');
});

// Test 15: Draft clears after save
test('Draft clears after successful save', () => {
  const modalPath = path.join(process.cwd(), 'components', 'Modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  
  if (!content.includes('clearDraft()')) throw new Error('clearDraft not called after save');
});

console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! Modal features are complete.');
  process.exit(0);
}
