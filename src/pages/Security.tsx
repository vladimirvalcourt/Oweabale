import React, { useEffect, useState } from 'react';
import { Database, Key, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';
import { BrandWordmark } from '../components/BrandWordmark';
import { ThemeToggle } from '../components/ThemeToggle';
import { TransitionLink } from '../components/TransitionLink';
import { useSEO } from '../hooks/useSEO';
import { useStore } from '../store/useStore';

const securityCards = [
  {
    title: 'Encryption in transit and at rest',
    body: 'Sensitive data is protected with strong transport and storage encryption so core financial information is not moving around in plain text.',
    icon: Database,
  },
  {
    title: 'Controlled access',
    body: 'Access to internal systems is restricted and support workflows are meant to avoid casual browsing of private financial information.',
    icon: Key,
  },
  {
    title: 'Security operations mindset',
    body: 'Oweable is designed around secure defaults, active monitoring, and fast handling of serious issues when they appear.',
    icon: ShieldCheck,
  },
] as const;

const sections = [
  {
    title: 'How Oweable approaches security',
    copy:
      'The product is built for sensitive financial workflows, so security cannot be an afterthought. The current posture focuses on strong encryption, constrained access, and practical response processes.',
  },
  {
    title: 'Infrastructure and hosting',
    copy:
      'Core infrastructure is hosted with managed cloud services and monitored for abnormal activity. Operational controls are intended to reduce unauthorized access and improve visibility into platform health.',
  },
  {
    title: 'Vulnerability reporting',
    copy:
      'If you discover a security issue, email security@oweable.com with as much detail as you can safely share. Reports are reviewed and prioritized based on severity and user impact.',
  },
  {
    title: 'Data residency and compliance posture',
    copy:
      'Core product data is handled with U.S.-based infrastructure unless a different arrangement is explicitly required. Privacy and compliance requests are processed through the support and privacy channels.',
  },
] as const;

export default function Security() {
  const [scrolled, setScrolled] = useState(false);
  const user = useStore((state) => state.user);

  useSEO({
    title: 'Security — Oweable',
    description:
      'How Oweable protects financial data with encryption, controlled access, infrastructure safeguards, and vulnerability reporting.',
    canonical: 'https://www.oweable.com/security',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-surface-border bg-surface-base/80 backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <TransitionLink to="/" className="group flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-content-primary flex items-center justify-center transition-transform group-hover:rotate-12">
              <div className="h-3 w-3 bg-surface-base rounded-full" />
            </div>
            <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.1em] text-content-primary" />
          </TransitionLink>
          <div className="hidden items-center gap-10 text-[11px] font-medium uppercase tracking-[0.15em] text-content-tertiary md:flex">
            <a href="/pricing" className="transition-colors hover:text-content-primary">Plans</a>
            <a href="/faq" className="transition-colors hover:text-content-primary">FAQ</a>
            <a href="/support" className="transition-colors hover:text-content-primary">Support</a>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <TransitionLink
              to={user?.id ? '/dashboard' : '/onboarding'}
              className="group relative inline-flex items-center justify-center rounded-full bg-content-primary px-6 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-base transition-all duration-300 hover:scale-105"
            >
              <span className="relative z-10">{user?.id ? 'Dashboard' : 'Get Started'}</span>
            </TransitionLink>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-6xl">
          <section className="py-12">
            <div className="public-fade-up max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Security</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-content-primary sm:text-6xl">
                Security, explained without theater.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-content-secondary">
                Oweable handles sensitive financial workflows, so security has to be built into the product, the infrastructure, and the support process.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {securityCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="public-hover-lift flex flex-col items-start rounded-[12px] border border-surface-border bg-surface-raised p-8 shadow-sm">
                    <div className="flex h-12 w-12 items-start justify-start rounded-[8px] bg-surface-highlight text-brand-profit">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-6 text-xl font-semibold tracking-tight leading-tight text-content-primary">{card.title}</h2>
                    <p className="mt-4 text-base leading-relaxed text-content-secondary">{card.body}</p>
                  </article>
                );
              })}
            </div>

            <div className="public-fade-up public-delay-1 mt-12 rounded-[12px] border border-surface-border bg-surface-raised p-8 sm:p-10">
              <div className="space-y-10">
                {sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-2xl font-semibold tracking-tight text-content-primary">{section.title}</h2>
                    <p className="mt-4 max-w-4xl text-base leading-relaxed text-content-secondary">{section.copy}</p>
                  </section>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
