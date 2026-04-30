import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/api/supabase';

const STORAGE_KEY = 'oweable_impersonation';

interface ImpersonationState {
  impersonating: boolean;
  impersonated_user_id: string | null;
  impersonated_email: string | null;
}

interface ImpersonationContextValue extends ImpersonationState {
  /** The user ID to use for all data queries (impersonated or own) */
  activeUserId: string | null;
  startImpersonation: (userId: string, email: string) => Promise<void>;
  stopImpersonation: () => void;
  /** Returns true and shows toast if trying to mutate while impersonating */
  blockIfImpersonating: () => boolean;
}

export const ImpersonationContext = createContext<ImpersonationContextValue>({
  impersonating: false,
  impersonated_user_id: null,
  impersonated_email: null,
  activeUserId: null,
  startImpersonation: async () => {},
  stopImpersonation: () => {},
  blockIfImpersonating: () => false,
});

function readFromStorage(): ImpersonationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { impersonating: false, impersonated_user_id: null, impersonated_email: null };
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return { impersonating: false, impersonated_user_id: null, impersonated_email: null };
  }
}

function writeToStorage(state: ImpersonationState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[Impersonation] Storage write failed:', error);
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

async function logImpersonationAction(action: 'IMPERSONATE_START' | 'IMPERSONATE_END', targetUserId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await supabase.functions.invoke('admin-actions', {
      body: { action: 'log_audit', auditAction: action, targetUserId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // Non-fatal — audit logging failure should not block UX
    console.warn('[Impersonation] Failed to log audit action');
  }
}

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<ImpersonationState>(readFromStorage);

  // Sync own auth user id
  const [ownUserId, setOwnUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setOwnUserId(data.user?.id ?? null));
  }, []);

  const activeUserId = state.impersonating && state.impersonated_user_id
    ? state.impersonated_user_id
    : ownUserId;

  const startImpersonation = useCallback(async (userId: string, email: string) => {
    const newState: ImpersonationState = {
      impersonating: true,
      impersonated_user_id: userId,
      impersonated_email: email,
    };
    writeToStorage(newState);
    setState(newState);
    await logImpersonationAction('IMPERSONATE_START', userId);
    navigate('/pro/dashboard');
  }, [navigate]);

  const stopImpersonation = useCallback(() => {
    const targetId = state.impersonated_user_id;
    clearStorage();
    setState({ impersonating: false, impersonated_user_id: null, impersonated_email: null });
    if (targetId) void logImpersonationAction('IMPERSONATE_END', targetId);
    navigate('/admin');
  }, [navigate, state.impersonated_user_id]);

  const blockIfImpersonating = useCallback((): boolean => {
    if (!state.impersonating) return false;
    toast.warning('Read-only in impersonation mode');
    return true;
  }, [state.impersonating]);

  const value = useMemo<ImpersonationContextValue>(() => ({
    ...state,
    activeUserId,
    startImpersonation,
    stopImpersonation,
    blockIfImpersonating,
  }), [state, activeUserId, startImpersonation, stopImpersonation, blockIfImpersonating]);

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
