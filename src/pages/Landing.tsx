import React, { useState, useEffect, useRef } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import {
  ArrowRight,
  UploadCloud,
  Target,
  BarChart2,
  TrendingUp,
  BookOpen,
  CalendarClock,
  Quote,
  Wallet,
  Repeat,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { useSEO } from '../hooks/useSEO';
import { isPlaidLinkUiEnabled } from '../lib/featureFlags';
import HeroPreviewMedia from '../components/landing/HeroPreviewMedia';
import { BrandWordmark } from '../components/BrandWordmark';

function useInView(threshold = 0.15) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
}

const FAQ_ITEMS_BASE = [
  {
    q: 'Who is Oweable for?',
    a: 'Anyone dealing with debt, bills, or financial pressure. That includes people paying off credit cards or medical debt, single parents juggling bills, recent grads with student loans, gig workers, salaried employees on tight budgets, and anyone who wants a clear picture of where they stand — and a real plan to get ahead.',
  },
  {
    q: 'How does Oweable help me pay off debt faster?',
    a: 'Oweable\'s Debt Detonator lets you choose between the Avalanche strategy (highest interest first — minimizes total interest paid) or the Snowball strategy (smallest balance first — builds momentum). It calculates your exact debt-free date, projects total interest saved, and generates a month-by-month amortization schedule for every debt.',
  },
  {
    q: 'Can I track all my bills in one place?',
    a: 'Yes. Add any recurring bill — rent, utilities, subscriptions, insurance — with its due date and frequency. Oweable automatically flags bills that go overdue, calculates your total monthly burn rate, and shows everything on a financial calendar so nothing slips through the cracks.',
  },
  {
    q: 'Is Oweable free?',
    a: 'Yes — Oweable includes a free Tracker tier for core account and bill tracking. Full Suite unlocks advanced tools like the debt payoff planner, category budgets with guardrails, subscription intelligence, deeper analytics, and tax estimation and reserve planning (especially helpful if you have variable or 1099 income) for $10.99/month.',
  },
  {
    q: 'How is Oweable different from YNAB or Mint?',
    a: 'YNAB and Mint focus heavily on envelope-style budgeting for steady paychecks. Oweable is a broader money command center: budgets and spending intelligence, bills and debts in one obligations hub, net worth, subscriptions, credit tools, optional bank sync, and document upload — built for salaried households and for messy real life (variable income, multiple debts, tight cash flow, and recovery). Tax estimation and reserve tools help when your income is not a flat W-2 every two weeks.',
  },
  {
    q: 'Is my financial data secure?',
    a: 'Yes. You sign in with Google (Oweable does not store a separate password for that). Your information is encrypted in transit, and you only see your own data in the app. More detail is on our Security page.',
  },
];

function buildFaqItems(plaidUiEnabled: boolean) {
  const bankAnswer = plaidUiEnabled
    ? 'No. You can run your whole plan with manual bills, CSV imports, and document uploads. If you want automatic transaction sync, you can connect your bank in Settings → Integrations when that option is available.'
    : 'No. You can run your whole plan with manual bills, CSV imports, and document uploads. Optional automatic bank connection may be offered later; we do not require it to get value from Oweable.';

  return [
    FAQ_ITEMS_BASE[0],
    FAQ_ITEMS_BASE[1],
    FAQ_ITEMS_BASE[2],
    {
      q: 'Do I need to connect my bank?',
      a: bankAnswer,
    },
    ...FAQ_ITEMS_BASE.slice(3),
  ];
}

const TESTIMONIALS = [
  {
    quote:
      'I had due dates on sticky notes and still paid late fees. Having rent, utilities, and subscriptions in one place with what’s due soon actually stopped the scramble every month.',
    name: 'Daniela R.',
    role: 'Household bills & two kids’ schedules',
    region: 'Texas',
    tag: 'Bills & reminders',
    initials: 'DR',
    workType: 'Marketing coordinator (W-2) + weekend design gigs',
    platform: 'Fiverr',
  },
  {
    quote:
      'I was making minimums and pretending the balances would magically shrink. Seeing a real payoff path and how much interest I was burning changed what I paid every month.',
    name: 'James K.',
    role: 'Credit card & medical debt payoff',
    region: 'Pennsylvania',
    tag: 'Debt tools',
    initials: 'JK',
    workType: 'Electrician (union) + side jobs',
    platform: 'Taskrabbit',
  },
  {
    quote:
      'DoorDash weeks don’t look like W-2 weeks. I needed something that didn’t assume the same paycheck every Friday — bills and gig income in one dashboard finally felt honest.',
    name: 'Marcus T.',
    role: 'Gig driver + part-time retail',
    region: 'Ohio',
    tag: 'Variable income',
    initials: 'MT',
    workType: 'DoorDash + Uber Driver',
    platform: 'DoorDash',
  },
  {
    quote:
      'I’d photograph bills and never type them in. Uploading a statement and having amounts and dates pulled into review meant I actually closed the loop instead of hoarding PDFs.',
    name: 'Priya M.',
    role: 'Self-employed, design',
    region: 'Washington',
    tag: 'Document scanning',
    initials: 'PM',
    workType: 'HR generalist, small business',
    platform: 'Dribbble',
  },
  {
    quote:
      'We lived in a spreadsheet nobody opened. One screen for net worth, what we owe, and what’s coming due this week — my partner and I finally argue about plans, not about where the numbers live.',
    name: 'Alex C.',
    role: 'Couple, migrated from spreadsheets',
    region: 'Florida',
    tag: 'One dashboard',
    initials: 'AC',
    workType: 'IT analyst, hybrid schedule',
    platform: 'Upwork',
  },
  {
    quote:
      'The calendar-style view of what hits this week vs next kept me from stacking bills on the same day. Small thing, but it’s the difference between “fine” and overdraft.',
    name: 'Jordan L.',
    role: 'Single parent, shift work',
    region: 'Georgia',
    tag: 'Calendar & due soon',
    initials: 'JL',
    workType: '1099 Photographer, Thumbtack',
    platform: 'Thumbtack',
  },
] as const;

export default function Landing() {
  useSEO({
    title: 'Oweable — Bills, budgets, debt & net worth in one command center',
    description:
      'Oweable brings bills, debts, category budgets, cash flow, subscriptions, net worth, and optional tax tools into one dashboard — for W-2 households, families, and anyone with variable or self-employed income.',
    ogTitle: 'Oweable — Personal finance tools for bills, debt, and cash flow',
    ogDescription:
      'Track obligations, build budgets with guardrails, see spending and net worth, manage subscriptions, and plan payoff — one dashboard for everyday money management, not only freelancers.',
    canonical: 'https://www.oweable.com/',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const [scrolled, setScrolled] = useState(false);
  const user = useStore((state) => state.user);
  
  const [heroRef] = useInView(0.1);
  const [archRef, archVisible] = useInView(0.1);
  const [testimonialsRef, testimonialsVisible] = useInView(0.12);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-content-primary/15 flex flex-col">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 border-b py-4 transition-colors duration-300 ${scrolled ? 'bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 border-surface-border' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <TransitionLink to="/" className="text-content-primary">
            <BrandWordmark textClassName="brand-header-text" />
          </TransitionLink>
          <div className="hidden md:flex items-center gap-8 text-sm text-content-tertiary">
            <a href="#features" className="hover:text-content-primary transition-colors">Features</a>
            <a href="#stories" className="hover:text-content-primary transition-colors">Stories</a>
            <TransitionLink to="/pricing" className="hover:text-content-primary transition-colors">Pricing</TransitionLink>
          </div>
          <div className="flex items-center gap-3">
            {user?.id && (
              <button 
                onClick={() => {
                  useStore.getState().signOut();
                  toast.success('Session Terminated');
                }}
                className="hidden sm:block px-6 py-2 bg-transparent border border-surface-border text-content-secondary hover:text-content-primary hover:bg-content-primary/[0.04] text-sm font-sans font-medium transition-colors rounded-lg"
              >
                Sign out
              </button>
            )}
            <TransitionLink 
              to={user?.id ? "/dashboard" : "/onboarding"} 
              className="px-6 py-2 rounded-lg bg-brand-cta text-surface-base hover:bg-brand-cta-hover text-sm font-sans font-medium shadow-none transition-colors"
            >
              {user?.id ? "Open dashboard" : "Sign in"}
            </TransitionLink>
          </div>
        </div>
      </nav>

      <main id="main-content" className="flex flex-1 flex-col">
      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 lg:pt-40 pb-12 sm:pb-20 px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div ref={heroRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-32 items-center">
          
          <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-12">
            <div className="inline-flex items-center gap-2 border border-surface-border bg-surface-raised px-3 py-1.5 mb-8 text-xs font-sans font-medium text-content-secondary rounded-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Bank-grade Security
            </div>

            <p className="text-xs text-content-secondary mb-4">
              Join <span className="text-content-primary font-medium">3,000+ households and professionals</span> using Oweable to run their money in one place.
            </p>
            
            <h1 className="text-4xl md:text-6xl xl:text-7xl font-sans font-medium tracking-[-0.03em] text-content-primary mb-8 leading-[1.05]">
              The money command center for<br />
              bills, debt, budgets &amp; net worth
            </h1>
            
            <p className="text-lg font-medium text-content-secondary max-w-lg leading-[1.6] mb-10 border-l border-surface-border pl-6">
              One dashboard for category budgets, bills and debts, subscriptions, cash flow and analytics, credit and net worth — plus document upload and tax tools when you need them. Built for steady paychecks and for variable income alike.
            </p>
            
            <div className="w-full max-w-xl">
              <TransitionLink
                to={user?.id ? "/dashboard" : "/onboarding"}
                className="group inline-flex items-center gap-4 bg-brand-cta text-surface-base hover:bg-brand-cta-hover px-8 py-4 text-sm font-sans font-medium shadow-none rounded-lg transition-colors"
              >
                {user?.id ? "Open dashboard" : "Get started for free"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </TransitionLink>

              <p className="mt-3 text-xs text-content-tertiary">
                No credit card required · Cancel anytime · Free forever on Tracker tier.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-content-tertiary">Free Tracker</p>
                  <p className="text-sm font-semibold text-content-primary mt-1">$0 / month</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-content-secondary">
                    <li>Bill tracking and due-date alerts</li>
                    <li>Manual income + expense logging</li>
                    <li>Basic net worth visibility</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-content-tertiary">Full Suite</p>
                  <p className="text-sm font-semibold text-content-primary mt-1">$10.99 / month</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-content-secondary">
                    <li>Debt payoff engine (Snowball + Avalanche)</li>
                    <li>Category budgets, analytics &amp; subscriptions</li>
                    <li>Tax estimation + reserve planning when you need it</li>
                  </ul>
                </div>
              </div>
              <TransitionLink to="/pricing" className="mt-3 inline-flex text-xs text-content-secondary hover:text-content-primary transition-colors">
                View full pricing details
              </TransitionLink>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="bg-surface-raised border border-surface-border rounded-lg p-1 shadow-none">
              <HeroPreviewMedia />
            </div>
            
            {/* Decorative alignment lines */}
            <div className="absolute -left-10 top-0 bottom-0 w-[1px] bg-surface-border hidden xl:block opacity-50"></div>
            <div className="absolute -right-10 top-0 bottom-0 w-[1px] bg-surface-border hidden xl:block opacity-50"></div>
          </div>

        </div>
      </section>

      {/* Architecture Section */}
      <section id="features" className="py-24 border-t border-surface-border bg-surface-base relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8" ref={archRef}>
          <div className={`mb-16 transition-all duration-1000 ease-out ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mb-4">
              Tools that match the dashboard
            </h2>
            <p className="text-sm text-content-secondary max-w-2xl mb-6 leading-relaxed">
              Everything below is part of the product today — not a narrow &ldquo;freelancer-only&rdquo; app. Use what fits your life: W-2, household budgeting, side income, or full self-employment.
            </p>
            <div className="w-full h-px bg-surface-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Target,
                title: "Debt Detonator",
                benefit: "Choose Avalanche (highest interest first) or Snowball (smallest balance first). Get your exact debt-free date, total interest saved, and a month-by-month payoff schedule for every debt.",
                tier: "Full Suite"
              },
              {
                icon: CalendarClock,
                title: "Obligations hub",
                benefit: "Recurring bills, debt accounts, and tickets or fines in one place — due dates, overdue flags, and calendar-style visibility so nothing hides in a tab you forgot to open.",
                tier: "Tracker + Full Suite"
              },
              {
                icon: Wallet,
                title: "Category budgets & guardrails",
                benefit: "Set spending limits by category with optional rollover and lock modes so you see when a category is on track — or when you need to adjust before the month slips away.",
                tier: "Full Suite"
              },
              {
                icon: TrendingUp,
                title: "Net Worth Engine",
                benefit: "See your real-time net worth from assets minus liabilities with trend visibility so you can see exactly where you're headed.",
                tier: "Tracker + Full Suite"
              },
              {
                icon: BarChart2,
                title: "Analytics & reports",
                benefit: "Spending by category, income vs. expenses, cash-flow views, and report-style summaries built from the transactions and budgets you already maintain.",
                tier: "Tracker + Full Suite"
              },
              {
                icon: Repeat,
                title: "Subscriptions & recurring",
                benefit: "Track subscription renewals and recurring charges alongside bills so recurring spend does not quietly drift month to month.",
                tier: "Full Suite"
              },
              {
                icon: UploadCloud,
                title: "Document scanning & ingestion",
                benefit: "Upload receipts and statements, review extracted amounts and dates, and push items into your ledger or inbox without retyping.",
                tier: "Tracker + Full Suite"
              },
              {
                icon: AlertTriangle,
                title: "Tickets & fines workflow",
                benefit: "Log traffic tickets and toll violations with due dates and payment links so fines do not get lost in email while you manage the rest of your money.",
                tier: "Tracker + Full Suite"
              },
              {
                icon: BookOpen,
                title: "Financial Academy",
                benefit: "Self-paced tracks covering budgeting, debt payoff, credit, and taxes — with saved progress so you pick up where you left off.",
                tier: "Full Suite"
              }
            ].map((feat, i) => (
              <div
                key={i}
                className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors"
              >
                <feat.icon className="w-5 h-5 text-content-secondary mb-4" />
                <h3 className="text-lg font-medium tracking-tight text-content-primary mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-content-secondary leading-relaxed">
                  {feat.benefit}
                </p>
                <span className="mt-4 inline-flex rounded-md border border-surface-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
                  {feat.tier}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof — composite stories aligned with core product areas */}
      <section id="stories" className="py-24 border-t border-surface-border bg-surface-base">
        <div className="max-w-7xl mx-auto px-6 lg:px-8" ref={testimonialsRef}>
          <div
            className={`mb-12 transition-all duration-1000 ease-out ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="text-xs font-sans font-medium text-content-secondary">Stories</span>
            <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mt-4 mb-3">
              What people use Oweable for
            </h2>
            <p className="text-content-secondary max-w-2xl leading-relaxed text-sm">
              Salaried or self-employed, single or juggling a household — people use Oweable for due dates, debt payoff, subscriptions, budgets, and getting scattered paperwork into one workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <figure
                key={i}
                className="border border-surface-border rounded-lg p-8 lg:p-10 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors flex flex-col h-full"
              >
                <Quote className="w-5 h-5 text-content-tertiary mb-4 shrink-0" aria-hidden />
                <blockquote className="text-sm text-content-secondary leading-relaxed flex-1 mb-6">
                  <span className="text-content-primary/90">&ldquo;{t.quote}&rdquo;</span>
                </blockquote>
                <figcaption className="mt-auto pt-4 border-t border-surface-border">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-black text-xs font-semibold text-content-primary">
                      {t.initials}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-content-primary">{t.name}</p>
                      <p className="text-[11px] text-content-tertiary">{t.workType}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs font-sans font-medium text-content-secondary mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" aria-hidden />
                    {t.tag}
                  </span>
                  <p className="text-xs text-content-tertiary mt-1 leading-relaxed">{t.role}</p>
                  <p className="text-xs text-content-tertiary mt-2">{t.region} • {t.platform}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* What is Oweable? — plain-language definition for AI crawlers and search engines */}
      <section id="what-is-oweable" className="py-24 border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <span className="text-xs font-sans font-medium text-content-secondary">Overview</span>
              <h2 className="text-3xl font-medium tracking-tight text-content-primary mt-4">What is Oweable?</h2>
            </div>
            <div className="lg:col-span-8 flex flex-col gap-4 lg:pt-10">
              <p className="text-content-secondary leading-relaxed">
                Oweable is a financial operating system for anyone who wants their money tools in one place: bill and debt tracking, category budgets, transactions and analytics, subscriptions, net worth, investments and insurance snapshots, credit workshop features, and optional bank connection — not a niche freelancer product.
              </p>
              <p className="text-content-secondary leading-relaxed">
                It fits steady W-2 paychecks and household budgeting, and it also supports variable income, side work, and self-employment with income logging, freelance and tax pages, and quarterly tax estimation when you need them — alongside the same bills-and-debt workflows salaried users rely on.
              </p>
              <p className="text-content-secondary leading-relaxed">
                Typical members include single parents, dual-income households, people paying down cards or medical bills, recent grads with loans, gig and contract workers, and salaried professionals who want obligations, budgets, and net worth in one honest view — plus a path to get ahead.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section — indexed by search engines and AI crawlers */}
      <section id="faq" className="py-24 border-t border-surface-border bg-surface-base">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="text-xs font-sans font-medium text-content-secondary">FAQ</span>
            <h2 className="text-3xl font-semibold tracking-tight text-content-primary mt-4">Frequently asked questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buildFaqItems(isPlaidLinkUiEnabled()).map((item, i) => (
              <div key={i} className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors">
                <h3 className="text-sm font-medium tracking-tight text-content-primary mb-3">{item.q}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      </main>
    </div>
  );
}
