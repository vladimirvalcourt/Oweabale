import { toast } from 'sonner';
import { supabase } from '@/lib/api/supabase';
import type { AppState, Transaction } from '@/types';
import { isFullSuiteRlsDenied, type StoreSlice } from './sliceUtils';

export const createObligationsSlice: StoreSlice<
  Pick<
    AppState,
    | 'addBill'
    | 'editBill'
    | 'deleteBill'
    | 'markBillPaid'
    | 'addDebt'
    | 'editDebt'
    | 'deleteDebt'
    | 'addDebtPayment'
    | 'addSubscription'
    | 'editSubscription'
    | 'deleteSubscription'
  >
> = (set, get) => ({
  addBill: async (bill) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save bills.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('bills')
        .insert({
          biller: bill.biller,
          amount: bill.amount,
          category: bill.category,
          due_date: bill.dueDate,
          frequency: bill.frequency,
          status: bill.status,
          auto_pay: bill.autoPay,
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) {
        console.error('[addBill] Database error:', error);
        console.error('[addBill] Error details:', { code: error.code, message: error.message, details: error.details });
        throw error;
      }
      if (data?.id) newId = data.id;
      set((state) => ({ bills: [...state.bills, { ...bill, id: newId }] }));
      return true;
    } catch (error: any) {
      console.error('[addBill] Sync failed:', error);
      console.error('[addBill] Error name:', error?.name);
      console.error('[addBill] Error message:', error?.message);
      console.error('[addBill] Full error object:', error);
      toast.error(`Failed to sync bill record: ${error?.message || 'Unknown error'}`);
      return false;
    }
  },

  editBill: async (id, updatedBill) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const dbUpdate: Record<string, unknown> = {};
      if (updatedBill.biller !== undefined) dbUpdate.biller = updatedBill.biller;
      if (updatedBill.amount !== undefined) dbUpdate.amount = updatedBill.amount;
      if (updatedBill.category !== undefined) dbUpdate.category = updatedBill.category;
      if (updatedBill.dueDate !== undefined) dbUpdate.due_date = updatedBill.dueDate;
      if (updatedBill.frequency !== undefined) dbUpdate.frequency = updatedBill.frequency;
      if (updatedBill.status !== undefined) dbUpdate.status = updatedBill.status;
      if (updatedBill.autoPay !== undefined) dbUpdate.auto_pay = updatedBill.autoPay;
      const { error } = await supabase.from('bills').update(dbUpdate).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update bill');
        return;
      }
    }
    set((state) => ({
      bills: state.bills.map((bill) => (bill.id === id ? { ...bill, ...updatedBill } : bill)),
    }));
  },

  deleteBill: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { error } = await supabase.from('bills').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to delete bill');
        return;
      }
    }
    set((state) => ({ bills: state.bills.filter((bill) => bill.id !== id) }));
  },

  markBillPaid: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const bill = get().bills.find((entry) => entry.id === id);
      if (!bill) return;
      let ledgerWriteBlocked = false;
      const nextDue = new Date(bill.dueDate);
      switch (bill.frequency) {
        case 'Weekly':
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'Bi-weekly':
          nextDue.setDate(nextDue.getDate() + 14);
          break;
        case 'Yearly':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
        default:
          nextDue.setMonth(nextDue.getMonth() + 1);
      }
      const nextDueStr = nextDue.toISOString().split('T')[0];
      if (userId) {
        const { error } = await supabase.from('bills').update({ status: 'upcoming', due_date: nextDueStr }).eq('id', id).eq('user_id', userId);
        if (error) throw error;
      }
      get().addNotification({
        title: `${bill.biller} Marked Paid`,
        message: `$${bill.amount.toFixed(2)} recorded. Next due: ${nextDueStr}.`,
        type: 'success',
      });
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        name: bill.biller,
        category: bill.category,
        date: new Date().toISOString().split('T')[0],
        amount: bill.amount,
        type: 'expense',
      };
      if (userId) {
        const { error } = await supabase.from('transactions').insert({
          name: newTransaction.name,
          category: newTransaction.category,
          date: newTransaction.date,
          amount: newTransaction.amount,
          type: newTransaction.type,
          platform_tag: '',
          user_id: userId,
        });
        if (error) {
          if (isFullSuiteRlsDenied(error)) {
            ledgerWriteBlocked = true;
          } else {
            throw error;
          }
        }
      }
      set((state) => ({
        bills: state.bills.map((entry) => (entry.id === id ? { ...entry, status: 'upcoming', dueDate: nextDueStr } : entry)),
        transactions: ledgerWriteBlocked ? state.transactions : [newTransaction, ...state.transactions].slice(0, 100),
      }));
      if (ledgerWriteBlocked) {
        toast.info('Bill marked paid. Ledger history is a Full Suite feature.');
      }
    } catch (error) {
      console.error('Error marking bill paid:', error);
      toast.error('Failed to update bill record.');
    }
  },

  addDebt: async (debt) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save debts.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('debts')
        .insert({
          name: debt.name,
          type: debt.type,
          apr: debt.apr,
          remaining: debt.remaining,
          min_payment: debt.minPayment,
          paid: debt.paid,
          payment_due_date: debt.paymentDueDate ?? null,
          original_amount: debt.originalAmount ?? null,
          origination_date: debt.originationDate ?? null,
          term_months: debt.termMonths ?? null,
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ debts: [...state.debts, { ...debt, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addDebt] Sync failed:', error);
      if (isFullSuiteRlsDenied(error)) {
        toast.error('Debt accounts are a Full Suite feature.');
        return false;
      }
      toast.error('Failed to sync debt record.');
      return false;
    }
  },

  editDebt: async (id, updatedDebt) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const snakeCased: Record<string, unknown> = {};
      if (updatedDebt.name !== undefined) snakeCased.name = updatedDebt.name;
      if (updatedDebt.type !== undefined) snakeCased.type = updatedDebt.type;
      if (updatedDebt.apr !== undefined) snakeCased.apr = updatedDebt.apr;
      if (updatedDebt.remaining !== undefined) snakeCased.remaining = updatedDebt.remaining;
      if (updatedDebt.minPayment !== undefined) snakeCased.min_payment = updatedDebt.minPayment;
      if (updatedDebt.paid !== undefined) snakeCased.paid = updatedDebt.paid;
      if (updatedDebt.originalAmount !== undefined) snakeCased.original_amount = updatedDebt.originalAmount;
      if (updatedDebt.originationDate !== undefined) snakeCased.origination_date = updatedDebt.originationDate;
      if (updatedDebt.termMonths !== undefined) snakeCased.term_months = updatedDebt.termMonths;
      if (updatedDebt.paymentDueDate !== undefined) snakeCased.payment_due_date = updatedDebt.paymentDueDate;
      const { error } = await supabase.from('debts').update(snakeCased).eq('id', id).eq('user_id', userId);
      if (error) {
        if (isFullSuiteRlsDenied(error)) {
          toast.error('Debt editing is a Full Suite feature.');
          return;
        }
        toast.error('Failed to update debt');
        return;
      }
    }
    set((state) => ({
      debts: state.debts.map((debt) => (debt.id === id ? { ...debt, ...updatedDebt } : debt)),
    }));
  },

  deleteDebt: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { error } = await supabase.from('debts').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        if (isFullSuiteRlsDenied(error)) {
          toast.error('Debt deletion is a Full Suite feature.');
          return;
        }
        toast.error('Failed to delete debt');
        return;
      }
    }
    set((state) => ({ debts: state.debts.filter((debt) => debt.id !== id) }));
  },

  addDebtPayment: async (id, amount) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const debt = get().debts.find((entry) => entry.id === id);
    if (!debt) return;
    const newRemaining = Math.max(0, debt.remaining - amount);
    const newPaid = debt.paid + amount;
    if (userId) {
      const { error } = await supabase.from('debts').update({ remaining: newRemaining, paid: newPaid }).eq('id', id).eq('user_id', userId);
      if (error) {
        if (isFullSuiteRlsDenied(error)) {
          toast.error('Debt payments are a Full Suite feature.');
          return;
        }
        toast.error('Failed to sync debt payment');
        return;
      }
    }
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      name: `Payment: ${debt.name}`,
      category: 'Debt Repayment',
      date: new Date().toISOString().split('T')[0],
      amount,
      type: 'expense',
    };
    if (userId) {
      const { error } = await supabase.from('transactions').insert({ name: newTx.name, category: newTx.category, date: newTx.date, amount: newTx.amount, type: newTx.type, platform_tag: '', user_id: userId });
      if (error) {
        if (isFullSuiteRlsDenied(error)) {
          toast.error('Debt payments are a Full Suite feature.');
          return;
        }
        toast.error('Failed to record payment transaction.');
        return;
      }
    }
    set((state) => ({
      debts: state.debts.map((entry) => (entry.id === id ? { ...entry, remaining: newRemaining, paid: newPaid } : entry)),
      transactions: [newTx, ...state.transactions].slice(0, 100),
    }));
  },

  addSubscription: async (subscription) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save subscriptions.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          name: subscription.name,
          amount: subscription.amount,
          frequency: subscription.frequency,
          next_billing_date: subscription.nextBillingDate,
          status: subscription.status,
          price_history: subscription.priceHistory ?? [],
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ subscriptions: [...state.subscriptions, { ...subscription, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addSubscription] Sync failed:', error);
      toast.error('Failed to sync subscription.');
      return false;
    }
  },

  editSubscription: async (id, updatedSubscription) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to edit subscriptions.');
        return false;
      }
      const patch: Record<string, unknown> = {};
      if (updatedSubscription.name !== undefined) patch.name = updatedSubscription.name;
      if (updatedSubscription.amount !== undefined) patch.amount = updatedSubscription.amount;
      if (updatedSubscription.frequency !== undefined) patch.frequency = updatedSubscription.frequency;
      if (updatedSubscription.nextBillingDate !== undefined) patch.next_billing_date = updatedSubscription.nextBillingDate;
      if (updatedSubscription.status !== undefined) patch.status = updatedSubscription.status;
      if (updatedSubscription.priceHistory !== undefined) patch.price_history = updatedSubscription.priceHistory;
      const { error } = await supabase.from('subscriptions').update(patch).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update subscription');
        return false;
      }
      set((state) => ({
        subscriptions: state.subscriptions.map((subscription) => (subscription.id === id ? { ...subscription, ...updatedSubscription } : subscription)),
      }));
      return true;
    } catch (error) {
      console.error('[editSubscription] failed:', error);
      toast.error('Failed to update subscription.');
      return false;
    }
  },

  deleteSubscription: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to delete subscriptions.');
        return false;
      }
      const { error } = await supabase.from('subscriptions').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to delete subscription');
        return false;
      }
      set((state) => ({ subscriptions: state.subscriptions.filter((subscription) => subscription.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteSubscription] failed:', error);
      toast.error('Failed to delete subscription.');
      return false;
    }
  },
});
