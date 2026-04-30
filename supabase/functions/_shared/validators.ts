/**
 * Shared input validation schemas for Edge Functions
 * Uses Zod for runtime type checking and validation
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ── Plaid Validation Schemas ────────────────────────────────────────────────

export const PlaidLinkTokenSchema = z.object({
  mode: z.enum(['create', 'update']).optional().default('create'),
});

export const PlaidExchangeSchema = z.object({
  public_token: z.string().min(1).max(500),
  metadata: z.object({
    institution: z.object({
      name: z.string().optional(),
      institution_id: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const PlaidDisconnectSchema = z.object({
  item_id: z.string().uuid(),
});

// ── Stripe Validation Schemas ───────────────────────────────────────────────

export const StripeCheckoutSchema = z.object({
  planKey: z.enum(['pro_monthly', 'pro_yearly']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const StripeCancelSubscriptionSchema = z.object({
  subscriptionId: z.string().startsWith('sub_'),
  reason: z.string().max(500).optional(),
});

// ── Household Validation Schemas ────────────────────────────────────────────

export const HouseholdInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin']).optional().default('member'),
});

export const HouseholdAcceptSchema = z.object({
  inviteToken: z.string().min(1).max(500),
});

// ── Finance Insights Validation Schemas ─────────────────────────────────────

export const FinanceInsightsSchema = z.object({
  purchaseAmount: z.number().positive().max(1_000_000_000),
  category: z.string().max(80).optional(),
});

// ── Support Contact Validation Schemas ──────────────────────────────────────

export const SupportContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().min(1).max(300),
  message: z.string().min(10).max(5000),
  turnstileToken: z.string().optional(),
});

// ── Trial Management Validation Schemas ─────────────────────────────────────

export const TrialExtensionSchema = z.object({
  targetUserId: z.string().uuid(),
  extensionDays: z.number().int().positive().max(90),
  reason: z.string().max(1000).optional(),
});

// ── Admin Actions Validation Schemas ────────────────────────────────────────

export const AdminUserLookupSchema = z.object({
  userId: z.string().uuid().or(z.string().email()),
});

export const AdminFeatureFlagSchema = z.object({
  userId: z.string().uuid(),
  flagName: z.string().max(100),
  flagValue: z.boolean(),
});

// ── Web Push Validation Schemas ─────────────────────────────────────────────

export const PushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

// ── Generic Input Sanitization Helpers ──────────────────────────────────────

/**
 * Sanitize string input - trim whitespace, remove dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potential XSS chars
    .slice(0, 10000); // Hard limit
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): string | null {
  const sanitized = sanitizeString(email.toLowerCase());
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized) || sanitized.length > 254) {
    return null;
  }
  return sanitized;
}

/**
 * Validate monetary amount
 */
export function validateMonetaryAmount(amount: unknown): number {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0 || num > 10_000_000) {
    throw new Error('Invalid monetary amount');
  }
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ── Validation Helper for Edge Functions ────────────────────────────────────

/**
 * Validate request body against schema and return typed data
 * Returns error response if validation fails
 */
export async function validateRequest<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  corsHeaders: Record<string, string>
): Promise<{ data: T } | { error: Response }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errorMessage = result.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      
      return {
        error: new Response(
          JSON.stringify({ 
            error: 'Validation failed',
            details: errorMessage 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ),
      };
    }
    
    return { data: result.data };
  } catch (error) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }
}
