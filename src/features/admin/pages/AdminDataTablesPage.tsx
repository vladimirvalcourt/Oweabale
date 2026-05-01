import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAdminActionErrorMessage } from '@/lib/api/adminActions';
import { supabase } from '@/lib/api/supabase';
import { AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminDangerButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { cn } from '@/lib/utils';

type EntityConfig = {
  key: string;
  table: string;
  primaryKey: string;
  columns: string[];
  defaultOrder: string;
};

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    key: 'Profiles',
    table: 'profiles',
    primaryKey: 'id',
    columns: ['id', 'email', 'is_admin', 'is_banned', 'created_at'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Support',
    table: 'support_tickets',
    primaryKey: 'id',
    columns: ['id', 'ticket_number', 'status', 'priority', 'created_at'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Feedback',
    table: 'user_feedback',
    primaryKey: 'id',
    columns: ['id', 'type', 'rating', 'created_at'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Moderation',
    table: 'moderation_queue',
    primaryKey: 'id',
    columns: ['id', 'entity_type', 'status', 'created_at'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Notifications',
    table: 'system_notifications',
    primaryKey: 'id',
    columns: ['id', 'title', 'severity', 'is_read', 'created_at'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Broadcasts',
    table: 'admin_broadcasts',
    primaryKey: 'id',
    columns: ['id', 'title', 'type', 'created_at'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Bills',
    table: 'bills',
    primaryKey: 'id',
    columns: ['id', 'user_id', 'name', 'amount', 'due_date', 'status', 'type'],
    defaultOrder: 'due_date',
  },
  {
    key: 'Transactions',
    table: 'transactions',
    primaryKey: 'id',
    columns: ['id', 'user_id', 'merchant_name', 'amount', 'date', 'category', 'source'],
    defaultOrder: 'date',
  },
  {
    key: 'Subscriptions',
    table: 'subscriptions',
    primaryKey: 'id',
    columns: ['id', 'user_id', 'name', 'amount', 'billing_cycle', 'status'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Plaid Items',
    table: 'plaid_items',
    primaryKey: 'id',
    columns: ['id', 'user_id', 'institution_name', 'item_login_required', 'last_sync_at', 'last_sync_error'],
    defaultOrder: 'last_sync_at',
  },
  {
    key: 'Budgets',
    table: 'budgets',
    primaryKey: 'id',
    columns: ['id', 'user_id', 'category', 'limit', 'period', 'created_at'],
    defaultOrder: 'created_at',
  },
  {
    key: 'Goals',
    table: 'goals',
    primaryKey: 'id',
    columns: ['id', 'user_id', 'name', 'target_amount', 'current_amount', 'deadline', 'status'],
    defaultOrder: 'deadline',
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
  const hasUserIdColumn = config.columns.includes('user_id');

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
    if (!session?.access_token) {
      toast.error('Not signed in.');
      return;
    }
    const res = await supabase.functions.invoke('admin-actions', {
      body: { action: 'bulk_action', bulkAction, targetUserIds: selectedIds },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.error) {
      toast.error(`Bulk action failed: ${getAdminActionErrorMessage(res)}`);
      return;
    }
    toast.success(typeof res.data?.message === 'string' ? res.data.message : 'Bulk action completed.');
    setSelectedIds([]);
    await qc.invalidateQueries({ queryKey: ['admin', 'entity-table'] });
  };

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Data"
        title="Data explorer"
        description="Read-first access to operational tables. Edits move through a side panel and destructive bulk actions stay in a danger zone."
        metrics={[
          { label: 'Active table', value: config.key },
          { label: 'Rows loaded', value: rows.length },
          { label: 'Selected', value: selectedIds.length, tone: selectedIds.length ? 'warn' : 'default' },
          { label: 'Page', value: page + 1 },
        ]}
      />

      <AdminPanel title="Tables" description="Switching tables clears selection to avoid accidental cross-table actions.">
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
              className={`interactive-press interactive-focus shrink-0 border px-3 py-1.5 text-xs font-medium ${activeKey === entity.key
                  ? 'border-content-primary bg-content-primary text-surface-base'
                  : 'border-surface-border bg-surface-base text-content-secondary hover:text-content-primary'
                }`}
            >
              {entity.key}
            </button>
          ))}
        </div>
      </AdminPanel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
        <AdminPanel title="Filters">
          <div className="p-4">
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
                    className={adminInputClass}
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
                    className={adminInputClass}
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
                className={adminInputClass}
              >
                <option value={10}>10 rows / page</option>
                <option value={25}>25 rows / page</option>
                <option value={50}>50 rows / page</option>
              </select>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter current table..."
                className={cn(adminInputClass, 'sm:col-span-2 lg:col-span-1')}
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Actions" description="Exports are safe. Bulk mutations are intentionally gated.">
          <div className="p-4">
            <p className="mb-3 text-[10px] uppercase tracking-wide text-content-tertiary">Actions</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className={adminButtonClass}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              {profilesView && selectedIds.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleProfileBulkAction('ban')}
                    className={adminDangerButtonClass}
                  >
                    Ban selected
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleProfileBulkAction('unban')}
                    className="interactive-press interactive-focus border border-[var(--color-status-emerald-border)] bg-[var(--color-status-emerald-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-status-emerald-text)] dark:text-[var(--color-status-emerald-text-dark)]"
                  >
                    Unban selected
                  </button>
                </>
              ) : null}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-content-muted">
              Direct row edits and deletes are disabled. Use case files or audited admin actions for changes.
            </p>
          </div>
        </AdminPanel>
      </div>

      <div className="border border-surface-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-2 text-[11px] text-content-tertiary">
          <p>
            {profilesView && total > 0 ? `Showing ${rows.length} of ${total} records` : `Showing ${rows.length} records`}
          </p>
          <p>{selectedIds.length > 0 ? `${selectedIds.length} selected` : 'No rows selected'}</p>
        </div>
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading table...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load {config.table}.</p> : null}
        {!isLoading && !error && rows.length === 0 ? <p className="p-4 text-xs text-content-muted">No rows found for this query.</p> : null}
        {!isLoading && !error && rows.length > 0 ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-surface-border bg-surface-base text-content-tertiary">
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
                  {hasUserIdColumn ? <th className="px-3 py-2 font-medium">Case file</th> : null}
                  <th className="px-3 py-2 font-medium">Mode</th>
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
                    {hasUserIdColumn ? (
                      <td className="px-3 py-2">
                        {typeof (profilesView ? row.id : row.user_id) === 'string' ? (
                          <Link
                            to={`/admin/user/${profilesView ? row.id : row.user_id}`}
                            className="interactive-focus text-[10px] font-semibold text-brand-cta hover:underline"
                          >
                            Case file
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      <span className="border border-surface-border bg-surface-base px-2 py-1 text-[10px] text-content-tertiary">
                        Read only
                      </span>
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
            className="interactive-press interactive-focus border border-surface-border px-3 py-1.5 text-xs text-content-secondary disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-content-tertiary">Page {page + 1}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={profilesView ? rows.length < pageSize || ((page + 1) * pageSize >= total && total > 0) : rows.length < pageSize}
            className="interactive-press interactive-focus border border-surface-border px-3 py-1.5 text-xs text-content-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
