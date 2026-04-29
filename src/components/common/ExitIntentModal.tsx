import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ThemeBackdrop } from './ThemeBackdrop';
import { trackEvent } from '../../hooks/usePostHog';

interface ExitIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Exit Intent Modal
 * Captures emails when users are about to leave
 */
export default function ExitIntentModal({ isOpen, onClose }: ExitIntentModalProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    trackEvent('exit_intent_email_captured', { email });
    setSubmitted(true);
    
    // Send to your email service (Resend, etc.)
    // For now, just track it
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <ThemeBackdrop onClick={onClose} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="premium-panel relative z-50 w-full max-w-md p-8 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-content-tertiary transition-colors hover:bg-surface-raised hover:text-content-primary"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {!submitted ? (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl font-medium tracking-tight text-content-primary">
                    Wait! Don't lose your financial clarity
                  </h3>
                  <p className="mt-2 text-sm text-content-tertiary">
                    Get a free Pay List template sent to your inbox. No signup required.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="focus-app-field w-full rounded-md border border-surface-border bg-surface-raised px-4 py-3 text-sm text-content-primary placeholder:text-content-tertiary"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-content-primary px-4 py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-content-secondary"
                  >
                    Send me the template
                  </button>
                  <p className="text-center text-xs text-content-tertiary">
                    We respect your privacy. Unsubscribe anytime.
                  </p>
                </form>
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--color-status-emerald-bg)]">
                  <svg className="h-8 w-8 text-brand-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-content-primary">Check your inbox!</h3>
                <p className="mt-2 text-sm text-content-tertiary">
                  Your Pay List template is on its way.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
