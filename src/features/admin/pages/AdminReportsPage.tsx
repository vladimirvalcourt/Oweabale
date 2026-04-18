import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

type ReportRow = {
  date: string;
  signups: number;
  tickets: number;
  feedback: number;
};

function toCsv(rows: ReportRow[]): string {
  const header = 'date,signups,tickets,feedback';
  const lines = rows.map((r) => `${r.date},${r.signups},${r.tickets},${r.feedback}`);
  return [header, ...lines].join('\n');
}

export default function AdminReportsPage() {
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'reports', fromDate, toDate],
    queryFn: async () => {
      const startIso = `${fromDate}T00:00:00.000Z`;
      const endIso = `${toDate}T23:59:59.999Z`;

      const [profilesRes, ticketsRes, feedbackRes] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('support_tickets').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('user_feedback').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (ticketsRes.error) throw ticketsRes.error;
      if (feedbackRes.error) throw feedbackRes.error;

      const bucket = new Map<string, ReportRow>();
      const ensure = (day: string) => {
        if (!bucket.has(day)) bucket.set(day, { date: day, signups: 0, tickets: 0, feedback: 0 });
        return bucket.get(day)!;
      };

      (profilesRes.data ?? []).forEach((r) => {
        const day = String(r.created_at).slice(0, 10);
        ensure(day).signups += 1;
      });
      (ticketsRes.data ?? []).forEach((r) => {
        const day = String(r.created_at).slice(0, 10);
        ensure(day).tickets += 1;
      });
      (feedbackRes.data ?? []).forEach((r) => {
        const day = String(r.created_at).slice(0, 10);
        ensure(day).feedback += 1;
      });

      return [...bucket.values()].sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          signups: acc.signups + row.signups,
          tickets: acc.tickets + row.tickets,
          feedback: acc.feedback + row.feedback,
        }),
        { signups: 0, tickets: 0, feedback: 0 },
      ),
    [rows],
  );

  const exportCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-report-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const { data, error: invokeError } = await supabase.functions.invoke('admin-reports', {
        body: { action: 'report_pdf', fromDate, toDate, rows, totals },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (invokeError) throw invokeError;
      const base64 = data?.pdfBase64 as string | undefined;
      if (!base64) return;
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-report-${fromDate}-to-${toDate}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-content-tertiary">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="focus-app-field rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-content-tertiary">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="focus-app-field rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-primary" />
        </div>
        <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-secondary">
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button type="button" onClick={() => void exportPdf()} disabled={isExportingPdf} className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-content-secondary disabled:opacity-40">
          <FileText className="h-3.5 w-3.5" /> {isExportingPdf ? 'PDF...' : 'PDF'}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-surface-border bg-surface-raised p-3 text-xs text-content-secondary">Signups: <span className="font-semibold text-content-primary">{totals.signups}</span></div>
        <div className="rounded-lg border border-surface-border bg-surface-raised p-3 text-xs text-content-secondary">Tickets: <span className="font-semibold text-content-primary">{totals.tickets}</span></div>
        <div className="rounded-lg border border-surface-border bg-surface-raised p-3 text-xs text-content-secondary">Feedback: <span className="font-semibold text-content-primary">{totals.feedback}</span></div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised">
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading report...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-300">Failed to load report data.</p> : null}
        {!isLoading && !error && rows.length === 0 ? <p className="p-4 text-xs text-content-muted">No data in selected range.</p> : null}
        {!isLoading && !error && rows.length > 0 ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-base text-content-tertiary">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Signups</th>
                  <th className="px-3 py-2 font-medium">Tickets</th>
                  <th className="px-3 py-2 font-medium">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date} className="border-t border-surface-border/50">
                    <td className="px-3 py-2 text-content-secondary">{row.date}</td>
                    <td className="px-3 py-2 text-content-secondary">{row.signups}</td>
                    <td className="px-3 py-2 text-content-secondary">{row.tickets}</td>
                    <td className="px-3 py-2 text-content-secondary">{row.feedback}</td>
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
