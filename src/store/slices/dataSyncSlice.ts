import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '../../lib/api/supabase';
import {
  normalizeFinancialAlertPrefs,
} from '../../lib/api/services/financialAlertPrefs';
import {
  isNotificationPrefsEmpty,
  mergeNotificationPrefsFromSources,
} from '../../lib/api/services/notificationPreferences';
import { loadNotifPrefs, NOTIF_PREFS_STORAGE_KEY } from '../../pages/settings/constants';
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
} from '../types';

type StoreSlice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

export const createDataSyncSlice: StoreSlice<Pick<AppState, 'isLoading' | 'phase2Hydrated' | 'fetchData' | 'loadMoreTransactions'>> =
  (set, get) => ({
    isLoading: false,
    phase2Hydrated: false,

    fetchData: async (userId?: string, options?: { background?: boolean; loadMore?: boolean }) => {
      const background = options?.background === true;
      const loadMore = options?.loadMore === true;

      // Only show loading spinner on initial fetch, not when loading more
      if (!background && !loadMore) set({ isLoading: true, phase2Hydrated: false });

      const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!resolvedUserId) {
        console.warn('[fetchData] No user ID available — skipping load');
        if (!background) {
          toast.error('Session expired. Please sign in again.');
          set({ isLoading: false, phase2Hydrated: true });
        }
        return;
      }

      console.log('[fetchData] starting fetch...');

      void (async () => {
        const { error } = await supabase.rpc('flip_overdue_bills');
        if (error) console.warn('[fetchData] flip_overdue_bills RPC failed:', error.message);
      })();

      // Transaction pagination: fetch in pages of 100
      const TRANSACTION_PAGE_SIZE = 100;
      const lastCursor = get().lastTransactionCursor;

      let transactionsQuery = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', resolvedUserId)
        .order('date', { ascending: false })
        .limit(TRANSACTION_PAGE_SIZE);

      // If loading more, use cursor-based pagination
      if (loadMore && lastCursor) {
        transactionsQuery = transactionsQuery.lt('date', lastCursor);
      }

      const phase2Promise = Promise.all([
        supabase.from('goals').select('*').eq('user_id', resolvedUserId),
        supabase.from('budgets').select('*').eq('user_id', resolvedUserId),
        supabase.from('categories').select('*').eq('user_id', resolvedUserId),
        supabase.from('citations').select('*').eq('user_id', resolvedUserId),
        supabase.from('deductions').select('*').eq('user_id', resolvedUserId),
        supabase.from('freelance_entries').select('*').eq('user_id', resolvedUserId),
        supabase.from('mileage_log').select('*').eq('user_id', resolvedUserId).order('trip_date', { ascending: false }),
        supabase.from('client_invoices').select('*').eq('user_id', resolvedUserId).order('due_date', { ascending: false }),
        supabase.from('pending_ingestions').select('*').eq('user_id', resolvedUserId),
        supabase.from('categorization_rules').select('*').eq('user_id', resolvedUserId).order('priority', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('categorization_exclusions').select('*').eq('user_id', resolvedUserId).order('created_at', { ascending: false }),
        supabase.from('credit_fixes').select('*').eq('user_id', resolvedUserId).order('created_at', { ascending: false }),
        supabase.from('admin_broadcasts').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('platform_settings').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('net_worth_snapshots').select('*').eq('user_id', resolvedUserId).order('date', { ascending: true }).limit(90),
        supabase.from('credit_factors').select('*').eq('user_id', resolvedUserId),
        supabase.from('investment_accounts').select('id,name,type,institution,balance,notes,last_updated').eq('user_id', resolvedUserId),
        supabase.from('insurance_policies').select('id,type,provider,premium,frequency,coverage_amount,deductible,expiration_date,status,notes').eq('user_id', resolvedUserId),
      ]);

      try {
        const [
          { data: profile, error: profileError },
          { data: bills, error: billsError },
          { data: debts, error: debtsError },
          { data: transactionsPage, error: transactionsError },
          { data: assets, error: assetsError },
          { data: incomes, error: incomesError },
          { data: subscriptions, error: subscriptionsError },
          { data: plaidAccountsRows, error: plaidAccountsError },
          { data: households, error: householdsError },
          { data: householdMembersRows, error: householdMembersError },
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', resolvedUserId).maybeSingle(),
          supabase.from('bills').select('*').eq('user_id', resolvedUserId),
          supabase.from('debts').select('*').eq('user_id', resolvedUserId),
          supabase.from('transactions').select('*').eq('user_id', resolvedUserId).order('date', { ascending: false }).limit(500),
          supabase.from('assets').select('*').eq('user_id', resolvedUserId),
          supabase.from('incomes').select('*').eq('user_id', resolvedUserId),
          supabase.from('subscriptions').select('*').eq('user_id', resolvedUserId),
          supabase.from('plaid_accounts').select('*').eq('user_id', resolvedUserId).order('name', { ascending: true }),
          supabase.from('households').select('*').maybeSingle(),
          supabase.from('household_members').select('*, profiles!inner(email, first_name, avatar_url)').eq('status', 'accepted'),
        ]);

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
        if (householdsError) console.error('[fetchData] Households fetch error:', householdsError);
        if (householdMembersError) console.error('[fetchData] Household members fetch error:', householdMembersError);
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[fetchData] Profile fetch error:', profileError);
        }

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
          currentHousehold: households || null,
          householdMembers: (householdMembersRows || []).map((member: Record<string, unknown>) => ({
            id: member.id as string,
            household_id: member.household_id as string,
            user_id: (member.user_id ?? null) as string | null,
            role: member.role as 'owner' | 'partner' | 'viewer',
            invited_email: (member.invited_email ?? null) as string | null,
            status: member.status as 'pending' | 'accepted',
            joined_at: (member.joined_at ?? null) as string | null,
            email: ((member.profiles as { email?: string } | null)?.email ?? null) as string | null,
            first_name: ((member.profiles as { first_name?: string } | null)?.first_name ?? null) as string | null,
            avatar_url: ((member.profiles as { avatar_url?: string } | null)?.avatar_url ?? null) as string | null,
          })),
          userRole: (() => {
            if (!households || !householdMembersRows) return null;
            const member = householdMembersRows.find((row: Record<string, unknown>) => row.user_id === resolvedUserId);
            return (member?.role as AppState['userRole']) ?? null;
          })(),
        });

        if (!background) set({ isLoading: false });

        let phase2RecordCount = 0;

        try {
          const [
            { data: goals },
            { data: budgets },
            { data: categories },
            { data: citations },
            { data: deductions },
            { data: freelanceEntries },
            { data: mileageLogRows },
            { data: clientInvoicesRows },
            { data: pendingIngestions },
            { data: categorizationRules },
            { data: categorizationExclusions },
            { data: creditFixes },
            { data: adminBroadcasts },
            { data: platformSettings },
            { data: netWorthSnapshots },
            { data: creditFactors },
            { data: investmentAccountsData },
            { data: insurancePoliciesData },
          ] = await phase2Promise;

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
            categorizationRules: (categorizationRules || []).map((rule: Record<string, unknown>) => ({
              id: rule.id as string,
              match_type: rule.match_type as CategorizationRule['match_type'],
              match_value: rule.match_value as string,
              category: rule.category as string,
              priority: rule.priority as number,
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
              factors: (creditFactors || []).map((factor: Record<string, unknown>) => ({
                id: factor.id as string,
                name: factor.name as string,
                impact: factor.impact as 'high' | 'medium' | 'low',
                status: factor.status as 'excellent' | 'good' | 'fair' | 'poor',
                description: factor.description as string,
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
            investmentAccounts: (investmentAccountsData ?? []).map((account: Record<string, unknown>) => ({
              id: account.id as string,
              name: account.name as string,
              type: account.type as InvestmentAccount['type'],
              institution: (account.institution as string) ?? '',
              balance: Number(account.balance) || 0,
              notes: (account.notes as string) ?? '',
              lastUpdated: (account.last_updated as string) ?? '',
            })),
            insurancePolicies: (insurancePoliciesData ?? []).map((policy: Record<string, unknown>) => ({
              id: policy.id as string,
              type: policy.type as InsurancePolicy['type'],
              provider: policy.provider as string,
              premium: Number(policy.premium) || 0,
              frequency: (policy.frequency as string) ?? 'Monthly',
              coverageAmount: policy.coverage_amount != null ? Number(policy.coverage_amount) : undefined,
              deductible: policy.deductible != null ? Number(policy.deductible) : undefined,
              expirationDate: (policy.expiration_date as string) ?? undefined,
              status: (policy.status as InsurancePolicy['status']) ?? 'active',
              notes: (policy.notes as string) ?? '',
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
            (categorizationRules?.length ?? 0) +
            (creditFixes?.length ?? 0) +
            (netWorthSnapshots?.length ?? 0) +
            (creditFactors?.length ?? 0) +
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

        console.log(`[fetchData] done, loaded ${recordCount} records`);
      } catch (err) {
        console.error('[fetchData] failed:', err);
      } finally {
        if (!background) {
          if (get().isLoading) set({ isLoading: false });
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
  });
