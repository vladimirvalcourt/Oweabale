/**
 * ProWelcomeModal
 *
 * Shown exactly once the first time a user lands on /pro/dashboard
 * after upgrading from Free to Pro (or on first-ever Pro login).
 *
 * Keyed on localStorage so it survives page refreshes but only fires once.
 * Dismissed by clicking "Let's go →" or clicking outside.
 */
import { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Zap, BarChart2, DollarSign, Target, Shield, X } from 'lucide-react';
import { TransitionLink } from './TransitionLink';
import { ThemeBackdrop } from './ThemeBackdrop';

const STORAGE_KEY = 'oweable_pro_welcome_shown_v1';

const HIGHLIGHTS = [
  { icon: BarChart2,    label: 'Analytics & Reports',      desc: 'Cash flow trends, spending patterns, monthly reports.' },
  { icon: DollarSign,  label: 'Income & Freelance tracker',desc: 'Log all income sources, invoices, and gig payments.' },
  { icon: Target,      label: 'Debt Payoff Engine',        desc: 'Avalanche and Snowball calculators with live progress.' },
  { icon: Shield,      label: 'Tax Shield',                desc: 'Deduction tracking, freelance tax estimates, exports.' },
  { icon: Zap,         label: '15+ more tools',            desc: 'Net worth, budgets, investments, goals, and more.' },
] as const;

export function ProWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
      }
    } catch (err) {
      // localStorage unavailable (private browsing etc.) — silently skip
      console.warn('[ProWelcomeModal] localStorage unavailable:', err);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (err) { console.warn('[ProWelcomeModal] Could not persist dismissal:', err); }
    setIsOpen(false);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={dismiss} className="relative z-[80]">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ThemeBackdrop />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transition-all duration-300 ease-out"
            enterFrom="opacity-0 scale-[0.96] translate-y-2"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transition-all duration-200 ease-in"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-[0.96] translate-y-2"
          >
            <Dialog.Panel className="relative mx-auto w-full max-w-lg rounded-2xl border border-surface-border bg-surface-raised shadow-elevated overflow-hidden">
              {/* Dismiss button */}
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border bg-surface-base/60 text-content-tertiary transition-colors hover:text-content-primary focus-app"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="bg-gradient-to-br from-brand-cta/20 via-surface-raised to-surface-raised px-6 pb-5 pt-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-cta/30 bg-brand-cta/10">
                  <Zap className="h-7 w-7 text-brand-cta" aria-hidden />
                </div>
                <Dialog.Title className="text-xl font-semibold tracking-tight text-content-primary">
                  Welcome to Full Suite
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-content-secondary">
                  You've unlocked the complete Oweable toolkit. Here's what's now available:
                </Dialog.Description>
              </div>

              {/* Feature list */}
              <div className="divide-y divide-surface-border border-t border-surface-border">
                {HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-4 px-6 py-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-base">
                      <Icon className="h-4 w-4 text-brand-cta" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">{label}</p>
                      <p className="mt-0.5 text-xs text-content-secondary">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer CTA */}
              <div className="flex flex-col gap-3 border-t border-surface-border px-6 py-5">
                <TransitionLink
                  to="/pro/dashboard"
                  onClick={dismiss}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-semibold text-surface-base transition-colors hover:bg-brand-cta-hover focus-app"
                >
                  Let's go →
                </TransitionLink>
                <p className="text-center text-xs text-content-muted">
                  You can always manage your plan in{' '}
                  <TransitionLink to="/pro/settings?tab=billing" onClick={dismiss} className="underline hover:text-content-secondary">
                    Settings → Billing
                  </TransitionLink>
                </p>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
