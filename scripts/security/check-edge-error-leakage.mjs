import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const functionsRoot = path.join(repoRoot, 'supabase', 'functions');

const FORBIDDEN_PATTERNS = [
  /JSON\.stringify\(\{\s*error:\s*err\.message\s*\}\)/i,
  /JSON\.stringify\(\{\s*error:\s*e\.message\s*\}\)/i,
  /JSON\.stringify\(\{\s*error:\s*msg\s*\}\)/i,
  /JSON\.stringify\(\{\s*error:\s*error\.message\s*\}\)/i,
];

async function listFunctionIndexFiles() {
  const dirs = await readdir(functionsRoot, { withFileTypes: true });
  return dirs
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => path.join(functionsRoot, d.name, 'index.ts'));
}

async function main() {
  const files = await listFunctionIndexFiles();
  const failures = [];

  for (const file of files) {
    let source = '';
    try {
      source = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.test(source)) {
        failures.push(`${path.relative(repoRoot, file)}: potential raw error leakage in response payload`);
        break;
      }
    }
  }

  if (failures.length > 0) {
    console.error('Edge error leakage gate FAILED:\n' + failures.map((f) => `- ${f}`).join('\n'));
    process.exit(1);
  }

  console.log(`Edge error leakage gate PASSED across ${files.length} edge function(s).`);
}

main().catch((err) => {
  console.error('Edge error leakage gate crashed:', err?.message ?? err);
  process.exit(1);
});
