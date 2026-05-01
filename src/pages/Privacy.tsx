import React from 'react';
import { Footer } from '@/components/layout';
import { PublicHeader } from '@/components/layout';
import { TransitionLink } from '@/components/common';
import { useSEO } from '@/hooks';
import { SITE_CONFIG } from '@/config/site';

const privacySections = [
  {
    title: 'What data Oweable collects',
    copy:
      'Oweable collects the information needed to operate the product, such as account details, bills, debt entries, financial notes you add, and optional connected-data inputs when you choose to use them.',
  },
  {
    title: 'What Oweable does not do',
    copy:
      'Oweable does not sell your personal financial data. The product is meant to help you organize and understand your money, not turn your financial life into an ad-targeting profile.',
  },
  {
    title: 'Encryption and access',
    copy:
      'Sensitive information is protected with strong encryption in transit and at rest. Internal access is limited, and support access is intended to follow a process you initiate.',
  },
  {
    title: 'Third-party services',
    copy:
      'Some infrastructure and product capabilities rely on trusted service providers for things like hosting, analytics, payments, and optional financial-data connectivity. Those providers are expected to process data only as needed to deliver the service.',
  },
  {
    title: 'Retention and deletion',
    copy:
      'Oweable keeps data for as long as it is needed to operate the account, satisfy legal obligations, resolve disputes, or support fraud prevention. Verified deletion and privacy requests are handled through the support and privacy channels.',
  },
  {
    title: 'Your privacy rights',
    copy:
      'You can request access, correction, export, or deletion of eligible data. If you need help, contact support or use the privacy contact form.',
  },
] as const;

export default function Privacy() {
  useSEO({
    title: 'Privacy Policy — Oweable',
    description: 'How Oweable handles bill, debt, and financial planning data collection, encryption, retention, third-party services, and privacy rights.',
        canonical: SITE_CONFIG.getUrl('/privacy'),
        ogImage: SITE_CONFIG.defaultOgImage,
  });

  return (
    <>
      <PublicHeader
        links={[
          { href: '/security', label: 'Security' },
          { href: '/support', label: 'Support' },
        ]}
      />
      <div className="min-h-screen bg-surface-base text-content-primary selection:bg-brand-violet/25">
        <main className="premium-container pb-24 pt-36">
          <section className="grid gap-12 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="premium-eyebrow">Privacy</p>
              <h1 className="premium-display mt-5 max-w-3xl">
                Privacy for the money details you should not have to wonder about.
              </h1>
              <p className="premium-lede mt-7 max-w-xl">
                This page is the plain-English summary of how Oweable approaches data handling, so you can understand what you are trusting us with and how that trust is handled.
              </p>
              <p className="mt-4 text-sm text-content-muted">Last updated April 2026</p>
            </div>

            <div className="premium-panel divide-y divide-surface-border overflow-hidden p-0">
              {privacySections.map((section) => (
                <section key={section.title} className="p-5">
                  <h2 className="text-lg font-medium tracking-[-0.024em] text-content-primary mb-3">{section.title}</h2>
                  <p className="text-sm leading-6 text-content-tertiary">{section.copy}</p>
                </section>
              ))}

              <div className="p-5">
              <p className="text-sm leading-6 text-content-tertiary">
                For more technical detail, visit the{' '}
                <TransitionLink to="/security" className="font-medium text-content-primary underline underline-offset-4 hover:text-brand-violet">
                  Security page
                </TransitionLink>
                . For requests involving your data, use the{' '}
                <TransitionLink to="/support" className="font-medium text-content-primary underline underline-offset-4 hover:text-brand-violet">
                  support page
                </TransitionLink>
                {' '}or contact us through the support channels.
              </p>
              </div>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
