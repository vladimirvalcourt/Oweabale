import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Lock, Shield, Smartphone, CreditCard as CreditCardIcon, CheckCircle2, Plus, X, Building2, Loader2, Search, Download, Fingerprint, EyeOff, FileSpreadsheet, Sparkles, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

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
  const [isPlaidModalOpen, setIsPlaidModalOpen] = useState(false);
  const [plaidStep, setPlaidStep] = useState<'intro' | 'select' | 'login' | 'success'>('intro');
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [connectedBanks, setConnectedBanks] = useState([
    { id: 1, name: 'Chase Bank', type: 'Checking', mask: '1234', initial: 'C' }
  ]);

  const handlePlaidConnect = () => {
    setPlaidLoading(true);
    setTimeout(() => {
      setPlaidLoading(false);
      setPlaidStep('success');
      setTimeout(() => {
        setConnectedBanks([...connectedBanks, { id: Date.now(), name: selectedBank, type: 'Checking', mask: Math.floor(1000 + Math.random() * 9000).toString(), initial: selectedBank.charAt(0) }]);
        setIsPlaidModalOpen(false);
        toast.success(`${selectedBank} connected successfully`);
      }, 1500);
    }, 2000);
  };

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
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Settings</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your account preferences and application settings.</p>
        </div>
        <div className="flex items-center text-sm text-zinc-400 bg-[#141414] px-3 py-1.5 rounded-full border border-[#262626]">
          <Shield className="w-4 h-4 mr-1.5 text-zinc-500" />
          Bank-grade security
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
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === tab.id
                    ? "bg-[#1C1C1C] text-[#FAFAFA]"
                    : "text-zinc-400 hover:bg-[#141414] hover:text-[#FAFAFA]"
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
              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Profile Information</h3>
                  <p className="mt-1 text-sm text-zinc-400">Update your account's profile information and email address.</p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-full bg-[#1C1C1C] border border-[#262626] flex items-center justify-center overflow-hidden">
                        <span className="text-xl font-medium text-zinc-400">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <button type="button" onClick={() => toast.success('Avatar updated successfully')} className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                        Change avatar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <label htmlFor="firstName" className="block text-sm font-semibold text-zinc-300">First name</label>
                        <div className="mt-1">
                          <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="lastName" className="block text-sm font-semibold text-zinc-300">Last name</label>
                        <div className="mt-1">
                          <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                        </div>
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="email" className="block text-sm font-semibold text-zinc-300">Email address</label>
                        <div className="mt-1">
                          <input type="email" id="email" value={formData.email} onChange={handleChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                        </div>
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="phone" className="block text-sm font-semibold text-zinc-300">Phone number</label>
                        <div className="mt-1">
                          <input type="tel" id="phone" placeholder="+1 (555) 000-0000" className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="timezone" className="block text-sm font-semibold text-zinc-300">Timezone</label>
                        <div className="mt-1">
                          <select id="timezone" className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                            <option>Pacific Time (PT)</option>
                            <option>Eastern Time (ET)</option>
                            <option>Central Time (CT)</option>
                            <option>Greenwich Mean Time (GMT)</option>
                          </select>
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="language" className="block text-sm font-semibold text-zinc-300">Language</label>
                        <div className="mt-1">
                          <select id="language" className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                            <option>English (US)</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Danger Zone moved to Data & Privacy */}
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Password</h3>
                  <p className="mt-1 text-sm text-zinc-400">Ensure your account is using a long, random password to stay secure.</p>
                </div>
                <div className="p-6">
                  <form className="space-y-4 max-w-md" onSubmit={(e) => { e.preventDefault(); toast.success('Password updated successfully'); e.currentTarget.reset(); }}>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300">Current Password</label>
                      <input type="password" required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300">New Password</label>
                      <input type="password" required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300">Confirm Password</label>
                      <input type="password" required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                    </div>
                    <div className="pt-2">
                      <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Two-Factor Authentication</h3>
                  <p className="mt-1 text-sm text-zinc-400">Add additional security to your account using two-factor authentication.</p>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-[#262626] rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#FAFAFA]">2FA is enabled</p>
                      <p className="text-sm text-zinc-500">Authenticator App</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => toast.success('Recovery codes generated')} className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                      Recovery Codes
                    </button>
                    <button onClick={() => toast.success('2FA settings opened')} className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                      Manage
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Biometric Authentication</h3>
                  <p className="mt-1 text-sm text-zinc-400">Require FaceID or TouchID when opening the application.</p>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#1C1C1C] border border-[#262626] rounded-lg flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#FAFAFA]">App Lock</p>
                      <p className="text-xs text-zinc-500">Currently disabled</p>
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      onChange={(e) => toast.success(e.target.checked ? 'Biometrics enabled' : 'Biometrics disabled')}
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Active Sessions</h3>
                  <p className="mt-1 text-sm text-zinc-400">Manage and log out your active sessions on other browsers and devices.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-[#1F1F1F]">
                    <div className="flex items-center gap-4">
                      <Smartphone className="w-6 h-6 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">MacBook Pro - Chrome</p>
                        <p className="text-xs text-zinc-500">San Francisco, CA • Active now</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#22C55E] border border-[#262626] px-2 py-1 rounded-full">Current</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-4">
                      <Smartphone className="w-6 h-6 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">iPhone 13 - Safari</p>
                        <p className="text-xs text-zinc-500">San Francisco, CA • Last active 2 hours ago</p>
                      </div>
                    </div>
                    <button onClick={() => toast.success('Session logged out')} className="text-sm font-medium text-[#EF4444] hover:text-[#DC2626]">Log out</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-lg border border-[#262626] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#262626] bg-[#1C1C1C]/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-semibold text-[#FAFAFA]">Subscription Plan</h3>
                    <p className="mt-1 text-sm text-zinc-400">You are currently on the Free tier.</p>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-zinc-400 bg-[#262626] px-2.5 py-1 rounded-full">
                    The Tracker
                  </span>
                </div>
                <div className="p-6">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[#FAFAFA] font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        Upgrade to The Arsenal
                      </h4>
                      <p className="text-sm text-indigo-200/70 mt-1 max-w-md">
                        Unlock the Debt Detonator, Subscription Sniper, and 24/7 AI Financial Advisor.
                      </p>
                    </div>
                    <button onClick={() => toast.success('Redirecting to upgrade...')} className="shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-bold transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Billing History</h3>
                  <p className="mt-1 text-sm text-zinc-400">View and download your previous invoices.</p>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-[#1C1C1C] border-b border-[#262626] text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Amount</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium text-right">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      <tr className="hover:bg-[#1C1C1C]/50 transition-colors">
                        <td className="px-6 py-4">Mar 15, 2026</td>
                        <td className="px-6 py-4">$0.00</td>
                        <td className="px-6 py-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs">Paid</span></td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-indigo-400 hover:text-indigo-300 transition-colors"><Download className="w-4 h-4 inline" /></button>
                        </td>
                      </tr>
                      <tr className="hover:bg-[#1C1C1C]/50 transition-colors">
                        <td className="px-6 py-4">Feb 15, 2026</td>
                        <td className="px-6 py-4">$0.00</td>
                        <td className="px-6 py-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs">Paid</span></td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-indigo-400 hover:text-indigo-300 transition-colors"><Download className="w-4 h-4 inline" /></button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Payment Methods</h3>
                  <p className="mt-1 text-sm text-zinc-400">Manage payment methods used for your subscriptions.</p>
                </div>
                <div className="p-6">
                  <div className="border border-[#262626] rounded-md p-4 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-[#1C1C1C] rounded flex items-center justify-center border border-[#262626]">
                        <CreditCardIcon className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">Visa ending in 4242</p>
                        <p className="text-xs text-zinc-500">Expires 12/2028</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 border border-[#262626] px-2 py-1 rounded-full">Default</span>
                  </div>
                  <button onClick={() => toast.success('Add payment method opened')} className="text-sm font-medium text-indigo-500 hover:text-indigo-400 transition-colors">
                    + Add payment method
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Email Notifications</h3>
                  <p className="mt-1 text-sm text-zinc-400">Choose what updates you want to receive via email.</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { id: 'bill-reminders', label: 'Bill Reminders', desc: 'Get notified 3 days before a bill is due.', defaultChecked: true },
                    { id: 'weekly-summary', label: 'Weekly Summary', desc: 'Receive a weekly overview of your spending and upcoming bills.', defaultChecked: true },
                    { id: 'new-login', label: 'New Device Login', desc: 'Security alerts when your account is accessed from a new device.', defaultChecked: true },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-[#FAFAFA] cursor-pointer">{item.label}</label>
                        <p className="text-sm text-zinc-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Preference updated')}
                          className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Push Notifications</h3>
                  <p className="mt-1 text-sm text-zinc-400">Manage notifications delivered directly to your device.</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { id: 'push-reminders', label: 'Due Date Alerts', desc: 'Immediate alerts on the day a bill is due.', defaultChecked: true },
                    { id: 'push-payments', label: 'Payment Confirmations', desc: 'Get notified when a payment is successfully recorded.', defaultChecked: false },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-[#FAFAFA] cursor-pointer">{item.label}</label>
                        <p className="text-sm text-zinc-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Preference updated')}
                          className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Smart Alerts (The Arsenal)</h3>
                  <p className="mt-1 text-sm text-zinc-400">Advanced notifications powered by our algorithms.</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { id: 'sniper-increase', label: 'Subscription Sniper: Price Hikes', desc: 'Alert me instantly if a subscription price increases.', defaultChecked: true },
                    { id: 'sniper-renewal', label: 'Subscription Sniper: Auto-Renewals', desc: 'Alert me 7 days before an annual subscription renews.', defaultChecked: true },
                    { id: 'detonator-milestone', label: 'Debt Detonator: Milestones', desc: 'Celebrate when I pay off 25%, 50%, 75%, and 100% of a debt.', defaultChecked: true },
                    { id: 'detonator-rate', label: 'Debt Detonator: Rate Changes', desc: 'Alert me if a variable interest rate changes.', defaultChecked: true },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-[#FAFAFA] cursor-pointer">{item.label}</label>
                        <p className="text-sm text-zinc-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Smart alert updated')}
                          className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Appearance</h3>
                  <p className="mt-1 text-sm text-zinc-400">Customize how Oweable looks on your device.</p>
                </div>
                <div className="p-6 space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Theme</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                      <option>Dark (Default)</option>
                      <option>Light</option>
                      <option>System</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Currency & Formatting</h3>
                  <p className="mt-1 text-sm text-zinc-400">Set your preferred currency and date format.</p>
                </div>
                <div className="p-6 space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Primary Currency</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>CAD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Date Format</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Fiscal Year Start</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                      <option>January</option>
                      <option>April</option>
                      <option>July</option>
                      <option>October</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Default Dashboard View</label>
                    <select className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                      <option>Net Worth Overview</option>
                      <option>Upcoming Bills</option>
                      <option>Debt Detonator Timeline</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => toast.success('Preferences saved')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Budget Limits</h3>
                  <p className="mt-1 text-sm text-zinc-400">Set global budget limits to receive alerts when you're close to overspending.</p>
                </div>
                <div className="p-6 space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Monthly Spending Limit</label>
                    <div className="mt-1 relative rounded-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-zinc-500 sm:text-sm">$</span>
                      </div>
                      <input type="number" defaultValue={5000} className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => toast.success('Budget limits updated')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                      Update Limits
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Bank Connections</h3>
                  <p className="mt-1 text-sm text-zinc-400">Link your bank accounts to automatically sync transactions and balances.</p>
                </div>
                <div className="p-6">
                  {connectedBanks.map((bank) => (
                    <div key={bank.id} className="border border-[#262626] rounded-md p-4 flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1C1C1C] rounded flex items-center justify-center border border-[#262626]">
                          <span className="text-zinc-300 font-bold text-lg">{bank.initial}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#FAFAFA]">{bank.name}</p>
                          <p className="text-xs text-zinc-500">{bank.type} •••• {bank.mask}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#22C55E] border border-[#262626] px-2 py-1 rounded-full">Connected</span>
                    </div>
                  ))}
                  <button onClick={() => { setPlaidStep('intro'); setIsPlaidModalOpen(true); }} className="text-sm font-medium text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Link another account
                  </button>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Tax & Export</h3>
                  <p className="mt-1 text-sm text-zinc-400">Connect external services for seamless tax preparation and reporting.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="border border-[#262626] rounded-md p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#1C1C1C] border border-[#262626] rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">TurboTax Integration</p>
                        <p className="text-xs text-zinc-500">Export Tax Fortress data directly</p>
                      </div>
                    </div>
                    <button onClick={() => toast.success('TurboTax integration initiated')} className="text-sm font-medium text-zinc-300 hover:text-white bg-[#262626] hover:bg-[#333] px-3 py-1.5 rounded transition-colors">
                      Connect
                    </button>
                  </div>
                  <div className="border border-[#262626] rounded-md p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#1C1C1C] border border-[#262626] rounded-lg flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">Google Sheets Sync</p>
                        <p className="text-xs text-zinc-500">Live sync transactions and balances</p>
                      </div>
                    </div>
                    <button onClick={() => toast.success('Google Sheets sync initiated')} className="text-sm font-medium text-zinc-300 hover:text-white bg-[#262626] hover:bg-[#333] px-3 py-1.5 rounded transition-colors">
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Privacy Mode</h3>
                  <p className="mt-1 text-sm text-zinc-400">Control visibility of sensitive information.</p>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#1C1C1C] border border-[#262626] rounded-lg flex items-center justify-center">
                      <EyeOff className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#FAFAFA]">Hide Balances</p>
                      <p className="text-xs text-zinc-500">Blur all monetary values until hovered</p>
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      onChange={(e) => toast.success(e.target.checked ? 'Privacy mode enabled' : 'Privacy mode disabled')}
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">AI & Data Usage</h3>
                  <p className="mt-1 text-sm text-zinc-400">Control how Oweable AI interacts with your financial data.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="pr-4">
                      <label className="text-sm font-medium text-[#FAFAFA]">Allow AI Analysis</label>
                      <p className="text-sm text-zinc-500">Allow Oweable AI to analyze your transaction history to provide personalized insights.</p>
                    </div>
                    <div className="flex items-center h-5 mt-1">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        onChange={() => toast.success('AI preference updated')}
                        className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="pr-4">
                      <label className="text-sm font-medium text-[#FAFAFA]">Data Donation</label>
                      <p className="text-sm text-zinc-500">Anonymize and use my data to improve Oweable AI models. (Default off for privacy)</p>
                    </div>
                    <div className="flex items-center h-5 mt-1">
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        onChange={() => toast.success('Data donation preference updated')}
                        className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-[#0A0A0A] border-[#262626] rounded transition-colors cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#262626]">
                <div className="px-6 py-5 border-b border-[#262626]">
                  <h3 className="text-base font-semibold text-[#FAFAFA]">Data Export</h3>
                  <p className="mt-1 text-sm text-zinc-400">Manage your personal data and privacy settings.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-[#FAFAFA]">Export your data</h4>
                    <p className="text-sm text-zinc-500 mt-1 mb-3">Download a copy of all your financial data, including bills, debts, and transactions in CSV format.</p>
                    <button onClick={() => toast.success('Data export started. You will receive an email shortly.')} className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                      Export Data
                    </button>
                  </div>
                  <div className="pt-6 border-t border-[#262626]">
                    <h4 className="text-sm font-medium text-[#FAFAFA]">Privacy Policy</h4>
                    <p className="text-sm text-zinc-500 mt-1">We use bank-grade encryption to protect your data. We never sell your personal financial information to third parties. Read our full <a href="#" className="text-indigo-500 hover:underline">Privacy Policy</a>.</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] rounded-lg border border-[#7F1D1D]">
                <div className="px-6 py-5 border-b border-[#7F1D1D]">
                  <h3 className="text-base font-semibold text-[#EF4444]">Danger Zone</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-[#FAFAFA]">Delete Account</h4>
                      <p className="text-sm text-zinc-500 mt-1">Permanently delete your account and all associated data.</p>
                    </div>
                    <button type="button" onClick={() => setIsDeleteDialogOpen(true)} className="px-4 py-2 bg-transparent border border-[#7F1D1D] text-[#EF4444] rounded-md text-sm font-medium hover:bg-[#7F1D1D]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-red-500">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-[#141414] border border-[#262626] p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#7F1D1D] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-[#FAFAFA]">Delete account</Dialog.Title>
            </div>
            <Dialog.Description className="text-sm text-zinc-400 mb-6">
              Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be undone.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Plaid Link Mock Modal */}
      <Dialog open={isPlaidModalOpen} onClose={() => !plaidLoading && setIsPlaidModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-xl bg-white shadow-2xl overflow-hidden">
            {plaidStep === 'intro' && (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Oweable uses Plaid</h2>
                <p className="text-gray-600 mb-8 text-sm">
                  Plaid lets you securely connect your financial accounts to Oweable in seconds.
                </p>
                <ul className="text-left space-y-4 mb-8 w-full">
                  <li className="flex gap-3 text-sm text-gray-700">
                    <Shield className="w-5 h-5 text-gray-400 shrink-0" />
                    <span>Your data is encrypted end-to-end and never sold.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-gray-700">
                    <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                    <span>Oweable never sees your login credentials.</span>
                  </li>
                </ul>
                <button 
                  onClick={() => setPlaidStep('select')}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {plaidStep === 'select' && (
              <div className="flex flex-col h-[500px]">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Select your bank</h2>
                  <button onClick={() => setIsPlaidModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="text" 
                      placeholder="Search for your bank" 
                      className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {['Bank of America', 'Wells Fargo', 'Citi', 'Capital One', 'USAA', 'PNC Bank', 'U.S. Bank'].map((bank) => (
                    <button 
                      key={bank}
                      onClick={() => { setSelectedBank(bank); setPlaidStep('login'); }}
                      className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold">
                        {bank.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{bank}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {plaidStep === 'login' && (
              <div className="p-8 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setPlaidStep('select')} className="text-sm text-gray-500 hover:text-gray-900">Back</button>
                  <button onClick={() => setIsPlaidModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span className="text-2xl font-bold text-gray-900">{selectedBank.charAt(0)}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Enter your credentials</h2>
                <p className="text-gray-500 mb-6 text-sm text-center">To connect your {selectedBank} account</p>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">User ID</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black focus:border-black" defaultValue="user123" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black focus:border-black" defaultValue="password" />
                  </div>
                </div>
                
                <button 
                  onClick={handlePlaidConnect}
                  disabled={plaidLoading}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center"
                >
                  {plaidLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit'}
                </button>
              </div>
            )}

            {plaidStep === 'success' && (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
                <p className="text-gray-600 text-sm">
                  Your {selectedBank} account has been successfully connected to Oweable.
                </p>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
