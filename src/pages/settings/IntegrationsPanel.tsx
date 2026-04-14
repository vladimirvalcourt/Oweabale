import React, { Suspense, lazy, memo } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';

const BankConnection = lazy(() => import('../../components/BankConnection'));

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

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

      <CollapsibleModule title="Tax & Export" icon={FileText} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">Connect external services for seamless tax preparation and reporting.</p>
        <div className="space-y-4">
          <div className="border border-surface-border rounded-sm p-4 flex items-center justify-between bg-surface-elevated/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">TurboTax Integration</p>
                <p className="text-xs text-content-tertiary">Export Tax Fortress data directly</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => deferToast(() => toast.success('TurboTax integration initiated'))}
              className="text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:text-white bg-surface-raised border border-surface-border hover:bg-surface-elevated px-3 py-1.5 rounded-sm transition-colors"
            >
              Connect
            </button>
          </div>
          <div className="border border-surface-border rounded-sm p-4 flex items-center justify-between bg-surface-elevated/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">Google Sheets Sync</p>
                <p className="text-xs text-content-tertiary">Live sync transactions and balances</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => deferToast(() => toast.success('Google Sheets sync initiated'))}
              className="text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:text-white bg-surface-raised border border-surface-border hover:bg-surface-elevated px-3 py-1.5 rounded-sm transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const IntegrationsPanel = memo(IntegrationsPanelInner);
