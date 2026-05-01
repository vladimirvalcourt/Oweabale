import React, { memo, useEffect, useState } from 'react';
import { Lock, Shield, CheckCircle2, Loader2, ShieldCheck, ShieldAlert, QrCode, Copy, Smartphone } from 'lucide-react';
import { CollapsibleModule } from '@/components/common';
import { supabase } from '@/lib/api/supabase';
import { toast } from 'sonner';
import { useStore } from '@/store';
import { getCustomIcon } from '@/lib/utils/customIcons';
import { EXTERNAL_RESOURCES } from '@/config/externalResources';


function SecurityPanelInner() {
  const SecurityIcon = getCustomIcon('security');
  const userEmail = useStore((s) => s.user.email);
  const isAdmin = useStore((s) => s.user.isAdmin);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [hasEmailPassword, setHasEmailPassword] = useState<boolean | null>(null);

  // MFA Enrollment State
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);

  // E-02: true = SSO-only user (Google, GitHub, etc.), no email/password identity.
  const isSsoOnly = hasEmailPassword === false;

  const securityScoreMax = 2;
  const securityScore = (mfaEnabled ? 1 : 0) + (hasEmailPassword ? 1 : 0);

  useEffect(() => {
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        const verified = (data?.totp ?? []).filter((f: { status?: string }) => f.status === 'verified');
        setMfaEnabled(verified.length > 0);
      })
      .catch((err) => { console.warn('[SecurityPanel] MFA factor listing failed:', err); setMfaEnabled(false); });
  }, []);

  // MFA Enrollment Functions
  const startMfaEnrollment = async () => {
    try {
      setIsEnrollingMfa(true);

      // Step 1: Enroll a new TOTP factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        console.error('MFA enrollment error:', error);
        toast.error('Failed to start MFA setup. Please try again.');
        return;
      }

      // Step 2: Show QR code and secret
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setShowMfaSetup(true);
    } catch (err) {
      console.error('MFA enrollment exception:', err);
      toast.error('An error occurred during MFA setup');
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const verifyMfaEnrollment = async () => {
    if (!mfaVerifyCode || mfaVerifyCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsEnrollingMfa(true);

      // Verify the TOTP code
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId!,
        code: mfaVerifyCode,
      });

      if (error) {
        console.error('MFA verification error:', error);
        toast.error('Invalid code. Please check your authenticator app and try again.');
        return;
      }

      // Success!
      toast.success('Two-factor authentication enabled successfully!');
      setMfaEnabled(true);
      setShowMfaSetup(false);
      setMfaQrCode(null);
      setMfaSecret(null);
      setMfaVerifyCode('');
    } catch (err) {
      console.error('MFA verification exception:', err);
      toast.error('Failed to verify MFA code');
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const cancelMfaSetup = () => {
    setShowMfaSetup(false);
    setMfaQrCode(null);
    setMfaSecret(null);
    setMfaFactorId(null);
    setMfaVerifyCode('');
  };

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
    return "You sign in with a social or SSO provider \u2014 use that provider's security settings for passwords and 2FA.";
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-xs font-medium text-content-secondary">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-content-tertiary" aria-hidden />
        <span>Secure connection — your session is encrypted in transit (HTTPS).</span>
      </div>

      {/* E-02: Show trust badge for SSO users instead of a misleading 0/2 score */}
      {isSsoOnly ? (
        <div className="flex items-start gap-3 rounded-md border border-[var(--color-status-emerald-border)] bg-[var(--color-status-emerald-bg)] px-4 py-3">
          <ShieldCheck className="w-5 h-5 shrink-0 text-[var(--color-status-emerald-text)] mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-medium text-[var(--color-status-emerald-text)]">
              Secured via Google
            </p>
            <p className="mt-1 text-xs text-content-secondary leading-relaxed">
              Your account is secured through your Google sign-in. Manage your password and
              two-factor authentication directly in your{' '}
              <a
                href={EXTERNAL_RESOURCES.auth.googleSecurity}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:no-underline"
              >
                Google account security settings
              </a>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-surface-border bg-surface-elevated/50 px-4 py-3">
          <p className="text-sm font-medium text-content-primary">
            Security score: {hasEmailPassword === null || mfaEnabled === null ? '…' : `${securityScore}/${securityScoreMax}`}
          </p>
          <p className="mt-1 text-xs text-content-tertiary">{scoreHint}</p>
          <p className="mt-2 text-xs text-content-muted">
            Score reflects Oweable TOTP 2FA (when enabled) and email/password sign-in only.
          </p>
        </div>
      )}

      <CollapsibleModule title="Password" icon={SecurityIcon} defaultOpen>
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
                  className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-md px-3 py-2 border transition-colors"
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
                  className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-md px-3 py-2 border transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary">Confirm password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="mt-1 focus-app-field block w-full sm:text-sm border-surface-border bg-surface-base text-content-primary rounded-md px-3 py-2 border transition-colors"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-cta text-surface-base hover:bg-brand-cta-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors focus-app"
                >
                  {isUpdatingPassword && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="text-sm text-content-tertiary max-w-md">
            You&apos;re signed in with a social or SSO provider, not an Oweable-only password. Manage passwords and
            two-factor authentication in that provider&apos;s security settings.
          </p>
        )}
      </CollapsibleModule>

      <CollapsibleModule
        title="Two-Factor Authentication"
        icon={SecurityIcon}
        defaultOpen
        summaryWhenCollapsed={
          mfaEnabled === null ? 'Checking…' : mfaEnabled ? 'Enabled' : 'Not enabled'
        }
      >
        {showMfaSetup && mfaQrCode ? (
          // MFA Setup Flow
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border bg-surface-elevated/50 p-6">
              <h3 className="text-sm font-semibold text-content-primary mb-2">Set up authenticator app</h3>
              <p className="text-xs text-content-secondary mb-4">
                Scan the QR code below with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
              </p>

              {/* QR Code Display */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={mfaQrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              </div>

              {/* Manual Entry Option */}
              <div className="mb-4">
                <p className="text-xs text-content-tertiary mb-2">Can't scan? Enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-surface-base border border-surface-border rounded text-xs font-mono text-content-primary break-all">
                    {mfaSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mfaSecret || '');
                      toast.success('Secret copied to clipboard');
                    }}
                    className="p-2 hover:bg-surface-elevated rounded transition-colors"
                    title="Copy secret"
                  >
                    <Copy className="w-4 h-4 text-content-secondary" />
                  </button>
                </div>
              </div>

              {/* Verification Code Input */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-content-secondary">
                  Enter the 6-digit code from your app
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaVerifyCode}
                  onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-2 border border-surface-border rounded-md bg-surface-base text-content-primary text-center text-lg font-mono tracking-widest focus-app-field"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelMfaSetup}
                    className="flex-1 px-4 py-2 border border-surface-border rounded-md text-sm text-content-secondary hover:bg-surface-elevated transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void verifyMfaEnrollment()}
                    disabled={isEnrollingMfa || mfaVerifyCode.length !== 6}
                    className="flex-1 px-4 py-2 bg-brand-cta text-surface-base rounded-md text-sm font-medium hover:bg-brand-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isEnrollingMfa && <Loader2 className="w-4 h-4 animate-spin" />}
                    Verify & Enable
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : mfaEnabled ? (
          // MFA Enabled State
          <div className="flex items-start gap-3 border border-surface-border rounded-xl p-4 bg-surface-elevated/50">
            <div className="w-10 h-10 shrink-0 border rounded-full flex items-center justify-center border-[var(--color-status-emerald-border)] bg-[var(--color-status-emerald-bg)]">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-status-emerald-text)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-content-primary">Authenticator 2FA is enabled</p>
              <p className="mt-1 text-sm text-content-tertiary">Your account uses a verified authenticator factor.</p>
              {isAdmin && (
                <p className="mt-2 text-xs text-[var(--color-status-emerald-text)] font-medium">
                  ✓ Admin panel access granted
                </p>
              )}
            </div>
          </div>
        ) : (
          // MFA Not Enabled - Show Enable Button
          <div className="space-y-4">
            <div className="flex items-start gap-3 border border-surface-border rounded-xl p-4 bg-surface-elevated/50">
              <div className="w-10 h-10 shrink-0 border border-surface-border bg-surface-raised rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-content-tertiary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content-primary">Authenticator 2FA is not enabled</p>
                <p className="mt-1 text-sm text-content-tertiary">
                  Required for admin panel access. Enroll an authenticator app to add a second layer of sign-in security.
                </p>
                {isSsoOnly && (
                  <p className="mt-2 text-xs text-[var(--color-status-amber-text)]">
                    ⚠️ Note: Since you use Google sign-in, you'll still need TOTP 2FA for admin access.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void startMfaEnrollment()}
              disabled={isEnrollingMfa}
              className="w-full sm:w-auto px-6 py-3 bg-brand-cta text-surface-base rounded-md text-sm font-medium hover:bg-brand-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isEnrollingMfa ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  Enable Two-Factor Authentication
                </>
              )}
            </button>

            <div className="rounded-lg border border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] p-3">
              <p className="text-xs text-[var(--color-status-amber-text)]">
                <strong>Important:</strong> After enabling 2FA, you'll need to enter a code from your authenticator app each time you sign in. This is required for admin panel access.
              </p>
            </div>
          </div>
        )}
      </CollapsibleModule>
    </div>
  );
}

export const SecurityPanel = memo(SecurityPanelInner);
