import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { PublicHeader } from '../components/layout';
import { Footer } from '../components/layout';
import { useSEO } from '../hooks';

const FAQ_DATA = [
  {
    question: 'What is Oweable, exactly?',
    answer:
      'Oweable is a personal finance tool for people who feel like bills, debt, recurring obligations, and uneven income have become too hard to hold together mentally. It helps you see what is due, what is behind, and what needs attention next.',
  },
  {
    question: 'Is Oweable only for freelancers or gig workers?',
    answer:
      'No. It works for salaried workers, households, freelancers, side gigs, and mixed-income setups. The common thread is not your job type. It is needing a calmer way to stay on top of money.',
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
      'Yes. Full Suite includes debt payoff planning with both Snowball and Avalanche strategies, so you can stop guessing and start seeing a clearer path forward.',
  },
  {
    question: 'Can I use Oweable without downloading an app?',
    answer:
      'Yes. Oweable works in your browser on desktop and mobile. You do not need to install another app just to start getting organized.',
  },
  {
    question: 'Can I start before paying?',
    answer:
      'Yes. You can create an account and start with the Pay List path for bills, due dates, and recurring obligations. Full Suite adds broader planning and payoff tools when you want more help.',
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
    <article className="border-b border-surface-border py-6">
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
      'Answers to common questions about Oweable, including bills, debt payoff, subscriptions, free plans, security, and uneven-income workflows.',
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
          <section className="mx-auto max-w-4xl px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">FAQ</p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
                The questions people ask when money already feels heavy.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-content-secondary">
                Short answers, plain English, and no fake mystery. If you still need help after this, support is one click away.
              </p>
            </div>

            <div className="mt-12">
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
