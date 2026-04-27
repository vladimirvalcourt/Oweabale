import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '../../lib/api/supabase';
import { suggestPlatformFromMerchant } from '../../lib/utils';
import type { AppState, Bill, IncomeSource, Transaction } from '../types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

async function removeIngestionStoragePath(storagePath: string) {
  const bucket = storagePath.startsWith('incoming/') ? 'scans' : 'ingestion-files';
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) console.warn(`[useStore] storage remove (${bucket}):`, error.message);
}

export const createIngestionSlice: StoreSlice<
  Pick<AppState, 'addPendingIngestion' | 'updatePendingIngestion' | 'removePendingIngestion' | 'commitIngestion'>
> = (set, get) => ({
  addPendingIngestion: (ingestion) => {
    const id = crypto.randomUUID();

    // Fire and forget for snappy local UI; persistence catches up behind it.
    void (async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const { error } = await supabase.from('pending_ingestions').insert({
          id,
          user_id: userId,
          type: ingestion.type,
          status: ingestion.status,
          source: ingestion.source ?? 'desktop',
          extracted_data: ingestion.extractedData,
          original_file: ingestion.originalFile,
          storage_path: ingestion.storagePath,
          storage_url: ingestion.storageUrl,
        });
        if (error) {
          console.error('[addPendingIngestion] DB insert failed:', error.message);
          toast.error('Upload not saved — data may disappear after sign-out. Run the database migration and try again.');
        }
      }
    })();

    set((state) => ({
      pendingIngestions: [...state.pendingIngestions, { ...ingestion, id }],
    }));

    return id;
  },

  updatePendingIngestion: async (id, updates) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const patch: Record<string, unknown> = {};
      if (updates.type) patch.type = updates.type;
      if (updates.status) patch.status = updates.status;
      if (updates.extractedData) patch.extracted_data = updates.extractedData;
      if (updates.storagePath) patch.storage_path = updates.storagePath;
      if (updates.storageUrl) patch.storage_url = updates.storageUrl;

      await supabase.from('pending_ingestions').update(patch).eq('id', id).eq('user_id', userId);
    }

    set((state) => ({
      pendingIngestions: state.pendingIngestions.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  },

  removePendingIngestion: async (id) => {
    const item = get().pendingIngestions.find((pending) => pending.id === id);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    if (userId) {
      await supabase.from('pending_ingestions').delete().eq('id', id).eq('user_id', userId);
      if (item?.storagePath) {
        void removeIngestionStoragePath(item.storagePath);
      }
    }

    const blobUrl = item?.originalFile?.url;
    if (typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore local blob cleanup failures
      }
    }

    set((state) => ({
      pendingIngestions: state.pendingIngestions.filter((pending) => pending.id !== id),
    }));
  },

  commitIngestion: async (id) => {
    const item = get().pendingIngestions.find((pending) => pending.id === id);
    if (!item || item.status !== 'ready') return false;

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const data = item.extractedData;
    const commonId = crypto.randomUUID();
    const amount = typeof data.amount === 'number' && !Number.isNaN(data.amount) ? data.amount : 0;

    const getCategoryFromMerchant = (name: string): string => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('food') || lowerName.includes('grocery') || lowerName.includes('market') || lowerName.includes('wholefoods') || lowerName.includes('trader joes') || lowerName.includes('walmart')) return 'food';
      if (lowerName.includes('uber') || lowerName.includes('lyft') || lowerName.includes('gas') || lowerName.includes('shell') || lowerName.includes('exxon') || lowerName.includes('parking') || lowerName.includes('mta') || lowerName.includes('subway')) return 'transport';
      if (lowerName.includes('amazon') || lowerName.includes('target') || lowerName.includes('apple') || lowerName.includes('best buy') || lowerName.includes('shopping')) return 'shopping';
      if (lowerName.includes('netflix') || lowerName.includes('spotify') || lowerName.includes('hulu') || lowerName.includes('hbo') || lowerName.includes('movie') || lowerName.includes('cinema')) return 'entertainment';
      if (lowerName.includes('cvs') || lowerName.includes('walgreens') || lowerName.includes('clinic') || lowerName.includes('doctor') || lowerName.includes('hospital')) return 'medical';
      return 'other';
    };

    const merchantName = (data.name || data.biller || 'New Entry').trim();
    const autoCategory = getCategoryFromMerchant(merchantName);

    const requirePositiveAmount = () => {
      if (amount <= 0) {
        toast.error('Amount must be greater than zero. Edit the row or re-scan a clearer document.');
        return false;
      }
      return true;
    };

    let saved = false;

    if (item.type === 'transaction') {
      if (!requirePositiveAmount()) return false;
      const platformTag = suggestPlatformFromMerchant(merchantName);
      const newTransaction: Transaction = {
        id: commonId,
        name: merchantName,
        amount,
        category: data.category || autoCategory,
        date: data.date || new Date().toISOString().split('T')[0],
        type: 'expense',
        platformTag: platformTag || undefined,
      };

      if (userId) {
        const { error } = await supabase.from('transactions').insert({
          name: newTransaction.name,
          category: newTransaction.category,
          date: newTransaction.date,
          amount: newTransaction.amount,
          type: newTransaction.type,
          platform_tag: platformTag,
          user_id: userId,
        });
        if (error) {
          toast.error('Failed to save transaction. Please try again.');
          return false;
        }
      }

      set((state) => ({
        transactions: [newTransaction, ...state.transactions].slice(0, 50),
        pendingIngestions: state.pendingIngestions.filter((pending) => pending.id !== id),
      }));
      saved = true;
    } else if (item.type === 'bill') {
      if (!requirePositiveAmount()) return false;
      const newBill: Bill = {
        id: commonId,
        biller: merchantName,
        amount,
        category: data.category || autoCategory,
        dueDate: data.dueDate || data.date || new Date().toISOString().split('T')[0],
        frequency: 'Monthly',
        status: 'upcoming',
        autoPay: false,
      };

      if (userId) {
        const { error } = await supabase.from('bills').insert({
          biller: newBill.biller,
          amount: newBill.amount,
          category: newBill.category,
          due_date: newBill.dueDate,
          frequency: newBill.frequency,
          status: newBill.status,
          auto_pay: newBill.autoPay,
          user_id: userId,
        });
        if (error) {
          toast.error('Failed to save bill. Please try again.');
          return false;
        }
      }

      set((state) => ({
        bills: [...state.bills, newBill],
        pendingIngestions: state.pendingIngestions.filter((pending) => pending.id !== id),
      }));
      saved = true;
    } else if (item.type === 'income') {
      if (!requirePositiveAmount()) return false;
      const incomeName = (data.source || data.name || data.biller || merchantName || 'Income').trim();
      const newIncome: IncomeSource = {
        id: commonId,
        name: incomeName,
        amount,
        frequency: 'Monthly',
        category: (data.category as string) || 'Salary',
        nextDate: data.date || data.dueDate || new Date().toISOString().split('T')[0],
        status: 'active',
        isTaxWithheld: false,
      };

      if (userId) {
        const { error } = await supabase.from('incomes').insert({
          name: newIncome.name,
          amount: newIncome.amount,
          frequency: newIncome.frequency,
          category: newIncome.category,
          next_date: newIncome.nextDate,
          status: newIncome.status,
          is_tax_withheld: newIncome.isTaxWithheld,
          user_id: userId,
        });
        if (error) {
          toast.error('Failed to save income. Please try again.');
          return false;
        }
      }

      set((state) => ({
        incomes: [...state.incomes, newIncome],
        pendingIngestions: state.pendingIngestions.filter((pending) => pending.id !== id),
      }));
      saved = true;
    } else if (item.type === 'debt') {
      if (!requirePositiveAmount()) return false;
      const ok = await get().addDebt({
        name: merchantName || 'Debt',
        type: 'Loan',
        apr: typeof data.debtApr === 'number' && !Number.isNaN(data.debtApr) ? data.debtApr : 0,
        remaining: amount,
        minPayment:
          typeof data.debtMinPayment === 'number' && !Number.isNaN(data.debtMinPayment) && data.debtMinPayment > 0
            ? data.debtMinPayment
            : Math.max(25, Math.round(amount * 0.02 * 100) / 100),
        paid: 0,
      });
      if (!ok) return false;

      set((state) => ({
        pendingIngestions: state.pendingIngestions.filter((pending) => pending.id !== id),
      }));
      saved = true;
    } else if (item.type === 'citation') {
      if (!requirePositiveAmount()) return false;
      const jurisdiction = (data.jurisdiction || data.biller || merchantName || 'Issuing authority (verify)').trim();
      const daysLeft =
        typeof data.daysLeft === 'number' && !Number.isNaN(data.daysLeft)
          ? Math.max(0, Math.floor(data.daysLeft))
          : parseInt(String(data.daysLeft ?? '30'), 10) || 30;
      const penaltyFee = typeof data.penaltyFee === 'number' && !Number.isNaN(data.penaltyFee) ? data.penaltyFee : 0;
      const ok = await get().addCitation({
        type: data.citationType || 'Toll Violation',
        jurisdiction,
        daysLeft,
        amount,
        penaltyFee,
        date: data.date || data.dueDate || new Date().toISOString().split('T')[0],
        citationNumber: (data.citationNumber || '').trim(),
        paymentUrl: (() => {
          const url = (data.paymentUrl || '').trim();
          if (!url) return '';
          try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : '';
          } catch {
            return '';
          }
        })(),
        status: 'open',
      });
      if (!ok) return false;

      set((state) => ({
        pendingIngestions: state.pendingIngestions.filter((pending) => pending.id !== id),
      }));
      saved = true;
    } else {
      toast.error('Unsupported document type for this inbox row.');
      return false;
    }

    if (saved && userId) {
      await supabase.from('pending_ingestions').delete().eq('id', id).eq('user_id', userId);
      if (item.storagePath) await removeIngestionStoragePath(item.storagePath);
    }

    if (saved) toast.success(`Saved ${item.type} to history`);
    return saved;
  },
});
