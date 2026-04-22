import React from 'react';
import { Database, Key, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useSEO } from '../hooks/useSEO';

const securityCards = [
  {
    title: 'Encryption in transit and at rest',
    body: 'Sensitive data is protected with strong transport and storage encryption so core financial information is not moving around in plain text.',
    icon: Database,
  },
  {
    title: 'Controlled access',
    body: 'Access to internal systems is restricted and support workflows are meant to avoid casual browsing of private financial information.',
    icon: Key,
  },
  {
    title: 'Security operations mindset',
    body: 'Oweable is designed around secure defaults, active monitoring, and fast handling of serious issues when they appear.',
    icon: ShieldCheck,
  },
] as const;

const sections = [
  {
    title: 'How Oweable approaches security',
    copy:
      'The product is built for sensitive financial workflows, so security cannot be an afterthought. The current posture focuses on strong encryption, constrained access, and practical response processes.',
  },
  {
    title: 'Infrastructure and hosting',
    copy:
      'Core infrastructure is hosted with managed cloud services and monitored for abnormal activity. Operational controls are intended to reduce unauthorized access and improve visibility into platform health.',
  },
  {
    title: 'Vulnerability reporting',
    copy:
      'If you discover a security issue, email security@oweable.com with as much detail as you can safely share. Reports are reviewed and prioritized based on severity and user impact.',
  },
  {
    title: 'Data residency and compliance posture',
    copy:
      'Core product data is handled with U.S.-based infrastructure unless a different arrangement is explicitly required. Privacy and compliance requests are processed through the support and privacy channels.',
  },
] as const;

export default function Security() {
  useSEO({
    title: 'Security — Oweable',
    description:
      'How Oweable protects financial data with encryption, controlled access, infrastructure safeguards, and vulnerability reporting.',
    canonical: 'https://www.oweable.com/security',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
      <Header />
      <div className="min-h-screen bg-surface-base px-6 pb-20 pt-28 text-content-primary selection:bg-content-primary/15 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="py-12">
            <div className="public-fade-up max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Security</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-content-primary sm:text-6xl">
                Security, explained without theater.
              </h1>
              <p className="mt-6 text-lg leading-8 text-content-secondary">
                Oweable handles sensitive financial workflows, so security has to be built into the product, the infrastructure, and the support process.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {securityCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="public-hover-lift rounded-md border border-surface-border bg-surface-raised p-6 sm:p-7 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-highlight text-brand-profit">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-content-primary">{card.title}</h2>
                    <p className="mt-3 text-base leading-7 text-content-secondary">{card.body}</p>
                  </article>
                );
              })}
            </div>

            <div className="public-fade-up public-delay-1 mt-12 rounded-md border border-surface-border bg-surface-raised p-7 sm:p-8">
              <div className="space-y-10">
                {sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-content-primary">{section.title}</h2>
                    <p className="mt-4 max-w-4xl text-base leading-8 text-content-secondary">{section.copy}</p>
                  </section>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
