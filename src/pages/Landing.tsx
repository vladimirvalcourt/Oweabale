import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { ArrowRight, UploadCloud, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { useSEO } from '../hooks/useSEO';

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

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CYCLE_WORDS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const longestWord = CYCLE_WORDS.reduce((a, b) => a.length > b.length ? a : b);

  return (
    <span className="inline-grid grid-cols-1 grid-rows-1 relative text-left align-baseline">
      {/* Invisible spacer to maintain width based on longest word */}
      <span className="col-start-1 row-start-1 opacity-0 pointer-events-none select-none h-0 sm:h-auto overflow-hidden pr-1">
        {longestWord}.
      </span>
      
      <AnimatePresence mode="wait">
        <motion.span
          key={CYCLE_WORDS[index]}
          initial={{ y: '10%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-10%', opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="text-brand-violet col-start-1 row-start-1 inline-block"
        >
          {CYCLE_WORDS[index]}.
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const FAQ_ITEMS = [
  {
    q: 'Who is Oweable designed for?',
    a: 'Oweable is for anyone dealing with debt, bills, or financial pressure — whether you\'re paying off credit cards, juggling monthly bills on a tight income, recovering from medical debt, or just trying to build stability. Gig workers, salaried employees, single parents, recent grads, and anyone who needs clarity on their finances will benefit.',
  },
  {
    q: 'Can Oweable help me if I\'m not self-employed?',
    a: 'Absolutely. While Oweable includes tools for 1099 and gig workers, most of its features — debt payoff tracking, bill management, net worth monitoring, credit repair tools, and spending analytics — are built for anyone under financial pressure, regardless of how they earn.',
  },
  {
    q: 'Is Oweable free?',
    a: 'Yes — Oweable has a free tier. Paid plans with advanced features start at $9/month. See the Pricing page for a full feature comparison.',
  },
  {
    q: 'How is Oweable different from YNAB or Mint?',
    a: 'YNAB and Mint (discontinued in 2024) are built for salaried employees with predictable income. Oweable is built for self-employment: quarterly tax estimation, a freelance income vault with write-off tracking, and debt amortization with Snowball and Avalanche strategies — features those tools never offered.',
  },
  {
    q: 'Does Oweable connect to my bank account?',
    a: 'Oweable supports manual entry and document ingestion — upload receipts, bank statements, and invoices via desktop or phone camera. Automatic bank sync via Plaid is on the roadmap.',
  },
  {
    q: 'Is my financial data secure?',
    a: 'Yes. Oweable uses Google OAuth (no stored passwords), encrypts all data at rest and in transit via TLS 1.2+, and enforces row-level security on every database table so users can only ever access their own data.',
  },
];

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-brand-violet/30 flex flex-col">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-surface-base/90 backdrop-blur-sm border-b border-surface-border py-4' : 'bg-transparent py-6 border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="brand-header-text flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-violet shadow-glow-indigo"></div>
            Oweable
          </Link>
          <div className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-widest text-content-tertiary">
            <a href="#features" className="hover:text-content-primary transition-colors">Features</a>
            <Link to="/pricing" className="hover:text-content-primary transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            {user?.id && (
              <button 
                onClick={() => {
                  useStore.getState().signOut();
                  toast.success('Session Terminated');
                }}
                className="hidden sm:block px-6 py-2 bg-transparent border border-surface-border hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono font-bold uppercase tracking-widest transition-all btn-tactile"
              >
                Sign Out
              </button>
            )}
            <Link 
              to={user?.id ? "/dashboard" : "/auth"} 
              className="px-6 py-2 bg-content-primary text-surface-base hover:bg-zinc-200 text-[11px] font-mono font-bold uppercase tracking-widest transition-all btn-tactile"
            >
              {user?.id ? "Enter Dashboard" : "Sign In"}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 lg:pt-40 pb-12 sm:pb-20 px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div ref={heroRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-32 items-center">
          
          <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-12">
            <div className="inline-flex items-center gap-3 border border-brand-violet/30 bg-brand-violet/5 px-3 py-1.5 mb-8 text-xs font-mono text-brand-violet uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-brand-violet opacity-75"></span>
                <span className="relative inline-flex bg-brand-violet h-2 w-2"></span>
              </span>
              Bank-grade Security
            </div>
            
            <h1 className="text-4xl md:text-6xl xl:text-7xl font-sans font-medium tracking-[-0.03em] text-content-primary mb-8 leading-[1.05]">
              The Operating System<br/>
              <span className="whitespace-nowrap inline-flex items-baseline gap-[0.2em]">
                for <WordCycler />
              </span>
            </h1>
            
            <p className="text-lg font-medium text-zinc-300 max-w-lg leading-[1.6] mb-10 border-l-2 border-brand-violet/30 pl-6">
              A precision command center to tame your bills, eliminate debt, track your income, and build financial clarity — no matter where you're starting from.
            </p>
            
            <Link 
              to={user?.id ? "/dashboard" : "/auth"} 
              className="group flex items-center gap-4 bg-brand-indigo hover:bg-brand-violet text-white px-8 py-4 text-[13px] font-mono font-bold uppercase tracking-wider transition-all btn-tactile"
            >
              {user?.id ? "Enter Dashboard" : "Get started for free"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="bg-surface-raised border border-surface-border shadow-stripe-dark p-1">
              <div className="bg-surface-elevated border border-surface-border p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-surface-border pb-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-content-tertiary">Account Balances</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-brand-violet shadow-glow-indigo">
                    <path d="M17 3a2 2 0 0 1 1.492 0.668l0.108 0.132 3.704 4.939a2 2 0 0 1 -0.012 2.416l-0.108 0.13 -9.259 10.184a1.25 1.25 0 0 1 -1.753 0.096l-0.097 -0.096 -9.259 -10.185a2 2 0 0 1 -0.215 -2.407l0.095 -0.138L5.4 3.8a2 2 0 0 1 1.43 -0.793L7 3zm-2.477 8H9.477L12 17.307zm5.217 0h-3.063l-2.406 6.015zM7.323 11H4.261l5.468 6.015zm5.059 -6h-0.764l-2 4h4.764zM17 5h-2.382l2 4H20zM9.382 5H7L4 9h3.382z"></path>
                  </svg>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs font-mono uppercase tracking-widest text-content-tertiary border-b border-surface-border child:pb-3">
                        <th className="font-normal w-1/3">Account</th>
                        <th className="font-normal text-right">Trend / Status</th>
                        <th className="font-normal text-right">Tax Est.</th>
                        <th className="font-normal text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="text-content-primary child:border-b child:border-surface-border child:last:border-0 child:child:py-3 font-mono">
                      <tr className="hover:bg-surface-highlight transition-colors">
                        <td>Uber / Lyft Inflow</td>
                        <td className="text-right text-emerald-400">+12%</td>
                        <td className="text-right text-rose-400">22.5%</td>
                        <td className="text-right">$2,450</td>
                      </tr>
                      <tr className="hover:bg-surface-highlight transition-colors">
                        <td>Savings Account</td>
                        <td className="text-right text-emerald-400">+2.1%</td>
                        <td className="text-right text-content-tertiary">—</td>
                        <td className="text-right">$45,230</td>
                      </tr>
                      <tr className="hover:bg-surface-highlight transition-colors">
                        <td>Stock Portfolio</td>
                        <td className="text-right text-emerald-400">+5.0%</td>
                        <td className="text-right text-content-tertiary">—</td>
                        <td className="text-right">$124,550</td>
                      </tr>
                      <tr className="hover:bg-surface-highlight transition-colors">
                        <td>Tax Reserve (Shield)</td>
                        <td className="text-right text-brand-violet">ACTIVE</td>
                        <td className="text-right text-content-tertiary">—</td>
                        <td className="text-right text-emerald-400">$8,400</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-surface-border mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-content-tertiary mb-1">Total Net Worth</span>
                    <span className="text-2xl font-bold font-sans tracking-tight tnum">$181,838</span>
                  </div>
                  <div className="flex gap-1 h-8 items-end w-32">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-brand-violet/30 hover:bg-brand-violet transition-colors shadow-glow-indigo/10" style={{ height: `${h}%` }}></div>
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
            <h2 className="text-3xl font-sans font-medium tracking-tight text-content-primary mb-4">
              Built for clarity
            </h2>
            <div className="w-full h-[1px] bg-surface-border relative overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                whileInView={{ x: '0%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "circOut" }}
                className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-brand-violet to-transparent opacity-50"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                whileInView={{ x: '0%' }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "circOut" }}
                className="absolute left-0 top-0 h-full w-1/4 bg-brand-violet"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-surface-border">
            {[
              {
                icon: UploadCloud,
                title: "Statement Scanning",
                desc: "Drop your Uber, Lyft, or DoorDash pay statements. We'll automatically capture your gross earnings and platform fees."
              },
              {
                icon: ShieldCheck,
                title: "Tax Defense Shield",
                desc: "Every dollar you earn is instantly shielded. We calculate your 15.3% SE tax and state-specific liability exactly."
              },
              {
                icon: Zap,
                title: "Deduction Scouring",
                desc: "Automatic mileage detection at the 2024 IRS rate ($0.67/mi). We find the hidden write-offs in your work statements."
              }
            ].map((feat, i) => (
              <div 
                key={i} 
                className="border-r border-b border-surface-border p-10 bg-surface-base hover:bg-surface-raised transition-colors group relative overflow-hidden"
              >
                <feat.icon />
                <h3 className="text-lg font-medium text-content-primary mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-content-secondary leading-relaxed">
                  {feat.desc}
                </p>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-brand-violet scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is Oweable? — plain-language definition for AI crawlers and search engines */}
      <section id="what-is-oweable" className="py-24 border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-brand-violet">Overview</span>
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
      <section id="faq" className="py-24 border-t border-surface-border bg-surface-raised">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-brand-violet">FAQ</span>
            <h2 className="text-3xl font-medium tracking-tight text-content-primary mt-4">Frequently asked questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-l border-t border-surface-border">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border-r border-b border-surface-border p-8 bg-surface-base hover:bg-surface-raised transition-colors">
                <h3 className="text-sm font-medium text-content-primary mb-3">{item.q}</h3>
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
