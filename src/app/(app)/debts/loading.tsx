import { Skeleton } from '@/components/ui/skeleton'

export default function DebtsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 space-y-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-5 w-24 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
