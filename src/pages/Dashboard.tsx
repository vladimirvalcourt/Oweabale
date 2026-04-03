import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Plus, Activity, AlertCircle, TrendingUp, ShieldCheck, CreditCard, Wallet, Calendar, ArrowRight, Sparkles, Send, Flame, Crosshair, Terminal, SlidersHorizontal, ShieldAlert, Siren, X, Copy, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { useStore } from '../store/useStore';

const chartData = [
  { name: '1 Apr', balance: 18000 },
  { name: '8 Apr', balance: 19500 },
  { name: '15 Apr', balance: 18200 },
  { name: '22 Apr', balance: 21000 },
  { name: '29 Apr', balance: 20500 },
  { name: '6 May', balance: 23000 },
  { name: '13 May', balance: 24562 },
];

const mockCitations = [
  { id: 1, type: 'SPEEDING', jurisdiction: 'NY CITY', daysLeft: 3, amount: 150, penalty: 75, date: '12 OCT', citationNumber: 'NY-99281-A', paymentUrl: 'https://nyc.gov/payticket' },
  { id: 2, type: 'TOLL VIOLATION', jurisdiction: 'EZ-PASS NJ', daysLeft: 25, amount: 15, penalty: 10, date: '03 NOV', citationNumber: 'EZ-449102', paymentUrl: 'https://ezpassnj.com/pay' }
];

export default function Dashboard() {
  const { bills, debts, transactions, assets, subscriptions } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<typeof mockCitations[0] | null>(null);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const totalAssets = assets.reduce((acc, asset) => acc + asset.value, 0);
  const totalDebts = debts.reduce((acc, debt) => acc + debt.remaining, 0);
  const netWorth = totalAssets - totalDebts;
  
  const upcomingBills = bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextBill = upcomingBills.length > 0 ? upcomingBills[0] : null;

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const monthlySubscriptionCost = activeSubscriptions.reduce((acc, sub) => {
    return acc + (sub.frequency === 'Monthly' ? sub.amount : sub.amount / 12);
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#1C1C1C] rounded w-1/4"></div>
        <div className="bg-[#141414] rounded-lg border border-[#262626] p-8 h-40"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#141414] rounded-lg border border-[#262626] p-5 h-24"></div>
          ))}
        </div>
        <div className="bg-[#141414] rounded-lg border border-[#262626] h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Financial Overview</h1>
        </div>
        <div className="flex gap-3">
          <Link to="/bills/add" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
            <Plus className="w-4 h-4" />
            Add Bill
          </Link>
        </div>
      </div>

      {/* Net Worth Hero Section */}
      <div className="bg-[#141414] rounded-sm border border-[#262626] p-6 relative">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Total Net Worth</p>
            <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#262626] px-3 py-1 rounded-sm">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-mono text-zinc-300">Safe to Spend: <span className="text-emerald-400 font-bold">$2,450.00</span></span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-4">
            <h2 className="text-5xl font-bold tracking-tight text-[#FAFAFA] font-mono tabular-nums">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <span className="flex items-center text-sm font-mono text-[#22C55E]">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +5.2%
            </span>
          </div>
          
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-[#262626] pt-6">
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-zinc-600" /> Assets
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight text-[#FAFAFA] font-mono tabular-nums">${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-zinc-600" /> Debts
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight text-[#FAFAFA] font-mono tabular-nums">${totalDebts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-zinc-600" /> 30D Velocity
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight text-[#22C55E] font-mono tabular-nums">+$60/day</p>
            </div>
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-600" /> Burn Rate
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight text-red-400 font-mono tabular-nums">-$150/day</p>
            </div>
          </div>
        </div>
      </div>

      {/* Command Terminal */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-1 flex items-center gap-3 focus-within:border-zinc-500 transition-colors">
        <div className="bg-[#1C1C1C] px-3 py-2 text-xs font-mono text-zinc-500 uppercase tracking-widest border-r border-[#262626] flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" /> CMD
        </div>
        <input 
          type="text" 
          placeholder="Query debt timelines, simulate purchases, or analyze burn rate..." 
          className="bg-transparent border-none text-sm text-[#FAFAFA] w-full focus:ring-0 placeholder:text-zinc-600 font-mono outline-none"
          onKeyDown={(e) => { if(e.key === 'Enter') toast.success('Executing query...'); }}
        />
        <button 
          onClick={() => toast.success('Executing query...')}
          className="text-zinc-500 hover:text-white p-2 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Smart Insights & Next Best Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#141414] border border-[#262626] rounded-sm p-6 md:col-span-2 flex flex-col justify-center">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 border border-[#262626] flex items-center justify-center flex-shrink-0 bg-[#1C1C1C]">
              <AlertCircle className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#FAFAFA]">Next Best Action</h3>
              <p className="text-sm text-zinc-400 mt-2">
                You have an upcoming bill for <strong className="text-[#FAFAFA]">{nextBill?.biller || 'Utilities'}</strong> due soon. Executing this payment now maintains your positive 30-day velocity.
              </p>
              <button 
                onClick={() => toast.success('Payment initiated')}
                className="mt-5 px-4 py-2 bg-[#FAFAFA] hover:bg-zinc-200 text-[#0A0A0A] text-xs font-mono font-bold uppercase tracking-widest transition-colors focus:outline-none"
              >
                Execute Payment (${nextBill?.amount.toFixed(2) || '0.00'})
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-[#141414] rounded-sm border border-[#262626] p-6 flex flex-col justify-center relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Flame className="w-24 h-24 text-zinc-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#FAFAFA] flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-zinc-400" /> Debt Detonator
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 bg-[#1C1C1C] px-2 py-1 rounded-sm border border-[#262626]">
                  <SlidersHorizontal className="w-3 h-3" /> Avalanche
                </span>
                <span className="text-[10px] font-mono font-bold text-[#FAFAFA] bg-[#262626] px-2 py-1 rounded-sm">OCT 2026</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-[#262626] rounded-none overflow-hidden mb-3">
              <div className="h-full bg-zinc-300 w-[42%]"></div>
            </div>
            <div className="flex justify-between text-xs font-mono mb-5">
              <span className="text-zinc-500">42% PAID</span>
              <span className="text-zinc-500">TARGET DATE</span>
            </div>
            <p className="text-xs font-mono text-zinc-400 border-l-2 border-zinc-500 pl-3">
              Projected Interest Saved: <span className="text-[#FAFAFA]">$4,230</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Timeline Chart */}
        <div className="bg-[#141414] rounded-sm border border-[#262626] lg:col-span-2 flex flex-col">
          <div className="px-6 py-5 border-b border-[#262626] flex justify-between items-center">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#FAFAFA]">Cash Flow Projection</h3>
              <p className="text-xs font-mono text-zinc-500 mt-1">Estimated balance over the next 30 days</p>
            </div>
            <select className="text-xs font-mono bg-[#0A0A0A] border border-[#262626] text-zinc-200 rounded-sm focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 px-3 py-1.5 outline-none">
              <option>NEXT 30 DAYS</option>
              <option>NEXT 90 DAYS</option>
            </select>
          </div>
          <div className="p-6 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FAFAFA" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FAFAFA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', borderRadius: '4px', border: '1px solid #262626', color: '#FAFAFA', fontFamily: 'monospace', fontSize: '12px' }}
                  itemStyle={{ color: '#FAFAFA' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Projected Balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#FAFAFA" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Bills & Subscriptions */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#141414] rounded-sm border border-[#262626] flex flex-col">
            <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#FAFAFA]">Upcoming Obligations</h3>
              <Link to="/bills" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors">VIEW ALL</Link>
            </div>
            <div className="p-0">
              {/* Liquidity Gap Indicator */}
              <div className="bg-[#1C1C1C] border-b border-[#262626] px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500">Next Payday: <span className="text-emerald-400">In 4 Days</span></span>
                <span className="text-xs font-mono text-zinc-500">Bills Before Payday: <span className="text-[#FAFAFA]">$145.00</span></span>
              </div>
              {upcomingBills.length === 0 ? (
                <div className="p-6 text-center text-sm font-mono text-zinc-500">No upcoming obligations.</div>
              ) : (
                <ul className="divide-y divide-[#1F1F1F]">
                  {upcomingBills.slice(0, 3).map((bill) => (
                    <li key={bill.id} className="px-6 py-3 hover:bg-[#1C1C1C] transition-colors flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-mono text-zinc-500 w-12 text-center leading-tight">
                          {bill.dueDate.split('-')[2]}<br/>{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][parseInt(bill.dueDate.split('-')[1], 10) - 1]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#FAFAFA]">{bill.biller}</p>
                        </div>
                      </div>
                      <p className="text-sm font-mono text-[#FAFAFA] tabular-nums">${bill.amount.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-[#141414] rounded-sm border border-[#262626] flex flex-col">
            <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#FAFAFA] flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-zinc-400" /> Subscription Sniper
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-500 tabular-nums">${monthlySubscriptionCost.toFixed(2)}/MO</span>
              </div>
            </div>
            <div className="p-0">
              <div className="bg-[#1C1C1C] border-b border-[#262626] p-4 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-none bg-red-500 mt-1.5 shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#FAFAFA]">Netflix increased by $2.00</p>
                  <p className="text-xs font-mono text-zinc-500 mt-1">0 hours watched in 21 days.</p>
                  <button onClick={() => toast.success('Cancellation process started')} className="text-xs font-mono font-bold text-red-400 hover:text-red-300 mt-3 uppercase tracking-widest transition-colors">Execute Cancel</button>
                </div>
              </div>
              {activeSubscriptions.length === 0 ? (
                <div className="p-6 text-center text-sm font-mono text-zinc-500">No active subscriptions.</div>
              ) : (
                <ul className="divide-y divide-[#1F1F1F]">
                  {activeSubscriptions.slice(0, 3).map((sub) => (
                    <li key={sub.id} className="px-6 py-3 hover:bg-[#1C1C1C] transition-colors flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">{sub.name}</p>
                        <p className="text-xs font-mono text-zinc-500 mt-0.5">RENEWS {sub.nextBillingDate.toUpperCase()}</p>
                      </div>
                      <p className="text-sm font-mono text-[#FAFAFA] tabular-nums">${sub.amount.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Citation Sniper */}
          <div className={`bg-[#141414] rounded-sm border flex flex-col transition-all duration-500 ${mockCitations.some(c => c.daysLeft <= 7) ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.05)] animate-[pulse_3s_ease-in-out_infinite]' : 'border-[#262626]'}`}>
            <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#FAFAFA] flex items-center gap-2">
                <Siren className="w-3.5 h-3.5 text-rose-400" /> Citation Sniper
              </h3>
              <span className="text-[10px] font-mono text-rose-400 font-bold">{mockCitations.filter(c => c.daysLeft <= 7).length} URGENT</span>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-[#1F1F1F]">
                {mockCitations.map((citation) => (
                  <li key={citation.id} className="px-6 py-4 hover:bg-[#1C1C1C] transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-mono text-zinc-500 w-12 text-center leading-tight">
                          {citation.date.split(' ')[0]}<br/>{citation.date.split(' ')[1]}
                        </div>
                        <div>
                          <p className="text-sm font-mono font-medium text-[#FAFAFA]">{citation.type} | {citation.jurisdiction}</p>
                          <p className={`text-xs font-mono mt-1 ${citation.daysLeft <= 7 ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>
                            {citation.daysLeft} DAYS LEFT → +${citation.penalty} FEE
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-[#FAFAFA] tabular-nums">${citation.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => { setSelectedCitation(citation); setIsCitationModalOpen(true); }}
                        className="text-[10px] font-mono font-bold text-[#0A0A0A] bg-[#FAFAFA] hover:bg-zinc-300 px-3 py-1.5 uppercase tracking-widest transition-colors"
                      >
                        Resolve Citation
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Citation Resolution Modal */}
      <Dialog open={isCitationModalOpen} onClose={() => setIsCitationModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-sm bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#262626] flex justify-between items-center bg-[#1C1C1C]">
              <h2 className="text-sm font-mono font-bold text-[#FAFAFA] uppercase tracking-widest flex items-center gap-2">
                <Siren className="w-4 h-4 text-rose-400" /> Resolve Citation
              </h2>
              <button onClick={() => setIsCitationModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedCitation && (
              <div className="p-6">
                <div className="mb-6 bg-[#1C1C1C] border border-[#262626] p-4 rounded-sm">
                  <p className="text-[10px] font-mono text-zinc-500 mb-1 uppercase tracking-widest">Citation Details</p>
                  <p className="text-base font-mono font-bold text-[#FAFAFA]">{selectedCitation.type} | {selectedCitation.jurisdiction}</p>
                  <p className={`text-xs font-mono mt-2 ${selectedCitation.daysLeft <= 7 ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                    {selectedCitation.daysLeft} DAYS LEFT → +${selectedCitation.penalty} FEE
                  </p>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Citation Number</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={selectedCitation.citationNumber} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm px-3 py-2 text-sm font-mono text-[#FAFAFA] focus:outline-none" />
                      <button onClick={() => toast.success('Copied to clipboard')} className="bg-[#262626] hover:bg-[#333] text-white p-2 rounded-sm transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Payment Portal</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={selectedCitation.paymentUrl} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm px-3 py-2 text-sm font-mono text-[#FAFAFA] focus:outline-none" />
                      <a href={selectedCitation.paymentUrl} target="_blank" rel="noreferrer" className="bg-[#FAFAFA] hover:bg-zinc-300 text-[#0A0A0A] p-2 rounded-sm transition-colors flex items-center justify-center">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => { toast.success('Marked as resolved'); setIsCitationModalOpen(false); }}
                  className="w-full bg-emerald-500/10 border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 font-mono font-bold py-3 rounded-sm transition-colors uppercase tracking-widest text-xs"
                >
                  Mark as Paid
                </button>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
