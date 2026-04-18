import React, { useState, useEffect, useRef } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import { ArrowRight, UploadCloud, Target, BarChart2, TrendingUp, BookOpen, CalendarClock, Quote } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { useSEO } from '../hooks/useSEO';
import { isPlaidLinkUiEnabled } from '../lib/featureFlags';

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

const CYCLE_WORDS = [
  'Anyone with Debt',
  'Uber Drivers',
  'Paying Bills',
  'Managing Debt',
  'Building Stability',
  'DoorDashers',
  'Financial Freedom'
];

function WordCycler() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CYCLE_WORDS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const longestWord = CYCLE_WORDS.reduce((a, b) => a.length > b.length ? a : b);

  return (
    <span className="inline-grid grid-cols-1 grid-rows-1 relative text-left align-baseline min-h-[1.1em]">
      {/* Invisible spacer reserves width/height so cycling copy does not shift layout */}
      <span className="col-start-1 row-start-1 invisible pointer-events-none select-none pr-1">
        {longestWord}.
      </span>
      
      {reduceMotion ? (
        <span className="text-content-primary col-start-1 row-start-1 inline-block">{CYCLE_WORDS[index]}.</span>
      ) : (
        <AnimatePresence mode="wait">
          <motion.span
            key={CYCLE_WORDS[index]}
            initial={{ y: '10%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-10%', opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="text-content-primary col-start-1 row-start-1 inline-block"
          >
            {CYCLE_WORDS[index]}.
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  );
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
    a: 'Yes — Oweable includes a free Tracker tier for core account and bill tracking. Full Suite unlocks advanced tools like the debt payoff planner, subscription alerts, and freelancer tax workflows for $10.99/month.',
  },
  {
    q: 'How is Oweable different from YNAB or Mint?',
    a: 'YNAB and Mint are built for people with stable, predictable salaries. Oweable is built for real financial situations — multiple debt types, tight budgets, variable income, and financial recovery. It includes debt amortization, credit tracking, bill overdue detection, net worth projection, subscription price-hike alerts, and tax tools for gig workers — features those apps never offered.',
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
  },
  {
    quote:
      'I was making minimums and pretending the balances would magically shrink. Seeing a real payoff path and how much interest I was burning changed what I paid every month.',
    name: 'James K.',
    role: 'Credit card & medical debt payoff',
    region: 'Pennsylvania',
    tag: 'Debt tools',
  },
  {
    quote:
      'DoorDash weeks don’t look like W-2 weeks. I needed something that didn’t assume the same paycheck every Friday — bills and gig income in one dashboard finally felt honest.',
    name: 'Marcus T.',
    role: 'Gig driver + part-time retail',
    region: 'Ohio',
    tag: 'Variable income',
  },
  {
    quote:
      'I’d photograph bills and never type them in. Uploading a statement and having amounts and dates pulled into review meant I actually closed the loop instead of hoarding PDFs.',
    name: 'Priya M.',
    role: 'Self-employed, design',
    region: 'Washington',
    tag: 'Document scanning',
  },
  {
    quote:
      'We lived in a spreadsheet nobody opened. One screen for net worth, what we owe, and what’s coming due this week — my partner and I finally argue about plans, not about where the numbers live.',
    name: 'Alex C.',
    role: 'Couple, migrated from spreadsheets',
    region: 'Florida',
    tag: 'One dashboard',
  },
  {
    quote:
      'The calendar-style view of what hits this week vs next kept me from stacking bills on the same day. Small thing, but it’s the difference between “fine” and overdraft.',
    name: 'Jordan L.',
    role: 'Single parent, shift work',
    region: 'Georgia',
    tag: 'Calendar & due soon',
  },
] as const;

export default function Landing() {
  useSEO({
    title: 'Oweable — Financial OS for Debt, Bills & Financial Clarity',
    description: 'Oweable is the financial operating system for anyone dealing with debt, bills, or financial pressure. Track spending, pay off debt, manage bills, and build net worth — all in one dashboard.',
    canonical: 'https://www.oweable.com/',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const [scrolled, setScrolled] = useState(false);
  const user = useStore((state) => state.user);
  
  const [heroRef, heroVisible] = useInView(0.1);
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
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-white/15 flex flex-col">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 border-b py-4 transition-colors duration-300 ${scrolled ? 'bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 border-surface-border' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <TransitionLink to="/" className="brand-header-text flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
            Oweable
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
                className="hidden sm:block px-6 py-2 bg-transparent border border-surface-border text-content-secondary hover:text-content-primary hover:bg-white/[0.04] text-sm font-sans font-medium transition-colors rounded-lg"
              >
                Sign out
              </button>
            )}
            <TransitionLink 
              to={user?.id ? "/dashboard" : "/auth"} 
              className="px-6 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-sm font-sans font-medium shadow-none transition-colors"
            >
              {user?.id ? "Open dashboard" : "Sign in"}
            </TransitionLink>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 lg:pt-40 pb-12 sm:pb-20 px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div ref={heroRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-32 items-center">
          
          <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-12">
            <div className="inline-flex items-center gap-2 border border-surface-border bg-surface-raised px-3 py-1.5 mb-8 text-xs font-sans font-medium text-content-secondary rounded-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Bank-grade Security
            </div>
            
            <h1 className="text-4xl md:text-6xl xl:text-7xl font-sans font-medium tracking-[-0.03em] text-content-primary mb-8 leading-[1.05]">
              The Operating System<br/>
              <span className="whitespace-nowrap inline-flex items-baseline gap-[0.2em]">
                for <WordCycler />
              </span>
            </h1>
            
            <p className="text-lg font-medium text-content-secondary max-w-lg leading-[1.6] mb-10 border-l border-surface-border pl-6">
              A precision command center to tame your bills, eliminate debt, track your income, and build financial clarity — no matter where you're starting from.
            </p>
            
            <TransitionLink 
              to={user?.id ? "/dashboard" : "/auth"} 
              className="group flex items-center gap-4 bg-white text-black hover:bg-neutral-200 px-8 py-4 text-sm font-sans font-medium shadow-none rounded-lg transition-colors"
            >
              {user?.id ? "Open dashboard" : "Get started for free"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </TransitionLink>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="bg-surface-raised border border-surface-border rounded-lg p-1 shadow-none">
              <div className="bg-surface-elevated border border-surface-border rounded-[6px] p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-surface-border pb-4">
                  <span className="text-xs font-sans font-medium text-content-tertiary">Account balances</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-content-secondary">
                    <path d="M17 3a2 2 0 0 1 1.492 0.668l0.108 0.132 3.704 4.939a2 2 0 0 1 -0.012 2.416l-0.108 0.13 -9.259 10.184a1.25 1.25 0 0 1 -1.753 0.096l-0.097 -0.096 -9.259 -10.185a2 2 0 0 1 -0.215 -2.407l0.095 -0.138L5.4 3.8a2 2 0 0 1 1.43 -0.793L7 3zm-2.477 8H9.477L12 17.307zm5.217 0h-3.063l-2.406 6.015zM7.323 11H4.261l5.468 6.015zm5.059 -6h-0.764l-2 4h4.764zM17 5h-2.382l2 4H20zM9.382 5H7L4 9h3.382z"></path>
                  </svg>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs section-label normal-case text-content-secondary border-b border-surface-border child:pb-3">
                        <th className="font-normal w-1/3">Account</th>
                        <th className="font-normal text-right">Trend / Status</th>
                        <th className="font-normal text-right">Tax Est.</th>
                        <th className="font-normal text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="text-content-primary text-sm font-mono tabular-nums">
                      <tr className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-2.5">Uber / Lyft Inflow</td>
                        <td className="text-right text-emerald-500 py-2.5">+12%</td>
                        <td className="text-right text-rose-400 py-2.5">22.5%</td>
                        <td className="text-right py-2.5">$2,450</td>
                      </tr>
                      <tr className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-2.5">Savings Account</td>
                        <td className="text-right text-emerald-500 py-2.5">+2.1%</td>
                        <td className="text-right text-content-tertiary py-2.5">—</td>
                        <td className="text-right py-2.5">$45,230</td>
                      </tr>
                      <tr className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-2.5">Stock Portfolio</td>
                        <td className="text-right text-emerald-500 py-2.5">+5.0%</td>
                        <td className="text-right text-content-tertiary py-2.5">—</td>
                        <td className="text-right py-2.5">$124,550</td>
                      </tr>
                      <tr className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-2.5">Tax Reserve (Shield)</td>
                        <td className="text-right py-2.5">
                          <span className="inline-flex items-center justify-end gap-2 w-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                            <span className="text-content-secondary font-sans text-xs uppercase tracking-wide">Active</span>
                          </span>
                        </td>
                        <td className="text-right text-content-tertiary py-2.5">—</td>
                        <td className="text-right text-emerald-500 py-2.5">$8,400</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-surface-border mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-content-tertiary mb-1">Total net worth</span>
                    <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-content-primary data-numeric">$181,838</span>
                  </div>
                  <div className="flex gap-1 h-8 items-end w-32">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-white/20 hover:bg-white/35 transition-colors rounded-lg" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
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
              Built for clarity
            </h2>
            <div className="w-full h-px bg-surface-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Target,
                title: "Debt Detonator",
                desc: "Full Suite feature. Choose Avalanche (highest interest first) or Snowball (smallest balance first). Get your exact debt-free date, total interest saved, and a month-by-month payoff schedule for every debt."
              },
              {
                icon: CalendarClock,
                title: "Bill Command Center",
                desc: "Tracker + Full Suite. Track recurring bills with due dates and auto-overdue detection so nothing slips. Full Suite adds synced workflows and deeper automation."
              },
              {
                icon: TrendingUp,
                title: "Net Worth Engine",
                desc: "Tracker + Full Suite. Real-time net worth from assets minus liabilities with trend visibility so you can see where you're headed."
              },
              {
                icon: BarChart2,
                title: "Spending Intelligence",
                desc: "Tracker + Full Suite. Spending by category, income vs expenses, and cash-flow visibility built from your data."
              },
              {
                icon: UploadCloud,
                title: "Document Scanning",
                desc: "Tracker + Full Suite. Upload receipts and statements, then review extracted biller, amount, and due date before saving."
              },
              {
                icon: BookOpen,
                title: "Financial Academy",
                desc: "Full Suite feature. Self-paced tracks covering budgeting, debt payoff, credit, and taxes with saved progress."
              }
            ].map((feat, i) => (
              <div
                key={i}
                className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-white/[0.02] transition-colors"
              >
                <feat.icon className="w-5 h-5 text-content-secondary mb-4" />
                <h3 className="text-lg font-medium tracking-tight text-content-primary mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-content-secondary leading-relaxed">
                  {feat.desc}
                </p>
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
              Real situations we hear about most: bill due dates, debt payoff, irregular paychecks, and getting scattered documents into one workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <figure
                key={i}
                className="border border-surface-border rounded-lg p-8 lg:p-10 bg-surface-raised hover:bg-white/[0.02] transition-colors flex flex-col h-full"
              >
                <Quote className="w-5 h-5 text-content-tertiary mb-4 shrink-0" aria-hidden />
                <blockquote className="text-sm text-content-secondary leading-relaxed flex-1 mb-6">
                  <span className="text-content-primary/90">&ldquo;{t.quote}&rdquo;</span>
                </blockquote>
                <figcaption className="mt-auto pt-4 border-t border-surface-border">
                  <span className="inline-flex items-center gap-2 text-xs font-sans font-medium text-content-secondary mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" aria-hidden />
                    {t.tag}
                  </span>
                  <p className="text-sm font-medium text-content-primary">{t.name}</p>
                  <p className="text-xs text-content-tertiary mt-1 leading-relaxed">{t.role}</p>
                  <p className="text-xs text-content-tertiary mt-2">{t.region}</p>
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
                Oweable is a financial operating system for anyone dealing with debt, bills, or financial pressure. It consolidates bill tracking, debt payoff planning, income management, credit tools, and net worth monitoring into a single dashboard — replacing spreadsheets and disconnected apps.
              </p>
              <p className="text-content-secondary leading-relaxed">
                Unlike consumer finance tools built only for people with predictable salaries, Oweable works for real financial situations — variable income, multiple debt types, tight budgets, and the messy middle ground most people actually live in. It also includes quarterly tax tools for gig workers and 1099 contractors.
              </p>
              <p className="text-content-secondary leading-relaxed">
                Oweable serves single parents juggling bills, people recovering from medical or credit card debt, gig workers, recent grads with student loans, and anyone who needs a clear picture of where they stand financially — and a plan to get ahead.
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
              <div key={i} className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-white/[0.02] transition-colors">
                <h3 className="text-sm font-medium tracking-tight text-content-primary mb-3">{item.q}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
