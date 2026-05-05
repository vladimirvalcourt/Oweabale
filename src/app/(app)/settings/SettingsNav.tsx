'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User, CreditCard, Bell, Link2, Monitor, Shield, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsNav = [
  { label: 'Profile', href: '/settings/profile', icon: User },
  { label: 'Billing', href: '/settings/billing', icon: CreditCard },
  { label: 'Notifications', href: '/settings/notifications', icon: Bell },
  { label: 'Accounts', href: '/settings/accounts', icon: Link2 },
  { label: 'Display', href: '/settings/display', icon: Monitor },
  { label: 'Security', href: '/settings/security', icon: Shield },
  { label: 'Support', href: '/settings/support', icon: HelpCircle },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex shrink-0 flex-col gap-1 lg:w-56">
      {settingsNav.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
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
    </nav>
  )
}
