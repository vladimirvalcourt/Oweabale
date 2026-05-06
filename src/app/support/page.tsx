import { MarketingShell } from "@/components/layout/MarketingShell";
import {
  Mail,
  MessageSquare,
  BookOpen,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Support — Oweable",
  description: "Get help with Oweable. Browse common questions or contact us directly.",
};

const faqs = [
  {
    q: "How do I start my 14-day free trial?",
    a: "Click \"Get started\" on the homepage and sign in with your Google account. No credit card is required. Your 14-day trial begins immediately and includes full access to every feature.",
  },
  {
    q: "What types of obligations can I track?",
    a: "Oweable supports bills (utilities, rent, insurance), debts (credit cards, loans, medical), subscriptions (streaming, software, gym), business mileage, traffic citations, and tax-deductible expenses. More categories are on the roadmap.",
  },
  {
    q: "Do I have to connect my bank account?",
    a: "No. Oweable is manual-first by design — you enter your obligations yourself and stay in full control. Bank connections via Plaid are optional and available when you are ready.",
  },
  {
    q: "How does the debt payoff planner work?",
    a: "Go to the Debts section and enter your balances, minimum payments, and interest rates. Oweable calculates an avalanche (highest-rate first) or snowball (lowest-balance first) payoff order and shows your projected payoff timeline.",
  },
  {
    q: "What is Safe Spend?",
    a: "Safe Spend is the amount of money remaining after all of your upcoming obligations are accounted for. It tells you how much you can spend freely today without risking a missed payment later.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Go to Settings → Billing and click \"Cancel plan\". Your access continues until the end of the current billing period. We do not charge cancellation fees.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Go to Settings → Profile and look for the data export option. You will receive a CSV download of all your obligations, transactions, and account data.",
  },
  {
    q: "Is my financial data secure?",
    a: "All data is encrypted in transit (TLS 1.2+) and at rest. We use row-level security so your data is never accessible to other users. You can also enable multi-factor authentication in Settings → Security.",
  },
  {
    q: "What happens to my data if I delete my account?",
    a: "All your personal data is permanently deleted within 30 days of account deletion. Anonymized aggregate data (used for product analytics) may be retained.",
  },
  {
    q: "I found a bug or security issue — how do I report it?",
    a: "Email security@oweable.com for any security-related reports. For general bugs, use the support email below or the in-app feedback button in your account settings.",
  },
];

const contactOptions = [
  {
    icon: Mail,
    title: "Email support",
    description: "For account, billing, and general questions. We reply within one business day.",
    cta: "support@oweable.com",
    href: "mailto:support@oweable.com",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description: "To report a vulnerability or privacy concern, contact our security team.",
    cta: "security@oweable.com",
    href: "mailto:security@oweable.com",
  },
  {
    icon: CreditCard,
    title: "Billing",
    description: "Questions about charges, invoices, or subscription changes.",
    cta: "billing@oweable.com",
    href: "mailto:billing@oweable.com",
  },
];

export default function SupportPage() {
  return (
    <MarketingShell>
      <div className="px-6 py-20">
        <div className="mx-auto max-w-5xl">

          {/* Page header */}
          <div className="mb-16 text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.4em] text-(--color-accent)">
              Help
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-(--color-content)">
              How can we help?
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-(--color-content-secondary)">
              Browse the common questions below or reach out directly — we are a small team and reply fast.
            </p>
          </div>

          {/* Contact cards */}
          <div className="mb-20 grid gap-4 sm:grid-cols-3">
            {contactOptions.map((opt) => (
              <a
                key={opt.title}
                href={opt.href}
                className="group rounded-xl border border-(--color-surface-border) bg-(--color-surface-raised) p-6 transition-colors hover:border-(--color-accent-muted) hover:bg-(--color-surface-elevated)"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-(--color-accent-muted)">
                  <opt.icon className="h-4 w-4 text-(--color-accent)" />
                </div>
                <h3 className="text-sm font-semibold text-(--color-content)">{opt.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-(--color-content-secondary)">{opt.description}</p>
                <p className="mt-3 text-sm font-medium text-(--color-accent) group-hover:underline">{opt.cta}</p>
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="mb-14 border-t border-(--color-surface-border)" />

          {/* FAQ */}
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-(--color-accent-muted)">
                <MessageSquare className="h-4 w-4 text-(--color-accent)" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.4em] text-(--color-accent)">FAQ</p>
                <h2 className="text-2xl font-semibold tracking-tight text-(--color-content)">Common questions</h2>
              </div>
            </div>

            <div className="space-y-0">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="border-b border-(--color-surface-border) py-6 first:border-t"
                >
                  <h3 className="text-sm font-semibold text-(--color-content)">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-(--color-content-secondary)">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 rounded-xl border border-(--color-surface-border) bg-(--color-surface-raised) px-10 py-12 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-(--color-accent-muted)">
              <BookOpen className="h-5 w-5 text-(--color-accent)" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-(--color-content)">
              Still have questions?
            </h3>
            <p className="mt-2 text-sm text-(--color-content-secondary)">
              We read every message and reply within one business day.
            </p>
            <a
              href="mailto:support@oweable.com"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--color-accent-hover)"
            >
              <Mail className="h-4 w-4" />
              Email us
            </a>
          </div>

        </div>
      </div>
    </MarketingShell>
  );
}
