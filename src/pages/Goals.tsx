import React, { useMemo, useState } from 'react';
import { useStore } from '@/store';
import type { Goal } from '@/store';
import { Target, Plus, TrendingUp, TrendingDown, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CollapsibleModule } from '@/components/common';
import { yieldForPaint } from '@/lib/utils';
import { getCustomIcon } from '@/lib/utils';

const ACCOUNTABILITY_CHECKIN_KEY = 'oweable_accountability_checkins_v1';
export default function Goals() {
  const GoalsIcon = getCustomIcon('goals');
  const { goals, addGoal, addGoalProgress, deleteGoal } = useStore();
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [progressInput, setProgressInput] = useState<{ id: string; value: string } | null>(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    type: 'savings' as Goal['type'],
  });
  const [checkInText, setCheckInText] = useState('');
  const [checkIns, setCheckIns] = useState<Array<{ at: string; note: string }>>(() => {
    try {
      const raw = localStorage.getItem(ACCOUNTABILITY_CHECKIN_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<{ at: string; note: string }>;
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[Goals] Failed to read accountability check-ins from localStorage:', err);
      return [];
    }
  });

  const persistCheckIns = (next: Array<{ at: string; note: string }>) => {
    setCheckIns(next);
    try {
      localStorage.setItem(ACCOUNTABILITY_CHECKIN_KEY, JSON.stringify(next.slice(0, 20)));
    } catch (err) {
      console.warn('[Goals] Failed to save accountability check-ins to localStorage:', err);
    }
  };

  const checkInStreakWeeks = useMemo(() => {
    if (checkIns.length === 0) return 0;
    const sorted = [...checkIns].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    let streak = 0;
    let cursor = new Date();
    for (const entry of sorted) {
      const entryDate = new Date(entry.at);
      const weeksAgo = Math.floor((cursor.getTime() - entryDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo <= 1) {
        streak++;
        cursor = entryDate;
      } else {
        break;
      }
    }
    return streak;
  }, [checkIns]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    const targetAmount = Number(newGoal.targetAmount);
    const startingAmount = Number(newGoal.currentAmount) || 0;
    const deadlineMs = new Date(newGoal.deadline).getTime();

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error('Target amount must be greater than $0.');
      return;
    }
    if (startingAmount < 0) {
      toast.error('Starting amount cannot be negative.');
      return;
    }
    if (startingAmount > targetAmount) {
      toast.error('Starting amount cannot be greater than target amount.');
      return;
    }
    if (!Number.isFinite(deadlineMs) || deadlineMs < Date.now()) {
      toast.error('Target date must be in the future.');
      return;
    }

    await yieldForPaint();
    const ok = await addGoal({
      name: newGoal.name,
      targetAmount,
      currentAmount: startingAmount,
      deadline: newGoal.deadline,
      type: newGoal.type,
      color: newGoal.type === 'debt' ? 'var(--color-status-urgent-text)' : newGoal.type === 'emergency' ? 'var(--color-status-warning-text)' : 'var(--color-content-tertiary)',
    });
    if (!ok) return;

    toast.success('Goal created successfully');
    setIsAddingGoal(false);
    setNewGoal({ name: '', targetAmount: '', currentAmount: '', deadline: '', type: 'savings' });
  };

  const handleUpdateProgress = (id: string) => {
    setProgressInput({ id, value: '' });
  };

  const submitProgress = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const numAmount = Number(progressInput?.value);
    if (!progressInput?.value || isNaN(numAmount)) {
      toast.error('Enter a valid number');
      return;
    }
    const goal = goals.find((g) => g.id === id);
    if (!goal) {
      toast.error('Goal not found.');
      return;
    }
    const nextAmount = goal.currentAmount + numAmount;
    if (nextAmount < 0) {
      toast.error('Update would make progress negative.');
      return;
    }
    if (nextAmount > goal.targetAmount) {
      toast.error('Update exceeds target amount. Use a smaller value.');
      return;
    }
    await yieldForPaint();
    const ok = await addGoalProgress(id, numAmount);
    if (!ok) return;
    toast.success('Progress updated');
    setProgressInput(null);
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Accountability Check-in" icon={GoalsIcon} defaultOpen={false}>
        <div className="space-y-3">
          <p className="text-sm text-content-secondary">
            Weekly commitment log to stay consistent. Current streak: <span className="font-medium text-content-primary">{checkInStreakWeeks} week(s)</span>.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={checkInText}
              onChange={(e) => setCheckInText(e.target.value)}
              placeholder="What is your next money move this week?"
              className="flex-1 rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <button
              type="button"
              onClick={() => {
                const note = checkInText.trim();
                if (!note) {
                  toast.error('Add a short check-in note first.');
                  return;
                }
                const next = [{ at: new Date().toISOString(), note }, ...checkIns];
                persistCheckIns(next);
                setCheckInText('');
                toast.success('Check-in saved. Keep going.');
              }}
              className="rounded-md bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover"
            >
              Save check-in
            </button>
          </div>
          {checkIns.length > 0 && (
            <ul className="space-y-2">
              {checkIns.slice(0, 5).map((entry, idx) => (
                <li key={`${entry.at}-${idx}`} className="rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-xs">
                  <p className="text-content-primary">{entry.note}</p>
                  <p className="mt-1 text-content-tertiary">{new Date(entry.at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleModule>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Goals overview</h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">Savings, debt payoff, and emergency fund targets.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingGoal(true)}
          className="flex items-center gap-2 rounded-md bg-brand-cta px-4 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Add goal
        </button>
      </div>

      {isAddingGoal && (
        <div className="bg-surface-raised rounded-xl border border-surface-border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-sans font-semibold text-content-primary">New goal</h3>
            <button type="button" onClick={() => setIsAddingGoal(false)} className="focus-app rounded text-content-tertiary hover:text-content-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddGoal} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                  placeholder="e.g., EMERGENCY FUND"
                />
              </div>
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Type</label>
                <select
                  value={newGoal.type}
                  onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as Goal['type'] })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                >
                  <option value="savings">Savings</option>
                  <option value="debt">Debt payoff</option>
                  <option value="emergency">Emergency fund</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Target amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-content-muted">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="w-full bg-surface-base border border-surface-border rounded-md pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Starting amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-content-muted">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                    className="w-full bg-surface-base border border-surface-border rounded-md pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field transition-colors"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Target date</label>
                <input
                  type="date"
                  required
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-4 py-2 text-sm font-sans font-medium text-content-tertiary hover:text-content-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-md bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold transition-colors shadow-sm"
              >
                Save goal
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 && !isAddingGoal ? (
        <div className="space-y-4">
          {/* PAGE-05: Ghost example goal card — sets expectations before first goal is created */}
          <div className="relative rounded-md border border-surface-border border-dashed bg-surface-raised/50 p-5 opacity-60 select-none pointer-events-none">
            <div className="absolute -top-2.5 left-4 rounded-full border border-surface-border bg-surface-elevated px-2 py-0.5 text-xs font-medium text-content-muted tracking-wide">
              Example
            </div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold text-content-primary">Emergency Fund</p>
                <p className="text-xs text-content-tertiary mt-0.5">savings · Due Dec 31, 2025</p>
              </div>
              <span className="text-xs font-mono text-content-secondary">$3,200 / $6,000</span>
            </div>
            <div className="w-full rounded-full bg-surface-elevated h-2 overflow-hidden">
              <div className="h-2 rounded-full bg-content-muted/40" style={{ width: '53%' }} />
            </div>
            <p className="mt-2 text-right text-xs text-content-muted">53% complete</p>
          </div>

          <div className="bg-surface-raised rounded-xl border border-surface-border border-dashed p-12 text-center">
            <div className="w-16 h-16 border border-surface-border rounded-xl flex items-center justify-center mx-auto mb-4 bg-surface-elevated">
              <Target className="w-8 h-8 text-content-muted" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-content-primary mb-2">No goals yet</h3>
            <p className="text-sm text-content-tertiary max-w-sm mx-auto mb-8">Set a target amount and date—progress updates as you add money.</p>
            <button
              type="button"
              onClick={() => setIsAddingGoal(true)}
              className="px-8 py-3 rounded-md bg-brand-cta hover:bg-brand-cta-hover active:scale-[0.98] text-surface-base text-sm font-sans font-semibold transition-colors flex items-center gap-2 mx-auto shadow-sm"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              Create your first goal
            </button>
          </div>
        </div>
      ) : (
        <CollapsibleModule
          title="Your Goals"
          icon={GoalsIcon}
          extraHeader={<span className="text-xs font-sans text-content-tertiary">{goals.length} active</span>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mx-6 -my-6 p-6">
            {goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const isCompleted = progress >= 100;
              const isSavings = goal.type === 'savings';

              return (
                <div
                  key={goal.id}
                  className="bg-surface-elevated rounded-xl border border-surface-border overflow-hidden group hover:border-content-primary/15 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl border border-surface-border flex items-center justify-center bg-surface-base transition-colors`}>
                          {isSavings ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-content-secondary" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-content-primary">{goal.name}</h3>
                          <p className="text-xs text-content-tertiary mt-1.5 capitalize">{goal.type} · due {new Date(goal.deadline).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {isCompleted && (
                        <span className="inline-flex items-center text-xs font-mono font-bold uppercase tracking-widest text-emerald-500">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" /> FULFILLED
                        </span>
                      )}
                    </div>

                    <div className="mb-2 flex justify-between items-end">
                      <div>
                        <span className="text-2xl font-bold font-mono tabular-nums text-content-primary">${goal.currentAmount.toLocaleString()}</span>
                        <span className="text-sm text-content-tertiary ml-1">/ ${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <span className="text-sm font-medium text-content-secondary">{progress.toFixed(1)}%</span>
                    </div>

                    <div className="w-full bg-surface-base rounded-none h-2 mb-4">
                      <div
                        className={`h-2 rounded-none ${isCompleted ? 'bg-emerald-500' : 'bg-neutral-500'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>

                    {/* Monthly contribution needed */}
                    {!isCompleted && (() => {
                      const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
                      const needed = (goal.targetAmount - goal.currentAmount) / monthsLeft;
                      return (
                        <div className="flex items-center justify-between bg-surface-base border border-surface-border rounded-md px-3 py-2 mb-4">
                          <span className="text-xs font-mono text-content-tertiary uppercase tracking-wider">Needed / month</span>
                          <span className="text-sm font-mono font-bold text-content-primary">${needed.toFixed(0)}/mo</span>
                        </div>
                      );
                    })()}

                    {progressInput?.id === goal.id && (
                      <form onSubmit={(e) => submitProgress(e, goal.id)} className="flex items-center gap-2 mb-3">
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={progressInput.value}
                          onChange={(e) => setProgressInput({ id: goal.id, value: e.target.value })}
                          placeholder="Amount (+/-)"
                          className="flex-1 bg-surface-base border border-surface-border rounded-md px-3 py-1.5 text-sm font-mono text-content-primary focus-app-field transition-colors"
                        />
                        <button type="submit" className="px-3 py-1.5 bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-md text-xs font-bold transition-colors">
                          Save
                        </button>
                        <button type="button" onClick={() => setProgressInput(null)} className="px-3 py-1.5 text-content-tertiary hover:text-content-primary transition-colors text-xs">
                          Cancel
                        </button>
                      </form>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-surface-raised">
                      <button
                        onClick={() => handleUpdateProgress(goal.id)}
                        disabled={isCompleted}
                        className="text-sm font-medium text-content-secondary hover:text-content-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Update Progress
                      </button>
                      <button
                        onClick={async () => { const ok = await deleteGoal(goal.id); if (ok) toast.success('Goal deleted'); }}
                        className="text-sm font-medium text-brand-expense hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleModule>
      )}
    </div>
  );
}
