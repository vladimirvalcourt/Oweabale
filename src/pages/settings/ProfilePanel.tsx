import React, { memo, useCallback, useEffect, useState } from 'react';
import { User, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { toast } from 'sonner';
import { validateAvatarFile } from '../../lib/security';
import { supabase } from '../../lib/supabase';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { yieldForPaint } from '../../lib/interaction';

function ProfilePanelInner() {
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    timezone: user.timezone || 'Eastern Time (ET)',
    language: user.language || 'English (US)',
  });

  useEffect(() => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      timezone: user.timezone || 'Eastern Time (ET)',
      language: user.language || 'English (US)',
    });
  }, [user.id, user.firstName, user.lastName, user.email, user.phone, user.timezone, user.language]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSaving(true);
    await yieldForPaint();
    try {
      const ok = await updateUser(formData);
      if (ok) toast.success('Profile updated successfully');
      else toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  }, []);

  return (
    <CollapsibleModule
      title="Personal Information"
      icon={User}
      extraHeader={
        <span className="text-xs font-medium text-content-tertiary">
          {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Profile'} · verified
        </span>
      }
    >
      <div className="-mx-6 -my-6 p-6 bg-surface-base">
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-surface-border">
            <div className="h-16 w-16 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center overflow-hidden shadow-inner shrink-0 relative">
              {user.avatar ? (
                <img src={user.avatar} alt="Identifier" className="h-full w-full object-cover" data-no-invert />
              ) : (
                <span className="text-xl font-semibold text-content-tertiary">
                  {(user.firstName || '?').charAt(0)}
                  {(user.lastName || '?').charAt(0)}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <label className="relative inline-block cursor-pointer rounded-lg border border-surface-border bg-transparent px-4 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-elevated">
                Update picture
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const validation = validateAvatarFile(file);
                    if (!validation.ok) {
                      toast.error(validation.error);
                      e.target.value = '';
                      return;
                    }
                    await yieldForPaint();
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
                    const ok = await updateUser({ avatar: publicUrl });
                    if (ok) toast.success('Profile picture updated');
                    else toast.error('Failed to save profile picture');
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="block pt-2 text-xs font-medium text-content-tertiary">
                User ID:{' '}
                <span className="font-mono text-content-muted">OWE_{user.id?.substring(0, 8)}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 pt-4">
            <div className="sm:col-span-3">
              <label htmlFor="firstName" className="mb-2 block text-xs font-medium text-content-secondary">
                First name
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="lastName" className="mb-2 block text-xs font-medium text-content-secondary">
                Last name
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="email" className="mb-2 block text-xs font-medium text-content-secondary">
                Email address
                <span className="ml-2 font-normal text-content-tertiary">(managed by Google)</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                readOnly
                className="block w-full cursor-not-allowed select-none rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-tertiary focus-app-field"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="phone" className="mb-2 block text-xs font-medium text-content-secondary">
                Phone number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="focus-app-field block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="timezone" className="mb-2 block text-xs font-medium text-content-secondary">
                Timezone
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="focus-app-field block w-full appearance-none rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
              >
                <option value="Pacific Time (PT)">Pacific Time (PT)</option>
                <option value="Eastern Time (ET)">Eastern Time (ET)</option>
                <option value="Central Time (CT)">Central Time (CT)</option>
                <option value="Greenwich Mean Time (GMT)">Greenwich Mean Time (GMT)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="language" className="mb-2 block text-xs font-medium text-content-secondary">
                Language
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={handleChange}
                className="focus-app-field block w-full appearance-none rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
              >
                <option value="English (US)">English (US)</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-cta px-6 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </CollapsibleModule>
  );
}

export const ProfilePanel = memo(ProfilePanelInner);
