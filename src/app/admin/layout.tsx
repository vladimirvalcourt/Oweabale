import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getServerUser } from '@/lib/supabase/server'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LifeBuoy,
  Shield,
  FileText,
  Mail,
  Megaphone,
  Sparkles,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/security', label: 'Security', icon: Shield },
  { href: '/admin/audit', label: 'Audit Log', icon: FileText },
  { href: '/admin/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { href: '/admin/email', label: 'Email', icon: Mail },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()
  if (!user) redirect('/auth')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin,email,first_name,last_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/dashboard')

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Admin'

  return (
    <div className="flex min-h-screen bg-(--color-surface)">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-(--color-surface-border) bg-(--color-surface) lg:flex">
        <div className="flex h-14 items-center border-b border-(--color-surface-border) px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-(--color-danger)">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-[0.15em] text-(--color-content)">
              ADMIN
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-auto px-3 py-4">
          <div className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-(--color-content-secondary) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-content)"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-(--color-surface-border) px-3 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-(--color-content-tertiary) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-content)"
          >
            ← Back to app
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-(--color-surface-border) bg-(--color-surface)/80 px-6 backdrop-blur">
          <h1 className="text-sm font-medium text-(--color-content-secondary)">Admin Panel</h1>
          <span className="text-xs text-(--color-content-tertiary)">{displayName}</span>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
