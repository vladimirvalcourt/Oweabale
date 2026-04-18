import { BotMessageSquare } from 'lucide-react';
import type { AdminChatMessage } from './types';

type Props = {
  loading: boolean;
  items: AdminChatMessage[];
};

export function AdminChatMessagesPanel({ loading, items }: Props) {
  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-1">
        <BotMessageSquare className="w-4 h-4" /> Owe-AI chat messages
      </h2>
      <p className="text-[10px] text-content-tertiary mb-4">
        Recent prompts and responses from <span className="text-content-muted">chat_messages</span> for support and moderation.
      </p>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading && <p className="text-xs text-content-muted">Loading chat activity...</p>}
        {!loading && items.length === 0 && <p className="text-xs text-content-muted">No chat activity found.</p>}
        {items.map((row) => (
          <div key={row.id} className="border border-surface-border rounded-lg p-3 bg-surface-base">
            <div className="flex flex-wrap items-center gap-2 text-[10px] mb-1.5">
              <span
                className={`px-1.5 py-0.5 rounded-md border ${
                  row.role === 'user'
                    ? 'text-sky-300 bg-sky-500/10 border-sky-500/25'
                    : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                }`}
              >
                {row.role}
              </span>
              <span className="text-content-tertiary">{row.mode}</span>
              <span className="text-content-muted ml-auto">{new Date(row.created_at).toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-content-secondary whitespace-pre-wrap break-words line-clamp-4">{row.content}</p>
            <p className="text-[10px] text-content-tertiary mt-2 truncate" title={row.user_id}>
              {row.userEmail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
