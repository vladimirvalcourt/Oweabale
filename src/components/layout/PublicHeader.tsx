import React, { useEffect, useState } from 'react';
import { BrandWordmark } from '../common/BrandWordmark';
import { ThemeToggle } from '../common/ThemeToggle';
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
        isActive ? 'text-content-primary' : 'text-content-secondary hover:text-content-primary'
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
  const primaryHref = authUser?.id ? '/dashboard' : '/auth';

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
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-surface-border bg-surface-base/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <TransitionLink to="/" className="group flex items-center gap-2">
          <BrandWordmark textClassName="text-sm font-semibold uppercase text-content-primary" />
        </TransitionLink>

        {links.length > 0 && (
          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} isActive={activeSection === link.id}>
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <TransitionLink
            to={primaryHref}
            className="inline-flex h-10 items-center justify-center border border-surface-border px-4 text-sm font-medium text-content-primary transition-colors hover:bg-surface-highlight"
          >
            <span className="relative z-10">{authUser?.id ? 'Open app' : 'Start free'}</span>
          </TransitionLink>
        </div>
      </div>
    </nav>
  );
}
