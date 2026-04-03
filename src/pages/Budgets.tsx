import React, { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, X, PieChart, Edit2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore, Budget } from '../store/useStore';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';

export default function Budgets() {
  const { budgets, transactions, addBudget, editBudget, deleteBudget, categories } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'Monthly' as const
  });

  const expenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name);

  // Calculate spending per category for the current month
  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const spending: Record<string, number> = {};
    
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const tDate = new Date(t.date);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
          spending[t.category] = (spending[t.category] || 0) + t.amount;
        }
      }
    });
    return spending;
  }, [transactions]);

  const openAddModal = () => {
    setFormData({
      category: expenseCategories[0] || '',
      amount: '',
      period: 'Monthly'
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period
    });
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBudget({
      category: formData.category,
      amount: parseFloat(formData.amount),
      period: formData.period
    });
    setIsAddModalOpen(false);
    toast.success('Budget added successfully');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBudget) {
      editBudget(selectedBudget.id, {
        category: formData.category,
        amount: parseFloat(formData.amount),
        period: formData.period
      });
      setIsEditModalOpen(false);
      toast.success('Budget updated successfully');
    }
  };

  const handleDelete = (id: string) => {
    deleteBudget(id);
    toast.success('Budget deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Budget Planner</h1>
          <p className="text-sm text-zinc-400 mt-1">Set spending limits and track your progress.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4" />
          Create Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-[#1C1C1C] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#262626]">
            <PieChart className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-[#FAFAFA] mb-2">No budgets set</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">Create budgets for different categories to keep your spending in check.</p>
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4" />
            Create First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((budget) => {
            const spent = currentMonthSpending[budget.category] || 0;
            const percentage = Math.min(100, (spent / budget.amount) * 100);
            const isOverBudget = spent > budget.amount;
            const isNearLimit = percentage >= 80 && !isOverBudget;
            
            let progressColor = 'bg-indigo-500';
            if (isOverBudget) progressColor = 'bg-red-500';
            else if (isNearLimit) progressColor = 'bg-amber-500';

            return (
              <div key={budget.id} className="bg-[#141414] rounded-lg border border-[#262626] p-5 flex flex-col relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#FAFAFA]">{budget.category}</h3>
                    <p className="text-sm text-zinc-500">{budget.period} Budget</p>
                  </div>
                  
                  <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md focus:outline-none">
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
                      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-[#141414] border border-[#262626] shadow-xl focus:outline-none z-10 py-1">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => openEditModal(budget)}
                                className={`${
                                  active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400'
                                } group flex w-full items-center px-4 py-2 text-sm`}
                              >
                                <Edit2 className="mr-3 h-4 w-4 text-zinc-500" />
                                Edit Budget
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleDelete(budget.id)}
                                className={`${
                                  active ? 'bg-[#1C1C1C] text-[#EF4444]' : 'text-[#7F1D1D]'
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
                
                <div className="mb-2 flex justify-between items-end">
                  <p className="text-2xl font-bold tabular-nums text-[#FAFAFA]">
                    ${spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-zinc-500 mb-1">
                    of ${budget.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="w-full bg-[#262626] rounded-full h-2.5 mb-2">
                  <div className={`${progressColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                </div>

                <div className="mt-auto pt-2 flex items-center justify-between text-xs">
                  {isOverBudget ? (
                    <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Over budget by ${(spent - budget.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  ) : isNearLimit ? (
                    <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Nearing limit</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> On track</span>
                  )}
                  <span className="text-zinc-500">{percentage.toFixed(0)}% used</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-[#141414] border border-[#262626] shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-[#262626]">
              <Dialog.Title className="text-lg font-semibold text-[#FAFAFA]">
                {isEditModalOpen ? 'Edit Budget' : 'Create Budget'}
              </Dialog.Title>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select a category</option>
                  {expenseCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {/* Fallback if no categories exist */}
                  {expenseCategories.length === 0 && (
                    <option value="General">General</option>
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Budget Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500">$</span>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md pl-7 pr-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Period</label>
                <select 
                  value={formData.period}
                  onChange={(e) => setFormData({...formData, period: e.target.value as 'Monthly' | 'Yearly'})}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
                >
                  {isEditModalOpen ? 'Save Changes' : 'Create Budget'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
