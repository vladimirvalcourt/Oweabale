import React, { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, X, CreditCard, Edit2, Trash2, DollarSign, Calculator, TrendingDown } from 'lucide-react';
import { useStore, Debt } from '../store/useStore';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Debts() {
  const { debts, addDebt, editDebt, deleteDebt, addDebtPayment } = useStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Credit Card',
    remaining: '',
    minPayment: '',
    apr: '',
  });

  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'strategy'>('overview');
  const [monthlyBudget, setMonthlyBudget] = useState<number>(1000);

  const totalOutstanding = debts.reduce((sum, debt) => sum + debt.remaining, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.paid, 0);
  const totalOriginal = totalOutstanding + totalPaid;
  const overallProgress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;
  const minPaymentsSum = debts.reduce((sum, debt) => sum + debt.minPayment, 0);

  const calculatePayoff = (strategy: 'snowball' | 'avalanche') => {
    let currentDebts = debts.map(d => ({ ...d }));
    let months = 0;
    let totalInterest = 0;
    const chartData = [];

    if (strategy === 'snowball') {
      currentDebts.sort((a, b) => a.remaining - b.remaining);
    } else {
      currentDebts.sort((a, b) => b.apr - a.apr);
    }

    let totalRemaining = currentDebts.reduce((sum, d) => sum + d.remaining, 0);
    
    if (monthlyBudget < minPaymentsSum || totalRemaining === 0) {
      return { months: 0, totalInterest: 0, chartData: [] };
    }

    chartData.push({ month: 0, balance: totalRemaining });

    while (totalRemaining > 0.01 && months < 360) {
      months++;
      let budgetRemaining = monthlyBudget;
      
      for (let i = 0; i < currentDebts.length; i++) {
        if (currentDebts[i].remaining > 0) {
          const interest = currentDebts[i].remaining * (currentDebts[i].apr / 100 / 12);
          currentDebts[i].remaining += interest;
          totalInterest += interest;
          
          let payment = Math.min(currentDebts[i].minPayment, currentDebts[i].remaining);
          currentDebts[i].remaining -= payment;
          budgetRemaining -= payment;
        }
      }
      
      for (let i = 0; i < currentDebts.length; i++) {
        if (currentDebts[i].remaining > 0 && budgetRemaining > 0) {
          let extraPayment = Math.min(budgetRemaining, currentDebts[i].remaining);
          currentDebts[i].remaining -= extraPayment;
          budgetRemaining -= extraPayment;
        }
      }
      
      totalRemaining = currentDebts.reduce((sum, d) => sum + d.remaining, 0);
      chartData.push({ month: months, balance: totalRemaining });
    }

    return { months, totalInterest, chartData };
  };

  const snowballStats = useMemo(() => calculatePayoff('snowball'), [debts, monthlyBudget]);
  const avalancheStats = useMemo(() => calculatePayoff('avalanche'), [debts, monthlyBudget]);

  const openAddModal = () => {
    setFormData({ name: '', type: 'Credit Card', remaining: '', minPayment: '', apr: '' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setFormData({
      name: debt.name,
      type: debt.type,
      remaining: debt.remaining.toString(),
      minPayment: debt.minPayment.toString(),
      apr: debt.apr.toString(),
    });
    setIsEditModalOpen(true);
  };

  const openPaymentModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount('');
    setIsPaymentModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.remaining || !formData.minPayment || !formData.apr) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    addDebt({
      name: formData.name,
      type: formData.type,
      remaining: parseFloat(formData.remaining),
      minPayment: parseFloat(formData.minPayment),
      apr: parseFloat(formData.apr),
      paid: 0,
    });
    
    toast.success('Debt added successfully');
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    
    if (!formData.name || !formData.remaining || !formData.minPayment || !formData.apr) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    editDebt(selectedDebt.id, {
      name: formData.name,
      type: formData.type,
      remaining: parseFloat(formData.remaining),
      minPayment: parseFloat(formData.minPayment),
      apr: parseFloat(formData.apr),
    });
    
    toast.success('Debt updated successfully');
    setIsEditModalOpen(false);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    addDebtPayment(selectedDebt.id, amount);
    toast.success(`Payment of $${amount.toFixed(2)} recorded`);
    setIsPaymentModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this debt account?')) {
      deleteDebt(id);
      toast.success('Debt deleted successfully');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Debt Tracker</h1>
          <p className="text-sm text-zinc-400 mt-1">Monitor your liabilities and payoff progress.</p>
        </div>
        <div className="flex items-center gap-3">
          {debts.length > 0 && (
            <div className="flex bg-[#141414] border border-[#262626] rounded-md p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'overview' ? 'bg-[#262626] text-[#FAFAFA]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('strategy')}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'strategy' ? 'bg-[#262626] text-[#FAFAFA]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Strategy
              </button>
            </div>
          )}
          {debts.length > 0 && (
            <button 
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4" />
              Add Debt
            </button>
          )}
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="bg-[#141414] rounded-lg border border-[#262626] border-dashed py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 border border-[#262626] rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#FAFAFA] mb-2">No debts tracked yet</h2>
          <p className="text-zinc-400 max-w-md mb-8">
            Monitor your liabilities, track your payoff progress, and stay on top of your financial goals. Add your first debt account to get started.
          </p>
          <button 
            onClick={openAddModal}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
          >
            <Plus className="w-5 h-5" />
            Add Your First Debt
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'overview' ? (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="bg-[#141414] overflow-hidden rounded-lg border border-[#262626] p-5">
                  <p className="text-sm font-medium text-zinc-500 truncate">Total Outstanding</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#FAFAFA]">
                    ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">Across {debts.length} active accounts</p>
                </div>
                <div className="bg-[#141414] overflow-hidden rounded-lg border border-[#262626] p-5">
                  <p className="text-sm font-medium text-zinc-500 truncate">Overall Progress</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#FAFAFA]">
                    {overallProgress.toFixed(1)}%
                  </p>
                  <div className="mt-2 w-full bg-[#1F1F1F] rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${overallProgress}%` }}></div>
                  </div>
                </div>
                <div className="bg-[#141414] overflow-hidden rounded-lg border border-[#262626] p-5">
                  <p className="text-sm font-medium text-zinc-500 truncate">Total Paid Off</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#FAFAFA]">
                    ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">Lifetime progress</p>
                </div>
              </div>

              {/* Debt Accounts */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold tracking-tight text-[#FAFAFA]">Active Accounts</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {debts.map((debt) => {
                    const total = debt.remaining + debt.paid;
                    const progress = total > 0 ? ((debt.paid / total) * 100).toFixed(0) : '0';
                    
                    return (
                      <div key={debt.id} className="bg-[#141414] rounded-lg border border-[#262626] p-6 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-[#FAFAFA]">{debt.name}</h3>
                          <p className="text-sm text-zinc-500">{debt.type} • {debt.apr}% APR</p>
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
                                      onClick={() => openPaymentModal(debt)}
                                      className={`${
                                        active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400'
                                      } group flex w-full items-center px-4 py-2 text-sm`}
                                    >
                                      <DollarSign className="mr-3 h-4 w-4 text-zinc-500" />
                                      Record Payment
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => openEditModal(debt)}
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
                                      onClick={() => handleDelete(debt.id)}
                                      className={`${
                                        active ? 'bg-[#1C1C1C] text-[#EF4444]' : 'text-[#7F1D1D]'
                                      } group flex w-full items-center px-4 py-2 text-sm`}
                                    >
                                      <Trash2 className="mr-3 h-4 w-4 text-current" />
                                      Delete Account
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Remaining</p>
                          <p className="text-xl font-bold tabular-nums text-[#FAFAFA]">
                            ${debt.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Min. Payment</p>
                          <p className="text-xl font-bold tabular-nums text-[#FAFAFA]">
                            ${debt.minPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="flex justify-between text-sm font-medium mb-1">
                          <span className="text-zinc-400">Progress</span>
                          <span className="text-[#FAFAFA]">{progress}%</span>
                        </div>
                        <div className="w-full bg-[#1F1F1F] rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-lg border border-[#262626] p-6">
                <h2 className="text-lg font-semibold tracking-tight text-[#FAFAFA] mb-4">Payoff Calculator</h2>
                <div className="max-w-md">
                  <label htmlFor="monthlyBudget" className="block text-sm font-semibold text-zinc-300">Monthly Payment Budget</label>
                  <p className="text-xs text-zinc-500 mb-2">Must be at least the sum of your minimum payments (${minPaymentsSum.toFixed(2)}).</p>
                  <div className="relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-zinc-500 sm:text-sm">$</span>
                    </div>
                    <input 
                      type="number" 
                      id="monthlyBudget" 
                      min={minPaymentsSum}
                      value={monthlyBudget} 
                      onChange={(e) => setMonthlyBudget(Math.max(minPaymentsSum, parseFloat(e.target.value) || minPaymentsSum))} 
                      className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#141414] rounded-lg border border-[#262626] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full border border-[#262626] flex items-center justify-center bg-[#1C1C1C]">
                      <TrendingDown className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#FAFAFA]">Debt Snowball</h3>
                      <p className="text-xs text-zinc-500">Lowest balance first</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-zinc-500">Time to Debt Free</p>
                      <p className="text-2xl font-bold text-[#FAFAFA]">{snowballStats.months} months</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Total Interest Paid</p>
                      <p className="text-xl font-bold text-[#FAFAFA]">${snowballStats.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#141414] rounded-lg border border-[#262626] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full border border-[#262626] flex items-center justify-center bg-[#1C1C1C]">
                      <Calculator className="w-5 h-5 text-[#22C55E]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#FAFAFA]">Debt Avalanche</h3>
                      <p className="text-xs text-zinc-500">Highest interest first</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-zinc-500">Time to Debt Free</p>
                      <p className="text-2xl font-bold text-[#FAFAFA]">{avalancheStats.months} months</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Total Interest Paid</p>
                      <p className="text-xl font-bold text-[#FAFAFA]">${avalancheStats.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626] p-6">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-6">Payoff Projection</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSnowball" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAvalanche" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                      <XAxis dataKey="month" type="number" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 12 }} dy={10} domain={[0, 'dataMax']} allowDuplicatedCategory={false} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 12 }} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141414', borderRadius: '8px', border: '1px solid #262626', color: '#FAFAFA' }}
                        itemStyle={{ color: '#FAFAFA' }}
                        formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Balance']}
                        labelFormatter={(label) => `Month ${label}`}
                      />
                      <Area data={snowballStats.chartData} type="monotone" dataKey="balance" name="Snowball" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorSnowball)" />
                      <Area data={avalancheStats.chartData} type="monotone" dataKey="balance" name="Avalanche" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorAvalanche)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Debt Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-[#FAFAFA]">
                {isEditModalOpen ? 'Edit Debt' : 'Add New Debt'}
              </Dialog.Title>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-zinc-300">Account Name *</label>
                <input type="text" id="name" value={formData.name} onChange={handleChange} required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" placeholder="e.g., Chase Sapphire" />
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-semibold text-zinc-300">Account Type</label>
                <select id="type" value={formData.type} onChange={handleChange} className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                  <option value="Credit Card">Credit Card</option>
                  <option value="Auto Loan">Auto Loan</option>
                  <option value="Student Loan">Student Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Mortgage">Mortgage</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="remaining" className="block text-sm font-semibold text-zinc-300">Remaining Balance *</label>
                  <div className="mt-1 relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-zinc-500 sm:text-sm">$</span>
                    </div>
                    <input type="number" step="0.01" min="0" id="remaining" value={formData.remaining} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label htmlFor="minPayment" className="block text-sm font-semibold text-zinc-300">Min. Payment *</label>
                  <div className="mt-1 relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-zinc-500 sm:text-sm">$</span>
                    </div>
                    <input type="number" step="0.01" min="0" id="minPayment" value={formData.minPayment} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="apr" className="block text-sm font-semibold text-zinc-300">Interest Rate (APR) *</label>
                <div className="mt-1 relative rounded-md">
                  <input type="number" step="0.01" min="0" id="apr" value={formData.apr} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" placeholder="0.00" />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 sm:text-sm">%</span>
                  </div>
                </div>
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
                  {isEditModalOpen ? 'Save Changes' : 'Add Debt'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Add Payment Modal */}
      <Dialog open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-[#FAFAFA]">Record Payment</Dialog.Title>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <p className="text-sm text-zinc-400">
                Recording a payment for <span className="font-semibold text-[#FAFAFA]">{selectedDebt?.name}</span>.
              </p>
              
              <div>
                <label htmlFor="paymentAmount" className="block text-sm font-semibold text-zinc-300">Payment Amount *</label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 sm:text-sm">$</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    id="paymentAmount" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(e.target.value)} 
                    required 
                    className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
