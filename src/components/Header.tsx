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
        scrolled ? 'border-[#d7cebf] bg-[#f6efe4]/92 backdrop-blur-xl' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <TransitionLink to="/" className="text-[#1f2b24]">
          <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[-0.02em] text-[#1f2b24]" />
        </TransitionLink>

        <div className="hidden items-center gap-8 text-sm text-[#5e695f] md:flex">
          <TransitionLink to="/#why" className="transition-colors hover:text-[#1f2b24]">
            Why it works
          </TransitionLink>
          <TransitionLink to="/pricing" className="transition-colors hover:text-[#1f2b24]">
            Pricing
          </TransitionLink>
          <TransitionLink to="/faq" className="transition-colors hover:text-[#1f2b24]">
            FAQ
          </TransitionLink>
          <TransitionLink to="/support" className="transition-colors hover:text-[#1f2b24]">
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
              className="hidden rounded-full border border-[#cfc5b2] px-4 py-2 text-sm font-medium text-[#4f5c53] transition-colors hover:border-[#bcae94] hover:text-[#1f2b24] sm:block"
            >
              Sign out
            </button>
          )}
          <TransitionLink
            to={user?.id ? '/dashboard' : '/onboarding'}
            className="inline-flex items-center gap-2 rounded-full bg-[#1f2b24] px-5 py-2.5 text-sm font-medium text-[#f7f2ea] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2d3a32]"
          >
            {user?.id ? 'Open dashboard' : 'Start free'}
          </TransitionLink>
        </div>
      </div>
    </nav>
  );
}
