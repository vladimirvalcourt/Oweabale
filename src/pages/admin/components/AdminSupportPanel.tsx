import { AlertTriangle, LifeBuoy } from 'lucide-react';
import type { PlaidHealthStats, SupportTicket } from './types';

type Props = {
  ticketsLoading: boolean;
  tickets: SupportTicket[];
  resolvingTicketId: string | null;
  plaidStats: PlaidHealthStats | null;
  onResolveTicket: (ticketId: string) => void;
};

export function AdminSupportPanel({
  ticketsLoading,
  tickets,
  resolvingTicketId,
  plaidStats,
  onResolveTicket,
}: Props) {
  const priorityClass = (priority: string) => {
    if (priority === 'Urgent') return 'text-rose-400 bg-rose-500/10';
    if (priority === 'Normal') return 'text-amber-400 bg-amber-500/10';
    return 'text-content-tertiary bg-white/5';
  };

  return (
    <>
      <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4"><LifeBuoy className="w-4 h-4" /> Open Support</h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {ticketsLoading && <p className="text-xs text-content-muted">Loading tickets...</p>}
          {!ticketsLoading && tickets.length === 0 && <p className="text-xs text-content-muted">No open tickets.</p>}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border border-surface-border rounded-lg p-2 bg-surface-base">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-content-primary font-semibold truncate">{ticket.subject}</p>
                  <p className="text-[10px] text-content-tertiary">{ticket.ticket_number} · {ticket.userEmail}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-semibold ${priorityClass(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
              <p className="text-[10px] text-content-tertiary mt-1 line-clamp-2">{ticket.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-content-muted">{new Date(ticket.created_at).toLocaleDateString()}</span>
                <button
                  type="button"
                  onClick={() => onResolveTicket(ticket.id)}
                  disabled={resolvingTicketId === ticket.id}
                  className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 disabled:opacity-50"
                >
                  {resolvingTicketId === ticket.id ? '...' : 'Resolve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {plaidStats && plaidStats.items_with_sync_error > 0 && (
        <div className="border border-amber-500/20 rounded-lg bg-amber-500/5 p-4 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <p>
            Plaid currently has {plaidStats.items_with_sync_error} item(s) with sync errors and {plaidStats.items_needing_relink} needing relink.
          </p>
        </div>
      )}
    </>
  );
}
