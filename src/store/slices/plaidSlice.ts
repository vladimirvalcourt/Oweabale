import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { disconnectPlaid, syncPlaidTransactions as invokePlaidSync } from '@/lib/api/plaid';
import { supabase } from '@/lib/api/supabase';
import type { AppState } from '@/types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createPlaidSlice: StoreSlice<
  Pick<
    AppState,
    'connectBank' | 'disconnectBank' | 'syncPlaidTransactions' | 'updatePlaidAccountIncludeInSavings'
  >
> = (set, get) => ({
  connectBank: async () => {
    await get().fetchData();
  },

  disconnectBank: async () => {
    const result = await disconnectPlaid();
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    await get().fetchData();
    toast.success('Bank disconnected.');
  },

  syncPlaidTransactions: async (opts?: { quiet?: boolean }) => {
    console.log('[Plaid Sync] Starting transaction sync...');
    const result = await invokePlaidSync();
    if ('error' in result) {
      console.error('[Plaid Sync] Error:', result.error);
      if (!opts?.quiet) toast.error(result.error);
      return false;
    }

    console.log('[Plaid Sync] Sync completed, polling for data changes...', result);

    // Enhanced polling for data changes to ensure Edge Function DB writes are fully committed
    // before we consider the sync complete. Prevents race conditions where
    // fetchData() reads stale data immediately after sync completes.
    const previousState = {
      transactionCount: get().transactions.length,
      plaidAccountCount: get().plaidAccounts.length,
      lastSyncAt: get().plaidLastSyncAt,
      relinkState: get().plaidNeedsRelink,
    };

    let attempts = 0;
    const maxAttempts = 8; // Increased from 5 to 8 for better reliability

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 750)); // Increased delay from 500ms to 750ms
      console.log(`[Plaid Sync] Polling for updates (attempt ${attempts + 1}/${maxAttempts})...`);
      await get().fetchData();

      const currentState = {
        transactionCount: get().transactions.length,
        plaidAccountCount: get().plaidAccounts.length,
        lastSyncAt: get().plaidLastSyncAt,
        relinkState: get().plaidNeedsRelink,
      };

      const dataChanged =
        currentState.transactionCount !== previousState.transactionCount ||
        currentState.plaidAccountCount !== previousState.plaidAccountCount ||
        currentState.lastSyncAt !== previousState.lastSyncAt ||
        currentState.relinkState !== previousState.relinkState;

      if (dataChanged) {
        console.log('[Plaid Sync] Data changes detected:', {
          transactions: `${previousState.transactionCount} → ${currentState.transactionCount}`,
          accounts: `${previousState.plaidAccountCount} → ${currentState.plaidAccountCount}`,
          lastSyncAt: previousState.lastSyncAt !== currentState.lastSyncAt,
          relinkState: previousState.relinkState !== currentState.relinkState,
        });
        break;
      }

      attempts++;
    }

    // Final fetch to ensure state consistency
    await get().fetchData();

    if (attempts === maxAttempts) {
      console.warn('[Plaid Sync] Max polling attempts reached — data may not have changed');
    }

    if (!opts?.quiet) {
      if (result.product_not_ready) {
        toast.message('Bank connected. Plaid is loading your transaction history — check back in a few minutes or tap Sync now.');
      } else if (result.errors > 0) {
        if (get().plaidNeedsRelink) {
          const institution = get().plaidInstitutionName?.trim();
          const bankLabel = institution && institution.length > 0 ? institution : 'your bank';
          toast.error(`Sync found a bank login issue. Use Fix connection to reconnect ${bankLabel}.`);
        } else {
          toast.message(`Sync finished with ${result.errors} item error(s). Check bank status.`);
        }
      } else {
        toast.success('Transactions synced.');
      }
    }

    return true;
  },

  updatePlaidAccountIncludeInSavings: async (accountRowId, include) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      toast.error('Sign in to update savings accounts.');
      return false;
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('plaid_accounts')
      .update({ include_in_savings: include, updated_at: now })
      .eq('id', accountRowId)
      .eq('user_id', userId);

    if (error) {
      console.error('[updatePlaidAccountIncludeInSavings]', error);
      toast.error('Could not update account.');
      return false;
    }

    set((state) => ({
      plaidAccounts: state.plaidAccounts.map((account) =>
        account.id === accountRowId ? { ...account, includeInSavings: include } : account,
      ),
    }));

    return true;
  },
});
