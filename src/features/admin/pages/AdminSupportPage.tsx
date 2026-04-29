import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminInputClass } from '../shared/AdminUI';
import { invokeAdminAction } from '../shared/adminActionClient';
import { cn } from '../../../lib/utils';

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  department: string;
  priority: 'Low' | 'Normal' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved';
  user_email: string | null;
  assigned_admin_id: string | null;
  assigned_admin_email: string | null;
  sla_due_at: string | null;
  created_at: string;
  updated_at: string;
};

const statusTone = (status: string) => status === 'Resolved' ? 'good' : status === 'In Progress' ? 'info' : 'warn';

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('any');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [note, setNote] = useState('');

  const queueQuery = useQuery({
    queryKey: ['admin', 'support', status, search],
    queryFn: () => invokeAdminAction<{ tickets: Ticket[] }>({ action: 'support_queue', status, search }),
  });

  const historyQuery = useQuery({
    queryKey: ['admin', 'support', 'history', selected?.id],
    enabled: !!selected?.id,
    queryFn: () => invokeAdminAction<{ events: Array<Record<string, unknown>>; notes: Array<Record<string, unknown>> }>({ action: 'support_reply_history', ticketId: selected?.id }),
  });

  const updateTicket = useMutation({
    mutationFn: (body: Record<string, unknown>) => invokeAdminAction({ action: 'support_update_ticket', ...body }),
    onSuccess: async () => {
      toast.success('Ticket updated.');
      await qc.invalidateQueries({ queryKey: ['admin', 'support'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: () => invokeAdminAction({ action: 'support_add_note', ticketId: selected?.id, note }),
    onSuccess: async () => {
      setNote('');
      toast.success('Internal note added.');
      await qc.invalidateQueries({ queryKey: ['admin', 'support'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tickets = queueQuery.data?.tickets ?? [];
  const overdue = tickets.filter((ticket) => ticket.sla_due_at && new Date(ticket.sla_due_at).getTime() < Date.now() && ticket.status !== 'Resolved').length;

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Support"
        title="Support operations"
        description="Assign tickets, update status and priority, preserve internal notes, and watch SLA risk from one governed queue."
        metrics={[
          { label: 'Tickets', value: tickets.length },
          { label: 'Open', value: tickets.filter((ticket) => ticket.status !== 'Resolved').length, tone: 'warn' },
          { label: 'SLA overdue', value: overdue, tone: overdue > 0 ? 'danger' : 'good' },
          { label: 'Source', value: 'admin-actions' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel
          title="Ticket queue"
          description="Every transition writes support ticket history and an admin audit row."
          actions={
            <div className="flex items-center gap-2">
              <select value={status} onChange={(event) => setStatus(event.target.value)} className={cn(adminInputClass, 'h-9')}>
                <option value="any">Any status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <button className={adminButtonClass} onClick={() => void queueQuery.refetch()} type="button">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          }
        >
          <div className="border-b border-surface-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={cn(adminInputClass, 'w-full pl-9')} placeholder="Search ticket number, subject, department, or status" />
            </div>
          </div>
          {queueQuery.isLoading ? <p className="p-4 text-xs text-content-muted">Loading tickets...</p> : null}
          {!queueQuery.isLoading && tickets.length === 0 ? <AdminEmptyState icon={MessageSquare} title="No support tickets" description="Tickets will appear here as users contact support." /> : null}
          <div className="divide-y divide-surface-border">
            {tickets.map((ticket) => (
              <button key={ticket.id} type="button" onClick={() => setSelected(ticket)} className="block w-full p-4 text-left transition-colors hover:bg-surface-base">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-content-primary">#{ticket.ticket_number} · {ticket.subject}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-content-tertiary">{ticket.description}</p>
                    <p className="mt-2 text-[11px] text-content-muted">{ticket.user_email ?? ticket.department} · assigned to {ticket.assigned_admin_email ?? 'unassigned'}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <AdminStatusBadge tone={statusTone(ticket.status)}>{ticket.status}</AdminStatusBadge>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-content-muted">{ticket.priority}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Ticket detail" description="Status, priority, SLA, and notes stay tied to the selected ticket.">
          {!selected ? <AdminEmptyState icon={Clock} title="Select a ticket" description="Choose a ticket from the queue to view history and make governed updates." /> : (
            <div className="space-y-4 p-4">
              <div>
                <p className="text-sm font-semibold text-content-primary">#{selected.ticket_number} · {selected.subject}</p>
                <p className="mt-1 text-xs leading-5 text-content-tertiary">{selected.description}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={selected.status} onChange={(event) => updateTicket.mutate({ ticketId: selected.id, status: event.target.value })} className={adminInputClass}>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
                <select value={selected.priority} onChange={(event) => updateTicket.mutate({ ticketId: selected.id, priority: event.target.value })} className={adminInputClass}>
                  <option>Low</option>
                  <option>Normal</option>
                  <option>Urgent</option>
                </select>
              </div>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className={cn(adminInputClass, 'min-h-24 w-full')} placeholder="Internal note, action taken, or escalation context" />
              <button type="button" className={adminButtonClass} disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
                Add internal note
              </button>
              <div className="space-y-2">
                <p className="ui-label">History</p>
                {(historyQuery.data?.events ?? []).concat(historyQuery.data?.notes ?? []).slice(0, 12).map((row, idx) => (
                  <div key={String(row.id ?? idx)} className="border border-surface-border bg-surface-base p-2 text-xs text-content-secondary">
                    <p>{String(row.event_type ?? row.body ?? 'note')}</p>
                    <p className="mt-1 text-[10px] text-content-muted">{new Date(String(row.created_at)).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AdminPanel>
      </div>
    </section>
  );
}
