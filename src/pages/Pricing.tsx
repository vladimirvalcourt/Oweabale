import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { Footer } from '../components/layout';
import { PublicHeader } from '../components/layout';
import { useAuth, useJsonLd, useSEO } from '../hooks';

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ui-card-soft px-5 py-5 sm:px-6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 text-left focus-app"
      >
        <span className="text-base font-semibold leading-snug text-content-primary sm:text-lg">{question}</span>
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
        <p className="max-w-3xl text-sm leading-6 text-content-secondary sm:text-base sm:leading-7">{answer}</p>
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
  const { user: authUser } = useAuth();
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

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const startTrial = () => {
    navigate(authUser ? '/pro/dashboard' : `/onboarding?redirect=${encodeURIComponent('/pro/dashboard')}`);
  };

  const openBilling = () => {
    navigate(authUser ? '/pro/settings?tab=billing' : `/auth?redirect=${encodeURIComponent('/pro/settings?tab=billing')}`);
  };

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
        <section className="relative overflow-hidden pb-20 pt-32 lg:pt-40">
          <div className="public-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-55" />
          <div className="premium-container relative">
            <p className="premium-eyebrow">14 days first. Billing later.</p>
            <h1 className="premium-display mt-5 max-w-5xl public-fade-up">
              Try the complete money command center before you pay.
            </h1>
            <p className="premium-lede mt-7 max-w-3xl public-fade-up public-delay-1">
              Every new account starts with 14 days of Full Suite access for bills, debt, subscriptions,
              transactions, documents, budgets, and cash-flow planning. No card is required to start the trial.
            </p>
            <div className="mt-8 flex flex-wrap gap-2 public-fade-up public-delay-2">
              <span className="ui-pill ui-pill-lg">14-day Full Suite trial</span>
              <span className="ui-pill ui-pill-lg">No credit card required</span>
              <span className="ui-pill ui-pill-lg">Cancel anytime</span>
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border-subtle bg-surface-raised/36 py-20">
          <div className="premium-container">
            <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
              <aside className="premium-panel p-7 sm:p-8">
                <p className="premium-eyebrow">Before billing</p>
                <h2 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.04em] text-content-primary">
                  Get the full workspace before money leaves your account.
                </h2>
                <p className="mt-5 text-sm leading-6 text-content-tertiary">
                  Create an account, use the complete Full Suite trial, and decide whether the system is worth keeping.
                </p>
                <div className="mt-8 space-y-3 text-sm text-content-secondary">
                  {['14 days of Full Suite access', 'No card required at signup', 'Pay only if you keep using it'].map((item) => (
                    <div key={item} className="flex items-center gap-3 border-b border-surface-border-subtle pb-3 last:border-b-0 last:pb-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-content-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="premium-panel p-7 text-content-primary shadow-panel sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <p className="ui-label">Full Suite</p>
                  <span className="ui-pill ui-pill-muted">
                    Deeper support
                  </span>
                </div>

                {hasYearlyPricing ? (
                  <div className="mt-5 inline-flex items-center gap-1 rounded-xl border border-surface-border-subtle bg-surface-raised p-1">
                    <button
                      type="button"
                      onClick={() => setBillingPeriod('monthly')}
                      aria-pressed={billingPeriod === 'monthly'}
                    className={`ui-button ui-button-sm ${
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
                    className={`ui-button ui-button-sm ${
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
                  onClick={startTrial}
                  className="premium-button-primary mt-8 w-full"
                >
                  Start 14-day trial
                </button>
                <p className="mt-4 text-sm text-content-tertiary">
                  Payment details live in account billing settings after your trial starts.
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
                <div className="grid grid-cols-2 border-b border-surface-border-subtle bg-surface-elevated text-sm font-semibold text-content-primary">
                  <div className="min-w-[180px] px-4 py-4">Feature</div>
                  <div className="min-w-[160px] border-l border-surface-border px-4 py-4">Oweable</div>
                </div>
                {comparisonRows.map(([feature, , suite]) => (
                  <div key={feature} className="grid grid-cols-2 border-b border-surface-border text-sm last:border-b-0">
                    <div className="min-w-[180px] px-4 py-4 leading-6 text-content-tertiary">{feature}</div>
                    <div className="min-w-[160px] border-l border-surface-border-subtle px-4 py-4 leading-6 text-content-secondary">{suite}</div>
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
              <button
                type="button"
                onClick={startTrial}
                className="premium-button-primary"
              >
                Start 14-day trial
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={openBilling}
                className="premium-button-secondary"
              >
                Add billing details
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
