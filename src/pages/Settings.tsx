import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Lock, Shield, Smartphone, CreditCard as CreditCardIcon, CheckCircle2, Plus, X, Building2, Loader2, Search, Download, Fingerprint, EyeOff, FileSpreadsheet, FileText, User, Mail, BellRing, BrainCircuit, Palette, Globe, PieChart } from 'lucide-react';
import { cn } from '../lib/utils';
import { CollapsibleModule } from '../components/CollapsibleModule';
import BankConnection from '../components/BankConnection';

type Tab = 'profile' | 'notifications' | 'security' | 'billing' | 'financial' | 'privacy' | 'integrations';

export default function Settings() {
  const user = useStore((state) => state.user);
  const updateUser = useStore((state) => state.updateUser);
  const deleteAccount = useStore((state) => state.deleteAccount);

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateUser(formData);
    toast.success('Profile updated successfully');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleDeleteAccount = () => {
    deleteAccount();
    setIsDeleteDialogOpen(false);
    toast.success('Account deleted successfully');
  };

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'security', name: 'Security' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'financial', name: 'Preferences' },
    { id: 'billing', name: 'Billing' },
    { id: 'integrations', name: 'Integrations' },
    { id: 'privacy', name: 'Data & Privacy' },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Settings</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mt-1">Account configuration & preferences</p>
        </div>
        <div className="flex items-center text-[10px] font-mono text-zinc-400 bg-surface-raised px-3 py-1.5 rounded-sm border border-surface-border uppercase tracking-widest">
          <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
          Secure connection
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-sm transition-all border border-transparent",
                  activeTab === tab.id
                    ? "bg-surface-elevated text-content-primary border-surface-border shadow-lg shadow-black/20"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-surface-raised"
                )}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <>
              {/* Profile Section */}
              <CollapsibleModule 
                title="Personal Information" 
                icon={User}
                extraHeader={<span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{user.firstName} {user.lastName} VERIFIED</span>}
              >
                <div className="-mx-6 -my-6 p-6 bg-surface-base">
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex items-center gap-6 pb-6 border-b border-surface-border">
                      <div className="h-16 w-16 rounded-sm bg-surface-elevated border border-surface-border flex items-center justify-center overflow-hidden shadow-inner shrink-0 relative">
                        {user.avatar ? (
                          <img src={user.avatar} alt="Identifier" className="h-full w-full object-cover" data-no-invert />
                        ) : (
                          <span className="text-xl font-mono font-bold text-zinc-400">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="inline-block cursor-pointer px-4 py-1.5 bg-transparent border border-surface-border rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 hover:bg-surface-elevated transition-colors relative">
                          Update Picture
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                updateUser({ avatar: ev.target?.result as string });
                                toast.success('Profile picture updated');
                              };
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }} />
                        </label>
                        <p className="text-[9px] font-mono text-zinc-600 shadow-none uppercase tracking-widest block pt-2">User ID: OWE_{user.id?.substring(0, 8)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 pt-4">
                      <div className="sm:col-span-3">
                        <label htmlFor="firstName" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">First Name</label>
                        <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} required className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none" />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="lastName" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Last Name</label>
                        <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} required className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none" />
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="email" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Email Address</label>
                        <input type="email" id="email" value={formData.email} onChange={handleChange} required className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none" />
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="phone" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Phone Number</label>
                        <input type="tel" id="phone" placeholder="+1 (555) 000-0000" className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none" />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="timezone" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Timezone</label>
                        <select id="timezone" className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none appearance-none">
                          <option>Pacific Time (PT)</option>
                          <option>Eastern Time (ET)</option>
                          <option>Central Time (CT)</option>
                          <option>Greenwich Mean Time (GMT)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="language" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Language</label>
                        <select id="language" className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none appearance-none">
                          <option>English (US)</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>German</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                      <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors shadow-lg shadow-indigo-500/10">
                        Commit Session
                      </button>
                    </div>
                  </form>
                </div>
              </CollapsibleModule>

              {/* Danger Zone moved to Data & Privacy */}
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <CollapsibleModule title="Password" icon={Lock} defaultOpen={true}>
                <p className="text-sm text-zinc-400 mb-6">Ensure your account is using a long, random password to stay secure.</p>
                <form className="space-y-4 max-w-md" onSubmit={(e) => { e.preventDefault(); toast.success('Password updated successfully'); e.currentTarget.reset(); }}>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Current Password</label>
                    <input type="password" required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">New Password</label>
                    <input type="password" required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Confirm Password</label>
                    <input type="password" required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors" />
                  </div>
                  <div className="pt-2">
                    <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500">
                      Update Password
                    </button>
                  </div>
                </form>
              </CollapsibleModule>

              <CollapsibleModule title="Two-Factor Authentication" icon={Shield} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Add additional security to your account using two-factor authentication.</p>
                <div className="flex items-center justify-between border border-surface-border rounded-sm p-4 bg-surface-elevated/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-surface-border rounded-full flex items-center justify-center bg-surface-raised">
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">2FA is enabled</p>
                      <p className="text-sm text-zinc-500">Authenticator App</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => toast.success('Recovery codes generated')} className="px-4 py-2 bg-transparent border border-surface-border rounded-sm text-sm font-medium text-zinc-300 hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500">
                      Recovery Codes
                    </button>
                    <button onClick={() => toast.success('2FA settings opened')} className="px-4 py-2 bg-transparent border border-surface-border rounded-sm text-sm font-medium text-zinc-300 hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500">
                      Manage
                    </button>
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Biometric Authentication" icon={Fingerprint} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Require FaceID or TouchID when opening the application.</p>
                <div className="flex items-center justify-between border border-surface-border rounded-sm p-4 bg-surface-elevated/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">App Lock</p>
                      <p className="text-xs text-zinc-500">Currently disabled</p>
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      onChange={(e) => toast.success(e.target.checked ? 'Biometrics enabled' : 'Biometrics disabled')}
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Active Sessions" icon={Smartphone} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Manage and log out your active sessions on other browsers and devices.</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border border-surface-border bg-surface-elevated/50 rounded-sm">
                    <div className="flex items-center gap-4">
                      <Smartphone className="w-6 h-6 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-content-primary">MacBook Pro - Chrome</p>
                        <p className="text-xs text-zinc-500">San Francisco, CA • Active now</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#22C55E] border border-surface-border px-2 py-1 rounded-full bg-surface-raised">Current</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-surface-border bg-surface-elevated/50 rounded-sm">
                    <div className="flex items-center gap-4">
                      <Smartphone className="w-6 h-6 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-content-primary">iPhone 13 - Safari</p>
                        <p className="text-xs text-zinc-500">San Francisco, CA • Last active 2 hours ago</p>
                      </div>
                    </div>
                    <button onClick={() => toast.success('Session logged out')} className="text-sm font-medium text-[#EF4444] hover:text-[#DC2626] bg-surface-raised px-3 py-1.5 rounded-sm border border-surface-border">Log out</button>
                  </div>
                </div>
              </CollapsibleModule>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <CollapsibleModule 
                title="Subscription Plan" 
                icon={Building2} 
                defaultOpen={true}
                extraHeader={<span className="inline-flex items-center text-[10px] font-mono font-bold text-zinc-400 bg-surface-raised px-2.5 py-1 rounded-sm border border-surface-border uppercase tracking-widest">The Tracker</span>}
              >
                <p className="text-sm text-zinc-400 mb-6">You are currently on the Free tier.</p>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-content-primary font-bold flex items-center gap-2">
                      Upgrade to The Arsenal
                    </h4>
                    <p className="text-sm text-indigo-200/70 mt-1 max-w-md">
                      Unlock the Debt Detonator, Subscription Sniper, and automatic account syncing.
                    </p>
                  </div>
                  <button onClick={() => toast.success('Redirecting to upgrade...')} className="shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-sm font-bold transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    Upgrade Now
                  </button>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Billing History" icon={Download} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">View and download your previous invoices.</p>
                <div className="border border-surface-border rounded-sm overflow-hidden">
                  <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-surface-elevated border-b border-surface-border text-[10px] font-mono uppercase tracking-widest text-content-primary">
                      <tr>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Amount</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium text-right">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      <tr className="hover:bg-surface-elevated/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">Mar 15, 2026</td>
                        <td className="px-6 py-4 font-mono text-content-primary tabular-nums">$0.00</td>
                        <td className="px-6 py-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold">Paid</span></td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-zinc-500 hover:text-white transition-colors bg-surface-raised border border-surface-border p-2 rounded-sm"><Download className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                      <tr className="hover:bg-surface-elevated/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">Feb 15, 2026</td>
                        <td className="px-6 py-4 font-mono text-content-primary tabular-nums">$0.00</td>
                        <td className="px-6 py-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold">Paid</span></td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-zinc-500 hover:text-white transition-colors bg-surface-raised border border-surface-border p-2 rounded-sm"><Download className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Payment Methods" icon={CreditCardIcon} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Manage payment methods used for your subscriptions.</p>
                <div className="border border-surface-border rounded-sm p-4 flex items-center justify-between mb-4 bg-surface-elevated/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-surface-raised rounded-sm flex items-center justify-center border border-surface-border">
                      <CreditCardIcon className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">Visa ending in 4242</p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500">Expires 12/2028</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-content-primary bg-surface-border px-2 py-1 rounded-sm">Default</span>
                </div>
                <button onClick={() => toast.success('Add payment method opened')} className="text-sm font-medium text-content-primary hover:text-white transition-colors bg-surface-elevated px-4 py-2 border border-surface-border rounded-sm focus:outline-none">
                  + Add Payment Method
                </button>
              </CollapsibleModule>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <CollapsibleModule title="Email Notifications" icon={Mail} defaultOpen={true}>
                <p className="text-sm text-zinc-400 mb-6">Choose what updates you want to receive via email.</p>
                <div className="space-y-6">
                  {[
                    { id: 'bill-reminders', label: 'Bill Reminders', desc: 'Get notified 3 days before a bill is due.', defaultChecked: true },
                    { id: 'weekly-summary', label: 'Weekly Summary', desc: 'Receive a weekly overview of your spending and upcoming bills.', defaultChecked: true },
                    { id: 'new-login', label: 'New Device Login', desc: 'Security alerts when your account is accessed from a new device.', defaultChecked: true },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                        <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Preference updated')}
                          className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleModule>
              
              <CollapsibleModule title="Push Notifications" icon={BellRing} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Manage notifications delivered directly to your device.</p>
                <div className="space-y-6">
                  {[
                    { id: 'push-reminders', label: 'Due Date Alerts', desc: 'Immediate alerts on the day a bill is due.', defaultChecked: true },
                    { id: 'push-payments', label: 'Payment Confirmations', desc: 'Get notified when a payment is successfully recorded.', defaultChecked: false },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                        <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Preference updated')}
                          className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Smart Alerts (The Arsenal)" icon={BrainCircuit} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Advanced notifications powered by our algorithms.</p>
                <div className="space-y-6">
                  {[
                    { id: 'sniper-increase', label: 'Subscription Sniper: Price Hikes', desc: 'Alert me instantly if a subscription price increases.', defaultChecked: true },
                    { id: 'sniper-renewal', label: 'Subscription Sniper: Auto-Renewals', desc: 'Alert me 7 days before an annual subscription renews.', defaultChecked: true },
                    { id: 'detonator-milestone', label: 'Debt Detonator: Milestones', desc: 'Celebrate when I pay off 25%, 50%, 75%, and 100% of a debt.', defaultChecked: true },
                    { id: 'detonator-rate', label: 'Debt Detonator: Rate Changes', desc: 'Alert me if a variable interest rate changes.', defaultChecked: true },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                        <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Smart alert updated')}
                          className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleModule>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6">
              <CollapsibleModule title="Appearance" icon={Palette} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Customize how Oweable looks on your device.</p>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Theme</label>
                    <select 
                      value={user.theme || 'Dark'}
                      onChange={(e) => updateUser({ theme: e.target.value })}
                      className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none cursor-pointer"
                    >
                      <option value="Dark">Dark (Default)</option>
                      <option value="Light">Light Mode</option>
                    </select>
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Currency & Formatting" icon={Globe} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Set your preferred currency and date format.</p>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Primary Currency</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>CAD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Date Format</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Fiscal Year Start</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
                      <option>January</option>
                      <option>April</option>
                      <option>July</option>
                      <option>October</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Default Dashboard View</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
                      <option>Net Worth Overview</option>
                      <option>Upcoming Bills</option>
                      <option>Debt Detonator Timeline</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => toast.success('Preferences saved')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500">
                      Save Preferences
                    </button>
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Budget Limits" icon={PieChart} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Set global budget limits to receive alerts when you're close to overspending.</p>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Monthly Spending Limit</label>
                    <div className="mt-1 relative rounded-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-zinc-500 sm:text-sm">$</span>
                      </div>
                      <input type="number" defaultValue={5000} className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm py-2 border transition-colors" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => toast.success('Budget limits updated')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500">
                      Update Limits
                    </button>
                  </div>
                </div>
              </CollapsibleModule>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <BankConnection />

              <CollapsibleModule title="Tax & Export" icon={FileText} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Connect external services for seamless tax preparation and reporting.</p>
                <div className="space-y-4">
                  <div className="border border-surface-border rounded-sm p-4 flex items-center justify-between bg-surface-elevated/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-content-primary">TurboTax Integration</p>
                        <p className="text-xs text-zinc-500">Export Tax Fortress data directly</p>
                      </div>
                    </div>
                    <button onClick={() => toast.success('TurboTax integration initiated')} className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 hover:text-white bg-surface-raised border border-surface-border hover:bg-surface-elevated px-3 py-1.5 rounded-sm transition-colors">
                      Connect
                    </button>
                  </div>
                  <div className="border border-surface-border rounded-sm p-4 flex items-center justify-between bg-surface-elevated/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-content-primary">Google Sheets Sync</p>
                        <p className="text-xs text-zinc-500">Live sync transactions and balances</p>
                      </div>
                    </div>
                    <button onClick={() => toast.success('Google Sheets sync initiated')} className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 hover:text-white bg-surface-raised border border-surface-border hover:bg-surface-elevated px-3 py-1.5 rounded-sm transition-colors">
                      Connect
                    </button>
                  </div>
                </div>
              </CollapsibleModule>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <CollapsibleModule title="Privacy Mode" icon={EyeOff} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Control visibility of sensitive information.</p>
                <div className="flex items-center justify-between border border-surface-border rounded-sm p-4 bg-surface-elevated/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center">
                      <EyeOff className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">Hide Balances</p>
                      <p className="text-xs text-zinc-500">Blur all monetary values until hovered</p>
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      onChange={(e) => toast.success(e.target.checked ? 'Privacy mode enabled' : 'Privacy mode disabled')}
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Data Export" icon={Download} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Manage your personal data and privacy settings.</p>
                <div className="space-y-6">
                  <div className="border border-surface-border rounded-sm p-4 bg-surface-elevated/50">
                    <h4 className="text-sm font-medium text-content-primary">Export your data</h4>
                    <p className="text-xs text-zinc-500 mt-1 mb-4">Download a copy of all your financial data, including bills, debts, and transactions in CSV format.</p>
                    <button onClick={() => toast.success('Data export started. You will receive an email shortly.')} className="px-4 py-2 bg-surface-raised border border-surface-border rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest text-content-primary hover:bg-surface-border transition-colors focus:outline-none">
                      Export Data
                    </button>
                  </div>
                  <div className="pt-6 border-t border-surface-border">
                    <h4 className="text-sm font-medium text-content-primary">Privacy Policy</h4>
                    <p className="text-xs text-zinc-500 mt-1">We use bank-grade encryption to protect your data. We never sell your personal financial information to third parties. Read our full <a href="#" className="text-indigo-500 hover:underline">Privacy Policy</a>.</p>
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Danger Zone" icon={AlertTriangle} defaultOpen={false} className="border-[#7F1D1D]/50 bg-red-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-content-primary">Delete Account</h4>
                    <p className="text-xs text-zinc-500 mt-1">Permanently delete your account and all associated data.</p>
                  </div>
                  <button type="button" onClick={() => setIsDeleteDialogOpen(true)} className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-red-500">
                    Delete Account
                  </button>
                </div>
              </CollapsibleModule>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-sm bg-surface-raised border border-surface-border p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#7F1D1D] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary">Delete account</Dialog.Title>
            </div>
            <Dialog.Description className="text-sm text-zinc-400 mb-6">
              Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be undone.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-sm text-sm font-medium text-zinc-300 hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
