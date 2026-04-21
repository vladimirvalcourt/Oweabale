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
    q: 'Is Oweable free to use?',
    a: 'Yes — Oweable includes a free Tracker tier focused on recurring bills and tickets/fines. Full Suite unlocks debt tools, income and transaction ledger features, category budgets, deeper analytics, optional bank sync, and tax planning for $10.99/month.',
  },
  {
    q: 'Is my financial data safe?',
    a: 'Absolutely. We use 256-bit SSL encryption to protect your information in transit, and any connected bank data is strictly read-only through our secure partners. Your data is yours—we never sell it to third parties or use it to target you with ads.',
  },
  {
    q: 'Does it work if I have irregular income?',
    a: 'Yes, and this is exactly where Oweable shines. We built real tools for gig workers and freelancers—including 1099 income tracking, quarterly tax estimation, and flexible budgeting that doesn\'t assume you get a flat W-2 check every two weeks.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No app required. The Oweable dashboard lives securely in your mobile or desktop browser. For capturing paper bills, simply use your phone\'s camera to scan our on-screen QR code—it instantly opens our scanner directly in your mobile browser, no downloads needed.',
  },
  {
    q: 'How is this different from Mint or YNAB?',
    a: 'Most tools stop at envelope budgeting for steady paychecks. Oweable handles your debts (Avalanche/Snowball), your bills, your variable freelance income, and your taxes all in one place. We focus on paying things off and surviving unpredictable cash flow, not just tracking lattes.',
  },
];

function buildFaqItems() {
  return FAQ_ITEMS_BASE;
}

const TESTIMONIALS = [
  {
    quote:
      'DoorDash weeks don’t look like W-2 weeks. I needed something that didn’t assume the same paycheck every Friday — bills and gig income in one dashboard finally felt honest.',
    name: 'The Gig Worker',
    role: 'Juggling freelance income and quarterly taxes with no safety net.',
    region: 'App-based',
    tag: 'Variable income',
    initials: 'GW',
    workType: 'Freelance & Contract',
    platform: 'Multiple Apps',
  },
  {
    quote:
      'I was making minimums and pretending the balances would magically shrink. Seeing a real payoff path and how much interest I was burning changed what I paid every month.',
    name: 'The Debt Climber',
    role: 'Credit card debt stacking up with no clear payoff plan.',
    region: 'Getting organized',
    tag: 'Debt tools',
    initials: 'DC',
    workType: 'W-2 Household',
    platform: 'Multiple Cards',
  },
  {
    quote:
      'The calendar-style view of what hits this week vs next kept me from stacking bills on the same day. Small thing, but it’s the difference between “fine” and overdraft.',
    name: 'The Recent Grad',
    role: 'Student loans, first apartment, first real bills — all at once.',
    region: 'First real career',
    tag: 'Calendar & due soon',
    initials: 'RG',
    workType: 'Entry level W-2',
    platform: 'Navient / First Bank',
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
      <nav className={`fixed top-0 w-full z-50 border-b py-4 transition-colors duration-300 animate-in fade-in slide-in-from-top-4 duration-700 ease-out fill-mode-both delay-100 ${scrolled ? 'bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 border-surface-border' : 'bg-transparent border-transparent'}`}>
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
            <div className="inline-flex items-center gap-2 border border-surface-border bg-surface-raised px-3 py-1.5 mb-8 text-xs font-sans font-medium text-content-secondary rounded-lg animate-in fade-in slide-in-from-bottom-6 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] fill-mode-both">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Bank-grade Security
            </div>

            <p className="text-xs text-content-secondary mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[100ms] fill-mode-both">
              Join <span className="text-content-primary font-medium">3,000+ households and professionals</span> using Oweable to run their money in one place.
            </p>
            
            <h1 className="text-4xl md:text-6xl xl:text-7xl font-sans font-medium tracking-[-0.03em] text-content-primary mb-8 leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[200ms] fill-mode-both">
              Stop Drowning in Bills and Debt —<br />
              Finally See a Way Out.
            </h1>
            
            <p className="text-lg font-medium text-content-secondary max-w-lg leading-[1.6] mb-10 border-l border-surface-border pl-6 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[300ms] fill-mode-both">
              Oweable gives you a single dashboard to track everything you owe, every bill you have, and a clear path to pay it all off — even if you're self-employed.
            </p>
            
            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-6 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[400ms] fill-mode-both">
              <TransitionLink
                to={user?.id ? "/dashboard" : "/onboarding"}
                className="group inline-flex items-center gap-4 bg-brand-cta text-surface-base hover:bg-brand-cta-hover px-8 py-4 text-sm font-sans font-medium shadow-none rounded-lg transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)]"
              >
                {user?.id ? "Open dashboard" : "Start Free — No Credit Card Required"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </TransitionLink>

              <p className="mt-3 text-xs text-content-tertiary">
                See your full financial picture in under 5 minutes.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-content-tertiary">Free Tracker</p>
                  <p className="text-sm font-semibold text-content-primary mt-1">$0 / month</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-content-secondary">
                    <li>Bill tracking and due-date alerts</li>
                    <li>Recurring obligations + tickets/fines</li>
                    <li>Settings and core reminders</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-content-tertiary">Full Suite</p>
                  <p className="text-sm font-semibold text-content-primary mt-1">$10.99 / month</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-content-secondary">
                    <li>Debt payoff engine (Snowball + Avalanche)</li>
                    <li>Income + transaction ledger, budgets, analytics</li>
                    <li>Tax estimation + reserve planning when you need it</li>
                  </ul>
                </div>
              </div>
              <TransitionLink to="/pricing" className="mt-3 inline-flex text-xs text-content-secondary hover:text-content-primary transition-colors">
                View full pricing details
              </TransitionLink>
            </div>
          </div>

          <div className="lg:col-span-5 relative animate-in fade-in zoom-in-[0.98] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[300ms] fill-mode-both">
            <div className="bg-surface-raised border border-surface-border rounded-lg p-1 shadow-none transition-colors duration-500 hover:border-surface-border-subtle">
              <HeroPreviewMedia />
            </div>
            
            {/* Decorative alignment lines */}
            <div className="absolute -left-10 top-0 bottom-0 w-[1px] bg-surface-border hidden xl:block opacity-50"></div>
            <div className="absolute -right-10 top-0 bottom-0 w-[1px] bg-surface-border hidden xl:block opacity-50"></div>
          </div>

        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 border-t border-surface-border bg-surface-raised mb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
            <h3 className="text-sm font-medium tracking-wide text-content-secondary uppercase mb-6">Trusted by 3,000+ users to get out of debt</h3>
            <div className="flex flex-col md:flex-row items-center gap-6 justify-center w-full max-w-4xl">
              
              <div className="flex-1 max-w-[280px]">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-xs text-content-secondary italic mb-2">"Finally stopped paying late fees. A lifesaver for my messy bills."</p>
                <p className="text-[10px] uppercase tracking-wider text-content-tertiary">— Sarah, W-2 & Side Gigs</p>
              </div>

               <div className="hidden md:block w-px h-12 bg-surface-border"></div>

              <div className="flex-1 max-w-[280px]">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-xs text-content-secondary italic mb-2">"The Debt Detonator paid for itself in one month. Unreal."</p>
                <p className="text-[10px] uppercase tracking-wider text-content-tertiary">— Mark T., $12k in Credit Cards</p>
              </div>

              <div className="hidden md:block w-px h-12 bg-surface-border"></div>

              <div className="flex-1 max-w-[280px]">
                 <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-xs text-content-secondary italic mb-2">"No app to download, just snap a picture of the bill. So easy."</p>
                <p className="text-[10px] uppercase tracking-wider text-content-tertiary">— Jessica R., Freelancer</p>
              </div>

            </div>
        </div>
      </section>

      {/* Core Features by Goal */}
      <section id="features" className="py-24 border-t border-surface-border bg-surface-base relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8" ref={archRef}>
          <div className={`mb-16 transition-all duration-1000 ease-out ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mb-4">
              Everything to manage what you owe
            </h2>
            <p className="text-sm text-content-secondary max-w-2xl mb-6 leading-relaxed">
              Oweable isn't just about simple tracking. It’s built to actually get you ahead, whether you’re destroying debt, stabilizing bills, or managing irregular income.
            </p>
            <div className="w-full h-px bg-surface-border" />
          </div>

          <div className="space-y-16">
            
            {/* Group 1: Debt Payoff */}
            <div className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[100ms] ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-6 flex items-center gap-4">
                 <div className="h-10 w-10 shrink-0 bg-brand-primary/10 text-brand-primary flex items-center justify-center rounded-lg border border-brand-primary/20">
                   <Target className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-medium tracking-tight text-content-primary">Debt Payoff Engine</h3>
                    <p className="text-sm text-content-secondary">Finally see a clear path to zero balance.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Track Everything</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Credit cards, personal loans, medical debt, and auto loans—all your balances and interest rates in one place.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Strategy Visualizer</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Switch between Avalanche (save interest) or Snowball (build momentum) and see the exact month you'll be debt-free.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Progress Tracker</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Watch the principal shrink with every payment. The dashboard recalculates automatically as you go.</p>
                </div>
              </div>
            </div>

            {/* Group 2: Bill Control */}
            <div className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[200ms] ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-6 flex items-center gap-4">
                 <div className="h-10 w-10 shrink-0 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-lg border border-blue-500/20">
                   <CalendarClock className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-medium tracking-tight text-content-primary flex items-center gap-3">
                      Bill Control
                      <span className="inline-flex items-center rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                        ✨ No App Download Required
                      </span>
                    </h3>
                    <p className="text-sm text-content-secondary">Stop late fees and organize your monthly burn rate.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Recurring Management</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Alerts for upcoming rent, utilities, and subscriptions. Never miss a due date again.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised border-indigo-500/20">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Instant OCR Capture</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Scan a QR code to upload paper bills or receipts straight from your phone's browser. It extracts the dates and amounts automatically.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Shared Expenses</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Split bills and track who owes what for household utilities or group trips.</p>
                </div>
              </div>
            </div>

            {/* Group 3: Income & Tax */}
            <div className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[300ms] ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-6 flex items-center gap-4">
                 <div className="h-10 w-10 shrink-0 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-lg border border-emerald-500/20">
                   <TrendingUp className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-medium tracking-tight text-content-primary">Income & Tax (For the Self-Employed)</h3>
                    <p className="text-sm text-content-secondary">You don't need a steady paycheck to use a steady plan.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Gig Worker Tracking</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Log irregular 1099 income from Uber, DoorDash, Upwork, or clients directly alongside your expenses.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Quarterly Tax Estimation</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Oweable automatically projects your estimated tax reserves so you aren't surprised by the IRS.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Irregular Budgeting</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Budgeting tools built for cash flow that changes month-to-month, not just flat bi-weekly salaries.</p>
                </div>
              </div>
            </div>

          </div>
          
          <div className="mt-16 text-center">
             <TransitionLink
                to={user?.id ? "/dashboard" : "/onboarding"}
                className="group inline-flex items-center gap-4 bg-surface-raised border border-surface-border text-content-primary hover:bg-content-primary/[0.04] px-8 py-4 text-sm font-sans font-medium shadow-none rounded-lg transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_4px_24px_rgba(255,255,255,0.05)]"
              >
                {user?.id ? "Open dashboard" : "Start Free — No Credit Card Required"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </TransitionLink>
          </div>

        </div>
      </section>

      {/* Personas ("Who It's For") */}
      <section id="stories" className="py-24 border-t border-surface-border bg-surface-base">
        <div className="max-w-7xl mx-auto px-6 lg:px-8" ref={testimonialsRef}>
          <div
            className={`mb-12 transition-all duration-1000 ease-out ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="text-xs font-sans font-medium text-content-secondary">Who It's For</span>
            <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mt-4 mb-3">
              Built for real financial situations
            </h2>
            <p className="text-content-secondary max-w-2xl leading-relaxed text-sm">
              Whether you need to get out of the red, build a cushion, or tame unpredictable income, Oweable bends to fit how you make and manage money.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors flex flex-col h-full"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-full border border-surface-border bg-black text-content-primary flex items-center justify-center font-semibold shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-content-primary tracking-tight">{t.name}</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs text-content-secondary mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" aria-hidden />
                      {t.tag}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-content-primary mb-4">{t.role}</p>
                
                <div className="flex-1">
                  <p className="text-sm text-content-secondary italic leading-relaxed">
                    "{t.quote}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 border-t border-surface-border bg-surface-base">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16 text-center">
            <span className="text-xs font-sans font-medium text-content-secondary">Compare</span>
            <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mt-4 mb-3">
              Why Oweable?
            </h2>
            <p className="text-sm text-content-secondary max-w-2xl mx-auto leading-relaxed">
              Oweable is the only platform that combines heavy-duty debt payoff, no-app document capture, and gig worker tax tracking in one clean dashboard.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="py-4 px-6 border-b border-surface-border font-medium text-sm text-content-secondary">Feature</th>
                  <th className="py-4 px-6 border-b border-surface-border font-bold text-sm text-content-primary w-1/5">Oweable</th>
                  <th className="py-4 px-6 border-b border-surface-border font-medium text-sm text-content-tertiary w-1/5">YNAB</th>
                  <th className="py-4 px-6 border-b border-surface-border font-medium text-sm text-content-tertiary w-1/5">Monarch</th>
                  <th className="py-4 px-6 border-b border-surface-border font-medium text-sm text-content-tertiary w-1/5">Copilot</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="hover:bg-content-primary/[0.02]">
                  <td className="py-4 px-6 border-b border-surface-border text-content-primary">Avalanche & Snowball Debt Payoff Engine</td>
                  <td className="py-4 px-6 border-b border-surface-border text-brand-primary">Yes</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">Limited</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                </tr>
                <tr className="hover:bg-content-primary/[0.02]">
                  <td className="py-4 px-6 border-b border-surface-border text-content-primary">No-App OCR Document Capture</td>
                  <td className="py-4 px-6 border-b border-surface-border text-brand-primary">Yes</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                </tr>
                <tr className="hover:bg-content-primary/[0.02]">
                  <td className="py-4 px-6 border-b border-surface-border text-content-primary">Gig Worker Tax Tracking & Estimation</td>
                  <td className="py-4 px-6 border-b border-surface-border text-brand-primary">Yes</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                </tr>
                <tr className="hover:bg-content-primary/[0.02]">
                  <td className="py-4 px-6 border-b border-surface-border text-content-primary">Zero-Based Envelope Budgeting</td>
                  <td className="py-4 px-6 border-b border-surface-border text-brand-primary">Yes</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">Yes</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">Yes</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">Yes</td>
                </tr>
                 <tr className="hover:bg-content-primary/[0.02]">
                  <td className="py-4 px-6 border-b border-surface-border text-content-primary">Free Tier for Tracking Bills</td>
                  <td className="py-4 px-6 border-b border-surface-border text-brand-primary">Yes</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                  <td className="py-4 px-6 border-b border-surface-border text-content-tertiary">No</td>
                </tr>
              </tbody>
            </table>
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

      {/* Trust & Security Section */}
      <section className="py-24 border-t border-surface-border bg-surface-raised mb-12">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-surface-base border border-surface-border rounded-full flex items-center justify-center mb-6 text-brand-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-content-primary mb-4">Bank-Grade Security & Privacy</h2>
            <p className="text-content-secondary leading-relaxed max-w-2xl mb-8">
              We understand you are trusting us with your financial truth. Oweable uses 256-bit SSL encryption to protect your data. If you choose to connect a bank, we use secure read-only connections via Plaid. We never see your bank credentials, and we never sell your personal data.
            </p>
            <TransitionLink to="/security" className="text-sm font-medium text-brand-primary hover:text-brand-primary-hover transition-colors inline-flex items-center gap-2">
              Read our full security policy <ArrowRight className="w-4 h-4" />
            </TransitionLink>
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
            {buildFaqItems().map((item, i) => (
              <div key={i} className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors">
                <h3 className="text-sm font-medium tracking-tight text-content-primary mb-3">{item.q}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Block */}
      <section className="py-32 border-t border-surface-border bg-surface-base text-center overflow-hidden relative">
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-brand-cta/5 blur-[120px] rounded-full -z-10 animate-pulse-highlight"></div>
          <h2 className="text-4xl font-semibold tracking-tight text-content-primary mb-6">
            Ready to get out of the red?
          </h2>
          <p className="text-lg text-content-secondary mb-10">
            Join thousands of users organizing their bills, paying down debt, and building genuine momentum.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <TransitionLink
              to={user?.id ? "/dashboard" : "/onboarding"}
              className="group inline-flex items-center gap-4 bg-brand-cta text-surface-base hover:bg-brand-cta-hover px-10 py-5 text-sm font-sans font-medium shadow-none rounded-lg transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)]"
            >
              {user?.id ? "Open dashboard" : "Start Free — No Credit Card Required"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </TransitionLink>
            <p className="text-xs text-content-tertiary">
              See your full financial picture in under 5 minutes.
            </p>
          </div>
        </div>
      </section>

      <Footer />
      </main>
    </div>
  );
}
