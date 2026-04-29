#!/usr/bin/env node

/**
 * Automated Font Size Standardization Script
 * Replaces arbitrary font sizes with Tailwind standard scale
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
 * Map arbitrary font sizes to Tailwind standard scale
 */
const fontSizeMap = {
    'text-[8px]': 'text-[8px]', // Keep if very small (rare)
    'text-[9px]': 'text-xs',    // 12px
    'text-[10px]': 'text-xs',   // 12px
    'text-[11px]': 'text-xs',   // 12px
    'text-[12px]': 'text-xs',   // 12px (standard xs)
    'text-[13px]': 'text-sm',   // 14px
    'text-[14px]': 'text-sm',   // 14px (standard sm)
    'text-[15px]': 'text-base', // 16px
    'text-[16px]': 'text-base', // 16px (standard base)
    'text-[17px]': 'text-base', // 16px
    'text-[18px]': 'text-lg',   // 18px (standard lg)
    'text-[19px]': 'text-lg',   // 18px
    'text-[20px]': 'text-xl',   // 20px (standard xl)
    'text-[21px]': 'text-xl',   // 20px
    'text-[22px]': 'text-2xl',  // 24px
    'text-[24px]': 'text-2xl',  // 24px (standard 2xl)
    'text-[28px]': 'text-3xl',  // 30px
    'text-[30px]': 'text-3xl',  // 30px (standard 3xl)
    'text-[32px]': 'text-4xl',  // 36px
    'text-[36px]': 'text-4xl',  // 36px (standard 4xl)
    'text-[40px]': 'text-5xl',  // 48px
    'text-[48px]': 'text-5xl',  // 48px (standard 5xl)
};

/**
 * Process a single file
 */
function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    let fileReplacements = 0;

    // Replace arbitrary font sizes
    for (const [arbitrary, standard] of Object.entries(fontSizeMap)) {
        const regex = new RegExp(arbitrary.replace('[', '\\[').replace(']', '\\]'), 'g');
        const matches = content.match(regex);

        if (matches) {
            content = content.replace(regex, standard);
            fileReplacements += matches.length;
        }
    }

    if (fileReplacements > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalReplacements += fileReplacements;
        filesModified++;
        console.log(`✓ ${filePath.replace(PAGES_DIR + '/', '')}: ${fileReplacements} replacements`);
    }
}

/**
 * Recursively process all TSX files
 */
function processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

// Main execution
console.log('🔧 Starting Font Size Standardization...\n');
console.log(`Processing directory: ${PAGES_DIR}\n`);

processDirectory(PAGES_DIR);

console.log('\n✅ Standardization complete!\n');
console.log(`Files modified: ${filesModified}`);
console.log(`Total replacements: ${totalReplacements}`);
