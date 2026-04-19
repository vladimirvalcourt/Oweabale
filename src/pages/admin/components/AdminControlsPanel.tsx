import { Shield } from 'lucide-react';

type Props = {
  isMaintenance: boolean;
  isPlaidEnabled: boolean;
  broadcastMsg: string;
  isSavingBroadcast: boolean;
  canManagePlatform: boolean;
  onToggleMaintenance: () => void;
  onTogglePlaid: () => void;
  onBroadcastChange: (value: string) => void;
  onSaveBroadcast: () => void;
};

export function AdminControlsPanel({
  isMaintenance,
  isPlaidEnabled,
  broadcastMsg,
  isSavingBroadcast,
  canManagePlatform,
  onToggleMaintenance,
  onTogglePlaid,
  onBroadcastChange,
  onSaveBroadcast,
}: Props) {
  const handleMaintenanceToggle = () => {
    const nextState = isMaintenance ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${nextState} maintenance mode?`)) return;
    onToggleMaintenance();
  };

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4"><Shield className="w-4 h-4" /> Platform Controls</h2>
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleMaintenanceToggle}
          disabled={!canManagePlatform}
          className="danger-button w-full text-left px-3 py-2 rounded-lg bg-rose-500/15 text-rose-200 border border-rose-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_10px_rgba(244,63,94,0.2)] disabled:opacity-40"
        >
          <span className="block text-xs font-semibold">
            {isMaintenance ? 'Disable maintenance mode' : 'Enable maintenance mode'}
          </span>
          <span className="block text-[10px] text-rose-200/80 mt-0.5">
            High-impact: blocks normal product access for customers.
          </span>
        </button>
        <button
          type="button"
          onClick={onTogglePlaid}
          disabled={!canManagePlatform}
          className="interactive-press interactive-focus w-full text-left px-3 py-2 rounded-lg bg-content-primary/[0.05] text-content-secondary border border-surface-border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] disabled:opacity-40"
        >
          {isPlaidEnabled ? 'Disable bank syncing' : 'Enable bank syncing'}
        </button>
        <textarea
          value={broadcastMsg}
          onChange={(e) => onBroadcastChange(e.target.value)}
          rows={3}
          placeholder="Broadcast message shown in app"
          aria-label="Broadcast message"
          className="w-full bg-surface-base border border-surface-border rounded-lg p-2 text-xs focus-app-field"
        />
        <p className="text-[10px] text-content-tertiary leading-relaxed">
          This text is stored on the platform row and appears as a live banner in Help → Admin Broadcast. Structured notices still use the{' '}
          <span className="text-content-muted">admin_broadcasts</span> table. The email in{' '}
          <span className="font-mono text-content-muted">VITE_ADMIN_EMAIL</span> is the primary admin (console protection);{' '}
          <span className="text-content-muted">Promote</span> grants dashboard access via <span className="font-mono">is_admin</span>.
        </p>
        <button
          type="button"
          onClick={onSaveBroadcast}
          disabled={isSavingBroadcast || !canManagePlatform}
          className="interactive-press interactive-focus w-full px-3 py-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 disabled:opacity-50"
        >
          {isSavingBroadcast ? 'Saving...' : 'Save broadcast'}
        </button>
      </div>
    </div>
  );
}
