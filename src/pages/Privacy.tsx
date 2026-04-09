import React from 'react';
import { Shield, Lock, Eye, FileText, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-surface-base text-content-primary font-sans p-8 md:p-24 selection:bg-brand-violet/30">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-content-tertiary hover:text-brand-violet transition-colors mb-12 font-mono text-[10px] uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Back to Terminal
        </Link>
        
        <header className="mb-16 border-l-4 border-brand-violet pl-8">
          <div className="flex items-center gap-3 text-brand-violet mb-4">
            <Eye className="w-6 h-6" />
            <span className="font-mono text-xs uppercase tracking-[0.3em]">Protocol // 01</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-content-tertiary font-mono text-[10px] uppercase tracking-widest">Last Updated: April 2026</p>
        </header>

        <div className="space-y-12 text-content-secondary leading-relaxed">
          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">01. Data Collection</h2>
            <p className="mb-4">
              Oweable collects specific financial telemetry required to provide autonomous accounting services. This includes transaction metadata, pay statements from supported gig platforms (Uber, Lyft, DoorDash), and your voluntary tax profile inputs.
            </p>
            <p>
              We do not sell your data. We do not rent your data. Your financial footprint remains your property.
            </p>
          </section>

          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">02. Encryption Standards</h2>
            <p>
              All sensitive identifiers are encrypted both at rest (AES-256) and in transit (TLS 1.3). Access to raw data is restricted to core system processes; Oweable employees cannot view your specific transaction history without explicit support authorization.
            </p>
          </section>

          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">03. Third-Party Integrations</h2>
            <p>
              We utilize select partners for banking connectivity and document parsing. These partners are strictly vetted and are contractually prohibited from using your data for any purpose other than facilitating Oweable's core functions.
            </p>
          </section>

          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">04. Your Rights</h2>
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
