import React, { useState, useEffect, useRef } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import { Check, Plus, Minus } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useJsonLd } from '../hooks/useJsonLd';
import { toast } from 'sonner';
import { createStripeCheckoutSession, type StripeCheckoutPlanKey } from '../lib/stripe';
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

const PRICING_FAQ_STATIC: { question: string; answer: string }[] = [
  {
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Yes. We believe in ruthless efficiency, not holding you hostage. Cancel anytime from your dashboard settings with a single click. No questions asked.',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      "We use bank-level 256-bit encryption. We don't sell your data, and we don't store your bank credentials. When bank linking is available, we plan to use established connection providers so you never give us your login password directly.",
  },
  {
    question: 'How does the Debt Detonator work?',
    answer:
      'It uses a proprietary algorithm to analyze your interest rates, balances, and cash flow to recommend the mathematically optimal payoff strategy (avalanche or snowball) to save you the most money.',
  },
  {
    question: 'Do I need to link my bank accounts?',
    answer:
      'No. Tracker works without bank linking for recurring bills and tickets/fines. Plaid syncing and broader planning workflows are part of Full Suite.',
  },
];

function getPricingFaqItems(monthlyPrice: number, hasYearlyPricing: boolean) {
  const items = [...PRICING_FAQ_STATIC];
  if (hasYearlyPricing) {
    items.push({
      question: 'Is there a discount for paying yearly?',
      answer: `Yes. When you choose annual billing on this page, you pay one yearly charge instead of twelve monthly renewals. The headline rate shows your effective monthly cost; savings are calculated versus twelve months at the standard monthly price ($${monthlyPrice.toFixed(2)}/mo).`,
    });
  }
  return items;
}

function buildPricingJsonLd(params: {
  monthlyPrice: number;
  hasYearlyPricing: boolean;
  yearlyTotal: number | null;
  yearlySavingsPct: number;
}) {
  const { monthlyPrice, hasYearlyPricing, yearlyTotal, yearlySavingsPct } = params;
  const pageUrl = 'https://www.oweable.com/pricing';
  const description =
    'Simple pricing with a useful free Tracker and a Full Suite upgrade. Tracker covers recurring bills and tickets/fines; Full Suite unlocks debt, income, ledger, analytics, and optional tax planning.';

  const faqItems = getPricingFaqItems(monthlyPrice, hasYearlyPricing);

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: 'Pricing — Oweable',
      description,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Oweable',
        url: 'https://www.oweable.com',
      },
      about: {
        '@type': 'SoftwareApplication',
        name: 'Oweable',
        applicationCategory: 'FinanceApplication',
        url: 'https://www.oweable.com',
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.oweable.com/' },
        { '@type': 'ListItem', position: 2, name: 'Pricing', item: pageUrl },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${pageUrl}#faq`,
      url: pageUrl,
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
    {
      '@type': 'Offer',
      '@id': `${pageUrl}#offer-tracker`,
      name: 'Tracker',
      description: 'Recurring bills and tickets/fines on Bills, plus settings. Premium modules require Full Suite.',
      price: '0',
      priceCurrency: 'USD',
      url: pageUrl,
    },
    {
      '@type': 'Offer',
      '@id': `${pageUrl}#offer-full-suite-monthly`,
      name: 'Full Suite',
      description:
        'Full Oweable money toolkit: debt planner, income and transaction ledger, budgets/analytics, subscriptions, bank sync when available, and tax tools.',
      price: monthlyPrice.toFixed(2),
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: monthlyPrice.toFixed(2),
        priceCurrency: 'USD',
        unitText: 'MONTH',
      },
      url: pageUrl,
    },
  ];

  if (hasYearlyPricing && yearlyTotal != null) {
    graph.push({
      '@type': 'Offer',
      '@id': `${pageUrl}#offer-full-suite-yearly`,
      name: 'Full Suite (annual)',
      description:
        yearlySavingsPct > 0
          ? `Annual billing for Full Suite. Save about ${yearlySavingsPct}% versus twelve monthly renewals at the standard monthly rate.`
          : 'Annual billing for Full Suite.',
      price: yearlyTotal.toFixed(2),
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: yearlyTotal.toFixed(2),
        priceCurrency: 'USD',
        unitText: 'YEAR',
      },
      url: pageUrl,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export default function Pricing() {
  const configuredMonthly = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
  const monthlyPrice = Number.isFinite(configuredMonthly) && configuredMonthly > 0 ? configuredMonthly : 10.99;
  const configuredYearly = Number(import.meta.env.VITE_PRICING_YEARLY_DISPLAY);
  const yearlyTotal =
    Number.isFinite(configuredYearly) && configuredYearly > 0 ? configuredYearly : null;
  const hasYearlyPricing = yearlyTotal !== null;
  const yearlyEffectiveMonthly = hasYearlyPricing ? yearlyTotal / 12 : null;
  const yearlySavingsPct =
    hasYearlyPricing && monthlyPrice * 12 > yearlyTotal
      ? Math.round((1 - yearlyTotal / (monthlyPrice * 12)) * 100)
      : 0;

  useSEO({
    title: 'Pricing — Oweable',
    description:
      'Simple pricing with a useful free Tracker and a Full Suite upgrade. Tracker covers recurring bills and tickets/fines; Full Suite unlocks debt, income, ledger, analytics, and optional tax planning.',
    canonical: 'https://www.oweable.com/pricing',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  useJsonLd(
    'pricing',
    () =>
      buildPricingJsonLd({
        monthlyPrice,
        hasYearlyPricing,
        yearlyTotal,
        yearlySavingsPct,
      }),
    [monthlyPrice, hasYearlyPricing, yearlyTotal, yearlySavingsPct]
  );

  const [scrolled, setScrolled] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
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

  const startCheckout = async (planKey: StripeCheckoutPlanKey) => {
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

  const checkoutPlanKey: StripeCheckoutPlanKey =
    hasYearlyPricing && billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly';

  const onFullSuiteCheckout = () => startCheckout(checkoutPlanKey);

  const fullSuiteColumnLabel = (() => {
    if (hasYearlyPricing && billingPeriod === 'yearly') {
      return `Full Suite ($${yearlyTotal.toFixed(0)}/yr)`;
    }
    return `Full Suite ($${monthlyPrice.toFixed(2)}/mo)`;
  })();

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-content-primary/15 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 border-b py-4 transition-colors duration-300 ${scrolled ? 'bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 border-surface-border' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <TransitionLink to="/" className="text-content-primary transition-colors duration-200">
            <BrandWordmark textClassName="brand-header-text" />
          </TransitionLink>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-content-tertiary">
            <TransitionLink to="/#features" className="hover:text-content-secondary transition-colors duration-200 text-content-primary">Features</TransitionLink>
            <TransitionLink to="/pricing" className="text-content-primary transition-colors duration-200">Pricing</TransitionLink>
            <TransitionLink to="/auth" className="hover:text-content-secondary transition-colors duration-200 text-content-primary">Sign In</TransitionLink>
          </div>
          <TransitionLink 
            to="/onboarding" 
            className="px-5 py-2.5 rounded-lg bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold shadow-sm transition-colors duration-200"
          >
            Join free
          </TransitionLink>
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
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
            Start with Tracker for recurring bills and tickets/fines. Upgrade to Full Suite when you want debt planning, ledger, analytics, and tax workflows in one place.
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
              <p className="text-content-tertiary text-sm mb-8 h-10 leading-relaxed">Recurring bills and tickets/fines on Bills, plus settings access.</p>
              
              <div className="mb-10 p-6 bg-surface-base border border-surface-border rounded-lg">
                <span className="text-4xl font-mono font-bold tabular-nums text-content-primary data-numeric">$0</span>
                <span className="text-content-muted text-sm ml-3">forever free</span>
              </div>
              
              <TransitionLink 
                to="/onboarding" 
                className="w-full py-4 px-6 bg-transparent border border-surface-border hover:border-content-muted hover:bg-content-primary/5 text-content-primary rounded-lg text-sm font-sans font-semibold text-center transition-all duration-200 mb-10"
              >
                Use free tracker
              </TransitionLink>
              
              <div className="flex flex-col gap-5 mt-auto">
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-content-tertiary shrink-0 mt-0.5" />
                  <span className="text-content-tertiary text-sm">Recurring bills workflow</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-content-tertiary shrink-0 mt-0.5" />
                  <span className="text-content-tertiary text-sm">Tickets/fines tracking in Bills</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-3.5 h-3.5 text-content-tertiary shrink-0 mt-0.5" />
                  <span className="text-content-tertiary text-sm">Settings and account controls</span>
                </div>
              </div>
            </div>

            {/* Card 2: Full Suite */}
            <div className={`relative transition-all duration-700 ease-out delay-[200ms] ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              {/* Indigo Glow Behind Card */}
              <div className="absolute -inset-1 z-0 rounded-2xl bg-content-primary/[0.05] blur-3xl"></div>
              
              <div className="bg-surface-raised border border-surface-border rounded-lg p-10 flex flex-col relative z-10 h-full shadow-none">
                <div className="absolute top-0 right-10 transform -translate-y-1/2">
                  <span className="bg-emerald-600 text-white text-xs font-sans font-semibold px-3 py-1 rounded-lg">Most popular</span>
                </div>
                
                <h3 className="text-lg font-sans font-semibold text-content-primary mb-2">Full suite</h3>
                <p className="text-content-tertiary text-sm mb-6 min-h-[2.5rem] leading-relaxed">
                  {hasYearlyPricing && billingPeriod === 'yearly'
                    ? 'Same features as monthly — billed once per year at a lower effective rate.'
                    : 'Everything in the app with one simple monthly plan.'}
                </p>

                {hasYearlyPricing ? (
                  <div
                    className="mb-6 flex rounded-lg border border-surface-border p-1 bg-surface-base"
                    role="group"
                    aria-label="Billing period"
                  >
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('monthly')}
                      aria-pressed={billingPeriod === 'monthly'}
                      className={`flex-1 rounded-md py-2.5 text-sm font-sans font-semibold transition-colors ${
                        billingPeriod === 'monthly'
                          ? 'bg-surface-raised text-content-primary shadow-sm'
                          : 'text-content-tertiary hover:text-content-secondary'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('yearly')}
                      aria-pressed={billingPeriod === 'yearly'}
                      className={`relative flex-1 rounded-md py-2.5 text-sm font-sans font-semibold transition-colors ${
                        billingPeriod === 'yearly'
                          ? 'bg-surface-raised text-content-primary shadow-sm'
                          : 'text-content-tertiary hover:text-content-secondary'
                      }`}
                    >
                      Yearly
                      {yearlySavingsPct > 0 ? (
                        <span className="ml-1.5 text-xs font-semibold text-emerald-600">−{yearlySavingsPct}%</span>
                      ) : null}
                    </button>
                  </div>
                ) : null}
                
                <div className="mb-10 p-6 bg-surface-base border border-surface-border rounded-lg relative min-h-[100px] flex flex-col justify-center shadow-none">
                  {hasYearlyPricing && billingPeriod === 'yearly' && yearlyEffectiveMonthly !== null ? (
                    <div className="transition-all duration-300 ease-in-out">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-4xl font-mono font-bold tabular-nums text-content-primary data-numeric">
                          ${yearlyEffectiveMonthly.toFixed(2)}
                        </span>
                        <span className="text-content-muted text-sm">/ month</span>
                      </div>
                      <p className="mt-2 text-sm text-content-tertiary">
                        Billed ${yearlyTotal.toFixed(2)} per year
                        {yearlySavingsPct > 0 ? (
                          <span className="text-emerald-600 font-medium"> · Save {yearlySavingsPct}%</span>
                        ) : null}
                      </p>
                    </div>
                  ) : (
                    <div className="transition-all duration-300 ease-in-out flex flex-wrap items-baseline gap-x-3">
                      <span className="text-4xl font-mono font-bold tabular-nums text-content-primary data-numeric">
                        ${monthlyPrice.toFixed(2)}
                      </span>
                      <span className="text-content-muted text-sm">per month</span>
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={onFullSuiteCheckout}
                  disabled={isStartingCheckout}
                  className="w-full py-4 px-6 rounded-lg bg-brand-cta hover:bg-brand-cta-hover disabled:opacity-60 disabled:cursor-not-allowed text-surface-base text-sm font-sans font-semibold text-center transition-all duration-200 mb-3 shadow-sm"
                >
                  {isStartingCheckout
                    ? 'Starting checkout...'
                    : hasYearlyPricing && billingPeriod === 'yearly'
                      ? 'Start yearly plan'
                      : 'Start monthly plan'}
                </button>
                <div className="flex flex-col gap-5 mt-auto">
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Bank sync when available</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Debt payoff planner (avalanche & snowball)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Income + transaction ledger, budgets, analytics</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-content-primary shrink-0 mt-0.5" />
                    <span className="text-content-tertiary text-sm">Tax estimation &amp; reserves (great for variable or 1099 income)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 rounded-lg border border-surface-border bg-surface-raised p-5">
            <h4 className="text-sm font-semibold text-content-primary">Free-tier trust promise</h4>
            <p className="mt-2 text-sm text-content-secondary">
              Tracker remains useful without upgrading: recurring bills and tickets/fines stay available, and you can cancel paid plans in-app any time.
            </p>
            <p className="mt-1 text-xs text-content-tertiary">
              No forced phone calls, no hidden cancellation path, and no lock-in for your account controls.
            </p>
          </div>

          <div className="mt-16 border border-surface-border rounded-lg bg-surface-raised overflow-hidden">
            <div className="grid grid-cols-3 border-b border-surface-border text-xs font-mono uppercase tracking-widest">
              <div className="px-4 py-3 text-content-muted">Feature</div>
              <div className="px-4 py-3 text-content-muted border-l border-surface-border">Tracker (Free)</div>
              <div className="px-4 py-3 text-content-muted border-l border-surface-border">{fullSuiteColumnLabel}</div>
            </div>

            {[
              ['App access', 'Bills + Settings only', 'All modules unlocked'],
              ['Bills page', 'Recurring bills + tickets/fines', 'Recurring + debt actions'],
              ['Bank connection (Plaid)', 'Not included', 'Included'],
              ['Income tracking', 'Not included', 'Included'],
              ['Transactions/analytics/reports', 'Not included', 'Included'],
              ['Debt payoff planner', 'Not included', 'Avalanche + snowball planner'],
              ['Advanced planning tools', 'Not included', 'Included'],
              ['Tax estimation & reserves (variable / 1099)', 'Not included', 'Included'],
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
              {getPricingFaqItems(monthlyPrice, hasYearlyPricing).map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

