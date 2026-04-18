import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Shield, Vault, Receipt, Activity, Flame, Wallet, TrendingUp, FileSearch, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { PrivacyScreenWhenHidden } from '../components/PrivacyScreenWhenHidden';

type Step = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
};

const STEPS: Step[] = [
  {
    id: 'assets',
    title: 'Your Cash & Bank',
    subtitle: 'Checking, Savings, and Petty Cash',
    description: 'Tell us how much money you have available right now.'
  },
  {
    id: 'obligations',
    title: 'Monthly Bills',
    subtitle: 'Rent, Utilities, and Fixed Costs',
    description: 'We need to know your regular monthly expenses.'
  },
  {
    id: 'velocity',
    title: 'Spending Limit',
    subtitle: 'Daily Spending Target',
    description: 'Optional rough cap — we turn it into a monthly budget line you can edit anytime.'
  },
  {
    id: 'strategy',
    title: 'Your Main Goal',
    subtitle: 'What are we working on first?',
    description: 'Choose whether you want to save more or pay off debt faster.'
  },
  {
    id: 'freelance',
    title: 'Gig Work Mode',
    subtitle: 'Are you a freelancer?',
    description: 'Enable high-precision tax shielding and statement scanning.'
  }
];

export default function Onboarding() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [formData, setFormData] = useState({
    cash: '',
    bills: '',
    dailyLimit: '',
    focus: 'stacking',
    freelance: null as boolean | null
  });

  const navigate = useNavigate();
  const { addAsset, addBudget, updateUser, addNotification, user } = useStore();
  const currentStep = STEPS[currentStepIndex];

  const persistOnboardingData = async (): Promise<boolean> => {
    // Step 1 — cash becomes a "Checking Account" asset
    const assetPromises: Promise<boolean>[] = [];
    if (formData.cash && parseFloat(formData.cash) > 0) {
      assetPromises.push(addAsset({ name: 'Primary Checking', value: parseFloat(formData.cash), type: 'Cash' }));
    }
    // Step 2 — monthly bills total becomes a General budget ceiling
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
        })
      );
    }
    await Promise.all(assetPromises);
    const freelanceOn = formData.freelance === true;
    // Step 3/4/5 — strategy stored on profile; must finish before navigation or the next load will re-show onboarding.
    const saved = await updateUser({
      theme: formData.focus === 'detonation' ? 'Detonation' : 'Dark',
      hasCompletedOnboarding: true,
    });
    if (!saved) return false;
    // freelance === true only for contractors; null/false → standard household messaging
    addNotification({
      title: freelanceOn ? 'Independent Contractor Mode Active' : 'Standard Mode Active',
      message: formData.focus === 'detonation'
        ? 'Debt Detonation strategy selected. Highest APR targets prioritized.'
        : 'Wealth Stacking strategy selected. Growth trajectory enabled.',
      type: 'info',
    });
    return true;
  };

  const handleNext = async () => {
    if (currentStepIndex < STEPS.length - 1) {
      setDirection(1);
      setCurrentStepIndex(prev => prev + 1);
    } else {
      const ok = await persistOnboardingData();
      if (!ok) return;
      toast.success('Setup complete. Welcome to Oweable.');
      startTransition(() => navigate('/dashboard'));
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 10 : -10,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 10 : -10,
      opacity: 0,
    })
  };

  const firstName = user.firstName || 'there';

  if (showWelcome) {
    return (
      <>
      <PrivacyScreenWhenHidden />
      <div className="fixed inset-0 bg-[#08090A] flex flex-col items-center justify-center p-6 overflow-hidden selection:bg-white/10 font-sans">
        {/* Background HUD Grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
          <div className="absolute top-0 left-0 w-full h-[1px] bg-surface-border opacity-20" />
          <div className="absolute top-0 left-0 w-[1px] h-full bg-surface-border opacity-20" />
          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-surface-border opacity-20" />
          <div className="absolute bottom-0 right-0 w-[1px] h-full bg-surface-border opacity-20" />
        </div>

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 z-20 flex h-12 items-center justify-between border-b border-surface-border bg-surface-base/90 px-6">
          <div className="text-sm font-medium tracking-tight text-content-primary">Oweable</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={async () => {
                const ok = await updateUser({ hasCompletedOnboarding: true });
                if (!ok) return;
                toast.success('Setup skipped.');
                startTransition(() => navigate('/dashboard'));
              }}
              className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content-primary"
            >
              Skip setup
            </button>
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Welcome content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
          className="w-full max-w-xl relative z-10"
        >
          {/* Status badge */}
          <div className="mb-8 flex items-center gap-2">
            <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-zinc-400">Secure connection</span>
          </div>

          {/* Headline */}
          <h1 className="mb-2 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Welcome,
            <br />
            <span className="text-zinc-200">{firstName}.</span>
          </h1>
          <p className="mb-4 max-w-md text-sm font-medium leading-relaxed text-zinc-400">
            In a couple of minutes you will have a working dashboard: cash, bills, and a default strategy. Everything you enter here is optional — add or edit the rest anytime.
          </p>
          <p className="mb-10 text-sm font-medium text-zinc-500">
            Your financial command center is ready to be configured.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            {[
              { icon: Wallet,     label: 'Cash & Assets',    desc: 'Track net worth in real time' },
              { icon: Receipt,    label: 'Bills & Debts',     desc: 'Never miss a payment again' },
              { icon: FileSearch, label: 'Document Scanning', desc: 'OCR receipts and statements' },
              { icon: Target,     label: 'Goals & Budgets',   desc: 'Build wealth systematically' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="group flex items-start gap-3 rounded-lg border border-surface-border bg-surface-raised p-4">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-surface-border bg-surface-elevated">
                  <Icon className="h-3.5 w-3.5 text-content-primary" />
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-medium text-content-primary">{label}</p>
                  <p className="text-[11px] leading-relaxed text-content-secondary">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Setup info + CTA */}
          <div className="relative rounded-lg border border-surface-border bg-surface-raised p-6">
            <div className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-white/25" />
            <div className="absolute right-0 top-0 h-1.5 w-1.5 border-r border-t border-white/25" />
            <p className="mb-5 text-xs font-medium leading-relaxed text-content-secondary">
              <span className="text-content-primary">Five short steps</span>
              {' '}· about two minutes · leave fields blank and continue, or use{' '}
              <span className="text-content-primary">Skip setup</span> anytime.
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-2 items-end gap-1">
                {STEPS.map((_, idx) => (
                  <div key={idx} className="h-full w-3 bg-surface-border" />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="btn-tactile flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Decorative Corner Label */}
        <div className="fixed bottom-6 right-6 opacity-20 flex flex-col items-end">
          <div className="font-mono text-[8px] uppercase tracking-[0.5em] mb-1">Oweable Collective</div>
          <div className="w-12 h-[1px] bg-white" />
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    <PrivacyScreenWhenHidden />
    <div className="fixed inset-0 bg-[#08090A] flex flex-col items-center justify-center p-6 overflow-hidden selection:bg-white/10 font-sans">
      {/* Background HUD Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-surface-border opacity-20"></div>
        <div className="absolute top-0 left-0 w-[1px] h-full bg-surface-border opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-full h-[1px] bg-surface-border opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-[1px] h-full bg-surface-border opacity-20"></div>
      </div>

      {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-20 flex h-12 items-center justify-between gap-2 border-b border-surface-border bg-surface-base/90 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <div className="shrink-0 text-sm font-medium tracking-tight text-content-primary">Getting started</div>
          <div className="shrink-0 text-xs font-medium text-content-tertiary md:hidden">
            {currentStepIndex + 1}/{STEPS.length}
          </div>
          <div className="hidden md:flex gap-1 h-2 items-end">
            {STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-3 h-full transition-all duration-300 ${idx <= currentStepIndex ? 'bg-white' : 'bg-surface-border'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button 
            type="button"
            onClick={async () => {
              const ok = await updateUser({ hasCompletedOnboarding: true });
              if (!ok) return;
              toast.success('Setup skipped. Welcome to your dashboard.');
              startTransition(() => navigate('/dashboard'));
            }}
            className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content-primary"
          >
            Skip setup
          </button>
          <div className="hidden text-xs font-medium text-content-tertiary sm:block">
            Step {currentStepIndex + 1} of {STEPS.length}
          </div>
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse hidden sm:block" />
        </div>
      </div>

      {/* Main Container - Optimized Density */}
      <div className="w-full max-w-xl relative pt-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            className="w-full"
          >
            <div className="flex flex-col items-start text-left">
              <div className="mb-4 flex h-7 w-7 items-center justify-center rounded-md border border-surface-border bg-surface-raised">
                {currentStepIndex === 0 && <Vault className="h-3.5 w-3.5 text-content-primary" />}
                {currentStepIndex === 1 && <Receipt className="h-3.5 w-3.5 text-content-primary" />}
                {currentStepIndex === 2 && <Activity className="h-3.5 w-3.5 text-content-primary" />}
                {currentStepIndex === 3 && <Flame className="h-3.5 w-3.5 text-content-primary" />}
                {currentStepIndex === 4 && <Shield className="h-3.5 w-3.5 text-content-primary" />}
              </div>

              <h1 className="mb-1 text-2xl font-medium tracking-tight text-white md:text-3xl">
                {currentStep.title}
              </h1>
              <p className="mb-2 text-sm font-medium text-zinc-400">{currentStep.subtitle}</p>
              {currentStepIndex <= 2 && (
                <p className="mb-8 text-xs font-medium text-zinc-500">
                  Optional — leave blank and continue, or add from the dashboard later.
                </p>
              )}
              {currentStepIndex > 2 && <div className="mb-8" />}

              {/* Input Control Area - Refined Padding */}
              <div className="group relative w-full rounded-lg border border-surface-border bg-surface-raised p-6 shadow-none md:p-10">
                <div className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-white/25"></div>
                <div className="absolute right-0 top-0 h-1.5 w-1.5 border-r border-t border-white/25"></div>
                
                {currentStep.id === 'assets' && (
                  <div className="space-y-4">
                    <div className="flex items-end border-b border-surface-border group-focus-within:border-white/30 transition-all">
                      <span className="text-content-tertiary font-sans text-5xl leading-none pb-2 pr-0.5">$</span>
                      <input 
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.cash}
                        onChange={e => setFormData({...formData, cash: e.target.value})}
                        className="w-full bg-transparent pt-3 pb-2 text-5xl font-mono text-white placeholder:text-content-muted focus-app-field tnum leading-none"
                      />
                    </div>
                    <p className="pt-2 text-xs font-medium text-content-tertiary">Current balances · liquid assets only</p>
                  </div>
                )}

                {currentStep.id === 'obligations' && (
                  <div className="space-y-4">
                    <div className="flex items-end border-b border-surface-border group-focus-within:border-white/30 transition-all">
                      <span className="text-content-tertiary font-sans text-5xl leading-none pb-2 pr-0.5">$</span>
                      <input 
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.bills}
                        onChange={e => setFormData({...formData, bills: e.target.value})}
                        className="w-full bg-transparent pt-3 pb-2 text-5xl font-mono text-white placeholder:text-content-muted focus-app-field tnum leading-none"
                      />
                    </div>
                    <p className="pt-2 text-xs font-medium text-content-tertiary">Monthly fixed outflow · rent, subscriptions, minimums</p>
                  </div>
                )}

                {currentStep.id === 'velocity' && (
                  <div className="space-y-6">
                    <div className="flex items-end border-b border-surface-border group-focus-within:border-white/30 transition-all">
                      <span className="text-content-tertiary font-sans text-5xl leading-none pb-2 pr-0.5">$</span>
                      <input 
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.dailyLimit}
                        onChange={e => setFormData({...formData, dailyLimit: e.target.value})}
                        className="w-full bg-transparent pt-3 pb-2 text-5xl font-mono text-white placeholder:text-content-muted focus-app-field tnum leading-none"
                      />
                    </div>
                    <div className="rounded-lg border border-surface-border bg-black/40 p-4">
                       <span className="mb-1 block text-xs font-medium text-amber-500">What we do with this</span>
                       <p className="text-xs font-medium leading-relaxed text-zinc-400">We create a monthly &quot;Flexible spending&quot; budget (~30× your daily number) so you see it on the Budgets page. Tune it anytime as real transactions come in.</p>
                    </div>
                  </div>
                )}

                {currentStep.id === 'strategy' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, focus: 'stacking'})}
                      className={`p-5 border transition-all text-left group ${formData.focus === 'stacking' ? 'bg-surface-elevated text-white border-white/25' : 'bg-surface-base border-surface-border hover:border-white/15 text-content-tertiary'}`}
                    >
                      <h3 className="mb-2 text-xs font-semibold text-content-primary">Save &amp; grow</h3>
                      <p className="text-[11px] font-medium leading-relaxed text-content-secondary">Focus on growth trajectory and asset accumulation.</p>
                    </button>

                    <button 
                      onClick={() => setFormData({...formData, focus: 'detonation'})}
                      className={`p-5 border transition-all text-left group ${formData.focus === 'detonation' ? 'bg-surface-elevated text-white border-rose-500' : 'bg-surface-base border-surface-border hover:border-white/15 text-content-tertiary'}`}
                    >
                      <h3 className="mb-2 text-xs font-semibold text-content-primary">Pay off debt fast</h3>
                      <p className="text-[11px] font-medium leading-relaxed text-content-secondary">Focus on highest APR targets and accelerated repayment.</p>
                    </button>
                  </div>
                )}

                {currentStep.id === 'freelance' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, freelance: true})}
                      className={`p-5 border transition-all text-left group ${formData.freelance === true ? 'bg-surface-elevated text-white border-white/25' : 'bg-surface-base border-surface-border hover:border-white/15 text-content-tertiary'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-content-primary">Independent contractor</h3>
                        <Shield className="w-3 h-3 text-content-tertiary" />
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed text-content-secondary">Activates tax tracking for freelancers, automatically sets aside your tax amount, and lets you scan income statements.</p>
                    </button>

                    <button 
                      onClick={() => setFormData({...formData, freelance: false})}
                      className={`p-5 border transition-all text-left group ${formData.freelance === false ? 'bg-surface-elevated text-white border-surface-border' : 'bg-surface-base border-surface-border hover:border-white/15 text-content-tertiary'}`}
                    >
                      <h3 className="mb-2 text-xs font-semibold text-content-primary">Traditional (W-2)</h3>
                      <p className="text-[11px] font-medium leading-relaxed text-content-secondary">Standard household budgeting and debt elimination.</p>
                    </button>
                    <div className="mt-2 rounded-lg border border-surface-border bg-black/40 p-3 sm:col-span-2">
                       <span className="mb-1 block text-xs font-medium text-emerald-500">Note for gig work</span>
                       <p className="text-[11px] font-medium leading-relaxed text-content-secondary">Gig workers are subject to 15.3% self-employment tax. Oweable will automatically reserve this from every payout.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Action Controls - Refined Layout */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-surface-border pt-6">
          <button 
            type="button"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={`text-sm font-medium transition-colors ${currentStepIndex === 0 ? 'pointer-events-none opacity-0' : 'text-zinc-400 hover:text-white'}`}
          >
            Back
          </button>
          
          <div className="flex items-center gap-4">
             <div className="hidden text-xs font-medium text-zinc-500 sm:block">
               Secure setup
             </div>
            <button 
              type="button"
              onClick={handleNext}
              className="btn-tactile flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
            >
              {currentStepIndex === STEPS.length - 1 ? 'Go to dashboard' : 'Continue'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Corner Label */}
      <div className="fixed bottom-6 right-6 opacity-20 flex flex-col items-end pointer-events-none" aria-hidden>
         <div className="font-mono text-[8px] uppercase tracking-[0.5em] mb-1">Oweable Collective</div>
         <div className="w-12 h-[1px] bg-white"></div>
      </div>
    </div>
    </>
  );
}
