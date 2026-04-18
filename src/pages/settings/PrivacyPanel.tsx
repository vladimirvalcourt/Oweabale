import React, { memo, useState } from 'react';
import { EyeOff, Download, AlertTriangle } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

type PrivacyPanelProps = {
  onOpenResetDialog: () => void;
  onOpenDeleteDialog: () => void;
};

function PrivacyPanelInner({ onOpenResetDialog, onOpenDeleteDialog }: PrivacyPanelProps) {
  const [privacyMode, setPrivacyMode] = useState(false);

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Privacy Mode" icon={EyeOff} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">Control visibility of sensitive information.</p>
        <div className="flex items-center justify-between border border-surface-border rounded-lg p-4 bg-surface-elevated/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-lg flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-content-tertiary" />
            </div>
            <div>
              <p className="text-sm font-medium text-content-primary">Hide Balances</p>
              <p className="text-xs text-content-tertiary">Blur all monetary values until hovered</p>
            </div>
          </div>
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              checked={privacyMode}
              onChange={(e) => {
                const checked = e.target.checked;
                setPrivacyMode(checked);
                deferToast(() => toast.success(checked ? 'Privacy mode enabled' : 'Privacy mode disabled'));
              }}
              className="h-4 w-4 text-content-secondary focus-app bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
            />
          </div>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Data Management" icon={Download} defaultOpen>
        <p className="text-sm text-content-tertiary mb-6">Manage your inputs and export your financial history.</p>
        <div className="space-y-6">
          <div className="border border-surface-border rounded-lg p-4 bg-surface-elevated/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-content-primary">Export your data</h4>
              <p className="text-xs text-content-tertiary mt-1">Download a copy of all your financial data in CSV format.</p>
            </div>
            <button
              type="button"
              onClick={() => deferToast(() => toast.success('Data export started.'))}
              className="px-4 py-2 bg-surface-raised border border-surface-border rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:text-white transition-colors focus-app"
            >
              Export Data
            </button>
          </div>

          <div className="border border-surface-border rounded-lg p-4 bg-surface-elevated/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-amber-500">Reset Account Data</h4>
              <p className="text-xs text-content-tertiary mt-1">Wipe everything and start over from scratch.</p>
            </div>
            <button
              type="button"
              onClick={onOpenResetDialog}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/50 text-amber-500 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-colors focus-app"
            >
              Reset Data
            </button>
          </div>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Danger Zone" icon={AlertTriangle} defaultOpen={false} className="border-[#7F1D1D]/50 bg-red-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-content-primary">Delete Account</h4>
            <p className="text-xs text-content-tertiary mt-1">Permanently delete your account and all associated data.</p>
          </div>
          <button
            type="button"
            onClick={onOpenDeleteDialog}
            className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors focus-app"
          >
            Delete Account
          </button>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const PrivacyPanel = memo(PrivacyPanelInner);
