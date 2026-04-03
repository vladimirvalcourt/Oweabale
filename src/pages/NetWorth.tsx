import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { TrendingUp, TrendingDown, DollarSign, Building2, CreditCard, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function NetWorth() {
  const { assets, debts } = useStore();

  const totalAssets = useMemo(() => assets.reduce((sum, asset) => sum + asset.value, 0), [assets]);
  const totalLiabilities = useMemo(() => debts.reduce((sum, debt) => sum + debt.remaining, 0), [debts]);
  const netWorth = totalAssets - totalLiabilities;

  // Generate some mock historical data based on current net worth
  const historicalData = useMemo(() => {
    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    let currentNW = netWorth * 0.8; // Start 20% lower 6 months ago
    const step = (netWorth - currentNW) / 5;

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      data.push({
        name: months[monthIndex],
        value: i === 0 ? netWorth : currentNW + (step * (5 - i)) + (Math.random() * 5000 - 2500) // Add some noise
      });
    }
    return data;
  }, [netWorth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Net Worth</h1>
          <p className="text-sm text-zinc-400 mt-1">Track your total assets minus total liabilities over time.</p>
        </div>
      </div>

      {/* Top Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#141414] rounded-lg border border-[#262626] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-2">Total Net Worth</p>
          <p className={`text-3xl font-bold tabular-nums ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex items-center text-sm text-emerald-400">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+2.4% from last month</span>
          </div>
        </div>

        <div className="bg-[#141414] rounded-lg border border-[#262626] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Building2 className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-2">Total Assets</p>
          <p className="text-3xl font-bold tabular-nums text-[#FAFAFA]">
            ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex items-center text-sm text-zinc-500">
            <span>Across {assets.length} accounts</span>
          </div>
        </div>

        <div className="bg-[#141414] rounded-lg border border-[#262626] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-2">Total Liabilities</p>
          <p className="text-3xl font-bold tabular-nums text-[#FAFAFA]">
            ${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex items-center text-sm text-zinc-500">
            <span>Across {debts.length} accounts</span>
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      <div className="bg-[#141414] rounded-lg border border-[#262626] p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-6">Net Worth History (6 Months)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#52525b" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000)}k`}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1C1C', borderColor: '#262626', borderRadius: '0.5rem', color: '#FAFAFA' }}
                itemStyle={{ color: '#818cf8' }}
                formatter={(value: number) => [`$${value.toLocaleString('en-US', {maximumFractionDigits: 0})}`, 'Net Worth']}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets List */}
        <div className="bg-[#141414] rounded-lg border border-[#262626] overflow-hidden">
          <div className="p-4 border-b border-[#262626] bg-[#1C1C1C]/50 flex justify-between items-center">
            <h3 className="font-medium text-[#FAFAFA] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" /> Assets
            </h3>
            <span className="text-sm text-zinc-400">${totalAssets.toLocaleString()}</span>
          </div>
          <div className="divide-y divide-[#262626]">
            {assets.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">No assets added yet.</div>
            ) : (
              assets.map(asset => (
                <div key={asset.id} className="p-4 flex justify-between items-center hover:bg-[#1C1C1C] transition-colors">
                  <div>
                    <p className="font-medium text-[#FAFAFA]">{asset.name}</p>
                    <p className="text-xs text-zinc-500">{asset.type}</p>
                  </div>
                  <p className="font-medium text-emerald-400">+${asset.value.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Liabilities List */}
        <div className="bg-[#141414] rounded-lg border border-[#262626] overflow-hidden">
          <div className="p-4 border-b border-[#262626] bg-[#1C1C1C]/50 flex justify-between items-center">
            <h3 className="font-medium text-[#FAFAFA] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-400" /> Liabilities
            </h3>
            <span className="text-sm text-zinc-400">${totalLiabilities.toLocaleString()}</span>
          </div>
          <div className="divide-y divide-[#262626]">
            {debts.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">No liabilities added yet.</div>
            ) : (
              debts.map(debt => (
                <div key={debt.id} className="p-4 flex justify-between items-center hover:bg-[#1C1C1C] transition-colors">
                  <div>
                    <p className="font-medium text-[#FAFAFA]">{debt.name}</p>
                    <p className="text-xs text-zinc-500">{debt.type}</p>
                  </div>
                  <p className="font-medium text-red-400">-${debt.remaining.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
