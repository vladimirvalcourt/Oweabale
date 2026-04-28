import React, { memo, useEffect, useState } from 'react';
import { LifeBuoy, MessageSquare, Send, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { CollapsibleModule } from '../../components/common';
import { supabase } from '../../lib/api/supabase';
import { toast } from 'sonner';
import type { SupportTicket } from './types';
import { useStore } from '../../store';
import { yieldForPaint } from "../../lib/api/services";
import { getCustomIcon } from '../../lib/utils/customIcons';

function SupportPanelInner() {
  const SupportIcon = getCustomIcon('support');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [supportForm, setSupportForm] = useState({
    subject: '',
    department: 'General Support',
    priority: 'Normal',
    description: '',
  });
  const { bankConnected, userEmail } = useStore(
    useShallow((s) => ({ bankConnected: s.bankConnected, userEmail: s.user.email ?? '' })),
  );
  const plaidNeedsRelink = useStore((s) => s.plaidNeedsRelink);
  const plaidLastSyncAt = useStore((s) => s.plaidLastSyncAt);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

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

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const syncAgeHours =
    plaidLastSyncAt && Number.isFinite(new Date(plaidLastSyncAt).getTime())
      ? (Date.now() - new Date(plaidLastSyncAt).getTime()) / 3600000
      : null;
  const syncState = !bankConnected
    ? 'not_connected'
    : plaidNeedsRelink
      ? 'needs_relink'
      : syncAgeHours === null
        ? 'warming'
        : syncAgeHours <= 24
          ? 'healthy'
          : 'stale';

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setIsSubmittingTicket(true);
    await yieldForPaint();
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
    toast.success(`Your request has been submitted (Ticket #${data.ticket_number}). Check your email for confirmation.`);
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Service Status" icon={SupportIcon} defaultOpen={false}>
        <div className="space-y-3">
          <div className="rounded-lg border border-surface-border bg-surface-base p-3 text-sm">
            <p className="font-medium text-content-primary">App connectivity: {isOnline ? 'Online' : 'Offline'}</p>
            <p className="mt-1 text-xs text-content-tertiary">
              {isOnline ? 'Network looks healthy from this browser.' : 'You appear offline. Sync and support actions may fail.'}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-base p-3 text-sm">
            <p className="font-medium text-content-primary">
              Bank sync status:{' '}
              {syncState === 'healthy'
                ? 'Healthy'
                : syncState === 'needs_relink'
                  ? 'Needs relink'
                  : syncState === 'stale'
                    ? 'Stale'
                    : syncState === 'warming'
                      ? 'Warming up'
                      : 'Not connected'}
            </p>
            <p className="mt-1 text-xs text-content-tertiary">
              {plaidLastSyncAt ? `Last sync: ${new Date(plaidLastSyncAt).toLocaleString()}` : 'No sync timestamp available yet.'}
            </p>
          </div>
          <p className="text-xs text-content-tertiary">
            If services appear degraded, include this panel state when opening a support ticket below.
          </p>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Submit a Support Request" icon={SupportIcon}>
        <div className="-mx-6 -my-6 p-6 bg-surface-base">
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-content-secondary">
                What do you need help with?
              </label>
              <input
                type="text"
                value={supportForm.subject}
                onChange={(e) => setSupportForm((f) => ({ ...f, subject: e.target.value }))}
                className="focus-app-field w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary placeholder:text-content-muted"
                placeholder="Brief summary of your issue or question..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-content-secondary">
                  Category
                </label>
                <select
                  value={supportForm.department}
                  onChange={(e) => setSupportForm((f) => ({ ...f, department: e.target.value }))}
                  className="focus-app-field w-full appearance-none rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary"
                >
                  <option>General Support</option>
                  <option>Integrations</option>
                  <option>Calculations</option>
                  <option>Bug Report</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-content-secondary">
                  Priority
                </label>
                <select
                  value={supportForm.priority}
                  onChange={(e) => setSupportForm((f) => ({ ...f, priority: e.target.value }))}
                  className="focus-app-field w-full appearance-none rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary"
                >
                  <option value="Low">Low — general question</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent — blocking me completely</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-content-secondary">
                Describe the issue in detail
              </label>
              <textarea
                value={supportForm.description}
                onChange={(e) => setSupportForm((f) => ({ ...f, description: e.target.value }))}
                className="focus-app-field min-h-[8rem] w-full resize-y rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary placeholder:text-content-muted"
                placeholder="Include steps to reproduce, what you expected vs what happened, and any relevant details..."
              />
            </div>

            <div className="flex flex-col items-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmittingTicket}
                className="flex items-center gap-2 rounded-md bg-brand-indigo px-6 py-2.5 text-sm font-medium text-white transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px disabled:opacity-50"
              >
                {isSubmittingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {isSubmittingTicket ? 'Sending...' : 'Submit Request'}
              </button>
              <p className="max-w-md text-right text-[11px] text-content-tertiary leading-relaxed">
                We typically respond within 24 hours.
                {userEmail
                  ? ` You'll receive a confirmation at ${userEmail}.`
                  : ' You will receive a confirmation email at your account address.'}
              </p>
            </div>
          </form>
        </div>
      </CollapsibleModule>

      <CollapsibleModule
        title="My Tickets"
        icon={SupportIcon}
        extraHeader={
          <span className="text-xs font-medium text-content-tertiary">
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
              <p className="text-sm font-medium text-content-secondary">No tickets yet.</p>
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
                            ? 'bg-content-primary/[0.05] border-surface-border text-content-primary'
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
                        <span className="font-mono text-xs text-content-tertiary">{ticket.id}</span>
                        <span
                          className={`rounded-lg border px-1.5 py-0.5 text-xs font-medium ${
                            ticket.priority === 'Urgent'
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'border-surface-border bg-surface-elevated text-content-secondary'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm text-content-primary truncate">{ticket.subject}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-xs font-medium capitalize text-content-secondary">{ticket.status}</div>
                    <div className="mt-0.5 text-xs font-medium text-content-muted">{ticket.date}</div>
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
