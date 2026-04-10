import React, { useState } from 'react';
import { Plus, MoreHorizontal, X, Vault, Edit2, Trash2, ArrowDownCircle, TrendingUp } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { BrandLogo } from '../components/BrandLogo';
import { motion } from 'motion/react';
import { useStore, IncomeSource } from '../store/useStore';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment, useEffect } from 'react';
import { toast } from 'sonner';
import { guessCategory } from '../lib/categorizer';

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
    status: 'active' as 'active' | 'paused',
    isTaxWithheld: true
  });

  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (formData.name.length > 2 && !isEditModalOpen) {
      const guessed = guessCategory(formData.name);
      if (guessed) {
        // Just capitalize the first letter to match "Salary" default style
        const capitalized = guessed.charAt(0).toUpperCase() + guessed.slice(1);
        setFormData(prev => ({ ...prev, category: capitalized }));
      }
    }
  }, [formData.name, isEditModalOpen]);

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
      status: 'active',
      isTaxWithheld: true
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
      status: income.status,
      isTaxWithheld: income.isTaxWithheld
    });
    setIsEditModalOpen(true);
  };

  const openDepositModal = (income: IncomeSource) => {
    setSelectedIncome(income);
    setDepositAmount(income.amount.toString());
    setIsDepositModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addIncome({
      name: formData.name,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency as any,
      category: formData.category,
      nextDate: formData.nextDate,
      status: formData.status,
      isTaxWithheld: formData.isTaxWithheld
    });
    if (!ok) return;
    setIsAddModalOpen(false);
    toast.success('Income source added');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIncome) {
      const ok = await editIncome(selectedIncome.id, {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency as any,
        category: formData.category,
        nextDate: formData.nextDate,
        status: formData.status,
        isTaxWithheld: formData.isTaxWithheld
      });
      if (!ok) return;
      setIsEditModalOpen(false);
      toast.success('Income source updated');
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIncome) {
      const ok = await recordIncomeDeposit(selectedIncome.id, parseFloat(depositAmount));
      if (!ok) return;
      setIsDepositModalOpen(false);
      toast.success('Deposit recorded');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteIncome(id);
    if (!ok) return;
    toast.success('Income source removed');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-primary">Income</h1>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-content-primary hover:bg-zinc-200 text-surface-base transition-colors flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-zinc-500 rounded-sm text-xs font-mono font-bold uppercase tracking-widest"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Income
        </button>
      </div>

      {incomes.length === 0 ? (
        <div className="bg-surface-raised rounded-sm border border-surface-border py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border border-surface-border bg-surface-elevated rounded-none flex items-center justify-center mb-4">
            <Vault className="w-5 h-5 text-zinc-500" />
          </div>
          <h2 className="text-sm font-mono font-bold tracking-widest uppercase text-content-primary mb-2">No income added yet</h2>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="mt-4 px-6 py-3 bg-content-primary hover:bg-zinc-200 text-surface-base rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-colors flex items-center gap-2 focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            Add Income Source
          </motion.button>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <CollapsibleModule 
            title="Income Overview" 
            icon={TrendingUp}
            extraHeader={<span className="text-xs font-mono text-content-primary font-bold">${totalMonthlyIncome.toLocaleString()} /mo</span>}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 -mx-6 -my-6 p-6">
              <div className="bg-surface-elevated rounded-sm border border-surface-border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Expected Monthly</p>
                </div>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-content-primary">
                  ${totalMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-surface-elevated rounded-sm border border-surface-border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Vault className="w-3.5 h-3.5 text-zinc-500" />
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Active Sources</p>
                </div>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-content-primary">
                  {activeSourcesCount} <span className="text-sm text-zinc-500 font-normal">/ {incomes.length}</span>
                </p>
              </div>
            </div>
          </CollapsibleModule>

          {/* Income Sources List */}
          <CollapsibleModule title="Your Income Sources" icon={Vault}>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 -mx-6 -my-6 p-6"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {incomes.map((income) => (
                <motion.div 
                  key={income.id} 
                  className="bg-surface-elevated rounded-sm border border-surface-border p-5 flex flex-col relative group hover:border-zinc-700 transition-colors"
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                  }}
                >
                  {income.status === 'paused' && (
                    <div className="absolute top-0 right-0 bg-surface-border text-zinc-400 text-[9px] font-mono font-bold px-2 py-1 uppercase tracking-widest border-b border-l border-surface-border">
                      PAUSED
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <BrandLogo name={income.name} />
                      <div>
                        <h3 className="text-sm font-medium text-content-primary">{income.name}</h3>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                          {income.category} {income.isTaxWithheld ? '· W-2 (Taxes Withheld)' : '· Self-Employed'}
                        </p>
                      </div>
                    </div>
                    
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="text-zinc-500 hover:text-content-primary transition-colors p-1 rounded-sm focus:outline-none">
                        <MoreHorizontal className="w-4 h-4" />
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
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-sm bg-surface-elevated border border-surface-border shadow-xl focus:outline-none z-10 py-1">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openDepositModal(income)}
                                  className={`${
                                    active ? 'bg-surface-border text-content-primary' : 'text-zinc-300'
                                  } group flex w-full items-center px-4 py-2 text-xs font-mono uppercase tracking-widest`}
                                >
                                  <ArrowDownCircle className="mr-3 h-3.5 w-3.5 text-zinc-400" />
                                  Log Deposit
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openEditModal(income)}
                                  className={`${
                                    active ? 'bg-surface-border text-content-primary' : 'text-zinc-300'
                                  } group flex w-full items-center px-4 py-2 text-xs font-mono uppercase tracking-widest`}
                                >
                                  <Edit2 className="mr-3 h-3.5 w-3.5 text-zinc-400" />
                                  Edit
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDelete(income.id)}
                                  className={`${
                                    active ? 'bg-surface-border text-red-400' : 'text-red-500'
                                  } group flex w-full items-center px-4 py-2 text-xs font-mono uppercase tracking-widest`}
                                >
                                  <Trash2 className="mr-3 h-3.5 w-3.5 text-current" />
                                  Delete
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-2xl font-bold font-mono tabular-nums text-content-primary flex items-baseline gap-1">
                      ${income.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">/ {income.frequency}</span>
                    </p>
                  </div>

                  <div className="mt-auto pt-3 border-t border-surface-border flex justify-between items-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Next Deposit</span>
                    <span className="text-xs font-mono text-content-primary">{new Date(income.nextDate).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </CollapsibleModule>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-sm bg-surface-raised border border-surface-border shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-elevated">
              <Dialog.Title className="text-xs font-mono font-bold text-content-primary uppercase tracking-widest">
                {isEditModalOpen ? 'EDIT SOURCE' : 'NEW SOURCE'}
              </Dialog.Title>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Source Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-zinc-500"
                  placeholder="ACME CORP"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 font-mono">$</span>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-surface-base border border-surface-border rounded-sm pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-zinc-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Frequency</label>
                  <select 
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Weekly">WEEKLY</option>
                    <option value="Bi-weekly">BI-WEEKLY</option>
                    <option value="Monthly">MONTHLY</option>
                    <option value="Yearly">YEARLY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Category</label>
                  <input 
                    type="text" 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-zinc-500"
                    placeholder="SALARY"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Next Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.nextDate}
                    onChange={(e) => setFormData({...formData, nextDate: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-zinc-500 css-color-scheme-dark"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'paused'})}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-zinc-500"
                >
                  <option value="active">ACTIVE</option>
                  <option value="paused">PAUSED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Tax Handling</label>
                <div className="flex items-center gap-4 bg-surface-base border border-surface-border p-3 rounded-sm">
                  <input 
                    type="checkbox"
                    checked={formData.isTaxWithheld}
                    onChange={(e) => setFormData({...formData, isTaxWithheld: e.target.checked})}
                    className="w-4 h-4 rounded-sm border-surface-border text-brand-indigo focus:ring-brand-indigo bg-surface-raised cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-[10px] font-mono font-bold text-content-primary uppercase tracking-widest">Taxes Already Withheld</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-tight">IF UNCHECKED, OWEABLE WILL AUTOMATICALLY SET ASIDE 25% FOR TAXES.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-content-primary hover:bg-zinc-200 text-surface-base rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-colors py-3 focus:outline-none"
                >
                  {isEditModalOpen ? 'SAVE CHANGES' : 'ADD INCOME'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Record Deposit Modal */}
      <Dialog open={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-sm bg-surface-raised border border-surface-border shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-elevated">
              <Dialog.Title className="text-xs font-mono font-bold text-content-primary uppercase tracking-widest">LOG DEPOSIT</Dialog.Title>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleDepositSubmit} className="p-6 space-y-4">
              <div className="bg-surface-elevated rounded-sm p-4 border border-surface-border">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Income Source</p>
                <p className="text-sm font-mono font-bold text-content-primary">{selectedIncome?.name}</p>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Amount Received ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500 font-mono">$</span>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    min="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-surface-base border border-surface-border rounded-sm pl-7 pr-3 py-2 text-xl font-mono font-bold text-content-primary focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-content-primary hover:bg-zinc-200 text-surface-base rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-colors py-3 focus:outline-none block shadow-[0_0_15px_rgba(250,250,250,0.1)]"
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
