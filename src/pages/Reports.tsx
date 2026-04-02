import React from 'react';
import { BarChart3, Download } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Reports & Analytics</h1>
          <p className="text-sm text-zinc-400 mt-1">View your financial trends and insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-[#0A0A0A] border border-[#262626] text-zinc-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
          </select>
          <button className="flex items-center gap-2 bg-transparent border border-[#262626] text-zinc-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141414] p-6 rounded-lg border border-[#262626] min-h-[300px] flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border border-[#262626] rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA]">Spending by Category</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-sm">
            Your spending breakdown will appear here once you have enough transaction data.
          </p>
        </div>
        
        <div className="bg-[#141414] p-6 rounded-lg border border-[#262626] min-h-[300px] flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border border-[#262626] rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA]">Net Worth Trend</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-sm">
            Track your assets minus debts over time. Data will populate as you update your balances.
          </p>
        </div>
      </div>
    </div>
  );
}
