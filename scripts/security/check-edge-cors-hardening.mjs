import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const functionsRoot = path.join(repoRoot, 'supabase', 'functions');

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
    if (/access-control-allow-origin['"]?\s*:\s*['"]\*/i.test(source)) {
      failures.push(`${path.relative(repoRoot, file)}: wildcard CORS origin is forbidden`);
    }
    if (/new Response\([^)]*headers:\s*\{[^}]*'Access-Control-Allow-Origin':\s*origin/i.test(source)) {
      failures.push(`${path.relative(repoRoot, file)}: reflected origin without explicit allowlist`);
    }
  }

  if (failures.length > 0) {
    console.error('Edge CORS hardening FAILED:\n' + failures.map((f) => `- ${f}`).join('\n'));
    process.exit(1);
  }

  console.log(`Edge CORS hardening PASSED across ${files.length} edge function(s).`);
}

main().catch((err) => {
  console.error('Edge CORS hardening crashed:', err?.message ?? err);
  process.exit(1);
});
