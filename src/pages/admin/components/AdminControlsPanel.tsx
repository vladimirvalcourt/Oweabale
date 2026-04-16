import { Shield } from 'lucide-react';

type Props = {
  isMaintenance: boolean;
  isPlaidEnabled: boolean;
  broadcastMsg: string;
  isSavingBroadcast: boolean;
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
  onToggleMaintenance,
  onTogglePlaid,
  onBroadcastChange,
  onSaveBroadcast,
}: Props) {
  return (
    <div className="border border-surface-border rounded-sm bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4"><Shield className="w-4 h-4" /> Platform Controls</h2>
      <div className="space-y-3">
        <button type="button" onClick={onToggleMaintenance} className="w-full text-left px-3 py-2 rounded-sm bg-rose-500/10 text-rose-300 border border-rose-500/20">
          {isMaintenance ? 'Disable maintenance mode' : 'Enable maintenance mode'}
        </button>
        <button type="button" onClick={onTogglePlaid} className="w-full text-left px-3 py-2 rounded-sm bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {isPlaidEnabled ? 'Disable bank syncing' : 'Enable bank syncing'}
        </button>
        <textarea
          value={broadcastMsg}
          onChange={(e) => onBroadcastChange(e.target.value)}
          rows={3}
          placeholder="Broadcast message shown in app"
          className="w-full bg-surface-base border border-surface-border rounded-sm p-2 text-xs focus-app"
        />
        <button
          type="button"
          onClick={onSaveBroadcast}
          disabled={isSavingBroadcast}
          className="w-full px-3 py-2 rounded-sm bg-amber-500/10 text-amber-300 border border-amber-500/20 disabled:opacity-50"
        >
          {isSavingBroadcast ? 'Saving...' : 'Save broadcast'}
        </button>
      </div>
    </div>
  );
}
