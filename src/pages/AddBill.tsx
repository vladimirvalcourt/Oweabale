import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export default function AddBill() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { bills, addBill, editBill } = useStore();
  
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    biller: '',
    amount: '',
    category: '',
    dueDate: '',
    frequency: 'monthly',
    autoPay: false,
  });

  useEffect(() => {
    if (isEditing && id) {
      const billToEdit = bills.find(b => b.id === id);
      if (billToEdit) {
        setFormData({
          biller: billToEdit.biller,
          amount: billToEdit.amount.toString(),
          category: billToEdit.category,
          dueDate: billToEdit.dueDate,
          frequency: billToEdit.frequency.toLowerCase(),
          autoPay: billToEdit.autoPay,
        });
      } else {
        toast.error('Bill not found');
        navigate('/bills');
      }
    }
  }, [id, isEditing, bills, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.biller || !formData.amount || !formData.category || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const billData = {
      biller: formData.biller,
      amount: parseFloat(formData.amount),
      category: formData.category,
      dueDate: formData.dueDate,
      frequency: formData.frequency.charAt(0).toUpperCase() + formData.frequency.slice(1),
      autoPay: formData.autoPay,
    };

    if (isEditing && id) {
      editBill(id, billData);
      toast.success('Bill updated successfully');
    } else {
      addBill({
        ...billData,
        status: 'upcoming',
      });
      toast.success('Bill added successfully');
    }
    
    navigate('/bills');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/bills" className="p-2 -ml-2 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-[#1C1C1C] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">{isEditing ? 'Edit Bill' : 'Add New Bill'}</h1>
          <p className="text-sm text-zinc-400 mt-1">Enter the details of your recurring or one-time payment.</p>
        </div>
      </div>

      <div className="bg-[#141414] rounded-lg border border-[#262626]">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Details */}
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA] mb-4">Basic Details</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="biller" className="block text-sm font-semibold text-zinc-300">Biller Name *</label>
                <div className="mt-1">
                  <input type="text" id="biller" value={formData.biller} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" placeholder="e.g., City Electric" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="amount" className="block text-sm font-semibold text-zinc-300">Amount *</label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" min="0" id="amount" value={formData.amount} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors" placeholder="0.00" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="category" className="block text-sm font-semibold text-zinc-300">Category *</label>
                <div className="mt-1">
                  <select id="category" value={formData.category} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                    <option value="">Select a category</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Housing">Housing</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#262626]" />

          {/* Timing */}
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA] mb-4">Timing & Frequency</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="dueDate" className="block text-sm font-semibold text-zinc-300">Next Due Date *</label>
                <div className="mt-1">
                  <input type="date" id="dueDate" value={formData.dueDate} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="frequency" className="block text-sm font-semibold text-zinc-300">Repeat Frequency</label>
                <div className="mt-1">
                  <select id="frequency" value={formData.frequency} onChange={handleChange} className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                    <option value="none">Does not repeat</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#262626]" />

          {/* Preferences */}
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA] mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input id="autoPay" type="checkbox" checked={formData.autoPay} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="autoPay" className="font-medium text-zinc-200">Auto-Pay Enabled</label>
                  <p className="text-zinc-500">Automatically mark this bill as paid on its due date.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input id="reminders" type="checkbox" defaultChecked className="focus:ring-indigo-500 h-4 w-4 text-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="reminders" className="font-medium text-zinc-200">Send Reminders</label>
                  <p className="text-zinc-500">Receive an email notification 3 days before the due date.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-[#262626] flex justify-end gap-3">
            <Link to="/bills" className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
              Cancel
            </Link>
            <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
              {isEditing ? 'Save Changes' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
