import React, { useEffect, useRef, useState } from 'react';
import Footer from '../components/Footer';
import HeroPreviewMedia from '../components/landing/HeroPreviewMedia';
import { TransitionLink } from '../components/TransitionLink';
import { BrandWordmark } from '../components/BrandWordmark';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarClock,
  Check,
  CreditCard,
  Repeat,
  Shield,
  Target,
  TrendingUp,
  UploadCloud,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSEO } from '../hooks/useSEO';
import { useStore } from '../store/useStore';

function useInView(threshold = 0.18) {
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

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
}

const proofPoints = [
  'One place for bills, debt, subscriptions, budgets, and due dates',
  'Built for both steady paychecks and irregular income',
  'No credit card required to start your free account',
];

const painPoints = [
  {
    title: 'Bills sneak up on you',
    copy:
      'Rent, cards, subscriptions, tickets, and one-off obligations end up living in five different places. Oweable turns them into one weekly picture.',
    icon: CalendarClock,
  },
  {
    title: 'Debt feels static until it gets expensive',
    copy:
      'Minimum payments keep the lights on, but they rarely create momentum. Oweable shows your payoff path so your next dollar has a job.',
    icon: Target,
  },
  {
    title: 'Cash flow lies when it ignores what is due',
    copy:
      'A checking balance is not a plan. Oweable layers due dates, recurring obligations, and reserves on top so you can see what is actually safe.',
    icon: AlertTriangle,
  },
];

const workflowSteps = [
  {
    eyebrow: 'Step 01',
    title: 'Bring your money life into one place',
    copy:
      'Add bills, debts, subscriptions, and recurring obligations manually or connect accounts when you want more automation.',
    icon: Wallet,
  },
  {
    eyebrow: 'Step 02',
    title: 'See what needs attention this week',
    copy:
      'The dashboard pulls due soon, overdue, and upcoming items into one calm view so you know what must happen next.',
    icon: Repeat,
  },
  {
    eyebrow: 'Step 03',
    title: 'Follow a plan instead of reacting',
    copy:
      'Use debt payoff guidance, budget guardrails, and reserve targets to move from late-fee management to real progress.',
    icon: TrendingUp,
  },
];

const capabilityColumns = [
  {
    title: 'Stay ahead of due dates',
    items: [
      'Recurring bills, subscriptions, and one-off obligations',
      'Overdue detection and reminders before the damage lands',
      'A weekly view that shows what is hitting now versus next',
    ],
    icon: CalendarClock,
  },
  {
    title: 'Make payoff decisions with confidence',
    items: [
      'Snowball and Avalanche strategies in the same place as your bills',
      'A clearer view of how much interest your current pattern is costing',
      'Progress that feels visible instead of theoretical',
    ],
    icon: CreditCard,
  },
  {
    title: 'Handle real-life income patterns',
    items: [
      'Works for W-2 households, side gigs, freelance, and mixed income',
      'Tax estimates and reserve planning when income is uneven',
      'Budgets that respect reality instead of pretending every month matches',
    ],
    icon: BarChart2,
  },
];

const audienceCards = [
  {
    title: 'Individuals with too many moving pieces',
    copy:
      'If your money system lives across bank apps, notes, texts, and memory, Oweable turns that noise into a reliable operating view.',
    accent: 'Bills, subscriptions, debt, and due dates in one rhythm.',
  },
  {
    title: 'Households sharing obligations',
    copy:
      'See the same picture of what is owed, what is coming, and what is being paid down without relying on one person to hold it all in their head.',
    accent: 'Shared visibility without spreadsheet fatigue.',
  },
  {
    title: 'Freelancers and variable-income earners',
    copy:
      'Track uneven income, build reserves, and plan for taxes without using a separate workflow for the rest of your money life.',
    accent: 'Irregular income without irregular systems.',
  },
];

const testimonials = [
  {
    quote:
      'I stopped using my checking balance as a lie detector. The due-soon view changed how I decide what is safe to spend.',
    name: 'Jasmine',
    label: 'W-2 + side gigs',
  },
  {
    quote:
      'The payoff plan finally made my debt feel finite. Before that, every payment felt like disappearing money.',
    name: 'Marcus',
    label: 'Credit cards + student loans',
  },
  {
    quote:
      'Most apps understood budgets or freelance taxes. Oweable was the first one that understood both at the same time.',
    name: 'Devin',
    label: 'Freelance designer',
  },
];

const faqItems = [
  {
    q: 'Is Oweable free to use?',
    a: 'Yes. The free Tracker tier gives you bill tracking, due-date visibility, and core reminders. Full Suite adds debt tools, budgets, analytics, optional bank sync, and tax planning for $10.99 per month.',
  },
  {
    q: 'Is this only for freelancers?',
    a: 'No. Oweable is for anyone trying to get control over bills, debt, subscriptions, and cash flow. Freelance and tax tools are there when you need them, not as the only use case.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No. Oweable runs securely in your browser on desktop and mobile. You can still use your phone camera for bill capture and document upload without installing anything.',
  },
  {
    q: 'How is this different from a basic budgeting app?',
    a: 'Most budgeting tools show where money went. Oweable focuses on what is owed next, what is overdue, and what to pay off first, so the app acts more like a financial operating system than a simple tracker.',
  },
];

export default function Landing() {
  useSEO({
    title: 'Oweable — Stop Losing Money to Bills, Debt & Late Fees',
    description:
      'Track bills, debt, subscriptions, and uneven income in one place. Oweable shows what is due, what is behind, and what to pay off next. Start free with no credit card required.',
    ogTitle: 'Oweable — Stop Guessing What You Owe',
    ogDescription:
      'Oweable gives you a clear weekly view of bills, debt, subscriptions, budgets, and reserves so you can stop running your money by memory.',
    canonical: 'https://www.oweable.com/',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const [scrolled, setScrolled] = useState(false);
  const [heroRef, heroVisible] = useInView(0.08);
  const [storyRef, storyVisible] = useInView(0.12);
  const [audienceRef, audienceVisible] = useInView(0.12);
  const user = useStore((state) => state.user);
  const primaryHref = user?.id ? '/dashboard' : '/onboarding';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/5 bg-surface-base/60 backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <TransitionLink to="/" className="group flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-white flex items-center justify-center transition-transform group-hover:rotate-12">
              <div className="h-3 w-3 bg-black rounded-full" />
            </div>
            <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.1em] text-content-primary" />
          </TransitionLink>
          <div className="hidden items-center gap-10 text-[11px] font-medium uppercase tracking-[0.15em] text-content-tertiary md:flex">
            <a href="#why" className="transition-colors hover:text-content-primary">Why</a>
            <a href="#flow" className="transition-colors hover:text-content-primary">System</a>
            <a href="#pricing" className="transition-colors hover:text-content-primary">Plans</a>
            <a href="#faq" className="transition-colors hover:text-content-primary">FAQ</a>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <TransitionLink
              to={primaryHref}
              className="group relative inline-flex items-center justify-center rounded-full bg-content-primary px-6 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-base transition-all duration-300 hover:scale-105"
            >
              <span className="relative z-10">{user?.id ? 'Dashboard' : 'Get Started'}</span>
            </TransitionLink>
          </div>
        </div>
      </nav>

      <main id="main-content">
        <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
          {/* Advanced Atmospheric Layers (Static) */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-5%] h-[70%] w-[70%] rounded-full bg-brand-profit/10 blur-[150px]" />
            <div className="absolute bottom-[-10%] right-[-5%] h-[60%] w-[60%] rounded-full bg-white/5 blur-[120px]" />
            <div className="absolute top-[30%] left-[40%] h-[40%] w-[40%] rounded-full bg-brand-profit/5 blur-[100px]" />
          </div>

          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-8 relative z-10">
            <div
              ref={heroRef}
              className="opacity-100 translate-y-0"
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-content-secondary backdrop-blur-md">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                Next-Gen Financial Operating System
              </div>
              
              <h1 className="mt-8 text-6xl font-bold tracking-[-0.05em] text-content-primary sm:text-7xl lg:text-[7rem] lg:leading-[0.9]">
                Clarity for<br />
                <span className="bg-gradient-to-r from-white via-white/60 to-white/20 bg-clip-text text-transparent">Complex Money.</span>
              </h1>
              
              <p className="mt-10 max-w-xl text-lg leading-relaxed text-content-secondary lg:text-xl font-light">
                Oweable turns your fragmented bills, debt, and uneven income into a single, dependable rhythm. 
                Stop guessing and start knowing what your money needs next.
              </p>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
                <TransitionLink
                  to={primaryHref}
                  className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-xs font-bold uppercase tracking-[0.15em] text-black transition-all duration-300 hover:scale-[1.02]"
                >
                  {user?.id ? 'Enter Dashboard' : 'Initialize Account'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </TransitionLink>
                <a
                  href="#flow"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-10 py-4 text-xs font-bold uppercase tracking-[0.15em] text-content-primary transition-all hover:bg-white/10"
                >
                  System Overview
                </a>
              </div>
            </div>

            <div
              className={`relative transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-150 ${
                heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
            >
              <div className="absolute inset-6 rounded-[2rem] bg-brand-profit/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-surface-raised/40 backdrop-blur-md p-3 shadow-2xl">
                <HeroPreviewMedia />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border bg-surface-raised">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 text-sm text-content-secondary md:grid-cols-3 lg:px-8">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-profit" />
                <p>{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why" className="py-32 relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-24">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-profit mb-4">The Logic</p>
              <h2 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl lg:text-6xl">
                The problem isn't spending.<br />
                <span className="text-content-secondary">It's financial fog.</span>
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {painPoints.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="glass-card group relative p-10 transition-all hover:bg-white/[0.03]"
                  >
                    <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold text-content-primary mb-4">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-content-secondary line-clamp-4">{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="flow"
          className="relative py-32 overflow-hidden border-t border-white/5"
        >
          <div className="absolute inset-0 z-0">
             <div className="absolute top-[20%] right-[-10%] h-[50%] w-[50%] rounded-full bg-brand-profit/5 blur-[120px]" />
          </div>

          <div
            ref={storyRef}
            className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 opacity-100 translate-y-0"
          >
            <div className="grid gap-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-profit mb-6">The System</p>
                <h2 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl">
                  One command center for what your money needs next.
                </h2>
                <p className="mt-8 text-lg leading-relaxed text-content-secondary font-light">
                  Oweable isn't just a tracker. It's a financial operating system that reduces decision friction by 
                  pulling everything into one rhythm.
                </p>
                
                <div className="mt-12 space-y-4">
                  <div className="glass-card p-6 flex items-start gap-5 group hover:bg-white/[0.03] transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-white shrink-0">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-content-primary mb-1">Bill Capture</p>
                      <p className="text-xs text-content-secondary leading-relaxed">Snap statements and bring them into the system automatically.</p>
                    </div>
                  </div>
                  <div className="glass-card p-6 flex items-start gap-5 group hover:bg-white/[0.03] transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-white shrink-0">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-content-primary mb-1">Financial Academy</p>
                      <p className="text-xs text-content-secondary leading-relaxed">Plain-English lessons for the moments when you want more context.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {workflowSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <article
                      key={step.title}
                      className="glass-card group p-8 transition-all hover:bg-white/[0.03]"
                    >
                      <div className="flex items-start gap-6">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-content-primary group-hover:bg-brand-profit/20 group-hover:text-brand-profit transition-all">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-profit/70 mb-2">{step.eyebrow}</p>
                          <h3 className="text-xl font-bold text-content-primary mb-3">{step.title}</h3>
                          <p className="text-sm leading-relaxed text-content-secondary">{step.copy}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 relative border-t border-white/5">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-start mb-20">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-profit mb-4">Capabilities</p>
              <h2 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl">
                Precision engineering for<br />
                <span className="text-content-secondary">your money workflow.</span>
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {capabilityColumns.map((column) => {
                const Icon = column.icon;
                return (
                  <article
                    key={column.title}
                    className="glass-card group p-10 transition-all hover:bg-white/[0.03]"
                  >
                    <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-content-primary mb-6 tracking-tight">{column.title}</h3>
                    <ul className="space-y-4">
                      {column.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 group/item">
                          <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-profit opacity-50 group-hover/item:opacity-100 transition-opacity" />
                          <span className="text-sm text-content-secondary group-hover/item:text-content-primary transition-colors leading-relaxed font-light">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-32 relative overflow-hidden border-t border-white/5">
          <div
            ref={audienceRef}
            className="mx-auto max-w-7xl px-6 lg:px-8 opacity-100 translate-y-0"
          >
            <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-profit mb-4">Audience</p>
                <h2 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl">
                  Built for the messy reality of money.
                </h2>
                <p className="mt-8 text-lg leading-relaxed text-content-secondary font-light">
                  We don't expect you to have a perfect budget. We expect you to have a life. 
                  Oweable is built for households, freelancers, and anyone with "too many moving pieces."
                </p>
              </div>
              <div className="grid gap-4">
                {audienceCards.map((item, index) => (
                  <article
                    key={item.title}
                    className="glass-card group p-8 flex flex-col md:flex-row md:items-center gap-8 transition-all hover:bg-white/[0.03]"
                  >
                    <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                      {index === 0 && <Users className="h-5 w-5" />}
                      {index === 1 && <Shield className="h-5 w-5" />}
                      {index === 2 && <TrendingUp className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-content-primary mb-2">{item.title}</h3>
                      <p className="text-sm text-content-secondary leading-relaxed font-light mb-4">{item.copy}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-profit">{item.accent}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-base py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Social proof</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-content-primary">
                  The value is emotional before it is technical.
                </h2>
                <p className="mt-6 max-w-lg text-lg leading-8 text-content-secondary">
                  When people can see what is due, what is late, and what progress looks like, their money decisions
                  stop feeling like emergencies.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {testimonials.map((item) => (
                  <article
                    key={item.name}
                    className="group flex h-full flex-col items-start justify-between rounded-2xl border border-surface-border bg-surface-raised p-8 transition-all hover:border-surface-border-subtle hover:shadow-sm"
                  >
                    <p className="text-sm leading-relaxed text-content-primary">"{item.quote}"</p>
                    <div className="mt-8 border-t border-surface-border pt-5">
                      <p className="text-sm font-semibold text-content-primary">{item.name}</p>
                      <p className="mt-1 text-sm text-content-secondary">{item.label}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-32 relative border-t border-white/5">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-20">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-profit mb-4">Pricing</p>
              <h2 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl">
                Start with essentials.<br />
                <span className="text-content-secondary">Upgrade when you're ready.</span>
              </h2>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
              <article className="glass-card group p-10 flex flex-col transition-all hover:bg-white/[0.02]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-content-tertiary mb-6">Free Tracker</p>
                <div className="flex items-end gap-2 mb-8">
                  <span className="text-6xl font-bold tracking-tight text-content-primary">$0</span>
                  <span className="pb-1 text-sm text-content-secondary font-medium">/ month</span>
                </div>
                <p className="text-sm leading-relaxed text-content-secondary mb-10 font-light">
                  Immediate visibility into bills, due dates, and core reminders.
                </p>
                <ul className="space-y-4 mb-10 flex-grow">
                  {['Bill tracking', 'Due-date visibility', 'Recurring obligations', 'Core reminders'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-content-secondary font-medium">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-colors">
                  Start Track
                </button>
              </article>

              <article className="relative p-10 flex flex-col rounded-2xl border border-brand-profit/30 bg-brand-profit/5 overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 bg-brand-profit text-black text-[9px] font-black uppercase tracking-widest rounded-bl-xl">Best Value</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-profit mb-6">Full Suite</p>
                <div className="flex items-end gap-2 mb-8">
                  <span className="text-6xl font-bold tracking-tight text-white">$10.99</span>
                  <span className="pb-1 text-sm text-brand-profit/70 font-medium">/ month</span>
                </div>
                <p className="text-sm leading-relaxed text-white/80 mb-10 font-light">
                  The complete operating system: debt, budgets, taxes, and deep cash-flow.
                </p>
                <ul className="space-y-4 mb-10 flex-grow">
                  {['Debt payoff engine', 'Advanced analytics', 'Tax planning', 'Variable income tools'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white font-medium">
                      <Check className="h-4 w-4 text-brand-profit" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.2em] text-black hover:scale-[1.02] transition-transform">
                  Deploy Suite
                </button>
                <p className="mt-6 text-[10px] text-center text-white/50 uppercase tracking-widest">14-day trial included</p>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className="py-32 relative border-t border-white/5">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-20">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-profit mb-4">FAQ</p>
              <h2 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl">
                Common inquiries.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto">
              {faqItems.map((item) => (
                <article
                  key={item.q}
                  className="glass-card p-8 transition-all hover:bg-white/[0.03]"
                >
                  <h3 className="text-sm font-bold text-content-primary mb-4 tracking-tight uppercase tracking-wider">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-content-secondary font-light">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-40 relative border-t border-white/5 overflow-hidden">
          <div className="absolute inset-0 z-0">
             <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 h-full w-full bg-brand-profit/5 blur-[180px]" />
          </div>

          <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-profit mb-8">Ready to Initialize</p>
            <h2 className="text-5xl font-bold tracking-tighter text-content-primary sm:text-7xl lg:text-8xl mb-12">
              Money stress is just<br />
              <span className="text-content-secondary/40">missing visibility.</span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <TransitionLink
                to={primaryHref}
                className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-white px-12 py-5 text-xs font-bold uppercase tracking-[0.2em] text-black transition-all duration-300 hover:scale-105"
              >
                {user?.id ? 'Open Command Center' : 'Initialize Account'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </TransitionLink>
              <TransitionLink
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-12 py-5 text-xs font-bold uppercase tracking-[0.2em] text-content-primary transition-all hover:bg-white/10"
              >
                Compare Systems
              </TransitionLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
