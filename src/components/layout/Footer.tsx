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
    <footer className="border-t border-surface-border-subtle bg-surface-base text-content-primary">
      <div className="premium-container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <TransitionLink to="/" className="inline-flex items-center gap-2 text-content-primary">
              <BrandWordmark textClassName="text-sm font-medium uppercase text-content-primary" />
            </TransitionLink>
            <p className="mt-5 max-w-sm text-sm leading-6 text-content-tertiary">
              Oweable helps you see what is due, what is behind, and what to pay off next so your money stops running on guesswork.
            </p>
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
