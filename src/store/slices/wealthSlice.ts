import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '../../lib/api/supabase';
import type { AppState } from '../types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createWealthSlice: StoreSlice<
  Pick<
    AppState,
    | 'updateCreditScore'
    | 'addCreditFix'
    | 'updateCreditFix'
    | 'deleteCreditFix'
    | 'addInvestmentAccount'
    | 'editInvestmentAccount'
    | 'deleteInvestmentAccount'
    | 'addInsurancePolicy'
    | 'editInsurancePolicy'
    | 'deleteInsurancePolicy'
  >
> = (set) => ({
  updateCreditScore: async (score) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const now = new Date().toISOString();
    if (userId) {
      await supabase.from('profiles').update({ credit_score: score, credit_last_updated: now }).eq('id', userId);
    }
    set((state) => ({ credit: { ...state.credit, score, lastUpdated: now } }));
  },

  addCreditFix: async (fix) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('credit_fixes').insert({ ...fix, user_id: userId }).select('id').single();
      if (error) {
        toast.error('Failed to save credit fix');
        return;
      }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ credit: { ...state.credit, fixes: [...state.credit.fixes, { ...fix, id: newId }] } }));
  },

  updateCreditFix: async (id, updates) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('credit_fixes').update(updates).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({
      credit: {
        ...state.credit,
        fixes: state.credit.fixes.map((fix) => (fix.id === id ? { ...fix, ...updates } : fix)),
      },
    }));
  },

  deleteCreditFix: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('credit_fixes').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ credit: { ...state.credit, fixes: state.credit.fixes.filter((fix) => fix.id !== id) } }));
  },

  addInvestmentAccount: async (account) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in.');
        return false;
      }
      let newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('investment_accounts')
        .insert({
          user_id: userId,
          name: account.name,
          type: account.type,
          institution: account.institution,
          balance: account.balance,
          notes: account.notes,
          last_updated: now,
        })
        .select('id')
        .single();
      if (error) {
        toast.error('Failed to save investment account.');
        return false;
      }
      if (data?.id) newId = data.id;
      set((state) => ({ investmentAccounts: [...state.investmentAccounts, { ...account, id: newId, lastUpdated: now }] }));
      return true;
    } catch (error) {
      console.error('[addInvestmentAccount]', error);
      toast.error('Failed to save investment account.');
      return false;
    }
  },

  editInvestmentAccount: async (id, updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) return false;
      const dbUpdate: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdate.name = updates.name;
      if (updates.type !== undefined) dbUpdate.type = updates.type;
      if (updates.institution !== undefined) dbUpdate.institution = updates.institution;
      if (updates.balance !== undefined) dbUpdate.balance = updates.balance;
      if (updates.notes !== undefined) dbUpdate.notes = updates.notes;
      dbUpdate.last_updated = new Date().toISOString();
      const { error } = await supabase.from('investment_accounts').update(dbUpdate).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update investment account.');
        return false;
      }
      set((state) => ({
        investmentAccounts: state.investmentAccounts.map((account) =>
          account.id === id ? { ...account, ...updates, lastUpdated: dbUpdate.last_updated as string } : account,
        ),
      }));
      return true;
    } catch (error) {
      console.error('[editInvestmentAccount]', error);
      return false;
    }
  },

  deleteInvestmentAccount: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const { error } = await supabase.from('investment_accounts').delete().eq('id', id).eq('user_id', userId);
        if (error) {
          toast.error('Failed to delete investment account.');
          return false;
        }
      }
      set((state) => ({ investmentAccounts: state.investmentAccounts.filter((account) => account.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteInvestmentAccount]', error);
      return false;
    }
  },

  addInsurancePolicy: async (policy) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('insurance_policies')
        .insert({
          user_id: userId,
          type: policy.type,
          provider: policy.provider,
          premium: policy.premium,
          frequency: policy.frequency,
          coverage_amount: policy.coverageAmount ?? null,
          deductible: policy.deductible ?? null,
          expiration_date: policy.expirationDate ?? null,
          status: policy.status,
          notes: policy.notes,
        })
        .select('id')
        .single();
      if (error) {
        toast.error('Failed to save insurance policy.');
        return false;
      }
      if (data?.id) newId = data.id;
      set((state) => ({ insurancePolicies: [...state.insurancePolicies, { ...policy, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addInsurancePolicy]', error);
      toast.error('Failed to save insurance policy.');
      return false;
    }
  },

  editInsurancePolicy: async (id, updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) return false;
      const dbUpdate: Record<string, unknown> = {};
      if (updates.type !== undefined) dbUpdate.type = updates.type;
      if (updates.provider !== undefined) dbUpdate.provider = updates.provider;
      if (updates.premium !== undefined) dbUpdate.premium = updates.premium;
      if (updates.frequency !== undefined) dbUpdate.frequency = updates.frequency;
      if (updates.coverageAmount !== undefined) dbUpdate.coverage_amount = updates.coverageAmount;
      if (updates.deductible !== undefined) dbUpdate.deductible = updates.deductible;
      if (updates.expirationDate !== undefined) dbUpdate.expiration_date = updates.expirationDate;
      if (updates.status !== undefined) dbUpdate.status = updates.status;
      if (updates.notes !== undefined) dbUpdate.notes = updates.notes;
      const { error } = await supabase.from('insurance_policies').update(dbUpdate).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update insurance policy.');
        return false;
      }
      set((state) => ({
        insurancePolicies: state.insurancePolicies.map((policy) => (policy.id === id ? { ...policy, ...updates } : policy)),
      }));
      return true;
    } catch (error) {
      console.error('[editInsurancePolicy]', error);
      return false;
    }
  },

  deleteInsurancePolicy: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const { error } = await supabase.from('insurance_policies').delete().eq('id', id).eq('user_id', userId);
        if (error) {
          toast.error('Failed to delete insurance policy.');
          return false;
        }
      }
      set((state) => ({ insurancePolicies: state.insurancePolicies.filter((policy) => policy.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteInsurancePolicy]', error);
      return false;
    }
  },
});
