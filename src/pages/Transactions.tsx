import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Activity, Search, Filter, ArrowDownRight, ArrowUpRight, Calendar, DollarSign, Tag, Download } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { BrandLogo } from '../components/BrandLogo';
import { motion } from 'motion/react';

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
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Transaction History</h1>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">{filteredTransactions.length} of {transactions.length} records detected</p>
        </div>
        <button
          onClick={() => {
            const headers = ['Date', 'Name', 'Category', 'Type', 'Amount'];
            const rows = filteredTransactions.map(t => [t.date, `"${t.name}"`, t.category, t.type, t.amount.toFixed(2)]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'oweable-transactions.csv'; a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-surface-border text-zinc-300 text-sm font-medium hover:bg-surface-elevated rounded-sm transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <CollapsibleModule 
        title="Record Probe" 
        icon={Filter}
        extraHeader={<span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{filteredTransactions.length} Records Detected</span>}
      >
        <div className="-mx-6 -my-6 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="PROBE RECORDS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-surface-border rounded-sm leading-5 bg-surface-base text-xs font-mono uppercase tracking-widest text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 border rounded-sm text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-all ${
                  showAdvancedFilters 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-transparent border-surface-border text-zinc-500 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Parameters
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-surface-border">
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="block w-full px-3 py-2 border border-surface-border rounded-sm bg-surface-base text-[10px] font-mono uppercase tracking-widest text-content-primary focus:outline-none focus:border-indigo-600 transition-colors"
                >
                  <option value="all">ALL STREAMS</option>
                  <option value="income">INCOMING</option>
                  <option value="expense">OUTGOING</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-2 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-surface-border rounded-sm bg-surface-base text-[10px] font-mono uppercase tracking-widest text-content-primary focus:outline-none focus:border-indigo-600 transition-colors"
                >
                  <option value="all">ALL CLASSES</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Window
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-sm bg-surface-base text-[10px] font-mono text-content-primary focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <span className="text-surface-border">::</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-sm bg-surface-base text-[10px] font-mono text-content-primary focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" /> Magnitude
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="MIN"
                    value={amountRange.min}
                    onChange={(e) => setAmountRange({...amountRange, min: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-sm bg-surface-base text-[10px] font-mono text-content-primary placeholder-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <span className="text-surface-border">::</span>
                  <input
                    type="number"
                    placeholder="MAX"
                    value={amountRange.max}
                    onChange={(e) => setAmountRange({...amountRange, max: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-sm bg-surface-base text-[10px] font-mono text-content-primary placeholder-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleModule>

        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 border border-surface-border rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-content-primary mb-1">No transactions found</h3>
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
                className="mt-4 px-4 py-2 bg-transparent border border-surface-border rounded-md text-sm font-medium text-zinc-300 hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
        <CollapsibleModule title="Transaction Intelligence" icon={Activity}>
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="min-w-full divide-y divide-surface-highlight">
              <thead className="bg-surface-base">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em]">
                    Transaction Record
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em]">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em]">
                    Classification
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em]">
                    Magnitude
                  </th>
                </tr>
              </thead>
              <motion.tbody 
                className="bg-surface-raised divide-y divide-surface-highlight"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: { staggerChildren: 0.05 }
                  }
                }}
              >
                {filteredTransactions.map((transaction) => (
                  <motion.tr 
                    key={transaction.id} 
                    className="group hover:bg-surface-elevated transition-colors border-l-2 border-transparent hover:border-indigo-600"
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BrandLogo
                          name={transaction.name}
                          fallbackIcon={
                            transaction.type === 'income' ? (
                              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5 text-zinc-600" />
                            )
                          }
                        />
                        <div className="ml-4">
                          <div className="text-sm font-bold text-content-primary">{transaction.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-widest bg-surface-base border border-surface-border text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        {transaction.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold font-mono tabular-nums text-right ${
                      transaction.type === 'income' ? 'text-emerald-500' : 'text-content-primary'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </CollapsibleModule>
        )}
    </div>
  );
}
