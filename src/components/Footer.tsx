import { BrandWordmark } from './BrandWordmark';
import { TransitionLink } from './TransitionLink';

const platformLinks = [
  { label: 'Features', href: '/#why' },
  { label: 'How it works', href: '/#flow' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

const companyLinks = [
  { label: 'Support', href: '/support' },
  { label: 'Security', href: '/security' },
  { label: 'Sign in', href: '/dashboard' },
];

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-base">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {/* Main Grid - 5 Columns */}
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-8">
          {/* Brand Column - Spans 2 columns */}
          <div className="lg:col-span-2">
            <TransitionLink to="/" className="inline-flex items-center gap-2 text-content-primary">
              <div className="h-6 w-6 rounded-sm bg-content-primary flex items-center justify-center transition-transform hover:rotate-12">
                <div className="h-3 w-3 bg-surface-base rounded-full" />
              </div>
              <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.1em]" />
            </TransitionLink>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-content-secondary/60">
              Oweable helps you see what is due, what is behind, and what to pay off next so your money stops running on guesswork.
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-content-secondary/60">
              Browser-based finance command center for households, debt payoff, and variable income.
            </p>
          </div>

          {/* Platform Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-content-primary mb-4">Platform</h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-sm text-content-secondary/60 transition-colors duration-200 hover:text-content-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-content-primary mb-4">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <TransitionLink 
                    to={link.href} 
                    className="text-sm text-content-secondary/60 transition-colors duration-200 hover:text-content-primary"
                  >
                    {link.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-content-primary mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <TransitionLink 
                    to={link.href} 
                    className="text-sm text-content-secondary/60 transition-colors duration-200 hover:text-content-primary"
                  >
                    {link.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-surface-border">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-content-secondary/60">
              Oweable Inc. NYC. © {new Date().getFullYear()} All rights reserved.
            </p>
            <p className="text-sm text-content-secondary/60 max-w-xl">
              Oweable is a financial organization tool, not legal or tax advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
