import { useEffect, useState } from 'react';
import { ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { BrandWordmark } from '../components/BrandWordmark';
import { TransitionLink } from '../components/TransitionLink';
import { useSEO } from '../hooks/useSEO';

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
    <article className="rounded-[1.5rem] border border-[#d7cebf] bg-[#fffaf3] px-6 py-5 shadow-[0_12px_30px_rgba(49,65,55,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#1f2b24]">{question}</h3>
        {open ? <Minus className="h-5 w-5 shrink-0 text-[#5f6b62]" /> : <Plus className="h-5 w-5 shrink-0 text-[#5f6b62]" />}
      </button>
      <div
        id={panelId}
        className={`overflow-hidden transition-all duration-300 ease-out ${open ? 'mt-4 max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-base leading-7 text-[#5b685e]">{answer}</p>
      </div>
    </article>
  );
}

export default function FAQ() {
  const [scrolled, setScrolled] = useState(false);

  useSEO({
    title: 'Frequently Asked Questions — Oweable',
    description:
      'Answers to common questions about Oweable, including bills, debt payoff, subscriptions, free plans, security, and variable-income workflows.',
    canonical: 'https://www.oweable.com/faq',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-[#f6efe4] text-[#1f2b24] selection:bg-[#1f2b24]/15">
        <nav
          className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
            scrolled ? 'border-[#d7cebf] bg-[#f6efe4]/92 backdrop-blur-xl' : 'border-transparent bg-transparent'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <TransitionLink to="/" className="text-[#1f2b24]">
              <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[-0.02em] text-[#1f2b24]" />
            </TransitionLink>
            <div className="hidden items-center gap-8 text-sm text-[#5e695f] md:flex">
              <TransitionLink to="/pricing" className="transition-colors hover:text-[#1f2b24]">
                Pricing
              </TransitionLink>
              <TransitionLink to="/support" className="transition-colors hover:text-[#1f2b24]">
                Support
              </TransitionLink>
            </div>
            <TransitionLink
              to="/onboarding"
              className="inline-flex items-center gap-2 rounded-full bg-[#1f2b24] px-5 py-2.5 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2d3a32]"
            >
              Start free
            </TransitionLink>
          </div>
        </nav>

        <main className="pt-32 pb-24">
          <section className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">FAQ</p>
              <h1 className="public-fade-up mt-5 text-5xl font-semibold tracking-[-0.06em] text-[#1f2b24] sm:text-6xl">
                The questions people ask before they trust their money to something new.
              </h1>
              <p className="public-fade-up public-delay-1 mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#556157]">
                Short answers, plain English, and no fake mystery. If you still need help after this, the support page is one click away.
              </p>
            </div>

            <div className="mt-12 grid gap-4">
              {FAQ_DATA.map((item) => (
                <FaqCard key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>

            <div className="public-fade-up public-delay-2 mt-14 rounded-[2rem] border border-[#d7cebf] bg-[#fffaf3] p-7 sm:p-8 text-center shadow-[0_16px_40px_rgba(49,65,55,0.05)]">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#1f2b24]">
                Want the full picture instead of another patchwork system?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#5b685e]">
                Oweable is built to reduce money fog, not add more interfaces to babysit.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <TransitionLink
                  to="/onboarding"
                  className="inline-flex items-center gap-3 rounded-full bg-[#1f2b24] px-7 py-3.5 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2d3a32]"
                >
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </TransitionLink>
                <TransitionLink
                  to="/pricing"
                  className="inline-flex items-center gap-3 rounded-full border border-[#d3cabd] px-7 py-3.5 text-sm font-medium text-[#314137] transition-colors hover:border-[#bcae94] hover:bg-[#fff9f0]"
                >
                  Compare plans
                </TransitionLink>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-[#5f6b62]">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f6efe4] px-3 py-1.5">
                  <Check className="h-4 w-4 text-[#35684f]" />
                  No credit card required
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f6efe4] px-3 py-1.5">
                  <Check className="h-4 w-4 text-[#35684f]" />
                  Browser-based on desktop and mobile
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
