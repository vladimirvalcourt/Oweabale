import React from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { TransitionLink } from '../components/TransitionLink';
import { useSEO } from '../hooks/useSEO';

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
    description: 'Terms covering use of Oweable, plan billing, cancellations, platform restrictions, and legal responsibilities.',
    canonical: 'https://www.oweable.com/terms',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#f6efe4] px-6 pb-20 pt-28 text-[#1f2b24] selection:bg-[#1f2b24]/15 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <section className="py-12">
            <div className="public-fade-up max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Terms</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-[#1f2b24] sm:text-6xl">
                Terms that are meant to be read by humans.
              </h1>
              <p className="mt-6 text-lg leading-8 text-[#556157]">
                This is the plain-language overview of the rules that govern use of Oweable. It is about expectations, billing, fair use, and legal boundaries.
              </p>
              <p className="mt-4 text-sm text-[#6b776e]">Last updated April 2026</p>
            </div>

            <div className="mt-12 space-y-5">
              {sections.map((section, index) => (
                <section key={section.title} className="public-hover-lift rounded-[1.75rem] border border-[#d7cebf] bg-[#fffaf3] p-6 sm:p-7 shadow-[0_12px_30px_rgba(49,65,55,0.04)]">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a6a54]">Section {index + 1}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1f2b24]">{section.title}</h2>
                  <p className="mt-4 max-w-4xl text-base leading-8 text-[#5b685e]">{section.copy}</p>
                </section>
              ))}
            </div>

            <div className="public-fade-up public-delay-1 mt-10 rounded-[1.75rem] border border-[#d7cebf] bg-[#f1e7d9] p-6 sm:p-7">
              <p className="text-base leading-8 text-[#435047]">
                For billing and plan details, visit{' '}
                <TransitionLink to="/pricing" className="font-semibold text-[#1f2b24] underline underline-offset-4 hover:text-[#35684f]">
                  Pricing
                </TransitionLink>
                . For data handling, use{' '}
                <TransitionLink to="/privacy" className="font-semibold text-[#1f2b24] underline underline-offset-4 hover:text-[#35684f]">
                  Privacy
                </TransitionLink>
                . If something is unclear, contact{' '}
                <TransitionLink to="/support" className="font-semibold text-[#1f2b24] underline underline-offset-4 hover:text-[#35684f]">
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
