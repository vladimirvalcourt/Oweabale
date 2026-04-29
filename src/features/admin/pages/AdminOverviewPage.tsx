import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Database,
  FileText,
  Gavel,
  GitBranch,
  Mail,
  Radio,
  Scale,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminPanel, AdminStatusBadge } from '../shared/AdminUI';

type FunnelStep = {
  label: string;
  description: string;
  count: number;
  pct: number;
};

type OnboardingMetrics = {
  total_signups: number;
  completed_profile: number;
  linked_bank: number;
  added_first_bill: number;
  set_first_budget: number;
  set_first_goal: number;
  completed_onboarding: number;
};

const opsModules = [
  { group: 'Users', title: 'Case files', description: 'Investigate one account across billing, access, support, Plaid, and compliance.', icon: Search, href: '/admin/user', tone: 'info' as const },
  { group: 'Users', title: 'Sessions', description: 'Review device context and revoke sessions for account security incidents.', icon: Activity, href: '/admin/sessions', tone: 'warn' as const },
  { group: 'Data', title: 'Data explorer', description: 'Read operational tables first, then make scoped edits through controlled panels.', icon: Database, href: '/admin/data', tone: 'default' as const },
  { group: 'Data', title: 'Audit log', description: 'Trace admin and system actions with actor, record, and time context.', icon: ShieldAlert, href: '/admin/audit-logs', tone: 'danger' as const },
  { group: 'Governance', title: 'Moderation', description: 'Work reported content as a queue with review states and notes.', icon: Gavel, href: '/admin/moderation', tone: 'warn' as const },
  { group: 'Governance', title: 'Compliance', description: 'Monitor KYC, AML, sanctions, and high-risk user review queues.', icon: Scale, href: '/admin/compliance', tone: 'danger' as const },
  { group: 'Monitor', title: 'Telemetry', description: 'Watch Plaid, Stripe webhook cadence, and admin edge traffic.', icon: Radio, href: '/admin/telemetry', tone: 'good' as const },
  { group: 'Monitor', title: 'Reports', description: 'Export operational reports with clearly marked estimated metrics.', icon: FileText, href: '/admin/reports', tone: 'default' as const },
  { group: 'Comms', title: 'Campaigns', description: 'Compose governed broadcasts with preview and confirmation steps.', icon: Mail, href: '/admin/email-blast', tone: 'info' as const },
];

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview', 'onboarding-funnel'],
    queryFn: async (): Promise<OnboardingMetrics> => {
      const [signupsRes, onboardedRes, plaidRes, billRes, budgetRes, goalRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('has_completed_onboarding', true),
        supabase.from('plaid_items').select('user_id'),
        supabase.from('bills').select('user_id'),
        supabase.from('budgets').select('user_id'),
        supabase.from('goals').select('user_id'),
      ]);

      const totalSignups = signupsRes.count ?? 0;
      const completedOnboarding = onboardedRes.count ?? 0;
      const withBank = new Set((plaidRes.data ?? []).map((r) => r.user_id)).size;
      const withBill = new Set((billRes.data ?? []).map((r) => r.user_id)).size;
      const withBudget = new Set((budgetRes.data ?? []).map((r) => r.user_id)).size;
      const withGoal = new Set((goalRes.data ?? []).map((r) => r.user_id)).size;

      return {
        total_signups: totalSignups,
        completed_profile: completedOnboarding,
        linked_bank: withBank,
        added_first_bill: withBill,
        set_first_budget: withBudget,
        set_first_goal: withGoal,
        completed_onboarding: completedOnboarding,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const total = data?.total_signups || 1;
  const steps: FunnelStep[] = data
    ? [
      { label: 'Signed up', description: 'Created an account', count: data.total_signups, pct: 100 },
      { label: 'Linked bank', description: 'Connected Plaid account', count: data.linked_bank, pct: Math.round((data.linked_bank / total) * 100) },
      { label: 'Added a bill', description: 'Entered first bill', count: data.added_first_bill, pct: Math.round((data.added_first_bill / total) * 100) },
      { label: 'Set a budget', description: 'Created first budget', count: data.set_first_budget, pct: Math.round((data.set_first_budget / total) * 100) },
      { label: 'Set a goal', description: 'Created first goal', count: data.set_first_goal, pct: Math.round((data.set_first_goal / total) * 100) },
      { label: 'Completed onboarding', description: 'Finished setup', count: data.completed_onboarding, pct: Math.round((data.completed_onboarding / total) * 100) },
    ]
    : [];

  const biggestDrop = steps.length >= 2
    ? steps.reduce((best, step, i) => {
      if (i === 0) return best;
      const drop = steps[i - 1].pct - step.pct;
      return drop > best.drop ? { drop, step: step.label } : best;
    }, { drop: 0, step: '' })
    : null;
  const completionRate = data && data.total_signups > 0 ? Math.round((data.completed_onboarding / data.total_signups) * 100) : 0;

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Monitor"
        title="Ops home"
        description="A command surface for account investigation, health checks, governance queues, and controlled admin actions."
        metrics={[
          { label: 'Users', value: data?.total_signups?.toLocaleString() ?? '—' },
          { label: 'Onboarding', value: `${completionRate}%`, tone: completionRate >= 50 ? 'good' : 'warn' },
          { label: 'Largest drop', value: biggestDrop?.drop ? `${biggestDrop.drop}%` : '—', tone: biggestDrop?.drop ? 'warn' : 'default' },
          { label: 'Refresh', value: '120s' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel
          title="Attention queue"
          description="Current operational signals from existing product data. Drill into the source module before taking action."
        >
          {isLoading ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-28 animate-pulse bg-surface-elevated" />
              ))}
            </div>
          ) : error ? (
            <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load ops metrics.</p>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <Link to="/admin/user" className="rounded-xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-content-primary">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-content-primary">User lookup</p>
                    <p className="mt-1 text-xs leading-5 text-content-tertiary">Start with a user id or email, then move through billing, security, and support context.</p>
                  </div>
                  <AdminStatusBadge tone="info">Primary</AdminStatusBadge>
                </div>
              </Link>
              <Link to="/admin/compliance" className="rounded-xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-content-primary">
                <p className="text-sm font-semibold text-content-primary">Compliance review</p>
                <p className="mt-1 text-xs leading-5 text-content-tertiary">Investigate KYC/AML flags before account-level intervention.</p>
              </Link>
              <Link to="/admin/audit-logs" className="rounded-xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-content-primary">
                <p className="text-sm font-semibold text-content-primary">Recent admin actions</p>
                <p className="mt-1 text-xs leading-5 text-content-tertiary">Use the audit log to verify who changed what and when.</p>
              </Link>
              <Link to="/admin/telemetry" className="rounded-xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-content-primary">
                <p className="text-sm font-semibold text-content-primary">System health</p>
                <p className="mt-1 text-xs leading-5 text-content-tertiary">Check Plaid relinks, webhook cadence, and edge action volume.</p>
              </Link>
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="Activation pulse" description="Cumulative funnel from the current database.">
          {data ? (
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {steps.map((step) => (
                <AdminMetric key={step.label} label={step.label} value={step.count.toLocaleString()} sub={`${step.pct}% of signups`} />
              ))}
            </div>
          ) : (
            <AdminEmptyState icon={Users} title="No funnel yet" description="Activation metrics will appear after user activity lands in the database." />
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title="Admin workbench"
        description="Grouped like an operator console: monitor health, investigate users, inspect data, govern risk, and communicate carefully."
      >
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {opsModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} to={module.href} className="group rounded-xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-content-primary">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center border border-surface-border text-content-secondary group-hover:border-content-primary group-hover:text-content-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <AdminStatusBadge tone={module.tone}>{module.group}</AdminStatusBadge>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-content-primary">{module.title}</h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-content-tertiary">{module.description}</p>
                <div className="mt-4 flex items-center text-[11px] font-semibold text-content-secondary group-hover:text-content-primary">
                  Open <ArrowRight className="ml-1 h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </AdminPanel>

      <AdminPanel title="Onboarding funnel" description="Use this as a product ops signal, not a full analytics warehouse.">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-surface-elevated" />
            ))}
          </div>
        ) : error ? (
          <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load funnel data.</p>
        ) : steps.length === 0 ? (
          <AdminEmptyState icon={Users} title="No users yet" description="The funnel will populate as signups and product actions come in." />
        ) : (
          <div className="space-y-2 p-4">
            {steps.map((step, i) => (
              <div key={step.label} className="rounded-xl border border-surface-border bg-surface-base p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-surface-border bg-surface-raised text-[10px] font-bold text-content-primary">
                      {i === steps.length - 1 ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-content-primary">{step.label}</p>
                      <p className="text-[11px] text-content-muted">{step.description}</p>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-semibold text-content-primary">{step.pct}%</p>
                    <p className="text-[10px] text-content-muted">{step.count.toLocaleString()} users</p>
                  </div>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full rounded-full bg-content-primary transition-all duration-700" style={{ width: `${step.pct}%` }} />
                </div>
                {i < steps.length - 1 ? (
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-content-muted">
                    <ArrowRight className="h-3 w-3" />
                    <span>{steps[i + 1] ? `${steps[i].pct - steps[i + 1].pct}% drop to ${steps[i + 1].label}` : ''}</span>
                  </div>
                ) : null}
              </div>
            ))}
            {biggestDrop && biggestDrop.drop > 0 ? (
              <div className="border border-amber-500/35 bg-amber-500/10 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-700 dark:text-amber-200" />
                  <p className="font-semibold text-content-primary">Highest drop-off</p>
                </div>
                <p className="mt-1 text-content-secondary">
                  <strong>{biggestDrop.step}</strong> is the largest visible break in this activation path.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="Operator runbook" description="Keep admin actions deliberate, reversible when possible, and easy to audit.">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <div className="rounded-xl border border-surface-border bg-surface-base p-3 text-xs leading-5 text-content-secondary">
            <GitBranch className="mb-2 h-4 w-4 text-content-tertiary" />
            Start with the case file, then branch into sessions, compliance, or data only when the evidence calls for it.
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-base p-3 text-xs leading-5 text-content-secondary">
            <ShieldAlert className="mb-2 h-4 w-4 text-content-tertiary" />
            Use audit logs to confirm sensitive changes before and after any destructive action.
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-base p-3 text-xs leading-5 text-content-secondary">
            <BarChart3 className="mb-2 h-4 w-4 text-content-tertiary" />
            Treat estimates as estimates. Exact financial and cohort reporting needs source-of-truth data.
          </div>
        </div>
      </AdminPanel>
    </section>
  );
}
