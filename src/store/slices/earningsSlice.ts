import { toast } from 'sonner';
import { supabase } from '@/lib/api/supabase';
import type { AppState, Transaction } from '@/types';
import { isFullSuiteRlsDenied, type StoreSlice } from './sliceUtils';

export const createEarningsSlice: StoreSlice<
  Pick<
    AppState,
    | 'addIncome'
    | 'editIncome'
    | 'deleteIncome'
    | 'recordIncomeDeposit'
    | 'addFreelanceEntry'
    | 'toggleFreelanceVault'
    | 'deleteFreelanceEntry'
    | 'addMileageLogEntry'
    | 'deleteMileageLogEntry'
    | 'addClientInvoice'
    | 'updateClientInvoice'
    | 'deleteClientInvoice'
  >
> = (set, get) => ({
  addIncome: async (income) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save income.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('incomes')
        .insert({
          name: income.name,
          amount: income.amount,
          frequency: income.frequency,
          category: income.category,
          next_date: income.nextDate,
          status: income.status,
          is_tax_withheld: income.isTaxWithheld,
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ incomes: [...state.incomes, { ...income, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addIncome] Sync failed:', error);
      if (isFullSuiteRlsDenied(error)) {
        toast.error('Income tracking is a Full Suite feature.');
        return false;
      }
      toast.error('Failed to sync income source.');
      return false;
    }
  },

  editIncome: async (id, updatedIncome) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to edit income.');
        return false;
      }
      const patch: Record<string, unknown> = {};
      if (updatedIncome.name !== undefined) patch.name = updatedIncome.name;
      if (updatedIncome.amount !== undefined) patch.amount = updatedIncome.amount;
      if (updatedIncome.frequency !== undefined) patch.frequency = updatedIncome.frequency;
      if (updatedIncome.category !== undefined) patch.category = updatedIncome.category;
      if (updatedIncome.nextDate !== undefined) patch.next_date = updatedIncome.nextDate;
      if (updatedIncome.status !== undefined) patch.status = updatedIncome.status;
      if (updatedIncome.isTaxWithheld !== undefined) patch.is_tax_withheld = updatedIncome.isTaxWithheld;
      const { error } = await supabase.from('incomes').update(patch).eq('id', id).eq('user_id', userId);
      if (error) {
        if (isFullSuiteRlsDenied(error)) {
          toast.error('Income editing is a Full Suite feature.');
          return false;
        }
        toast.error('Failed to update income');
        return false;
      }
      set((state) => ({ incomes: state.incomes.map((income) => (income.id === id ? { ...income, ...updatedIncome } : income)) }));
      return true;
    } catch (error) {
      console.error('[editIncome] failed:', error);
      toast.error('Failed to update income.');
      return false;
    }
  },

  deleteIncome: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to delete income.');
        return false;
      }
      const { error } = await supabase.from('incomes').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        if (isFullSuiteRlsDenied(error)) {
          toast.error('Income deletion is a Full Suite feature.');
          return false;
        }
        toast.error('Failed to delete income');
        return false;
      }
      set((state) => ({ incomes: state.incomes.filter((income) => income.id !== id) }));
      return true;
    } catch (error) {
      console.error('[deleteIncome] failed:', error);
      toast.error('Failed to delete income.');
      return false;
    }
  },

  recordIncomeDeposit: async (id, amount) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to record deposits.');
        return false;
      }
      const income = get().incomes.find((entry) => entry.id === id);
      if (!income) return false;
      const depositAmount = amount || income.amount;
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        name: `Deposit: ${income.name}`,
        category: income.category,
        date: new Date().toISOString().split('T')[0],
        amount: depositAmount,
        type: 'income',
      };
      const { error } = await supabase.from('transactions').insert({ name: newTx.name, category: newTx.category, date: newTx.date, amount: newTx.amount, type: newTx.type, platform_tag: '', user_id: userId });
      if (error) {
        if (isFullSuiteRlsDenied(error)) {
          toast.error('Income deposits are a Full Suite feature.');
          return false;
        }
        toast.error('Failed to record deposit');
        return false;
      }
      set((state) => ({ transactions: [newTx, ...state.transactions].slice(0, 50) }));
      return true;
    } catch (error) {
      console.error('[recordIncomeDeposit] failed:', error);
      toast.error('Failed to record deposit.');
      return false;
    }
  },

  addFreelanceEntry: async (entry) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to save freelance entries.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase.from('freelance_entries').insert({
        client: entry.client,
        amount: entry.amount,
        date: entry.date,
        is_vaulted: entry.isVaulted,
        scoured_write_offs: entry.scouredWriteOffs ?? 0,
        user_id: userId,
      }).select('id').single();
      if (error) {
        toast.error('Failed to sync freelance entry');
        return false;
      }
      if (data?.id) newId = data.id;
      set((state) => ({ freelanceEntries: [...state.freelanceEntries, { ...entry, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addFreelanceEntry] failed:', error);
      toast.error('Failed to save freelance entry.');
      return false;
    }
  },

  toggleFreelanceVault: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const current = get().freelanceEntries.find((entry) => entry.id === id);
    if (userId && current) {
      await supabase.from('freelance_entries').update({ is_vaulted: !current.isVaulted }).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({
      freelanceEntries: state.freelanceEntries.map((entry) => (entry.id === id ? { ...entry, isVaulted: !entry.isVaulted } : entry)),
    }));
  },

  deleteFreelanceEntry: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('freelance_entries').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ freelanceEntries: state.freelanceEntries.filter((entry) => entry.id !== id) }));
  },

  addMileageLogEntry: async (entry) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in to save mileage.');
        return false;
      }
      const miles = Number(entry.miles);
      const rate = Number(entry.irsRatePerMile);
      if (!Number.isFinite(miles) || miles <= 0 || miles > 99999) {
        toast.error('Enter a valid mileage amount.');
        return false;
      }
      if (!Number.isFinite(rate) || rate < 0) {
        toast.error('Enter a valid IRS rate per mile.');
        return false;
      }
      const deductionAmount =
        entry.deductionAmount !== undefined
          ? Math.round(Number(entry.deductionAmount) * 100) / 100
          : Math.round(miles * rate * 100) / 100;
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('mileage_log')
        .insert({
          user_id: userId,
          trip_date: entry.tripDate,
          start_location: entry.startLocation,
          end_location: entry.endLocation,
          miles,
          purpose: entry.purpose,
          platform: entry.platform ?? '',
          irs_rate_per_mile: rate,
          deduction_amount: deductionAmount,
        })
        .select('id')
        .single();
      if (error) {
        console.error('[addMileageLogEntry]', error.message);
        toast.error('Failed to save mileage entry.');
        return false;
      }
      if (data?.id) newId = data.id;
      set((state) => ({
        mileageLog: [
          ...state.mileageLog,
          {
            id: newId,
            tripDate: entry.tripDate,
            startLocation: entry.startLocation,
            endLocation: entry.endLocation,
            miles,
            purpose: entry.purpose,
            platform: entry.platform ?? '',
            irsRatePerMile: rate,
            deductionAmount,
          },
        ],
      }));
      return true;
    } catch (error) {
      console.error('[addMileageLogEntry] failed:', error);
      toast.error('Failed to save mileage entry.');
      return false;
    }
  },

  deleteMileageLogEntry: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('mileage_log').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ mileageLog: state.mileageLog.filter((entry) => entry.id !== id) }));
  },

  addClientInvoice: async (invoice) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error('You must be signed in.');
        return false;
      }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('client_invoices')
        .insert({
          user_id: userId,
          client_name: invoice.clientName,
          amount: invoice.amount,
          issued_date: invoice.issuedDate,
          due_date: invoice.dueDate,
          status: invoice.status,
          notes: invoice.notes ?? '',
        })
        .select('id')
        .single();
      if (error) {
        console.error('[addClientInvoice]', error.message);
        toast.error('Failed to save invoice.');
        return false;
      }
      if (data?.id) newId = data.id;
      set((state) => ({
        clientInvoices: [...state.clientInvoices, { ...invoice, id: newId }],
      }));
      return true;
    } catch (error) {
      console.error('[addClientInvoice]', error);
      toast.error('Failed to save invoice.');
      return false;
    }
  },

  updateClientInvoice: async (id, patch) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;
    const db: Record<string, unknown> = {};
    if (patch.clientName !== undefined) db.client_name = patch.clientName;
    if (patch.amount !== undefined) db.amount = patch.amount;
    if (patch.issuedDate !== undefined) db.issued_date = patch.issuedDate;
    if (patch.dueDate !== undefined) db.due_date = patch.dueDate;
    if (patch.status !== undefined) db.status = patch.status;
    if (patch.notes !== undefined) db.notes = patch.notes;
    if (Object.keys(db).length > 0) {
      const { error } = await supabase.from('client_invoices').update(db).eq('id', id).eq('user_id', userId);
      if (error) {
        toast.error('Failed to update invoice.');
        return false;
      }
    }
    set((state) => ({
      clientInvoices: state.clientInvoices.map((invoice) => (invoice.id === id ? { ...invoice, ...patch } : invoice)),
    }));
    return true;
  },

  deleteClientInvoice: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('client_invoices').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ clientInvoices: state.clientInvoices.filter((invoice) => invoice.id !== id) }));
  },
});
