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

    if (res.error) {
      throw new Error(res.error.message || 'Failed to send message');
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return { error: message };
  }
}
