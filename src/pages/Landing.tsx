import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Footer from '../components/Footer';
import HeroPreviewMedia from '../components/landing/HeroPreviewMedia';
import { TransitionLink } from '../components/TransitionLink';
import { BrandWordmark } from '../components/BrandWordmark';
import { ThemeToggle } from '../components/ThemeToggle';
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

function NavLink({
  href,
  children,
  isActive,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <a
      href={href}
      className={`relative min-h-[48px] px-2 py-1 flex items-center text-[11px] font-medium uppercase tracking-[0.15em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base ${
        isActive ? 'text-content-primary' : 'text-content-tertiary hover:text-content-primary'
      }`}
    >
      <span className="relative z-10">{children}</span>
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute bottom-0 left-0 right-0 h-px bg-brand-profit"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const springButton: Variants = {
  hover: { scale: 1.01, transition: { duration: 0.18, ease: 'easeOut' as const } },
  tap: { scale: 0.99, transition: { duration: 0.12, ease: 'easeOut' as const } },
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

  const [activeSection, setActiveSection] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [heroRef, heroVisible] = useInView(0.08);
  const user = useStore((state) => state.user);
  const primaryHref = user?.id ? '/dashboard' : '/onboarding';

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
        className="fixed inset-x-0 top-0 z-50 border-b border-content-primary/10 bg-surface-base/60 backdrop-blur-xl transition-all duration-300"
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
                className="inline-flex items-center justify-center rounded-full bg-content-primary px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-base transition-colors duration-200 hover:bg-brand-cta-hover sm:px-6"
              >
                <span className="relative z-10">{user?.id ? 'Dashboard' : 'Get Started'}</span>
              </TransitionLink>
            </motion.div>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {/* New SaaS Hero Section - Redesigned with Premium Touches */}
        <section className="relative min-h-screen flex flex-col items-center justify-start px-6 py-24 md:py-32 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden">
          {/* Subtle noise texture overlay for depth */}
          <div 
            className="absolute inset-0 opacity-[0.015] pointer-events-none z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }}
            aria-hidden="true"
          />
          
          {/* Ambient gradient background for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-indigo/[0.03] via-transparent to-transparent pointer-events-none" aria-hidden="true" />

          {/* Announcement Banner - Offset slightly left to break symmetry */}
          <aside className="mb-10 inline-flex flex-wrap items-center justify-center gap-2 px-5 py-2 rounded-full border border-surface-border bg-surface-highlight/80 backdrop-blur-md max-w-full shadow-sm">
            <span className="text-xs text-center whitespace-nowrap text-content-secondary font-medium">
              Start free · No credit card required
            </span>
            <a
              href="#why"
              className="flex items-center gap-1.5 text-xs hover:text-content-primary transition-all active:scale-95 whitespace-nowrap text-content-secondary group"
              aria-label="Learn more about Oweable"
            >
              Learn more
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </aside>

          {/* Main Heading - Tighter tracking, more presence */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-center max-w-4xl px-6 leading-[1.05] mb-8 tracking-tight bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-transparent">
            Money is hard enough.
            <br />Your system should help.
          </h1>

          {/* Subtitle - Better line height, constrained width */}
          <p className="text-base md:text-lg text-center max-w-xl px-6 mb-12 text-content-secondary/90 leading-relaxed">
            Oweable helps you keep up with bills, debt, subscriptions, and uneven income without trying to hold everything in your head.
          </p>

          {/* CTA Buttons - Added secondary text link option */}
          <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 mb-20">
            <motion.div variants={springButton} whileHover="hover" whileTap="tap">
              <TransitionLink
                to={primaryHref}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-white via-white/95 to-white/60 text-black px-10 h-12 text-base font-semibold hover:scale-105 active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 shadow-lg shadow-white/5"
              >
                {user?.id ? 'Open Dashboard' : 'Get Started Free'}
              </TransitionLink>
            </motion.div>
            <a
              href="#flow"
              className="text-sm text-content-secondary hover:text-content-primary transition-colors underline underline-offset-4 decoration-content-tertiary/40 hover:decoration-content-primary/60"
            >
              See how it works
            </a>
          </div>

          {/* Dashboard Preview - Enhanced glow with layered effect */}
          <div className="w-full max-w-5xl relative pb-24">
            {/* Primary glow - larger, softer */}
            <div
              className="absolute left-1/2 w-[95%] pointer-events-none z-0"
              style={{
                top: "-28%",
                transform: "translateX(-50%)"
              }}
              aria-hidden="true"
            >
              <div className="w-full h-80 bg-gradient-to-t from-brand-indigo/15 via-brand-indigo/5 to-transparent blur-3xl" />
            </div>
            
            {/* Secondary accent glow - offset for asymmetry */}
            <div
              className="absolute left-1/3 w-[60%] pointer-events-none z-0 opacity-40"
              style={{
                top: "-15%",
                transform: "translateX(-30%)"
              }}
              aria-hidden="true"
            >
              <div className="w-full h-64 bg-gradient-to-tr from-brand-violet/10 to-transparent blur-2xl" />
            </div>
            
            {/* Dashboard Image - With subtle border and enhanced shadow */}
            <div className="relative z-10 rounded-xl overflow-hidden border border-surface-border/50 shadow-2xl shadow-black/20">
              <HeroPreviewMedia />
            </div>
          </div>
        </section>

        <section className="border-y border-surface-border bg-surface-raised py-8">
          <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-5 px-6 text-sm text-content-secondary md:grid-cols-3 lg:px-8">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-profit" />
                <p className="leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why" className="relative py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-16 flex flex-col items-center text-center">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-profit">The Logic</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
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
                  className="rounded-[12px] border border-surface-border bg-surface-raised p-7 transition-colors duration-200 hover:border-content-primary/15"
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
          className="relative border-t border-surface-border py-24"
        >
          <div
            className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8"
          >
            <div className="mb-16 flex flex-col items-start">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-profit">The System</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
                One place to see<br className="hidden lg:block" />
                <span className="text-content-secondary">what your money needs from you.</span>
              </h2>
            </div>

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
                  className="flex flex-col rounded-[12px] border border-surface-border bg-surface-raised p-7 transition-colors duration-200 hover:border-content-primary/15"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-profit mb-3">{step.eyebrow}</p>
                  <h3 className="text-lg font-semibold text-content-primary mb-4">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-content-secondary flex-grow">{step.copy}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-[10px] border border-surface-border bg-surface-raised p-6 transition-colors duration-200 hover:border-content-primary/15">
                <p className="text-sm font-semibold text-content-primary mb-1">Bill Capture</p>
                <p className="text-xs leading-relaxed text-content-secondary">Bring paperwork and statements into the system without more manual chasing.</p>
              </div>
              <div className="rounded-[10px] border border-surface-border bg-surface-raised p-6 transition-colors duration-200 hover:border-content-primary/15">
                <p className="text-sm font-semibold text-content-primary mb-1">Financial Academy</p>
                <p className="text-xs leading-relaxed text-content-secondary">Plain-English guidance for the moments when you need clarity, not shame.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="relative border-t border-surface-border py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-16 flex flex-col items-start">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-profit">Capabilities</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
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
                  className="rounded-[12px] border border-surface-border bg-surface-raised p-7 transition-colors duration-200 hover:border-content-primary/15"
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

        <section className="relative border-t border-surface-border py-24">
          <div
            className="mx-auto max-w-7xl px-6 lg:px-8"
          >
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-profit">Audience</p>
                <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
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
                    className="rounded-[12px] border border-surface-border bg-surface-raised p-7 transition-colors duration-200 hover:border-content-primary/15"
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

        <section className="bg-surface-base py-20">
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
                    className="rounded-[12px] border border-surface-border bg-surface-raised p-7 transition-colors duration-200 hover:border-content-primary/15"
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

        <section id="pricing" className="relative border-t border-surface-border py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-16 flex flex-col items-center text-center">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-profit">Pricing</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
                Start with what helps now.<br className="hidden lg:block" />
                <span className="text-content-secondary">Add more support when you need it.</span>
              </h2>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
              <article className="flex flex-col rounded-[12px] border border-surface-border bg-surface-raised p-8">
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
                <button className="h-[48px] w-full rounded-[10px] border border-surface-border bg-surface-base text-xs font-semibold uppercase tracking-wide text-content-primary transition-colors duration-200 hover:border-content-primary/15">
                  Start free
                </button>
              </article>

              <article className="flex flex-col rounded-[12px] border border-surface-border bg-surface-raised p-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-profit mb-6">Full Suite</p>
                <div className="w-fit inline-flex rounded-full border border-surface-border bg-surface-highlight p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('monthly')}
                    aria-pressed={billingPeriod === 'monthly'}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                      billingPeriod === 'monthly'
                        ? 'bg-brand-profit text-surface-base shadow-sm'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('yearly')}
                    aria-pressed={billingPeriod === 'yearly'}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                      billingPeriod === 'yearly'
                        ? 'bg-brand-profit text-surface-base shadow-sm'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    Yearly
                  </button>
                </div>

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
                <button className="h-[48px] w-full rounded-[10px] bg-brand-cta text-xs font-semibold uppercase tracking-wide text-surface-base transition-colors duration-200 hover:bg-brand-cta-hover">
                  Try Full Suite
                </button>
                <p className="mt-6 text-xs text-center text-content-tertiary uppercase tracking-wide">14-day trial included</p>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className="relative border-t border-surface-border py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-16 flex flex-col items-center text-center">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-profit">FAQ</p>
              <h2 className="text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
                Questions people ask when they are trying to get unstuck.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto">
              {faqItems.map((item) => (
                <article
                  key={item.q}
                  className="rounded-[12px] border border-surface-border bg-surface-raised p-7 transition-colors duration-200 hover:border-content-primary/15"
                >
                  <h3 className="text-sm font-semibold text-content-primary mb-4 tracking-tight">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-content-secondary">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-surface-border py-24">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-brand-profit">Ready when you are</p>
            <h2 className="mb-6 text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
              Get the stress out of your head
              <span className="block text-content-secondary">and into a system you can trust.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-8 text-content-secondary sm:text-lg">
              Start with the essentials. Add more support when you want it.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                <TransitionLink
                  to={primaryHref}
                  className="inline-flex min-w-[200px] items-center justify-center gap-3 rounded-[10px] bg-brand-cta px-8 h-[52px] text-sm font-semibold uppercase tracking-wide text-surface-base transition-colors duration-200 hover:bg-brand-cta-hover"
                >
                  {user?.id ? 'Open Command Center' : 'Get Started Free'}
                </TransitionLink>
              </motion.div>
              <TransitionLink
                to="/pricing"
                className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-[10px] border border-surface-border bg-transparent px-8 h-[52px] text-sm font-medium text-content-primary transition-colors duration-200 hover:border-content-primary/15"
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
