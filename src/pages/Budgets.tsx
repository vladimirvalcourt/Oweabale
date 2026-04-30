import React, { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, X, PieChart, Edit2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore, Budget } from '../store';
import {
  buildMonthlySavingsTargetSnapshot,
  buildPersonalizedSavingsSuggestions,
  detectSpendingAnomalies,
} from '../lib/api/services/finance';
import { yieldForPaint } from '../lib/utils';
import { startOfBudgetPeriod, shiftBudgetPeriod } from '../lib/api/services/budgetPeriods';
import { CollapsibleModule } from '../components/common';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';
import { formatCategoryLabel } from '../lib/api/services/categoryDisplay';
import { getCustomIcon } from '../lib/utils';

const BUDGET_PERIODS: Budget['period'][] = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly'];
const SAVINGS_TARGET_STORAGE_KEY = 'oweable_budget_monthly_savings_target';
const BudgetIcon = getCustomIcon('budget');
const PlanningIcon = getCustomIcon('planning');

function loadMonthlySavingsTarget(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(SAVINGS_TARGET_STORAGE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function Budgets() {
  const { budgets, transactions, addBudget, editBudget, deleteBudget, categories, subscriptions } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [budgetNowMs] = useState(() => Date.now());
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState<number>(() => loadMonthlySavingsTarget());

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'Monthly' as Budget['period'],
    rolloverEnabled: false,
    lockMode: 'none' as NonNullable<Budget['lockMode']>,
  });

  const expenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name);

  const sinkingFundRecommendations = useMemo(() => {
    const annualizedByCategory = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const category = tx.category || 'Uncategorized';
      annualizedByCategory.set(category, (annualizedByCategory.get(category) || 0) + tx.amount);
    }
    const recs = new Map<string, number>();
    for (const [category, annualized] of annualizedByCategory.entries()) {
      if (annualized <= 0) continue;
      recs.set(category, annualized / 12);
    }
    return recs;
  }, [transactions]);

  const selectedSinkingFundSuggestion = useMemo(() => {
    const n = sinkingFundRecommendations.get(formData.category);
    if (!n || n <= 0) return null;
    return n;
  }, [formData.category, sinkingFundRecommendations]);

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

  const budgetSnapshots = useMemo(() => {
    return budgets.map((budget) => {
      const now = new Date(budgetNowMs);
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

      const totalWindowMs = Math.max(1, nextStart.getTime() - currentStart.getTime());
      const elapsedWindowMs = Math.min(totalWindowMs, Math.max(0, budgetNowMs - currentStart.getTime()));
      const elapsedRatio = elapsedWindowMs / totalWindowMs;
      const projectedEndSpend =
        elapsedRatio > 0.15 && spent > 0 ? spent / Math.max(elapsedRatio, 0.0001) : spent;
      const isProjectedToOverspend = !isOverBudget && projectedEndSpend > effectiveBudget * 1.02;

      return {
        budgetId: budget.id,
        spent,
        rolloverCredit,
        effectiveBudget,
        percentage,
        isOverBudget,
        isNearLimit,
        isProjectedToOverspend,
        projectedEndSpend,
      };
    });
  }, [budgets, sumCategoryBetween, budgetNowMs]);

  const snapshotByBudgetId = useMemo(
    () => new Map(budgetSnapshots.map((snapshot) => [snapshot.budgetId, snapshot])),
    [budgetSnapshots],
  );

  const projectedRiskBudgets = useMemo(
    () =>
      budgetSnapshots
        .filter((snapshot) => snapshot.isProjectedToOverspend)
        .sort((a, b) => b.projectedEndSpend - a.projectedEndSpend),
    [budgetSnapshots],
  );

  const monthlySavingsSnapshot = useMemo(() => {
    const now = new Date(budgetNowMs);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const netSavedSoFar = transactions.reduce((sum, tx) => {
      const ms = new Date(tx.date.includes('T') ? tx.date : `${tx.date}T12:00:00`).getTime();
      if (!Number.isFinite(ms) || ms < monthStart) return sum;
      if (tx.type === 'income') return sum + tx.amount;
      if (tx.type === 'expense') return sum - tx.amount;
      return sum;
    }, 0);
    return buildMonthlySavingsTargetSnapshot({
      targetMonthlySavings: monthlySavingsTarget,
      netSavedSoFar,
      now,
    });
  }, [monthlySavingsTarget, transactions, budgetNowMs]);

  const personalizedSavingsSuggestions = useMemo(
    () =>
      buildPersonalizedSavingsSuggestions({
        transactions,
        subscriptions,
        now: new Date(budgetNowMs),
      }),
    [transactions, subscriptions, budgetNowMs],
  );

  const saveMonthlySavingsTarget = (value: number) => {
    setMonthlySavingsTarget(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SAVINGS_TARGET_STORAGE_KEY, String(value));
    }
  };

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
    await yieldForPaint();
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
      await yieldForPaint();
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
    await yieldForPaint();
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
          className="px-4 py-2.5 rounded-md bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto focus-app"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Create budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-surface-raised border border-surface-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-surface-elevated rounded-xl flex items-center justify-center mx-auto mb-4 border border-surface-border">
            <BudgetIcon className="w-8 h-8 text-content-muted" />
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-2">No budgets yet</h3>
          <p className="text-sm text-content-tertiary mb-8 max-w-sm mx-auto">Add a limit per category so you can see spending against it each month.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-6 py-3 rounded-md bg-brand-cta hover:bg-brand-cta-hover active:scale-[0.98] text-surface-base text-sm font-sans font-semibold transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            Create your first budget
          </button>
        </div>
      ) : (
        <>
          <CollapsibleModule title="Savings Target" icon={PlanningIcon}>
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-border bg-surface-elevated p-4">
                <label className="block text-xs font-medium text-content-tertiary mb-2">Monthly savings target</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-full max-w-xs">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-content-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={monthlySavingsTarget}
                      onChange={(e) => saveMonthlySavingsTarget(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-surface-base border border-surface-border rounded-md pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field"
                    />
                  </div>
                  <span className="text-xs text-content-tertiary">per month</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-surface-border bg-surface-elevated p-3">
                  <p className="text-xs text-content-tertiary">Saved so far</p>
                  <p className="mt-1 font-mono text-content-primary">${monthlySavingsSnapshot.netSavedSoFar.toFixed(0)}</p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-elevated p-3">
                  <p className="text-xs text-content-tertiary">Projected end-of-month</p>
                  <p className="mt-1 font-mono text-content-primary">${monthlySavingsSnapshot.projectedEndOfMonthSavings.toFixed(0)}</p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-elevated p-3">
                  <p className="text-xs text-content-tertiary">Status</p>
                  <p
                    className={`mt-1 font-medium ${monthlySavingsSnapshot.status === 'ahead'
                        ? 'text-emerald-300'
                        : monthlySavingsSnapshot.status === 'behind'
                          ? 'text-rose-300'
                          : 'text-amber-300'
                      }`}
                  >
                    {monthlySavingsSnapshot.status === 'ahead'
                      ? 'Ahead of pace'
                      : monthlySavingsSnapshot.status === 'behind'
                        ? 'Behind pace'
                        : 'On track'}
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleModule>

          {personalizedSavingsSuggestions.length > 0 && (
            <CollapsibleModule title="Personalized Savings Suggestions" icon={PlanningIcon} defaultOpen={false}>
              <div className="space-y-3">
                {personalizedSavingsSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-xl border border-surface-border bg-surface-elevated p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-content-primary">{suggestion.headline}</p>
                        <p className="mt-1 text-xs text-content-secondary">{suggestion.rationale}</p>
                        <p className="mt-1 text-xs text-content-tertiary">{suggestion.action}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-mono text-emerald-300">
                        Save ~${suggestion.estimatedMonthlySavings.toFixed(0)}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleModule>
          )}

          {projectedRiskBudgets.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm font-medium text-amber-300">
                Heads up: {projectedRiskBudgets.length} {projectedRiskBudgets.length === 1 ? 'category is' : 'categories are'} on pace to overspend.
              </p>
              <p className="mt-1 text-xs text-content-secondary">
                Slow spend in these categories now to avoid end-of-period surprises.
              </p>
            </div>
          )}
          <CollapsibleModule
            title="Budget Limits"
            icon={BudgetIcon}
            extraHeader={<span className="text-xs font-sans text-content-tertiary">{budgets.length} active</span>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 -mx-6 -my-6 p-6">
              {budgets.map((budget) => {
                const snapshot = snapshotByBudgetId.get(budget.id);
                if (!snapshot) return null;
                const {
                  spent,
                  rolloverCredit,
                  effectiveBudget,
                  percentage,
                  isOverBudget,
                  isNearLimit,
                  isProjectedToOverspend,
                  projectedEndSpend,
                } = snapshot;

                let progressColor = 'bg-brand-cta';
                if (isOverBudget) progressColor = 'bg-red-500';
                else if (isNearLimit) progressColor = 'bg-amber-500';

                return (
                  <div
                    key={budget.id}
                    className="bg-surface-elevated rounded-xl border border-surface-border p-5 flex flex-col relative group hover:border-content-primary/15 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
                          {formatCategoryLabel(budget.category)}
                          {anomalyMap[budget.category] && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                              ↑{anomalyMap[budget.category].overagePercent.toFixed(0)}%
                            </span>
                          )}
                        </h3>
                        <p className="metric-label mt-1.5 normal-case">{budget.period} limit</p>
                        {(budget.lockMode ?? 'none') !== 'none' && (
                          <p className="mt-1 text-xs font-medium text-amber-400 uppercase tracking-wide">
                            {(budget.lockMode ?? 'none') === 'hard' ? 'Hard lock' : 'Soft lock'}
                          </p>
                        )}
                        {budget.rolloverEnabled && rolloverCredit > 0 && (
                          <p className="mt-1 text-xs font-medium text-emerald-400">
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
                                    className={`${active ? 'bg-surface-elevated text-content-primary' : 'text-content-tertiary'
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
                                    className={`${active ? 'bg-surface-elevated text-brand-expense' : 'text-red-900'
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

                    <div className="w-full bg-surface-raised border border-surface-border rounded-xl h-1.5 mb-2 overflow-hidden">
                      <div className={`${progressColor} h-full transition-all duration-700 ease-out`} style={{ width: `${percentage}%` }}></div>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between text-xs font-sans text-content-tertiary">
                      {isOverBudget ? (
                        <span className="text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Over Budget</span>
                      ) : isProjectedToOverspend ? (
                        <span className="text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" /> Projected over (${projectedEndSpend.toFixed(0)})
                        </span>
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
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-xl bg-surface-raised border border-surface-border shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <Dialog.Title className="text-base font-sans font-semibold text-content-primary">
                {isEditModalOpen ? 'Edit budget' : 'New budget'}
              </Dialog.Title>
              <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="focus-app rounded text-content-tertiary hover:text-content-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
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
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-surface-base border border-surface-border rounded-md pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field transition-colors"
                    placeholder="0.00"
                  />
                </div>
                {selectedSinkingFundSuggestion !== null && (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-surface-border bg-surface-elevated px-3 py-2">
                    <p className="text-xs text-content-secondary">
                      Suggested sinking-fund target for this category:
                      <span className="ml-1 font-mono text-content-primary">
                        ${selectedSinkingFundSuggestion.toFixed(2)}/mo
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: selectedSinkingFundSuggestion.toFixed(2) })}
                      className="text-xs font-medium text-content-primary hover:text-content-secondary focus-app rounded-full px-2 py-1"
                    >
                      Use target
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Period</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value as Budget['period'] })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                >
                  {BUDGET_PERIODS.map((period) => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-base p-3">
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
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
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
                  className="px-6 py-2 rounded-md bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold transition-colors shadow-sm"
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
