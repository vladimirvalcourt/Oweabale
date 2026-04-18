import React from 'react';
import { Users } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Props {
  data: { week: string; signups: number }[];
}

export function AdminGrowthChart({ data }: Props) {
  const isEmpty = data.length === 0;

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <div className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
        <Users size={14} />
        Weekly Signups
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center h-[200px] text-[11px] text-content-tertiary">
          No signup data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="week"
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickCount={4}
              tick={{ fontSize: 11, fill: 'var(--color-content-tertiary)' }}
              width={30}
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
              formatter={(value) => [Number(value ?? 0), 'Signups']}
            />
            <Bar dataKey="signups" fill="#34d399" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
