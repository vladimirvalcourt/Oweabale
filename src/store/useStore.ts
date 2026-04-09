import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { type CategorizationRule, applyCategorizationRules } from '../lib/categorizationRules';
export type { CategorizationRule };

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
  period: 'Monthly' | 'Yearly';
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
  type: 'bill' | 'debt' | 'transaction' | 'income';
  status: 'scanning' | 'uploading' | 'ready' | 'error' | string;
  extractedData: {
    name?: string;
    biller?: string;
    amount?: number;
    date?: string;
    dueDate?: string;
    category?: string;
    source?: string;
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

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
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
  setTaxSettings: (state: string, rate: number) => void;
  bankConnected: boolean;
  connectBank: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addBill: (bill: Omit<Bill, 'id'>) => void;
  editBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  editDebt: (id: string, debt: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addDebtPayment: (id: string, amount: number) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
  editAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addSubscription: (subscription: Omit<Subscription, 'id'>) => Promise<void>;
  editSubscription: (id: string, subscription: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  editGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addGoalProgress: (id: string, amount: number) => Promise<void>;
  addIncome: (income: Omit<IncomeSource, 'id'>) => Promise<void>;
  editIncome: (id: string, income: Partial<IncomeSource>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  recordIncomeDeposit: (id: string, amount?: number) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  editBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  editCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCitation: (citation: Omit<Citation, 'id'>) => Promise<void>;
  resolveCitation: (id: string) => Promise<void>;
  addDeduction: (deduction: Omit<Deduction, 'id'>) => Promise<void>;
  deleteDeduction: (id: string) => Promise<void>;
  // Freelance Actions
  addFreelanceEntry: (entry: Omit<FreelanceEntry, 'id'>) => Promise<void>;
  toggleFreelanceVault: (id: string) => Promise<void>;
  deleteFreelanceEntry: (id: string) => Promise<void>;
  updateUser: (user: Partial<AppState['user']>) => Promise<void>;
  signOut: () => Promise<void>;
  resetData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  addCategorizationRule: (rule: Omit<CategorizationRule, 'id'>) => Promise<void>;
  deleteCategorizationRule: (id: string) => Promise<void>;
  applyRulesToExistingTransactions: () => Promise<number>;

  // Ingestion Actions
  addPendingIngestion: (ingestion: Omit<PendingIngestion, 'id'>) => string;
  updatePendingIngestion: (id: string, updates: Partial<PendingIngestion>) => void;
  removePendingIngestion: (id: string) => void;
  commitIngestion: (id: string) => Promise<void>;
  
  // Supabase Syncing
  fetchData: (userId?: string) => Promise<void>;
  isLoading: boolean;
  
  // Modal State
  addNotification: (note: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  isQuickAddOpen: boolean;
  quickAddTab: TabType;
  openQuickAdd: (tab?: TabType) => void;
  closeQuickAdd: () => void;
}

type TabType = 'transaction' | 'obligation' | 'income';

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
  pendingIngestions: [],
  notifications: [],
  categorizationRules: [],
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
    set({ bankConnected: true });
    await get().fetchData();
  },
  addTransaction: async (transaction) => {
    // Auto-apply categorization rules before saving
    const rules = get().categorizationRules;
    const autoCategory = applyCategorizationRules(transaction.name, rules);
    if (autoCategory) transaction = { ...transaction, category: autoCategory };

    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('transactions').insert({ ...transaction, user_id: userId }).select('id').single();
      if (error) { toast.error('Failed to sync transaction'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({
      transactions: [{ ...transaction, id: newId }, ...state.transactions].slice(0, 100)
    }));
  },
  addBill: async (bill) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('bills').insert({
        biller: bill.biller, amount: bill.amount, category: bill.category,
        due_date: bill.dueDate, frequency: bill.frequency, status: bill.status,
        auto_pay: bill.autoPay, user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync bill'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ bills: [...state.bills, { ...bill, id: newId }] }));
  },
  editBill: async (id, updatedBill) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { error } = await supabase.from('bills').update(updatedBill).eq('id', id).eq('user_id', userId);
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
      if (error) { toast.error('Failed to update bill status'); return; }
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
  },
  addDebt: async (debt) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('debts').insert({
        name: debt.name, type: debt.type, apr: debt.apr, remaining: debt.remaining,
        min_payment: debt.minPayment, paid: debt.paid,
        original_amount: debt.originalAmount ?? null,
        origination_date: debt.originationDate ?? null,
        term_months: debt.termMonths ?? null,
        user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync debt'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ debts: [...state.debts, { ...debt, id: newId }] }));
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('assets').insert({
        name: asset.name, value: asset.value, type: asset.type,
        appreciation_rate: asset.appreciationRate ?? null,
        purchase_price: asset.purchasePrice ?? null,
        purchase_date: asset.purchaseDate ?? null,
        user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync asset'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ assets: [...state.assets, { ...asset, id: newId }] }));
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from('assets').delete().eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
  },

  // ── Subscriptions ─────────────────────────────────────────────
  addSubscription: async (subscription) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('subscriptions').insert({
        name: subscription.name, amount: subscription.amount,
        frequency: subscription.frequency, next_billing_date: subscription.nextBillingDate,
        status: subscription.status, price_history: subscription.priceHistory ?? [],
        user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync subscription'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ subscriptions: [...state.subscriptions, { ...subscription, id: newId }] }));
  },
  editSubscription: async (id, updatedSubscription) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const patch: Record<string, unknown> = {};
      if (updatedSubscription.name !== undefined)            patch.name = updatedSubscription.name;
      if (updatedSubscription.amount !== undefined)          patch.amount = updatedSubscription.amount;
      if (updatedSubscription.frequency !== undefined)       patch.frequency = updatedSubscription.frequency;
      if (updatedSubscription.nextBillingDate !== undefined) patch.next_billing_date = updatedSubscription.nextBillingDate;
      if (updatedSubscription.status !== undefined)          patch.status = updatedSubscription.status;
      if (updatedSubscription.priceHistory !== undefined)    patch.price_history = updatedSubscription.priceHistory;
      await supabase.from('subscriptions').update(patch).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ subscriptions: state.subscriptions.map((s) => s.id === id ? { ...s, ...updatedSubscription } : s) }));
  },
  deleteSubscription: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('subscriptions').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) }));
  },

  // ── Goals ─────────────────────────────────────────────────────
  addGoal: async (goal) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('goals').insert({
        name: goal.name, target_amount: goal.targetAmount, current_amount: goal.currentAmount,
        deadline: goal.deadline, type: goal.type, color: goal.color, user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync goal'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ goals: [...state.goals, { ...goal, id: newId }] }));
  },
  editGoal: async (id, updatedGoal) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const patch: Record<string, unknown> = {};
      if (updatedGoal.name !== undefined)          patch.name = updatedGoal.name;
      if (updatedGoal.targetAmount !== undefined)  patch.target_amount = updatedGoal.targetAmount;
      if (updatedGoal.currentAmount !== undefined) patch.current_amount = updatedGoal.currentAmount;
      if (updatedGoal.deadline !== undefined)      patch.deadline = updatedGoal.deadline;
      if (updatedGoal.type !== undefined)          patch.type = updatedGoal.type;
      if (updatedGoal.color !== undefined)         patch.color = updatedGoal.color;
      await supabase.from('goals').update(patch).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ goals: state.goals.map((g) => g.id === id ? { ...g, ...updatedGoal } : g) }));
  },
  deleteGoal: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },
  addGoalProgress: async (id, amount) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;
    const newAmount = Math.max(0, Math.min(goal.targetAmount, goal.currentAmount + amount));
    if (userId) {
      await supabase.from('goals').update({ current_amount: newAmount }).eq('id', id).eq('user_id', userId);
    }
    if (newAmount >= goal.targetAmount) {
      get().addNotification({ title: `🎯 Goal Complete!`, message: `"${goal.name}" has been fully funded.`, type: 'success' });
    }
    set((state) => ({ goals: state.goals.map((g) => g.id === id ? { ...g, currentAmount: newAmount } : g) }));
  },

  // ── Income ────────────────────────────────────────────────────
  addIncome: async (income) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('incomes').insert({
        name: income.name, amount: income.amount, frequency: income.frequency,
        category: income.category, next_date: income.nextDate,
        status: income.status, is_tax_withheld: income.isTaxWithheld, user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync income'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ incomes: [...state.incomes, { ...income, id: newId }] }));
  },
  editIncome: async (id, updatedIncome) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const patch: Record<string, unknown> = {};
      if (updatedIncome.name !== undefined)         patch.name = updatedIncome.name;
      if (updatedIncome.amount !== undefined)       patch.amount = updatedIncome.amount;
      if (updatedIncome.frequency !== undefined)    patch.frequency = updatedIncome.frequency;
      if (updatedIncome.category !== undefined)     patch.category = updatedIncome.category;
      if (updatedIncome.nextDate !== undefined)     patch.next_date = updatedIncome.nextDate;
      if (updatedIncome.status !== undefined)       patch.status = updatedIncome.status;
      if (updatedIncome.isTaxWithheld !== undefined) patch.is_tax_withheld = updatedIncome.isTaxWithheld;
      await supabase.from('incomes').update(patch).eq('id', id).eq('user_id', userId);
    }
    set((state) => ({ incomes: state.incomes.map((i) => i.id === id ? { ...i, ...updatedIncome } : i) }));
  },
  deleteIncome: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('incomes').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ incomes: state.incomes.filter((i) => i.id !== id) }));
  },
  recordIncomeDeposit: async (id, amount) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const income = get().incomes.find(i => i.id === id);
    if (!income) return;
    const depositAmount = amount || income.amount;
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      name: `Deposit: ${income.name}`,
      category: income.category,
      date: new Date().toISOString().split('T')[0],
      amount: depositAmount,
      type: 'income',
    };
    if (userId) {
      await supabase.from('transactions').insert({ name: newTx.name, category: newTx.category, date: newTx.date, amount: newTx.amount, type: newTx.type, user_id: userId });
    }
    set((state) => ({ transactions: [newTx, ...state.transactions].slice(0, 50) }));
  },

  // ── Budgets ───────────────────────────────────────────────────
  addBudget: async (budget) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('budgets').insert({ category: budget.category, amount: budget.amount, period: budget.period, user_id: userId }).select('id').single();
      if (error) { toast.error('Failed to sync budget'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ budgets: [...state.budgets, { ...budget, id: newId }] }));
  },
  editBudget: async (id, updatedBudget) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('budgets').update(updatedBudget).eq('id', id).eq('user_id', userId);
    set((state) => ({ budgets: state.budgets.map((b) => b.id === id ? { ...b, ...updatedBudget } : b) }));
  },
  deleteBudget: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
  },

  // ── Categories ────────────────────────────────────────────────
  addCategory: async (category) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('categories').insert({ name: category.name, color: category.color, type: category.type, user_id: userId }).select('id').single();
      if (error) { toast.error('Failed to sync category'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ categories: [...state.categories, { ...category, id: newId }] }));
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('citations').insert({
        type: citation.type, jurisdiction: citation.jurisdiction,
        days_left: citation.daysLeft, amount: citation.amount,
        penalty_fee: citation.penaltyFee, date: citation.date,
        citation_number: citation.citationNumber, payment_url: citation.paymentUrl,
        status: citation.status, user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync citation'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ citations: [...state.citations, { ...citation, id: newId }] }));
  },
  resolveCitation: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('citations').update({ status: 'resolved' }).eq('id', id).eq('user_id', userId);
    set((state) => ({ citations: state.citations.map((c) => c.id === id ? { ...c, status: 'resolved' as const } : c) }));
  },

  // ── Deductions ────────────────────────────────────────────────
  addDeduction: async (deduction) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('deductions').insert({ name: deduction.name, category: deduction.category, amount: deduction.amount, date: deduction.date, user_id: userId }).select('id').single();
      if (error) { toast.error('Failed to sync deduction'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ deductions: [...state.deductions, { ...deduction, id: newId }] }));
  },
  deleteDeduction: async (id) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) await supabase.from('deductions').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ deductions: state.deductions.filter((d) => d.id !== id) }));
  },

  // ── User / Profile ────────────────────────────────────────────
  updateUser: async (user) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
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
        await supabase.from('profiles').upsert({ id: userId, ...patch });
      }
    }
    set((state) => ({ user: { ...state.user, ...user } }));
  },
  addFreelanceEntry: async (entry) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let newId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from('freelance_entries').insert({
        client: entry.client, amount: entry.amount, date: entry.date,
        is_vaulted: entry.isVaulted, scoured_write_offs: entry.scouredWriteOffs ?? 0,
        user_id: userId,
      }).select('id').single();
      if (error) { toast.error('Failed to sync freelance entry'); return; }
      if (data?.id) newId = data.id;
    }
    set((state) => ({ freelanceEntries: [...state.freelanceEntries, { ...entry, id: newId }] }));
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
  resetData: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    set({ isLoading: true });
    try {
      // 1. CLEAR ALL RECORDS FROM ALL TABLES associated with this user (parallel)
      const tables = [
        'bills', 'debts', 'transactions', 'assets', 'subscriptions',
        'goals', 'incomes', 'budgets', 'categories', 'citations',
        'deductions', 'freelance_entries', 'pending_ingestions'
      ];

      await Promise.all(tables.map(table =>
        supabase.from(table).delete().eq('user_id', userId)
      ));

      // 2. RESET ONBOARDING FLAG
      await supabase.from('profiles').upsert({
        id: userId,
        has_completed_onboarding: false,
        tax_state: '',
        tax_rate: 0
      });

      // 3. RESET LOCAL STATE
      set({
        ...initialData,
        user: {
          ...get().user,
          hasCompletedOnboarding: false,
          taxState: '',
          taxRate: 0
        }
      });

      toast.success('All data has been cleared. You are back at square one.');
      window.location.href = '/onboarding';
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
    if (!userId) return;
    await supabase.from('categorization_rules').delete().eq('id', id).eq('user_id', userId);
    set((state) => ({ categorizationRules: state.categorizationRules.filter(r => r.id !== id) }));
  },

  applyRulesToExistingTransactions: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return 0;
    const rules = get().categorizationRules;
    if (rules.length === 0) return 0;
    const txs = get().transactions;
    let count = 0;
    const updates: PromiseLike<any>[] = [];
    const updated = txs.map(tx => {
      const matched = applyCategorizationRules(tx.name, rules);
      if (matched && matched !== tx.category) {
        count++;
        updates.push(
          supabase.from('transactions').update({ category: matched }).eq('id', tx.id).eq('user_id', userId)
        );
        return { ...tx, category: matched };
      }
      return tx;
    });
    if (count > 0) {
      await Promise.all(updates);
      set({ transactions: updated });
    }
    return count;
  },

  // Ingestion Implementation
  addPendingIngestion: (ingestion) => {
    const id = crypto.randomUUID();
    // Fires off the insert but returns ID immediately for local UI responsiveness
    (async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const { error } = await supabase.from('pending_ingestions').insert({
          user_id: userId,
          type: ingestion.type,
          status: ingestion.status,
          source: ingestion.source ?? 'desktop',
          extracted_data: ingestion.extractedData,
          original_file: ingestion.originalFile,
          storage_path: ingestion.storagePath,
          storage_url: ingestion.storageUrl
        });
        if (error) console.error('[addPendingIngestion] DB insert failed:', error.message);
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
        supabase.storage.from('ingestion-files').remove([item.storagePath]).catch(() => {});
      }
    }
    set((state) => ({
      pendingIngestions: state.pendingIngestions.filter(pi => pi.id !== id)
    }));
  },
  commitIngestion: async (id) => {
    const item = get().pendingIngestions.find(pi => pi.id === id);
    if (!item || (item.status !== 'ready' && !item.status.includes('scanning'))) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const data = item.extractedData;
    const commonId = crypto.randomUUID();
    
    // Deterministic Mapping (No AI Slop)
    const getCategoryFromMerchant = (name: string): string => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('food') || lowerName.includes('grocery') || lowerName.includes('market') || lowerName.includes('wholefoods') || lowerName.includes('trader joes') || lowerName.includes('walmart')) return 'food';
      if (lowerName.includes('uber') || lowerName.includes('lyft') || lowerName.includes('gas') || lowerName.includes('shell') || lowerName.includes('exxon') || lowerName.includes('parking') || lowerName.includes('mta') || lowerName.includes('subway')) return 'transport';
      if (lowerName.includes('amazon') || lowerName.includes('target') || lowerName.includes('apple') || lowerName.includes('best buy') || lowerName.includes('shopping')) return 'shopping';
      if (lowerName.includes('netflix') || lowerName.includes('spotify') || lowerName.includes('hulu') || lowerName.includes('hbo') || lowerName.includes('movie') || lowerName.includes('cinema')) return 'entertainment';
      if (lowerName.includes('cvs') || lowerName.includes('walgreens') || lowerName.includes('clinic') || lowerName.includes('doctor') || lowerName.includes('hospital')) return 'medical';
      return 'other';
    };

    const merchantName = data.name || data.biller || 'New Entry';
    const autoCategory = getCategoryFromMerchant(merchantName);

    if (item.type === 'transaction') {
      const newTransaction: Transaction = {
        id: commonId,
        name: merchantName,
        amount: data.amount || 0,
        category: data.category || autoCategory,
        date: data.date || new Date().toISOString().split('T')[0],
        type: 'expense'
      };
      if (userId) {
        await supabase.from('transactions').insert({
          name: newTransaction.name, category: newTransaction.category,
          date: newTransaction.date, amount: newTransaction.amount,
          type: newTransaction.type, user_id: userId,
        });
      }
      set((s) => ({
        transactions: [newTransaction, ...s.transactions].slice(0, 50),
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
      }));
    } else if (item.type === 'bill') {
      const newBill: Bill = {
        id: commonId,
        biller: merchantName,
        amount: data.amount || 0,
        category: data.category || autoCategory,
        dueDate: data.dueDate || data.date || new Date().toISOString().split('T')[0],
        frequency: 'Monthly',
        status: 'upcoming',
        autoPay: false,
      };
      if (userId) {
        await supabase.from('bills').insert({
          biller: newBill.biller, amount: newBill.amount, category: newBill.category,
          due_date: newBill.dueDate, frequency: newBill.frequency,
          status: newBill.status, auto_pay: newBill.autoPay, user_id: userId,
        });
      }
      set((s) => ({
        bills: [...s.bills, newBill],
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
      }));
    } else if (item.type === 'income') {
      const newIncome: IncomeSource = {
        id: commonId,
        name: data.source || 'New Income',
        amount: data.amount || 0,
        frequency: 'Monthly',
        category: 'Salary',
        nextDate: data.date || new Date().toISOString().split('T')[0],
        status: 'active',
        isTaxWithheld: false,
      };
      if (userId) {
        await supabase.from('incomes').insert({
          name: newIncome.name, amount: newIncome.amount, frequency: newIncome.frequency,
          category: newIncome.category, next_date: newIncome.nextDate,
          status: newIncome.status, is_tax_withheld: newIncome.isTaxWithheld, user_id: userId,
        });
      }
      set((s) => ({
        incomes: [...s.incomes, newIncome],
        pendingIngestions: s.pendingIngestions.filter(pi => pi.id !== id),
      }));
    }

    // ── Always clean up: delete DB row + raw file from storage ──
    if (userId) {
      await supabase.from('pending_ingestions').delete().eq('id', id).eq('user_id', userId);
      if (item.storagePath) {
        supabase.storage.from('ingestion-files').remove([item.storagePath]).catch(() => {});
      }
    }

    toast.success(`Saved ${item.type} to history`);
  },

  // Supabase Implementation
  isLoading: false,
  fetchData: async (userId?: string) => {
    const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!resolvedUserId) return;

    const isFirstLoad = !get().user.id || get().user.id === '';
    if (isFirstLoad) set({ isLoading: true });

    // Fire non-critical RPC in background
    void (supabase.rpc('flip_overdue_bills') as unknown as Promise<unknown>).catch(() => {});

    try {
      const [
        { data: profile, error: profileError },
        { data: bills },
        { data: debts },
        { data: transactions },
        { data: assets },
        { data: incomes },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', resolvedUserId).maybeSingle(),
        supabase.from('bills').select('*').eq('user_id', resolvedUserId),
        supabase.from('debts').select('*').eq('user_id', resolvedUserId),
        supabase.from('transactions').select('*').eq('user_id', resolvedUserId).order('date', { ascending: false }).limit(500),
        supabase.from('assets').select('*').eq('user_id', resolvedUserId),
        supabase.from('incomes').select('*').eq('user_id', resolvedUserId),
      ]);

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Release the loader as soon as critical data is ready
      set({
        isLoading: false,
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
          originalAmount: (d.original_amount ?? undefined) as number | undefined,
          originationDate: (d.origination_date ?? undefined) as string | undefined,
          termMonths: (d.term_months ?? undefined) as number | undefined,
        })),
        transactions: (transactions || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          category: t.category as string,
          date: t.date as string,
          amount: t.amount as number,
          type: t.type as Transaction['type'],
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
        user: profile ? {
          id: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          avatar: profile.avatar,
          theme: profile.theme,
          phone: profile.phone ?? '',
          timezone: profile.timezone ?? 'Eastern Time (ET)',
          language: profile.language || 'English (US)',
          hasCompletedOnboarding: profile.has_completed_onboarding || false,
          taxState: profile.tax_state ?? '',
          taxRate: profile.tax_rate ?? 0,
          isAdmin: profile.is_admin === true,
        } : { ...get().user, id: resolvedUserId },
      });

      // ── PHASE 2: Secondary data — loads silently while user sees dashboard ─
      const [
        { data: subscriptions },
        { data: goals },
        { data: budgets },
        { data: categories },
        { data: citations },
        { data: deductions },
        { data: freelanceEntries },
        { data: pendingIngestions },
        { data: categorizationRules },
      ] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('user_id', resolvedUserId),
        supabase.from('goals').select('*').eq('user_id', resolvedUserId),
        supabase.from('budgets').select('*').eq('user_id', resolvedUserId),
        supabase.from('categories').select('*').eq('user_id', resolvedUserId),
        supabase.from('citations').select('*').eq('user_id', resolvedUserId),
        supabase.from('deductions').select('*').eq('user_id', resolvedUserId),
        supabase.from('freelance_entries').select('*').eq('user_id', resolvedUserId),
        supabase.from('pending_ingestions').select('*').eq('user_id', resolvedUserId),
        supabase.from('categorization_rules').select('*').eq('user_id', resolvedUserId).order('priority', { ascending: false }).order('created_at', { ascending: false }),
      ]);

      set({
        subscriptions: (subscriptions || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: s.name as string,
          amount: s.amount as number,
          frequency: s.frequency as string,
          nextBillingDate: (s.next_billing_date ?? s.nextBillingDate) as string,
          status: s.status as Subscription['status'],
          priceHistory: (s.price_history ?? s.priceHistory ?? []) as { date: string; amount: number }[],
        })),
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
        categorizationRules: (categorizationRules || []).map((r: any) => ({
          id:          r.id as string,
          match_type:  r.match_type as CategorizationRule['match_type'],
          match_value: r.match_value as string,
          category:    r.category as string,
          priority:    r.priority as number,
        })),
      });

      // Upsert today's net worth snapshot for historical trending.
      try {
        const totalAssets = (assets || []).reduce((s: number, a: any) => s + ((a.value as number) || 0), 0);
        const totalDebts  = (debts  || []).reduce((s: number, d: any) => s + ((d.remaining as number) || 0), 0);
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
    } catch {
      set({ isLoading: false });
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
      storage: createJSONStorage(() => sessionStorage),
      // Persist ONLY non-sensitive UI/profile state.
      // Financial records (bills, debts, transactions, assets, incomes, etc.)
      // are re-fetched from Supabase on every authenticated session via
      // fetchData(). Keeping them out of sessionStorage means an XSS attack
      // or shared-device access cannot harvest raw financial data from storage.
      partialize: (state) => ({
        user: {
          // Persist identity fields needed for the UI shell while data loads
          id: state.user.id,
          firstName: state.user.firstName,
          lastName: state.user.lastName,
          email: state.user.email,
          avatar: state.user.avatar,
          theme: state.user.theme,
          hasCompletedOnboarding: state.user.hasCompletedOnboarding,
          isAdmin: state.user.isAdmin,
          // Omit: taxState, taxRate, phone, timezone, language (re-fetched from DB)
        },
        // Persist categories only — these are non-sensitive labels used to
        // render the UI immediately on load before fetchData() completes.
        categories: state.categories,
      }),
    }
  )
);
