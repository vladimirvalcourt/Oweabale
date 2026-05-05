'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { parseCsv, normalizeTransactionRow } from '@/lib/csv'

export default function ImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const [dragOver, setDragOver] = React.useState(false)
  const [rows, setRows] = React.useState<Record<string, string>[] | null>(null)
  const [parsed, setParsed] = React.useState<ReturnType<typeof normalizeTransactionRow>[]>([])
  const [importing, setImporting] = React.useState(false)

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '')
      const parsedRows = parseCsv(text)
      setRows(parsedRows)
      const normalized = parsedRows.map(normalizeTransactionRow).filter(Boolean)
      setParsed(normalized as ReturnType<typeof normalizeTransactionRow>[])
      toast.success(`Parsed ${parsedRows.length} rows, ${normalized.length} valid`)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleImport = async () => {
    const valid = parsed.filter((r): r is NonNullable<typeof r> => r !== null)
    if (valid.length === 0) {
      toast.error('No valid transactions to import')
      return
    }

    setImporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const inserts = valid.map((r) => ({
        user_id: user.id,
        amount: r.amount,
        description: r.description,
        category: r.category,
        transaction_date: r.transaction_date,
        source_type: r.source_type,
      }))

      const { error } = await supabase.from('transactions').insert(inserts)
      if (error) throw error

      toast.success(`Imported ${inserts.length} transactions`)
      setRows(null)
      setParsed([])
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="border-(--color-surface-border) text-(--color-content-secondary) hover:bg-(--color-surface-raised)"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="text-xl font-semibold text-(--color-content)">Import Transactions</h1>
      </div>

      <Card className="border-(--color-surface-border) bg-(--color-surface-raised)">
        <CardContent className="p-6">
          {!rows && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                dragOver
                  ? 'border-(--color-accent) bg-(--color-accent-muted)'
                  : 'border-(--color-surface-border)'
              }`}
            >
              <Upload className="mx-auto h-8 w-8 text-(--color-content-tertiary)" />
              <p className="mt-3 text-sm font-medium text-(--color-content-secondary)">
                Drag and drop a CSV file here
              </p>
              <p className="mt-1 text-xs text-(--color-content-tertiary)">
                Or{' '}
                <label className="cursor-pointer text-(--color-accent) hover:underline">
                  click to browse
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFile(e.target.files[0])
                    }}
                  />
                </label>
              </p>
            </div>
          )}

          {rows && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-md border border-(--color-surface-border) bg-(--color-surface) px-4 py-3">
                <FileText className="h-5 w-5 text-(--color-content-secondary)" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-(--color-content)">
                    {rows.length} rows parsed
                  </p>
                  <p className="text-xs text-(--color-content-tertiary)">
                    {parsed.filter(Boolean).length} valid transactions ready to import
                  </p>
                </div>
                <button
                  onClick={() => { setRows(null); setParsed([]) }}
                  className="text-xs text-(--color-destructive) hover:underline"
                >
                  Remove
                </button>
              </div>

              {parsed.filter(Boolean).length > 0 && (
                <>
                  <div className="max-h-64 overflow-auto rounded-md border border-(--color-surface-border)">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-(--color-surface-raised)">
                        <tr className="border-b border-(--color-surface-border)">
                          <th className="px-3 py-2 font-medium text-(--color-content-secondary)">Date</th>
                          <th className="px-3 py-2 font-medium text-(--color-content-secondary)">Description</th>
                          <th className="px-3 py-2 font-medium text-(--color-content-secondary)">Category</th>
                          <th className="px-3 py-2 text-right font-medium text-(--color-content-secondary)">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.filter(Boolean).slice(0, 20).map((r, i) => (
                          <tr key={i} className="border-b border-(--color-surface-border) last:border-0">
                            <td className="px-3 py-2 text-(--color-content)">{r?.transaction_date}</td>
                            <td className="px-3 py-2 text-(--color-content)">{r?.description}</td>
                            <td className="px-3 py-2">
                              <span className="rounded-full bg-(--color-surface) px-2 py-0.5 text-2xs text-(--color-content-secondary)">
                                {r?.category}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-(--color-content)">
                              ${r?.amount?.toFixed?.(2) ?? r?.amount}
                            </td>
                          </tr>
                        ))}
                        {parsed.filter(Boolean).length > 20 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-center text-(--color-content-tertiary)">
                              ...and {parsed.filter(Boolean).length - 20} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-start gap-3 rounded-md bg-(--color-accent-muted) px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-(--color-accent)" />
                    <p className="text-xs text-(--color-content-secondary)">
                      This will insert all valid rows into your transactions table. Duplicate data is not detected automatically.
                    </p>
                  </div>

                  <Button
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full"
                  >
                    {importing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Import {parsed.filter(Boolean).length} transactions
                  </Button>
                </>
              )}

              {parsed.filter(Boolean).length === 0 && (
                <div className="rounded-md border border-dashed border-(--color-surface-border) px-6 py-8 text-center">
                  <p className="text-sm text-(--color-content-secondary)">No valid transactions found in this file.</p>
                  <p className="mt-1 text-xs text-(--color-content-tertiary)">
                    Make sure columns include Date, Amount, Description, and Category.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 rounded-md border border-(--color-surface-border) bg-(--color-surface) px-4 py-3">
            <p className="text-xs font-medium text-(--color-content-secondary)">Expected CSV format</p>
            <code className="mt-2 block rounded bg-(--color-surface-raised) px-3 py-2 text-xs text-(--color-content-tertiary)">
              Date,Description,Category,Amount<br />
              2026-05-01,Grocery run,groceries,87.50<br />
              2026-05-02,Gas station,transport,45.00
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
