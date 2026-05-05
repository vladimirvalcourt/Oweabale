'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CreditCard, Zap, Crown, BadgeCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Profile {
  plan: string
  trial_ends_at: string | null
}

export default function BillingPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<Profile | null>(null)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('profiles').select('plan,trial_ends_at').eq('id', user.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="mx-auto max-w-xl flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--color-content-tertiary)" />
      </div>
    )
  }

  const plan = profile?.plan || 'free'
  const isPro = plan === 'pro' || plan === 'premium'
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const inTrial = trialEnds && trialEnds > new Date()

  const plans = [
    { id: 'free', name: 'Free', price: '$0', desc: 'Core features for individuals getting started.', icon: BadgeCheck, features: ['Up to 10 bills/debts', 'Basic dashboard', 'Goal tracking', 'Email reminders'] },
    { id: 'pro', name: 'Pro', price: '$9/mo', desc: 'Advanced tools for power users.', icon: Zap, features: ['Unlimited items', 'Plaid bank sync', 'Credit fix tracking', 'Priority support', 'Custom categories'] },
    { id: 'premium', name: 'Premium', price: '$29/mo', desc: 'Everything for families and businesses.', icon: Crown, features: ['Everything in Pro', 'Multi-user access', 'Tax deductions', 'Mileage log', 'Client invoicing', 'White-label reports'] },
  ]

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-(--color-content)">Billing</h2>
        <p className="text-sm text-(--color-content-secondary)">Manage your plan and payment methods.</p>
      </div>

      <Card className="border-(--color-surface-border)">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
            <CreditCard className="h-5 w-5 text-(--color-content-secondary)" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-(--color-content)">Current plan</p>
              <Badge variant={isPro ? 'secondary' : 'default'} className="capitalize">{plan}</Badge>
            </div>
            <p className="text-xs text-(--color-content-tertiary)">
              {inTrial ? `Trial ends ${trialEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : isPro ? 'Active subscription' : 'Free plan — upgrade for more features'}
            </p>
          </div>
          {!isPro && <Button size="sm">Upgrade</Button>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {plans.map((p) => {
          const Icon = p.icon
          const active = p.id === plan
          return (
            <Card key={p.id} className={`border ${active ? 'border-(--color-accent)' : 'border-(--color-surface-border)'} bg-(--color-surface-raised)`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${active ? 'border-(--color-accent) bg-(--color-accent-muted)' : 'border-(--color-surface-border) bg-(--color-surface)'}`}>
                      <Icon className={`h-4 w-4 ${active ? 'text-(--color-accent)' : 'text-(--color-content-secondary)'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-(--color-content)">{p.name}</p>
                      <p className="text-xs text-(--color-content-tertiary)">{p.price}</p>
                    </div>
                  </div>
                  {active && <Badge variant="secondary">Current</Badge>}
                </div>
                <p className="text-xs text-(--color-content-secondary)">{p.desc}</p>
                <ul className="space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-(--color-content-secondary)">
                      <BadgeCheck className="h-3 w-3 text-(--color-accent)" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
