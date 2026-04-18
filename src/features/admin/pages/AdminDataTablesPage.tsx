import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

type EntityConfig = {
  key: string;
  table: string;
  columns: string[];
  defaultOrder: string;
};

const ENTITY_CONFIGS: EntityConfig[] = [
  { key: 'Profiles', table: 'profiles', columns: ['id', 'email', 'is_admin', 'is_banned', 'created_at'], defaultOrder: 'created_at' },
  { key: 'Support', table: 'support_tickets', columns: ['id', 'ticket_number', 'status', 'priority', 'created_at'], defaultOrder: 'created_at' },
  { key: 'Feedback', table: 'user_feedback', columns: ['id', 'type', 'rating', 'created_at'], defaultOrder: 'created_at' },
  { key: 'Moderation', table: 'moderation_queue', columns: ['id', 'entity_type', 'status', 'created_at'], defaultOrder: 'created_at' },
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

  const config = useMemo(() => ENTITY_CONFIGS.find((c) => c.key === activeKey) ?? ENTITY_CONFIGS[0], [activeKey]);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'entity-table', config.table, search, sortColumn, sortAsc],
    queryFn: async () => {
      const select = config.columns.join(',');
      let query = supabase
        .from(config.table as never)
        .select(select)
        .order(sortColumn || config.defaultOrder, { ascending: sortAsc })
        .limit(100);
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
            }}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              activeKey === entity.key ? 'bg-white text-black' : 'border border-surface-border bg-surface-raised text-content-secondary'
            }`}
          >
            {entity.key}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
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
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-t border-surface-border/50">
                    {config.columns.map((column) => (
                      <td key={column} className="px-3 py-2 text-content-secondary">
                        {String(row[column] ?? '—')}
                      </td>
                    ))}
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
