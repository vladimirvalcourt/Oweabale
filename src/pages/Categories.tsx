import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Tags, Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

export default function Categories() {
  const { categories, addCategory, editCategory, deleteCategory } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#28a745',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Category name is required');
      return;
    }

    addCategory({
      name: formData.name,
      type: formData.type,
      color: formData.color,
    });

    toast.success('Category added successfully');
    setIsAdding(false);
    setFormData({ name: '', type: 'expense', color: '#28a745' });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formData.name) return;

    editCategory(editingId, {
      name: formData.name,
      type: formData.type,
      color: formData.color,
    });

    toast.success('Category updated');
    setEditingId(null);
    setFormData({ name: '', type: 'expense', color: '#28a745' });
  };

  const startEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color || '#28a745',
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'expense', color: '#28a745' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? Transactions using this category will be marked as Uncategorized.')) {
      deleteCategory(id);
      toast.success('Category deleted');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your transaction categories for better insights.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', type: 'expense', color: '#28a745' });
          }}
          className="inline-flex items-center justify-center px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? 'Edit Category' : 'Create New Category'}
            </h3>
            <button onClick={() => { setIsAdding(false); cancelEdit(); }} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors"
                  placeholder="e.g., Groceries"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-9 w-14 p-1 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{formData.color}</span>
                </div>
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
                {editingId ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 && !isAdding ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tags className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Categories help you organize your transactions and understand your spending habits.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {categories.map((category) => (
              <li key={category.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: category.color || '#28a745' }}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{category.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
