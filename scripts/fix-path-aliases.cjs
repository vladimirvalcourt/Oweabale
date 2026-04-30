#!/usr/bin/env node

/**
 * Fix Path Aliases
 * 
 * Corrects improperly converted path aliases from the codemod.
 * The issue: ../common/X became @/common/X instead of @/components/common/X
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Mapping of incorrect paths to correct paths
const FIXES = [
  { from: "@/common'", to: "@/components/common'" },
  { from: "@/common/", to: "@/components/common/" },
  { from: "@/ui/", to: "@/components/ui/" },
  { from: "@/layout/", to: "@/components/layout/" },
  { from: "@/forms/", to: "@/components/forms/" },
  { from: "@/guards/", to: "@/components/guards/" },
  { from: "@/charts/", to: "@/components/charts/" },
  { from: "@/landing/", to: "@/components/landing/" },
  { from: "@/dashboard/", to: "@/components/dashboard/" },
  { from: "@/shared'", to: "@/features/admin/shared'" },
  { from: "@/shared/", to: "@/features/admin/shared/" },
  { from: "@/citation'", to: "@/lib/api/citation'" },
  { from: "@/plaid/", to: "@/lib/api/plaid/" },
  { from: "@/initialState'", to: "@/store/initialState'" },
  { from: "@/supabase/", to: "@/lib/api/supabase/" },
  { from: "@/utils/", to: "@/lib/utils/" },
];

let filesFixed = 0;
let replacementsMade = 0;

function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let modified = false;
    
    FIXES.forEach(({ from, to }) => {
      const regex = new RegExp(`from\\s+['"]${from.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}([^'"]+)['"]`, 'g');
      const matches = newContent.match(regex);
      if (matches) {
        newContent = newContent.replace(regex, `from '${to}$1'`);
        modified = true;
        replacementsMade += matches.length;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesFixed++;
      console.log(`✓ Fixed: ${path.relative(SRC_DIR, filePath)}`);
    }
  } catch (error) {
    console.error(`✗ Error: ${filePath}:`, error.message);
  }
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') return;
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      fixFile(fullPath);
    }
  });
}

console.log('🔧 Fixing path aliases...\n');
scanDirectory(SRC_DIR);

console.log(`\n✅ Fixed ${replacementsMade} imports in ${filesFixed} files\n`);
