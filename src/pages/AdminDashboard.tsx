import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Users, Database, Activity, ShieldCheck, ShieldAlert, Cpu, Network, ArrowLeft, Key, Zap, CheckCircle2, TrendingUp, Radio, LifeBuoy, Bot, Landmark, BookOpen, Clock, AlertTriangle, Coins } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [systemTime, setSystemTime] = useState(new Date());
  const [taxDeduction, setTaxDeduction] = useState('14600');
  const [taxBracket, setTaxBracket] = useState('37.0');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isPlaidEnabled, setIsPlaidEnabled] = useState(true);
  
  const [isSavingTax, setIsSavingTax] = useState(false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Live metrics from Supabase
  const metrics = [
    { label: "TOTAL USERS", value: profiles.length > 0 ? profiles.length.toLocaleString() : "—", status: "LIVE", color: "text-emerald-500" },
    { label: "RESPONSE TIME", value: "—", status: "MONITORING", color: "text-zinc-500" },
    { label: "LOGIN SUCCESS RATE", value: "—", status: "MONITORING", color: "text-zinc-500" },
    { label: "BANK SYNC ERRORS", value: "—", status: "MONITORING", color: "text-zinc-500" },
  ];

  const recentLogs: { time: string; level: string; message: string }[] = [];

  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
      if (data) {
        setTaxDeduction(data.tax_standard_deduction?.toString() || '14600');
        setTaxBracket(data.tax_top_bracket?.toString() || '37.0');
        setBroadcastMsg(data.broadcast_message || '');
        setIsMaintenance(data.maintenance_mode || false);
        setIsPlaidEnabled(data.plaid_enabled !== false);
      }
      
      const { data: profileDatas } = await supabase.from('profiles').select('*').limit(50);
      if (profileDatas) setProfiles(profileDatas);
    }
    loadSettings();
  }, []);

  const toggleMaintenance = async () => {
    const newValue = !isMaintenance;
    const { error } = await supabase.from('platform_settings').update({ maintenance_mode: newValue }).eq('id', 1);
    if (error) {
      toast.error("Failed to update Maintenance Mode.");
    } else {
      setIsMaintenance(newValue);
      toast.success(newValue ? "Maintenance Mode ENABLED. All traffic blocked." : "Maintenance Mode DISABLED. System online.");
    }
  };

  const togglePlaid = async () => {
    const newValue = !isPlaidEnabled;
    const { error } = await supabase.from('platform_settings').update({ plaid_enabled: newValue }).eq('id', 1);
    if (error) {
      toast.error("Failed to update Bank Syncing.");
    } else {
      setIsPlaidEnabled(newValue);
      toast.success(newValue ? "Plaid Bank Syncing restored globally." : "Plaid Bank Syncing terminated globally.");
    }
  };

  const handleSaveTax = async () => {
    setIsSavingTax(true);
    const deductionNum = Number(taxDeduction.replace(/[^0-9.]/g, ''));
    const bracketNum = Number(taxBracket.replace(/[^0-9.]/g, ''));
    
    const { error } = await supabase.from('platform_settings').update({
      tax_standard_deduction: deductionNum,
      tax_top_bracket: bracketNum
    }).eq('id', 1);

    setIsSavingTax(false);
    if (error) {
      toast.error("Failed to update: You do not have permissions or the database rejected it.");
    } else {
      toast.success("Global tax algorithm updated safely.");
    }
  };

  const handleSendBroadcast = async () => {
    setIsSavingBroadcast(true);
    const { error } = await supabase.from('platform_settings').update({
      broadcast_message: broadcastMsg.trim() === '' ? null : broadcastMsg
    }).eq('id', 1);
    
    setIsSavingBroadcast(false);
    if (error) {
      toast.error("Failed to push broadcast.");
    } else {
      toast.success(broadcastMsg.trim() === '' ? "Broadcast cleared from all screens." : "Broadcast published globally.");
    }
  };

  const handleAdminAction = async (action: 'ban' | 'unban' | 'delete', targetUserId: string) => {
    toast.loading(`Executing ${action}...`, { id: 'admin-action' });
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action, targetUserId }
    });
    
    if (error) {
      toast.error(`Admin Action Failed: ${error.message}`, { id: 'admin-action' });
    } else {
      toast.success(data?.message || `Successfully executed ${action}.`, { id: 'admin-action' });
      if (action === 'delete') {
         setProfiles(profiles.filter(p => p.id !== targetUserId));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono flex flex-col p-4 sm:p-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl text-white font-bold tracking-widest">Admin Dashboard</h1>
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Platform Owner Controls</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-sm font-bold text-emerald-500">{systemTime.toLocaleTimeString()}</p>
          <Link to="/" className="text-xs text-zinc-500 hover:text-white mt-2 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Main Site
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        
        {/* Left Column: Metrics & Services */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m, i) => (
              <motion.div 
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0A0A0A] border border-white/10 p-5 rounded-sm relative overflow-hidden group hover:border-white/20 transition-colors"
              >
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/20" />
                <p className="text-[10px] text-zinc-500 mb-2">{m.label}</p>
                <p className={`text-2xl font-bold mb-1 ${m.color}`}>{m.value}</p>
                <p className="text-[9px] uppercase tracking-widest opacity-80">{m.status}</p>
              </motion.div>
            ))}
          </div>

          {/* Infrastructure Health */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6">
            <h2 className="text-xs font-bold text-zinc-400 mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> System Health Status
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Database */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs flex items-center gap-2"><Database className="w-3.5 h-3.5 text-zinc-500"/> Main Database</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="space-y-2 text-[11px] text-zinc-500">
                  <div className="flex justify-between"><span>Processor Speed</span><span className="text-white">12% busy</span></div>
                  <div className="flex justify-between"><span>Memory Used</span><span className="text-white">4.1 / 16 GB</span></div>
                  <div className="flex justify-between"><span>Storage Speed</span><span className="text-white">8 MB/s</span></div>
                  <div className="w-full bg-white/5 h-1 mt-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[25%]" />
                  </div>
                </div>
              </div>

              {/* Edge Functions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-zinc-500"/> Background Processing</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="space-y-2 text-[11px] text-zinc-500">
                  <div className="flex justify-between"><span>Tasks per minute</span><span className="text-white">342</span></div>
                  <div className="flex justify-between"><span>Average Wait Time</span><span className="text-amber-500">850ms</span></div>
                  <div className="flex justify-between"><span>Delayed Starts</span><span className="text-white">12</span></div>
                  <div className="w-full bg-white/5 h-1 mt-1 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[70%]" />
                  </div>
                </div>
              </div>

              {/* Network / WAF */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs flex items-center gap-2"><Network className="w-3.5 h-3.5 text-zinc-500"/> Network Firewall</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="space-y-2 text-[11px] text-zinc-500">
                  <div className="flex justify-between"><span>Incoming Data</span><span className="text-white">2.4 Mbps</span></div>
                  <div className="flex justify-between"><span>Outgoing Data</span><span className="text-white">1.1 Mbps</span></div>
                  <div className="flex justify-between"><span>Blocked Hackers</span><span className="text-white">44 IPs</span></div>
                  <div className="w-full bg-white/5 h-1 mt-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[15%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Maintenance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 p-3 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-all text-left">
              Force Global Sync Now
            </button>
            <button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 p-3 rounded-sm text-[11px] uppercase tracking-wider transition-all text-left">
              Clear Website Memory
            </button>
            <button 
              onClick={togglePlaid}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 p-3 rounded-sm text-[11px] uppercase tracking-wider transition-all text-left">
              {isPlaidEnabled ? "Turn off Bank Syncing" : "Turn on Bank Syncing"}
            </button>
            <button 
              onClick={toggleMaintenance}
              className={`p-3 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-all text-left flex justify-between items-center ${isMaintenance ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30'}`}>
              <span>{isMaintenance ? "Disable Maintenance" : "Enable Maintenance"}</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Advanced Admin Modules Layer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SaaS Revenue & MRR */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-indigo-500/50 flex flex-col">
              <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" /> Business Overview
              </h2>
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Monthly Revenue</p>
                  <p className="text-xl font-bold text-white">— <span className="text-[11px] text-zinc-600 font-normal">No billing integration yet</span></p>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-zinc-500">Total Accounts</span>
                    <span className="text-white">{profiles.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Global System Broadcasts */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-amber-500/50 flex flex-col">
              <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4" /> Message All Users
              </h2>
              <div className="flex-1 flex flex-col">
                <p className="text-[10px] text-zinc-500 mb-2">Show a red warning banner to everyone on the app right now.</p>
                <textarea 
                  className="w-full bg-black border border-white/10 p-2 text-[11px] text-white rounded-sm focus:outline-none focus:border-amber-500 resize-none h-16 mb-3 placeholder-zinc-700"
                  placeholder="e.g., 'Expected downtime in 15 minutes.'"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                ></textarea>
                <button 
                  onClick={handleSendBroadcast}
                  disabled={isSavingBroadcast}
                  className="w-full mt-auto bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 p-2 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-colors disabled:opacity-50">
                  {isSavingBroadcast ? "Sending..." : "Send Message Now"}
                </button>
              </div>
            </div>

            {/* AI Risk Flags & Support */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm border-t-2 border-t-rose-500/50 flex flex-col">
              <div className="p-5 border-b border-white/10">
                <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-1">
                  <Bot className="w-4 h-4" /> Security Warnings
                </h2>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">No flags detected</span>
                </div>
              </div>
              <div className="p-5 flex-1">
                <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-3">
                  <LifeBuoy className="w-4 h-4" /> User Support Requests
                </h2>
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-600">No open support tickets.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Oweable Financial Core Overrides */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Tax Engine */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-emerald-500/50">
              <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-4">
                <Landmark className="w-4 h-4" /> Platform Tax Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Standard Deduction Amount</label>
                  <input type="text" value={taxDeduction} onChange={(e) => setTaxDeduction(e.target.value)} className="w-full bg-black border border-white/10 px-3 py-2 text-[11px] text-emerald-400 font-mono rounded-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Highest Tax Bracket %</label>
                  <input type="text" value={taxBracket} onChange={(e) => setTaxBracket(e.target.value)} className="w-full bg-black border border-white/10 px-3 py-2 text-[11px] text-emerald-400 font-mono rounded-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <button 
                  onClick={handleSaveTax}
                  disabled={isSavingTax}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 py-2 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-all disabled:opacity-50">
                  {isSavingTax ? "Saving..." : "Save Tax Settings"}
                </button>
              </div>
            </div>

            {/* Plaid Health */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-indigo-500/50">
              <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4" /> Bank Connection Status
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-sm border border-white/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 ${isPlaidEnabled ? 'text-amber-500' : 'text-rose-500'}`} />
                    <span className={`text-[11px] font-bold ${isPlaidEnabled ? 'text-amber-400' : 'text-rose-400'}`}>Plaid Global API</span>
                  </div>
                  <button onClick={togglePlaid} className={`text-[10px] px-2 py-1 rounded-sm font-bold transition-colors ${isPlaidEnabled ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white'}`}>
                     {isPlaidEnabled ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600">Individual bank status requires live Plaid webhook integration.</p>
              </div>
            </div>

            {/* AI Burn & NLP */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-cyan-500/50 flex flex-col">
              <div className="mb-4">
                <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4" /> Smart Feature Daily Cost
                </h2>
                <div className="flex items-end justify-between border-b border-white/5 pb-2">
                  <span className="text-xl font-mono text-cyan-400">— <span className="text-[10px] text-zinc-500">not connected</span></span>
                  <span className="text-[10px] text-zinc-500">Limit: $50/day</span>
                </div>
                <div className="w-full bg-white/5 h-1 mt-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full w-0" />
                </div>
              </div>

              <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mt-4 mb-2">
                <BookOpen className="w-4 h-4" /> Fix Incorrect Categories
              </h2>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Word (e.g. Starbucks)" className="w-1/2 bg-black border border-white/10 px-2 py-1.5 text-[10px] text-white font-mono rounded-sm focus:outline-none focus:border-cyan-500" />
                <input type="text" placeholder="Category (e.g. Food)" className="w-1/2 bg-black border border-white/10 px-2 py-1.5 text-[10px] text-white font-mono rounded-sm focus:outline-none focus:border-cyan-500" />
              </div>
              <button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-1.5 rounded-sm text-[10px] uppercase font-bold transition-all">
                Save Category Fix
              </button>
            </div>
            
            {/* Universal Import Queue */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 flex items-center justify-between lg:col-span-3 border-t-2 border-t-zinc-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-full">
                  <Clock className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-400">PENDING TRANSACTIONS TO PROCESS</h2>
                  <p className="text-[10px] text-zinc-500 mt-1">Number of transactions waiting to be added to user accounts.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-white tracking-widest">—</p>
                <p className="text-[10px] text-zinc-600 font-bold uppercase">Not connected</p>
              </div>
            </div>

          </div>

          {/* User Management Module */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> User Controls List
              </h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Search Email address..." 
                  className="bg-black border border-white/10 px-3 py-1.5 text-[11px] rounded-sm focus:outline-none focus:border-indigo-500 w-48 text-white placeholder-zinc-700" 
                />
              </div>
            </div>
            
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500">
                  <th className="pb-3 px-2 font-normal">Account</th>
                  <th className="pb-3 px-2 font-normal">Plan</th>
                  <th className="pb-3 px-2 font-normal">Status</th>
                  <th className="pb-3 px-2 font-normal">Last Login</th>
                  <th className="pb-3 px-2 font-normal text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {profiles.map(user => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-3 px-2">{user.email || user.id.slice(0,8)}</td>
                    <td className="py-3 px-2"><span className="text-zinc-500 font-bold">Standard</span></td>
                    <td className="py-3 px-2"><span className="text-emerald-500">Live</span></td>
                    <td className="py-3 px-2">Active</td>
                    <td className="py-3 px-2 text-right">
                      <button 
                         onClick={() => handleAdminAction('ban', user.id)}
                         className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-2 py-1 rounded-sm font-bold transition-colors">
                        Ban User
                      </button>
                      <button 
                         onClick={() => handleAdminAction('delete', user.id)}
                         className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 ml-2 rounded-sm font-bold transition-colors">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Terminal Stream */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-sm flex flex-col h-full overflow-hidden relative">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 xl:sticky top-0 sticky">
            <h2 className="text-[11px] font-bold text-zinc-400 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> LIVE ACTIVITY LOG
            </h2>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-3 font-mono text-[11px]">
            {recentLogs.map((log, idx) => (
              <div key={idx} className="flex gap-3 items-start border-l-2 border-white/5 pl-3 py-1">
                <span className="text-zinc-600 shrink-0">{log.time}</span>
                <span className={`shrink-0 font-bold ${
                  log.level === 'ERROR' ? 'text-rose-500' : 
                  log.level === 'WARN' ? 'text-amber-500' : 'text-indigo-400'
                }`}>[{log.level}]</span>
                <span className="text-zinc-300 break-words">{log.message}</span>
              </div>
            ))}
            
            <div className="flex gap-3 items-start border-l-2 border-emerald-500 pl-3 py-1 animate-pulse">
              <span className="text-emerald-500 shrink-0">Now</span>
              <span className="text-emerald-500 shrink-0 font-bold">[SYS]</span>
              <span className="text-emerald-400">Waiting for new activity...</span>
            </div>
          </div>
          
          <div className="p-3 border-t border-white/5 bg-black/40">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">{">"}</span>
              <input 
                type="text" 
                placeholder="Search server logs..."
                className="bg-transparent border-none w-full text-[11px] text-white focus:outline-none placeholder-zinc-700" 
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
