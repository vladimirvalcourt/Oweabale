import { supabase } from './supabase';

export type SupportContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken: string;
};

export async function submitSupportContact(payload: SupportContactPayload) {
  try {
    const res = await supabase.functions.invoke('support-contact', {
      body: payload,
    });

    const data = res.data as { error?: string } | null;

    if (res.error) {
      throw new Error(data?.error || res.error.message || 'Failed to send message');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return { error: message };
  }
}
