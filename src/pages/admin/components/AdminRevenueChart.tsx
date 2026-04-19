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
import { rechartsTooltipStableProps } from '../../../lib/rechartsTooltip';

interface Props {
  data: { month: string; revenue_cents: number }[];
}

export function AdminRevenueChart({ data }: Props) {
  const isEmpty = data.length === 0 || data.every((d) => d.revenue_cents === 0);

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-content-primary">
        <TrendingUp size={14} />
        Monthly Revenue
      </div>

      <div className="h-[200px] w-full min-h-[200px]">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-[11px] text-content-tertiary">
            No revenue data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 10, left: 4, bottom: 8 }}>
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
                {...rechartsTooltipStableProps}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '4px',
                  fontSize: 11,
                }}
                formatter={(value) => [
                  `$${(Number(value ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  'Revenue',
                ]}
              />
              <Line
                type="monotone"
                dataKey="revenue_cents"
                stroke="#d4d4d4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
