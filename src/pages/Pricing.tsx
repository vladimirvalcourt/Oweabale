import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { Check, Plus, Minus } from 'lucide-react';
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

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-surface-border py-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left focus:outline-none group"
      >
        <span className="text-lg font-medium text-content-primary group-hover:text-indigo-400 transition-colors">{question}</span>
        {isOpen ? (
          <Minus className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
        ) : (
          <Plus className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
        )}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <p className="text-zinc-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function Pricing() {
  useSEO({
    title: 'Pricing — Oweable',
    description: 'Simple, transparent pricing for anyone dealing with debt, bills, or financial pressure. Start free. Upgrade when ready.',
    canonical: 'https://www.oweable.com/pricing',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const [scrolled, setScrolled] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  
  const [headerRef, headerVisible] = useInView();
  const [cardsRef, cardsVisible] = useInView();
  const [faqRef, faqVisible] = useInView();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 border-b py-4 transition-colors duration-300 ${scrolled ? 'bg-surface-base/90 backdrop-blur-md border-surface-border' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="brand-header-text text-xl text-content-primary transition-colors duration-200">
            Oweable
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link to="/#features" className="hover:text-white transition-colors duration-200">Features</Link>
            <Link to="/pricing" className="text-white transition-colors duration-200">Pricing</Link>
            <Link to="/dashboard" className="hover:text-white transition-colors duration-200">Sign In</Link>
          </div>
          <Link 
            to="/dashboard" 
            className="px-5 py-2.5 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold shadow-sm transition-colors duration-200"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        {/* Beta Disclaimer Banner */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-12">
          <div className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-sm flex items-center gap-4">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <p className="text-sm text-amber-200/90 leading-relaxed">
              <span className="text-amber-400 font-semibold">Beta:</span> Oweable is free for testing. We may start charging with advance notice to active users.
            </p>
          </div>
        </div>

        {/* Subtle Background Glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-surface-base/0 to-transparent pointer-events-none"></div>

        <div 
          ref={headerRef}
          className={`relative z-10 max-w-4xl mx-auto px-6 lg:px-8 w-full flex flex-col items-center text-center transition-all duration-1000 ease-out ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-[1px] w-8 bg-[#F59E0B]"></div>
            <span className="text-[#F59E0B] text-xs font-sans font-medium">Simple pricing</span>
            <div className="h-[1px] w-8 bg-[#F59E0B]"></div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8">
            Priced for maximum leverage.
          </h1>
          
          <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
            Stop paying for apps that just track your debt. Invest in the arsenal that eliminates it.
          </p>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="relative pb-32">
        <div 
          ref={cardsRef}
          className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10"
        >
          {/* Billing Toggle */}
          <div className={`flex justify-center mb-12 transition-all duration-700 ease-out ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4">
              <div className="bg-surface-raised border border-surface-border rounded-sm p-1 flex items-center relative">
                <div 
                  className={`absolute top-1 bottom-1 w-[100px] bg-surface-border shadow-sm rounded-sm transition-all duration-300 ease-in-out ${isYearly ? 'left-[104px]' : 'left-1'}`}
                ></div>
                <button 
                  type="button"
                  onClick={() => setIsYearly(false)}
                  className={`relative z-10 w-[100px] py-1.5 text-xs font-sans font-medium transition-colors duration-300 ${!isYearly ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Monthly
                </button>
                <button 
                  type="button"
                  onClick={() => setIsYearly(true)}
                  className={`relative z-10 w-[100px] py-1.5 text-xs font-sans font-medium transition-colors duration-300 ${isYearly ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Yearly
                </button>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-sans font-semibold text-emerald-400 bg-emerald-400/5 border border-emerald-400/20 px-2 py-0.5 rounded-sm">
                  Save ~25% yearly
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: The Tracker */}
            <div className={`bg-surface-raised border border-surface-border rounded-sm p-10 flex flex-col transition-all duration-700 ease-out delay-[100ms] ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <h3 className="text-lg font-sans font-semibold text-content-primary mb-2">Tracker</h3>
              <p className="text-zinc-500 text-sm mb-8 h-10 leading-relaxed">Core balances and bills without the full suite.</p>
              
              <div className="mb-10 p-6 bg-surface-base border border-surface-border rounded-sm">
                <span className="text-4xl font-mono font-bold tabular-nums text-content-primary data-numeric">$0</span>
                <span className="text-zinc-600 text-sm ml-3">forever free</span>
              </div>
              
              <Link 
                to="/dashboard" 
                className="w-full py-4 px-6 bg-transparent border border-surface-border hover:border-zinc-300 hover:bg-white/5 text-content-primary rounded-sm text-sm font-sans font-semibold text-center transition-all duration-200 mb-10"
              >
                Use free tracker
              </Link>
              
              <div className="flex flex-col gap-5 mt-auto">
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-400 text-sm">3 basic accounts</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-400 text-sm">Manual bill entry</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-400 text-sm">Standard net worth chart</span>
                </div>
              </div>
            </div>

            {/* Card 2: The Arsenal */}
            <div className={`relative transition-all duration-700 ease-out delay-[200ms] ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              {/* Indigo Glow Behind Card */}
              <div className="absolute -inset-1 bg-indigo-500/10 blur-3xl rounded-none z-0"></div>
              
              <div className="bg-surface-raised border border-indigo-500/30 rounded-sm p-10 flex flex-col relative z-10 h-full shadow-[0_0_50px_rgba(99,102,241,0.05)]">
                <div className="absolute top-0 right-10 transform -translate-y-1/2">
                  <span className="bg-emerald-600 text-white text-xs font-sans font-semibold px-3 py-1 rounded-sm">Open beta</span>
                </div>
                
                <h3 className="text-lg font-sans font-semibold text-content-primary mb-2">Full suite</h3>
                <p className="text-zinc-500 text-sm mb-8 h-10 leading-relaxed">Everything in the app during open beta.</p>
                
                <div className="mb-10 p-6 bg-surface-base border border-indigo-500/20 rounded-sm relative h-[100px] flex items-center shadow-[inset_0_0_20px_rgba(99,102,241,0.02)]">
                  <div className={`absolute inset-0 px-6 flex items-center transition-all duration-300 ease-in-out`}>
                    <span className="text-4xl font-mono font-bold tabular-nums text-content-primary data-numeric">$0</span>
                    <span className="text-zinc-600 text-sm ml-3">complimentary beta</span>
                  </div>
                </div>
                
                <Link 
                  to="/dashboard" 
                  className="w-full py-4 px-6 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold text-center transition-all duration-200 mb-10 shadow-sm"
                >
                  Start free beta
                </Link>
                
                <div className="flex flex-col gap-5 mt-auto">
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-400 text-sm">Unlimited account sync</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-400 text-sm">Debt payoff planner (avalanche & snowball)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-400 text-sm">Subscription price-change alerts</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-400 text-sm">Tax tools for freelancers</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative pb-32 bg-surface-base">
        <div 
          ref={faqRef}
          className="max-w-3xl mx-auto px-6 lg:px-8"
        >
          <div className={`transition-all duration-1000 ease-out ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-content-primary">Frequently Asked Questions</h2>
            
            <div className="flex flex-col">
              <FaqItem 
                question="Can I cancel my subscription at any time?" 
                answer="Yes. We believe in ruthless efficiency, not holding you hostage. Cancel anytime from your dashboard settings with a single click. No questions asked." 
              />
              <FaqItem 
                question="Is my financial data secure?" 
                answer="We use bank-level 256-bit encryption. We don't sell your data, and we don't store your bank credentials. When bank linking is available, we plan to use established connection providers so you never give us your login password directly." 
              />
              <FaqItem 
                question="How does the Debt Detonator work?" 
                answer="It uses a proprietary algorithm to analyze your interest rates, balances, and cash flow to recommend the mathematically optimal payoff strategy (avalanche or snowball) to save you the most money." 
              />
              <FaqItem 
                question="Do I need to link my bank accounts?" 
                answer="No. The Free Tracker allows for 100% manual entry if you prefer complete privacy. However, The Arsenal tier requires linking accounts to automate the Subscription Sniper and Tax Fortress features." 
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

