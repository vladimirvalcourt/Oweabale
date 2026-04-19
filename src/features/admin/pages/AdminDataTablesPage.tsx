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
  const [planFilter, setPlanFilter] = useState<'any' | 'free' | 'pro' | 'lifetime'>('any');
  const [plaidFilter, setPlaidFilter] = useState<'any' | 'healthy' | 'error' | 'relink'>('any');
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [draftEdit, setDraftEdit] = useState<Record<string, unknown>>({});
  const qc = useQueryClient();

  const config = useMemo(() => ENTITY_CONFIGS.find((c) => c.key === activeKey) ?? ENTITY_CONFIGS[0], [activeKey]);

  const { data: tablePayload, isLoading, error } = useQuery({
    queryKey: ['admin', 'entity-table', config.table, search, sortColumn, sortAsc, page, pageSize, planFilter, plaidFilter],
    queryFn: async () => {
      if (config.table === 'profiles') {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return { rows: [], total: 0 };
        const { data, error } = await supabase.functions.invoke('admin-actions', {
          body: {
            action: 'users_query',
            page: page + 1,
            pageSize,
            search,
            plan: planFilter,
            plaidStatus: plaidFilter,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) throw error;
        return { rows: (data?.rows ?? []) as Record<string, unknown>[], total: Number(data?.total ?? 0) };
      }
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
      return { rows: ((data ?? []) as unknown) as Record<string, unknown>[], total: 0 };
    },
  });
  const rows = tablePayload?.rows ?? [];
  const total = tablePayload?.total ?? 0;
  const allPageRowIds = rows
    .map((row) => row[config.primaryKey])
    .filter((id): id is string => typeof id === 'string');
  const selectedOnPageCount = allPageRowIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = allPageRowIds.length > 0 && selectedOnPageCount === allPageRowIds.length;
  const profilesView = config.table === 'profiles';

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

  const handleProfileBulkAction = async (bulkAction: 'ban' | 'unban' | 'grant_entitlement' | 'revoke_entitlement') => {
    if (selectedIds.length === 0) return;
    const actionLabelMap: Record<typeof bulkAction, string> = {
      ban: 'ban',
      unban: 'unban',
      grant_entitlement: 'grant entitlement for',
      revoke_entitlement: 'revoke entitlement for',
    };
    if (!window.confirm(`Confirm ${actionLabelMap[bulkAction]} ${selectedIds.length} selected profile(s)?`)) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const { error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'bulk_action', bulkAction, targetUserIds: selectedIds },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) return;
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
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-surface-border bg-surface-raised p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-content-primary">Entity Data Tables</h1>
            <p className="mt-1 text-xs text-content-tertiary">
              Browse operational data, apply scoped filters, and run targeted row actions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-surface-border bg-surface-base px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Active table</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">{config.key}</p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-base px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Rows loaded</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-base px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Selected</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">{selectedIds.length}</p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-base px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Page</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">{page + 1}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-surface-border bg-surface-raised p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
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
              className={`interactive-press interactive-focus shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                activeKey === entity.key
                  ? 'border-brand-cta bg-brand-cta text-surface-base'
                  : 'border-surface-border bg-surface-base text-content-secondary hover:text-content-primary'
              }`}
            >
              {entity.key}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-surface-border bg-surface-raised p-3 sm:p-4">
          <p className="mb-3 text-[10px] uppercase tracking-wide text-content-tertiary">Filters</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {profilesView ? (
              <>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value as 'any' | 'free' | 'pro' | 'lifetime');
                    setPage(0);
                  }}
                  className="focus-app-field rounded-lg border border-surface-border bg-surface-base px-2 py-2 text-xs text-content-primary"
                >
                  <option value="any">Any plan</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="lifetime">Lifetime</option>
                </select>
                <select
                  value={plaidFilter}
                  onChange={(e) => {
                    setPlaidFilter(e.target.value as 'any' | 'healthy' | 'error' | 'relink');
                    setPage(0);
                  }}
                  className="focus-app-field rounded-lg border border-surface-border bg-surface-base px-2 py-2 text-xs text-content-primary"
                >
                  <option value="any">Any Plaid</option>
                  <option value="healthy">Healthy</option>
                  <option value="error">Sync error</option>
                  <option value="relink">Needs relink</option>
                </select>
              </>
            ) : null}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="focus-app-field rounded-lg border border-surface-border bg-surface-base px-2 py-2 text-xs text-content-primary"
            >
              <option value={10}>10 rows / page</option>
              <option value={25}>25 rows / page</option>
              <option value={50}>50 rows / page</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter current table..."
              className="focus-app-field rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary sm:col-span-2 lg:col-span-1"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-raised p-3 sm:p-4">
          <p className="mb-3 text-[10px] uppercase tracking-wide text-content-tertiary">Actions</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="interactive-press interactive-focus inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-secondary hover:text-content-primary"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            {profilesView && selectedIds.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleProfileBulkAction('ban')}
                  className="danger-button rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                >
                  Ban selected
                </button>
                <button
                  type="button"
                  onClick={() => void handleProfileBulkAction('unban')}
                  className="interactive-press interactive-focus rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200"
                >
                  Unban selected
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={selectedIds.length === 0 || profilesView}
              className="danger-button rounded-lg border border-rose-500/50 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-100 disabled:opacity-40"
            >
              Delete selected
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-2 text-[11px] text-content-tertiary">
          <p>
            {profilesView && total > 0 ? `Showing ${rows.length} of ${total} records` : `Showing ${rows.length} records`}
          </p>
          <p>{selectedIds.length > 0 ? `${selectedIds.length} selected` : 'No rows selected'}</p>
        </div>
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading table...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-300">Failed to load {config.table}.</p> : null}
        {!isLoading && !error && rows.length === 0 ? <p className="p-4 text-xs text-content-muted">No rows found for this query.</p> : null}
        {!isLoading && !error && rows.length > 0 ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-base text-content-tertiary">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...allPageRowIds])));
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => !allPageRowIds.includes(id)));
                          }
                        }}
                      />
                      <span>Select</span>
                    </label>
                  </th>
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
                        className="interactive-focus inline-flex items-center gap-1 hover:text-content-primary"
                      >
                        {column}
                        {sortColumn === column ? (sortAsc ? '↑' : '↓') : ''}
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
                        className="interactive-press interactive-focus rounded-md border border-surface-border bg-surface-base px-2 py-1 text-[10px] text-content-tertiary"
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-content-tertiary">
          {allPageRowIds.length > 0 ? `${selectedOnPageCount}/${allPageRowIds.length} selected on this page` : 'No selectable rows on this page'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="interactive-press interactive-focus rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-content-secondary disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-content-tertiary">Page {page + 1}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={profilesView ? rows.length < pageSize || ((page + 1) * pageSize >= total && total > 0) : rows.length < pageSize}
            className="interactive-press interactive-focus rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-content-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
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
                className="interactive-press interactive-focus rounded-lg border border-surface-border px-3 py-2 text-xs text-content-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="interactive-press interactive-focus rounded-lg bg-brand-cta px-3 py-2 text-xs font-semibold text-surface-base"
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
