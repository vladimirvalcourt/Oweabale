import React, { useState } from 'react';
import { ArrowRight, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { TransitionLink } from '../components/TransitionLink';
import { useJsonLd } from '../hooks/useJsonLd';
import { useSEO } from '../hooks/useSEO';
import { submitSupportContact } from '../lib/supportContact';
import { toast } from 'sonner';

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
    <>
      <Header />
      <div className="min-h-screen bg-[#f6efe4] px-6 pb-20 pt-28 text-[#1f2b24] selection:bg-[#1f2b24]/15 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-10 py-10 sm:py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
            <div className="public-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7cebf] bg-[#fff9f0] px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[#5f6b62]">
                <LifeBuoy className="h-3.5 w-3.5 text-[#35684f]" />
                Support
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] text-[#1f2b24] sm:text-6xl">
                Help that feels like a real person will read it.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#556157]">
                Reach out for billing, access, account, product, or technical issues. We usually reply within one business day.
              </p>
              <div className="mt-8 grid gap-4">
                <div className="public-hover-lift rounded-[1.5rem] border border-[#d7cebf] bg-[#fffaf3] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7a6a54]">Best for</p>
                  <p className="mt-2 text-sm leading-7 text-[#5b685e]">Account access problems, billing questions, bugs, and anything blocking your workflow.</p>
                </div>
                <div className="public-hover-lift rounded-[1.5rem] border border-[#d7cebf] bg-[#fffaf3] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7a6a54]">Direct email</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#1f2b24] hover:text-[#35684f]">
                    <Mail className="h-4 w-4" />
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="public-hover-lift rounded-[1.5rem] border border-[#d7cebf] bg-[#fffaf3] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7a6a54]">Sensitive requests</p>
                  <p className="mt-2 text-sm leading-7 text-[#5b685e]">
                    For privacy or security-specific concerns, include that in your subject line so we can route it quickly.
                  </p>
                </div>
              </div>
            </div>

            <div className="public-fade-up public-delay-1 grid gap-6">
              <section className="rounded-[2rem] border border-[#d7cebf] bg-[#fffaf3] p-6 sm:p-7 shadow-[0_16px_40px_rgba(49,65,55,0.05)]">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#1f2b24]">Send a message</h2>
                <p className="mt-3 text-base leading-7 text-[#5b685e]">
                  Give us the basics and a little context. The clearer the message, the faster we can help.
                </p>

                {submitted ? (
                  <div className="mt-8 rounded-[1.5rem] bg-[#eef4ef] p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#35684f] shadow-sm">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#1f2b24]">Message sent</h3>
                    <p className="mt-3 text-base leading-7 text-[#5b685e]">
                      We got your note and will usually reply within one business day.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 inline-flex items-center justify-center rounded-full bg-[#1f2b24] px-6 py-3 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2d3a32]"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-medium text-[#445148]">
                        Name
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-[#d7cebf] bg-[#fdf8f1] px-4 py-3 text-[#1f2b24] outline-none transition-colors focus:border-[#bcae94]"
                          placeholder="Your name"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-[#445148]">
                        Email
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-[#d7cebf] bg-[#fdf8f1] px-4 py-3 text-[#1f2b24] outline-none transition-colors focus:border-[#bcae94]"
                          placeholder="you@example.com"
                          required
                        />
                      </label>
                    </div>

                    <label className="mt-4 block text-sm font-medium text-[#445148]">
                      Subject
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-[#d7cebf] bg-[#fdf8f1] px-4 py-3 text-[#1f2b24] outline-none transition-colors focus:border-[#bcae94]"
                        placeholder="Billing, login issue, bug report..."
                      />
                    </label>

                    <label className="mt-4 block text-sm font-medium text-[#445148]">
                      Message
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                        className="mt-2 min-h-[160px] w-full rounded-2xl border border-[#d7cebf] bg-[#fdf8f1] px-4 py-3 text-[#1f2b24] outline-none transition-colors focus:border-[#bcae94]"
                        placeholder="Tell us what happened, what you expected, and anything that would help us reproduce or understand the issue."
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#1f2b24] px-7 py-3.5 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2d3a32] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? 'Sending...' : 'Send message'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-[2rem] border border-[#d7cebf] bg-[#fffaf3] p-6 sm:p-7">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#1f2b24]">Quick answers</h2>
                <div className="mt-6 grid gap-4">
                  {QUICK_HELP.map((item) => (
                    <div key={item.q} className="rounded-[1.25rem] bg-[#f8f2e9] p-5">
                      <h3 className="text-base font-semibold text-[#1f2b24]">{item.q}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#5b685e]">{item.a}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <TransitionLink
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-full border border-[#d3cabd] px-5 py-2.5 text-sm font-medium text-[#314137] transition-colors hover:border-[#bcae94] hover:bg-[#fff9f0]"
                  >
                    Pricing
                  </TransitionLink>
                  <TransitionLink
                    to="/security"
                    className="inline-flex items-center gap-2 rounded-full border border-[#d3cabd] px-5 py-2.5 text-sm font-medium text-[#314137] transition-colors hover:border-[#bcae94] hover:bg-[#fff9f0]"
                  >
                    Security
                  </TransitionLink>
                  <TransitionLink
                    to="/privacy"
                    className="inline-flex items-center gap-2 rounded-full border border-[#d3cabd] px-5 py-2.5 text-sm font-medium text-[#314137] transition-colors hover:border-[#bcae94] hover:bg-[#fff9f0]"
                  >
                    Privacy
                  </TransitionLink>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
