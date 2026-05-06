import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const productionOrigin = 'https://www.oweable.com'
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

function getCallbackOrigin(url: URL) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim().replace(/\/$/, '')

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin
    } catch {
      // Fall through to the request origin below.
    }
  }

  if (process.env.NODE_ENV === 'production' && localHosts.has(url.hostname)) {
    return productionOrigin
  }

  return url.origin
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const origin = getCallbackOrigin(requestUrl)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`)
}
