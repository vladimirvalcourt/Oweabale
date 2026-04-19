import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const functionsRoot = path.join(repoRoot, 'supabase', 'functions');
const configPath = path.join(repoRoot, 'supabase', 'config.toml');

const METHOD_GUARD_RE = /\breq\.method\s*!==\s*['"](?:POST|GET|PUT|PATCH|DELETE)['"]/;
const OPTIONS_RE = /\breq\.method\s*===\s*['"]OPTIONS['"]/;

const AUTH_SIGNAL_RE_LIST = [
  /auth\.getUser\(/i,
  /authorization/i,
  /cronSecret/i,
  /x-[a-z0-9-]*secret/i,
  /stripe-signature/i,
  /plaid-verification/i,
  /verifyPlaidWebhook/i,
  /verify.*risc/i,
  /Unauthorized/i,
];

function parseJwtDisabledFunctions(configText) {
  const lines = configText.split('\n');
  const disabled = new Set();
  let currentFn = null;

  for (const line of lines) {
    const section = line.match(/^\[functions\.([a-z0-9-]+)\]$/i);
    if (section) {
      currentFn = section[1];
      continue;
    }
    if (currentFn && /^\s*verify_jwt\s*=\s*false\s*$/i.test(line)) {
      disabled.add(currentFn);
      currentFn = null;
    }
  }
  return disabled;
}

function hasAuthSignals(source) {
  return AUTH_SIGNAL_RE_LIST.some((re) => re.test(source));
}

async function listFunctionIndexFiles() {
  const dirs = await readdir(functionsRoot, { withFileTypes: true });
  return dirs
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => ({
      name: d.name,
      indexPath: path.join(functionsRoot, d.name, 'index.ts'),
    }));
}

async function main() {
  const config = await readFile(configPath, 'utf8');
  const jwtDisabled = parseJwtDisabledFunctions(config);
  const targets = await listFunctionIndexFiles();
  const failures = [];

  for (const target of targets) {
    let source = '';
    try {
      source = await readFile(target.indexPath, 'utf8');
    } catch {
      failures.push(`${target.name}: missing ${path.relative(repoRoot, target.indexPath)}`);
      continue;
    }

    if (!METHOD_GUARD_RE.test(source)) {
      failures.push(`${target.name}: missing explicit HTTP method guard (req.method !== ...)`);
    }

    // Browser-facing handlers should include OPTIONS handling when using CORS helper.
    if (source.includes('corsHeaders(') && !OPTIONS_RE.test(source)) {
      failures.push(`${target.name}: uses corsHeaders() but missing OPTIONS preflight branch`);
    }

    // For verify_jwt=false functions, in-code auth/signature/secret checks are mandatory.
    if (jwtDisabled.has(target.name) && !hasAuthSignals(source)) {
      failures.push(`${target.name}: verify_jwt=false without detectable auth/signature/secret checks`);
    }
  }

  if (failures.length) {
    console.error(
      'Edge baseline check FAILED:\n' + failures.map((f) => `- ${f}`).join('\n'),
    );
    process.exit(1);
  }

  console.log(`Edge baseline check PASSED for ${targets.length} edge function(s).`);
}

main().catch((err) => {
  console.error('Edge baseline check crashed:', err?.message ?? err);
  process.exit(1);
});
