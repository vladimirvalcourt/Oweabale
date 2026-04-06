import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Shield, Vault, Receipt, Activity, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';

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
    description: 'Setting a daily limit helps us keep your budget on track.'
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
  const { addAsset, addBudget, updateUser, addNotification } = useStore();
  const currentStep = STEPS[currentStepIndex];

  const persistOnboardingData = () => {
    // Step 1 — cash becomes a "Checking Account" asset
    if (formData.cash && parseFloat(formData.cash) > 0) {
      addAsset({ name: 'Primary Checking', value: parseFloat(formData.cash), type: 'Cash' });
    }
    // Step 2 — monthly bills total becomes a General budget ceiling
    if (formData.bills && parseFloat(formData.bills) > 0) {
      addBudget({ category: 'General', amount: parseFloat(formData.bills), period: 'Monthly' });
    }
    // Step 3/4/5 — strategy + freelance mode stored to user profile metadata
    updateUser({
      theme: formData.focus === 'detonation' ? 'Detonation' : 'Dark',
    } as any);
    // Notify user of active mode
    addNotification({
      title: formData.freelance ? 'Independent Contractor Mode Active' : 'Standard Mode Active',
      message: formData.focus === 'detonation'
        ? 'Debt Detonation strategy selected. Highest APR targets prioritized.'
        : 'Wealth Stacking strategy selected. Growth trajectory enabled.',
      type: 'info',
    });
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setDirection(1);
      setCurrentStepIndex(prev => prev + 1);
    } else {
      persistOnboardingData();
      toast.success('Setup complete. Welcome to Oweable.');
      setTimeout(() => navigate('/dashboard'), 800);
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

  return (
    <div className="fixed inset-0 bg-[#08090A] flex flex-col items-center justify-center p-6 overflow-hidden selection:bg-brand-violet/20 font-sans">
      {/* Background HUD Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-surface-border opacity-20"></div>
        <div className="absolute top-0 left-0 w-[1px] h-full bg-surface-border opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-full h-[1px] bg-surface-border opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-[1px] h-full bg-surface-border opacity-20"></div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center h-12 px-6 border-b border-surface-border bg-surface-base/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-6">
          <div className="text-[10px] font-mono text-white tracking-[0.2em] font-bold uppercase">Getting Started</div>
          <div className="hidden md:flex gap-1 h-2 items-end">
            {STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-3 h-full transition-all duration-300 ${idx <= currentStepIndex ? 'bg-brand-violet shadow-glow-indigo' : 'bg-surface-border'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:block">Status: Finalizing</div>
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
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
              <div className="mb-4 h-7 w-7 border border-white/10 flex items-center justify-center bg-surface-raised">
                {currentStepIndex === 0 && <Vault className="w-3.5 h-3.5 text-brand-violet" />}
                {currentStepIndex === 1 && <Receipt className="w-3.5 h-3.5 text-brand-violet" />}
                {currentStepIndex === 2 && <Activity className="w-3.5 h-3.5 text-brand-violet" />}
                {currentStepIndex === 3 && <Flame className="w-3.5 h-3.5 text-brand-violet" />}
                {currentStepIndex === 4 && <Shield className="w-3.5 h-3.5 text-brand-violet" />}
              </div>

              <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight text-white mb-1 uppercase">
                {currentStep.title}
              </h1>
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-8">{currentStep.subtitle}</p>

              {/* Input Control Area - Refined Padding */}
              <div className="w-full bg-surface-raised border border-surface-border p-6 md:p-10 shadow-2xl relative group">
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-brand-violet"></div>
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r border-t border-brand-violet"></div>
                
                {currentStep.id === 'assets' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-border group-focus-within:border-brand-violet transition-all">
                      <span className="text-zinc-600 font-mono text-2xl mb-1">$</span>
                      <input 
                        autoFocus
                        type="number" 
                        placeholder="0.00"
                        value={formData.cash}
                        onChange={e => setFormData({...formData, cash: e.target.value})}
                        className="w-full bg-transparent py-4 text-5xl font-mono text-white placeholder-zinc-900 outline-none tnum leading-none"
                      />
                    </div>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pt-1">Current Balances // Liquid Assets Only</p>
                  </div>
                )}

                {currentStep.id === 'obligations' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-border group-focus-within:border-brand-violet transition-all">
                      <span className="text-zinc-600 font-mono text-2xl mb-1">$</span>
                      <input 
                        autoFocus
                        type="number" 
                        placeholder="0.00"
                        value={formData.bills}
                        onChange={e => setFormData({...formData, bills: e.target.value})}
                        className="w-full bg-transparent py-4 text-5xl font-mono text-white placeholder-zinc-900 outline-none tnum leading-none"
                      />
                    </div>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pt-1">Monthly Fixed Outflow // Rent, Subscriptions, Debt Mins</p>
                  </div>
                )}

                {currentStep.id === 'velocity' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-surface-border group-focus-within:border-brand-violet transition-all">
                      <span className="text-zinc-600 font-mono text-2xl mb-1">$</span>
                      <input 
                        autoFocus
                        type="number" 
                        placeholder="0.00"
                        value={formData.dailyLimit}
                        onChange={e => setFormData({...formData, dailyLimit: e.target.value})}
                        className="w-full bg-transparent py-4 text-5xl font-mono text-white placeholder-zinc-900 outline-none tnum leading-none"
                      />
                    </div>
                    <div className="border border-surface-border p-3 bg-black/40">
                       <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest block mb-1 font-bold">Velocity Alert Threshold:</span>
                       <p className="text-[9px] font-mono text-zinc-500 uppercase leading-relaxed">The system will monitor rolling 72H spending against this benchmark.</p>
                    </div>
                  </div>
                )}

                {currentStep.id === 'strategy' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, focus: 'stacking'})}
                      className={`p-5 border transition-all text-left group ${formData.focus === 'stacking' ? 'bg-brand-indigo text-white border-brand-violet shadow-glow-indigo' : 'bg-surface-base border-surface-border hover:border-zinc-700 text-zinc-500'}`}
                    >
                      <h3 className="font-sans font-bold text-[10px] uppercase tracking-widest mb-2">Wealth Stacking</h3>
                      <p className="text-[9px] font-mono uppercase leading-relaxed opacity-60">Focus on growth trajectory and asset accumulation.</p>
                    </button>

                    <button 
                      onClick={() => setFormData({...formData, focus: 'detonation'})}
                      className={`p-5 border transition-all text-left group ${formData.focus === 'detonation' ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.2)]' : 'bg-surface-base border-surface-border hover:border-zinc-700 text-zinc-500'}`}
                    >
                      <h3 className="font-sans font-bold text-[10px] uppercase tracking-widest mb-2">Debt Detonation</h3>
                      <p className="text-[9px] font-mono uppercase leading-relaxed opacity-60">Focus on highest APR targets and accelerated repayment.</p>
                    </button>
                  </div>
                )}

                {currentStep.id === 'freelance' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, freelance: true})}
                      className={`p-5 border transition-all text-left group ${formData.freelance ? 'bg-brand-indigo text-white border-brand-violet shadow-glow-indigo' : 'bg-surface-base border-surface-border hover:border-zinc-700 text-zinc-500'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-sans font-bold text-[10px] uppercase tracking-widest">Independent Contractor</h3>
                        <Shield className="w-3 h-3 opacity-50" />
                      </div>
                      <p className="text-[9px] font-mono uppercase leading-relaxed opacity-60 text-current">Enables Tax Shield, SE Tax automation, and Statement Scanning.</p>
                    </button>

                    <button 
                      onClick={() => setFormData({...formData, freelance: false})}
                      className={`p-5 border transition-all text-left group ${formData.freelance === false ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-surface-base border-surface-border hover:border-zinc-700 text-zinc-500'}`}
                    >
                      <h3 className="font-sans font-bold text-[10px] uppercase tracking-widest mb-2">Traditional (W2)</h3>
                      <p className="text-[9px] font-mono uppercase leading-relaxed opacity-60">Standard household budgeting and debt elimination.</p>
                    </button>
                    <div className="sm:col-span-2 border border-surface-border p-3 bg-black/40 mt-2">
                       <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest block mb-1 font-bold">Intelligence Advisory:</span>
                       <p className="text-[9px] font-mono text-zinc-500 uppercase leading-relaxed">Gig workers are subject to 15.3% Self-Employment tax. Oweable will automatically reserve this from every payout.</p>
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
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={`font-mono text-[9px] uppercase tracking-[0.3em] transition-colors ${currentStepIndex === 0 ? 'opacity-0' : 'text-zinc-600 hover:text-zinc-300'}`}
          >
            [BACK_STEP]
          </button>
          
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-[8px] font-mono text-zinc-700 uppercase tracking-widest">
               Encrypted Session
             </div>
            <button 
              onClick={handleNext}
              className="bg-brand-indigo hover:bg-brand-violet text-white px-8 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.1em] transition-all btn-tactile flex items-center gap-2"
            >
              {currentStepIndex === STEPS.length - 1 ? 'Go to Dashboard' : 'Continue'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Corner Label */}
      <div className="fixed bottom-6 right-6 opacity-20 flex flex-col items-end">
         <div className="font-mono text-[8px] uppercase tracking-[0.5em] mb-1">Oweable Collective</div>
         <div className="w-12 h-[1px] bg-white"></div>
      </div>
    </div>
  );
}
