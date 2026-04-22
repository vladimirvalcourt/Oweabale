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
    <footer className="border-t border-surface-border bg-surface-base text-content-primary">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr]">
          <div>
            <TransitionLink to="/" className="inline-flex text-content-primary">
              <BrandWordmark textClassName="brand-header-text" />
            </TransitionLink>
            <p className="mt-5 max-w-sm text-sm leading-7 text-content-secondary">
              Oweable helps you see what is due, what is behind, and what to pay off next so your money stops running on guesswork.
            </p>
            <div className="mt-6 inline-flex rounded-full border border-surface-border bg-surface-raised px-4 py-2 text-xs text-content-secondary">
              Browser-based finance command center for households, debt payoff, and variable income.
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Platform</h4>
            <ul className="mt-5 space-y-3 text-sm text-content-secondary">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-content-primary">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Company</h4>
            <ul className="mt-5 space-y-3 text-sm text-content-secondary">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <TransitionLink to={link.href} className="transition-colors hover:text-content-primary">
                    {link.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.18em] text-content-tertiary">Legal</h4>
            <ul className="mt-5 space-y-3 text-sm text-content-secondary">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <TransitionLink to={link.href} className="transition-colors hover:text-content-primary">
                    {link.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-surface-border pt-6 text-sm text-content-muted md:flex-row md:items-center md:justify-between">
          <p>Oweable Inc. NYC. © {new Date().getFullYear()} All rights reserved.</p>
          <p className="max-w-xl text-content-secondary">
            Oweable is a financial organization tool, not legal or tax advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
