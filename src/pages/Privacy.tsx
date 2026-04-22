import React from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { TransitionLink } from '../components/TransitionLink';
import { useSEO } from '../hooks/useSEO';

const privacySections = [
  {
    title: 'What data Oweable collects',
    copy:
      'Oweable collects the information needed to operate the product, such as account details, financial entries you add, and optional connected-data inputs when you choose to use them.',
  },
  {
    title: 'What Oweable does not do',
    copy:
      'Oweable does not sell your personal financial data. The product is meant to help you organize and understand your money, not turn your money life into an ad-targeting profile.',
  },
  {
    title: 'Encryption and access',
    copy:
      'Sensitive information is protected with strong encryption in transit and at rest. Internal access is limited and support access is intended to follow a process you initiate.',
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
      'You can request access, correction, export, or deletion of eligible data. If you need help, contact support or email privacy@oweable.com.',
  },
] as const;

export default function Privacy() {
  useSEO({
    title: 'Privacy Policy — Oweable',
    description: 'How Oweable handles data collection, encryption, retention, third-party services, and user privacy rights.',
    canonical: 'https://www.oweable.com/privacy',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
      <Header />
      <div className="min-h-screen bg-surface-base px-6 pb-20 pt-28 text-content-primary selection:bg-content-primary/15 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <section className="py-12">
            <div className="public-fade-up max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Privacy</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-content-primary sm:text-6xl">
                Privacy that reads like policy, not camouflage.
              </h1>
              <p className="mt-6 text-lg leading-8 text-content-secondary">
                This page is the plain-English summary of how Oweable approaches data handling. It is meant to be understandable before it is impressive.
              </p>
              <p className="mt-4 text-sm text-content-muted">Last updated April 2026</p>
            </div>

            <div className="mt-12 space-y-5">
              {privacySections.map((section) => (
                <section key={section.title} className="public-hover-lift rounded-md border border-surface-border bg-surface-raised p-6 sm:p-7 shadow-sm">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-content-primary">{section.title}</h2>
                  <p className="mt-4 max-w-4xl text-base leading-8 text-content-secondary">{section.copy}</p>
                </section>
              ))}
            </div>

            <div className="public-fade-up public-delay-1 mt-10 rounded-md border border-surface-border bg-surface-highlight p-6 sm:p-7">
              <p className="text-base leading-8 text-content-secondary">
                For more technical detail, visit the{' '}
                <TransitionLink to="/security" className="font-semibold text-content-primary underline underline-offset-4 hover:text-brand-profit">
                  Security page
                </TransitionLink>
                . For requests involving your data, email{' '}
                <a href="mailto:privacy@oweable.com" className="font-semibold text-content-primary underline underline-offset-4 hover:text-brand-profit">
                  privacy@oweable.com
                </a>
                {' '}or use the{' '}
                <TransitionLink to="/support" className="font-semibold text-content-primary underline underline-offset-4 hover:text-brand-profit">
                  support page
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
