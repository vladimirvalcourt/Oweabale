import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Goal } from '../store/useStore';
import { Target, Plus, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { motion } from 'motion/react';

export default function Goals() {
  const { goals, addGoal, addGoalProgress, deleteGoal } = useStore();
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    type: 'savings' as Goal['type'],
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
      type: newGoal.type,
      color: newGoal.type === 'debt' ? '#dc3545' : newGoal.type === 'emergency' ? '#f59e0b' : '#6366f1',
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
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Goals Overview</h1>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">Capital accumulation & debt liquidation</p>
        </div>
        <button
          onClick={() => setIsAddingGoal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Confirm Goal
        </button>
      </div>

      {isAddingGoal && (
        <div className="bg-surface-raised rounded-sm border border-surface-border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-content-primary">Goal Definition</h3>
            <button onClick={() => setIsAddingGoal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddGoal} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g., EMERGENCY FUND"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Operation Type</label>
                <select
                  value={newGoal.type}
                  onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as Goal['type'] })}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono uppercase text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="savings">SAVINGS</option>
                  <option value="debt">DEBT PAYOFF</option>
                  <option value="emergency">EMERGENCY FUND</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Target Magnitude</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-600">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="w-full bg-surface-base border border-surface-border rounded-sm pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Initial State</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-600">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                    className="w-full bg-surface-base border border-surface-border rounded-sm pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Finalization Date</label>
                <input
                  type="date"
                  required
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
              >
                Abort
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/10"
              >
                Save Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 && !isAddingGoal ? (
        <div className="bg-surface-raised rounded-sm border border-surface-border border-dashed p-12 text-center">
          <div className="w-16 h-16 border border-surface-border rounded-sm flex items-center justify-center mx-auto mb-4 bg-surface-elevated">
            <Target className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-content-primary mb-2 uppercase">Zero Objectives Detected</h3>
          <p className="text-[10px] font-mono text-zinc-500 max-w-sm mx-auto mb-8 uppercase tracking-[0.15em]">Establish financial targets to begin tracking.</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingGoal(true)}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Getting Started
          </motion.button>
        </div>
      ) : (
        <CollapsibleModule 
          title="Active Objectives" 
          icon={Target}
          extraHeader={<span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{goals.length} Objectives Active</span>}
        >
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 -mx-6 -my-6 p-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const isCompleted = progress >= 100;
              const isSavings = goal.type === 'savings';

              return (
                <motion.div 
                  key={goal.id} 
                  className="bg-surface-elevated rounded-sm border border-surface-border overflow-hidden group hover:border-zinc-700 transition-colors"
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-sm border border-surface-border flex items-center justify-center bg-surface-base transition-colors`}>
                          {isSavings ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-indigo-500" />}
                        </div>
                        <div>
                          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-content-primary">{goal.name}</h3>
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1.5">{goal.type} goal • target: {new Date(goal.deadline).toLocaleDateString()}</p>
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
                        <span className="text-sm text-zinc-500 ml-1">/ ${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <span className="text-sm font-medium text-zinc-300">{progress.toFixed(1)}%</span>
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
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Needed / month</span>
                          <span className="text-sm font-mono font-bold text-indigo-400">${needed.toFixed(0)}/mo</span>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between pt-4 border-t border-surface-highlight">
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
                </motion.div>
              );
            })}
          </motion.div>
        </CollapsibleModule>
      )}
    </div>
  );
}
