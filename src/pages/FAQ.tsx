import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import { TransitionLink } from '../components/TransitionLink';
import { useSEO } from '../hooks/useSEO';

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

const FAQ_DATA = [
  {
    question: 'What is Oweable, exactly?',
    answer:
      'Oweable is a personal finance command center for bills, debt, recurring obligations, subscriptions, budgets, and uneven income. It is built to help you see what is due, what is behind, and what to pay off next.',
  },
  {
    question: 'Is Oweable only for freelancers or gig workers?',
    answer:
      'No. It works for salaried workers, households, freelancers, side gigs, and mixed-income setups. Variable-income tax tools are available when you need them, but they are not the only use case.',
  },
  {
    question: 'What makes Oweable different from a normal budgeting app?',
    answer:
      'Most budgeting apps focus on where money went. Oweable focuses on what you owe next, what is overdue, and how to build a realistic payoff and cash-flow plan around that.',
  },
  {
    question: 'Do I need to connect my bank account?',
    answer:
      'No. You can start manually. Optional account connection is there to save time, not to make the product usable.',
  },
  {
    question: 'Can Oweable help with debt payoff?',
    answer:
      'Yes. Full Suite includes debt payoff planning with both Snowball and Avalanche strategies, so you can see a clearer path instead of just making minimum payments and hoping for momentum.',
  },
  {
    question: 'Can I use Oweable without downloading an app?',
    answer:
      'Yes. Oweable works in your browser on desktop and mobile. You do not need to install anything to start organizing your money.',
  },
  {
    question: 'Is there a free version?',
    answer:
      'Yes. The free Tracker tier gives you visibility into bills, due dates, and recurring obligations. Full Suite adds the broader planning and payoff tools.',
  },
  {
    question: 'How secure is my data?',
    answer:
      'Oweable uses strong encryption in transit and at rest, and the product is built around keeping your financial information protected. For more detail, the Security page explains the current controls in plain English.',
  },
] as const;

function FaqCard({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  return (
    <article className="rounded-[12px] border border-surface-border bg-surface-raised px-8 py-6 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <h3 className="text-lg font-semibold tracking-[-0.02em] leading-tight text-content-primary">{question}</h3>
        {open ? <Minus className="h-5 w-5 shrink-0 text-content-secondary" /> : <Plus className="h-5 w-5 shrink-0 text-content-secondary" />}
      </button>
      <div
        id={panelId}
        className={`overflow-hidden transition-all duration-300 ease-out ${open ? 'mt-4 max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-base leading-relaxed text-content-secondary">{answer}</p>
      </div>
    </article>
  );
}

export default function FAQ() {
  useSEO({
    title: 'Frequently Asked Questions — Oweable',
    description:
      'Answers to common questions about Oweable, including bills, debt payoff, subscriptions, free plans, security, and variable-income workflows.',
    canonical: 'https://www.oweable.com/faq',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Plans' },
          { href: '/support', label: 'Support' },
          { href: '/security', label: 'Security' },
        ]}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="pt-32 pb-24" id="faq">
          <section className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">FAQ</p>
              <h1 className="public-fade-up mt-5 text-5xl font-semibold tracking-tight text-content-primary sm:text-6xl">
                The questions people ask before they trust their money to something new.
              </h1>
              <p className="public-fade-up public-delay-1 mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-content-secondary">
                Short answers, plain English, and no fake mystery. If you still need help after this, the support page is one click away.
              </p>
            </div>

            <motion.div
              className="mt-12 grid gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {FAQ_DATA.map((item) => (
                <motion.div key={item.question} variants={fadeInUp}>
                  <FaqCard question={item.question} answer={item.answer} />
                </motion.div>
              ))}
            </motion.div>

            <div className="public-fade-up public-delay-2 mt-14 rounded-[12px] border border-surface-border bg-surface-raised p-8 sm:p-10 shadow-sm">
              <h2 className="text-3xl font-semibold tracking-tight text-content-primary">
                Want the full picture instead of another patchwork system?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-content-secondary">
                Oweable is built to reduce money fog, not add more interfaces to babysit.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                  <TransitionLink
                    to="/onboarding"
                    className="inline-flex items-center gap-3 rounded-[10px] bg-brand-cta px-7 h-[48px] text-sm font-medium text-surface-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-cta-hover min-w-[160px] justify-center"
                  >
                    Create free account
                    <ArrowRight className="h-4 w-4" />
                  </TransitionLink>
                </motion.div>
                <TransitionLink
                  to="/pricing"
                  className="inline-flex items-center gap-3 rounded-[10px] border border-surface-border px-7 h-[48px] text-sm font-medium text-content-primary transition-colors hover:border-surface-border-subtle hover:bg-surface-highlight min-w-[160px] justify-center"
                >
                  Compare plans
                </TransitionLink>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-content-secondary">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                  No credit card required
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-profit" />
                  Browser-based on desktop and mobile
                </span>
              </div>
            </div>
          </section>
      </main>
      <Footer />
    </div>
  );
}
