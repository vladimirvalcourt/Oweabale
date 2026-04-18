import { useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import type { AdminBroadcastRow } from './types';

type Props = {
  loading: boolean;
  items: AdminBroadcastRow[];
  onCreate: (payload: { title: string; content: string; type: 'info' | 'warning' | 'error' }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

export function AdminBroadcastsPanel({ loading, items, onCreate, onDelete }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'error'>('info');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const typeStyle = (t: string) => {
    if (t === 'warning') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (t === 'error') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-content-secondary bg-white/5 border-surface-border';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const ok = await onCreate({ title: title.trim(), content: content.trim(), type });
    setSaving(false);
    if (ok) {
      setTitle('');
      setContent('');
      setType('info');
    }
  }

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-1">
        <Megaphone className="w-4 h-4" /> Structured broadcasts
      </h2>
      <p className="text-[10px] text-content-tertiary mb-4">
        Same <span className="text-content-muted">admin_broadcasts</span> rows the Help desk loads as cards. The Platform Controls textarea is only the live banner on the platform row.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mb-5 space-y-3 rounded-lg border border-surface-border bg-surface-base p-4">
        <div>
          <label htmlFor="admin-bc-title" className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-content-tertiary">
            Title
          </label>
          <input
            id="admin-bc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary"
            placeholder="Short headline"
            maxLength={200}
          />
        </div>
        <div>
          <label htmlFor="admin-bc-type" className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-content-tertiary">
            Type
          </label>
          <select
            id="admin-bc-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'info' | 'warning' | 'error')}
            className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Urgent</option>
          </select>
        </div>
        <div>
          <label htmlFor="admin-bc-body" className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-content-tertiary">
            Message
          </label>
          <textarea
            id="admin-bc-body"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="focus-app-field w-full resize-y rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary"
            placeholder="Body shown to users"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {saving ? 'Publishing…' : 'Publish broadcast'}
        </button>
      </form>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {loading && <p className="text-xs text-content-muted">Loading broadcasts…</p>}
        {!loading && items.length === 0 && <p className="text-xs text-content-muted">No structured broadcasts yet.</p>}
        {items.map((row) => (
          <div key={row.id} className="flex gap-2 rounded-lg border border-surface-border bg-surface-base p-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={`text-[10px] rounded-md border px-1.5 py-0.5 font-medium ${typeStyle(row.type)}`}>{row.type}</span>
                <span className="text-[10px] text-content-muted">
                  {new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-content-primary">{row.title}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-content-secondary line-clamp-3">{row.content}</p>
            </div>
            <button
              type="button"
              title="Delete broadcast"
              disabled={deletingId === row.id}
              onClick={() => {
                if (!window.confirm('Remove this structured broadcast from Help for all users?')) return;
                setDeletingId(row.id);
                void onDelete(row.id).finally(() => setDeletingId(null));
              }}
              className="shrink-0 self-start rounded-lg border border-surface-border p-2 text-content-tertiary hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
