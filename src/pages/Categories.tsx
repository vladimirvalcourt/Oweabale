import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Tags, Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { toast } from 'sonner';
export default function Categories() {
  const { categories, addCategory, editCategory, deleteCategory } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#6366F1',
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
    setFormData({ name: '', type: 'expense', color: '#6366F1' });
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
    setFormData({ name: '', type: 'expense', color: '#6366F1' });
  };

  const startEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color || '#6366F1',
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'expense', color: '#6366F1' });
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
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Categories</h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-content-tertiary mt-1">Saved categories for transaction analysis</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', type: 'expense', color: '#6366F1' });
          }}
          className="px-4 py-2 bg-content-primary hover:bg-content-tertiary/25 text-surface-base rounded-lg text-xs font-mono font-bold uppercase tracking-widest transition-colors flex items-center gap-2 focus-app"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Category
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-surface-raised rounded-lg border border-surface-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold tracking-tight text-content-primary">
              {editingId ? 'Edit Category' : 'Create New Category'}
            </h3>
            <button onClick={() => { setIsAdding(false); cancelEdit(); }} className="text-content-tertiary hover:text-content-secondary transition-colors">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-content-secondary">Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 focus-app-field-indigo block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-lg px-3 py-2 border transition-colors"
                  placeholder="e.g., Groceries"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-content-secondary">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 focus-app-field-indigo block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-lg px-3 py-2 border transition-colors"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-content-secondary">Color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-9 w-14 p-1 border border-surface-border bg-surface-base rounded-lg cursor-pointer"
                  />
                  <span className="text-sm text-content-tertiary">{formData.color}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setIsAdding(false); cancelEdit(); }}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-elevated transition-colors focus-app"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-lg text-sm font-medium transition-colors focus-app"
              >
                {editingId ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 && !isAdding ? (
        <div className="bg-surface-raised rounded-lg border border-surface-border p-12 text-center">
          <div className="w-16 h-16 border border-surface-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Tags className="w-8 h-8 text-content-tertiary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-content-primary mb-2">No categories found</h3>
          <p className="text-sm text-content-tertiary max-w-sm mx-auto mb-6">
            Categories help you organize your transactions and understand your spending habits.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-white text-black hover:bg-neutral-200 active:scale-[0.98] text-black rounded-lg text-sm font-medium transition-colors focus-app"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </button>
        </div>
      ) : (
        <CollapsibleModule 
          title="Manage Categories" 
          icon={Tags}
          extraHeader={<span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">{categories.length} Categories Saved</span>}
        >
          <div className="bg-surface-raised rounded-lg border border-surface-border overflow-hidden -mx-6 -my-6">
            <ul className="divide-y divide-surface-highlight">
              {categories.map((category) => (
                <li 
                  key={category.id} 
                  className="p-4 sm:px-6 hover:bg-surface-elevated transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white border border-surface-border bg-surface-base group-hover:border-white/15 transition-colors"
                      style={{ borderLeftColor: category.color || '#6366F1', borderLeftWidth: '3px' }}
                    >
                      <Tag className="w-5 h-5" style={{ color: category.color || '#6366F1' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-mono font-bold uppercase tracking-widest text-content-primary">{category.name}</h4>
                      <p className="text-[9px] font-mono text-content-tertiary uppercase tracking-widest mt-1">{category.type} stream</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="p-2 text-content-tertiary hover:text-content-primary active:scale-95 rounded-lg hover:bg-surface-border transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-content-tertiary hover:text-red-400 active:scale-95 rounded-lg hover:bg-surface-border transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleModule>
      )}
    </div>
  );
}
