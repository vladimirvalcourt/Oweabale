import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Activity, Search, Filter, ArrowDownRight, ArrowUpRight, Calendar, DollarSign, Tag } from 'lucide-react';

export default function Transactions() {
  const { transactions, categories } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [amountRange, setAmountRange] = useState<{min: string, max: string}>({min: '', max: ''});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch = transaction.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || transaction.type === filterType;
      const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
      
      let matchesDate = true;
      if (dateRange.start) matchesDate = matchesDate && transaction.date >= dateRange.start;
      if (dateRange.end) matchesDate = matchesDate && transaction.date <= dateRange.end;

      let matchesAmount = true;
      if (amountRange.min) matchesAmount = matchesAmount && transaction.amount >= parseFloat(amountRange.min);
      if (amountRange.max) matchesAmount = matchesAmount && transaction.amount <= parseFloat(amountRange.max);

      return matchesSearch && matchesType && matchesCategory && matchesDate && matchesAmount;
    });
  }, [transactions, searchTerm, filterType, filterCategory, dateRange, amountRange]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Transaction History</h1>
          <p className="text-sm text-zinc-400 mt-1">View all your past payments and income.</p>
        </div>
      </div>

      <div className="bg-[#141414] rounded-lg border border-[#262626]">
        <div className="p-4 border-b border-[#262626] flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-[#262626] rounded-md leading-5 bg-[#0A0A0A] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2 border rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  showAdvancedFilters 
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                    : 'bg-[#0A0A0A] border-[#262626] text-zinc-300 hover:bg-[#1C1C1C]'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#262626]">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-[#262626] bg-[#0A0A0A] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-[#262626] bg-[#0A0A0A] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-colors"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="block w-full px-2 py-2 border border-[#262626] bg-[#0A0A0A] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs rounded-md transition-colors"
                  />
                  <span className="text-zinc-500">-</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="block w-full px-2 py-2 border border-[#262626] bg-[#0A0A0A] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs rounded-md transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Amount Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={amountRange.min}
                    onChange={(e) => setAmountRange({...amountRange, min: e.target.value})}
                    className="block w-full px-2 py-2 border border-[#262626] bg-[#0A0A0A] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-colors"
                  />
                  <span className="text-zinc-500">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={amountRange.max}
                    onChange={(e) => setAmountRange({...amountRange, max: e.target.value})}
                    className="block w-full px-2 py-2 border border-[#262626] bg-[#0A0A0A] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 border border-[#262626] rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA] mb-1">No transactions found</h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              {searchTerm || filterType !== 'all' 
                ? "We couldn't find any transactions matching your current filters."
                : "You don't have any transaction history yet. Pay a bill or record a debt payment to see it here."}
            </p>
            {(searchTerm || filterType !== 'all' || filterCategory !== 'all' || dateRange.start || dateRange.end || amountRange.min || amountRange.max) && (
              <button
                onClick={() => { 
                  setSearchTerm(''); 
                  setFilterType('all'); 
                  setFilterCategory('all');
                  setDateRange({start: '', end: ''});
                  setAmountRange({min: '', max: ''});
                }}
                className="mt-4 px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#1F1F1F]">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#141414] divide-y divide-[#1F1F1F]">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-[#1C1C1C] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full border border-[#262626] flex items-center justify-center`}>
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className="h-5 w-5 text-[#22C55E]" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-zinc-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-[#FAFAFA]">{transaction.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1C1C1C] border border-[#262626] text-zinc-300">
                        {transaction.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold tabular-nums text-right ${
                      transaction.type === 'income' ? 'text-[#22C55E]' : 'text-[#FAFAFA]'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
