import { useState, type ReactNode } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createStripeCheckoutSession } from '../lib/stripe';
import { useFullSuiteAccess } from '../hooks/useFullSuiteAccess';
import { AppLoader } from './PageSkeleton';

type FullSuiteGateCardProps = {
  title: string;
  description: string;
  compact?: boolean;
};

export function FullSuiteGateCard({ title, description, compact = false }: FullSuiteGateCardProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const configuredMonthly = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
  const monthlyPrice = Number.isFinite(configuredMonthly) && configuredMonthly > 0 ? configuredMonthly : 10.99;

  const onUpgrade = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    const result = await createStripeCheckoutSession('pro_monthly');
    if ('error' in result) {
      toast.error(result.error);
      setIsUpgrading(false);
      return;
    }
    window.location.href = result.checkoutUrl;
  };

  return (
    <div
      className={
        compact
          ? 'rounded-sm border border-indigo-500/25 bg-indigo-500/10 p-5'
          : 'max-w-2xl rounded-sm border border-indigo-500/25 bg-surface-raised p-8 shadow-[0_0_30px_rgba(99,102,241,0.08)]'
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 shrink-0 rounded-sm border border-indigo-500/30 bg-indigo-500/15 inline-flex items-center justify-center">
          <Lock className="h-4 w-4 text-indigo-300" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-content-primary">{title}</h3>
          <p className="mt-1 text-sm text-content-tertiary">{description}</p>
          <button
            type="button"
            onClick={onUpgrade}
            disabled={isUpgrading}
            className="mt-4 inline-flex items-center gap-2 rounded-sm bg-brand-cta hover:bg-brand-cta-hover disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 text-xs font-mono uppercase tracking-widest"
          >
            {isUpgrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {isUpgrading ? 'Starting checkout...' : `Upgrade — $${monthlyPrice.toFixed(2)}/mo`}
          </button>
        </div>
      </div>
    </div>
  );
}

type FullSuiteRouteGuardProps = {
  children: ReactNode;
  featureName: string;
};

export function FullSuiteRouteGuard({ children, featureName }: FullSuiteRouteGuardProps) {
  const { isLoading, hasFullSuite } = useFullSuiteAccess();

  if (isLoading) return <AppLoader />;
  if (hasFullSuite) return <>{children}</>;

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-4">
      <FullSuiteGateCard
        title={`${featureName} is available on Full Suite`}
        description="You are currently on Tracker (Free). Upgrade to unlock this feature."
      />
    </div>
  );
}
