import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { applyCategorizationRules, merchantKey } from '@/lib/api/services/categorizationRules';
import { supabase } from '@/lib/api/supabase';
import type { AppState, CategorizationExclusion, CategorizationRule } from '@/types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createCategorizationSlice: StoreSlice<
  Pick<
    AppState,
    | 'addCategorizationRule'
    | 'deleteCategorizationRule'
    | 'addCategorizationExclusion'
    | 'deleteCategorizationExclusion'
    | 'retagTransactionsByCategory'
    | 'applyRulesToExistingTransactions'
    | 'undoLastRuleApplication'
    | 'undoLastAutoCategorization'
  >
> = (set, get) => ({
  addCategorizationRule: async (rule) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { data, error } = await supabase.from('categorization_rules').insert({ ...rule, user_id: userId }).select().single();
    if (error) {
      toast.error('Failed to save rule');
      return;
    }
    const newRule: CategorizationRule = {
      id: data.id,
      match_type: data.match_type,
      match_value: data.match_value,
      category: data.category,
      priority: data.priority,
    };
    set((state) => ({ categorizationRules: [newRule, ...state.categorizationRules] }));
    toast.success('Rule saved — future transactions will be auto-categorized');
  },

  deleteCategorizationRule: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('categorization_rules').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ categorizationRules: state.categorizationRules.filter((rule: CategorizationRule) => rule.id !== id) }));
  },

  addCategorizationExclusion: async (exclusion) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;
    const payload: Record<string, unknown> = {
      user_id: userId,
      scope: exclusion.scope,
      transaction_id: exclusion.transaction_id ?? null,
      merchant_name: exclusion.merchant_name ?? null,
    };
    const { data, error } = await supabase.from('categorization_exclusions').insert(payload).select('*').single();
    if (error) {
      toast.error('Failed to add exclusion.');
      return false;
    }
    const created: CategorizationExclusion = {
      id: data.id as string,
      scope: data.scope as CategorizationExclusion['scope'],
      transaction_id: (data.transaction_id ?? null) as string | null,
      merchant_name: (data.merchant_name ?? null) as string | null,
    };
    set((state) => ({ categorizationExclusions: [created, ...state.categorizationExclusions] }));
    toast.success('Exclusion added. Future rules will skip this target.');
    return true;
  },

  deleteCategorizationExclusion: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;
    const { error } = await supabase.from('categorization_exclusions').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      toast.error('Failed to remove exclusion.');
      return false;
    }
    set((state) => ({ categorizationExclusions: state.categorizationExclusions.filter((exclusion) => exclusion.id !== id) }));
    return true;
  },

  retagTransactionsByCategory: async (fromCategory, toCategory) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId || !fromCategory.trim() || fromCategory === toCategory) return 0;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ category: toCategory })
        .eq('user_id', userId)
        .eq('category', fromCategory)
        .select('id');
      if (error) throw error;
      const count = data?.length ?? 0;
      if (count > 0) {
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.category === fromCategory ? { ...transaction, category: toCategory } : transaction,
          ),
        }));
      }
      return count;
    } catch (error) {
      console.error('[retagTransactionsByCategory]', error);
      toast.error('Could not update categories.');
      return 0;
    }
  },

  applyRulesToExistingTransactions: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return 0;
    const rules = get().categorizationRules;
    const exclusions = get().categorizationExclusions;
    if (rules.length === 0) return 0;
    const transactions = get().transactions;
    let count = 0;
    const changes: Array<{ id: string; from: string; to: string }> = [];
    const updates: PromiseLike<any>[] = [];
    const updated = transactions.map((transaction) => {
      const transactionExcluded = exclusions.some((exclusion) => exclusion.scope === 'transaction' && exclusion.transaction_id === transaction.id);
      const merchantExcluded = exclusions.some(
        (exclusion) => exclusion.scope === 'merchant' && merchantKey(exclusion.merchant_name ?? '') === merchantKey(transaction.name),
      );
      if (transactionExcluded || merchantExcluded) return transaction;
      const matched = applyCategorizationRules(transaction.name, rules);
      if (matched && matched !== transaction.category) {
        count++;
        changes.push({ id: transaction.id, from: transaction.category, to: matched });
        updates.push(supabase.from('transactions').update({ category: matched }).eq('id', transaction.id).eq('user_id', userId));
        return { ...transaction, category: matched };
      }
      return transaction;
    });
    if (count > 0) {
      await Promise.all(updates);
      set({
        transactions: updated,
        lastRuleApplication: {
          appliedAt: new Date().toISOString(),
          changes,
        },
      });
    }
    return count;
  },

  undoLastRuleApplication: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;
    const last = get().lastRuleApplication;
    if (!last || last.changes.length === 0) return false;
    try {
      await Promise.all(
        last.changes.map((change) =>
          supabase.from('transactions').update({ category: change.from }).eq('id', change.id).eq('user_id', userId),
        ),
      );
      set((state) => ({
        transactions: state.transactions.map((transaction) => {
          const change = last.changes.find((entry) => entry.id === transaction.id);
          return change ? { ...transaction, category: change.from } : transaction;
        }),
        lastRuleApplication: null,
      }));
      toast.success('Last bulk categorization was undone.');
      return true;
    } catch (error) {
      console.error('[undoLastRuleApplication] failed:', error);
      toast.error('Could not undo the last rule application.');
      return false;
    }
  },

  undoLastAutoCategorization: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;
    const last = get().lastAutoCategorization;
    if (!last) return false;
    try {
      const { error } = await supabase.from('transactions').update({ category: last.from }).eq('id', last.transactionId).eq('user_id', userId);
      if (error) {
        toast.error('Could not undo the auto-category.');
        return false;
      }
      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          transaction.id === last.transactionId ? { ...transaction, category: last.from } : transaction,
        ),
        lastAutoCategorization: null,
      }));
      toast.success('Auto-category undone.');
      return true;
    } catch (error) {
      console.error('[undoLastAutoCategorization] failed:', error);
      toast.error('Could not undo the auto-category.');
      return false;
    }
  },
});
