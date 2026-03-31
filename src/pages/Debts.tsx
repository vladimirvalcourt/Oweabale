import React, { useState } from 'react';
import { Plus, MoreHorizontal, X, CreditCard, Edit2, Trash2, DollarSign } from 'lucide-react';
import { useStore, Debt } from '../store/useStore';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';

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

  const totalOutstanding = debts.reduce((sum, debt) => sum + debt.remaining, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.paid, 0);
  const totalOriginal = totalOutstanding + totalPaid;
  const overallProgress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

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
          <h1 className="text-2xl font-semibold text-gray-900">Debt Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor your liabilities and payoff progress.</p>
        </div>
        {debts.length > 0 && (
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
          >
            <Plus className="w-4 h-4" />
            Add Debt
          </button>
        )}
      </div>

      {debts.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 border-dashed py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-[#28a745]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No debts tracked yet</h2>
          <p className="text-gray-500 max-w-md mb-8">
            Monitor your liabilities, track your payoff progress, and stay on top of your financial goals. Add your first debt account to get started.
          </p>
          <button 
            onClick={openAddModal}
            className="px-6 py-3 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
          >
            <Plus className="w-5 h-5" />
            Add Your First Debt
          </button>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-500 truncate">Total Outstanding</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-sm text-gray-500">Across {debts.length} active accounts</p>
            </div>
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-500 truncate">Overall Progress</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {overallProgress.toFixed(1)}%
              </p>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-[#28a745] h-1.5 rounded-full" style={{ width: `${overallProgress}%` }}></div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-500 truncate">Total Paid Off</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-sm text-gray-500">Lifetime progress</p>
            </div>
          </div>

          {/* Debt Accounts */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Active Accounts</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {debts.map((debt) => {
                const total = debt.remaining + debt.paid;
                const progress = total > 0 ? ((debt.paid / total) * 100).toFixed(0) : '0';
                
                return (
                  <div key={debt.id} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{debt.name}</h3>
                      <p className="text-sm text-gray-500">{debt.type} • {debt.apr}% APR</p>
                    </div>
                    
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#28a745]">
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
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openPaymentModal(debt)}
                                  className={`${
                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <DollarSign className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                                  Record Payment
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openEditModal(debt)}
                                  className={`${
                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <Edit2 className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                                  Edit Details
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDelete(debt.id)}
                                  className={`${
                                    active ? 'bg-red-50 text-red-700' : 'text-red-600'
                                  } group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <Trash2 className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-500" />
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
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</p>
                      <p className="text-xl font-semibold text-gray-900">
                        ${debt.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Payment</p>
                      <p className="text-xl font-semibold text-gray-900">
                        ${debt.minPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span className="text-gray-700">Progress</span>
                      <span className="text-gray-900">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-[#28a745] h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Debt Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <Dialog.Title className="text-lg font-medium text-gray-900">
                {isEditModalOpen ? 'Edit Debt' : 'Add New Debt'}
              </Dialog.Title>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-gray-400 hover:text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Account Name *</label>
                <input type="text" id="name" value={formData.name} onChange={handleChange} required className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" placeholder="e.g., Chase Sapphire" />
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Account Type</label>
                <select id="type" value={formData.type} onChange={handleChange} className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border bg-white transition-colors">
                  <option value="Credit Card">Credit Card</option>
                  <option value="Auto Loan">Auto Loan</option>
                  <option value="Student Loan">Student Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Mortgage">Mortgage</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="remaining" className="block text-sm font-medium text-gray-700">Remaining Balance *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input type="number" step="0.01" min="0" id="remaining" value={formData.remaining} onChange={handleChange} required className="focus:ring-[#28a745] focus:border-[#28a745] block w-full pl-7 sm:text-sm border-gray-300 rounded-md py-2 border transition-colors" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label htmlFor="minPayment" className="block text-sm font-medium text-gray-700">Min. Payment *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input type="number" step="0.01" min="0" id="minPayment" value={formData.minPayment} onChange={handleChange} required className="focus:ring-[#28a745] focus:border-[#28a745] block w-full pl-7 sm:text-sm border-gray-300 rounded-md py-2 border transition-colors" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="apr" className="block text-sm font-medium text-gray-700">Interest Rate (APR) *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input type="number" step="0.01" min="0" id="apr" value={formData.apr} onChange={handleChange} required className="focus:ring-[#28a745] focus:border-[#28a745] block w-full pr-7 sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" placeholder="0.00" />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
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
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <Dialog.Title className="text-lg font-medium text-gray-900">Record Payment</Dialog.Title>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Recording a payment for <span className="font-medium text-gray-900">{selectedDebt?.name}</span>.
              </p>
              
              <div>
                <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700">Payment Amount *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    id="paymentAmount" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(e.target.value)} 
                    required 
                    className="focus:ring-[#28a745] focus:border-[#28a745] block w-full pl-7 sm:text-sm border-gray-300 rounded-md py-2 border transition-colors" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
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
