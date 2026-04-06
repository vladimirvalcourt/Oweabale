import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Terminal, Activity, FileText, Database, UploadCloud, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  'Freelancers',
  'Uber Drivers',
  'Tax Savings',
  'Paying Tolls',
  'Managing Bills',
  'Protecting Profit',
  'DoorDashers'
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

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  
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
          <Link 
            to="/dashboard" 
            className="px-6 py-2 bg-content-primary text-surface-base hover:bg-zinc-200 text-[11px] font-mono font-bold uppercase tracking-widest transition-all btn-tactile"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div ref={heroRef} className={`grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-32 items-center transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          
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
            
            <p className="text-base text-content-secondary max-w-lg leading-relaxed mb-10 border-l border-surface-border pl-6">
              A high-precision command center to track your gig earnings, automate your tax reserves, and defend your profit with clinical accuracy.
            </p>
            
            <Link 
              to="/onboarding" 
              className="group flex items-center gap-4 bg-brand-indigo hover:bg-brand-violet text-white px-8 py-4 text-[13px] font-mono font-bold uppercase tracking-wider transition-all btn-tactile"
            >
              Get started for free
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

      {/* CTA Footer */}
      <footer className="border-t border-surface-border bg-surface-raised pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="brand-header-text flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-brand-violet shadow-glow-indigo"></div>
                Oweable
              </Link>
              <p className="text-sm text-content-tertiary max-w-sm leading-relaxed mb-8">
                Autonomous financial infrastructure for the modern worker. Track, save, and protect your profit with bank-grade precision.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/onboarding" className="bg-content-primary text-surface-base px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">
                  Get Started
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-content-primary mb-6">Platform</h4>
              <ul className="flex flex-col gap-3 text-xs font-mono text-content-tertiary uppercase tracking-widest">
                <li><a href="#features" className="hover:text-brand-violet transition-colors">Features</a></li>
                <li><Link to="/pricing" className="hover:text-brand-violet transition-colors">Pricing</Link></li>
                <li><Link to="/dashboard" className="hover:text-brand-violet transition-colors">SignIn</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-content-primary mb-6">Legal</h4>
              <ul className="flex flex-col gap-3 text-xs font-mono text-content-tertiary uppercase tracking-widest">
                <li><Link to="/privacy" className="hover:text-brand-violet transition-colors text-left block">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-brand-violet transition-colors text-left block">Terms</Link></li>
                <li><Link to="/security" className="hover:text-brand-violet transition-colors text-left block">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-surface-border flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6 text-[10px] font-mono text-content-muted uppercase tracking-widest">
              <span>OWEABLE INC. NYC</span>
              <span className="opacity-30">/</span>
              <span>© {new Date().getFullYear()} ALL RIGHTS RESERVED</span>
            </div>
            <div className="flex items-center gap-4 text-content-muted">
              <Terminal className="w-4 h-4" />
              <Activity className="w-4 h-4" />
              <Database className="w-4 h-4" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
