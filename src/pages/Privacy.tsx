import React from 'react';
import { Eye, ChevronLeft } from 'lucide-react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';

export default function Privacy() {
  useSEO({
    title: 'Privacy Policy — Oweable',
    description: "Oweable's privacy policy for fintech-grade data handling, retention, encryption, and user rights.",
    canonical: 'https://www.oweable.com/privacy',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
    <div className="min-h-screen bg-surface-base text-content-primary font-sans p-8 md:p-24 selection:bg-content-primary/15">
      <div className="max-w-3xl mx-auto">
        <TransitionLink to="/" className="inline-flex items-center gap-2 text-sm text-content-tertiary hover:text-content-primary transition-colors mb-12 font-sans">
          <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden /> Back to home
        </TransitionLink>
        
        <header className="mb-16 border-l-4 border-surface-border pl-8">
          <div className="flex items-center gap-3 text-content-secondary mb-4">
            <Eye className="w-6 h-6 shrink-0" aria-hidden />
            <span className="text-xs font-sans font-medium">Legal</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-sm text-content-tertiary">Last updated April 2026</p>
        </header>

        <div className="space-y-12 text-content-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">1. Data collection</h2>
            <p className="mb-4">
              Oweable collects specific financial telemetry required to provide autonomous accounting services. This includes transaction metadata, pay statements from supported gig platforms (Uber, Lyft, DoorDash), and your voluntary tax profile inputs.
            </p>
            <p>
              We do not sell your data. We do not rent your data. Your financial footprint remains your property.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">2. Encryption standards</h2>
            <p>
              Sensitive information is encrypted using AES-256 at rest and TLS 1.2+ in transit. Access is tightly controlled; Oweable staff cannot browse your transaction history without a support process you initiate.
            </p>
            <p className="mt-4">
              For a deeper technical overview, review our{' '}
              <TransitionLink to="/security" className="underline underline-offset-2 hover:text-content-primary">
                Security page
              </TransitionLink>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">3. Third-party integrations</h2>
            <p>
              We work with vetted partners for service delivery categories such as payment processors, analytics providers, cloud hosting, and optional financial-data connectivity. These providers may only process your data to deliver the services you request.
            </p>
            <p className="mt-4">
              You can use Oweable without linking a bank account; connectivity is optional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">4. Cookies and tracking</h2>
            <p>
              We use essential cookies for authentication, security, and core product functionality. We may also use limited analytics cookies to understand product performance and reliability.
            </p>
            <p className="mt-4">
              You can manage non-essential cookies through your browser controls. Disabling essential cookies may affect your ability to sign in or use core features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">5. Data retention timeline</h2>
            <p>
              We retain account and financial records while your account is active and for a limited period afterward to support legal, tax, anti-fraud, and dispute-resolution obligations.
            </p>
            <p className="mt-4">
              Under our &quot;Right to Fade&quot; policy, you may export your full data vault at any time. Following verified deletion requests, identifying records are removed from active systems within 72 hours and deleted from backups according to scheduled retention windows.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">6. CCPA rights (California residents)</h2>
            <p>
              California residents may request access to categories and specific pieces of personal information collected, request deletion of eligible data, and request correction of inaccurate information, subject to legal exceptions.
            </p>
            <p className="mt-4">
              Oweable does not sell personal information. To submit a CCPA request, contact us through the support page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">7. Children&apos;s privacy</h2>
            <p>
              Oweable is not directed to children under 13 and we do not knowingly collect personal data from children. Users under the age of majority in their jurisdiction should use the service only with appropriate guardian consent where legally required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">8. Your rights</h2>
            <p>
              You may request export, correction, or deletion of your data at any time. We provide account controls for core privacy actions and honor verified requests in accordance with applicable law.
            </p>
          </section>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
