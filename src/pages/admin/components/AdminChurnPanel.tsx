import React from 'react';
import { TrendingDown } from 'lucide-react';
import type { ChurnStats } from './types';

interface Props {
  stats: ChurnStats | null;
}

function churnRateColor(rate: number): string {
  if (rate > 0.1) return 'text-rose-400';
  if (rate > 0.05) return 'text-amber-400';
  return 'text-emerald-400';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function AdminChurnPanel({ stats }: Props) {
  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <div className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
        <TrendingDown size={14} />
        Churn
      </div>

      {stats === null ? (
        <div className="space-y-2">
          <div className="h-12 bg-surface-border rounded-lg animate-pulse" />
          <div className="h-12 bg-surface-border rounded-lg animate-pulse" />
          <div className="h-12 bg-surface-border rounded-lg animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-surface-border rounded-lg p-3 bg-surface-raised">
              <p className="text-[10px] text-content-tertiary uppercase mb-1">Total Churned</p>
              <p className="text-xl font-bold text-rose-400">{stats.total_canceled}</p>
            </div>
            <div className="border border-surface-border rounded-lg p-3 bg-surface-raised">
              <p className="text-[10px] text-content-tertiary uppercase mb-1">Churned (30d)</p>
              <p className="text-xl font-bold text-amber-400">{stats.canceled_30d}</p>
            </div>
            <div className="border border-surface-border rounded-lg p-3 bg-surface-raised">
              <p className="text-[10px] text-content-tertiary uppercase mb-1">Churn Rate</p>
              <p className={`text-xl font-bold ${churnRateColor(stats.churn_rate)}`}>
                {(stats.churn_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {stats.recent_churns.length === 0 ? (
              <p className="text-[11px] text-content-tertiary">No recent churns.</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {stats.recent_churns.map((churn, i) => (
                    <tr
                      key={i}
                      className="border-b border-surface-border last:border-0"
                    >
                      <td className="py-1.5 text-[11px] text-content-primary truncate max-w-0 w-full pr-3">
                        {churn.email ?? 'Unknown'}
                      </td>
                      <td className="py-1.5 text-[11px] text-content-tertiary whitespace-nowrap">
                        {formatDate(churn.canceled_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
