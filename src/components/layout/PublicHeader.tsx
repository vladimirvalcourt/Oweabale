import React, { useEffect, useState } from 'react';
import { BrandWordmark } from '@/components/common/BrandWordmark';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { TransitionLink } from '@/components/common/TransitionLink';
import { useAuth } from '@/hooks';

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
      className={`ui-button ui-button-sm ${
        isActive ? 'ui-button-secondary text-content-primary' : 'ui-button-ghost'
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
    <nav className="fixed inset-x-0 top-0 z-50 bg-surface-base/72 backdrop-blur-xl">
      <div className="premium-container flex h-[76px] items-center justify-between">
        <TransitionLink to="/" className="group flex items-center gap-2 text-content-primary">
          <BrandWordmark
            logoClassName="h-5 w-5 rounded"
            textClassName="text-xl font-medium normal-case tracking-[-0.035em] text-content-primary"
          />
        </TransitionLink>

        {links.length > 0 && (
          <div className="hidden items-center gap-1 rounded-lg border border-surface-border-subtle bg-surface-raised/76 p-1 shadow-card md:flex">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} isActive={activeSection === link.id}>
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <TransitionLink
            to="/auth"
            className="ui-button ui-button-sm ui-button-ghost hidden sm:inline-flex"
          >
            Log in
          </TransitionLink>
          <TransitionLink
            to={primaryHref}
            className="ui-button ui-button-md ui-button-primary"
          >
            <span className="relative z-10">{authUser?.id ? 'Open app' : 'Sign up'}</span>
          </TransitionLink>
        </div>
      </div>
    </nav>
  );
}
