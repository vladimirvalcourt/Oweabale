import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const functionsRoot = path.join(repoRoot, 'supabase', 'functions');

const LOG_CALL_RE = /console\.(?:log|info|warn|error)\(([\s\S]*?)\);/g;
const HIGH_RISK_RE = /\b(endpoint|p256dh|auth|token|authorization|bearer|cookie|password|secret|refresh_token|access_token|jwt)\b/i;
const MEDIUM_RISK_RE = /\b(user_id|userid|uid|connection_id|email_address|provider_message_id)\b/i;
const REDACTION_HINT_RE = /\bredact|masked|hash|trunc|slice\(\s*0\s*,\s*4\)|\.\.\./i;
const SAFE_CONTEXT_RE = /\b(token exchange failed|mint token|jwt verify failed)\b/i;

async function listFunctionIndexFiles() {
  const dirs = await readdir(functionsRoot, { withFileTypes: true });
  return dirs
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => path.join(functionsRoot, d.name, 'index.ts'));
}

function classifyLogRisk(logCallSource) {
  const text = logCallSource.toLowerCase();
  if (SAFE_CONTEXT_RE.test(text)) return null;
  if (HIGH_RISK_RE.test(text)) return 'high';
  if (MEDIUM_RISK_RE.test(text)) return 'medium';
  return null;
}

function hasRedactionHint(logCallSource) {
  return REDACTION_HINT_RE.test(logCallSource);
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

    let match;
    while ((match = LOG_CALL_RE.exec(source)) !== null) {
      const callSrc = match[0];
      const level = classifyLogRisk(callSrc);
      if (!level) continue;

      // High-risk terms always fail. Medium-risk terms pass only if explicitly redacted.
      if (level === 'high' || (level === 'medium' && !hasRedactionHint(callSrc))) {
        const rel = path.relative(repoRoot, file);
        failures.push(`${rel}: ${callSrc.replace(/\s+/g, ' ').slice(0, 220)}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      'Edge log hygiene FAILED. Potential sensitive logging detected:\n' +
        failures.map((f) => `- ${f}`).join('\n'),
    );
    process.exit(1);
  }

  console.log(`Edge log hygiene PASSED across ${files.length} edge function(s).`);
}

main().catch((err) => {
  console.error('Edge log hygiene crashed:', err?.message ?? err);
  process.exit(1);
});
