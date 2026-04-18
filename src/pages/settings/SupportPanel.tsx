import React, { memo, useEffect, useState } from 'react';
import { LifeBuoy, MessageSquare, Send, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { SupportTicket } from './types';

function SupportPanelInner() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [supportForm, setSupportForm] = useState({
    subject: '',
    department: 'General Support',
    priority: 'Normal',
    description: '',
  });

  useEffect(() => {
    setTicketsLoading(true);
    const load = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setTickets(
            data.map((t: Record<string, unknown>) => ({
              id: t.ticket_number as string,
              subject: t.subject as string,
              status: t.status as SupportTicket['status'],
              priority: t.priority as SupportTicket['priority'],
              date: (t.created_at as string).split('T')[0],
              department: t.department as string,
            })),
          );
        }
      } finally {
        setTicketsLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setIsSubmittingTicket(true);
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error('Not authenticated');
      setIsSubmittingTicket(false);
      return;
    }
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: authUser.id,
        subject: supportForm.subject.trim(),
        description: supportForm.description.trim(),
        department: supportForm.department,
        priority: supportForm.priority,
      })
      .select()
      .single();
    setIsSubmittingTicket(false);
    if (error) {
      toast.error('Failed to submit ticket. Please try again.');
      return;
    }
    const newTicket: SupportTicket = {
      id: data.ticket_number,
      subject: data.subject,
      status: data.status,
      priority: data.priority,
      date: (data.created_at as string).split('T')[0],
      department: data.department,
    };
    setTickets((prev) => [newTicket, ...prev]);
    setSupportForm({ subject: '', department: 'General Support', priority: 'Normal', description: '' });
    toast.success(`Ticket ${data.ticket_number} submitted`);
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Submit a Support Request" icon={LifeBuoy}>
        <div className="-mx-6 -my-6 p-6 bg-surface-base">
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">
                What do you need help with?
              </label>
              <input
                type="text"
                value={supportForm.subject}
                onChange={(e) => setSupportForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full bg-surface-raised border border-surface-border text-white text-sm rounded-lg px-3 py-2 focus-app-field-indigo placeholder:text-content-muted"
                placeholder="Brief summary of your issue or question..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">
                  Category
                </label>
                <select
                  value={supportForm.department}
                  onChange={(e) => setSupportForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full bg-surface-raised border border-surface-border text-white text-sm rounded-lg px-3 py-2 focus-app-field-indigo appearance-none"
                >
                  <option>General Support</option>
                  <option>Integrations</option>
                  <option>Calculations</option>
                  <option>Bug Report</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">
                  Priority
                </label>
                <select
                  value={supportForm.priority}
                  onChange={(e) => setSupportForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full bg-surface-raised border border-surface-border text-white text-sm rounded-lg px-3 py-2 focus-app-field-indigo appearance-none"
                >
                  <option value="Low">Low — general question</option>
                  <option value="Normal">Normal — something isn&apos;t working</option>
                  <option value="Urgent">Urgent — blocking me completely</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">
                Describe the issue in detail
              </label>
              <textarea
                value={supportForm.description}
                onChange={(e) => setSupportForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-surface-raised border border-surface-border text-white text-sm font-mono rounded-lg px-3 py-2 focus-app-field-indigo min-h-[8rem] resize-y placeholder:text-content-muted"
                placeholder="Include steps to reproduce, what you expected vs what happened, and any relevant details..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingTicket}
                className="flex items-center gap-2 px-6 py-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 text-black rounded-lg text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors"
              >
                {isSubmittingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {isSubmittingTicket ? 'Sending...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </CollapsibleModule>

      <CollapsibleModule
        title="My Tickets"
        icon={MessageSquare}
        extraHeader={
          <span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </span>
        }
        defaultOpen={false}
      >
        <div className="-mx-6 -my-6 bg-surface-base">
          {ticketsLoading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-5 h-5 text-content-tertiary animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="w-7 h-7 text-content-muted mx-auto mb-3" />
              <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No tickets yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-5 hover:bg-surface-elevated transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`p-1.5 border rounded-lg shrink-0 ${
                        ticket.status === 'Resolved'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          : ticket.status === 'In Progress'
                            ? 'bg-white/[0.05] border-surface-border text-content-primary'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                      }`}
                    >
                      {ticket.status === 'Resolved' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : ticket.status === 'In Progress' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[9px] font-mono text-content-tertiary">{ticket.id}</span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-lg border ${
                            ticket.priority === 'Urgent'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : 'bg-surface-elevated border-surface-border text-content-tertiary'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm text-content-primary truncate">{ticket.subject}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">{ticket.status}</div>
                    <div className="text-[10px] font-mono text-content-muted mt-0.5">{ticket.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const SupportPanel = memo(SupportPanelInner);
