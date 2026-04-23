import { motion } from 'framer-motion';
import React from 'react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
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

const securityCards = [
  {
    title: 'Encryption in transit and at rest',
    body: 'Sensitive data is protected with strong transport and storage encryption so core financial information is not moving around in plain text.',
  },
  {
    title: 'Controlled access',
    body: 'Access to internal systems is restricted and support workflows are meant to avoid casual browsing of private financial information.',
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
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Plans' },
          { href: '/faq', label: 'FAQ' },
          { href: '/support', label: 'Support' },
        ]}
      />

      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-6xl">
          <section className="py-12">
            <div className="public-fade-up max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Security</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-content-primary sm:text-6xl">
                Security, explained without theater.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-content-secondary">
                Oweable handles sensitive financial workflows, so security has to be built into the product, the infrastructure, and the support process.
              </p>
            </div>

            <motion.div
              className="mt-12 grid gap-6 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {securityCards.map((card) => (
                <motion.article
                  key={card.title}
                  variants={fadeInUp}
                  className="public-hover-lift rounded-[12px] border border-surface-border bg-surface-raised p-8 shadow-sm"
                >
                  <h2 className="text-lg font-semibold text-content-primary mb-3">{card.title}</h2>
                  <p className="text-sm leading-relaxed text-content-secondary">{card.body}</p>
                </motion.article>
              ))}
            </motion.div>

            <div className="public-fade-up public-delay-1 mt-12 rounded-[12px] border border-surface-border bg-surface-raised p-8 sm:p-10">
              <div className="space-y-10">
                {sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-2xl font-semibold tracking-tight text-content-primary">{section.title}</h2>
                    <p className="mt-4 max-w-4xl text-base leading-relaxed text-content-secondary">{section.copy}</p>
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
