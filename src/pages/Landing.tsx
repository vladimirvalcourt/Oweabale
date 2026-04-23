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
  'For people tired of keeping their money life together with memory, notes, and stress',
  'Built for steady paychecks, uneven income, shared households, and messy real life',
  'Start free with no credit card and no pressure to have everything figured out',
];

const painPoints = [
  {
    title: 'You are tired of being surprised by your own bills',
    copy:
      'Rent, cards, subscriptions, insurance, tickets, and random one-offs end up scattered across apps, emails, and mental notes. Oweable brings them back into one view so you can breathe again.',
  },
  {
    title: 'Debt makes you feel stuck even when you are trying',
    copy:
      'Making minimum payments can feel like doing your best and still going nowhere. Oweable helps you see a payoff path so your money stops disappearing into something that never seems to move.',
  },
  {
    title: 'Your bank balance does not tell the whole truth',
    copy:
      'Seeing money in checking is not the same as knowing what is actually safe to spend. Oweable layers in due dates, recurring obligations, and reserves so you can make calmer decisions.',
  },
];

const workflowSteps = [
  {
    eyebrow: 'Step 01',
    title: 'Gather the pieces that have been living everywhere',
    copy:
      'Bring in bills, debt, subscriptions, and recurring obligations manually or connect accounts when you want less manual work.',
  },
  {
    eyebrow: 'Step 02',
    title: 'See what needs your attention before it becomes urgent',
    copy:
      'The dashboard puts due soon, overdue, and upcoming items in one calm place so you know what needs to happen next.',
  },
  {
    eyebrow: 'Step 03',
    title: 'Start responding with a plan instead of panic',
    copy:
      'Use payoff guidance, budget guardrails, and reserve targets to move from catching up all the time to finally making progress.',
  },
];

const capabilityColumns = [
  {
    title: 'Stay ahead of what is coming',
    items: [
      'Keep recurring bills, subscriptions, and one-off obligations in one place',
      'Get reminders before a due date turns into a late fee or a missed payment',
      'See what is hitting now, what is next, and what can wait',
    ],
  },
  {
    title: 'Make debt payoff feel real again',
    items: [
      'Compare Snowball and Avalanche strategies without leaving your bill view',
      'See how much interest your current pattern is really costing you',
      'Watch progress become visible instead of always feeling abstract',
    ],
  },
  {
    title: 'Work with real income, not ideal income',
    items: [
      'Built for paychecks, side gigs, freelance work, and mixed-income households',
      'Plan for taxes and reserves when income is uneven',
      'Use budgets that respect reality instead of pretending every month looks the same',
    ],
  },
];

const audienceCards = [
  {
    title: 'People holding too much in their head',
    copy:
      'If your money system lives across bank apps, notes, text messages, and memory, Oweable helps turn that mental load into something visible and manageable.',
    accent: 'Less remembering. More clarity.',
  },
  {
    title: 'Households trying to stay on the same page',
    copy:
      'See the same picture of what is owed, what is coming, and what is getting paid down without relying on one person to carry the whole system.',
    accent: 'Shared visibility without spreadsheet fatigue.',
  },
  {
    title: 'Anyone whose income does not arrive neatly',
    copy:
      'Track uneven income, build reserves, and plan for taxes without needing one app for earning and another for everything else you owe.',
    accent: 'Irregular income without a chaotic system.',
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
      'I stopped checking my bank balance ten times a day just to calm myself down. The due-soon view finally showed me what was actually safe.',
    name: 'Jasmine',
    label: 'W-2 + side gigs',
  },
  {
    quote:
      'The payoff plan made my debt feel like something I could finish. Before that, every payment just felt like money disappearing.',
    name: 'Marcus',
    label: 'Credit cards + student loans',
  },
  {
    quote:
      'Most apps made me choose between budgeting and managing freelance life. This was the first one that felt like it understood both.',
    name: 'Devin',
    label: 'Freelance designer',
  },
];

const faqItems = [
  {
    q: 'Is Oweable free to use?',
    a: 'Yes. The free Tracker tier gives you bill tracking, due-date visibility, and core reminders. Full Suite adds deeper planning tools when you want more support around debt, cash flow, and uneven income.',
  },
  {
    q: 'Is this only for freelancers?',
    a: 'No. Oweable is for anyone who feels like money is harder to stay on top of than it should be. Freelance and tax tools are there if you need them, but the core problem is broader than that.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No. Oweable runs in your browser on desktop and mobile, so you can start without adding another app to your life.',
  },
  {
    q: 'How is this different from a basic budgeting app?',
    a: 'Most budgeting tools focus on where money went. Oweable focuses on what is due next, what is behind, and what to do first when everything feels equally urgent.',
  },
];

export default function Landing() {
  useSEO({
    title: 'Oweable — Money Help for When Life Already Feels Full',
    description:
      'Oweable helps you keep up with bills, debt, subscriptions, and uneven income without trying to hold everything in your head. See what is due, what is behind, and what needs attention next.',
    ogTitle: 'Oweable — When Money Feels Hard to Hold Together',
    ogDescription:
      'A calmer way to manage bills, debt, cash flow, and uneven income when your financial life feels heavier than it should.',
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
                Start free · No credit card required
              </div>
              
              <h1 className="text-5xl font-semibold tracking-tight text-content-primary sm:text-6xl lg:text-7xl">
                Money is hard enough.
                <br className="hidden sm:block" />
                <span className="text-content-secondary">Your system should help.</span>
              </h1>
              
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-content-secondary">
                Oweable is for people who are tired of keeping bills, debt, subscriptions, and due dates in their head. It helps you see what matters now, what is coming next, and where to start.
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
                    See how it helps
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
              <div className="mx-auto max-w-[920px]">
                <HeroPreviewMedia />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border bg-surface-raised py-10">
          <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-6 text-sm text-content-secondary md:grid-cols-3 lg:px-8">
            {proofPoints.map((point, index) => (
              <div key={point} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                <p className="leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why" className="py-32 relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-24">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">The Logic</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:text-6xl lg:tracking-tighter">
                The stress is not just money.<br className="hidden lg:block" />
                <span className="text-content-secondary">It is carrying too much alone.</span>
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
                One place to see<br className="hidden lg:block" />
                <span className="text-content-secondary">what your money needs from you.</span>
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
                <p className="text-xs leading-relaxed text-content-secondary">Bring paperwork and statements into the system without more manual chasing.</p>
              </div>
              <div className="rounded-[10px] border border-surface-border bg-surface-raised p-6 transition-colors hover:bg-surface-elevated">
                <p className="text-sm font-semibold text-content-primary mb-1">Financial Academy</p>
                <p className="text-xs leading-relaxed text-content-secondary">Plain-English guidance for the moments when you need clarity, not shame.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="py-32 relative border-t border-surface-border">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-start mb-20">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">Capabilities</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:tracking-tighter">
                Support for the parts of money<br className="hidden lg:block" />
                <span className="text-content-secondary">that tend to pile up fast.</span>
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
                  We do not expect you to have a perfect budget, perfect income, or perfect attention span. We expect you to have a life. Oweable is built for that version of money.
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
                  What people want most is relief.
                </h2>
                <p className="mt-6 max-w-lg text-lg leading-8 text-content-secondary">
                  When people can finally see what is due, what is late, and what progress looks like, money decisions stop feeling like small emergencies all day long.
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
                Start with what helps now.<br className="hidden lg:block" />
                <span className="text-content-secondary">Add more support when you need it.</span>
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
                  A simple starting point for seeing what is due, what is coming, and what you do not want to miss.
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
                  Start free
                </button>
              </article>

              {/* Full Suite with Yearly Toggle */}
              <article className="relative p-10 flex flex-col rounded-[12px] border border-brand-profit bg-brand-profit/5 overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 bg-brand-profit text-surface-base text-xs font-bold uppercase tracking-wide rounded-bl-[10px]">More support</div>
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
                  For when you want deeper help with payoff planning, budgets, cash flow, and the parts of money that keep pulling you back into stress.
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
                  Try Full Suite
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
                Questions people ask when they are trying to get unstuck.
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
