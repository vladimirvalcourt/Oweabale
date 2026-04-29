#!/usr/bin/env node

/**
 * Automated Border Radius Standardization Script
 * Fixes rounded-lg → rounded-md/xl based on component context
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, '../src/pages');
let filesModified = 0;
let totalReplacements = 0;

/**
 * Determine correct radius based on context
 */
function getCorrectRadius(line, fullContext) {
  const lowerLine = line.toLowerCase();
  const lowerContext = fullContext.toLowerCase();
  
  // Badge/pill indicators - use rounded-full
  if (
    /badge|pill|tag|status|text-\[.*?px\].*?px-|font-mono.*?px-/.test(lowerLine) ||
    /(bg|text|border)-(rose|amber|emerald|indigo)-/.test(lowerLine) && /px-[12]/.test(lowerLine)
  ) {
    return 'rounded-full';
  }
  
  // Buttons and interactive controls - use rounded-md
  if (
    /button|btn|onClick|type=["']button["']|hover:bg-|active:/.test(lowerLine) ||
    /min-h-\[.*?\]|py-2\.?5?|px-[345]/.test(lowerLine)
  ) {
    return 'rounded-md';
  }
  
  // Form inputs - use rounded-md (handled by radius-input class usually)
  if (/input|select|textarea|form/.test(lowerLine)) {
    return 'rounded-md';
  }
  
  // Cards, panels, containers - use rounded-xl
  if (
    /card|panel|container|bg-surface|app-panel|border.*p-\d+/.test(lowerLine) ||
    /grid.*gap|space-y|flex.*gap/.test(lowerContext)
  ) {
    return 'rounded-xl';
  }
  
  // Default for ambiguous cases - use rounded-md (safer choice)
  return 'rounded-md';
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Split into lines for context-aware processing
    const lines = content.split('\n');
    let fileReplacements = 0;
    
    // Process each line
    const processedLines = lines.map((line, index) => {
      // Skip comments and imports
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('import')) {
        return line;
      }
      
      // Check if line contains rounded-lg
      if (!line.includes('rounded-lg')) {
        return line;
      }
      
      // Get surrounding context (previous 2 lines + next 2 lines)
      const contextStart = Math.max(0, index - 2);
      const contextEnd = Math.min(lines.length, index + 3);
      const context = lines.slice(contextStart, contextEnd).join(' ');
      
      // Determine correct radius
      const correctRadius = getCorrectRadius(line, context);
      
      // Replace rounded-lg with correct radius
      const newLine = line.replace(/rounded-lg/g, correctRadius);
      
      if (newLine !== line) {
        fileReplacements++;
      }
      
      return newLine;
    });
    
    content = processedLines.join('\n');
    
    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      filesModified++;
      totalReplacements += fileReplacements;
      console.log(`✓ ${filePath.replace(PAGES_DIR, 'src/pages')}: ${fileReplacements} replacements`);
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        processDirectory(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      // Skip test files and type definitions
      if (!entry.name.includes('.test.') && !entry.name.includes('.spec.') && 
          entry.name !== 'types.ts' && entry.name !== 'constants.ts') {
        processFile(fullPath);
      }
    }
  });
}

// Main execution
console.log('🔧 Starting Border Radius Standardization...\n');
console.log(`Processing directory: ${PAGES_DIR}\n`);

processDirectory(PAGES_DIR);

console.log(`\n✅ Standardization complete!\n`);
console.log(`Files modified: ${filesModified}`);
console.log(`Total replacements: ${totalReplacements}\n`);
