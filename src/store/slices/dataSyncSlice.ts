import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '@/lib/api/supabase';
import {
  normalizeFinancialAlertPrefs,
} from '@/lib/api/services/financialAlertPrefs';
import {
  isNotificationPrefsEmpty,
  mergeNotificationPrefsFromSources,
} from '@/lib/api/services/notificationPreferences';
import { loadNotifPrefs, NOTIF_PREFS_STORAGE_KEY } from '@/pages/settings/constants';
import type {
  AdminBroadcast,
  AppState,
  Bill,
  Budget,
  CategorizationExclusion,
  CategorizationRule,
  Category,
  Citation,
  ClientInvoice,
  CreditFix,
  Goal,
  IncomeSource,
  InsurancePolicy,
  InvestmentAccount,
  MileageLogEntry,
  Subscription,
  Transaction,
} from '@/types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createDataSyncSlice: StoreSlice<Pick<AppState, 'isLoading' | 'phase2Hydrated' | 'fetchData' | 'loadMoreTransactions'>> =
  (set, get) => ({
    isLoading: false,
    phase2Hydrated: false,

    /**
     * Fetch all user data from Supabase in a two-phase loading strategy.
     *
     * **Phase 1 (Critical):** Loads core financial records needed for immediate UI rendering:
     * - User profile and household membership
     * - Transactions (paginated, 100 at a time)
     * - Bills, debts, income sources, subscriptions
     * - Plaid-connected bank accounts
     *
     * **Phase 2 (Background):** Loads secondary data for advanced features:
     * - Goals, budgets, categories
     * - Citations, deductions, freelance entries
     * - Mileage logs, client invoices
     * - Categorization rules and exclusions
     * - Credit fixes, investment accounts, insurance policies
     *
     * **Loading Strategy:**
     * - Initial fetch: Shows loading spinner, blocks UI
     * - Background refresh: Silent update, no spinner
     * - Load more transactions: Cursor-based pagination, appends to existing list
     *
     * **Data Mapping:** Converts snake_case database columns to camelCase TypeScript fields.
     * Handles both formats for backward compatibility: `(w.snake_case ?? w.camelCase)`
     *
     * @param userId - Optional user ID override (defaults to current auth user)
     * @param options.background - If true, fetch silently without showing loading state
     * @param options.loadMore - If true, fetch next page of transactions using cursor
     *
     * @example
     * ```ts
     * // Initial load on login
     * await fetchData();
     *
     * // Background refresh every 5 minutes
     * setInterval(() => fetchData(undefined, { background: true }), 300000);
     *
     * // Load more transactions when user scrolls
     * await fetchData(undefined, { loadMore: true });
     * ```
     */
    fetchData: async (userId?: string, options?: { background?: boolean; loadMore?: boolean; fullLoad?: boolean }) => {
      const state = get();

      // Guard against concurrent calls
      if (state.isLoading && !options?.background) {
        console.warn('[fetchData] Already loading, skipping duplicate call');
        return;
      }

      // Guard against calling without valid user
      const currentUserId = userId ?? state.user?.id;
      if (!currentUserId && !options?.background) {
        console.warn('[fetchData] No user ID available — skipping load');
        return;
      }

      // EGRESS OPTIMIZATION: Skip refetch if data is fresh (< 5 minutes old)
      const now = Date.now();
      const lastFetchTime = state.lastDataFetchTime || 0;
      const FRESHNESS_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
      
      if (!options?.loadMore && !options?.background && (now - lastFetchTime < FRESHNESS_THRESHOLD_MS)) {
        console.log('[fetchData] Data is fresh, skipping refetch to save egress');
        return;
      }

      const background = options?.background === true;
      const loadMore = options?.loadMore === true;
      const fullLoad = options?.fullLoad === true; // Load all Phase 2 data

      // Only show loading spinner on initial fetch, not when loading more
      if (!background && !loadMore) set({ isLoading: true, phase2Hydrated: false });
      // Safety timeout: force dismiss loader after 15 seconds to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        console.warn('[fetchData] SAFETY TIMEOUT: Fetch taking too long, forcing loader dismissal');
        toast.warning('Data sync is taking longer than expected. Showing available data.');
        set({ isLoading: false, phase2Hydrated: true });
      }, 15000);


      let resolvedUserId: string | undefined;
      try {
        resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
      } catch (authError) {
        console.error('[fetchData] Auth session error:', authError);
        toast.error('Authentication error. Please refresh the page.', {
          action: {
            label: 'Clear & Reload',
            onClick: () => {
              import('@/lib/api/supabase/client').then(({ clearLocalState }) => {
                clearLocalState();
              });
            },
          },
        });
        clearTimeout(safetyTimeout);
        if (!background) set({ isLoading: false, phase2Hydrated: true });
        return;
      }

      if (!resolvedUserId) {
        console.warn('[fetchData] No user ID available — skipping load');
        clearTimeout(safetyTimeout);
        if (!background) {
          toast.error('Session expired. Please sign in again.', {
            action: {
              label: 'Sign Out',
              onClick: () => {
                import('@/lib/api/supabase/client').then(({ clearLocalState }) => {
                  clearLocalState();
                });
              },
            },
          });
          set({ isLoading: false, phase2Hydrated: true });
        }
        return;
      }

      console.log('[fetchData] starting fetch for user:', resolvedUserId);
      console.time('[fetchData] Total fetch time');

      void (async () => {
        const { error } = await supabase.rpc('flip_overdue_bills');
        if (error) console.warn('[fetchData] flip_overdue_bills RPC failed:', error.message);
      })();

      // Transaction pagination: fetch in pages of 50 to reduce egress
      const TRANSACTION_PAGE_SIZE = 50;
      const lastCursor = get().lastTransactionCursor;

      let transactionsQuery = supabase
        .from('transactions')
        .select('id,name,category,date,amount,type,platform_tag,notes,plaid_account_id')
        .eq('user_id', resolvedUserId)
        .order('date', { ascending: false })
        .limit(TRANSACTION_PAGE_SIZE);

      // If loading more, use cursor-based pagination
      if (loadMore && lastCursor) {
        transactionsQuery = transactionsQuery.lt('date', lastCursor);
      }

      const phase2Promise = Promise.all([
        supabase.from('goals').select('id,name,target_amount,current_amount,deadline,priority,status,type,color,user_id').eq('user_id', resolvedUserId),
        supabase.from('budgets').select('id,category,amount,period,rollover_enabled,lock_mode,user_id').eq('user_id', resolvedUserId),
        supabase.from('categories').select('id,name,type,color,icon,user_id').eq('user_id', resolvedUserId),
        supabase.from('citations').select('id,type,jurisdiction,days_left,amount,penalty_fee,date,citation_number,payment_url,status,user_id').eq('user_id', resolvedUserId),
        supabase.from('deductions').select('id,name,category,amount,date,user_id').eq('user_id', resolvedUserId),
        supabase.from('freelance_entries').select('id,client,amount,date,is_vaulted,scoured_write_offs,user_id').eq('user_id', resolvedUserId),
        supabase.from('mileage_log').select('id,trip_date,start_location,end_location,miles,purpose,platform,irs_rate_per_mile,deduction_amount,user_id').eq('user_id', resolvedUserId).order('trip_date', { ascending: false }),
        supabase.from('client_invoices').select('id,client_name,amount,issued_date,due_date,status,notes,user_id').eq('user_id', resolvedUserId).order('due_date', { ascending: false }),
        supabase.from('pending_ingestions').select('id,type,status,extracted_data,original_file,storage_path,storage_url,user_id').eq('user_id', resolvedUserId),
        supabase.from('categorization_exclusions').select('id,scope,transaction_id,merchant_name,user_id').eq('user_id', resolvedUserId).order('created_at', { ascending: false }),
        supabase.from('credit_fixes').select('id,item_type,description,status,created_at,user_id').eq('user_id', resolvedUserId).order('created_at', { ascending: false }),
        supabase.from('admin_broadcasts').select('id,title,message,level,created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('platform_settings').select('id,key,value,created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('net_worth_snapshots').select('id,date,net_worth,assets,debts,user_id').eq('user_id', resolvedUserId).order('date', { ascending: true }).limit(90),
      ]);

      try {
        console.log('[fetchData] Executing phase1 queries...');
        console.time('[fetchData] Phase 1 queries');
        const [
          { data: profile, error: profileError },
          { data: bills, error: billsError },
          { data: debts, error: debtsError },
          { data: transactionsPage, error: transactionsError },
          { data: assets, error: assetsError },
          { data: incomes, error: incomesError },
          { data: subscriptions, error: subscriptionsError },
          { data: plaidAccountsRows, error: plaidAccountsError },
        ] = await Promise.all([
          supabase.from('profiles').select('id,first_name,last_name,email,avatar,theme,phone,timezone,language,notification_prefs,plan,trial_started_at,trial_ends_at,trial_expired,credit_score,credit_last_updated,plaid_linked_at,plaid_institution_name,plaid_last_sync_at,plaid_needs_relink,tax_state,tax_rate').eq('id', resolvedUserId).maybeSingle(),
          supabase.from('bills').select('id,biller,amount,category,due_date,frequency,status,auto_pay,user_id').eq('user_id', resolvedUserId),
          supabase.from('debts').select('id,name,type,apr,remaining,min_payment,paid,payment_due_date,original_amount,origination_date,term_months,user_id').eq('user_id', resolvedUserId),
          // Reduced from 500 to TRANSACTION_PAGE_SIZE (50) to minimize egress
          transactionsQuery,
          supabase.from('assets').select('id,name,value,type,appreciation_rate,purchase_price,purchase_date,user_id').eq('user_id', resolvedUserId),
          supabase.from('incomes').select('id,name,amount,frequency,category,next_date,status,is_tax_withheld,user_id').eq('user_id', resolvedUserId),
          supabase.from('subscriptions').select('id,name,amount,frequency,next_billing_date,status,price_history,user_id').eq('user_id', resolvedUserId),
          supabase.from('plaid_accounts').select('id,plaid_account_id,name,official_name,account_type,account_subtype,mask,subtype_suggested_savings,include_in_savings,updated_at,user_id').eq('user_id', resolvedUserId).order('name', { ascending: true }),
        ]);
        console.timeEnd('[fetchData] Phase 1 queries');
        console.log('[fetchData] Phase 1 complete - bills:', bills?.length, 'debts:', debts?.length, 'transactions:', transactionsPage?.length);

        // Check for critical RLS errors (500 status codes indicate policy failures)
        const criticalErrors = [
          { name: 'Bills', error: billsError },
          { name: 'Debts', error: debtsError },
          { name: 'Transactions', error: transactionsError },
          { name: 'Assets', error: assetsError },
          { name: 'Incomes', error: incomesError },
          { name: 'Subscriptions', error: subscriptionsError },
        ].filter(item => item.error && ((item.error as any).code === '42501' || (item.error as any).status === 500));

        if (criticalErrors.length > 0) {
          console.error('[fetchData] CRITICAL RLS ERRORS DETECTED:', criticalErrors);
          const tableNames = criticalErrors.map(e => e.name).join(', ');
          toast.error(`Database access error for: ${tableNames}.`, {
            description: 'Try signing out and back in to refresh your session.',
            action: {
              label: 'Clear State',
              onClick: () => {
                import('@/lib/api/supabase/client').then(({ clearLocalState }) => {
                  clearLocalState();
                });
              },
            },
          });
          // Don't return early - continue with empty arrays to avoid white screen
        }

        // Handle profile fetch errors specifically - may indicate missing profile
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[fetchData] Profile fetch error:', profileError);
          if ((profileError as any).status === 500) {
            console.error('[fetchData] Profile query returned 500 - possible RLS or trigger issue');
            toast.warning('Profile sync issue detected. Try refreshing the page.');
          }
        }

        // Debug logging for Plaid sync troubleshooting
        console.log('[fetchData] Transactions fetched:', transactionsPage?.length || 0);
        console.log('[fetchData] Plaid accounts fetched:', plaidAccountsRows?.length || 0);
        if (plaidAccountsRows && plaidAccountsRows.length > 0) {
          console.log('[fetchData] First plaid account:', {
            id: plaidAccountsRows[0].id,
            name: plaidAccountsRows[0].name,
            account_type: plaidAccountsRows[0].account_type,
          });
        }
        console.log('[fetchData] Bank connected:', !!(profile && (profile as Record<string, unknown>).plaid_linked_at));

        if (billsError) {
          console.error('[fetchData] Bills fetch error:', billsError);
          console.error('[fetchData] Bills error details:', { code: billsError.code, message: billsError.message });
        }
        if (debtsError) console.error('[fetchData] Debts fetch error:', debtsError);
        if (transactionsError) console.error('[fetchData] Transactions fetch error:', transactionsError);
        if (assetsError) console.error('[fetchData] Assets fetch error:', assetsError);
        if (incomesError) console.error('[fetchData] Incomes fetch error:', incomesError);
        if (subscriptionsError) console.error('[fetchData] Subscriptions fetch error:', subscriptionsError);
        if (plaidAccountsError) console.error('[fetchData] Plaid accounts fetch error:', plaidAccountsError);
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[fetchData] Profile fetch error:', profileError);
        }

        console.log('[fetchData] Setting phase1 state...');
        set({
          bills: (bills || []).map((bill: Record<string, unknown>) => ({
            id: bill.id as string,
            biller: bill.biller as string,
            amount: bill.amount as number,
            category: bill.category as string,
            dueDate: (bill.due_date ?? bill.dueDate) as string,
            frequency: bill.frequency as string,
            status: bill.status as Bill['status'],
            autoPay: (bill.auto_pay ?? bill.autoPay) as boolean,
          })),
          debts: (debts || []).map((debt: Record<string, unknown>) => ({
            id: debt.id as string,
            name: debt.name as string,
            type: debt.type as string,
            apr: debt.apr as number,
            remaining: debt.remaining as number,
            minPayment: (debt.min_payment ?? debt.minPayment) as number,
            paid: debt.paid as number,
            paymentDueDate: (debt.payment_due_date ?? debt.paymentDueDate ?? null) as string | null | undefined,
            originalAmount: (debt.original_amount ?? undefined) as number | undefined,
            originationDate: (debt.origination_date ?? undefined) as string | undefined,
            termMonths: (debt.term_months ?? undefined) as number | undefined,
          })),
          // Handle pagination: append new transactions or replace existing
          transactions: (() => {
            const newTransactions = (transactionsPage || []).map((transaction: Record<string, unknown>) => ({
              id: transaction.id as string,
              name: transaction.name as string,
              category: (transaction.category ?? '') as string,
              date: transaction.date as string,
              amount: transaction.amount as number,
              type: (transaction.type ?? 'expense') as Transaction['type'],
              platformTag: (() => {
                const platformTag = transaction.platform_tag ?? transaction.platformTag;
                const value = typeof platformTag === 'string' ? platformTag.trim() : '';
                return value || undefined;
              })(),
              notes: (() => {
                const notes = transaction.notes;
                if (notes == null) return undefined;
                const value = String(notes).trim();
                return value || undefined;
              })(),
              plaidAccountId: (() => {
                const plaidAccountId = transaction.plaid_account_id ?? transaction.plaidAccountId;
                return typeof plaidAccountId === 'string' && plaidAccountId.length > 0 ? plaidAccountId : undefined;
              })(),
            }));

            // If loading more, append to existing; otherwise replace
            if (loadMore) {
              return [...get().transactions, ...newTransactions];
            }
            return newTransactions;
          })(),
          plaidAccounts: (plaidAccountsRows || []).map((row: Record<string, unknown>) => ({
            id: row.id as string,
            plaidAccountId: row.plaid_account_id as string,
            name: row.name as string,
            officialName: (row.official_name ?? null) as string | null,
            accountType: (row.account_type ?? 'other') as string,
            accountSubtype: (row.account_subtype ?? null) as string | null,
            mask: (row.mask ?? null) as string | null,
            subtypeSuggestedSavings: row.subtype_suggested_savings === true,
            includeInSavings: row.include_in_savings === true,
            lastSyncAt: (row.updated_at ?? null) as string | null,
          })),
          assets: (assets || []).map((asset: Record<string, unknown>) => ({
            id: asset.id as string,
            name: asset.name as string,
            value: asset.value as number,
            type: asset.type as string,
            appreciationRate: (asset.appreciation_rate ?? undefined) as number | undefined,
            purchasePrice: (asset.purchase_price ?? undefined) as number | undefined,
            purchaseDate: (asset.purchase_date ?? undefined) as string | undefined,
          })),
          incomes: (incomes || []).map((income: Record<string, unknown>) => ({
            id: income.id as string,
            name: income.name as string,
            amount: income.amount as number,
            frequency: income.frequency as IncomeSource['frequency'],
            category: income.category as string,
            nextDate: (income.next_date ?? income.nextDate) as string,
            status: income.status as IncomeSource['status'],
            isTaxWithheld: (income.is_tax_withheld ?? income.isTaxWithheld ?? false) as boolean,
          })),
          subscriptions: (subscriptions || []).map((subscription: Record<string, unknown>) => ({
            id: subscription.id as string,
            name: subscription.name as string,
            amount: subscription.amount as number,
            frequency: subscription.frequency as string,
            nextBillingDate: (subscription.next_billing_date ?? subscription.nextBillingDate) as string,
            status: subscription.status as Subscription['status'],
            priceHistory: (subscription.price_history ?? subscription.priceHistory ?? []) as { date: string; amount: number }[],
          })),
          bankConnected: !!(profile && (profile as Record<string, unknown>).plaid_linked_at),
          plaidInstitutionName: profile ? (((profile as Record<string, unknown>).plaid_institution_name as string | null) ?? null) : null,
          plaidLastSyncAt: profile ? (((profile as Record<string, unknown>).plaid_last_sync_at as string | null) ?? null) : null,
          plaidNeedsRelink: profile ? ((profile as Record<string, unknown>).plaid_needs_relink === true) : false,
          // Update pagination cursors
          hasMoreTransactions: (transactionsPage?.length ?? 0) === TRANSACTION_PAGE_SIZE,
          lastTransactionCursor: transactionsPage && transactionsPage.length > 0
            ? transactionsPage[transactionsPage.length - 1].date as string
            : get().lastTransactionCursor,
          credit: profile
            ? {
              ...get().credit,
              score: profile.credit_score ?? get().credit.score,
              lastUpdated: profile.credit_last_updated ?? get().credit.lastUpdated,
            }
            : get().credit,
          user: profile
            ? {
              id: profile.id,
              firstName: profile.first_name ?? '',
              lastName: profile.last_name ?? '',
              email: profile.email ?? '',
              avatar: profile.avatar ?? '',
              theme: profile.theme ?? 'Dark',
              phone: profile.phone ?? '',
              timezone: profile.timezone ?? 'America/New_York',
              language: profile.language || 'English (US)',
              notificationPrefs: (() => {
                const serverRaw = (profile as { notification_prefs?: unknown }).notification_prefs;
                const merged = mergeNotificationPrefsFromSources(serverRaw, loadNotifPrefs());
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.setItem(NOTIF_PREFS_STORAGE_KEY, JSON.stringify(merged));
                  } catch {
                    // ignore storage failures
                  }
                }
                if (isNotificationPrefsEmpty(serverRaw)) {
                  void supabase.from('profiles').upsert(
                    { id: resolvedUserId, notification_prefs: merged },
                    { onConflict: 'id' },
                  );
                }
                return merged;
              })(),
              hasCompletedOnboarding: profile.has_completed_onboarding === true,
              taxState: profile.tax_state ?? '',
              taxRate: profile.tax_rate ?? 0,
              taxReservePercent: (profile as { tax_reserve_percent?: number }).tax_reserve_percent ?? 30,
              steadySalaryTarget: (profile as { steady_salary_target?: number }).steady_salary_target ?? 0,
              financialAlertPrefs: normalizeFinancialAlertPrefs(
                (profile as { alert_preferences?: unknown }).alert_preferences,
              ),
              isAdmin: profile.is_admin === true,
            }
            : { ...get().user, id: resolvedUserId },
        });

        if (!background) set({ isLoading: false });

        console.log('[fetchData] Phase 1 state updated, starting phase2...');
        console.time('[fetchData] Phase 2 queries');

        // EGRESS OPTIMIZATION: Only load Phase 2 data if explicitly requested or first load
        // This prevents loading goals, budgets, citations etc. on every dashboard refresh
        const shouldLoadPhase2 = fullLoad || !state.phase2Hydrated;
        
        if (!shouldLoadPhase2) {
          console.log('[fetchData] Skipping Phase 2 (not full load, already hydrated)');
          set({ phase2Hydrated: true });
          return;
        }

        let phase2RecordCount = 0;

        try {
          const [
            { data: goalsRaw, error: goalsError },
            { data: budgetsRaw, error: budgetsError },
            { data: categoriesRaw, error: categoriesError },
            { data: citationsRaw, error: citationsError },
            { data: deductionsRaw, error: deductionsError },
            { data: freelanceEntriesRaw, error: freelanceEntriesError },
            { data: mileageLogRowsRaw, error: mileageLogError },
            { data: clientInvoicesRowsRaw, error: clientInvoicesError },
            { data: pendingIngestionsRaw, error: pendingIngestionsError },
            { data: categorizationExclusionsRaw, error: categorizationExclusionsError },
            { data: creditFixesRaw, error: creditFixesError },
            { data: adminBroadcastsRaw, error: adminBroadcastsError },
            { data: platformSettingsRaw, error: platformSettingsError },
            { data: netWorthSnapshotsRaw, error: netWorthSnapshotsError },
          ] = await phase2Promise;
          
          // Ensure all data is an array, never undefined
          const goals = goalsError ? [] : (goalsRaw ?? []);
          const budgets = budgetsError ? [] : (budgetsRaw ?? []);
          const categories = categoriesError ? [] : (categoriesRaw ?? []);
          const citations = citationsError ? [] : (citationsRaw ?? []);
          const deductions = deductionsError ? [] : (deductionsRaw ?? []);
          const freelanceEntries = freelanceEntriesError ? [] : (freelanceEntriesRaw ?? []);
          const mileageLogRows = mileageLogError ? [] : (mileageLogRowsRaw ?? []);
          const clientInvoicesRows = clientInvoicesError ? [] : (clientInvoicesRowsRaw ?? []);
          const pendingIngestions = pendingIngestionsError ? [] : (pendingIngestionsRaw ?? []);
          const categorizationExclusions = categorizationExclusionsError ? [] : (categorizationExclusionsRaw ?? []);
          const creditFixes = creditFixesError ? [] : (creditFixesRaw ?? []);
          const adminBroadcasts = adminBroadcastsError ? [] : (adminBroadcastsRaw ?? []);
          const platformSettings = platformSettingsError ? null : platformSettingsRaw;
          const netWorthSnapshots = netWorthSnapshotsError ? [] : (netWorthSnapshotsRaw ?? []);
          
          console.timeEnd('[fetchData] Phase 2 queries');
          console.log('[fetchData] Phase 2 complete - goals:', goals.length, 'citations:', citations.length);

          set({
            goals: (goals || []).map((goal: Record<string, unknown>) => ({
              id: goal.id as string,
              name: goal.name as string,
              targetAmount: (goal.target_amount ?? goal.targetAmount) as number,
              currentAmount: (goal.current_amount ?? goal.currentAmount) as number,
              deadline: goal.deadline as string,
              type: goal.type as Goal['type'],
              color: goal.color as string,
            })),
            budgets: (budgets || []).map((budget: Record<string, unknown>) => ({
              id: budget.id as string,
              category: budget.category as string,
              amount: budget.amount as number,
              period: budget.period as Budget['period'],
              rolloverEnabled: Boolean(budget.rollover_enabled ?? budget.rolloverEnabled),
              lockMode: (budget.lock_mode ?? budget.lockMode ?? 'none') as Budget['lockMode'],
            })),
            categories: (categories || []).map((category: Record<string, unknown>) => ({
              id: category.id as string,
              name: category.name as string,
              color: category.color as string,
              type: category.type as Category['type'],
            })),
            citations: (citations || []).map((citation: Record<string, unknown>) => {
              const storedDate = citation.date as string;
              const computedDaysLeft = storedDate
                ? Math.ceil((new Date(storedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : (citation.days_left ?? citation.daysLeft) as number;
              return {
                id: citation.id as string,
                type: citation.type as string,
                jurisdiction: citation.jurisdiction as string,
                daysLeft: computedDaysLeft,
                amount: citation.amount as number,
                penaltyFee: (citation.penalty_fee ?? citation.penaltyFee) as number,
                date: storedDate,
                citationNumber: (citation.citation_number ?? citation.citationNumber) as string,
                paymentUrl: (citation.payment_url ?? citation.paymentUrl) as string,
                status: citation.status as Citation['status'],
              };
            }),
            deductions: (deductions || []).map((deduction: Record<string, unknown>) => ({
              id: deduction.id as string,
              name: deduction.name as string,
              category: deduction.category as string,
              amount: deduction.amount as number,
              date: deduction.date as string,
            })),
            freelanceEntries: (freelanceEntries || []).map((entry: Record<string, unknown>) => ({
              id: entry.id as string,
              client: entry.client as string,
              amount: entry.amount as number,
              date: entry.date as string,
              isVaulted: (entry.is_vaulted ?? entry.isVaulted ?? false) as boolean,
              scouredWriteOffs: (entry.scoured_write_offs ?? entry.scouredWriteOffs ?? 0) as number,
            })),
            mileageLog: (mileageLogRows || []).map((entry: Record<string, unknown>) => {
              const rawDate = entry.trip_date as string;
              const tripDate = typeof rawDate === 'string' ? rawDate.slice(0, 10) : '';
              return {
                id: entry.id as string,
                tripDate,
                startLocation: String(entry.start_location ?? ''),
                endLocation: String(entry.end_location ?? ''),
                miles: Number(entry.miles) || 0,
                purpose: entry.purpose as MileageLogEntry['purpose'],
                platform: String(entry.platform ?? ''),
                irsRatePerMile: Number(entry.irs_rate_per_mile) || 0,
                deductionAmount: Number(entry.deduction_amount) || 0,
              };
            }),
            clientInvoices: (clientInvoicesRows || []).map((invoice: Record<string, unknown>) => ({
              id: invoice.id as string,
              clientName: String(invoice.client_name ?? ''),
              amount: Number(invoice.amount) || 0,
              issuedDate: typeof invoice.issued_date === 'string' ? invoice.issued_date.slice(0, 10) : '',
              dueDate: typeof invoice.due_date === 'string' ? invoice.due_date.slice(0, 10) : '',
              status: invoice.status as ClientInvoice['status'],
              notes: String(invoice.notes ?? ''),
            })),
            pendingIngestions: (pendingIngestions || []).map((pending: Record<string, unknown>) => ({
              id: pending.id as string,
              type: pending.type as AppState['pendingIngestions'][number]['type'],
              status: pending.status as string,
              source: 'desktop',
              extractedData: (pending.extracted_data ?? {}) as AppState['pendingIngestions'][number]['extractedData'],
              originalFile: (pending.original_file ?? undefined) as AppState['pendingIngestions'][number]['originalFile'],
              storagePath: (pending.storage_path ?? undefined) as string | undefined,
              storageUrl: (pending.storage_url ?? undefined) as string | undefined,
            })),
            categorizationExclusions: (categorizationExclusions || []).map((exclusion: Record<string, unknown>) => ({
              id: exclusion.id as string,
              scope: exclusion.scope as CategorizationExclusion['scope'],
              transaction_id: (exclusion.transaction_id ?? null) as string | null,
              merchant_name: (exclusion.merchant_name ?? null) as string | null,
            })),
            credit: {
              ...get().credit,
              fixes: (creditFixes || []).map((fix: Record<string, unknown>) => ({
                id: fix.id as string,
                item: fix.item as string,
                amount: fix.amount as number,
                status: fix.status as CreditFix['status'],
                bureau: fix.bureau as string,
                notes: (fix.notes ?? '') as string,
              })),
            },
            adminBroadcasts: (adminBroadcasts || []).map((broadcast: Record<string, unknown>) => ({
              id: broadcast.id as string,
              title: broadcast.title as string,
              content: broadcast.content as string,
              type: broadcast.type as AdminBroadcast['type'],
              createdAt: broadcast.created_at as string,
            })),
            platformSettings: platformSettings
              ? {
                id: platformSettings.id as string,
                maintenanceMode: platformSettings.maintenance_mode as boolean,
                plaidEnabled: platformSettings.plaid_enabled as boolean,
                broadcastMessage: platformSettings.broadcast_message as string,
                taxStandardDeduction: platformSettings.tax_standard_deduction as number,
                taxTopBracket: platformSettings.tax_top_bracket as number,
              }
              : null,
            netWorthSnapshots: (netWorthSnapshots || []).map((snapshot: Record<string, unknown>) => ({
              id: snapshot.id as string,
              date: snapshot.date as string,
              netWorth: snapshot.net_worth as number,
              assets: snapshot.assets as number,
              debts: snapshot.debts as number,
            })),
          });

          phase2RecordCount =
            (goals?.length ?? 0) +
            (budgets?.length ?? 0) +
            (categories?.length ?? 0) +
            (citations?.length ?? 0) +
            (deductions?.length ?? 0) +
            (freelanceEntries?.length ?? 0) +
            (mileageLogRows?.length ?? 0) +
            (clientInvoicesRows?.length ?? 0) +
            (pendingIngestions?.length ?? 0) +
            (creditFixes?.length ?? 0) +
            (netWorthSnapshots?.length ?? 0) +
            (adminBroadcasts?.length ?? 0);
        } catch (phase2Error) {
          console.error('[fetchData] phase 2 hydration failed:', phase2Error);
        } finally {
          if (!background) set({ phase2Hydrated: true });
        }

        try {
          type AssetRow = { value?: number | string | null };
          type DebtRow = { remaining?: number | string | null };
          const toNum = (value: unknown): number => {
            const numeric = typeof value === 'number' ? value : Number(value);
            return Number.isFinite(numeric) ? numeric : 0;
          };
          const totalAssets = ((assets ?? []) as AssetRow[]).reduce((sum, asset) => sum + toNum(asset?.value), 0);
          const totalDebts = ((debts ?? []) as DebtRow[]).reduce((sum, debt) => sum + toNum(debt?.remaining), 0);
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('net_worth_snapshots').upsert(
            {
              user_id: resolvedUserId,
              date: today,
              net_worth: parseFloat((totalAssets - totalDebts).toFixed(2)),
              assets: parseFloat(totalAssets.toFixed(2)),
              debts: parseFloat(totalDebts.toFixed(2)),
            },
            { onConflict: 'user_id,date' },
          );
        } catch {
          // non-critical historical snapshot write
        }

        const recordCount =
          (bills?.length ?? 0) +
          (debts?.length ?? 0) +
          ((loadMore ? transactionsPage?.length : get().transactions.length) ?? 0) +
          (assets?.length ?? 0) +
          (incomes?.length ?? 0) +
          (subscriptions?.length ?? 0) +
          phase2RecordCount;

        console.log('[fetchData] All data loaded successfully, clearing loading state...');
        console.timeEnd('[fetchData] Total fetch time');
        
        // Update last fetch timestamp for egress optimization
        set({ lastDataFetchTime: Date.now() });
      } catch (err) {
        console.error('[fetchData] CRITICAL ERROR:', err);
        console.error('[fetchData] Error stack:', err instanceof Error ? err.stack : 'No stack');
        toast.error('Failed to load your financial data. Please refresh the page.');
      } finally {
        clearTimeout(safetyTimeout);
        console.log('[fetchData] Finally block - clearing isLoading');
        if (!background) {
          if (get().isLoading) {
            console.log('[fetchData] Setting isLoading to false');
            set({ isLoading: false });
          } else {
            console.warn('[fetchData] isLoading was already false - possible double-call?');
          }
          if (!get().phase2Hydrated) set({ phase2Hydrated: true });
        }
      }
    },

    loadMoreTransactions: async () => {
      // Check if there are more transactions to load
      if (!get().hasMoreTransactions) {
        console.log('[loadMoreTransactions] No more transactions to load');
        return;
      }

      console.log('[loadMoreTransactions] Loading next page...');
      await get().fetchData(undefined, { loadMore: true });
    },

    /**
     * EGRESS OPTIMIZATION: Explicitly load Phase 2 data (goals, budgets, citations, etc.)
     * Call this when user navigates to pages that need this data
     */
    loadPhase2Data: async () => {
      const state = get();
      if (!state.user?.id) {
        console.warn('[loadPhase2Data] No user ID available');
        return;
      }
      
      if (state.phase2Hydrated) {
        console.log('[loadPhase2Data] Phase 2 already loaded, skipping');
        return;
      }
      
      console.log('[loadPhase2Data] Loading Phase 2 data on demand...');
      await get().fetchData(state.user.id, { fullLoad: true, background: true });
    },
  });
