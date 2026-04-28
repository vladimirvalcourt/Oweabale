import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Footer } from '../components/layout';
import { PublicHeader } from '../components/layout';
import { TransitionLink } from '../components/common';
import { useJsonLd } from '../hooks';
import { useSEO } from '../hooks';
import { submitSupportContact } from '../app/constants';
import { EMAIL_CONFIG } from '../lib/utils/emailObfuscation';
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

const SUPPORT_PAGE_URL = 'https://www.oweable.com/support';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
const TURNSTILE_ENFORCED = Boolean(TURNSTILE_SITE_KEY);

const QUICK_HELP = [
  {
    q: 'How does billing work for Full Suite?',
    a: 'Full Suite renews on your billing cycle and you can manage it from your settings. The Pricing page shows the current plan structure and trial details in plain English.',
  },
  {
    q: 'I cannot access my account. What should I do?',
    a: 'Use the same sign-in method you originally used. If that still does not work, send support the email tied to your account and a quick note about what happened so we can help faster.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'You can pause or cancel from your billing settings. Your access stays active until the end of your current paid period.',
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
    description: 'Contact Oweable support for billing, access, privacy, security, or product questions when bills, debt, or account issues need a real answer.',
    canonical: 'https://www.oweable.com/support',
    ogTitle: 'Support — Oweable',
    ogDescription: 'Get help with account access, billing, subscriptions, and product questions from a real person.',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  useJsonLd('support', buildSupportJsonLd, []);

  useEffect(() => {
    if (!TURNSTILE_ENFORCED) {
      return;
    }

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
    if (TURNSTILE_ENFORCED && !TURNSTILE_SITE_KEY) {
      toast.error('Support form verification is not configured yet');
      return false;
    }
    if (TURNSTILE_ENFORCED && !turnstileToken) {
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
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-brand-violet/25">
      <PublicHeader
        links={[
          { href: '/pricing', label: 'Plans' },
          { href: '/faq', label: 'FAQ' },
          { href: '/security', label: 'Security' },
        ]}
      />

      <main>
        <div className="mx-auto max-w-[1280px] px-5 pt-36 sm:px-8">
          <section className="grid gap-12 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Support</p>
              <h1 className="mt-5 max-w-3xl text-5xl font-medium leading-none tracking-[-0.055em] text-content-primary sm:text-6xl">
                Help for when money admin already feels heavy.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-content-tertiary">
                Reach out for billing, access, account, product, or technical issues. Tell us what you were trying to do and where it got stuck. We usually reply within one business day.
              </p>
              <div className="mt-10 grid gap-3">
                <div className="rounded-[10px] border border-surface-border-subtle bg-white/[0.022] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Best for</p>
                  <p className="mt-3 text-sm leading-6 text-content-tertiary">Account access problems, billing questions, bugs, and anything that is getting in the way while you are trying to manage bills or debt.</p>
                </div>
                <div className="rounded-[10px] border border-surface-border-subtle bg-white/[0.022] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Contact Support</p>
                  {EMAIL_CONFIG.support.createContactLink(
                    'Get Help',
                    'mt-3 inline-flex h-11 min-w-[140px] items-center justify-center rounded-md bg-content-primary px-5 text-sm font-medium text-surface-base transition-colors hover:bg-content-secondary',
                    true
                  )}
                </div>
                <div className="rounded-[10px] border border-surface-border-subtle bg-white/[0.022] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Sensitive requests</p>
                  <p className="mt-3 text-sm leading-6 text-content-tertiary">
                    For privacy or security concerns, include that in your subject line so we can route it quickly and handle it with the right level of care.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <section className="rounded-[10px] border border-surface-border bg-white/[0.018] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-8">
                <h2 className="text-2xl font-medium tracking-[-0.03em] leading-tight text-content-primary">Send a message</h2>
                <p className="mt-4 text-sm leading-6 text-content-tertiary">
                  Give us the basics and a little context. You do not need a perfect report. Just tell us what happened, what you were trying to get done, and what felt blocked.
                </p>

                {submitted ? (
                  <div className="mt-8 rounded-[8px] border border-surface-border-subtle bg-surface-base/60 p-8 text-center">
                    <h3 className="text-lg font-medium text-content-primary mb-3">Message sent</h3>
                    <p className="text-sm leading-relaxed text-content-tertiary">
                      We got your note and will usually reply within one business day.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 inline-flex h-11 min-w-[160px] items-center justify-center rounded-md bg-content-primary px-6 text-sm font-medium text-surface-base transition-colors hover:bg-content-secondary"
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
                          className="mt-2 w-full rounded-md border border-surface-border bg-surface-raised/80 px-4 py-3 text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-brand-violet/40"
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
                          className="mt-2 w-full rounded-md border border-surface-border bg-surface-raised/80 px-4 py-3 text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-brand-violet/40"
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
                        className="mt-2 w-full rounded-md border border-surface-border bg-surface-raised/80 px-4 py-3 text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-brand-violet/40"
                        placeholder="Billing, login issue, bug report..."
                      />
                    </label>

                    <label className="mt-4 block text-sm font-medium text-content-secondary">
                      Message
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                        className="mt-2 min-h-[160px] w-full rounded-md border border-surface-border bg-surface-raised/80 px-4 py-3 text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-brand-violet/40"
                        placeholder="Tell us what happened, what you expected, and anything that would help us reproduce or understand the issue."
                        
                        required
                      />
                    </label>

                    {TURNSTILE_ENFORCED && (
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
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-6 inline-flex h-11 items-center gap-3 rounded-md bg-content-primary px-6 text-sm font-medium text-surface-base transition-colors hover:bg-content-secondary disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? 'Sending...' : 'Send message'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-[10px] border border-surface-border bg-white/[0.018] p-6 sm:p-8">
                <h2 className="text-2xl font-medium tracking-[-0.03em] leading-tight text-content-primary">Quick answers</h2>
                <motion.div
                  className="mt-6 grid gap-5"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-100px' }}
                >
                  {QUICK_HELP.map((item) => (
                    <motion.div key={item.q} variants={fadeInUp} className="border-t border-surface-border-subtle pt-5">
                      <h3 className="text-base font-medium leading-tight tracking-[-0.018em] text-content-primary">{item.q}</h3>
                      <p className="mt-3 text-sm leading-6 text-content-tertiary">{item.a}</p>
                    </motion.div>
                  ))}
                </motion.div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.div variants={springButton} whileHover="hover" whileTap="tap">
                    <TransitionLink
                      to="/pricing"
                      className="inline-flex items-center gap-2 rounded-md border border-surface-border px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-highlight"
                    >
                      Pricing
                    </TransitionLink>
                  </motion.div>
                  <TransitionLink
                    to="/security"
                    className="inline-flex items-center gap-2 rounded-md border border-surface-border px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-highlight"
                  >
                    Security
                  </TransitionLink>
                  <TransitionLink
                    to="/privacy"
                    className="inline-flex items-center gap-2 rounded-md border border-surface-border px-5 py-2.5 text-sm font-medium text-content-primary transition-colors hover:bg-surface-highlight"
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
