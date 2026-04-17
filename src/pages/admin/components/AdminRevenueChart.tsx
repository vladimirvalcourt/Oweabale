import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Props {
  data: { month: string; revenue_cents: number }[];
}

export function AdminRevenueChart({ data }: Props) {
  const isEmpty = data.length === 0 || data.every((d) => d.revenue_cents === 0);

  return (
    <div className="border border-surface-border rounded-sm bg-surface-raised p-5">
      <div className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
        <TrendingUp size={14} />
        Monthly Revenue
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center h-[200px] text-[11px] text-content-tertiary">
          No revenue data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="month"
              tickCount={6}
              tick={{ fontSize: 11, fill: 'var(--color-content-tertiary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickCount={4}
              tickFormatter={(v) => `$${(v / 100).toLocaleString()}`}
              tick={{ fontSize: 11, fill: 'var(--color-content-tertiary)' }}
              width={55}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-surface-border)',
                borderRadius: '4px',
                fontSize: 11,
              }}
              formatter={(v: number | undefined) => [
                `$${((v ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                'Revenue',
              ]}
            />
            <Line
              type="monotone"
              dataKey="revenue_cents"
              stroke="#818cf8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
