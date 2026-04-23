import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Footer from '../components/Footer';
import HeroPreviewMedia from '../components/landing/HeroPreviewMedia';
import { TransitionLink } from '../components/TransitionLink';
import { BrandWordmark } from '../components/BrandWordmark';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';
import { useSEO } from '../hooks/useSEO';
import { useStore } from '../store/useStore';

function useInView(threshold = 0.18) {
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

// Interactive NavLink with cursor-following glow
function NavLink({
  href,
  children,
  isActive,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 28 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 28 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <a
      ref={ref}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative px-2 py-1 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
        isActive ? 'text-content-primary' : 'text-content-tertiary hover:text-content-primary'
      }`}
    >
      <motion.span
        className="absolute inset-0 rounded-md bg-content-primary/5"
        style={{
          opacity: useTransform(mouseXSpring, [-100, 0, 100], [0, 0.3, 0]),
          scale: useTransform(mouseXSpring, [-100, 0, 100], [0.8, 1, 0.8]),
        }}
      />
      <span className="relative z-10">{children}</span>
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute bottom-0 left-0 right-0 h-px bg-brand-profit"
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        />
      )}
    </a>
  );
}

const proofPoints = [
  'One place for bills, debt, subscriptions, budgets, and due dates',
  'Built for both steady paychecks and irregular income',
  'No credit card required to start your free account',
];

const painPoints = [
  {
    title: 'Bills sneak up on you',
    copy:
      'Rent, cards, subscriptions, tickets, and one-off obligations end up living in five different places. Oweable turns them into one weekly picture.',
  },
  {
    title: 'Debt feels static until it gets expensive',
    copy:
      'Minimum payments keep the lights on, but they rarely create momentum. Oweable shows your payoff path so your next dollar has a job.',
  },
  {
    title: 'Cash flow lies when it ignores what is due',
    copy:
      'A checking balance is not a plan. Oweable layers due dates, recurring obligations, and reserves on top so you can see what is actually safe.',
  },
];

const workflowSteps = [
  {
    eyebrow: 'Step 01',
    title: 'Bring your money life into one place',
    copy:
      'Add bills, debts, subscriptions, and recurring obligations manually or connect accounts when you want more automation.',
  },
  {
    eyebrow: 'Step 02',
    title: 'See what needs attention this week',
    copy:
      'The dashboard pulls due soon, overdue, and upcoming items into one calm view so you know what must happen next.',
  },
  {
    eyebrow: 'Step 03',
    title: 'Follow a plan instead of reacting',
    copy:
      'Use debt payoff guidance, budget guardrails, and reserve targets to move from late-fee management to real progress.',
  },
];

const capabilityColumns = [
  {
    title: 'Stay ahead of due dates',
    items: [
      'Recurring bills, subscriptions, and one-off obligations',
      'Overdue detection and reminders before the damage lands',
      'A weekly view that shows what is hitting now versus next',
    ],
  },
  {
    title: 'Make payoff decisions with confidence',
    items: [
      'Snowball and Avalanche strategies in the same place as your bills',
      'A clearer view of how much interest your current pattern is costing',
      'Progress that feels visible instead of theoretical',
    ],
  },
  {
    title: 'Handle real-life income patterns',
    items: [
      'Works for W-2 households, side gigs, freelance, and mixed income',
      'Tax estimates and reserve planning when income is uneven',
      'Budgets that respect reality instead of pretending every month matches',
    ],
  },
];

const audienceCards = [
  {
    title: 'Individuals with too many moving pieces',
    copy:
      'If your money system lives across bank apps, notes, texts, and memory, Oweable turns that noise into a reliable operating view.',
    accent: 'Bills, subscriptions, debt, and due dates in one rhythm.',
  },
  {
    title: 'Households sharing obligations',
    copy:
      'See the same picture of what is owed, what is coming, and what is being paid down without relying on one person to hold it all in their head.',
    accent: 'Shared visibility without spreadsheet fatigue.',
  },
  {
    title: 'Freelancers and variable-income earners',
    copy:
      'Track uneven income, build reserves, and plan for taxes without using a separate workflow for the rest of your money life.',
    accent: 'Irregular income without irregular systems.',
  },
];

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

const cardHover = {
  hover: {
    y: -4,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    transition: { type: 'spring' as const, stiffness: 400, damping: 17 },
  },
};

const testimonials = [
  {
    quote:
      'I stopped using my checking balance as a lie detector. The due-soon view changed how I decide what is safe to spend.',
    name: 'Jasmine',
    label: 'W-2 + side gigs',
  },
  {
    quote:
      'The payoff plan finally made my debt feel finite. Before that, every payment felt like disappearing money.',
    name: 'Marcus',
    label: 'Credit cards + student loans',
  },
  {
    quote:
      'Most apps understood budgets or freelance taxes. Oweable was the first one that understood both at the same time.',
    name: 'Devin',
    label: 'Freelance designer',
  },
];

const faqItems = [
  {
    q: 'Is Oweable free to use?',
    a: 'Yes. The free Tracker tier gives you bill tracking, due-date visibility, and core reminders. Full Suite adds debt tools, budgets, analytics, optional bank sync, and tax planning for $10.99 per month.',
  },
  {
    q: 'Is this only for freelancers?',
    a: 'No. Oweable is for anyone trying to get control over bills, debt, subscriptions, and cash flow. Freelance and tax tools are there when you need them, not as the only use case.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No. Oweable runs securely in your browser on desktop and mobile. You can still use your phone camera for bill capture and document upload without installing anything.',
  },
  {
    q: 'How is this different from a basic budgeting app?',
    a: 'Most budgeting tools show where money went. Oweable focuses on what is owed next, what is overdue, and what to pay off first, so the app acts more like a financial operating system than a simple tracker.',
  },
];

export default function Landing() {
  useSEO({
    title: 'Oweable — Stop Losing Money to Bills, Debt & Late Fees',
    description:
      'Track bills, debt, subscriptions, and uneven income in one place. Oweable shows what is due, what is behind, and what to pay off next. Start free with no credit card required.',
    ogTitle: 'Oweable — Stop Guessing What You Owe',
    ogDescription:
      'Oweable gives you a clear weekly view of bills, debt, subscriptions, budgets, and reserves so you can stop running your money by memory.',
    canonical: 'https://www.oweable.com/',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [heroRef, heroVisible] = useInView(0.08);
  const [storyRef, storyVisible] = useInView(0.12);
  const [audienceRef, audienceVisible] = useInView(0.12);
  const user = useStore((state) => state.user);
  const primaryHref = user?.id ? '/dashboard' : '/onboarding';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active section for nav highlighting
  useEffect(() => {
    const sections = ['why', 'flow', 'capabilities', 'pricing', 'faq'];
    const observers: IntersectionObserver[] = [];

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(sectionId);
          }
        },
        { threshold: 0.3, rootMargin: '-100px 0px -60% 0px' }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <nav
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-surface-base/60 backdrop-blur-xl transition-all duration-300"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <TransitionLink to="/" className="group flex items-center gap-2">
            <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.1em] text-content-primary" />
          </TransitionLink>
          <div className="hidden items-center gap-8 md:flex">
            <NavLink href="#why" isActive={activeSection === 'why'}>Why</NavLink>
            <NavLink href="#flow" isActive={activeSection === 'flow'}>System</NavLink>
            <NavLink href="#pricing" isActive={activeSection === 'pricing'}>Plans</NavLink>
            <NavLink href="#faq" isActive={activeSection === 'faq'}>FAQ</NavLink>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <ThemeToggle />
            <motion.div variants={springButton} whileHover="hover" whileTap="tap">
              <TransitionLink
                to={primaryHref}
                className="inline-flex items-center justify-center rounded-full bg-content-primary px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-base transition-all duration-300 hover:scale-105 sm:px-6"
              >
                <span className="relative z-10">{user?.id ? 'Dashboard' : 'Get Started'}</span>
              </TransitionLink>
            </motion.div>
          </div>
        </div>
      </nav>

      <main id="main-content">
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {/* Hero Content */}
            <div
              ref={heroRef}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium text-content-secondary mb-8">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                Free forever · No credit card required
              </div>
              
              <h1 className="text-5xl font-semibold tracking-tight text-content-primary sm:text-6xl lg:text-7xl">
                See your money clearly.
                <br className="hidden sm:block" />
                <span className="text-content-secondary">Pay off debt faster.</span>
              </h1>
              
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-content-secondary">
                Oweable brings bills, debt, and subscriptions into one view so you always know what's due and what to pay next.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                  <TransitionLink
                    to={primaryHref}
                    className="inline-flex items-center justify-center rounded-[10px] bg-brand-cta px-8 h-[48px] text-sm font-semibold text-surface-base transition-all hover:brightness-110 focus-app min-w-[160px]"
                  >
                    {user?.id ? 'Open Dashboard' : 'Get Started Free'}
                  </TransitionLink>
                </motion.div>
                <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                  <a
                    href="#flow"
                    className="inline-flex items-center justify-center rounded-[10px] border border-surface-border bg-transparent px-8 h-[48px] text-sm font-medium text-content-primary transition-colors hover:bg-surface-elevated min-w-[160px]"
                  >
                    See how it works
                  </a>
                </motion.div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div
              className={`mt-16 transition-all duration-1000 ease-out ${
                heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
            >
              <div className="relative rounded-[16px] border border-surface-border bg-surface-raised p-2 shadow-2xl">
                <div className="rounded-[14px] border border-surface-border bg-surface-base overflow-hidden">
                  <HeroPreviewMedia />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border bg-surface-raised">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 text-sm text-content-secondary md:grid-cols-3 lg:px-8">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                <p>{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why" className="py-32 relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-24">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">The Logic</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:text-6xl lg:tracking-tighter">
                The problem isn't spending.<br className="hidden lg:block" />
                <span className="text-content-secondary">It's financial fog.</span>
              </h2>
            </div>

            <motion.div
              className="grid gap-6 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {painPoints.map((item) => (
                <motion.article
                  key={item.title}
                  variants={fadeInUp}
                  whileHover="hover"
                  className="group rounded-[12px] border border-surface-border bg-surface-raised p-8 transition-all hover:border-surface-border/60 hover:shadow-lg"
                >
                  <h3 className="text-lg font-semibold text-content-primary mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-content-secondary">{item.copy}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section
          id="flow"
          className="relative py-32 overflow-hidden border-t border-surface-border"
        >
          <div className="absolute inset-0 z-0">
             <div className="absolute top-[20%] right-[-10%] h-[50%] w-[50%] rounded-full bg-brand-profit/5 blur-[120px]" />
          </div>

          <div
            ref={storyRef}
            className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 opacity-100 translate-y-0"
          >
            {/* Section Header */}
            <div className="flex flex-col items-start mb-20">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">The System</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:tracking-tighter">
                One command center for<br className="hidden lg:block" />
                <span className="text-content-secondary">what your money needs next.</span>
              </h2>
            </div>

            {/* Grid Layout - Matches Capabilities */}
            <motion.div
              className="grid gap-6 md:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {workflowSteps.map((step) => (
                <motion.article
                  key={step.title}
                  variants={fadeInUp}
                  whileHover="hover"
                  className="group rounded-[12px] border border-surface-border bg-surface-raised p-8 transition-all hover:border-surface-border/60 hover:shadow-lg flex flex-col"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-profit mb-3">{step.eyebrow}</p>
                  <h3 className="text-lg font-semibold text-content-primary mb-4">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-content-secondary flex-grow">{step.copy}</p>
                </motion.article>
              ))}
            </motion.div>

            {/* Additional Features - Compact Cards */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-[10px] border border-surface-border bg-surface-raised p-6 transition-colors hover:bg-surface-elevated">
                <p className="text-sm font-semibold text-content-primary mb-1">Bill Capture</p>
                <p className="text-xs leading-relaxed text-content-secondary">Snap statements and bring them into the system automatically.</p>
              </div>
              <div className="rounded-[10px] border border-surface-border bg-surface-raised p-6 transition-colors hover:bg-surface-elevated">
                <p className="text-sm font-semibold text-content-primary mb-1">Financial Academy</p>
                <p className="text-xs leading-relaxed text-content-secondary">Plain-English lessons for the moments when you want more context.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="py-32 relative border-t border-surface-border">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-start mb-20">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">Capabilities</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:tracking-tighter">
                Precision engineering for<br className="hidden lg:block" />
                <span className="text-content-secondary">your money workflow.</span>
              </h2>
            </div>

            <motion.div
              className="grid gap-6 md:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {capabilityColumns.map((column) => (
                <motion.article
                  key={column.title}
                  variants={fadeInUp}
                  whileHover="hover"
                  className="group rounded-[12px] border border-surface-border bg-surface-raised p-8 transition-all hover:border-surface-border/60 hover:shadow-lg"
                >
                  <h3 className="text-lg font-semibold text-content-primary mb-6">{column.title}</h3>
                  <ul className="space-y-3">
                    {column.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                        <span className="text-sm leading-relaxed text-content-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="py-32 relative overflow-hidden border-t border-surface-border">
          <div
            ref={audienceRef}
            className="mx-auto max-w-7xl px-6 lg:px-8 opacity-100 translate-y-0"
          >
            <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">Audience</p>
                <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:tracking-tighter">
                  Built for the messy reality of money.
                </h2>
                <p className="mt-8 max-w-2xl text-lg leading-relaxed text-content-secondary">
                  We don't expect you to have a perfect budget. We expect you to have a life. Oweable is built for households, freelancers, and anyone with "too many moving pieces."
                </p>
              </div>
              <motion.div
                className="grid gap-6 lg:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
              >
                {audienceCards.map((item) => (
                  <motion.article
                    key={item.title}
                    variants={fadeInUp}
                    whileHover="hover"
                    className="group rounded-[12px] border border-surface-border bg-surface-raised p-8 transition-all hover:border-surface-border/60 hover:shadow-lg"
                  >
                    <h3 className="text-lg font-semibold text-content-primary mb-3">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-content-secondary mb-3">{item.copy}</p>
                    <p className="text-xs font-medium text-brand-profit">{item.accent}</p>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-surface-base py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-profit">Social proof</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-content-primary">
                  The value is emotional before it is technical.
                </h2>
                <p className="mt-6 max-w-lg text-lg leading-8 text-content-secondary">
                  When people can see what is due, what is late, and what progress looks like, their money decisions
                  stop feeling like emergencies.
                </p>
              </div>
              <motion.div
                className="grid gap-6 lg:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
              >
                {testimonials.map((item) => (
                  <motion.article
                    key={item.name}
                    variants={fadeInUp}
                    whileHover="hover"
                    className="group rounded-[12px] border border-surface-border bg-surface-raised p-8 transition-all hover:border-surface-border/60 hover:shadow-lg"
                  >
                    <p className="text-sm leading-relaxed text-content-primary mb-6">"{item.quote}"</p>
                    <div className="border-t border-surface-border pt-5">
                      <p className="text-sm font-semibold text-content-primary">{item.name}</p>
                      <p className="mt-1 text-sm text-content-secondary">{item.label}</p>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-32 relative border-t border-surface-border">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-20">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">Pricing</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:tracking-tighter">
                Start with essentials.<br className="hidden lg:block" />
                <span className="text-content-secondary">Upgrade when you're ready.</span>
              </h2>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
              {/* Free Tier */}
              <article className="glass-card group p-10 flex flex-col transition-all hover:bg-surface-highlight rounded-[12px]">
                <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-6">Free Tracker</p>
                <div className="flex items-end gap-2 mb-8">
                  <span className="text-6xl font-bold tracking-tight text-content-primary">$0</span>
                  <span className="pb-1 text-sm text-content-secondary font-medium">/ month</span>
                </div>
                <p className="text-sm leading-relaxed text-content-secondary mb-10">
                  Immediate visibility into bills, due dates, and core reminders.
                </p>
                <ul className="space-y-4 mb-10 flex-grow">
                  {['Bill tracking', 'Due-date visibility', 'Recurring obligations', 'Core reminders'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-content-secondary font-medium">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full h-[48px] rounded-[10px] border border-surface-border bg-surface-raised text-xs font-semibold uppercase tracking-wide text-content-primary hover:bg-surface-elevated transition-colors">
                  Start Track
                </button>
              </article>

              {/* Full Suite with Yearly Toggle */}
              <article className="relative p-10 flex flex-col rounded-[12px] border border-brand-profit bg-brand-profit/5 overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 bg-brand-profit text-surface-base text-xs font-bold uppercase tracking-wide rounded-bl-[10px]">Best Value</div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">Full Suite</p>
                
                {/* Billing Toggle */}
                <div className="inline-flex rounded-full border border-surface-border bg-surface-raised p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('monthly')}
                    aria-pressed={billingPeriod === 'monthly'}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      billingPeriod === 'monthly'
                        ? 'bg-brand-profit text-surface-base'
                        : 'text-content-secondary hover:text-content-primary'
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
                        ? 'bg-brand-profit text-surface-base'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    Yearly · Save 17%
                  </button>
                </div>

                {/* Dynamic Pricing Display */}
                <div className="flex items-end gap-2 mb-8">
                  {billingPeriod === 'yearly' ? (
                    <>
                      <span className="text-6xl font-bold tracking-tight text-content-primary">$9.16</span>
                      <div className="pb-1 flex flex-col items-start">
                        <span className="text-sm text-brand-profit/70 font-medium">per month</span>
                        <span className="text-xs text-brand-profit font-semibold">Billed $109.99 yearly</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-6xl font-bold tracking-tight text-content-primary">$10.99</span>
                      <span className="pb-1 text-sm text-brand-profit/70 font-medium">/ month</span>
                    </>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-content-secondary mb-10">
                  The complete operating system: debt, budgets, taxes, and deep cash-flow.
                </p>
                <ul className="space-y-4 mb-10 flex-grow">
                  {['Debt payoff engine', 'Advanced analytics', 'Tax planning', 'Variable income tools'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-content-primary font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full h-[48px] rounded-[10px] bg-brand-cta text-xs font-semibold uppercase tracking-wide text-surface-base hover:brightness-110 transition-all">
                  Deploy Suite
                </button>
                <p className="mt-6 text-xs text-center text-content-tertiary uppercase tracking-wide">14-day trial included</p>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className="py-32 relative border-t border-surface-border">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-20">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">FAQ</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
                Common inquiries.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto">
              {faqItems.map((item) => (
                <article
                  key={item.q}
                  className="rounded-[12px] border border-surface-border bg-surface-raised p-8 transition-all hover:bg-surface-highlight"
                >
                  <h3 className="text-sm font-semibold text-content-primary mb-4 tracking-tight">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-content-secondary">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-40 relative border-t border-surface-border overflow-hidden">
          <div className="absolute inset-0 z-0">
             <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 h-full w-full bg-brand-profit/5 blur-[180px]" />
          </div>

          <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center relative z-10">
            <p className="text-xs font-black uppercase tracking-widest text-brand-profit mb-8">Ready to Initialize</p>
            <h2 className="text-5xl font-bold tracking-tight text-content-primary sm:text-7xl lg:text-8xl mb-12">
              Money stress is just<br className="hidden lg:block" />
              <span className="text-content-secondary/40">missing visibility.</span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                <TransitionLink
                  to={primaryHref}
                  className="group relative inline-flex items-center justify-center gap-3 rounded-[10px] bg-brand-cta px-8 h-[56px] text-sm font-semibold uppercase tracking-wide text-surface-base transition-all duration-300 hover:brightness-110 min-w-[200px]"
                >
                  {user?.id ? 'Open Command Center' : 'Get Started Free'}
                </TransitionLink>
              </motion.div>
              <TransitionLink
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-surface-border bg-transparent px-8 h-[56px] text-sm font-medium text-content-primary transition-colors hover:bg-surface-elevated min-w-[200px]"
              >
                Compare Plans
              </TransitionLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
