import React, { useEffect, useRef, useState } from 'react';
import Footer from '../components/Footer';
import HeroPreviewMedia from '../components/landing/HeroPreviewMedia';
import { TransitionLink } from '../components/TransitionLink';
import { BrandWordmark } from '../components/BrandWordmark';
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
    <div className="min-h-screen bg-[#f6efe4] text-[#1f2b24] selection:bg-[#1f2b24]/15">
      <nav
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? 'border-[#d7cebf] bg-[#f6efe4]/92 backdrop-blur-xl'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <TransitionLink to="/" className="text-[#1f2b24]">
            <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[-0.02em] text-[#1f2b24]" />
          </TransitionLink>
          <div className="hidden items-center gap-8 text-sm text-[#5e695f] md:flex">
            <a href="#why" className="transition-colors hover:text-[#1f2b24]">
              Why it works
            </a>
            <a href="#flow" className="transition-colors hover:text-[#1f2b24]">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-[#1f2b24]">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-[#1f2b24]">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            {user?.id && (
              <button
                onClick={() => {
                  useStore.getState().signOut();
                  toast.success('Session terminated');
                }}
                className="hidden rounded-full border border-[#cfc5b2] px-4 py-2 text-sm font-medium text-[#4f5c53] transition-colors hover:border-[#bcae94] hover:text-[#1f2b24] sm:block"
              >
                Sign out
              </button>
            )}
            <TransitionLink
              to={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#1f2b24] px-5 py-2.5 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2d3a32]"
            >
              {user?.id ? 'Open dashboard' : 'Start free'}
            </TransitionLink>
          </div>
        </div>
      </nav>

      <main id="main-content">
        <section className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36">
          <div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,_rgba(180,137,64,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(62,111,86,0.16),_transparent_36%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 sm:pb-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-center lg:gap-14 lg:px-8">
            <div
              ref={heroRef}
              className={`relative public-fade-up transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d7cebf] bg-[#fff9f0]/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[#5f6b62]">
                <Shield className="h-3.5 w-3.5 text-[#35684f]" />
                Clarity for bills, debt, and cash flow
              </div>
              <p className="max-w-xl text-sm font-medium text-[#5f6b62]">
                Oweable is for people whose finances are real-life messy, not spreadsheet neat.
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-[#1f2b24] sm:text-6xl lg:text-7xl">
                Stop guessing what you owe.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#556157] sm:text-xl">
                Track bills, debt, subscriptions, budgets, and uneven income in one place. Oweable shows what is due,
                what is behind, and what to pay off next, so your money stops running on memory and guesswork.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <TransitionLink
                  to={primaryHref}
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-[#1f2b24] px-7 py-3.5 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2c3931]"
                >
                  {user?.id ? 'Open dashboard' : 'Create free account'}
                  <ArrowRight className="h-4 w-4" />
                </TransitionLink>
                <a
                  href="#flow"
                  className="inline-flex items-center justify-center rounded-full border border-[#d3cabd] px-7 py-3.5 text-sm font-medium text-[#314137] transition-colors hover:border-[#bcae94] hover:bg-[#fff9f0]"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[#5f6b62]">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff9f0] px-3 py-1.5">
                  <Check className="h-4 w-4 text-[#35684f]" />
                  No credit card required
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff9f0] px-3 py-1.5">
                  <Check className="h-4 w-4 text-[#35684f]" />
                  Works in your browser
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff9f0] px-3 py-1.5">
                  <Check className="h-4 w-4 text-[#35684f]" />
                  Built for steady and variable income
                </span>
              </div>
            </div>

            <div
              className={`relative public-fade-up public-delay-1 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-150 ${
                heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
            >
              <div className="absolute inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(179,139,74,0.14),_transparent_55%)] blur-3xl" />
              <div className="relative rounded-[2rem] border border-[#d7cebf] bg-[#fffaf3]/95 p-3 shadow-[0_28px_80px_rgba(49,65,55,0.12)]">
                <HeroPreviewMedia />
              </div>
              <div className="absolute -bottom-3 left-2 right-2 sm:-bottom-4 sm:left-auto sm:right-auto sm:-left-4 rounded-3xl border border-[#d7cebf] bg-[#fff9f0] px-4 py-3 shadow-[0_16px_40px_rgba(49,65,55,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#7a6a54]">This week</p>
                <p className="mt-1 text-sm font-semibold text-[#1f2b24]">3 bills due, 1 overdue, payoff plan still on track</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#ddd3c5] bg-[#f1e7d9]">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 text-sm text-[#47544a] md:grid-cols-3 lg:px-8">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#35684f]" />
                <p>{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why" className="bg-[#f6efe4] py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Why this landing page matters</p>
                <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                  The real problem is not spending. It is financial fog.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-[#57645a]">
                People do not lose money only because they spend too much. They lose money because due dates, balances,
                subscriptions, taxes, and payoff decisions stay fragmented. Oweable should feel like relief the moment the
                page loads.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {painPoints.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                  className="public-hover-lift rounded-[1.75rem] border border-[#d7cebf] bg-[#fffaf3] p-7 sm:p-8 shadow-[0_20px_50px_rgba(49,65,55,0.06)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8efe8] text-[#35684f]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[#1f2b24]">{item.title}</h3>
                    <p className="mt-4 text-base leading-7 text-[#5b685e]">{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="flow"
          className="border-y border-[#ddd3c5] bg-[#f9f4ec] py-24"
        >
          <div
            ref={storyRef}
            className={`mx-auto max-w-7xl px-6 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-8 ${
              storyVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="grid gap-14 lg:grid-cols-[0.94fr_1.06fr] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">How it works</p>
                <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                  One command center for what your money needs next.
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-[#5a675d]">
                  Oweable is strongest when it helps you make the next smart move quickly. That is the experience the
                  landing page should sell, not a wall of disconnected features.
                </p>
                <div className="mt-8 rounded-[1.75rem] border border-[#d7cebf] bg-[#fffaf3] p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Also included</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#f6efe4] p-4">
                      <UploadCloud className="h-5 w-5 text-[#35684f]" />
                      <p className="mt-3 text-sm font-semibold text-[#1f2b24]">Document and bill capture</p>
                      <p className="mt-2 text-sm leading-6 text-[#5f6b62]">Snap paper statements and bring them into the same system.</p>
                    </div>
                    <div className="rounded-2xl bg-[#f6efe4] p-4">
                      <BookOpen className="h-5 w-5 text-[#35684f]" />
                      <p className="mt-3 text-sm font-semibold text-[#1f2b24]">Financial Academy</p>
                      <p className="mt-2 text-sm leading-6 text-[#5f6b62]">Plain-English lessons for the moments when you want more context, not more jargon.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {workflowSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <article
                      key={step.title}
                      className="public-hover-lift rounded-[1.75rem] border border-[#d7cebf] bg-[#fffaf3] p-6 sm:p-7 shadow-[0_20px_50px_rgba(49,65,55,0.05)]"
                    >
                      <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e7efe7] text-[#35684f]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">{step.eyebrow}</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1f2b24]">{step.title}</h3>
                          <p className="mt-3 text-base leading-7 text-[#5b685e]">{step.copy}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f6efe4] py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">What Oweable actually gives you</p>
                <h2 className="mt-4 max-w-lg text-4xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                  Not another budgeting app. A calmer operating system for your money.
                </h2>
                <p className="mt-6 max-w-lg text-lg leading-8 text-[#5b685e]">
                  The redesign should make every section reinforce a single idea: Oweable reduces decision friction by
                  pulling obligations, payoff strategy, and cash flow into one dependable rhythm.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {capabilityColumns.map((column) => {
                  const Icon = column.icon;
                  return (
                    <article
                      key={column.title}
                      className="public-hover-lift rounded-[1.75rem] border border-[#d7cebf] bg-[#fffaf3] p-6 sm:p-7"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e7d9] text-[#35684f]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#1f2b24]">{column.title}</h3>
                      <ul className="mt-5 space-y-3 text-sm leading-6 text-[#5d6a60]">
                        {column.items.map((item) => (
                          <li key={item} className="flex gap-3">
                            <Check className="mt-1 h-4 w-4 shrink-0 text-[#35684f]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#ddd3c5] bg-[#f1e7d9] py-24">
          <div
            ref={audienceRef}
            className={`mx-auto max-w-7xl px-6 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-8 ${
              audienceVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Who it is for</p>
                <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                  Built for real financial lives, not idealized money routines.
                </h2>
              </div>
              <div className="grid gap-5">
                {audienceCards.map((item, index) => (
                  <article
                    key={item.title}
                    className="public-hover-lift grid gap-5 rounded-[1.75rem] border border-[#d0c4b1] bg-[#fff8ef] p-6 sm:p-7 md:grid-cols-[auto_1fr] md:items-start"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f2b24] text-[#f7f2ea]">
                      {index === 0 && <Users className="h-5 w-5" />}
                      {index === 1 && <Shield className="h-5 w-5" />}
                      {index === 2 && <TrendingUp className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#1f2b24]">{item.title}</h3>
                      <p className="mt-3 text-base leading-7 text-[#5b685e]">{item.copy}</p>
                      <p className="mt-4 text-sm font-medium text-[#35684f]">{item.accent}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f6efe4] py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Social proof</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                  The value is emotional before it is technical.
                </h2>
                <p className="mt-6 max-w-lg text-lg leading-8 text-[#5b685e]">
                  When people can see what is due, what is late, and what progress looks like, their money decisions
                  stop feeling like emergencies.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {testimonials.map((item) => (
                  <article
                    key={item.name}
                    className="public-hover-lift flex h-full flex-col justify-between rounded-[1.75rem] border border-[#d7cebf] bg-[#fffaf3] p-6 sm:p-7"
                  >
                    <p className="text-base leading-7 text-[#39463d]">“{item.quote}”</p>
                    <div className="mt-8 border-t border-[#e7ddcf] pt-5">
                      <p className="text-sm font-semibold text-[#1f2b24]">{item.name}</p>
                      <p className="mt-1 text-sm text-[#6a766d]">{item.label}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-[#ddd3c5] bg-[#f9f4ec] py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Pricing</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                Start with the essentials. Upgrade when you want the full system.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <article className="public-hover-lift rounded-[2rem] border border-[#d7cebf] bg-[#fffaf3] p-7 sm:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Free Tracker</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.05em] text-[#1f2b24]">$0</span>
                  <span className="pb-1 text-sm text-[#627066]">per month</span>
                </div>
                <p className="mt-4 max-w-md text-base leading-7 text-[#5b685e]">
                  Start here if you want immediate visibility into bills, due dates, recurring obligations, and core reminders.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[#4f5c53]">
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#35684f]" /> Bill tracking and due-date visibility</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#35684f]" /> Recurring obligations and tickets or fines</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#35684f]" /> Core reminders and settings</li>
                </ul>
              </article>

              <article className="public-hover-lift rounded-[2rem] border border-[#1f2b24] bg-[#1f2b24] p-7 sm:p-8 text-[#f7f2ea] shadow-[0_28px_80px_rgba(31,43,36,0.22)]">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#cbbca4]">Full Suite</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.05em]">$10.99</span>
                  <span className="pb-1 text-sm text-[#c7d0c8]">per month</span>
                </div>
                <p className="mt-4 max-w-md text-base leading-7 text-[#d8dfd9]">
                  Get the complete operating system: debt payoff, budgets, analytics, deeper cash-flow tools, and tax planning when your income needs it.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[#edf0ec]">
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#88c59e]" /> Debt payoff engine with Snowball and Avalanche</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#88c59e]" /> Budgets, analytics, income ledger, and transaction tools</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#88c59e]" /> Tax estimates and reserve planning for variable income</li>
                </ul>
                <p className="mt-6 text-sm text-[#c7d0c8]">Every account starts with a 14-day Full Suite trial. No credit card required.</p>
              </article>
            </div>

            <div className="mt-8">
              <TransitionLink
                to={primaryHref}
                className="inline-flex items-center gap-3 rounded-full bg-[#1f2b24] px-7 py-3.5 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2c3931]"
              >
                {user?.id ? 'Open dashboard' : 'Start free'}
                <ArrowRight className="h-4 w-4" />
              </TransitionLink>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#f6efe4] py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">FAQ</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                A few quick answers before you start.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {faqItems.map((item) => (
                <article
                  key={item.q}
                  className="rounded-[1.75rem] border border-[#d7cebf] bg-[#fffaf3] p-7"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#1f2b24]">{item.q}</h3>
                  <p className="mt-4 text-base leading-7 text-[#5b685e]">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-t border-[#ddd3c5] bg-[#1f2b24] py-24 text-[#f7f2ea]">
          <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#cbbca4]">Final nudge</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              The money stress usually is not mystery. It is missing visibility.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#d8dfd9]">
              Start free, get the whole picture, and make your next decision with more certainty than guesswork.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <TransitionLink
                to={primaryHref}
                className="inline-flex items-center gap-3 rounded-full bg-[#f7f2ea] px-7 py-3.5 text-sm font-medium text-[#1f2b24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#efe6d9]"
              >
                {user?.id ? 'Open dashboard' : 'Create my free account'}
                <ArrowRight className="h-4 w-4" />
              </TransitionLink>
              <TransitionLink
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-[#536157] px-7 py-3.5 text-sm font-medium text-[#f7f2ea] transition-colors hover:bg-[#2d3a32]"
              >
                Compare plans
              </TransitionLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
