import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CircleDollarSign, Clock3, Layers3, ShieldCheck } from 'lucide-react';
import { Footer, PublicHeader } from '@/components/layout';
import { TransitionLink } from '@/components/common';
import ExitIntentModal from '@/components/common/ExitIntentModal';
import { useAuth, useSEO, trackEvent } from '@/hooks';
import { SITE_CONFIG } from '@/config/site';
import gsap from 'gsap';

const proofPoints = ['Bills', 'Debt', 'Subscriptions', 'Tolls', 'Tickets', 'Taxes'];

const peopleAvatars = {
  mara: '/people/mara.png',
  jon: '/people/jon.png',
  sarah: '/people/sarah.png',
  james: '/people/james.png',
  emily: '/people/emily.png',
};

const featureRows = [
  {
    icon: Clock3,
    title: 'Start with what feels urgent',
    body: 'Put bills, debt minimums, subscriptions, tolls, and tickets into one ordered list so the next payment is not a guess.',
  },
  {
    icon: CircleDollarSign,
    title: 'See the pressure before it spikes',
    body: 'Know what is due soon, what is already behind, and what cash should stay protected before another fee lands.',
  },
  {
    icon: Layers3,
    title: 'Build a payoff path you can follow',
    body: 'Pick a payoff style that keeps you moving, then turn balances into next steps instead of one heavy pile.',
  },
  {
    icon: ShieldCheck,
    title: 'Stay in control of the setup',
    body: 'Start manually, connect accounts only when useful, and keep sensitive money work inside a calmer system.',
  },
];

const payListRows = [
  { label: 'Rent', due: 'Apr 30', state: 'Ready', amount: '$1,842.00' },
  { label: 'Student loan', due: 'May 02', state: 'Next', amount: '$318.44' },
  { label: 'Car insurance', due: 'May 06', state: 'Watch', amount: '$186.17' },
  { label: 'Toll notice', due: 'May 09', state: 'New', amount: '$47.20' },
];

const activityRows = [
  {
    name: 'Mara',
    image: peopleAvatars.mara,
    text: 'Marked rent reserve as protected',
    time: '2 min ago',
  },
  {
    name: 'Jon',
    image: peopleAvatars.jon,
    text: 'Added toll notice to the Pay List',
    time: 'just now',
  },
];

const testimonials = [
  {
    quote: "The Pay List changed the way I open my banking app. I know what has to stay protected before I touch anything else.",
    author: 'Imani R.',
    role: 'Household budget lead',
    avatar: peopleAvatars.sarah,
  },
  {
    quote: "Most apps tell me what I already spent. Oweable tells me what needs attention next, which is the part I was missing.",
    author: 'Mateo L.',
    role: 'Managing debt payoff',
    avatar: peopleAvatars.james,
  },
  {
    quote: "It feels built for the week when three due dates hit at once. Calm, direct, and no lecture.",
    author: 'Nadia P.',
    role: 'Mixed-income household',
    avatar: peopleAvatars.emily,
  },
];

const heroMetrics = [
  { label: 'Next 7 days', value: '$2,393.61' },
  { label: 'Protected cash', value: '$1,842.00' },
  { label: 'Late-fee risk', value: '$47.20' },
];

const flowSteps = [
  ['01', 'Capture', 'Add bills, debt, subscriptions, tickets, tolls, and tax reserves before they scatter.'],
  ['02', 'Rank', 'See what is urgent, what can wait, and what cash should not be touched.'],
  ['03', 'Move', 'Pay the next thing with a clearer reason and keep the rest of the plan visible.'],
] as const;

function ProductPreview() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    cardRefs.current.forEach((card) => {
      if (!card) return;

      tl.to(card, {
        scale: 0.98,
        opacity: 0.85,
        duration: 0.1,
        ease: "power2.in",
      })
      .to(card, {
        scale: 1,
        opacity: 1,
        duration: 0.35,
        ease: "elastic.out(1, 0.5)",
      }, "+=0.05")
      .to({}, { duration: 0.8 });
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
      <div className="ui-card relative mx-auto max-w-[1320px] overflow-hidden shadow-panel">
      <div className="public-grid-bg pointer-events-none absolute inset-0 opacity-35" />
      <div className="relative flex h-12 items-center justify-between border-b border-surface-border-subtle bg-surface-raised/82 px-5">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-surface-border bg-surface-elevated" />
          <span className="text-sm font-medium text-content-primary">Oweable</span>
          <span className="text-content-muted">/</span>
          <span className="hidden text-sm text-content-tertiary sm:inline">Pay List</span>
        </div>
        <div className="hidden items-center gap-5 text-sm text-content-muted sm:flex">
          <span>02 / 145</span>
          <span>⌃</span>
          <span>⌄</span>
        </div>
      </div>

      <div className="relative grid min-h-[500px] gap-0 lg:grid-cols-[240px_1fr_320px]">
        <aside className="hidden border-r border-surface-border-subtle bg-surface-raised/36 p-5 lg:block">
          <div className="space-y-1 text-sm">
            {['Inbox', 'Pay List', 'Debt plan', 'Calendar', 'Subscriptions'].map((item, index) => (
              <div key={item} className={`rounded-md px-3 py-2 ${index === 1 ? 'bg-surface-elevated text-content-primary' : 'text-content-tertiary'}`}>
                {item}
              </div>
            ))}
          </div>
          <p className="mt-8 px-3 text-xs text-content-muted">Favorites</p>
          <div className="mt-2 space-y-1 text-sm text-content-tertiary">
            {['Rent and utilities', 'Student loan', 'Tax reserve'].map((item) => (
              <div key={item} className="rounded-md px-3 py-2">{item}</div>
            ))}
          </div>
        </aside>

        <div className="p-7 sm:p-10">
          <div className="mb-10 flex items-start justify-between border-b border-surface-border-subtle pb-8">
            <div>
              <p className="text-sm text-content-muted">PAY-2703</p>
              <h2 className="mt-8 text-2xl font-medium tracking-[-0.03em] text-content-primary">This week, ordered</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-content-tertiary">
                Sort upcoming bills by cash impact, due date, and whether a payment can safely move today.
              </p>
            </div>
            <span className="ui-pill ui-pill-muted hidden sm:inline-flex">
              In Progress
            </span>
          </div>

          <div className="ui-card-compact divide-y divide-surface-border-subtle overflow-hidden">
            {payListRows.map((row, index) => (
              <div 
                key={row.label} 
                ref={(el) => { cardRefs.current[index] = el; }}
                className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 sm:grid-cols-[1fr_auto_auto_auto] transition-all"
              >
                <div>
                  <p className="text-sm font-medium text-content-primary">{row.label}</p>
                  <p className="text-xs text-content-muted">Due {row.due}</p>
                </div>
                <span className="ui-pill ui-pill-muted hidden self-center sm:inline-flex">
                  {row.state}
                </span>
                <span className="self-center font-mono text-sm text-content-secondary">{row.amount}</span>
                <Check className="hidden h-4 w-4 self-center text-content-secondary sm:block" />
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_180px]">
            <div>
            <p className="mb-3 text-sm font-medium text-content-primary">Activity</p>
            <div className="space-y-3">
              {activityRows.map((row, index) => (
                <div 
                  key={row.name} 
                  ref={(el) => { cardRefs.current[payListRows.length + index] = el; }}
                  className="flex items-center gap-3 text-sm transition-all"
                >
                  <img
                    src={row.image}
                    alt={`${row.name} avatar`}
                    className="h-7 w-7 rounded-full border border-surface-border object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="text-content-secondary">
                      <span className="text-content-primary">{row.name}</span> {row.text}
                    </p>
                    <p className="text-xs text-content-muted">{row.time}</p>
                  </div>
                </div>
              ))}
            </div>
            </div>
            <div className="ui-card-compact p-4">
              <p className="ui-label">This week</p>
              <div className="mt-4 space-y-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full w-[68%] rounded-full bg-content-primary" />
                </div>
                <p className="text-sm text-content-secondary">3 of 5 priority payments cleared</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden border-l border-surface-border-subtle bg-surface-raised/24 p-7 lg:block">
          <p className="ui-label">Cash ready</p>
          <div className="mt-5 font-mono text-3xl tracking-[-0.04em] text-content-primary">$2,417</div>
          <div className="mt-7 grid gap-2">
            {heroMetrics.map((metric) => (
              <div key={metric.label} className="ui-card-compact px-3 py-3">
                <p className="text-xs text-content-muted">{metric.label}</p>
                <p className="mt-1 font-mono text-sm text-content-secondary">{metric.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-5 text-sm">
            <div>
              <p className="text-content-muted">Status</p>
              <p className="mt-1 text-content-secondary">Ready to move</p>
            </div>
            <div>
              <p className="text-content-muted">Next review</p>
              <p className="mt-1 text-content-secondary">Friday morning</p>
            </div>
            <div>
              <p className="text-content-muted">Risk</p>
              <p className="mt-1 text-content-secondary">Rent reserve protected</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user: authUser } = useAuth();
  const primaryHref = authUser?.id ? '/pro/dashboard' : '/auth?mode=signup';
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasShownExitModal, setHasShownExitModal] = useState(false);

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownExitModal && !authUser) {
        setShowExitModal(true);
        setHasShownExitModal(true);
        trackEvent('exit_intent_triggered');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitModal, authUser]);

  useSEO({
    title: 'Oweable — Stop guessing what you owe',
    description:
      'Oweable helps you manage bills, debt, subscriptions, due dates, and overdue obligations in one calm Pay List when money already feels heavy.',
    canonical: SITE_CONFIG.getUrl('/'),
    ogImage: SITE_CONFIG.defaultOgImage,
  });

  return (
    <div className="min-h-screen overflow-hidden bg-surface-base text-content-primary selection:bg-content-primary/15">
      <PublicHeader
        links={[
          { href: '#why', label: 'Why', id: 'why' },
          { href: '#flow', label: 'How it works', id: 'flow' },
          { href: '/pricing', label: 'Pricing' },
        ]}
      />

      <main>
        <section className="relative px-5 pb-16 pt-28 sm:px-8 lg:pb-20 lg:pt-32">
          <div className="noise-overlay pointer-events-none fixed inset-0 opacity-[0.035]" />
          <div className="public-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[760px] opacity-60" />

          <div className="relative mx-auto max-w-[1280px]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.94fr)_360px] lg:items-end">
              <div className="public-fade-up">
                <p className="premium-eyebrow">Personal finance for what is actually due</p>
                <h1 className="premium-display mt-5 max-w-[900px]">
                  Stop guessing what you owe.
                </h1>
                <p className="premium-lede mt-7 max-w-2xl">
                  When bills, debt, late fees, and due dates are all competing for your attention, Oweable gives you one ordered Pay List and a calmer way to decide what happens next.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <TransitionLink
                    to={primaryHref}
                    onClick={() => trackEvent('landing_cta_clicked', { location: 'hero' })}
                    className="premium-button-primary"
                  >
                    {authUser?.id ? 'Open app' : 'Get started free'}
                    <ArrowRight className="h-4 w-4" />
                  </TransitionLink>
                  <TransitionLink
                    to="/pricing"
                    className="premium-button-secondary"
                  >
                    View pricing
                  </TransitionLink>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[
                      peopleAvatars.mara,
                      peopleAvatars.jon,
                      peopleAvatars.sarah,
                      peopleAvatars.james,
                    ].map((avatar, index) => (
                      <img
                        key={index}
                        src={avatar}
                        alt=""
                        className="h-8 w-8 rounded-full border-2 border-surface-base object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <div className="text-sm text-content-secondary">
                    <span className="font-medium text-content-primary">2,847+</span> people staying ahead of bills
                  </div>
                </div>
              </div>
              <div className="public-fade-up public-delay-1 hidden lg:block">
                <div className="ui-card-soft p-5">
                  <div className="flex items-center justify-between">
                    <p className="ui-label">Live week</p>
                    <span className="ui-pill ui-pill-muted font-mono">APR 29</span>
                  </div>
                  <div className="mt-7 space-y-5">
                    {heroMetrics.map((metric) => (
                      <div key={metric.label} className="flex items-end justify-between gap-4 border-b border-surface-border-subtle pb-4 last:border-b-0 last:pb-0">
                        <span className="text-sm text-content-tertiary">{metric.label}</span>
                        <span className="font-mono text-lg text-content-primary">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                  <TransitionLink
                    to="/pricing"
                    className="mt-7 inline-flex items-center gap-3 text-sm text-content-secondary transition-colors hover:text-content-primary"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-content-muted opacity-20" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-content-primary" />
                    </span>
                    <span>Stay ahead of bills</span>
                    <ArrowRight className="h-4 w-4 text-content-muted" />
                  </TransitionLink>
                </div>
              </div>
            </div>

            <div className="relative mt-12 lg:mt-14">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section id="why" className="premium-section public-section-line scroll-mt-24">
          <div className="premium-container">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="premium-eyebrow">Why it feels calmer</p>
                <h2 className="premium-heading mt-4 max-w-xl sm:text-5xl">
                  Built for the part of money that keeps interrupting your day.
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-content-tertiary">
                  Oweable is designed around obligation pressure, not generic category charts. The product starts with the money decisions that can cost you if they drift.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {featureRows.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article
                      key={feature.title}
                      className="public-feature-card h-full p-5"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-surface-border-subtle bg-surface-base/54">
                        <Icon className="h-5 w-5 text-content-secondary" />
                      </span>
                      <h3 className="mt-5 text-xl font-medium tracking-[-0.024em] text-content-primary">{feature.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-content-tertiary">{feature.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="premium-section scroll-mt-24 border-y border-surface-border-subtle bg-surface-raised/36">
          <div className="premium-container grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="premium-eyebrow">The operating flow</p>
              <h2 className="premium-heading mt-4 max-w-3xl sm:text-5xl">
                Capture what you owe. Sort the urgency. Make the next payment feel less like a panic decision.
              </h2>
              <div className="mt-9 grid gap-3">
                {flowSteps.map(([number, title, body]) => (
                  <article key={number} className="grid gap-4 rounded-[22px] border border-surface-border-subtle bg-surface-base/36 p-5 sm:grid-cols-[72px_1fr]">
                    <span className="font-mono text-sm text-content-muted">{number}</span>
                    <div>
                      <h3 className="text-lg font-medium tracking-[-0.024em] text-content-primary">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-content-tertiary">{body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="grid gap-2 lg:translate-y-12">
              {proofPoints.map((item, index) => (
                <div
                  key={item}
                  className="ui-card-soft flex items-center justify-between px-4 py-4"
                >
                  <span className="text-sm text-content-secondary">{item}</span>
                  <span className="font-mono text-xs text-content-muted">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="premium-section public-section-line">
          <div className="premium-container">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="premium-eyebrow">Proof from real pressure</p>
                <h2 className="premium-heading mt-4 max-w-2xl sm:text-5xl">
                  For people trying to get their footing back.
                </h2>
              </div>
              <div className="grid gap-4">
                {testimonials.map((testimonial, index) => (
                  <figure
                    key={testimonial.author}
                    className={`public-feature-card p-6 ${index === 1 ? 'lg:ml-14' : index === 2 ? 'lg:ml-28' : ''}`}
                  >
                    <blockquote className="text-base leading-7 text-content-secondary">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.author}
                        className="h-10 w-10 rounded-md border border-surface-border-subtle object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-content-primary">{testimonial.author}</p>
                        <p className="text-xs text-content-tertiary">{testimonial.role}</p>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="premium-section">
          <div className="premium-container">
            <div className="relative overflow-hidden rounded-[22px] border border-surface-border bg-surface-raised p-6 shadow-panel sm:p-10 lg:p-12">
              <div className="public-grid-bg pointer-events-none absolute inset-0 opacity-45" />
              <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="premium-eyebrow">Ready when you are</p>
                  <h2 className="premium-heading mt-4 max-w-3xl sm:text-5xl">
                    Start with what is due. Add payoff planning when you are ready.
                  </h2>
                </div>
                <TransitionLink
                  to={primaryHref}
                  onClick={() => trackEvent('landing_cta_clicked', { location: 'bottom' })}
                  className="premium-button-primary"
                >
                  {authUser?.id ? 'Open app' : 'Get started free'}
                  <ArrowRight className="h-4 w-4" />
                </TransitionLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      
      {/* Exit Intent Modal */}
      <ExitIntentModal isOpen={showExitModal} onClose={() => setShowExitModal(false)} />
    </div>
  );
}
