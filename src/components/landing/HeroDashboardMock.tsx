import React from 'react';

/**
 * Personalized dashboard mock that looks like someone's actual financial command center
 * with profile, avatar, and real-world data.
 */
export default function HeroDashboardMock() {
  return (
    <div className="rounded-md border border-surface-border bg-surface-raised p-4 text-content-primary sm:p-5">
      {/* Header with User Profile */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-surface-border bg-surface-highlight px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-brand-profit/30 bg-gradient-to-br from-brand-profit/20 to-brand-violet/20">
            <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
              <circle cx="20" cy="16" r="7" fill="currentColor" className="text-content-secondary opacity-60" />
              <ellipse cx="20" cy="34" rx="12" ry="8" fill="currentColor" className="text-content-secondary opacity-60" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-content-primary">Sarah's Dashboard</p>
            <p className="text-[10px] text-content-secondary">Freelance Designer · Updated 2m ago</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-surface-elevated px-3 py-1 text-[11px] font-medium text-brand-profit">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-profit" aria-hidden />
          Live
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.08fr_0.92fr]">
        {/* Due Next Section */}
        <div className="rounded-md border border-surface-border bg-surface-offset p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Due in next 7 days</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-content-primary">$842.00</p>
            </div>
            <div className="rounded-full bg-brand-profit/10 px-3 py-1 text-[11px] font-medium text-brand-profit">3 bills</div>
          </div>

          <div className="space-y-2.5">
            {[
              ['Rent', 'Tomorrow', '$1,200', 'bg-rose-500/10 text-rose-400'],
              ['Car insurance', 'Friday', '$148', 'bg-amber-500/10 text-amber-400'],
              ['Phone plan', 'Monday', '$92', 'bg-emerald-500/10 text-emerald-400'],
            ].map(([name, when, value, badgeClass]) => (
              <div key={name} className="flex items-center justify-between rounded-md border border-surface-border bg-surface-base px-3.5 py-2.5 transition-colors hover:border-surface-border/60">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full ${badgeClass} flex items-center justify-center text-xs font-bold`}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-content-primary">{name}</p>
                    <p className="text-[10px] text-content-secondary">{when}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-content-primary">{value}</p>
                  <p className="text-[9px] uppercase tracking-wide text-brand-profit">Auto-pay</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Payoff & Safe to Spend */}
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-surface-border bg-surface-offset p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Debt payoff</p>
              <span className="text-[10px] font-medium text-brand-profit">On track ✓</span>
            </div>
            <p className="text-lg font-semibold text-content-primary">Debt-free by Feb 2027</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-border">
              <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-brand-profit to-emerald-400 transition-all" />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-content-muted">
              <span>64% complete</span>
              <span className="font-medium text-brand-profit">+$183 this month</span>
            </div>
          </div>

          <div className="rounded-md border border-surface-border bg-gradient-to-br from-brand-profit/5 to-transparent p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-profit mb-1">Safe to spend</p>
            <p className="text-3xl font-bold tracking-[-0.04em] text-content-primary">$1,184</p>
            <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
              After bills, debt payments & tax reserve
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row - Reserves & Net Worth */}
      <div className="mt-3 grid gap-3 md:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-md border border-surface-border bg-surface-offset p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary mb-3">Your reserves</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-md bg-surface-base p-3 border border-surface-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-[10px] text-content-secondary">Tax reserve</p>
              </div>
              <p className="text-lg font-semibold text-content-primary">$1,539</p>
            </div>
            <div className="rounded-md bg-surface-base p-3 border border-surface-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-[10px] text-content-secondary">Emergency</p>
              </div>
              <p className="text-lg font-semibold text-content-primary">$3,200</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-surface-border bg-surface-offset p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Net worth</p>
            <div className="flex items-center gap-1.5 rounded-full bg-brand-profit/10 px-2 py-0.5">
              <svg className="h-3 w-3 text-brand-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-[10px] font-semibold text-brand-profit">+18.4%</p>
            </div>
          </div>
          <div className="flex h-20 items-end gap-1.5">
            {[22, 28, 35, 39, 46, 54, 60, 70].map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t bg-gradient-to-t from-brand-profit/30 to-brand-profit"
                style={{ height: `${height}%` }}
                aria-hidden
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-content-muted text-center">Last 8 months</p>
        </div>
      </div>
    </div>
  );
}
