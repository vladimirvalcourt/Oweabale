'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CreditCard, Zap, Crown, BadgeCheck, ExternalLink, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Profile {
  plan: string
  trial_ends_at: string | null
}

interface Subscription {
  status: string
  cancel_at_period_end: boolean
  current_period_end: string | null
  stripe_price_id: string | null
}

export default function BillingPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [subscription, setSubscription] = React.useState<Subscription | null>(null)
  const [checkoutLoading, setCheckoutLoading] = React.useState(false)
  const [portalLoading, setPortalLoading] = React.useState(false)
  const [cancelLoading, setCancelLoading] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const [{ data: profileData }, { data: subData }] = await Promise.all([
        supabase.from('profiles').select('plan,trial_ends_at').eq('id', user.id).single(),
        supabase.from('billing_subscriptions').select('status,cancel_at_period_end,current_period_end,stripe_price_id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (profileData) setProfile(profileData)
      if (subData) setSubscription(subData)
      setLoading(false)
    }
    load()
  }, [supabase])

  const hasActiveSub = subscription?.status === 'active' || subscription?.status === 'trialing'
  const plan = profile?.plan || 'free'
  const isPro = plan === 'pro' || plan === 'premium' || hasActiveSub
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const inTrial = trialEnds && trialEnds > new Date()

  async function startCheckout(planKey: 'pro_monthly' | 'pro_yearly') {
    setCheckoutLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout-session', {
        body: { planKey },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (!data?.checkoutUrl) throw new Error('No checkout URL returned')
      window.location.href = data.checkoutUrl
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed'
      toast.error(msg)
      setCheckoutLoading(false)
    }
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: {},
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (!data?.url) throw new Error('No portal URL returned')
      window.location.href = data.url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Portal failed'
      toast.error(msg)
      setPortalLoading(false)
    }
  }

  async function cancelSub(immediate = false) {
    if (!immediate && !window.confirm('Cancel subscription at period end? You will keep access until the current billing period ends.')) return
    if (immediate && !window.confirm('Cancel subscription immediately? This will revoke access right away.')) return
    setCancelLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: { immediate },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast.success(data?.cancelAtPeriodEnd ? 'Subscription will cancel at period end' : 'Subscription cancelled')
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: subData } = await supabase.from('billing_subscriptions').select('status,cancel_at_period_end,current_period_end,stripe_price_id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
        setSubscription(subData ?? null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancel failed'
      toast.error(msg)
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--color-content-tertiary)" />
      </div>
    )
  }

  const plans = [
    { id: 'free', name: 'Free', price: '$0', desc: 'Core features for individuals getting started.', icon: BadgeCheck, features: ['Up to 10 bills/debts', 'Basic dashboard', 'Goal tracking', 'Email reminders'] },
    { id: 'pro', name: 'Pro', price: '$10.99/mo', desc: 'Advanced tools for power users.', icon: Zap, features: ['Unlimited items', 'Plaid bank sync', 'Credit fix tracking', 'Priority support', 'Custom categories'] },
    { id: 'premium', name: 'Premium', price: 'Coming soon', desc: 'Everything for families and businesses.', icon: Crown, features: ['Everything in Pro', 'Multi-user access', 'Tax deductions', 'Mileage log', 'Client invoicing', 'White-label reports'] },
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
              <Badge variant={isPro ? 'secondary' : 'default'} className="capitalize">
                {hasActiveSub ? subscription!.status : plan}
              </Badge>
              {subscription?.cancel_at_period_end && (
                <Badge variant="outline" className="text-amber-500 border-amber-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Cancels {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-(--color-content-tertiary)">
              {inTrial ? `Trial ends ${trialEnds!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : hasActiveSub ? `Renews ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}` : 'Free plan - upgrade for more features'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveSub && (
              <>
                <Button size="sm" variant="outline" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  <span className="ml-1">Manage</span>
                </Button>
                {!subscription?.cancel_at_period_end && (
                  <Button size="sm" variant="destructive" onClick={() => cancelSub(false)} disabled={cancelLoading}>
                    {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel'}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {plans.map((p) => {
          const Icon = p.icon
          const active = p.id === plan || (hasActiveSub && p.id === 'pro')
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
                {p.id === 'pro' && !hasActiveSub && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => startCheckout('pro_monthly')} disabled={checkoutLoading}>
                      {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade Monthly'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => startCheckout('pro_yearly')} disabled={checkoutLoading}>
                      {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yearly'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
