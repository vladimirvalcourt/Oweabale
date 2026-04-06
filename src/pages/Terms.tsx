import React from 'react';
import { FileText, Award, Scale, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans p-8 md:p-24 selection:bg-brand-violet/30">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-content-tertiary hover:text-brand-violet transition-colors mb-12 font-mono text-[10px] uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Back to Terminal
        </Link>
        
        <header className="mb-16 border-l-4 border-brand-violet pl-8">
          <div className="flex items-center gap-3 text-brand-violet mb-4">
            <Scale className="w-6 h-6" />
            <span className="font-mono text-xs uppercase tracking-[0.3em]">Protocol // 02</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-4">Terms of Service</h1>
          <p className="text-content-tertiary font-mono text-[10px] uppercase tracking-widest">Last Updated: April 2026</p>
        </header>

        <div className="space-y-12 text-content-secondary leading-relaxed">
          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">01. Acceptance of Terms</h2>
            <p>
              By accessing the Oweable platform or utilizing our automated services, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and Oweable Inc.
            </p>
          </section>

          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">02. Platform Use</h2>
            <p className="mb-4">
              Oweable is a tool for financial organization and autonomous accounting. We grant you a limited, non-exclusive license to use the platform for your own professional or personal use.
            </p>
            <p>
              You agree not to reverse engineer the system, automate data scraping, or utilize the platform for any illegal financial activities.
            </p>
          </section>

          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">03. Not Financial Advice</h2>
            <p className="p-6 bg-surface-raised border border-brand-violet/20 font-mono text-xs text-brand-violet-shade leading-relaxed italic mb-4">
              "NEITHER OWEABLE NOR ITS SOFTWARE SHOULD BE CONSIDERED A CERTIFIED FINANCIAL PLANNER, LEGAL COUNSEL, OR TAX ADVISOR."
            </p>
            <p>
              All tax calculations and financial suggestions provided by Oweable are for informational purposes only. You are solely responsible for ensuring your own compliance with state and federal tax laws. We strongly recommend consulting with a certified public accountant (CPA) for final filings.
            </p>
          </section>

          <section>
            <h2 className="text-content-primary font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-surface-border pb-2">04. Limitation of Liability</h2>
            <p>
              Oweable provides its services "as is" and "as available". We are not responsible for financial losses, missed tax deadlines, or penalties incurred through the use of this software. Our total liability is limited to the amount paid by you for the service in the preceding 12-month period.
            </p>
          </section>
        </div>

        <footer className="mt-24 pt-12 border-t border-surface-border font-mono text-[10px] text-content-muted uppercase tracking-[0.2em]">
          End of Terms Protocol // Oweable Inc.
        </footer>
      </div>
    </div>
  );
}
