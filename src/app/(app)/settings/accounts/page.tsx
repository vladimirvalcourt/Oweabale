'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { usePlaidLink } from 'react-plaid-link'
import {
  Loader2, Landmark, Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PlaidItem {
  id: string
  institution_name: string
  last_sync_at: string | null
  status: string
}

interface PlaidAccount {
  id: string
  plaid_item_id: string
  name: string
  account_type: string
  mask: string | null
  balance: number | null
}

export default function AccountsPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<PlaidItem[]>([])
  const [accounts, setAccounts] = React.useState<PlaidAccount[]>([])
  const [linkToken, setLinkToken] = React.useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = React.useState(false)
  const [now] = React.useState(() => Date.now())

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const [{ data: itemsData }, { data: accountsData }] = await Promise.all([
      supabase.from('plaid_items').select('id,institution_name,last_sync_at,status').eq('user_id', user.id).order('last_sync_at', { ascending: false }),
      supabase.from('plaid_accounts').select('id,plaid_item_id,name,account_type,mask,balance').eq('user_id', user.id).order('name', { ascending: true }),
    ])
    setItems(itemsData ?? [])
    setAccounts(accountsData ?? [])
    setLoading(false)
  }

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!user) { setLoading(false); return }
      const [{ data: itemsData }, { data: accountsData }] = await Promise.all([
        supabase.from('plaid_items').select('id,institution_name,last_sync_at,status').eq('user_id', user.id).order('last_sync_at', { ascending: false }),
        supabase.from('plaid_accounts').select('id,plaid_item_id,name,account_type,mask,balance').eq('user_id', user.id).order('name', { ascending: true }),
      ])
      if (!mounted) return
      setItems(itemsData ?? [])
      setAccounts(accountsData ?? [])
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [supabase])

  const onPlaidSuccess = React.useCallback(async (publicToken: string, metadata: unknown) => {
    setTokenLoading(false)
    setLinkToken(null)
    try {
      const { data, error } = await supabase.functions.invoke('plaid-exchange', {
        body: { public_token: publicToken, metadata },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast.success('Bank connected successfully')
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to exchange token'
      toast.error(msg)
    }
  }, [supabase])

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: onPlaidSuccess,
    onExit: () => {
      setTokenLoading(false)
      setLinkToken(null)
    },
  })

  React.useEffect(() => {
    if (ready && linkToken) {
      open()
    }
  }, [ready, linkToken, open])

  const handleConnect = async () => {
    setTokenLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('plaid-link-token', {
        body: {},
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (!data?.link_token) throw new Error('No link token received')
      setLinkToken(data.link_token)
    } catch (err: unknown) {
      setTokenLoading(false)
      const msg = err instanceof Error ? err.message : 'Failed to start Plaid Link'
      toast.error(msg)
    }
  }

  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this bank? All associated accounts will be removed.')) return
    try {
      const { error } = await supabase.from('plaid_items').delete().eq('id', id)
      if (error) throw error
      toast.success('Bank disconnected')
      setItems(items.filter(i => i.id !== id))
      setAccounts(accounts.filter(a => a.plaid_item_id !== id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--color-content-tertiary)" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-(--color-content)">Connected Accounts</h2>
        <p className="text-sm text-(--color-content-secondary)">Link and manage your bank accounts via Plaid.</p>
      </div>

      <Card className="border-(--color-surface-border)">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
            <Landmark className="h-5 w-5 text-(--color-content-secondary)" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-(--color-content)">Bank sync</p>
            <p className="text-xs text-(--color-content-tertiary)">
              {items.length === 0 ? 'No banks connected. Link your first account to start syncing transactions.' : `${items.length} bank${items.length > 1 ? 's' : ''} connected · ${accounts.length} account${accounts.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={handleConnect} disabled={tokenLoading} className="gap-2">
            {tokenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {tokenLoading ? 'Opening...' : 'Connect bank'}
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Connected banks</h3>
          {items.map((item) => {
            const itemAccounts = accounts.filter(a => a.plaid_item_id === item.id)
            const lastSync = item.last_sync_at ? new Date(item.last_sync_at) : null
            const isRecent = lastSync && (now - lastSync.getTime()) < 24 * 60 * 60 * 1000

            return (
              <Card key={item.id} className="border-(--color-surface-border)">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
                        <Landmark className="h-4 w-4 text-(--color-content-secondary)" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-(--color-content)">{item.institution_name || 'Unknown bank'}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-(--color-content-tertiary)">
                          {isRecent ? (
                            <><CheckCircle2 className="h-3 w-3 text-(--color-success)" />Synced {lastSync.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</>
                          ) : lastSync ? (
                            <><RefreshCw className="h-3 w-3 text-(--color-warning)" />Last sync {lastSync.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 text-(--color-content-tertiary)" />Never synced</>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)" onClick={() => handleDisconnect(item.id)}>
                      <Unlink className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </div>

                  {itemAccounts.length > 0 && (
                    <div className="space-y-2">
                      {itemAccounts.map((acc) => (
                        <div key={acc.id} className="flex items-center justify-between rounded-md border border-(--color-surface-border) bg-(--color-surface) px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-(--color-content)">{acc.name}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{acc.account_type.replace('_', ' ')}</Badge>
                            {acc.mask && <span className="text-xs text-(--color-content-tertiary)">••••{acc.mask}</span>}
                          </div>
                          {acc.balance !== null && <span className="text-sm font-mono tabular-nums text-(--color-content)">${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
