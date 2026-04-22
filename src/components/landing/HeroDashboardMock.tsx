import React from 'react';

/**
 * Editorial-style landing mock that emphasizes due dates, clarity, and payoff momentum
 * instead of reading like a dense admin dashboard.
 */
export default function HeroDashboardMock() {
  return (
    <div className="rounded-md border border-surface-border bg-surface-raised p-4 text-content-primary sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-md border border-surface-border bg-surface-highlight px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">This week at a glance</p>
            <p className="mt-1 text-sm font-semibold text-content-primary">You have a clear plan for the next 7 days</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-elevated px-3 py-1 text-[11px] font-medium text-brand-profit">
            <span className="h-2 w-2 rounded-full bg-brand-profit" aria-hidden />
            Updated
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-md border border-surface-border bg-surface-offset p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Due next</p>
                <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-content-primary">$842.00</p>
              </div>
              <div className="rounded-full bg-surface-highlight px-3 py-1 text-[11px] font-medium text-content-secondary">3 obligations</div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                ['Rent', 'Tomorrow', '$1,200'],
                ['Car insurance', 'Friday', '$148'],
                ['Phone', 'Monday', '$92'],
              ].map(([name, when, value]) => (
                <div key={name} className="flex items-center justify-between rounded-md border border-surface-border bg-surface-base px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-content-primary">{name}</p>
                    <p className="mt-1 text-xs text-content-secondary">{when}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-surface-highlight px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-secondary">
                      scheduled
                    </span>
                    <span className="text-sm font-semibold text-content-primary">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-surface-border bg-surface-offset p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Payoff momentum</p>
              <p className="mt-2 text-lg font-semibold text-content-primary">Debt-free target: Feb 2027</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-border">
                <div className="h-full w-[64%] rounded-full bg-brand-profit" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-content-muted">
                <span>64% plan confidence</span>
                <span>$183 extra this month</span>
              </div>
            </div>

            <div className="rounded-md border border-surface-border bg-surface-offset p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Safe to move</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-content-primary">$1,184</p>
              <p className="mt-2 text-sm leading-6 text-content-secondary">
                After upcoming bills, minimum debt payments, and your tax reserve.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-md border border-surface-border bg-surface-offset p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Reserve health</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-surface-base p-3">
                <p className="text-xs text-content-secondary">Tax reserve</p>
                <p className="mt-2 text-lg font-semibold text-content-primary">$1,539</p>
              </div>
              <div className="rounded-md bg-surface-base p-3">
                <p className="text-xs text-content-secondary">Emergency buffer</p>
                <p className="mt-2 text-lg font-semibold text-content-primary">$3,200</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-surface-border bg-surface-offset p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Net worth trend</p>
              <p className="text-xs font-medium text-brand-profit">+18.4% in 8 months</p>
            </div>
            <div className="mt-5 flex h-24 items-end gap-2">
              {[22, 28, 35, 39, 46, 54, 60, 70].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-md bg-gradient-to-b from-brand-profit/20 to-brand-profit/75"
                  style={{ height: `${height}%` }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
