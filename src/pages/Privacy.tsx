import React from 'react';
import { Eye, ChevronLeft } from 'lucide-react';
import { TransitionLink } from '../components/TransitionLink';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';

export default function Privacy() {
  useSEO({
    title: 'Privacy Policy — Oweable',
    description: "Oweable's privacy policy. We don't sell your data. Learn what we collect, how we use it, and how you can delete it.",
    canonical: 'https://www.oweable.com/privacy',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
    <div className="min-h-screen bg-surface-base text-content-primary font-sans p-8 md:p-24 selection:bg-white/15">
      <div className="max-w-3xl mx-auto">
        <TransitionLink to="/" className="inline-flex items-center gap-2 text-sm text-content-tertiary hover:text-content-primary transition-colors mb-12 font-sans">
          <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden /> Back to home
        </TransitionLink>
        
        <header className="mb-16 border-l-4 border-white/25 pl-8">
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
              Sensitive information is protected with strong encryption when stored and when it moves between your device and our systems. Access is tightly controlled; Oweable staff cannot browse your transaction history without a support process you initiate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">3. Third-party integrations</h2>
            <p>
              We work with vetted partners for optional bank linking and for document processing. Those partners may only use
              your information to provide the service you asked for. You can use Oweable without linking a bank; connectivity is
              optional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">4. Your rights</h2>
            <p>
              Under our "Right to Fade" policy, you may export your entire data vault at any time. Upon account termination, all identifying records are purged from our active systems within 72 hours.
            </p>
          </section>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
