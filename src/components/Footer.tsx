import { TransitionLink } from './TransitionLink';
import { BrandWordmark } from './BrandWordmark';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-base pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <TransitionLink to="/" className="mb-5 text-content-primary">
              <BrandWordmark textClassName="brand-header-text" />
            </TransitionLink>
            <p className="text-sm text-content-tertiary max-w-sm leading-relaxed mb-8">
              The Financial OS for Debt, Bills & Cash Flow.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-content-primary mb-6">Platform</h4>
            <ul className="flex flex-col gap-3 text-xs font-mono text-content-tertiary uppercase tracking-widest">
              <li><a href="/#features" className="hover:text-content-primary transition-colors">Features</a></li>
              <li><TransitionLink to="/pricing" className="hover:text-content-primary transition-colors">Pricing</TransitionLink></li>
              <li><TransitionLink to="/dashboard" className="hover:text-content-primary transition-colors">Sign In</TransitionLink></li>
              <li><TransitionLink to="/support" className="hover:text-content-primary transition-colors">Support</TransitionLink></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-content-primary mb-6">Legal</h4>
            <ul className="flex flex-col gap-3 text-xs font-mono text-content-tertiary uppercase tracking-widest">
              <li><TransitionLink to="/privacy" className="hover:text-content-primary transition-colors">Privacy</TransitionLink></li>
              <li><TransitionLink to="/terms" className="hover:text-content-primary transition-colors">Terms</TransitionLink></li>
              <li><TransitionLink to="/security" className="hover:text-content-primary transition-colors">Security</TransitionLink></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-surface-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-[10px] font-mono text-content-muted uppercase tracking-widest">
            <span>OWEABLE INC. NYC</span>
            <span className="mx-1 h-3 w-px bg-surface-border shrink-0 inline-block align-middle" aria-hidden />
            <span>© {new Date().getFullYear()} All Rights Reserved</span>
          </div>
          <TransitionLink
            to="/support"
            className="text-[10px] font-mono uppercase tracking-widest text-content-muted hover:text-content-primary transition-colors"
          >
            Contact support
          </TransitionLink>
        </div>
      </div>
    </footer>
  );
}
