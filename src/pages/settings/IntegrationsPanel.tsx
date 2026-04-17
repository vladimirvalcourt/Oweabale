import React, { Suspense, lazy, memo } from 'react';

const BankConnection = lazy(() => import('../../components/BankConnection'));

function IntegrationsPanelInner() {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="rounded-sm border border-surface-border bg-surface-raised p-8 animate-pulse min-h-[8rem]" aria-hidden />
        }
      >
        <BankConnection />
      </Suspense>
    </div>
  );
}

export const IntegrationsPanel = memo(IntegrationsPanelInner);
