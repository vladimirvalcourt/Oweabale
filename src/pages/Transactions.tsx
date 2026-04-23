import { useState, useMemo, useDeferredValue } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Activity, Search, Filter, ArrowDownRight, ArrowUpRight, Calendar, Hash, Tag, Download, TrendingUp, Ban, ShoppingBag } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { BrandLogo } from '../components/BrandLogo';
import { formatCategoryLabel } from '../lib/categoryDisplay';
import { getCustomIcon } from '../lib/customIcons';
import { toast } from 'sonner';

const BUTTON_BASE_CLASS =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-app disabled:opacity-50 disabled:cursor-not-allowed';
const BUTTON_SECONDARY_CLASS = `${BUTTON_BASE_CLASS} border border-surface-border bg-transparent text-content-secondary hover:bg-surface-elevated hover:text-content-primary`;
const BUTTON_PRIMARY_CLASS = `${BUTTON_BASE_CLASS} bg-brand-cta text-surface-base hover:bg-brand-cta-hover`;
const TransactionsIcon = getCustomIcon('transactions');
const FiltersIcon = getCustomIcon('filters');

export default function Transactions() {
  const {
    transactions,
    subscriptions,
    openQuickAdd,
    categorizationExclusions,
    addCategorizationExclusion,
    deleteCategorizationExclusion,
    updateTransaction,
  } = useStore(
    useShallow((s) => ({
      transactions: s.transactions,
      subscriptions: s.subscriptions,
      openQuickAdd: s.openQuickAdd,
      categorizationExclusions: s.categorizationExclusions,
      addCategorizationExclusion: s.addCategorizationExclusion,
      deleteCategorizationExclusion: s.deleteCategorizationExclusion,
      updateTransaction: s.updateTransaction,
    }))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [editingPlatform, setEditingPlatform] = useState<{ id: string; value: string } | null>(null);
  // PAGE-08: inline category editing
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [amountRange, setAmountRange] = useState<{min: string, max: string}>({min: '', max: ''});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [historyScope, setHistoryScope] = useState<'recent' | 'all'>('recent');
  const PAGE_SIZE = 25;
  const RECENT_HISTORY_LIMIT = 1000;

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const scopedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (historyScope === 'all') return sorted;
    return sorted.slice(0, RECENT_HISTORY_LIMIT);
  }, [transactions, historyScope]);

  const filteredTransactions = useMemo(() => {
    const q = deferredSearchTerm.toLowerCase();
    return scopedTransactions.filter((transaction) => {
      const plat = (transaction.platformTag || '').toLowerCase();
      const matchesSearch =
        transaction.name.toLowerCase().includes(q) || (q.length > 0 && plat.includes(q));
      const matchesType = filterType === 'all' || transaction.type === filterType;
      const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
      const tag = (transaction.platformTag || '').trim();
      let matchesPlatform = true;
      if (filterPlatform !== 'all') {
        if (filterPlatform === '__untagged') matchesPlatform = !tag;
        else matchesPlatform = tag === filterPlatform;
      }

      let matchesDate = true;
      if (dateRange.start) matchesDate = matchesDate && transaction.date >= dateRange.start;
      if (dateRange.end) matchesDate = matchesDate && transaction.date <= dateRange.end;

      let matchesAmount = true;
      if (amountRange.min) matchesAmount = matchesAmount && transaction.amount >= parseFloat(amountRange.min);
      if (amountRange.max) matchesAmount = matchesAmount && transaction.amount <= parseFloat(amountRange.max);

      return matchesSearch && matchesType && matchesCategory && matchesPlatform && matchesDate && matchesAmount;
    });
  }, [scopedTransactions, deferredSearchTerm, filterType, filterCategory, filterPlatform, dateRange, amountRange]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTransactions = filteredTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const uniquePlatforms = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) {
      const p = (t.platformTag || '').trim();
      if (p) s.add(p);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const subscriptionByNameLower = useMemo(() => {
    const m = new Map<string, (typeof subscriptions)[0]>();
    for (const s of subscriptions) m.set(s.name.toLowerCase(), s);
    return m;
  }, [subscriptions]);

  const exclusionByTxId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of categorizationExclusions) {
      if (e.scope === 'transaction' && e.transaction_id) m.set(e.transaction_id, e.id);
    }
    return m;
  }, [categorizationExclusions]);
  const exclusionByMerchantKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of categorizationExclusions) {
      if (e.scope === 'merchant' && e.merchant_name) m.set(e.merchant_name.toLowerCase().trim(), e.id);
    }
    return m;
  }, [categorizationExclusions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Transaction history</h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">
            {filteredTransactions.length} of {historyScope === 'recent' ? Math.min(transactions.length, RECENT_HISTORY_LIMIT) : transactions.length} visible
          </p>
        </div>
        <button
          onClick={async () => {
            const rowsSource = filteredTransactions;
            // Fix: Chunk large CSV exports to avoid blocking main thread (INP)
            const CHUNK_SIZE = 500;
            const headers = ['Date', 'Name', 'Category', 'Platform', 'Type', 'Amount'];
            const csvRows: string[] = [headers.join(',')];
            
            for (let i = 0; i < rowsSource.length; i += CHUNK_SIZE) {
              const chunk = rowsSource.slice(i, i + CHUNK_SIZE);
              const chunkRows = chunk.map((t) => [
                t.date,
                `"${t.name}"`,
                formatCategoryLabel(t.category),
                (t.platformTag || '').trim(),
                t.type,
                t.amount.toFixed(2),
              ].join(','));
              csvRows.push(...chunkRows);
              
              // Yield between chunks to let browser paint
              if (i + CHUNK_SIZE < rowsSource.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }
            
            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'oweable-transactions.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className={`${BUTTON_SECONDARY_CLASS} gap-2`}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <CollapsibleModule 
        title="Filter Transactions"
        icon={FiltersIcon}
        extraHeader={<span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">{filteredTransactions.length} Records Detected</span>}
      >
        <div className="-mx-6 -my-6 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-content-tertiary" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-surface-border rounded-lg leading-5 bg-surface-base text-xs font-mono uppercase tracking-widest text-content-primary placeholder:text-content-muted focus-app-field transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setHistoryScope(historyScope === 'recent' ? 'all' : 'recent');
                  setPage(1);
                }}
                className={BUTTON_SECONDARY_CLASS}
              >
                {historyScope === 'recent' ? `Load full history (${transactions.length})` : `Use fast mode (${RECENT_HISTORY_LIMIT})`}
              </button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`${BUTTON_BASE_CLASS} gap-2 border ${
                  showAdvancedFilters 
                    ? 'bg-brand-cta border-surface-border text-surface-base'
                    : 'bg-transparent border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-elevated'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                More Filters
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pt-6 border-t border-surface-border">
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                  className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px] font-mono uppercase tracking-widest text-content-primary focus-app-field transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px] font-mono uppercase tracking-widest text-content-primary focus-app-field transition-colors"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{formatCategoryLabel(cat)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-3 h-3" /> Platform
                </label>
                <select
                  value={filterPlatform}
                  onChange={(e) => {
                    setFilterPlatform(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px] font-mono uppercase tracking-widest text-content-primary focus-app-field transition-colors"
                >
                  <option value="all">All platforms</option>
                  <option value="__untagged">Untagged</option>
                  {uniquePlatforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px] font-mono text-content-primary focus-app-field transition-colors"
                  />
                  <span className="text-surface-border">::</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px] font-mono text-content-primary focus-app-field transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-content-muted mb-2 flex items-center gap-1.5">
                  <Hash className="w-3 h-3" /> Amount Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="MIN"
                    value={amountRange.min}
                    onChange={(e) => setAmountRange({...amountRange, min: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px] font-mono text-content-primary placeholder:text-content-muted focus-app-field transition-colors"
                  />
                  <span className="text-surface-border">::</span>
                  <input
                    type="number"
                    placeholder="MAX"
                    value={amountRange.max}
                    onChange={(e) => setAmountRange({...amountRange, max: e.target.value})}
                    className="block w-full px-2 py-2 border border-surface-border rounded-lg bg-surface-base text-[10px] font-mono text-content-primary placeholder:text-content-muted focus-app-field transition-colors"
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
              <TransactionsIcon className="w-8 h-8 text-content-tertiary" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-content-primary mb-1">No transactions found</h3>
            <p className="text-sm text-content-tertiary max-w-sm">
              {searchTerm || filterType !== 'all' 
                ? "We couldn't find any transactions matching your current filters."
                : "You don't have any transaction history yet. Pay a bill or record a debt payment to see it here."}
            </p>
            {transactions.length === 0 &&
              !searchTerm &&
              filterType === 'all' &&
              filterCategory === 'all' &&
              filterPlatform === 'all' &&
              !dateRange.start &&
              !dateRange.end &&
              !amountRange.min &&
              !amountRange.max && (
                <button
                  type="button"
                  onClick={() => openQuickAdd()}
                  className={`${BUTTON_PRIMARY_CLASS} mt-6 gap-2`}
                >
                  Add your first transaction
                </button>
              )}
            {(searchTerm || filterType !== 'all' || filterCategory !== 'all' || filterPlatform !== 'all' || dateRange.start || dateRange.end || amountRange.min || amountRange.max) && (
              <button
                type="button"
                onClick={() => { 
                  setSearchTerm(''); 
                  setFilterType('all'); 
                  setFilterCategory('all');
                  setFilterPlatform('all');
                  setDateRange({start: '', end: ''});
                  setAmountRange({min: '', max: ''});
                }}
                className={`${BUTTON_SECONDARY_CLASS} mt-4`}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
        <>
        <CollapsibleModule title="Your Transactions" icon={TransactionsIcon}>
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="min-w-full divide-y divide-surface-highlight">
              <thead className="bg-surface-base">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted uppercase tracking-[0.2em]">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted uppercase tracking-[0.2em]">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted uppercase tracking-[0.2em]">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-mono font-bold text-content-muted uppercase tracking-[0.2em]">
                    Platform
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-[10px] font-mono font-bold text-content-muted uppercase tracking-[0.2em]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-raised divide-y divide-surface-highlight">
                  {pagedTransactions.map((transaction) => {
                    const subData = subscriptionByNameLower.get(transaction.name.toLowerCase());
                    const isPriceHike = subData && transaction.type === 'expense' && transaction.amount > subData.amount;
                    const txExclusionId = exclusionByTxId.get(transaction.id);
                    const merchantExclusionId = exclusionByMerchantKey.get(transaction.name.toLowerCase().trim());
                    const exclusionReason = txExclusionId
                      ? 'Auto-categorization disabled for this transaction.'
                      : merchantExclusionId
                        ? 'Auto-categorization disabled for this merchant.'
                        : null;
                    
                    return (
                      <tr 
                        key={transaction.id} 
                        className="group hover:bg-surface-elevated transition-colors border-l-2 border-transparent hover:border-content-secondary/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <BrandLogo
                              name={transaction.name}
                              fallbackIcon={
                                transaction.type === 'income' ? (
                                  <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <ArrowDownRight className="h-5 w-5 text-content-muted" />
                                )
                              }
                            />
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-content-primary uppercase tracking-tight">{transaction.name}</div>
                                {isPriceHike && (
                                  <span className="flex items-center gap-1 text-[8px] bg-rose-500 text-surface-base px-1.5 font-black uppercase tracking-tighter animate-pulse">
                                    <TrendingUp className="w-2 h-2" /> Price Hike
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {txExclusionId ? (
                                  <button
                                    type="button"
                                    onClick={() => void deleteCategorizationExclusion(txExclusionId)}
                                    className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 py-0.5 text-[10px] font-medium text-content-secondary hover:text-content-primary"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Re-enable this tx
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void addCategorizationExclusion({
                                        scope: 'transaction',
                                        transaction_id: transaction.id,
                                        merchant_name: null,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 py-0.5 text-[10px] font-medium text-content-secondary hover:text-content-primary"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Exclude this tx
                                  </button>
                                )}
                                {merchantExclusionId ? (
                                  <button
                                    type="button"
                                    onClick={() => void deleteCategorizationExclusion(merchantExclusionId)}
                                    className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 py-0.5 text-[10px] font-medium text-content-secondary hover:text-content-primary"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Re-enable merchant
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void addCategorizationExclusion({
                                        scope: 'merchant',
                                        transaction_id: null,
                                        merchant_name: transaction.name,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded border border-surface-border bg-surface-base px-2 py-0.5 text-[10px] font-medium text-content-secondary hover:text-content-primary"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Exclude merchant
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] font-mono text-content-tertiary uppercase tracking-widest">
                          {transaction.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {/* PAGE-08: inline category editing — click tag to open dropdown */}
                            {editingCategory === transaction.id ? (
                              <select
                                autoFocus
                                value={transaction.category}
                                className="rounded-lg border border-surface-border bg-surface-base px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest text-content-primary focus-app-field"
                                onChange={async (e) => {
                                  const newCat = e.target.value;
                                  const oldCat = transaction.category;
                                  setEditingCategory(null);
                                  await updateTransaction(transaction.id, { category: newCat });
                                  
                                  // Smart suggestion: offer to create a rule
                                  if (newCat !== oldCat && transaction.name && transaction.name.trim().length > 0) {
                                    const merchantName = transaction.name.trim();
                                    toast(`Always categorize "${merchantName}" as ${formatCategoryLabel(newCat)}?`, {
                                      action: {
                                        label: 'Create Rule',
                                        onClick: async () => {
                                          const { addCategorizationRule } = useStore.getState();
                                          await addCategorizationRule({
                                            match_type: 'contains',
                                            match_value: merchantName,
                                            category: newCat,
                                            priority: 0,
                                          });
                                          toast.success('Rule created!');
                                        },
                                      },
                                      duration: 6000,
                                    });
                                  }
                                }}
                                onBlur={() => setEditingCategory(null)}
                                onKeyDown={(e) => { if (e.key === 'Escape') setEditingCategory(null); }}
                              >
                                {uniqueCategories.map((cat) => (
                                  <option key={cat} value={cat}>{formatCategoryLabel(cat)}</option>
                                ))}
                              </select>
                            ) : (
                              <button
                                type="button"
                                title={exclusionReason ?? 'Click to change category'}
                                onClick={() => setEditingCategory(transaction.id)}
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest bg-surface-base border border-surface-border text-content-tertiary group-hover:text-content-secondary hover:border-content-muted transition-colors cursor-pointer"
                              >
                                {formatCategoryLabel(transaction.category)}
                              </button>
                            )}
                            {exclusionReason && (
                              <span
                                title={exclusionReason}
                                className="inline-flex items-center w-fit rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-300"
                              >
                                Excluded from auto-rules
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap align-top">
                          {editingPlatform?.id === transaction.id ? (
                            <form
                              className="flex flex-col gap-1 min-w-[8rem]"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void (async () => {
                                  const ok = await updateTransaction(transaction.id, {
                                    platformTag: editingPlatform.value.trim(),
                                  });
                                  if (ok) {
                                    setEditingPlatform(null);
                                  }
                                })();
                              }}
                            >
                              <input
                                value={editingPlatform.value}
                                onChange={(e) =>
                                  setEditingPlatform({ id: transaction.id, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setEditingPlatform(null);
                                }}
                                className="w-full rounded border border-surface-border bg-surface-base px-2 py-1 text-[10px] font-mono text-content-primary focus-app-field"
                                placeholder="Uber, DoorDash…"
                                autoFocus
                              />
                              <span className="text-[9px] text-content-muted">Enter to save · Esc cancel</span>
                            </form>
                          ) : (
                            <button
                              type="button"
                              title="Edit platform tag"
                              onClick={() =>
                                setEditingPlatform({
                                  id: transaction.id,
                                  value: transaction.platformTag || '',
                                })
                              }
                              className="inline-flex max-w-[10rem] truncate text-left text-[10px] font-mono uppercase tracking-widest text-content-tertiary hover:text-content-secondary border border-transparent hover:border-surface-border rounded-lg px-2 py-1 transition-colors"
                            >
                              {(transaction.platformTag || '').trim() || '—'}
                            </button>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold font-mono tabular-nums text-right ${
                          transaction.type === 'income' ? 'text-emerald-500' : 'text-content-primary'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CollapsibleModule>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 px-1">
            <span className="text-[10px] font-mono text-content-muted uppercase tracking-widest">
              Page {currentPage} of {totalPages} — {filteredTransactions.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={BUTTON_SECONDARY_CLASS}
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={BUTTON_SECONDARY_CLASS}
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
        )}
    </div>
  );
}
