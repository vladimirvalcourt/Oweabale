import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppLoader } from '../components/PageSkeleton';
import { toast } from 'sonner';

async function waitForSession(maxMs: number) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return session;
    await new Promise((r) => setTimeout(r, 120));
  }
  return null;
}

function isRecentSignup(createdAt: string | undefined, maxAgeMs = 30 * 60 * 1000) {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs <= maxAgeMs;
}

async function ensureReverseTrial(session: NonNullable<Awaited<ReturnType<typeof waitForSession>>>) {
  const user = session.user;
  if (!isRecentSignup(user.created_at)) return;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, plan, trial_started_at, trial_ends_at, trial_expired')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[AuthCallback] failed to inspect profile for trial activation:', profileError);
    return;
  }

  const alreadyOnTrial =
    profile?.plan === 'trial' &&
    profile?.trial_expired === false &&
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at).getTime() > Date.now();

  if (alreadyOnTrial || profile?.plan === 'full_suite' || profile?.trial_started_at) {
    return;
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      first_name:
        user.user_metadata?.given_name ??
        user.user_metadata?.first_name ??
        user.user_metadata?.full_name?.split(' ')[0] ??
        user.user_metadata?.name?.split(' ')[0] ??
        '',
      last_name:
        user.user_metadata?.family_name ??
        user.user_metadata?.last_name ??
        user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ??
        user.user_metadata?.name?.split(' ').slice(1).join(' ') ??
        '',
      avatar: user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? '',
      has_completed_onboarding: false,
      is_admin: false,
      plan: 'trial',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      trial_expired: false,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    console.error('[AuthCallback] failed to activate reverse trial:', upsertError);
  }
}

/**
 * Handle Supabase OAuth callback and ensure session is hydrated before redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handledOAuthErrorRef = useRef(false);
  const navigatedRef = useRef(false);
  const welcomeEmailSentRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const redirectTarget = params.get('redirect');
    const finalRedirect =
      redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/auth';
    const oauthError = params.get('error') ?? hashParams.get('error');
    const oauthDesc = params.get('error_description') ?? hashParams.get('error_description');
    if (oauthError && !handledOAuthErrorRef.current) {
      handledOAuthErrorRef.current = true;
      const msg = oauthDesc
        ? decodeURIComponent(oauthDesc.replace(/\+/g, ' '))
        : 'Sign-in was cancelled or failed.';
      toast.error(msg);
      navigate('/auth', { replace: true });
      return;
    }

    const go = (path: string) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigate(path, { replace: true });
    };

    const finishSignedIn = async (session: NonNullable<Awaited<ReturnType<typeof waitForSession>>>) => {
      await ensureReverseTrial(session);

      if (isRecentSignup(session.user.created_at) && !welcomeEmailSentRef.current) {
        welcomeEmailSentRef.current = true;
        try {
          const user = session.user;
          const firstName =
            user.user_metadata?.given_name ||
            user.user_metadata?.first_name ||
            user.email?.split('@')[0] ||
            'there';

          // Invoke welcome email Edge Function (fire-and-forget, don't block navigation)
          supabase.functions
            .invoke('trial-welcome-email', {
              body: {
                email: user.email,
                firstName,
              },
            })
            .catch((error) => {
              console.error('Failed to send welcome email:', error);
            });
        } catch (error) {
          console.error('Error preparing welcome email:', error);
        }
      }

      go(finalRedirect);
    };

    void (async () => {
      const session = await waitForSession(20_000);
      if (session) {
        await finishSignedIn(session);
        return;
      }
      toast.error('Could not restore your session. Try signing in again.');
      go('/auth');
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        void finishSignedIn(session);
      } else if (event === 'SIGNED_OUT') {
        go('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AppLoader message="Signing you in…" />;
}
