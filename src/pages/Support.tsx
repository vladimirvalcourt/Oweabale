import React, { useMemo, useState } from 'react';
import { LifeBuoy, ChevronLeft } from 'lucide-react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';

const SUPPORT_EMAIL = 'support@oweable.com';

const FAQ_ITEMS = [
  {
    q: 'How does billing work for Full Suite?',
    a: 'Full Suite is billed monthly on your signup anniversary date. You can manage billing from Settings and review plan details on Pricing.',
  },
  {
    q: 'I cannot access my account. What should I do?',
    a: 'Use Google sign-in with the same email you originally used. If you still cannot access your account, contact support and include the email tied to your account.',
  },
  {
    q: 'How secure is my financial data?',
    a: 'Oweable uses AES-256 encryption at rest and TLS 1.2+ in transit. Visit our Security page for our controls and incident response practices.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'You can cancel anytime from billing settings. Access stays active through the end of your current billing period.',
  },
];

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  useSEO({
    title: 'Support — Oweable',
    description: 'Need help with billing, access, security, or account questions? Contact Oweable support and find quick self-serve answers.',
    canonical: 'https://www.oweable.com/support',
    ogTitle: 'Support — Oweable',
    ogDescription: 'Get help with account access, billing, security, and subscription questions.',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const mailtoHref = useMemo(() => {
    const subject = formData.subject.trim() || 'Oweable support request';
    const body = [
      `Name: ${formData.name.trim() || 'Not provided'}`,
      `Email: ${formData.email.trim() || 'Not provided'}`,
      '',
      formData.message.trim() || 'Please describe your issue here.',
    ].join('\n');
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [formData]);

  return (
    <>
      <div className="min-h-screen bg-surface-base text-content-primary font-sans p-8 md:p-24 selection:bg-content-primary/15">
        <div className="max-w-4xl mx-auto">
          <TransitionLink to="/" className="inline-flex items-center gap-2 text-sm text-content-tertiary hover:text-content-primary transition-colors mb-12">
            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden /> Back to home
          </TransitionLink>

          <header className="mb-12 border-l-4 border-surface-border pl-8">
            <div className="flex items-center gap-3 text-content-secondary mb-4">
              <LifeBuoy className="w-6 h-6 shrink-0" aria-hidden />
              <span className="text-xs font-medium">Support</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-4">How can we help?</h1>
            <p className="text-sm text-content-tertiary max-w-2xl">
              Send us a message for billing, account access, or technical issues. We usually reply within one business day.
            </p>
          </header>

          <section className="rounded-lg border border-surface-border bg-surface-raised p-6 md:p-8 mb-10">
            <h2 className="text-lg font-semibold text-content-primary mb-5">Contact support</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="text-sm text-content-secondary">
                Name
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-content-primary focus-app-field"
                  placeholder="Your name"
                />
              </label>
              <label className="text-sm text-content-secondary">
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-content-primary focus-app-field"
                  placeholder="you@example.com"
                />
              </label>
            </div>
            <label className="text-sm text-content-secondary block mb-4">
              Subject
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-content-primary focus-app-field"
                placeholder="Billing, login issue, bug report..."
              />
            </label>
            <label className="text-sm text-content-secondary block mb-5">
              Message
              <textarea
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                className="mt-2 w-full min-h-[140px] rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-content-primary focus-app-field"
                placeholder="Tell us what happened and how we can help."
              />
            </label>
            <a
              href={mailtoHref}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-cta px-6 py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-brand-cta-hover"
            >
              Email support
            </a>
            <p className="mt-3 text-xs text-content-tertiary">
              Prefer direct email? Write to <a className="underline hover:text-content-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section className="rounded-lg border border-surface-border bg-surface-raised p-6 md:p-8">
            <h2 className="text-lg font-semibold text-content-primary mb-6">Quick answers</h2>
            <div className="space-y-5">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="border-b border-surface-border pb-4 last:border-0 last:pb-0">
                  <h3 className="text-sm font-semibold text-content-primary mb-2">{item.q}</h3>
                  <p className="text-sm text-content-secondary leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-sm text-content-secondary">
              Need plan or compliance details? Visit{' '}
              <TransitionLink to="/pricing" className="underline hover:text-content-primary">Pricing</TransitionLink>{' '}
              and{' '}
              <TransitionLink to="/security" className="underline hover:text-content-primary">Security</TransitionLink>.
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
