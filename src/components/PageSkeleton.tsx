import React from 'react';
import { cn } from '../lib/utils';

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
export function AppLoader() {
  return (
    <div className="fixed inset-0 bg-[#08090A] z-50 flex flex-col items-center justify-center">
      <div className="relative mb-6">
        <div className="w-8 h-8 border border-brand-violet/30 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-brand-violet animate-ping" />
        </div>
        <div className="absolute -inset-2 border border-brand-violet/10 animate-pulse" />
      </div>
      <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.4em]">
        Syncing Financial Data
      </p>
    </div>
  );
}
