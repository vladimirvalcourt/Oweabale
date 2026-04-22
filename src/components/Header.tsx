import React, { useState, useEffect } from 'react';
import { TransitionLink } from './TransitionLink';
import { BrandWordmark } from './BrandWordmark';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const user = useStore((state) => state.user);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 border-b py-4 transition-colors duration-300 ${scrolled ? 'bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 border-surface-border' : 'bg-transparent border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <TransitionLink to="/" className="text-content-primary transition-colors duration-200">
          <BrandWordmark textClassName="brand-header-text" />
        </TransitionLink>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-content-tertiary">
          <TransitionLink to="/#features" className="hover:text-content-secondary transition-colors duration-200 text-content-primary">Features</TransitionLink>
          <TransitionLink to="/pricing" className="text-content-primary transition-colors duration-200">Pricing</TransitionLink>
          <TransitionLink to="/auth" className="hover:text-content-secondary transition-colors duration-200 text-content-primary">Sign In</TransitionLink>
        </div>
        <div className="flex items-center gap-3">
          {user?.id && (
            <button 
              onClick={() => {
                useStore.getState().signOut();
                toast.success('Session Terminated');
              }}
              className="hidden sm:block px-6 py-2 bg-transparent border border-surface-border text-content-secondary hover:text-content-primary hover:bg-content-primary/[0.04] text-sm font-sans font-medium transition-colors rounded-lg"
            >
              Sign Out
            </button>
          )}
          <TransitionLink 
            to={user?.id ? "/dashboard" : "/onboarding"} 
            className="px-6 py-2 rounded-lg bg-brand-cta text-surface-base hover:bg-brand-cta-hover text-sm font-sans font-medium shadow-none transition-colors"
          >
            {user?.id ? "Open dashboard" : "Start Free"}
          </TransitionLink>
        </div>
      </div>
    </nav>
  );
}
