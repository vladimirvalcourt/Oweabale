import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
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
            <div className="public-fade-up max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Terms</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-content-primary sm:text-6xl">
                Terms that are meant to be read by humans.
              </h1>
              <p className="mt-6 text-lg leading-8 text-content-secondary">
                This is the plain-language overview of the rules that govern use of Oweable. It is about expectations, billing, fair use, and legal boundaries.
              </p>
              <p className="mt-4 text-sm text-content-muted">Last updated April 2026</p>
            </div>

            <motion.div className="mt-12 space-y-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }}>
              {sections.map((section, index) => (
                <motion.section key={section.title} variants={fadeInUp} className="public-hover-lift rounded-[12px] border border-surface-border bg-surface-raised p-8 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Section {index + 1}</p>
                  <h2 className="mt-3 text-lg font-semibold text-content-primary mb-3">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-content-secondary">{section.copy}</p>
                </motion.section>
              ))}
            </motion.div>

            <motion.div className="public-fade-up public-delay-1 mt-10 rounded-[12px] border border-surface-border bg-surface-highlight p-8" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
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
            </motion.div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
