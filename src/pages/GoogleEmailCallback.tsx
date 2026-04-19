import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { AppLoader } from '../components/PageSkeleton';
import { toast } from 'sonner';
import {
  clearGmailOAuthPkceMaterial,
  clearGmailOAuthSessionStorage,
  consumeGmailOAuthCodeVerifier,
  consumeGmailOAuthState,
  getGoogleEmailOAuthRedirectUri,
} from '../lib/googleEmailOAuth';

/**
 * Gmail OAuth redirect — exchanges code via Edge Function (stores encrypted refresh token).
 */
export default function GoogleEmailCallback() {
  const navigate = useNavigate();
  const doneRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const err = params.get('error');
    const errDesc = params.get('error_description');

    void (async () => {
      if (doneRef.current) return;
      if (err) {
        doneRef.current = true;
        clearGmailOAuthSessionStorage();
        toast.error(errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : 'Gmail connection cancelled.');
        navigate('/settings?tab=integrations', { replace: true });
        return;
      }
      if (!code || !state) {
        doneRef.current = true;
        clearGmailOAuthPkceMaterial();
        toast.error('Missing OAuth response.');
        navigate('/settings?tab=integrations', { replace: true });
        return;
      }
      if (!consumeGmailOAuthState(state)) {
        doneRef.current = true;
        clearGmailOAuthPkceMaterial();
        toast.error('Security check failed. Try connecting again.');
        navigate('/settings?tab=integrations', { replace: true });
        return;
      }

      const codeVerifier = consumeGmailOAuthCodeVerifier();
      if (!codeVerifier) {
        doneRef.current = true;
        toast.error('Missing PKCE verifier. Try connecting again.');
        navigate('/settings?tab=integrations', { replace: true });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        doneRef.current = true;
        toast.error('Sign in to Oweable first.');
        navigate('/auth?redirect=/settings?tab=integrations', { replace: true });
        return;
      }

      const { data, error } = await supabase.functions.invoke('gmail-oauth-callback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          code,
          redirect_uri: getGoogleEmailOAuthRedirectUri(),
          code_verifier: codeVerifier,
        },
      });

      doneRef.current = true;
      if (error) {
        toast.error(error.message || 'Could not complete Gmail connection.');
        navigate('/settings?tab=integrations', { replace: true });
        return;
      }
      const payload = data as { error?: string; email?: string };
      if (payload?.error) {
        toast.error(payload.error);
        navigate('/settings?tab=integrations', { replace: true });
        return;
      }
      toast.success(payload.email ? `Connected ${payload.email}` : 'Gmail connected');
      void useStore.getState().fetchData(undefined, { background: true });
      navigate('/settings?tab=integrations', { replace: true });
    })();
  }, [navigate]);

  return <AppLoader message="Connecting Gmail…" />;
}
