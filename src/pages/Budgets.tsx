import React, { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, X, PieChart, Edit2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore, Budget } from '../store/useStore';
import { detectSpendingAnomalies } from '../lib/finance';
import { startOfBudgetPeriod, shiftBudgetPeriod } from '../lib/budgetPeriods';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';

const BUDGET_PERIODS: Budget['period'][] = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly'];

export default function Budgets() {
  const { budgets, transactions, addBudget, editBudget, deleteBudget, categories } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'Monthly' as Budget['period'],
    rolloverEnabled: false,
    lockMode: 'none' as NonNullable<Budget['lockMode']>,
  });

  const expenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name);

  const spendingAnomalies = useMemo(() =>
    detectSpendingAnomalies(transactions),
    [transactions]
  );
  const anomalyMap = useMemo(() =>
    Object.fromEntries(spendingAnomalies.map(a => [a.category, a])),
    [spendingAnomalies]
  );

  const parsedExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense')
        .map((t) => {
          const ms = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`).getTime();
          return { category: t.category, amount: t.amount, ms };
        })
        .filter((t) => Number.isFinite(t.ms)),
    [transactions],
  );

  const sumCategoryBetween = useMemo(() => {
    return (category: string, startMs: number, endMs: number) =>
      parsedExpenses.reduce((sum, tx) => {
        if (tx.category !== category) return sum;
        if (tx.ms < startMs || tx.ms > endMs) return sum;
        return sum + tx.amount;
      }, 0);
  }, [parsedExpenses]);


  const openAddModal = () => {
    setFormData({
      category: expenseCategories[0] || '',
      amount: '',
      period: 'Monthly',
      rolloverEnabled: false,
      lockMode: 'none',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period,
      rolloverEnabled: Boolean(budget.rolloverEnabled),
      lockMode: budget.lockMode ?? 'none',
    });
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addBudget({
      category: formData.category,
      amount: parseFloat(formData.amount),
      period: formData.period,
      rolloverEnabled: formData.rolloverEnabled,
      lockMode: formData.lockMode,
    });
    if (!ok) return;
    setIsAddModalOpen(false);
    toast.success('Budget added successfully');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBudget) {
      const ok = await editBudget(selectedBudget.id, {
        category: formData.category,
        amount: parseFloat(formData.amount),
        period: formData.period,
        rolloverEnabled: formData.rolloverEnabled,
        lockMode: formData.lockMode,
      });
      if (!ok) return;
      setIsEditModalOpen(false);
      toast.success('Budget updated successfully');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteBudget(id);
    if (!ok) return;
    toast.success('Budget deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Budget planner</h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">Set and manage your spending limits.</p>
        </div>
        <button 
          onClick={openAddModal}
          type="button"
          className="px-4 py-2.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-sm font-sans font-semibold shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto focus-app"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Create budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-surface-elevated rounded-lg flex items-center justify-center mx-auto mb-4 border border-surface-border">
            <PieChart className="w-8 h-8 text-content-muted" />
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-2">No budgets yet</h3>
          <p className="text-sm text-content-tertiary mb-8 max-w-sm mx-auto">Add a limit per category so you can see spending against it each month.</p>
          <button 
            type="button"
            onClick={openAddModal}
            className="px-6 py-3 rounded-lg bg-white hover:bg-neutral-200 active:scale-[0.98] text-black text-sm font-sans font-semibold transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            Create your first budget
          </button>
        </div>
      ) : (
        <CollapsibleModule 
          title="Budget Limits" 
          icon={PieChart}
          extraHeader={<span className="text-xs font-sans text-content-tertiary">{budgets.length} active</span>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 -mx-6 -my-6 p-6">
            {budgets.map((budget) => {
              const now = new Date();
              const currentStart = startOfBudgetPeriod(now, budget.period);
              const nextStart = shiftBudgetPeriod(currentStart, budget.period, 1);
              const prevStart = shiftBudgetPeriod(currentStart, budget.period, -1);
              const prevEnd = new Date(currentStart.getTime() - 1);

              const spent = sumCategoryBetween(
                budget.category,
                currentStart.getTime(),
                nextStart.getTime() - 1,
              );
              const prevSpent = sumCategoryBetween(
                budget.category,
                prevStart.getTime(),
                prevEnd.getTime(),
              );
              const rolloverCredit = budget.rolloverEnabled ? Math.max(0, budget.amount - prevSpent) : 0;
              const effectiveBudget = budget.amount + rolloverCredit;
              const percentage = Math.min(100, effectiveBudget > 0 ? (spent / effectiveBudget) * 100 : 0);
              const isOverBudget = spent > effectiveBudget;
              const isNearLimit = percentage >= 80 && !isOverBudget;

              let progressColor = 'bg-white';
              if (isOverBudget) progressColor = 'bg-red-500';
              else if (isNearLimit) progressColor = 'bg-amber-500';

              return (
                <div 
                  key={budget.id} 
                  className="bg-surface-elevated rounded-lg border border-surface-border p-5 flex flex-col relative group hover:border-white/15 transition-colors"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
                        {budget.category}
                        {anomalyMap[budget.category] && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                            ↑{anomalyMap[budget.category].overagePercent.toFixed(0)}%
                          </span>
                        )}
                      </h3>
                      <p className="metric-label mt-1.5 normal-case">{budget.period} limit</p>
                      {(budget.lockMode ?? 'none') !== 'none' && (
                        <p className="mt-1 text-[11px] font-medium text-amber-400 uppercase tracking-wide">
                          {(budget.lockMode ?? 'none') === 'hard' ? 'Hard lock' : 'Soft lock'}
                        </p>
                      )}
                      {budget.rolloverEnabled && rolloverCredit > 0 && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-400">
                          Rollover +${rolloverCredit.toFixed(0)}
                        </p>
                      )}
                    </div>
                    
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="text-content-tertiary hover:text-content-secondary transition-colors p-1 rounded-md focus-app">
                        <MoreHorizontal className="w-5 h-5" />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-surface-raised border border-surface-border shadow-xl focus-app z-10 py-1">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openEditModal(budget)}
                                  className={`${
                                    active ? 'bg-surface-elevated text-content-primary' : 'text-content-tertiary'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <Edit2 className="mr-3 h-4 w-4 text-content-tertiary" />
                                  Edit Budget
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDelete(budget.id)}
                                  className={`${
                                    active ? 'bg-surface-elevated text-[#EF4444]' : 'text-[#7F1D1D]'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <Trash2 className="mr-3 h-4 w-4 text-current" />
                                  Delete Budget
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                  
                  <div className="mb-4 flex justify-between items-end">
                    <p className="text-3xl font-bold font-mono tabular-nums text-content-primary">
                      ${spent.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs font-sans text-content-tertiary mb-1">
                      Target ${effectiveBudget.toLocaleString()}
                    </p>
                  </div>

                  <div className="w-full bg-surface-raised border border-surface-border rounded-lg h-1.5 mb-2 overflow-hidden">
                    <div className={`${progressColor} h-full transition-all duration-700 ease-out`} style={{ width: `${percentage}%` }}></div>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between text-xs font-sans text-content-tertiary">
                    {isOverBudget ? (
                      <span className="text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Over Budget</span>
                    ) : isNearLimit ? (
                      <span className="text-amber-400 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Near Limit</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> On Track</span>
                    )}
                    <span className="text-content-tertiary">{percentage.toFixed(0)}% used</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleModule>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-surface-raised border border-surface-border shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <Dialog.Title className="text-base font-sans font-semibold text-content-primary">
                {isEditModalOpen ? 'Edit budget' : 'New budget'}
              </Dialog.Title>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-content-tertiary hover:text-content-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Category</label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                >
                  <option value="" disabled>Select category</option>
                  {expenseCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {expenseCategories.length === 0 && (
                    <option value="General">General</option>
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-content-muted">$</span>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border rounded-lg pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Period</label>
                <select 
                  value={formData.period}
                  onChange={(e) => setFormData({...formData, period: e.target.value as Budget['period']})}
                  className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                >
                  {BUDGET_PERIODS.map((period) => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-base p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.rolloverEnabled}
                    onChange={(e) => setFormData({ ...formData, rolloverEnabled: e.target.checked })}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-surface-border bg-surface-base text-emerald-500 focus-app"
                  />
                  <span>
                    <span className="block text-sm font-medium text-content-primary">Enable rollover</span>
                    <span className="block text-xs text-content-tertiary mt-0.5">
                      Carry forward unused budget from the previous period into this one.
                    </span>
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Overspend guardrail</label>
                <select
                  value={formData.lockMode}
                  onChange={(e) => setFormData({ ...formData, lockMode: e.target.value as NonNullable<Budget['lockMode']> })}
                  className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                >
                  <option value="none">No lock</option>
                  <option value="soft">Soft lock (warn + allow override)</option>
                  <option value="hard">Hard lock (block overspend)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2 text-sm font-sans font-medium text-content-tertiary hover:text-content-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-sm font-sans font-semibold transition-colors shadow-sm"
                >
                  {isEditModalOpen ? 'Save changes' : 'Save budget'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
