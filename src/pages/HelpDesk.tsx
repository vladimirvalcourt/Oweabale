import React, { useState } from 'react';
import { LifeBuoy, Plus, MessageSquare, AlertCircle, Clock, CheckCircle2, Send, Radio } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Normal' | 'Urgent';
  date: string;
  department: string;
}

const MOCK_TICKETS: Ticket[] = [
  { id: 'TKT-8992', subject: 'Plaid Bank Connection Failing', status: 'In Progress', priority: 'Urgent', date: '2026-04-05', department: 'Integrations' },
  { id: 'TKT-8711', subject: 'Question about Tax Scour logic', status: 'Resolved', priority: 'Normal', date: '2026-03-21', department: 'Calculations' }
];

const BROADCASTS = [
  { id: 'BRD-01', title: 'System Maintenance: Plaid API', date: '2026-04-06', type: 'warning', content: 'We are performing scheduled maintenance on the Plaid Link gateway. Bank connections may fail for the next 2 hours.' },
  { id: 'BRD-02', title: 'Feature Release: Financial Academy', date: '2026-04-05', type: 'success', content: 'The new Financial Academy is live. 10 offensive and defensive financial strategy tracks have been enabled.' }
];

export default function HelpDesk() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'broadcast'>('tickets');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  
  const [formData, setFormData] = useState({
    subject: '',
    department: 'General Support',
    priority: 'Normal',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) {
      toast.error('Subject and description are required');
      return;
    }
    
    const newTicket: Ticket = {
      id: `TKT-${Math.floor(Math.random() * 10000)}`,
      subject: formData.subject,
      status: 'Open',
      priority: formData.priority as any,
      date: new Date().toISOString().split('T')[0],
      department: formData.department
    };
    
    setTickets([newTicket, ...tickets]);
    setIsNewTicketOpen(false);
    setFormData({ subject: '', department: 'General Support', priority: 'Normal', description: '' });
    toast.success('Support ticket submitted successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-primary">Support Hub</h1>
          <p className="text-sm font-mono text-zinc-400 mt-1 uppercase tracking-widest">Protocol assistance & routing.</p>
        </div>
        
        <div className="flex bg-surface-elevated p-1 rounded-sm border border-surface-border inline-flex">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-6 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              activeTab === 'tickets' ? 'bg-surface-raised text-white border border-surface-border shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            My Tickets
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-6 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center gap-2 ${
              activeTab === 'broadcast' ? 'bg-surface-raised text-white border border-surface-border shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
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
            title="Ticket Registry" 
            icon={LifeBuoy}
            extraHeader={
              <button 
                onClick={() => setIsNewTicketOpen(true)}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                title="Create New Ticket"
              >
                <Plus className="w-3 h-3" />
                CREATE TICKET
              </button>
            }
          >
            <div className="-mx-6 -my-6 bg-surface-base">
              {tickets.length === 0 ? (
                <div className="p-12 text-center border-b border-surface-border">
                  <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
                  <p className="text-sm font-mono text-zinc-400 uppercase tracking-widest">No active support tickets.</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="p-6 hover:bg-surface-elevated transition-colors flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 border rounded-sm shrink-0 flex items-center justify-center ${
                          ticket.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                          ticket.status === 'In Progress' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                          'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        }`}>
                          {ticket.status === 'Resolved' ? <CheckCircle2 className="w-5 h-5" /> : 
                           ticket.status === 'In Progress' ? <Clock className="w-5 h-5" /> : 
                           <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-mono text-zinc-500">{ticket.id}</span>
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm border ${
                              ticket.priority === 'Urgent' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                              ticket.priority === 'Normal' ? 'bg-surface-elevated border-surface-border text-zinc-400' :
                              'bg-surface-elevated border-surface-border text-zinc-500'
                            }`}>
                              {ticket.priority}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{ticket.department}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-content-primary group-hover:text-white transition-colors">{ticket.subject}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">{ticket.status}</div>
                        <div className="text-[10px] font-mono text-zinc-600">{ticket.date}</div>
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
          <div className="space-y-4">
            {BROADCASTS.map(msg => (
              <div key={msg.id} className="p-6 bg-surface-raised border border-surface-border rounded-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  msg.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                }`} />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">{msg.title}</h3>
                  <span className="text-[10px] font-mono text-zinc-500">{msg.date}</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      <Dialog open={isNewTicketOpen} onClose={() => setIsNewTicketOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-surface-base/95 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-lg bg-surface-elevated border border-surface-border shadow-2xl p-6 rounded-sm">
            <Dialog.Title className="text-sm font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-surface-border">
              <LifeBuoy className="w-4 h-4 text-indigo-400" />
              New Support Request
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">Subject</label>
                <input 
                  autoFocus
                  type="text" 
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-surface-base border border-surface-border text-white text-sm rounded-sm px-3 py-2 outline-none focus:border-indigo-500" 
                  placeholder="Brief summary of the issue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">Department</label>
                  <select 
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border text-white text-sm rounded-sm px-3 py-2 outline-none focus:border-indigo-500 appearance-none"
                  >
                    <option>General Support</option>
                    <option>Integrations</option>
                    <option>Calculations</option>
                    <option>Bug Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-surface-base border border-surface-border text-white text-sm rounded-sm px-3 py-2 outline-none focus:border-indigo-500 appearance-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-surface-base border border-surface-border text-white text-sm font-mono rounded-sm px-3 py-2 outline-none focus:border-indigo-500 h-32 resize-none" 
                  placeholder="Provide context or reproduction steps..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
                <button type="button" onClick={() => setIsNewTicketOpen(false)} className="px-4 py-2 text-[10px] font-mono font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
                  <Send className="w-3 h-3" />
                  Transmit
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
