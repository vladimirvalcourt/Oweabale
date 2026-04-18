import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { type CategorizationRule, type CategorizationExclusion, applyCategorizationRules, merchantKey } from '../lib/categorizationRules';
import { disconnectPlaid, syncPlaidTransactions as invokePlaidSync } from '../lib/plaid';
import { formatCategoryLabel } from '../lib/categoryDisplay';
export type { CategorizationRule, CategorizationExclusion };

/** Mobile capture stores under `incoming/` in `scans`; desktop uploads use `ingestion-files`. */
async function removeIngestionStoragePath(storagePath: string) {
  const bucket = storagePath.startsWith('incoming/') ? 'scans' : 'ingestion-files';
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) console.warn(`[useStore] storage remove (${bucket}):`, error.message);
}

export interface Bill {
  id: string;
  biller: string;
  amount: number;
  category: string;
  dueDate: string;
  frequency: string;
  status: 'upcoming' | 'paid' | 'overdue';
  autoPay: boolean;
}

export interface Debt {
  id: string;
  name: string;
  type: string;
  apr: number;
  remaining: number;
  minPayment: number;
  paid: number;
  /** Next payment due; undefined/null = no due date (e.g. closed card with balance). */
  paymentDueDate?: string | null;
  // Optional amortization fields
  originalAmount?: number;
  originationDate?: string;
  termMonths?: number;
}

export interface Transaction {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: string;
  // Optional appreciation fields
  appreciationRate?: number;
  purchasePrice?: number;
  purchaseDate?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  status: 'active' | 'paused' | 'cancelled';
  priceHistory?: { date: string; amount: number }[];
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  type: 'debt' | 'savings' | 'emergency';
  color: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Yearly';
  category: string;
  nextDate: string;
  status: 'active' | 'paused';
  isTaxWithheld: boolean; // True for W-2/Salaried, False for Freelance/Gig
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  rolloverEnabled?: boolean;
  lockMode?: 'none' | 'soft' | 'hard';
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
}

export interface Citation {
  id: string;
  type: string;
  jurisdiction: string;
  daysLeft: number;
  amount: number;
  penaltyFee: number;
  date: string;
  citationNumber: string;
  paymentUrl: string;
  status: 'open' | 'resolved';
}

export interface Deduction {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
}

export interface FreelanceEntry {
  id: string;
  client: string;
  amount: number;
  date: string;
  isVaulted: boolean;
  scouredWriteOffs?: number;
}

export interface PendingIngestion {
  id: string;
  type: 'bill' | 'debt' | 'transaction' | 'income' | 'citation';
  status: 'scanning' | 'uploading' | 'ready' | 'error' | string;
  extractedData: {
    name?: string;
    biller?: string;
    amount?: number;
    date?: string;
    dueDate?: string;
    category?: string;
    /** Income label (Review Inbox) */
    source?: string;
    /** Tickets, tolls, fines (when type === 'citation') */
    citationType?: string;
    jurisdiction?: string;
    citationNumber?: string;
    penaltyFee?: number;
    paymentUrl?: string;
    daysLeft?: number;
    /** Loan / card from document (Review Inbox debt) */
    debtApr?: number;
    debtMinPayment?: number;
  };
  originalFile?: {
    name: string;
    size: number;
    type: string;
    url?: string;
  };
  storagePath?: string;   // Supabase Storage path after upload
  storageUrl?: string;    // Signed URL for preview (short-lived)
  source?: 'desktop' | 'mobile'; // Origin of the ingestion
}

export interface CreditFactor {
  id: string;
  name: string; // e.g., "On-Time Payments"
  impact: 'high' | 'medium' | 'low';
  status: 'excellent' | 'good' | 'fair' | 'poor';
  description: string; // "How this helps or hurts you"
}

export interface AdminBroadcast {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error';
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  maintenanceMode: boolean;
  plaidEnabled: boolean;
  broadcastMessage: string;
  taxStandardDeduction: number;
  taxTopBracket: number;
}

export interface NetWorthSnapshot {
  id: string;
  date: string;
  netWorth: number;
  assets: number;
  debts: number;
}

export interface CreditFix {
  id: string;
  item: string; // e.g., "Medical Bill Error"
  amount: number;
  status: 'todo' | 'sent' | 'resolved';
  bureau: string; // "Experian", "Equifax", etc.
  notes: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface InvestmentAccount {
  id: string;
  name: string;
  type: 'brokerage' | 'ira' | 'roth_ira' | '401k' | '403b' | 'hsa' | 'other';
  institution: string;
  balance: number;
  notes: string;
  lastUpdated: string;
}

export interface InsurancePolicy {
  id: string;
  type: 'health' | 'life' | 'auto' | 'renters' | 'homeowners' | 'disability' | 'umbrella' | 'dental' | 'vision' | 'other';
  provider: string;
  premium: number;
  frequency: string;
  coverageAmount?: number;
  deductible?: number;
  expirationDate?: string;
  status: 'active' | 'expired' | 'cancelled';
  notes: string;
}

interface AppState {
  bills: Bill[];
  debts: Debt[];
  transactions: Transaction[];
  assets: Asset[];
  subscriptions: Subscription[];
  goals: Goal[];
  incomes: IncomeSource[];
  budgets: Budget[];
  categories: Category[];
  citations: Citation[];
  deductions: Deduction[];
  freelanceEntries: FreelanceEntry[];
  notifications: Notification[];
  pendingIngestions: PendingIngestion[];
  categorizationRules: CategorizationRule[];
  categorizationExclusions: CategorizationExclusion[];
  adminBroadcasts: AdminBroadcast[];
  platformSettings: PlatformSettings | null;
  netWorthSnapshots: NetWorthSnapshot[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    theme?: string;
    taxState?: string;
    taxRate?: number;
    phone?: string;
    timezone?: string;
    language?: string;
    hasCompletedOnboarding: boolean;
    isAdmin: boolean;
  };
  credit: {
    score: number;
    lastUpdated: string;
    factors: CreditFactor[];
    fixes: CreditFix[];
  };
  investmentAccounts: InvestmentAccount[];
  insurancePolicies: InsurancePolicy[];
  addInvestmentAccount: (account: Omit<InvestmentAccount, 'id' | 'lastUpdated'>) => Promise<boolean>;
  editInvestmentAccount: (id: string, updates: Partial<InvestmentAccount>) => Promise<boolean>;
  deleteInvestmentAccount: (id: string) => Promise<boolean>;
  addInsurancePolicy: (policy: Omit<InsurancePolicy, 'id'>) => Promise<boolean>;
  editInsurancePolicy: (id: string, updates: Partial<InsurancePolicy>) => Promise<boolean>;
  deleteInsurancePolicy: (id: string) => Promise<boolean>;
  setTaxSettings: (state: string, rate: number) => void;
  bankConnected: boolean;
  /** Display name from last Plaid Link completion (profile). */
  plaidInstitutionName: string | null;
  plaidLastSyncAt: string | null;
  plaidNeedsRelink: boolean;
  connectBank: () => Promise<void>;
  disconnectBank: () => Promise<void>;
  syncPlaidTransactions: (opts?: { quiet?: boolean }) => Promise<boolean>;
  addTransaction: (transaction: Omit<Transaction, 'id'>, opts?: { allowBudgetOverride?: boolean }) => Promise<boolean>;
  lastBudgetGuardrail: {
    type: 'soft' | 'hard';
    category: string;
    attempted: number;
    allowed: number;
    overBy: number;
    period: Budget['period'];
    message: string;
  } | null;
  clearLastBudgetGuardrail: () => void;
  addBill: (bill: Omit<Bill, 'id'>) => Promise<boolean>;
  editBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<boolean>;
  editDebt: (id: string, debt: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addDebtPayment: (id: string, amount: number) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<boolean>;
  editAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<boolean>;
  addSubscription: (subscription: Omit<Subscription, 'id'>) => Promise<boolean>;
  editSubscription: (id: string, subscription: Partial<Subscription>) => Promise<boolean>;
  deleteSubscription: (id: string) => Promise<boolean>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<boolean>;
  editGoal: (id: string, goal: Partial<Goal>) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<boolean>;
  addGoalProgress: (id: string, amount: number) => Promise<boolean>;
  addIncome: (income: Omit<IncomeSource, 'id'>) => Promise<boolean>;
  editIncome: (id: string, income: Partial<IncomeSource>) => Promise<boolean>;
  deleteIncome: (id: string) => Promise<boolean>;
  recordIncomeDeposit: (id: string, amount?: number) => Promise<boolean>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<boolean>;
  editBudget: (id: string, budget: Partial<Budget>) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  editCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCitation: (citation: Omit<Citation, 'id'>) => Promise<boolean>;
  resolveCitation: (id: string) => Promise<boolean>;
  addDeduction: (deduction: Omit<Deduction, 'id'>) => Promise<boolean>;
  deleteDeduction: (id: string) => Promise<boolean>;
  // Freelance Actions
  addFreelanceEntry: (entry: Omit<FreelanceEntry, 'id'>) => Promise<boolean>;
  toggleFreelanceVault: (id: string) => Promise<void>;
  deleteFreelanceEntry: (id: string) => Promise<void>;
  updateUser: (user: Partial<AppState['user']>) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearLocalData: () => void;
  resetData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  addCategorizationRule: (rule: Omit<CategorizationRule, 'id'>) => Promise<void>;
  deleteCategorizationRule: (id: string) => Promise<void>;
  applyRulesToExistingTransactions: () => Promise<number>;
  /** Bulk-update expense categories (e.g. raw Plaid key → readable label). */
  retagTransactionsByCategory: (fromCategory: string, toCategory: string) => Promise<number>;
  addCategorizationExclusion: (exclusion: Omit<CategorizationExclusion, 'id'>) => Promise<boolean>;
  deleteCategorizationExclusion: (id: string) => Promise<boolean>;
  undoLastRuleApplication: () => Promise<boolean>;
  lastRuleApplication: {
    appliedAt: string;
    changes: Array<{ id: string; from: string; to: string }>;
  } | null;
  lastAutoCategorization: {
    transactionId: string;
    name: string;
    from: string;
    to: string;
    at: string;
  } | null;
  undoLastAutoCategorization: () => Promise<boolean>;
  
  // Credit Actions
  updateCreditScore: (score: number) => Promise<void>;
  addCreditFix: (fix: Omit<CreditFix, 'id'>) => Promise<void>;
  updateCreditFix: (id: string, updates: Partial<CreditFix>) => Promise<void>;
  deleteCreditFix: (id: string) => Promise<void>;

  // Ingestion Actions
  addPendingIngestion: (ingestion: Omit<PendingIngestion, 'id'>) => string;
  updatePendingIngestion: (id: string, updates: Partial<PendingIngestion>) => void;
  removePendingIngestion: (id: string) => void;
  commitIngestion: (id: string) => Promise<boolean>;
  
  // Supabase Syncing
  fetchData: (userId?: string, options?: { background?: boolean }) => Promise<void>;
  isLoading: boolean;
  /** False until phase-2 Supabase hydration (investments, goals, …) finishes or is skipped. */
  phase2Hydrated: boolean;
  
  // Modal State
  addNotification: (note: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  isQuickAddOpen: boolean;
  quickAddTab: TabType;
  openQuickAdd: (tab?: TabType) => void;
  closeQuickAdd: () => void;
}

export type TabType = 'transaction' | 'obligation' | 'income' | 'citation';

const initialData = {
  bills: [],
  debts: [],
  transactions: [],
  assets: [],
  subscriptions: [],
  goals: [],
  incomes: [],
  budgets: [],
  categories: [],
  citations: [],
  deductions: [],
  freelanceEntries: [],
  user: {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    avatar: '',
    theme: 'Dark',
    taxState: '',
    taxRate: 0,
    phone: '',
    timezone: 'Eastern Time (ET)',
    language: 'English (US)',
    hasCompletedOnboarding: false,
    isAdmin: false,
  },
  bankConnected: false,
  plaidInstitutionName: null,
  plaidLastSyncAt: null,
  plaidNeedsRelink: false,
  lastBudgetGuardrail: null,
  pendingIngestions: [],
  notifications: [],
  categorizationRules: [],
  categorizationExclusions: [],
  adminBroadcasts: [],
  platformSettings: null,
  lastRuleApplication: null,
  lastAutoCategorization: null,
  netWorthSnapshots: [],
  credit: {
    score: 0,
    lastUpdated: '',
    factors: [],
    fixes: [],
  },
  investmentAccounts: [],
  insurancePolicies: [],
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
  ...initialData,
  addNotification: (note) => set((state) => ({
    notifications: [
      { ...note, id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false },
      ...state.notifications,
    ].slice(0, 50),
  })),
  markNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  })),
  clearNotifications: () => set({ notifications: [] }),
  setTaxSettings: async (state, rate) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('profiles').upsert({ id: userId, tax_state: state, tax_rate: rate });
    }
    set((s) => ({ user: { ...s.user, taxState: state, taxRate: rate } }));
  },
  connectBank: async () => {
    await get().fetchData();
  },
  disconnectBank: async () => {
    const r = await disconnectPlaid();
    if ('error' in r) {
      toast.error(r.error);
      return;
    }
    await get().fetchData();
    toast.success('Bank disconnected.');
  },
  syncPlaidTransactions: async (opts?: { quiet?: boolean }) => {
    const r = await invokePlaidSync();
    if ('error' in r) {
      if (!opts?.quiet) toast.error(r.error);
      return false;
    }
    await get().fetchData();
    if (!opts?.quiet) {
      if (r.product_not_ready) {
        toast.message('Bank connected. Plaid is loading your transaction history — check back in a few minutes or tap Sync now.');
      } else if (r.errors > 0) {
        if (get().plaidNeedsRelink) {
          const institution = get().plaidInstitutionName?.trim();
          const bankLabel = institution && institution.length > 0 ? institution : 'your bank';
          toast.error(`Sync found a bank login issue. Use Fix connection to reconnect ${bankLabel}.`);
        } else {
          toast.message(`Sync finished with ${r.errors} item error(s). Check bank status.`);
        }
      } else {
        toast.success('Transactions synced.');
      }
    }
    return true;
  },
  clearLastBudgetGuardrail: () => set({ lastBudgetGuardrail: null }),
  addTransaction: async (transaction, opts) => {
    // Auto-apply categorization rules before saving
    const rules = get().categorizationRules;
    const exclusions = get().categorizationExclusions;
    const originalCategory = transaction.category;
    const merchantExcluded = exclusions.some(
      (e) => e.scope === 'merchant' && merchantKey(e.merchant_name ?? '') === merchantKey(transaction.name),
    );
    const autoCategory = merchantExcluded ? null : applyCategorizationRules(transaction.name, rules);
    if (autoCategory) transaction = { ...transaction, category: autoCategory };

    if (transaction.type === 'expense') {
      const expenseDate = new Date(transaction.date.includes('T') ? transaction.date : `${transaction.date}T12:00:00`);
      if (!Number.isNaN(expenseDate.getTime())) {
        const { budgets, transactions } = get();
        const categoryBudget = budgets.find((b) => b.category === transaction.category);
        if (categoryBudget && (categoryBudget.lockMode ?? 'none') !== 'none') {
          const { startOfBudgetPeriod, shiftBudgetPeriod } = await import('../lib/budgetPeriods');
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
            const catLabel = formatCategoryLabel(transaction.category);
            const message = `${catLabel} exceeds your ${categoryBudget.period.toLowerCase()} budget by $${overBy.toFixed(2)}.`;
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
      if (!userId) { toast.error('You must be signed in to save transactions.'); return false; }
      
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('transactions')
        .insert({ 
          name: transaction.name,
          category: transaction.category,
          date: transaction.date,
          amount: transaction.amount,
          type: transaction.type,
          user_id: userId 
        })
        .select('id')
        .single();
        
      if (error) throw error;
      if (data?.id) newId = data.id;

      set((state) => ({
        transactions: [{ ...transaction, id: newId }, ...state.transactions].slice(0, 100)
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
      toast.error('Failed to save transaction to database.');
      return false;
    }
  },
  addBill: async (bill) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.error('You must be signed in to save bills.');
        return false;
      }
      
      let newId = crypto.randomUUID();
      const insertData = {
        biller: bill.biller, 
        amount: bill.amount, 
        category: bill.category,
        due_date: bill.dueDate, 
        frequency: bill.frequency, 
        status: bill.status,
        auto_pay: bill.autoPay, 
        user_id: userId,
      };
      
      const { data, error } = await supabase
        .from('bills')
        .insert(insertData)
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
      if (error) { toast.error('Failed to update bill'); return; }
    }
    set((state) => ({
      bills: state.bills.map((b) => b.id === id ? { ...b, ...updatedBill } : b)
    }));
  },
  deleteBill: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { error } = await supabase.from('bills').delete().eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to delete bill'); return; }
    }
    set((state) => ({ bills: state.bills.filter((b) => b.id !== id) }));
  },
  markBillPaid: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const bill = get().bills.find(b => b.id === id);
      if (!bill) return;

      // Compute next due date based on frequency
      const nextDue = new Date(bill.dueDate);
      switch (bill.frequency) {
        case 'Weekly':    nextDue.setDate(nextDue.getDate() + 7); break;
        case 'Bi-weekly': nextDue.setDate(nextDue.getDate() + 14); break;
        case 'Yearly':    nextDue.setFullYear(nextDue.getFullYear() + 1); break;
        default:          nextDue.setMonth(nextDue.getMonth() + 1); // Monthly
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
        await supabase.from('transactions').insert({
          name: newTransaction.name,
          category: newTransaction.category,
          date: newTransaction.date,
          amount: newTransaction.amount,
          type: newTransaction.type,
          user_id: userId,
        });
      }

      set((state) => ({
        bills: state.bills.map((b) =>
          b.id === id ? { ...b, status: 'upcoming', dueDate: nextDueStr } : b
        ),
        transactions: [newTransaction, ...state.transactions].slice(0, 100),
      }));
    } catch (err) {
      console.error('Error marking bill paid:', err);
      toast.error('Failed to update bill record.');
    }
  },
  addDebt: async (debt) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in to save debts.'); return false; }
      
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
      if (error) { toast.error('Failed to update debt'); return; }
    }
    set((state) => ({
      debts: state.debts.map((d) => d.id === id ? { ...d, ...updatedDebt } : d)
    }));
  },
  deleteDebt: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { error } = await supabase.from('debts').delete().eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to delete debt'); return; }
    }
    set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }));
  },
  addDebtPayment: async (id, amount) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const debt = get().debts.find(d => d.id === id);
    if (!debt) return;
    const newRemaining = Math.max(0, debt.remaining - amount);
    const newPaid = debt.paid + amount;
    if (userId) {
      const { error } = await supabase.from('debts').update({ remaining: newRemaining, paid: newPaid }).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to sync debt payment'); return; }
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
      await supabase.from('transactions').insert({ name: newTx.name, category: newTx.category, date: newTx.date, amount: newTx.amount, type: newTx.type, user_id: userId });
    }
    set((state) => ({
      debts: state.debts.map((d) => d.id === id ? { ...d, remaining: newRemaining, paid: newPaid } : d),
      transactions: [newTx, ...state.transactions].slice(0, 100),
    }));
  },
  addAsset: async (asset) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in to save assets.'); return false; }
      
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('assets')
        .insert({
          name: asset.name, 
          value: asset.value, 
          type: asset.type,
          appreciation_rate: asset.appreciationRate ?? null,
          purchase_price: asset.purchasePrice ?? null,
          purchase_date: asset.purchaseDate ?? null,
          user_id: userId,
        })
        .select('id')
        .single();
        
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ assets: [...state.assets, { ...asset, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addAsset] Sync failed:', error);
      toast.error('Failed to sync asset.');
      return false;
    }
  },
  editAsset: async (id, updatedAsset) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const snakeCased: Record<string, unknown> = {};
      if (updatedAsset.name !== undefined) snakeCased.name = updatedAsset.name;
      if (updatedAsset.value !== undefined) snakeCased.value = updatedAsset.value;
      if (updatedAsset.type !== undefined) snakeCased.type = updatedAsset.type;
      if (updatedAsset.appreciationRate !== undefined) snakeCased.appreciation_rate = updatedAsset.appreciationRate;
      if (updatedAsset.purchasePrice !== undefined) snakeCased.purchase_price = updatedAsset.purchasePrice;
      if (updatedAsset.purchaseDate !== undefined) snakeCased.purchase_date = updatedAsset.purchaseDate;
      const { error } = await supabase.from('assets').update(snakeCased).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to update asset'); return; }
    }
    set((state) => ({
      assets: state.assets.map((a) => a.id === id ? { ...a, ...updatedAsset } : a)
    }));
  },
  deleteAsset: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to delete assets.'); return false; }
      const { error } = await supabase.from('assets').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
      return true;
    } catch (err) {
      console.error('Error deleting asset:', err);
      toast.error('Failed to delete asset.');
      return false;
    }
  },

  // ── Subscriptions ─────────────────────────────────────────────
  addSubscription: async (subscription) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in to save subscriptions.'); return false; }
      
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
      if (!userId) { toast.error('You must be signed in to edit subscriptions.'); return false; }
      const patch: Record<string, unknown> = {};
      if (updatedSubscription.name !== undefined)            patch.name = updatedSubscription.name;
      if (updatedSubscription.amount !== undefined)          patch.amount = updatedSubscription.amount;
      if (updatedSubscription.frequency !== undefined)       patch.frequency = updatedSubscription.frequency;
      if (updatedSubscription.nextBillingDate !== undefined) patch.next_billing_date = updatedSubscription.nextBillingDate;
      if (updatedSubscription.status !== undefined)          patch.status = updatedSubscription.status;
      if (updatedSubscription.priceHistory !== undefined)    patch.price_history = updatedSubscription.priceHistory;
      const { error } = await supabase.from('subscriptions').update(patch).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to update subscription'); return false; }
      set((state) => ({ subscriptions: state.subscriptions.map((s) => s.id === id ? { ...s, ...updatedSubscription } : s) }));
      return true;
    } catch (err) {
      console.error('[editSubscription] failed:', err);
      toast.error('Failed to update subscription.');
      return false;
    }
  },
  deleteSubscription: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to delete subscriptions.'); return false; }
      const { error } = await supabase.from('subscriptions').delete().eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to delete subscription'); return false; }
      set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) }));
      return true;
    } catch (err) {
      console.error('[deleteSubscription] failed:', err);
      toast.error('Failed to delete subscription.');
      return false;
    }
  },

  // ── Goals ─────────────────────────────────────────────────────
  addGoal: async (goal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in to save goals.'); return false; }
      
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('goals')
        .insert({
          name: goal.name, 
          target_amount: goal.targetAmount, 
          current_amount: goal.currentAmount,
          deadline: goal.deadline, 
          type: goal.type, 
          color: goal.color, 
          user_id: userId,
        })
        .select('id')
        .single();
        
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ goals: [...state.goals, { ...goal, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addGoal] Sync failed:', error);
      toast.error('Failed to sync goal.');
      return false;
    }
  },
  editGoal: async (id, updatedGoal) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to edit goals.'); return false; }
      const patch: Record<string, unknown> = {};
      if (updatedGoal.name !== undefined)          patch.name = updatedGoal.name;
      if (updatedGoal.targetAmount !== undefined)  patch.target_amount = updatedGoal.targetAmount;
      if (updatedGoal.currentAmount !== undefined) patch.current_amount = updatedGoal.currentAmount;
      if (updatedGoal.deadline !== undefined)      patch.deadline = updatedGoal.deadline;
      if (updatedGoal.type !== undefined)          patch.type = updatedGoal.type;
      if (updatedGoal.color !== undefined)         patch.color = updatedGoal.color;
      const { error } = await supabase.from('goals').update(patch).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to update goal'); return false; }
      set((state) => ({ goals: state.goals.map((g) => g.id === id ? { ...g, ...updatedGoal } : g) }));
      return true;
    } catch (err) {
      console.error('[editGoal] failed:', err);
      toast.error('Failed to update goal.');
      return false;
    }
  },
  deleteGoal: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to delete goals.'); return false; }
      const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to delete goal'); return false; }
      set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
      return true;
    } catch (err) {
      console.error('[deleteGoal] failed:', err);
      toast.error('Failed to delete goal.');
      return false;
    }
  },
  addGoalProgress: async (id, amount) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to update goals.'); return false; }
      const goal = get().goals.find(g => g.id === id);
      if (!goal) return false;
      const newAmount = Math.max(0, Math.min(goal.targetAmount, goal.currentAmount + amount));
      const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to update goal progress'); return false; }
      if (newAmount >= goal.targetAmount) {
        get().addNotification({ title: `Goal Complete!`, message: `"${goal.name}" has been fully funded.`, type: 'success' });
      }
      set((state) => ({ goals: state.goals.map((g) => g.id === id ? { ...g, currentAmount: newAmount } : g) }));
      return true;
    } catch (err) {
      console.error('[addGoalProgress] failed:', err);
      toast.error('Failed to update goal progress.');
      return false;
    }
  },

  // ── Income ────────────────────────────────────────────────────
  addIncome: async (income) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in to save income.'); return false; }
      
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
      toast.error('Failed to sync income source.');
      return false;
    }
  },
  editIncome: async (id, updatedIncome) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to edit income.'); return false; }
      const patch: Record<string, unknown> = {};
      if (updatedIncome.name !== undefined)         patch.name = updatedIncome.name;
      if (updatedIncome.amount !== undefined)       patch.amount = updatedIncome.amount;
      if (updatedIncome.frequency !== undefined)    patch.frequency = updatedIncome.frequency;
      if (updatedIncome.category !== undefined)     patch.category = updatedIncome.category;
      if (updatedIncome.nextDate !== undefined)     patch.next_date = updatedIncome.nextDate;
      if (updatedIncome.status !== undefined)       patch.status = updatedIncome.status;
      if (updatedIncome.isTaxWithheld !== undefined) patch.is_tax_withheld = updatedIncome.isTaxWithheld;
      const { error } = await supabase.from('incomes').update(patch).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to update income'); return false; }
      set((state) => ({ incomes: state.incomes.map((i) => i.id === id ? { ...i, ...updatedIncome } : i) }));
      return true;
    } catch (err) {
      console.error('[editIncome] failed:', err);
      toast.error('Failed to update income.');
      return false;
    }
  },
  deleteIncome: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to delete income.'); return false; }
      const { error } = await supabase.from('incomes').delete().eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to delete income'); return false; }
      set((state) => ({ incomes: state.incomes.filter((i) => i.id !== id) }));
      return true;
    } catch (err) {
      console.error('[deleteIncome] failed:', err);
      toast.error('Failed to delete income.');
      return false;
    }
  },
  recordIncomeDeposit: async (id, amount) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to record deposits.'); return false; }
      const income = get().incomes.find(i => i.id === id);
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
      const { error } = await supabase.from('transactions').insert({ name: newTx.name, category: newTx.category, date: newTx.date, amount: newTx.amount, type: newTx.type, user_id: userId });
      if (error) { toast.error('Failed to record deposit'); return false; }
      set((state) => ({ transactions: [newTx, ...state.transactions].slice(0, 50) }));
      return true;
    } catch (err) {
      console.error('[recordIncomeDeposit] failed:', err);
      toast.error('Failed to record deposit.');
      return false;
    }
  },

  // ── Budgets ───────────────────────────────────────────────────
  addBudget: async (budget) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in to save budgets.'); return false; }
      
      let newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          category: budget.category,
          amount: budget.amount,
          period: budget.period,
          rollover_enabled: Boolean(budget.rolloverEnabled),
          lock_mode: budget.lockMode ?? 'none',
          user_id: userId,
        })
        .select('id')
        .single();
        
      if (error) throw error;
      if (data?.id) newId = data.id;
      set((state) => ({ budgets: [...state.budgets, { ...budget, id: newId }] }));
      return true;
    } catch (error) {
      console.error('[addBudget] Sync failed:', error);
      toast.error('Failed to sync budget.');
      return false;
    }
  },
  editBudget: async (id, updatedBudget) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to edit budgets.'); return false; }
      const payload: Record<string, unknown> = { ...updatedBudget };
      if (Object.prototype.hasOwnProperty.call(payload, 'rolloverEnabled')) {
        payload.rollover_enabled = Boolean(payload.rolloverEnabled);
        delete payload.rolloverEnabled;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'lockMode')) {
        payload.lock_mode = payload.lockMode ?? 'none';
        delete payload.lockMode;
      }
      const { error } = await supabase.from('budgets').update(payload).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to update budget'); return false; }
      set((state) => ({ budgets: state.budgets.map((b) => b.id === id ? { ...b, ...updatedBudget } : b) }));
      return true;
    } catch (err) {
      console.error('[editBudget] failed:', err);
      toast.error('Failed to update budget.');
      return false;
    }
  },
  deleteBudget: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to delete budgets.'); return false; }
      const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to delete budget'); return false; }
      set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
      return true;
    } catch (err) {
      console.error('[deleteBudget] failed:', err);
      toast.error('Failed to delete budget.');
      return false;
    }
  },

  // ── Categories ────────────────────────────────────────────────
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
            user_id: userId 
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
    set((state) => ({ categories: state.categories.map((c) => c.id === id ? { ...c, ...updatedCategory } : c) }));
  },
  deleteCategory: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
  },

  // ── Citations ─────────────────────────────────────────────────
  addCitation: async (citation) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to save citations.'); return false; }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase.from('citations').insert({
        type: citation.type, jurisdiction: citation.jurisdiction,
        days_left: citation.daysLeft, amount: citation.amount,
        penalty_fee: citation.penaltyFee, date: citation.date,
        citation_number: citation.citationNumber, payment_url: citation.paymentUrl,
        status: citation.status, user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync citation'); return false; }
      if (data?.id) newId = data.id;
      set((state) => ({ citations: [...state.citations, { ...citation, id: newId }] }));
      return true;
    } catch (err) {
      console.error('[addCitation] failed:', err);
      toast.error('Failed to save citation.');
      return false;
    }
  },
  resolveCitation: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to resolve citations.'); return false; }
      const { error } = await supabase.from('citations').update({ status: 'resolved' }).eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to resolve citation'); return false; }
      set((state) => ({ citations: state.citations.map((c) => c.id === id ? { ...c, status: 'resolved' as const } : c) }));
      return true;
    } catch (err) {
      console.error('[resolveCitation] failed:', err);
      toast.error('Failed to resolve citation.');
      return false;
    }
  },

  // ── Deductions ────────────────────────────────────────────────
  addDeduction: async (deduction) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to save deductions.'); return false; }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase.from('deductions').insert({ name: deduction.name, category: deduction.category, amount: deduction.amount, date: deduction.date, user_id: userId }).select('id').single();
      if (error) { toast.error('Failed to sync deduction'); return false; }
      if (data?.id) newId = data.id;
      set((state) => ({ deductions: [...state.deductions, { ...deduction, id: newId }] }));
      return true;
    } catch (err) {
      console.error('[addDeduction] failed:', err);
      toast.error('Failed to save deduction.');
      return false;
    }
  },
  deleteDeduction: async (id) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to delete deductions.'); return false; }
      const { error } = await supabase.from('deductions').delete().eq('id', id).eq('user_id', userId);
      if (error) { toast.error('Failed to delete deduction'); return false; }
      set((state) => ({ deductions: state.deductions.filter((d) => d.id !== id) }));
      return true;
    } catch (err) {
      console.error('[deleteDeduction] failed:', err);
      toast.error('Failed to delete deduction.');
      return false;
    }
  },

  // ── User / Profile ────────────────────────────────────────────
  updateUser: async (user) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const patch: Record<string, unknown> = {};
    if (user.firstName !== undefined) patch.first_name = user.firstName;
    if (user.lastName !== undefined)  patch.last_name = user.lastName;
    if (user.email !== undefined)     patch.email = user.email;
    if (user.avatar !== undefined)    patch.avatar = user.avatar;
    if (user.theme !== undefined)     patch.theme = user.theme;
    if (user.phone !== undefined)    patch.phone = user.phone;
    if (user.timezone !== undefined) patch.timezone = user.timezone;
    if (user.language !== undefined) patch.language = user.language;
    if (user.taxState !== undefined) patch.tax_state = user.taxState;
    if (user.taxRate !== undefined)  patch.tax_rate = user.taxRate;
    if (user.hasCompletedOnboarding !== undefined) patch.has_completed_onboarding = user.hasCompletedOnboarding;

    if (Object.keys(patch).length > 0) {
      if (!userId) {
        console.error('[updateUser] no authenticated user — cannot persist profile');
        toast.error('Could not save profile. Please try again.');
        return false;
      }
      // Use upsert so users without a profiles row (e.g. trigger missed) still persist;
      // plain .update() affects 0 rows and leaves has_completed_onboarding false on reload.
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...patch }, { onConflict: 'id' });
      if (error) {
        console.error('[updateUser] profile upsert failed:', error.message, error.code);
        toast.error('Could not save profile. Please try again.');
        return false;
      }
    }
    set((state) => ({ user: { ...state.user, ...user } }));
    return true;
  },
  addFreelanceEntry: async (entry) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { toast.error('You must be signed in to save freelance entries.'); return false; }
      let newId = crypto.randomUUID();
      const { data, error } = await supabase.from('freelance_entries').insert({
        client: entry.client, amount: entry.amount, date: entry.date,
        is_vaulted: entry.isVaulted, scoured_write_offs: entry.scouredWriteOffs ?? 0,
        user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync freelance entry'); return false; }
      if (data?.id) newId = data.id;
      set((state) => ({ freelanceEntries: [...state.freelanceEntries, { ...entry, id: newId }] }));
      return true;
    } catch (err) {
      console.error('[addFreelanceEntry] failed:', err);
      toast.error('Failed to save freelance entry.');
      return false;
    }
  },
  toggleFreelanceVault: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const current = get().freelanceEntries.find(e => e.id === id);
    if (userId && current) {
      await supabase.from('freelance_entries').update({ is_vaulted: !current.isVaulted }).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ freelanceEntries: state.freelanceEntries.map((e) => e.id === id ? { ...e, isVaulted: !e.isVaulted } : e) }));
  },
  deleteFreelanceEntry: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('freelance_entries').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ freelanceEntries: state.freelanceEntries.filter((e) => e.id !== id) }));
  },
  signOut: async () => {
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
      // 1. CLEAR ALL RECORDS FROM ALL TABLES associated with this user (parallel)
      const tables = [
        'bills', 'debts', 'transactions', 'assets', 'subscriptions',
        'goals', 'incomes', 'budgets', 'categories', 'citations',
        'deductions', 'freelance_entries', 'pending_ingestions', 'credit_fixes', 'categorization_exclusions',
        'investment_accounts', 'insurance_policies'
      ];

      await Promise.all(tables.map(table =>
        supabase.from(table).delete().eq('user_id', userId)
      ));

      // 2. RESET ONBOARDING FLAG
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
      });

      // 3. RESET LOCAL STATE
      set({
        ...initialData,
        user: {
          ...get().user,
          hasCompletedOnboarding: false,
          taxState: '',
          taxRate: 0
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
      // Delete all financial data rows first (belt-and-suspenders alongside ON DELETE CASCADE)
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
        supabase.from('categorization_exclusions').delete().eq('user_id', userId),
      ]);

      // Delete the auth.users record via a privileged Postgres RPC.
      // Requires this function in Supabase:
      //   CREATE OR REPLACE FUNCTION delete_user()
      //   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
      //   BEGIN
      //     DELETE FROM auth.users WHERE id = auth.uid();
      //   END;
      //   $$;
      //   REVOKE ALL ON FUNCTION delete_user() FROM PUBLIC;
      //   GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
      const { error: rpcError } = await supabase.rpc('delete_user');
      if (rpcError) {
        // Fall back to sign-out only; the auth record will persist until manual cleanup.
        console.error('delete_user RPC failed — auth record not removed:', rpcError.message);
      }

      await supabase.auth.signOut();
    }
    set({ ...initialData });
  },

  // ── Categorization Rules ─────────────────────────────────────
  addCategorizationRule: async (rule) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from('categorization_rules')
      .insert({ ...rule, user_id: userId })
      .select()
      .single();
    if (error) { toast.error('Failed to save rule'); return; }
    const newRule: CategorizationRule = {
      id: data.id, match_type: data.match_type,
      match_value: data.match_value, category: data.category, priority: data.priority,
    };
    // Prepend: higher-priority / newest rules should be evaluated first
    set((state) => ({ categorizationRules: [newRule, ...state.categorizationRules] }));
    toast.success('Rule saved — future transactions will be auto-categorized');
  },

  deleteCategorizationRule: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('categorization_rules').delete().eq('id', id).eq('user_id', userId);
    }
    set(state => ({ categorizationRules: state.categorizationRules.filter(r => r.id !== id) }));
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
    set((state) => ({ categorizationExclusions: state.categorizationExclusions.filter((e) => e.id !== id) }));
    return true;
  },
  
  // ── Credit Management ──────────────────────────────────────────
  updateCreditScore: async (score) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const now = new Date().toISOString();
    if (userId) {
      await supabase.from('profiles').update({ credit_score: score, credit_last_updated: now }).eq('id', userId);
    }
    set(state => ({ credit: { ...state.credit, score, lastUpdated: now } }));
  },
  addCreditFix: async (fix) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('credit_fixes').insert({ ...fix, user_id: userId }).select('id').single();
      if (error) { toast.error('Failed to save credit fix'); return; }
      if (data?.id) newId = data.id;
    }
    set(state => ({ credit: { ...state.credit, fixes: [...state.credit.fixes, { ...fix, id: newId }] } }));
  },
  updateCreditFix: async (id, updates) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('credit_fixes').update(updates).eq('id', id).eq('user_id', userId);
    }
    set(state => ({
      credit: {
        ...state.credit,
        fixes: state.credit.fixes.map(f => f.id === id ? { ...f, ...updates } : f)
      }
    }));
  },
  deleteCreditFix: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('credit_fixes').delete().eq('id', id).eq('user_id', userId);
    }
    set(state => ({ credit: { ...state.credit, fixes: state.credit.fixes.filter(f => f.id !== id) } }));
  },

  // ── Investment Accounts ───────────────────────────────────────
  addInvestmentAccount: async (account) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in.'); return false; }
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
      if (error) { toast.error('Failed to save investment account.'); return false; }
      if (data?.id) newId = data.id;
      set(state => ({ investmentAccounts: [...state.investmentAccounts, { ...account, id: newId, lastUpdated: now }] }));
      return true;
    } catch (err) {
      console.error('[addInvestmentAccount]', err);
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
      if (error) { toast.error('Failed to update investment account.'); return false; }
      set(state => ({ investmentAccounts: state.investmentAccounts.map(a => a.id === id ? { ...a, ...updates, lastUpdated: dbUpdate.last_updated as string } : a) }));
      return true;
    } catch (err) {
      console.error('[editInvestmentAccount]', err);
      return false;
    }
  },
  deleteInvestmentAccount: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const { error } = await supabase.from('investment_accounts').delete().eq('id', id).eq('user_id', userId);
        if (error) { toast.error('Failed to delete investment account.'); return false; }
      }
      set(state => ({ investmentAccounts: state.investmentAccounts.filter(a => a.id !== id) }));
      return true;
    } catch (err) {
      console.error('[deleteInvestmentAccount]', err);
      return false;
    }
  },

  // ── Insurance Policies ────────────────────────────────────────
  addInsurancePolicy: async (policy) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) { toast.error('You must be signed in.'); return false; }
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
      if (error) { toast.error('Failed to save insurance policy.'); return false; }
      if (data?.id) newId = data.id;
      set(state => ({ insurancePolicies: [...state.insurancePolicies, { ...policy, id: newId }] }));
      return true;
    } catch (err) {
      console.error('[addInsurancePolicy]', err);
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
      if (error) { toast.error('Failed to update insurance policy.'); return false; }
      set(state => ({ insurancePolicies: state.insurancePolicies.map(p => p.id === id ? { ...p, ...updates } : p) }));
      return true;
    } catch (err) {
      console.error('[editInsurancePolicy]', err);
      return false;
    }
  },
  deleteInsurancePolicy: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) {
        const { error } = await supabase.from('insurance_policies').delete().eq('id', id).eq('user_id', userId);
        if (error) { toast.error('Failed to delete insurance policy.'); return false; }
      }
      set(state => ({ insurancePolicies: state.insurancePolicies.filter(p => p.id !== id) }));
      return true;
    } catch (err) {
      console.error('[deleteInsurancePolicy]', err);
      return false;
    }
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
      const n = data?.length ?? 0;
      if (n > 0) {
        set((s) => ({
          transactions: s.transactions.map((tx) =>
            tx.category === fromCategory ? { ...tx, category: toCategory } : tx,
          ),
        }));
      }
      return n;
    } catch (err) {
      console.error('[retagTransactionsByCategory]', err);
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
    const txs = get().transactions;
    let count = 0;
    const changes: Array<{ id: string; from: string; to: string }> = [];
    const updates: PromiseLike<any>[] = [];
    const updated = txs.map(tx => {
      const txExcluded = exclusions.some((e) => e.scope === 'transaction' && e.transaction_id === tx.id);
      const merchantExcluded = exclusions.some(
        (e) => e.scope === 'merchant' && merchantKey(e.merchant_name ?? '') === merchantKey(tx.name),
      );
      if (txExcluded || merchantExcluded) return tx;
      const matched = applyCategorizationRules(tx.name, rules);
      if (matched && matched !== tx.category) {
        count++;
        changes.push({ id: tx.id, from: tx.category, to: matched });
        updates.push(
          supabase.from('transactions').update({ category: matched }).eq('id', tx.id).eq('user_id', userId)
        );
        return { ...tx, category: matched };
      }
      return tx;
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
        last.changes.map((c) =>
          supabase.from('transactions').update({ category: c.from }).eq('id', c.id).eq('user_id', userId),
        ),
      );
      set((state) => ({
        transactions: state.transactions.map((tx) => {
          const change = last.changes.find((c) => c.id === tx.id);
          return change ? { ...tx, category: change.from } : tx;
        }),
        lastRuleApplication: null,
      }));
      toast.success('Last bulk categorization was undone.');
      return true;
    } catch (err) {
      console.error('[undoLastRuleApplication] failed:', err);
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
      const { error } = await supabase
        .from('transactions')
        .update({ category: last.from })
        .eq('id', last.transactionId)
        .eq('user_id', userId);
      if (error) {
        toast.error('Could not undo the auto-category.');
        return false;
      }
      set((state) => ({
        transactions: state.transactions.map((tx) =>
          tx.id === last.transactionId ? { ...tx, category: last.from } : tx,
        ),
        lastAutoCategorization: null,
      }));
      toast.success('Auto-category undone.');
      return true;
    } catch (err) {
      console.error('[undoLastAutoCategorization] failed:', err);
      toast.error('Could not undo the auto-category.');
      return false;
    }
  },

  // Ingestion Implementation
  addPendingIngestion: (ingestion) => {
    const id = crypto.randomUUID();
    // Fires off the insert but returns ID immediately for local UI responsiveness
    (async () => {
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
          storage_url: ingestion.storageUrl
        });
        if (error) {
          console.error('[addPendingIngestion] DB insert failed:', error.message);
          toast.error('Upload not saved — data may disappear after sign-out. Run the database migration and try again.');
        }
      }
    })();
    
    set((state) => ({
      pendingIngestions: [...state.pendingIngestions, { ...ingestion, id }]
    }));
    return id;
  },
  updatePendingIngestion: async (id, updates) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const patch: any = {};
      if (updates.type) patch.type = updates.type;
      if (updates.status) patch.status = updates.status;
      if (updates.extractedData) patch.extracted_data = updates.extractedData;
      if (updates.storagePath) patch.storage_path = updates.storagePath;
      if (updates.storageUrl) patch.storage_url = updates.storageUrl;
      
      await supabase.from('pending_ingestions').update(patch).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({
      pendingIngestions: state.pendingIngestions.map(pi => pi.id === id ? { ...pi, ...updates } : pi)
    }));
  },
  removePendingIngestion: async (id) => {
    const item = get().pendingIngestions.find(pi => pi.id === id);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('pending_ingestions').delete().eq('id', id).eq('user_id', userId);
      // Delete the raw file from storage — best-effort, never blocks UI
      if (item?.storagePath) {
        void removeIngestionStoragePath(item.storagePath);
      }
    }
    // Free the local preview Blob URL to avoid memory leaks.
    const blobUrl = item?.originalFile?.url;
    if (typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(blobUrl); } catch { /* ignore */ }
    }
    set((state) => ({
      pendingIngestions: state.pendingIngestions.filter(pi => pi.id !== id)
    }));
  },
  commitIngestion: async (id) => {
    const item = get().pendingIngestions.find(pi => pi.id === id);
    if (!item || item.status !== 'ready') return false;

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const data = item.extractedData;
    const commonId = crypto.randomUUID();
    const amt = typeof data.amount === 'number' && !isNaN(data.amount) ? data.amount : 0;

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
      if (amt <= 0) {
        toast.error('Amount must be greater than zero. Edit the row or re-scan a clearer document.');
        return false;
      }
      return true;
    };

    let saved = false;

    if (item.type === 'transaction') {
      if (!requirePositiveAmount()) return false;
      const newTransaction: Transaction = {
        id: commonId,
        name: merchantName,
        amount: amt,
        category: data.category || autoCategory,
        date: data.date || new Date().toISOString().split('T')[0],
        type: 'expense'
      };
      if (userId) {
        const { error } = await supabase.from('transactions').insert({
          name: newTransaction.name, category: newTransaction.category,
          date: newTransaction.date, amount: newTransaction.amount,
          type: newTransaction.type, user_id: userId,
        });
        if (error) { toast.error('Failed to save transaction. Please try again.'); return false; }
      }
      set((s) => ({
        transactions: [newTransaction, ...s.transactions].slice(0, 50),
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
      }));
      saved = true;
    } else if (item.type === 'bill') {
      if (!requirePositiveAmount()) return false;
      const newBill: Bill = {
        id: commonId,
        biller: merchantName,
        amount: amt,
        category: data.category || autoCategory,
        dueDate: data.dueDate || data.date || new Date().toISOString().split('T')[0],
        frequency: 'Monthly',
        status: 'upcoming',
        autoPay: false,
      };
      if (userId) {
        const { error } = await supabase.from('bills').insert({
          biller: newBill.biller, amount: newBill.amount, category: newBill.category,
          due_date: newBill.dueDate, frequency: newBill.frequency,
          status: newBill.status, auto_pay: newBill.autoPay, user_id: userId,
        });
        if (error) { toast.error('Failed to save bill. Please try again.'); return false; }
      }
      set((s) => ({
        bills: [...s.bills, newBill],
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
      }));
      saved = true;
    } else if (item.type === 'income') {
      if (!requirePositiveAmount()) return false;
      const incomeName = (data.source || data.name || data.biller || merchantName || 'Income').trim();
      const newIncome: IncomeSource = {
        id: commonId,
        name: incomeName,
        amount: amt,
        frequency: 'Monthly',
        category: (data.category as string) || 'Salary',
        nextDate: data.date || data.dueDate || new Date().toISOString().split('T')[0],
        status: 'active',
        isTaxWithheld: false,
      };
      if (userId) {
        const { error } = await supabase.from('incomes').insert({
          name: newIncome.name, amount: newIncome.amount, frequency: newIncome.frequency,
          category: newIncome.category, next_date: newIncome.nextDate,
          status: newIncome.status, is_tax_withheld: newIncome.isTaxWithheld, user_id: userId,
        });
        if (error) { toast.error('Failed to save income. Please try again.'); return false; }
      }
      set((s) => ({
        incomes: [...s.incomes, newIncome],
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
      }));
      saved = true;
    } else if (item.type === 'debt') {
      if (!requirePositiveAmount()) return false;
      const ok = await get().addDebt({
        name: merchantName || 'Debt',
        type: 'Loan',
        apr: typeof data.debtApr === 'number' && !isNaN(data.debtApr) ? data.debtApr : 0,
        remaining: amt,
        minPayment: typeof data.debtMinPayment === 'number' && !isNaN(data.debtMinPayment) && data.debtMinPayment > 0
          ? data.debtMinPayment
          : Math.max(25, Math.round(amt * 0.02 * 100) / 100),
        paid: 0,
      });
      if (!ok) return false;
      set((s) => ({
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
      }));
      saved = true;
    } else if (item.type === 'citation') {
      if (!requirePositiveAmount()) return false;
      const jurisdiction = (data.jurisdiction || data.biller || merchantName || 'Issuing authority (verify)').trim();
      const daysLeft =
        typeof data.daysLeft === 'number' && !isNaN(data.daysLeft)
          ? Math.max(0, Math.floor(data.daysLeft))
          : parseInt(String(data.daysLeft ?? '30'), 10) || 30;
      const penaltyFee =
        typeof data.penaltyFee === 'number' && !isNaN(data.penaltyFee) ? data.penaltyFee : 0;
      const ok = await get().addCitation({
        type: data.citationType || 'Toll Violation',
        jurisdiction,
        daysLeft,
        amount: amt,
        penaltyFee,
        date: data.date || data.dueDate || new Date().toISOString().split('T')[0],
        citationNumber: (data.citationNumber || '').trim(),
        paymentUrl: (() => {
          const u = (data.paymentUrl || '').trim();
          if (!u) return '';
          try {
            const parsed = new URL(u);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? u : '';
          } catch {
            return '';
          }
        })(),
        status: 'open',
      });
      if (!ok) return false;
      set((s) => ({
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
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

  // Supabase Implementation
  isLoading: false,
  phase2Hydrated: false,
  fetchData: async (userId?: string, options?: { background?: boolean }) => {
    const background = options?.background === true;
    // Set immediately so App never redirects to onboarding on a frame where auth is ready but this async fn has not yet reached the old loading gate.
    if (!background) set({ isLoading: true, phase2Hydrated: false });

    const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!resolvedUserId) {
      console.warn('[fetchData] No user ID available — skipping load');
      if (!background) set({ isLoading: false, phase2Hydrated: true });
      return;
    }

    console.log('[fetchData] starting fetch...');

    // Fire non-critical RPC in background (Supabase v2 builders are thenable but not
    // full Promises — do not chain .catch(); use async/await or .then(onErr)).
    void (async () => {
      const { error } = await supabase.rpc('flip_overdue_bills');
      if (error) console.warn('[fetchData] flip_overdue_bills RPC failed:', error.message);
    })();

    // Start Phase 2 queries immediately — runs in parallel with Phase 1
    // so total load time = max(phase1, phase2) instead of phase1 + phase2.
    const phase2Promise = Promise.all([
      supabase.from('goals').select('*').eq('user_id', resolvedUserId),
      supabase.from('budgets').select('*').eq('user_id', resolvedUserId),
      supabase.from('categories').select('*').eq('user_id', resolvedUserId),
      supabase.from('citations').select('*').eq('user_id', resolvedUserId),
      supabase.from('deductions').select('*').eq('user_id', resolvedUserId),
      supabase.from('freelance_entries').select('*').eq('user_id', resolvedUserId),
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
        { data: transactions, error: transactionsError },
        { data: assets, error: assetsError },
        { data: incomes, error: incomesError },
        { data: subscriptions, error: subscriptionsError },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', resolvedUserId).maybeSingle(),
        supabase.from('bills').select('*').eq('user_id', resolvedUserId),
        supabase.from('debts').select('*').eq('user_id', resolvedUserId),
        supabase.from('transactions').select('*').eq('user_id', resolvedUserId).order('date', { ascending: false }).limit(500),
        supabase.from('assets').select('*').eq('user_id', resolvedUserId),
        supabase.from('incomes').select('*').eq('user_id', resolvedUserId),
        supabase.from('subscriptions').select('*').eq('user_id', resolvedUserId),
      ]);

      // Log any errors
      if (billsError) {
        console.error('[fetchData] Bills fetch error:', billsError);
        console.error('[fetchData] Bills error details:', { code: billsError.code, message: billsError.message });
      }
      
      if (debtsError) console.error('[fetchData] Debts fetch error:', debtsError);
      if (transactionsError) console.error('[fetchData] Transactions fetch error:', transactionsError);
      if (assetsError) console.error('[fetchData] Assets fetch error:', assetsError);
      if (incomesError) console.error('[fetchData] Incomes fetch error:', incomesError);
      if (subscriptionsError) console.error('[fetchData] Subscriptions fetch error:', subscriptionsError);

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[fetchData] Profile fetch error:', profileError);
      }

      set({
        bills: (bills || []).map((b: Record<string, unknown>) => ({
          id: b.id as string,
          biller: b.biller as string,
          amount: b.amount as number,
          category: b.category as string,
          dueDate: (b.due_date ?? b.dueDate) as string,
          frequency: b.frequency as string,
          status: b.status as Bill['status'],
          autoPay: (b.auto_pay ?? b.autoPay) as boolean,
        })),
        debts: (debts || []).map((d: Record<string, unknown>) => ({
          id: d.id as string,
          name: d.name as string,
          type: d.type as string,
          apr: d.apr as number,
          remaining: d.remaining as number,
          minPayment: (d.min_payment ?? d.minPayment) as number,
          paid: d.paid as number,
          paymentDueDate: (d.payment_due_date ?? d.paymentDueDate ?? null) as string | null | undefined,
          originalAmount: (d.original_amount ?? undefined) as number | undefined,
          originationDate: (d.origination_date ?? undefined) as string | undefined,
          termMonths: (d.term_months ?? undefined) as number | undefined,
        })),
        transactions: (transactions || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          category: (t.category ?? '') as string,
          date: t.date as string,
          amount: t.amount as number,
          type: (t.type ?? 'expense') as Transaction['type'],
        })),
        assets: (assets || []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          name: a.name as string,
          value: a.value as number,
          type: a.type as string,
          appreciationRate: (a.appreciation_rate ?? undefined) as number | undefined,
          purchasePrice: (a.purchase_price ?? undefined) as number | undefined,
          purchaseDate: (a.purchase_date ?? undefined) as string | undefined,
        })),
        incomes: (incomes || []).map((i: Record<string, unknown>) => ({
          id: i.id as string,
          name: i.name as string,
          amount: i.amount as number,
          frequency: i.frequency as IncomeSource['frequency'],
          category: i.category as string,
          nextDate: (i.next_date ?? i.nextDate) as string,
          status: i.status as IncomeSource['status'],
          isTaxWithheld: (i.is_tax_withheld ?? i.isTaxWithheld ?? false) as boolean,
        })),
        subscriptions: (subscriptions || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: s.name as string,
          amount: s.amount as number,
          frequency: s.frequency as string,
          nextBillingDate: (s.next_billing_date ?? s.nextBillingDate) as string,
          status: s.status as Subscription['status'],
          priceHistory: (s.price_history ?? s.priceHistory ?? []) as { date: string; amount: number }[],
        })),
        bankConnected: !!(profile && (profile as Record<string, unknown>).plaid_linked_at),
        plaidInstitutionName: profile
          ? (((profile as Record<string, unknown>).plaid_institution_name as string | null) ?? null)
          : null,
        plaidLastSyncAt: profile
          ? (((profile as Record<string, unknown>).plaid_last_sync_at as string | null) ?? null)
          : null,
        plaidNeedsRelink: profile
          ? ((profile as Record<string, unknown>).plaid_needs_relink === true)
          : false,
        credit: profile ? {
          ...get().credit,
          score: profile.credit_score ?? get().credit.score,
          lastUpdated: profile.credit_last_updated ?? get().credit.lastUpdated,
        } : get().credit,
        user: profile ? {
          id: profile.id,
          firstName: profile.first_name ?? '',
          lastName: profile.last_name ?? '',
          email: profile.email ?? '',
          avatar: profile.avatar ?? '',
          theme: profile.theme ?? 'Dark',
          phone: profile.phone ?? '',
          timezone: profile.timezone ?? 'Eastern Time (ET)',
          language: profile.language || 'English (US)',
          hasCompletedOnboarding: profile.has_completed_onboarding === true,
          taxState: profile.tax_state ?? '',
          taxRate: profile.tax_rate ?? 0,
          isAdmin: profile.is_admin === true,
        } : { ...get().user, id: resolvedUserId },
      });

      // Release first paint as soon as the phase-1 shell is ready. Phase-2 datasets
      // hydrate after this without blocking dashboard LCP.
      if (!background) set({ isLoading: false });

      let phase2RecordCount = 0;

      // ── PHASE 2: Awaiting the promise started before Phase 1 ─────────────
      // By now Phase 2 has been running in parallel — total cost is
      // max(phase1, phase2) not phase1 + phase2.
      try {
        const [
          { data: goals },
          { data: budgets },
          { data: categories },
          { data: citations },
          { data: deductions },
          { data: freelanceEntries },
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
          goals: (goals || []).map((g: Record<string, unknown>) => ({
            id: g.id as string,
            name: g.name as string,
            targetAmount: (g.target_amount ?? g.targetAmount) as number,
            currentAmount: (g.current_amount ?? g.currentAmount) as number,
            deadline: g.deadline as string,
            type: g.type as Goal['type'],
            color: g.color as string,
          })),
          budgets: (budgets || []).map((b: Record<string, unknown>) => ({
            id: b.id as string,
            category: b.category as string,
            amount: b.amount as number,
            period: b.period as Budget['period'],
            rolloverEnabled: Boolean(b.rollover_enabled ?? b.rolloverEnabled),
            lockMode: ((b.lock_mode ?? b.lockMode ?? 'none') as Budget['lockMode']),
          })),
          categories: (categories || []).map((c: Record<string, unknown>) => ({
            id: c.id as string,
            name: c.name as string,
            color: c.color as string,
            type: c.type as Category['type'],
          })),
          citations: (citations || []).map((c: Record<string, unknown>) => {
            const storedDate = c.date as string;
            const computedDaysLeft = storedDate
              ? Math.ceil((new Date(storedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : (c.days_left ?? c.daysLeft) as number;
            return {
              id: c.id as string,
              type: c.type as string,
              jurisdiction: c.jurisdiction as string,
              daysLeft: computedDaysLeft,
              amount: c.amount as number,
              penaltyFee: (c.penalty_fee ?? c.penaltyFee) as number,
              date: storedDate,
              citationNumber: (c.citation_number ?? c.citationNumber) as string,
              paymentUrl: (c.payment_url ?? c.paymentUrl) as string,
              status: c.status as Citation['status'],
            };
          }),
          deductions: (deductions || []).map((d: Record<string, unknown>) => ({
            id: d.id as string,
            name: d.name as string,
            category: d.category as string,
            amount: d.amount as number,
            date: d.date as string,
          })),
          freelanceEntries: (freelanceEntries || []).map((f: Record<string, unknown>) => ({
            id: f.id as string,
            client: f.client as string,
            amount: f.amount as number,
            date: f.date as string,
            isVaulted: (f.is_vaulted ?? f.isVaulted ?? false) as boolean,
            scouredWriteOffs: (f.scoured_write_offs ?? f.scouredWriteOffs ?? 0) as number,
          })),
          pendingIngestions: (pendingIngestions || []).map((pi: Record<string, any>) => ({
            id: pi.id,
            type: pi.type,
            status: pi.status,
            source: pi.source,
            extractedData: pi.extracted_data || {},
            originalFile: pi.original_file || {},
            storagePath: pi.storage_path,
            storageUrl: pi.storage_url,
          })),
          categorizationRules: (categorizationRules || []).map((r: Record<string, unknown>) => ({
            id:          r.id as string,
            match_type:  r.match_type as CategorizationRule['match_type'],
            match_value: r.match_value as string,
            category:    r.category as string,
            priority:    r.priority as number,
          })),
          categorizationExclusions: (categorizationExclusions || []).map((e: Record<string, unknown>) => ({
            id: e.id as string,
            scope: e.scope as CategorizationExclusion['scope'],
            transaction_id: (e.transaction_id ?? null) as string | null,
            merchant_name: (e.merchant_name ?? null) as string | null,
          })),
          credit: {
            ...get().credit,
            fixes: (creditFixes || []).map((f: Record<string, unknown>) => ({
              id: f.id as string,
              item: f.item as string,
              amount: f.amount as number,
              status: f.status as CreditFix['status'],
              bureau: f.bureau as string,
              notes: (f.notes ?? '') as string,
            })),
            factors: (creditFactors || []).map((f: Record<string, unknown>) => ({
              id: f.id as string,
              name: f.name as string,
              impact: f.impact as 'high' | 'medium' | 'low',
              status: f.status as 'excellent' | 'good' | 'fair' | 'poor',
              description: f.description as string,
            })),
          },
          adminBroadcasts: (adminBroadcasts || []).map((b: Record<string, unknown>) => ({
            id: b.id as string,
            title: b.title as string,
            content: b.content as string,
            type: b.type as 'info' | 'warning' | 'error',
            createdAt: b.created_at as string,
          })),
          platformSettings: platformSettings ? {
            id: platformSettings.id as string,
            maintenanceMode: platformSettings.maintenance_mode as boolean,
            plaidEnabled: platformSettings.plaid_enabled as boolean,
            broadcastMessage: platformSettings.broadcast_message as string,
            taxStandardDeduction: platformSettings.tax_standard_deduction as number,
            taxTopBracket: platformSettings.tax_top_bracket as number,
          } : null,
          netWorthSnapshots: (netWorthSnapshots || []).map((s: Record<string, unknown>) => ({
            id: s.id as string,
            date: s.date as string,
            netWorth: s.net_worth as number,
            assets: s.assets as number,
            debts: s.debts as number,
          })),
          investmentAccounts: (investmentAccountsData ?? []).map((a: Record<string, unknown>) => ({
            id: a.id as string,
            name: a.name as string,
            type: a.type as InvestmentAccount['type'],
            institution: (a.institution as string) ?? '',
            balance: Number(a.balance) || 0,
            notes: (a.notes as string) ?? '',
            lastUpdated: (a.last_updated as string) ?? '',
          })),
          insurancePolicies: (insurancePoliciesData ?? []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            type: p.type as InsurancePolicy['type'],
            provider: p.provider as string,
            premium: Number(p.premium) || 0,
            frequency: (p.frequency as string) ?? 'Monthly',
            coverageAmount: p.coverage_amount != null ? Number(p.coverage_amount) : undefined,
            deductible: p.deductible != null ? Number(p.deductible) : undefined,
            expirationDate: (p.expiration_date as string) ?? undefined,
            status: (p.status as InsurancePolicy['status']) ?? 'active',
            notes: (p.notes as string) ?? '',
          })),
        });

        phase2RecordCount =
          (goals?.length ?? 0) +
          (budgets?.length ?? 0) +
          (categories?.length ?? 0) +
          (citations?.length ?? 0) +
          (deductions?.length ?? 0) +
          (freelanceEntries?.length ?? 0) +
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

      // Upsert today's net worth snapshot for historical trending.
      try {
        type AssetRow = { value?: number | string | null };
        type DebtRow = { remaining?: number | string | null };
        const toNum = (v: unknown): number => {
          const n = typeof v === 'number' ? v : Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        const totalAssets = ((assets ?? []) as AssetRow[]).reduce(
          (s, a) => s + toNum(a?.value),
          0,
        );
        const totalDebts = ((debts ?? []) as DebtRow[]).reduce(
          (s, d) => s + toNum(d?.remaining),
          0,
        );
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('net_worth_snapshots')
          .upsert(
            {
              user_id:   resolvedUserId,
              date:      today,
              net_worth: parseFloat((totalAssets - totalDebts).toFixed(2)),
              assets:    parseFloat(totalAssets.toFixed(2)),
              debts:     parseFloat(totalDebts.toFixed(2)),
            },
            { onConflict: 'user_id,date' }
          );
      } catch { /* non-critical — silently skip */ }

      const recordCount =
        (bills?.length ?? 0) +
        (debts?.length ?? 0) +
        (transactions?.length ?? 0) +
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

  // Modal Implementation
  isQuickAddOpen: false,
  quickAddTab: 'transaction',
  openQuickAdd: (tab = 'transaction') => set({ isQuickAddOpen: true, quickAddTab: tab }),
  closeQuickAdd: () => set({ isQuickAddOpen: false }),
    }),
    {
      name: 'oweable-store-persistence',
      // Safe sessionStorage wrapper — if the browser quota is exceeded (5 MB)
      // the write is silently skipped so fetchData never crashes.
      storage: createJSONStorage(() => ({
        getItem: (key: string) => {
          try { return sessionStorage.getItem(key); } catch { return null; }
        },
        setItem: (key: string, value: string) => {
          try { sessionStorage.setItem(key, value); } catch { /* quota exceeded — skip, app still works */ }
        },
        removeItem: (key: string) => {
          try { sessionStorage.removeItem(key); } catch { /* ignore */ }
        },
      })),
      // Persist ONLY the tiny identity shell needed to render the UI before
      // fetchData() completes. Financial data (bills, debts, transactions, etc.)
      // is always re-fetched from Supabase on every authenticated session.
      // Categories are excluded — they are re-fetched quickly and excluding
      // them keeps the persisted payload well under the 5 MB sessionStorage quota.
      partialize: (state) => ({
        user: {
          id: state.user.id,
          firstName: state.user.firstName,
          lastName: state.user.lastName,
          email: state.user.email,
          avatar: state.user.avatar,
          theme: state.user.theme,
          isAdmin: state.user.isAdmin,
        },
      }),
      merge: (persisted, current) => {
        const c = current as AppState;
        if (!persisted || typeof persisted !== 'object') return c;
        const p = persisted as Partial<AppState>;
        const pu = p.user;
        if (!pu) return { ...c, ...p } as AppState;
        const { hasCompletedOnboarding: _ignored, ...userRest } = pu as typeof c.user & {
          hasCompletedOnboarding?: boolean;
        };
        return {
          ...c,
          ...p,
          user: {
            ...c.user,
            ...userRest,
            hasCompletedOnboarding: c.user.hasCompletedOnboarding,
          },
        };
      },
    }
  )
);
