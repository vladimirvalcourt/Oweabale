import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '../../lib/api/supabase';
import { clearUserStorageKeys } from '../../app/constants';
import { initialData, DEFAULT_NOTIF_PREFS, NOTIF_PREFS_STORAGE_KEY, normalizeNotificationPrefsRecord } from '../initialState';
import type { AppState } from '../types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createAccountSlice: StoreSlice<
  Pick<
    AppState,
    'setTaxSettings' | 'updateUser' | 'signOut' | 'clearLocalData' | 'resetData' | 'deleteAccount'
  >
> = (set, get) => ({
  setTaxSettings: async (state, rate) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('profiles').upsert({ id: userId, tax_state: state, tax_rate: rate });
    }
    set((store) => ({ user: { ...store.user, taxState: state, taxRate: rate } }));
  },

  updateUser: async (user) => {
    const prevNotifPrefs = user.notificationPrefs !== undefined ? get().user.notificationPrefs : undefined;
    if (user.notificationPrefs !== undefined) {
      const nextNotif = user.notificationPrefs;
      set((state) => ({
        user: {
          ...state.user,
          notificationPrefs: nextNotif,
        },
      }));
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const patch: Record<string, unknown> = {};
    if (user.firstName !== undefined) patch.first_name = user.firstName;
    if (user.lastName !== undefined) patch.last_name = user.lastName;
    if (user.email !== undefined) patch.email = user.email;
    if (user.avatar !== undefined) patch.avatar = user.avatar;
    if (user.theme !== undefined) patch.theme = user.theme;
    if (user.phone !== undefined) patch.phone = user.phone;
    if (user.timezone !== undefined) patch.timezone = user.timezone;
    if (user.language !== undefined) patch.language = user.language;
    if (user.notificationPrefs !== undefined) patch.notification_prefs = user.notificationPrefs;
    if (user.taxState !== undefined) patch.tax_state = user.taxState;
    if (user.taxRate !== undefined) patch.tax_rate = user.taxRate;
    if (user.taxReservePercent !== undefined) patch.tax_reserve_percent = user.taxReservePercent;
    if (user.steadySalaryTarget !== undefined) patch.steady_salary_target = user.steadySalaryTarget;
    if (user.financialAlertPrefs !== undefined) {
      const prefs = user.financialAlertPrefs;
      patch.alert_preferences = {
        bill_due_days: prefs.billDueDays,
        over_budget: prefs.overBudget,
        low_cash: prefs.lowCash,
        debt_due: prefs.debtDue,
        invoice_due: prefs.invoiceDue,
      };
    }
    if (user.hasCompletedOnboarding !== undefined) patch.has_completed_onboarding = user.hasCompletedOnboarding;

    if (Object.keys(patch).length > 0) {
      if (!userId) {
        console.error('[updateUser] no authenticated user — cannot persist profile');
        if (prevNotifPrefs !== undefined) {
          set((state) => ({
            user: {
              ...state.user,
              notificationPrefs: prevNotifPrefs,
            },
          }));
        }
        toast.error('Could not save profile. Please try again.');
        return false;
      }
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...patch }, { onConflict: 'id' });
      if (error) {
        console.error('[updateUser] profile upsert failed:', error.message, error.code);
        if (prevNotifPrefs !== undefined) {
          set((state) => ({
            user: {
              ...state.user,
              notificationPrefs: prevNotifPrefs,
            },
          }));
        }
        toast.error('Could not save profile. Please try again.');
        return false;
      }
    }

    set((state) => ({ user: { ...state.user, ...user } }));

    if (user.notificationPrefs !== undefined && typeof window !== 'undefined') {
      try {
        localStorage.setItem(NOTIF_PREFS_STORAGE_KEY, JSON.stringify(get().user.notificationPrefs));
      } catch {
        // ignore quota / private mode
      }
    }

    return true;
  },

  signOut: async () => {
    clearUserStorageKeys();
    await supabase.auth.signOut();
    set({ ...initialData });
  },

  clearLocalData: () => {
    set({ ...initialData });
  },

  resetData: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    set({ isLoading: true });
    try {
      const tables = [
        'bills', 'debts', 'transactions', 'assets', 'subscriptions',
        'goals', 'incomes', 'budgets', 'categories', 'citations',
        'deductions', 'freelance_entries', 'mileage_log', 'client_invoices', 'pending_ingestions', 'credit_fixes', 'categorization_exclusions',
        'investment_accounts', 'insurance_policies',
      ];

      await Promise.all(tables.map((table) => supabase.from(table).delete().eq('user_id', userId)));

      await supabase.from('plaid_items').delete().eq('user_id', userId);

      await supabase.from('profiles').upsert({
        id: userId,
        has_completed_onboarding: false,
        tax_state: '',
        tax_rate: 0,
        plaid_institution_name: null,
        plaid_linked_at: null,
        plaid_last_sync_at: null,
        plaid_needs_relink: false,
        notification_prefs: DEFAULT_NOTIF_PREFS,
      });

      try {
        localStorage.setItem(NOTIF_PREFS_STORAGE_KEY, JSON.stringify(normalizeNotificationPrefsRecord(DEFAULT_NOTIF_PREFS)));
      } catch {
        // ignore
      }

      set({
        ...initialData,
        user: {
          ...get().user,
          hasCompletedOnboarding: false,
          taxState: '',
          taxRate: 0,
          notificationPrefs: normalizeNotificationPrefsRecord(DEFAULT_NOTIF_PREFS),
        },
        bankConnected: false,
        plaidInstitutionName: null,
        plaidLastSyncAt: null,
        plaidNeedsRelink: false,
      });

      toast.success('All data has been cleared. You are back at square one.');
      window.location.href = '/onboarding/setup';
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset account data');
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAccount: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await Promise.all([
        supabase.from('bills').delete().eq('user_id', userId),
        supabase.from('debts').delete().eq('user_id', userId),
        supabase.from('transactions').delete().eq('user_id', userId),
        supabase.from('assets').delete().eq('user_id', userId),
        supabase.from('subscriptions').delete().eq('user_id', userId),
        supabase.from('goals').delete().eq('user_id', userId),
        supabase.from('incomes').delete().eq('user_id', userId),
        supabase.from('budgets').delete().eq('user_id', userId),
        supabase.from('categories').delete().eq('user_id', userId),
        supabase.from('citations').delete().eq('user_id', userId),
        supabase.from('deductions').delete().eq('user_id', userId),
        supabase.from('freelance_entries').delete().eq('user_id', userId),
        supabase.from('mileage_log').delete().eq('user_id', userId),
        supabase.from('client_invoices').delete().eq('user_id', userId),
        supabase.from('categorization_exclusions').delete().eq('user_id', userId),
      ]);

      const { error: rpcError } = await supabase.rpc('delete_user');
      if (rpcError) {
        console.error('delete_user RPC failed — auth record not removed:', rpcError.message);
      }

      await supabase.auth.signOut();
    }
    set({ ...initialData });
  },
});
