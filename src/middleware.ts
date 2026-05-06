import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabasePublicKey, supabasePublicUrl } from '@/lib/supabase/config'

const protectedPaths = ['/dashboard', '/bills', '/debts', '/goals', '/income', '/budgets',
  '/assets', '/subscriptions', '/transactions', '/invoices', '/mileage', '/deductions',
  '/citations', '/credit', '/import', '/settings', '/onboarding']

export async function middleware(request: NextRequest) {
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

  // Redirect unauthenticated users away from protected paths
  const isProtected = protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
