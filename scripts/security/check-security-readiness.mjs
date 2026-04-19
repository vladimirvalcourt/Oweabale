#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  '.github/dependabot.yml',
  'docs/SECURITY_BASELINE.md',
  'docs/INCIDENT_RESPONSE_RUNBOOK.md',
  'docs/BACKUP_AND_RECOVERY.md',
  'docs/SECURITY_OPERATIONS_SLA.md',
  'docs/SECRET_ROTATION_RUNBOOK.md',
  'docs/PROD_SECURITY_READINESS.md',
];

async function exists(rel) {
  try {
    await access(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const missing = [];
  for (const file of requiredFiles) {
    if (!(await exists(file))) missing.push(file);
  }

  let packageJson = {};
  try {
    packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  } catch {
    missing.push('package.json (readable)');
  }

  const scripts = packageJson.scripts ?? {};
  const requiredScripts = [
    'security:edge-auth-gate',
    'security:edge-log-hygiene',
    'security:edge-error-leakage',
    'security:edge-baseline',
    'security:edge-cors',
    'security:migrations-rls',
  ];
  for (const s of requiredScripts) {
    if (!scripts[s]) missing.push(`package.json script: ${s}`);
  }

  if (missing.length) {
    console.error('Security readiness FAILED. Missing:\n' + missing.map((m) => `- ${m}`).join('\n'));
    process.exit(1);
  }

  console.log('Security readiness PASSED (repo-enforceable controls present).');
  console.log('External-only controls (plan/infra/org): branch protection plan limits, secret rotation execution, backup drill execution.');
}

main().catch((err) => {
  console.error('Security readiness check crashed:', err?.message ?? err);
  process.exit(1);
});
