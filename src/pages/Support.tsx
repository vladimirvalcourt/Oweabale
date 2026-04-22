import React, { useEffect, useState } from 'react';
import { ArrowRight, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';
import { BrandWordmark } from '../components/BrandWordmark';
import { ThemeToggle } from '../components/ThemeToggle';
import { TransitionLink } from '../components/TransitionLink';
import { useJsonLd } from '../hooks/useJsonLd';
import { useSEO } from '../hooks/useSEO';
import { submitSupportContact } from '../lib/supportContact';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';

const SUPPORT_EMAIL = 'support@oweable.com';
const SUPPORT_PAGE_URL = 'https://www.oweable.com/support';

const QUICK_HELP = [
  {
    q: 'How does billing work for Full Suite?',
    a: 'Full Suite renews on your billing cycle and can be managed from your settings. Pricing shows the current plan structure and trial details.',
  },
  {
    q: 'I cannot access my account. What should I do?',
    a: 'Use the same sign-in method you originally used. If access still fails, send support the email tied to the account and a short description of what happened.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'You can cancel from billing settings. Access remains active through the end of the current paid period.',
  },
  {
    q: 'Where can I read more about security and privacy?',
    a: 'Use the Security and Privacy pages for the current overview of data handling, access controls, and support channels for privacy requests.',
  },
] as const;

function buildSupportJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['WebPage', 'ContactPage'],
        '@id': `${SUPPORT_PAGE_URL}#webpage`,
        url: SUPPORT_PAGE_URL,
        name: 'Support — Oweable',
        description: 'Contact Oweable support for billing, access, product, privacy, or technical questions.',
      },
      {
        '@type': 'FAQPage',
        '@id': `${SUPPORT_PAGE_URL}#faq`,
        url: SUPPORT_PAGE_URL,
        mainEntity: QUICK_HELP.map((item) => ({
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
  const [scrolled, setScrolled] = useState(false);
  const user = useStore((state) => state.user);
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
    description: 'Contact Oweable support for billing, access, privacy, security, or technical questions.',
    canonical: 'https://www.oweable.com/support',
    ogTitle: 'Support — Oweable',
    ogDescription: 'Get help with account access, billing, subscriptions, and product questions.',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      toast.success("We got your message and we'll reply within 1 business day.");
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/5 bg-surface-base/60 backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <TransitionLink to="/" className="group flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-white flex items-center justify-center transition-transform group-hover:rotate-12">
              <div className="h-3 w-3 bg-black rounded-full" />
            </div>
            <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.1em] text-content-primary" />
          </TransitionLink>
          <div className="hidden items-center gap-10 text-[11px] font-medium uppercase tracking-[0.15em] text-content-tertiary md:flex">
            <a href="/pricing" className="transition-colors hover:text-content-primary">Plans</a>
            <a href="/faq" className="transition-colors hover:text-content-primary">FAQ</a>
            <a href="/security" className="transition-colors hover:text-content-primary">Security</a>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <TransitionLink
              to={user?.id ? '/dashboard' : '/onboarding'}
              className="group relative inline-flex items-center justify-center rounded-full bg-content-primary px-6 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-base transition-all duration-300 hover:scale-105"
            >
              <span className="relative z-10">{user?.id ? 'Dashboard' : 'Get Started'}</span>
            </TransitionLink>
          </div>
        </div>
      </nav>

      <main>
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-10 py-10 sm:py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
            <div className="public-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-content-secondary">
                <LifeBuoy className="h-3.5 w-3.5 text-brand-profit" />
                Support
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] text-content-primary sm:text-6xl">
                Help that feels like a real person will read it.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-content-secondary">
                Reach out for billing, access, account, product, or technical issues. We usually reply within one business day.
              </p>
              <div className="mt-8 grid gap-6">
                <div className="public-hover-lift flex flex-col items-start rounded-2xl border border-surface-border bg-surface-raised p-8">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-tertiary">Best for</p>
                  <p className="mt-3 text-sm leading-relaxed text-content-secondary">Account access problems, billing questions, bugs, and anything blocking your workflow.</p>
                </div>
                <div className="public-hover-lift flex flex-col items-start rounded-2xl border border-surface-border bg-surface-raised p-8">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-tertiary">Direct email</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-content-primary hover:text-brand-profit">
                    <Mail className="h-4 w-4" />
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="public-hover-lift flex flex-col items-start rounded-2xl border border-surface-border bg-surface-raised p-8">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-tertiary">Sensitive requests</p>
                  <p className="mt-3 text-sm leading-relaxed text-content-secondary">
                    For privacy or security-specific concerns, include that in your subject line so we can route it quickly.
                  </p>
                </div>
              </div>
            </div>

            <div className="public-fade-up public-delay-1 grid gap-6">
              <section className="rounded-2xl border border-surface-border bg-surface-raised p-8 sm:p-10 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] leading-tight text-content-primary">Send a message</h2>
                <p className="mt-4 text-base leading-relaxed text-content-secondary">
                  Give us the basics and a little context. The clearer the message, the faster we can help.
                </p>

                {submitted ? (
                  <div className="mt-8 rounded-md bg-surface-highlight p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-base text-brand-profit shadow-sm">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-content-primary">Message sent</h3>
                    <p className="mt-3 text-base leading-7 text-content-secondary">
                      We got your note and will usually reply within one business day.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-cta px-6 py-3 text-sm font-medium text-surface-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-cta-hover"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-medium text-content-secondary">
                        Name
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          className="mt-2 w-full rounded-md border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
                          placeholder="Your name"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-content-secondary">
                        Email
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          className="mt-2 w-full rounded-md border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
                          placeholder="you@example.com"
                          required
                        />
                      </label>
                    </div>

                    <label className="mt-4 block text-sm font-medium text-content-secondary">
                      Subject
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                        className="mt-2 w-full rounded-md border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
                        placeholder="Billing, login issue, bug report..."
                      />
                    </label>

                    <label className="mt-4 block text-sm font-medium text-content-secondary">
                      Message
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                        className="mt-2 min-h-[160px] w-full rounded-md border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
                        placeholder="Tell us what happened, what you expected, and anything that would help us reproduce or understand the issue."
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-6 inline-flex items-center gap-3 rounded-full bg-brand-cta px-7 py-3.5 text-sm font-medium text-surface-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? 'Sending...' : 'Send message'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-2xl border border-surface-border bg-surface-raised p-8 sm:p-10">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] leading-tight text-content-primary">Quick answers</h2>
                <div className="mt-6 grid gap-5">
                  {QUICK_HELP.map((item) => (
                    <div key={item.q} className="rounded-xl bg-surface-highlight p-6">
                      <h3 className="text-base font-semibold leading-tight text-content-primary">{item.q}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-content-secondary">{item.a}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <TransitionLink
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-full border border-surface-border px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-surface-border-subtle hover:bg-surface-highlight"
                  >
                    Pricing
                  </TransitionLink>
                  <TransitionLink
                    to="/security"
                    className="inline-flex items-center gap-2 rounded-full border border-surface-border px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-surface-border-subtle hover:bg-surface-highlight"
                  >
                    Security
                  </TransitionLink>
                  <TransitionLink
                    to="/privacy"
                    className="inline-flex items-center gap-2 rounded-full border border-surface-border px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-surface-border-subtle hover:bg-surface-highlight"
                  >
                    Privacy
                  </TransitionLink>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
