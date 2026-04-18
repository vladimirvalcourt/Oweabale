import * as Sentry from '@sentry/react';
import type { User } from '@supabase/supabase-js';

function clientActive(): boolean {
  return Sentry.getClient() !== undefined;
}

/** Attach Supabase user for grouping (explicit id + email only; `sendDefaultPii` stays off). */
export function syncSentryUserFromSupabaseUser(user: User | null): void {
  if (!clientActive()) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  });
}
