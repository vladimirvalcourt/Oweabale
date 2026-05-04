import type { FinancialAlertPrefs } from '@/lib/api/services/financialAlertPrefs';
import type { NotificationPrefsRecord } from '@/lib/api/services/notificationPreferences';
import type { CategorizationRule, CategorizationExclusion } from '@/lib/api/services/categorizationRules';

export type { CategorizationRule, CategorizationExclusion };

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
  paymentDueDate?: string | null;
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
  platformTag?: string;
  notes?: string;
  plaidAccountId?: string;
}

export interface PlaidLinkedAccount {
  id: string;
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  accountType: string;
  accountSubtype: string | null;
  mask: string | null;
  subtypeSuggestedSavings: boolean;
  includeInSavings: boolean;
  lastSyncAt: string | null;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: string;
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
  isTaxWithheld: boolean;
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

export interface MileageLogEntry {
  id: string;
  tripDate: string;
  startLocation: string;
  endLocation: string;
  miles: number;
  purpose: 'business' | 'medical' | 'charity';
  platform: string;
  irsRatePerMile: number;
  deductionAmount: number;
}

export interface ClientInvoice {
  id: string;
  clientName: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  notes: string;
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
    source?: string;
    citationType?: string;
    jurisdiction?: string;
    citationNumber?: string;
    penaltyFee?: number;
    paymentUrl?: string;
    daysLeft?: number;
    debtApr?: number;
    debtMinPayment?: number;
  };
  originalFile?: {
    name: string;
    size: number;
    type: string;
    url?: string;
  };
  storagePath?: string;
  storageUrl?: string;
  source?: 'desktop';
}

export interface CreditFactor {
  id: string;
  name: string;
  impact: 'high' | 'medium' | 'low';
  status: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
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
  item: string;
  amount: number;
  status: 'todo' | 'sent' | 'resolved';
  bureau: string;
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

export type TabType = 'transaction' | 'obligation' | 'income' | 'citation';

export interface AppState {
  bills: Bill[];
  debts: Debt[];
  transactions: Transaction[];
  hasMoreTransactions: boolean;
  lastTransactionCursor?: string;
  assets: Asset[];
  subscriptions: Subscription[];
  goals: Goal[];
  incomes: IncomeSource[];
  budgets: Budget[];
  categories: Category[];
  citations: Citation[];
  deductions: Deduction[];
  freelanceEntries: FreelanceEntry[];
  mileageLog: MileageLogEntry[];
  clientInvoices: ClientInvoice[];
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
    taxReservePercent?: number;
    steadySalaryTarget?: number;
    financialAlertPrefs: FinancialAlertPrefs;
    phone?: string;
    timezone?: string;
    language?: string;
    notificationPrefs: NotificationPrefsRecord;
    hasCompletedOnboarding: boolean;
    isAdmin: boolean;
  };
  credit: {
    score: number;
    lastUpdated: string;
    factors: CreditFactor[];
    fixes: CreditFix[];
  };
  setTaxSettings: (state: string, rate: number) => void;
  bankConnected: boolean;
  plaidInstitutionName: string | null;
  plaidLastSyncAt: string | null;
  plaidNeedsRelink: boolean;
  plaidAccounts: PlaidLinkedAccount[];
  connectBank: () => Promise<void>;
  disconnectBank: () => Promise<void>;
  syncPlaidTransactions: (opts?: { quiet?: boolean }) => Promise<boolean>;
  updatePlaidAccountIncludeInSavings: (accountRowId: string, include: boolean) => Promise<boolean>;
  // Egress optimization: track last successful data fetch
  lastDataFetchTime?: number;
  addTransaction: (transaction: Omit<Transaction, 'id'>, opts?: { allowBudgetOverride?: boolean }) => Promise<boolean>;
  updateTransaction: (id: string, patch: Partial<Pick<Transaction, 'category' | 'platformTag' | 'name' | 'notes'>>) => Promise<boolean>;
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
  addFreelanceEntry: (entry: Omit<FreelanceEntry, 'id'>) => Promise<boolean>;
  toggleFreelanceVault: (id: string) => Promise<void>;
  deleteFreelanceEntry: (id: string) => Promise<void>;
  addMileageLogEntry: (entry: Omit<MileageLogEntry, 'id' | 'deductionAmount'> & { deductionAmount?: number }) => Promise<boolean>;
  deleteMileageLogEntry: (id: string) => Promise<void>;
  addClientInvoice: (inv: Omit<ClientInvoice, 'id'>) => Promise<boolean>;
  updateClientInvoice: (id: string, patch: Partial<ClientInvoice>) => Promise<boolean>;
  deleteClientInvoice: (id: string) => Promise<void>;
  updateUser: (user: Partial<AppState['user']>) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearLocalData: () => void;
  resetData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  addCategorizationRule: (rule: Omit<CategorizationRule, 'id'>) => Promise<void>;
  deleteCategorizationRule: (id: string) => Promise<void>;
  applyRulesToExistingTransactions: () => Promise<number>;
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
  updateCreditScore: (score: number) => Promise<void>;
  addCreditFix: (fix: Omit<CreditFix, 'id'>) => Promise<void>;
  updateCreditFix: (id: string, updates: Partial<CreditFix>) => Promise<void>;
  deleteCreditFix: (id: string) => Promise<void>;
  addPendingIngestion: (ingestion: Omit<PendingIngestion, 'id'>) => string;
  updatePendingIngestion: (id: string, updates: Partial<PendingIngestion>) => void;
  removePendingIngestion: (id: string) => void;
  commitIngestion: (id: string) => Promise<boolean>;
  fetchData: (userId?: string, options?: { background?: boolean; loadMore?: boolean; fullLoad?: boolean }) => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  /** Egress optimization: Load Phase 2 data on demand */
  loadPhase2Data: () => Promise<void>;
  isLoading: boolean;
  phase2Hydrated: boolean;
  addNotification: (note: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  isQuickAddOpen: boolean;
  quickAddTab: TabType;
  openQuickAdd: (tab?: TabType) => void;
  closeQuickAdd: () => void;
}
