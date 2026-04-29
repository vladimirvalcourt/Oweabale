import React from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock3, LogOut, ShieldCheck } from 'lucide-react';
import { ThemeBackdrop } from './ThemeBackdrop';

interface SessionWarningModalProps {
  isOpen: boolean;
  timeLeftSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export default function SessionWarningModal({ isOpen, timeLeftSeconds, onExtend, onLogout }: SessionWarningModalProps) {
  const safeTimeLeft = Math.max(0, timeLeftSeconds);
  const minutes = Math.floor(safeTimeLeft / 60);
  const seconds = String(safeTimeLeft % 60).padStart(2, '0');
  const progress = Math.max(0, Math.min(100, (safeTimeLeft / 60) * 100));

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog 
          open={isOpen} 
          onClose={() => {}} // User must Explicitly choose
          className="relative z-[80]"
        >
          <ThemeBackdrop />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-[27rem]">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-elevated"
              >
              <div className="border-b border-surface-border bg-surface-base px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)]">
                      <Clock3 className="h-4 w-4 text-[var(--color-status-amber-text)]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <Dialog.Title className="text-sm font-semibold tracking-[-0.012em] text-content-primary">
                        Stay signed in?
                      </Dialog.Title>
                      <p className="mt-0.5 text-xs text-content-muted">
                        Your secure session is about to close.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border border-surface-border bg-surface-raised px-3 py-1.5 text-right">
                    <p className="font-mono text-lg font-semibold tabular-nums tracking-[-0.04em] text-[var(--color-status-amber-text)]">
                      {minutes}:{seconds}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-border">
                  <motion.div
                    className="h-full rounded-full bg-[var(--color-status-amber-text)]"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="px-5 py-5">
                <p className="max-w-[36ch] text-sm leading-6 text-content-secondary">
                  We pause inactive sessions to help protect your financial data. Extend the session to keep working, or sign out now.
                </p>

                <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <button
                    type="button"
                    onClick={onExtend}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px focus-app"
                  >
                    Extend session
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-base px-4 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content-primary focus-app"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                    Sign out
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-surface-border bg-surface-base px-5 py-3">
                <ShieldCheck className="h-4 w-4 text-content-tertiary" aria-hidden />
                <span className="text-xs font-medium text-content-tertiary">
                  Oweable keeps account sessions short on shared or idle devices.
                </span>
              </div>
              </motion.div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
