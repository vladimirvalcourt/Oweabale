import { toast } from 'sonner';
import { applyCategorizationRules, merchantKey } from '@/lib/api/services/categorizationRules';
import { formatCategoryLabel } from '@/lib/api/services/categoryDisplay';
import { supabase } from '@/lib/api/supabase';
import { suggestPlatformFromMerchant } from '@/lib/utils';
import type { AppState, Transaction } from '@/types';
import { isFullSuiteRlsDenied, type StoreSlice } from './sliceUtils';

export const createRecordsSlice: StoreSlice<
  Pick<
    AppState,
    | 'clearLastBudgetGuardrail'
    | 'addTransaction'
    | 'updateTransaction'
    | 'addCategory'
    | 'editCategory'
    | 'deleteCategory'
    | 'addCitation'
    | 'resolveCitation'
    | 'addDeduction'
    | 'deleteDeduction'
  >
> = (set, get) => ({
  clearLastBudgetGuardrail: () => set({ lastBudgetGuardrail: null }),

  addTransaction: async (transaction, opts) => {
    const rules = get().categorizationRules;
    const exclusions = get().categorizationExclusions;
    const originalCategory = transaction.category;
    const merchantExcluded = exclusions.some(
      (exclusion) => exclusion.scope === 'merchant' && merchantKey(exclusion.merchant_name ?? '') === merchantKey(transaction.name),
    );
    const autoCategory = merchantExcluded ? null : applyCategorizationRules(transaction.name, rules);
    if (autoCategory) transaction = { ...transaction, category: autoCategory };

    if (transaction.type === 'expense') {
      const expenseDate = new Date(transaction.date.includes('T') ? transaction.date : `${transaction.date}T12:00:00`);
      if (!Number.isNaN(expenseDate.getTime())) {
        const { budgets, transactions } = get();
        const categoryBudget = budgets.find((budget) => budget.category === transaction.category);
        if (categoryBudget && (categoryBudget.lockMode ?? 'none') !== 'none') {
          const { startOfBudgetPeriod, shiftBudgetPeriod } = await import('../../lib/api/services/budgetPeriods');
          const currentStart = startOfBudgetPeriod(expenseDate, categoryBudget.period);
          const nextStart = shiftBudgetPeriod(currentStart, categoryBudget.period, 1);
          const prevStart = shiftBudgetPeriod(currentStart, categoryBudget.period, -1);
          const prevEnd = new Date(currentStart.getTime() - 1);

          const parseTxMs = (iso: string) => new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).getTime();
          const sumCategoryBetween = (startMs: number, endMs: number) =>
            transactions.reduce((sum, tx) => {
              if (tx.type !== 'expense' || tx.category !== transaction.category) return sum;
              const ms = parseTxMs(tx.date);
              if (!Number.isFinite(ms) || ms < startMs || ms > endMs) return sum;
              return sum + tx.amount;
            }, 0);

          const spentCurrent = sumCategoryBetween(currentStart.getTime(), nextStart.getTime() - 1);
          const spentPrev = sumCategoryBetween(prevStart.getTime(), prevEnd.getTime());
          const rolloverCredit = categoryBudget.rolloverEnabled ? Math.max(0, categoryBudget.amount - spentPrev) : 0;
          const allowed = categoryBudget.amount + rolloverCredit;
          const attempted = spentCurrent + transaction.amount;
          const overBy = Math.max(0, attempted - allowed);
          const lockMode = categoryBudget.lockMode ?? 'none';

          if (overBy > 0) {
            const categoryLabel = formatCategoryLabel(transaction.category);
            const message = `${categoryLabel} exceeds your ${categoryBudget.period.toLowerCase()} budget by $${overBy.toFixed(2)}.`;
            set({
              lastBudgetGuardrail: {
                type: lockMode === 'hard' ? 'hard' : 'soft',
                category: transaction.category,
                attempted: parseFloat(attempted.toFixed(2)),
                allowed: parseFloat(allowed.toFixed(2)),
                overBy: parseFloat(overBy.toFixed(2)),
                period: categoryBudget.period,
                message,
              },
            });
            if (lockMode === 'hard') {
              toast.error(`${message} This category is locked.`);
              return false;
            }
            if (!opts?.allowBudgetOverride) {
              toast.warning(`${message} Tap "Save anyway" to override.`);
              return false;
            }
          } else {
            set({ lastBudgetGuardrail: null });
          }
        } else {
          set({ lastBudgetGuardrail: null });
        }
      }
    } else {
      set({ lastBudgetGuardrail: null });
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save transactions.');
        return false;
      }

      let newId = crypto.randomUUID();
      const platformTag = transaction.platformTag !== undefined
        ? transaction.platformTag.trim()
        : suggestPlatformFromMerchant(transaction.name);

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          name: transaction.name,
          category: transaction.category,
          date: transaction.date,
          amount: transaction.amount,
          type: transaction.type,
          platform_tag: platformTag,
          notes: transaction.notes?.trim() || null,
          user_id: userId,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data?.id) newId = data.id;

      set((state) => ({
        transactions: [
          {
            ...transaction,
            id: newId,
            platformTag: platformTag ? platformTag : undefined,
            notes: transaction.notes?.trim() || undefined,
          },
          ...state.transactions,
        ].slice(0, 100),
      }));

      if (autoCategory && autoCategory !== originalCategory) {
        set({
          lastAutoCategorization: {
            transactionId: newId,
            name: transaction.name,
            from: originalCategory,
            to: autoCategory,
            at: new Date().toISOString(),
          },
        });
      } else {
        set({ lastAutoCategorization: null });
      }

      return true;
    } catch (error) {
      console.error('[addTransaction] Sync failed:', error);
      if (isFullSuiteRlsDenied(error)) {
        toast.error('Transactions are a Full Suite feature.');
        return false;
      }
      toast.error('Failed to save transaction to database.');
      return false;
    }
  },

  updateTransaction: async (id, patch) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in.');
        return false;
      }
      const db: Record<string, unknown> = {};
      if (patch.name !== undefined) db.name = patch.name;
      if (patch.category !== undefined) db.category = patch.category;
      if (patch.platformTag !== undefined) db.platform_tag = patch.platformTag.trim();
      if (patch.notes !== undefined) db.notes = patch.notes.trim() || null;
      if (Object.keys(db).length === 0) return true;
      const { error } = await supabase.from('transactions').update(db).eq('id', id).eq('user_id', userId);
      if (error) {
        console.error('[updateTransaction]', error.message);
        toast.error('Failed to update transaction.');
        return false;
      }
      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          transaction.id === id
            ? {
                ...transaction,
                ...patch,
                platformTag: patch.platformTag !== undefined ? patch.platformTag.trim() || undefined : transaction.platformTag,
              }
            : transaction,
        ),
      }));
      return true;
    } catch (error) {
      console.error('[updateTransaction]', error);
      toast.error('Failed to update transaction.');
      return false;
    }
  },

  addCategory: async (category) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      let newId = crypto.randomUUID();
      if (userId) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: category.name,
            color: category.color,
            type: category.type,
            user_id: userId,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (data?.id) newId = data.id;
      }
      set((state) => ({ categories: [...state.categories, { ...category, id: newId }] }));
    } catch (error) {
      console.error('[addCategory] Sync failed:', error);
      toast.error('Failed to sync category.');
    }
  },

  editCategory: async (id, updatedCategory) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('categories').update(updatedCategory).eq('id', id).eq('user_id', userId);
    set((state) => ({
      categories: state.categories.map((category) => (category.id === id ? { ...category, ...updatedCategory } : category)),
    }));
  },

  deleteCategory: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ categories: state.categories.filter((category) => category.id !== id) }));
  },

  addCitation: async (citation) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to save citations.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase.from('citations').insert({
        type: citation.type,
        jurisdiction: citation.jurisdiction,
        days_left: citation.daysLeft,
        amount: citation.amount,
        penalty_fee: citation.penaltyFee,
        date: citation.date,
        citation_number: citation.citationNumber,
        payment_url: citation.paymentUrl,
        status: citation.status,
        user_id: userId,
      }).select('id').single();
      if (error) {
        toast.error('Failed to sync citation');
        return false;
      }
      if (data?.id) newId = data.id;
      set((state) => ({ citations: [...state.citations, { ...citation, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addCitation] failed:', error);
      toast.error('Failed to save citation.');
      return false;
    }
  },

  resolveCitation: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to resolve citations.');
        return false;
      }
      const { error } = await supabase.from('citations').update({ status: 'resolved' }).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to resolve citation');
        return false;
      }
      set((state) => ({
        citations: state.citations.map((citation) => (citation.id === id ? { ...citation, status: 'resolved' as const } : citation)),
      }));
      return true;
    } catch (error) {
      console.error('[resolveCitation] failed:', error);
      toast.error('Failed to resolve citation.');
      return false;
    }
  },

  addDeduction: async (deduction) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to save deductions.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase.from('deductions').insert({
        name: deduction.name,
        category: deduction.category,
        amount: deduction.amount,
        date: deduction.date,
        user_id: userId,
      }).select('id').single();
      if (error) {
        toast.error('Failed to sync deduction');
        return false;
      }
      if (data?.id) newId = data.id;
      set((state) => ({ deductions: [...state.deductions, { ...deduction, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addDeduction] failed:', error);
      toast.error('Failed to save deduction.');
      return false;
    }
  },

  deleteDeduction: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to delete deductions.');
        return false;
      }
      const { error } = await supabase.from('deductions').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to delete deduction');
        return false;
      }
      set((state) => ({ deductions: state.deductions.filter((deduction) => deduction.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteDeduction] failed:', error);
      toast.error('Failed to delete deduction.');
      return false;
    }
  },
});
