import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { decryptSecret } from '../_shared/tokenCrypto.ts';
import { shouldConsiderEmail } from '../_shared/emailIntelligenceAllowlist.ts';
import {
  extractObligationFromEmailSnippet,
  suggestedDestination,
  urgencyFor,
} from '../_shared/emailExtractionAi.ts';

const MAX_AI_PER_RUN = 45;
const MAX_LIST_PAGES = 8;

function redactId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : 'redacted';
}

function gmailAfterDate(connection: { last_scan_after: string | null }): string {
  if (connection.last_scan_after) {
    const d = new Date(connection.last_scan_after.includes('T') ? connection.last_scan_after : `${connection.last_scan_after}T12:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() - 1);
      return formatGmail(d);
    }
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 90);
  return formatGmail(d);
}

function formatGmail(d: Date): string {
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function googleRefreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_GMAIL_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('GOOGLE_GMAIL_CLIENT_SECRET')?.trim();
  if (!clientId || !clientSecret) throw new Error('Google OAuth not configured');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google refresh failed ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error('No access_token from Google');
  return j.access_token;
}

function headerValue(headers: Array<{ name?: string; value?: string }>, name: string): string {
  const n = name.toLowerCase();
  const h = headers.find((x) => (x.name ?? '').toLowerCase() === n);
  return (h?.value ?? '').trim();
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = { ...corsHeaders(origin, req.headers), 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin, req.headers) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: ch });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const encKey = Deno.env.get('EMAIL_TOKEN_ENCRYPTION_KEY')?.trim();
  const cronSecret = Deno.env.get('EMAIL_SCAN_CRON_SECRET')?.trim();
  const hfToken = Deno.env.get('HF_TOKEN')?.trim();
  const modelId =
    Deno.env.get('OWE_AI_MODEL')?.trim() ||
    Deno.env.get('HF_INFERENCE_MODEL')?.trim() ||
    'Qwen/Qwen2.5-7B-Instruct';

  if (!supabaseUrl || !serviceKey || !encKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: ch });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cronHeader = req.headers.get('x-email-scan-cron')?.trim();
  let userIdFilter: string | null = null;

  if (cronSecret && cronHeader === cronSecret) {
    userIdFilter = null;
  } else {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: ch });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: ch });
    }
    userIdFilter = user.id;
  }

  if (!hfToken) {
    return new Response(JSON.stringify({ error: 'HF_TOKEN not configured for extraction' }), { status: 500, headers: ch });
  }

  try {
    let q = supabaseAdmin.from('email_connections').select(
      'id,user_id,email_address,encrypted_refresh_token,last_scan_after',
    );
    if (userIdFilter) q = q.eq('user_id', userIdFilter);
    const { data: connections, error: cErr } = await q;
    if (cErr) {
      console.error('[email-intelligence-scan] list connections', cErr.message);
      return new Response(JSON.stringify({ error: 'Failed to list connections' }), { status: 500, headers: ch });
    }

    let scannedMessages = 0;
    let aiUsed = 0;
    let extractionMatches = 0;

    for (const conn of connections ?? []) {
      if (aiUsed >= MAX_AI_PER_RUN) break;
      let refreshPlain: string;
      try {
        refreshPlain = await decryptSecret(conn.encrypted_refresh_token as string, encKey);
      } catch (e) {
        console.warn('[email-intelligence-scan] decrypt failed for connection', redactId(String(conn.id)));
        continue;
      }

      let access: string;
      try {
        access = await googleRefreshAccessToken(refreshPlain);
      } catch (e) {
        console.warn('[email-intelligence-scan] refresh failed for connection', redactId(String(conn.id)));
        continue;
      }

      const after = gmailAfterDate({ last_scan_after: conn.last_scan_after as string | null });
      let pageToken: string | undefined;
      let pages = 0;

      while (pages < MAX_LIST_PAGES && aiUsed < MAX_AI_PER_RUN) {
        pages++;
        const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
        url.searchParams.set('q', `after:${after}`);
        url.searchParams.set('maxResults', '50');
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const listRes = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (!listRes.ok) {
          console.warn('[email-intelligence-scan] list call failed with status', listRes.status);
          break;
        }
        const listJson = (await listRes.json()) as {
          messages?: Array<{ id?: string }>;
          nextPageToken?: string;
        };
        const ids = (listJson.messages ?? []).map((m) => m.id).filter(Boolean) as string[];
        pageToken = listJson.nextPageToken;

        for (const mid of ids) {
          if (aiUsed >= MAX_AI_PER_RUN) break;
          scannedMessages++;

          const metaRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(mid)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${access}` } },
          );
          if (!metaRes.ok) continue;
          const meta = (await metaRes.json()) as {
            payload?: { headers?: Array<{ name?: string; value?: string }> };
          };
          const headers = meta.payload?.headers ?? [];
          const from = headerValue(headers, 'From');
          const subject = headerValue(headers, 'Subject');
          if (!shouldConsiderEmail(from, subject)) continue;

          const fullRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(mid)}?format=full`,
            { headers: { Authorization: `Bearer ${access}` } },
          );
          if (!fullRes.ok) continue;
          const full = (await fullRes.json()) as { snippet?: string };
          const snippet = (full.snippet ?? '').slice(0, 8000);

          const extracted = await extractObligationFromEmailSnippet(hfToken, modelId, from, subject, snippet);
          aiUsed++;
          if (!extracted) continue;
          extractionMatches++;

          const dest = suggestedDestination(extracted.category, extracted.status);
          const urg = urgencyFor(extracted.category, extracted.status);
          const senderDomain = (from.match(/@([a-z0-9.-]+)/i)?.[1] ?? '').toLowerCase();

          const row = {
            user_id: conn.user_id as string,
            connection_id: conn.id as string,
            provider_message_id: mid,
            subject_snapshot: subject.slice(0, 500),
            sender_domain: senderDomain.slice(0, 200),
            biller_name: extracted.biller_name.slice(0, 200),
            amount_due: extracted.amount_due,
            due_date: extracted.due_date,
            account_last4: extracted.account_last4,
            extracted_status: extracted.status,
            action_required: extracted.action_required,
            extracted_category: extracted.category,
            confidence_score: extracted.confidence_score,
            suggested_destination: dest,
            urgency: urg,
            review_status: 'pending',
            scanned_at: new Date().toISOString(),
          };

          const { error: insErr } = await supabaseAdmin.from('email_scan_findings').upsert(row, {
            onConflict: 'user_id,provider_message_id',
            ignoreDuplicates: true,
          });
          if (insErr) console.warn('[email-intelligence-scan] finding upsert failed');
        }

        if (!pageToken) break;
      }

      const today = new Date().toISOString().slice(0, 10);
      await supabaseAdmin
        .from('email_connections')
        .update({
          last_scan_at: new Date().toISOString(),
          last_scan_after: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id as string);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        connections: (connections ?? []).length,
        scannedMessages,
        aiCalls: aiUsed,
        highConfidenceExtractions: extractionMatches,
      }),
      { status: 200, headers: ch },
    );
  } catch (e) {
    console.error('[email-intelligence-scan]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'error' }), {
      status: 500,
      headers: ch,
    });
  }
});
