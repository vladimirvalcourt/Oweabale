import React from 'react';

/**
 * Static hero visual — shown when prefers-reduced-motion is on
 * or while the ambient preview video is unavailable.
 */
export default function HeroDashboardMock() {
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-[6px] p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-surface-border pb-4">
        <span className="text-xs font-sans font-medium text-content-tertiary">Account balances</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-content-secondary" aria-hidden>
          <path d="M17 3a2 2 0 0 1 1.492 0.668l0.108 0.132 3.704 4.939a2 2 0 0 1 -0.012 2.416l-0.108 0.13 -9.259 10.184a1.25 1.25 0 0 1 -1.753 0.096l-0.097 -0.096 -9.259 -10.185a2 2 0 0 1 -0.215 -2.407l0.095 -0.138L5.4 3.8a2 2 0 0 1 1.43 -0.793L7 3zm-2.477 8H9.477L12 17.307zm5.217 0h-3.063l-2.406 6.015zM7.323 11H4.261l5.468 6.015zm5.059 -6h-0.764l-2 4h4.764zM17 5h-2.382l2 4H20zM9.382 5H7L4 9h3.382z" />
        </svg>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs section-label normal-case text-content-secondary border-b border-surface-border child:pb-3">
              <th className="font-normal w-1/3">Account</th>
              <th className="font-normal text-right">Trend / Status</th>
              <th className="font-normal text-right">Tax Est.</th>
              <th className="font-normal text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="text-content-primary text-sm font-mono tabular-nums">
            <tr className="hover:bg-white/[0.04] transition-colors">
              <td className="py-2.5">Uber / Lyft Inflow</td>
              <td className="text-right text-emerald-500 py-2.5">+12%</td>
              <td className="text-right text-rose-400 py-2.5">22.5%</td>
              <td className="text-right py-2.5">$2,450</td>
            </tr>
            <tr className="hover:bg-white/[0.04] transition-colors">
              <td className="py-2.5">Savings Account</td>
              <td className="text-right text-emerald-500 py-2.5">+2.1%</td>
              <td className="text-right text-content-tertiary py-2.5">—</td>
              <td className="text-right py-2.5">$45,230</td>
            </tr>
            <tr className="hover:bg-white/[0.04] transition-colors">
              <td className="py-2.5">Stock Portfolio</td>
              <td className="text-right text-emerald-500 py-2.5">+5.0%</td>
              <td className="text-right text-content-tertiary py-2.5">—</td>
              <td className="text-right py-2.5">$124,550</td>
            </tr>
            <tr className="hover:bg-white/[0.04] transition-colors">
              <td className="py-2.5">Tax Reserve (Shield)</td>
              <td className="text-right py-2.5">
                <span className="inline-flex items-center justify-end gap-2 w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  <span className="text-content-secondary font-sans text-xs uppercase tracking-wide">Active</span>
                </span>
              </td>
              <td className="text-right text-content-tertiary py-2.5">—</td>
              <td className="text-right text-emerald-500 py-2.5">$8,400</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-end pt-4 border-t border-surface-border mt-2">
        <div className="flex flex-col">
          <span className="text-xs text-content-tertiary mb-1">Total net worth</span>
          <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-content-primary data-numeric">$181,838</span>
        </div>
        <div className="flex gap-1 h-8 items-end w-32">
          {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
            <div key={i} className="flex-1 bg-white/20 hover:bg-white/35 transition-colors rounded-lg" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
