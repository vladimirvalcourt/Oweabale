import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { BrandWordmark } from './BrandWordmark';
import { TransitionLink } from './TransitionLink';
import { ThemeToggle } from './ThemeToggle';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const user = useStore((state) => state.user);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled ? 'border-surface-border bg-surface-base/92 backdrop-blur-xl' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <TransitionLink to="/" className="text-content-primary">
          <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[-0.02em] text-content-primary" />
        </TransitionLink>

        <div className="hidden items-center gap-8 text-sm text-content-secondary md:flex">
          <TransitionLink to="/#why" className="transition-colors hover:text-content-primary">
            Why it works
          </TransitionLink>
          <TransitionLink to="/pricing" className="transition-colors hover:text-content-primary">
            Pricing
          </TransitionLink>
          <TransitionLink to="/faq" className="transition-colors hover:text-content-primary">
            FAQ
          </TransitionLink>
          <TransitionLink to="/support" className="transition-colors hover:text-content-primary">
            Support
          </TransitionLink>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {user?.id && (
            <button
              onClick={() => {
                useStore.getState().signOut();
                toast.success('Session terminated');
              }}
              className="hidden rounded-full border border-surface-border px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:border-surface-border-subtle hover:text-content-primary sm:block"
            >
              Sign out
            </button>
          )}
          <TransitionLink
            to={user?.id ? '/dashboard' : '/onboarding'}
            className="inline-flex items-center gap-2 rounded-full bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-cta-hover"
          >
            {user?.id ? 'Open dashboard' : 'Start free'}
          </TransitionLink>
        </div>
      </div>
    </nav>
  );
}
