import { useState, type ReactNode } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createStripeCheckoutSession } from '../../lib/api/stripe';
import { useFullSuiteAccess } from '../../hooks';
import { AppLoader } from '../common';
import { TransitionLink } from '../common';

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
          ? 'rounded-lg border border-surface-border bg-surface-raised p-5'
          : 'max-w-2xl rounded-lg border border-surface-border bg-surface-raised p-8 shadow-none'
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-surface-border bg-surface-base inline-flex items-center justify-center">
          <Lock className="h-4 w-4 text-content-secondary" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-content-primary">{title}</h3>
          <p className="mt-1 text-sm text-content-secondary">{description}</p>
          <button
            type="button"
            onClick={onUpgrade}
            disabled={isUpgrading}
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-sans font-semibold text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpgrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {isUpgrading ? 'Starting checkout...' : `Upgrade — $${monthlyPrice.toFixed(2)}/mo`}
          </button>
          <p className="mt-2 text-xs text-content-tertiary">
            No pressure: you can keep using the Pay List and core workflows.
          </p>
          <TransitionLink
            to="/pro/dashboard"
            className="mt-2 inline-flex text-xs font-medium text-content-secondary underline underline-offset-2 hover:text-content-primary"
          >
            Back to Pay List
          </TransitionLink>
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
        description="Upgrade to unlock this advanced tool."
      />
    </div>
  );
}
