import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

type EntityConfig = {
  key: string;
  table: string;
  primaryKey: string;
  columns: string[];
  editableColumns: string[];
  defaultOrder: string;
};

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    key: 'Profiles',
    table: 'profiles',
    primaryKey: 'id',
    columns: ['id', 'email', 'is_admin', 'is_banned', 'created_at'],
    editableColumns: ['is_admin', 'is_banned'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Support',
    table: 'support_tickets',
    primaryKey: 'id',
    columns: ['id', 'ticket_number', 'status', 'priority', 'created_at'],
    editableColumns: ['status', 'priority'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Feedback',
    table: 'user_feedback',
    primaryKey: 'id',
    columns: ['id', 'type', 'rating', 'created_at'],
    editableColumns: ['type', 'rating'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Moderation',
    table: 'moderation_queue',
    primaryKey: 'id',
    columns: ['id', 'entity_type', 'status', 'created_at'],
    editableColumns: ['status', 'moderator_note'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Notifications',
    table: 'system_notifications',
    primaryKey: 'id',
    columns: ['id', 'title', 'severity', 'is_read', 'created_at'],
    editableColumns: ['severity', 'is_read'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Broadcasts',
    table: 'admin_broadcasts',
    primaryKey: 'id',
    columns: ['id', 'title', 'type', 'created_at'],
    editableColumns: ['title', 'content', 'type'],
    defaultOrder: 'created_at',
  },
];

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map((c) => esc(row[c])).join(','));
  return lines.join('\n');
}

export default function AdminDataTablesPage() {
  const [activeKey, setActiveKey] = useState(ENTITY_CONFIGS[0].key);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [draftEdit, setDraftEdit] = useState<Record<string, unknown>>({});
  const qc = useQueryClient();

  const config = useMemo(() => ENTITY_CONFIGS.find((c) => c.key === activeKey) ?? ENTITY_CONFIGS[0], [activeKey]);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'entity-table', config.table, search, sortColumn, sortAsc, page, pageSize],
    queryFn: async () => {
      const select = config.columns.join(',');
      let query = supabase
        .from(config.table as never)
        .select(select)
        .order(sortColumn || config.defaultOrder, { ascending: sortAsc })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (search.trim()) {
        const column = config.columns.find((c) => c === 'email' || c === 'status' || c === 'type' || c === 'ticket_number');
        if (column) query = query.ilike(column, `%${search.trim()}%`);
      }
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      return ((data ?? []) as unknown) as Record<string, unknown>[];
    },
  });

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const blob = new Blob([toCsv(rows, config.columns)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.table}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected rows from ${config.table}?`)) return;
    const { error: deleteError } = await supabase.from(config.table as never).delete().in(config.primaryKey, selectedIds);
    if (deleteError) return;
    setSelectedIds([]);
    await qc.invalidateQueries({ queryKey: ['admin', 'entity-table'] });
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingRow(row);
    const initial: Record<string, unknown> = {};
    config.editableColumns.forEach((c) => {
      initial[c] = row[c] ?? '';
    });
    setDraftEdit(initial);
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    const rowId = editingRow[config.primaryKey];
    if (typeof rowId !== 'string') return;
    const { error: updateError } = await supabase
      .from(config.table as never)
      .update(draftEdit as never)
      .eq(config.primaryKey, rowId);
    if (updateError) return;
    setEditingRow(null);
    setDraftEdit({});
    await qc.invalidateQueries({ queryKey: ['admin', 'entity-table'] });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ENTITY_CONFIGS.map((entity) => (
          <button
            key={entity.key}
            type="button"
            onClick={() => {
              setActiveKey(entity.key);
              setSortColumn(entity.defaultOrder);
              setSortAsc(false);
              setPage(0);
              setSelectedIds([]);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              activeKey === entity.key ? 'bg-white text-black' : 'border border-surface-border bg-surface-raised text-content-secondary'
            }`}
          >
            {entity.key}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="focus-app-field rounded-lg border border-surface-border bg-surface-raised px-2 py-2 text-xs text-content-primary"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="focus-app-field rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary"
          />
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-secondary"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            disabled={selectedIds.length === 0}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 disabled:opacity-40"
          >
            Delete selected
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised">
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading table...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-300">Failed to load {config.table}.</p> : null}
        {!isLoading && !error && rows.length === 0 ? <p className="p-4 text-xs text-content-muted">No rows.</p> : null}
        {!isLoading && !error && rows.length > 0 ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-base text-content-tertiary">
                <tr>
                  <th className="px-3 py-2 font-medium">Select</th>
                  {config.columns.map((column) => (
                    <th key={column} className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortColumn === column) setSortAsc((v) => !v);
                          else {
                            setSortColumn(column);
                            setSortAsc(false);
                          }
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        {column}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Edit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-t border-surface-border/50">
                    <td className="px-3 py-2 text-content-secondary">
                      {typeof row[config.primaryKey] === 'string' ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row[config.primaryKey] as string)}
                          onChange={() => toggleRow(row[config.primaryKey] as string)}
                        />
                      ) : null}
                    </td>
                    {config.columns.map((column) => (
                      <td key={column} className="px-3 py-2 text-content-secondary">
                        {String(row[column] ?? '—')}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-md border border-surface-border px-2 py-1 text-[10px] text-content-tertiary"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-content-secondary disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-xs text-content-tertiary">Page {page + 1}</span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={rows.length < pageSize}
          className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-content-secondary disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {editingRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl border border-surface-border bg-surface-base p-4">
            <h3 className="mb-3 text-sm font-semibold text-content-primary">Edit {config.key} Row</h3>
            <div className="space-y-2">
              {config.editableColumns.map((column) => (
                <label key={column} className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-content-tertiary">{column}</span>
                  <input
                    value={String(draftEdit[column] ?? '')}
                    onChange={(e) => setDraftEdit((prev) => ({ ...prev, [column]: e.target.value }))}
                    className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-lg border border-surface-border px-3 py-2 text-xs text-content-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
