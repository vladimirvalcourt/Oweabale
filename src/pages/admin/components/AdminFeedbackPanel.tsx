import { MessageSquareText } from 'lucide-react';
import type { AdminFeedbackEntry } from './types';

type Props = {
  loading: boolean;
  items: AdminFeedbackEntry[];
};

const TYPE_STYLES: Record<string, string> = {
  bug: 'text-rose-300 bg-rose-500/10 border-rose-500/25',
  feature_request: 'text-sky-300 bg-sky-500/10 border-sky-500/25',
  general: 'text-content-secondary bg-content-primary/5 border-surface-border',
};

function typeLabel(t: string): string {
  if (t === 'feature_request') return 'Feature';
  if (t === 'bug') return 'Bug';
  return 'General';
}

export function AdminFeedbackPanel({ loading, items }: Props) {
  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-1">
        <MessageSquareText className="w-4 h-4" /> User feedback
      </h2>
      <p className="text-[10px] text-content-tertiary mb-4">
        Messages from Settings → Feedback (stored in <span className="font-mono text-content-muted">user_feedback</span>).
      </p>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {loading && <p className="text-xs text-content-muted">Loading feedback…</p>}
        {!loading && items.length === 0 && (
          <p className="text-xs text-content-muted">No feedback submissions yet.</p>
        )}
        {items.map((row) => (
          <div key={row.id} className="border border-surface-border rounded-lg p-3 bg-surface-base">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${TYPE_STYLES[row.type] ?? TYPE_STYLES.general}`}
              >
                {typeLabel(row.type)}
              </span>
              {row.rating != null && row.rating > 0 ? (
                <span className="text-[10px] text-amber-400/90 tabular-nums">{row.rating}/5</span>
              ) : null}
              <span className="text-[10px] text-content-muted ml-auto">
                {new Date(row.created_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-[11px] text-content-secondary leading-relaxed whitespace-pre-wrap break-words">{row.message}</p>
            <p className="text-[10px] text-content-tertiary mt-2 truncate" title={row.user_id}>
              {row.userEmail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
