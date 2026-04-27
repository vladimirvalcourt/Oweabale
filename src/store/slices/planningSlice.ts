import { toast } from 'sonner';
import { supabase } from '../../lib/api/supabase';
import type { AppState } from '../types';
import { isFullSuiteRlsDenied, type StoreSlice } from './sliceUtils';

export const createPlanningSlice: StoreSlice<
  Pick<
    AppState,
    | 'addGoal'
    | 'editGoal'
    | 'deleteGoal'
    | 'addGoalProgress'
    | 'addBudget'
    | 'editBudget'
    | 'deleteBudget'
  >
> = (set, get) => ({
  addGoal: async (goal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save goals.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('goals')
        .insert({
          name: goal.name,
          target_amount: goal.targetAmount,
          current_amount: goal.currentAmount,
          deadline: goal.deadline,
          type: goal.type,
          color: goal.color,
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ goals: [...state.goals, { ...goal, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addGoal] Sync failed:', error);
      toast.error('Failed to sync goal.');
      return false;
    }
  },

  editGoal: async (id, updatedGoal) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to edit goals.');
        return false;
      }
      const patch: Record<string, unknown> = {};
      if (updatedGoal.name !== undefined) patch.name = updatedGoal.name;
      if (updatedGoal.targetAmount !== undefined) patch.target_amount = updatedGoal.targetAmount;
      if (updatedGoal.currentAmount !== undefined) patch.current_amount = updatedGoal.currentAmount;
      if (updatedGoal.deadline !== undefined) patch.deadline = updatedGoal.deadline;
      if (updatedGoal.type !== undefined) patch.type = updatedGoal.type;
      if (updatedGoal.color !== undefined) patch.color = updatedGoal.color;
      const { error } = await supabase.from('goals').update(patch).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update goal');
        return false;
      }
      set((state) => ({ goals: state.goals.map((goal) => (goal.id === id ? { ...goal, ...updatedGoal } : goal)) }));
      return true;
    } catch (error) {
      console.error('[editGoal] failed:', error);
      toast.error('Failed to update goal.');
      return false;
    }
  },

  deleteGoal: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to delete goals.');
        return false;
      }
      const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to delete goal');
        return false;
      }
      set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteGoal] failed:', error);
      toast.error('Failed to delete goal.');
      return false;
    }
  },

  addGoalProgress: async (id, amount) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to update goals.');
        return false;
      }
      const goal = get().goals.find((entry) => entry.id === id);
      if (!goal) return false;
      const newAmount = Math.max(0, Math.min(goal.targetAmount, goal.currentAmount + amount));
      const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update goal progress');
        return false;
      }
      if (newAmount >= goal.targetAmount) {
        get().addNotification({ title: 'Goal Complete!', message: `"${goal.name}" has been fully funded.`, type: 'success' });
      }
      set((state) => ({
        goals: state.goals.map((entry) => (entry.id === id ? { ...entry, currentAmount: newAmount } : entry)),
      }));
      return true;
    } catch (error) {
      console.error('[addGoalProgress] failed:', error);
      toast.error('Failed to update goal progress.');
      return false;
    }
  },

  addBudget: async (budget) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save budgets.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          category: budget.category,
          amount: budget.amount,
          period: budget.period,
          rollover_enabled: Boolean(budget.rolloverEnabled),
          lock_mode: budget.lockMode ?? 'none',
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ budgets: [...state.budgets, { ...budget, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addBudget] Sync failed:', error);
      toast.error('Failed to sync budget.');
      return false;
    }
  },

  editBudget: async (id, updatedBudget) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to edit budgets.');
        return false;
      }
      const payload: Record<string, unknown> = { ...updatedBudget };
      if (Object.prototype.hasOwnProperty.call(payload, 'rolloverEnabled')) {
        payload.rollover_enabled = Boolean(payload.rolloverEnabled);
        delete payload.rolloverEnabled;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'lockMode')) {
        payload.lock_mode = payload.lockMode ?? 'none';
        delete payload.lockMode;
      }
      const { error } = await supabase.from('budgets').update(payload).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update budget');
        return false;
      }
      set((state) => ({ budgets: state.budgets.map((budget) => (budget.id === id ? { ...budget, ...updatedBudget } : budget)) }));
      return true;
    } catch (error) {
      console.error('[editBudget] failed:', error);
      toast.error('Failed to update budget.');
      return false;
    }
  },

  deleteBudget: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to delete budgets.');
        return false;
      }
      const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to delete budget');
        return false;
      }
      set((state) => ({ budgets: state.budgets.filter((budget) => budget.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteBudget] failed:', error);
      toast.error('Failed to delete budget.');
      return false;
    }
  },
});
