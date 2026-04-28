import React, { memo, useCallback, useEffect, useState } from 'react';
import { User, Loader2, Camera, Copy, Check, Info } from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog } from '@headlessui/react';
import { useStore } from '../../store';
import { toast } from 'sonner';
import { validateAvatarFile } from '../../lib/api/security';
import { supabase } from '../../lib/api/supabase';
import { CollapsibleModule } from '../../components/common';
import { yieldForPaint } from "../../lib/api/services";
import { getCroppedAvatarBlob } from "../../lib/utils/cropAvatar";
import { getIanaTimezoneOptions, normalizeTimezoneToIana } from "../../lib/utils/timezones";
import { formatUsNational, nationalDigitsFromStored, toE164 } from "../../lib/utils/phoneInput";
import { cn } from '../../lib/utils';
import { getCustomIcon } from '../../lib/utils/customIcons';

// E-07: Comprehensive ITU calling code dataset (60+ countries).
// Sorted by usage frequency (US first) then alphabetically.
const FULL_DIAL_OPTIONS = [
  { value: '1',   label: '+1 · US / Canada' },
  { value: '44',  label: '+44 · United Kingdom' },
  { value: '33',  label: '+33 · France' },
  { value: '49',  label: '+49 · Germany' },
  { value: '61',  label: '+61 · Australia' },
  { value: '91',  label: '+91 · India' },
  { value: '52',  label: '+52 · Mexico' },
  { value: '55',  label: '+55 · Brazil' },
  { value: '81',  label: '+81 · Japan' },
  { value: '86',  label: '+86 · China' },
  { value: '82',  label: '+82 · South Korea' },
  { value: '34',  label: '+34 · Spain' },
  { value: '39',  label: '+39 · Italy' },
  { value: '31',  label: '+31 · Netherlands' },
  { value: '46',  label: '+46 · Sweden' },
  { value: '47',  label: '+47 · Norway' },
  { value: '45',  label: '+45 · Denmark' },
  { value: '358', label: '+358 · Finland' },
  { value: '41',  label: '+41 · Switzerland' },
  { value: '43',  label: '+43 · Austria' },
  { value: '32',  label: '+32 · Belgium' },
  { value: '351', label: '+351 · Portugal' },
  { value: '30',  label: '+30 · Greece' },
  { value: '48',  label: '+48 · Poland' },
  { value: '420', label: '+420 · Czech Republic' },
  { value: '36',  label: '+36 · Hungary' },
  { value: '40',  label: '+40 · Romania' },
  { value: '7',   label: '+7 · Russia' },
  { value: '380', label: '+380 · Ukraine' },
  { value: '90',  label: '+90 · Turkey' },
  { value: '972', label: '+972 · Israel' },
  { value: '971', label: '+971 · UAE' },
  { value: '966', label: '+966 · Saudi Arabia' },
  { value: '20',  label: '+20 · Egypt' },
  { value: '234', label: '+234 · Nigeria' },
  { value: '27',  label: '+27 · South Africa' },
  { value: '254', label: '+254 · Kenya' },
  { value: '233', label: '+233 · Ghana' },
  { value: '60',  label: '+60 · Malaysia' },
  { value: '65',  label: '+65 · Singapore' },
  { value: '62',  label: '+62 · Indonesia' },
  { value: '63',  label: '+63 · Philippines' },
  { value: '84',  label: '+84 · Vietnam' },
  { value: '66',  label: '+66 · Thailand' },
  { value: '880', label: '+880 · Bangladesh' },
  { value: '92',  label: '+92 · Pakistan' },
  { value: '94',  label: '+94 · Sri Lanka' },
  { value: '98',  label: '+98 · Iran' },
  { value: '964', label: '+964 · Iraq' },
  { value: '962', label: '+962 · Jordan' },
  { value: '961', label: '+961 · Lebanon' },
  { value: '54',  label: '+54 · Argentina' },
  { value: '56',  label: '+56 · Chile' },
  { value: '57',  label: '+57 · Colombia' },
  { value: '51',  label: '+51 · Peru' },
  { value: '58',  label: '+58 · Venezuela' },
  { value: '593', label: '+593 · Ecuador' },
  { value: '53',  label: '+53 · Cuba' },
  { value: '1876', label: '+1876 · Jamaica' },
  { value: '64',  label: '+64 · New Zealand' },
  { value: '679', label: '+679 · Fiji' },
  { value: '353', label: '+353 · Ireland' },
  { value: '354', label: '+354 · Iceland' },
  { value: '370', label: '+370 · Lithuania' },
  { value: '371', label: '+371 · Latvia' },
  { value: '372', label: '+372 · Estonia' },
] as const;



const IANA_ZONES = getIanaTimezoneOptions();

type SaveVisualState = 'idle' | 'saving' | 'saved';

function ProfilePanelInner() {
  const OverviewIcon = getCustomIcon('overview');
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  const [saveVisual, setSaveVisual] = useState<SaveVisualState>('idle');
  const [dialCode, setDialCode] = useState(() => {
    // Infer dialCode from stored phone on mount
    const stored = user.phone ?? '';
    if (!stored) return '1';
    const match = FULL_DIAL_OPTIONS.find((o) => stored.startsWith(`+${o.value}`));
    return match?.value ?? '1';
  });
  // E-07: search field text; initialized to the matching label so the field is pre-filled
  const [dialSearch, setDialSearch] = useState<string>(() => {
    const stored = user.phone ?? '';
    const match = FULL_DIAL_OPTIONS.find((o) => stored.startsWith(`+${o.value}`));
    return match ? match.label : FULL_DIAL_OPTIONS[0].label;
  });
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
    });
    setNationalDigits(nationalDigitsFromStored(user.phone));
  }, [user.id, user.firstName, user.lastName, user.email, user.phone, user.timezone]);

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
      });
      if (ok) {
        setSaveVisual('saved');
        toast.success('Profile updated');
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

  // SET-03: track unsaved changes to show sticky action bar
  const isDirty =
    formData.firstName !== (user.firstName || '') ||
    formData.lastName !== (user.lastName || '') ||
    formData.timezone !== normalizeTimezoneToIana(user.timezone);

  const handleDiscard = useCallback(() => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      timezone: normalizeTimezoneToIana(user.timezone),
    });
  }, [user]);

  return (
    <>
      <CollapsibleModule
        title="Personal Information"
        icon={OverviewIcon}
        extraHeader={
          <span className="text-xs font-medium text-content-tertiary">
            {signInProviderLabel ? `${signInProviderLabel} sign-in` : 'Sign-in'}
          </span>
        }
      >
        <div className="-mx-6 -my-6 p-6 bg-surface-base">
          <form onSubmit={(e) => void handleProfileSubmit(e)} className="space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b border-surface-border">
              <div className="relative h-16 w-16 shrink-0">
                <div className="h-16 w-16 rounded-md bg-surface-elevated border border-surface-border flex items-center justify-center overflow-hidden shadow-inner">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" data-no-invert />
                  ) : (
                    <span className="text-xl font-medium text-content-tertiary">
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
                {/* SET-01: Support ID with label and helper text */}
                <p className="text-[11px] font-medium text-content-tertiary">Your Support ID</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-content-secondary">{displayUserId}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyUserId()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-surface-border text-content-tertiary hover:text-content-primary focus-app"
                    aria-label="Copy full user ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-content-muted">Share this with our team if you need help.</p>
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
                  className="focus-app-field block w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
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
                  className="focus-app-field block w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
                />
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="email" className="mb-2 flex items-center gap-1 text-xs font-medium text-content-secondary">
                  Email address
                  {/* SET-02: tooltip explaining read-only email */}
                  <span className="relative ml-0.5 inline-flex cursor-default items-center group">
                    <Info className="h-3 w-3 text-content-muted" aria-hidden />
                    <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 w-56 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised px-2.5 py-1.5 text-[11px] font-normal leading-snug text-content-secondary opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      This email comes from your Google sign-in. To change it, update your Google account.
                    </span>
                  </span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  readOnly
                  className="block w-full cursor-not-allowed select-none rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-tertiary focus-app-field"
                />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="timezone" className="mb-2 block text-xs font-medium text-content-secondary">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="focus-app-field block max-h-48 w-full overflow-auto rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content-primary transition-colors"
                >
                  {IANA_ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SET-03: sticky action bar — appears only when fields have changed */}
            {isDirty && (
              <div className="sticky bottom-0 z-10 -mx-8 mt-8 flex items-center justify-end gap-3 border-t border-surface-border bg-surface-elevated/95 px-8 py-4 backdrop-blur-sm sm:-mx-10 sm:px-10">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={saveVisual === 'saving'}
                  className="rounded-md border border-surface-border px-5 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saveVisual === 'saving'}
                  className={cn(
                    'flex min-h-10 items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium shadow-none transition-[background-color,transform] disabled:cursor-not-allowed disabled:opacity-60',
                    saveVisual === 'saved'
                      ? 'dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover',
                  )}
                >
                  {saveVisual === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saveVisual === 'saved' && <Check className="h-3.5 w-3.5" />}
                  {saveButtonLabel}
                </button>
              </div>
            )}
          </form>
        </div>
      </CollapsibleModule>

      <Dialog open={otpOpen} onClose={() => setOtpOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-md border border-surface-border bg-surface-raised p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium tracking-[-0.024em] text-content-primary">Enter verification code</Dialog.Title>
            <p className="mt-2 text-sm text-content-tertiary">We sent a code to your phone. Enter it below.</p>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="mt-4 w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOtpOpen(false)}
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-content-secondary transition-colors hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={otpVerifying}
                onClick={() => void submitOtp()}
                className="rounded-md bg-brand-indigo px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px disabled:opacity-50"
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
          <Dialog.Panel className="flex w-full max-w-lg flex-col rounded-md border border-surface-border bg-surface-raised p-4 shadow-xl">
            <Dialog.Title className="text-lg font-medium tracking-[-0.024em] text-content-primary">Crop profile photo</Dialog.Title>
            <p className="mt-1 text-xs text-content-tertiary">Drag and zoom to frame your face.</p>
            <div className="relative mt-4 h-64 w-full overflow-hidden rounded-md bg-black md:h-80">
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
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-content-secondary transition-colors hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cropApplying}
                onClick={() => void applyCrop()}
                className="flex items-center gap-2 rounded-md bg-brand-indigo px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px disabled:opacity-50"
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
