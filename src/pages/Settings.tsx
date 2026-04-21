import React, { memo, startTransition, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { SETTINGS_TAB_IDS, type SettingsTab } from './settings/constants';
import { ProfilePanel } from './settings/ProfilePanel';
import { NotificationsPanel } from './settings/NotificationsPanel';
import { SecurityPanel } from './settings/SecurityPanel';
import { BillingPanel } from './settings/BillingPanel';
import { FinancialPanel } from './settings/FinancialPanel';
import { IntegrationsPanel } from './settings/IntegrationsPanel';
import { PrivacyPanel } from './settings/PrivacyPanel';
import { SupportPanel } from './settings/SupportPanel';
import { FeedbackPanel } from './settings/FeedbackPanel';
import { HouseholdPanel } from './settings/HouseholdPanel';
import { yieldForPaint } from '../lib/interaction';

const tabs = [
  { id: 'profile' as const, name: 'Profile' },
  { id: 'household' as const, name: 'Household' },
  { id: 'security' as const, name: 'Security' },
  { id: 'notifications' as const, name: 'Notifications' },
  { id: 'financial' as const, name: 'Tax' },
  { id: 'billing' as const, name: 'Billing' },
  { id: 'integrations' as const, name: 'Integrations' },
  { id: 'privacy' as const, name: 'Data & Privacy' },
  { id: 'support' as const, name: 'Support' },
  { id: 'feedback' as const, name: 'Feedback' },
];

const BUTTON_BASE_CLASS =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-app disabled:opacity-60 disabled:cursor-not-allowed';
const BUTTON_SECONDARY_CLASS = `${BUTTON_BASE_CLASS} border border-surface-border bg-transparent text-content-secondary hover:bg-surface-elevated`;
const BUTTON_WARNING_CLASS = `${BUTTON_BASE_CLASS} bg-amber-600 text-white hover:bg-amber-500`;
const BUTTON_DESTRUCTIVE_CLASS = `${BUTTON_BASE_CLASS} bg-[#EF4444] text-white hover:bg-[#DC2626]`;

const SettingsNav = memo(function SettingsNav({
  activeTab,
  onSelect,
}: {
  activeTab: SettingsTab;
  onSelect: (id: SettingsTab) => void;
}) {
  return (
    <nav className="space-y-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            'w-full flex items-center px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-lg transition-all border border-transparent',
            activeTab === tab.id
              ? 'bg-content-primary/[0.08] text-content-primary border-content-primary/10 shadow-none'
              : 'text-content-tertiary hover:text-content-primary hover:bg-surface-raised',
          )}
        >
          {tab.name}
        </button>
      ))}
    </nav>
  );
});

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resetData = useStore((state) => state.resetData);
  const deleteAccount = useStore((state) => state.deleteAccount);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [deletionReceipt, setDeletionReceipt] = useState<{
    id: string;
    deletedAt: string;
    summary: Record<string, number>;
  } | null>(null);
  const exportSnapshot = useStore(
    useShallow((state) => ({
      bills: state.bills.length,
      debts: state.debts.length,
      transactions: state.transactions.length,
      assets: state.assets.length,
      subscriptions: state.subscriptions.length,
      goals: state.goals.length,
      incomes: state.incomes.length,
      budgets: state.budgets.length,
      categories: state.categories.length,
    })),
  );

  const tabFromUrl = searchParams.get('tab');
  const activeTab: SettingsTab =
    tabFromUrl && SETTINGS_TAB_IDS.includes(tabFromUrl as SettingsTab)
      ? (tabFromUrl as SettingsTab)
      : 'profile';

  const selectTab = useCallback((tabId: SettingsTab) => {
    startTransition(() => {
      if (tabId === 'profile') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    });
  }, [setSearchParams]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    await yieldForPaint();
    try {
      await deleteAccount();
      const receipt = {
        id: crypto.randomUUID(),
        deletedAt: new Date().toISOString(),
        summary: exportSnapshot,
      };
      localStorage.setItem('oweable_last_deletion_receipt', JSON.stringify(receipt));
      setDeletionReceipt(receipt);
      setIsDeleting(false);
      toast.success('Account deleted successfully');
    } catch {
      toast.error('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const downloadDeletionReceipt = useCallback(() => {
    if (!deletionReceipt) return;
    const blob = new Blob([JSON.stringify(deletionReceipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `oweable-deletion-receipt-${deletionReceipt.deletedAt.slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [deletionReceipt]);

  const handleResetData = async () => {
    if (resetConfirmText.trim() !== 'RESET') return;
    setIsResettingData(true);
    await yieldForPaint();
    await resetData();
    setIsResettingData(false);
    setResetConfirmText('');
    setIsResetDialogOpen(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">Account, billing, security, and tax.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <SettingsNav activeTab={activeTab} onSelect={selectTab} />
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && <ProfilePanel />}
          {activeTab === 'notifications' && <NotificationsPanel />}
          {activeTab === 'security' && <SecurityPanel />}
          {activeTab === 'billing' && <BillingPanel />}
          {activeTab === 'financial' && <FinancialPanel />}
          {activeTab === 'integrations' && <IntegrationsPanel />}
          {activeTab === 'privacy' && (
            <PrivacyPanel
              onOpenResetDialog={() => setIsResetDialogOpen(true)}
              onOpenDeleteDialog={() => {
                setDeletionReceipt(null);
                setIsDeleting(false);
                setDeleteConfirmText('');
                setIsDeleteDialogOpen(true);
              }}
            />
          )}
          {activeTab === 'support' && <SupportPanel />}
          {activeTab === 'feedback' && <FeedbackPanel />}
        </div>
      </div>

      <p className="max-w-5xl mx-auto text-center text-[11px] font-mono text-content-muted">
        Most preferences sync to your Oweable profile. App Lock, web push, and some session data stay on this device.
      </p>

      <Dialog open={isResetDialogOpen} onClose={() => setIsResetDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-surface-raised border border-surface-border p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-amber-500/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary">Reset Data?</Dialog.Title>
            </div>
            <Dialog.Description className="text-sm text-content-tertiary mb-4">
              This will permanently delete all your bills, debts, assets, and transactions. Your account will remain active, but you
              will be sent back to the onboarding setup.
            </Dialog.Description>
            <label className="block text-xs font-medium text-content-secondary mb-1" htmlFor="reset-confirm">
              Type RESET to confirm
            </label>
            <input
              id="reset-confirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              autoComplete="off"
              className="mb-6 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
              placeholder="RESET"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setResetConfirmText('');
                  setIsResetDialogOpen(false);
                }}
                className={BUTTON_SECONDARY_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetData}
                disabled={isResettingData || resetConfirmText.trim() !== 'RESET'}
                className={`${BUTTON_DESTRUCTIVE_CLASS} gap-2`}
              >
                {isResettingData && <Loader2 className="w-3 h-3 animate-spin" />}
                {isResettingData ? 'Resetting...' : 'Reset Everything'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-surface-raised border border-surface-border p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#7F1D1D] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary">Delete account</Dialog.Title>
            </div>
            {deletionReceipt ? (
              <>
                <Dialog.Description className="text-sm text-content-tertiary mb-3">
                  Your account and data have been deleted. Keep this receipt as proof of deletion.
                </Dialog.Description>
                <div className="mb-5 rounded-lg border border-surface-border bg-surface-base p-3 text-xs text-content-secondary space-y-1">
                  <p>Receipt ID: {deletionReceipt.id}</p>
                  <p>Deleted at: {new Date(deletionReceipt.deletedAt).toLocaleString()}</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={downloadDeletionReceipt}
                    className={BUTTON_SECONDARY_CLASS}
                  >
                    Download receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    className={BUTTON_DESTRUCTIVE_CLASS}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <Dialog.Description className="text-sm text-content-tertiary mb-4">
                  Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be
                  undone.
                </Dialog.Description>
                <label className="block text-xs font-medium text-content-secondary mb-1" htmlFor="delete-account-confirm">
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-account-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoComplete="off"
                  className="mb-6 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
                  placeholder="DELETE"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText('');
                      setIsDeleteDialogOpen(false);
                    }}
                    className={BUTTON_SECONDARY_CLASS}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText.trim() !== 'DELETE'}
                    className={`${BUTTON_DESTRUCTIVE_CLASS} gap-2`}
                  >
                    {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isDeleting ? 'Deleting...' : 'Delete account'}
                  </button>
                </div>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
