import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  CircleDollarSign,
  Layers3,
  ShieldCheck,
  Receipt,
  CreditCard,
  Repeat,
  Car,
  FileWarning,
  Calculator,
  BarChart2,
  Bell,
  CheckCircle2,
} from "lucide-react";

/* ─── data ──────────────────────────────────────────────────────── */

const features = [
  {
    icon: Clock3,
    title: "One ordered list",
    body: "Every payment ranked by urgency. No more switching between apps to figure out what is due next.",
  },
  {
    icon: CircleDollarSign,
    title: "Safe Spend calculation",
    body: "After obligations are covered, see exactly how much discretionary cash you have left each day.",
  },
  {
    icon: Layers3,
    title: "Debt payoff paths",
    body: "Avalanche or snowball — pick a method and watch balances turn into a clear sequence of next steps.",
  },
  {
    icon: Bell,
    title: "Due-soon alerts",
    body: "Know what is behind, what is due this week, and what cash must stay protected before another fee lands.",
  },
  {
    icon: BarChart2,
    title: "Monthly overview",
    body: "See total recurring commitments against your income so nothing sneaks up at the end of the month.",
  },
  {
    icon: ShieldCheck,
    title: "Manual-first, connect when ready",
    body: "No forced integrations. Add what you know now, link bank accounts only when it makes sense.",
  },
];

const obligationTypes = [
  { icon: Receipt,     label: "Bills"           },
  { icon: CreditCard,  label: "Debts"           },
  { icon: Repeat,      label: "Subscriptions"   },
  { icon: Car,         label: "Mileage"         },
  { icon: FileWarning, label: "Citations"       },
  { icon: Calculator,  label: "Tax deductions"  },
];

const steps = [
  {
    n: "01",
    title: "Add what you owe",
    body: "Enter your bills, debts, subscriptions, and recurring payments. Takes about two minutes.",
  },
  {
    n: "02",
    title: "See what is urgent",
    body: "Oweable ranks everything by due date and flags what is overdue, due soon, or on autopilot.",
  },
  {
    n: "03",
    title: "Build a payoff plan",
    body: "Choose a debt strategy. Track progress. Come back each month to stay ahead.",
  },
];

/* ─── component ─────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-(--color-surface)">

      {/* ══ HEADER ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-(--color-surface-border) bg-(--color-surface)/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-bold tracking-[0.2em] text-(--color-content)">OWEABLE</span>
          <nav className="flex items-center gap-2">
            <Link
              prefetch={false}
              href="/auth"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-(--color-content-secondary) transition-colors hover:text-(--color-content)"
            >
              Sign in
            </Link>
            <Link
              prefetch={false}
              href="/auth"
              className="rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-(--color-accent-hover)"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow — positive tracking per Linear spec */}
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.4em] text-(--color-content-tertiary)">
            Financial obligation management
          </p>

          {/* Display headline — tight negative tracking */}
          <h1 className="text-5xl font-semibold tracking-tighter text-(--color-content) sm:text-6xl" style={{ lineHeight: 1.08 }}>
            Every obligation,<br />
            <span className="text-(--color-content-secondary)">one place.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-(--color-content-secondary)">
            Bills, debts, subscriptions, tolls, tickets, taxes — ordered by what needs attention next so you never miss a payment.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {/* Primary CTA — accent (cobalt violet) per Linear pattern */}
            <Link
              prefetch={false}
              href="/auth"
              className="inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--color-accent-hover)"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            {/* Secondary CTA — surface-1 with hairline border */}
            <Link
              prefetch={false}
              href="/auth"
              className="inline-flex items-center gap-2 rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-5 py-2.5 text-sm font-medium text-(--color-content-secondary) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-content)"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-xs text-(--color-content-tertiary)">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-(--color-success)" />
              14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-(--color-success)" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-(--color-success)" />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* ══ OBLIGATION TYPES STRIP ══════════════════════════════════ */}
      <div className="border-y border-(--color-surface-border) bg-(--color-surface-raised)">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.4em] text-(--color-content-tertiary)">
            Tracks all obligation types
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {obligationTypes.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-(--color-content-secondary)">
                <Icon className="h-4 w-4 shrink-0 text-(--color-content-tertiary)" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ FEATURES ════════════════════════════════════════════════ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          {/* Section eyebrow */}
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.4em] text-(--color-accent)">
            Features
          </p>
          <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight text-(--color-content)">
            Built for the full picture
          </h2>
          <p className="mx-auto mb-14 max-w-lg text-center text-base text-(--color-content-secondary)">
            Most tools focus on spending. Oweable focuses on obligations — what you owe, when, and in what order.
          </p>

          {/* Feature cards — surface-1 with hairline border, rounded-lg */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-(--color-surface-border) bg-(--color-surface-raised) p-6 transition-colors hover:border-(--color-accent-muted) hover:bg-(--color-surface-elevated)"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-(--color-accent-muted)">
                  <f.icon className="h-4.5 w-4.5 text-(--color-accent)" />
                </div>
                <h3 className="text-sm font-semibold text-(--color-content)">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-(--color-content-secondary)">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════ */}
      <section className="border-y border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.4em] text-(--color-accent)">
            How it works
          </p>
          <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight text-(--color-content)">
            Up and running in minutes
          </h2>
          <p className="mx-auto mb-14 max-w-md text-center text-base text-(--color-content-secondary)">
            Set up takes a few minutes. The clarity it gives you lasts.
          </p>

          <div className="grid gap-10 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n}>
                {/* Large step number — accent, low opacity, tight tracking */}
                <p className="mb-4 text-5xl font-bold tracking-tighter text-(--color-accent) opacity-30">
                  {s.n}
                </p>
                <h3 className="text-base font-semibold text-(--color-content)">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-(--color-content-secondary)">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══════════════════════════════════════════════ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          {/* CTA banner — surface-1 card, rounded-lg, 48px padding per Linear spec */}
          <div className="rounded-xl border border-(--color-surface-border) bg-(--color-surface-raised) px-12 py-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-(--color-content)">
              Stop guessing what is due next.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-(--color-content-secondary)">
              Start your 14-day free trial. No credit card required. Cancel anytime.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                prefetch={false}
                href="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--color-accent-hover)"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                prefetch={false}
                href="/auth"
                className="inline-flex items-center gap-2 rounded-md border border-(--color-surface-border) bg-(--color-surface-elevated) px-6 py-2.5 text-sm font-medium text-(--color-content-secondary) transition-colors hover:text-(--color-content)"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════ */}
      <footer className="border-t border-(--color-surface-border) px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">

            {/* Brand column */}
            <div className="lg:col-span-2">
              <span className="text-sm font-bold tracking-[0.2em] text-(--color-content)">OWEABLE</span>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-(--color-content-tertiary)">
                One place for every financial obligation — bills, debt, subscriptions, citations, mileage, and more. Know what is next before it is late.
              </p>
            </div>

            {/* Product links */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-(--color-content-tertiary)">
                Product
              </p>
              <ul className="space-y-3">
                <li>
                  <Link prefetch={false} href="/auth" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link prefetch={false} href="/auth" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-(--color-content-tertiary)">
                Legal
              </p>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-(--color-surface-border) pt-8 sm:flex-row sm:items-center">
            <p className="text-xs text-(--color-content-tertiary)">
              &copy; {new Date().getFullYear()} Oweable. All rights reserved.
            </p>
            <p className="text-xs text-(--color-content-tertiary)">
              Built for people who want to stop guessing.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
