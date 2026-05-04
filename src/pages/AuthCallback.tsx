import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/api/supabase';
import { AppLoader } from '@/components/common';
import { toast } from 'sonner';

function isRecentSignup(createdAt: string | undefined, maxAgeMs = 30 * 60 * 1000) {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs <= maxAgeMs;
}

async function ensureReverseTrial(session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>>['data']['session']) {
  if (!session || !isRecentSignup(session.user.created_at)) return;

  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AuthCallback] Checking profile for trial activation (attempt ${attempt}/${MAX_RETRIES})`);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, plan, trial_started_at, trial_ends_at, trial_expired')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        lastError = profileError;
        console.error(`[AuthCallback] Profile query failed (attempt ${attempt}):`, {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
        });

        // Check if it's a missing column error (42703 = undefined_column)
        if (profileError.code === '42703' || profileError.message?.includes('column')) {
          console.error('[AuthCallback] ⚠️ Missing columns detected - run FIX_TRIAL_COLUMNS.sql migration');

          // Don't retry column errors - they won't fix themselves
          toast.error('Database setup incomplete. Please contact support.');
          return;
        }

        // Retry on transient errors (network, timeout, etc.)
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`[AuthCallback] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // All retries exhausted
        console.error('[AuthCallback] ❌ Failed to query profile after all retries');
        toast.warning('Could not verify trial status. Proceeding anyway.');
        return;
      }

      // Success - check if trial already active
      const alreadyOnTrial =
        profile?.plan === 'trial' &&
        profile?.trial_expired === false &&
        !!profile?.trial_ends_at &&
        new Date(profile.trial_ends_at).getTime() > Date.now();

      if (alreadyOnTrial || profile?.plan === 'full_suite' || profile?.trial_started_at) {
        console.log('[AuthCallback] Trial already active or user on full suite');
        return;
      }

      // Activate trial
      console.log('[AuthCallback] Activating 14-day trial...');
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: session.user.id,
          email: session.user.email ?? null,
          first_name:
            session.user.user_metadata?.given_name ??
            session.user.user_metadata?.first_name ??
            session.user.user_metadata?.full_name?.split(' ')[0] ??
            session.user.user_metadata?.name?.split(' ')[0] ??
            '',
          last_name:
            session.user.user_metadata?.family_name ??
            session.user.user_metadata?.last_name ??
            session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ??
            session.user.user_metadata?.name?.split(' ').slice(1).join(' ') ??
            '',
          avatar: session.user.user_metadata?.picture ?? session.user.user_metadata?.avatar_url ?? '',
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
        console.error('[AuthCallback] Failed to activate trial:', upsertError);
        toast.error('Failed to activate trial. Please contact support.');
      } else {
        console.log('[AuthCallback] ✅ Trial activated successfully');
      }

      return; // Success - exit retry loop
    } catch (err) {
      lastError = err;
      console.error(`[AuthCallback] Unexpected error (attempt ${attempt}):`, err);

      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  console.error('[AuthCallback] ensureReverseTrial failed completely:', lastError);
}

/**
 * Handle Supabase OAuth callback and ensure session is hydrated before redirect.
 * Uses only onAuthStateChange listener with timeout fallback to prevent race conditions.
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
      redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/dashboard';
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

    const finishSignedIn = async (session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>>['data']['session']) => {
      if (!session) return;
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

    // Use ONLY onAuthStateChange with timeout - no polling to prevent race conditions
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (!navigatedRef.current) {
        toast.error('Sign-in timed out. Please try again.');
        go('/auth');
      }
    }, 20_000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (timedOut || navigatedRef.current) return;

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        clearTimeout(timeoutId);
        void finishSignedIn(session);
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(timeoutId);
        go('/auth');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return <AppLoader message="Signing you in…" />;
}
