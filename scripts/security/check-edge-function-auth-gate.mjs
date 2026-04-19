import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, 'supabase', 'config.toml');

function parseJwtDisabledFunctions(configText) {
  const lines = configText.split('\n');
  const disabled = [];
  let currentFn = null;

  for (const line of lines) {
    const section = line.match(/^\[functions\.([a-z0-9-]+)\]$/i);
    if (section) {
      currentFn = section[1];
      continue;
    }
    if (currentFn && /^\s*verify_jwt\s*=\s*false\s*$/i.test(line)) {
      disabled.push(currentFn);
      currentFn = null;
    }
  }
  return disabled;
}

function hasAuthGuard(source) {
  const patterns = [
    /auth\.getUser\(/,
    /Authorization/i,
    /cronSecret/i,
    /x-[a-z0-9-]*secret/i,
    /plaid-verification/i,
    /verifyPlaidWebhook/i,
    /stripe-signature/i,
    /verify.*risc/i,
    /Unauthorized/i,
  ];
  return patterns.some((pattern) => pattern.test(source));
}

async function main() {
  const configText = await readFile(configPath, 'utf8');
  const targets = parseJwtDisabledFunctions(configText);
  const failures = [];

  for (const fnName of targets) {
    const fnPath = path.join(repoRoot, 'supabase', 'functions', fnName, 'index.ts');
    let source = '';
    try {
      source = await readFile(fnPath, 'utf8');
    } catch {
      failures.push(`${fnName}: missing file ${path.relative(repoRoot, fnPath)}`);
      continue;
    }
    if (!hasAuthGuard(source)) {
      failures.push(`${fnName}: verify_jwt=false but no obvious in-code auth/secret guard found`);
    }
  }

  if (failures.length > 0) {
    console.error('Edge auth gate FAILED:\n' + failures.map((f) => `- ${f}`).join('\n'));
    process.exit(1);
  }

  console.log(`Edge auth gate PASSED for ${targets.length} function(s) with verify_jwt=false.`);
}

main().catch((err) => {
  console.error('Edge auth gate crashed:', err?.message ?? err);
  process.exit(1);
});
