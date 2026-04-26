/**
 * Rate limiting utility for Supabase Edge Functions
 * Uses Deno KV for distributed rate limiting across function instances
 */

interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  keyPrefix?: string;      // Prefix for KV keys
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

class RateLimiter {
  private kv: Deno.Kv | null = null;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rate_limit',
      ...config,
    };
  }

  private async getKv(): Promise<Deno.Kv> {
    if (!this.kv) {
      this.kv = await Deno.openKv();
    }
    return this.kv;
  }

  /**
   * Check if a request is allowed based on rate limits
   * @param identifier - Unique identifier (IP, user ID, API key, etc.)
   * @returns Rate limit result with allowance status
   */
  async checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const kv = await this.getKv();
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    const key = [this.config.keyPrefix, identifier];
    
    // Get current count and window start
    const result = await kv.get<{ count: number; windowStart: number }>(key);
    const current = result.value;

    // If no record exists or window has expired, create new window
    if (!current || current.windowStart < windowStart) {
      const newRecord = {
        count: 1,
        windowStart: now,
      };
      
      // Use atomic operation to prevent race conditions
      const res = await kv.atomic()
        .check(result)
        .set(key, newRecord)
        .commit();

      if (res.ok) {
        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetAt: now + this.config.windowMs,
        };
      }
      
      // If atomic operation failed, retry once
      return this.checkRateLimit(identifier);
    }

    // Window is still active
    if (current.count >= this.config.maxRequests) {
      const resetAt = current.windowStart + this.config.windowMs;
      const retryAfter = Math.ceil((resetAt - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    // Increment counter atomically
    const updated = {
      count: current.count + 1,
      windowStart: current.windowStart,
    };

    const res = await kv.atomic()
      .check(result)
      .set(key, updated)
      .commit();

    if (!res.ok) {
      // Retry on conflict
      return this.checkRateLimit(identifier);
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - updated.count,
      resetAt: current.windowStart + this.config.windowMs,
    };
  }

  /**
   * Clean up old rate limit records (should be called periodically)
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const kv = await this.getKv();
    const cutoff = Date.now() - maxAge;
    
    const iter = kv.list({ prefix: [this.config.keyPrefix] });
    const deletes: Promise<boolean>[] = [];
    
    for await (const entry of iter) {
      const value = entry.value as { windowStart?: number };
      if (value.windowStart && value.windowStart < cutoff) {
        deletes.push(kv.delete(entry.key).then(() => true));
      }
    }
    
    await Promise.all(deletes);
  }

  /**
   * Close the KV connection (call when shutting down)
   */
  close(): void {
    if (this.kv) {
      this.kv.close();
      this.kv = null;
    }
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // Strict: Authentication endpoints (5 requests per minute)
  auth: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'rl_auth',
  }),

  // Moderate: API endpoints (30 requests per minute)
  api: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'rl_api',
  }),

  // Lenient: Public endpoints (100 requests per minute)
  public: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'rl_public',
  }),

  // Tight: Public contact/support endpoints (5 requests per 10 minutes)
  contact: new RateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'rl_contact',
  }),

  // Household invites should be sparse and deliberate.
  householdInvite: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 6,
    keyPrefix: 'rl_household_invite',
  }),

  // Very strict: Webhook endpoints (10 requests per minute)
  webhook: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'rl_webhook',
  }),
};

/**
 * Helper to extract client IP from request
 */
export function getClientIp(req: Request): string {
  // Check various headers for real IP (in order of preference)
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim();
    }
  }

  // Fallback to remote address (may not be available in all environments)
  return 'unknown';
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 0 : 1)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Middleware to enforce rate limiting on Edge Functions
 */
export async function enforceRateLimit(
  req: Request,
  limiter: RateLimiter,
  identifier?: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ allowed: boolean; response?: Response }> {
  const clientId = identifier || getClientIp(req);
  const result = await limiter.checkRateLimit(clientId);
  
  if (!result.allowed) {
    const headers = {
      ...createRateLimitHeaders(result),
      ...extraHeaders,
      'Content-Type': 'application/json',
    };
    
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
          resetAt: result.resetAt,
        }),
        {
          status: 429,
          headers,
        }
      ),
    };
  }

  return {
    allowed: true,
  };
}
