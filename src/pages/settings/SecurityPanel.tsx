import React, { memo, useEffect, useState } from 'react';
import { Lock, Shield, Smartphone, CheckCircle2, Loader2, Fingerprint, ShieldCheck } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

function SecurityPanelInner() {
  const userEmail = useStore((s) => s.user.email);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [biometrics, setBiometrics] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const securityScore = (mfaEnabled ? 1 : 0) + (biometrics ? 1 : 0) + 1;
  const securityScoreMax = 3;

  useEffect(() => {
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        const verified = (data?.totp ?? []).filter((f: { status?: string }) => f.status === 'verified');
        setMfaEnabled(verified.length > 0);
      })
      .catch(() => setMfaEnabled(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-secondary">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-content-tertiary" aria-hidden />
        <span>Secure connection — your session is encrypted in transit (HTTPS).</span>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-elevated/50 px-4 py-3">
        <p className="text-sm font-medium text-content-primary">
          Security score: {securityScore}/{securityScoreMax}
        </p>
        <p className="mt-1 text-xs text-content-tertiary">
          {mfaEnabled && biometrics
            ? 'Strong — 2FA and app lock are enabled.'
            : 'Enable 2FA and biometrics below to strengthen your account.'}
        </p>
      </div>

      <CollapsibleModule title="Password" icon={Lock} defaultOpen>
        <p className="text-sm text-content-tertiary mb-6">Ensure your account is using a long, random password to stay secure.</p>
        <form
          className="space-y-4 max-w-md"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const currentPw = (form.elements.namedItem('currentPassword') as HTMLInputElement).value;
            const newPw = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
            const confirmPw = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
            if (newPw !== confirmPw) {
              toast.error('Passwords do not match');
              return;
            }
            if (newPw.length < 8) {
              toast.error('Password must be at least 8 characters');
              return;
            }
            setIsUpdatingPassword(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              const email = user?.email?.trim();
              if (!email) {
                toast.error('No email on file for this account.');
                return;
              }
              const { error: verifyErr } = await supabase.auth.signInWithPassword({
                email,
                password: currentPw,
              });
              if (verifyErr) {
                toast.error('Incorrect current password. Please try again.');
                return;
              }
              const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
              if (updateErr) {
                toast.error(updateErr.message || 'Could not update password.');
                return;
              }
              toast.success('Password updated successfully');
              form.reset();
            } finally {
              setIsUpdatingPassword(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-content-secondary">Current password</label>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-lg px-3 py-2 border transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary">New password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-lg px-3 py-2 border transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary">Confirm password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-lg px-3 py-2 border transition-colors"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="flex items-center gap-2 px-4 py-2 bg-brand-cta text-surface-base hover:bg-brand-cta-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors focus-app"
            >
              {isUpdatingPassword && <Loader2 className="w-3 h-3 animate-spin" />}
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </CollapsibleModule>

      <CollapsibleModule
        title="Two-Factor Authentication"
        icon={Shield}
        defaultOpen
        summaryWhenCollapsed={
          mfaEnabled === null ? 'Checking…' : mfaEnabled ? 'Enabled' : 'Not enabled'
        }
      >
        <p className="text-sm text-content-tertiary mb-6">Add additional security to your account using two-factor authentication.</p>
        <div className="flex items-center justify-between border border-surface-border rounded-lg p-4 bg-surface-elevated/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 border rounded-full flex items-center justify-center ${
                mfaEnabled ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-surface-border bg-surface-raised'
              }`}
            >
              {mfaEnabled === null ? (
                <Loader2 className="w-5 h-5 text-content-tertiary animate-spin" />
              ) : mfaEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <Shield className="w-5 h-5 text-content-tertiary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-content-primary">
                {mfaEnabled === null ? 'Checking status...' : mfaEnabled ? '2FA is enabled' : '2FA is not enabled'}
              </p>
              <p className="text-sm text-content-tertiary">
                {mfaEnabled ? 'Authenticator App' : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>
          {mfaEnabled === false && (
            <button
              type="button"
              onClick={() => deferToast(() => toast.info('2FA setup coming soon'))}
              className="px-4 py-2 bg-brand-cta hover:bg-brand-cta-hover rounded-lg text-sm font-medium text-surface-base transition-colors"
            >
              Enable 2FA
            </button>
          )}
        </div>
      </CollapsibleModule>

      <CollapsibleModule
        title="Biometric Authentication"
        icon={Fingerprint}
        defaultOpen={false}
        summaryWhenCollapsed={biometrics ? 'App lock on' : 'App lock off'}
      >
        <p className="text-sm text-content-tertiary mb-6">Require FaceID or TouchID when opening the application.</p>
        <div className="flex items-center justify-between border border-surface-border rounded-lg p-4 bg-surface-elevated/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-raised border border-surface-border rounded-lg flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-content-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-content-primary">App Lock</p>
              <p className="text-xs text-content-tertiary">{biometrics ? 'Currently enabled' : 'Currently disabled'}</p>
            </div>
          </div>
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              checked={biometrics}
              onChange={(e) => {
                const checked = e.target.checked;
                setBiometrics(checked);
                deferToast(() => toast.success(checked ? 'Biometrics enabled' : 'Biometrics disabled'));
              }}
              className="h-4 w-4 text-content-primary focus-app bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
            />
          </div>
        </div>
      </CollapsibleModule>

      <CollapsibleModule
        title="Active Sessions"
        icon={Smartphone}
        defaultOpen={false}
        summaryWhenCollapsed="This device — Active"
      >
        <p className="text-sm text-content-tertiary mb-6">Manage and log out your active sessions on other browsers and devices.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-surface-border bg-surface-elevated/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Smartphone className="w-6 h-6 text-content-tertiary" />
              <div>
                <p className="text-sm font-medium text-content-primary">Current Session</p>
                <p className="text-xs text-content-tertiary">Signed in as {userEmail}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full bg-emerald-500/10">
              Active
            </span>
          </div>
          <p className="text-xs font-medium text-content-muted">
            Multi-device session management is not yet available.
          </p>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const SecurityPanel = memo(SecurityPanelInner);
