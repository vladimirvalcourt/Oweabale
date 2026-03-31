import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Lock, Shield, Smartphone, CreditCard as CreditCardIcon, CheckCircle2, Plus } from 'lucide-react';
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
    { id: 'financial', name: 'Financial Preferences' },
    { id: 'billing', name: 'Billing' },
    { id: 'integrations', name: 'Integrations' },
    { id: 'privacy', name: 'Data & Privacy' },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account preferences and application settings.</p>
        </div>
        <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          <Shield className="w-4 h-4 mr-1.5 text-[#28a745]" />
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
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Profile Information</h3>
                  <p className="mt-1 text-sm text-gray-500">Update your account's profile information and email address.</p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                        <span className="text-xl font-medium text-gray-600">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <button type="button" onClick={() => toast.success('Avatar updated successfully')} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                        Change avatar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name</label>
                        <div className="mt-1">
                          <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} required className="shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name</label>
                        <div className="mt-1">
                          <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} required className="shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                        </div>
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                        <div className="mt-1">
                          <input type="email" id="email" value={formData.email} onChange={handleChange} required className="shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button type="submit" className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
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
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Password</h3>
                  <p className="mt-1 text-sm text-gray-500">Ensure your account is using a long, random password to stay secure.</p>
                </div>
                <div className="p-6">
                  <form className="space-y-4 max-w-md" onSubmit={(e) => { e.preventDefault(); toast.success('Password updated successfully'); e.currentTarget.reset(); }}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Password</label>
                      <input type="password" required className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <input type="password" required className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                      <input type="password" required className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                    </div>
                    <div className="pt-2">
                      <button type="submit" className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="mt-1 text-sm text-gray-500">Add additional security to your account using two-factor authentication.</p>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#28a745]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">2FA is enabled</p>
                      <p className="text-sm text-gray-500">Authenticator App</p>
                    </div>
                  </div>
                  <button onClick={() => toast.success('2FA settings opened')} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                    Manage
                  </button>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Active Sessions</h3>
                  <p className="mt-1 text-sm text-gray-500">Manage and log out your active sessions on other browsers and devices.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <Smartphone className="w-6 h-6 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">MacBook Pro - Chrome</p>
                        <p className="text-xs text-gray-500">San Francisco, CA • Active now</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#28a745] bg-green-50 px-2 py-1 rounded-full">Current</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-4">
                      <Smartphone className="w-6 h-6 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">iPhone 13 - Safari</p>
                        <p className="text-xs text-gray-500">San Francisco, CA • Last active 2 hours ago</p>
                      </div>
                    </div>
                    <button onClick={() => toast.success('Session logged out')} className="text-sm font-medium text-red-600 hover:text-red-700">Log out</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Subscription Plan</h3>
                  <p className="mt-1 text-sm text-gray-500">You are currently on the Pro plan.</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">Oweable Pro</p>
                      <p className="text-sm text-gray-500">$4.99 / month</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">Your next billing date is April 15, 2026.</p>
                  <div className="flex gap-3">
                    <button onClick={() => toast.success('Plan management opened')} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                      Manage Plan
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Payment Methods</h3>
                  <p className="mt-1 text-sm text-gray-500">Manage payment methods used for your subscriptions.</p>
                </div>
                <div className="p-6">
                  <div className="border border-gray-200 rounded-md p-4 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
                        <CreditCardIcon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Visa ending in 4242</p>
                        <p className="text-xs text-gray-500">Expires 12/2028</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Default</span>
                  </div>
                  <button onClick={() => toast.success('Add payment method opened')} className="text-sm font-medium text-[#28a745] hover:text-[#218838] transition-colors">
                    + Add payment method
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Email Notifications</h3>
                  <p className="mt-1 text-sm text-gray-500">Choose what updates you want to receive via email.</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { id: 'bill-reminders', label: 'Bill Reminders', desc: 'Get notified 3 days before a bill is due.', defaultChecked: true },
                    { id: 'weekly-summary', label: 'Weekly Summary', desc: 'Receive a weekly overview of your spending and upcoming bills.', defaultChecked: true },
                    { id: 'new-login', label: 'New Device Login', desc: 'Security alerts when your account is accessed from a new device.', defaultChecked: true },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-gray-900 cursor-pointer">{item.label}</label>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Preference updated')}
                          className="h-4 w-4 text-[#28a745] focus:ring-[#28a745] border-gray-300 rounded transition-colors cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Push Notifications</h3>
                  <p className="mt-1 text-sm text-gray-500">Manage notifications delivered directly to your device.</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { id: 'push-reminders', label: 'Due Date Alerts', desc: 'Immediate alerts on the day a bill is due.', defaultChecked: true },
                    { id: 'push-payments', label: 'Payment Confirmations', desc: 'Get notified when a payment is successfully recorded.', defaultChecked: false },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div className="pr-4">
                        <label htmlFor={item.id} className="text-sm font-medium text-gray-900 cursor-pointer">{item.label}</label>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center h-5 mt-1">
                        <input
                          id={item.id}
                          type="checkbox"
                          defaultChecked={item.defaultChecked}
                          onChange={() => toast.success('Preference updated')}
                          className="h-4 w-4 text-[#28a745] focus:ring-[#28a745] border-gray-300 rounded transition-colors cursor-pointer"
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
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Currency & Formatting</h3>
                  <p className="mt-1 text-sm text-gray-500">Set your preferred currency and date format.</p>
                </div>
                <div className="p-6 space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Currency</label>
                    <select className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>CAD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Format</label>
                    <select className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => toast.success('Preferences saved')} className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Budget Limits</h3>
                  <p className="mt-1 text-sm text-gray-500">Set global budget limits to receive alerts when you're close to overspending.</p>
                </div>
                <div className="p-6 space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Spending Limit</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input type="number" defaultValue={5000} className="focus:ring-[#28a745] focus:border-[#28a745] block w-full pl-7 sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => toast.success('Budget limits updated')} className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                      Update Limits
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Bank Connections</h3>
                  <p className="mt-1 text-sm text-gray-500">Link your bank accounts to automatically sync transactions and balances.</p>
                </div>
                <div className="p-6">
                  <div className="border border-gray-200 rounded-md p-4 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded flex items-center justify-center border border-blue-100">
                        <span className="text-blue-700 font-bold text-lg">C</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Chase Bank</p>
                        <p className="text-xs text-gray-500">Checking •••• 1234</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">Connected</span>
                  </div>
                  <button onClick={() => toast.info('Plaid integration opening...')} className="text-sm font-medium text-[#28a745] hover:text-[#218838] transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Link another account
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">Data & Privacy</h3>
                  <p className="mt-1 text-sm text-gray-500">Manage your personal data and privacy settings.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Export your data</h4>
                    <p className="text-sm text-gray-500 mt-1 mb-3">Download a copy of all your financial data, including bills, debts, and transactions in CSV format.</p>
                    <button onClick={() => toast.success('Data export started. You will receive an email shortly.')} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                      Export Data
                    </button>
                  </div>
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900">Privacy Policy</h4>
                    <p className="text-sm text-gray-500 mt-1">We use bank-grade encryption to protect your data. We never sell your personal financial information to third parties. Read our full <a href="#" className="text-[#28a745] hover:underline">Privacy Policy</a>.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-lg border border-red-200">
                <div className="px-6 py-5 border-b border-red-200">
                  <h3 className="text-base font-medium text-red-700">Danger Zone</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Delete Account</h4>
                      <p className="text-sm text-gray-500 mt-1">Permanently delete your account and all associated data.</p>
                    </div>
                    <button type="button" onClick={() => setIsDeleteDialogOpen(true)} className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
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
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <Dialog.Title className="text-lg font-medium text-gray-900">Delete account</Dialog.Title>
            </div>
            <Dialog.Description className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be undone.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
