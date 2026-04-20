import React, { memo, useEffect, useState } from 'react';
import { Lock, Shield, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';

function SecurityPanelInner() {
  const userEmail = useStore((s) => s.user.email);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [hasEmailPassword, setHasEmailPassword] = useState<boolean | null>(null);

  const securityScoreMax = 2;
  const securityScore = (mfaEnabled ? 1 : 0) + (hasEmailPassword ? 1 : 0);

  useEffect(() => {
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        const verified = (data?.totp ?? []).filter((f: { status?: string }) => f.status === 'verified');
        setMfaEnabled(verified.length > 0);
      })
      .catch(() => setMfaEnabled(false));
  }, []);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      const ids = user?.identities ?? [];
      setHasEmailPassword(ids.some((i) => i.provider === 'email'));
    });
  }, []);

  const scoreHint = (() => {
    if (mfaEnabled === null || hasEmailPassword === null) return 'Checking your sign-in methods…';
    if (mfaEnabled && hasEmailPassword) return 'Strong — 2FA and an Oweable password are both enabled.';
    if (mfaEnabled && !hasEmailPassword) return '2FA is on. Password changes apply only if you use email & password sign-in.';
    if (!mfaEnabled && hasEmailPassword) return 'Use a strong unique password; add authenticator 2FA when it is available in Oweable.';
    return 'You sign in with a social or SSO provider — use that provider’s security settings for passwords and 2FA.';
  })();

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
        <p className="mt-1 text-xs text-content-tertiary">{scoreHint}</p>
        <p className="mt-2 text-xs text-content-muted">
          Score reflects Oweable TOTP 2FA (when enabled) and email/password sign-in only.
        </p>
      </div>

      <CollapsibleModule title="Password" icon={Lock} defaultOpen>
        {hasEmailPassword === null ? (
          <p className="text-sm text-content-tertiary">Checking how you sign in…</p>
        ) : hasEmailPassword ? (
          <>
            <p className="text-sm text-content-tertiary mb-6">Use a long, random password unique to Oweable.</p>
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
          </>
        ) : (
          <p className="text-sm text-content-tertiary max-w-md">
            You&apos;re signed in with a social or SSO provider, not an Oweable-only password. Manage passwords and two-factor
            authentication in that provider&apos;s security settings.
          </p>
        )}
      </CollapsibleModule>

      <CollapsibleModule
        title="Two-Factor Authentication"
        icon={Shield}
        defaultOpen
        summaryWhenCollapsed={
          mfaEnabled === null ? 'Checking…' : mfaEnabled ? 'Enabled' : 'Not enabled'
        }
      >
        <div className="flex items-start gap-3 border border-surface-border rounded-lg p-4 bg-surface-elevated/50">
          <div
            className={`w-10 h-10 shrink-0 border rounded-full flex items-center justify-center ${
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
          <div className="min-w-0">
            <p className="text-sm font-medium text-content-primary">
              {mfaEnabled === null ? 'Checking status…' : mfaEnabled ? 'Authenticator 2FA is enabled' : 'Authenticator 2FA is not enabled'}
            </p>
            <p className="mt-1 text-sm text-content-tertiary">
              {mfaEnabled
                ? 'Your account uses a verified authenticator factor.'
                : 'Oweable does not offer enrolling new authenticator factors yet. Use your sign-in provider’s 2FA when you use Google or SSO.'}
            </p>
          </div>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const SecurityPanel = memo(SecurityPanelInner);
