import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Landmark,
  ListChecks,
  Plus,
  Receipt,
  Repeat,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppPageShell } from '@/components/layout';
import { ProWelcomeModal } from '@/components/common';
import { TransitionLink } from '@/components/common';
import { computeSafeToSpend, calcMonthlyCashFlow } from '@/lib/api/services/finance';
import { useStore, type Bill, type Citation, type Debt, type Subscription, type Transaction } from '@/store';
import { StatusBadge, StatusIcon, MetricCard, QuickActionCard, DashboardButton } from '@/components/dashboard';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PAY_LIST_SNOOZE_KEY = 'oweable_pay_list_snoozed_v1';

type PayListKind = 'bill' | 'debt' | 'subscription' | 'citation';
type PayListStatus = 'overdue' | 'today' | 'week' | 'coming' | 'unscheduled';

type PayListItem = {
  id: string;
  sourceId: string;
  kind: PayListKind;
  title: string;
  detail: string;
  amount: number;
  dueDate: Date | null;
  dueInDays: number | null;
  status: PayListStatus;
  route: string;
};

function startOfLocalDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return startOfLocalDay(date);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function daysUntil(date: Date | null, today: Date): number | null {
  if (!date) return null;
  return Math.round((startOfLocalDay(date).getTime() - today.getTime()) / MS_PER_DAY);
}

function statusForDueInDays(value: number | null): PayListStatus {
  if (value === null) return 'unscheduled';
  if (value < 0) return 'overdue';
  if (value === 0) return 'today';
  if (value <= 7) return 'week';
  return 'coming';
}

function dueLabel(item: PayListItem): string {
  if (item.dueInDays === null) return 'No due date yet';
  if (item.dueInDays < 0) return `Overdue by ${Math.abs(item.dueInDays)} day${Math.abs(item.dueInDays) === 1 ? '' : 's'}`;
  if (item.dueInDays === 0) return 'Due today';
  if (item.dueInDays === 1) return 'Due tomorrow';
  return `Due in ${item.dueInDays} days`;
}

function formatDate(date: Date | null): string {
  if (!date) return 'Set a date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function formatSignedMoney(value: number): string {
  if (value === 0) return formatMoney(0);
  const prefix = value > 0 ? '+' : '-';
  return `${prefix}${formatMoney(Math.abs(value))}`;
}

function isSameMonth(dateValue: string, today: Date): boolean {
  const parsed = parseLocalDate(dateValue);
  return !!parsed && parsed.getFullYear() === today.getFullYear() && parsed.getMonth() === today.getMonth();
}

function summarizeBankTransactions(transactions: Transaction[], today: Date) {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const bankTransactions = safeTransactions
    .filter((transaction) => !!transaction.plaidAccountId && transaction.date && typeof transaction.amount === 'number')
    .sort((a, b) => {
      const bTime = parseLocalDate(b.date)?.getTime() ?? 0;
      const aTime = parseLocalDate(a.date)?.getTime() ?? 0;
      return bTime - aTime;
    });
  const monthTransactions = bankTransactions.filter((transaction) => isSameMonth(transaction.date, today));

  const monthIncome = monthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
  const monthExpenses = monthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

  return {
    bankTransactions,
    recentBankTransactions: bankTransactions.slice(0, 5),
    monthTransactionCount: monthTransactions.length,
    monthIncome,
    monthExpenses,
    monthNet: monthIncome - monthExpenses,
  };
}

function readSnoozedItems(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PAY_LIST_SNOOZE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSnoozedItems(items: Record<string, number>) {
  try {
    localStorage.setItem(PAY_LIST_SNOOZE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('[PayList] Failed to persist snoozed reminders:', error);
  }
}

function buildPayListItems({
  bills,
  debts,
  subscriptions,
  citations,
  today,
}: {
  bills: Bill[];
  debts: Debt[];
  subscriptions: Subscription[];
  citations: Citation[];
  today: Date;
}): PayListItem[] {
  const billItems = bills
    .filter((bill) => bill.status !== 'paid')
    .map((bill): PayListItem => {
      const dueDate = parseLocalDate(bill.dueDate);
      const dueInDays = daysUntil(dueDate, today);
      return {
        id: `bill:${bill.id}`,
        sourceId: bill.id,
        kind: 'bill',
        title: bill.biller,
        detail: `${bill.frequency} bill`,
        amount: bill.amount,
        dueDate,
        dueInDays,
        status: statusForDueInDays(dueInDays),
        route: '/pro/bills',
      };
    });

  const debtItems = debts
    .filter((debt) => (debt.remaining || 0) > 0)
    .map((debt): PayListItem => {
      const dueDate = parseLocalDate(debt.paymentDueDate);
      const dueInDays = daysUntil(dueDate, today);
      return {
        id: `debt:${debt.id}`,
        sourceId: debt.id,
        kind: 'debt',
        title: debt.name,
        detail: debt.paymentDueDate ? `${debt.type} minimum payment` : `${debt.type} needs a due date`,
        amount: debt.minPayment || 0,
        dueDate,
        dueInDays,
        status: statusForDueInDays(dueInDays),
        route: '/pro/bills?tab=debt',
      };
    });

  const subscriptionItems = subscriptions
    .filter((subscription) => subscription.status === 'active')
    .map((subscription): PayListItem => {
      const dueDate = parseLocalDate(subscription.nextBillingDate);
      const dueInDays = daysUntil(dueDate, today);
      return {
        id: `subscription:${subscription.id}`,
        sourceId: subscription.id,
        kind: 'subscription',
        title: subscription.name,
        detail: `${subscription.frequency} subscription`,
        amount: subscription.amount,
        dueDate,
        dueInDays,
        status: statusForDueInDays(dueInDays),
        route: '/pro/subscriptions',
      };
    });

  const citationItems = citations
    .filter((citation) => citation.status === 'open')
    .map((citation): PayListItem => {
      const dueInDays = Number.isFinite(citation.daysLeft) ? citation.daysLeft : null;
      const dueDate = dueInDays === null ? null : addDays(today, dueInDays);
      return {
        id: `citation:${citation.id}`,
        sourceId: citation.id,
        kind: 'citation',
        title: citation.type || 'Ticket or fine',
        detail: citation.jurisdiction || 'Tolls, tickets & fines',
        amount: citation.amount + (citation.penaltyFee || 0),
        dueDate,
        dueInDays,
        status: statusForDueInDays(dueInDays),
        route: '/pro/bills?tab=ambush',
      };
    });

  return [...billItems, ...debtItems, ...subscriptionItems, ...citationItems].sort((a, b) => {
    if (a.status === 'unscheduled' && b.status !== 'unscheduled') return 1;
    if (b.status === 'unscheduled' && a.status !== 'unscheduled') return -1;
    const aDays = a.dueInDays ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.dueInDays ?? Number.MAX_SAFE_INTEGER;
    if (aDays !== bDays) return aDays - bDays;
    return b.amount - a.amount;
  });
}

function PayListIcon({ kind }: { kind: PayListKind }) {
  const className = 'h-4 w-4';
  if (kind === 'bill') return <Receipt className={className} aria-hidden />;
  if (kind === 'debt') return <CreditCard className={className} aria-hidden />;
  if (kind === 'subscription') return <Repeat className={className} aria-hidden />;
  return <AlertTriangle className={className} aria-hidden />;
}

function EmptyPayList({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="premium-empty-state">
      <ListChecks className="mx-auto h-8 w-8 text-content-tertiary" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold text-content-primary">Nothing urgent is tracked yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-content-secondary">
        Add bills, debt payments, subscriptions, tolls, tickets, or fines so Oweable can keep the next due date in front of you.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-content-primary px-5 py-2 text-sm font-semibold text-surface-base transition-colors hover:bg-content-secondary focus-app"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add what&apos;s due
      </button>
    </div>
  );
}

function PayListRow({
  item,
  onMarkPaid,
  onResolve,
  onSnooze,
}: {
  item: PayListItem;
  onMarkPaid: (id: string) => void;
  onResolve: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const isUrgent = item.status === 'overdue' || item.status === 'today';
  const statusTone = isUrgent ? 'urgent' : item.status === 'week' ? 'warning' : 'default';

  return (
    <li className="app-panel p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <StatusIcon
            icon={PayListIcon}
            tone={statusTone}
            iconProps={{ kind: item.kind }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-content-primary">{item.title}</p>
              <StatusBadge tone={statusTone}>{dueLabel(item)}</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-content-secondary">
              {item.detail} · {formatDate(item.dueDate)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <p className="text-lg font-mono font-semibold tabular-nums text-content-primary">{formatMoney(item.amount)}</p>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {item.kind === 'bill' && (
              <DashboardButton onClick={() => onMarkPaid(item.sourceId)} variant="primary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Mark paid
              </DashboardButton>
            )}
            {item.kind === 'citation' && (
              <DashboardButton onClick={() => onResolve(item.sourceId)} variant="primary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Resolve
              </DashboardButton>
            )}
            <TransitionLink
              to={item.route}
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-surface-border px-3 py-2 text-xs font-medium text-content-secondary transition-colors hover:bg-content-primary/[0.04] hover:text-content-primary focus-app"
            >
              Details
            </TransitionLink>
            <DashboardButton onClick={() => onSnooze(item.id)} variant="secondary">
              Snooze
            </DashboardButton>
          </div>
        </div>
      </div>
    </li>
  );
}

function PayListSection({
  title,
  description,
  items,
  onMarkPaid,
  onResolve,
  onSnooze,
}: {
  title: string;
  description: string;
  items: PayListItem[];
  onMarkPaid: (id: string) => void;
  onResolve: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
          <p className="text-xs text-content-secondary">{description}</p>
        </div>
        <span className="text-xs font-mono text-content-tertiary">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <PayListRow
            key={item.id}
            item={item}
            onMarkPaid={onMarkPaid}
            onResolve={onResolve}
            onSnooze={onSnooze}
          />
        ))}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const bills = useStore((state) => state.bills);
  const debts = useStore((state) => state.debts);
  const subscriptions = useStore((state) => state.subscriptions);
  const citations = useStore((state) => state.citations);
  const incomes = useStore((state) => state.incomes);
  const assets = useStore((state) => state.assets);
  const transactions = useStore((state) => state.transactions);
  const bankConnected = useStore((state) => state.bankConnected);
  const plaidLastSyncAt = useStore((state) => state.plaidLastSyncAt);
  const user = useStore((state) => state.user);
  const isLoading = useStore((state) => state.isLoading);
  const openQuickAdd = useStore((state) => state.openQuickAdd);
  const markBillPaid = useStore((state) => state.markBillPaid);
  const resolveCitation = useStore((state) => state.resolveCitation);
  const [today] = useState(() => startOfLocalDay());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [snoozedItems, setSnoozedItems] = useState<Record<string, number>>(() => readSnoozedItems());

  const liquidCash = useMemo(
    () => (assets || []).filter((asset) => asset?.type === 'Cash').reduce((sum, asset) => sum + (asset?.value || 0), 0),
    [assets],
  );
  const cashFlow = useMemo(
    () => calcMonthlyCashFlow(incomes || [], bills || [], debts || [], subscriptions || []),
    [incomes, bills, debts, subscriptions],
  );
  const safeToSpend = useMemo(
    () =>
      computeSafeToSpend({
        liquidCash,
        monthlySurplus: cashFlow.surplus ?? 0,
        bills: bills || [],
        incomes: incomes || [],
        subscriptions: subscriptions || [],
        debts: debts || [],
        citations: citations || [],
        scheduleBaseMs: today.getTime(),
      }),
    [liquidCash, cashFlow.surplus, bills, incomes, subscriptions, debts, citations, today],
  );

  const payListItems = useMemo(
    () => buildPayListItems({ bills: bills || [], debts: debts || [], subscriptions: subscriptions || [], citations: citations || [], today }),
    [bills, debts, subscriptions, citations, today],
  );

  const visibleItems = useMemo(() => {
    return payListItems.filter((item) => !snoozedItems[item.id] || snoozedItems[item.id] <= nowMs);
  }, [payListItems, snoozedItems, nowMs]);

  const overdueItems = visibleItems.filter((item) => item.status === 'overdue');
  const todayItems = visibleItems.filter((item) => item.status === 'today');
  const weekItems = visibleItems.filter((item) => item.status === 'week');
  const comingItems = visibleItems.filter((item) => item.status === 'coming').slice(0, 8);
  const unscheduledItems = visibleItems.filter((item) => item.status === 'unscheduled');
  const topPriority = visibleItems.find((item) => item.status !== 'unscheduled') || visibleItems[0] || null;
  const activeDebt = debts.filter((debt) => (debt.remaining || 0) > 0);
  const debtMinimumsDue = visibleItems.filter((item) => item.kind === 'debt' && item.status !== 'unscheduled');
  const openCitationCount = citations.filter((citation) => citation.status === 'open').length;
  const nextDebtTarget = [...activeDebt].sort((a, b) => (b.apr || 0) - (a.apr || 0))[0] || null;
  const totalDueThisWeek = [...overdueItems, ...todayItems, ...weekItems].reduce((sum, item) => sum + item.amount, 0);
  const bankSummary = useMemo(() => summarizeBankTransactions(transactions || [], today), [transactions, today]);
  const hasBankDashboardData = bankSummary.bankTransactions.length > 0;
  const shouldShowBankActivity = bankConnected || hasBankDashboardData;
  const syncLabel = plaidLastSyncAt ? new Date(plaidLastSyncAt).toLocaleString() : null;

  const handleSnooze = useCallback((id: string) => {
    const next = { ...snoozedItems, [id]: Date.now() + MS_PER_DAY };
    setNowMs(Date.now());
    setSnoozedItems(next);
    writeSnoozedItems(next);
    toast.success('Reminder snoozed until tomorrow');
  }, [snoozedItems]);

  const handleMarkPaid = useCallback(async (id: string) => {
    await markBillPaid(id);
    toast.success('Bill marked paid and moved forward');
  }, [markBillPaid]);

  const handleResolveCitation = useCallback(async (id: string) => {
    const ok = await resolveCitation(id);
    if (ok) toast.success('Ticket, toll, or fine resolved');
  }, [resolveCitation]);

  if (isLoading) {
    return (
      <AppPageShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded-xl bg-surface-border" />
          <div className="h-44 rounded-xl border border-surface-border" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 rounded-xl border border-surface-border" />
            ))}
          </div>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <ProWelcomeModal />
      <div className="space-y-8 pb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-widest text-content-tertiary">Pay List</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-content-primary sm:text-3xl">
              {user?.firstName ? `${user.firstName}, here is what needs paying next` : 'Here is what needs paying next'}
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Bills, debt minimums, subscriptions, tolls, tickets, and fines sorted by urgency so nothing sneaks up.
            </p>
          </div>
        </header>

        <section aria-label="Quick add choices" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Bill', detail: 'Rent, utility, loan notice', icon: Receipt, action: () => openQuickAdd('obligation') },
            { label: 'Debt payment', detail: 'Minimum due or balance', icon: CreditCard, action: () => openQuickAdd('obligation') },
            { label: 'Subscription', detail: 'Renewal you may forget', icon: Repeat, to: '/pro/subscriptions' },
            { label: 'Toll / ticket / fine', detail: 'Citation, parking, penalty', icon: AlertTriangle, action: () => openQuickAdd('citation') },
          ].map((choice) => {
            const Icon = choice.icon;
            if ('to' in choice && choice.to) {
              return (
                <QuickActionCard
                  key={choice.label}
                  icon={Icon}
                  label={choice.label}
                  description={choice.detail}
                  href={choice.to}
                />
              );
            }
            return (
              <QuickActionCard
                key={choice.label}
                icon={Icon}
                label={choice.label}
                description={choice.detail}
                onClick={choice.action}
              />
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
          <div className="app-panel p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-content-tertiary">
                  <Bell className="h-4 w-4" aria-hidden />
                  Top priority
                </div>
                {topPriority ? (
                  <>
                    <h2 className="mt-3 text-2xl font-semibold text-content-primary">{topPriority.title}</h2>
                    <p className="mt-1 text-sm text-content-secondary">
                      {dueLabel(topPriority)} · {topPriority.detail} · {formatDate(topPriority.dueDate)}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-3 text-2xl font-semibold text-content-primary">No due dates are pressing right now</h2>
                    <p className="mt-1 text-sm text-content-secondary">Add anything you might forget so this stays useful.</p>
                  </>
                )}
              </div>
              <div className="border border-surface-border bg-surface-base p-4 lg:min-w-56">
                <p className="text-xs font-mono uppercase tracking-widest text-content-tertiary">Due this week</p>
                <p className="mt-2 text-3xl font-mono font-semibold tabular-nums text-content-primary">{formatMoney(totalDueThisWeek)}</p>
                <p className="mt-1 text-xs text-content-secondary">
                  {overdueItems.length + todayItems.length + weekItems.length} item{overdueItems.length + todayItems.length + weekItems.length === 1 ? '' : 's'} need attention.
                </p>
              </div>
            </div>
            {topPriority && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {topPriority.kind === 'bill' && (
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(topPriority.sourceId)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 border border-content-primary px-4 py-2 text-sm font-semibold text-content-primary focus-app"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Mark paid
                  </button>
                )}
                {topPriority.kind === 'citation' && (
                  <button
                    type="button"
                    onClick={() => handleResolveCitation(topPriority.sourceId)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 border border-content-primary px-4 py-2 text-sm font-semibold text-content-primary focus-app"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Resolve now
                  </button>
                )}
                <TransitionLink
                  to={topPriority.route}
                  className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-border px-4 py-2 text-sm font-medium text-content-secondary focus-app"
                >
                  View details
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </TransitionLink>
                <button
                  type="button"
                  onClick={() => handleSnooze(topPriority.id)}
                  className="inline-flex min-h-10 items-center justify-center border border-surface-border px-4 py-2 text-sm font-medium text-content-secondary focus-app"
                >
                  Snooze
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-1">
            <MetricCard
              icon={Wallet}
              label="Monthly cash flow"
              value={formatMoney(cashFlow.surplus ?? 0)}
              sublabel={hasBankDashboardData ? `${formatSignedMoney(bankSummary.monthNet)} bank net this month` : undefined}
              href="/pro/dashboard#safe-spend"
            />
            <MetricCard
              icon={TrendingUp}
              label="Bank income"
              value={formatMoney(bankSummary.monthIncome)}
              sublabel={`${bankSummary.monthTransactionCount} bank transaction${bankSummary.monthTransactionCount === 1 ? '' : 's'} this month`}
              href="/pro/transactions"
            />
            <MetricCard
              icon={TrendingDown}
              label="Bank spending"
              value={formatMoney(bankSummary.monthExpenses)}
              sublabel={syncLabel ? `Synced ${syncLabel}` : undefined}
              href="/pro/transactions"
            />
            <MetricCard
              icon={Landmark}
              label="Debt mins"
              value={debtMinimumsDue.length}
              href="/pro/bills?tab=debt"
            />
          </div>
        </section>

        {shouldShowBankActivity && (
          <section className="app-panel p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-content-tertiary">
                  <Landmark className="h-4 w-4" aria-hidden />
                  Linked bank activity
                </p>
                <h2 className="mt-2 text-lg font-semibold text-content-primary">
                  {hasBankDashboardData ? 'Latest Plaid transactions are feeding the dashboard' : 'Bank connected, waiting for transactions'}
                </h2>
                <p className="mt-1 text-sm text-content-secondary">
                  {hasBankDashboardData
                    ? `${bankSummary.bankTransactions.length} linked-bank transaction${bankSummary.bankTransactions.length === 1 ? '' : 's'} loaded from Plaid.`
                    : 'Plaid is connected, but no imported transactions are visible in the dashboard store yet.'}
                </p>
              </div>
              <TransitionLink
                to="/pro/transactions"
                className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-border px-4 py-2 text-sm font-medium text-content-secondary focus-app"
              >
                View transactions
                <ArrowRight className="h-4 w-4" aria-hidden />
              </TransitionLink>
            </div>

            {hasBankDashboardData ? (
              <ul className="mt-4 divide-y divide-surface-border">
                {Array.isArray(bankSummary.recentBankTransactions) && bankSummary.recentBankTransactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content-primary">{transaction.name || 'Transaction'}</p>
                      <p className="mt-1 text-xs text-content-secondary">
                        {formatDate(parseLocalDate(transaction.date))} · {transaction.category || 'Uncategorized'}
                      </p>
                    </div>
                    <p className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${transaction.type === 'income' ? 'text-brand-profit' : 'text-content-primary'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount || 0)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 border border-surface-border bg-surface-base p-4">
                <p className="text-sm text-content-secondary">
                  Use Sync now in Settings if this stays empty after Plaid finishes loading transaction history.
                </p>
              </div>
            )}
          </section>
        )}

        {visibleItems.length === 0 ? (
          <EmptyPayList onAdd={() => openQuickAdd('obligation')} />
        ) : (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-8">
              <PayListSection
                title="Overdue"
                description="Handle these first so fees, shutoffs, or penalties do not pile up."
                items={overdueItems}
                onMarkPaid={handleMarkPaid}
                onResolve={handleResolveCitation}
                onSnooze={handleSnooze}
              />
              <PayListSection
                title="Due today"
                description="The short list for right now."
                items={todayItems}
                onMarkPaid={handleMarkPaid}
                onResolve={handleResolveCitation}
                onSnooze={handleSnooze}
              />
              <PayListSection
                title="Due this week"
                description="Payments to plan before the week gets away from you."
                items={weekItems}
                onMarkPaid={handleMarkPaid}
                onResolve={handleResolveCitation}
                onSnooze={handleSnooze}
              />
              <PayListSection
                title="Coming up"
                description="Not urgent yet, but visible enough to avoid surprises."
                items={comingItems}
                onMarkPaid={handleMarkPaid}
                onResolve={handleResolveCitation}
                onSnooze={handleSnooze}
              />
            </div>

            <aside className="space-y-4">
              <section id="safe-spend" className="app-panel p-4">
                <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-content-tertiary">
                  <Wallet className="h-4 w-4" aria-hidden />
                  Spending comfort
                </p>
                <p className="mt-3 text-3xl font-mono font-semibold tabular-nums text-content-primary">
                  {formatMoney(Math.max(0, safeToSpend.dailySafeToSpend))}
                  <span className="ml-1 text-sm font-sans font-medium text-content-tertiary">/ day</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-content-secondary">
                  Estimate through {safeToSpend.windowEndLabel}, after tracked bills, subscriptions, debt minimums, and open fines.
                </p>
              </section>

              <section className="app-panel p-4">
                <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-content-tertiary">
                  <CreditCard className="h-4 w-4" aria-hidden />
                  Debt minimums first
                </p>
                {nextDebtTarget ? (
                  <>
                    <h2 className="mt-3 text-sm font-semibold text-content-primary">{nextDebtTarget.name}</h2>
                    <p className="mt-1 text-xs text-content-secondary">
                      Highest APR tracked at {(nextDebtTarget.apr || 0).toFixed(2)}%. Oweable keeps the minimum visible first; extra payoff comes after urgent dues are handled.
                    </p>
                    <TransitionLink
                      to="/pro/bills?tab=debt"
                      className="mt-4 inline-flex min-h-9 items-center justify-center border border-surface-border px-3 py-1.5 text-xs font-medium text-content-secondary focus-app"
                    >
                      Review debt
                    </TransitionLink>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-content-secondary">No active debt is tracked. Add one when there is a payment you cannot miss.</p>
                )}
              </section>

              {unscheduledItems.length > 0 && (
                <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-700 dark:text-amber-200">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    Missing due dates
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-content-secondary">
                    {unscheduledItems.length} debt account{unscheduledItems.length === 1 ? '' : 's'} need a due date so reminders can work.
                  </p>
                  <TransitionLink
                    to="/pro/bills?tab=debt"
                    className="mt-4 inline-flex min-h-9 items-center justify-center border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-200 focus-app"
                  >
                    Add due dates
                  </TransitionLink>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
    </AppPageShell>
  );
}
