#!/usr/bin/env node
/**
 * Stripe setup script — run once to register webhooks and verify config.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs
 *
 * Or interactive:
 *   node scripts/stripe-setup.mjs
 *   → paste key when prompted
 */

import { createRequire } from 'module'
import { createInterface } from 'readline'

const require = createRequire(import.meta.url)
let Stripe

try {
  Stripe = require('stripe')
} catch {
  console.error('Stripe SDK not found. Install with: npm install stripe')
  process.exit(1)
}

const WEBHOOK_URL = 'https://horlyscpspctvceddcup.supabase.co/functions/v1/stripe-webhook'
const PRICE_IDS = {
  monthly: 'price_1TMhs0ED22C2sALQbLVdl7Wf',
  yearly: 'price_1TOuyuED22C2sALQUFifKiSE',
}

const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()) }))
}

async function main() {
  let secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    secret = await ask('Enter your Stripe secret key (sk_live_... or sk_test_...): ')
  }
  if (!secret?.startsWith('sk_')) {
    console.error('Invalid Stripe secret key format. Must start with sk_live_ or sk_test_')
    process.exit(1)
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' })
  const report = { webhooks: [], prices: [], subscriptions: [], customers: [], errors: [] }

  // 1. Register webhook
  console.log('\n📡 Registering webhook...')
  try {
    const existing = await stripe.webhookEndpoints.list({ limit: 100 })
    const already = existing.data.find((w) => w.url === WEBHOOK_URL)

    if (already) {
      // Update if events mismatch
      const missing = REQUIRED_EVENTS.filter((e) => !already.enabled_events.includes(e))
      if (missing.length > 0) {
        const updated = await stripe.webhookEndpoints.update(already.id, {
          enabled_events: [...new Set([...already.enabled_events, ...REQUIRED_EVENTS])],
        })
        report.webhooks.push({ action: 'updated', id: updated.id, url: updated.url })
        console.log(`  ✓ Updated webhook ${updated.id} (added ${missing.length} missing events)`)
      } else {
        report.webhooks.push({ action: 'exists', id: already.id, url: already.url })
        console.log(`  ✓ Webhook already registered: ${already.id}`)
      }
    } else {
      const created = await stripe.webhookEndpoints.create({
        url: WEBHOOK_URL,
        enabled_events: REQUIRED_EVENTS,
      })
      report.webhooks.push({ action: 'created', id: created.id, url: created.url, secret: created.secret })
      console.log(`  ✓ Created webhook: ${created.id}`)
      console.log(`  🔑 Webhook signing secret: ${created.secret}`)
      console.log('    → Add this to Supabase secrets as STRIPE_WEBHOOK_SECRET')
    }
  } catch (e) {
    report.errors.push({ step: 'webhook', message: e.message })
    console.error(`  ✗ Webhook error: ${e.message}`)
  }

  // 2. Verify price IDs
  console.log('\n💰 Verifying price IDs...')
  for (const [name, id] of Object.entries(PRICE_IDS)) {
    try {
      const price = await stripe.prices.retrieve(id)
      report.prices.push({
        name,
        id: price.id,
        product: price.product,
        active: price.active,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
      })
      console.log(`  ✓ ${name}: ${price.id} — $${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}/$price.recurring?.interval ?? 'one-time'`)
    } catch (e) {
      report.errors.push({ step: `price_${name}`, message: e.message })
      console.error(`  ✗ ${name}: ${e.message}`)
    }
  }

  // 3. List existing webhooks
  console.log('\n📋 Existing webhooks:')
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 100 })
    list.data.forEach((w) => {
      console.log(`  • ${w.id} → ${w.url} (${w.status})`)
      console.log(`    Events: ${w.enabled_events.join(', ')}`)
    })
  } catch (e) {
    console.error(`  ✗ ${e.message}`)
  }

  // 4. List recent subscriptions
  console.log('\n📋 Recent subscriptions (last 10):')
  try {
    const subs = await stripe.subscriptions.list({ limit: 10 })
    subs.data.forEach((s) => {
      console.log(`  • ${s.id} — ${s.status} — customer ${s.customer}`)
    })
    if (subs.data.length === 0) console.log('  (none)')
  } catch (e) {
    console.error(`  ✗ ${e.message}`)
  }

  // 5. List recent customers
  console.log('\n📋 Recent customers (last 10):')
  try {
    const customers = await stripe.customers.list({ limit: 10 })
    customers.data.forEach((c) => {
      console.log(`  • ${c.id} — ${c.email || 'no email'}`)
    })
    if (customers.data.length === 0) console.log('  (none)')
  } catch (e) {
    console.error(`  ✗ ${e.message}`)
  }

  console.log('\n📊 Setup complete.')
  console.log('\nNext steps:')
  console.log('  1. If a webhook was CREATED, copy the signing secret and run:')
  console.log(`     npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx --project-ref horlyscpspctvceddcup`)
  console.log('  2. If a webhook was UPDATED, the existing secret is still valid.')
  console.log('  3. If price IDs failed, verify them in your Stripe dashboard.')
  console.log('  4. Go to https://dashboard.stripe.com/webhooks to verify the endpoint is healthy.')

  // Save report
  const fs = await import('fs')
  const reportPath = '/Users/vladimirv/Desktop/Owebale/scripts/stripe-setup-report.json'
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📝 Report saved to: ${reportPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
