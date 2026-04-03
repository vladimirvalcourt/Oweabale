import { create } from 'zustand';

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
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  status: 'active' | 'paused' | 'cancelled';
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
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  addBill: (bill: Omit<Bill, 'id'>) => void;
  editBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  editDebt: (id: string, debt: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addDebtPayment: (id: string, amount: number) => void;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  editAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addSubscription: (subscription: Omit<Subscription, 'id'>) => void;
  editSubscription: (id: string, subscription: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  editGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addGoalProgress: (id: string, amount: number) => void;
  addIncome: (income: Omit<IncomeSource, 'id'>) => void;
  editIncome: (id: string, income: Partial<IncomeSource>) => void;
  deleteIncome: (id: string) => void;
  recordIncomeDeposit: (id: string, amount?: number) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  editBudget: (id: string, budget: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  editCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  updateUser: (user: Partial<AppState['user']>) => void;
  deleteAccount: () => void;
  seedData: () => void;
}

const initialData = {
  bills: [
    { id: '1', biller: 'City Electric & Grid', amount: 142.50, category: 'Utilities', dueDate: '2026-04-12', frequency: 'Monthly', status: 'overdue' as const, autoPay: false },
    { id: '2', biller: 'Monthly Mortgage', amount: 1850.00, category: 'Housing', dueDate: '2026-04-28', frequency: 'Monthly', status: 'paid' as const, autoPay: true },
    { id: '3', biller: 'Fiber Internet Pro', amount: 89.99, category: 'Subscriptions', dueDate: '2026-05-04', frequency: 'Monthly', status: 'upcoming' as const, autoPay: false },
    { id: '4', biller: 'Auto Insurance', amount: 412.00, category: 'Insurance', dueDate: '2026-05-15', frequency: 'Quarterly', status: 'upcoming' as const, autoPay: true },
  ],
  debts: [
    { id: '1', name: 'Chase Sapphire Reserve', type: 'Credit Card', apr: 24.99, remaining: 4250.00, minPayment: 125.00, paid: 3500.00 },
    { id: '2', name: 'Honda Civic Loan', type: 'Auto Loan', apr: 4.5, remaining: 12400.00, minPayment: 350.00, paid: 8600.00 },
    { id: '3', name: 'Federal Student Loan', type: 'Education', apr: 5.8, remaining: 26200.00, minPayment: 280.00, paid: 4500.00 },
  ],
  transactions: [
    { id: '1', name: 'Rent Payment', category: 'Housing', date: '2026-03-28', amount: 1800.00, type: 'expense' as const },
    { id: '2', name: 'City Electric', category: 'Utilities', date: '2026-03-24', amount: 142.50, type: 'expense' as const },
    { id: '3', name: 'Salary Deposit', category: 'Income', date: '2026-03-15', amount: 4200.00, type: 'income' as const },
  ],
  assets: [
    { id: '1', name: 'Chase Checking', value: 5400.00, type: 'Cash' },
    { id: '2', name: 'Vanguard 401k', value: 85000.00, type: 'Investment' },
    { id: '3', name: 'Primary Residence', value: 450000.00, type: 'Real Estate' },
  ],
  subscriptions: [
    { id: '1', name: 'Netflix Premium', amount: 22.99, frequency: 'Monthly', nextBillingDate: '2026-04-15', status: 'active' as const },
    { id: '2', name: 'Spotify Duo', amount: 14.99, frequency: 'Monthly', nextBillingDate: '2026-04-18', status: 'active' as const },
    { id: '3', name: 'Amazon Prime', amount: 139.00, frequency: 'Yearly', nextBillingDate: '2026-08-10', status: 'active' as const },
  ],
  goals: [
    { id: '1', name: 'Emergency Fund', targetAmount: 15000, currentAmount: 8500, deadline: '2026-12-31', type: 'emergency' as const, color: '#28a745' },
    { id: '2', name: 'Pay off Chase Card', targetAmount: 4250, currentAmount: 1200, deadline: '2026-08-01', type: 'debt' as const, color: '#dc3545' },
    { id: '3', name: 'Europe Trip', targetAmount: 5000, currentAmount: 1500, deadline: '2027-05-01', type: 'savings' as const, color: '#007bff' },
  ],
  incomes: [
    { id: '1', name: 'Tech Corp Salary', amount: 4200.00, frequency: 'Bi-weekly' as const, category: 'Salary', nextDate: '2026-04-15', status: 'active' as const },
    { id: '2', name: 'Freelance Design', amount: 850.00, frequency: 'Monthly' as const, category: 'Freelance', nextDate: '2026-04-20', status: 'active' as const },
    { id: '3', name: 'Dividend Yield', amount: 125.00, frequency: 'Quarterly' as const, category: 'Investments', nextDate: '2026-06-01', status: 'active' as const },
  ],
  budgets: [
    { id: '1', category: 'Housing', amount: 2000, period: 'Monthly' as const },
    { id: '2', category: 'Food & Dining', amount: 600, period: 'Monthly' as const },
    { id: '3', category: 'Utilities', amount: 300, period: 'Monthly' as const },
    { id: '4', category: 'Entertainment', amount: 150, period: 'Monthly' as const },
  ],
  categories: [
    { id: '1', name: 'Housing', color: '#6f42c1', type: 'expense' as const },
    { id: '2', name: 'Utilities', color: '#17a2b8', type: 'expense' as const },
    { id: '3', name: 'Food & Dining', color: '#fd7e14', type: 'expense' as const },
    { id: '4', name: 'Income', color: '#28a745', type: 'income' as const },
  ],
  user: {
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex.morgan@example.com',
  },
};

export const useStore = create<AppState>((set) => ({
  ...initialData,
  addBill: (bill) => set((state) => ({ bills: [...state.bills, { ...bill, id: Math.random().toString(36).substr(2, 9) }] })),
  editBill: (id, updatedBill) => set((state) => ({
    bills: state.bills.map((b) => b.id === id ? { ...b, ...updatedBill } : b)
  })),
  deleteBill: (id) => set((state) => ({ bills: state.bills.filter((b) => b.id !== id) })),
  markBillPaid: (id) => set((state) => {
    const bill = state.bills.find(b => b.id === id);
    if (!bill) return state;
    
    // Also add a transaction when a bill is paid
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      name: bill.biller,
      category: bill.category,
      date: new Date().toISOString().split('T')[0],
      amount: bill.amount,
      type: 'expense'
    };
    
    return {
      bills: state.bills.map((b) => b.id === id ? { ...b, status: 'paid' } : b),
      transactions: [newTransaction, ...state.transactions].slice(0, 50) // Keep last 50
    };
  }),
  addDebt: (debt) => set((state) => ({ debts: [...state.debts, { ...debt, id: Math.random().toString(36).substr(2, 9) }] })),
  editDebt: (id, updatedDebt) => set((state) => ({
    debts: state.debts.map((d) => d.id === id ? { ...d, ...updatedDebt } : d)
  })),
  deleteDebt: (id) => set((state) => ({ debts: state.debts.filter((d) => d.id !== id) })),
  addDebtPayment: (id, amount) => set((state) => {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return state;
    
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Payment: ${debt.name}`,
      category: 'Debt Repayment',
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      type: 'expense'
    };
    
    return {
      debts: state.debts.map((d) => d.id === id ? { 
        ...d, 
        remaining: Math.max(0, d.remaining - amount),
        paid: d.paid + amount
      } : d),
      transactions: [newTransaction, ...state.transactions].slice(0, 50)
    };
  }),
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, { ...asset, id: Math.random().toString(36).substr(2, 9) }] })),
  editAsset: (id, updatedAsset) => set((state) => ({
    assets: state.assets.map((a) => a.id === id ? { ...a, ...updatedAsset } : a)
  })),
  deleteAsset: (id) => set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),
  addSubscription: (subscription) => set((state) => ({ subscriptions: [...state.subscriptions, { ...subscription, id: Math.random().toString(36).substr(2, 9) }] })),
  editSubscription: (id, updatedSubscription) => set((state) => ({
    subscriptions: state.subscriptions.map((s) => s.id === id ? { ...s, ...updatedSubscription } : s)
  })),
  deleteSubscription: (id) => set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) })),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, { ...goal, id: Math.random().toString(36).substr(2, 9) }] })),
  editGoal: (id, updatedGoal) => set((state) => ({
    goals: state.goals.map((g) => g.id === id ? { ...g, ...updatedGoal } : g)
  })),
  deleteGoal: (id) => set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),
  addGoalProgress: (id, amount) => set((state) => ({
    goals: state.goals.map((g) => g.id === id ? { ...g, currentAmount: Math.max(0, Math.min(g.targetAmount, g.currentAmount + amount)) } : g)
  })),
  addIncome: (income) => set((state) => ({ incomes: [...state.incomes, { ...income, id: Math.random().toString(36).substr(2, 9) }] })),
  editIncome: (id, updatedIncome) => set((state) => ({
    incomes: state.incomes.map((i) => i.id === id ? { ...i, ...updatedIncome } : i)
  })),
  deleteIncome: (id) => set((state) => ({ incomes: state.incomes.filter((i) => i.id !== id) })),
  recordIncomeDeposit: (id, amount) => set((state) => {
    const income = state.incomes.find(i => i.id === id);
    if (!income) return state;
    
    const depositAmount = amount || income.amount;
    
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Deposit: ${income.name}`,
      category: income.category,
      date: new Date().toISOString().split('T')[0],
      amount: depositAmount,
      type: 'income'
    };
    
    return {
      transactions: [newTransaction, ...state.transactions].slice(0, 50)
    };
  }),
  addBudget: (budget) => set((state) => ({ budgets: [...state.budgets, { ...budget, id: Math.random().toString(36).substr(2, 9) }] })),
  editBudget: (id, updatedBudget) => set((state) => ({
    budgets: state.budgets.map((b) => b.id === id ? { ...b, ...updatedBudget } : b)
  })),
  deleteBudget: (id) => set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) })),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, { ...category, id: Math.random().toString(36).substr(2, 9) }] })),
  editCategory: (id, updatedCategory) => set((state) => ({
    categories: state.categories.map((c) => c.id === id ? { ...c, ...updatedCategory } : c)
  })),
  deleteCategory: (id) => set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
  updateUser: (user) => set((state) => ({ user: { ...state.user, ...user } })),
  deleteAccount: () => set({ bills: [], debts: [], transactions: [], assets: [], subscriptions: [], goals: [], incomes: [], budgets: [], categories: [], user: { firstName: '', lastName: '', email: '' } }),
  seedData: () => set(initialData),
}));
