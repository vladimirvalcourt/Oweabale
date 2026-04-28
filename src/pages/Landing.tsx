import { useEffect, useRef } from 'react';
import { ArrowRight, Check, CircleDollarSign, Clock3, Layers3, ShieldCheck } from 'lucide-react';
import { Footer, PublicHeader } from '../components/layout';
import { TransitionLink } from '../components/common';
import { useAuth, useSEO } from '../hooks';
import gsap from 'gsap';

const proofPoints = ['Bills', 'Debt', 'Subscriptions', 'Tolls', 'Tickets', 'Taxes'];

const featureRows = [
  {
    icon: Clock3,
    title: 'One ordered Pay List',
    body: 'See what is due, what is late, and what can wait without rebuilding the same spreadsheet every week.',
  },
  {
    icon: CircleDollarSign,
    title: 'Payoff direction',
    body: 'Turn scattered balances into a clear next move with snowball, avalanche, and cash-aware payoff paths.',
  },
  {
    icon: Layers3,
    title: 'Full Suite when needed',
    body: 'Add budgets, income tracking, subscriptions, documents, and tax reserves only when the deeper system helps.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Start manually, connect accounts only when useful, and keep financial planning separate from noisy bank apps.',
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
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
    text: 'Marked rent reserve as protected',
    time: '2 min ago',
  },
  {
    name: 'Jon',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    text: 'Added toll notice to the Pay List',
    time: 'just now',
  },
];

function ProductPreview() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Create a timeline for the "ghost clicking" sequence
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      // Animate the card/row being pressed (click down)
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
      
      // Add a small pause between clicks for realism
      .to({}, { duration: 0.8 });
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[10px] border border-surface-border bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_40px_160px_rgba(0,0,0,0.5)]">
      <div className="flex h-12 items-center justify-between border-b border-surface-border-subtle bg-surface-raised/70 px-5">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-[4px] border border-surface-border bg-white/[0.04]" />
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

      <div className="grid min-h-[500px] gap-0 lg:grid-cols-[240px_1fr_320px]">
        <aside className="hidden border-r border-surface-border-subtle bg-surface-raised/36 p-5 lg:block">
          <div className="space-y-1 text-sm">
            {['Inbox', 'Pay List', 'Debt plan', 'Calendar', 'Subscriptions'].map((item, index) => (
              <div key={item} className={`rounded-md px-3 py-2 ${index === 1 ? 'bg-white/[0.055] text-content-primary' : 'text-content-tertiary'}`}>
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
              <p className="text-sm text-content-muted">ENG-2703</p>
              <h2 className="mt-8 text-2xl font-medium tracking-[-0.03em] text-content-primary">Pay List clarity</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-content-tertiary">
                Sort upcoming bills by cash impact, due date, and whether a payment can safely move today.
              </p>
            </div>
            <span className="hidden rounded-md border border-surface-border-subtle px-3 py-1 text-xs text-content-tertiary sm:inline-flex">
              In Progress
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] rounded-[8px] border border-surface-border-subtle bg-surface-base/50">
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
                <span className="hidden self-center rounded-md border border-surface-border-subtle px-2 py-1 text-xs text-content-tertiary sm:inline-flex">
                  {row.state}
                </span>
                <span className="self-center font-mono text-sm text-content-secondary">{row.amount}</span>
                <Check className="hidden h-4 w-4 self-center text-brand-violet sm:block" />
              </div>
            ))}
          </div>

          <div className="mt-8">
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
        </div>

        <aside className="hidden border-l border-surface-border-subtle bg-surface-raised/24 p-7 lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Cash ready</p>
          <div className="mt-5 font-mono text-3xl tracking-[-0.04em] text-content-primary">$2,417</div>
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

  useSEO({
    title: 'Oweable — Stop guessing what you owe',
    description:
      'Oweable helps you track bills, debt, subscriptions, due dates, and obligations in one calm Pay List.',
    canonical: 'https://www.oweable.com/',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <div className="min-h-screen overflow-hidden bg-surface-base text-content-primary selection:bg-brand-violet/25">
      <PublicHeader
        links={[
          { href: '#why', label: 'Why', id: 'why' },
          { href: '#flow', label: 'Flow', id: 'flow' },
          { href: '/pricing', label: 'Pricing' },
        ]}
      />

      <main>
        <section className="relative px-5 pb-20 pt-[272px] sm:px-8">
          <div className="noise-overlay pointer-events-none fixed inset-0 opacity-[0.035]" />

          <div className="relative mx-auto max-w-[1280px]">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
              <h1 className="max-w-[820px] text-[3.4rem] font-medium leading-[0.98] tracking-[-0.055em] text-content-primary sm:text-[4rem] lg:text-[4.28rem]">
                Stop guessing what you owe.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 tracking-[-0.01em] text-content-tertiary">
                Oweable gives you one precise system for what is due, what is behind, and what to pay next, so your money stops living in scattered notes and anxious memory.
              </p>
              </div>
              <div className="flex flex-col items-start gap-5 lg:items-end">
                <TransitionLink
                  to="/pricing"
                  className="inline-flex items-center gap-3 text-sm text-content-secondary transition-colors hover:text-content-primary"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-violet opacity-20" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-indigo" />
                  </span>
                  <span>Stay ahead of bills</span>
                  <span className="text-content-muted">oweable.com/pricing</span>
                  <ArrowRight className="h-4 w-4 text-content-muted" />
                </TransitionLink>
              </div>
            </div>

            <div className="mt-20">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section id="why" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Why it feels calmer</p>
                <h2 className="mt-4 max-w-xl text-4xl font-medium leading-none tracking-[-0.044em] text-content-primary sm:text-5xl">
                  A finance workspace with less noise and more order.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {featureRows.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article
                      key={feature.title}
                      className="rounded-xl border border-surface-border-subtle bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:bg-white/[0.04]"
                    >
                      <Icon className="h-5 w-5 text-brand-violet" />
                      <h3 className="mt-5 text-xl font-medium tracking-[-0.024em] text-content-primary">{feature.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-content-tertiary">{feature.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="border-y border-surface-border-subtle bg-surface-raised/36 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">The operating flow</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-medium leading-none tracking-[-0.044em] text-content-primary sm:text-5xl">
                Capture what you owe. Sort the urgency. Move money with fewer second guesses.
              </h2>
            </div>
            <div className="grid gap-2">
              {proofPoints.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-md border border-surface-border-subtle bg-white/[0.025] px-4 py-3"
                >
                  <span className="text-sm text-content-secondary">{item}</span>
                  <span className="font-mono text-xs text-content-muted">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Ready when you are</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-medium leading-none tracking-[-0.044em] text-content-primary sm:text-5xl">
              Start with the Pay List. Add the planning layer when it helps.
            </h2>
            <div className="mt-8 flex justify-center">
              <TransitionLink
                to={primaryHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-indigo px-5 text-sm font-medium text-white transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px"
              >
                {authUser?.id ? 'Open app' : 'Start free'}
                <ArrowRight className="h-4 w-4" />
              </TransitionLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
