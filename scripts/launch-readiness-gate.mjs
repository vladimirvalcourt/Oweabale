#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { spawnSync } from 'node:child_process';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'hjgrslcapdmmgxeppguu';
const SITE_URL = process.env.LAUNCH_GATE_SITE_URL || 'https://www.oweable.com';
const VERCEL_PROJECT = process.env.LAUNCH_GATE_VERCEL_PROJECT || 'oweabale';

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const triggerCrons = args.has('--trigger-crons');
const json = args.has('--json');

if (args.has('--help')) {
  console.log(`Usage: npm run launch:readiness -- [--live] [--trigger-crons] [--json]

Default mode runs repo-enforceable checks only.
--live          Also run read-only production checks against Vercel and Supabase.
--trigger-crons Also call the production cron routes. Requires LAUNCH_GATE_ALLOW_CRON_TRIGGER=1.
--json          Print machine-readable JSON summary.

Optional environment overrides:
SUPABASE_PROJECT_REF=${PROJECT_REF}
LAUNCH_GATE_SITE_URL=${SITE_URL}
LAUNCH_GATE_VERCEL_PROJECT=${VERCEL_PROJECT}`);
  process.exit(0);
}

const results = [];

function add(name, ok, details = '') {
  results.push({ name, ok, details });
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function includesAll(path, needles) {
  const text = read(path);
  const missing = needles.filter((needle) => !text.includes(needle));
  add(path, missing.length === 0, missing.length ? `Missing: ${missing.join(', ')}` : 'required markers present');
}

function run(command, commandArgs, opts = {}) {
  const res = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
    ...opts,
  });
  return {
    ok: res.status === 0,
    code: res.status,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

function parseFirstColumnTableNames(output) {
  return new Set(
    output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('>') && !line.startsWith('-') && !line.startsWith('name '))
      .map((line) => line.split(/\s+/)[0])
      .filter((name) => /^[A-Z0-9_][A-Z0-9_-]*$/i.test(name)),
  );
}

function parseTableTokens(output) {
  return new Set(
    output
      .split('\n')
      .flatMap((line) => line.split('|').map((cell) => cell.trim()))
      .filter((token) => /^[A-Z0-9_][A-Z0-9_-]*$/i.test(token)),
  );
}

function head(url) {
  return new Promise((resolve) => {
    const req = httpsRequest(url, { method: 'HEAD', timeout: 15_000 }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
    });
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (err) => resolve({ ok: false, status: null, error: err.message }));
    req.end();
  });
}

function get(url) {
  return new Promise((resolve) => {
    const req = httpsRequest(url, { method: 'GET', timeout: 30_000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          body: body.slice(0, 500),
        });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (err) => resolve({ ok: false, status: null, body: err.message }));
    req.end();
  });
}

function requireNames(label, names, required) {
  const missing = required.filter((name) => !names.has(name));
  add(label, missing.length === 0, missing.length ? `Missing: ${missing.join(', ')}` : 'all required names present');
}

function runRepoChecks() {
  includesAll('src/components/common/QuickAddModal.tsx', [
    'const parseCurrencyInput = (value: string) => parseFloat(value.replace(/,/g, \'\'));',
    'const parsedAmount = parseCurrencyInput(amount);',
    'const numAmount = parseCurrencyInput(amount);',
    'minPayment: parseCurrencyInput(minPayment) || 0',
    'penaltyFee: parseCurrencyInput(penaltyFee) || 0',
  ]);

  includesAll('src/components/guards/ProPlanGuard.tsx', [
    '<Navigate to="/pro/settings?tab=billing&locked=trial" replace />',
    'isBillingLockBypass(location.pathname, location.search)',
  ]);

  includesAll('src/app/constants/fullSuiteAccess.ts', [
    "profile?.plan === 'trial'",
    'profile?.trial_expired === false',
    "row?.status === 'active'",
    "row?.status === 'trialing'",
  ]);

  includesAll('supabase/migrations/20260501000000_add_reverse_trial_fields.sql', [
    'trial_started_at',
    'trial_ends_at',
    'trial_expired',
    'plan text',
  ]);

  includesAll('supabase/migrations/20260522000000_fix_trial_activation.sql', [
    'NOW() + INTERVAL \'14 days\'',
    'trial_expired',
    'handle_new_user',
  ]);

  includesAll('vercel.json', [
    '"/api/cron/expire-trials"',
    '"/api/cron/trial-warning"',
    '"/((?!api/).*)"',
  ]);
}

async function runLiveChecks() {
  const site = await head(SITE_URL);
  add(`production ${SITE_URL}`, site.ok, site.ok ? `HTTP ${site.status}` : `HTTP ${site.status ?? 'failed'} ${site.error ?? ''}`.trim());

  const inspect = run('vercel', ['inspect', SITE_URL, '--timeout', '10s']);
  const inspectText = `${inspect.stdout}\n${inspect.stderr}`;
  const inspectOk =
    inspect.ok &&
    /target\s+production/i.test(inspectText) &&
    /status\s+.*Ready/i.test(inspectText) &&
    inspectText.includes('api/cron/trial-warning') &&
    inspectText.includes('api/cron/expire-trials');
  add('Vercel production deployment', inspectOk, inspectOk ? 'Ready production deployment with cron lambdas' : inspectText.slice(0, 500));

  const vercelEnv = run('vercel', ['env', 'ls', 'production']);
  if (vercelEnv.ok) {
    requireNames('Vercel production env', parseFirstColumnTableNames(vercelEnv.stdout), [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_PRICING_MONTHLY_DISPLAY',
      'VITE_PRICING_YEARLY_DISPLAY',
      'EXPIRE_TRIALS_CRON_SECRET',
      'WARN_TRIALS_CRON_SECRET',
      'VITE_POSTHOG_KEY',
      'VITE_CRISP_ID',
    ]);
  } else {
    add('Vercel production env', false, (vercelEnv.stderr || vercelEnv.stdout).slice(0, 500));
  }

  const functions = run('npx', ['supabase', 'functions', 'list', '--project-ref', PROJECT_REF]);
  if (functions.ok) {
    const names = parseTableTokens(functions.stdout);
    requireNames('Supabase Edge Functions', names, [
      'stripe-checkout-session',
      'stripe-customer-portal',
      'stripe-webhook',
      'stripe-sync-billing',
      'stripe-cancel-subscription',
      'expire-trials',
      'warn-trials',
      'support-contact',
    ]);
  } else {
    add('Supabase Edge Functions', false, (functions.stderr || functions.stdout).slice(0, 500));
  }

  const secrets = run('npx', ['supabase', 'secrets', 'list', '--project-ref', PROJECT_REF]);
  if (secrets.ok) {
    requireNames('Supabase secrets', parseFirstColumnTableNames(secrets.stdout), [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_PRO_MONTHLY',
      'STRIPE_PRICE_PRO_YEARLY',
      'RESEND_API_KEY',
      'RESEND_FROM_EMAIL',
      'EXPIRE_TRIALS_CRON_SECRET',
      'WARN_TRIALS_CRON_SECRET',
    ]);
  } else {
    add('Supabase secrets', false, (secrets.stderr || secrets.stdout).slice(0, 500));
  }

  const migrations = run('npx', ['supabase', 'migration', 'list', '--linked']);
  if (migrations.ok) {
    const remoteHas = (version) => new RegExp(`\\|\\s*${version}\\s*\\|`).test(migrations.stdout);
    const ok = remoteHas('20260501000000') && remoteHas('20260522000000');
    add(
      'Supabase trial migrations',
      ok,
      ok ? 'reverse-trial schema and signup trigger migrations are remote' : 'missing 20260501000000 or 20260522000000 remotely',
    );
  } else {
    add('Supabase trial migrations', false, (migrations.stderr || migrations.stdout).slice(0, 500));
  }

  if (triggerCrons) {
    if (process.env.LAUNCH_GATE_ALLOW_CRON_TRIGGER !== '1') {
      add('cron trigger opt-in', false, 'Set LAUNCH_GATE_ALLOW_CRON_TRIGGER=1 to call production cron routes.');
    } else {
      for (const route of ['/api/cron/expire-trials', '/api/cron/trial-warning']) {
        const res = await get(new URL(route, SITE_URL).toString());
        add(`trigger ${route}`, res.ok, `HTTP ${res.status}: ${res.body}`);
      }
    }
  }
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  if (json) {
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
    return;
  }

  console.log('\nLaunch readiness gate\n');
  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.details ? ` - ${result.details}` : ''}`);
  }
  console.log(`\n${failed.length === 0 ? 'READY FOR CONTROLLED BETA GATE' : 'NOT READY'}: ${results.length - failed.length}/${results.length} checks passed.`);
  console.log('\nManual lifecycle proof still required before broad launch: create one production test user, verify 14-day trial access, expire that test user, prove billing-only lock, complete Stripe checkout, then prove paid unlock and cancellation behavior.');
}

runRepoChecks();
if (live) await runLiveChecks();
printSummary();

process.exit(results.some((r) => !r.ok) ? 1 : 0);
