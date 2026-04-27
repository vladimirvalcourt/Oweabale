import React from 'react';
import { Footer } from '../components/layout';
import { PublicHeader } from '../components/layout';
import { TransitionLink } from '../components/common';
import { useSEO } from '../hooks';

const sections = [
  {
    title: 'Acceptance of terms',
    copy:
      'By using Oweable, you agree to these Terms of Service and any additional policies referenced by them. These terms govern access to the platform and its paid and free plans.',
  },
  {
    title: 'Platform use',
    copy:
      'Oweable is licensed for your own personal or business financial organization use. You may not misuse the platform, scrape it, reverse engineer it, or use it for unlawful activity.',
  },
  {
    title: 'Not financial, legal, or tax advice',
    copy:
      'Oweable helps organize information and present planning tools, but it is not a CPA, attorney, or licensed financial advisor. You remain responsible for your own tax filings, legal decisions, and financial actions.',
  },
  {
    title: 'Payments, cancellations, and refunds',
    copy:
      'Paid plans renew on the billing cycle you select until canceled. Cancellation stops future renewals and access continues through the current paid period. Refund eligibility is limited and subject to the policy described at the time of purchase or where required by law.',
  },
  {
    title: 'Account suspension or termination',
    copy:
      'Oweable may suspend or terminate access for fraud, abuse, security threats, repeated policy violations, non-payment, or illegal activity. Immediate suspension may occur when needed to protect the platform or users.',
  },
  {
    title: 'Changes to these terms',
    copy:
      'The terms may be updated over time. Material changes can be communicated in-product, by email, or both, and continued use after the effective date means you accept the updated terms.',
  },
  {
    title: 'Liability and governing law',
    copy:
      'Oweable is provided as-is and as-available to the extent permitted by law. These terms are governed by the laws of New York, except where another law must apply.',
  },
] as const;

export default function Terms() {
  useSEO({
    title: 'Terms of Service — Oweable',
    description: 'Terms covering use of Oweable, plan billing, cancellations, platform restrictions, and legal responsibilities in plain language.',
    canonical: 'https://www.oweable.com/terms',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Pricing' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/support', label: 'Support' },
        ]}
      />
      <div className="min-h-screen bg-surface-base px-6 pb-20 pt-28 text-content-primary selection:bg-content-primary/15 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <section className="py-12">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Terms</p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
                Terms that try to be clear about the rules, not hide them.
              </h1>
              <p className="mt-6 text-lg leading-8 text-content-secondary">
                This is the plain-language overview of the rules that govern use of Oweable. It covers expectations, billing, fair use, and legal boundaries without trying to bury the point.
              </p>
              <p className="mt-4 text-sm text-content-muted">Last updated April 2026</p>
            </div>

            <div className="mt-12 space-y-8 border-t border-surface-border pt-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-lg font-semibold text-content-primary mb-3">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-content-secondary">{section.copy}</p>
                </section>
              ))}
            </div>

            <div className="mt-10 border-t border-surface-border pt-6">
              <p className="text-sm leading-relaxed text-content-secondary">
                For billing and plan details, visit{' '}
                <TransitionLink to="/pricing" className="font-semibold text-content-primary underline underline-offset-4 hover:text-brand-profit">
                  Pricing
                </TransitionLink>
                . For data handling, use{' '}
                <TransitionLink to="/privacy" className="font-semibold text-content-primary underline underline-offset-4 hover:text-brand-profit">
                  Privacy
                </TransitionLink>
                . If something is unclear, contact{' '}
                <TransitionLink to="/support" className="font-semibold text-content-primary underline underline-offset-4 hover:text-brand-profit">
                  Support
                </TransitionLink>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
