import React from 'react';

/**
 * Static hero visual — shown when prefers-reduced-motion is on
 * or while the ambient preview video is unavailable.
 */
export default function HeroDashboardMock() {
  return (
    <div className="bg-black border border-surface-border rounded-[6px] p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-surface-border relative">
        <div className="absolute -top-8 -right-2 bg-brand-cta text-surface-base px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-lg transform rotate-[-2deg]">
          Preview coming soon
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Oweable Command Center</p>
          <p className="text-sm text-content-primary font-medium mt-1">Financial Overview</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-surface-border bg-surface-raised p-3">
          <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Income Vault</p>
          <p className="text-lg font-semibold text-content-primary mt-1">$6,840</p>
          <p className="text-[11px] text-emerald-400 mt-1">+14% vs last month</p>
        </div>
        <div className="rounded-md border border-surface-border bg-surface-raised p-3">
          <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Tax Shield</p>
          <p className="text-lg font-semibold text-content-primary mt-1">$1,539</p>
          <p className="text-[11px] text-content-secondary mt-1">Q2 due: Jun 15</p>
        </div>
      </div>

      <div className="rounded-md border border-surface-border bg-surface-raised p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Debt Tracker</p>
          <p className="text-[10px] text-content-secondary">Avalanche Plan</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-content-primary/10 overflow-hidden">
          <div className="h-full w-[61%] rounded-full bg-emerald-500" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-content-secondary">
          <span>39% remaining</span>
          <span>Debt-free: Feb 2027</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 rounded-md border border-surface-border bg-surface-raised p-3">
          <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Net Worth Timeline</p>
          <div className="mt-3 h-16 flex items-end gap-1.5">
            {[22, 28, 34, 33, 42, 48, 56, 61].map((h, index) => (
              <div
                key={index}
                className="flex-1 rounded-sm bg-content-primary/20"
                style={{ height: `${h}%` }}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-[11px] text-emerald-400 mt-2">+18.4% over last 8 months</p>
        </div>
        <div className="col-span-2 rounded-md border border-surface-border bg-surface-raised p-3">
          <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Bills This Week</p>
          <ul className="mt-2 space-y-2 text-[11px] text-content-secondary">
            <li className="flex items-center justify-between">
              <span>Car Insurance</span>
              <span>$148</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Phone</span>
              <span>$92</span>
            </li>
            <li className="flex items-center justify-between text-rose-300">
              <span>Quarterly Tax</span>
              <span>$1,120</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
