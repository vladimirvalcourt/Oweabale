import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Vault, Receipt, Activity, Flame, Wallet, Clock, Landmark, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { yieldForPaint } from '../lib/utils';
import { BrandWordmark } from '../components/common';

type Step = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
};

const STEPS: Step[] = [
  {
    id: 'assets',
    title: 'Your cash & bank',
    subtitle: 'Checking, savings, and cash on hand',
    description: 'Tell us how much you have available right now.',
  },
  {
    id: 'obligations',
    title: 'Monthly bills',
    subtitle: 'Rent, utilities, and fixed costs',
    description: 'Rough total of regular monthly expenses.',
  },
  {
    id: 'velocity',
    title: 'Daily spending comfort',
    subtitle: 'Optional daily target',
    description: 'We turn this into a monthly “Flexible spending” budget you can edit anytime.',
  },
  {
    id: 'strategy',
    title: 'What needs attention first?',
    subtitle: 'Pick the kind of relief you want first',
    description: 'We use this to tune the dashboard toward reminders or debt payoff. You can change it later.',
  },
];

function SubtleGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          'linear-gradient(var(--color-content-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-content-primary) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
      aria-hidden
    />
  );
}

type ChoiceCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  accent?: 'neutral' | 'rose';
  className?: string;
};

function ChoiceCard({ selected, onSelect, title, description, accent = 'neutral', className }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'relative flex min-h-[7.5rem] flex-col rounded-[10px] border p-5 text-left transition-colors focus-app sm:min-h-[8.25rem]',
        selected
          ? accent === 'rose'
            ? 'border-rose-500/50 bg-surface-elevated ring-2 ring-rose-500/30'
            : 'border-brand-violet/50 bg-surface-elevated ring-2 ring-brand-violet/25'
          : 'border-surface-border bg-surface-base hover:border-content-primary/15 hover:bg-surface-raised/80',
        className,
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-content-primary">{title}</span>
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
            selected ? 'border-content-primary/40 bg-content-primary/10 text-content-primary' : 'border-surface-border bg-transparent text-transparent',
          )}
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      </span>
      <p className="mt-3 text-xs leading-relaxed text-content-secondary">{description}</p>
    </button>
  );
}

export default function Onboarding() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cash: '',
    bills: '',
    dailyLimit: '',
    focus: 'bills',
  });

  const navigate = useNavigate();
  const { addAsset, addBudget, updateUser, addNotification, user } = useStore();
  const postSetupHref = '/pro/dashboard';
  const currentStep = STEPS[currentStepIndex];

  const persistOnboardingData = async (): Promise<boolean> => {
    const assetPromises: Promise<boolean>[] = [];
    if (formData.cash && parseFloat(formData.cash) > 0) {
      assetPromises.push(addAsset({ name: 'Primary Checking', value: parseFloat(formData.cash), type: 'Cash' }));
    }
    if (formData.bills && parseFloat(formData.bills) > 0) {
      assetPromises.push(addBudget({ category: 'General', amount: parseFloat(formData.bills), period: 'Monthly' }));
    }
    if (formData.dailyLimit && parseFloat(formData.dailyLimit) > 0) {
      const daily = parseFloat(formData.dailyLimit);
      assetPromises.push(
        addBudget({
          category: 'Flexible spending',
          amount: Math.round(daily * 30 * 100) / 100,
          period: 'Monthly',
        }),
      );
    }
    await Promise.all(assetPromises);
    const saved = await updateUser({
      theme: formData.focus === 'detonation' ? 'Detonation' : 'Dark',
      hasCompletedOnboarding: true,
    });
    if (!saved) return false;
    addNotification({
      title: 'Household dashboard ready',
      message:
        formData.focus === 'detonation'
          ? 'Debt payoff focus is on. Oweable will keep the payoff path closer to the surface.'
          : 'Bills-first focus is on. Oweable will keep due dates and cash comfort close at hand.',
      type: 'info',
    });
    return true;
  };

  const handleNext = async () => {
    if (isSubmitting) return;
    if (currentStepIndex < STEPS.length - 1) {
      setDirection(1);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsSubmitting(true);
      await yieldForPaint();
      const ok = await persistOnboardingData();
      if (!ok) {
        setIsSubmitting(false);
        return;
      }
      toast.success('Setup complete. Welcome to Oweable.');
      startTransition(() => navigate(postSetupHref));
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? 12 : -12,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (d: number) => ({
      zIndex: 0,
      x: d < 0 ? 12 : -12,
      opacity: 0,
    }),
  };

  const firstName = user.firstName || 'there';
  const progress = (currentStepIndex + 1) / STEPS.length;

  const skipSetup = async () => {
    const ok = await updateUser({ hasCompletedOnboarding: true });
    if (!ok) return;
    toast.success('Setup skipped.');
    startTransition(() => navigate(postSetupHref));
  };

  if (showWelcome) {
    return (
      <>
        <div className="fixed inset-0 flex flex-col bg-surface-base font-sans text-content-primary selection:bg-brand-violet/25">
          <SubtleGrid />

          <header className="relative z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-surface-border-subtle bg-surface-base/90 px-5 backdrop-blur-xl sm:px-8">
            <BrandWordmark
              textClassName="text-xl font-medium normal-case tracking-[-0.035em] text-content-primary"
              logoClassName="h-5 w-5 rounded-[4px]"
            />
            <button
              type="button"
              onClick={() => void skipSetup()}
              className="min-h-10 rounded-md border border-surface-border px-4 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-raised hover:text-content-primary focus-app"
            >
              Skip setup
            </button>
          </header>

          <main className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-4 py-10 sm:px-6 sm:py-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.19, 1, 0.22, 1] }}
              className="w-full max-w-lg"
            >
              <p className="mb-4 text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-content-muted">
                Quick setup · ~2 min
              </p>

              <h1 className="mb-3 text-balance text-5xl font-medium leading-none tracking-[-0.055em] text-content-primary sm:text-6xl">
                Welcome, {firstName}
              </h1>
              <p className="mb-8 max-w-md text-pretty text-sm leading-6 text-content-tertiary">
                We’ll set up the basics: what cash is available, what bills are coming, and how much daily spending feels safe. Everything is optional — skip anytime or refine later.
              </p>

              <div className="mb-10 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Wallet, label: 'Cash available', desc: 'Start with what you can actually use.' },
                  { icon: Receipt, label: 'Bills & debt', desc: 'Keep due dates and minimums visible.' },
                  { icon: Clock, label: 'Spending comfort', desc: 'Set a simple daily number you can live with.' },
                  { icon: Landmark, label: 'Debt focus', desc: 'Choose whether payoff needs priority now.' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex gap-3 rounded-[10px] border border-surface-border-subtle bg-white/[0.022] p-4 transition-colors hover:border-content-primary/10"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-surface-border bg-surface-elevated">
                      <Icon className="h-4 w-4 text-content-secondary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-content-primary">{label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-content-tertiary">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[10px] border border-surface-border bg-white/[0.018] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-8">
                <div className="mb-6 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  <p className="text-xs text-content-tertiary">Encrypted session · you control your data</p>
                </div>
                <p className="mb-6 text-sm text-content-secondary">
                  <span className="font-medium text-content-primary">Four short steps.</span> Leave fields blank and tap continue, or use Skip setup.
                </p>
                <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-surface-border">
                  <div
                    className="h-full rounded-full bg-content-primary/90"
                    style={{ width: `${(1 / STEPS.length) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowWelcome(false)}
                  className="btn-tactile flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-content-primary px-6 text-sm font-medium text-surface-base transition-colors hover:bg-content-secondary focus-app sm:w-auto"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </motion.div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 flex flex-col bg-surface-base font-sans text-content-primary selection:bg-brand-violet/25">
        <SubtleGrid />

        <header className="relative z-20 flex h-[72px] shrink-0 items-center gap-3 border-b border-surface-border-subtle bg-surface-base/90 px-5 backdrop-blur-xl sm:gap-4 sm:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <span className="shrink-0 text-sm font-medium tracking-tight text-content-primary">Getting started</span>
            <div
              className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-surface-border sm:max-w-[280px]"
              role="progressbar"
              aria-valuenow={currentStepIndex + 1}
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-label={`Step ${currentStepIndex + 1} of ${STEPS.length}`}
            >
              <div
                className="h-full rounded-full bg-content-primary transition-[width] duration-300 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-xs tabular-nums text-content-tertiary sm:inline">
              {currentStepIndex + 1} / {STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => void skipSetup()}
              className="min-h-10 whitespace-nowrap rounded-md border border-surface-border px-3 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-raised hover:text-content-primary focus-app sm:px-4"
            >
              Skip
            </button>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
            {/* Carbon-inspired Progress Stepper */}
            <div className="mb-8 flex items-center justify-between" aria-label="Onboarding progress">
              {STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="relative flex flex-col items-center">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: currentStepIndex === index ? 1.1 : 1,
                        backgroundColor: currentStepIndex > index ? 'var(--color-brand-profit)' : currentStepIndex === index ? 'var(--color-content-primary)' : 'var(--color-surface-border)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors ${
                        currentStepIndex > index
                          ? 'border-brand-violet bg-brand-violet text-white'
                          : currentStepIndex === index
                            ? 'border-content-primary bg-content-primary text-surface-base'
                            : 'border-surface-border bg-surface-base text-content-muted'
                      }`}
                    >
                      {currentStepIndex > index ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                    </motion.div>
                    {index < STEPS.length - 1 && (
                      <div className="absolute left-8 top-4 h-0.5 w-[calc(100vw/4-2rem)] sm:w-[calc(100%/4-2rem)]">
                        <motion.div
                          initial={false}
                          animate={{
                            backgroundColor: currentStepIndex > index ? 'var(--color-brand-profit)' : 'var(--color-surface-border)',
                          }}
                          transition={{ duration: 0.3 }}
                          className="h-full"
                        />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
                className="flex flex-1 flex-col"
                role="group"
                aria-labelledby="onboarding-step-title"
              >
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[10px] border border-surface-border bg-surface-raised">
                  {currentStepIndex === 0 && <Vault className="h-5 w-5 text-content-secondary" aria-hidden />}
                  {currentStepIndex === 1 && <Receipt className="h-5 w-5 text-content-secondary" aria-hidden />}
                  {currentStepIndex === 2 && <Activity className="h-5 w-5 text-content-secondary" aria-hidden />}
                  {currentStepIndex === 3 && <Flame className="h-5 w-5 text-content-secondary" aria-hidden />}
                </div>

                <h1 id="onboarding-step-title" className="mb-2 text-balance text-3xl font-medium tracking-[-0.04em] text-content-primary sm:text-4xl">
                  {currentStep.title}
                </h1>
                <p className="mb-1 text-sm font-medium text-content-secondary">{currentStep.subtitle}</p>
                <p className="mb-6 text-xs leading-relaxed text-content-tertiary sm:text-sm sm:text-content-tertiary">
                  {currentStep.description}
                  {currentStepIndex <= 2 ? (
                    <span className="mt-2 block text-content-tertiary">Optional — leave blank and continue.</span>
                  ) : null}
                </p>

                <div className="rounded-[10px] border border-surface-border bg-white/[0.018] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-8">
                  {currentStep.id === 'assets' && (
                    <div className="space-y-3">
                      <label className="sr-only" htmlFor="onboard-cash">
                        Cash and bank balance
                      </label>
                      <div className="flex items-end border-b border-surface-border pb-1 transition-colors focus-within:border-content-primary/25">
                        <span className="select-none pb-2 pr-1 font-sans text-3xl leading-none text-content-tertiary sm:text-5xl">$</span>
                        <input
                          id="onboard-cash"
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formData.cash}
                          onChange={(e) => setFormData({ ...formData, cash: e.target.value })}
                          className="focus-app-field w-full bg-transparent py-2 font-mono text-3xl text-content-primary placeholder:text-content-muted tnum leading-none focus:outline-none sm:text-5xl sm:py-3"
                        />
                      </div>
                      <p className="text-xs text-content-tertiary">Liquid balances only (checking, savings, cash).</p>
                    </div>
                  )}

                  {currentStep.id === 'obligations' && (
                    <div className="space-y-3">
                      <label className="sr-only" htmlFor="onboard-bills">
                        Monthly bills total
                      </label>
                      <div className="flex items-end border-b border-surface-border pb-1 transition-colors focus-within:border-content-primary/25">
                        <span className="select-none pb-2 pr-1 font-sans text-3xl leading-none text-content-tertiary sm:text-5xl">$</span>
                        <input
                          id="onboard-bills"
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formData.bills}
                          onChange={(e) => setFormData({ ...formData, bills: e.target.value })}
                          className="focus-app-field w-full bg-transparent py-2 font-mono text-3xl text-content-primary placeholder:text-content-muted tnum leading-none focus:outline-none sm:text-5xl sm:py-3"
                        />
                      </div>
                      <p className="text-xs text-content-tertiary">Rent, utilities, subscriptions, loan minimums — one monthly total is fine.</p>
                    </div>
                  )}

                  {currentStep.id === 'velocity' && (
                    <div className="space-y-5">
                      <label className="sr-only" htmlFor="onboard-daily">
                        Daily spending target
                      </label>
                      <div className="flex items-end border-b border-surface-border pb-1 transition-colors focus-within:border-content-primary/25">
                        <span className="select-none pb-2 pr-1 font-sans text-3xl leading-none text-content-tertiary sm:text-5xl">$</span>
                        <input
                          id="onboard-daily"
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formData.dailyLimit}
                          onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value })}
                          className="focus-app-field w-full bg-transparent py-2 font-mono text-3xl text-content-primary placeholder:text-content-muted tnum leading-none focus:outline-none sm:text-5xl sm:py-3"
                        />
                      </div>
                      <div className="rounded-lg border border-surface-border bg-surface-base/80 p-4">
                        <p className="text-xs font-medium text-amber-400/95">How we use this</p>
                        <p className="mt-2 text-xs leading-relaxed text-content-secondary">
                          We add a monthly <span className="text-content-primary">Flexible spending</span> budget (~30× this number). Adjust it anytime as real spending shows up.
                        </p>
                      </div>
                    </div>
                  )}

                  {currentStep.id === 'strategy' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ChoiceCard
                        selected={formData.focus === 'bills'}
                        onSelect={() => setFormData({ ...formData, focus: 'bills' })}
                        title="Stay ahead of bills"
                        description="Prioritize due dates, subscriptions, and cash comfort."
                        accent="neutral"
                      />
                      <ChoiceCard
                        selected={formData.focus === 'detonation'}
                        onSelect={() => setFormData({ ...formData, focus: 'detonation' })}
                        title="Pay down debt"
                        description="Prioritize balances, minimums, and payoff order."
                        accent="rose"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto flex shrink-0 items-center justify-between gap-4 border-t border-surface-border pt-6">
              {currentStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="min-h-11 text-sm font-medium text-content-secondary transition-colors hover:text-content-primary focus-app rounded-md px-2 -ml-2"
                >
                  Back
                </button>
              ) : (
                <span className="min-h-11 w-16 sm:w-20" aria-hidden />
              )}

              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={isSubmitting}
                className="btn-tactile relative flex min-h-11 items-center gap-2 overflow-hidden rounded-md bg-content-primary px-6 text-sm font-medium text-surface-base transition-all duration-200 hover:bg-content-secondary focus-app disabled:cursor-not-allowed disabled:opacity-70"
              >
                <AnimatePresence mode="wait">
                  {isSubmitting ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </motion.span>
                  ) : (
                    <motion.span
                      key="text"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
                    >
                      {currentStepIndex === STEPS.length - 1 ? 'Go to dashboard' : 'Continue'}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
