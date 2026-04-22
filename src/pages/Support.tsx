import React, { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useSEO } from '../hooks/useSEO';
import { useJsonLd } from '../hooks/useJsonLd';
import { submitSupportContact } from '../lib/supportContact';
import { toast } from 'sonner';

const SUPPORT_EMAIL = 'support@oweable.com';

const SUPPORT_PAGE_URL = 'https://www.oweable.com/support';

const FAQ_ITEMS = [
  {
    q: 'How does billing work for Full Suite?',
    a: 'Full Suite is billed monthly on your signup anniversary date. You can manage billing from Settings and review plan details on Pricing.',
  },
  {
    q: 'I cannot access my account. What should I do?',
    a: 'Sign in with the same method you used to create your account (Google or email/password). If you still cannot access your account, contact support and include the email tied to your account.',
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

function buildSupportJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['WebPage', 'ContactPage'],
        '@id': `${SUPPORT_PAGE_URL}#webpage`,
        url: SUPPORT_PAGE_URL,
        name: 'Support — Oweable',
        description:
          'Need help with billing, access, security, or account questions? Contact Oweable support and find quick self-serve answers.',
        isPartOf: {
          '@type': 'WebSite',
          name: 'Oweable',
          url: 'https://www.oweable.com',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.oweable.com/' },
          { '@type': 'ListItem', position: 2, name: 'Support', item: SUPPORT_PAGE_URL },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${SUPPORT_PAGE_URL}#faq`,
        url: SUPPORT_PAGE_URL,
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  };
}

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useSEO({
    title: 'Support — Oweable',
    description: 'Need help with billing, access, security, or account questions? Contact Oweable support and find quick self-serve answers.',
    canonical: 'https://www.oweable.com/support',
    ogTitle: 'Support — Oweable',
    ogDescription: 'Get help with account access, billing, security, and subscription questions.',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  useJsonLd('support', buildSupportJsonLd, []);

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await submitSupportContact(formData);
    setIsSubmitting(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      toast.success('We got your message — we\'ll reply within 1 business day.');
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-surface-base text-content-primary font-sans pt-24 p-8 md:p-24 selection:bg-content-primary/15">
        <div className="max-w-4xl mx-auto">

          <header className="mb-12 border-l-4 border-surface-border pl-8 mt-8">
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
            
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <h3 className="text-lg font-semibold text-content-primary mb-2">Message sent!</h3>
                <p className="text-sm text-content-secondary mb-6">We got your message — we'll reply within 1 business day.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-cta px-6 py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-brand-cta-hover"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <label className="text-sm text-content-secondary">
                    Name *
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-content-primary focus-app-field"
                      placeholder="Your name"
                      required
                    />
                  </label>
                  <label className="text-sm text-content-secondary">
                    Email *
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-content-primary focus-app-field"
                      placeholder="you@example.com"
                      required
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
                  Message *
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    className="mt-2 w-full min-h-[140px] rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-content-primary focus-app-field"
                    placeholder="Tell us what happened and how we can help."
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-cta px-6 py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-brand-cta-hover disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
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
