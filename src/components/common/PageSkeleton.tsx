import React from 'react';
import { cn } from '../../lib/utils';

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-raised border border-surface-border animate-pulse',
        className
      )}
    />
  );
}

function SkeletonCard({ lines = 3, tall = false }: { lines?: number; tall?: boolean }) {
  return (
    <div className={cn('bg-surface-raised border border-surface-border p-5', tall && 'h-48')}>
      <Shimmer className="h-2 w-20 mb-4" />
      <Shimmer className="h-7 w-32 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} className={cn('h-1.5 mb-2', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  );
}

// Full-page skeleton that matches the dashboard grid layout
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <Shimmer className="h-6 w-48 mb-2" />
          <Shimmer className="h-2 w-32" />
        </div>
        <Shimmer className="h-8 w-24" />
      </div>
      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard lines={5} tall />
        <SkeletonCard lines={5} tall />
      </div>
      <SkeletonCard lines={4} />
    </div>
  );
}

// Generic list skeleton
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <Shimmer className="h-5 w-40" />
        <Shimmer className="h-8 w-24" />
      </div>
      <div className="border border-surface-border bg-surface-raised">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-surface-border last:border-0">
            <div className="flex items-center gap-3">
              <Shimmer className="w-8 h-8 shrink-0" />
              <div>
                <Shimmer className="h-2.5 w-28 mb-1.5" />
                <Shimmer className="h-2 w-16" />
              </div>
            </div>
            <Shimmer className="h-2.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// App-level full screen loader (for initial data fetch)
export function AppLoader({ message = 'Syncing financial data' }: { message?: string }) {
  return (
    <main
      id="main-content"
      aria-busy="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-base font-sans selection:bg-content-primary/15"
    >
      <h1 className="sr-only">{message}</h1>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-surface-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-surface-border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <div className="relative mb-8">
        <div className="flex h-10 items-center justify-center rounded-lg border border-surface-border bg-surface-raised px-3 animate-pulse-highlight [animation-duration:2.8s]">
          <span
            className="text-[10px] font-semibold tracking-[0.24em] text-content-primary animate-pulse [animation-duration:2.8s] [text-shadow:0_0_16px_var(--color-content-muted)]"
            aria-hidden
          >
            OWEABLE
          </span>
        </div>
      </div>
      <p className="relative max-w-[14rem] text-center text-xs font-medium tracking-tight text-content-tertiary" aria-hidden>
        {message}
      </p>
    </main>
  );
}
