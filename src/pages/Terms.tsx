import React from 'react';
import { Scale } from 'lucide-react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useSEO } from '../hooks/useSEO';

export default function Terms() {
  useSEO({
    title: 'Terms of Service — Oweable',
    description: 'Terms of Service for Oweable, including payments, cancellations, refunds, account termination, and legal notices.',
    canonical: 'https://www.oweable.com/terms',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
    <Header />
    <div className="min-h-screen bg-surface-base text-content-primary font-sans pt-24 p-8 md:p-24 selection:bg-content-primary/15">
      <div className="max-w-3xl mx-auto">
        
        <header className="mb-16 border-l-4 border-surface-border pl-8 mt-8">
          <div className="flex items-center gap-3 text-content-secondary mb-4">
            <Scale className="w-6 h-6 shrink-0" aria-hidden />
            <span className="text-xs font-sans font-medium">Legal</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-4">Terms of Service</h1>
          <p className="text-sm text-content-tertiary">Last updated April 2026</p>
        </header>

        <div className="space-y-12 text-content-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">1. Acceptance of terms</h2>
            <p>
              By accessing the Oweable platform or utilizing our automated services, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and Oweable Inc.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">2. Platform use</h2>
            <p className="mb-4">
              Oweable is a tool for financial organization and autonomous accounting. We grant you a limited, non-exclusive license to use the platform for your own professional or personal use.
            </p>
            <p>
              You agree not to reverse engineer the system, automate data scraping, or utilize the platform for any illegal financial activities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">3. Not financial advice</h2>
            <p className="p-6 bg-surface-raised border border-surface-border text-sm text-content-secondary leading-relaxed mb-4 rounded-lg">
              Oweable and its software are not a certified financial planner, legal counsel, or tax advisor.
            </p>
            <p>
              All tax calculations and financial suggestions provided by Oweable are for informational purposes only. You are solely responsible for ensuring your own compliance with state and federal tax laws. We strongly recommend consulting with a certified public accountant (CPA) for final filings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">4. Payments &amp; cancellations</h2>
            <p className="mb-4">
              Paid subscriptions are billed monthly on your original signup date (or the date you upgrade to a paid plan). By starting a paid plan, you authorize recurring charges until cancellation.
            </p>
            <p className="mb-4">
              You may cancel anytime from your billing settings. Cancellation stops future renewals and your paid access remains active through the end of the current billing period.
            </p>
            <p className="mb-4">
              New paid subscribers are eligible for a refund request within 7 calendar days of the first paid charge. After this window, charges are non-refundable and we do not provide prorated refunds for partial billing periods unless required by law.
            </p>
            <p>
              After cancellation, your account transitions to the free Tracker tier. Data retention and deletion requests follow the &quot;Right to Fade&quot; process in our{' '}
              <TransitionLink to="/privacy" className="underline underline-offset-2 hover:text-content-primary">
                Privacy Policy
              </TransitionLink>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">5. Account termination</h2>
            <p className="mb-4">
              We may suspend or terminate access for fraud, abuse, security threats, repeated policy violations, non-payment, or illegal activity. We may also remove content or restrict features to protect the platform and other users.
            </p>
            <p>
              When feasible, we provide notice before termination. Immediate suspension may occur when required to address urgent security or legal issues.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">6. Changes to these terms</h2>
            <p>
              We may update these Terms from time to time. Material changes are communicated by email, in-app notice, or both. Continued use of Oweable after the effective date of updated terms constitutes acceptance of those updates.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">7. Governing law and jurisdiction</h2>
            <p className="mb-4">
              These Terms are governed by the laws of the State of New York, without regard to conflict-of-laws principles.
            </p>
            <p>
              Any dispute arising from these Terms or your use of Oweable will be brought in the state or federal courts located in New York County, New York, unless applicable law requires otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">8. Limitation of liability</h2>
            <p>
              Oweable provides its services &quot;as is&quot; and &quot;as available&quot;. We are not responsible for financial losses, missed tax deadlines, or penalties incurred through the use of this software. Our total liability is limited to the amount paid by you for the service in the preceding 12-month period.
            </p>
          </section>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
