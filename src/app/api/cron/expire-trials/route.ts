import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = process.env.EXPIRE_TRIALS_CRON_SECRET || process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-signature') !== null

  // Allow Vercel cron (x-vercel-signature) or manual triggers with Bearer token
  if (!isVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // The edge function requires EXPIRE_TRIALS_CRON_SECRET specifically
  const edgeSecret = process.env.EXPIRE_TRIALS_CRON_SECRET
  if (!edgeSecret) {
    return NextResponse.json(
      { error: 'EXPIRE_TRIALS_CRON_SECRET not configured. Add it to Vercel environment variables.' },
      { status: 500 }
    )
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/expire-trials`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${edgeSecret}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json().catch(() => ({ error: 'Invalid response from edge function' }))
  return NextResponse.json(data, { status: res.status })
}
