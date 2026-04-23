import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { BrandWordmark } from './BrandWordmark';
import { ThemeToggle } from './ThemeToggle';
import { TransitionLink } from './TransitionLink';
import { useStore } from '../store/useStore';

// Interactive NavLink with cursor-following glow
function NavLink({
  href,
  children,
  isActive,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 28 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 28 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <a
      ref={ref}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative px-2 py-1 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
        isActive ? 'text-content-primary' : 'text-content-tertiary hover:text-content-primary'
      }`}
    >
      <motion.span
        className="absolute inset-0 rounded-md bg-content-primary/5"
        style={{
          opacity: useTransform(mouseXSpring, [-100, 0, 100], [0, 0.3, 0]),
          scale: useTransform(mouseXSpring, [-100, 0, 100], [0.8, 1, 0.8]),
        }}
      />
      <span className="relative z-10">{children}</span>
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute bottom-0 left-0 right-0 h-px bg-brand-profit"
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        />
      )}
    </a>
  );
}

interface PublicHeaderProps {
  links?: Array<{ href: string; label: string; id?: string }>;
}

export default function PublicHeader({ links = [] }: PublicHeaderProps) {
  const [activeSection, setActiveSection] = useState('');
  const user = useStore((state) => state.user);
  const primaryHref = user?.id ? '/dashboard' : '/onboarding';

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

  const springButton = {
    hover: { scale: 1.03, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
    tap: { scale: 0.97, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-surface-base/60 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <TransitionLink to="/" className="group flex items-center gap-2">
          <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.1em] text-content-primary" />
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
        
        <div className="flex items-center gap-3 sm:gap-6">
          <ThemeToggle />
          <motion.div variants={springButton} whileHover="hover" whileTap="tap">
            <TransitionLink
              to={primaryHref}
              className="inline-flex items-center justify-center rounded-full bg-content-primary px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-base transition-all duration-300 hover:scale-105 sm:px-6"
            >
              <span className="relative z-10">{user?.id ? 'Dashboard' : 'Get Started'}</span>
            </TransitionLink>
          </motion.div>
        </div>
      </div>
    </nav>
  );
}
