import React from 'react';

/**
 * Clean, professional personal finance dashboard inspired by modern fintech apps
 * like Monarch Money, Copilot, and Mint. Focuses on clarity and real financial data.
 */
export default function HeroDashboardMock() {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-base p-5 sm:p-6">
      {/* Top Summary Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <p className="text-xs font-medium text-content-secondary mb-1">Total Balance</p>
          <p className="text-2xl font-bold tracking-tight text-content-primary">$24,892</p>
          <div className="mt-2 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-brand-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-medium text-brand-profit">+12.4%</span>
          </div>
        </div>
        
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <p className="text-xs font-medium text-content-secondary mb-1">Safe to Spend</p>
          <p className="text-2xl font-bold tracking-tight text-content-primary">$1,184</p>
          <p className="mt-2 text-xs text-content-muted">After bills & reserves</p>
        </div>
      </div>

      {/* Upcoming Bills */}
      <div className="mb-5 rounded-lg border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-content-primary">Upcoming Bills</p>
            <span className="text-xs text-content-secondary">Next 7 days</span>
          </div>
        </div>
        
        <div className="divide-y divide-surface-border">
          {[
            { name: 'Rent', amount: '$1,200', date: 'Tomorrow', category: 'Housing' },
            { name: 'Car Insurance', amount: '$148', date: 'Fri, Jan 26', category: 'Insurance' },
            { name: 'Phone Plan', amount: '$92', date: 'Mon, Jan 29', category: 'Utilities' },
          ].map((bill, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-surface-highlight transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-surface-offset flex items-center justify-center text-xs font-semibold text-content-secondary">
                  {bill.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-content-primary">{bill.name}</p>
                  <p className="text-xs text-content-muted">{bill.category} · {bill.date}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-content-primary">{bill.amount}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Debt Payoff Progress */}
      <div className="mb-5 rounded-lg border border-surface-border bg-surface-raised p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-content-secondary mb-0.5">Debt Payoff</p>
            <p className="text-lg font-semibold text-content-primary">$12,450 remaining</p>
          </div>
          <span className="text-xs font-medium text-brand-profit">On track</span>
        </div>
        
        <div className="h-2 bg-surface-offset rounded-full overflow-hidden">
          <div className="h-full w-[64%] bg-brand-profit rounded-full" />
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-content-muted">
          <span>64% paid off</span>
          <span>Target: Feb 2027</span>
        </div>
      </div>

      {/* Spending Overview Chart */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-content-primary">Spending This Month</p>
          <span className="text-xs text-content-secondary">$2,847</span>
        </div>
        
        <div className="space-y-3">
          {[
            { category: 'Housing', amount: 1200, total: 2847, color: 'bg-blue-500' },
            { category: 'Food', amount: 485, total: 2847, color: 'bg-emerald-500' },
            { category: 'Transport', amount: 312, total: 2847, color: 'bg-amber-500' },
            { category: 'Entertainment', amount: 198, total: 2847, color: 'bg-purple-500' },
          ].map((item) => (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-content-secondary">{item.category}</span>
                <span className="text-xs font-medium text-content-primary">${item.amount}</span>
              </div>
              <div className="h-1.5 bg-surface-offset rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full`}
                  style={{ width: `${(item.amount / item.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
