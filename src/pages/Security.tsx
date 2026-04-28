import React from 'react';
import { Footer } from '../components/layout';
import { PublicHeader } from '../components/layout';
import { useSEO } from '../hooks';
import { EMAIL_CONFIG } from '../lib/utils/emailObfuscation';

const securityCards = [
  {
    title: 'Encryption in transit and at rest',
    body: 'Sensitive data is protected with strong transport and storage encryption so the financial details you trust us with are not moving around in plain text.',
  },
  {
    title: 'Controlled access',
    body: 'Access to internal systems is restricted, and support workflows are meant to avoid casual or unnecessary access to private financial information.',
  },
  {
    title: 'Security operations mindset',
    body: 'Oweable is designed around secure defaults, active monitoring, and fast handling of serious issues when they appear.',
  },
] as const;

const sections = [
  {
    title: 'How Oweable approaches security',
    copy:
      'Money already makes people feel exposed enough. Oweable is built for sensitive financial workflows, so security cannot be an afterthought. The current posture focuses on strong encryption, constrained access, and practical response processes.',
  },
  {
    title: 'Infrastructure and hosting',
    copy:
      'Core infrastructure is hosted with managed cloud services and monitored for abnormal activity. Operational controls are meant to reduce unauthorized access and improve visibility into platform health.',
  },
  {
    title: 'Vulnerability reporting',
    copy:
      'If you discover a security issue, use the support contact form with as much detail as you can safely share. Reports are reviewed and prioritized based on severity and user impact.',
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
      'How Oweable protects financial data with encryption, controlled access, infrastructure safeguards, and vulnerability reporting in plain English.',
    canonical: 'https://www.oweable.com/security',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-brand-violet/25">
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Plans' },
          { href: '/faq', label: 'FAQ' },
          { href: '/support', label: 'Support' },
        ]}
      />

      <main className="px-5 pb-24 pt-36 sm:px-8">
        <div className="mx-auto max-w-[1280px]">
          <section className="grid gap-12 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Security</p>
              <h1 className="mt-5 max-w-3xl text-5xl font-medium leading-none tracking-[-0.055em] text-content-primary sm:text-6xl">
                Security, explained like it actually matters to your life.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-content-tertiary">
                Oweable handles sensitive financial workflows, so security has to be built into the product, the infrastructure, and the support process, not saved for a marketing page.
              </p>
            </div>

            <div>
              <div className="grid gap-3">
                {securityCards.map((card) => (
                <article key={card.title} className="rounded-[10px] border border-surface-border-subtle bg-white/[0.022] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <h2 className="text-lg font-medium tracking-[-0.024em] text-content-primary mb-3">{card.title}</h2>
                  <p className="text-sm leading-relaxed text-content-tertiary">{card.body}</p>
                </article>
                ))}
              </div>

              <div className="mt-10 divide-y divide-white/[0.06] rounded-[10px] border border-surface-border bg-white/[0.018]">
                {sections.map((section) => (
                  <section key={section.title} className="p-5">
                    <h2 className="text-xl font-medium tracking-[-0.03em] text-content-primary">{section.title}</h2>
                    <p className="mt-4 max-w-4xl text-sm leading-6 text-content-tertiary">{section.copy}</p>
                  </section>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
