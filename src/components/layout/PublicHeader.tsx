import React, { useEffect, useState } from 'react';
import { BrandWordmark } from '../common/BrandWordmark';
import { TransitionLink } from '../common/TransitionLink';
import { useAuth } from '../../hooks';

function NavLink({
  href,
  children,
  isActive,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <TransitionLink
      to={href}
      className={`text-sm transition-colors ${
        isActive ? 'text-content-primary' : 'text-content-secondary/72 hover:text-content-primary'
      }`}
    >
      <span className="relative z-10">{children}</span>
    </TransitionLink>
  );
}

interface PublicHeaderProps {
  links?: Array<{ href: string; label: string; id?: string }>;
}

export default function PublicHeader({ links = [] }: PublicHeaderProps) {
  const [activeSection, setActiveSection] = useState('');
  const { user: authUser } = useAuth();
  const primaryHref = authUser?.id ? '/pro/dashboard' : '/auth?mode=signup';

  // Track active section for nav highlighting
  useEffect(() => {
    if (links.length === 0) return;

    const observers: IntersectionObserver[] = [];

    links.forEach((link) => {
      if (!link.id) return;
      const element = document.getElementById(link.id);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && link.id) {
            setActiveSection(link.id!);
          }
        },
        { threshold: 0.3, rootMargin: '-100px 0px -60% 0px' }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [links]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-surface-border-subtle bg-surface-base/88 backdrop-blur-xl">
      <div className="premium-container flex h-[72px] items-center justify-between">
        <TransitionLink to="/" className="group flex items-center gap-2 text-content-primary">
          <BrandWordmark
            logoClassName="h-5 w-5 rounded-[4px]"
            textClassName="text-xl font-medium normal-case tracking-[-0.035em] text-content-primary"
          />
        </TransitionLink>

        {links.length > 0 && (
          <div className="hidden items-center gap-6 rounded-md border border-surface-border-subtle bg-surface-raised/50 px-3 py-2 md:flex">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} isActive={activeSection === link.id}>
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <TransitionLink
            to="/auth"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-content-secondary/80 transition-colors hover:bg-surface-elevated hover:text-content-primary sm:inline-flex"
          >
            Log in
          </TransitionLink>
          <TransitionLink
            to={primaryHref}
            className="inline-flex h-10 items-center justify-center rounded-md bg-content-primary px-4 text-sm font-semibold text-surface-base transition-[background-color,transform] hover:bg-content-secondary active:translate-y-px"
          >
            <span className="relative z-10">{authUser?.id ? 'Open app' : 'Sign up'}</span>
          </TransitionLink>
        </div>
      </div>
    </nav>
  );
}
