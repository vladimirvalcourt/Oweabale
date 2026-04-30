import { useMemo, useState } from 'react';
import { Download, FileSearch, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/api/supabase';
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { cn } from '@/lib/utils';

type AuditRow = {
  id: string;
  user_id: string | null;
  table_name: string | null;
  action: string;
  record_id: string | null;
  created_at: string;
  old_data?: unknown;
  new_data?: unknown;
  ip_address?: string | null;
  user_agent?: string | null;
};

function exportAuditCsv(rows: AuditRow[]) {
  const esc = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    'created_at,action,table_name,record_id,user_id,ip_address',
    ...rows.map((row) => [row.created_at, row.action, row.table_name, row.record_id, row.user_id, row.ip_address].map(esc).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'audit-log'],
    queryFn: async () => {
      const { data: rows, error: queryError } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (queryError) throw queryError;
      return (rows ?? []) as AuditRow[];
    },
  });

  const tables = useMemo(() => Array.from(new Set(data.map((row) => row.table_name).filter(Boolean))).sort(), [data]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.filter((row) => {
      const tableMatch = tableFilter === 'all' || row.table_name === tableFilter;
      if (!needle) return tableMatch;
      const text = [row.action, row.table_name, row.record_id, row.user_id, row.ip_address].filter(Boolean).join(' ').toLowerCase();
      return tableMatch && text.includes(needle);
    });
  }, [data, search, tableFilter]);

  const sensitiveCount = filtered.filter((row) => /delete|revoke|ban|impersonat|grant|update/i.test(row.action)).length;

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Data"
        title="Audit log"
        description="Review admin and system actions with actor, table, record, and before/after context when the backend provides it."
        actions={
          <button type="button" onClick={() => exportAuditCsv(filtered)} className={adminButtonClass}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
        metrics={[
          { label: 'Rows loaded', value: data.length.toLocaleString() },
          { label: 'Visible', value: filtered.length.toLocaleString() },
          { label: 'Sensitive', value: sensitiveCount.toLocaleString(), tone: sensitiveCount > 0 ? 'warn' : 'default' },
          { label: 'Source', value: 'audit_log' },
        ]}
      />

      <AdminPanel title="Filters" description="Stripe/Vercel-style logs are useful because operators can narrow the blast radius quickly.">
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, actor, record, IP, or table"
              className={cn(adminInputClass, 'w-full pl-9')}
            />
          </label>
          <select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} className={adminInputClass}>
            <option value="all">All tables</option>
            {tables.map((table) => (
              <option key={table} value={table ?? ''}>{table}</option>
            ))}
          </select>
        </div>
      </AdminPanel>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <AdminPanel title="Event stream" description="Newest events first. Select a row to inspect payload details.">
          {isLoading ? <p className="p-4 text-xs text-content-muted">Loading audit events...</p> : null}
          {error ? <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load audit logs.</p> : null}
          {!isLoading && !error && filtered.length === 0 ? (
            <AdminEmptyState icon={FileSearch} title="No matching events" description="Change the search or table filter to widen the audit trail." />
          ) : null}
          {!isLoading && !error && filtered.length > 0 ? (
            <div className="max-h-[68vh] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-surface-border bg-surface-raised text-content-tertiary">
                  <tr>
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                    <th className="px-3 py-2 font-semibold">Table</th>
                    <th className="px-3 py-2 font-semibold">Record</th>
                    <th className="px-3 py-2 font-semibold">Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-surface-border/60 transition-colors hover:bg-surface-elevated/60"
                      onClick={() => setSelected(row)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-content-secondary">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-content-primary">
                        <span className="font-medium">{row.action}</span>
                      </td>
                      <td className="px-3 py-2 text-content-secondary">{row.table_name ?? 'system'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-content-tertiary">{row.record_id ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-content-tertiary">{row.user_id?.slice(0, 8) ?? 'system'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel title="Event detail" description="Before/after payloads appear only when the audit row includes them.">
          {selected ? (
            <div className="space-y-4 p-4 text-xs">
              <div className="flex items-center justify-between gap-2">
                <AdminStatusBadge tone={/delete|revoke|ban|impersonat/i.test(selected.action) ? 'danger' : 'default'}>
                  {selected.action}
                </AdminStatusBadge>
                <span className="text-content-muted">{new Date(selected.created_at).toLocaleString()}</span>
              </div>
              <dl className="grid gap-2">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">Actor</dt>
                  <dd className="mt-1 break-all font-mono text-content-secondary">{selected.user_id ?? 'system'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">Record</dt>
                  <dd className="mt-1 break-all font-mono text-content-secondary">{selected.table_name ?? 'system'} / {selected.record_id ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">Request metadata</dt>
                  <dd className="mt-1 text-content-secondary">
                    IP {selected.ip_address ?? 'not captured'} · user agent {selected.user_agent ? 'captured' : 'not captured'}
                  </dd>
                </div>
              </dl>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">Old data</p>
                <pre className="max-h-40 overflow-auto border border-surface-border bg-surface-base p-3 text-[11px] text-content-secondary">
                  {JSON.stringify(selected.old_data ?? 'not available', null, 2)}
                </pre>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">New data</p>
                <pre className="max-h-40 overflow-auto border border-surface-border bg-surface-base p-3 text-[11px] text-content-secondary">
                  {JSON.stringify(selected.new_data ?? 'not available', null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <AdminEmptyState icon={FileSearch} title="Select an event" description="Open a row to inspect the actor, record, request metadata, and payload snapshot." />
          )}
        </AdminPanel>
      </div>
    </section>
  );
}
