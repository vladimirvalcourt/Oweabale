#!/usr/bin/env node

/**
 * Path Alias Codemod
 * 
 * Converts relative imports to @/ path aliases throughout the codebase.
 * 
 * Examples:
 * - '../../store' → '@/store'
 * - '../components/ui/Button' → '@/components/ui/Button'
 * - './utils' → './utils' (unchanged - same directory)
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Patterns to match relative imports
const RELATIVE_IMPORT_PATTERNS = [
  /from\s+['"](\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/[^'"]+)['"]/g,  // ../../../../../
  /from\s+['"](\.\.\/\.\.\/\.\.\/\.\.\/[^'"]+)['"]/g,          // ../../../../
  /from\s+['"](\.\.\/\.\.\/\.\.\/[^'"]+)['"]/g,                // ../../../
  /from\s+['"](\.\.\/\.\.\/[^'"]+)['"]/g,                      // ../../
  /from\s+['"](\.\.\/[^'"]+)['"]/g,                            // ../
];

// Track changes for reporting
const stats = {
  filesScanned: 0,
  filesModified: 0,
  importsConverted: 0,
  errors: []
};

/**
 * Convert relative import to @/ alias
 */
function convertImport(match, importPath) {
  // Don't convert if it's already using @/
  if (importPath.startsWith('@/')) {
    return match;
  }
  
  // Don't convert same-directory imports (./something)
  if (importPath.startsWith('./')) {
    return match;
  }
  
  // Convert ../ patterns to @/
  const converted = importPath.replace(/^(\.\.\/)+/, '@/');
  stats.importsConverted++;
  
  console.log(`  Converting: ${importPath} → ${converted}`);
  return match.replace(importPath, converted);
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    // Apply each pattern
    RELATIVE_IMPORT_PATTERNS.forEach(pattern => {
      const result = newContent.replace(pattern, convertImport);
      if (result !== newContent) {
        modified = true;
        newContent = result;
      }
    });
    
    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      stats.filesModified++;
      console.log(`✓ Modified: ${path.relative(SRC_DIR, filePath)}`);
    }
    
    stats.filesScanned++;
  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message
    });
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively scan directory for TypeScript files
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and dist directories
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        return;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      processFile(fullPath);
    }
  });
}

// Main execution
console.log('🔄 Starting path alias codemod...\n');
console.log(`Scanning directory: ${SRC_DIR}\n`);

scanDirectory(SRC_DIR);

// Print summary
console.log('\n📊 Codemod Summary:');
console.log(`  Files scanned: ${stats.filesScanned}`);
console.log(`  Files modified: ${stats.filesModified}`);
console.log(`  Imports converted: ${stats.importsConverted}`);
console.log(`  Errors: ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\n❌ Errors encountered:');
  stats.errors.forEach(({ file, error }) => {
    console.log(`  - ${path.relative(SRC_DIR, file)}: ${error}`);
  });
}

console.log('\n✅ Codemod complete!\n');
