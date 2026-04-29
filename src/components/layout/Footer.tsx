import { BrandWordmark } from '../common/BrandWordmark';
import { TransitionLink } from '../common/TransitionLink';

const platformLinks = [
  { label: 'Features', href: '/#why' },
  { label: 'How it works', href: '/#flow' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

const companyLinks = [
  { label: 'Support', href: '/support' },
  { label: 'Security', href: '/security' },
  { label: 'Sign in', href: '/auth' },
];

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export default function Footer() {
  return (
    <footer className="public-section-line bg-surface-base text-content-primary">
      <div className="premium-container py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <TransitionLink to="/" className="inline-flex items-center gap-2 text-content-primary">
              <BrandWordmark textClassName="text-xl font-medium normal-case tracking-[-0.035em] text-content-primary" />
            </TransitionLink>
            <p className="mt-5 max-w-sm text-sm leading-6 text-content-tertiary">
              Oweable helps you see what is due, what is behind, and what to pay off next so your money stops running on guesswork.
            </p>
            <div className="mt-7 grid max-w-sm grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-surface-border-subtle bg-surface-raised/60 px-3 py-3">
                <p className="font-mono text-content-primary">14 days</p>
                <p className="mt-1 text-xs text-content-muted">Full Suite trial</p>
              </div>
              <div className="rounded-md border border-surface-border-subtle bg-surface-raised/60 px-3 py-3">
                <p className="font-mono text-content-primary">Read-only</p>
                <p className="mt-1 text-xs text-content-muted">Bank connection</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="premium-eyebrow mb-4">Platform</h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <TransitionLink 
                    to={link.href} 
                    className="text-sm text-content-tertiary transition-colors duration-200 hover:text-content-primary"
                  >
                    {link.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="premium-eyebrow mb-4">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <TransitionLink 
                    to={link.href} 
                    className="text-sm text-content-tertiary transition-colors duration-200 hover:text-content-primary"
                  >
                    {link.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="premium-eyebrow mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <TransitionLink 
                    to={link.href} 
                    className="text-sm text-content-tertiary transition-colors duration-200 hover:text-content-primary"
                  >
                    {link.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-surface-border-subtle pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-content-muted">
              Oweable Inc. NYC. © {new Date().getFullYear()} All rights reserved.
            </p>
            <p className="max-w-xl text-sm text-content-muted">
              Oweable is a financial organization tool, not legal or tax advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
