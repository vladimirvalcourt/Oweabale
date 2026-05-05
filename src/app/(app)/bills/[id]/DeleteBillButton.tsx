'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DeleteBillButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this bill?')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('bills').delete().eq('id', id)
      if (error) throw error
      toast.success('Bill deleted')
      router.push('/bills')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete} disabled={deleting}>
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Delete
    </Button>
  )
}
