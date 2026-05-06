import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabasePublicKey, supabasePublicUrl } from '@/lib/supabase/config'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(supabasePublicUrl, supabasePublicKey, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect logged-in users away from landing/auth to dashboard
  if (user && (pathname === '/' || pathname === '/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users away from app routes
  if (!user && pathname !== '/' && pathname !== '/auth' && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/auth',
    '/admin/:path*',
    '/assets/:path*',
    '/bills/:path*',
    '/budgets/:path*',
    '/citations/:path*',
    '/credit/:path*',
    '/dashboard/:path*',
    '/debts/:path*',
    '/deductions/:path*',
    '/goals/:path*',
    '/import/:path*',
    '/income/:path*',
    '/invoices/:path*',
    '/mileage/:path*',
    '/onboarding/:path*',
    '/settings/:path*',
    '/subscriptions/:path*',
    '/transactions/:path*',
  ],
}
