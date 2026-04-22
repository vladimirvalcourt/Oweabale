#!/usr/bin/env node
/**
 * Code Hygiene Scanner
 * 
 * Scans a file for code quality issues using:
 * 1. Project's ESLint configuration (TypeScript/JavaScript rules)
 * 2. Custom React pattern detection (useEffect, inline objects, missing keys)
 * 
 * Usage: node scripts/hygiene-scan.mjs <path/to/file.ts>
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ── React Pattern Detection (Regex-based) ─────────────────────────
function runReactAnalysis(code) {
  const issues = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // useEffect with no dependency array
    if (/useEffect\s*\(\s*\(\)\s*=>/.test(line)) {
      const nextLines = lines.slice(index, Math.min(index + 5, lines.length)).join('\n');
      if (!nextLines.match(/\),\s*\[/)) {
        issues.push({
          type: 'smell',
          rule: 'useeffect-no-deps',
          line: lineNum,
          message: `useEffect has no dependency array — runs on every render.`,
        });
      }
    }
    
    // Inline object/array in JSX props (basic detection)
    if (/=\s*\{\s*[\[{]/.test(line) && /\s+(\w+)=/.test(line)) {
      issues.push({
        type: 'performance',
        rule: 'inline-object-prop',
        line: lineNum,
        message: `Inline object/array in JSX prop may cause unnecessary re-renders. Consider useMemo or extracting outside component.`,
      });
    }
    
    // .map() without key prop (basic detection)
    if (/\.map\s*\(/.test(line) && /<\w+/.test(line) && !line.includes('key=')) {
      const context = lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 5)).join('\n');
      if (!context.includes('key=')) {
        issues.push({
          type: 'error',
          rule: 'missing-key-prop',
          line: lineNum,
          message: `.map() returns JSX but no "key" prop found. React needs unique keys for list items.`,
        });
      }
    }
  });
  
  return issues;
}

// ── Main ──────────────────────────────────────────────────────────
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/hygiene-scan.mjs <path/to/file.ts>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

try {
  // Read file content
  const code = fs.readFileSync(filePath, 'utf8');
  
  // Run ESLint on the file
  const result = execSync(`npx eslint --format json "${filePath}"`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  const results = JSON.parse(result);
  const eslintMessages = results[0]?.messages || [];
  
  // Run React pattern detection
  const reactIssues = runReactAnalysis(code);
  
  // Combine and sort all issues
  const allIssues = [
    ...eslintMessages.map(m => ({
      type: m.severity === 2 ? 'error' : 'warning',
      rule: m.ruleId || 'eslint',
      line: m.line,
      message: m.message,
    })),
    ...reactIssues,
  ].sort((a, b) => a.line - b.line);

  const summary = {
    file: path.relative(process.cwd(), filePath),
    totalIssues: allIssues.length,
    errors: allIssues.filter(i => i.type === 'error').length,
    warnings: allIssues.filter(i => i.type === 'warning' || i.type === 'smell' || i.type === 'performance').length,
    issues: allIssues,
  };

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  // ESLint exits with non-zero if there are errors
  if (error.stdout) {
    try {
      // Read code for React analysis
      const code = fs.readFileSync(filePath, 'utf8');
      
      const results = JSON.parse(error.stdout.toString());
      const eslintMessages = results[0]?.messages || [];
      
      // Run React pattern detection
      const reactIssues = runReactAnalysis(code);
      
      const allIssues = [
        ...eslintMessages.map(m => ({
          type: m.severity === 2 ? 'error' : 'warning',
          rule: m.ruleId || 'eslint',
          line: m.line,
          message: m.message,
        })),
        ...reactIssues,
      ].sort((a, b) => a.line - b.line);

      const summary = {
        file: path.relative(process.cwd(), filePath),
        totalIssues: allIssues.length,
        errors: allIssues.filter(i => i.type === 'error').length,
        warnings: allIssues.filter(i => i.type === 'warning' || i.type === 'smell' || i.type === 'performance').length,
        issues: allIssues,
      };

      console.log(JSON.stringify(summary, null, 2));
    } catch (parseError) {
      console.error('Failed to parse ESLint output');
      console.error(error.stderr?.toString() || error.message);
      process.exit(1);
    }
  } else {
    console.error('ESLint execution failed');
    console.error(error.stderr?.toString() || error.message);
    process.exit(1);
  }
}
