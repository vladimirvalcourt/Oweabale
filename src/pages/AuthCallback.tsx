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

/**
 * Handle Supabase OAuth callback and ensure session is hydrated before redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handledOAuthErrorRef = useRef(false);
  const navigatedRef = useRef(false);

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

    void (async () => {
      const session = await waitForSession(20_000);
      if (session) {
        // Send welcome email for new users on their first sign-in
        try {
          const user = session.user;
          const firstName = 
            user.user_metadata?.given_name || 
            user.user_metadata?.first_name ||
            user.email?.split('@')[0] || 
            'there';
          
          // Invoke welcome email Edge Function (fire-and-forget, don't block navigation)
          supabase.functions.invoke('trial-welcome-email', {
            body: {
              email: user.email,
              firstName: firstName,
            },
          }).catch((error) => {
            // Log error but don't show to user - email is non-critical
            console.error('Failed to send welcome email:', error);
          });
        } catch (error) {
          console.error('Error preparing welcome email:', error);
        }
        
        go(finalRedirect);
        return;
      }
      toast.error('Could not restore your session. Try signing in again.');
      go('/auth');
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        go(finalRedirect);
      } else if (event === 'SIGNED_OUT') {
        go('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AppLoader message="Signing you in…" />;
}
