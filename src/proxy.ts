import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
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
