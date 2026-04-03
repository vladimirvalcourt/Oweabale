import React, { useState } from 'react';
import { 
  Receipt, CreditCard, AlertTriangle, ShieldAlert, 
  Zap, ArrowRight, Home, Car, Smartphone, Wifi, 
  Activity, MoreHorizontal, FileText, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

type ObligationType = 'recurring' | 'debt' | 'ambush';

interface Obligation {
  id: string;
  name: string;
  type: ObligationType;
  subType: string;
  dueDate: string;
  amount: number;
  icon: React.ElementType;
  status?: 'active' | 'resolved';
}

const MOCK_OBLIGATIONS: Obligation[] = [
  { id: '1', name: 'Rent - Downtown Apt', type: 'recurring', subType: 'Fixed Bill', dueDate: '2026-04-01', amount: 2400.00, icon: Home },
  { id: '2', name: 'Chase Sapphire Reserve', type: 'debt', subType: 'Credit Card', dueDate: '2026-04-15', amount: 4500.00, icon: CreditCard },
  { id: '3', name: 'Speeding Ticket - I-95', type: 'ambush', subType: 'Citation', dueDate: '2026-04-05', amount: 150.00, icon: ShieldAlert },
  { id: '4', name: 'Verizon Wireless', type: 'recurring', subType: 'Fixed Bill', dueDate: '2026-04-12', amount: 120.00, icon: Smartphone },
  { id: '5', name: 'Auto Loan - Tesla', type: 'debt', subType: 'Installment', dueDate: '2026-04-20', amount: 18500.00, icon: Car },
  { id: '6', name: 'Comcast Internet', type: 'recurring', subType: 'Fixed Bill', dueDate: '2026-04-18', amount: 89.99, icon: Wifi },
  { id: '7', name: 'Unexpected ER Visit', type: 'ambush', subType: 'Medical', dueDate: '2026-04-08', amount: 850.00, icon: Activity },
  { id: '8', name: 'Student Loan - Navient', type: 'debt', subType: 'Installment', dueDate: '2026-04-28', amount: 32000.00, icon: FileText },
  { id: '9', name: 'Electric Utility', type: 'recurring', subType: 'Variable Bill', dueDate: '2026-04-22', amount: 145.50, icon: Zap },
  { id: '10', name: 'HOA Special Assessment', type: 'ambush', subType: 'One-Off', dueDate: '2026-04-09', amount: 500.00, icon: AlertTriangle },
];

type FilterTab = 'all' | 'recurring' | 'debt' | 'ambush';

export default function Obligations() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredObligations = MOCK_OBLIGATIONS.filter(ob => {
    if (activeTab === 'all') return true;
    return ob.type === activeTab;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const totalMonthlyBurn = MOCK_OBLIGATIONS.filter(o => o.type === 'recurring').reduce((sum, o) => sum + o.amount, 0);
  const activePrincipal = MOCK_OBLIGATIONS.filter(o => o.type === 'debt').reduce((sum, o) => sum + o.amount, 0);
  
  // Ambushes due in < 7 days
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  const urgentAmbushes = MOCK_OBLIGATIONS.filter(o => {
    if (o.type !== 'ambush') return false;
    const dueDate = new Date(o.dueDate);
    return dueDate >= today && dueDate <= nextWeek;
  }).reduce((sum, o) => sum + o.amount, 0);

  const handleAction = (type: ObligationType, name: string) => {
    if (type === 'debt') toast.success(`Initiating payoff for ${name}`);
    if (type === 'recurring') toast.success(`Reviewing ${name}`);
    if (type === 'ambush') toast.success(`Resolving ${name} immediately`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] mb-2">Obligations</h1>
        <p className="text-zinc-400 text-sm">Universal ledger for all financial liabilities.</p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1C1C1C] border border-[#262626] p-6 rounded-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">Total Monthly Burn</span>
          </div>
          <p className="text-3xl font-mono text-emerald-400 tracking-tight">
            ${totalMonthlyBurn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-[#1C1C1C] border border-[#262626] p-6 rounded-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">Active Principal</span>
          </div>
          <p className="text-3xl font-mono text-emerald-400 tracking-tight">
            ${activePrincipal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-[#1C1C1C] border border-[#262626] p-6 rounded-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center gap-2 text-zinc-400 mb-4 relative z-10">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-mono uppercase tracking-wider">Urgent Ambushes</span>
          </div>
          <p className={`text-3xl font-mono tracking-tight relative z-10 ${urgentAmbushes > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            ${urgentAmbushes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Universal Filter System */}
      <div className="border-b border-[#262626]">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'all' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
            {activeTab === 'all' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></span>}
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'recurring' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Recurring (Bills)
            {activeTab === 'recurring' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></span>}
          </button>
          <button
            onClick={() => setActiveTab('debt')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'debt' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Ticking Clocks (Debt)
            {activeTab === 'debt' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></span>}
          </button>
          <button
            onClick={() => setActiveTab('ambush')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'ambush' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Ambushes (One-Offs)
            {activeTab === 'ambush' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></span>}
          </button>
        </div>
      </div>

      {/* Master Ledger (Data Table) */}
      <div className="bg-[#1C1C1C] border border-[#262626] rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] bg-[#141414]">
                <th className="px-6 py-4 text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">Obligation</th>
                <th className="px-6 py-4 text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">Type</th>
                <th className="px-6 py-4 text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">Due Date</th>
                <th className="px-6 py-4 text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {filteredObligations.map((ob) => {
                const Icon = ob.icon;
                const isPastDue = new Date(ob.dueDate) < new Date();
                
                return (
                  <tr key={ob.id} className="hover:bg-[#222222] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-[#141414] border border-[#262626] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-zinc-400" />
                        </div>
                        <span className="font-medium text-[#FAFAFA]">{ob.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-zinc-400">{ob.subType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-mono ${isPastDue ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {ob.dueDate}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-mono text-emerald-400">
                        ${ob.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {ob.type === 'debt' && (
                        <button 
                          onClick={() => handleAction(ob.type, ob.name)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#1C1C1C]"
                        >
                          TARGET PAYOFF
                        </button>
                      )}
                      {ob.type === 'recurring' && (
                        <button 
                          onClick={() => handleAction(ob.type, ob.name)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-transparent border border-[#262626] hover:border-zinc-500 text-zinc-300 text-xs font-bold tracking-wider rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#1C1C1C]"
                        >
                          REVIEW/CANCEL
                        </button>
                      )}
                      {ob.type === 'ambush' && (
                        <button 
                          onClick={() => handleAction(ob.type, ob.name)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-transparent border border-rose-500/50 hover:border-rose-500 hover:bg-rose-500/10 text-rose-400 text-xs font-bold tracking-wider rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-[#1C1C1C]"
                        >
                          RESOLVE NOW
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredObligations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-500/50" />
                      <p className="text-sm">No obligations found for this filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
