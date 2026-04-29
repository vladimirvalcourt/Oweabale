/**
 * FreeDashboard
 *
 * Simplified dashboard for Free (Tracker) plan users.
 * Shows only the billing/debt-oriented widgets — no income, taxes,
 * net worth, cash flow, or spending charts (those are Pro-only).
 *
 * Includes a persistent Upgrade banner at the bottom.
 */
import React, { useMemo, useState } from 'react';
import { TransitionLink } from '../components/common';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useSEO } from '../hooks';
import { Receipt, Clock, AlertCircle, Landmark, Plus, Star, Loader2, ArrowRight } from 'lucide-react';
import { createStripeCheckoutSession } from '../lib/api/stripe';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
      <p className="text-xs font-mono uppercase tracking-wide text-content-tertiary">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold tracking-tight', accent ?? 'text-content-primary')}>{value}</p>
      {sub && <p className="mt-1 text-xs text-content-secondary">{sub}</p>}
    </div>
  );
}

export default function FreeDashboard() {
  useSEO({
    title: 'Dashboard — Oweable',
    description: 'Your bill tracker at a glance.',
    canonical: `${window.location.origin}/free/dashboard`,
  });

  const { bills, debts, user, citations, subscriptions } = useStore(
    useShallow(s => ({
      bills:         s.bills,
      debts:         s.debts,
      user:          s.user,
      citations:     s.citations,
      subscriptions: s.subscriptions,
    }))
  );

  const [isUpgrading, setIsUpgrading] = useState(false);

  const monthlyPrice = (() => {
    const v = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
    return Number.isFinite(v) && v > 0 ? v : 10.99;
  })();

  const handleUpgrade = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    const result = await createStripeCheckoutSession('pro_monthly');
    if ('error' in result) { toast.error(result.error); setIsUpgrading(false); return; }
    window.location.href = result.checkoutUrl;
  };

  const firstName = user.firstName?.trim() || 'there';

  // ── Due soon (next 7 days) ──────────────────────────────────────
  const dueSoon = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysUntil = (iso: string) => {
      const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
      d.setHours(0, 0, 0, 0);
      return Math.round((d.getTime() - today.getTime()) / 86400000);
    };
    const toLabel = (iso: string) =>
      new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const items: { name: string; amount: number; daysLeft: number; dueLabel: string; type: 'bill' | 'sub' }[] = [];

    bills.forEach(b => {
      if (!b?.dueDate || b.status === 'paid') return;
      const d = daysUntil(b.dueDate);
      if (d >= 0 && d <= 7) items.push({ name: b.biller, amount: b.amount, daysLeft: d, dueLabel: toLabel(b.dueDate), type: 'bill' });
    });
    subscriptions.forEach(s => {
      if (!s?.nextBillingDate || s.status !== 'active') return;
      const d = daysUntil(s.nextBillingDate);
      if (d >= 0 && d <= 7) items.push({ name: s.name, amount: s.amount, daysLeft: d, dueLabel: toLabel(s.nextBillingDate), type: 'sub' });
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [bills, subscriptions]);

  // ── Debt summary ───────────────────────────────────────────────
  const debtSummary = useMemo(() => ({
    count:    debts.length,
    total:    debts.reduce((s, d) => s + (d.remaining ?? 0), 0),
  }), [debts]);

  // ── Urgent citations ───────────────────────────────────────────
  const urgentCitations = useMemo(() =>
    citations.filter(c => c.status === 'open' && c.daysLeft <= 14).slice(0, 3),
    [citations]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">
            Hey {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-content-secondary">Here's what's coming up.</p>
        </div>
        <TransitionLink
          to="/free/bills"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-cta text-surface-base hover:bg-brand-cta-hover px-5 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Add bill
        </TransitionLink>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Bills due soon"
          value={`${dueSoon.length}`}
          sub={dueSoon.length === 0 ? 'All clear ✓' : `Next 7 days`}
          accent={dueSoon.length > 0 ? 'text-amber-400' : undefined}
        />
        <SummaryCard
          label="Active debts"
          value={`${debtSummary.count}`}
          sub={debtSummary.count > 0 ? `$${debtSummary.total.toLocaleString()} remaining` : 'Debt-free!'}
        />
        <SummaryCard
          label="Open tickets"
          value={`${urgentCitations.length}`}
          sub={urgentCitations.length > 0 ? 'Due soon' : 'None flagged'}
          accent={urgentCitations.length > 0 ? 'text-red-400' : undefined}
        />
        <SummaryCard
          label="Active bills"
          value={`${bills.filter(b => b.status !== 'paid').length}`}
          sub="Unpaid this cycle"
        />
      </div>

      {/* Due soon list */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-content-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" aria-hidden />
            Due in the next 7 days
          </h2>
          <TransitionLink to="/free/bills#due-soon" className="text-xs text-content-secondary hover:text-content-primary transition-colors">
            View all →
          </TransitionLink>
        </div>
        {dueSoon.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-raised p-6 text-center">
            <p className="text-sm text-content-secondary">Nothing due in the next 7 days. You're all caught up ✓</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dueSoon.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', item.type === 'sub' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400')}>
                    {item.type === 'sub' ? <Receipt className="w-4 h-4" aria-hidden /> : <Clock className="w-4 h-4" aria-hidden />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-content-primary">{item.name}</p>
                    <p className="text-xs text-content-secondary">{item.daysLeft === 0 ? 'Due today' : `Due ${item.dueLabel}`}</p>
                  </div>
                </div>
                <p className={cn('text-sm font-semibold tabular-nums', item.daysLeft === 0 ? 'text-red-400' : 'text-content-primary')}>
                  ${item.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Debt summary */}
      {debtSummary.count > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-content-primary flex items-center gap-2">
              <Landmark className="w-4 h-4 text-content-secondary" aria-hidden />
              Total debt
            </h2>
            <TransitionLink to="/free/bills?tab=debt" className="text-xs text-content-secondary hover:text-content-primary transition-colors">
              View all →
            </TransitionLink>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-raised px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-content-primary">${debtSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-content-secondary mt-1">{debtSummary.count} {debtSummary.count === 1 ? 'account' : 'accounts'}</p>
            </div>
            <TransitionLink
              to="/pricing"
              className="group inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
            >
              Get payoff plan <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden />
            </TransitionLink>
          </div>
        </section>
      )}

      {/* Urgent tickets */}
      {urgentCitations.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-content-primary flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" aria-hidden />
              Urgent tickets &amp; fines
            </h2>
            <TransitionLink to="/free/bills?tab=ambush" className="text-xs text-content-secondary hover:text-content-primary transition-colors">
              View all →
            </TransitionLink>
          </div>
          <div className="space-y-2">
            {urgentCitations.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-content-primary">{c.citationNumber || c.type || 'Ticket'}</p>
                  <p className="text-xs text-red-400">{c.daysLeft === 0 ? 'Due today' : `${c.daysLeft} days left`}</p>
                </div>
                <p className="text-sm font-semibold text-red-400 tabular-nums">${(c.amount ?? 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Upgrade banner ───────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-400" aria-hidden />
              <p className="text-sm font-semibold text-amber-300">Start Full Suite</p>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed">
              Get more help with debt payoff, spending guardrails, income, taxes, net worth, and the bigger money picture when the Pay List is not enough.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400 px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
              {isUpgrading ? 'Getting things ready...' : `Start Full Suite — $${monthlyPrice.toFixed(2)}/mo`}
            </button>
            <TransitionLink to="/pricing" className="text-center text-xs text-content-tertiary hover:text-content-secondary transition-colors">
              See what's included →
            </TransitionLink>
          </div>
        </div>
      </div>
    </div>
  );
}
