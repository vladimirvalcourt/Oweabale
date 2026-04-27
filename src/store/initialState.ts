import {
  DEFAULT_FINANCIAL_ALERT_PREFS,
} from '../lib/api/services/financialAlertPrefs';
import {
  DEFAULT_NOTIF_PREFS,
  NOTIF_PREFS_STORAGE_KEY,
  loadNotifPrefs,
} from '../pages/settings/constants';
import { mergeNotificationPrefsFromSources, normalizeNotificationPrefsRecord } from '../lib/api/services/notificationPreferences';
import type { AppState } from './types';

export const initialData: Pick<
  AppState,
  | 'bills'
  | 'debts'
  | 'transactions'
  | 'assets'
  | 'subscriptions'
  | 'goals'
  | 'incomes'
  | 'budgets'
  | 'categories'
  | 'citations'
  | 'deductions'
  | 'freelanceEntries'
  | 'mileageLog'
  | 'clientInvoices'
  | 'user'
  | 'bankConnected'
  | 'plaidInstitutionName'
  | 'plaidLastSyncAt'
  | 'plaidNeedsRelink'
  | 'plaidAccounts'
  | 'lastBudgetGuardrail'
  | 'pendingIngestions'
  | 'notifications'
  | 'categorizationRules'
  | 'categorizationExclusions'
  | 'adminBroadcasts'
  | 'platformSettings'
  | 'lastRuleApplication'
  | 'lastAutoCategorization'
  | 'netWorthSnapshots'
  | 'credit'
  | 'investmentAccounts'
  | 'insurancePolicies'
  | 'currentHousehold'
  | 'householdMembers'
  | 'userRole'
> = {
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
  mileageLog: [],
  clientInvoices: [],
  user: {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    avatar: '',
    theme: 'Dark',
    taxState: '',
    taxRate: 0,
    taxReservePercent: 30,
    steadySalaryTarget: 0,
    financialAlertPrefs: DEFAULT_FINANCIAL_ALERT_PREFS,
    phone: '',
    timezone: 'America/New_York',
    language: 'English (US)',
    notificationPrefs: mergeNotificationPrefsFromSources({}, loadNotifPrefs()),
    hasCompletedOnboarding: false,
    isAdmin: false,
  },
  bankConnected: false,
  plaidInstitutionName: null,
  plaidLastSyncAt: null,
  plaidNeedsRelink: false,
  plaidAccounts: [],
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
  currentHousehold: null,
  householdMembers: [],
  userRole: null,
};

export { DEFAULT_NOTIF_PREFS, NOTIF_PREFS_STORAGE_KEY, normalizeNotificationPrefsRecord };
