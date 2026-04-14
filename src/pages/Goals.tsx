import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Goal } from '../store/useStore';
import { Target, Plus, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { CollapsibleModule } from '../components/CollapsibleModule';
export default function Goals() {
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

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    const ok = await addGoal({
      name: newGoal.name,
      targetAmount: Number(newGoal.targetAmount),
      currentAmount: Number(newGoal.currentAmount) || 0,
      deadline: newGoal.deadline,
      type: newGoal.type,
      color: newGoal.type === 'debt' ? '#dc3545' : newGoal.type === 'emergency' ? '#f59e0b' : '#6366f1',
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
    const ok = await addGoalProgress(id, numAmount);
    if (!ok) return;
    toast.success('Progress updated');
    setProgressInput(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Goals Overview</h1>
          <p className="text-sm text-content-tertiary mt-1">Savings, debt payoff, and emergency fund targets.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingGoal(true)}
          className="px-4 py-2.5 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Add goal
        </button>
      </div>

      {isAddingGoal && (
        <div className="bg-surface-raised rounded-sm border border-surface-border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-sans font-semibold text-content-primary">New goal</h3>
            <button onClick={() => setIsAddingGoal(false)} className="text-content-tertiary hover:text-content-secondary transition-colors">
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
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus-app-field-indigo transition-colors"
                  placeholder="e.g., EMERGENCY FUND"
                />
              </div>
              <div>
                <label className="block text-xs font-sans font-medium text-content-tertiary mb-2">Type</label>
                <select
                  value={newGoal.type}
                  onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as Goal['type'] })}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus-app-field-indigo transition-colors"
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
                    className="w-full bg-surface-base border border-surface-border rounded-sm pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field-indigo transition-colors"
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
                    className="w-full bg-surface-base border border-surface-border rounded-sm pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field-indigo transition-colors"
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
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus-app-field-indigo transition-colors"
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
                className="px-6 py-2 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold transition-colors shadow-sm"
              >
                Save goal
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 && !isAddingGoal ? (
        <div className="bg-surface-raised rounded-sm border border-surface-border border-dashed p-12 text-center">
          <div className="w-16 h-16 border border-surface-border rounded-sm flex items-center justify-center mx-auto mb-4 bg-surface-elevated">
            <Target className="w-8 h-8 text-content-muted" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-content-primary mb-2">No goals yet</h3>
          <p className="text-sm text-content-tertiary max-w-sm mx-auto mb-8">Set a target amount and date—progress updates as you add money.</p>
          <button
            type="button"
            onClick={() => setIsAddingGoal(true)}
            className="px-8 py-3 rounded-sm bg-brand-cta hover:bg-brand-cta-hover active:scale-[0.98] text-white text-sm font-sans font-semibold transition-colors flex items-center gap-2 mx-auto shadow-sm"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            Create your first goal
          </button>
        </div>
      ) : (
        <CollapsibleModule 
          title="Your Goals"
          icon={Target}
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
                  className="bg-surface-elevated rounded-sm border border-surface-border overflow-hidden group hover:border-white/15 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-sm border border-surface-border flex items-center justify-center bg-surface-base transition-colors`}>
                          {isSavings ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-indigo-500" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-content-primary">{goal.name}</h3>
                          <p className="text-xs text-content-tertiary mt-1.5 capitalize">{goal.type} · due {new Date(goal.deadline).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {isCompleted && (
                        <span className="inline-flex items-center text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-500">
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
                        className={`h-2 rounded-none ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>

                    {/* Monthly contribution needed */}
                    {!isCompleted && (() => {
                      const monthsLeft = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
                      const needed = (goal.targetAmount - goal.currentAmount) / monthsLeft;
                      return (
                        <div className="flex items-center justify-between bg-surface-base border border-surface-border rounded-sm px-3 py-2 mb-4">
                          <span className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Needed / month</span>
                          <span className="text-sm font-mono font-bold text-indigo-400">${needed.toFixed(0)}/mo</span>
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
                          className="flex-1 bg-surface-base border border-surface-border rounded-sm px-3 py-1.5 text-sm font-mono text-content-primary focus-app-field-indigo transition-colors"
                        />
                        <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold transition-colors">
                          Save
                        </button>
                        <button type="button" onClick={() => setProgressInput(null)} className="px-3 py-1.5 text-content-tertiary hover:text-white transition-colors text-xs">
                          Cancel
                        </button>
                      </form>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-surface-highlight">
                      <button
                        onClick={() => handleUpdateProgress(goal.id)}
                        disabled={isCompleted}
                        className="text-sm font-medium text-indigo-500 hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Update Progress
                      </button>
                      <button
                        onClick={async () => { const ok = await deleteGoal(goal.id); if (ok) toast.success('Goal deleted'); }}
                        className="text-sm font-medium text-[#EF4444] hover:text-[#DC2626] transition-colors"
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
