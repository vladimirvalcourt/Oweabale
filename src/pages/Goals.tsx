import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Target, Plus, TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Goals() {
  const { goals, addGoal, addGoalProgress, deleteGoal } = useStore();
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    type: 'savings' as 'savings' | 'payoff',
  });

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    addGoal({
      name: newGoal.name,
      targetAmount: Number(newGoal.targetAmount),
      currentAmount: Number(newGoal.currentAmount) || 0,
      deadline: newGoal.deadline,
      type: newGoal.type as any,
      color: newGoal.type === 'payoff' ? '#dc3545' : '#007bff',
    });

    toast.success('Goal created successfully');
    setIsAddingGoal(false);
    setNewGoal({ name: '', targetAmount: '', currentAmount: '', deadline: '', type: 'savings' });
  };

  const handleUpdateProgress = (id: string, currentAmount: number, targetAmount: number) => {
    const amountToAdd = window.prompt('Enter amount to add/subtract:');
    if (amountToAdd === null || amountToAdd === '') return;
    
    const numAmount = Number(amountToAdd);
    if (isNaN(numAmount)) {
      toast.error('Please enter a valid number');
      return;
    }

    addGoalProgress(id, numAmount);
    toast.success('Progress updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Financial Goals</h1>
          <p className="text-sm text-zinc-400 mt-1">Track your savings targets and debt payoff plans.</p>
        </div>
        <button
          onClick={() => setIsAddingGoal(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </button>
      </div>

      {isAddingGoal && (
        <div className="bg-[#141414] rounded-lg border border-[#262626] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA]">Create New Goal</h3>
            <button onClick={() => setIsAddingGoal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <span className="sr-only">Close</span>
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-zinc-300">Goal Name</label>
                <input
                  type="text"
                  required
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors"
                  placeholder="e.g., Emergency Fund"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300">Goal Type</label>
                <select
                  value={newGoal.type}
                  onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as any })}
                  className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors"
                >
                  <option value="savings">Savings</option>
                  <option value="payoff">Debt Payoff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300">Target Amount</label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors"
                    placeholder="10000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300">Current Amount (Optional)</label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                    className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-zinc-300">Target Date</label>
                <input
                  type="date"
                  required
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
              >
                Save Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 && !isAddingGoal ? (
        <div className="bg-[#141414] rounded-lg border border-[#262626] border-dashed p-12 text-center">
          <div className="w-16 h-16 border border-[#262626] rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA] mb-2">No goals set yet</h3>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-6">
            Setting financial goals helps you stay focused and motivated. Create your first savings or debt payoff goal today.
          </p>
          <button
            onClick={() => setIsAddingGoal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const isCompleted = progress >= 100;
            const isSavings = goal.type === 'savings';

            return (
              <div key={goal.id} className="bg-[#141414] rounded-lg border border-[#262626] overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full border border-[#262626] flex items-center justify-center text-zinc-400`}>
                        {isSavings ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#FAFAFA]">{goal.name}</h3>
                        <p className="text-xs text-zinc-500 capitalize">{goal.type} Goal • Target: {new Date(goal.deadline).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="inline-flex items-center text-xs font-medium text-[#22C55E]">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                      </span>
                    )}
                  </div>

                  <div className="mb-2 flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-bold tabular-nums text-[#FAFAFA]">${goal.currentAmount.toLocaleString()}</span>
                      <span className="text-sm text-zinc-500 ml-1">/ ${goal.targetAmount.toLocaleString()}</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{progress.toFixed(1)}%</span>
                  </div>

                  <div className="w-full bg-[#1F1F1F] rounded-full h-2.5 mb-6">
                    <div
                      className={`h-2.5 rounded-full ${isCompleted ? 'bg-[#22C55E]' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#1F1F1F]">
                    <button
                      onClick={() => handleUpdateProgress(goal.id, goal.currentAmount, goal.targetAmount)}
                      disabled={isCompleted}
                      className="text-sm font-medium text-indigo-500 hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Update Progress
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this goal?')) {
                          deleteGoal(goal.id);
                          toast.success('Goal deleted');
                        }
                      }}
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
      )}
    </div>
  );
}
