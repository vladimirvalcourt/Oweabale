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
  Shield,
  CreditCard,
  Users,
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
    a: 'Absolutely. We use AES-256 encryption at rest and TLS 1.2+ in transit to protect your information. Any connected bank data is strictly read-only through our secure partners. Your data is yours—we never sell it to third parties or use it to target you with ads.',
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
    title: 'Oweable — Stop Losing Money to Bills, Debt & Late Fees',
    description:
      'Oweable tracks your bills, debts, subscriptions, and budgets in one place — with overdue alerts, debt payoff plans, and tax estimates for gig and self-employed income. Sign up free.',
    ogTitle: 'Oweable — Stop Losing Money to Bills, Debt & Late Fees',
    ogDescription:
      'Finally know exactly what you owe and when. Track everything in one dashboard with automatic alerts and clear payoff strategies. No credit card required.',
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
                Sign Out
              </button>
            )}
            <TransitionLink 
              to={user?.id ? "/dashboard" : "/onboarding"} 
              className="px-6 py-2 rounded-lg bg-brand-cta text-surface-base hover:bg-brand-cta-hover text-sm font-sans font-medium shadow-none transition-colors"
            >
              {user?.id ? "Open dashboard" : "Start Free"}
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
              AES-256 + TLS 1.2+ Encryption
            </div>

            <p className="text-xs text-content-secondary mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[100ms] fill-mode-both">
              Join <span className="text-content-primary font-medium">3,000+ households and professionals</span> using Oweable to run their money in one place.
            </p>
            
            <h1 className="text-4xl md:text-6xl xl:text-7xl font-sans font-medium tracking-[-0.03em] text-content-primary mb-8 leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[200ms] fill-mode-both">
              Finally know exactly what you owe — and when.
            </h1>
            
            <p className="text-lg font-medium text-content-secondary max-w-lg leading-[1.6] mb-10 border-l border-surface-border pl-6 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[300ms] fill-mode-both">
              Oweable tracks your bills, debts, subscriptions, and budgets in one place — with overdue alerts, debt payoff plans, and tax estimates for gig and self-employed income. Start free with a 14-day Full Suite trial, no credit card required.
            </p>
            
            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-6 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[400ms] fill-mode-both">
              <TransitionLink
                to={user?.id ? "/dashboard" : "/onboarding"}
                className="group inline-flex items-center gap-4 bg-brand-cta text-surface-base hover:bg-brand-cta-hover px-8 py-4 text-sm font-sans font-medium shadow-none rounded-lg transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)]"
              >
                {user?.id ? "Open dashboard" : "Get Started Free"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </TransitionLink>

              <div className="mt-4 flex items-center gap-4">
                <TransitionLink to="/pricing" className="text-sm text-content-secondary hover:text-content-primary transition-colors">
                  See how it works →
                </TransitionLink>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-content-tertiary">Free Tracker</p>
                  <p className="text-sm font-semibold text-content-primary mt-1">$0 / month</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-content-secondary">
                    <li>Bill tracking and due-date alerts</li>
                    <li>Recurring obligations + tickets/fines</li>
                    <li>Settings and core reminders</li>
                  </ul>
                  <p className="mt-3 text-[10px] text-content-tertiary italic">Includes 14-day Full Suite trial — no card needed</p>
                </div>
                <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-content-tertiary">Full Suite</p>
                  <p className="text-sm font-semibold text-content-primary mt-1">$10.99 / month</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-content-secondary">
                    <li>Debt payoff engine (Snowball + Avalanche)</li>
                    <li>Income + transaction ledger, budgets, analytics</li>
                    <li>Tax estimation + reserve planning when you need it</li>
                  </ul>
                  <p className="mt-3 text-[10px] text-content-tertiary italic">Start with 14-day free trial, then $10.99/mo or $92.32/yr (save 30%)</p>
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

      {/* Trust Bar */}
      <section className="py-8 border-t border-b border-surface-border bg-surface-raised">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-content-secondary">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Enterprise-level encryption</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-surface-border"></div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              <span>Optional bank sync</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-surface-border"></div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-surface-border"></div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Your data is never sold</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features by Goal */}
      <section id="features" className="py-24 border-t border-surface-border bg-surface-base relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8" ref={archRef}>
          <div className={`mb-16 transition-all duration-1000 ease-out ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mb-4">
              Everything you need to stay on top of your money
            </h2>
            <div className="w-full h-px bg-surface-border" />
          </div>

          <div className="space-y-16">
            
            {/* Pillar 1: Never miss a bill */}
            <div className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[100ms] ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-6 flex items-center gap-4">
                 <div className="h-10 w-10 shrink-0 bg-brand-primary/10 text-brand-primary flex items-center justify-center rounded-lg border border-brand-primary/20">
                   <CalendarClock className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-medium tracking-tight text-content-primary">Never miss a bill or payment again</h3>
                    <p className="text-sm text-content-secondary">Track every bill, debt, fine, and subscription with automatic overdue detection.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Build a real debt payoff plan</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Use Snowball or Avalanche strategies to see exactly when you'll be debt-free and how much interest you'll save.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Capture bills instantly</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Use your phone camera to scan paper bills — no app required. OCR extracts dates and amounts automatically.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Automatic overdue alerts</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Get notified before bills go late. Never pay another late fee again.</p>
                </div>
              </div>
            </div>

            {/* Pillar 2: Spend with confidence */}
            <div className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[200ms] ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-6 flex items-center gap-4">
                 <div className="h-10 w-10 shrink-0 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-lg border border-blue-500/20">
                   <BarChart2 className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-medium tracking-tight text-content-primary">Spend with confidence, not anxiety</h3>
                    <p className="text-sm text-content-secondary">Set category budgets with guardrails and rollover options.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Log all income sources</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Track W-2, freelance, gig work, or mixed income streams in one place.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Automatic tax estimates</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Get reserve calculations so you're never blindsided at tax time.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Budget guardrails</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Stay on track with smart spending limits that adapt to your cash flow.</p>
                </div>
              </div>
            </div>

            {/* Pillar 3: See your complete financial health */}
            <div className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] delay-[300ms] ${archVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-6 flex items-center gap-4">
                 <div className="h-10 w-10 shrink-0 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-lg border border-emerald-500/20">
                   <TrendingUp className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-medium tracking-tight text-content-primary">See your complete financial health at a glance</h3>
                    <p className="text-sm text-content-secondary">Track net worth, investments, and insurance in one dashboard.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Monitor your credit score</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Build your credit with our Credit Workshop tools and tracking features.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">OCR document capture</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">Scan, upload, and store receipts, invoices, and statements securely.</p>
                </div>
                <div className="border border-surface-border rounded-lg p-6 bg-surface-raised">
                  <h4 className="text-sm font-medium text-content-primary mb-2">Investment & insurance views</h4>
                  <p className="text-xs text-content-secondary leading-relaxed">See your full financial picture including assets and coverage.</p>
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

      {/* Who It's For Section */}
      <section id="stories" className="py-24 border-t border-surface-border bg-surface-base">
        <div className="max-w-7xl mx-auto px-6 lg:px-8" ref={testimonialsRef}>
          <div
            className={`mb-12 transition-all duration-1000 ease-out ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="text-xs font-sans font-medium text-content-secondary">Who It's For</span>
            <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mt-4 mb-3">
              Built for real financial lives — not just spreadsheet people
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full border border-surface-border bg-black text-content-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-1 text-white">
                    <circle cx="24" cy="17" r="9" fill="currentColor" />
                    <path d="M14 36C14 31 18 27 24 27C30 27 34 31 34 36" stroke="currentColor" strokeWidth="2" fill="none" />
                    <rect x="18" y="13" width="12" height="7" rx="1.5" fill="white" stroke="currentColor" strokeWidth="0.5" />
                    <path d="M20 16L22 18.5L20 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M26 16L28 18.5L26 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-content-primary tracking-tight">Salaried & W-2 Workers</h3>
                </div>
              </div>
              <p className="text-sm text-content-secondary leading-relaxed">
                Budget by paycheck, track every bill, and watch your net worth grow — all in one place.
              </p>
            </div>

            <div className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full border border-surface-border bg-black text-content-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-1 text-white">
                    <circle cx="24" cy="18" r="9" fill="currentColor" />
                    <path d="M14 36C14 31 18 27 24 27C30 27 34 31 34 36" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M18 14C18 14 20 10 24 10C28 10 30 14 30 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="24" cy="13" r="2" fill="white" />
                    <path d="M30 12L34 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-content-primary tracking-tight">Gig Workers & Freelancers</h3>
                </div>
              </div>
              <p className="text-sm text-content-secondary leading-relaxed">
                Irregular income? No problem. Estimate your taxes, manage what you owe, and stop getting caught off guard.
              </p>
            </div>

            <div className="border border-surface-border rounded-lg p-8 bg-surface-raised hover:bg-content-primary/[0.02] transition-colors flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full border border-surface-border bg-black text-content-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-1 text-white">
                    <circle cx="20" cy="19" r="7" fill="currentColor" />
                    <path d="M12 34C12 30 15 27 20 27C24 27 27 29 28.5 32" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="32" cy="23" r="5.5" fill="currentColor" />
                    <path d="M26 34C26 31 28 28 32 28C36 28 38 31 38 34" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-content-primary tracking-tight">Families & Households</h3>
                </div>
              </div>
              <p className="text-sm text-content-secondary leading-relaxed">
                One dashboard for shared bills, debt payoff goals, and your entire household budget.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 border-t border-surface-border bg-surface-raised">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mb-12">
            People are finally getting a handle on their money
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="border border-surface-border rounded-lg p-8 bg-surface-base">
              <p className="text-sm text-content-secondary italic leading-relaxed mb-4">
                "Finally stopped paying late fees. The automatic alerts saved me hundreds."
              </p>
              <p className="text-xs text-content-tertiary">— Sarah, W-2 & Side Gigs</p>
            </div>

            <div className="border border-surface-border rounded-lg p-8 bg-surface-base">
              <p className="text-sm text-content-secondary italic leading-relaxed mb-4">
                "Paid off $12k in credit cards using the Avalanche strategy. Life-changing."
              </p>
              <p className="text-xs text-content-tertiary">— Mark T., Freelance Designer</p>
            </div>

            <div className="border border-surface-border rounded-lg p-8 bg-surface-base">
              <p className="text-sm text-content-secondary italic leading-relaxed mb-4">
                "No app to download, just scan bills with my phone camera. So simple."
              </p>
              <p className="text-xs text-content-tertiary">— Jessica R., Small Business Owner</p>
            </div>
          </div>

          <p className="mt-12 text-sm text-content-secondary">
            Thousands of households tracking over $2M in debt payoff progress.
          </p>
        </div>
      </section>

      {/* Financial Academy Section */}
      <section className="py-24 border-t border-surface-border bg-surface-base">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <BookOpen className="w-12 h-12 text-brand-primary mx-auto mb-6" />
          <h2 className="text-3xl font-sans font-semibold tracking-tight text-content-primary mb-4">
            Free Financial Academy — Learn in Plain English
          </h2>
          <p className="text-sm text-content-secondary leading-relaxed max-w-2xl mx-auto mb-8">
            Not sure where to start? Oweable's self-paced Financial Academy covers budgeting, debt payoff strategies, credit building, and more — written for real people, not finance majors. It's completely free with your account.
          </p>
          <TransitionLink to="/education" className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary-hover transition-colors">
            Explore the Academy →
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

      {/* Bottom CTA Section */}
      <section className="py-32 border-t border-surface-border bg-surface-base text-center overflow-hidden relative">
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-brand-cta/5 blur-[120px] rounded-full -z-10 animate-pulse-highlight"></div>
          <h2 className="text-4xl font-semibold tracking-tight text-content-primary mb-6">
            Your finances won't fix themselves. But Oweable makes it a lot easier.
          </h2>
          <p className="text-lg text-content-secondary mb-10">
            Join free today. No credit card. No app download. Just clarity.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <TransitionLink
              to={user?.id ? "/dashboard" : "/onboarding"}
              className="group inline-flex items-center gap-4 bg-brand-cta text-surface-base hover:bg-brand-cta-hover px-10 py-5 text-sm font-sans font-medium shadow-none rounded-lg transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)]"
            >
              {user?.id ? "Open dashboard" : "Create My Free Account"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </TransitionLink>
          </div>
        </div>
      </section>

      <Footer />
      </main>
    </div>
  );
}
