'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, ArrowLeftRight, Search, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDate } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  name: string
  amount: number
  category: string
  date: string
  type: string
}

interface TransactionsListProps {
  transactions: Transaction[]
  initialQuery?: string
}

export function TransactionsList({ transactions, initialQuery = '' }: TransactionsListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [query, setQuery] = React.useState(initialQuery)
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [sort, setSort] = React.useState('date_desc')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = transactions

    if (q) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter)
    }

    const [field, dir] = sort.split('_') as [string, 'asc' | 'desc']
    const mult = dir === 'asc' ? 1 : -1
    return [...result].sort((a, b) => {
      if (field === 'date') return mult * (new Date(a.date).getTime() - new Date(b.date).getTime())
      if (field === 'amount') return mult * (Number(a.amount) - Number(b.amount))
      if (field === 'name') return mult * a.name.localeCompare(b.name)
      return 0
    })
  }, [transactions, query, typeFilter, sort])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      toast.success('Transaction deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleExport = () => {
    const rows = filtered.map(t => ({
      Date: t.date, Name: t.name, Category: t.category, Type: t.type, Amount: t.amount,
    }))
    downloadTextFile(toCsv(rows), `transactions-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded transactions CSV')
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <ArrowLeftRight className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No transactions yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Record your spending and income.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-content-tertiary)" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) py-2 pl-9 pr-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-xs text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        >
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
          <option value="transfer">Transfers</option>
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-xs text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Amount high–low</option>
          <option value="amount_asc">Amount low–high</option>
          <option value="name_asc">Name A–Z</option>
        </select>
        <Button
          variant="outline"
          onClick={handleExport}
          className="shrink-0 border-(--color-surface-border) px-2.5 text-(--color-content-secondary) hover:bg-(--color-surface-raised)"
          title="Export to CSV"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {(query.trim() || typeFilter !== 'all') && (
        <p className="text-xs text-(--color-content-tertiary)">
          {filtered.length} of {transactions.length} transactions
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
          <p className="text-sm text-(--color-content-secondary)">No transactions match your filters</p>
        </div>
      ) : (
        filtered.map((tx) => (
          <div key={tx.id} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border',
              tx.type === 'income'
                ? 'border-(--color-success-border) bg-(--color-success-bg) text-(--color-success)'
                : tx.type === 'transfer'
                ? 'border-(--color-surface-border) bg-(--color-surface) text-(--color-content-secondary)'
                : 'border-(--color-danger-border) bg-(--color-danger-bg) text-(--color-danger)'
            )}>
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-(--color-content)">{tx.name}</span>
                <Badge variant="outline" className="hidden sm:inline-flex text-xs capitalize">{tx.category.replace('_', ' ')}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{formatDate(tx.date)}</p>
            </div>
            <div className="text-right">
              <p className={cn(
                'text-sm font-mono font-semibold tabular-nums',
                tx.type === 'income' ? 'text-(--color-success)' : 'text-(--color-content)'
              )}>
                {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : ''}{formatMoney(Number(tx.amount))}
              </p>
              <Badge
                variant={tx.type === 'income' ? 'success' : tx.type === 'expense' ? 'destructive' : 'default'}
                className="mt-0.5 text-xs capitalize"
              >
                {tx.type}
              </Badge>
            </div>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)"
              onClick={() => handleDelete(tx.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  )
}
