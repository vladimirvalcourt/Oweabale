/**
 * Security Event Logging for Edge Functions
 * Provides structured logging for security-relevant events
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type SecurityEventType =
  | 'auth_failure'
  | 'auth_success'
  | 'authz_denied'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'payment_attempt'
  | 'payment_success'
  | 'payment_failure'
  | 'data_access'
  | 'admin_action'
  | 'webhook_received'
  | 'webhook_invalid'
  | 'trial_abuse_detected'
  | 'account_lockout';

export interface SecurityEvent {
  eventType: SecurityEventType;
  userId?: string;
  ipAddress: string;
  endpoint: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log security event to database and console
 */
export async function logSecurityEvent(
  supabaseAdmin: SupabaseClient,
  event: SecurityEvent
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Log to console for immediate visibility (server-side only)
  const logLevel = event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warn';
  console[logLevel]('[SECURITY_EVENT]', {
    type: event.eventType,
    userId: event.userId ?? 'anonymous',
    ip: event.ipAddress,
    endpoint: event.endpoint,
    severity: event.severity,
    timestamp,
    ...event.metadata,
  });

  // Store in database for audit trail
  try {
    const { error } = await supabaseAdmin
      .from('security_events')
      .insert({
        event_type: event.eventType,
        user_id: event.userId ?? null,
        ip_address: event.ipAddress,
        endpoint: event.endpoint,
        severity: event.severity,
        metadata: event.metadata ?? {},
        created_at: timestamp,
      });

    if (error) {
      console.error('[SecurityLogger] Failed to log event:', error.message);
    }
  } catch (err) {
    // Don't throw - logging failure shouldn't break the main operation
    console.error('[SecurityLogger] Exception while logging:', err);
  }

  // Send alert for critical/high severity events
  if (event.severity === 'critical' || event.severity === 'high') {
    await sendSecurityAlert(event);
  }
}

/**
 * Send alert for critical security events
 */
async function sendSecurityAlert(event: SecurityEvent): Promise<void> {
  try {
    const adminEmail = Deno.env.get('ADMIN_ALERTS_TO_EMAIL');
    if (!adminEmail) {
      console.warn('[SecurityLogger] No admin email configured for alerts');
      return;
    }

    // Use Resend or similar service to send alert
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('[SecurityLogger] No RESEND_API_KEY configured');
      return;
    }

    const alertSubject = `[Oweable Security] ${event.severity.toUpperCase()}: ${event.eventType}`;
    const alertBody = `
Security Alert - Oweable

Event Type: ${event.eventType}
Severity: ${event.severity.toUpperCase()}
Timestamp: ${new Date().toISOString()}
User ID: ${event.userId ?? 'Anonymous'}
IP Address: ${event.ipAddress}
Endpoint: ${event.endpoint}

Metadata:
${JSON.stringify(event.metadata, null, 2)}

---
This is an automated security alert. Please investigate immediately if this appears suspicious.
    `.trim();

    // Fire-and-forget - don't block main operation
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('ADMIN_ALERTS_FROM_EMAIL') ?? 'alerts@oweable.com',
        to: [adminEmail],
        subject: alertSubject,
        text: alertBody,
      }),
    }).catch(err => {
      console.error('[SecurityLogger] Failed to send alert email:', err);
    });
  } catch (err) {
    console.error('[SecurityLogger] Alert sending failed:', err);
  }
}

/**
 * Helper: Log authentication failure
 */
export async function logAuthFailure(
  supabaseAdmin: SupabaseClient,
  ipAddress: string,
  endpoint: string,
  reason: string
): Promise<void> {
  await logSecurityEvent(supabaseAdmin, {
    eventType: 'auth_failure',
    ipAddress,
    endpoint,
    metadata: { reason },
    severity: 'medium',
  });
}

/**
 * Helper: Log authorization denial
 */
export async function logAuthzDenied(
  supabaseAdmin: SupabaseClient,
  userId: string,
  ipAddress: string,
  endpoint: string,
  requiredPermission: string
): Promise<void> {
  await logSecurityEvent(supabaseAdmin, {
    eventType: 'authz_denied',
    userId,
    ipAddress,
    endpoint,
    metadata: { requiredPermission },
    severity: 'high',
  });
}

/**
 * Helper: Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  supabaseAdmin: SupabaseClient,
  ipAddress: string,
  endpoint: string,
  userId?: string
): Promise<void> {
  await logSecurityEvent(supabaseAdmin, {
    eventType: 'rate_limit_exceeded',
    userId,
    ipAddress,
    endpoint,
    severity: 'medium',
  });
}

/**
 * Helper: Log suspicious activity
 */
export async function logSuspiciousActivity(
  supabaseAdmin: SupabaseClient,
  userId: string | undefined,
  ipAddress: string,
  endpoint: string,
  details: Record<string, any>
): Promise<void> {
  await logSecurityEvent(supabaseAdmin, {
    eventType: 'suspicious_activity',
    userId,
    ipAddress,
    endpoint,
    metadata: details,
    severity: 'high',
  });
}

/**
 * Helper: Log payment attempt
 */
export async function logPaymentAttempt(
  supabaseAdmin: SupabaseClient,
  userId: string,
  ipAddress: string,
  amount: number,
  currency: string,
  planKey: string
): Promise<void> {
  await logSecurityEvent(supabaseAdmin, {
    eventType: 'payment_attempt',
    userId,
    ipAddress,
    endpoint: '/functions/v1/stripe-checkout-session',
    metadata: { amount, currency, planKey },
    severity: 'medium',
  });
}

/**
 * Redact sensitive fields from objects before logging
 */
export function redactSensitiveFields(obj: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'token',
    'secret',
    'password',
    'ssn',
    'account_number',
    'routing_number',
    'card_number',
    'cvv',
    'authorization',
    'api_key',
    'private_key',
    'access_token',
    'refresh_token',
  ];

  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveFields(redacted[key]);
    }
  }
  return redacted;
}
