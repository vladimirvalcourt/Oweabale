import React, { Suspense, lazy, memo } from 'react';
import { Loader2 } from 'lucide-react';

const BankConnection = lazy(() => import("../../components/common"));

function IntegrationsPanelInner() {
  return (
    <div className="space-y-8">
      <p className="text-sm font-medium text-content-secondary">
        Connect accounts for automatic transaction sync. Full Suite is required when bank linking is enabled.
      </p>
      <Suspense
        fallback={
          <div
            className="flex min-h-[10rem] items-center justify-center rounded-lg border border-surface-border bg-surface-raised p-8"
            aria-busy="true"
            aria-label="Loading integrations"
          >
            <Loader2 className="h-5 w-5 animate-spin text-content-tertiary" aria-hidden />
          </div>
        }
      >
        <BankConnection />
      </Suspense>
    </div>
  );
}

export const IntegrationsPanel = memo(IntegrationsPanelInner);
