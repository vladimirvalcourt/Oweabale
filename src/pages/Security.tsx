import React from 'react';
import { ShieldCheck, Database, Key, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';

export default function Security() {
  useSEO({
    title: 'Security — Oweable',
    description: 'How Oweable protects your financial data. TLS encryption, row-level security, Google OAuth, and regular penetration testing — built for the self-employed.',
    canonical: 'https://www.oweable.com/security',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  return (
    <>
    <div className="min-h-screen bg-surface-base text-content-primary font-sans p-8 md:p-24 selection:bg-brand-violet/30">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-content-tertiary hover:text-brand-violet transition-colors mb-12 font-sans">
          <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden /> Back to home
        </Link>
        
        <header className="mb-16 border-l-4 border-brand-violet pl-8">
          <div className="flex items-center gap-3 text-brand-violet mb-4">
            <ShieldCheck className="w-6 h-6 shrink-0" aria-hidden />
            <span className="text-xs font-sans font-medium">Security</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-4">Security</h1>
          <p className="text-sm text-content-tertiary">How we protect your data and your account</p>
        </header>

        <div className="space-y-12 text-content-secondary leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="p-6 bg-surface-raised border border-surface-border flex flex-col gap-4 rounded-sm">
              <Database className="w-8 h-8 text-brand-violet shrink-0" aria-hidden />
              <h3 className="text-base font-sans font-semibold text-content-primary">Strong encryption in transit and at rest</h3>
              <p className="text-sm">
                Sensitive identifiers are encrypted before they reach our primary storage, using industry-standard algorithms and key management practices.
              </p>
            </div>
            <div className="p-6 bg-surface-raised border border-surface-border flex flex-col gap-4 rounded-sm">
              <Key className="w-8 h-8 text-brand-violet shrink-0" aria-hidden />
              <h3 className="text-base font-sans font-semibold text-content-primary">Validated cryptography</h3>
              <p className="text-sm">
                Cryptographic operations use FIPS-validated modules where applicable for key management and secure operations.
              </p>
            </div>
          </div>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">1. SOC 2 framework</h2>
            <p>
              Oweable's operational security follows the SOC 2 Type II framework for Trust Services Criteria. This includes rigorous internal access controls, mandatory security training for all engineering staff, and routine third-party penetration testing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">2. Infrastructure and hosting</h2>
            <p>
              Our infrastructure is hosted on isolated virtual private clouds (VPCs) across multiple availability zones. We maintain 24/7/365 monitoring for unusual activity or unauthorized access attempts using AI-driven threat detection.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">3. Vulnerability disclosure</h2>
            <p>
              We operate a coordinated vulnerability disclosure (CVD) program. Security researchers can report discovered issues to our team for prioritized remediation. We take all reports seriously and aim to resolve critical issues within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-sans font-semibold text-content-primary mb-4 border-b border-surface-border pb-2">4. Data residency</h2>
            <p>
              All core data vaults are residency-locked in the United States unless otherwise specified by enterprise agreements. We strictly adhere to GDPR and CCPA requirements for data transfer and subject access requests.
            </p>
          </section>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
