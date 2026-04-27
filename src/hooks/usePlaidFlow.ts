import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  usePlaidLink,
  type PlaidLinkOnSuccess,
  type PlaidLinkOnExitMetadata,
  type PlaidLinkError,
} from 'react-plaid-link';
import { toast } from 'sonner';
import { createPlaidLinkToken, exchangePlaidPublicToken } from '../lib/api/plaid';
import { normalizePlaidFlowErrorMessage } from '../lib/api/plaid/errors';
import { track } from '../lib/utils';

export type PlaidFlowIntent = 'create' | 'update';
export type PlaidFlowStage =
  | 'idle'
  | 'creating_link_token'
  | 'link_ready'
  | 'link_open'
  | 'oauth_redirect'
  | 'exchanging'
  | 'syncing'
  | 'success'
  | 'error';

interface UsePlaidFlowOptions {
  enabled: boolean;
  onConnected: () => Promise<void>;
  onInitialSync: () => Promise<boolean>;
}

interface UsePlaidFlowResult {
  stage: PlaidFlowStage;
  errorMessage: string | null;
  activeIntent: PlaidFlowIntent;
  isBusy: boolean;
  startConnect: () => Promise<void>;
  startReconnect: () => Promise<void>;
  retryLastIntent: () => Promise<void>;
}

export function usePlaidFlow({
  enabled,
  onConnected,
  onInitialSync,
}: UsePlaidFlowOptions): UsePlaidFlowResult {
  const [stage, setStage] = useState<PlaidFlowStage>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<PlaidFlowIntent>('create');

  const openedRef = useRef(false);
  const oauthResumeAttemptedRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const hasOauthState = searchParams.has('oauth_state_id');
  const receivedRedirectUri = useMemo(() => {
    if (typeof window === 'undefined' || !hasOauthState) return undefined;
    return window.location.href;
  }, [hasOauthState]);

  const clearOauthQuery = useCallback(() => {
    if (!hasOauthState) return;
    navigate('/settings?tab=integrations', { replace: true });
  }, [hasOauthState, navigate]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setStage('exchanging');
      setErrorMessage(null);
      try {
        const exchanged = await exchangePlaidPublicToken(publicToken, metadata);
        if ('error' in exchanged) {
          throw new Error(normalizePlaidFlowErrorMessage(exchanged.error));
        }

        await onConnected();
        setStage('syncing');
        const synced = await onInitialSync();
        if (!synced) {
          toast.error('Connection saved, but initial sync failed — try Sync now.');
          track('plaid_initial_sync_failed', { intent: activeIntent });
        } else {
          toast.success(activeIntent === 'update' ? 'Bank connection updated.' : 'Bank connected successfully.');
          track('plaid_link_success', { intent: activeIntent });
        }

        setStage('success');
      } catch (e) {
        const message = normalizePlaidFlowErrorMessage(e instanceof Error ? e.message : 'Bank connection failed');
        setErrorMessage(message);
        setStage('error');
        toast.error(message);
        track('plaid_link_error', { phase: 'exchange', intent: activeIntent });
      } finally {
        setLinkToken(null);
        openedRef.current = false;
        clearOauthQuery();
      }
    },
    [activeIntent, clearOauthQuery, onConnected, onInitialSync],
  );

  const onExit = useCallback(
    (error: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => {
      openedRef.current = false;
      setLinkToken(null);

      if (metadata.status === 'requires_oauth') {
        setStage('oauth_redirect');
        track('plaid_oauth_redirect', {});
        return;
      }

      if (error) {
        const message = normalizePlaidFlowErrorMessage(error.error_message || error.display_message || 'Bank link cancelled.');
        setErrorMessage(message);
        setStage('error');
        toast.error(message);
        track('plaid_link_exit_error', {});
      } else if (stage !== 'success') {
        setStage('idle');
        track('plaid_link_dismiss', {});
      }

      clearOauthQuery();
    },
    [clearOauthQuery, stage],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri,
    onSuccess,
    onExit,
    onEvent: (eventName) => {
      if (eventName === 'OPEN') {
        setStage('link_open');
        track('plaid_link_open', {});
      }
      if (eventName === 'HANDOFF') {
        setStage('oauth_redirect');
        track('plaid_handoff', {});
      }
    },
  });

  const startFlow = useCallback(
    async (intent: PlaidFlowIntent) => {
      if (!enabled) {
        toast.error('Bank linking is temporarily unavailable.');
        return;
      }

      setStage('creating_link_token');
      setErrorMessage(null);
      setActiveIntent(intent);

      try {
        const tokenResult = await createPlaidLinkToken(intent === 'update' ? { mode: 'update' } : undefined);
        if ('error' in tokenResult) {
          throw new Error(normalizePlaidFlowErrorMessage(tokenResult.error));
        }
        setLinkToken(tokenResult.link_token);
        setStage('link_ready');
      } catch (e) {
        const message = normalizePlaidFlowErrorMessage(e instanceof Error ? e.message : 'Unable to start bank connection');
        setErrorMessage(message);
        setStage('error');
        toast.error(message);
        track('plaid_link_error', { phase: 'link_token', intent });
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (linkToken && ready && !openedRef.current) {
      openedRef.current = true;
      open();
    }
  }, [linkToken, open, ready]);

  useEffect(() => {
    if (!hasOauthState || oauthResumeAttemptedRef.current || stage !== 'idle') return;
    oauthResumeAttemptedRef.current = true;
    track('plaid_oauth_resume', {});
    void startFlow('create');
  }, [hasOauthState, stage, startFlow]);

  const startConnect = useCallback(async () => startFlow('create'), [startFlow]);
  const startReconnect = useCallback(async () => startFlow('update'), [startFlow]);
  const retryLastIntent = useCallback(async () => startFlow(activeIntent), [activeIntent, startFlow]);

  return {
    stage,
    errorMessage,
    activeIntent,
    isBusy: !['idle', 'success', 'error'].includes(stage),
    startConnect,
    startReconnect,
    retryLastIntent,
  };
}
