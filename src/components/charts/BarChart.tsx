'use client'

import { formatMoney } from '@/lib/formatters'

interface BarChartItem {
  label: string
  value: number
  color?: string
}

export function BarChart({ data, maxValue }: { data: BarChartItem[]; maxValue?: number }) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="capitalize text-(--color-content-secondary)">{item.label.replace('_', ' ')}</span>
            <span className="font-mono font-medium text-(--color-content)">{formatMoney(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-(--color-surface-elevated)">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (item.value / max) * 100)}%`,
                backgroundColor: item.color || 'var(--color-accent)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DonutChart({
  data,
  size = 120,
  strokeWidth = 12,
}: {
  data: BarChartItem[]
  size?: number
  strokeWidth?: number
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.reduce<{ elements: React.ReactNode[]; offset: number }>((acc, item) => {
          const segment = (item.value / total) * circumference
          const dashArray = `${segment} ${circumference - segment}`
          acc.elements.push(
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color || 'var(--color-accent)'}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={-acc.offset}
              strokeLinecap="round"
              className="transition-all"
            />
          )
          acc.offset += segment
          return acc
        }, { elements: [], offset: 0 }).elements}
      </svg>
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color || 'var(--color-accent)' }}
            />
            <span className="capitalize text-(--color-content-secondary)">{item.label.replace('_', ' ')}</span>
            <span className="ml-auto font-mono font-medium text-(--color-content)">
              {formatMoney(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
