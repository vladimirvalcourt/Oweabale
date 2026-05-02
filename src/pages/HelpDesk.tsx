import React, { useState, useEffect } from 'react';
import { LifeBuoy, Plus, MessageSquare, AlertCircle, Clock, CheckCircle2, Send, Radio, Loader2 } from 'lucide-react';
import { CollapsibleModule } from '@/components/common';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/api/supabase';
import { yieldForPaint } from '@/lib/utils';
import { getCustomIcon } from '@/lib/utils';

interface Ticket {
  id: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Normal' | 'Urgent';
  date: string;
  department: string;
}

interface Broadcast {
  id: string;
  title: string;
  date: string;
  type: string;
  content: string;
}

export default function HelpDesk() {
  const SupportIcon = getCustomIcon('support');
  const [activeTab, setActiveTab] = useState<'tickets' | 'broadcast'>('tickets');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [livePlatformMessage, setLivePlatformMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    department: 'General Support',
    priority: 'Normal',
    description: ''
  });

  useEffect(() => {
    async function loadTickets() {
      setIsLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setIsLoading(false); return; }
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setTickets(data.map((t: Record<string, any>) => ({
            id: t.ticket_number,
            subject: t.subject,
            status: t.status as Ticket['status'],
            priority: t.priority as Ticket['priority'],
            date: (t.created_at as string).split('T')[0],
            department: t.department,
          })));
        }
      } catch (error) {
        console.error('[HelpDesk] Error loading tickets:', error);
        toast.error('Failed to load support tickets');
      } finally {
        setIsLoading(false);
      }
    }

    async function loadBroadcasts() {
      setBroadcastsLoading(true);
      try {
        const [{ data, error }, { data: plat }] = await Promise.all([
          supabase.from('admin_broadcasts').select('*').order('created_at', { ascending: false }),
          supabase
            .from('platform_settings')
            .select('broadcast_message')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);
        const pinned = typeof plat?.broadcast_message === 'string' ? plat.broadcast_message.trim() : '';
        setLivePlatformMessage(pinned.length > 0 ? pinned : null);
        if (!error && data) {
          setBroadcasts(data.map((b: Record<string, any>) => ({
            id: b.id,
            title: b.title,
            date: (b.created_at as string).split('T')[0],
            type: b.type ?? 'info',
            content: b.content,
          })));
        }
      } finally {
        setBroadcastsLoading(false);
      }
    }

    loadTickets();
    loadBroadcasts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('Subject and description are required');
      return;
    }

    setIsSubmitting(true);
    await yieldForPaint();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { toast.error('Not authenticated'); setIsSubmitting(false); return; }
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: authUser.id,
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        department: formData.department,
        priority: formData.priority,
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to submit ticket. Please try again.');
      return;
    }

    const newTicket: Ticket = {
      id: data.ticket_number,
      subject: data.subject,
      status: data.status,
      priority: data.priority,
      date: (data.created_at as string).split('T')[0],
      department: data.department,
    };

    setTickets([newTicket, ...tickets]);
    setIsNewTicketOpen(false);
    setFormData({ subject: '', department: 'General Support', priority: 'Normal', description: '' });
    toast.success(`Ticket ${data.ticket_number} submitted successfully`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Help & support</h1>
          <p className="text-sm font-mono text-content-tertiary mt-1 uppercase tracking-widest">Get help and track your support tickets</p>
        </div>

        <div className="flex bg-surface-elevated p-1 rounded-xl border border-surface-border inline-flex">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-6 py-2 text-xs font-mono uppercase tracking-widest transition-colors ${
              activeTab === 'tickets' ? 'bg-surface-raised text-content-primary border border-surface-border shadow-sm' : 'text-content-tertiary hover:text-content-secondary'
            }`}
          >
            My Tickets
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-6 py-2 text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-2 ${
              activeTab === 'broadcast' ? 'bg-surface-raised text-content-primary border border-surface-border shadow-sm' : 'text-content-tertiary hover:text-content-secondary'
            }`}
          >
            <Radio className="w-3 h-3" />
            Admin Broadcast
          </button>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <div className="grid grid-cols-1 gap-6">
          <CollapsibleModule
            title="Your Support Tickets"
            icon={SupportIcon}
            extraHeader={
              <button
                onClick={() => setIsNewTicketOpen(true)}
                className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-content-primary hover:text-content-secondary transition-colors"
                title="Create New Ticket"
              >
                <Plus className="w-3 h-3" />
                CREATE TICKET
              </button>
            }
          >
            <div className="-mx-6 -my-6 bg-surface-base">
              {isLoading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-5 h-5 text-content-tertiary animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center border-b border-surface-border">
                  <MessageSquare className="w-8 h-8 text-content-muted mx-auto mb-4" />
                  <p className="text-sm font-mono text-content-tertiary uppercase tracking-widest">No active support tickets.</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="p-6 hover:bg-surface-elevated transition-colors flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 border rounded-xl shrink-0 flex items-center justify-center ${
                          ticket.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                          ticket.status === 'In Progress' ? 'bg-content-primary/[0.05] border-surface-border text-content-primary' :
                          'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        }`}>
                          {ticket.status === 'Resolved' ? <CheckCircle2 className="w-5 h-5" /> :
                           ticket.status === 'In Progress' ? <Clock className="w-5 h-5" /> :
                           <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs font-mono text-content-tertiary">{ticket.id}</span>
                            <span className={`text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                              ticket.priority === 'Urgent' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                              ticket.priority === 'Normal' ? 'bg-surface-elevated border-surface-border text-content-tertiary' :
                              'bg-surface-elevated border-surface-border text-content-tertiary'
                            }`}>
                              {ticket.priority}
                            </span>
                            <span className="text-xs font-mono text-content-muted uppercase tracking-widest">{ticket.department}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-content-primary group-hover:text-content-secondary transition-colors">{ticket.subject}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-content-tertiary uppercase tracking-widest mb-1">{ticket.status}</div>
                        <div className="text-xs font-mono text-content-muted">{ticket.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleModule>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {broadcastsLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-5 h-5 text-content-tertiary animate-spin" />
            </div>
          ) : broadcasts.length === 0 && !livePlatformMessage ? (
            <div className="p-12 text-center border border-surface-border rounded-xl bg-surface-raised">
              <Radio className="w-7 h-7 text-content-muted mx-auto mb-3" />
              <p className="text-sm font-mono text-content-tertiary uppercase tracking-widest">No broadcasts at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {livePlatformMessage ? (
                <div className="p-6 bg-amber-500/5 border border-amber-500/25 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono font-semibold text-amber-200 uppercase tracking-widest">Live platform message</h3>
                    <span className="text-xs font-mono text-amber-400/80">From admin dashboard</span>
                  </div>
                  <p className="text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">{livePlatformMessage}</p>
                </div>
              ) : null}
              {broadcasts.map(msg => (
                <div key={msg.id} className="p-6 bg-surface-raised border border-surface-border rounded-xl relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    msg.type === 'warning' ? 'bg-amber-500' : 'bg-neutral-500'
                  }`} />
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-content-primary">{msg.title}</h3>
                    <span className="text-xs font-mono text-content-tertiary">{msg.date}</span>
                  </div>
                  <p className="text-sm text-content-tertiary leading-relaxed font-mono">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Ticket Modal */}
      <Dialog open={isNewTicketOpen} onClose={() => setIsNewTicketOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-surface-base/95" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-lg bg-surface-elevated border border-surface-border shadow-2xl p-6 rounded-xl">
            <Dialog.Title className="text-sm font-mono font-bold text-content-primary uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-surface-border">
              <LifeBuoy className="w-4 h-4 text-content-primary" />
              New Support Request
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">Subject</label>
                <input
                  autoFocus
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-surface-base border border-surface-border text-content-primary text-sm rounded-md px-3 py-2 focus-app-field"
                  placeholder="Brief summary of the issue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">Department</label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border text-content-primary text-sm rounded-md px-3 py-2 focus-app-field appearance-none"
                  >
                    <option>General Support</option>
                    <option>Integrations</option>
                    <option>Calculations</option>
                    <option>Bug Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border text-content-primary text-sm rounded-md px-3 py-2 focus-app-field appearance-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-content-tertiary uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-surface-base border border-surface-border text-content-primary text-sm font-mono rounded-full px-3 py-2 focus-app-field min-h-[8rem] resize-y"
                  placeholder="Provide context or reproduction steps..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
                <button type="button" onClick={() => setIsNewTicketOpen(false)} className="px-4 py-2 text-xs font-mono font-bold text-content-tertiary hover:text-content-primary uppercase tracking-widest transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-brand-cta text-surface-base hover:bg-brand-cta-hover disabled:opacity-50 rounded-md text-xs font-mono font-bold uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Submit
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
