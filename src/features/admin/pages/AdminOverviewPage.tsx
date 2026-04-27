import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowRight, Users, GitBranch, CheckCircle, BarChart3, 
  Database, ShieldAlert, Gavel, Activity, FileText, 
  Scale, Radio, Mail, Search
} from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';

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

const adminModules = [
  {
    title: 'Case File',
    description: 'Look up and manage individual user profiles, billing, and settings.',
    icon: Search,
    href: '/admin/user',
  },
  {
    title: 'Data Tables',
    description: 'Raw access to core database tables and entity management.',
    icon: Database,
    href: '/admin/data',
  },
  {
    title: 'Audit Logs',
    description: 'System-wide security and action logs for accountability.',
    icon: ShieldAlert,
    href: '/admin/audit-logs',
  },
  {
    title: 'Moderation',
    description: 'Manage bans, warnings, and user-generated content.',
    icon: Gavel,
    href: '/admin/moderation',
  },
  {
    title: 'Sessions',
    description: 'Monitor active user sessions and security events.',
    icon: Activity,
    href: '/admin/sessions',
  },
  {
    title: 'Reports',
    description: 'Financial, operational, and system performance reports.',
    icon: FileText,
    href: '/admin/reports',
  },
  {
    title: 'Compliance',
    description: 'KYC/AML status, document verification, and legal holds.',
    icon: Scale,
    href: '/admin/compliance',
  },
  {
    title: 'Telemetry',
    description: 'Real-time system performance, errors, and API metrics.',
    icon: Radio,
    href: '/admin/telemetry',
  },
  {
    title: 'Email Blast',
    description: 'Send targeted marketing and operational broadcasts.',
    icon: Mail,
    href: '/admin/email-blast',
  },
];

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview', 'onboarding-funnel'],
    queryFn: async (): Promise<OnboardingMetrics> => {
      // Run in parallel for speed
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
        completed_profile: completedOnboarding, // Users who completed the onboarding flow
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
        { label: 'Completed onboarding', description: 'Finished all steps', count: data.completed_onboarding, pct: Math.round((data.completed_onboarding / total) * 100) },
      ]
    : [];

  const biggestDrop = steps.length >= 2
    ? steps.reduce((best, step, i) => {
        if (i === 0) return best;
        const drop = steps[i - 1].pct - step.pct;
        return drop > best.drop ? { drop, step: step.label } : best;
      }, { drop: 0, step: '' })
    : null;

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-content-primary">Admin Modules</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {adminModules.map((module) => (
            <Link
              key={module.href}
              to={module.href}
              className="flex flex-col justify-between border border-surface-border p-4"
            >
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center border border-surface-border text-content-secondary">
                  <module.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-content-primary">
                  {module.title}
                </h3>
                <p className="mt-2 text-xs text-content-tertiary leading-relaxed">
                  {module.description}
                </p>
              </div>
              <div className="mt-4 flex items-center text-[11px] font-medium text-content-muted">
                Open module <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="border border-surface-border p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-brand-cta" />
              <h2 className="text-base font-semibold text-content-primary">Analytics: Onboarding Funnel</h2>
            </div>
            <p className="mt-1 text-xs text-content-tertiary">
              Cumulative progression of all {data?.total_signups?.toLocaleString() ?? '—'} users through activation steps.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data ? (
              <div className="border border-surface-border px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Completion rate</p>
                <p className="mt-0.5 text-lg font-bold text-content-primary">
                  {data.total_signups > 0 ? Math.round((data.completed_onboarding / data.total_signups) * 100) : 0}%
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-rose-300">Failed to load funnel data.</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step.label} className="border border-surface-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      i === steps.length - 1 ? 'bg-emerald-500 text-white' : 'bg-brand-cta text-surface-base'
                    }`}>
                      {i === steps.length - 1 ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-content-primary">{step.label}</p>
                      <p className="text-[10px] text-content-muted">{step.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-content-primary">{step.pct}%</p>
                    <p className="text-[10px] text-content-muted">{step.count.toLocaleString()} users</p>
                  </div>
                </div>
                <div className="relative h-2 w-full overflow-hidden bg-surface-elevated">
                  <div
                    className={`h-full transition-all duration-700 ${i === steps.length - 1 ? 'bg-emerald-500' : 'bg-content-primary'}`}
                    style={{ width: `${step.pct}%` }}
                  />
                </div>
                {i < steps.length - 1 ? (
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-content-muted">
                    <ArrowRight className="h-3 w-3" />
                    <span>
                      {steps[i + 1]
                        ? `${steps[i].pct - steps[i + 1].pct}% drop-off to "${steps[i + 1].label}"`
                        : ''}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}

            {biggestDrop && biggestDrop.drop > 0 ? (
              <div className="mt-2 border border-amber-500/35 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-300" />
                  <p className="font-semibold text-content-primary">Highest drop-off</p>
                </div>
                <p className="mt-1 text-content-secondary">
                  <strong>&quot;{biggestDrop.step}&quot;</strong> — {biggestDrop.drop}% of users don't reach this step.
                  Focus product and growth efforts here.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Quick stats */}
      {data && !isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mt-4">
          {steps.map((step) => (
            <div key={step.label} className="border border-surface-border px-3 py-2">
              <p className="text-[10px] truncate uppercase tracking-wide text-content-tertiary">{step.label}</p>
              <p className="mt-1 text-base font-semibold text-content-primary">{step.count.toLocaleString()}</p>
              <p className="text-[10px] text-content-muted">{step.pct}%</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty state message */}
      {!isLoading && !error && (!data || data.total_signups === 0) ? (
        <div className="flex flex-col items-center gap-3 border border-surface-border py-16 text-center mt-4">
          <Users className="h-10 w-10 text-content-muted" />
          <p className="text-sm text-content-secondary">No users yet — funnel will populate as signups come in.</p>
        </div>
      ) : null}
    </section>
  );
}
