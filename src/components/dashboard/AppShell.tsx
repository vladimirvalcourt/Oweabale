'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Repeat,
  ArrowLeftRight,
  Target,
  PiggyBank,
  Wallet,
  Landmark,
  FileWarning,
  Calculator,
  Car,
  FileText,
  TrendingUp,
  Settings,
  Menu,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Sparkles,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type FormEvent } from 'react'

interface User {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

interface AppShellProps {
  user: User
  children: React.ReactNode
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Bills', href: '/bills', icon: Receipt },
  { label: 'Debts', href: '/debts', icon: CreditCard },
  { label: 'Subscriptions', href: '/subscriptions', icon: Repeat },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Budgets', href: '/budgets', icon: PiggyBank },
  { label: 'Income', href: '/income', icon: Wallet },
  { label: 'Assets', href: '/assets', icon: Landmark },
  { label: 'Citations', href: '/citations', icon: FileWarning },
  { label: 'Deductions', href: '/deductions', icon: Calculator },
  { label: 'Mileage', href: '/mileage', icon: Car },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Credit', href: '/credit', icon: TrendingUp },
  { label: 'Import', href: '/import', icon: Upload },
]

const settingsItem = { label: 'Settings', href: '/settings/profile', icon: Settings }

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-(--color-accent)">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-[0.15em] text-(--color-content)">OWEABLE</span>
        </Link>
      </div>

      <Separator className="bg-(--color-surface-border)" />

      <nav className="flex-1 overflow-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-(--color-accent-muted) text-(--color-accent)'
                    : 'text-(--color-content-secondary) hover:bg-(--color-surface-elevated) hover:text-(--color-content)'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <Separator className="bg-(--color-surface-border)" />

      <div className="px-3 py-3">
        <Link
          href={settingsItem.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-(--color-accent-muted) text-(--color-accent)'
              : 'text-(--color-content-secondary) hover:bg-(--color-surface-elevated) hover:text-(--color-content)'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {settingsItem.label}
        </Link>
      </div>
    </div>
  )
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const supabase = createClient()

  const displayName =
    user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const avatarUrl = user.user_metadata?.avatar_url
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-(--color-surface-border) bg-(--color-surface) lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-(--color-surface) border-r border-(--color-surface-border)">
          <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-(--color-surface-border) bg-(--color-surface)/80 backdrop-blur-md px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-(--color-content-secondary)"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>

          <div className="flex flex-1 items-center gap-4">
            <form
              className="relative hidden md:flex items-center flex-1 max-w-md"
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault()
                const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
                if (q) router.push(`/transactions?q=${encodeURIComponent(q)}`)
              }}
            >
              <Search className="absolute left-2.5 h-4 w-4 text-(--color-content-tertiary)" />
              <input
                name="q"
                type="search"
                placeholder="Search transactions..."
                className="h-9 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) pl-9 pr-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-accent)"
              />
            </form>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative text-(--color-content-secondary)">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>

            <div className="relative group">
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 text-(--color-content-secondary) hover:text-(--color-content)"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-xs bg-(--color-accent-muted) text-(--color-accent)">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline-block max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-56 origin-top-right rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) p-1 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-(--color-content)">{displayName}</p>
                  <p className="text-xs text-(--color-content-tertiary)">{user.email}</p>
                </div>
                <Separator className="my-1" />
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-(--color-content-secondary) hover:bg-(--color-surface-elevated) hover:text-(--color-content)"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-(--color-danger) hover:bg-(--color-danger-bg)"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
