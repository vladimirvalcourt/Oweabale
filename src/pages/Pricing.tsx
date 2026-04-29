import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Footer } from '../components/layout';
import { PublicHeader } from '../components/layout';
import { TransitionLink } from '../components/common';
import { useJsonLd } from '../hooks';
import { useSEO } from '../hooks';
import { createStripeCheckoutSession, type StripeCheckoutPlanKey } from '../lib/api/stripe';

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-8 py-6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <span className="text-lg font-medium tracking-[-0.024em] leading-tight text-content-primary">{question}</span>
        {isOpen ? (
          <Minus className="h-5 w-5 shrink-0 text-content-secondary" />
        ) : (
          <Plus className="h-5 w-5 shrink-0 text-content-secondary" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'mt-4 max-h-72 opacity-100' : 'max-h-0 opacity-0'
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
      'No. You can create an account and get oriented before adding a card. The point is to feel whether the Pay List lowers the pressure before you make another money decision.',
  },
  {
    question: 'What happens when the trial ends?',
    answer:
      'If you do nothing, your signed-in app pauses after 14 days. You can add your payment details before the trial ends or pick a plan later to keep using Oweable. No surprise charges.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Once you start Full Suite, you can pause or cancel your subscription from your account settings. No need to talk to anyone.',
  },
  {
    question: 'Is this only for freelancers?',
    answer:
      'No. Oweable works for households, salaried workers, side gigs, freelancers, and mixed-income setups. The common problem is bills, debt, and due dates becoming too much to hold in your head.',
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
        'Pricing for Oweable: bill tracking, debt payoff planning, subscriptions, cash-flow clarity, budgets, and help when money feels hard to hold together.',
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
        'Paid plan for people who want more help making a real plan for bills, debt, spending, income, and tax reserves when money feels hard to hold together.',
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
          : 'Annual Full Suite plan for people who want steady support through bills, debt, and cash flow.',
      url: pageUrl,
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

const comparisonRows = [
  ['Bills and due dates', 'Included', 'Included'],
  ['Recurring obligations and subscriptions', 'Included', 'Included'],
  ['Core reminders and account settings', 'Included', 'Included'],
  ['A debt plan you can actually follow', 'Not included', 'Included'],
  ['Spending guardrails and clearer reports', 'Not included', 'Included'],
  ['Income and transaction history', 'Not included', 'Included'],
  ['Optional bank connection', 'Not included', 'Included'],
  ['Tax reserve help for uneven income', 'Not included', 'Included'],
] as const;

export default function Pricing() {
  const navigate = useNavigate();
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
      'Oweable pricing for staying on top of bills, debt payoff, subscriptions, cash flow, budgets, and uneven income without adding more noise.',
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

  const startCheckout = async (planKey: StripeCheckoutPlanKey) => {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    const response = await createStripeCheckoutSession(planKey);
    if ('error' in response) {
      if (response.error === 'Please sign in to start checkout.') {
        navigate(`/onboarding?redirect=${encodeURIComponent('/pro/settings?tab=billing')}`);
        return;
      }
      toast.error(response.error);
      setIsStartingCheckout(false);
      return;
    }
    window.location.href = response.checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-brand-violet/25">
      <PublicHeader
        links={[
          { href: '/', label: 'Home' },
          { href: '/faq', label: 'FAQ' },
          { href: '/support', label: 'Support' },
        ]}
      />

      <main>
        <section className="relative overflow-hidden pb-20 pt-32 lg:pt-40">
          <div className="public-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-55" />
          <div className="premium-container relative">
            <p className="premium-eyebrow">Pricing without another surprise</p>
            <h1 className="premium-display mt-5 max-w-5xl public-fade-up">
              Start where the pressure is. Pay when you need the deeper plan.
            </h1>
            <p className="premium-lede mt-7 max-w-3xl public-fade-up public-delay-1">
              Oweable starts with a focused Pay List for bills, debt, subscriptions, tolls, tickets, and the obligations that keep slipping into the back of your mind. Full Suite is there when you want help turning the whole picture into a plan you can keep coming back to.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-content-secondary public-fade-up public-delay-2">
              <span className="rounded-md border border-surface-border-subtle bg-surface-raised px-4 py-2">14-day Full Suite trial</span>
              <span className="rounded-md border border-surface-border-subtle bg-surface-raised px-4 py-2">No credit card required</span>
              <span className="rounded-md border border-surface-border-subtle bg-surface-raised px-4 py-2">Cancel anytime</span>
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border-subtle bg-surface-raised/36 py-20">
          <div className="premium-container">
            <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
              <aside className="premium-panel p-7 sm:p-8">
                <p className="premium-eyebrow">What stays free</p>
                <h2 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.04em] text-content-primary">
                  Get oriented before money leaves your account.
                </h2>
                <p className="mt-5 text-sm leading-6 text-content-tertiary">
                  You can sign up, map the immediate Pay List, and decide whether the deeper planning tools are worth keeping.
                </p>
                <div className="mt-8 space-y-3 text-sm text-content-secondary">
                  {['Create the first Pay List', 'Review due dates and pressure', 'Upgrade only when the system is useful'].map((item) => (
                    <div key={item} className="flex items-center gap-3 border-b border-surface-border-subtle pb-3 last:border-b-0 last:pb-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-violet" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="premium-panel p-7 text-content-primary shadow-panel sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-muted">Full Suite</p>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-content-tertiary">
                    Deeper support
                  </span>
                </div>

                {hasYearlyPricing ? (
                  <div className="mt-5 inline-flex items-center rounded-md border border-surface-border-subtle bg-surface-raised p-0.5">
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('monthly')}
                      aria-pressed={billingPeriod === 'monthly'}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-1 focus-visible:ring-offset-surface-highlight ${
                        billingPeriod === 'monthly'
                          ? 'bg-content-primary text-surface-base'
                          : 'text-content-tertiary hover:text-content-primary'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('yearly')}
                      aria-pressed={billingPeriod === 'yearly'}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-1 focus-visible:ring-offset-surface-highlight ${
                        billingPeriod === 'yearly'
                          ? 'bg-content-primary text-surface-base'
                          : 'text-content-tertiary hover:text-content-primary'
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
                        <span className="font-mono text-6xl font-medium tracking-[-0.055em]">${yearlyEffectiveMonthly.toFixed(2)}</span>
                        <span className="pb-2 text-sm text-content-tertiary">per month</span>
                      </div>
                      <p className="mt-2 text-sm text-content-tertiary">
                        Billed ${yearlyTotal?.toFixed(2)} yearly
                      </p>
                    </>
                  ) : (
                    <div className="flex items-end gap-2">
                      <span className="font-mono text-6xl font-medium tracking-[-0.055em]">${monthlyPrice.toFixed(2)}</span>
                      <span className="pb-2 text-sm text-content-tertiary">per month</span>
                    </div>
                  )}
                </div>

                <p className="mt-5 max-w-md text-base leading-7 text-content-tertiary">
                  For people who need more than reminders: a calmer way to decide what to pay first,
                  what to protect, and what needs attention before it becomes another fee.
                </p>
                <ul className="mt-7 space-y-3 text-sm text-content-secondary">
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-content-primary" />
                    <span>Choose a debt payoff path that fits how you stay motivated</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-content-primary" />
                    <span>See spending, income, and transactions without digging through tabs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-content-primary" />
                    <span>Connect a bank only if it helps you save time</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-content-primary" />
                    <span>Set aside tax money when income is uneven</span>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => startCheckout(hasYearlyPricing && billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly')}
                  disabled={isStartingCheckout}
                  className="premium-button-primary mt-8 w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isStartingCheckout ? 'Getting things ready...' : 'Start Full Suite'}
                </button>
                <p className="mt-4 text-sm text-content-tertiary">
                  Starts with a 14-day free trial. No credit card required to create your account first.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section-line bg-surface-base py-28">
          <div className="premium-container">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="premium-eyebrow">What you get</p>
                <h2 className="premium-heading mt-4 max-w-lg">
                  One calmer path for bills, debt, and the planning work behind them.
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-content-tertiary">
                  The plan is intentionally narrow at the start and deeper where ongoing money stress usually hides.
                </p>
              </div>
              <div className="premium-panel overflow-x-auto">
                <div className="grid grid-cols-2 border-b border-surface-border-subtle bg-surface-elevated text-sm font-medium text-content-primary">
                  <div className="min-w-[180px] px-4 py-4">Feature</div>
                  <div className="min-w-[160px] border-l border-surface-border px-4 py-4">Oweable</div>
                </div>
                {comparisonRows.map(([feature, , suite]) => (
                  <div key={feature} className="grid grid-cols-2 border-b border-surface-border text-sm last:border-b-0">
                    <div className="min-w-[180px] px-4 py-4 text-content-tertiary">{feature}</div>
                    <div className="min-w-[160px] border-l border-surface-border-subtle px-4 py-4 text-content-secondary">{suite}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-y border-surface-border-subtle bg-surface-raised/36 py-28">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="premium-eyebrow">FAQ</p>
              <h2 className="premium-heading mt-4">
                The answers people usually need before trusting a tool with bills and debt.
              </h2>
            </div>
            <div className="mt-10 space-y-4">
              {getPricingFaqItems(monthlyPrice, hasYearlyPricing).map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface-base py-28 text-content-primary">
          <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
            <p className="premium-eyebrow">Ready when you are</p>
            <h2 className="premium-heading mt-5 sm:text-6xl">
              Start with relief. Keep the system simple.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-content-tertiary">
              The first path is the Pay List. The advanced tools are there when they reduce pressure, not when they distract.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <TransitionLink
                to="/onboarding?redirect=/pro/dashboard"
                className="premium-button-primary"
              >
                Try Full Suite
                <ArrowRight className="h-4 w-4" />
              </TransitionLink>
              <button
                type="button"
                onClick={() => startCheckout(hasYearlyPricing && billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly')}
                disabled={isStartingCheckout}
                className="premium-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
              >
                Start Full Suite
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
