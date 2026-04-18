import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { projectNetWorth } from '../lib/finance';
import { rechartsTooltipStableProps } from '../lib/rechartsTooltip';
import { TrendingUp, TrendingDown, Hash, Building2, CreditCard, Vault, PieChart, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import { motion, animate, useMotionValue, useTransform } from 'motion/react';
import { useState, useEffect } from 'react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { SafeResponsiveContainer } from '../components/charts/SafeResponsiveContainer';

function AnimatedValue({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (val) =>
    `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  );

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span>{formatted}</motion.span>;
}

export default function NetWorth() {
  const { assets, debts, incomes, bills, subscriptions, deleteAsset } = useStore();

  const totalAssets = useMemo(() => assets.reduce((sum, asset) => sum + asset.value, 0), [assets]);
  const totalLiabilities = useMemo(() => debts.reduce((sum, debt) => sum + debt.remaining, 0), [debts]);
  const netWorth = totalAssets - totalLiabilities;

  const [extraMonthly, setExtraMonthly] = useState(0);

  // 12-month forward projection
  const projectionData = useMemo(() => {
    const rows = projectNetWorth(assets, debts, incomes, bills, subscriptions, 12, extraMonthly);
    const mapped = rows.map((r) => ({
      name: r.label,
      value: Number.isFinite(r.netWorth) ? r.netWorth : 0,
    }));
    return mapped.length > 0 ? mapped : [{ name: '—', value: 0 }];
  }, [assets, debts, incomes, bills, subscriptions, extraMonthly]);

  // Asset allocation by type
  const ASSET_COLORS = ['#d4d4d4', '#34D399', '#F59E0B', '#737373', '#a3a3a3', '#525252'];
  const assetAllocation = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(a => map.set(a.type, (map.get(a.type) || 0) + a.value));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [assets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Net worth</h1>
          <p className="text-sm text-content-tertiary mt-1">Track your total assets minus total liabilities over time.</p>
        </div>
      </div>

      {/* Top Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface-raised rounded-lg border border-surface-border p-6 relative overflow-hidden">
          <p className="metric-label mb-2 normal-case font-semibold">Total net worth</p>
          <p className={`text-4xl font-bold font-mono tabular-nums data-numeric ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            $<AnimatedValue value={netWorth} decimals={2} />
          </p>
          <div className="mt-3 flex items-center text-sm text-emerald-400 font-sans">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+2.4% from last month</span>
          </div>
        </div>

        <div className="bg-surface-raised rounded-lg border border-surface-border p-6 relative overflow-hidden">
          <p className="metric-label mb-2 normal-case font-semibold">Total assets</p>
          <p className="text-4xl font-bold font-mono tabular-nums text-content-primary data-numeric">
            $<AnimatedValue value={totalAssets} decimals={2} />
          </p>
          <div className="mt-3 flex items-center text-sm text-content-tertiary font-sans">
            <span>Across {assets.length} accounts</span>
          </div>
        </div>

        <div className="bg-surface-raised rounded-lg border border-surface-border p-6 relative overflow-hidden">
          <p className="metric-label mb-2 normal-case font-semibold">Total liabilities</p>
          <p className="text-4xl font-bold font-mono tabular-nums text-content-primary data-numeric">
            $<AnimatedValue value={totalLiabilities} decimals={2} />
          </p>
          <div className="mt-3 flex items-center text-sm text-content-tertiary font-sans">
            <span>Across {debts.length} accounts</span>
          </div>
        </div>
      </div>

      {/* Forward Projection — 12 months */}
      <CollapsibleModule title="Net Worth Projection — 12 Months Forward" icon={TrendingUp}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-sans text-content-tertiary">Extra per month</span>
          <button
            type="button"
            onClick={() => setExtraMonthly(e => Math.max(0, e - 100))}
            className="text-content-tertiary hover:text-content-primary text-sm font-mono transition-colors"
          >−</button>
          <span className="text-sm font-mono text-content-primary w-20 text-center tabular-nums">${extraMonthly.toLocaleString()}</span>
          <button
            type="button"
            onClick={() => setExtraMonthly(e => e + 100)}
            className="text-content-tertiary hover:text-content-primary text-sm font-mono transition-colors"
          >+</button>
          {extraMonthly > 0 && (
            <span className="text-xs font-sans text-content-secondary ml-2">Accelerated payoff</span>
          )}
        </div>
        <div className="h-[260px] w-full">
          <SafeResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4d4d4" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#d4d4d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={10} fontFamily="monospace" />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(Number(v ?? 0) / 1000).toFixed(0)}k`} dx={-10} fontFamily="monospace" />
              <Tooltip
                {...rechartsTooltipStableProps}
                contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '8px', color: '#FAFAFA', fontFamily: 'monospace', fontSize: '12px' }}
                formatter={(value) => [`$${Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 'Net Worth']}
              />
              <Area type="monotone" dataKey="value" stroke="#d4d4d4" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" dot={{ fill: '#d4d4d4', strokeWidth: 0, r: 3 }} />
            </AreaChart>
          </SafeResponsiveContainer>
        </div>
      </CollapsibleModule>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6">
          {/* Asset Allocation Donut */}
          <CollapsibleModule 
            title="Asset Allocation" 
            icon={PieChart}
          >
            <div className="flex flex-col items-center gap-4">
              <SafeResponsiveContainer width="100%" height={140} minWidth={0} minHeight={120}>
                <RechartsPie>
                  <Pie data={assetAllocation} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {assetAllocation.map((_, i) => (
                      <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...rechartsTooltipStableProps}
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px' }}
                    formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, 'Value']}
                  />
                </RechartsPie>
              </SafeResponsiveContainer>
              <div className="w-full space-y-2">
                {assetAllocation.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-none" style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }} />
                      <span className="text-xs font-mono text-content-tertiary">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono text-content-secondary">{((item.value / totalAssets) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleModule>

          {/* Subscriptions Sniper / Additional Data? */}
        </div>

        {/* Assets List */}
        <CollapsibleModule 
          title="Assets" 
          icon={Building2} 
          extraHeader={<span className="text-xs font-mono text-emerald-400 font-bold">${totalAssets.toLocaleString()}</span>}
        >
          <div className="divide-y divide-surface-border -mx-6 -my-6">
            {assets.length === 0 ? (
              <div className="p-6 text-center text-content-tertiary text-sm font-mono">No assets added yet.</div>
            ) : (
              assets.map(asset => (
                <div key={asset.id} className="px-6 py-3 flex justify-between items-center hover:bg-surface-elevated transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-content-primary">{asset.name}</p>
                    <p className="text-xs font-mono text-content-tertiary">{asset.type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-mono font-medium text-emerald-400">+${asset.value.toLocaleString()}</p>
                    <button onClick={async () => { const ok = await deleteAsset(asset.id); if (ok) toast.success('Asset removed'); }} className="opacity-0 group-hover:opacity-100 text-content-muted hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CollapsibleModule>

        {/* Liabilities List */}
        <CollapsibleModule 
          title="Liabilities" 
          icon={CreditCard} 
          extraHeader={<span className="text-xs font-mono text-red-400 font-bold">${totalLiabilities.toLocaleString()}</span>}
        >
          <div className="divide-y divide-surface-border -mx-6 -my-6">
            {debts.length === 0 ? (
              <div className="p-6 text-center text-content-tertiary text-sm font-mono">No liabilities added yet.</div>
            ) : (
              debts.map(debt => (
                <div key={debt.id} className="px-6 py-3 flex justify-between items-center hover:bg-surface-elevated transition-colors">
                  <div>
                    <p className="text-sm font-medium text-content-primary">{debt.name}</p>
                    <p className="text-xs font-mono text-content-tertiary">{debt.type} · {debt.apr}% APR</p>
                  </div>
                  <p className="text-sm font-mono font-medium text-red-400">-${debt.remaining.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </CollapsibleModule>
      </div>
    </div>
  );
}

