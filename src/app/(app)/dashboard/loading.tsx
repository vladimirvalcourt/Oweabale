import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Quick Add */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-(--color-surface-border) bg-(--color-surface-raised) p-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority queue */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-5 w-24 ml-auto rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Calendar strip */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-16 min-w-14 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
