import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
import { TransitionLink } from '../components/TransitionLink';
import { useJsonLd } from '../hooks/useJsonLd';
import { useSEO } from '../hooks/useSEO';
import { createStripeCheckoutSession, type StripeCheckoutPlanKey } from '../lib/stripe';

// Framer Motion Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const springButton = {
  hover: { scale: 1.03, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
  tap: { scale: 0.97, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
};

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
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-[12px] border border-surface-border bg-surface-raised px-8 py-6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <span className="text-lg font-semibold tracking-[-0.02em] leading-tight text-content-primary">{question}</span>
        {isOpen ? (
          <Minus className="h-5 w-5 shrink-0 text-content-secondary" />
        ) : (
          <Plus className="h-5 w-5 shrink-0 text-content-secondary" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'mt-4 max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="max-w-3xl text-base leading-7 text-content-secondary">{answer}</p>
      </div>
    </div>
  );
}

const PRICING_FAQ_STATIC = [
  {
    question: 'Do I need a credit card to try Oweable?',
    answer:
      'No. You can create an account and get started without adding a card first. That way you can see whether Oweable actually helps before making another money decision.',
  },
  {
    question: 'What happens when the trial ends?',
    answer:
      'If you do nothing, you move to the free Tracker tier automatically unless you choose to upgrade. No surprise charges and no awkward cancellation maze.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. If you upgrade, you can manage or cancel your subscription from your account settings without needing to talk to anyone.',
  },
  {
    question: 'Is this only for freelancers?',
    answer:
      'No. Oweable works for households, salaried workers, side gigs, freelancers, and mixed-income setups. The point is to help people whose money life feels hard to stay on top of.',
  },
  {
    question: 'Do I need to connect my bank account?',
    answer:
      'No. You can start manually. Account connection is optional and is there to reduce effort, not make the product usable.',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      "Oweable uses strong encryption in transit and at rest. Your data is not sold, and connected accounts are designed to stay read-only where applicable.",
  },
] as const;

function getPricingFaqItems(monthlyPrice: number, hasYearlyPricing: boolean) {
  const items: Array<{ question: string; answer: string }> = [...PRICING_FAQ_STATIC];
  if (hasYearlyPricing) {
    items.push({
      question: 'Is there a yearly discount?',
      answer: `Yes. The annual plan lowers your effective monthly cost compared with paying $${monthlyPrice.toFixed(2)} every month.`,
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
  const faqItems = getPricingFaqItems(monthlyPrice, hasYearlyPricing);

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: 'Pricing — Oweable',
      description:
        'Choose between a genuinely useful free plan and deeper planning support for debt payoff, cash flow, budgets, and uneven income.',
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
      price: '0',
      priceCurrency: 'USD',
      description: 'Free plan for bills, due dates, recurring obligations, and account basics.',
      
      url: pageUrl,
    },
    {
      '@type': 'Offer',
      '@id': `${pageUrl}#offer-full-suite-monthly`,
      name: 'Full Suite',
      price: monthlyPrice.toFixed(2),
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: monthlyPrice.toFixed(2),
        priceCurrency: 'USD',
        unitText: 'MONTH',
      },
      description:
        'Paid plan with deeper support for debt payoff, budgets, analytics, transaction views, cash-flow planning, and tax estimates when needed.',
      url: pageUrl,
    },
  ];

  if (hasYearlyPricing && yearlyTotal != null) {
    graph.push({
      '@type': 'Offer',
      '@id': `${pageUrl}#offer-full-suite-yearly`,
      name: 'Full Suite (annual)',
      price: yearlyTotal.toFixed(2),
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: yearlyTotal.toFixed(2),
        priceCurrency: 'USD',
        unitText: 'YEAR',
      },
      description:
        yearlySavingsPct > 0
          ? `Annual Full Suite plan with about ${yearlySavingsPct}% savings versus twelve monthly renewals.`
          : 'Annual Full Suite plan with deeper planning support.',
      url: pageUrl,
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

const comparisonRows = [
  ['Bills and due dates', 'Included', 'Included'],
  ['Recurring obligations and subscriptions', 'Included', 'Included'],
  ['Core reminders and account settings', 'Included', 'Included'],
  ['Debt payoff planner', 'Not included', 'Included'],
  ['Budgets and analytics', 'Not included', 'Included'],
  ['Income and transaction views', 'Not included', 'Included'],
  ['Optional bank sync', 'Not included', 'Included'],
  ['Tax estimates for variable income', 'Not included', 'Included'],
] as const;

export default function Pricing() {
  const configuredMonthly = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
  const monthlyPrice = Number.isFinite(configuredMonthly) && configuredMonthly > 0 ? configuredMonthly : 10.99;
  const configuredYearly = Number(import.meta.env.VITE_PRICING_YEARLY_DISPLAY);
  const yearlyTotal = Number.isFinite(configuredYearly) && configuredYearly > 0 ? configuredYearly : null;
  const hasYearlyPricing = yearlyTotal !== null;
  const yearlyEffectiveMonthly = hasYearlyPricing ? yearlyTotal / 12 : null;
  const yearlySavingsPct =
    hasYearlyPricing && monthlyPrice * 12 > yearlyTotal
      ? Math.round((1 - yearlyTotal / (monthlyPrice * 12)) * 100)
      : 0;

  useSEO({
    title: 'Pricing — Oweable',
    description:
      'Choose between a free plan that helps you stay on top of bills and a deeper plan for debt payoff, cash flow, budgets, and uneven income.',
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

  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [headerRef, headerVisible] = useInView(0.08);
  const [plansRef, plansVisible] = useInView(0.1);
  const [faqRef, faqVisible] = useInView(0.1);

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

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <PublicHeader
        links={[
          { href: '/', label: 'Home' },
          { href: '/faq', label: 'FAQ' },
          { href: '/support', label: 'Support' },
        ]}
      />

      <main>
        <section className="relative overflow-hidden pt-32 sm:pt-36">
          <div className="absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-surface-highlight to-transparent" />
          <div
            ref={headerRef}
            className={`public-fade-up mx-auto max-w-5xl px-6 pb-16 sm:pb-20 text-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-8 ${
              headerVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Pricing that stays honest</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-content-primary sm:text-6xl lg:text-7xl">
              Pay only for the level of help you need.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-content-secondary sm:text-xl">
              The free plan helps you stop missing what matters. Full Suite adds deeper support when you are ready for payoff planning, stronger cash-flow decisions, and more structure around the hard parts.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-content-secondary">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                14-day Full Suite trial
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                Cancel anytime
              </span>
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border bg-surface-raised py-24">
          <motion.div
            ref={plansRef}
            className={`mx-auto max-w-7xl px-6 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-8 ${
              plansVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <motion.div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]" variants={staggerContainer}>
              <motion.div variants={fadeInUp} className="public-hover-lift rounded-[12px] border border-surface-border bg-surface-base p-7 sm:p-8">
                <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-content-tertiary">Tracker</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-bold tracking-tight text-content-primary">$0</span>
                  <span className="pb-1 text-sm text-content-secondary">forever free</span>
                </div>
                <p className="mt-4 max-w-md text-base leading-relaxed text-content-secondary">
                  Built for people who need a reliable place to track bills, due dates, recurring obligations, and reminders without paying first.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-content-secondary">
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                    <span>Bills and due-date visibility</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                    <span>Recurring obligations, subscriptions, tickets, and fines</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                    <span>Core reminders and account settings</span>
                  </li>
                </ul>
                <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                  <TransitionLink
                    to="/onboarding"
                    className="mt-8 inline-flex w-full items-center justify-center rounded-[10px] border border-surface-border px-6 h-[48px] text-sm font-medium text-content-primary transition-colors hover:border-surface-border-subtle hover:bg-surface-highlight"
                  >
                    Start free
                  </TransitionLink>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeInUp} className="public-hover-lift rounded-[12px] border border-surface-border bg-surface-raised p-7 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Full Suite</p>
                  <span className="rounded-full bg-brand-profit/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-profit">
                    Deeper support
                  </span>
                </div>

                {hasYearlyPricing ? (
                  <div className="mt-5 inline-flex rounded-full border border-surface-border bg-surface-highlight p-1">
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('monthly')}
                      aria-pressed={billingPeriod === 'monthly'}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        billingPeriod === 'monthly'
                          ? 'bg-surface-base text-content-primary shadow-sm'
                          : 'text-content-secondary'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('yearly')}
                      aria-pressed={billingPeriod === 'yearly'}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        billingPeriod === 'yearly'
                          ? 'bg-surface-base text-content-primary shadow-sm'
                          : 'text-content-secondary'
                      }`}
                    >
                      Yearly{yearlySavingsPct > 0 ? ` (-${yearlySavingsPct}%)` : ''}
                    </button>
                  </div>
                ) : null}

                <div className="mt-6">
                  {hasYearlyPricing && billingPeriod === 'yearly' && yearlyEffectiveMonthly !== null ? (
                    <>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-semibold tracking-[-0.05em]">${yearlyEffectiveMonthly.toFixed(2)}</span>
                        <span className="pb-1 text-sm text-content-secondary">per month</span>
                      </div>
                      <p className="mt-2 text-sm text-content-secondary">
                        Billed ${yearlyTotal?.toFixed(2)} yearly
                      </p>
                    </>
                  ) : (
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-[-0.05em]">${monthlyPrice.toFixed(2)}</span>
                      <span className="pb-1 text-sm text-content-secondary">per month</span>
                    </div>
                  )}
                </div>

                <p className="mt-4 max-w-md text-base leading-7 text-content-secondary">
                  For people who want help turning visibility into action: payoff strategy, budgets, analytics,
                  cash-flow clarity, and tax planning when income gets uneven.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-content-secondary">
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                    <span>Debt payoff engine with Snowball and Avalanche</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                    <span>Budgets, analytics, income ledger, and transaction views</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                    <span>Optional bank sync and broader planning workflows</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                    <span>Tax estimates and reserve planning for variable income</span>
                  </li>
                </ul>
                <motion.button
                  type="button"
                  onClick={() => startCheckout(hasYearlyPricing && billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly')}
                  disabled={isStartingCheckout}
                  className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-brand-cta px-6 py-3.5 text-sm font-medium text-surface-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-70"
                  variants={springButton}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {isStartingCheckout ? 'Starting checkout...' : 'Unlock Full Suite'}
                </motion.button>
                <p className="mt-4 text-sm text-content-secondary">
                  Starts with a 14-day free trial. No credit card required to create your account first.
                </p>
              </motion.div>
            </motion.div>

            <div className="mt-8 rounded-[12px] border border-surface-border bg-surface-raised p-8">
              <p className="text-sm font-semibold leading-tight text-content-primary">Free-tier trust promise</p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-content-secondary">
                The free plan is meant to stay genuinely useful. You do not have to upgrade just to keep a basic system for bills, due dates, and recurring obligations working.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="bg-surface-base py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Compare plans</p>
                <h2 className="mt-4 max-w-lg text-4xl font-semibold tracking-[-0.04em] text-content-primary">
                  Choose based on how much support you want, not how much marketing language you can tolerate.
                </h2>
              </div>
              <div className="overflow-x-auto rounded-[12px] border border-surface-border bg-surface-raised">
                <div className="grid grid-cols-3 border-b border-surface-border bg-surface-highlight text-sm font-semibold text-content-primary">
                  <div className="min-w-[180px] px-4 py-4">Feature</div>
                  <div className="min-w-[140px] border-l border-surface-border px-4 py-4">Tracker</div>
                  <div className="min-w-[160px] border-l border-surface-border px-4 py-4">Full Suite</div>
                </div>
                {comparisonRows.map(([feature, tracker, suite]) => (
                  <div key={feature} className="grid grid-cols-3 border-b border-surface-border text-sm last:border-b-0">
                    <div className="min-w-[180px] px-4 py-4 text-content-secondary">{feature}</div>
                    <div className="min-w-[140px] border-l border-surface-border px-4 py-4 text-content-secondary">{tracker}</div>
                    <div className="min-w-[160px] border-l border-surface-border px-4 py-4 text-content-secondary">{suite}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-y border-surface-border bg-surface-raised py-24">
          <div
            ref={faqRef}
            className={`mx-auto max-w-5xl px-6 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-8 ${
              faqVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">FAQ</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-content-primary">
                The answers people usually want before trusting something with their money.
              </h2>
            </div>
            <div className="mt-10 space-y-4">
              {getPricingFaqItems(monthlyPrice, hasYearlyPricing).map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-surface-offset py-24 text-content-primary">
          <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Ready when you are</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Start with relief. Upgrade when you want deeper structure.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-content-secondary">
              Oweable should help before you pay and feel even steadier when you decide you want more.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <TransitionLink
                to="/onboarding"
                className="inline-flex items-center gap-3 rounded-full bg-brand-cta px-7 py-3.5 text-sm font-medium text-surface-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-cta-hover"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </TransitionLink>
              <button
                type="button"
                onClick={() => startCheckout(hasYearlyPricing && billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly')}
                disabled={isStartingCheckout}
                className="inline-flex items-center gap-3 rounded-full border border-surface-border px-7 py-3.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-highlight disabled:cursor-not-allowed disabled:opacity-70"
              >
                Upgrade to Full Suite
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
