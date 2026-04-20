import React, { memo, useCallback, useEffect, useState } from 'react';
import { User, Loader2, Camera, Copy, Check } from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog } from '@headlessui/react';
import { useStore } from '../../store/useStore';
import { toast } from 'sonner';
import { validateAvatarFile } from '../../lib/security';
import { supabase } from '../../lib/supabase';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { yieldForPaint } from '../../lib/interaction';
import { getCroppedAvatarBlob } from '../../lib/cropAvatar';
import { getIanaTimezoneOptions, normalizeTimezoneToIana } from '../../lib/timezones';
import { formatUsNational, nationalDigitsFromStored, toE164 } from '../../lib/phoneInput';
import { cn } from '../../lib/utils';

const DIAL_OPTIONS = [
  { value: '1', label: '+1 (US/CA)' },
  { value: '44', label: '+44 (UK)' },
  { value: '33', label: '+33 (FR)' },
  { value: '49', label: '+49 (DE)' },
  { value: '81', label: '+81 (JP)' },
  { value: '61', label: '+61 (AU)' },
  { value: '91', label: '+91 (IN)' },
  { value: '52', label: '+52 (MX)' },
  { value: '55', label: '+55 (BR)' },
] as const;

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'English (US)', label: 'English (US)' },
  { value: 'Spanish', label: 'Spanish (Beta)' },
  { value: 'French', label: 'French (Beta)' },
  { value: 'German', label: 'German (Beta)' },
];

const IANA_ZONES = getIanaTimezoneOptions();

type SaveVisualState = 'idle' | 'saving' | 'saved';

function ProfilePanelInner() {
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  const [saveVisual, setSaveVisual] = useState<SaveVisualState>('idle');
  const [dialCode, setDialCode] = useState('1');
  const [nationalDigits, setNationalDigits] = useState(() => nationalDigitsFromStored(user.phone));
  const [authPhoneConfirmed, setAuthPhoneConfirmed] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [pendingE164, setPendingE164] = useState('');

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropApplying, setCropApplying] = useState(false);
  const [signInProviderLabel, setSignInProviderLabel] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    timezone: normalizeTimezoneToIana(user.timezone),
    language: user.language || 'English (US)',
  });

  const refreshAuthPhone = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setAuthPhoneConfirmed(!!u?.phone_confirmed_at);
  }, []);

  useEffect(() => {
    void refreshAuthPhone();
  }, [refreshAuthPhone, user.id]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user: u } }) => {
      const nonEmail = u?.identities?.find((i) => i.provider !== 'email');
      const first = u?.identities?.[0]?.provider;
      const p = nonEmail?.provider ?? first;
      if (p === 'google') setSignInProviderLabel('Google');
      else if (p === 'email') setSignInProviderLabel('Email & password');
      else if (p) setSignInProviderLabel(p.charAt(0).toUpperCase() + p.slice(1));
      else setSignInProviderLabel(null);
    });
  }, [user.id]);

  useEffect(() => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      timezone: normalizeTimezoneToIana(user.timezone),
      language: user.language || 'English (US)',
    });
    setNationalDigits(nationalDigitsFromStored(user.phone));
  }, [user.id, user.firstName, user.lastName, user.email, user.phone, user.timezone, user.language]);

  const displayUserId = `OWE_${user.id?.slice(0, 8) ?? '________'}`;

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      toast.success('User ID copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaveVisual('saving');
    await yieldForPaint();
    try {
      const digits = nationalDigits.replace(/\D/g, '');
      const phonePayload = digits.length > 0 ? toE164(dialCode, nationalDigits) : '';
      const ok = await updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: phonePayload,
        timezone: formData.timezone,
        language: formData.language,
      });
      if (ok) {
        setSaveVisual('saved');
        window.setTimeout(() => setSaveVisual('idle'), 2200);
      } else {
        setSaveVisual('idle');
      }
    } catch {
      setSaveVisual('idle');
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  }, []);

  const startPhoneVerification = async () => {
    const digits = nationalDigits.replace(/\D/g, '');
    const e164 = toE164(dialCode, nationalDigits);
    const minDigits = dialCode === '1' ? 10 : 6;
    if (!e164 || digits.length < minDigits) {
      toast.error('Enter a valid phone number first.');
      return;
    }
    setOtpSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: e164 });
      if (error) {
        toast.error(
          error.message?.includes('provider')
            ? 'SMS verification is not enabled for this project yet. Save your number and try again later.'
            : error.message || 'Could not send verification code.',
        );
        return;
      }
      setPendingE164(e164);
      setOtpCode('');
      setOtpOpen(true);
      toast.message('Enter the code we texted you.');
    } finally {
      setOtpSending(false);
    }
  };

  const submitOtp = async () => {
    if (!pendingE164 || otpCode.trim().length < 6) {
      toast.error('Enter the 6-digit code.');
      return;
    }
    setOtpVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: pendingE164,
        token: otpCode.trim(),
        type: 'phone_change',
      });
      if (error) {
        toast.error(error.message || 'Invalid code.');
        return;
      }
      await updateUser({ phone: pendingE164 });
      setAuthPhoneConfirmed(true);
      setOtpOpen(false);
      setPendingE164('');
      toast.success('Phone verified');
      void refreshAuthPhone();
    } finally {
      setOtpVerifying(false);
    }
  };

  const onCropComplete = useCallback((_a: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const openCropForFile = (file: File) => {
    const validation = validateAvatarFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropOpen(false);
  };

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) {
      toast.error('Adjust the crop first.');
      return;
    }
    setCropApplying(true);
    try {
      const blob = await getCroppedAvatarBlob(cropSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const validation = validateAvatarFile(file);
      if (!validation.ok) {
        toast.error(validation.error);
        return;
      }
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) {
        toast.error('Failed to upload picture');
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const ok = await updateUser({ avatar: publicUrl });
      if (ok) toast.success('Profile picture updated');
      else toast.error('Failed to save profile picture');
      closeCrop();
    } finally {
      setCropApplying(false);
    }
  };

  const saveButtonLabel =
    saveVisual === 'saving' ? 'Saving...' : saveVisual === 'saved' ? 'Saved' : 'Save Changes';

  return (
    <>
      <CollapsibleModule
        title="Personal Information"
        icon={User}
        extraHeader={
          <span className="text-xs font-medium text-content-tertiary">
            {signInProviderLabel ? `${signInProviderLabel} sign-in` : 'Sign-in'}
            {authPhoneConfirmed ? (
              <span className="ml-2 text-emerald-500">· Phone verified</span>
            ) : (
              <span className="ml-2 text-content-muted">· Phone not verified</span>
            )}
          </span>
        }
      >
        <div className="-mx-6 -my-6 p-6 bg-surface-base">
          <form onSubmit={(e) => void handleProfileSubmit(e)} className="space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b border-surface-border">
              <div className="relative h-16 w-16 shrink-0">
                <div className="h-16 w-16 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center overflow-hidden shadow-inner">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" data-no-invert />
                  ) : (
                    <span className="text-xl font-semibold text-content-tertiary">
                      {(user.firstName || '?').charAt(0)}
                      {(user.lastName || '?').charAt(0)}
                    </span>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-surface-border bg-surface-raised text-content-secondary shadow-md hover:bg-surface-elevated hover:text-content-primary">
                  <Camera className="h-3.5 w-3.5" aria-hidden />
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) openCropForFile(file);
                    }}
                  />
                </label>
              </div>
              <div className="space-y-2 min-w-0">
                <p className="text-xs text-content-tertiary">JPG or PNG, max 2 MB. Crop after you choose a photo.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-content-secondary">{displayUserId}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyUserId()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-content-tertiary hover:text-content-primary focus-app"
                    aria-label="Copy full user ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
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
                  <span className="ml-2 font-normal text-content-tertiary">(from your auth provider)</span>
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
                <span className="mb-2 block text-xs font-medium text-content-secondary">Phone number</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary sm:w-40"
                    aria-label="Country code"
                  >
                    {DIAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="(555) 000-0000"
                    value={dialCode === '1' ? formatUsNational(nationalDigits) : nationalDigits}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setNationalDigits(dialCode === '1' ? raw.slice(0, 10) : raw.slice(0, 15));
                    }}
                    className="focus-app-field min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void startPhoneVerification()}
                    disabled={otpSending}
                    className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-content-primary hover:bg-surface-elevated disabled:opacity-50"
                  >
                    {otpSending ? 'Sending…' : 'Verify phone'}
                  </button>
                  {authPhoneConfirmed && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="timezone" className="mb-2 block text-xs font-medium text-content-secondary">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="focus-app-field block max-h-48 w-full overflow-auto rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
                >
                  {IANA_ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="language" className="mb-2 block text-xs font-medium text-content-secondary">
                  Language
                </label>
                <select
                  id="language"
                  value={formData.language}
                  disabled
                  className="focus-app-field block w-full cursor-not-allowed appearance-none rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-tertiary transition-colors"
                >
                  {LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-content-muted">
                  The app is English-only today. We keep your selection on your profile for a future translated release.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-8">
              <button
                type="submit"
                disabled={saveVisual === 'saving'}
                className={cn(
                  'flex min-h-10 items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium shadow-none transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  saveVisual === 'saved'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover',
                )}
              >
                {saveVisual === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saveVisual === 'saved' && <Check className="h-3.5 w-3.5" />}
                {saveButtonLabel}
              </button>
            </div>
          </form>
        </div>
      </CollapsibleModule>

      <Dialog open={otpOpen} onClose={() => setOtpOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-raised p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-content-primary">Enter verification code</Dialog.Title>
            <p className="mt-2 text-sm text-content-tertiary">We sent a code to your phone. Enter it below.</p>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="mt-4 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOtpOpen(false)}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={otpVerifying}
                onClick={() => void submitOtp()}
                className="rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base disabled:opacity-50"
              >
                {otpVerifying ? 'Checking…' : 'Confirm'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={cropOpen} onClose={closeCrop} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="flex w-full max-w-lg flex-col rounded-lg border border-surface-border bg-surface-raised p-4 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-content-primary">Crop profile photo</Dialog.Title>
            <p className="mt-1 text-xs text-content-tertiary">Drag and zoom to frame your face.</p>
            <div className="relative mt-4 h-64 w-full overflow-hidden rounded-lg bg-black md:h-80">
              {cropSrc && (
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-content-secondary">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCrop}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cropApplying}
                onClick={() => void applyCrop()}
                className="flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base disabled:opacity-50"
              >
                {cropApplying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save photo
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}

export const ProfilePanel = memo(ProfilePanelInner);
