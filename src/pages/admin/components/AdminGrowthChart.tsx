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
import { rechartsTooltipStableProps } from '../../../lib/rechartsTooltip';

interface Props {
  data: { week: string; signups: number }[];
}

export function AdminGrowthChart({ data }: Props) {
  const isEmpty = data.length === 0;

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-content-primary">
        <Users size={14} />
        Weekly Signups
      </div>

      <div className="h-[200px] w-full min-h-[200px]">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-[11px] text-content-tertiary">
            No signup data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 10, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="week" tick={false} axisLine={false} tickLine={false} />
              <YAxis
                tickCount={4}
                tick={{ fontSize: 11, fill: 'var(--color-content-tertiary)' }}
                width={30}
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
                formatter={(value) => [Number(value ?? 0), 'Signups']}
              />
              <Bar dataKey="signups" fill="#34d399" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
