import React, { useState } from 'react';
import { Plus, MoreHorizontal, X, Wallet, Edit2, Trash2, ArrowDownCircle, TrendingUp } from 'lucide-react';
import { useStore, IncomeSource } from '../store/useStore';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';

export default function Income() {
  const { incomes, addIncome, editIncome, deleteIncome, recordIncomeDeposit } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeSource | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'Monthly',
    category: 'Salary',
    nextDate: new Date().toISOString().split('T')[0],
    status: 'active' as const
  });

  const [depositAmount, setDepositAmount] = useState('');

  const calculateMonthlyExpected = () => {
    return incomes.reduce((sum, income) => {
      if (income.status !== 'active') return sum;
      let monthlyAmount = income.amount;
      if (income.frequency === 'Weekly') monthlyAmount = income.amount * 4.33;
      if (income.frequency === 'Bi-weekly') monthlyAmount = income.amount * 2.16;
      if (income.frequency === 'Yearly') monthlyAmount = income.amount / 12;
      return sum + monthlyAmount;
    }, 0);
  };

  const totalMonthlyIncome = calculateMonthlyExpected();
  const activeSourcesCount = incomes.filter(i => i.status === 'active').length;

  const openAddModal = () => {
    setFormData({
      name: '',
      amount: '',
      frequency: 'Monthly',
      category: 'Salary',
      nextDate: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (income: IncomeSource) => {
    setSelectedIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount.toString(),
      frequency: income.frequency,
      category: income.category,
      nextDate: income.nextDate,
      status: income.status
    });
    setIsEditModalOpen(true);
  };

  const openDepositModal = (income: IncomeSource) => {
    setSelectedIncome(income);
    setDepositAmount(income.amount.toString());
    setIsDepositModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addIncome({
      name: formData.name,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency as any,
      category: formData.category,
      nextDate: formData.nextDate,
      status: formData.status
    });
    setIsAddModalOpen(false);
    toast.success('Income source added successfully');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIncome) {
      editIncome(selectedIncome.id, {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency as any,
        category: formData.category,
        nextDate: formData.nextDate,
        status: formData.status
      });
      setIsEditModalOpen(false);
      toast.success('Income source updated successfully');
    }
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIncome) {
      recordIncomeDeposit(selectedIncome.id, parseFloat(depositAmount));
      setIsDepositModalOpen(false);
      toast.success('Deposit recorded successfully');
    }
  };

  const handleDelete = (id: string) => {
    deleteIncome(id);
    toast.success('Income source deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Income Streams</h1>
          <p className="text-sm text-zinc-400 mt-1">Track your expected income sources and record deposits.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4" />
          Add Income
        </button>
      </div>

      {incomes.length === 0 ? (
        <div className="bg-[#141414] rounded-lg border border-[#262626] border-dashed py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 border border-[#262626] rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#FAFAFA] mb-2">No income sources yet</h2>
          <p className="text-zinc-400 max-w-md mb-8">
            Add your salary, freelance work, or other income streams to track your expected earnings.
          </p>
          <button 
            onClick={openAddModal}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
          >
            <Plus className="w-5 h-5" />
            Add First Income
          </button>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="bg-[#141414] overflow-hidden rounded-lg border border-[#262626] p-5">
              <div className="flex items-center gap-3 mb-1">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <p className="text-sm font-medium text-zinc-500 truncate">Expected Monthly Income</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#FAFAFA]">
                ${totalMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-sm text-zinc-500">Based on active sources</p>
            </div>
            <div className="bg-[#141414] overflow-hidden rounded-lg border border-[#262626] p-5">
              <div className="flex items-center gap-3 mb-1">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <p className="text-sm font-medium text-zinc-500 truncate">Active Sources</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#FAFAFA]">
                {activeSourcesCount}
              </p>
              <p className="mt-1 text-sm text-zinc-500">Out of {incomes.length} total sources</p>
            </div>
          </div>

          {/* Income Sources List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-[#FAFAFA]">Your Income Streams</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {incomes.map((income) => (
                <div key={income.id} className="bg-[#141414] rounded-lg border border-[#262626] p-5 flex flex-col relative overflow-hidden">
                  {income.status === 'paused' && (
                    <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-bl-lg">
                      Paused
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-[#FAFAFA]">{income.name}</h3>
                      <p className="text-sm text-zinc-500">{income.category}</p>
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
                                  onClick={() => openDepositModal(income)}
                                  className={`${
                                    active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <ArrowDownCircle className="mr-3 h-4 w-4 text-emerald-500" />
                                  Record Deposit
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openEditModal(income)}
                                  className={`${
                                    active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <Edit2 className="mr-3 h-4 w-4 text-zinc-500" />
                                  Edit Details
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDelete(income.id)}
                                  className={`${
                                    active ? 'bg-[#1C1C1C] text-[#EF4444]' : 'text-[#7F1D1D]'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <Trash2 className="mr-3 h-4 w-4 text-current" />
                                  Delete Source
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-2xl font-bold tabular-nums text-[#FAFAFA] flex items-baseline gap-1">
                      ${income.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <span className="text-sm font-normal text-zinc-500">/ {income.frequency.toLowerCase()}</span>
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#262626] flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Next expected:</span>
                    <span className="text-zinc-300 font-medium">{new Date(income.nextDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-[#141414] border border-[#262626] shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-[#262626]">
              <Dialog.Title className="text-lg font-semibold text-[#FAFAFA]">
                {isEditModalOpen ? 'Edit Income Source' : 'Add Income Source'}
              </Dialog.Title>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Source Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Tech Corp Salary"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Amount</label>
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
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Frequency</label>
                  <select 
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
                  <input 
                    type="text" 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., Salary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Next Expected Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.nextDate}
                    onChange={(e) => setFormData({...formData, nextDate: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'paused'})}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
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
                  {isEditModalOpen ? 'Save Changes' : 'Add Income'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Record Deposit Modal */}
      <Dialog open={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-[#141414] border border-[#262626] shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-[#262626]">
              <Dialog.Title className="text-lg font-semibold text-[#FAFAFA]">Record Deposit</Dialog.Title>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleDepositSubmit} className="p-6 space-y-4">
              <div className="bg-[#1C1C1C] rounded-md p-4 mb-4 border border-[#262626]">
                <p className="text-sm text-zinc-400">Recording deposit for</p>
                <p className="font-medium text-[#FAFAFA]">{selectedIncome?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Deposit Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500">$</span>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    min="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md pl-7 pr-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-emerald-500"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
