import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

type AuditRow = {
  id: string;
  user_id: string | null;
  table_name: string;
  action: string;
  record_id: string | null;
  created_at: string;
};

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'audit-log', search],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('id, user_id, table_name, action, record_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (search.trim()) query = query.ilike('action', `%${search.trim()}%`);
      const { data: rows, error: queryError } = await query;
      if (queryError) throw queryError;
      return (rows ?? []) as AuditRow[];
    },
  });

  const grouped = useMemo(() => data ?? [], [data]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-content-primary">Audit Logs</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by action..."
          className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary sm:w-64"
        />
      </div>
      <div className="rounded-xl border border-surface-border bg-surface-raised">
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading logs...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-300">Failed to load audit logs.</p> : null}
        {!isLoading && !error && grouped.length === 0 ? (
          <p className="p-4 text-xs text-content-muted">No audit entries.</p>
        ) : null}
        {!isLoading && !error && grouped.length > 0 ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-base text-content-tertiary">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Table</th>
                  <th className="px-3 py-2 font-medium">Record</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((row) => (
                  <tr key={row.id} className="border-t border-surface-border/50">
                    <td className="px-3 py-2 text-content-secondary">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-content-primary">{row.action}</td>
                    <td className="px-3 py-2 text-content-secondary">{row.table_name}</td>
                    <td className="px-3 py-2 text-content-tertiary">{row.record_id ?? '—'}</td>
                    <td className="px-3 py-2 text-content-tertiary">{row.user_id?.slice(0, 8) ?? 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
