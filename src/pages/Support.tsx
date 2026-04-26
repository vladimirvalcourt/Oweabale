import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
import { TransitionLink } from '../components/TransitionLink';
import { useJsonLd } from '../hooks/useJsonLd';
import { useSEO } from '../hooks/useSEO';
import { submitSupportContact } from '../lib/supportContact';
import { toast } from 'sonner';

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

const springButton = {
  hover: { scale: 1.03, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
  tap: { scale: 0.97, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
};

const SUPPORT_EMAIL = 'support@oweable.com';
const SUPPORT_PAGE_URL = 'https://www.oweable.com/support';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

const QUICK_HELP = [
  {
    q: 'How does billing work for Full Suite?',
    a: 'Full Suite renews on your billing cycle and can be managed from your settings. Pricing shows the current plan structure and trial details in plain English.',
  },
  {
    q: 'I cannot access my account. What should I do?',
    a: 'Use the same sign-in method you originally used. If access still fails, send support the email tied to the account and a short description of what happened so we can help faster.',
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useSEO({
    title: 'Support — Oweable',
    description: 'Contact Oweable support for billing, access, privacy, security, or technical questions and get help from a real person.',
    canonical: 'https://www.oweable.com/support',
    ogTitle: 'Support — Oweable',
    ogDescription: 'Get help with account access, billing, subscriptions, and product questions from a real person.',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  useJsonLd('support', buildSupportJsonLd, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !widgetContainerRef.current) {
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !widgetContainerRef.current || !window.turnstile) {
          return;
        }

        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetContainerRef.current.innerHTML = '';
        widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'auto',
          callback: (token: string) => {
            setTurnstileToken(token);
            setTurnstileReady(true);
          },
          'expired-callback': () => {
            setTurnstileToken('');
            setTurnstileReady(false);
          },
          'error-callback': () => {
            setTurnstileToken('');
            setTurnstileReady(false);
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setTurnstileReady(false);
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

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
    if (!TURNSTILE_SITE_KEY) {
      toast.error('Support form verification is not configured yet');
      return false;
    }
    if (!turnstileToken) {
      toast.error('Please complete the security check');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await submitSupportContact({
      ...formData,
      turnstileToken,
    });
    setIsSubmitting(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTurnstileToken('');
      setTurnstileReady(false);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      toast.success("We got your message and we'll reply within 1 business day.");
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Plans' },
          { href: '/faq', label: 'FAQ' },
          { href: '/security', label: 'Security' },
        ]}
      />

      <main>
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-10 py-10 sm:py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
            <div className="public-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-2 text-xs font-semibold uppercase tracking-widest text-content-secondary">
                Support
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-content-primary sm:text-6xl">
                Help for when something is wrong and you do not want to chase it alone.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-content-secondary">
                Reach out for billing, access, account, product, or technical issues. We usually reply within one business day, and the goal is to be useful, not robotic.
              </p>
              <div className="mt-8 grid gap-6">
                <div className="public-hover-lift flex flex-col items-start rounded-[12px] border border-surface-border bg-surface-raised p-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Best for</p>
                  <p className="mt-3 text-sm leading-relaxed text-content-secondary">Account access problems, billing questions, bugs, and anything that is making the product harder to use than it should be.</p>
                </div>
                <div className="public-hover-lift flex flex-col items-start rounded-[12px] border border-surface-border bg-surface-raised p-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Direct email</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-content-primary hover:text-brand-profit">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="public-hover-lift flex flex-col items-start rounded-[12px] border border-surface-border bg-surface-raised p-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Sensitive requests</p>
                  <p className="mt-3 text-sm leading-relaxed text-content-secondary">
                    For privacy or security concerns, include that in your subject line so we can route it quickly and handle it with the right level of care.
                  </p>
                </div>
              </div>
            </div>

            <div className="public-fade-up public-delay-1 grid gap-6">
              <section className="rounded-[12px] border border-surface-border bg-surface-raised p-8 sm:p-10 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-tight leading-tight text-content-primary">Send a message</h2>
                <p className="mt-4 text-base leading-relaxed text-content-secondary">
                  Give us the basics and a little context. You do not need to write a perfect report. Just tell us what happened and what you needed to get done.
                </p>

                {submitted ? (
                  <div className="mt-8 rounded-[12px] border border-surface-border bg-surface-highlight p-8 text-center">
                    <h3 className="text-lg font-semibold text-content-primary mb-3">Message sent</h3>
                    <p className="text-sm leading-relaxed text-content-secondary">
                      We got your note and will usually reply within one business day.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 inline-flex items-center justify-center rounded-[10px] bg-brand-cta px-6 h-[48px] text-sm font-medium text-surface-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-cta-hover min-w-[160px]"
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
                          className="mt-2 w-full rounded-[8px] border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
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
                          className="mt-2 w-full rounded-[8px] border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
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
                        className="mt-2 w-full rounded-[8px] border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
                        placeholder="Billing, login issue, bug report..."
                      />
                    </label>

                    <label className="mt-4 block text-sm font-medium text-content-secondary">
                      Message
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                        className="mt-2 min-h-[160px] w-full rounded-[8px] border border-surface-border bg-surface-raised px-4 py-3 text-content-primary outline-none transition-colors focus:border-surface-border-subtle"
                        placeholder="Tell us what happened, what you expected, and anything that would help us reproduce or understand the issue."
                        
                        required
                      />
                    </label>

                    <div className="mt-5">
                      {TURNSTILE_SITE_KEY ? (
                        <>
                          <div ref={widgetContainerRef} />
                          {!turnstileReady && (
                            <p className="mt-2 text-sm text-content-tertiary">
                              Complete the verification to send your message.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-content-tertiary">
                          Support form verification is not configured yet.
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !turnstileToken || !TURNSTILE_SITE_KEY}
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
                <motion.div
                  className="mt-6 grid gap-5"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-100px' }}
                >
                  {QUICK_HELP.map((item) => (
                    <motion.div key={item.q} variants={fadeInUp} className="rounded-xl bg-surface-highlight p-6">
                      <h3 className="text-base font-semibold leading-tight text-content-primary">{item.q}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-content-secondary">{item.a}</p>
                    </motion.div>
                  ))}
                </motion.div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                    <TransitionLink
                      to="/pricing"
                      className="inline-flex items-center gap-2 rounded-full border border-surface-border px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-surface-border-subtle hover:bg-surface-highlight"
                    >
                      Pricing
                    </TransitionLink>
                  </motion.div>
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

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__oweableTurnstileScriptLoading) {
    return window.__oweableTurnstileScriptLoading;
  }

  window.__oweableTurnstileScriptLoading = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(script);
  });

  return window.__oweableTurnstileScriptLoading;
}
