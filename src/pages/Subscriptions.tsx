import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Repeat, Plus, Edit2, Trash2, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function Subscriptions() {
  const { subscriptions, addSubscription, editSubscription, deleteSubscription } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'Monthly' as 'Monthly' | 'Yearly' | 'Weekly',
    nextBillingDate: '',
    status: 'active' as 'active' | 'paused' | 'cancelled',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.nextBillingDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    addSubscription({
      name: formData.name,
      amount: Number(formData.amount),
      frequency: formData.frequency,
      nextBillingDate: formData.nextBillingDate,
      status: formData.status,
    });

    toast.success('Subscription added successfully');
    setIsAdding(false);
    setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formData.name || !formData.amount || !formData.nextBillingDate) return;

    editSubscription(editingId, {
      name: formData.name,
      amount: Number(formData.amount),
      frequency: formData.frequency,
      nextBillingDate: formData.nextBillingDate,
      status: formData.status,
    });

    toast.success('Subscription updated');
    setEditingId(null);
    setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
  };

  const startEdit = (sub: any) => {
    setEditingId(sub.id);
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      frequency: sub.frequency,
      nextBillingDate: sub.nextBillingDate,
      status: sub.status,
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      deleteSubscription(id);
      toast.success('Subscription deleted');
    }
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const monthlyCost = activeSubscriptions.reduce((acc, sub) => {
    return acc + (sub.frequency === 'Monthly' ? sub.amount : sub.frequency === 'Yearly' ? sub.amount / 12 : sub.amount * 4.33);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your recurring payments and track monthly costs.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
          }}
          className="inline-flex items-center justify-center px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500 truncate">Total Monthly Cost</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            ${monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-sm text-gray-500">Across {activeSubscriptions.length} active subscriptions</p>
        </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? 'Edit Subscription' : 'Add New Subscription'}
            </h3>
            <button onClick={() => { setIsAdding(false); cancelEdit(); }} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors"
                  placeholder="e.g., Netflix"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="focus:ring-[#28a745] focus:border-[#28a745] block w-full pl-7 sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Next Billing Date</label>
                <input
                  type="date"
                  required
                  value={formData.nextBillingDate}
                  onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                  className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setIsAdding(false); cancelEdit(); }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
              >
                {editingId ? 'Save Changes' : 'Add Subscription'}
              </button>
            </div>
          </form>
        </div>
      )}

      {subscriptions.length === 0 && !isAdding ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Repeat className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Track your recurring payments like Netflix, Spotify, or gym memberships.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Subscription
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{sub.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        sub.status === 'active' ? 'bg-green-100 text-green-800' :
                        sub.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">Renews {sub.nextBillingDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${sub.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{sub.frequency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(sub)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
