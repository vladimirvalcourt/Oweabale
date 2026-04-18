import React, { useState, useEffect, useRef } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import { Check, Plus, Minus } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { toast } from 'sonner';
import { createStripeCheckoutSession } from '../lib/stripe';

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
        className="flex items-center justify-between w-full text-left focus-app group"
      >
        <span className="text-lg font-medium text-content-primary group-hover:text-content-primary transition-colors">{question}</span>
        {isOpen ? (
          <Minus className="w-5 h-5 text-content-tertiary group-hover:text-content-primary transition-colors" />
        ) : (
          <Plus className="w-5 h-5 text-content-tertiary group-hover:text-content-primary transition-colors" />
        )}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <p className="text-content-tertiary leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function Pricing() {
  const configuredMonthly = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
  const monthlyPrice = Number.isFinite(configuredMonthly) && configuredMonthly > 0 ? configuredMonthly : 10.99;

  useSEO({
    title: 'Pricing — Oweable',
    description: 'Simple, transparent pricing for anyone dealing with debt, bills, or financial pressure. Start free. Upgrade when ready.',
    canonical: 'https://www.oweable.com/pricing',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const [scrolled, setScrolled] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  
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

  const startCheckout = async (planKey: 'pro_monthly') => {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    const response = await createStripeCheckoutSession(planKey);
    if ('error' in response) {
      toast.error(response.error);
      setIsStartingCheckout(false);
      return;
    }
    window.location.href = response.checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-white/15 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 border-b py-4 transition-colors duration-300 ${scrolled ? 'bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 border-surface-border' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <TransitionLink to="/" className="brand-header-text text-xl text-content-primary transition-colors duration-200">
            Oweable
          </TransitionLink>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-content-tertiary">
            <TransitionLink to="/#features" className="hover:text-white transition-colors duration-200">Features</TransitionLink>
            <TransitionLink to="/pricing" className="text-white transition-colors duration-200">Pricing</TransitionLink>
            <TransitionLink to="/dashboard" className="hover:text-white transition-colors duration-200">Sign In</TransitionLink>
          </div>
          <TransitionLink 
            to="/dashboard" 
            className="px-5 py-2.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-sm font-sans font-semibold shadow-sm transition-colors duration-200"
          >
            Get started
          </TransitionLink>
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        {/* Beta Disclaimer Banner */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mb-12">
          <div className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-lg flex items-center gap-4">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <p className="text-sm text-amber-200/90 leading-relaxed">
              <span className="text-amber-400 font-semibold">Closed beta:</span> Access is by invitation. Paid plans are active in beta unless your cohort has a separate promo.
            </p>
          </div>
        </div>

        {/* Subtle Background Glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-500/10 via-surface-base/0 to-transparent pointer-events-none"></div>

        <div 
          ref={headerRef}
          className={`relative z-10 max-w-4xl mx-auto px-6 lg:px-8 w-full flex flex-col items-center text-center transition-all duration-1000 ease-out ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-[1px] w-8 bg-[#F59E0B]"></div>
            <span className="text-[#F59E0B] text-xs font-sans font-medium">Simple pricing</span>
            <div className="h-[1px] w-8 bg-[#F59E0B]"></div>
          </div>
          
          <h1 className="mb-8 text-4xl font-medium tracking-tight text-content-primary md:text-6xl md:leading-[1.1]">
            Priced for maximum leverage.
          </h1>
          
          <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-content-secondary md:text-lg">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Tracker (Free) */}
            <div className={`bg-surface-raised border border-surface-border rounded-lg p-10 flex flex-col transition-all duration-700 ease-out delay-[100ms] ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <h3 className="text-lg font-sans font-semibold text-content-primary mb-2">Tracker</h3>
              <p className="text-content-tertiary text-sm mb-8 h-10 leading-relaxed">Manual bills + settings access. Premium modules require Full Suite.</p>
              
              <div className="mb-10 p-6 bg-surface-base border border-surface-border rounded-lg">
                <span className="text-4xl font-mono font-bold tabular-nums text-content-primary data-numeric">$0</span>
                <span className="text-content-muted text-sm ml-3">forever free</span>
              </div>
              
              <TransitionLink 
                to="/dashboard" 
                className="w-full py-4 px-6 bg-transparent border border-surface-border hover:border-content-muted hover:bg-white/5 text-content-primary rounded-lg text-sm font-sans font-semibold text-center transition-all duration-200 mb-10"
              >
                Use free tracker
              </TransitionLink>
              
              <div className="flex flex-col gap-5 mt-auto">
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-content-tertiary shrink-0 mt-0.5" />
                  <span className="text-content-tertiary text-sm">Bills workflow access</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-content-tertiary shrink-0 mt-0.5" />
                  <span className="text-content-tertiary text-sm">Settings and account controls</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-content-tertiary shrink-0 mt-0.5" />
                  <span className="text-content-tertiary text-sm">No Plaid, no premium modules</span>
                </div>
              </div>
            </div>

            {/* Card 2: Full Suite */}
            <div className={`relative transition-all duration-700 ease-out delay-[200ms] ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              {/* Indigo Glow Behind Card */}
              <div className="absolute -inset-1 z-0 rounded-2xl bg-white/[0.05] blur-3xl"></div>
              
              <div className="bg-surface-raised border border-surface-border rounded-lg p-10 flex flex-col relative z-10 h-full shadow-none">
                <div className="absolute top-0 right-10 transform -translate-y-1/2">
                  <span className="bg-emerald-600 text-white text-xs font-sans font-semibold px-3 py-1 rounded-lg">Most popular</span>
                </div>
                
                <h3 className="text-lg font-sans font-semibold text-content-primary mb-2">Full suite</h3>
                <p className="text-content-tertiary text-sm mb-8 h-10 leading-relaxed">Everything in the app with one simple monthly plan.</p>
                
                <div className="mb-10 p-6 bg-surface-base border border-surface-border rounded-lg relative h-[100px] flex items-center shadow-none">
                  <div className={`absolute inset-0 px-6 flex items-center transition-all duration-300 ease-in-out`}>
                    <span className="text-4xl font-mono font-bold tabular-nums text-content-primary data-numeric">
                      ${monthlyPrice.toFixed(2)}
                    </span>
                    <span className="text-content-muted text-sm ml-3">per month</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => startCheckout('pro_monthly')}
                  disabled={isStartingCheckout}
                  className="w-full py-4 px-6 rounded-lg bg-white hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-sans font-semibold text-center transition-all duration-200 mb-3 shadow-sm"
                >
                  {isStartingCheckout ? 'Starting checkout...' : 'Start monthly plan'}
                </button>
                <div className="flex flex-col gap-5 mt-auto">
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Unlimited account sync</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Debt payoff planner (avalanche & snowball)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Subscription price-change alerts</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Tax tools for freelancers</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 rounded-lg border border-surface-border bg-surface-raised p-5">
            <h4 className="text-sm font-semibold text-content-primary">Free-tier trust promise</h4>
            <p className="mt-2 text-sm text-content-secondary">
              Tracker remains useful without upgrading: you can keep managing core workflows, export your data, and cancel paid plans in-app any time.
            </p>
            <p className="mt-1 text-xs text-content-tertiary">
              No forced phone calls, no hidden cancellation path, and no lock-in for your account controls.
            </p>
          </div>

          <div className="mt-16 border border-surface-border rounded-lg bg-surface-raised overflow-hidden">
            <div className="grid grid-cols-3 border-b border-surface-border text-xs font-mono uppercase tracking-widest">
              <div className="px-4 py-3 text-content-muted">Feature</div>
              <div className="px-4 py-3 text-content-muted border-l border-surface-border">Tracker (Free)</div>
              <div className="px-4 py-3 text-content-muted border-l border-surface-border">Full Suite ($10.99/mo)</div>
            </div>

            {[
              ['App access', 'Bills + Settings only', 'All modules unlocked'],
              ['Bank connection (Plaid)', 'Not included', 'Included'],
              ['Transactions/analytics/reports', 'Not included', 'Included'],
              ['Debt payoff planner', 'Not included', 'Avalanche + snowball planner'],
              ['Owe-AI and advanced tools', 'Not included', 'Included'],
              ['Freelancer tax tools', 'Not included', 'Included'],
            ].map(([feature, freeTier, paidTier]) => (
              <div key={feature} className="grid grid-cols-3 text-sm border-b border-surface-border last:border-b-0">
                <div className="px-4 py-3 text-content-secondary">{feature}</div>
                <div className="px-4 py-3 text-content-tertiary border-l border-surface-border">{freeTier}</div>
                <div className="px-4 py-3 text-content-tertiary border-l border-surface-border">{paidTier}</div>
              </div>
            ))}
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
                answer="No. Free tier uses manual bills only. Plaid syncing and all advanced workflows are part of Full Suite." 
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

