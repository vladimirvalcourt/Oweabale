import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { PublicHeader } from '../components/layout';
import { Footer } from '../components/layout';
import { useSEO } from '../hooks';

const FAQ_DATA = [
  {
    question: 'What is Oweable, exactly?',
    answer:
      'Oweable is a personal finance tool for people who are tired of carrying bills, debt, due dates, and late-fee anxiety in their head. It helps you see what is due, what is behind, and what needs attention next.',
  },
  {
    question: 'Is Oweable only for freelancers or gig workers?',
    answer:
      'No. It works for salaried workers, households, freelancers, side gigs, and mixed-income setups. The common thread is not your job type. It is needing a calmer way to manage what you owe.',
  },
  {
    question: 'What makes Oweable different from a normal budgeting app?',
    answer:
      'Most budgeting apps focus on where money went. Oweable focuses on what you owe next, what is overdue, and how to make a realistic plan when everything feels equally urgent.',
  },
  {
    question: 'Do I need to connect my bank account?',
    answer:
      'No. You can start manually. Optional account connection is there to save time, not to make the product usable.',
  },
  {
    question: 'Can Oweable help with debt payoff?',
    answer:
      'Yes. Full Suite lets you choose a payoff style that matches you: quick wins first, or highest-interest balances first. Either way, the point is to make the next step easier to see.',
  },
  {
    question: 'Can I use Oweable without downloading an app?',
    answer:
      'Yes. Oweable works in your browser on desktop and mobile. You do not need to install another app just to start getting organized.',
  },
  {
    question: 'Can I start before paying?',
    answer:
      'Yes. You can create an account and start with bills, due dates, and recurring obligations. When you want more help, Full Suite adds planning for debt, spending, income, and cash flow.',
  },
  {
    question: 'How secure is my data?',
    answer:
      'Oweable uses strong encryption in transit and at rest, and the product is built around protecting your financial information. For more detail, the Security page explains the current controls in plain English.',
  },
] as const;

function FaqCard({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  return (
    <article className="border-b border-surface-border-subtle py-6 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <h3 className="text-lg font-medium leading-tight tracking-[-0.024em] text-content-primary">{question}</h3>
        {open ? <Minus className="h-5 w-5 shrink-0 text-content-tertiary" /> : <Plus className="h-5 w-5 shrink-0 text-content-tertiary" />}
      </button>
      <div
        id={panelId}
        className={`overflow-hidden transition-all duration-300 ease-out ${open ? 'mt-4 max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-base leading-relaxed text-content-tertiary">{answer}</p>
      </div>
    </article>
  );
}

export default function FAQ() {
  useSEO({
    title: 'Frequently Asked Questions — Oweable',
    description:
      'Plain-English answers about how Oweable helps with bills, debt payoff, subscriptions, free plans, security, and uneven income.',
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
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-brand-violet/25">
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Plans' },
          { href: '/support', label: 'Support' },
          { href: '/security', label: 'Security' },
        ]}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="pb-28 pt-36" id="faq">
          <section className="premium-container max-w-5xl">
            <div>
              <p className="premium-eyebrow">FAQ</p>
              <h1 className="premium-display mt-5 max-w-4xl">
                The questions people ask when money already feels heavy.
              </h1>
              <p className="premium-lede mt-7 max-w-3xl">
                Short answers, plain English, and no fake mystery. If money already feels heavy, this page should make the next step easier.
              </p>
            </div>

            <div className="premium-panel mt-14 px-5 sm:px-8">
              {FAQ_DATA.map((item) => (
                <FaqCard key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </section>
      </main>
      <Footer />
    </div>
  );
}
