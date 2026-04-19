import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
const POLICY_OPTIONAL_TABLES = new Set([
  'audit_log',
  'app_config',
  'beta_allowlist',
  'risc_google_events',
]);

function parseCreatedPublicTables(sql) {
  const matches = sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-zA-Z0-9_]+)/gi);
  return [...new Set(Array.from(matches, (m) => m[1]))];
}

function hasRlsEnable(sql, table) {
  const re = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  return re.test(sql);
}

function hasPolicy(sql, table) {
  const re = new RegExp(`create\\s+policy[\\s\\S]*?on\\s+public\\.${table}\\b`, 'i');
  return re.test(sql);
}

async function main() {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const allSql = (await Promise.all(files.map((f) => readFile(path.join(migrationsDir, f), 'utf8'))))
    .join('\n')
    .toLowerCase();

  const failures = [];

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = (await readFile(fullPath, 'utf8')).toLowerCase();
    const createdTables = parseCreatedPublicTables(sql);

    for (const table of createdTables) {
      if (!hasRlsEnable(allSql, table)) {
        failures.push(`${file}: public.${table} created without ENABLE ROW LEVEL SECURITY`);
      }
      if (!POLICY_OPTIONAL_TABLES.has(table) && !hasPolicy(allSql, table)) {
        failures.push(`${file}: public.${table} created without CREATE POLICY`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('Supabase migration RLS gate FAILED:\n' + failures.map((f) => `- ${f}`).join('\n'));
    process.exit(1);
  }

  console.log(`Supabase migration RLS gate PASSED across ${files.length} migration file(s).`);
}

main().catch((err) => {
  console.error('Supabase migration RLS gate crashed:', err?.message ?? err);
  process.exit(1);
});
