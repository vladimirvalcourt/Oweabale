import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Tags, Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { toast } from 'sonner';
import { motion } from 'motion/react';

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
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mt-1">Saved categories for transaction analysis</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', type: 'expense', color: '#6366F1' });
          }}
          className="px-4 py-2 bg-content-primary hover:bg-zinc-200 text-surface-base rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-colors flex items-center gap-2 focus:outline-none"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Category
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-surface-raised rounded-sm border border-surface-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold tracking-tight text-content-primary">
              {editingId ? 'Edit Category' : 'Create New Category'}
            </h3>
            <button onClick={() => { setIsAdding(false); cancelEdit(); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-zinc-300">Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors"
                  placeholder="e.g., Groceries"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300">Color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-9 w-14 p-1 border border-surface-border bg-surface-base rounded-sm cursor-pointer"
                  />
                  <span className="text-sm text-zinc-500">{formData.color}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setIsAdding(false); cancelEdit(); }}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-sm text-sm font-medium text-zinc-300 hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500"
              >
                {editingId ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 && !isAdding ? (
        <div className="bg-surface-raised rounded-sm border border-surface-border p-12 text-center">
          <div className="w-16 h-16 border border-surface-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Tags className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-content-primary mb-2">No categories found</h3>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-6">
            Categories help you organize your transactions and understand your spending habits.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </motion.button>
        </div>
      ) : (
        <CollapsibleModule 
          title="Manage Categories" 
          icon={Tags}
          extraHeader={<span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{categories.length} Categories Saved</span>}
        >
          <div className="bg-surface-raised rounded-sm border border-surface-border overflow-hidden -mx-6 -my-6">
            <motion.ul 
              className="divide-y divide-surface-highlight"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {categories.map((category) => (
                <motion.li 
                  key={category.id} 
                  className="p-4 sm:px-6 hover:bg-surface-elevated transition-colors flex items-center justify-between group"
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-sm flex items-center justify-center text-white border border-surface-border bg-surface-base group-hover:border-zinc-700 transition-colors"
                      style={{ borderLeftColor: category.color || '#6366F1', borderLeftWidth: '3px' }}
                    >
                      <Tag className="w-5 h-5" style={{ color: category.color || '#6366F1' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-mono font-bold uppercase tracking-widest text-content-primary">{category.name}</h4>
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1">{category.type} stream</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => startEdit(category)}
                      className="p-2 text-zinc-500 hover:text-indigo-400 rounded-sm hover:bg-surface-border transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 rounded-sm hover:bg-surface-border transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </CollapsibleModule>
      )}
    </div>
  );
}
