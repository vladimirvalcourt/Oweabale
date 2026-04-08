import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { validateAvatarFile } from '../lib/security';
import { supabase } from '../lib/supabase';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Lock, Shield, Smartphone, CreditCard as CreditCardIcon, CheckCircle2, Plus, X, Building2, Loader2, Search, Download, Fingerprint, EyeOff, FileSpreadsheet, FileText, User, Mail, BellRing, BrainCircuit, Palette, Globe, PieChart, Filter, Trash2, RefreshCw, LifeBuoy, MessageSquare, AlertCircle, Clock, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { CollapsibleModule } from '../components/CollapsibleModule';
import BankConnection from '../components/BankConnection';

type Tab = 'profile' | 'notifications' | 'security' | 'billing' | 'financial' | 'privacy' | 'integrations' | 'rules' | 'support';

interface SupportTicket {
  id: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Normal' | 'Urgent';
  date: string;
  department: string;
}

export default function Settings() {
  const user = useStore((state) => state.user);
  const updateUser = useStore((state) => state.updateUser);
  const resetData = useStore((state) => state.resetData);
  const deleteAccount = useStore((state) => state.deleteAccount);
  const categories = useStore((state) => state.categories);
  const categorizationRules = useStore((state) => state.categorizationRules);
  const addCategorizationRule = useStore((state) => state.addCategorizationRule);
  const deleteCategorizationRule = useStore((state) => state.deleteCategorizationRule);
  const applyRulesToExistingTransactions = useStore((state) => state.applyRulesToExistingTransactions);

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [ruleForm, setRuleForm] = useState({ match_type: 'contains' as const, match_value: '', category: '' });
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null); // null = loading

  // Check real MFA status from Supabase
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = (data?.totp ?? []).filter((f: any) => f.status === 'verified');
      setMfaEnabled(verified.length > 0);
    }).catch(() => setMfaEnabled(false));
  }, []);

  // Support tab state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [supportForm, setSupportForm] = useState({
    subject: '',
    department: 'General Support',
    priority: 'Normal',
    description: '',
  });

  // Controlled state for preference checkboxes (persisted in-session)
  const [notifPrefs, setNotifPrefs] = useState({
    'bill-reminders': true,
    'weekly-summary': true,
    'new-login': true,
    'push-reminders': true,
    'push-payments': false,
    'sniper-increase': true,
    'sniper-renewal': true,
    'detonator-milestone': true,
    'detonator-rate': true,
  });
  const [privacyMode, setPrivacyMode] = useState(false);
  const [biometrics, setBiometrics] = useState(false);

  // Preferences tab — controlled selects
  const [prefCurrency, setPrefCurrency] = useState('USD ($)');
  const [prefDateFormat, setPrefDateFormat] = useState('MM/DD/YYYY');
  const [prefFiscalYear, setPrefFiscalYear] = useState('January');
  const [prefDashboardView, setPrefDashboardView] = useState('Net Worth Overview');
  const [prefSpendingLimit, setPrefSpendingLimit] = useState('5000');

  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    timezone: user.timezone || 'Eastern Time (ET)',
    language: user.language || 'English (US)',
  });

  // Sync formData when store user loads (fetchData may complete after mount)
  React.useEffect(() => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      timezone: user.timezone || 'Eastern Time (ET)',
      language: user.language || 'English (US)',
    });
  }, [user.id, user.firstName, user.lastName, user.email]);

  // Load tickets when support tab is opened
  useEffect(() => {
    if (activeTab !== 'support') return;
    setTicketsLoading(true);
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setTickets(data.map((t: Record<string, any>) => ({
            id: t.ticket_number,
            subject: t.subject,
            status: t.status as SupportTicket['status'],
            priority: t.priority as SupportTicket['priority'],
            date: (t.created_at as string).split('T')[0],
            department: t.department,
          })));
        }
      } finally {
        setTicketsLoading(false);
      }
    };
    load();
  }, [activeTab]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setIsSubmittingTicket(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
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
    setTickets(prev => [newTicket, ...prev]);
    setSupportForm({ subject: '', department: 'General Support', priority: 'Normal', description: '' });
    toast.success(`Ticket ${data.ticket_number} submitted`);
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSaving(true);
    try {
      await updateUser(formData);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsDeleteDialogOpen(false);
      toast.success('Account deleted successfully');
    } catch {
      toast.error('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const [isResettingData, setIsResettingData] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleResetData = async () => {
    setIsResettingData(true);
    await resetData();
    setIsResettingData(false);
    setIsResetDialogOpen(false);
  };


  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'security', name: 'Security' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'financial', name: 'Preferences' },
    { id: 'rules', name: 'Auto-Rules' },
    { id: 'billing', name: 'Billing' },
    { id: 'integrations', name: 'Integrations' },
    { id: 'privacy', name: 'Data & Privacy' },
    { id: 'support', name: 'Support' },
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
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const validation = validateAvatarFile(file);
                            if (!validation.ok) {
                              toast.error(validation.error);
                              e.target.value = '';
                              return;
                            }
                            const ext = file.name.split('.').pop() ?? 'jpg';
                            const path = `${user.id}/avatar.${ext}`;
                            const { error: uploadError } = await supabase.storage
                              .from('avatars')
                              .upload(path, file, { upsert: true, contentType: file.type });
                            if (uploadError) {
                              toast.error('Failed to upload picture');
                              return;
                            }
                            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
                            await updateUser({ avatar: publicUrl });
                            toast.success('Profile picture updated');
                            e.target.value = '';
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
                        <label htmlFor="email" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">
                          Email Address
                          <span className="ml-2 text-zinc-600 normal-case tracking-normal font-normal">(managed by Google)</span>
                        </label>
                        <input type="email" id="email" value={formData.email} readOnly className="block w-full text-[13px] font-mono border-surface-border bg-surface-base text-zinc-500 rounded-sm px-3 py-2 border outline-none cursor-not-allowed select-none" />
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="phone" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Phone Number</label>
                        <input type="tel" id="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none" />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="timezone" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Timezone</label>
                        <select id="timezone" value={formData.timezone} onChange={handleChange} className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none appearance-none">
                          <option value="Pacific Time (PT)">Pacific Time (PT)</option>
                          <option value="Eastern Time (ET)">Eastern Time (ET)</option>
                          <option value="Central Time (CT)">Central Time (CT)</option>
                          <option value="Greenwich Mean Time (GMT)">Greenwich Mean Time (GMT)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="language" className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Language</label>
                        <select id="language" value={formData.language} onChange={handleChange} className="focus:border-indigo-500 block w-full text-[13px] font-mono border-surface-border bg-surface-raised text-zinc-200 rounded-sm px-3 py-2 border transition-colors outline-none appearance-none">
                          <option value="English (US)">English (US)</option>
                          <option value="Spanish">Spanish</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                      <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors shadow-lg shadow-indigo-500/10">
                        {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
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
                <form className="space-y-4 max-w-md" onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const newPw = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
                  const confirmPw = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
                  if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
                  if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
                  setIsUpdatingPassword(true);
                  const { error } = await supabase.auth.updateUser({ password: newPw });
                  setIsUpdatingPassword(false);
                  if (error) { toast.error(error.message); return; }
                  toast.success('Password updated successfully');
                  form.reset();
                }}>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">New Password</label>
                    <input name="newPassword" type="password" required minLength={8} className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Confirm Password</label>
                    <input name="confirmPassword" type="password" required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors" />
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={isUpdatingPassword} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-500">
                      {isUpdatingPassword && <Loader2 className="w-3 h-3 animate-spin" />}
                      {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </CollapsibleModule>

              <CollapsibleModule title="Two-Factor Authentication" icon={Shield} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Add additional security to your account using two-factor authentication.</p>
                <div className="flex items-center justify-between border border-surface-border rounded-sm p-4 bg-surface-elevated/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 border rounded-full flex items-center justify-center ${mfaEnabled ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-surface-border bg-surface-raised'}`}>
                      {mfaEnabled === null
                        ? <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                        : mfaEnabled
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          : <Shield className="w-5 h-5 text-zinc-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-content-primary">
                        {mfaEnabled === null ? 'Checking status...' : mfaEnabled ? '2FA is enabled' : '2FA is not enabled'}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {mfaEnabled ? 'Authenticator App' : 'Add an extra layer of security to your account'}
                      </p>
                    </div>
                  </div>
                  {mfaEnabled === false && (
                    <button onClick={() => toast.info('2FA setup coming soon')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-sm text-sm font-medium text-white transition-colors">
                      Enable 2FA
                    </button>
                  )}
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
                      <p className="text-xs text-zinc-500">{biometrics ? 'Currently enabled' : 'Currently disabled'}</p>
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={biometrics}
                      onChange={(e) => { setBiometrics(e.target.checked); toast.success(e.target.checked ? 'Biometrics enabled' : 'Biometrics disabled'); }}
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Active Sessions" icon={Smartphone} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Manage and log out your active sessions on other browsers and devices.</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-surface-border bg-surface-elevated/50 rounded-sm">
                    <div className="flex items-center gap-4">
                      <Smartphone className="w-6 h-6 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-content-primary">Current Session</p>
                        <p className="text-xs text-zinc-500">Signed in as {user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full bg-emerald-500/10">Active</span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                    Multi-device session management is not yet available.
                  </p>
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
                <div className="border border-surface-border border-dashed rounded-sm p-8 flex flex-col items-center justify-center text-center bg-surface-base">
                  <Download className="w-7 h-7 text-zinc-700 mb-3" />
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No billing history</p>
                  <p className="text-[10px] font-mono text-zinc-700 mt-1">You are on the free tier — no charges have been made.</p>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Payment Methods" icon={CreditCardIcon} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Manage payment methods used for your subscriptions.</p>
                <div className="border border-surface-border border-dashed rounded-sm p-6 flex flex-col items-center justify-center text-center mb-4 bg-surface-base">
                  <CreditCardIcon className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No payment method on file</p>
                  <p className="text-[10px] font-mono text-zinc-700 mt-1">Free tier — no billing required</p>
                </div>
                <button onClick={() => toast.success('Payment method flow coming soon')} className="text-sm font-medium text-content-primary hover:text-white transition-colors bg-surface-elevated px-4 py-2 border border-surface-border rounded-sm focus:outline-none">
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
                    { id: 'bill-reminders' as const, label: 'Bill Reminders', desc: 'Get notified 3 days before a bill is due.' },
                    { id: 'weekly-summary' as const, label: 'Weekly Summary', desc: 'Receive a weekly overview of your spending and upcoming bills.' },
                    { id: 'new-login' as const, label: 'New Device Login', desc: 'Security alerts when your account is accessed from a new device.' },
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
                          checked={notifPrefs[item.id]}
                          onChange={(e) => { setNotifPrefs(p => ({ ...p, [item.id]: e.target.checked })); toast.success('Preference updated'); }}
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
                    { id: 'push-reminders' as const, label: 'Due Date Alerts', desc: 'Immediate alerts on the day a bill is due.' },
                    { id: 'push-payments' as const, label: 'Payment Confirmations', desc: 'Get notified when a payment is successfully recorded.' },
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
                          checked={notifPrefs[item.id]}
                          onChange={(e) => { setNotifPrefs(p => ({ ...p, [item.id]: e.target.checked })); toast.success('Preference updated'); }}
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
                    { id: 'sniper-increase' as const, label: 'Subscription Sniper: Price Hikes', desc: 'Alert me instantly if a subscription price increases.' },
                    { id: 'sniper-renewal' as const, label: 'Subscription Sniper: Auto-Renewals', desc: 'Alert me 7 days before an annual subscription renews.' },
                    { id: 'detonator-milestone' as const, label: 'Debt Detonator: Milestones', desc: 'Celebrate when I pay off 25%, 50%, 75%, and 100% of a debt.' },
                    { id: 'detonator-rate' as const, label: 'Debt Detonator: Rate Changes', desc: 'Alert me if a variable interest rate changes.' },
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
                          checked={notifPrefs[item.id]}
                          onChange={(e) => { setNotifPrefs(p => ({ ...p, [item.id]: e.target.checked })); toast.success('Smart alert updated'); }}
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


              <CollapsibleModule title="Currency & Formatting" icon={Globe} defaultOpen={false}>
                <p className="text-sm text-zinc-400 mb-6">Set your preferred currency and date format.</p>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Primary Currency</label>
                    <select value={prefCurrency} onChange={e => setPrefCurrency(e.target.value)} className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>CAD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Date Format</label>
                    <select value={prefDateFormat} onChange={e => setPrefDateFormat(e.target.value)} className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Fiscal Year Start</label>
                    <select value={prefFiscalYear} onChange={e => setPrefFiscalYear(e.target.value)} className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
                      <option>January</option>
                      <option>April</option>
                      <option>July</option>
                      <option>October</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300">Default Dashboard View</label>
                    <select value={prefDashboardView} onChange={e => setPrefDashboardView(e.target.value)} className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm px-3 py-2 border transition-colors">
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
                      <input type="number" value={prefSpendingLimit} onChange={e => setPrefSpendingLimit(e.target.value)} className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-surface-border bg-surface-base text-zinc-200 rounded-sm py-2 border transition-colors" />
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
                      checked={privacyMode}
                      onChange={(e) => { setPrivacyMode(e.target.checked); toast.success(e.target.checked ? 'Privacy mode enabled' : 'Privacy mode disabled'); }}
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-500 bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              </CollapsibleModule>

              <CollapsibleModule title="Data Management" icon={Download} defaultOpen={true}>
                <p className="text-sm text-zinc-400 mb-6">Manage your inputs and export your financial history.</p>
                <div className="space-y-6">
                  <div className="border border-surface-border rounded-sm p-4 bg-surface-elevated/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-content-primary">Export your data</h4>
                      <p className="text-xs text-zinc-500 mt-1">Download a copy of all your financial data in CSV format.</p>
                    </div>
                    <button onClick={() => toast.success('Data export started.')} className="px-4 py-2 bg-surface-raised border border-surface-border rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 hover:text-white transition-colors focus:outline-none">
                      Export Data
                    </button>
                  </div>

                  <div className="border border-surface-border rounded-sm p-4 bg-surface-elevated/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-amber-500">Reset Account Data</h4>
                      <p className="text-xs text-zinc-500 mt-1">Wipe everything and start over from scratch.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsResetDialogOpen(true)}
                      className="px-4 py-2 bg-amber-500/10 border border-amber-500/50 text-amber-500 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-colors focus:outline-none"
                    >
                      Reset Data
                    </button>
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

          {/* ── Auto-Rules Tab ─────────────────────────────────────── */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <CollapsibleModule title="Categorization Rules" icon={Filter}
                extraHeader={
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    {categorizationRules.length} rule{categorizationRules.length !== 1 ? 's' : ''}
                  </span>
                }
              >
                <div className="-mx-6 -my-6">
                  {/* Add rule form */}
                  <div className="p-6 border-b border-surface-border bg-surface-base">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">
                      New Rule — applied automatically when a transaction name matches
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={ruleForm.match_type}
                        onChange={e => setRuleForm(f => ({ ...f, match_type: e.target.value as any }))}
                        className="bg-surface-raised border border-surface-border text-white text-xs font-mono rounded-sm px-3 py-2 outline-none focus:border-indigo-500 appearance-none w-full sm:w-36"
                      >
                        <option value="contains">Contains</option>
                        <option value="exact">Exact Match</option>
                        <option value="starts_with">Starts With</option>
                        <option value="ends_with">Ends With</option>
                      </select>
                      <input
                        type="text"
                        placeholder="e.g. STARBUCKS"
                        value={ruleForm.match_value}
                        onChange={e => setRuleForm(f => ({ ...f, match_value: e.target.value }))}
                        className="flex-1 bg-surface-raised border border-surface-border text-white text-xs font-mono rounded-sm px-3 py-2 outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                      />
                      <select
                        value={ruleForm.category}
                        onChange={e => setRuleForm(f => ({ ...f, category: e.target.value }))}
                        className="bg-surface-raised border border-surface-border text-white text-xs font-mono rounded-sm px-3 py-2 outline-none focus:border-indigo-500 appearance-none w-full sm:w-44"
                      >
                        <option value="">— Select category —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!ruleForm.match_value.trim() || !ruleForm.category) {
                            toast.error('Fill in the match value and category');
                            return;
                          }
                          await addCategorizationRule({ match_type: ruleForm.match_type, match_value: ruleForm.match_value.trim(), category: ruleForm.category, priority: 0 });
                          setRuleForm(f => ({ ...f, match_value: '' }));
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Rules list */}
                  {categorizationRules.length === 0 ? (
                    <div className="p-10 text-center">
                      <Filter className="w-7 h-7 text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No rules yet — add one above.</p>
                      <p className="text-[10px] font-mono text-zinc-600 mt-2">Example: "STARBUCKS" → Coffee</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-border">
                      {categorizationRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between px-6 py-3 hover:bg-surface-elevated transition-colors group">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-sm shrink-0">
                              {rule.match_type.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-mono text-white truncate">{rule.match_value}</span>
                            <span className="text-zinc-600 font-mono text-xs shrink-0">→</span>
                            <span className="text-xs font-mono text-emerald-400 truncate">{rule.category}</span>
                          </div>
                          <button
                            onClick={() => deleteCategorizationRule(rule.id)}
                            className="ml-4 text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleModule>

              {/* Apply retroactively */}
              <CollapsibleModule title="Apply to Existing Transactions" icon={RefreshCw} defaultOpen={false}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Re-run all your rules against every transaction already in the system.
                      Matching transactions will have their category updated.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (categorizationRules.length === 0) { toast.error('Add at least one rule first'); return; }
                      setIsApplying(true);
                      const count = await applyRulesToExistingTransactions();
                      setIsApplying(false);
                      if (count === 0) toast.success('All transactions already match your rules');
                      else toast.success(`Updated ${count} transaction${count !== 1 ? 's' : ''}`);
                    }}
                    disabled={isApplying}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-surface-border text-zinc-300 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-surface-raised transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Apply Retroactively
                  </button>
                </div>
              </CollapsibleModule>
            </div>
          )}

          {/* ── Support Tab ─────────────────────────────────────────── */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              {/* Submit a request */}
              <CollapsibleModule title="Submit a Support Request" icon={LifeBuoy}>
                <div className="-mx-6 -my-6 p-6 bg-surface-base">
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        What do you need help with?
                      </label>
                      <input
                        type="text"
                        value={supportForm.subject}
                        onChange={e => setSupportForm(f => ({ ...f, subject: e.target.value }))}
                        className="w-full bg-surface-raised border border-surface-border text-white text-sm rounded-sm px-3 py-2 outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                        placeholder="Brief summary of your issue or question..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">Category</label>
                        <select
                          value={supportForm.department}
                          onChange={e => setSupportForm(f => ({ ...f, department: e.target.value }))}
                          className="w-full bg-surface-raised border border-surface-border text-white text-sm rounded-sm px-3 py-2 outline-none focus:border-indigo-500 appearance-none"
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
                          value={supportForm.priority}
                          onChange={e => setSupportForm(f => ({ ...f, priority: e.target.value }))}
                          className="w-full bg-surface-raised border border-surface-border text-white text-sm rounded-sm px-3 py-2 outline-none focus:border-indigo-500 appearance-none"
                        >
                          <option value="Low">Low — general question</option>
                          <option value="Normal">Normal — something isn't working</option>
                          <option value="Urgent">Urgent — blocking me completely</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        Describe the issue in detail
                      </label>
                      <textarea
                        value={supportForm.description}
                        onChange={e => setSupportForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full bg-surface-raised border border-surface-border text-white text-sm font-mono rounded-sm px-3 py-2 outline-none focus:border-indigo-500 h-32 resize-none placeholder:text-zinc-600"
                        placeholder="Include steps to reproduce, what you expected vs what happened, and any relevant details..."
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingTicket}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors"
                      >
                        {isSubmittingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {isSubmittingTicket ? 'Sending...' : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                </div>
              </CollapsibleModule>

              {/* Ticket history */}
              <CollapsibleModule
                title="My Tickets"
                icon={MessageSquare}
                extraHeader={
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                  </span>
                }
                defaultOpen={false}
              >
                <div className="-mx-6 -my-6 bg-surface-base">
                  {ticketsLoading ? (
                    <div className="p-10 flex justify-center">
                      <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="p-10 text-center">
                      <MessageSquare className="w-7 h-7 text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No tickets yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-border">
                      {tickets.map(ticket => (
                        <div key={ticket.id} className="p-5 hover:bg-surface-elevated transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`p-1.5 border rounded-sm shrink-0 ${
                              ticket.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                              ticket.status === 'In Progress' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                              'bg-amber-500/10 border-amber-500/20 text-amber-500'
                            }`}>
                              {ticket.status === 'Resolved' ? <CheckCircle2 className="w-4 h-4" /> :
                               ticket.status === 'In Progress' ? <Clock className="w-4 h-4" /> :
                               <AlertCircle className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-[9px] font-mono text-zinc-500">{ticket.id}</span>
                                <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm border ${
                                  ticket.priority === 'Urgent' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                  'bg-surface-elevated border-surface-border text-zinc-500'
                                }`}>{ticket.priority}</span>
                              </div>
                              <p className="text-sm text-content-primary truncate">{ticket.subject}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{ticket.status}</div>
                            <div className="text-[10px] font-mono text-zinc-600 mt-0.5">{ticket.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleModule>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Dialog open={isResetDialogOpen} onClose={() => setIsResetDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-sm bg-surface-raised border border-surface-border p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-amber-500/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary">Reset Data?</Dialog.Title>
            </div>
            <Dialog.Description className="text-sm text-zinc-400 mb-6">
              This will permanently delete all your bills, debts, assets, and transactions. Your account will remain active, but you will be sent back to the onboarding setup.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsResetDialogOpen(false)}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-sm text-sm font-medium text-zinc-300 hover:bg-surface-elevated transition-colors outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                disabled={isResettingData}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-sm text-sm font-medium transition-colors outline-none"
              >
                {isResettingData && <Loader2 className="w-3 h-3 animate-spin" />}
                {isResettingData ? 'Resetting...' : 'Reset Everything'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

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
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-red-500"
              >
                {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
